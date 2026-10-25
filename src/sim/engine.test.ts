import { describe, expect, it } from 'vitest';
import { acknowledgeAlarm, createState, dispatchTechnician, injectFault, step, summarise, type NocState } from './engine';
import { dataProfile } from './traffic';

const START = new Date(2026, 9, 25, 19, 0).getTime();

function run(state: NocState, ticks: number): NocState {
  let s = state;
  for (let i = 0; i < ticks; i++) s = step(s, { randomFaults: false });
  return s;
}

describe('traffic profile', () => {
  it('peaks in the evening and is quiet overnight', () => {
    expect(dataProfile(21)).toBeGreaterThan(0.9);
    expect(dataProfile(4)).toBeLessThan(0.35);
  });
});

describe('network simulation', () => {
  it('starts healthy after warm-up', () => {
    const s = createState(7, START);
    const sum = summarise(s);
    expect(sum.down).toBe(0);
    expect(sum.availability).toBe(100);
    expect(s.alarms.filter((a) => a.status !== 'cleared')).toHaveLength(0);
  });

  it('takes a site off air when a fibre cut happens', () => {
    let s = createState(7, START);
    s = injectFault(s, 'fibre', 'MUT-001');
    s = run(s, 1);
    expect(s.sites['MUT-001'].status).toBe('down');
    const alarm = s.alarms.find((a) => a.key === 'MUT-001:down');
    expect(alarm?.severity).toBe('critical');
    expect(summarise(s).availability).toBeLessThan(100);
  });

  it('drains batteries during a power cut and then goes off air', () => {
    let s = createState(7, START);
    s = injectFault(s, 'power', 'GWE-001');
    s = run(s, 5);
    expect(s.sites['GWE-001'].onMains).toBe(false);
    expect(s.sites['GWE-001'].battery).toBeLessThan(100);
    expect(s.alarms.some((a) => a.key === 'GWE-001:mains' && a.status === 'active')).toBe(true);
    s = run(s, 60);
    expect(s.sites['GWE-001'].status).toBe('down');
  });

  it('lets the AI catch a radio failure that rules would miss', () => {
    let s = createState(7, START);
    s = injectFault(s, 'radio', 'BYO-CBD');
    s = run(s, 3);
    const ai = s.alarms.find((a) => a.key === 'BYO-CBD:ai');
    expect(ai?.source).toBe('AI');
    expect(ai?.title).toMatch(/below normal/);
  });

  it('clears the fault when a technician arrives', () => {
    let s = createState(7, START);
    s = injectFault(s, 'fibre', 'HWG-001');
    s = run(s, 1);
    s = dispatchTechnician(s, 'HWG-001', 3);
    s = run(s, 4);
    expect(s.sites['HWG-001'].status).not.toBe('down');
    expect(s.alarms.find((a) => a.key === 'HWG-001:down')?.status).toBe('cleared');
  });

  it('lets an operator acknowledge an alarm', () => {
    let s = createState(7, START);
    s = injectFault(s, 'fibre', 'KRB-001');
    s = run(s, 1);
    const alarm = s.alarms.find((a) => a.key === 'KRB-001:down')!;
    s = acknowledgeAlarm(s, alarm.id);
    expect(s.alarms.find((a) => a.id === alarm.id)?.status).toBe('acknowledged');
  });

  it('is repeatable for the same seed', () => {
    const a = run(createState(99, START), 50);
    const b = run(createState(99, START), 50);
    expect(a.national[a.national.length - 1]).toEqual(b.national[b.national.length - 1]);
  });
});
