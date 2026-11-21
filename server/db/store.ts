import fs from 'node:fs';
import path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  AdminDashboardStats,
  Article,
  AutomationLog,
  AutomationSettings,
  Category,
  Country,
  IndonesianRegion,
  Source,
  WebsiteSettings,
} from '../../src/types/inforverse';
import {
  DEFAULT_AUTOMATION_SETTINGS,
  DEFAULT_WEBSITE_SETTINGS,
  INITIAL_LOGS,
  SEED_ARTICLES,
  SEED_CATEGORIES,
  SEED_COUNTRIES,
  SEED_REGIONS,
  SEED_SOURCES,
} from './seed';

interface LocalAdminCredential {
  email: string;
  passwordHash: string;
  salt: string;
  role: 'super_admin' | 'admin' | 'editor';
  createdAt: string;
}

interface StoreState {
  categories: Category[];
  countries: Country[];
  regions: IndonesianRegion[];
  sources: Source[];
  articles: Article[];
  automationSettings: AutomationSettings;
  websiteSettings: WebsiteSettings;
  logs: AutomationLog[];
  visitorsCount: number;
  newsletterSubscribers: Array<{ id: string; email: string; language: string; subscribedAt: string }>;
  contactMessages: Array<{ id: string; name: string; email: string; subject: string; message: string; createdAt: string }>;
  adminCredential: LocalAdminCredential | null;
}

const DATA_DIR = path.resolve(process.cwd(), 'server', 'data');
const DATA_FILE = path.join(DATA_DIR, 'inforverse-store.json');

function getInitialState(): StoreState {
  return {
    categories: structuredClone(SEED_CATEGORIES),
    countries: structuredClone(SEED_COUNTRIES),
    regions: structuredClone(SEED_REGIONS),
    sources: structuredClone(SEED_SOURCES),
    articles: structuredClone(SEED_ARTICLES),
    automationSettings: structuredClone(DEFAULT_AUTOMATION_SETTINGS),
    websiteSettings: structuredClone(DEFAULT_WEBSITE_SETTINGS),
    logs: structuredClone(INITIAL_LOGS),
    visitorsCount: 1420,
    newsletterSubscribers: [],
    contactMessages: [],
    adminCredential: null,
  };
}

class InforverseStore {
  private state: StoreState;
  private supabase: SupabaseClient | null = null;

