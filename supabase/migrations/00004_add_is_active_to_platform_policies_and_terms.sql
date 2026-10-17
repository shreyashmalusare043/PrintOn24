ALTER TABLE platform_policies ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE platform_terms ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
UPDATE platform_policies SET is_active = true WHERE is_active IS NULL;
UPDATE platform_terms SET is_active = true WHERE is_active IS NULL;