-- 1. User Profiles
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  surname TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  avatar_url TEXT DEFAULT '',
  is_verified BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Partner Print Shops (Counter Terminals for backend sharing)
CREATE TABLE IF NOT EXISTS public.print_shops (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  address TEXT NOT NULL,
  terminal_code TEXT NOT NULL UNIQUE,
  latitude NUMERIC DEFAULT 18.5204,
  longitude NUMERIC DEFAULT 73.8567,
  rating NUMERIC DEFAULT 4.8,
  total_reviews INT DEFAULT 120,
  is_open BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. User Memberships
CREATE TABLE IF NOT EXISTS public.user_memberships (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'Print Club VIP',
  card_number TEXT NOT NULL,
  discount_percentage INT DEFAULT 20,
  is_active BOOLEAN DEFAULT TRUE,
  valid_until TEXT DEFAULT '2027-12-31',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Uploaded Documents
CREATE TABLE IF NOT EXISTS public.uploaded_documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'PDF',
  file_size_mb NUMERIC DEFAULT 1.2,
  total_pages INT NOT NULL DEFAULT 1,
  preview_url TEXT DEFAULT '',
  image_editing JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Print Orders (Core order record shared between User, Shopkeeper & Admin)
CREATE TABLE IF NOT EXISTS public.print_orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  shop_id TEXT NOT NULL,
  shop_name TEXT NOT NULL,
  token_number TEXT NOT NULL,
  document_name TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'PDF',
  total_pages INT NOT NULL DEFAULT 1,
  config_copies INT NOT NULL DEFAULT 1,
  config_page_size TEXT NOT NULL DEFAULT 'A4',
  config_paper_type TEXT NOT NULL DEFAULT 'Normal',
  config_print_type TEXT NOT NULL DEFAULT 'Black & White',
  config_sides TEXT NOT NULL DEFAULT 'Single Side',
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  platform_fee NUMERIC NOT NULL DEFAULT 0,
  grand_total NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'Pay On Counter',
  payment_status TEXT NOT NULL DEFAULT 'Pending',
  order_status TEXT NOT NULL DEFAULT 'Queued',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. User Feedback
CREATE TABLE IF NOT EXISTS public.app_feedback (
  id TEXT PRIMARY KEY,
  user_id TEXT DEFAULT '',
  user_name TEXT NOT NULL,
  rating INT NOT NULL DEFAULT 5,
  category TEXT NOT NULL DEFAULT 'General',
  feedback_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Request for Ads
CREATE TABLE IF NOT EXISTS public.ad_requests (
  id TEXT PRIMARY KEY,
  business_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  ad_type TEXT NOT NULL DEFAULT 'Banner',
  budget TEXT DEFAULT '',
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploaded_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_requests ENABLE ROW LEVEL SECURITY;

-- Create full RLS policies for anon and authenticated users
CREATE POLICY "user_profiles_select" ON public.user_profiles FOR SELECT TO public USING (true);
CREATE POLICY "user_profiles_insert" ON public.user_profiles FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "user_profiles_update" ON public.user_profiles FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "user_profiles_delete" ON public.user_profiles FOR DELETE TO public USING (true);

CREATE POLICY "print_shops_select" ON public.print_shops FOR SELECT TO public USING (true);
CREATE POLICY "print_shops_insert" ON public.print_shops FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "print_shops_update" ON public.print_shops FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "print_shops_delete" ON public.print_shops FOR DELETE TO public USING (true);

CREATE POLICY "user_memberships_select" ON public.user_memberships FOR SELECT TO public USING (true);
CREATE POLICY "user_memberships_insert" ON public.user_memberships FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "user_memberships_update" ON public.user_memberships FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "user_memberships_delete" ON public.user_memberships FOR DELETE TO public USING (true);

CREATE POLICY "uploaded_documents_select" ON public.uploaded_documents FOR SELECT TO public USING (true);
CREATE POLICY "uploaded_documents_insert" ON public.uploaded_documents FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "uploaded_documents_update" ON public.uploaded_documents FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "uploaded_documents_delete" ON public.uploaded_documents FOR DELETE TO public USING (true);

CREATE POLICY "print_orders_select" ON public.print_orders FOR SELECT TO public USING (true);
CREATE POLICY "print_orders_insert" ON public.print_orders FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "print_orders_update" ON public.print_orders FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "print_orders_delete" ON public.print_orders FOR DELETE TO public USING (true);

CREATE POLICY "app_feedback_select" ON public.app_feedback FOR SELECT TO public USING (true);
CREATE POLICY "app_feedback_insert" ON public.app_feedback FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "app_feedback_update" ON public.app_feedback FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "app_feedback_delete" ON public.app_feedback FOR DELETE TO public USING (true);

CREATE POLICY "ad_requests_select" ON public.ad_requests FOR SELECT TO public USING (true);
CREATE POLICY "ad_requests_insert" ON public.ad_requests FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "ad_requests_update" ON public.ad_requests FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "ad_requests_delete" ON public.ad_requests FOR DELETE TO public USING (true);

-- Insert Initial Seed Data for User Profile and Shops
INSERT INTO public.user_profiles (id, name, surname, email, phone, address, avatar_url, is_verified)
VALUES (
  'usr_shreyas_01',
  'Shreyas',
  'Kulkarni',
  'shreyas.kulkarni@copygo.in',
  '+91 98765 43210',
  'Lane No. 4, Karve Nagar, Pune, Maharashtra 411052',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
  TRUE
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  surname = EXCLUDED.surname,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  address = EXCLUDED.address,
  avatar_url = EXCLUDED.avatar_url;

INSERT INTO public.user_memberships (id, user_id, tier, card_number, discount_percentage, is_active, valid_until)
VALUES (
  'mem_01',
  'usr_shreyas_01',
  'Print Club VIP',
  '4522 •••• •••• 8892',
  20,
  TRUE,
  '12/28'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.print_shops (id, name, owner_name, phone, address, terminal_code, latitude, longitude, rating, total_reviews, is_open)
VALUES 
  ('ent-01', 'ABC Xerox', 'Ajay Sharma', '+91 98230 11223', 'FC Road, Deccan, Pune', 'PUNE-ABC-01', 18.5204, 73.8567, 4.9, 142, TRUE),
  ('ent-02', 'Campus Fast Print', 'Ramesh Patil', '+91 98221 44556', 'Kothrud Campus Square, Pune', 'PUNE-CFP-02', 18.5074, 73.8077, 4.8, 98, TRUE),
  ('ent-03', 'Shree Sai Xerox', 'Mahesh Joshi', '+91 99210 77889', 'Karve Road, Pune', 'PUNE-SSX-03', 18.5018, 73.8210, 4.7, 76, TRUE),
  ('ent-04', 'Sai Graphics & Printing', 'Suresh Kadam', '+91 97654 33221', 'Law College Road, Pune', 'PUNE-SGP-04', 18.5158, 73.8322, 4.8, 115, TRUE)
ON CONFLICT (id) DO NOTHING;