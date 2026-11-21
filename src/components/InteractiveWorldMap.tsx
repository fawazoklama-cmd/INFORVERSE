import React, { useMemo, useState } from 'react';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import worldAtlas from 'world-atlas/countries-110m.json';
import { ArrowRight, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import type { Article, Country } from '../types/inforverse';
import { useApp } from '../context/AppContext';
import { formatEditorialDate, getLocalizedArticleFields } from '../utils/editorial';

interface InteractiveWorldMapProps {
  articles: Article[];
  selectedCountryCode?: string;
  onSelectCountry?: (country: Country | null) => void;
}

export function InteractiveWorldMap({
  articles,
  selectedCountryCode,
  onSelectCountry,
}: InteractiveWorldMapProps) {
  const { countries, language, navigate, t } = useApp();
  const [internalCode, setInternalCode] = useState<string>(selectedCountryCode || 'ID');
  const [hoveredInfo, setHoveredInfo] = useState<{ name: string; count: number } | null>(null);
  const [zoom, setZoom] = useState(1);

  const activeCode = selectedCountryCode !== undefined ? selectedCountryCode : internalCode;

  const countryByIsoNumeric = useMemo(() => {
    const map = new Map<string, Country>();
    for (const c of countries) {
      if (c.iso_numeric) {
        map.set(String(Number(c.iso_numeric)), c);
        map.set(c.iso_numeric, c);
      }
    }
    return map;
  }, [countries]);

  const articleCountsByCountryId = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of articles) {
      counts.set(a.country_id, (counts.get(a.country_id) || 0) + 1);
    }
    return counts;
  }, [articles]);

  const geoFeatures = useMemo(() => {
    const topology = worldAtlas as any;
    const fc = feature(topology, topology.objects.countries) as unknown as GeoJSON.FeatureCollection;
    return fc.features;
  }, []);

  const projection = useMemo(
    () => geoNaturalEarth1().scale(168 * zoom).translate([460, 245]),
    [zoom]
  );
  const pathGenerator = useMemo(() => geoPath().projection(projection), [projection]);

  const activeCountry = useMemo(
    () => countries.find((c) => c.code === activeCode) || countries[0] || null,
    [countries, activeCode]
  );

  const activeCountryArticles = useMemo(() => {
    if (!activeCountry) return [];
    return articles.filter((a) => a.country_id === activeCountry.id).slice(0, 4);
  }, [articles, activeCountry]);

  const handleSelect = (country: Country | null) => {
    if (country) {
      setInternalCode(country.code);
      onSelectCountry?.(country);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Vector World Map */}
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-[#F3F5F8] p-4 dark:border-slate-800 dark:bg-[#10233F]/75 lg:col-span-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
            {hoveredInfo ? (
              <span>
                <strong className="text-[#071426] dark:text-white">{hoveredInfo.name}</strong> ·{' '}
                <span className="tabular-nums">{hoveredInfo.count}</span> {t.world.articlesCount}
              </span>
            ) : (
              <span>{t.world.selectCountry}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2.2, Number((z + 0.25).toFixed(2))))}
              aria-label="Zoom in world map"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:border-[#2878FF] hover:text-[#2878FF] dark:border-slate-700 dark:bg-[#071426] dark:text-slate-200"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(1, Number((z - 0.25).toFixed(2))))}
              aria-label="Zoom out world map"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:border-[#2878FF] hover:text-[#2878FF] dark:border-slate-700 dark:bg-[#071426] dark:text-slate-200"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              aria-label="Reset world map zoom"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:border-[#2878FF] hover:text-[#2878FF] dark:border-slate-700 dark:bg-[#071426] dark:text-slate-200"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="w-full overflow-hidden rounded-lg bg-white/80 dark:bg-[#071426]">
          <svg
            viewBox="0 0 920 460"
            role="img"
            aria-label="Interactive Global Information Map"
            className="h-auto w-full select-none"
          >
            <g>
              {geoFeatures.map((feat: any, idx: number) => {
                const rawId = String(feat.id ?? idx);
                const matched =
                  countryByIsoNumeric.get(rawId) ||
                  countryByIsoNumeric.get(String(Number(rawId)));
                const count = matched ? articleCountsByCountryId.get(matched.id) || 0 : 0;
                const isSelected = Boolean(matched && matched.code === activeCode);
                const d = pathGenerator(feat) || '';
                const displayName = matched
                  ? language === 'id'
                    ? matched.name_id
                    : matched.name_en
                  : feat.properties?.name || 'Region';

                return (
                  <path
                    key={`${rawId}-${idx}`}
                    d={d}
                    onMouseEnter={() => setHoveredInfo({ name: displayName, count })}
                    onMouseLeave={() => setHoveredInfo(null)}
                    onClick={() => {
                      if (matched) handleSelect(matched);
                    }}
                    className={`transition-colors duration-150 ${
                      matched ? 'cursor-pointer' : 'cursor-default'
                    } ${
                      isSelected
                        ? 'fill-[#2878FF] stroke-white dark:stroke-[#071426]'
                        : count > 0
                          ? 'fill-[#10233F]/75 hover:fill-[#2878FF]/85 stroke-white/80 dark:fill-[#2878FF]/45 dark:hover:fill-[#2878FF] dark:stroke-[#071426]'
                          : 'fill-slate-200 hover:fill-slate-300 stroke-white dark:fill-slate-800 dark:hover:fill-slate-700 dark:stroke-[#071426]'
                    }`}
                    strokeWidth={0.6}
                  />
                );
              })}
            </g>
          </svg>
        </div>

        {/* Quick Country Selector Strip */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {countries.slice(0, 10).map((c) => {
            const count = articleCountsByCountryId.get(c.id) || 0;
            const selected = c.code === activeCode;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelect(c)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  selected
                    ? 'bg-[#2878FF] text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-200/70 dark:bg-[#071426] dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {language === 'id' ? c.name_id : c.name_en} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Country Dispatch Panel */}
      <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#10233F]/55 lg:col-span-4">
        {activeCountry ? (
          <>
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <div>
                  <p className="text-xs font-semibold text-[#2878FF]">{activeCountry.continent}</p>
                  <h3 className="mt-0.5 text-xl font-bold text-[#071426] dark:text-white">
                    {language === 'id' ? activeCountry.name_id : activeCountry.name_en}
                  </h3>
                </div>
                <span className="font-mono text-sm font-semibold tabular-nums text-slate-500 dark:text-slate-300">
                  {articleCountsByCountryId.get(activeCountry.id) || 0} {t.world.articlesCount}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {activeCountryArticles.length > 0 ? (
                  activeCountryArticles.map((art) => {
                    const fields = getLocalizedArticleFields(art, language);
                    return (
                      <div
                        key={art.id}
                        className="border-b border-slate-100 pb-3 last:border-b-0 dark:border-slate-800"
                      >
                        <a
                          href={`/article/${art.slug}`}
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(`/article/${art.slug}`);
                          }}
                          className="text-sm font-semibold leading-snug text-[#071426] hover:text-[#2878FF] dark:text-slate-100 dark:hover:text-[#2878FF]"
                        >
                          {fields.title}
                        </a>
                        <p className="mt-1 text-xs tabular-nums text-slate-500 dark:text-slate-400">
                          {formatEditorialDate(art.published_at, language)}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <p className="py-6 text-sm text-slate-500 dark:text-slate-400">
                    {t.world.noCountryArticles}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate(`/world?country=${activeCountry.code}`)}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#071426] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2878FF] dark:bg-[#2878FF] dark:hover:bg-[#1f63d6]"
            >
              <span>{t.home.viewAll}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </>
        ) : (
          <p className="text-sm text-slate-500">{t.world.selectCountry}</p>
        )}
      </div>
    </div>
  );
}
