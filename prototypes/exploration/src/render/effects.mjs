// The effects' lifetimes: what each frame drops from the effects (FX) once it has played out. The effects and the time in; no page state, no drawing.

const FLOATS_MAX = 20;   // the oldest floating numbers go first
const LIFE_MS = { rings: 1000, strikes: 600, bolts: 400, reveal: 1200, dig: 900 };

// burstMs: how long a burst plays; pulseMs: how long the Call's pulse is kept.
export function expireEffects(FX, now, burstMs, pulseMs) {
  if (FX.floats.length > FLOATS_MAX) FX.floats.splice(0, FX.floats.length - FLOATS_MAX);
  FX.bursts = FX.bursts.filter(b => now - b.at < burstMs);
  for (const k of ['rings', 'strikes', 'bolts']) FX[k] = FX[k].filter(e => now - e.at < LIFE_MS[k]);
  if (FX.pulse && now - FX.pulse.at > pulseMs) FX.pulse = null;
  for (const k of ['reveal', 'dig']) if (FX[k] && now - FX[k].at > LIFE_MS[k]) FX[k] = null;
}
