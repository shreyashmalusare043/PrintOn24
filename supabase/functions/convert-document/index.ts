// @ts-ignore Deno resolves URL imports at runtime; the editor's TypeScript resolver does not.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @ts-ignore Deno resolves URL imports at runtime; the editor's TypeScript resolver does not.
import JSZip from "https://esm.sh/jszip@3.10.1";
// @ts-ignore Deno resolves URL imports at runtime; the editor's TypeScript resolver does not.
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function countPdfPages(pdfBytes: Uint8Array): Promise<number> {
  const pdfDocument = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const totalPages = pdfDocument.getPageCount();
  if (!Number.isSafeInteger(totalPages) || totalPages < 1) {
    throw new Error("Converted PDF contains no readable pages.");
  }
  return totalPages;
}

// Extract sheet names from XLSX workbook without altering document
async function extractWorkbookSheets(fileBuffer: Uint8Array): Promise<string[]> {
  const zip = await JSZip.loadAsync(fileBuffer);
  const workbookXml = (await zip.file("xl/workbook.xml")?.async("text")) || "";
  const sheetMatches = Array.from(
    workbookXml.matchAll(/<sheet[^>]*name="([^"]+)"/gi),
  ) as RegExpMatchArray[];
  const sheets = sheetMatches.map((m) => m[1]).filter(Boolean);
  if (sheets.length === 0) throw new Error("No worksheets were found in this workbook.");
  return sheets;
}

async function configureWorkbook(
  fileBuffer: Uint8Array,
  selectedSheet: string,
  scaling: string,
): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(fileBuffer);
  const workbookFile = zip.file("xl/workbook.xml");
  const relationshipsFile = zip.file("xl/_rels/workbook.xml.rels");
  if (!workbookFile || !relationshipsFile) {
    throw new Error("This Excel workbook cannot be configured.");
  }

  let workbookXml = await workbookFile.async("text");
  let relationshipsXml = await relationshipsFile.async("text");
  const selectedSheetTag = Array.from(workbookXml.matchAll(/<sheet\b[^>]*\/?>/gi))
    .map((match) => match[0])
    .find((tag) => new RegExp(`\\bname="${selectedSheet.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`).test(tag));
  if (!selectedSheetTag) {
    throw new Error(`Worksheet "${selectedSheet}" was not found.`);
  }

  const selectedRelationshipId = selectedSheetTag.match(/\br:id="([^"]+)"/)?.[1];
  if (!selectedRelationshipId) {
    throw new Error(`Worksheet "${selectedSheet}" has no workbook relationship.`);
  }

  const relationships = Array.from(
    relationshipsXml.matchAll(/<Relationship\b[^>]*\/?>/gi),
    (match) => match[0],
  );
  const selectedRelationship = relationships.find((tag) =>
    new RegExp(`\\bId="${selectedRelationshipId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`).test(tag)
  );
  const selectedTarget = selectedRelationship?.match(/\bTarget="([^"]+)"/)?.[1];
  if (!selectedTarget) {
    throw new Error(`Worksheet "${selectedSheet}" target could not be resolved.`);
  }

  const sheetPath = new URL(selectedTarget, "https://workbook.invalid/xl/workbook.xml")
    .pathname.slice(1);
  const selectedSheetFile = zip.file(sheetPath);
  if (!selectedSheetFile) {
    throw new Error(`Worksheet "${selectedSheet}" content is missing.`);
  }

  for (const sheetTag of Array.from(workbookXml.matchAll(/<sheet\b[^>]*\/?>/gi), (match) => match[0])) {
    if (sheetTag === selectedSheetTag) continue;
    const relationshipId = sheetTag.match(/\br:id="([^"]+)"/)?.[1];
    const relationship = relationships.find((tag) =>
      relationshipId && new RegExp(`\\bId="${relationshipId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`).test(tag)
    );
    const target = relationship?.match(/\bTarget="([^"]+)"/)?.[1];
    if (target) {
      const path = target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^(\.\/)+/, "")}`;
      zip.remove(path);
    }
    if (relationship) relationshipsXml = relationshipsXml.replace(relationship, "");
    workbookXml = workbookXml.replace(sheetTag, "");
  }

  workbookXml = workbookXml.replace(/<workbookView\b([^>]*)\/>/i, (_match, attributes: string) =>
    `<workbookView${/\bactiveTab="/.test(attributes) ? attributes.replace(/\bactiveTab="[^"]*"/, 'activeTab="0"') : `${attributes} activeTab="0"`}/>`,
  );
  if (scaling !== "No Scaling") {
    let sheetXml = await selectedSheetFile.async("text");
    const fitWidth = scaling === "Fit Sheet on One Page" || scaling === "Fit All Columns on One Page" ? 1 : 0;
    const fitHeight = scaling === "Fit Sheet on One Page" || scaling === "Fit All Rows on One Page" ? 1 : 0;
    const updatePageSetup = (_match: string, attributes: string) => {
      const updated = attributes
        .replace(/\s(?:fitToWidth|fitToHeight|scale|orientation)="[^"]*"/g, "");
      return `<pageSetup${updated} orientation="landscape" fitToWidth="${fitWidth}" fitToHeight="${fitHeight}"/>`;
    };
    if (/<pageSetup\b[^>]*\/>/i.test(sheetXml)) {
      sheetXml = sheetXml.replace(/<pageSetup\b([^>]*)\/>/i, updatePageSetup);
    } else if (/<pageSetup\b[^>]*>[\s\S]*?<\/pageSetup>/i.test(sheetXml)) {
      sheetXml = sheetXml.replace(/<pageSetup\b([^>]*)>[\s\S]*?<\/pageSetup>/i, updatePageSetup);
    } else {
      const pageSetup = `<pageSetup orientation="landscape" fitToWidth="${fitWidth}" fitToHeight="${fitHeight}"/>`;
      const nextElement = /<(?:headerFooter|rowBreaks|colBreaks|customProperties|cellWatches|ignoredErrors|smartTags|drawing|legacyDrawing|picture|oleObjects|controls|webPublishItems|tableParts|extLst)\b/i;
      const insertAt = sheetXml.search(nextElement);
      sheetXml = insertAt >= 0
        ? `${sheetXml.slice(0, insertAt)}${pageSetup}${sheetXml.slice(insertAt)}`
        : sheetXml.replace(/<\/worksheet>/i, `${pageSetup}</worksheet>`);
    }
    if (/<sheetPr\b[^>]*>/.test(sheetXml)) {
      if (/<pageSetUpPr\b[^>]*\/>/.test(sheetXml)) {
        sheetXml = sheetXml.replace(/<pageSetUpPr\b([^>]*)\/>/i, (_match, attributes: string) =>
          `<pageSetUpPr${attributes.replace(/\sfitToPage="[^"]*"/g, "")} fitToPage="1"/>`,
        );
      } else {
        sheetXml = sheetXml.replace(/<sheetPr\b([^>]*)\/>/i, '<sheetPr$1><pageSetUpPr fitToPage="1"/></sheetPr>');
        if (!/<pageSetUpPr\b/i.test(sheetXml)) {
          sheetXml = sheetXml.replace(/<sheetPr\b([^>]*)>/i, '<sheetPr$1><pageSetUpPr fitToPage="1"/>');
        }
      }
    } else {
      sheetXml = sheetXml.replace(/<worksheet\b([^>]*)>/i, '<worksheet$1><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>');
    }
    zip.file(sheetPath, sheetXml);
  }

  zip.file("xl/workbook.xml", workbookXml);
  zip.file("xl/_rels/workbook.xml.rels", relationshipsXml);
  return await zip.generateAsync({ type: "uint8array" });
}

