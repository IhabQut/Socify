-- ============================================================
-- SOCIFY - COMPLETE SUPABASE SCHEMA
-- Run this in the Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    icon TEXT DEFAULT 'grid-outline',
    color TEXT DEFAULT '#6C63FF',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- 2. TEMPLATES TABLE (with category FK)
CREATE TABLE IF NOT EXISTS public.templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    category TEXT NOT NULL, -- kept for legacy grouping
    thumbnail_url TEXT,
    video_preview_url TEXT,
    default_caption_mode TEXT DEFAULT 'auto',
    requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- 3. GENERATED ASSETS TABLE
CREATE TABLE IF NOT EXISTS public.generated_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    prompt TEXT,
    asset_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- 4. CALENDAR EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'calendar-outline',
    icon_color TEXT DEFAULT '#6C63FF',
    event_date DATE NOT NULL,
    event_time TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- 5. PROFILES TABLE (links to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    display_name TEXT,
    creativity_level INTEGER DEFAULT 1,
    is_guest BOOLEAN DEFAULT TRUE,
    credits INTEGER DEFAULT 0,
    primary_goal TEXT,
    interest_areas JSONB DEFAULT '[]'::jsonb,
    preferred_tone TEXT,
    revenuecat_id TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- 6. ENABLE RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 7. RLS POLICIES

-- Categories: readable by everyone
CREATE POLICY "categories_select" ON public.categories FOR SELECT USING (true);

-- Templates: readable by everyone
CREATE POLICY "templates_select" ON public.templates FOR SELECT USING (true);

-- Generated Assets: users can read/write their own
CREATE POLICY "assets_all_user" ON public.generated_assets 
    FOR ALL USING (auth.uid() = user_id OR user_id IS NULL); -- simplified for dev/anon

-- Calendar Events: users can read/write their own
CREATE POLICY "events_all_user" ON public.calendar_events 
    FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

-- Profiles: users can read their own, everyone can read (maybe?), only user can update
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 8. TRIGGER FOR AUTO-PROFILE CREATION
-- This creates a profile record automatically when a user signs up (including anon)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id, 
        full_name, 
        is_guest, 
        primary_goal, 
        interest_areas, 
        preferred_tone, 
        credits
    )
    VALUES (
        NEW.id, 
        NEW.raw_user_meta_data->>'full_name', 
        (NEW.email IS NULL),
        NEW.raw_user_meta_data->>'primary_goal',
        COALESCE((NEW.raw_user_meta_data->>'interest_areas')::jsonb, '[]'::jsonb),
        NEW.raw_user_meta_data->>'preferred_tone',
        COALESCE((NEW.raw_user_meta_data->>'credits')::integer, 0)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: on_auth_user_created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. SEED: Categories
INSERT INTO public.categories (id, name, icon, color, sort_order) VALUES
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Instagram Posts', 'logo-instagram', '#E1306C', 1),
    ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Facebook Ads', 'logo-facebook', '#1877F2', 2),
    ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'Stories & Reels', 'play-circle-outline', '#FF375F', 3)
ON CONFLICT DO NOTHING;

-- 10. SEED: Templates
INSERT INTO public.templates (title, category_id, category, requirements, default_caption_mode) VALUES
(
    'Black Friday Frenzy',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Instagram Posts',
    '[{"id":"r1","type":"photo","label":"Main Product Image","description":"Clear frontal view of the discounted item"},{"id":"r2","type":"text","label":"Discount Percentage","description":"e.g., 50% OFF"}]',
    'auto'
),
(
    'Cafe Promo',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Instagram Posts',
    '[{"id":"r1","type":"photo","label":"Coffee or Food Shot","description":"Close-up product shot"},{"id":"r2","type":"text","label":"Promo Code","description":"e.g., CAFE20"}]',
    'auto'
),
(
    'Real Estate App',
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'Facebook Ads',
    '[{"id":"r1","type":"photo","label":"Exterior Front View","description":"Wide angle shot"},{"id":"r2","type":"photo","label":"Living Room","description":"Well-lit interior"},{"id":"r3","type":"text","label":"Location Headline","description":"e.g., Downtown Luxury"}]',
    'auto'
),
(
    'Dental Clinic Ad',
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'Facebook Ads',
    '[{"id":"r1","type":"photo","label":"Clinic Interior","description":"Clean, bright shot"},{"id":"r2","type":"text","label":"Offer Text","description":"e.g., Free First Checkup"}]',
    'auto'
),
(
    'Vlog Intro',
    'c3d4e5f6-a7b8-9012-cdef-123456789012',
    'Stories & Reels',
    '[{"id":"r1","type":"video","label":"Action Clip","description":"3-second clip, waving"},{"id":"r2","type":"text","label":"Channel Name","description":"Your username"}]',
    'auto'
),
(
    'Daily Quote',
    'c3d4e5f6-a7b8-9012-cdef-123456789012',
    'Stories & Reels',
    '[{"id":"r1","type":"text","label":"Quote Text","description":"Inspirational or niche quote"},{"id":"r2","type":"text","label":"Author Name","description":"Who said it?"}]',
    'none'
)
ON CONFLICT DO NOTHING;
