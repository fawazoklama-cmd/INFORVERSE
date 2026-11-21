import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import type {
  AdminProfile,
  Article,
  ArticleTranslation,
  AutomationLog,
  AutomationSettings,
  Category,
  Country,
  IndonesianRegion,
  Language,
  Source,
  WebsiteSettings,
} from '../types/inforverse';
import {
  DEFAULT_AUTOMATION_SETTINGS,
  DEFAULT_WEBSITE_SETTINGS,
  INITIAL_LOGS,
  SEED_ARTICLES,
  SEED_CATEGORIES,
  SEED_COUNTRIES,
  SEED_REGIONS,
  SEED_SOURCES,
} from '../data/baselineCatalog';

const BOOTSTRAPPED_ADMIN_EMAIL = 'fawazoklama@gmail.com';

function toIsoString(value: unknown, fallback = new Date().toISOString()): string {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === 'string' && value.trim()) return value;
  return fallback;
}

function mapCategoryFromFirestore(raw: Record<string, unknown>, id: string): Category {
  return {
    id: String(raw.id || id),
    slug: String(raw.slug || id),
    name_en: String(raw.nameEn || raw.name || ''),
    name_id: String(raw.nameId || raw.name || ''),
    description_en: String(raw.description || ''),
    description_id: String(raw.descriptionId || raw.description || ''),
    sort_order: Number(raw.sortOrder ?? 99),
  };
}

function mapCountryFromFirestore(raw: Record<string, unknown>, id: string): Country {
  return {
    id: String(raw.id || id),
    code: String(raw.code || 'ID'),
    iso_numeric: String(raw.isoNumeric || ''),
    name_en: String(raw.name || ''),
    name_id: String(raw.nameId || raw.name || ''),
    continent: (raw.continent as Country['continent']) || 'Asia',
  };
}

function mapRegionFromFirestore(raw: Record<string, unknown>, id: string): IndonesianRegion {
  return {
    id: String(raw.id || id),
    slug: String(raw.slug || id),
    name_en: String(raw.name || ''),
    name_id: String(raw.nameId || raw.name || ''),
    country_id: String(raw.countryId || 'co-id'),
    provinces: Array.isArray(raw.provinces) ? raw.provinces.map(String) : [],
  };
}

function mapSourceFromFirestore(raw: Record<string, unknown>, id: string): Source {
  return {
    id: String(raw.id || id),
    name: String(raw.name || ''),
    type: (raw.apiType as Source['type']) || 'rss',
    url: String(raw.url || raw.rssUrl || ''),
    country_code: String(raw.countryCode || 'US'),
    default_category_slug: String(raw.defaultCategorySlug || 'world'),
    language: (raw.language as Language) || 'en',
    is_active: Boolean(raw.isActive ?? true),
    last_fetched_at: raw.lastFetchedAt ? String(raw.lastFetchedAt) : null,
    last_status: (raw.status as Source['last_status']) || 'idle',
    last_error: raw.lastError ? String(raw.lastError) : null,
    retry_count: Number(raw.retryCount ?? 0),
    created_at: toIsoString(raw.createdAt),
  };
}

function mapTranslationFromFirestore(raw: Record<string, unknown>, id: string): ArticleTranslation {
  return {
    id: String(raw.id || id),
    article_id: String(raw.articleId || ''),
    language: (raw.language as Language) || 'id',
    title: String(raw.translatedTitle || ''),
    subtitle: String(raw.translatedSubtitle || ''),
    summary: String(raw.translatedSummary || ''),
    content: String(raw.translatedContent || ''),
    is_ai_translated: Boolean(raw.isAiTranslated ?? false),
  };
}

function mapArticleFromFirestore(
  raw: Record<string, unknown>,
  id: string,
  translations?: Partial<Record<Language, ArticleTranslation>>
): Article {
  return {
    id: String(raw.id || id),
    title: String(raw.title || ''),
    slug: String(raw.slug || id),
    subtitle: String(raw.subtitle || ''),
    summary: String(raw.summary || ''),
    content: String(raw.content || ''),
    image_url: String(raw.imageUrl || ''),
    image_caption: String(raw.imageCaption || ''),
    category_id: String(raw.categoryId || 'cat-world'),
    country_id: String(raw.countryId || 'co-id'),
    region_id: raw.regionId ? String(raw.regionId) : null,
    province: raw.province ? String(raw.province) : null,
    source_id: raw.sourceId ? String(raw.sourceId) : null,
    source_name: String(raw.sourceName || 'INFORVERSE Editorial'),
    source_url: String(raw.sourceUrl || ''),
    author: String(raw.author || 'INFORVERSE Desk'),
    article_type: (raw.articleType as Article['article_type']) || 'editorial',
    requires_verification: Boolean(raw.requiresVerification ?? false),
    is_verified: Boolean(raw.isVerified ?? true),
    language: (raw.language as Language) || 'en',
    status: (raw.status as Article['status']) || 'published',
    is_automatic: Boolean(raw.isAutomatic ?? false),
    is_featured: Boolean(raw.isFeatured ?? false),
    views_count: Number(raw.viewCount ?? 0),
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
    seo_title: String(raw.seoTitle || ''),
    seo_description: String(raw.seoDescription || ''),
    published_at: toIsoString(raw.publishedAt),
    updated_at: toIsoString(raw.updatedAt),
    created_at: toIsoString(raw.createdAt),
    translations,
  };
}

