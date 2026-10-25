export type Backhaul = 'fibre' | 'microwave';

export interface Site {
  id: string;
  name: string;
  province: string;
  lat: number;
  lon: number;
  /** Fibre ring this site's backhaul belongs to */
  ring: RingId;
  backhaul: Backhaul;
  /** Typical busy-hour data traffic in Mbps */
  peakMbps: number;
}

export type RingId = 'harare' | 'northern' | 'eastern' | 'midlands' | 'southern' | 'western' | 'north-west';

export const RINGS: Record<RingId, string> = {
  harare: 'Harare metro ring',
  northern: 'Northern ring',
  eastern: 'Eastern ring',
  midlands: 'Midlands ring',
  southern: 'Southern ring',
  western: 'Western ring',
  'north-west': 'North-west ring',
};

export const SITES: Site[] = [
  { id: 'HRE-CBD', name: 'Harare CBD', province: 'Harare', lat: -17.829, lon: 31.052, ring: 'harare', backhaul: 'fibre', peakMbps: 2400 },
  { id: 'HRE-BOR', name: 'Borrowdale', province: 'Harare', lat: -17.745, lon: 31.095, ring: 'harare', backhaul: 'fibre', peakMbps: 1500 },
  { id: 'HRE-EPW', name: 'Epworth', province: 'Harare', lat: -17.89, lon: 31.148, ring: 'harare', backhaul: 'fibre', peakMbps: 1100 },
  { id: 'CTG-001', name: 'Chitungwiza', province: 'Harare', lat: -18.013, lon: 31.076, ring: 'harare', backhaul: 'fibre', peakMbps: 1700 },
  { id: 'NRT-001', name: 'Norton', province: 'Mashonaland West', lat: -17.883, lon: 30.7, ring: 'midlands', backhaul: 'fibre', peakMbps: 520 },
  { id: 'BND-001', name: 'Bindura', province: 'Mashonaland Central', lat: -17.302, lon: 31.331, ring: 'northern', backhaul: 'fibre', peakMbps: 560 },
  { id: 'MTD-001', name: 'Mount Darwin', province: 'Mashonaland Central', lat: -16.772, lon: 31.584, ring: 'northern', backhaul: 'microwave', peakMbps: 240 },
  { id: 'MTK-001', name: 'Mutoko', province: 'Mashonaland East', lat: -17.397, lon: 32.227, ring: 'northern', backhaul: 'microwave', peakMbps: 210 },
  { id: 'MRD-001', name: 'Marondera', province: 'Mashonaland East', lat: -18.186, lon: 31.552, ring: 'eastern', backhaul: 'fibre', peakMbps: 610 },
  { id: 'RSP-001', name: 'Rusape', province: 'Manicaland', lat: -18.528, lon: 32.128, ring: 'eastern', backhaul: 'fibre', peakMbps: 380 },
  { id: 'MUT-001', name: 'Mutare', province: 'Manicaland', lat: -18.971, lon: 32.671, ring: 'eastern', backhaul: 'fibre', peakMbps: 1300 },
  { id: 'CPG-001', name: 'Chipinge', province: 'Manicaland', lat: -20.188, lon: 32.624, ring: 'eastern', backhaul: 'microwave', peakMbps: 300 },
  { id: 'CHG-001', name: 'Chegutu', province: 'Mashonaland West', lat: -18.13, lon: 30.143, ring: 'midlands', backhaul: 'fibre', peakMbps: 340 },
  { id: 'KDM-001', name: 'Kadoma', province: 'Mashonaland West', lat: -18.333, lon: 29.915, ring: 'midlands', backhaul: 'fibre', peakMbps: 520 },
  { id: 'KWK-001', name: 'Kwekwe', province: 'Midlands', lat: -18.928, lon: 29.815, ring: 'midlands', backhaul: 'fibre', peakMbps: 640 },
  { id: 'GWE-001', name: 'Gweru', province: 'Midlands', lat: -19.45, lon: 29.817, ring: 'midlands', backhaul: 'fibre', peakMbps: 1050 },
  { id: 'ZVS-001', name: 'Zvishavane', province: 'Midlands', lat: -20.326, lon: 30.066, ring: 'southern', backhaul: 'microwave', peakMbps: 330 },
  { id: 'MSV-001', name: 'Masvingo', province: 'Masvingo', lat: -20.064, lon: 30.828, ring: 'southern', backhaul: 'fibre', peakMbps: 780 },
  { id: 'CHR-001', name: 'Chiredzi', province: 'Masvingo', lat: -21.05, lon: 31.667, ring: 'southern', backhaul: 'microwave', peakMbps: 310 },
  { id: 'BTB-001', name: 'Beitbridge', province: 'Matabeleland South', lat: -22.217, lon: 30.0, ring: 'southern', backhaul: 'fibre', peakMbps: 560 },
  { id: 'GWD-001', name: 'Gwanda', province: 'Matabeleland South', lat: -20.938, lon: 29.0, ring: 'southern', backhaul: 'fibre', peakMbps: 290 },
  { id: 'BYO-CBD', name: 'Bulawayo CBD', province: 'Bulawayo', lat: -20.15, lon: 28.583, ring: 'western', backhaul: 'fibre', peakMbps: 1900 },
  { id: 'BYO-NKL', name: 'Nkulumane', province: 'Bulawayo', lat: -20.205, lon: 28.515, ring: 'western', backhaul: 'fibre', peakMbps: 980 },
  { id: 'PLT-001', name: 'Plumtree', province: 'Matabeleland South', lat: -20.483, lon: 27.817, ring: 'western', backhaul: 'microwave', peakMbps: 200 },
  { id: 'HWG-001', name: 'Hwange', province: 'Matabeleland North', lat: -18.364, lon: 26.498, ring: 'western', backhaul: 'fibre', peakMbps: 270 },
  { id: 'VFA-001', name: 'Victoria Falls', province: 'Matabeleland North', lat: -17.932, lon: 25.83, ring: 'western', backhaul: 'fibre', peakMbps: 640 },
  { id: 'CNH-001', name: 'Chinhoyi', province: 'Mashonaland West', lat: -17.36, lon: 30.2, ring: 'north-west', backhaul: 'fibre', peakMbps: 470 },
  { id: 'KRO-001', name: 'Karoi', province: 'Mashonaland West', lat: -16.81, lon: 29.69, ring: 'north-west', backhaul: 'microwave', peakMbps: 230 },
  { id: 'KRB-001', name: 'Kariba', province: 'Mashonaland West', lat: -16.517, lon: 28.8, ring: 'north-west', backhaul: 'fibre', peakMbps: 260 },
];

