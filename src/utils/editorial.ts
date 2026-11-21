import type { Article, ArticleType, IndonesianRegion, Language } from '../types/inforverse';

export const SENSITIVE_CATEGORIES = new Set(['politics', 'security', 'disaster', 'health']);

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 96);
}

export function calculateReadingTime(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function sanitizeExternalUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
    return '';
  } catch {
    // Allow internal relative paths starting with single /
    if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
      return trimmed;
    }
    return '';
  }
}

export function normalizeTextTokens(text: string): Set<string> {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'to', 'for', 'with', 'at', 'by', 'from',
    'dan', 'yang', 'di', 'ke', 'dari', 'untuk', 'pada', 'dengan', 'ini', 'itu',
  ]);
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));
  return new Set(tokens);
}

export function jaccardSimilarity(a: string, b: string): number {
  const setA = normalizeTextTokens(a);
  const setB = normalizeTextTokens(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function isDuplicateHeadline(candidateTitle: string, existingTitles: string[], threshold = 0.6): boolean {
  const normalizedCandidate = candidateTitle.trim().toLowerCase();
  for (const existing of existingTitles) {
    if (existing.trim().toLowerCase() === normalizedCandidate) return true;
    if (jaccardSimilarity(candidateTitle, existing) >= threshold) return true;
  }
  return false;
}

export function requiresSensitiveVerification(categorySlug: string): boolean {
  return SENSITIVE_CATEGORIES.has(categorySlug.toLowerCase());
}

export function getLocalizedArticleFields(article: Article, lang: Language): {
  title: string;
  subtitle: string;
  summary: string;
  content: string;
  isTranslated: boolean;
} {
  if (article.language === lang) {
    return {
      title: article.title,
      subtitle: article.subtitle,
      summary: article.summary,
      content: article.content,
      isTranslated: false,
    };
  }
  const translation = article.translations?.[lang];
  if (translation && translation.title && translation.summary) {
    return {
      title: translation.title,
      subtitle: translation.subtitle || article.subtitle,
      summary: translation.summary,
      content: translation.content || article.content,
      isTranslated: true,
    };
  }
  return {
    title: article.title,
    subtitle: article.subtitle,
    summary: article.summary,
    content: article.content,
    isTranslated: false,
  };
}

export function formatEditorialDate(isoDate: string, lang: Language): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat(lang === 'id' ? 'id-ID' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function getArticleTypeLabel(type: ArticleType, lang: Language): string {
  if (lang === 'id') {
    if (type === 'original') return 'Laporan Sumber Asli';
    if (type === 'ai_summary') return 'Ringkasan AI (Berbasis Sumber)';
    return 'Artikel Editorial';
  }
  if (type === 'original') return 'Original Source Report';
  if (type === 'ai_summary') return 'AI-Generated Summary';
  return 'Editorial Article';
}

export function matchProvinceInText(text: string, regions: IndonesianRegion[]): {
  regionId: string | null;
  province: string | null;
} {
  const lower = text.toLowerCase();
  for (const region of regions) {
    for (const province of region.provinces) {
      const pattern = new RegExp(`\\b${province.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
      if (pattern.test(lower)) {
        return { regionId: region.id, province };
      }
    }
  }
  return { regionId: null, province: null };
}