function mapWebsiteSettingsFromFirestore(raw: Record<string, unknown>): WebsiteSettings {
  const social = (raw.socialLinks as Record<string, unknown> | undefined) || {};
  const seo = (raw.seoSettings as Record<string, unknown> | undefined) || {};
  const sections = (raw.homepageSections as WebsiteSettings['homepage_sections'] | undefined) || DEFAULT_WEBSITE_SETTINGS.homepage_sections;
  return {
    id: 1,
    site_name: String(raw.websiteName || DEFAULT_WEBSITE_SETTINGS.site_name),
    tagline: String(raw.tagline || DEFAULT_WEBSITE_SETTINGS.tagline),
    logo_url:
      typeof raw.logoUrl === 'string' && raw.logoUrl.trim()
        ? raw.logoUrl.trim()
        : DEFAULT_WEBSITE_SETTINGS.logo_url,
    default_language: (raw.defaultLanguage as WebsiteSettings['default_language']) || 'auto',
    default_theme: (raw.theme as WebsiteSettings['default_theme']) || 'light',
    seo_title: String(seo.seoTitle || DEFAULT_WEBSITE_SETTINGS.seo_title),
    seo_description: String(seo.seoDescription || DEFAULT_WEBSITE_SETTINGS.seo_description),
    instagram_url: String(social.instagramUrl || DEFAULT_WEBSITE_SETTINGS.instagram_url),
    contact_email: String(raw.contactEmail || DEFAULT_WEBSITE_SETTINGS.contact_email),
    footer_note: String(raw.footerNote || DEFAULT_WEBSITE_SETTINGS.footer_note),
    homepage_sections: {
      ...DEFAULT_WEBSITE_SETTINGS.homepage_sections,
      ...sections,
    },
  };
}

function mapAutomationSettingsFromFirestore(raw: Record<string, unknown>): AutomationSettings {
  return {
    id: 1,
    scheduler_enabled: Boolean(raw.enabled ?? false),
    update_interval_minutes: Number(raw.updateInterval ?? 30),
    auto_publish: Boolean(raw.autoPublish ?? false),
    ai_summary_enabled: Boolean(raw.enableAiSummary ?? true),
    ai_translation_enabled: Boolean(raw.enableTranslation ?? true),
    duplicate_detection_enabled: Boolean(raw.enableDuplicateDetection ?? true),
    ai_model: String(raw.aiModel || DEFAULT_AUTOMATION_SETTINGS.ai_model),
    summary_length: (raw.summaryLength as AutomationSettings['summary_length']) || 'medium',
    ai_system_prompt: String(raw.aiSystemPrompt || DEFAULT_AUTOMATION_SETTINGS.ai_system_prompt),
    max_retries: Number(raw.maxRetries ?? 3),
    token_usage_total: Number(raw.tokenUsageTotal ?? 0),
    last_run_at: raw.lastRunAt ? String(raw.lastRunAt) : null,
    next_run_at: raw.nextRunAt ? String(raw.nextRunAt) : null,
  };
}

function mapLogFromFirestore(raw: Record<string, unknown>, id: string): AutomationLog {
  return {
    id: String(raw.id || id),
    log_type: (raw.logType as AutomationLog['log_type']) || 'automation',
    status: (raw.status as AutomationLog['status']) || 'info',
    source_id: raw.sourceId ? String(raw.sourceId) : null,
    message: String(raw.message || `Fetched ${Number(raw.articlesFetched ?? 0)}, published ${Number(raw.articlesPublished ?? 0)}`),
    details: {
      articlesFetched: Number(raw.articlesFetched ?? 0),
      articlesPublished: Number(raw.articlesPublished ?? 0),
      errors: Array.isArray(raw.errors) ? raw.errors : [],
    },
    created_at: toIsoString(raw.createdAt),
  };
}

// ================================
// PUBLIC FIRESTORE READ SERVICES
// ================================

