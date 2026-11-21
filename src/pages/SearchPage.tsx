import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import type { Article } from '../types/inforverse';
import { useApp } from '../context/AppContext';
import { ArticleCard } from '../components/ArticleCard';
import { SkeletonCard } from '../components/SkeletonCard';

export function SearchPage() {
  const { categories, countries, language, currentPath, addSearchHistory, searchHistory, clearSearchHistory, t } =
    useApp();
  const initialParams = new URLSearchParams(currentPath.split('?')[1] || '');

  const [query, setQuery] = useState(initialParams.get('q') || '');
  const [category, setCategory] = useState(initialParams.get('category') || 'all');
  const [country, setCountry] = useState(initialParams.get('country') || 'all');
  const [dateRange, setDateRange] = useState<'all' | '24h' | '7d' | '30d'>('all');
  const [sort, setSort] = useState<'newest' | 'popular'>(
    initialParams.get('sort') === 'popular' ? 'popular' : 'newest'
  );
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const p = new URLSearchParams(currentPath.split('?')[1] || '');
    if (p.has('q')) setQuery(p.get('q') || '');
    if (p.get('sort') === 'popular') setSort('popular');
  }, [currentPath]);

  const runSearch = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('q', query.trim());
      if (category !== 'all') params.set('category', category);
      if (country !== 'all') params.set('country', country);
      params.set('sort', sort);
      if (dateRange !== 'all') {
        const days = dateRange === '24h' ? 1 : dateRange === '7d' ? 7 : 30;
        params.set('dateFrom', new Date(Date.now() - days * 86_400_000).toISOString());
      }
      params.set('limit', '60');
      const res = await fetch(`/api/articles?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setArticles(data.articles || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void runSearch();
  }, [category, country, dateRange, sort]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) addSearchHistory(query.trim());
    void runSearch();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
      <div className="border-b border-slate-200 pb-6 dark:border-slate-800">
        <h1 className="text-3xl font-bold text-[#071426] dark:text-white">{t.search.title}</h1>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2878FF]" />
            <label htmlFor="search-page-input" className="sr-only">
              {t.search.title}
            </label>
            <input
              id="search-page-input"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.search.placeholder}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm text-[#071426] focus:border-[#2878FF] focus:outline-none dark:border-slate-700 dark:bg-[#10233F] dark:text-white"
            />
          </div>
          <button
            type="submit"
            className="h-11 rounded-lg bg-[#2878FF] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#1f63d6]"
          >
            {t.nav.search}
          </button>
        </form>

        {/* Filters */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select
            aria-label={t.search.filterCategory}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-[#071426] dark:border-slate-700 dark:bg-[#10233F] dark:text-white"
          >
            <option value="all">{t.search.filterCategory}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {language === 'id' ? c.name_id : c.name_en}
              </option>
            ))}
          </select>

          <select
            aria-label={t.search.filterCountry}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-[#071426] dark:border-slate-700 dark:bg-[#10233F] dark:text-white"
          >
            <option value="all">{t.search.filterCountry}</option>
            {countries.map((c) => (
              <option key={c.id} value={c.code}>
                {language === 'id' ? c.name_id : c.name_en}
              </option>
            ))}
          </select>

          <select
            aria-label="Date range"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-[#071426] dark:border-slate-700 dark:bg-[#10233F] dark:text-white"
          >
            <option value="all">{t.category.allDates}</option>
            <option value="24h">{t.category.last24h}</option>
            <option value="7d">{t.category.last7d}</option>
            <option value="30d">{t.category.last30d}</option>
          </select>

          <select
            aria-label="Sort order"
            value={sort}
            onChange={(e) => setSort(e.target.value as 'newest' | 'popular')}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-[#071426] dark:border-slate-700 dark:bg-[#10233F] dark:text-white"
          >
            <option value="newest">{t.search.sortNewest}</option>
            <option value="popular">{t.search.sortPopular}</option>
          </select>
        </div>

        {searchHistory.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t.search.recentSearches}:
            </span>
            {searchHistory.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setQuery(item);
                }}
                className="rounded-md border border-slate-200 bg-[#F3F5F8] px-2.5 py-1 text-xs text-slate-700 hover:border-[#2878FF] dark:border-slate-700 dark:bg-[#10233F] dark:text-slate-200"
              >
                {item}
              </button>
            ))}
            <button
              type="button"
              onClick={clearSearchHistory}
              className="text-xs text-[#2878FF] hover:underline"
            >
              {t.search.clearHistory}
            </button>
          </div>
        )}
      </div>

      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
        <span className="tabular-nums font-bold text-[#071426] dark:text-white">{articles.length}</span>{' '}
        {t.search.resultsFound}
      </p>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : articles.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-[#F3F5F8] p-10 text-center dark:border-slate-800 dark:bg-[#10233F]/55">
          <p className="text-sm text-slate-600 dark:text-slate-300">{t.search.noResults}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((art) => (
            <ArticleCard key={art.id} article={art} />
          ))}
        </div>
      )}
    </div>
  );
}
