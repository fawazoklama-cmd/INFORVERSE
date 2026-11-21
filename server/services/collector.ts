import { XMLParser } from 'fast-xml-parser';
import { dbStore } from '../db/store';
import {
  isDuplicateHeadline,
  matchProvinceInText,
  requiresSensitiveVerification,
  sanitizeExternalUrl,
  slugify,
} from '../../src/utils/editorial';
import type { Article, Source } from '../../src/types/inforverse';
import { analyzeAndSummarizeSource } from './gemini';
import { assertSafeExternalUrl } from './security';

export interface ParsedFeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
}

function stripHtmlTags(raw: string): string {
  return String(raw || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function fetchRssOrAtomFeed(rawUrl: string): Promise<ParsedFeedItem[]> {
  const safeUrl = assertSafeExternalUrl(rawUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(safeUrl.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'INFORVERSE-Aggregator/1.0 (+https://inforverse.org)',
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }
    const xmlText = await response.text();
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
    const parsed = parser.parse(xmlText) as Record<string, any>;

    // Handle RSS 2.0
    const rssItems = parsed?.rss?.channel?.item;
    if (rssItems) {
      const arr = Array.isArray(rssItems) ? rssItems : [rssItems];
      return arr
        .slice(0, 10)
        .map((item: any) => ({
          title: stripHtmlTags(item.title),
          link: sanitizeExternalUrl(String(item.link || item.guid?.['#text'] || item.guid || '')),
          description: stripHtmlTags(item.description || item['content:encoded'] || ''),
          pubDate: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        }))
        .filter((i) => i.title && i.link);
    }

    // Handle Atom
    const atomEntries = parsed?.feed?.entry;
    if (atomEntries) {
      const arr = Array.isArray(atomEntries) ? atomEntries : [atomEntries];
      return arr
        .slice(0, 10)
        .map((entry: any) => {
          const linkHref = Array.isArray(entry.link)
            ? entry.link[0]?.['@_href']
            : entry.link?.['@_href'] || entry.link;
          return {
            title: stripHtmlTags(entry.title?.['#text'] || entry.title || ''),
            link: sanitizeExternalUrl(String(linkHref || '')),
            description: stripHtmlTags(entry.summary?.['#text'] || entry.summary || entry.content || ''),
            pubDate: entry.updated || entry.published || new Date().toISOString(),
          };
        })
        .filter((i) => i.title && i.link);
    }

    throw new Error('Unrecognized RSS or Atom XML structure.');
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchNewsApiSource(source: Source): Promise<ParsedFeedItem[]> {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) {
    throw new Error('NEWS_API_KEY is not configured on the server.');
  }
  const safeUrl = assertSafeExternalUrl(source.url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(safeUrl.toString(), {
      signal: controller.signal,
      headers: {
        'X-Api-Key': apiKey,
        'User-Agent': 'INFORVERSE-Aggregator/1.0',
      },
    });
    if (!response.ok) {
      throw new Error(`NewsAPI returned HTTP ${response.status}`);
    }
    const json = (await response.json()) as { articles?: Array<any> };
    return (json.articles || [])
      .slice(0, 10)
      .map((a) => ({
        title: stripHtmlTags(a.title || ''),
        link: sanitizeExternalUrl(a.url || ''),
        description: stripHtmlTags(a.description || a.content || ''),
        pubDate: a.publishedAt || new Date().toISOString(),
      }))
      .filter((i) => i.title && i.link);
  } finally {
    clearTimeout(timer);
  }
}

export async function testSourceConnection(source: Source): Promise<{
  ok: boolean;
  itemCount: number;
  sampleTitle?: string;
  error?: string;
}> {
  try {
    const items =
      source.type === 'news_api' ? await fetchNewsApiSource(source) : await fetchRssOrAtomFeed(source.url);
    return {
      ok: true,
      itemCount: items.length,
      sampleTitle: items[0]?.title,
    };
  } catch (err) {
    return {
      ok: false,
      itemCount: 0,
      error: err instanceof Error ? err.message : 'Unknown connection error',
    };
  }
}

export async function runAutomatedCollection(): Promise<{
  processedSources: number;
  importedCount: number;
  skippedDuplicates: number;
  errors: string[];
}> {
  const settings = dbStore.getAutomationSettings();
  const activeSources = dbStore.getSources().filter((s) => s.is_active);
  const categories = dbStore.getCategories();
  const countries = dbStore.getCountries();
  const regions = dbStore.getRegions();
  const existingArticles = dbStore.getArticles(true);
  const existingTitles = existingArticles.map((a) => a.title);
  const existingUrls = new Set(existingArticles.map((a) => a.source_url).filter(Boolean));

  let importedCount = 0;
  let skippedDuplicates = 0;
  const errors: string[] = [];

  for (const source of activeSources) {
    let items: ParsedFeedItem[] = [];
    let fetchError: string | null = null;
    const maxRetries = Math.max(1, settings.max_retries || 1);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        items =
          source.type === 'news_api' ? await fetchNewsApiSource(source) : await fetchRssOrAtomFeed(source.url);
        fetchError = null;
        break;
      } catch (err) {
        fetchError = err instanceof Error ? err.message : 'Fetch failed';
      }
    }

    if (fetchError) {
      dbStore.upsertSource({
        ...source,
        last_fetched_at: new Date().toISOString(),
        last_status: 'error',
        last_error: fetchError,
        retry_count: source.retry_count + 1,
      });
      dbStore.addLog({
        log_type: 'fetch_error',
        status: 'error',
        source_id: source.id,
        message: `Failed to fetch ${source.name}: ${fetchError}`,
        details: { url: source.url },
      });
      errors.push(`${source.name}: ${fetchError}`);
      continue;
    }

    dbStore.upsertSource({
      ...source,
      last_fetched_at: new Date().toISOString(),
      last_status: 'ok',
      last_error: null,
      retry_count: 0,
    });

    // Import up to 2 freshest items per source per cycle to keep processing fast and bounded
    for (const item of items.slice(0, 2)) {
      if (existingUrls.has(item.link)) {
        skippedDuplicates += 1;
        continue;
      }
      if (settings.duplicate_detection_enabled && isDuplicateHeadline(item.title, existingTitles)) {
        skippedDuplicates += 1;
        continue;
      }

      const baseSlug = slugify(item.title) || `update-${Date.now()}`;
      const uniqueSlug = existingArticles.some((a) => a.slug === baseSlug)
        ? `${baseSlug}-${Date.now().toString().slice(-5)}`
        : baseSlug;

      let title = item.title;
      let summary = item.description || item.title;
      let content = `${summary}\n\nSource reference: ${source.name} (${item.link}).`;
      let categorySlug = source.default_category_slug || 'world';
      let countryCode = source.country_code || 'US';
      let language = source.language;
      let keywords: string[] = [];
      let isSensitive = requiresSensitiveVerification(categorySlug);
      let isVerified = !isSensitive;
      let translations: Article['translations'] = undefined;
      let articleType: Article['article_type'] = 'original';

      if (settings.ai_summary_enabled && process.env.GEMINI_API_KEY) {
        try {
          const ai = await analyzeAndSummarizeSource({
            rawTitle: item.title,
            rawText: item.description || item.title,
            sourceName: source.name,
            sourceUrl: item.link,
          });
          title = ai.aiTitle || item.title;
          summary = ai.summary || summary;
          content = `${ai.summary}\n\nOriginal report available from ${source.name}.`;
          categorySlug = ai.categorySlug || categorySlug;
          countryCode = ai.countryCode || countryCode;
          language = ai.detectedLanguage || language;
          keywords = ai.keywords || [];
          isSensitive = ai.sensitiveTopicFlag || requiresSensitiveVerification(categorySlug);
          isVerified = !ai.containsUnverifiedClaims && !isSensitive;
          articleType = 'ai_summary';

          if (settings.ai_translation_enabled && ai.translatedTitle && ai.translatedSummary) {
            const targetLang = language === 'en' ? 'id' : 'en';
            translations = {
              [targetLang]: {
                id: `tr-${Date.now()}-${targetLang}`,
                article_id: '',
                language: targetLang,
                title: ai.translatedTitle,
                subtitle: `Source summary from ${source.name}`,
                summary: ai.translatedSummary,
                content: ai.translatedContent || ai.translatedSummary,
                is_ai_translated: true,
              },
            };
          }
        } catch (aiErr) {
          dbStore.addLog({
            log_type: 'ai',
            status: 'warning',
            source_id: source.id,
            message: `AI enrichment skipped for "${item.title}": ${aiErr instanceof Error ? aiErr.message : 'Error'}`,
            details: {},
          });
        }
      }

      const matchedCat = categories.find((c) => c.slug === categorySlug) || categories[0];
      const matchedCountry = countries.find((c) => c.code === countryCode) || countries[0];
      const { regionId, province } =
        matchedCountry.code === 'ID'
          ? matchProvinceInText(`${title} ${summary}`, regions)
          : { regionId: null, province: null };

      const id = `art-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      if (translations) {
        for (const t of Object.values(translations)) {
          if (t) t.article_id = id;
        }
      }

      const shouldPublish = settings.auto_publish && !isSensitive;
      const newArticle: Article = {
        id,
        title,
        slug: uniqueSlug,
        subtitle: `Reported via ${source.name}`,
        summary,
        content,
        image_url:
          matchedCountry.code === 'ID'
            ? '/src/assets/images/indo_jakarta_skyline_1795250511476.jpg'
            : matchedCat.slug === 'space'
              ? '/src/assets/images/space_orbital_observatory_1795250511424.jpg'
              : matchedCat.slug === 'technology' || matchedCat.slug === 'science'
                ? '/src/assets/images/tech_quantum_lab_1795250512205.jpg'
                : '/src/assets/images/hero_global_summit_1795250512890.jpg',
        image_caption: `Source attribution: ${source.name}`,
        category_id: matchedCat.id,
        country_id: matchedCountry.id,
        region_id: regionId,
        province,
        source_id: source.id,
        source_name: source.name,
        source_url: item.link,
        author: source.name,
        article_type: articleType,
        requires_verification: isSensitive,
        is_verified: isVerified,
        language,
        status: shouldPublish ? 'published' : 'draft',
        is_automatic: true,
        is_featured: false,
        views_count: 1,
        tags: keywords,
        seo_title: `${title} | INFORVERSE`,
        seo_description: summary.slice(0, 155),
        published_at: item.pubDate || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        translations,
      };

      dbStore.upsertArticle(newArticle);
      existingTitles.push(title);
      existingUrls.add(item.link);
      importedCount += 1;
    }
  }

  const now = new Date();
  const nextRun = new Date(now.getTime() + Math.max(5, settings.update_interval_minutes) * 60 * 1000);
  dbStore.updateAutomationSettings({
    last_run_at: now.toISOString(),
    next_run_at: nextRun.toISOString(),
  });

  dbStore.addLog({
    log_type: 'automation',
    status: errors.length > 0 && importedCount === 0 ? 'warning' : 'success',
    source_id: null,
    message: `Automated collection finished: ${importedCount} imported, ${skippedDuplicates} duplicates skipped, ${errors.length} source errors.`,
    details: { processedSources: activeSources.length, importedCount, skippedDuplicates, errors },
  });

  return {
    processedSources: activeSources.length,
    importedCount,
    skippedDuplicates,
    errors,
  };
}

let schedulerTimer: NodeJS.Timeout | null = null;

export function startAutomationScheduler(): void {
  if (schedulerTimer) clearInterval(schedulerTimer);
  // Check every 60 seconds whether the configured interval has elapsed when scheduler_enabled is true
  schedulerTimer = setInterval(async () => {
    const settings = dbStore.getAutomationSettings();
    if (!settings.scheduler_enabled) return;
    const lastRun = settings.last_run_at ? new Date(settings.last_run_at).getTime() : 0;
    const intervalMs = Math.max(5, settings.update_interval_minutes) * 60 * 1000;
    if (Date.now() - lastRun >= intervalMs) {
      try {
        await runAutomatedCollection();
      } catch (err) {
        dbStore.addLog({
          log_type: 'automation',
          status: 'error',
          source_id: null,
          message: `Scheduler cycle failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
          details: {},
        });
      }
    }
  }, 60_000);
}