export async function fetchPublicBootstrapFromFirestore(): Promise<{
  categories: Category[];
  countries: Country[];
  regions: IndonesianRegion[];
  websiteSettings: WebsiteSettings | null;
} | null> {
  try {
    const [catSnap, countrySnap, regionSnap, siteSnap] = await Promise.all([
      getDocs(query(collection(db, 'categories'), where('isActive', '==', true))),
      getDocs(query(collection(db, 'countries'), where('isActive', '==', true))),
      getDocs(query(collection(db, 'regions'), where('isActive', '==', true))),
      getDoc(doc(db, 'websiteSettings', 'default')),
    ]);

    if (catSnap.empty && countrySnap.empty) {
      return null;
    }

    const categories = catSnap.docs
      .map((d) => mapCategoryFromFirestore(d.data(), d.id))
      .sort((a, b) => a.sort_order - b.sort_order);

    const countries = countrySnap.docs
      .map((d) => mapCountryFromFirestore(d.data(), d.id))
      .sort((a, b) => a.name_en.localeCompare(b.name_en));

    const regions = regionSnap.docs.map((d) => mapRegionFromFirestore(d.data(), d.id));
    const websiteSettings = siteSnap.exists() ? mapWebsiteSettingsFromFirestore(siteSnap.data()) : null;

    return { categories, countries, regions, websiteSettings };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'categories|countries|regions|websiteSettings');
  }
}

export async function fetchPublishedArticlesPage(options?: {
  pageSize?: number;
  cursor?: DocumentSnapshot | null;
  categoryId?: string;
  countryId?: string;
  regionId?: string;
}): Promise<{ articles: Article[]; lastDoc: DocumentSnapshot | null; hasMore: boolean }> {
  const pageSize = Math.min(100, Math.max(1, options?.pageSize ?? 50));
  try {
    const constraints: Parameters<typeof query>[1][] = [where('status', '==', 'published')];
    if (options?.categoryId) constraints.push(where('categoryId', '==', options.categoryId));
    if (options?.countryId) constraints.push(where('countryId', '==', options.countryId));
    if (options?.regionId) constraints.push(where('regionId', '==', options.regionId));
    if (options?.cursor) constraints.push(startAfter(options.cursor));
    constraints.push(limit(pageSize));

    const [artSnap, trSnap] = await Promise.all([
      getDocs(query(collection(db, 'articles'), ...constraints)),
      getDocs(query(collection(db, 'articleTranslations'), where('status', '==', 'published'), limit(120))),
    ]);

    const transByArticle = new Map<string, Partial<Record<Language, ArticleTranslation>>>();
    for (const td of trSnap.docs) {
      const mapped = mapTranslationFromFirestore(td.data(), td.id);
      const current = transByArticle.get(mapped.article_id) || {};
      current[mapped.language] = mapped;
      transByArticle.set(mapped.article_id, current);
    }

    const articles = artSnap.docs
      .map((d) => mapArticleFromFirestore(d.data(), d.id, transByArticle.get(d.id)))
      .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());

    return {
      articles,
      lastDoc: artSnap.docs.length > 0 ? artSnap.docs[artSnap.docs.length - 1] : null,
      hasMore: artSnap.docs.length === pageSize,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'articles');
  }
}

export async function fetchPublishedArticleBySlug(slug: string): Promise<{
  article: Article | null;
  related: Article[];
}> {
  try {
    const artSnap = await getDocs(
      query(collection(db, 'articles'), where('status', '==', 'published'), where('slug', '==', slug), limit(1))
    );
    if (artSnap.empty) {
      return { article: null, related: [] };
    }
    const docSnap = artSnap.docs[0];
    const trSnap = await getDocs(
      query(
        collection(db, 'articleTranslations'),
        where('status', '==', 'published'),
        where('articleId', '==', docSnap.id),
        limit(4)
      )
    );
    const translations: Partial<Record<Language, ArticleTranslation>> = {};
    for (const td of trSnap.docs) {
      const mapped = mapTranslationFromFirestore(td.data(), td.id);
      translations[mapped.language] = mapped;
    }

    const article = mapArticleFromFirestore(docSnap.data(), docSnap.id, translations);

    const relSnap = await getDocs(
      query(collection(db, 'articles'), where('status', '==', 'published'), where('categoryId', '==', article.category_id), limit(6))
    );
    const related = relSnap.docs
      .filter((d) => d.id !== article.id)
      .slice(0, 4)
      .map((d) => mapArticleFromFirestore(d.data(), d.id));

    return { article, related };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `articles/${slug}`);
  }
}

export function subscribeLatestPublishedArticles(
  maxItems: number,
  onData: (articles: Article[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, 'articles'), where('status', '==', 'published'), limit(maxItems));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => mapArticleFromFirestore(d.data(), d.id))
        .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
      onData(list);
    },
    (error) => {
      if (onError) {
        onError(error);
        return;
      }
      handleFirestoreError(error, OperationType.LIST, 'articles');
    }
  );
}

