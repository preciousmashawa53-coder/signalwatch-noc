/**
 * Daily traffic shape for a Zimbabwean mobile network, as a fraction of the busy hour.
 * Data peaks in the evening (20:00–22:00), drops overnight and has a smaller lunchtime bump.
 */
function bell(x: number, centre: number, width: number): number {
  return Math.exp(-((x - centre) ** 2) / (2 * width ** 2));
}

export function dataProfile(hour: number): number {
  const h = ((hour % 24) + 24) % 24;
  const evening = Math.max(bell(h, 21, 2.6), bell(h - 24, 21, 2.6), bell(h + 24, 21, 2.6));
  const value = 0.22 + 0.3 * bell(h, 12.5, 3.2) + 0.78 * evening;
  return Math.min(1, value);
}

/** Voice traffic peaks during the working day. */
export function voiceProfile(hour: number): number {
  const h = ((hour % 24) + 24) % 24;
  return Math.min(1, 0.1 + 0.85 * bell(h, 11, 3.5) + 0.45 * bell(h, 18, 2));
}

/** USSD sessions (balance checks, bundles, mobile money) peak in the morning and at month end. */
export function ussdProfile(hour: number): number {
  const h = ((hour % 24) + 24) % 24;
  return Math.min(1, 0.08 + 0.9 * bell(h, 9, 2.5) + 0.6 * bell(h, 17.5, 2.5));
}

export function hourOf(simTime: number): number {
  const d = new Date(simTime);
  return d.getHours() + d.getMinutes() / 60;
}
