CREATE OR REPLACE FUNCTION public.cleanup_expired_print_documents()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_count integer := 0;
  v_files jsonb := '[]'::jsonb;
BEGIN
  -- 1. Identify all expired documents
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id,
    'bucket', storage_bucket,
    'path', storage_path
  )), '[]'::jsonb)
  INTO v_files
  FROM public.uploaded_documents
  WHERE expiry_at <= now() 
    AND upload_status != 'FILE_DELETED';

  -- 2. Update status in uploaded_documents without direct deletion from storage.objects
  UPDATE public.uploaded_documents
  SET 
    upload_status = 'FILE_DELETED',
    deleted_at = now()
  WHERE expiry_at <= now() 
    AND upload_status != 'FILE_DELETED';

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'cleaned_count', v_count,
    'expired_files', v_files,
    'executed_at', now()
  );
END;
$function$;