export async function loadPublishedArticlesWithFallback(options?: {
  pageSize?: number;
  cursor?: DocumentSnapshot | null;
  categoryId?: string;
  categorySlug?: string;
  countryId?: string;
  countryCode?: string;
  regionId?: string;
}): Promise<{
  articles: Article[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
  source: 'firestore' | 'api';
}> {
  const pageSize = Math.min(100, Math.max(1, options?.pageSize ?? 50));
  try {
    const fsRes = await fetchPublishedArticlesPage({
      pageSize,
      cursor: options?.cursor,
      categoryId: options?.categoryId,
      countryId: options?.countryId,
      regionId: options?.regionId,
    });

    if (fsRes.articles.length > 0 || options?.cursor) {
      return { ...fsRes, source: 'firestore' };
    }

    // Check if Firestore has any published articles at all before falling back to Express baseline
    const probe = await getDocs(query(collection(db, 'articles'), where('status', '==', 'published'), limit(1)));
    if (!probe.empty) {
      return { articles: [], lastDoc: null, hasMore: false, source: 'firestore' };
    }
  } catch {
    // Fall back transparently to Express baseline API
  }

  const params = new URLSearchParams();
  params.set('limit', String(pageSize));
  if (options?.categorySlug) params.set('category', options.categorySlug);
  if (options?.countryCode) params.set('country', options.countryCode);
  if (options?.regionId) params.set('region', options.regionId);

  const res = await fetch(`/api/articles?${params.toString()}`);
  if (!res.ok) {
    throw new Error('Failed to load articles');
  }
  const data = await res.json();
  return {
    articles: (data.articles || []) as Article[],
    lastDoc: null,
    hasMore: false,
    source: 'api',
  };
}

export async function loadPublishedArticleBySlugWithFallback(slug: string): Promise<{
  article: Article | null;
  related: Article[];
}> {
  try {
    const fsRes = await fetchPublishedArticleBySlug(slug);
    if (fsRes.article) {
      return fsRes;
    }
  } catch {
    // Fall back to Express baseline API
  }

  const res = await fetch(`/api/articles/${encodeURIComponent(slug)}`);
  if (res.status === 404) {
    return { article: null, related: [] };
  }
  if (!res.ok) {
    throw new Error('Failed to load article');
  }
  const data = await res.json();
  return {
    article: (data.article as Article) || null,
    related: (data.related as Article[]) || [],
  };
}

// ================================
// ADMIN AUTH & AUTHORIZATION
// ================================

export async function verifyAdminAuthorization(uid: string, email: string | null): Promise<AdminProfile | null> {
  const normalizedEmail = (email || '').trim().toLowerCase();
  const isBootstrapped = normalizedEmail === BOOTSTRAPPED_ADMIN_EMAIL;

  try {
    const [adminDoc, profileDoc] = await Promise.all([
      getDoc(doc(db, 'admins', uid)),
      getDoc(doc(db, 'adminProfiles', uid)),
    ]);

    if (adminDoc.exists() && adminDoc.data().active === true) {
      if (profileDoc.exists()) {
        const p = profileDoc.data();
        return {
          uid,
          email: String(p.email || normalizedEmail),
          displayName: String(p.displayName || 'INFORVERSE Administrator'),
          role: (p.role as AdminProfile['role']) || 'admin',
          createdAt: toIsoString(p.createdAt),
        };
      }
      return {
        uid,
        email: normalizedEmail,
        displayName: 'INFORVERSE Administrator',
        role: (adminDoc.data().role as AdminProfile['role']) || 'admin',
        createdAt: new Date().toISOString(),
      };
    }

    // Bootstrap super_admin profile & membership doc for the verified owner account on first login
    if (isBootstrapped && auth.currentUser?.emailVerified) {
      const batch = writeBatch(db);
      batch.set(doc(db, 'admins', uid), {
        uid,
        role: 'super_admin',
        active: true,
        createdAt: serverTimestamp(),
      });
      batch.set(doc(db, 'adminProfiles', uid), {
        uid,
        email: normalizedEmail,
        displayName: auth.currentUser.displayName || 'INFORVERSE Super Admin',
        role: 'super_admin',
        createdAt: serverTimestamp(),
      });
      await batch.commit();
      return {
        uid,
        email: normalizedEmail,
        displayName: auth.currentUser.displayName || 'INFORVERSE Super Admin',
        role: 'super_admin',
        createdAt: new Date().toISOString(),
      };
    }

    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `admins/${uid}`);
  }
}

// ================================
// ADMIN FIRESTORE SEED & OVERVIEW
// ================================