/** Backbone links drawn on the map (fibre routes between sites). */
export const LINKS: [string, string][] = [
  ['HRE-CBD', 'HRE-BOR'], ['HRE-BOR', 'HRE-EPW'], ['HRE-EPW', 'CTG-001'], ['CTG-001', 'HRE-CBD'],
  ['HRE-BOR', 'BND-001'], ['BND-001', 'MTD-001'], ['BND-001', 'MTK-001'],
  ['HRE-EPW', 'MRD-001'], ['MRD-001', 'RSP-001'], ['RSP-001', 'MUT-001'], ['MUT-001', 'CPG-001'],
  ['HRE-CBD', 'NRT-001'], ['NRT-001', 'CHG-001'], ['CHG-001', 'KDM-001'], ['KDM-001', 'KWK-001'], ['KWK-001', 'GWE-001'],
  ['GWE-001', 'ZVS-001'], ['GWE-001', 'MSV-001'], ['MSV-001', 'CHR-001'], ['MSV-001', 'BTB-001'], ['ZVS-001', 'BTB-001'],
  ['GWE-001', 'BYO-CBD'], ['BYO-CBD', 'BYO-NKL'], ['BYO-CBD', 'GWD-001'], ['GWD-001', 'BTB-001'], ['BYO-NKL', 'PLT-001'],
  ['BYO-CBD', 'HWG-001'], ['HWG-001', 'VFA-001'],
  ['NRT-001', 'CNH-001'], ['CNH-001', 'KRO-001'], ['KRO-001', 'KRB-001'],
];

export const SITE_BY_ID: Record<string, Site> = Object.fromEntries(SITES.map((s) => [s.id, s]));
