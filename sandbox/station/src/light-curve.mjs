// The light of a moment (frame.json light.curve; the day-cycle scheme): the Station's seconds of the day, taken at the curve's 5-minute step, give { key, base, mix, gain, mood }.
// mix: share of each signed painting ({ day: 0.6, dusk: 0.4 }, sums to 1); gain: [r, g, b] at most 1 on top; base: the painting with the largest share (what a step-blind consumer shows); mood: the loop's name ("" on the real clock).
// key: a pure painting at gain 1 keeps its light's name ("day"); inside the day loop (09:00-16:30, 75 minutes, repeating) "@Lmm" by minutes into the loop, so every loop shares its keys; elsewhere "@HHMM". The clock is the host's; a view never reads one.
const minOf = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
const smooth = (w) => w * w * (3 - 2 * w);
export function lightOf(seconds, C) {
  const step = C.step, day = 1440, t = Math.floor((((seconds / 60) % day) + day) % day / step) * step, from = minOf(C.loop.from), to = minOf(C.loop.to), LM = C.loop.minutes;
  const inLoop = t >= from && t <= to, at = inLoop ? (t - from) % LM : t;
  const anchors = inLoop ? C.loop.anchors : C.real.map(([h, mix, g]) => [minOf(h), mix, g]);
  let i = anchors.findIndex((a, k) => k + 1 < anchors.length && at >= a[0] && at < anchors[k + 1][0]); if (i < 0) i = anchors.length - 2;
  const a = anchors[i], b = anchors[i + 1], w = a[0] === b[0] ? 0 : smooth((at - a[0]) / (b[0] - a[0])), mix = {};
  for (const k of new Set([...Object.keys(a[1]), ...Object.keys(b[1])])) { const v = (a[1][k] ?? 0) * (1 - w) + (b[1][k] ?? 0) * w; if (v > 1e-9) mix[k] = v; }
  const ga = C.gains[a[2]], gb = C.gains[b[2]], gain = ga.map((x, c) => x * (1 - w) + gb[c] * w);
  const base = Object.keys(mix).sort((p, q) => mix[q] - mix[p] || p.localeCompare(q))[0], pure = Object.keys(mix).length === 1 && gain.every((x) => Math.abs(x - 1) < 1e-9);
  const p2 = (n) => String(n).padStart(2, "0");
  const key = pure ? base : inLoop ? "@L" + p2(at) : "@" + p2(Math.floor(t / 60)) + p2(t % 60);
  const mood = inLoop ? (w < 0.5 ? a[3] : b[3]) : "";
  return { key, base, mix, gain, mood };
}

// The step of a key under a curve: the named lights are themselves; "@Lmm" and "@HHMM" are found by walking the day's 288 steps (a loop key's first match: every loop is the same). null for an unknown key.
const STEP_CACHE = new WeakMap();
export function stepOfKey(key, C) {
  let m = STEP_CACHE.get(C); if (!m) { m = new Map(); for (let i = 0; i < 1440 / C.step; i++) { const L = lightOf(i * C.step * 60, C); if (!m.has(L.key)) m.set(L.key, L); } STEP_CACHE.set(C, m); }
  return m.get(key) ?? null;
}
