-- ============================================================
-- SOCIFY - FULLY NORMALIZED SCHEMA v2
-- Run this in the Supabase Dashboard → SQL Editor
-- WARNING: This replaces the old architecture. 
-- ============================================================

-- Drop old tables if running a clean wipe (Optional, remove comments if needed)
-- DROP TABLE IF EXISTS public.brand_platforms CASCADE;
-- DROP TABLE IF EXISTS public.platforms CASCADE;
-- DROP TABLE IF EXISTS public.chat_messages CASCADE;
-- DROP TABLE IF EXISTS public.chat_sessions CASCADE;
-- DROP TABLE IF EXISTS public.generated_assets CASCADE;
-- DROP TABLE IF EXISTS public.assets CASCADE;
-- DROP TABLE IF EXISTS public.templates CASCADE;
-- DROP TABLE IF EXISTS public.categories CASCADE;
-- DROP TABLE IF EXISTS public.brands CASCADE;
-- DROP TABLE IF EXISTS public.profiles CASCADE;
-- DROP TABLE IF EXISTS public.users CASCADE;

-- ==========================================
-- 1. CORE USER & SUBSCRIPTION
-- ==========================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    is_guest BOOLEAN DEFAULT TRUE,
    credits INTEGER DEFAULT 0,
    discovery_source TEXT,
    country TEXT,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    is_pro BOOLEAN DEFAULT FALSE,
    revenuecat_id TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- ==========================================
-- 2. BRAND IDENTITY LAYER
-- ==========================================
CREATE TABLE IF NOT EXISTS public.brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    shop_name TEXT,
    industry TEXT,
    brand_identity TEXT,
    has_local_shop BOOLEAN DEFAULT FALSE,
    marketing_frequency TEXT,
    primary_goal TEXT,
    preferred_tone TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.platforms (
    id VARCHAR(50) PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT
);

CREATE TABLE IF NOT EXISTS public.brand_platforms (
    brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
    platform_id VARCHAR(50) REFERENCES public.platforms(id) ON DELETE CASCADE,
    PRIMARY KEY (brand_id, platform_id)
);

-- ==========================================
-- 3. ASSETS & CHAT SESSIONS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    icon TEXT DEFAULT 'grid-outline',
    color TEXT DEFAULT '#6C63FF',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    thumbnail_url TEXT,
    video_preview_url TEXT,
    default_caption_mode TEXT DEFAULT 'auto',
    requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
    template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    prompt TEXT,
    asset_type TEXT NOT NULL,
    storage_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL, -- 'user' or 'assistant'
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- ==========================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ==========================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- USERS
CREATE POLICY "Users can read own data" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own data" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- PROTECT CREDITS: Only allow credit updates via functions, not direct user updates
-- Users shouldn't be able to manually increase their own credits via the client SDK.
-- This is partially handled by the deduct_credits function below which is SECURITY DEFINER.

-- BRANDS
CREATE POLICY "Users can read own brands" ON public.brands FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own brands" ON public.brands FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own brands" ON public.brands FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own brands" ON public.brands FOR DELETE USING (auth.uid() = user_id);

-- BRAND PLATFORMS
CREATE POLICY "Users can manage brand platforms" ON public.brand_platforms 
FOR ALL USING ( brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid()) );

-- ASSETS
CREATE POLICY "Users can manage assets" ON public.assets 
FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

-- CHATS
CREATE POLICY "Users can manage chat sessions" ON public.chat_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage chat messages" ON public.chat_messages 
FOR ALL USING ( session_id IN (SELECT id FROM public.chat_sessions WHERE user_id = auth.uid()) );

-- GLOBALS (Categories/Templates/Platforms)
CREATE POLICY "Global read categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Global read templates" ON public.templates FOR SELECT USING (true);
CREATE POLICY "Global read platforms" ON public.platforms FOR SELECT USING (true);

-- ==========================================
-- 5. TRIGGERS & SEED DATA
-- ==========================================
-- Create core User Record silently on Auth events
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, full_name, is_guest, credits)
    VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Guest Creator'), 
        (NEW.email IS NULL),
        COALESCE((NEW.raw_user_meta_data->>'credits')::integer, 0)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed Platforms
INSERT INTO public.platforms (id, name, icon) VALUES
    ('instagram', 'Instagram', 'logo-instagram'),
    ('facebook', 'Facebook', 'logo-facebook'),
    ('tiktok', 'TikTok', 'logo-tiktok'),
    ('twitter', 'Twitter/X', 'logo-twitter'),
    ('linkedin', 'LinkedIn', 'logo-linkedin'),
    ('youtube', 'YouTube', 'logo-youtube')
ON CONFLICT DO NOTHING;

-- Seed Categories
INSERT INTO public.categories (id, name, icon, color, sort_order) VALUES
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Instagram Posts', 'logo-instagram', '#E1306C', 1),
    ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Facebook Ads', 'logo-facebook', '#1877F2', 2)
ON CONFLICT DO NOTHING;

-- Seed Templates
INSERT INTO public.templates (title, category_id, requirements, default_caption_mode) VALUES
(
    'Black Friday Frenzy', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    '[{"id":"r1","type":"photo","label":"Main Product Image"}]', 'auto'
) ON CONFLICT DO NOTHING;

-- ==========================================
-- 7. SECURE FUNCTIONS
-- ==========================================

-- Function to deduct credits safely
CREATE OR REPLACE FUNCTION public.deduct_credits(amount_to_deduct INTEGER)
RETURNS JSONB AS $$
DECLARE
    current_credits INTEGER;
    user_is_pro BOOLEAN;
BEGIN
    -- Get current state
    SELECT credits, is_pro INTO current_credits, user_is_pro 
    FROM public.users 
    WHERE id = auth.uid();

    -- Check balance (Pro users no longer have unlimited credits)
    IF current_credits < amount_to_deduct THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient credits');
    END IF;

    -- Update
    UPDATE public.users 
    SET credits = credits - amount_to_deduct 
    WHERE id = auth.uid();

    RETURN jsonb_build_object('success', true, 'remaining', current_credits - amount_to_deduct);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add credits safely (Post-Purchase)
CREATE OR REPLACE FUNCTION public.add_credits(amount_to_add INTEGER)
RETURNS JSONB AS $$
DECLARE
    new_balance INTEGER;
BEGIN
    UPDATE public.users 
    SET credits = credits + amount_to_add 
    WHERE id = auth.uid()
    RETURNING credits INTO new_balance;

    RETURN jsonb_build_object('success', true, 'new_balance', new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
