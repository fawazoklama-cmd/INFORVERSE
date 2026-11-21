import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { dbStore } from './server/db/store';
import {
  assertSafeExternalUrl,
  hashPassword,
  rateLimit,
  requireAdmin,
  signAdminToken,
  verifyPassword,
  type AuthenticatedRequest,
} from './server/services/security';
import { analyzeAndSummarizeSource, translateTextWithGemini } from './server/services/gemini';
import { runAutomatedCollection, startAutomationScheduler, testSourceConnection } from './server/services/collector';
import { requiresSensitiveVerification, sanitizeExternalUrl, slugify } from './src/utils/editorial';
import type { Article, Category, Country, Source } from './src/types/inforverse';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.set('trust proxy', 1);
app.use(express.json({ limit: '2mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// ========================
// PUBLIC API ROUTES
// ========================

app.get('/api/bootstrap', (_req, res) => {
  res.json({
    categories: dbStore.getCategories(),
    countries: dbStore.getCountries(),
    regions: dbStore.getRegions(),
    websiteSettings: dbStore.getWebsiteSettings(),
    newsletterEnabled: process.env.NEWSLETTER_ENABLED === 'true',
  });
});

app.get('/api/articles', (req, res) => {
  const {
    category,
    country,
    continent,
    region,
    province,
    q,
    sort = 'newest',
    dateFrom,
    limit = '50',
    offset = '0',
  } = req.query as Record<string, string | undefined>;

  let articles = dbStore.getArticles(false);
  const categories = dbStore.getCategories();
  const countries = dbStore.getCountries();

  if (category && category !== 'all') {
    const cat = categories.find((c) => c.slug === category || c.id === category);
    if (cat) {
      articles = articles.filter((a) => a.category_id === cat.id);
    } else {
      articles = [];
    }
  }

  if (country && country !== 'all') {
    const co = countries.find(
      (c) => c.code.toLowerCase() === country.toLowerCase() || c.id === country
    );
    if (co) {
      articles = articles.filter((a) => a.country_id === co.id);
    } else {
      articles = [];
    }
  }

  if (continent && continent !== 'all') {
    const matchingCountryIds = new Set(
      countries.filter((c) => c.continent.toLowerCase() === continent.toLowerCase()).map((c) => c.id)
    );
    articles = articles.filter((a) => matchingCountryIds.has(a.country_id));
  }

  if (region && region !== 'all') {
    const regions = dbStore.getRegions();
    const reg = regions.find((r) => r.slug === region || r.id === region);
    if (reg) {
      articles = articles.filter((a) => a.region_id === reg.id);
    } else {
      articles = [];
    }
  }

  if (province && province !== 'all') {
    articles = articles.filter(
      (a) => a.province && a.province.toLowerCase() === province.toLowerCase()
    );
  }

  if (dateFrom) {
    const minTs = new Date(dateFrom).getTime();
    if (!Number.isNaN(minTs)) {
      articles = articles.filter((a) => new Date(a.published_at).getTime() >= minTs);
    }
  }

  if (q && q.trim()) {
    const query = q.trim().toLowerCase();
    articles = articles.filter((a) => {
      const catObj = categories.find((c) => c.id === a.category_id);
      const coObj = countries.find((c) => c.id === a.country_id);
      const idTrans = a.translations?.id;
      const haystack = [
        a.title,
        a.subtitle,
        a.summary,
        a.content,
        a.author,
        a.source_name,
        a.province || '',
        ...(a.tags || []),
        catObj?.name_en || '',
        catObj?.name_id || '',
        coObj?.name_en || '',
        coObj?.name_id || '',
        idTrans?.title || '',
        idTrans?.summary || '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }

  if (sort === 'popular') {
    articles = [...articles].sort((a, b) => b.views_count - a.views_count);
  }

  const total = articles.length;
  const start = Math.max(0, Number(offset) || 0);
  const count = Math.min(100, Math.max(1, Number(limit) || 50));
  const paged = articles.slice(start, start + count);

  res.json({ articles: paged, total });
});

app.get('/api/articles/:slug', (req, res) => {
  const article = dbStore.getArticleBySlug(req.params.slug, false);
  if (!article) {
    res.status(404).json({ error: 'Article not found' });
    return;
  }
  dbStore.incrementArticleViews(article.slug);
  const related = dbStore
    .getArticles(false)
    .filter((a) => a.id !== article.id && (a.category_id === article.category_id || a.country_id === article.country_id))
    .slice(0, 4);
  res.json({ article, related });
});

app.post('/api/analytics/visit', rateLimit(60, 60_000), (_req, res) => {
  dbStore.recordVisitor();
  res.json({ ok: true });
});

app.post('/api/newsletter/subscribe', rateLimit(10, 60_000), (req, res) => {
  if (process.env.NEWSLETTER_ENABLED !== 'true') {
    res.status(503).json({
      error: 'Email newsletter delivery service is not configured yet (set NEWSLETTER_ENABLED=true and SMTP provider).',
    });
    return;
  }
  const { email, language = 'en' } = req.body as { email?: string; language?: string };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: 'Please enter a valid email address.' });
    return;
  }
  const added = dbStore.addNewsletterSubscriber(email, language);
  res.json({ ok: true, alreadySubscribed: !added });
});

app.post('/api/contact', rateLimit(10, 60_000), (req, res) => {
  const { name, email, subject, message } = req.body as Record<string, string>;
  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    res.status(400).json({ error: 'Name, email, and message are required.' });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: 'Please provide a valid email address.' });
    return;
  }
  dbStore.addContactMessage({
    name: name.trim().slice(0, 120),
    email: email.trim().slice(0, 160),
    subject: (subject || 'General Inquiry').trim().slice(0, 200),
    message: message.trim().slice(0, 4000),
  });
  dbStore.addLog({
    log_type: 'admin',
    status: 'info',
    source_id: null,
    message: `New editorial contact inquiry from ${name.trim()}`,
    details: { subject: subject || 'General Inquiry' },
  });
  res.json({ ok: true });
});

// ========================
// SEO & SYNDICATION ROUTES
// ========================

app.get('/robots.txt', (req, res) => {
  const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  res
    .type('text/plain')
    .send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /admim\n\nSitemap: ${baseUrl}/sitemap.xml\n`);
});

app.get('/sitemap.xml', (req, res) => {
  const baseUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  const categories = dbStore.getCategories();
  const articles = dbStore.getArticles(false);

  const staticPaths = ['', '/world', '/indonesia', '/search', '/about', '/contact', '/privacy', '/terms', '/disclaimer'];
  const urls = [
    ...staticPaths.map((p) => `<url><loc>${baseUrl}${p}</loc><changefreq>daily</changefreq><priority>0.8</priority></url>`),
    ...categories.map((c) => `<url><loc>${baseUrl}/category/${c.slug}</loc><changefreq>hourly</changefreq><priority>0.7</priority></url>`),
    ...articles.map(
      (a) =>
        `<url><loc>${baseUrl}/article/${a.slug}</loc><lastmod>${new Date(a.updated_at).toISOString()}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>`
    ),
  ];

  res.type('application/xml').send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`
  );
});

