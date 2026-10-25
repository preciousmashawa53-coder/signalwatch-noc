import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

// Recharts needs ResizeObserver, which jsdom does not provide
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('SignalWatch dashboard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('starts with a healthy network', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'SignalWatch' })).toBeInTheDocument();
    expect(screen.getByText('All sites on air')).toBeInTheDocument();
    expect(screen.getByText(/No open alarms/)).toBeInTheDocument();
  });

  it('raises rule-based and AI alarms when the outage demo runs', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Run the outage demo' }));
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.getAllByText('Site off air').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Found by AI').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { level: 2, name: 'Site details' })).toBeInTheDocument();
    expect(screen.getAllByText('Mutare').length).toBeGreaterThan(0);
  });

  it('lets the operator pause the live feed', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(screen.getByRole('button', { name: 'Resume' })).toBeInTheDocument();
  });
});
