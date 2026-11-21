-- INFORVERSE — Complete Supabase PostgreSQL Database Schema
-- Covers all 15 core tables, Primary Keys, Foreign Keys, Indexes, Unique Constraints, and Row Level Security (RLS)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Categories (16 editorial categories)
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name_en TEXT NOT NULL,
  name_id TEXT NOT NULL,
  description_en TEXT NOT NULL DEFAULT '',
  description_id TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Countries (with continent & ISO numeric/alpha codes for World Map)
CREATE TABLE IF NOT EXISTS public.countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE, -- ISO alpha-2 e.g. 'ID', 'US', 'JP'
  iso_numeric TEXT,          -- ISO numeric string e.g. '360', '840' for world-atlas
  name_en TEXT NOT NULL,
  name_id TEXT NOT NULL,
  continent TEXT NOT NULL CHECK (continent IN ('Asia', 'Europe', 'Africa', 'North America', 'South America', 'Oceania', 'Antarctica')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Indonesian Regions & Provinces
CREATE TABLE IF NOT EXISTS public.regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name_en TEXT NOT NULL,
  name_id TEXT NOT NULL,
  country_id UUID REFERENCES public.countries(id) ON DELETE CASCADE,
  provinces JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Information Sources (RSS Feeds, News API, Official Organizations)
CREATE TABLE IF NOT EXISTS public.sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('rss', 'news_api', 'government', 'research', 'international_org')),
  url TEXT NOT NULL,
  country_code TEXT,
  default_category_slug TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_fetched_at TIMESTAMPTZ,
  last_status TEXT NOT NULL DEFAULT 'idle' CHECK (last_status IN ('idle', 'ok', 'error')),
  last_error TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Articles
CREATE TABLE IF NOT EXISTS public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  subtitle TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT NOT NULL DEFAULT '',
  image_caption TEXT NOT NULL DEFAULT '',
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  country_id UUID REFERENCES public.countries(id) ON DELETE SET NULL,
  region_id UUID REFERENCES public.regions(id) ON DELETE SET NULL,
  province TEXT,
  source_id UUID REFERENCES public.sources(id) ON DELETE SET NULL,
  source_name TEXT NOT NULL DEFAULT 'INFORVERSE Editorial',
  source_url TEXT NOT NULL DEFAULT '',
  author TEXT NOT NULL DEFAULT 'INFORVERSE Desk',
  article_type TEXT NOT NULL DEFAULT 'editorial' CHECK (article_type IN ('original', 'ai_summary', 'editorial')),
  requires_verification BOOLEAN NOT NULL DEFAULT FALSE,
  is_verified BOOLEAN NOT NULL DEFAULT TRUE,
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'id')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
  is_automatic BOOLEAN NOT NULL DEFAULT FALSE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  views_count INTEGER NOT NULL DEFAULT 0,
  seo_title TEXT NOT NULL DEFAULT '',
  seo_description TEXT NOT NULL DEFAULT '',
  published_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Article Sources Provenance
CREATE TABLE IF NOT EXISTS public.article_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  source_id UUID REFERENCES public.sources(id) ON DELETE SET NULL,
  external_guid TEXT,
  original_url TEXT NOT NULL,
  original_title TEXT NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(original_url)
);

-- 7. Article Translations (EN / ID bilingual summaries & full content)
CREATE TABLE IF NOT EXISTS public.article_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  language TEXT NOT NULL CHECK (language IN ('en', 'id')),
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL,
  content TEXT NOT NULL,
  is_ai_translated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(article_id, language)
);

-- 8. Tags
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);

-- 9. Article Tags Join Table
CREATE TABLE IF NOT EXISTS public.article_tags (
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);

-- 10. Admin Profiles (linked to Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.admin_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL DEFAULT 'Administrator',
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'editor')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Automation Settings (singleton row id = 1)
CREATE TABLE IF NOT EXISTS public.automation_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  scheduler_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  update_interval_minutes INTEGER NOT NULL DEFAULT 30,
  auto_publish BOOLEAN NOT NULL DEFAULT FALSE,
  ai_summary_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ai_translation_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  duplicate_detection_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ai_model TEXT NOT NULL DEFAULT 'gemini-4-hydrogen',
  summary_length TEXT NOT NULL DEFAULT 'medium' CHECK (summary_length IN ('short', 'medium', 'detailed')),
  ai_system_prompt TEXT NOT NULL DEFAULT '',
  max_retries INTEGER NOT NULL DEFAULT 3,
  token_usage_total INTEGER NOT NULL DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ
);

