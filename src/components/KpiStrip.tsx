import { compact } from '../lib/format';
import type { summarise } from '../sim/engine';

type Summary = ReturnType<typeof summarise>;

export function KpiStrip({ s }: { s: Summary }) {
  const availClass = s.availability >= 99 ? 'good' : s.availability >= 95 ? 'warn' : 'bad';
  return (
    <section className="kpis" aria-label="Network summary">
      <div className="kpi kpi-hero">
        <p className="kpi-label">Network availability</p>
        <p className={`kpi-value ${availClass}`}>
          {s.availability.toFixed(1)}
          <small>%</small>
        </p>
        <p className="kpi-note">
          {s.down === 0 ? 'All sites on air' : `About ${compact(s.subscribersAffected)} subscribers without service`}
        </p>
      </div>
      <div className="kpi">
        <p className="kpi-label">Sites</p>
        <ul className="site-counts">
          <li>
            <span className="dot dot-up" aria-hidden="true" />
            <strong>{s.up}</strong> working
          </li>
          <li>
            <span className="dot dot-degraded" aria-hidden="true" />
            <strong>{s.degraded}</strong> degraded
          </li>
          <li>
            <span className="dot dot-down" aria-hidden="true" />
            <strong>{s.down}</strong> off air
          </li>
        </ul>
      </div>
      <div className="kpi">
        <p className="kpi-label">Data traffic now</p>
        <p className="kpi-value">
          {s.dataGbps.toFixed(1)}
          <small>Gbps</small>
        </p>
      </div>
      <div className="kpi">
        <p className="kpi-label">USSD sessions</p>
        <p className="kpi-value">
          {s.ussdK.toFixed(1)}
          <small>k/min</small>
        </p>
      </div>
      <div className="kpi">
        <p className="kpi-label">Open alarms</p>
        <p className={`kpi-value ${s.critical > 0 ? 'bad' : ''}`}>{s.openAlarms}</p>
        <p className="kpi-note">{s.aiAlarms > 0 ? `${s.aiAlarms} found by AI` : `${s.critical} critical`}</p>
      </div>
    </section>
  );
}
