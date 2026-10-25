import { RINGS, SITES, SITE_BY_ID, type RingId, type Site } from '../data/sites';
import { createDetector, describeAnomaly, updateDetector, type DetectorState } from './anomaly';
import { Rng } from './random';
import { dataProfile, hourOf, ussdProfile, voiceProfile } from './traffic';

export type FaultKind = 'power' | 'fibre' | 'radio' | 'surge';
export type SiteStatus = 'up' | 'degraded' | 'down';
export type Severity = 'critical' | 'major' | 'minor';

export interface Fault {
  id: number;
  kind: FaultKind;
  siteIds: string[];
  startedAt: number; // tick
  endsAt: number; // tick
  label: string;
  manual: boolean;
}

export interface SitePoint {
  t: number;
  data: number;
  expected: number;
  band: [number, number];
}

export interface SiteState {
  id: string;
  status: SiteStatus;
  onMains: boolean;
  battery: number; // %
  dataMbps: number;
  expectedMbps: number;
  voiceErl: number;
  ussdPerMin: number;
  latencyMs: number;
  z: number;
  anomaly: boolean;
  technicianDueTick: number | null;
  history: SitePoint[];
}

export interface Alarm {
  id: number;
  key: string;
  siteId: string;
  severity: Severity;
  source: 'AI' | 'Rule';
  title: string;
  detail: string;
  raisedAt: number; // simTime
  status: 'active' | 'acknowledged' | 'cleared';
  clearedAt?: number;
}

export interface NationalPoint {
  t: number;
  dataGbps: number;
  expectedGbps: number;
  band: [number, number];
  ussdK: number;
}

export interface NocState {
  tick: number;
  simTime: number;
  seed: number;
  nextId: number;
  sites: Record<string, SiteState>;
  detectors: Record<string, DetectorState>;
  faults: Fault[];
  alarms: Alarm[];
  national: NationalPoint[];
}

export const TICK_MS = 60_000; // one tick = one simulated minute
const SITE_HISTORY = 120;
const NATIONAL_HISTORY = 180;
const BATTERY_DRAIN = 2.2; // % per minute on batteries
const BATTERY_CHARGE = 1.5; // % per minute when mains is back
const MAX_RANDOM_FAULTS = 3;

export const FAULT_INFO: Record<FaultKind, { name: string; action: string }> = {
  power: { name: 'Power cut', action: 'Cut mains power' },
  fibre: { name: 'Fibre cut', action: 'Cut fibre' },
  radio: { name: 'Radio unit failure', action: 'Fail radio unit' },
  surge: { name: 'Traffic surge', action: 'Start traffic surge' },
};

// ---------------------------------------------------------------- setup

export function createState(seed: number, startTime: number, warmUpTicks = 90): NocState {
  const sites: Record<string, SiteState> = {};
  const detectors: Record<string, DetectorState> = {};
  for (const s of SITES) {
    sites[s.id] = {
      id: s.id,
      status: 'up',
      onMains: true,
      battery: 100,
      dataMbps: 0,
      expectedMbps: 0,
      voiceErl: 0,
      ussdPerMin: 0,
      latencyMs: 30,
      z: 0,
      anomaly: false,
      technicianDueTick: null,
      history: [],
    };
    detectors[s.id] = createDetector(1);
  }
  let state: NocState = {
    tick: 0,
    simTime: startTime - warmUpTicks * TICK_MS,
    seed,
    nextId: 1,
    sites,
    detectors,
    faults: [],
    alarms: [],
    national: [],
  };
  for (let i = 0; i < warmUpTicks; i++) state = step(state, { randomFaults: false });
  return state;
}

// ---------------------------------------------------------------- faults

function ringNeighbours(site: Site, count: number, fibreOnly: boolean): string[] {
  const sameRing = SITES.filter((s) => s.ring === site.ring && (!fibreOnly || s.backhaul === 'fibre'));
  const start = sameRing.findIndex((s) => s.id === site.id);
  const ids: string[] = [];
  for (let i = start; i >= 0 && i < sameRing.length && ids.length < count; i++) {
    ids.push(sameRing[i].id);
  }
  return ids.length ? ids : [site.id];
}

