import React, { useEffect, useMemo, useState } from 'react';
import type { Article, ContinentName, Country } from '../types/inforverse';
import { useApp } from '../context/AppContext';
import { ArticleCard } from '../components/ArticleCard';
import { SkeletonCard } from '../components/SkeletonCard';
import { InteractiveWorldMap } from '../components/InteractiveWorldMap';

const CONTINENTS: ContinentName[] = [
  'Asia',
  'Europe',
  'Africa',
  'North America',
  'South America',
  'Oceania',
  'Antarctica',
];

export function WorldPage() {
  const { countries, language, currentPath, t } = useApp();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContinent, setSelectedContinent] = useState<string>('all');
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>(() => {
    const params = new URLSearchParams(currentPath.split('?')[1] || '');
    return params.get('country') || 'all';
  });

  useEffect(() => {
    const params = new URLSearchParams(currentPath.split('?')[1] || '');
    const c = params.get('country');
    if (c) setSelectedCountryCode(c.toUpperCase());
  }, [currentPath]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/articles?limit=100');
        if (res.ok) {
          const data = await res.json();
          setArticles(data.articles || []);
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const visibleCountries = useMemo(() => {
    if (selectedContinent === 'all') return countries;
    return countries.filter((c) => c.continent === selectedContinent);
  }, [countries, selectedContinent]);

  const filteredArticles = useMemo(() => {
    return articles.filter((art) => {
      const country = countries.find((c) => c.id === art.country_id);
      if (selectedContinent !== 'all' && country?.continent !== selectedContinent) return false;
      if (selectedCountryCode !== 'all' && country?.code !== selectedCountryCode) return false;
      return true;
    });
  }, [articles, countries, selectedContinent, selectedCountryCode]);

  const trendingGlobal = useMemo(
    () => [...articles].sort((a, b) => b.views_count - a.views_count).slice(0, 4),
    [articles]
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-10">
      <div className="border-b border-slate-200 pb-6 dark:border-slate-800">
        <p className="text-xs font-semibold text-[#2878FF]">INFORVERSE GLOBAL</p>
        <h1 className="mt-1 text-3xl font-bold text-[#071426] dark:text-white sm:text-4xl">
          {t.world.title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">{t.world.subtitle}</p>

        {/* Continent Tabs */}
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedContinent('all');
              setSelectedCountryCode('all');
            }}
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
              selectedContinent === 'all'
                ? 'bg-[#2878FF] text-white'
                : 'bg-[#F3F5F8] text-slate-700 hover:bg-slate-200 dark:bg-[#10233F] dark:text-slate-200'
            }`}
          >
            {t.world.allContinents}
          </button>
          {CONTINENTS.map((continent) => (
            <button
              key={continent}
              type="button"
              onClick={() => {
                setSelectedContinent(continent);
                setSelectedCountryCode('all');
              }}
              className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
                selectedContinent === continent
                  ? 'bg-[#2878FF] text-white'
                  : 'bg-[#F3F5F8] text-slate-700 hover:bg-slate-200 dark:bg-[#10233F] dark:text-slate-200'
              }`}
            >
              {continent}
            </button>
          ))}
        </div>

        {/* Country Selector */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedCountryCode('all')}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
              selectedCountryCode === 'all'
                ? 'border-[#2878FF] bg-[#2878FF]/10 text-[#2878FF]'
                : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300'
            }`}
          >
            {language === 'id' ? 'Semua Negara' : 'All Countries'}
          </button>
          {visibleCountries.map((co: Country) => (
            <button
              key={co.id}
              type="button"
              onClick={() => setSelectedCountryCode(co.code)}
              className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                selectedCountryCode === co.code
                  ? 'border-[#2878FF] bg-[#2878FF]/10 text-[#2878FF]'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300'
              }`}
            >
              {language === 'id' ? co.name_id : co.name_en}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive World Map */}
      <InteractiveWorldMap
        articles={articles}
        selectedCountryCode={selectedCountryCode === 'all' ? undefined : selectedCountryCode}
        onSelectCountry={(country) => {
          if (country) {
            setSelectedContinent(country.continent);
            setSelectedCountryCode(country.code);
          }
        }}
      />

      {/* Filtered Dispatches & Trending Global */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <h2 className="mb-4 border-b border-slate-200 pb-3 text-xl font-bold text-[#071426] dark:border-slate-800 dark:text-white">
            {t.world.latestIntl}
          </h2>
          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : filteredArticles.length === 0 ? (
            <p className="py-8 text-sm text-slate-500 dark:text-slate-400">{t.world.noCountryArticles}</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {filteredArticles.map((art) => (
                <ArticleCard key={art.id} article={art} />
              ))}
            </div>
          )}
        </div>

        <aside className="lg:col-span-4">
          <div className="rounded-xl border border-slate-200 bg-[#F3F5F8] p-5 dark:border-slate-800 dark:bg-[#10233F]/55">
            <h2 className="border-b border-slate-200 pb-3 text-lg font-bold text-[#071426] dark:border-slate-700 dark:text-white">
              {t.world.trendingGlobal}
            </h2>
            <div className="mt-2 divide-y divide-slate-200 dark:divide-slate-700">
              {trendingGlobal.map((art) => (
                <ArticleCard key={art.id} article={art} variant="compact" />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
