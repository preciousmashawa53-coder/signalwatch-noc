import { describe, expect, it } from 'vitest';
import { createDetector, describeAnomaly, updateDetector, type DetectorState } from './anomaly';
import { Rng } from './random';

function learn(values: number[]): DetectorState {
  let state = createDetector(1);
  for (const v of values) state = updateDetector(state, v).state;
  return state;
}

describe('anomaly detector', () => {
  const rng = new Rng(42);
  const normal = Array.from({ length: 80 }, () => 1 + rng.gaussian(0.05));

  it('learns the normal level of a noisy signal', () => {
    const state = learn(normal);
    expect(state.mean).toBeGreaterThan(0.95);
    expect(state.mean).toBeLessThan(1.05);
  });

  it('does not raise anomalies on normal traffic', () => {
    let state = createDetector(1);
    let raised = 0;
    for (const v of normal) {
      const r = updateDetector(state, v);
      state = r.state;
      if (r.anomaly) raised++;
    }
    expect(raised).toBe(0);
  });

  it('needs two unusual readings in a row before raising', () => {
    const state = learn(normal);
    const first = updateDetector(state, 0.3);
    expect(first.unusual).toBe(true);
    expect(first.anomaly).toBe(false);
    const second = updateDetector(first.state, 0.3);
    expect(second.anomaly).toBe(true);
    expect(second.z).toBeLessThan(-3.5);
  });

  it('does not learn from anomalous readings', () => {
    const state = learn(normal);
    let s = state;
    for (let i = 0; i < 10; i++) s = updateDetector(s, 0.3).state;
    expect(s.mean).toBeCloseTo(state.mean, 5);
  });

  it('stays quiet while warming up', () => {
    const r = updateDetector(createDetector(1), 5);
    expect(r.unusual).toBe(false);
  });

  it('explains drops and surges in plain language', () => {
    expect(describeAnomaly(30, 100, -8).title).toBe('Data traffic 70% below normal');
    expect(describeAnomaly(250, 100, 9).title).toBe('Data traffic 150% above normal');
  });
});
