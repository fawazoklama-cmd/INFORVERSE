export type Language = 'en' | 'id';
export type ThemeMode = 'light' | 'dark';
export type ArticleStatus = 'draft' | 'scheduled' | 'published' | 'archived';
export type ArticleType = 'original' | 'ai_summary' | 'editorial';
export type SourceType = 'rss' | 'news_api' | 'government' | 'research' | 'international_org';
export type ContinentName =
  | 'Asia'
  | 'Europe'
  | 'Africa'
  | 'North America'
  | 'South America'
  | 'Oceania'
  | 'Antarctica';

export interface Category {
  id: string;
  slug: string;
  name_en: string;
  name_id: string;
  description_en: string;
  description_id: string;
  sort_order: number;
}

export interface Country {
  id: string;
  code: string;
  iso_numeric: string;
  name_en: string;
  name_id: string;
  continent: ContinentName;
}

export interface IndonesianRegion {
  id: string;
  slug: string;
  name_en: string;
  name_id: string;
  country_id: string;
  provinces: string[];
}

export interface Source {
  id: string;
  name: string;
  type: SourceType;
  url: string;
  country_code: string;
  default_category_slug: string;
  language: Language;
  is_active: boolean;
  last_fetched_at: string | null;
  last_status: 'idle' | 'ok' | 'error';
  last_error: string | null;
  retry_count: number;
  created_at: string;
}

export interface ArticleTranslation {
  id: string;
  article_id: string;
  language: Language;
  title: string;
  subtitle: string;
  summary: string;
  content: string;
  is_ai_translated: boolean;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  subtitle: string;
  summary: string;
  content: string;
  image_url: string;
  image_caption: string;
  category_id: string;
  country_id: string;
  region_id: string | null;
  province: string | null;
  source_id: string | null;
  source_name: string;
  source_url: string;
  author: string;
  article_type: ArticleType;
  requires_verification: boolean;
  is_verified: boolean;
  language: Language;
  status: ArticleStatus;
  is_automatic: boolean;
  is_featured: boolean;
  views_count: number;
  tags: string[];
  seo_title: string;
  seo_description: string;
  published_at: string;
  updated_at: string;
  created_at: string;
  translations?: Partial<Record<Language, ArticleTranslation>>;
}

export interface AutomationSettings {
  id: number;
  scheduler_enabled: boolean;
  update_interval_minutes: number;
  auto_publish: boolean;
  ai_summary_enabled: boolean;
  ai_translation_enabled: boolean;
  duplicate_detection_enabled: boolean;
  ai_model: string;
  summary_length: 'short' | 'medium' | 'detailed';
  ai_system_prompt: string;
  max_retries: number;
  token_usage_total: number;
  last_run_at: string | null;
  next_run_at: string | null;
}

export interface AutomationLog {
  id: string;
  log_type: 'automation' | 'fetch_error' | 'ai' | 'admin';
  status: 'success' | 'warning' | 'error' | 'info';
  source_id: string | null;
  message: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface WebsiteSettings {
  id: number;
  site_name: string;
  tagline: string;
  default_language: 'auto' | 'en' | 'id';
  default_theme: 'light' | 'dark';
  seo_title: string;
  seo_description: string;
  instagram_url: string;
  contact_email: string;
  footer_note: string;
  homepage_sections: {
    hero: boolean;
    latest: boolean;
    world: boolean;
    indonesia: boolean;
    trending: boolean;
    techScience: boolean;
    worldMap: boolean;
    moreInfo: boolean;
    newsletter: boolean;
  };
}

export interface AdminDashboardStats {
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  totalCategories: number;
  activeSources: number;
  totalVisitors: number;
  automaticUpdates: number;
  failedUpdates: number;
  newsletterSubscribers: number;
  integrations: {
    supabaseConfigured: boolean;
    geminiConfigured: boolean;
    newsApiConfigured: boolean;
    newsletterConfigured: boolean;
  };
}
