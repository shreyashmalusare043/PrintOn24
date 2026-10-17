-- 1. Ensure home_banners has all required columns
ALTER TABLE home_banners ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE home_banners ADD COLUMN IF NOT EXISTS destination_url text;
ALTER TABLE home_banners ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
UPDATE home_banners SET description = subtitle WHERE description IS NULL;
UPDATE home_banners SET destination_url = button_link WHERE destination_url IS NULL;

-- 2. Create upload_page_ads table
CREATE TABLE IF NOT EXISTS upload_page_ads (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text,
  image_url text NOT NULL,
  destination_url text NOT NULL,
  display_order integer DEFAULT 1,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Migrate records from advertisements into upload_page_ads
INSERT INTO upload_page_ads (id, title, description, image_url, destination_url, display_order, is_active, created_at, updated_at)
SELECT 
  id, 
  title, 
  description, 
  image_url, 
  COALESCE(link_url, 'https://printon24.io/offers'), 
  COALESCE(display_order, 1), 
  COALESCE(is_active, true), 
  COALESCE(created_at, now()),
  now()
FROM advertisements
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  destination_url = EXCLUDED.destination_url,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active;

-- Remove redundant advertisements table after migration
DROP TABLE IF EXISTS advertisements CASCADE;

-- Remove banner-specific entries from cms_content, preserving about_us, faq, app_config, announcement
DELETE FROM cms_content WHERE category = 'banner';

-- 3. Enable RLS on home_banners and upload_page_ads
ALTER TABLE home_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_page_ads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active home_banners" ON home_banners;
CREATE POLICY "Public can view active home_banners" ON home_banners
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public can view active upload_page_ads" ON upload_page_ads;
CREATE POLICY "Public can view active upload_page_ads" ON upload_page_ads
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage home_banners" ON home_banners;
CREATE POLICY "Admins can manage home_banners" ON home_banners
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage upload_page_ads" ON upload_page_ads;
CREATE POLICY "Admins can manage upload_page_ads" ON upload_page_ads
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Create user_consents table
CREATE TABLE IF NOT EXISTS user_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  guest_id text,
  consent_type text NOT NULL,
  status text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  policy_version text DEFAULT '1.0',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can insert user_consents" ON user_consents;
CREATE POLICY "Public can insert user_consents" ON user_consents
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own consents" ON user_consents;
CREATE POLICY "Users can view own consents" ON user_consents
  FOR SELECT TO anon, authenticated USING (true);

-- 5. Ensure guest_profile_image in cms_content app_config
UPDATE cms_content 
SET content = jsonb_set(
  CASE WHEN content IS NULL OR content = '' THEN '{}'::jsonb ELSE content::jsonb END, 
  '{guest_profile_image}', 
  '"https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80"'
)::text
WHERE category = 'app_config';