export function makeFault(
  kind: FaultKind,
  site: Site,
  tick: number,
  id: number,
  options: { duration: number; spread: number; manual: boolean },
): Fault {
  let siteIds = [site.id];
  let label = `${FAULT_INFO[kind].name} at ${site.name}`;
  if (kind === 'power' && options.spread > 1) {
    siteIds = ringNeighbours(site, options.spread, false);
    label = `ZESA load-shedding: ${site.province}`;
  }
  if (kind === 'fibre') {
    siteIds = site.backhaul === 'fibre' ? ringNeighbours(site, options.spread, true) : [site.id];
    label = `Fibre cut on ${RINGS[site.ring as RingId]}`;
  }
  return { id, kind, siteIds, startedAt: tick, endsAt: tick + options.duration, label, manual: options.manual };
}

function maybeRandomFault(state: NocState, rng: Rng): Fault | null {
  const active = state.faults.filter((f) => !f.manual).length;
  if (active >= MAX_RANDOM_FAULTS) return null;
  const roll = rng.next();
  const busy = new Set(state.faults.flatMap((f) => f.siteIds));
  const free = SITES.filter((s) => !busy.has(s.id));
  if (!free.length) return null;
  const site = rng.pick(free);
  const id = state.nextId;
  if (roll < 0.01) return makeFault('power', site, state.tick, id, { duration: rng.int(45, 120), spread: rng.int(1, 3), manual: false });
  if (roll < 0.014) return makeFault('fibre', site, state.tick, id, { duration: rng.int(20, 50), spread: rng.int(1, 3), manual: false });
  if (roll < 0.019) return makeFault('radio', site, state.tick, id, { duration: rng.int(30, 70), spread: 1, manual: false });
  if (roll < 0.023) return makeFault('surge', site, state.tick, id, { duration: rng.int(15, 35), spread: 1, manual: false });
  return null;
}

// ---------------------------------------------------------------- step

export interface StepOptions {
  randomFaults?: boolean;
}

