/**
 * Online anomaly detector for one site's traffic.
 *
 * Traffic changes a lot during the day, so the detector does not compare raw traffic.
 * Instead it learns the site's normal *ratio* of traffic to the daily profile using an
 * exponentially weighted moving average (EWMA) of the mean and variance. Each new reading
 * is turned into a z-score: how many standard deviations it sits from normal.
 *
 * - |z| >= threshold for `confirmAfter` readings in a row  → anomaly is raised
 * - anomalous readings are not learned, so a fault cannot become the new "normal"
 */
export interface DetectorState {
  mean: number;
  variance: number;
  samples: number;
  streak: number;
}

export interface DetectorConfig {
  alpha: number; // learning rate of the EWMA
  threshold: number; // z-score that counts as unusual
  confirmAfter: number; // consecutive unusual readings before raising
  warmUp: number; // readings to learn from before judging
  minSd: number; // floor on the standard deviation, avoids over-sensitivity
}

export const DEFAULT_CONFIG: DetectorConfig = {
  alpha: 0.06,
  threshold: 3.5,
  confirmAfter: 2,
  warmUp: 20,
  minSd: 0.035,
};

export interface DetectorReading {
  state: DetectorState;
  z: number;
  unusual: boolean;
  anomaly: boolean;
  sd: number;
}

export function createDetector(initialMean = 1): DetectorState {
  return { mean: initialMean, variance: 0.01, samples: 0, streak: 0 };
}

export function updateDetector(
  state: DetectorState,
  value: number,
  config: DetectorConfig = DEFAULT_CONFIG,
): DetectorReading {
  const sd = Math.max(Math.sqrt(state.variance), config.minSd);
  const z = (value - state.mean) / sd;
  const warming = state.samples < config.warmUp;
  const unusual = !warming && Math.abs(z) >= config.threshold;
  const streak = unusual ? state.streak + 1 : 0;

  let { mean, variance } = state;
  if (!unusual) {
    const diff = value - mean;
    const a = warming ? Math.max(config.alpha, 1 / (state.samples + 1)) : config.alpha;
    mean = mean + a * diff;
    variance = (1 - a) * (variance + a * diff * diff);
  }

  return {
    state: { mean, variance, samples: state.samples + 1, streak },
    z,
    unusual,
    anomaly: streak >= config.confirmAfter,
    sd,
  };
}

/** Plain-language explanation of an anomaly for the alarm feed. */
export function describeAnomaly(observed: number, expected: number, z: number): { title: string; hint: string } {
  const change = expected > 0 ? Math.round(((observed - expected) / expected) * 100) : 0;
  if (z < 0) {
    return {
      title: `Data traffic ${Math.abs(change)}% below normal`,
      hint: 'Traffic dropped sharply but the site is still reachable. Possible radio unit fault, interference or a partial outage.',
    };
  }
  return {
    title: `Data traffic ${change}% above normal`,
    hint: 'Unusual surge for this time of day. Possible event crowd, congestion or a misbehaving device flooding the network.',
  };
}
