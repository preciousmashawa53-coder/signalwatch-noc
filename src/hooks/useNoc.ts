import { useCallback, useEffect, useState } from 'react';
import {
  acknowledgeAlarm,
  createState,
  dispatchTechnician,
  injectFault,
  step,
  type FaultKind,
  type NocState,
} from '../sim/engine';

export type Speed = 1 | 4 | 16;

function startTime(): number {
  // Start the demo at 19:00 today, heading into the evening data peak
  const d = new Date();
  d.setHours(19, 0, 0, 0);
  return d.getTime();
}

export function useNoc() {
  const [state, setState] = useState<NocState>(() => createState(Date.now() % 100_000, startTime()));
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState<Speed>(1);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setState((s) => step(s)), 1000 / speed);
    return () => window.clearInterval(id);
  }, [running, speed]);

  const inject = useCallback((kind: FaultKind, siteId: string) => setState((s) => injectFault(s, kind, siteId)), []);
  const dispatch = useCallback((siteId: string) => setState((s) => dispatchTechnician(s, siteId)), []);
  const acknowledge = useCallback((alarmId: number) => setState((s) => acknowledgeAlarm(s, alarmId)), []);

  return { state, running, setRunning, speed, setSpeed, inject, dispatch, acknowledge };
}
