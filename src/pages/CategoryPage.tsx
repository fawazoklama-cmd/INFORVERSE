import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { DocumentSnapshot } from 'firebase/firestore';
import type { Article } from '../types/inforverse';
import { useApp } from '../context/AppContext';
import { ArticleCard } from '../components/ArticleCard';
import { SkeletonCard } from '../components/SkeletonCard';
import { getLocalizedArticleFields } from '../utils/editorial';
import { loadPublishedArticlesWithFallback } from '../services/firestoreService';

interface CategoryPageProps {
  slug: string;
}

export function CategoryPage({ slug }: CategoryPageProps) {
  const { categories, language, navigate, t } = useApp();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [query, setQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | '24h' | '7d' | '30d'>('all');
  const [visibleCount, setVisibleCount] = useState(9);

  const category = categories.find((c) => c.slug === slug);
  const resolvedCategoryId = category?.id || `cat-${slug}`;

  useEffect(() => {
    setVisibleCount(9);
    setLastDoc(null);
    setHasMore(false);
    const fetchCategory = async () => {
      setLoading(true);
      try {
        const res = await loadPublishedArticlesWithFallback({
          pageSize: 18,
          categoryId: resolvedCategoryId,
          categorySlug: slug,
        });
        setArticles(res.articles);
        setLastDoc(res.lastDoc);
        setHasMore(res.hasMore);
      } finally {
        setLoading(false);
      }
    };
    void fetchCategory();
  }, [slug, resolvedCategoryId]);

  const handleLoadMore = async () => {
    setVisibleCount((c) => c + 6);
    if (hasMore && lastDoc && !loadingMore) {
      setLoadingMore(true);
      try {
        const res = await loadPublishedArticlesWithFallback({
          pageSize: 12,
          cursor: lastDoc,
          categoryId: resolvedCategoryId,
          categorySlug: slug,
        });
        setArticles((prev) => {
          const seen = new Set(prev.map((a) => a.id));
          return [...prev, ...res.articles.filter((a) => !seen.has(a.id))];
        });
        setLastDoc(res.lastDoc);
        setHasMore(res.hasMore);
      } finally {
        setLoadingMore(false);
      }
    }
  };

  const filtered = useMemo(() => {
    const now = Date.now();
    return articles.filter((art) => {
      if (dateFilter !== 'all') {
        const days = dateFilter === '24h' ? 1 : dateFilter === '7d' ? 7 : 30;
        if (now - new Date(art.published_at).getTime() > days * 86_400_000) return false;
      }
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const f = getLocalizedArticleFields(art, language);
        return (
          f.title.toLowerCase().includes(q) ||
          f.summary.toLowerCase().includes(q) ||
          art.source_name.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [articles, dateFilter, query, language]);

  const featured = filtered[0];
  const latest = filtered.slice(1, visibleCount);
  const popular = [...articles].sort((a, b) => b.views_count - a.views_count).slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="border-b border-slate-200 pb-6 dark:border-slate-800">
        <p className="text-xs font-semibold text-[#2878FF]">INFORVERSE TOPIC</p>
        <h1 className="mt-1 text-3xl font-bold text-[#071426] dark:text-white sm:text-4xl">
          {category ? (language === 'id' ? category.name_id : category.name_en) : slug}
        </h1>
        {category && (
          <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
            {language === 'id' ? category.description_id : category.description_en}
          </p>
        )}

        {/* Filter & Search Bar */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <label htmlFor="category-search" className="sr-only">
              {t.category.searchInCat}
            </label>
            <input
              id="category-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.category.searchInCat}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-[#071426] focus:border-[#2878FF] focus:outline-none dark:border-slate-700 dark:bg-[#10233F] dark:text-white"
            />
          </div>
          <label htmlFor="category-date-filter" className="sr-only">
            Date filter
          </label>
          <select
            id="category-date-filter"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-[#071426] focus:border-[#2878FF] focus:outline-none dark:border-slate-700 dark:bg-[#10233F] dark:text-white"
          >
            <option value="all">{t.category.allDates}</option>
            <option value="24h">{t.category.last24h}</option>
            <option value="7d">{t.category.last7d}</option>
            <option value="30d">{t.category.last30d}</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-base text-slate-600 dark:text-slate-300">{t.category.empty}</p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setDateFilter('all');
            }}
            className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-[#071426] hover:border-[#2878FF] dark:border-slate-700 dark:text-white"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-12">
          <div className="lg:col-span-8 space-y-8">
            {featured && (
              <div>
                <h2 className="mb-3 text-sm font-semibold text-[#2878FF]">{t.category.featured}</h2>
                <ArticleCard article={featured} variant="horizontal" />
              </div>
            )}

            {latest.length > 0 && (
              <div>
                <h2 className="mb-4 text-xl font-bold text-[#071426] dark:text-white">{t.category.latest}</h2>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {latest.map((art) => (
                    <ArticleCard key={art.id} article={art} />
                  ))}
                </div>
              </div>
            )}

            {(filtered.length > visibleCount || hasMore) && (
              <div className="pt-4 text-center">
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => void handleLoadMore()}
                  className="rounded-lg border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-[#071426] hover:border-[#2878FF] hover:text-[#2878FF] disabled:opacity-60 dark:border-slate-700 dark:bg-[#10233F] dark:text-white"
                >
                  {loadingMore ? t.common.loading : t.category.loadMore}
                </button>
              </div>
            )}
          </div>

          <aside className="lg:col-span-4 space-y-6">
            <div className="rounded-xl border border-slate-200 bg-[#F3F5F8] p-5 dark:border-slate-800 dark:bg-[#10233F]/55">
              <h2 className="border-b border-slate-200 pb-3 text-lg font-bold text-[#071426] dark:border-slate-700 dark:text-white">
                {t.category.popular}
              </h2>
              <div className="mt-2 divide-y divide-slate-200 dark:divide-slate-700">
                {popular.map((art) => (
                  <ArticleCard key={art.id} article={art} variant="compact" />
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#10233F]/55">
              <h3 className="text-sm font-bold text-[#071426] dark:text-white">{t.nav.allCategories}</h3>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => navigate(`/category/${cat.slug}`)}
                    className={`rounded-md px-2.5 py-1.5 text-left text-xs font-medium transition-colors ${
                      cat.slug === slug
                        ? 'bg-[#2878FF] text-white'
                        : 'bg-[#F3F5F8] text-slate-700 hover:bg-slate-200 dark:bg-[#071426] dark:text-slate-200'
                    }`}
                  >
                    {language === 'id' ? cat.name_id : cat.name_en}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
