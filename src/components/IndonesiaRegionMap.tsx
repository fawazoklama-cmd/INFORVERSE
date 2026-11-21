import React, { useMemo } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import worldAtlas from 'world-atlas/countries-110m.json';
import type { Article, IndonesianRegion } from '../types/inforverse';
import { useApp } from '../context/AppContext';

const REGION_COORDINATES: Record<string, [number, number]> = {
  sumatra: [101.5, 0.5],
  jawa: [109.8, -7.2],
  kalimantan: [114.2, 0.2],
  sulawesi: [120.5, -1.8],
  'bali-nusa-tenggara': [119.5, -8.8],
  maluku: [128.1, -2.5],
  papua: [137.8, -4.0],
};

interface IndonesiaRegionMapProps {
  articles: Article[];
  selectedRegionSlug: string;
  onSelectRegion: (slug: string) => void;
}

export function IndonesiaRegionMap({
  articles,
  selectedRegionSlug,
  onSelectRegion,
}: IndonesiaRegionMapProps) {
  const { regions, language } = useApp();

  const indonesiaFeature = useMemo(() => {
    const topology = worldAtlas as any;
    const fc = feature(topology, topology.objects.countries) as unknown as GeoJSON.FeatureCollection;
    return fc.features.filter((f: any) => String(f.id) === '360' || String(Number(f.id)) === '360');
  }, []);

  const projection = useMemo(
    () => geoMercator().center([118, -2.2]).scale(980).translate([420, 175]),
    []
  );
  const pathGenerator = useMemo(() => geoPath().projection(projection), [projection]);

  const countsByRegion = useMemo(() => {
    const map = new Map<string, number>();
    for (const art of articles) {
      if (art.region_id) {
        map.set(art.region_id, (map.get(art.region_id) || 0) + 1);
      }
    }
    return map;
  }, [articles]);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-[#F3F5F8] p-4 dark:border-slate-800 dark:bg-[#10233F]/75">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[#071426] dark:text-white">
          {language === 'id' ? 'Peta Wilayah Kepulauan Indonesia' : 'Indonesian Archipelago Region Map'}
        </h3>
        <button
          type="button"
          onClick={() => onSelectRegion('all')}
          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
            selectedRegionSlug === 'all'
              ? 'bg-[#2878FF] text-white'
              : 'bg-white text-slate-700 hover:bg-slate-200 dark:bg-[#071426] dark:text-slate-200'
          }`}
        >
          {language === 'id' ? 'Semua Wilayah' : 'All Regions'}
        </button>
      </div>

      <div className="w-full overflow-hidden rounded-lg bg-white dark:bg-[#071426]">
        <svg
          viewBox="0 0 840 340"
          role="img"
          aria-label="Interactive Indonesia Regions Map"
          className="h-auto w-full select-none"
        >
          <g>
            {indonesiaFeature.map((feat: any, i: number) => (
              <path
                key={i}
                d={pathGenerator(feat) || ''}
                className="fill-[#10233F]/20 stroke-[#10233F]/40 dark:fill-slate-800 dark:stroke-slate-600"
                strokeWidth={1}
              />
            ))}
          </g>

          {regions.map((reg: IndonesianRegion) => {
            const coords = REGION_COORDINATES[reg.slug];
            if (!coords) return null;
            const projected = projection(coords);
            if (!projected) return null;
            const [cx, cy] = projected;
            const isSelected = selectedRegionSlug === reg.slug;
            const count = countsByRegion.get(reg.id) || 0;
            const label = language === 'id' ? reg.name_id : reg.name_en;

            return (
              <g
                key={reg.id}
                transform={`translate(${cx}, ${cy})`}
                onClick={() => onSelectRegion(reg.slug)}
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                aria-label={`${label}: ${count} articles`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectRegion(reg.slug);
                  }
                }}
              >
                <circle
                  r={isSelected ? 18 : 14}
                  className={`transition-all ${
                    isSelected
                      ? 'fill-[#2878FF] stroke-white'
                      : 'fill-[#071426]/85 hover:fill-[#2878FF] stroke-white dark:fill-[#2878FF]/70'
                  }`}
                  strokeWidth={2}
                />
                <text
                  textAnchor="middle"
                  dy="4"
                  className="fill-white text-[11px] font-bold pointer-events-none"
                >
                  {count}
                </text>
                <text
                  textAnchor="middle"
                  dy="31"
                  className="fill-[#071426] dark:fill-slate-200 text-[11px] font-semibold pointer-events-none"
                >
                  {label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
