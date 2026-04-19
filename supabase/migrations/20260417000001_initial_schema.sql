-- ============================================================
-- SOCIFY — COMPLETE SCHEMA v4
-- Run AFTER 00000000000000_drop_all.sql
-- Supabase Dashboard → SQL Editor → Paste & Run
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 0. EXTENSIONS
-- ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ─────────────────────────────────────────────────────────────
-- 1. SHARED TRIGGER: auto-update updated_at
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ─────────────────────────────────────────────────────────────
-- 2. USERS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.users (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name             TEXT,
  avatar_url            TEXT,
  is_guest              BOOLEAN      NOT NULL DEFAULT TRUE,
  credits               INTEGER      NOT NULL DEFAULT 25,
  is_pro                BOOLEAN      NOT NULL DEFAULT FALSE,
  discovery_source      TEXT,
  country               TEXT,
  onboarding_completed  BOOLEAN      NOT NULL DEFAULT FALSE,
  revenuecat_id         TEXT,
  metadata              JSONB,
  device_id             TEXT,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_is_pro  ON public.users(is_pro);
CREATE INDEX idx_users_credits ON public.users(credits);
CREATE INDEX idx_users_device_id ON public.users(device_id);

CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- Auto-insert user row on every Supabase Auth sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, full_name, avatar_url, is_guest, credits)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Guest Creator'),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE((NEW.raw_user_meta_data->>'is_guest')::boolean, TRUE),
    25
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ─────────────────────────────────────────────────────────────
-- 3. BRANDS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.brands (
  id                   UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID         NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  shop_name            TEXT,
  industry             TEXT,
  brand_identity       TEXT,
  has_local_shop       BOOLEAN      NOT NULL DEFAULT FALSE,
  marketing_frequency  TEXT,
  primary_goal         TEXT,
  platforms            TEXT[]       DEFAULT '{}'::TEXT[],
  brand_colors         TEXT[]       DEFAULT '{}'::TEXT[],
  is_default           BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_brands_user_id    ON public.brands(user_id);
CREATE INDEX idx_brands_is_default ON public.brands(user_id, is_default);

CREATE TRIGGER set_brands_updated_at
  BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();


-- ─────────────────────────────────────────────────────────────
-- 4. CATEGORIES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.categories (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT        NOT NULL UNIQUE,
  icon       TEXT        DEFAULT 'grid-outline',
  color      TEXT        DEFAULT '#6C63FF',
  sort_order INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.categories (id, name, icon, color, sort_order) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Instagram Posts', 'logo-instagram',    '#E1306C', 1),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Facebook Ads',    'logo-facebook',     '#1877F2', 2),
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'Stories & Reels', 'film-outline',      '#FF6B35', 3),
  ('d4e5f6a7-b8c9-0123-defa-234567890123', 'Ad Creatives',    'megaphone-outline', '#7C3AED', 4),
  ('e5f6a7b8-c9d0-1234-efab-345678901234', 'Email Banners',   'mail-outline',      '#0EA5E9', 5)
ON CONFLICT DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- 5. TEMPLATES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.templates (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  title               TEXT        NOT NULL,
  category_id         UUID        REFERENCES public.categories(id) ON DELETE SET NULL,
  category            TEXT,                         -- flat string fallback
  thumbnail_url       TEXT,
  video_preview_url   TEXT,
  tutorial_video_url  TEXT,
  is_pro              BOOLEAN     NOT NULL DEFAULT FALSE,
  requirements        JSONB       NOT NULL DEFAULT '[]'::jsonb,
  tags                TEXT[],
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_templates_category_id ON public.templates(category_id);
CREATE INDEX idx_templates_is_pro      ON public.templates(is_pro);

CREATE TRIGGER set_templates_updated_at
  BEFORE UPDATE ON public.templates
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- Seed templates
INSERT INTO public.templates (title, category_id, category, thumbnail_url, is_pro, requirements) VALUES
(
  'Black Friday Frenzy',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Instagram Posts',
  'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=1000',
  FALSE,
  '[{"id":"r1","type":"photo","label":"Main Product Image","description":"Clear frontal view of the discounted item"},{"id":"r2","type":"text","label":"Discount Percentage","description":"e.g. 50% OFF"}]'::jsonb
),
(
  'Real Estate Showcase',
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  'Facebook Ads',
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1000',
  TRUE,
  '[{"id":"r1","type":"photo","label":"Exterior Front View","description":"Wide angle showing the whole property"},{"id":"r2","type":"photo","label":"Living Room","description":"Well-lit interior shot"},{"id":"r3","type":"text","label":"Location Headline","description":"e.g. Downtown Luxury"}]'::jsonb
),
(
  'Vlog Intro',
  'c3d4e5f6-a7b8-9012-cdef-123456789012',
  'Stories & Reels',
  'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=1000',
  FALSE,
  '[{"id":"r1","type":"video","label":"Action Clip","description":"3-second video of you waving"},{"id":"r2","type":"text","label":"Channel Name","description":"Your YT username"}]'::jsonb
)
ON CONFLICT DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- 5.5 TEMPLATE PROMPTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.template_prompts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id     UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  asset_type      TEXT NOT NULL DEFAULT 'image', -- 'image', 'caption', 'video'
  system_prompt   TEXT,
  user_prompt     TEXT NOT NULL,
  variables       JSONB DEFAULT '[]'::jsonb,     -- e.g., ["brand_name", "brand_colors", "industry"]
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_template_prompts_template_id ON public.template_prompts(template_id);

CREATE TRIGGER set_template_prompts_updated_at
  BEFORE UPDATE ON public.template_prompts
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- Seed some template prompts
-- Note: In a real system, you would insert the IDs from the templates dynamically or use the known UUIDs.
-- Since the templates above were inserted without explicit UUIDs, we will insert prompts by matching titles via subqueries.
INSERT INTO public.template_prompts (template_id, asset_type, system_prompt, user_prompt, variables)
SELECT 
  id, 
  'image',
  'You are an expert product photographer and ad designer.',
  'Design an eye-catching Black Friday sale ad for {{brand_name}}. Industry: {{industry}}. Use the brand colors {{brand_colors}}. Feature a 50% OFF badge prominently.',
  '["brand_name", "industry", "brand_colors"]'::jsonb
FROM public.templates WHERE title = 'Black Friday Frenzy'
ON CONFLICT DO NOTHING;

INSERT INTO public.template_prompts (template_id, asset_type, system_prompt, user_prompt, variables)
SELECT 
  id, 
  'image',
  'You are a high-end real estate photographer and marketing designer.',
  'Create a luxury real estate showcase image for {{brand_name}}. Ensure it feels {{preferred_tone}}. Incorporate brand colors {{brand_colors}} subtly in the UI overlays.',
  '["brand_name", "preferred_tone", "brand_colors"]'::jsonb
FROM public.templates WHERE title = 'Real Estate Showcase'
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 6. GENERATED_ASSETS (REDESIGNED FOR OFFLINE SYNC)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.generated_assets (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  template_id  UUID        REFERENCES public.templates(id) ON DELETE SET NULL,
  title        TEXT        NOT NULL,
  prompt       TEXT,
  asset_type   TEXT        NOT NULL DEFAULT 'image',   -- 'image' | 'copy' | 'video'
  storage_path TEXT,                                   -- Path in Supabase storage, e.g., 'users/{user_id}/assets/{filename}'
  output_url   TEXT,                                   -- Public URL (if cached/generated directly)
  is_draft     BOOLEAN     NOT NULL DEFAULT TRUE,      -- Treat as draft initially
  synced       BOOLEAN     NOT NULL DEFAULT FALSE,     -- Offline sync status
  metadata     JSONB,                                  -- Extra info like dimensions, duration, format
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_generated_assets_user_id    ON public.generated_assets(user_id);
CREATE INDEX idx_generated_assets_created_at ON public.generated_assets(created_at DESC);
CREATE INDEX idx_generated_assets_is_draft   ON public.generated_assets(is_draft);
CREATE INDEX idx_generated_assets_synced     ON public.generated_assets(synced);

CREATE TRIGGER set_generated_assets_updated_at
  BEFORE UPDATE ON public.generated_assets
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();


-- ─────────────────────────────────────────────────────────────
-- 7. CHAT_SESSIONS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.chat_sessions (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_sessions_user_id    ON public.chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_created_at ON public.chat_sessions(created_at DESC);


-- ─────────────────────────────────────────────────────────────
-- 8. CHAT_MESSAGES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.chat_messages (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID        NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at ASC);


-- ─────────────────────────────────────────────────────────────
-- 9. SUPABASE STORAGE BUCKETS
-- ─────────────────────────────────────────────────────────────
-- (Requires enabling pgcrypto and using the proper storage functions, but we can do standard inserts for the storage.buckets table)
INSERT INTO storage.buckets (id, name, public) VALUES ('templates', 'templates', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('assets', 'assets', true) ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- 10. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_assets  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages     ENABLE ROW LEVEL SECURITY;

-- users
CREATE POLICY "users: select own"  ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users: insert own"  ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users: update own"  ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users: delete own"  ON public.users FOR DELETE USING (auth.uid() = id);

-- brands
CREATE POLICY "brands: select own"  ON public.brands FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "brands: insert own"  ON public.brands FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "brands: update own"  ON public.brands FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "brands: delete own"  ON public.brands FOR DELETE USING (auth.uid() = user_id);

-- categories (public catalogue)
CREATE POLICY "categories: public read" ON public.categories FOR SELECT USING (TRUE);

-- templates (public catalogue)
CREATE POLICY "templates: public read" ON public.templates FOR SELECT USING (TRUE);

-- template_prompts (public catalogue)
CREATE POLICY "template_prompts: public read" ON public.template_prompts FOR SELECT USING (TRUE);

-- generated_assets
CREATE POLICY "assets: select own"  ON public.generated_assets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "assets: insert own"  ON public.generated_assets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "assets: update own"  ON public.generated_assets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "assets: delete own"  ON public.generated_assets FOR DELETE USING (auth.uid() = user_id);

-- chat_sessions
CREATE POLICY "chat_sessions: owner all" ON public.chat_sessions FOR ALL USING (auth.uid() = user_id);

-- chat_messages (via session ownership)
CREATE POLICY "chat_messages: select own" ON public.chat_messages FOR SELECT
  USING (session_id IN (SELECT id FROM public.chat_sessions WHERE user_id = auth.uid()));
CREATE POLICY "chat_messages: insert own" ON public.chat_messages FOR INSERT
  WITH CHECK (session_id IN (SELECT id FROM public.chat_sessions WHERE user_id = auth.uid()));
CREATE POLICY "chat_messages: delete own" ON public.chat_messages FOR DELETE
  USING (session_id IN (SELECT id FROM public.chat_sessions WHERE user_id = auth.uid()));


-- ─────────────────────────────────────────────────────────────
-- 11. STORAGE ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────

-- Templates bucket (Public read, admin only write)
-- Here we just do the basic public read policy.
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'templates');

-- Assets bucket (Owner only)
-- The user can only upload and read files in their own folder (users/{user_id}/assets/...)
CREATE POLICY "assets: user select" ON storage.objects FOR SELECT USING (
  bucket_id = 'assets' AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "assets: user insert" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'assets' AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "assets: user update" ON storage.objects FOR UPDATE USING (
  bucket_id = 'assets' AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "assets: user delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'assets' AND (storage.foldername(name))[2] = auth.uid()::text
);


-- ─────────────────────────────────────────────────────────────
-- 12. RPC FUNCTIONS
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.deduct_credits(amount_to_deduct INTEGER)
RETURNS JSONB 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  _uid             UUID    := auth.uid();
  _cur_credits     INTEGER;
  _cur_is_pro      BOOLEAN;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT credits, is_pro INTO _cur_credits, _cur_is_pro
  FROM public.users WHERE id = _uid FOR UPDATE;

  IF _cur_is_pro THEN
    RETURN jsonb_build_object('success', true, 'remaining', _cur_credits);
  END IF;

  IF _cur_credits < amount_to_deduct THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient credits');
  END IF;

  UPDATE public.users SET credits = credits - amount_to_deduct WHERE id = _uid;

  RETURN jsonb_build_object('success', true, 'remaining', _cur_credits - amount_to_deduct);
END;
$$;


-- add_credits: atomic credit grant
CREATE OR REPLACE FUNCTION public.add_credits(amount_to_add INTEGER)
RETURNS JSONB 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  _uid         UUID    := auth.uid();
  _new_balance INTEGER;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  UPDATE public.users
  SET credits = credits + amount_to_add
  WHERE id = _uid
  RETURNING credits INTO _new_balance;

  RETURN jsonb_build_object('success', true, 'new_balance', _new_balance);
END;
$$;
