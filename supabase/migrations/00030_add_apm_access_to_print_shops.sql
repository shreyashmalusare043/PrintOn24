ALTER TABLE public.print_shops
  ADD COLUMN IF NOT EXISTS apm_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS software_service_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS apm_machine_type jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS apm_printer_configs jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS apm_page_prices jsonb NOT NULL DEFAULT '{}'::jsonb;
