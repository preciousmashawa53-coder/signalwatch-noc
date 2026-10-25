import { geoMercator, geoPath } from 'd3-geo';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { useMemo } from 'react';
import region from '../data/region.json';
import { LINKS, SITES, SITE_BY_ID } from '../data/sites';
import type { SiteState } from '../sim/engine';

const W = 640;
const H = 560;

const geo = region as unknown as FeatureCollection<Geometry, { name: string }>;
const zimbabwe = geo.features.find((f) => f.properties.name === 'Zimbabwe') as Feature<Geometry, { name: string }>;
const neighbours = geo.features.filter((f) => f.properties.name !== 'Zimbabwe');

const projection = geoMercator().fitExtent(
  [
    [36, 30],
    [W - 36, H - 30],
  ],
  zimbabwe,
);
const path = geoPath(projection);

const NEIGHBOUR_LABELS: { name: string; lon: number; lat: number }[] = [
  { name: 'Zambia', lon: 27.6, lat: -16.25 },
  { name: 'Mozambique', lon: 32.75, lat: -16.6 },
  { name: 'Botswana', lon: 26.4, lat: -20.9 },
  { name: 'South Africa', lon: 29.4, lat: -22.45 },
];

function project(lon: number, lat: number): [number, number] {
  return projection([lon, lat]) ?? [0, 0];
}

/** Label placement per site. `always` labels show at all times; the rest only when selected or in trouble. */
const LABELS: Record<string, { text?: string; side: 'left' | 'right'; dy?: number; always?: boolean }> = {
  'HRE-CBD': { text: 'Harare', side: 'left', dy: -6, always: true },
  'BYO-CBD': { text: 'Bulawayo', side: 'left', dy: -4, always: true },
  'MUT-001': { side: 'left', always: true },
  'GWE-001': { side: 'right', always: true },
  'KWK-001': { side: 'right', always: true },
  'MSV-001': { side: 'right', always: true },
  'VFA-001': { side: 'right', always: true },
  'BTB-001': { side: 'right', always: true },
  'KRB-001': { side: 'right', always: true },
  'CPG-001': { side: 'left' },
  'MTK-001': { side: 'left' },
  'MRD-001': { side: 'right', dy: 6 },
  'HRE-BOR': { side: 'right', dy: -6 },
  'HRE-EPW': { side: 'right', dy: 4 },
  'CTG-001': { side: 'right', dy: 10 },
  'BYO-NKL': { side: 'left', dy: 12 },
};

function radius(peakMbps: number): number {
  return 3.5 + Math.sqrt(peakMbps) / 9;
}

interface Props {
  sites: Record<string, SiteState>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function NetworkMap({ sites, selectedId, onSelect }: Props) {
  const points = useMemo(() => Object.fromEntries(SITES.map((s) => [s.id, project(s.lon, s.lat)])), []);

  return (
    <svg className="map" viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Map of network sites across Zimbabwe">
      <defs>
        <radialGradient id="glow-up">
          <stop offset="0%" stopColor="var(--up)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--up)" stopOpacity="0" />
        </radialGradient>
        <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M24 0H0V24" fill="none" stroke="var(--grid)" strokeWidth="1" />
        </pattern>
      </defs>

      <rect width={W} height={H} fill="url(#grid)" />

      {neighbours.map((f) => (
        <path key={f.properties.name} d={path(f) ?? ''} className="map-neighbour" />
      ))}
      {NEIGHBOUR_LABELS.map((l) => {
        const [x, y] = project(l.lon, l.lat);
        return (
          <text key={l.name} x={x} y={y} className="map-country">
            {l.name}
          </text>
        );
      })}
      <path d={path(zimbabwe) ?? ''} className="map-land" />

      {LINKS.map(([a, b]) => {
        const [x1, y1] = points[a];
        const [x2, y2] = points[b];
        const broken = sites[a].status === 'down' || sites[b].status === 'down';
        return (
          <g key={`${a}-${b}`}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} className={broken ? 'link link-broken' : 'link'} />
            {!broken && <line x1={x1} y1={y1} x2={x2} y2={y2} className="link-flow" />}
          </g>
        );
      })}

      {SITES.map((site) => {
        const s = sites[site.id];
        const [x, y] = points[site.id];
        const r = radius(site.peakMbps);
        const selected = selectedId === site.id;
        const label = LABELS[site.id] ?? { side: 'right' as const };
        const showLabel = label.always || selected || s.status !== 'up';
        const labelLeft = label.side === 'left';
        return (
          <g
            key={site.id}
            className={`site site-${s.status}${selected ? ' site-selected' : ''}`}
            transform={`translate(${x} ${y})`}
            role="button"
            tabIndex={0}
            aria-label={`${site.name}: ${s.status === 'up' ? 'working normally' : s.status}`}
            aria-pressed={selected}
            onClick={() => onSelect(site.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(site.id);
              }
            }}
          >
            {s.status === 'up' && <circle r={r * 2.4} fill="url(#glow-up)" className="site-glow" />}
            {s.status !== 'up' && <circle r={r} className="site-pulse" />}
            {selected && (
              <>
                <circle r={r + 9} className="site-ring" />
                <circle r={r + 17} className="site-ring site-ring-outer" />
              </>
            )}
            <circle r={r} className="site-dot" />
            <circle r={r + 8} className="site-hit" />
            {showLabel && (
              <text
                x={labelLeft ? -(r + 6) : r + 6}
                y={4 + (label.dy ?? 0)}
                textAnchor={labelLeft ? 'end' : 'start'}
                className="site-label"
              >
                {label.text && !selected && s.status === 'up' ? label.text : SITE_BY_ID[site.id].name}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