// Deno is provided by the runtime, but may not be declared in the editor's TypeScript environment.
declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

Deno.serve(async (req) => {
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
    let inspectOnly = false;
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
      inspectOnly = formData.get("inspectOnly") === "true";
      if (formData.get("userId")) userId = String(formData.get("userId"));
      if (formData.get("shopId")) shopId = String(formData.get("shopId"));
      if (formData.get("docId")) docId = String(formData.get("docId"));
    } else {
      const body = await req.json();
      if (body.fileName) fileName = body.fileName;
      if (body.fileType) fileType = body.fileType.toUpperCase();
      if (body.selectedSheet) selectedSheet = body.selectedSheet;
      if (body.scaling) scaling = body.scaling;
      inspectOnly = body.inspectOnly === true;
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
    const isXlsx = fileType === "XLSX" || fileName.toLowerCase().endsWith(".xlsx");
    const isXls = fileType.includes("XLS") || fileType.includes("SHEET") || fileName.match(/\.xlsx?$/i);

    // If Excel, inspect workbook sheets for the configuration dropdown
    if (isXls && !isXlsx) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Sheet selection and scaling require an .xlsx workbook. Save this .xls file as .xlsx and upload it again.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 415 }
      );
    }
    if (isXlsx) {
      sheets = await extractWorkbookSheets(fileBuffer);
    }

    if (inspectOnly) {
      return new Response(
        JSON.stringify({ success: true, inspected: true, sheets }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
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
        const conversionInput = isXlsx && selectedSheet
          ? await configureWorkbook(fileBuffer, selectedSheet, scaling)
          : fileBuffer;
        const form = new FormData();
        const blobBuffer = new ArrayBuffer(conversionInput.byteLength);
        new Uint8Array(blobBuffer).set(conversionInput);
        const blob = new Blob([blobBuffer], { type: "application/octet-stream" });
        form.append("files", blob, fileName);

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
    const totalPages = await countPdfPages(convertedPdfBytes);

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
