import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Helper to count authentic PDF pages from binary stream
function countPdfPages(pdfBytes: Uint8Array): number {
  const text = new TextDecoder("latin1").decode(pdfBytes);
  // Match standard PDF page definitions
  const pageMatches = text.match(/\/Type\s*\/Page\b/g);
  if (pageMatches && pageMatches.length > 0) {
    return pageMatches.length;
  }
  // Fallback to /Count in catalog
  const countMatch = text.match(/\/Count\s+(\d+)/);
  if (countMatch && parseInt(countMatch[1], 10) > 0) {
    return parseInt(countMatch[1], 10);
  }
  return 1;
}

// Extract sheet names from XLSX workbook without altering document
async function extractWorkbookSheets(fileBuffer: Uint8Array): Promise<string[]> {
  try {
    const zip = await JSZip.loadAsync(fileBuffer);
    const workbookXml = (await zip.file("xl/workbook.xml")?.async("text")) || "";
    const sheetMatches = Array.from(workbookXml.matchAll(/<sheet[^>]*name="([^"]+)"/gi));
    const sheets = sheetMatches.map((m) => m[1]).filter(Boolean);
    return sheets.length > 0 ? sheets : ["Sheet1"];
  } catch {
    return ["Sheet1"];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const gotenbergUrl = Deno.env.get("GOTENBERG_URL") || "https://demo.gotenberg.dev";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let fileName = "document";
    let fileType = "DOCX";
    let fileBuffer: Uint8Array | null = null;
    let selectedSheet = "";
    let scaling = "No Scaling";
    let sheets: string[] = ["Sheet1"];
    let userId = "guest_user";
    let shopId = "";
    let docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    let originalStorageUrl = "";

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (file) {
        fileName = file.name;
        fileType = file.name.split(".").pop()?.toUpperCase() || "DOCX";
        const arrayBuf = await file.arrayBuffer();
        fileBuffer = new Uint8Array(arrayBuf);
      }
      if (formData.get("fileName")) fileName = String(formData.get("fileName"));
      if (formData.get("fileType")) fileType = String(formData.get("fileType")).toUpperCase();
      if (formData.get("selectedSheet")) selectedSheet = String(formData.get("selectedSheet"));
      if (formData.get("scaling")) scaling = String(formData.get("scaling"));
      if (formData.get("userId")) userId = String(formData.get("userId"));
      if (formData.get("shopId")) shopId = String(formData.get("shopId"));
      if (formData.get("docId")) docId = String(formData.get("docId"));
    } else {
      const body = await req.json();
      if (body.fileName) fileName = body.fileName;
      if (body.fileType) fileType = body.fileType.toUpperCase();
      if (body.selectedSheet) selectedSheet = body.selectedSheet;
      if (body.scaling) scaling = body.scaling;
      if (body.sheets && Array.isArray(body.sheets)) sheets = body.sheets;
      if (body.userId) userId = body.userId;
      if (body.shopId) shopId = body.shopId;
      if (body.docId) docId = body.docId;
      if (body.fileUrl) originalStorageUrl = body.fileUrl;

      // If fileUrl provided, fetch it
      if (body.fileUrl && !fileBuffer) {
        try {
          const res = await fetch(body.fileUrl);
          if (res.ok) {
            const buf = await res.arrayBuffer();
            fileBuffer = new Uint8Array(buf);
          }
        } catch (e) {
          console.warn("Could not fetch fileUrl:", e);
        }
      }
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No file content received for conversion.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const isPdf = fileType === "PDF" || fileName.toLowerCase().endsWith(".pdf");
    const isXls = fileType.includes("XLS") || fileType.includes("SHEET") || fileName.match(/\.xlsx?$/i);

    // If Excel, inspect workbook sheets for the configuration dropdown
    if (isXls) {
      sheets = await extractWorkbookSheets(fileBuffer);
    }

    // 1. Store Pristine Original File in Supabase Storage
    const originalExt = fileName.includes(".") ? fileName.split(".").pop() : fileType.toLowerCase();
    const originalStoragePath = `original_files/${userId}/${Date.now()}_${docId}.${originalExt}`;

    const { error: origUploadError } = await supabase.storage
      .from("print_documents")
      .upload(originalStoragePath, fileBuffer, {
        contentType: isPdf ? "application/pdf" : "application/octet-stream",
        cacheControl: "86400",
        upsert: true,
      });

    if (origUploadError) {
      console.warn("Notice saving original file:", origUploadError.message);
    }

    const { data: origUrlData } = supabase.storage
      .from("print_documents")
      .getPublicUrl(originalStoragePath);

    originalStorageUrl = origUrlData?.publicUrl || originalStorageUrl;

    let convertedPdfBytes: Uint8Array | null = null;
    let conversionMethod = "Native-PDF";

    // 2. Perform Gotenberg LibreOffice Conversion for non-PDF documents
    if (isPdf) {
      // PDF does not require conversion; reuse original binary stream
      convertedPdfBytes = fileBuffer;
      conversionMethod = "Direct-PDF";
    } else {
      // Send original document to Gotenberg LibreOffice HTTP API
      console.log(`Sending ${fileName} to Gotenberg at ${gotenbergUrl}/forms/libreoffice/convert`);
      
      try {
        const form = new FormData();
        const blob = new Blob([fileBuffer], { type: "application/octet-stream" });
        form.append("files", blob, fileName);

        // Support LibreOffice conversion parameters
        if (scaling === "Fit Sheet on One Page" || scaling === "Fit All Columns on One Page") {
          form.append("nativePageRanges", "1");
        }

        const gotenbergRes = await fetch(`${gotenbergUrl}/forms/libreoffice/convert`, {
          method: "POST",
          body: form,
        });

        if (gotenbergRes.ok) {
          const arrayBuf = await gotenbergRes.arrayBuffer();
          convertedPdfBytes = new Uint8Array(arrayBuf);
          conversionMethod = "Gotenberg-LibreOffice";
        } else {
          const errText = await gotenbergRes.text().catch(() => "");
          console.error("Gotenberg convert failed:", gotenbergRes.status, errText);
        }
      } catch (gotenbergErr: any) {
        console.error("Gotenberg connection error:", gotenbergErr.message);
      }
    }

    // Strict failure handling: Never generate fake/partial reconstructed text
    if (!convertedPdfBytes || convertedPdfBytes.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Unable to render this document. Please try again or upload the file again.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 }
      );
    }

    // 3. Count exact PDF pages from the generated PDF binary stream
    const totalPages = countPdfPages(convertedPdfBytes);

    // 4. Save converted PDF to Supabase Storage bucket 'print_documents'
    const pdfFileName = `${fileName.replace(/\.[^/.]+$/, "")}_converted.pdf`;
    const pdfStoragePath = `converted_pdfs/${userId}/${Date.now()}_${docId}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from("print_documents")
      .upload(pdfStoragePath, convertedPdfBytes, {
        contentType: "application/pdf",
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error for converted PDF:", uploadError);
      throw new Error(`Failed to store converted PDF: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from("print_documents")
      .getPublicUrl(pdfStoragePath);

    const pdfPublicUrl = urlData?.publicUrl || "";

    // 5. Update or insert record in 'uploaded_documents'
    try {
      await supabase.from("uploaded_documents").upsert({
        id: docId,
        user_id: userId,
        shop_id: shopId || null,
        file_name: pdfFileName,
        original_file_name: fileName,
        file_type: isPdf ? "PDF" : fileType,
        mime_type: "application/pdf",
        file_size: convertedPdfBytes.length,
        file_size_mb: Number((convertedPdfBytes.length / (1024 * 1024)).toFixed(2)) || 0.1,
        total_pages: totalPages,
        storage_bucket: "print_documents",
        storage_path: pdfStoragePath,
        preview_url: pdfPublicUrl,
        converted_pdf_url: pdfPublicUrl,
        original_file_url: originalStorageUrl || pdfPublicUrl,
        upload_status: "READY",
        conversion_service: conversionMethod,
        excel_sheets: sheets,
        excel_scaling: scaling,
        created_at: new Date().toISOString(),
        expiry_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      });
    } catch (dbErr) {
      console.warn("uploaded_documents upsert notice:", dbErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        converted: true,
        method: conversionMethod,
        docId,
        originalFileName: fileName,
        originalUrl: originalStorageUrl,
        pdfFileName,
        pdfUrl: pdfPublicUrl,
        storagePath: pdfStoragePath,
        totalPages,
        sheets,
        selectedSheet,
        scaling,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("convert-document error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Unable to render this document. Please try again or upload the file again.",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 500,
      }
    );
  }
});
