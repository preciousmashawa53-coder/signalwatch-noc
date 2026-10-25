// Extracts Zimbabwe and its neighbours from Natural Earth (world-atlas) into a small GeoJSON file.
import { readFileSync, writeFileSync } from 'node:fs';
import { feature } from 'topojson-client';
const topo = JSON.parse(readFileSync('node_modules/world-atlas/countries-50m.json', 'utf8'));
const all = feature(topo, topo.objects.countries);
const wanted = { '716': 'Zimbabwe', '894': 'Zambia', '508': 'Mozambique', '710': 'South Africa', '072': 'Botswana' };
const features = all.features
  .filter((f) => wanted[String(f.id).padStart(3, '0')])
  .map((f) => ({ type: 'Feature', id: String(f.id).padStart(3, '0'), properties: { name: wanted[String(f.id).padStart(3, '0')] }, geometry: f.geometry }));
const round = (g) => JSON.parse(JSON.stringify(g, (k, v) => (typeof v === 'number' ? Math.round(v * 1000) / 1000 : v)));
writeFileSync('src/data/region.json', JSON.stringify(round({ type: 'FeatureCollection', features })));
console.log(features.map((f) => f.properties.name));