app.get('/rss.xml', (req, res) => {
  const baseUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  const settings = dbStore.getWebsiteSettings();
  const articles = dbStore.getArticles(false).slice(0, 30);

  const escapeXml = (str: string) =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const itemsXml = articles
    .map(
      (a) => `  <item>
    <title>${escapeXml(a.title)}</title>
    <link>${baseUrl}/article/${a.slug}</link>
    <guid isPermaLink="true">${baseUrl}/article/${a.slug}</guid>
    <pubDate>${new Date(a.published_at).toUTCString()}</pubDate>
    <description>${escapeXml(a.summary)}</description>
  </item>`
    )
    .join('\n');

  res.type('application/rss+xml').send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n<channel>\n  <title>${escapeXml(settings.site_name)}</title>\n  <link>${baseUrl}</link>\n  <description>${escapeXml(settings.tagline)}</description>\n${itemsXml}\n</channel>\n</rss>`
  );
});

// ========================
// ADMIN AUTH ROUTES
// ========================

app.get('/api/admin/auth/status', (_req, res) => {
  res.json({
    firebaseConfigured: true,
    envConfigured: Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD),
  });
});

app.post('/api/admin/auth/bootstrap', rateLimit(10, 60_000), (req, res) => {
  const envConfigured = Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD);
  if (envConfigured || dbStore.getAdminCredential()) {
    res.status(403).json({ error: 'Administrator account has already been configured.' });
    return;
  }
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: 'Please provide a valid administrator email.' });
    return;
  }
  if (!password || password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    return;
  }

  const { hash, salt } = hashPassword(password);
  dbStore.setAdminCredential({
    email: email.trim().toLowerCase(),
    passwordHash: hash,
    salt,
    role: 'super_admin',
    createdAt: new Date().toISOString(),
  });

  dbStore.addLog({
    log_type: 'admin',
    status: 'info',
    source_id: null,
    message: `Initial administrator account claimed for ${email.trim().toLowerCase()}`,
    details: {},
  });

  const token = signAdminToken({ email: email.trim().toLowerCase(), role: 'super_admin' });
  res.json({ token, admin: { email: email.trim().toLowerCase(), role: 'super_admin' } });
});

app.post('/api/admin/auth/login', rateLimit(15, 60_000), (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }
  const normalizedEmail = email.trim().toLowerCase();

  // Environment variable admin credentials take precedence when configured
  const envEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const envPassword = process.env.ADMIN_PASSWORD;
  if (envEmail && envPassword) {
    if (normalizedEmail === envEmail && password === envPassword) {
      const token = signAdminToken({ email: envEmail, role: 'super_admin' });
      dbStore.addLog({
        log_type: 'admin',
        status: 'info',
        source_id: null,
        message: `Administrator signed in (${envEmail})`,
        details: {},
      });
      res.json({ token, admin: { email: envEmail, role: 'super_admin' } });
      return;
    }
    res.status(401).json({ error: 'Invalid administrator email or password.' });
    return;
  }

  const stored = dbStore.getAdminCredential();
  if (!stored) {
    res.status(403).json({ error: 'No administrator account claimed yet. Complete initial setup first.' });
    return;
  }
  if (normalizedEmail !== stored.email || !verifyPassword(password, stored.passwordHash, stored.salt)) {
    res.status(401).json({ error: 'Invalid administrator email or password.' });
    return;
  }

  const token = signAdminToken({ email: stored.email, role: stored.role });
  dbStore.addLog({
    log_type: 'admin',
    status: 'info',
    source_id: null,
    message: `Administrator signed in (${stored.email})`,
    details: {},
  });
  res.json({ token, admin: { email: stored.email, role: stored.role } });
});

app.post('/api/admin/auth/forgot-password', rateLimit(5, 60_000), (_req, res) => {
  res.json({
    message: 'Password reset emails are dispatched directly by Firebase Authentication.',
  });
});

app.get('/api/admin/me', requireAdmin, (req: AuthenticatedRequest, res) => {
  res.json({ admin: req.admin });
});

app.get('/api/admin/integrations-status', requireAdmin, (_req, res) => {
  const stats = dbStore.getDashboardStats();
  res.json({
    integrations: stats.integrations,
    totalVisitors: stats.totalVisitors,
    newsletterSubscribers: stats.newsletterSubscribers,
  });
});

// ========================
// PROTECTED ADMIN ROUTES
// ========================

app.get('/api/admin/overview', requireAdmin, (_req, res) => {
  res.json({
    stats: dbStore.getDashboardStats(),
    articles: dbStore.getArticles(true),
    categories: dbStore.getCategories(),
    countries: dbStore.getCountries(),
    regions: dbStore.getRegions(),
    sources: dbStore.getSources(),
    automationSettings: dbStore.getAutomationSettings(),
    websiteSettings: dbStore.getWebsiteSettings(),
    logs: dbStore.getLogs(80),
  });
});

app.post('/api/admin/articles', requireAdmin, (req: AuthenticatedRequest, res) => {
  const body = req.body as Partial<Article>;
  if (!body.title?.trim() || !body.summary?.trim() || !body.content?.trim()) {
    res.status(400).json({ error: 'Title, summary, and content are required.' });
    return;
  }
  const now = new Date().toISOString();
  const baseSlug = slugify(body.slug || body.title);
  const existing = dbStore.getArticles(true);
  const isEditing = Boolean(body.id && dbStore.getArticleById(body.id));
  const previous = isEditing && body.id ? dbStore.getArticleById(body.id) : undefined;

  let finalSlug = baseSlug || `article-${Date.now()}`;
  if (existing.some((a) => a.slug === finalSlug && a.id !== body.id)) {
    finalSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
  }

  const category = dbStore.getCategories().find((c) => c.id === body.category_id) || dbStore.getCategories()[0];
  const isSensitive = requiresSensitiveVerification(category?.slug || '');

  const article: Article = {
    id: previous?.id || `art-${Date.now()}`,
    title: body.title.trim(),
    slug: finalSlug,
    subtitle: (body.subtitle || '').trim(),
    summary: body.summary.trim(),
    content: body.content.trim(),
    image_url: sanitizeExternalUrl(body.image_url || '') || '/src/assets/images/hero_global_summit_1795250512890.jpg',
    image_caption: (body.image_caption || '').trim(),
    category_id: category.id,
    country_id: body.country_id || dbStore.getCountries()[0].id,
    region_id: body.region_id || null,
    province: body.province || null,
    source_id: previous?.source_id || null,
    source_name: (body.source_name || 'INFORVERSE Editorial').trim(),
    source_url: sanitizeExternalUrl(body.source_url || ''),
    author: (body.author || req.admin?.email || 'INFORVERSE Desk').trim(),
    article_type: body.article_type || 'editorial',
    requires_verification: body.requires_verification ?? isSensitive,
    is_verified: body.is_verified ?? true,
    language: body.language || 'en',
    status: body.status || 'draft',
    is_automatic: previous?.is_automatic || false,
    is_featured: Boolean(body.is_featured),
    views_count: previous?.views_count || 0,
    tags: Array.isArray(body.tags) ? body.tags.map((t) => String(t).trim()).filter(Boolean) : [],
    seo_title: (body.seo_title || `${body.title.trim()} | INFORVERSE`).trim(),
    seo_description: (body.seo_description || body.summary.trim().slice(0, 155)).trim(),
    published_at: body.published_at || previous?.published_at || now,
    updated_at: now,
    created_at: previous?.created_at || now,
    translations: body.translations || previous?.translations,
  };

  const saved = dbStore.upsertArticle(article);
  dbStore.addLog({
    log_type: 'admin',
    status: 'success',
    source_id: null,
    message: `${isEditing ? 'Updated' : 'Created'} article "${saved.title}" (${saved.status})`,
    details: { articleId: saved.id, by: req.admin?.email },
  });
  res.json({ article: saved });
});

app.delete('/api/admin/articles/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
  const existing = dbStore.getArticleById(req.params.id);
  const deleted = dbStore.deleteArticle(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Article not found' });
    return;
  }
  dbStore.addLog({
    log_type: 'admin',
    status: 'info',
    source_id: null,
    message: `Deleted article "${existing?.title || req.params.id}"`,
    details: { by: req.admin?.email },
  });
  res.json({ ok: true });
});

app.post('/api/admin/categories', requireAdmin, (req, res) => {
  const body = req.body as Partial<Category>;
  if (!body.name_en?.trim() || !body.name_id?.trim()) {
    res.status(400).json({ error: 'English and Indonesian category names are required.' });
    return;
  }
  const cat: Category = {
    id: body.id || `cat-${slugify(body.name_en)}-${Date.now().toString().slice(-3)}`,
    slug: slugify(body.slug || body.name_en),
    name_en: body.name_en.trim(),
    name_id: body.name_id.trim(),
    description_en: (body.description_en || '').trim(),
    description_id: (body.description_id || '').trim(),
    sort_order: Number(body.sort_order) || dbStore.getCategories().length + 1,
  };
  res.json({ category: dbStore.upsertCategory(cat) });
});

app.delete('/api/admin/categories/:id', requireAdmin, (req, res) => {
  const deleted = dbStore.deleteCategory(req.params.id);
  res.status(deleted ? 200 : 404).json({ ok: deleted });
});

app.post('/api/admin/countries', requireAdmin, (req, res) => {
  const body = req.body as Partial<Country>;
  if (!body.code?.trim() || !body.name_en?.trim() || !body.continent) {
    res.status(400).json({ error: 'Code, English name, and continent are required.' });
    return;
  }
  const country: Country = {
    id: body.id || `co-${body.code.toLowerCase().trim()}`,
    code: body.code.toUpperCase().trim().slice(0, 2),
    iso_numeric: (body.iso_numeric || '').trim(),
    name_en: body.name_en.trim(),
    name_id: (body.name_id || body.name_en).trim(),
    continent: body.continent,
  };
  res.json({ country: dbStore.upsertCountry(country) });
});

app.post('/api/admin/sources', requireAdmin, (req, res) => {
  const body = req.body as Partial<Source>;
  if (!body.name?.trim() || !body.url?.trim()) {
    res.status(400).json({ error: 'Source name and valid URL are required.' });
    return;
  }
  try {
    assertSafeExternalUrl(body.url);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid source URL' });
    return;
  }
  const existing = body.id ? dbStore.getSourceById(body.id) : undefined;
  const source: Source = {
    id: existing?.id || `src-${Date.now()}`,
    name: body.name.trim(),
    type: body.type || 'rss',
    url: body.url.trim(),
    country_code: (body.country_code || 'US').toUpperCase(),
    default_category_slug: body.default_category_slug || 'world',
    language: body.language || 'en',
    is_active: body.is_active ?? true,
    last_fetched_at: existing?.last_fetched_at || null,
    last_status: existing?.last_status || 'idle',
    last_error: existing?.last_error || null,
    retry_count: existing?.retry_count || 0,
    created_at: existing?.created_at || new Date().toISOString(),
  };
  res.json({ source: dbStore.upsertSource(source) });
});

app.delete('/api/admin/sources/:id', requireAdmin, (req, res) => {
  const deleted = dbStore.deleteSource(req.params.id);
  res.status(deleted ? 200 : 404).json({ ok: deleted });
});

app.post('/api/admin/sources/:id/test', requireAdmin, async (req, res) => {
  const source = dbStore.getSourceById(req.params.id);
  if (!source) {
    res.status(404).json({ error: 'Source not found' });
    return;
  }
  const result = await testSourceConnection(source);
  dbStore.upsertSource({
    ...source,
    last_fetched_at: new Date().toISOString(),
    last_status: result.ok ? 'ok' : 'error',
    last_error: result.error || null,
  });
  res.json(result);
});

app.post('/api/admin/automation/settings', requireAdmin, (req, res) => {
  const updated = dbStore.updateAutomationSettings(req.body);
  dbStore.addLog({
    log_type: 'admin',
    status: 'info',
    source_id: null,
    message: `Updated automation settings (interval: ${updated.update_interval_minutes}m, scheduler: ${updated.scheduler_enabled ? 'ON' : 'OFF'})`,
    details: {},
  });
  res.json({ automationSettings: updated });
});

app.post('/api/admin/automation/run', requireAdmin, async (req, res) => {
  const payload = req.body as {
    sources?: Source[];
    existingTitles?: string[];
    existingUrls?: string[];
  };
  if (Array.isArray(payload?.sources)) {
    for (const s of payload.sources) {
      dbStore.upsertSource(s);
    }
  }
  const beforeIds = new Set(dbStore.getArticles(true).map((a) => a.id));
  const summary = await runAutomatedCollection();
  const importedArticles = dbStore.getArticles(true).filter((a) => !beforeIds.has(a.id));
  const updatedSources = dbStore.getSources();
  res.json({
    ...summary,
    importedArticles,
    updatedSources,
  });
});

app.post('/api/admin/website/settings', requireAdmin, (req, res) => {
  const updated = dbStore.updateWebsiteSettings(req.body);
  dbStore.addLog({
    log_type: 'admin',
    status: 'info',
    source_id: null,
    message: 'Updated website settings and homepage section visibility.',
    details: {},
  });
  res.json({ websiteSettings: updated });
});

app.post('/api/admin/ai/analyze', requireAdmin, async (req, res) => {
  const { title, text, sourceName = 'Manual Editorial Input', sourceUrl = '' } = req.body as {
    title?: string;
    text?: string;
    sourceName?: string;
    sourceUrl?: string;
  };
  if (!text?.trim()) {
    res.status(400).json({ error: 'Source text is required for AI analysis.' });
    return;
  }
  try {
    const result = await analyzeAndSummarizeSource({
      rawTitle: title || 'Editorial Source Text',
      rawText: text,
      sourceName,
      sourceUrl,
    });
    res.json({ result });
  } catch (err) {
    res.status(503).json({
      error: err instanceof Error ? err.message : 'Gemini AI service error',
    });
  }
});

app.post('/api/admin/ai/translate', requireAdmin, async (req, res) => {
  const { title, subtitle, summary, content, targetLanguage } = req.body as {
    title?: string;
    subtitle?: string;
    summary?: string;
    content?: string;
    targetLanguage?: 'en' | 'id';
  };
  if (!title || !summary || !targetLanguage) {
    res.status(400).json({ error: 'Title, summary, and targetLanguage are required.' });
    return;
  }
  try {
    const translation = await translateTextWithGemini({
      title,
      subtitle: subtitle || '',
      summary,
      content: content || summary,
      targetLanguage,
    });
    res.json({ translation });
  } catch (err) {
    res.status(503).json({
      error: err instanceof Error ? err.message : 'Gemini translation service error',
    });
  }
});

// ========================
// VERCEL CRON ENDPOINT
// ========================

app.all('/api/cron/collect', async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;
  const headerSecret = req.headers['x-cron-secret'];
  const provided = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : String(headerSecret || '');

  if (!cronSecret || provided !== cronSecret) {
    res.status(401).json({ error: 'Unauthorized cron execution. Valid CRON_SECRET required.' });
    return;
  }
  const result = await runAutomatedCollection();
  res.json({ ok: true, ...result });
});

// ========================
// VITE / STATIC SERVING
// ========================

async function bootstrapServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  startAutomationScheduler();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`INFORVERSE server listening on http://localhost:${PORT}`);
  });
}

export { app };

if (process.env.VERCEL !== '1') {
  bootstrapServer().catch((err) => {
    console.error('Failed to start INFORVERSE server:', err);
    process.exit(1);
  });
}