export function step(prev: NocState, options: StepOptions = {}): NocState {
  const rng = new Rng(prev.seed);
  const tick = prev.tick + 1;
  const simTime = prev.simTime + TICK_MS;
  const hour = hourOf(simTime);
  let nextId = prev.nextId;

  // 1. Faults: technicians, expiry, new random faults
  let faults = prev.faults
    .map((f) => ({
      ...f,
      siteIds: f.siteIds.filter((id) => {
        const due = prev.sites[id].technicianDueTick;
        return !(due !== null && due <= tick);
      }),
    }))
    .filter((f) => f.endsAt > tick && f.siteIds.length > 0);

  if (options.randomFaults !== false) {
    const fault = maybeRandomFault({ ...prev, faults, tick, nextId }, rng);
    if (fault) {
      faults = [...faults, fault];
      nextId++;
    }
  }

  // 2. Sites
  const sites: Record<string, SiteState> = {};
  const detectors: Record<string, DetectorState> = {};
  for (const site of SITES) {
    const before = prev.sites[site.id];
    const mine = faults.filter((f) => f.siteIds.includes(site.id));
    const has = (k: FaultKind) => mine.some((f) => f.kind === k);

    const onMains = !has('power');
    const battery = onMains
      ? Math.min(100, before.battery + BATTERY_CHARGE)
      : Math.max(0, before.battery - BATTERY_DRAIN);
    const down = has('fibre') || (!onMains && battery <= 0);

    let factor = 1;
    if (has('radio')) factor *= 0.28;
    if (has('surge')) factor *= 2.4;

    const profile = dataProfile(hour);
    const baseline = site.peakMbps * profile;
    const dataMbps = down ? 0 : Math.max(0, baseline * factor * (1 + rng.gaussian(0.05)));

    let detector = prev.detectors[site.id];
    let z = 0;
    let anomaly = false;
    let sdRatio = Math.max(Math.sqrt(detector.variance), 0.035);
    if (!down) {
      const reading = updateDetector(detector, dataMbps / baseline);
      detector = reading.state;
      z = reading.z;
      anomaly = reading.anomaly;
      sdRatio = reading.sd;
    }
    const expectedMbps = detector.mean * baseline;
    const spread = 3.5 * sdRatio * baseline;

    let latencyMs = 28 + Math.abs(rng.gaussian(4));
    if (has('radio')) latencyMs += 45;
    if (has('surge')) latencyMs += rng.between(140, 230);

    const status: SiteStatus = down ? 'down' : anomaly || has('radio') || has('surge') || !onMains ? 'degraded' : 'up';

    const technicianDueTick =
      before.technicianDueTick !== null && before.technicianDueTick > tick && mine.length > 0 ? before.technicianDueTick : null;

    const history = [
      ...before.history,
      { t: simTime, data: Math.round(dataMbps), expected: Math.round(expectedMbps), band: [Math.max(0, Math.round(expectedMbps - spread)), Math.round(expectedMbps + spread)] as [number, number] },
    ].slice(-SITE_HISTORY);

    sites[site.id] = {
      id: site.id,
      status,
      onMains,
      battery,
      dataMbps,
      expectedMbps,
      voiceErl: down ? 0 : Math.round((site.peakMbps / 8) * voiceProfile(hour) * (1 + rng.gaussian(0.05))),
      ussdPerMin: down ? 0 : Math.round((site.peakMbps / 2.2) * ussdProfile(hour) * (1 + rng.gaussian(0.06))),
      latencyMs: down ? 0 : latencyMs,
      z,
      anomaly,
      technicianDueTick,
      history,
    };
    detectors[site.id] = detector;
  }

  // 3. Alarms
  const { alarms, nextId: idAfterAlarms } = reconcileAlarms(prev.alarms, sites, faults, simTime, nextId);
  nextId = idAfterAlarms;

  // 4. National totals
  let data = 0;
  let expected = 0;
  let variance = 0;
  let ussd = 0;
  for (const site of SITES) {
    const s = sites[site.id];
    const last = s.history[s.history.length - 1];
    data += s.dataMbps;
    expected += s.expectedMbps;
    variance += ((last.band[1] - last.expected) / 3.5) ** 2;
    ussd += s.ussdPerMin;
  }
  const sd = Math.sqrt(variance);
  const national = [
    ...prev.national,
    {
      t: simTime,
      dataGbps: +(data / 1000).toFixed(2),
      expectedGbps: +(expected / 1000).toFixed(2),
      band: [+((expected - 4 * sd) / 1000).toFixed(2), +((expected + 4 * sd) / 1000).toFixed(2)] as [number, number],
      ussdK: +(ussd / 1000).toFixed(1),
    },
  ].slice(-NATIONAL_HISTORY);

  return { tick, simTime, seed: rng.seed, nextId, sites, detectors, faults, alarms, national };
}

// ---------------------------------------------------------------- alarms

interface DesiredAlarm {
  key: string;
  siteId: string;
  severity: Severity;
  source: 'AI' | 'Rule';
  title: string;
  detail: string;
}

function desiredAlarms(sites: Record<string, SiteState>, faults: Fault[]): DesiredAlarm[] {
  const out: DesiredAlarm[] = [];
  for (const site of SITES) {
    const s = sites[site.id];
    const mine = faults.filter((f) => f.siteIds.includes(site.id));
    const fibre = mine.find((f) => f.kind === 'fibre');

    if (s.status === 'down') {
      out.push({
        key: `${site.id}:down`,
        siteId: site.id,
        severity: 'critical',
        source: 'Rule',
        title: 'Site off air',
        detail: fibre
          ? `Lost contact over the fibre backhaul (${fibre.label.toLowerCase()}). Subscribers in ${site.name} have no service.`
          : `Mains power is off and the backup batteries are flat. Subscribers in ${site.name} have no service.`,
      });
      continue;
    }
    if (!s.onMains) {
      const minutesLeft = Math.ceil(s.battery / BATTERY_DRAIN);
      out.push({
        key: `${site.id}:mains`,
        siteId: site.id,
        severity: s.battery < 35 ? 'major' : 'minor',
        source: 'Rule',
        title: 'Mains power lost, running on batteries',
        detail: `Battery at ${Math.round(s.battery)}%, about ${minutesLeft} min until the site goes off air.`,
      });
    }
    if (s.anomaly) {
      const { title, hint } = describeAnomaly(s.dataMbps, s.expectedMbps, s.z);
      out.push({
        key: `${site.id}:ai`,
        siteId: site.id,
        severity: 'major',
        source: 'AI',
        title,
        detail: `${hint} Now ${Math.round(s.dataMbps)} Mbps against a learned normal of ${Math.round(s.expectedMbps)} Mbps (z = ${s.z.toFixed(1)}).`,
      });
    }
    if (s.latencyMs > 150) {
      out.push({
        key: `${site.id}:latency`,
        siteId: site.id,
        severity: 'major',
        source: 'Rule',
        title: 'High latency',
        detail: `Round-trip time is ${Math.round(s.latencyMs)} ms (normal is under 60 ms). Users will notice slow browsing and dropped calls.`,
      });
    }
  }
  return out;
}

