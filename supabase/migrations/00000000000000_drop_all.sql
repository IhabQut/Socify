-- ============================================================
-- SOCIFY — NUCLEAR DROP
-- ⚠️  DESTROYS ALL DATA. Run this first in Supabase SQL Editor.
-- ============================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS set_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS set_brands_updated_at ON public.brands;
DROP TRIGGER IF EXISTS set_templates_updated_at ON public.templates;

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.deduct_credits(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.add_credits(INTEGER) CASCADE;

-- Drop all tables (order matters — children before parents)
DROP TABLE IF EXISTS public.chat_messages      CASCADE;
DROP TABLE IF EXISTS public.chat_sessions      CASCADE;
DROP TABLE IF EXISTS public.generated_assets   CASCADE;
DROP TABLE IF EXISTS public.assets             CASCADE;
DROP TABLE IF EXISTS public.brand_platforms    CASCADE;
DROP TABLE IF EXISTS public.platforms          CASCADE;
DROP TABLE IF EXISTS public.brands             CASCADE;
DROP TABLE IF EXISTS public.templates          CASCADE;
DROP TABLE IF EXISTS public.categories         CASCADE;
DROP TABLE IF EXISTS public.users              CASCADE;
