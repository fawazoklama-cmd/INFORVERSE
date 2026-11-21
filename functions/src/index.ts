import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { XMLParser } from 'fast-xml-parser';
import { GoogleGenAI, Type } from '@google/genai';

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const NEWS_API_KEY = defineSecret('NEWS_API_KEY');
const CRON_SECRET = defineSecret('CRON_SECRET');

const FIRESTORE_DATABASE_ID =
  process.env.FIRESTORE_DATABASE_ID || 'ai-studio-inforverse-408bb7be-fc29-4663-a5d2-f7665804ef5a';

const adminApp = getApps().length ? getApp() : initializeApp();
const db =
  FIRESTORE_DATABASE_ID && FIRESTORE_DATABASE_ID !== '(default)'
    ? getFirestore(adminApp, FIRESTORE_DATABASE_ID)
    : getFirestore(adminApp);

const SENSITIVE_CATEGORIES = new Set(['disaster', 'health', 'security', 'politics', 'conflict']);

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120);
}

function stripHtml(raw: string): string {
  return String(raw || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function isDuplicateTitle(candidate: string, existing: string[]): boolean {
  const cNorm = normalizeTitle(candidate);
  const cWords = new Set(cNorm.split(' ').filter((w) => w.length > 3));
  for (const title of existing) {
    const tNorm = normalizeTitle(title);
    if (cNorm === tNorm) return true;
    const tWords = new Set(tNorm.split(' ').filter((w) => w.length > 3));
    if (cWords.size >= 4 && tWords.size >= 4) {
      let overlap = 0;
      for (const w of cWords) {
        if (tWords.has(w)) overlap += 1;
      }
      if (overlap / Math.min(cWords.size, tWords.size) >= 0.72) return true;
    }
  }
  return false;
}

async function fetchFeedItems(url: string, apiType: string, newsApiKey?: string) {
  const parsedUrl = new URL(url);
  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    throw new Error('Unsupported URL protocol');
  }
  if (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === 'metadata.google.internal') {
    throw new Error('Disallowed host');
  }

  const headers: Record<string, string> = {
    'User-Agent': 'INFORVERSE-CloudCollector/1.0',
  };
  if (apiType === 'news_api') {
    if (!newsApiKey) throw new Error('NEWS_API_KEY secret not set');
    headers['X-Api-Key'] = newsApiKey;
  }

  const res = await fetch(parsedUrl.toString(), { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  if (apiType === 'news_api') {
    const json = (await res.json()) as { articles?: Array<{ title?: string; url?: string; description?: string; content?: string; publishedAt?: string }> };
    return (json.articles || [])
      .slice(0, 10)
      .map((a) => ({
        title: stripHtml(a.title || ''),
        link: a.url || '',
        description: stripHtml(a.description || a.content || ''),
        pubDate: a.publishedAt || new Date().toISOString(),
      }))
      .filter((i) => i.title && i.link);
  }

  const xml = await res.text();
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const parsed = parser.parse(xml) as Record<string, any>;
  const rssItems = parsed?.rss?.channel?.item;
  if (rssItems) {
    const arr = Array.isArray(rssItems) ? rssItems : [rssItems];
    return arr
      .slice(0, 10)
      .map((item: any) => ({
        title: stripHtml(item.title || ''),
        link: String(item.link || item.guid?.['#text'] || item.guid || ''),
        description: stripHtml(item.description || item['content:encoded'] || ''),
        pubDate: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
      }))
      .filter((i) => i.title && i.link);
  }

  const atomEntries = parsed?.feed?.entry;
  if (atomEntries) {
    const arr = Array.isArray(atomEntries) ? atomEntries : [atomEntries];
    return arr
      .slice(0, 10)
      .map((entry: any) => {
        const href = Array.isArray(entry.link) ? entry.link[0]?.['@_href'] : entry.link?.['@_href'] || entry.link;
        return {
          title: stripHtml(entry.title?.['#text'] || entry.title || ''),
          link: String(href || ''),
          description: stripHtml(entry.summary?.['#text'] || entry.summary || ''),
          pubDate: entry.updated || entry.published || new Date().toISOString(),
        };
      })
      .filter((i) => i.title && i.link);
  }

  throw new Error('Unrecognized RSS/Atom format');
}

async function analyzeWithGemini(rawTitle: string, rawText: string, sourceName: string, apiKey: string) {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Analyze this factual report from ${sourceName}.\nTitle: ${rawTitle}\nBody: ${rawText.slice(0, 6000)}`,
    config: {
      systemInstruction:
        'You are INFORVERSE editorial assistant. Return JSON summarizing strictly from the provided text, identifying categorySlug, countryCode, detectedLanguage (en|id), keywords, sensitiveTopicFlag, and bilingual translation.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          aiTitle: { type: Type.STRING },
          summary: { type: Type.STRING },
          categorySlug: { type: Type.STRING },
          countryCode: { type: Type.STRING },
          detectedLanguage: { type: Type.STRING },
          keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          sensitiveTopicFlag: { type: Type.BOOLEAN },
          translatedTitle: { type: Type.STRING },
          translatedSummary: { type: Type.STRING },
          translatedContent: { type: Type.STRING },
        },
        required: ['aiTitle', 'summary', 'categorySlug', 'countryCode', 'detectedLanguage', 'keywords', 'sensitiveTopicFlag'],
      },
    },
  });
  return JSON.parse(response.text || '{}') as {
    aiTitle?: string;
    summary?: string;
    categorySlug?: string;
    countryCode?: string;
    detectedLanguage?: 'en' | 'id';
    keywords?: string[];
    sensitiveTopicFlag?: boolean;
    translatedTitle?: string;
    translatedSummary?: string;
    translatedContent?: string;
  };
}

async function runScheduledIngestionPipeline(force = false) {
  const settingsSnap = await db.doc('automationSettings/default').get();
  const settings = settingsSnap.exists ? settingsSnap.data() || {} : {};
  if (!force && settings.enabled !== true) {
    return { skipped: true, reason: 'Scheduler disabled in automationSettings/default' };
  }

  const [sourcesSnap, catsSnap, countriesSnap, recentArticlesSnap] = await Promise.all([
    db.collection('sources').where('isActive', '==', true).get(),
    db.collection('categories').where('isActive', '==', true).get(),
    db.collection('countries').where('isActive', '==', true).get(),
    db.collection('articles').orderBy('createdAt', 'desc').limit(80).get(),
  ]);

  const categories = catsSnap.docs.map((d) => d.data());
  const countries = countriesSnap.docs.map((d) => d.data());
  const existingTitles = recentArticlesSnap.docs.map((d) => String(d.data().title || ''));
  const existingUrls = new Set(recentArticlesSnap.docs.map((d) => String(d.data().sourceUrl || '')).filter(Boolean));

  const maxPerRun = Math.min(10, Math.max(1, Number(settings.maxArticlesPerRun || 2)));
  const maxRetries = Math.min(5, Math.max(1, Number(settings.maxRetries || 3)));
  const geminiKey = GEMINI_API_KEY.value();
  const newsApiKey = NEWS_API_KEY.value();

  let articlesFetched = 0;
  let articlesPublished = 0;
  const errors: string[] = [];

  for (const srcDoc of sourcesSnap.docs) {
    const src = srcDoc.data();
    let items: Array<{ title: string; link: string; description: string; pubDate: string }> = [];
    let fetchError: string | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        items = await fetchFeedItems(String(src.url), String(src.apiType || 'rss'), newsApiKey);
        fetchError = null;
        break;
      } catch (err) {
        fetchError = err instanceof Error ? err.message : 'Fetch error';
      }
    }

    if (fetchError) {
      await srcDoc.ref.update({
        lastFetchedAt: new Date().toISOString(),
        status: 'error',
        lastError: fetchError,
        retryCount: Number(src.retryCount || 0) + 1,
      });
      errors.push(`${src.name}: ${fetchError}`);
      continue;
    }

    await srcDoc.ref.update({
      lastFetchedAt: new Date().toISOString(),
      status: 'ok',
      lastError: null,
      retryCount: 0,
    });

    for (const item of items.slice(0, maxPerRun)) {
      if (existingUrls.has(item.link)) continue;
      if (settings.enableDuplicateDetection !== false && isDuplicateTitle(item.title, existingTitles)) {
        continue;
      }
      articlesFetched += 1;

      let title = item.title;
      let summary = item.description || item.title;
      let categorySlug = String(src.defaultCategorySlug || 'world');
      let countryCode = String(src.countryCode || 'US');
      let language: 'en' | 'id' = src.language === 'id' ? 'id' : 'en';
      let keywords: string[] = [];
      let isSensitive = SENSITIVE_CATEGORIES.has(categorySlug);
      let articleType: 'original' | 'ai_summary' = 'original';
      let aiTranslation: {
        targetLang: 'en' | 'id';
        title: string;
        summary: string;
        content: string;
      } | null = null;

      if (settings.enableAiSummary !== false && geminiKey) {
        try {
          const ai = await analyzeWithGemini(item.title, item.description || item.title, String(src.name), geminiKey);
          title = ai.aiTitle || title;
          summary = ai.summary || summary;
          categorySlug = ai.categorySlug || categorySlug;
          countryCode = ai.countryCode || countryCode;
          language = ai.detectedLanguage === 'id' ? 'id' : 'en';
          keywords = Array.isArray(ai.keywords) ? ai.keywords.slice(0, 12) : [];
          isSensitive = Boolean(ai.sensitiveTopicFlag) || SENSITIVE_CATEGORIES.has(categorySlug);
          articleType = 'ai_summary';

          if (settings.enableTranslation !== false && ai.translatedTitle && ai.translatedSummary) {
            const targetLang = language === 'en' ? 'id' : 'en';
            aiTranslation = {
              targetLang,
              title: ai.translatedTitle,
              summary: ai.translatedSummary,
              content: ai.translatedContent || ai.translatedSummary,
            };
          }
        } catch (aiErr) {
          errors.push(`AI warning (${item.title}): ${aiErr instanceof Error ? aiErr.message : 'Error'}`);
        }
      }

      const matchedCat = categories.find((c) => c.slug === categorySlug) || categories[0];
      const matchedCountry = countries.find((c) => c.code === countryCode) || countries[0];
      if (!matchedCat || !matchedCountry) continue;

      const articleId = `art-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const status = settings.autoPublish && !isSensitive ? 'published' : 'draft';
      if (status === 'published') articlesPublished += 1;

      await db.doc(`articles/${articleId}`).set({
        id: articleId,
        title: title.slice(0, 290),
        subtitle: `Reported via ${src.name}`.slice(0, 480),
        slug: slugify(title) || `dispatch-${Date.now()}`,
        summary: summary.slice(0, 1950),
        content: `${summary}\n\nSource reference: ${src.name} (${item.link}).`,
        imageUrl: '',
        imageCaption: `Source attribution: ${src.name}`,
        categoryId: String(matchedCat.id),
        countryId: String(matchedCountry.id),
        regionId: null,
        province: null,
        sourceId: srcDoc.id,
        sourceUrl: item.link.slice(0, 990),
        sourceName: String(src.name),
        language,
        tags: keywords,
        author: String(src.name),
        articleType,
        requiresVerification: isSensitive,
        isVerified: !isSensitive,
        status,
        isAutomatic: true,
        isFeatured: false,
        viewCount: 1,
        seoTitle: `${title} | INFORVERSE`.slice(0, 240),
        seoDescription: summary.slice(0, 155),
        publishedAt: item.pubDate || new Date().toISOString(),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      if (aiTranslation) {
        const trId = `tr-${articleId}-${aiTranslation.targetLang}`;
        await db.doc(`articleTranslations/${trId}`).set({
          id: trId,
          articleId,
          language: aiTranslation.targetLang,
          translatedTitle: aiTranslation.title.slice(0, 290),
          translatedSubtitle: `Source summary from ${src.name}`.slice(0, 480),
          translatedSummary: aiTranslation.summary.slice(0, 1950),
          translatedContent: aiTranslation.content.slice(0, 59000),
          isAiTranslated: true,
          status: status === 'published' ? 'published' : 'draft',
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      existingTitles.push(title);
      existingUrls.add(item.link);
    }
  }

  const logId = `log-${Date.now()}`;
  const nowIso = new Date().toISOString();
  await db.doc(`automationLogs/${logId}`).set({
    id: logId,
    sourceId: null,
    logType: 'automation',
    status: errors.length > 0 && articlesFetched === 0 ? 'warning' : 'success',
    articlesFetched,
    articlesPublished,
    errors: errors.slice(0, 25),
    message: `Cloud Scheduler run: ${articlesFetched} fetched, ${articlesPublished} published, ${errors.length} warnings/errors.`,
    startedAt: nowIso,
    completedAt: nowIso,
    createdAt: FieldValue.serverTimestamp(),
  });

  if (settingsSnap.exists) {
    await settingsSnap.ref.update({
      lastRunAt: nowIso,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  return { skipped: false, articlesFetched, articlesPublished, errors };
}

export const scheduledInformationCollector = onSchedule(
  {
    schedule: 'every 30 minutes',
    timeZone: 'Asia/Jakarta',
    secrets: [GEMINI_API_KEY, NEWS_API_KEY],
    retryCount: 2,
  },
  async () => {
    await runScheduledIngestionPipeline(false);
  }
);

export const triggerCollectionHttp = onRequest(
  {
    cors: true,
    secrets: [GEMINI_API_KEY, NEWS_API_KEY, CRON_SECRET],
  },
  async (req, res) => {
    const authHeader = req.headers.authorization || '';
    const cronSecret = CRON_SECRET.value();

    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      const result = await runScheduledIngestionPipeline(true);
      res.json({ ok: true, ...result });
      return;
    }

    if (authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.slice(7).trim();
        const decoded = await getAuth(adminApp).verifyIdToken(token);
        const adminDoc = await db.doc(`admins/${decoded.uid}`).get();
        const isAllowed =
          decoded.email_verified === true &&
          (decoded.email === 'fawazoklama@gmail.com' || (adminDoc.exists && adminDoc.data()?.active === true));

        if (!isAllowed) {
          res.status(403).json({ error: 'Forbidden: Verified administrator privileges required.' });
          return;
        }
        const result = await runScheduledIngestionPipeline(true);
        res.json({ ok: true, ...result });
        return;
      } catch {
        res.status(401).json({ error: 'Invalid Firebase ID token.' });
        return;
      }
    }

    res.status(401).json({ error: 'Authorization required.' });
  }
);