-- 12. Automation & Activity Logs
CREATE TABLE IF NOT EXISTS public.automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_type TEXT NOT NULL CHECK (log_type IN ('automation', 'fetch_error', 'ai', 'admin')),
  status TEXT NOT NULL CHECK (status IN ('success', 'warning', 'error', 'info')),
  source_id UUID REFERENCES public.sources(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Website Settings (singleton row id = 1)
CREATE TABLE IF NOT EXISTS public.website_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  site_name TEXT NOT NULL DEFAULT 'INFORVERSE',
  tagline TEXT NOT NULL DEFAULT 'Explore The World, Discover The Information.',
  default_language TEXT NOT NULL DEFAULT 'auto' CHECK (default_language IN ('auto', 'en', 'id')),
  default_theme TEXT NOT NULL DEFAULT 'light' CHECK (default_theme IN ('light', 'dark')),
  seo_title TEXT NOT NULL DEFAULT 'INFORVERSE — Global & Indonesia Information Portal',
  seo_description TEXT NOT NULL DEFAULT 'Global news, Indonesian regional updates, science, technology, and AI-assisted editorial summaries.',
  instagram_url TEXT NOT NULL DEFAULT 'https://www.instagram.com/wazzz.dotcom/',
  contact_email TEXT NOT NULL DEFAULT 'editorial@inforverse.org',
  footer_note TEXT NOT NULL DEFAULT 'Explore The World, Discover The Information.',
  homepage_sections JSONB NOT NULL DEFAULT '{"hero":true,"latest":true,"world":true,"indonesia":true,"trending":true,"techScience":true,"worldMap":true,"moreInfo":true,"newsletter":true}'::jsonb
);

-- 14. Visitors Analytics
CREATE TABLE IF NOT EXISTS public.visitors_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT NOT NULL,
  article_id UUID REFERENCES public.articles(id) ON DELETE SET NULL,
  language TEXT NOT NULL DEFAULT 'en',
  visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. Newsletter Subscribers
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  language TEXT NOT NULL DEFAULT 'en',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')),
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast editorial queries & search
CREATE INDEX IF NOT EXISTS idx_articles_status_published ON public.articles(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_category ON public.articles(category_id);
CREATE INDEX IF NOT EXISTS idx_articles_country ON public.articles(country_id);
CREATE INDEX IF NOT EXISTS idx_articles_region ON public.articles(region_id);
CREATE INDEX IF NOT EXISTS idx_articles_views ON public.articles(views_count DESC);
CREATE INDEX IF NOT EXISTS idx_automation_logs_created ON public.automation_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitors_visited_at ON public.visitors_analytics(visited_at DESC);

-- Helper function to check Admin status
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_profiles WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Row Level Security (RLS)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitors_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Public Read Policies (Published content & taxonomy only)
CREATE POLICY "Public read categories" ON public.categories FOR SELECT USING (TRUE);
CREATE POLICY "Public read countries" ON public.countries FOR SELECT USING (TRUE);
CREATE POLICY "Public read regions" ON public.regions FOR SELECT USING (TRUE);
CREATE POLICY "Public read tags" ON public.tags FOR SELECT USING (TRUE);
CREATE POLICY "Public read website_settings" ON public.website_settings FOR SELECT USING (TRUE);
CREATE POLICY "Public read published articles" ON public.articles FOR SELECT USING (status = 'published');
CREATE POLICY "Public read published article translations" ON public.article_translations FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.articles a WHERE a.id = article_id AND a.status = 'published')
);
CREATE POLICY "Public read article tags" ON public.article_tags FOR SELECT USING (TRUE);

-- Admin Full Access Policies
CREATE POLICY "Admin manage categories" ON public.categories FOR ALL USING (public.is_admin());
CREATE POLICY "Admin manage countries" ON public.countries FOR ALL USING (public.is_admin());
CREATE POLICY "Admin manage regions" ON public.regions FOR ALL USING (public.is_admin());
CREATE POLICY "Admin manage sources" ON public.sources FOR ALL USING (public.is_admin());
CREATE POLICY "Admin manage articles" ON public.articles FOR ALL USING (public.is_admin());
CREATE POLICY "Admin manage article_sources" ON public.article_sources FOR ALL USING (public.is_admin());
CREATE POLICY "Admin manage article_translations" ON public.article_translations FOR ALL USING (public.is_admin());
CREATE POLICY "Admin manage tags" ON public.tags FOR ALL USING (public.is_admin());
CREATE POLICY "Admin manage article_tags" ON public.article_tags FOR ALL USING (public.is_admin());
CREATE POLICY "Admin manage admin_profiles" ON public.admin_profiles FOR SELECT USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "Admin manage automation_settings" ON public.automation_settings FOR ALL USING (public.is_admin());
CREATE POLICY "Admin manage automation_logs" ON public.automation_logs FOR ALL USING (public.is_admin());
CREATE POLICY "Admin manage website_settings" ON public.website_settings FOR ALL USING (public.is_admin());
CREATE POLICY "Admin read visitors_analytics" ON public.visitors_analytics FOR SELECT USING (public.is_admin());
CREATE POLICY "Admin read newsletter_subscribers" ON public.newsletter_subscribers FOR SELECT USING (public.is_admin());
