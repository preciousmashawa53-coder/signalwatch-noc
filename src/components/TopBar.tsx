import type { Speed } from '../hooks/useNoc';
import { clock, longDate } from '../lib/format';

interface Props {
  simTime: number;
  running: boolean;
  speed: Speed;
  onToggle: () => void;
  onSpeed: (s: Speed) => void;
}

const SPEEDS: Speed[] = [1, 4, 16];

export function TopBar({ simTime, running, speed, onToggle, onSpeed }: Props) {
  return (
    <header className="topbar">
      <div className="brand">
        <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
          <path d="M16 9v16M11 25h10" stroke="var(--up)" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M10.5 12.5a7.5 7.5 0 0 1 11 0M7.5 9.5a11.5 11.5 0 0 1 17 0" fill="none" stroke="var(--up)" strokeWidth="2" strokeLinecap="round" />
          <circle cx="16" cy="15.5" r="2.2" fill="var(--ai)" />
        </svg>
        <div>
          <h1>SignalWatch</h1>
          <p>Network operations centre for a Zimbabwean mobile network</p>
        </div>
      </div>

      <div className="clock" aria-live="off">
        <span className={running ? 'live-dot' : 'live-dot paused'} aria-hidden="true" />
        <span className="clock-time">{clock(simTime)}</span>
        <span className="clock-date">{longDate(simTime)}</span>
      </div>

      <div className="controls">
        <button className="btn btn-ghost" onClick={onToggle} aria-pressed={!running}>
          {running ? 'Pause' : 'Resume'}
        </button>
        <div className="speed" role="radiogroup" aria-label="Simulation speed">
          {SPEEDS.map((s) => (
            <button key={s} role="radio" aria-checked={speed === s} onClick={() => onSpeed(s)}>
              {s === 1 ? '1 min/s' : `${s}×`}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
