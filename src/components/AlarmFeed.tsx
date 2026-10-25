import { useState } from 'react';
import { SITE_BY_ID } from '../data/sites';
import { minutesAgo, clock } from '../lib/format';
import type { Alarm } from '../sim/engine';

const RANK = { critical: 0, major: 1, minor: 2 } as const;
const SEVERITY_LABEL = { critical: 'Critical', major: 'Major', minor: 'Minor' } as const;

interface Props {
  alarms: Alarm[];
  now: number;
  onAcknowledge: (id: number) => void;
  onSelectSite: (id: string) => void;
}

export function AlarmFeed({ alarms, now, onAcknowledge, onSelectSite }: Props) {
  const [view, setView] = useState<'open' | 'cleared'>('open');
  const open = alarms
    .filter((a) => a.status !== 'cleared')
    .sort((a, b) => RANK[a.severity] - RANK[b.severity] || b.raisedAt - a.raisedAt);
  const cleared = alarms.filter((a) => a.status === 'cleared');
  const list = view === 'open' ? open : cleared;

  return (
    <section className="panel alarms" aria-labelledby="alarms-title">
      <header className="panel-head">
        <h2 id="alarms-title">Alarms</h2>
        <div className="tabs" role="tablist" aria-label="Alarm list">
          <button role="tab" aria-selected={view === 'open'} onClick={() => setView('open')}>
            Open <span className="count">{open.length}</span>
          </button>
          <button role="tab" aria-selected={view === 'cleared'} onClick={() => setView('cleared')}>
            Cleared <span className="count">{cleared.length}</span>
          </button>
        </div>
      </header>

      <ol className="alarm-list" aria-live="polite">
        {list.length === 0 && (
          <li className="alarm-empty">
            {view === 'open'
              ? 'No open alarms. Every site is working normally. Use the fault simulator to test how the network reacts.'
              : 'Cleared alarms will appear here once faults are fixed.'}
          </li>
        )}
        {list.map((a) => {
          const site = SITE_BY_ID[a.siteId];
          return (
            <li key={a.id} className={`alarm alarm-${a.severity} alarm-${a.status}`}>
              <div className="alarm-top">
                <span className={`sev sev-${a.severity}`}>{SEVERITY_LABEL[a.severity]}</span>
                {a.source === 'AI' && (
                  <span className="ai-badge" title="Found by the anomaly detector, not by a fixed rule">
                    <svg viewBox="0 0 16 16" aria-hidden="true">
                      <path d="M8 1.5l1.6 4.9 4.9 1.6-4.9 1.6L8 14.5l-1.6-4.9L1.5 8l4.9-1.6z" />
                    </svg>
                    Found by AI
                  </span>
                )}
                <time className="alarm-time" dateTime={new Date(a.raisedAt).toISOString()}>
                  {a.status === 'cleared' && a.clearedAt ? `Cleared ${clock(a.clearedAt)}` : minutesAgo(now, a.raisedAt)}
                </time>
              </div>
              <button className="alarm-site" onClick={() => onSelectSite(a.siteId)}>
                {site.name}
              </button>
              <p className="alarm-title">{a.title}</p>
              <p className="alarm-detail">{a.detail}</p>
              {a.status === 'active' && (
                <button className="btn btn-small" onClick={() => onAcknowledge(a.id)}>
                  Acknowledge
                </button>
              )}
              {a.status === 'acknowledged' && <p className="alarm-acked">Acknowledged, engineer aware</p>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
