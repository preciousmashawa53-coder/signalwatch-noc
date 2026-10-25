import { Area, ComposedChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { RINGS, SITES, SITE_BY_ID } from '../data/sites';
import { compact } from '../lib/format';
import { FAULT_INFO, type Fault, type FaultKind, type SiteState } from '../sim/engine';

const STATUS_TEXT = { up: 'Working normally', degraded: 'Degraded', down: 'Off air' } as const;
const KINDS: FaultKind[] = ['power', 'fibre', 'radio', 'surge'];

interface Props {
  siteId: string | null;
  sites: Record<string, SiteState>;
  faults: Fault[];
  tick: number;
  onSelect: (id: string | null) => void;
  onInject: (kind: FaultKind, siteId: string) => void;
  onDispatch: (siteId: string) => void;
  onDemo: () => void;
}

export function SitePanel({ siteId, sites, faults, tick, onSelect, onInject, onDispatch, onDemo }: Props) {
  const site = siteId ? SITE_BY_ID[siteId] : null;
  const s = siteId ? sites[siteId] : null;
  const myFaults = siteId ? faults.filter((f) => f.siteIds.includes(siteId)) : [];

  return (
    <section className="panel site-panel" aria-labelledby="site-title">
      <header className="panel-head">
        <h2 id="site-title">Site details</h2>
        <label className="site-select">
          <span className="visually-hidden">Choose a site</span>
          <select value={siteId ?? ''} onChange={(e) => onSelect(e.target.value || null)}>
            <option value="">Choose a site</option>
            {[...SITES]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
          </select>
        </label>
      </header>

      {!site || !s ? (
        <div className="site-empty">
          <p>Click a tower on the map to see its live traffic, power and alarms.</p>
          <p>Then use the fault simulator to break something and watch the network, the alarms and the AI respond.</p>
          <div>
            <button className="btn" onClick={onDemo}>
              Run the outage demo
            </button>
          </div>
          <p className="demo-note">Cuts fibre in Mutare, fails a radio unit in Bulawayo and starts a traffic surge in Harare.</p>
        </div>
      ) : (
        <>
          <div className="site-heading">
            <div>
              <p className="site-name">{site.name}</p>
              <p className="site-meta">
                {site.id}, {site.province}. {RINGS[site.ring]}, {site.backhaul === 'fibre' ? 'fibre' : 'microwave'} backhaul.
              </p>
            </div>
            <span className={`status status-${s.status}`}>{STATUS_TEXT[s.status]}</span>
          </div>

          <dl className="metrics">
            <div>
              <dt>Data traffic</dt>
              <dd>
                {Math.round(s.dataMbps)} <small>Mbps</small>
              </dd>
              <dd className="metric-note">Normal {Math.round(s.expectedMbps)} Mbps</dd>
            </div>
            <div>
              <dt>USSD sessions</dt>
              <dd>
                {compact(s.ussdPerMin)} <small>/min</small>
              </dd>
            </div>
            <div>
              <dt>Voice load</dt>
              <dd>
                {s.voiceErl} <small>Erlang</small>
              </dd>
            </div>
            <div>
              <dt>Latency</dt>
              <dd className={s.latencyMs > 150 ? 'bad' : undefined}>
                {s.status === 'down' ? 'n/a' : Math.round(s.latencyMs)} {s.status !== 'down' && <small>ms</small>}
              </dd>
            </div>
            <div className="metric-wide">
              <dt>Power</dt>
              <dd>{s.onMains ? 'Mains (ZESA)' : 'Batteries'}</dd>
              <dd className="battery" aria-label={`Battery ${Math.round(s.battery)} percent`}>
                <span
                  className={s.battery < 35 ? 'battery-fill low' : 'battery-fill'}
                  style={{ width: `${s.battery}%` }}
                />
              </dd>
              <dd className="metric-note">Battery {Math.round(s.battery)}%</dd>
            </div>
          </dl>

          <div className="mini-chart" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={s.history} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                <YAxis hide domain={[0, 'auto']} />
                <Area dataKey="band" stroke="none" fill="var(--ai)" fillOpacity={0.16} isAnimationActive={false} />
                <Line dataKey="data" stroke={s.status === 'down' ? 'var(--down)' : 'var(--up)'} dot={false} strokeWidth={1.8} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {myFaults.length > 0 && (
            <div className="faults">
              <p className="faults-title">Active faults</p>
              <ul>
                {myFaults.map((f) => (
                  <li key={f.id}>
                    {f.label}
                    {f.manual ? ' (simulated by you)' : ''}
                  </li>
                ))}
              </ul>
              {s.technicianDueTick !== null ? (
                <p className="tech">Technician on the way, arriving in {s.technicianDueTick - tick} min.</p>
              ) : (
                <button className="btn" onClick={() => onDispatch(site.id)}>
                  Dispatch technician
                </button>
              )}
            </div>
          )}

          <div className="simulator">
            <p className="sim-title">Fault simulator</p>
            <p className="sim-sub">Break this site on purpose to test monitoring.</p>
            <div className="sim-buttons">
              {KINDS.map((k) => (
                <button
                  key={k}
                  className={`btn btn-ghost sim-${k}`}
                  disabled={k === 'fibre' && site.backhaul !== 'fibre'}
                  title={k === 'fibre' && site.backhaul !== 'fibre' ? 'This site uses a microwave link, not fibre' : undefined}
                  onClick={() => onInject(k, site.id)}
                >
                  {FAULT_INFO[k].action}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
