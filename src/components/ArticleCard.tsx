import React, { useState } from 'react';
import { Bookmark, Globe2 } from 'lucide-react';
import type { Article } from '../types/inforverse';
import { useApp } from '../context/AppContext';
import {
  calculateReadingTime,
  formatEditorialDate,
  getArticleTypeLabel,
  getLocalizedArticleFields,
} from '../utils/editorial';

interface ArticleCardProps {
  article: Article;
  variant?: 'standard' | 'compact' | 'horizontal';
}

export function ArticleCard({ article, variant = 'standard' }: ArticleCardProps) {
  const { language, categories, countries, navigate, toggleBookmark, isBookmarked } = useApp();
  const [imgError, setImgError] = useState(false);

  const fields = getLocalizedArticleFields(article, language);
  const category = categories.find((c) => c.id === article.category_id);
  const country = countries.find((c) => c.id === article.country_id);
  const catName = category ? (language === 'id' ? category.name_id : category.name_en) : 'World';
  const countryName = country ? (language === 'id' ? country.name_id : country.name_en) : '';
  const readTime = calculateReadingTime(fields.content || fields.summary);
  const saved = isBookmarked(article.id);
  const articleUrl = `/article/${article.slug}`;

  const handleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(articleUrl);
  };

  if (variant === 'compact') {
    return (
      <article className="group border-b border-slate-200 py-4 last:border-b-0 dark:border-slate-800">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-[#2878FF]">{catName}</span>
              {countryName && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{countryName}</span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{formatEditorialDate(article.published_at, language)}</span>
            </div>
            <h3 className="mt-1.5 text-base font-semibold leading-snug text-[#071426] transition-colors group-hover:text-[#2878FF] dark:text-slate-100 dark:group-hover:text-[#2878FF]">
              <a href={articleUrl} onClick={handleOpen}>
                {fields.title}
              </a>
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {article.source_name} · {readTime} min
            </p>
          </div>
          <button
            type="button"
            onClick={() => toggleBookmark(article.id)}
            aria-label={saved ? `Remove bookmark for ${fields.title}` : `Bookmark ${fields.title}`}
            className={`mt-1 shrink-0 rounded-md p-2 transition-colors ${
              saved
                ? 'text-[#2878FF] bg-[#2878FF]/10'
                : 'text-slate-400 hover:bg-[#F3F5F8] hover:text-[#071426] dark:hover:bg-[#10233F] dark:hover:text-white'
            }`}
          >
            <Bookmark className="h-4 w-4" fill={saved ? 'currentColor' : 'none'} />
          </button>
        </div>
      </article>
    );
  }

  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-all duration-200 hover:border-slate-300 dark:border-slate-800 dark:bg-[#10233F]/55 dark:hover:border-slate-700 ${
        variant === 'horizontal' ? 'sm:flex-row' : ''
      }`}
    >
      <a
        href={articleUrl}
        onClick={handleOpen}
        className={`relative block overflow-hidden bg-[#10233F] shrink-0 ${
          variant === 'horizontal' ? 'aspect-[16/10] sm:w-56 sm:aspect-[4/3]' : 'aspect-[4/3] w-full'
        }`}
      >
        {!imgError && article.image_url ? (
          <img
            src={article.image_url}
            alt={fields.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#071426] to-[#10233F] p-4 text-center text-slate-300">
            <Globe2 className="h-8 w-8 text-[#2878FF]/80" aria-hidden="true" />
            <span className="mt-2 line-clamp-2 text-xs font-medium text-slate-300">{catName}</span>
          </div>
        )}
      </a>

      <div className="flex flex-1 flex-col justify-between p-5">
        <div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-[#2878FF]">{catName}</span>
            {countryName && (
              <>
                <span aria-hidden="true">·</span>
                <span>{countryName}</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{readTime} min</span>
          </div>

          <h3 className="mt-2 text-lg font-semibold leading-snug text-[#071426] transition-colors group-hover:text-[#2878FF] dark:text-white dark:group-hover:text-[#2878FF]">
            <a href={articleUrl} onClick={handleOpen}>
              {fields.title}
            </a>
          </h3>

          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {fields.summary}
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <div className="min-w-0 truncate">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {getArticleTypeLabel(article.article_type, language)}
            </span>
            <span aria-hidden="true"> · </span>
            <span className="tabular-nums">{formatEditorialDate(article.published_at, language)}</span>
          </div>
          <button
            type="button"
            onClick={() => toggleBookmark(article.id)}
            aria-label={saved ? `Remove bookmark for ${fields.title}` : `Bookmark ${fields.title}`}
            className={`ml-2 shrink-0 rounded-md p-1.5 transition-colors ${
              saved
                ? 'text-[#2878FF]'
                : 'text-slate-400 hover:bg-[#F3F5F8] hover:text-[#071426] dark:hover:bg-[#071426] dark:hover:text-white'
            }`}
          >
            <Bookmark className="h-4 w-4" fill={saved ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>
    </article>
  );
}
