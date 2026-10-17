-- Add conversion columns to uploaded_documents if not existing
ALTER TABLE uploaded_documents ADD COLUMN IF NOT EXISTS converted_pdf_url text;
ALTER TABLE uploaded_documents ADD COLUMN IF NOT EXISTS original_file_url text;
ALTER TABLE uploaded_documents ADD COLUMN IF NOT EXISTS excel_sheets jsonb;
ALTER TABLE uploaded_documents ADD COLUMN IF NOT EXISTS excel_scaling text DEFAULT 'No Scaling';
ALTER TABLE uploaded_documents ADD COLUMN IF NOT EXISTS conversion_service text DEFAULT 'Gotenberg-LibreOffice';

-- Create or replace Upload_Document view matching the requirement
CREATE OR REPLACE VIEW "Upload_Document" AS 
SELECT 
    id,
    user_id,
    shop_id,
    order_id,
    file_name,
    original_file_name,
    file_type,
    file_size,
    file_size_mb,
    total_pages,
    storage_bucket,
    storage_path,
    preview_url,
    converted_pdf_url,
    original_file_url,
    upload_status,
    excel_sheets,
    excel_scaling,
    conversion_service,
    print_config,
    image_editing,
    created_at,
    expiry_at,
    deleted_at
FROM uploaded_documents;
