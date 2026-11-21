import React, { useEffect, useMemo, useState } from 'react';
import { MapPin, Search } from 'lucide-react';
import type { Article } from '../types/inforverse';
import { useApp } from '../context/AppContext';
import { ArticleCard } from '../components/ArticleCard';
import { SkeletonCard } from '../components/SkeletonCard';
import { IndonesiaRegionMap } from '../components/IndonesiaRegionMap';
import { loadPublishedArticlesWithFallback } from '../services/firestoreService';

interface IndonesiaPageProps {
  initialRegionSlug?: string;
}

export function IndonesiaPage({ initialRegionSlug }: IndonesiaPageProps) {
  const { regions, countries, language, navigate, t } = useApp();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegionSlug, setSelectedRegionSlug] = useState<string>(initialRegionSlug || 'all');
  const [provinceQuery, setProvinceQuery] = useState('');
  const [selectedProvince, setSelectedProvince] = useState<string>('');

  useEffect(() => {
    setSelectedRegionSlug(initialRegionSlug || 'all');
  }, [initialRegionSlug]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await loadPublishedArticlesWithFallback({ pageSize: 100 });
        setArticles(res.articles);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const indonesiaCountry = countries.find((c) => c.code === 'ID');

  const indonesiaArticles = useMemo(
    () =>
      articles.filter(
        (a) => a.country_id === indonesiaCountry?.id || a.category_id === 'cat-indonesia' || Boolean(a.region_id)
      ),
    [articles, indonesiaCountry]
  );

  const activeRegion = regions.find((r) => r.slug === selectedRegionSlug) || null;

  const matchingProvinces = useMemo(() => {
    const q = provinceQuery.trim().toLowerCase();
    const list: Array<{ province: string; regionSlug: string; regionName: string }> = [];
    for (const reg of regions) {
      if (selectedRegionSlug !== 'all' && reg.slug !== selectedRegionSlug) continue;
      for (const prov of reg.provinces) {
        if (!q || prov.toLowerCase().includes(q)) {
          list.push({
            province: prov,
            regionSlug: reg.slug,
            regionName: language === 'id' ? reg.name_id : reg.name_en,
          });
        }
      }
    }
    return list;
  }, [regions, selectedRegionSlug, provinceQuery, language]);

  const filteredArticles = useMemo(() => {
    return indonesiaArticles.filter((art) => {
      if (selectedRegionSlug !== 'all') {
        const reg = regions.find((r) => r.slug === selectedRegionSlug);
        if (!reg || art.region_id !== reg.id) return false;
      }
      if (selectedProvince) {
        if (!art.province || art.province.toLowerCase() !== selectedProvince.toLowerCase()) return false;
      }
      return true;
    });
  }, [indonesiaArticles, regions, selectedRegionSlug, selectedProvince]);

  const handleSelectRegion = (slug: string) => {
    setSelectedRegionSlug(slug);
    setSelectedProvince('');
    navigate(slug === 'all' ? '/indonesia' : `/indonesia/${slug}`);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
      <div className="border-b border-slate-200 pb-6 dark:border-slate-800">
        <p className="text-xs font-semibold text-[#2878FF]">INFORVERSE ARCHIPELAGO</p>
        <h1 className="mt-1 text-3xl font-bold text-[#071426] dark:text-white sm:text-4xl">
          {t.indonesia.title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
          {t.indonesia.subtitle}
        </p>

        {/* 7 Major Region Filter Buttons */}
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleSelectRegion('all')}
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
              selectedRegionSlug === 'all'
                ? 'bg-[#2878FF] text-white'
                : 'bg-[#F3F5F8] text-slate-700 hover:bg-slate-200 dark:bg-[#10233F] dark:text-slate-200'
            }`}
          >
            {t.indonesia.allRegions}
          </button>
          {regions.map((reg) => (
            <button
              key={reg.id}
              type="button"
              onClick={() => handleSelectRegion(reg.slug)}
              className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
                selectedRegionSlug === reg.slug
                  ? 'bg-[#2878FF] text-white'
                  : 'bg-[#F3F5F8] text-slate-700 hover:bg-slate-200 dark:bg-[#10233F] dark:text-slate-200'
              }`}
            >
              {language === 'id' ? reg.name_id : reg.name_en}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <IndonesiaRegionMap
            articles={indonesiaArticles}
            selectedRegionSlug={selectedRegionSlug}
            onSelectRegion={handleSelectRegion}
          />
        </div>

        {/* Province Search & Regional Detail Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#10233F]/55 lg:col-span-5">
          <h2 className="text-lg font-bold text-[#071426] dark:text-white">
            {activeRegion ? (language === 'id' ? activeRegion.name_id : activeRegion.name_en) : t.indonesia.allRegions}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t.indonesia.provincesInRegion} ({matchingProvinces.length})
          </p>

          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <label htmlFor="province-search" className="sr-only">
              {t.indonesia.searchProvince}
            </label>
            <input
              id="province-search"
              type="search"
              value={provinceQuery}
              onChange={(e) => setProvinceQuery(e.target.value)}
              placeholder={t.indonesia.searchProvince}
              className="h-10 w-full rounded-lg border border-slate-200 bg-[#F3F5F8] pl-9 pr-3 text-sm text-[#071426] focus:border-[#2878FF] focus:outline-none dark:border-slate-700 dark:bg-[#071426] dark:text-white"
            />
          </div>

          <div className="mt-4 flex max-h-56 flex-wrap gap-1.5 overflow-y-auto pr-1">
            {selectedProvince && (
              <button
                type="button"
                onClick={() => setSelectedProvince('')}
                className="rounded-md bg-[#071426] px-2.5 py-1 text-xs font-medium text-white dark:bg-slate-700"
              >
                × {selectedProvince}
              </button>
            )}
            {matchingProvinces.map((item) => (
              <button
                key={item.province}
                type="button"
                onClick={() =>
                  setSelectedProvince((prev) => (prev === item.province ? '' : item.province))
                }
                className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                  selectedProvince === item.province
                    ? 'border-[#2878FF] bg-[#2878FF] text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-[#2878FF] dark:border-slate-700 dark:bg-[#071426] dark:text-slate-200'
                }`}
              >
                <MapPin className="h-3 w-3 opacity-60" aria-hidden="true" />
                <span>{item.province}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Articles List */}
      <div>
        <h2 className="mb-4 border-b border-slate-200 pb-3 text-xl font-bold text-[#071426] dark:border-slate-800 dark:text-white">
          {selectedProvince
            ? `${selectedProvince}`
            : activeRegion
              ? language === 'id'
                ? activeRegion.name_id
                : activeRegion.name_en
              : t.home.indonesiaNews}
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : filteredArticles.length === 0 ? (
          <p className="py-10 text-sm text-slate-500 dark:text-slate-400">{t.indonesia.noRegionArticles}</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredArticles.map((art) => (
              <ArticleCard key={art.id} article={art} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
