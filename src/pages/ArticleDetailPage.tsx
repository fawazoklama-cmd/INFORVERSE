import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Bookmark,
  Check,
  Copy,
  ExternalLink,
  Globe2,
  Share2,
} from 'lucide-react';
import type { Article } from '../types/inforverse';
import { useApp } from '../context/AppContext';
import { ArticleCard } from '../components/ArticleCard';
import {
  calculateReadingTime,
  formatEditorialDate,
  getArticleTypeLabel,
  getLocalizedArticleFields,
  sanitizeExternalUrl,
} from '../utils/editorial';
import { loadPublishedArticleBySlugWithFallback } from '../services/firestoreService';

interface ArticleDetailPageProps {
  slug: string;
}

export function ArticleDetailPage({ slug }: ArticleDetailPageProps) {
  const { language, categories, countries, regions, navigate, toggleBookmark, isBookmarked, t } = useApp();
  const [article, setArticle] = useState<Article | null>(null);
  const [related, setRelated] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setNotFound(false);
      setImgError(false);
      try {
        const data = await loadPublishedArticleBySlugWithFallback(slug);
        if (!data.article) {
          setNotFound(true);
          return;
        }
        setArticle(data.article);
        setRelated(data.related);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [slug]);

  useEffect(() => {
    if (!article) return;
    const fields = getLocalizedArticleFields(article, language);
    document.title = article.seo_title || `${fields.title} | INFORVERSE`;
    return () => {
      document.title = 'INFORVERSE — Explore The World, Discover The Information';
    };
  }, [article, language]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 animate-pulse space-y-6">
        <div className="h-4 w-48 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-10 w-full rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-80 w-full rounded-xl bg-slate-200 dark:bg-slate-800" />
      </div>
    );
  }

  if (notFound || !article) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-3xl font-bold text-[#071426] dark:text-white">404</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">Information dispatch not found.</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-6 rounded-lg bg-[#2878FF] px-5 py-2.5 text-sm font-semibold text-white"
        >
          {t.nav.home}
        </button>
      </div>
    );
  }

  const fields = getLocalizedArticleFields(article, language);
  const category = categories.find((c) => c.id === article.category_id);
  const country = countries.find((c) => c.id === article.country_id);
  const region = article.region_id ? regions.find((r) => r.id === article.region_id) : null;
  const readTime = calculateReadingTime(fields.content || fields.summary);
  const saved = isBookmarked(article.id);
  const shareUrl = window.location.href;
  const safeSourceUrl = sanitizeExternalUrl(article.source_url);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback ignored
    }
  };

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: fields.title,
    description: fields.summary,
    datePublished: article.published_at,
    dateModified: article.updated_at,
    author: { '@type': 'Organization', name: article.author || article.source_name },
    publisher: { '@type': 'Organization', name: 'INFORVERSE' },
  };

  return (
    <article className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-12">
      <script type="application/ld+json">{JSON.stringify(structuredData)}</script>

      {/* Breadcrumbs & Back */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigate('/');
            }}
            className="hover:text-[#2878FF]"
          >
            {t.nav.home}
          </a>
          <span aria-hidden="true">/</span>
          {category && (
            <>
              <a
                href={`/category/${category.slug}`}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(`/category/${category.slug}`);
                }}
                className="font-medium text-[#2878FF] hover:underline"
              >
                {language === 'id' ? category.name_id : category.name_en}
              </a>
              <span aria-hidden="true">/</span>
            </>
          )}
          {country && (
            <span>{language === 'id' ? country.name_id : country.name_en}</span>
          )}
          {region && (
            <>
              <span aria-hidden="true">·</span>
              <span>{language === 'id' ? region.name_id : region.name_en}</span>
            </>
          )}
          {article.province && (
            <>
              <span aria-hidden="true">·</span>
              <span>{article.province}</span>
            </>
          )}
        </nav>

        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) {
              window.history.back();
            } else {
              navigate('/');
            }
          }}
          className="inline-flex items-center gap-1.5 font-medium text-slate-600 hover:text-[#2878FF] dark:text-slate-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{t.article.back}</span>
        </button>
      </div>

      {/* Article Type & Metadata */}
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
        <span className="font-semibold text-[#2878FF]">
          {getArticleTypeLabel(article.article_type, language)}
        </span>
        <span aria-hidden="true">·</span>
        <span>{article.author}</span>
        <span aria-hidden="true">·</span>
        <span className="tabular-nums">{readTime} {t.article.minRead}</span>
      </div>

      {/* Headline & Subtitle */}
      <h1 className="mt-3 text-3xl font-bold leading-tight text-[#071426] dark:text-white sm:text-4xl lg:text-[2.6rem]">
        {fields.title}
      </h1>
      {fields.subtitle && (
        <p className="mt-3 text-lg leading-relaxed text-slate-600 dark:text-slate-300">
          {fields.subtitle}
        </p>
      )}

      {/* Publication Timestamps & Action Bar */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-y border-slate-200 py-3.5 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <div className="space-y-0.5 tabular-nums">
          <p>
            {t.article.publishedAt}: {formatEditorialDate(article.published_at, language)}
          </p>
          {article.updated_at !== article.published_at && (
            <p>
              {t.article.updatedAt}: {formatEditorialDate(article.updated_at, language)}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => toggleBookmark(article.id)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              saved
                ? 'border-[#2878FF] bg-[#2878FF] text-white'
                : 'border-slate-200 text-slate-700 hover:border-[#2878FF] dark:border-slate-700 dark:text-slate-200'
            }`}
          >
            <Bookmark className="h-3.5 w-3.5" fill={saved ? 'currentColor' : 'none'} />
            <span>{saved ? t.article.bookmarked : t.article.bookmark}</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-[#2878FF] dark:border-slate-700 dark:text-slate-200"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? t.article.copied : t.article.copyLink}</span>
          </button>

          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${fields.title} ${shareUrl}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-[#2878FF] dark:border-slate-700 dark:text-slate-200"
          >
            <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>WhatsApp</span>
          </a>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(fields.title)}&url=${encodeURIComponent(shareUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-[#2878FF] dark:border-slate-700 dark:text-slate-200"
          >
            <span>X</span>
          </a>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-[#2878FF] dark:border-slate-700 dark:text-slate-200"
          >
            <span>Facebook</span>
          </a>
        </div>
      </div>

      {/* Sensitive-Topic Verification Notice */}
      {article.requires_verification && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs leading-relaxed text-amber-950 dark:border-amber-800/70 dark:bg-amber-950/35 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          <p>{t.article.sensitiveNotice}</p>
        </div>
      )}

      {/* Featured Image */}
      <figure className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-[#10233F] dark:border-slate-800">
        {!imgError && article.image_url ? (
          <img
            src={article.image_url}
            alt={fields.title}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="max-h-[480px] w-full object-cover"
          />
        ) : (
          <div className="flex h-64 w-full items-center justify-center bg-gradient-to-br from-[#071426] to-[#10233F]">
            <Globe2 className="h-12 w-12 text-[#2878FF]/70" />
          </div>
        )}
        {article.image_caption && (
          <figcaption className="border-t border-slate-200 bg-[#F3F5F8] px-4 py-2.5 text-xs italic text-slate-600 dark:border-slate-800 dark:bg-[#071426] dark:text-slate-400">
            {article.image_caption}
          </figcaption>
        )}
      </figure>

      {/* Summary Callout */}
      <div className="mx-auto mt-8 max-w-2xl rounded-xl border border-slate-200 bg-[#F3F5F8] p-5 dark:border-slate-800 dark:bg-[#10233F]/55">
        <p className="text-sm font-semibold text-[#2878FF]">
          {getArticleTypeLabel(article.article_type, language)}
        </p>
        <p className="mt-2 text-base font-medium leading-relaxed text-[#071426] dark:text-slate-100">
          {fields.summary}
        </p>
      </div>

      {/* Main Content Body (65-75ch reading measure) */}
      <div className="mx-auto mt-8 max-w-2xl space-y-5 text-base leading-[1.8] text-slate-800 dark:text-slate-200">
        {fields.content.split(/\n\n+/).map((paragraph, idx) => (
          <p
            key={idx}
            className={
              idx === 0
                ? 'first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:font-serif first-letter:text-5xl first-letter:font-bold first-letter:text-[#071426] dark:first-letter:text-white'
                : ''
            }
          >
            {paragraph}
          </p>
        ))}
      </div>

      {/* Original Source Reference */}
      <div className="mx-auto mt-10 max-w-2xl rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#10233F]/45">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          {t.article.originalSource}
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-semibold text-[#071426] dark:text-white">{article.source_name}</span>
          {safeSourceUrl && (
            <a
              href={safeSourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2878FF] hover:underline"
            >
              <span>{safeSourceUrl}</span>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>

      {/* Related Articles */}
      {related.length > 0 && (
        <section className="mt-14 border-t border-slate-200 pt-10 dark:border-slate-800">
          <h2 className="mb-6 text-2xl font-bold text-[#071426] dark:text-white">
            {t.article.relatedArticles}
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {related.map((rel) => (
              <ArticleCard key={rel.id} article={rel} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