function reconcileAlarms(
  previous: Alarm[],
  sites: Record<string, SiteState>,
  faults: Fault[],
  simTime: number,
  startId: number,
): { alarms: Alarm[]; nextId: number } {
  let nextId = startId;
  const wanted = new Map(desiredAlarms(sites, faults).map((d) => [d.key, d]));
  const result: Alarm[] = [];
  const open = new Set<string>();

  for (const a of previous) {
    if (a.status === 'cleared') {
      result.push(a);
      continue;
    }
    const d = wanted.get(a.key);
    if (d) {
      result.push({ ...a, severity: d.severity, title: d.title, detail: d.detail });
      open.add(a.key);
    } else {
      result.push({ ...a, status: 'cleared', clearedAt: simTime });
    }
  }
  for (const d of wanted.values()) {
    if (!open.has(d.key)) {
      result.push({ ...d, id: nextId++, raisedAt: simTime, status: 'active' });
    }
  }
  // Keep every open alarm and the 30 most recent cleared ones
  const active = result.filter((a) => a.status !== 'cleared');
  const cleared = result.filter((a) => a.status === 'cleared').sort((a, b) => (b.clearedAt ?? 0) - (a.clearedAt ?? 0)).slice(0, 30);
  return { alarms: [...active, ...cleared], nextId };
}

// ---------------------------------------------------------------- operator actions

export function injectFault(state: NocState, kind: FaultKind, siteId: string): NocState {
  const site = SITE_BY_ID[siteId];
  if (!site) return state;
  const durations: Record<FaultKind, number> = { power: 120, fibre: 40, radio: 60, surge: 30 };
  const fault = makeFault(kind, site, state.tick, state.nextId, {
    duration: durations[kind],
    spread: 1,
    manual: true,
  });
  return { ...state, faults: [...state.faults, fault], nextId: state.nextId + 1 };
}

export function dispatchTechnician(state: NocState, siteId: string, travelTicks = 10): NocState {
  const site = state.sites[siteId];
  if (!site || site.technicianDueTick !== null) return state;
  return { ...state, sites: { ...state.sites, [siteId]: { ...site, technicianDueTick: state.tick + travelTicks } } };
}

export function acknowledgeAlarm(state: NocState, alarmId: number): NocState {
  return {
    ...state,
    alarms: state.alarms.map((a) => (a.id === alarmId && a.status === 'active' ? { ...a, status: 'acknowledged' } : a)),
  };
}

// ---------------------------------------------------------------- summaries

export function summarise(state: NocState) {
  const list = Object.values(state.sites);
  const up = list.filter((s) => s.status === 'up').length;
  const degraded = list.filter((s) => s.status === 'degraded').length;
  const down = list.filter((s) => s.status === 'down').length;
  const open = state.alarms.filter((a) => a.status !== 'cleared');
  const last = state.national[state.national.length - 1];
  return {
    up,
    degraded,
    down,
    total: list.length,
    availability: ((list.length - down) / list.length) * 100,
    openAlarms: open.length,
    critical: open.filter((a) => a.severity === 'critical').length,
    aiAlarms: open.filter((a) => a.source === 'AI').length,
    dataGbps: last?.dataGbps ?? 0,
    ussdK: last?.ussdK ?? 0,
    subscribersAffected: list
      .filter((s) => s.status === 'down')
      .reduce((sum, s) => sum + Math.round(SITE_BY_ID[s.id].peakMbps * 9.5), 0),
  };
}
