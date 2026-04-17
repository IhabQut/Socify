-- ============================================================
-- SOCIFY — COMPLETE SCHEMA v3
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
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_is_pro  ON public.users(is_pro);
CREATE INDEX idx_users_credits ON public.users(credits);

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
  preferred_tone       TEXT         DEFAULT 'Professional',
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
-- 4. PLATFORMS (lookup table)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.platforms (
  id    VARCHAR(50) PRIMARY KEY,  -- 'instagram' | 'facebook' | 'tiktok' etc.
  name  TEXT        NOT NULL,
  icon  TEXT,
  color TEXT
);

INSERT INTO public.platforms (id, name, icon, color) VALUES
  ('instagram', 'Instagram',  'logo-instagram', '#E1306C'),
  ('facebook',  'Facebook',   'logo-facebook',  '#1877F2'),
  ('tiktok',    'TikTok',     'logo-tiktok',    '#000000'),
  ('twitter',   'Twitter/X',  'logo-twitter',   '#1DA1F2'),
  ('linkedin',  'LinkedIn',   'logo-linkedin',  '#0A66C2'),
  ('youtube',   'YouTube',    'logo-youtube',   '#FF0000'),
  ('threads',   'Threads',    'ellipsis-horizontal-circle', '#000000'),
  ('pinterest', 'Pinterest',  'logo-pinterest', '#E60023')
ON CONFLICT DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- 5. BRAND_PLATFORMS (many-to-many)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.brand_platforms (
  brand_id     UUID        NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  platform_id  VARCHAR(50) NOT NULL REFERENCES public.platforms(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (brand_id, platform_id)
);

CREATE INDEX idx_brand_platforms_brand ON public.brand_platforms(brand_id);


-- ─────────────────────────────────────────────────────────────
-- 6. CATEGORIES
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
-- 7. TEMPLATES
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
-- 8. GENERATED_ASSETS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.generated_assets (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID        REFERENCES public.users(id) ON DELETE CASCADE,
  template_id  UUID        REFERENCES public.templates(id) ON DELETE SET NULL,
  title        TEXT        NOT NULL,
  prompt       TEXT,
  asset_type   TEXT        NOT NULL DEFAULT 'image',   -- 'image' | 'copy' | 'video'
  output_url   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_generated_assets_user_id    ON public.generated_assets(user_id);
CREATE INDEX idx_generated_assets_created_at ON public.generated_assets(created_at DESC);


-- ─────────────────────────────────────────────────────────────
-- 9. CHAT_SESSIONS
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
-- 10. CHAT_MESSAGES
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
-- 11. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platforms         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_platforms   ENABLE ROW LEVEL SECURITY;
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

-- platforms (public lookup)
CREATE POLICY "platforms: public read" ON public.platforms FOR SELECT USING (TRUE);

-- brand_platforms
CREATE POLICY "brand_platforms: owner all" ON public.brand_platforms FOR ALL
  USING (brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid()));

-- categories (public catalogue)
CREATE POLICY "categories: public read" ON public.categories FOR SELECT USING (TRUE);

-- templates (public catalogue)
CREATE POLICY "templates: public read" ON public.templates FOR SELECT USING (TRUE);

-- generated_assets
CREATE POLICY "assets: select own"  ON public.generated_assets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "assets: insert own"  ON public.generated_assets FOR INSERT WITH CHECK (auth.uid() = user_id);
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
-- 12. RPC FUNCTIONS
-- ─────────────────────────────────────────────────────────────

-- deduct_credits: row-locked atomic deduction. Pro users bypass.
CREATE OR REPLACE FUNCTION public.deduct_credits(amount_to_deduct INTEGER)
RETURNS JSONB AS $$
DECLARE
  uid             UUID    := auth.uid();
  cur_credits     INTEGER;
  cur_is_pro      BOOLEAN;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT credits, is_pro INTO cur_credits, cur_is_pro
  FROM public.users WHERE id = uid FOR UPDATE;

  IF cur_is_pro THEN
    RETURN jsonb_build_object('success', true, 'remaining', cur_credits);
  END IF;

  IF cur_credits < amount_to_deduct THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient credits');
  END IF;

  UPDATE public.users SET credits = credits - amount_to_deduct WHERE id = uid;

  RETURN jsonb_build_object('success', true, 'remaining', cur_credits - amount_to_deduct);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- add_credits: atomic credit grant
-- TODO(Security): Replace with Supabase Edge Function triggered by RevenueCat Webhook
CREATE OR REPLACE FUNCTION public.add_credits(amount_to_add INTEGER)
RETURNS JSONB AS $$
DECLARE
  uid         UUID    := auth.uid();
  new_balance INTEGER;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  UPDATE public.users
  SET credits = credits + amount_to_add
  WHERE id = uid
  RETURNING credits INTO new_balance;

  RETURN jsonb_build_object('success', true, 'new_balance', new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