export async function seedFirestoreBaselineIfEmpty(): Promise<boolean> {
  try {
    const existingCats = await getDocs(query(collection(db, 'categories'), limit(1)));
    const existingArticles = await getDocs(query(collection(db, 'articles'), limit(1)));
    if (!existingCats.empty && !existingArticles.empty) {
      return false;
    }

    // Batch 1: Parent collections (categories, countries, regions, settings, analytics)
    const batch1 = writeBatch(db);

    for (const cat of SEED_CATEGORIES) {
      batch1.set(doc(db, 'categories', cat.id), {
        id: cat.id,
        name: cat.name_en,
        nameEn: cat.name_en,
        nameId: cat.name_id,
        slug: cat.slug,
        description: cat.description_en,
        descriptionId: cat.description_id,
        icon: cat.slug,
        sortOrder: cat.sort_order,
        isActive: true,
        createdAt: serverTimestamp(),
      });
    }

    for (const co of SEED_COUNTRIES) {
      batch1.set(doc(db, 'countries', co.id), {
        id: co.id,
        name: co.name_en,
        nameId: co.name_id,
        code: co.code,
        isoNumeric: co.iso_numeric,
        continent: co.continent,
        flag: co.code,
        isActive: true,
      });
    }

    for (const reg of SEED_REGIONS) {
      batch1.set(doc(db, 'regions', reg.id), {
        id: reg.id,
        name: reg.name_en,
        nameId: reg.name_id,
        slug: reg.slug,
        countryId: reg.country_id,
        type: 'archipelago_region',
        provinces: reg.provinces,
        isActive: true,
      });
    }

    batch1.set(doc(db, 'websiteSettings', 'default'), {
      websiteName: DEFAULT_WEBSITE_SETTINGS.site_name,
      tagline: DEFAULT_WEBSITE_SETTINGS.tagline,
      logoUrl: DEFAULT_WEBSITE_SETTINGS.logo_url || '',
      defaultLanguage: DEFAULT_WEBSITE_SETTINGS.default_language,
      supportedLanguages: ['en', 'id'],
      theme: DEFAULT_WEBSITE_SETTINGS.default_theme,
      socialLinks: { instagramUrl: DEFAULT_WEBSITE_SETTINGS.instagram_url },
      seoSettings: {
        seoTitle: DEFAULT_WEBSITE_SETTINGS.seo_title,
        seoDescription: DEFAULT_WEBSITE_SETTINGS.seo_description,
      },
      homepageSections: DEFAULT_WEBSITE_SETTINGS.homepage_sections,
      contactEmail: DEFAULT_WEBSITE_SETTINGS.contact_email,
      footerNote: DEFAULT_WEBSITE_SETTINGS.footer_note,
      updatedAt: serverTimestamp(),
    });

    batch1.set(doc(db, 'automationSettings', 'default'), {
      enabled: DEFAULT_AUTOMATION_SETTINGS.scheduler_enabled,
      updateInterval: DEFAULT_AUTOMATION_SETTINGS.update_interval_minutes,
      autoPublish: DEFAULT_AUTOMATION_SETTINGS.auto_publish,
      enableAiSummary: DEFAULT_AUTOMATION_SETTINGS.ai_summary_enabled,
      enableTranslation: DEFAULT_AUTOMATION_SETTINGS.ai_translation_enabled,
      enableDuplicateDetection: DEFAULT_AUTOMATION_SETTINGS.duplicate_detection_enabled,
      maxArticlesPerRun: 2,
      aiModel: DEFAULT_AUTOMATION_SETTINGS.ai_model,
      summaryLength: DEFAULT_AUTOMATION_SETTINGS.summary_length,
      aiSystemPrompt: DEFAULT_AUTOMATION_SETTINGS.ai_system_prompt,
      maxRetries: DEFAULT_AUTOMATION_SETTINGS.max_retries,
      tokenUsageTotal: DEFAULT_AUTOMATION_SETTINGS.token_usage_total,
      lastRunAt: DEFAULT_AUTOMATION_SETTINGS.last_run_at,
      nextRunAt: DEFAULT_AUTOMATION_SETTINGS.next_run_at,
      updatedAt: serverTimestamp(),
    });

    batch1.set(doc(db, 'analytics', 'summary'), {
      id: 'summary',
      totalVisitors: 1420,
      totalArticleViews: 23095,
      updatedAt: serverTimestamp(),
    });

    await batch1.commit();

    // Batch 2: Articles, Sources, Logs (parent categories/countries exist now)
    const batch2 = writeBatch(db);

    for (const src of SEED_SOURCES) {
      batch2.set(doc(db, 'sources', src.id), {
        id: src.id,
        name: src.name,
        url: src.url,
        rssUrl: src.url,
        apiType: src.type,
        countryId: `co-${src.country_code.toLowerCase()}`,
        countryCode: src.country_code,
        categoryId: `cat-${src.default_category_slug}`,
        defaultCategorySlug: src.default_category_slug,
        language: src.language,
        isActive: src.is_active,
        lastFetchedAt: src.last_fetched_at,
        status: src.last_status,
        lastError: src.last_error,
        retryCount: src.retry_count,
        createdAt: serverTimestamp(),
      });
    }

    for (const art of SEED_ARTICLES) {
      batch2.set(doc(db, 'articles', art.id), {
        id: art.id,
        title: art.title,
        subtitle: art.subtitle,
        slug: art.slug,
        summary: art.summary,
        content: art.content,
        imageUrl: art.image_url,
        imageCaption: art.image_caption,
        categoryId: art.category_id,
        countryId: art.country_id,
        regionId: art.region_id,
        province: art.province,
        sourceId: art.source_id,
        sourceUrl: art.source_url,
        sourceName: art.source_name,
        language: art.language,
        tags: art.tags,
        author: art.author,
        articleType: art.article_type,
        requiresVerification: art.requires_verification,
        isVerified: art.is_verified,
        status: art.status,
        isAutomatic: art.is_automatic,
        isFeatured: art.is_featured,
        viewCount: art.views_count,
        seoTitle: art.seo_title,
        seoDescription: art.seo_description,
        publishedAt: art.published_at,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    for (const log of INITIAL_LOGS) {
      batch2.set(doc(db, 'automationLogs', log.id), {
        id: log.id,
        sourceId: log.source_id,
        logType: log.log_type,
        status: log.status,
        articlesFetched: 0,
        articlesPublished: SEED_ARTICLES.length,
        errors: [],
        message: log.message,
        startedAt: log.created_at,
        completedAt: log.created_at,
        createdAt: serverTimestamp(),
      });
    }

    await batch2.commit();

    // Batch 3: ArticleTranslations (parent articles now exist in Firestore)
    const batch3 = writeBatch(db);
    for (const art of SEED_ARTICLES) {
      if (art.translations) {
        for (const tr of Object.values(art.translations)) {
          if (!tr) continue;
          batch3.set(doc(db, 'articleTranslations', tr.id), {
            id: tr.id,
            articleId: art.id,
            language: tr.language,
            translatedTitle: tr.title,
            translatedSubtitle: tr.subtitle,
            translatedSummary: tr.summary,
            translatedContent: tr.content,
            isAiTranslated: tr.is_ai_translated,
            status: art.status === 'published' ? 'published' : 'draft',
            updatedAt: serverTimestamp(),
          });
        }
      }
    }
    await batch3.commit();

    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'seedBaseline');
  }
}

export async function fetchAdminFirestoreOverview(): Promise<{
  articles: Article[];
  categories: Category[];
  countries: Country[];
  regions: IndonesianRegion[];
  sources: Source[];
  automationSettings: AutomationSettings;
  websiteSettings: WebsiteSettings;
  logs: AutomationLog[];
  totalVisitors: number;
  subscriberCount: number;
}> {
  try {
    const [
      artSnap,
      trSnap,
      catSnap,
      coSnap,
      regSnap,
      srcSnap,
      autoSnap,
      siteSnap,
      logSnap,
      analyticsSnap,
      subsSnap,
    ] = await Promise.all([
      getDocs(query(collection(db, 'articles'), limit(120))),
      getDocs(query(collection(db, 'articleTranslations'), limit(200))),
      getDocs(query(collection(db, 'categories'), limit(50))),
      getDocs(query(collection(db, 'countries'), limit(100))),
      getDocs(query(collection(db, 'regions'), limit(30))),
      getDocs(query(collection(db, 'sources'), limit(80))),
      getDoc(doc(db, 'automationSettings', 'default')),
      getDoc(doc(db, 'websiteSettings', 'default')),
      getDocs(query(collection(db, 'automationLogs'), limit(80))),
      getDoc(doc(db, 'analytics', 'summary')),
      getDocs(query(collection(db, 'newsletterSubscribers'), limit(200))),
    ]);

    const transByArticle = new Map<string, Partial<Record<Language, ArticleTranslation>>>();
    for (const td of trSnap.docs) {
      const mapped = mapTranslationFromFirestore(td.data(), td.id);
      const current = transByArticle.get(mapped.article_id) || {};
      current[mapped.language] = mapped;
      transByArticle.set(mapped.article_id, current);
    }

    const articles = artSnap.docs
      .map((d) => mapArticleFromFirestore(d.data(), d.id, transByArticle.get(d.id)))
      .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());

    const categories = catSnap.docs
      .map((d) => mapCategoryFromFirestore(d.data(), d.id))
      .sort((a, b) => a.sort_order - b.sort_order);

    const countries = coSnap.docs
      .map((d) => mapCountryFromFirestore(d.data(), d.id))
      .sort((a, b) => a.name_en.localeCompare(b.name_en));

    const regions = regSnap.docs.map((d) => mapRegionFromFirestore(d.data(), d.id));
    const sources = srcSnap.docs.map((d) => mapSourceFromFirestore(d.data(), d.id));
    const automationSettings = autoSnap.exists()
      ? mapAutomationSettingsFromFirestore(autoSnap.data())
      : DEFAULT_AUTOMATION_SETTINGS;
    const websiteSettings = siteSnap.exists()
      ? mapWebsiteSettingsFromFirestore(siteSnap.data())
      : DEFAULT_WEBSITE_SETTINGS;
    const logs = logSnap.docs
      .map((d) => mapLogFromFirestore(d.data(), d.id))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return {
      articles,
      categories,
      countries,
      regions,
      sources,
      automationSettings,
      websiteSettings,
      logs,
      totalVisitors: analyticsSnap.exists() ? Number(analyticsSnap.data().totalVisitors ?? 0) : 0,
      subscriberCount: subsSnap.size,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'adminOverview');
  }
}

export async function saveArticleToFirestore(article: Article, isUpdate: boolean): Promise<Article> {
  const path = `articles/${article.id}`;
  try {
    const docRef = doc(db, 'articles', article.id);
    if (isUpdate) {
      await updateDoc(docRef, {
        title: article.title,
        subtitle: article.subtitle,
        slug: article.slug,
        summary: article.summary,
        content: article.content,
        imageUrl: article.image_url,
        imageCaption: article.image_caption,
        categoryId: article.category_id,
        countryId: article.country_id,
        regionId: article.region_id || null,
        province: article.province || null,
        sourceId: article.source_id || null,
        sourceUrl: article.source_url,
        sourceName: article.source_name,
        language: article.language,
        tags: (article.tags || []).slice(0, 15),
        author: article.author,
        articleType: article.article_type,
        requiresVerification: article.requires_verification,
        isVerified: article.is_verified,
        status: article.status,
        isAutomatic: article.is_automatic,
        isFeatured: article.is_featured,
        viewCount: article.views_count,
        seoTitle: article.seo_title,
        seoDescription: article.seo_description,
        publishedAt: article.published_at,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, {
        id: article.id,
        title: article.title,
        subtitle: article.subtitle,
        slug: article.slug,
        summary: article.summary,
        content: article.content,
        imageUrl: article.image_url,
        imageCaption: article.image_caption,
        categoryId: article.category_id,
        countryId: article.country_id,
        regionId: article.region_id || null,
        province: article.province || null,
        sourceId: article.source_id || null,
        sourceUrl: article.source_url,
        sourceName: article.source_name,
        language: article.language,
        tags: (article.tags || []).slice(0, 15),
        author: article.author,
        articleType: article.article_type,
        requiresVerification: article.requires_verification,
        isVerified: article.is_verified,
        status: article.status,
        isAutomatic: article.is_automatic,
        isFeatured: article.is_featured,
        viewCount: article.views_count,
        seoTitle: article.seo_title,
        seoDescription: article.seo_description,
        publishedAt: article.published_at,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    if (article.translations) {
      for (const tr of Object.values(article.translations)) {
        if (!tr) continue;
        const trId = tr.id || `tr-${article.id}-${tr.language}`;
        const trRef = doc(db, 'articleTranslations', trId);
        const existingTr = await getDoc(trRef);
        const payload = {
          id: trId,
          articleId: article.id,
          language: tr.language,
          translatedTitle: tr.title,
          translatedSubtitle: tr.subtitle || '',
          translatedSummary: tr.summary,
          translatedContent: tr.content,
          isAiTranslated: tr.is_ai_translated,
          status: article.status === 'published' ? 'published' : 'draft',
          updatedAt: serverTimestamp(),
        };
        if (existingTr.exists()) {
          await updateDoc(trRef, {
            language: tr.language,
            translatedTitle: tr.title,
            translatedSubtitle: tr.subtitle || '',
            translatedSummary: tr.summary,
            translatedContent: tr.content,
            isAiTranslated: tr.is_ai_translated,
            status: article.status === 'published' ? 'published' : 'draft',
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(trRef, payload);
        }
      }
    }

    return article;
  } catch (error) {
    handleFirestoreError(error, isUpdate ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteArticleFromFirestore(id: string): Promise<void> {
  const path = `articles/${id}`;
  try {
    await deleteDoc(doc(db, 'articles', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveCategoryToFirestore(category: Category, isUpdate = false): Promise<void> {
  const path = `categories/${category.id}`;
  try {
    const ref = doc(db, 'categories', category.id);
    if (isUpdate) {
      await updateDoc(ref, {
        name: category.name_en,
        nameEn: category.name_en,
        nameId: category.name_id,
        slug: category.slug,
        description: category.description_en,
        descriptionId: category.description_id,
        sortOrder: category.sort_order,
        isActive: true,
      });
    } else {
      await setDoc(ref, {
        id: category.id,
        name: category.name_en,
        nameEn: category.name_en,
        nameId: category.name_id,
        slug: category.slug,
        description: category.description_en,
        descriptionId: category.description_id,
        icon: category.slug,
        sortOrder: category.sort_order,
        isActive: true,
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, isUpdate ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteCategoryFromFirestore(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'categories', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `categories/${id}`);
  }
}

export async function saveCountryToFirestore(country: Country, isUpdate = false): Promise<void> {
  const path = `countries/${country.id}`;
  try {
    const ref = doc(db, 'countries', country.id);
    if (isUpdate) {
      await updateDoc(ref, {
        name: country.name_en,
        nameId: country.name_id,
        code: country.code,
        isoNumeric: country.iso_numeric,
        continent: country.continent,
        flag: country.code,
        isActive: true,
      });
    } else {
      await setDoc(ref, {
        id: country.id,
        name: country.name_en,
        nameId: country.name_id,
        code: country.code,
        isoNumeric: country.iso_numeric,
        continent: country.continent,
        flag: country.code,
        isActive: true,
      });
    }
  } catch (error) {
    handleFirestoreError(error, isUpdate ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function saveSourceToFirestore(source: Source, isUpdate: boolean): Promise<void> {
  const path = `sources/${source.id}`;
  try {
    const ref = doc(db, 'sources', source.id);
    if (isUpdate) {
      await updateDoc(ref, {
        name: source.name,
        url: source.url,
        rssUrl: source.url,
        apiType: source.type,
        countryId: `co-${source.country_code.toLowerCase()}`,
        countryCode: source.country_code,
        categoryId: `cat-${source.default_category_slug}`,
        defaultCategorySlug: source.default_category_slug,
        language: source.language,
        isActive: source.is_active,
        lastFetchedAt: source.last_fetched_at,
        status: source.last_status,
        lastError: source.last_error,
        retryCount: source.retry_count,
      });
    } else {
      await setDoc(ref, {
        id: source.id,
        name: source.name,
        url: source.url,
        rssUrl: source.url,
        apiType: source.type,
        countryId: `co-${source.country_code.toLowerCase()}`,
        countryCode: source.country_code,
        categoryId: `cat-${source.default_category_slug}`,
        defaultCategorySlug: source.default_category_slug,
        language: source.language,
        isActive: source.is_active,
        lastFetchedAt: source.last_fetched_at,
        status: source.last_status,
        lastError: source.last_error,
        retryCount: source.retry_count,
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, isUpdate ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteSourceFromFirestore(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'sources', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `sources/${id}`);
  }
}

export async function saveAutomationSettingsToFirestore(settings: AutomationSettings): Promise<void> {
  const path = 'automationSettings/default';
  try {
    const ref = doc(db, 'automationSettings', 'default');
    const existingSnap = await getDoc(ref);
    const payload = {
      enabled: settings.scheduler_enabled,
      updateInterval: settings.update_interval_minutes,
      autoPublish: settings.auto_publish,
      enableAiSummary: settings.ai_summary_enabled,
      enableTranslation: settings.ai_translation_enabled,
      enableDuplicateDetection: settings.duplicate_detection_enabled,
      maxArticlesPerRun: 2,
      aiModel: settings.ai_model,
      summaryLength: settings.summary_length,
      aiSystemPrompt: settings.ai_system_prompt,
      maxRetries: settings.max_retries,
      tokenUsageTotal: settings.token_usage_total,
      lastRunAt: settings.last_run_at,
      nextRunAt: settings.next_run_at,
      updatedAt: serverTimestamp(),
    };
    if (existingSnap.exists()) {
      await updateDoc(ref, payload);
    } else {
      await setDoc(ref, payload);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveWebsiteSettingsToFirestore(settings: WebsiteSettings): Promise<void> {
  const path = 'websiteSettings/default';
  try {
    const ref = doc(db, 'websiteSettings', 'default');
    const existingSnap = await getDoc(ref);
    const payload = {
      websiteName: settings.site_name,
      tagline: settings.tagline,
      logoUrl: settings.logo_url || '',
      defaultLanguage: settings.default_language,
      supportedLanguages: ['en', 'id'],
      theme: settings.default_theme,
      socialLinks: { instagramUrl: settings.instagram_url },
      seoSettings: {
        seoTitle: settings.seo_title,
        seoDescription: settings.seo_description,
      },
      homepageSections: settings.homepage_sections,
      contactEmail: settings.contact_email,
      footerNote: settings.footer_note,
      updatedAt: serverTimestamp(),
    };
    if (existingSnap.exists()) {
      await updateDoc(ref, payload);
    } else {
      await setDoc(ref, payload);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function addAutomationLogToFirestore(entry: {
  sourceId?: string | null;
  logType: 'automation' | 'fetch_error' | 'ai' | 'admin';
  status: 'success' | 'warning' | 'error' | 'info';
  articlesFetched?: number;
  articlesPublished?: number;
  errors?: string[];
  message: string;
}): Promise<void> {
  const logId = `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const path = `automationLogs/${logId}`;
  try {
    const now = new Date().toISOString();
    await setDoc(doc(db, 'automationLogs', logId), {
      id: logId,
      sourceId: entry.sourceId || null,
      logType: entry.logType,
      status: entry.status,
      articlesFetched: entry.articlesFetched ?? 0,
      articlesPublished: entry.articlesPublished ?? 0,
      errors: (entry.errors || []).slice(0, 25),
      message: entry.message.slice(0, 990),
      startedAt: now,
      completedAt: now,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}