  constructor() {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      });
    }
    this.state = this.loadLocal();
  }

  public isSupabaseConnected(): boolean {
    return Boolean(this.supabase);
  }

  private loadLocal(): StoreState {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        const parsed = JSON.parse(raw) as Partial<StoreState>;
        const defaults = getInitialState();
        return {
          ...defaults,
          ...parsed,
          automationSettings: { ...defaults.automationSettings, ...parsed.automationSettings },
          websiteSettings: {
            ...defaults.websiteSettings,
            ...parsed.websiteSettings,
            homepage_sections: {
              ...defaults.websiteSettings.homepage_sections,
              ...(parsed.websiteSettings?.homepage_sections || {}),
            },
          },
        };
      }
    } catch {
      // Fallback cleanly to initial seed if local file is missing or unreadable
    }
    const fresh = getInitialState();
    this.saveLocal(fresh);
    return fresh;
  }

  private saveLocal(nextState?: StoreState): void {
    const target = nextState || this.state;
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      const tempFile = `${DATA_FILE}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(target, null, 2), 'utf8');
      fs.renameSync(tempFile, DATA_FILE);
    } catch {
      // Ignore write failures in read-only serverless runtimes (e.g. Vercel when Supabase is active)
    }
  }

  public getCategories(): Category[] {
    return [...this.state.categories].sort((a, b) => a.sort_order - b.sort_order);
  }

  public upsertCategory(category: Category): Category {
    const idx = this.state.categories.findIndex((c) => c.id === category.id);
    if (idx >= 0) {
      this.state.categories[idx] = category;
    } else {
      this.state.categories.push(category);
    }
    this.saveLocal();
    return category;
  }

  public deleteCategory(id: string): boolean {
    const before = this.state.categories.length;
    this.state.categories = this.state.categories.filter((c) => c.id !== id);
    if (this.state.categories.length !== before) {
      this.saveLocal();
      return true;
    }
    return false;
  }

  public getCountries(): Country[] {
    return [...this.state.countries].sort((a, b) => a.name_en.localeCompare(b.name_en));
  }

  public upsertCountry(country: Country): Country {
    const idx = this.state.countries.findIndex((c) => c.id === country.id);
    if (idx >= 0) {
      this.state.countries[idx] = country;
    } else {
      this.state.countries.push(country);
    }
    this.saveLocal();
    return country;
  }

  public getRegions(): IndonesianRegion[] {
    return [...this.state.regions];
  }

  public getSources(): Source[] {
    return [...this.state.sources];
  }

  public getSourceById(id: string): Source | undefined {
    return this.state.sources.find((s) => s.id === id);
  }

  public upsertSource(source: Source): Source {
    const idx = this.state.sources.findIndex((s) => s.id === source.id);
    if (idx >= 0) {
      this.state.sources[idx] = source;
    } else {
      this.state.sources.push(source);
    }
    this.saveLocal();
    return source;
  }

  public deleteSource(id: string): boolean {
    const before = this.state.sources.length;
    this.state.sources = this.state.sources.filter((s) => s.id !== id);
    if (this.state.sources.length !== before) {
      this.saveLocal();
      return true;
    }
    return false;
  }

  public getArticles(includeAllStatuses = false): Article[] {
    const now = Date.now();
    // Automatically promote scheduled articles whose published_at has arrived
    let changed = false;
    for (const art of this.state.articles) {
      if (art.status === 'scheduled' && new Date(art.published_at).getTime() <= now) {
        art.status = 'published';
        changed = true;
      }
    }
    if (changed) this.saveLocal();

    const list = includeAllStatuses
      ? this.state.articles
      : this.state.articles.filter((a) => a.status === 'published');
    return [...list].sort(
      (a, b) => new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime()
    );
  }

  public getArticleBySlug(slug: string, includeAllStatuses = false): Article | undefined {
    return this.getArticles(includeAllStatuses).find((a) => a.slug === slug);
  }

  public getArticleById(id: string): Article | undefined {
    return this.state.articles.find((a) => a.id === id);
  }

  public upsertArticle(article: Article): Article {
    const idx = this.state.articles.findIndex((a) => a.id === article.id);
    if (idx >= 0) {
      this.state.articles[idx] = article;
    } else {
      this.state.articles.unshift(article);
    }
    this.saveLocal();
    if (this.supabase) {
      // Best-effort sync to Supabase when configured
      void this.supabase.from('articles').upsert({
        id: article.id,
        title: article.title,
        slug: article.slug,
        subtitle: article.subtitle,
        summary: article.summary,
        content: article.content,
        image_url: article.image_url,
        image_caption: article.image_caption,
        source_name: article.source_name,
        source_url: article.source_url,
        author: article.author,
        article_type: article.article_type,
        requires_verification: article.requires_verification,
        is_verified: article.is_verified,
        language: article.language,
        status: article.status,
        is_automatic: article.is_automatic,
        is_featured: article.is_featured,
        views_count: article.views_count,
        seo_title: article.seo_title,
        seo_description: article.seo_description,
        published_at: article.published_at,
        updated_at: article.updated_at,
      });
    }
    return article;
  }

  public deleteArticle(id: string): boolean {
    const before = this.state.articles.length;
    this.state.articles = this.state.articles.filter((a) => a.id !== id);
    if (this.state.articles.length !== before) {
      this.saveLocal();
      return true;
    }
    return false;
  }

  public incrementArticleViews(slug: string): void {
    const article = this.state.articles.find((a) => a.slug === slug);
    if (article) {
      article.views_count += 1;
      this.saveLocal();
    }
  }

  public recordVisitor(): void {
    this.state.visitorsCount += 1;
    this.saveLocal();
  }

  public getAutomationSettings(): AutomationSettings {
    return { ...this.state.automationSettings };
  }

  public updateAutomationSettings(patch: Partial<AutomationSettings>): AutomationSettings {
    this.state.automationSettings = {
      ...this.state.automationSettings,
      ...patch,
      id: 1,
    };
    this.saveLocal();
    return this.getAutomationSettings();
  }

  public addTokenUsage(tokens: number): void {
    if (tokens > 0) {
      this.state.automationSettings.token_usage_total += tokens;
      this.saveLocal();
    }
  }

  public getWebsiteSettings(): WebsiteSettings {
    return structuredClone(this.state.websiteSettings);
  }

  public updateWebsiteSettings(patch: Partial<WebsiteSettings>): WebsiteSettings {
    this.state.websiteSettings = {
      ...this.state.websiteSettings,
      ...patch,
      homepage_sections: {
        ...this.state.websiteSettings.homepage_sections,
        ...(patch.homepage_sections || {}),
      },
      id: 1,
    };
    this.saveLocal();
    return this.getWebsiteSettings();
  }

  public getLogs(limit = 80): AutomationLog[] {
    return [...this.state.logs]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
  }

  public addLog(entry: Omit<AutomationLog, 'id' | 'created_at'>): AutomationLog {
    const fullEntry: AutomationLog = {
      ...entry,
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      created_at: new Date().toISOString(),
    };
    this.state.logs.unshift(fullEntry);
    if (this.state.logs.length > 250) {
      this.state.logs = this.state.logs.slice(0, 250);
    }
    this.saveLocal();
    return fullEntry;
  }

  public addNewsletterSubscriber(email: string, language: string): boolean {
    const normalized = email.trim().toLowerCase();
    if (this.state.newsletterSubscribers.some((s) => s.email === normalized)) {
      return false;
    }
    this.state.newsletterSubscribers.push({
      id: `sub-${Date.now()}`,
      email: normalized,
      language,
      subscribedAt: new Date().toISOString(),
    });
    this.saveLocal();
    return true;
  }

  public addContactMessage(msg: { name: string; email: string; subject: string; message: string }): void {
    this.state.contactMessages.unshift({
      id: `msg-${Date.now()}`,
      ...msg,
      createdAt: new Date().toISOString(),
    });
    this.saveLocal();
  }

  public getAdminCredential(): LocalAdminCredential | null {
    return this.state.adminCredential;
  }

  public setAdminCredential(cred: LocalAdminCredential): void {
    this.state.adminCredential = cred;
    this.saveLocal();
  }

  public getDashboardStats(): AdminDashboardStats {
    const articles = this.state.articles;
    const logs = this.state.logs;
    return {
      totalArticles: articles.length,
      publishedArticles: articles.filter((a) => a.status === 'published').length,
      draftArticles: articles.filter((a) => a.status === 'draft').length,
      totalCategories: this.state.categories.length,
      activeSources: this.state.sources.filter((s) => s.is_active).length,
      totalVisitors: this.state.visitorsCount,
      automaticUpdates: logs.filter((l) => l.log_type === 'automation' && l.status === 'success').length,
      failedUpdates: logs.filter((l) => l.log_type === 'fetch_error' || l.status === 'error').length,
      newsletterSubscribers: this.state.newsletterSubscribers.length,
      integrations: {
        supabaseConfigured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
        geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
        newsApiConfigured: Boolean(process.env.NEWS_API_KEY),
        newsletterConfigured: process.env.NEWSLETTER_ENABLED === 'true',
      },
    };
  }
}

export const dbStore = new InforverseStore();
