-- 1. Create print_documents storage bucket if not existing
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'print_documents',
  'print_documents',
  true,
  52428800, -- 50MB
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800;

-- 2. Ensure RLS policies on storage.objects for print_documents
DROP POLICY IF EXISTS "Public and anon access for print_documents" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload print_documents" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read print_documents" ON storage.objects;
DROP POLICY IF EXISTS "Service and users can delete print_documents" ON storage.objects;

CREATE POLICY "Anyone can upload print_documents"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'print_documents');

CREATE POLICY "Anyone can read print_documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'print_documents');

CREATE POLICY "Service and users can delete print_documents"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'print_documents');

-- 3. Enhance or alter uploaded_documents table to include all required fields
ALTER TABLE public.uploaded_documents 
  ADD COLUMN IF NOT EXISTS shop_id text,
  ADD COLUMN IF NOT EXISTS order_id text,
  ADD COLUMN IF NOT EXISTS original_file_name text,
  ADD COLUMN IF NOT EXISTS mime_type text,
  ADD COLUMN IF NOT EXISTS file_size numeric,
  ADD COLUMN IF NOT EXISTS storage_bucket text DEFAULT 'print_documents',
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS upload_status text DEFAULT 'READY',
  ADD COLUMN IF NOT EXISTS expiry_at timestamptz DEFAULT (now() + interval '12 hours'),
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Set defaults and backfill existing rows
UPDATE public.uploaded_documents
SET 
  original_file_name = COALESCE(original_file_name, file_name),
  mime_type = COALESCE(mime_type, file_type, 'application/pdf'),
  storage_bucket = COALESCE(storage_bucket, 'print_documents'),
  storage_path = COALESCE(storage_path, id || '/' || file_name),
  upload_status = COALESCE(upload_status, 'READY'),
  expiry_at = COALESCE(expiry_at, created_at + interval '12 hours')
WHERE original_file_name IS NULL OR storage_path IS NULL;

-- 4. Enable RLS on uploaded_documents
ALTER TABLE public.uploaded_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert uploaded_documents" ON public.uploaded_documents;
DROP POLICY IF EXISTS "Anyone can select uploaded_documents" ON public.uploaded_documents;
DROP POLICY IF EXISTS "Anyone can update uploaded_documents" ON public.uploaded_documents;

CREATE POLICY "Anyone can insert uploaded_documents"
ON public.uploaded_documents FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Anyone can select uploaded_documents"
ON public.uploaded_documents FOR SELECT
TO public
USING (true);

CREATE POLICY "Anyone can update uploaded_documents"
ON public.uploaded_documents FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- 5. Create automatic cleanup function for 12-hour expired documents
CREATE OR REPLACE FUNCTION public.cleanup_expired_print_documents()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer := 0;
  v_doc record;
BEGIN
  -- Find all documents where 12 hours have passed and actual storage file is not yet marked deleted
  FOR v_doc IN 
    SELECT id, storage_bucket, storage_path, expiry_at
    FROM public.uploaded_documents
    WHERE expiry_at <= now() 
      AND upload_status != 'FILE_DELETED'
  LOOP
    -- 1. Delete physical object from storage.objects if it exists
    IF v_doc.storage_path IS NOT NULL THEN
      DELETE FROM storage.objects
      WHERE bucket_id = v_doc.storage_bucket
        AND name = v_doc.storage_path;
    END IF;

    -- 2. Update status in uploaded_documents, NEVER delete the record
    UPDATE public.uploaded_documents
    SET 
      upload_status = 'FILE_DELETED',
      deleted_at = now()
    WHERE id = v_doc.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'cleaned_count', v_count,
    'executed_at', now()
  );
END;
$$;