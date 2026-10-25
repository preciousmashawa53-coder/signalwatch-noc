import { useMemo, useState } from 'react';
import { AlarmFeed } from './components/AlarmFeed';
import { KpiStrip } from './components/KpiStrip';
import { NetworkMap } from './components/NetworkMap';
import { SitePanel } from './components/SitePanel';
import { TopBar } from './components/TopBar';
import { TrafficChart } from './components/TrafficChart';
import { useNoc } from './hooks/useNoc';
import { summarise } from './sim/engine';

export default function App() {
  const { state, running, setRunning, speed, setSpeed, inject, dispatch, acknowledge } = useNoc();
  const [selected, setSelected] = useState<string | null>(null);
  const summary = useMemo(() => summarise(state), [state]);

  return (
    <div className="app">
      <TopBar
        simTime={state.simTime}
        running={running}
        speed={speed}
        onToggle={() => setRunning((r) => !r)}
        onSpeed={setSpeed}
      />
      <main>
        <KpiStrip s={summary} />
        <div className="grid">
          <section className="panel map-panel" aria-labelledby="map-title">
            <header className="panel-head">
              <h2 id="map-title">Base stations</h2>
              <ul className="map-key" aria-label="Map key">
                <li>
                  <span className="dot dot-up" aria-hidden="true" />
                  Working
                </li>
                <li>
                  <span className="dot dot-degraded" aria-hidden="true" />
                  Degraded
                </li>
                <li>
                  <span className="dot dot-down" aria-hidden="true" />
                  Off air
                </li>
              </ul>
            </header>
            <NetworkMap sites={state.sites} selectedId={selected} onSelect={setSelected} />
          </section>
          <AlarmFeed alarms={state.alarms} now={state.simTime} onAcknowledge={acknowledge} onSelectSite={setSelected} />
          <TrafficChart data={state.national} />
          <SitePanel
            siteId={selected}
            sites={state.sites}
            faults={state.faults}
            tick={state.tick}
            onSelect={setSelected}
            onInject={inject}
            onDispatch={dispatch}
            onDemo={() => {
              inject('fibre', 'MUT-001');
              inject('radio', 'BYO-CBD');
              inject('surge', 'HRE-CBD');
              setSelected('MUT-001');
            }}
          />
        </div>
      </main>
      <footer className="foot">
        Simulated data for demonstration. Not connected to a real operator's network. Built by{' '}
        <a href="https://preciousmashawa.co.zw">Precious Mashawa</a>.
      </footer>
    </div>
  );
}
