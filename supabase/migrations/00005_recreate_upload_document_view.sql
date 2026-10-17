DROP VIEW IF EXISTS "Upload_Document";
CREATE VIEW "Upload_Document" AS
SELECT
  id,
  order_id,
  shop_id,
  user_id,
  preview_url AS "Preview Url",
  preview_url,
  file_name,
  file_type,
  file_size_mb,
  storage_path,
  storage_bucket,
  print_config,
  created_at
FROM uploaded_documents;