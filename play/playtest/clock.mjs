// The session's clock and dice, the same in Node and in the page (the parity test injects this function's source into the page before its scripts run): page milliseconds
// (performance.now, from 1000 as the goldens' virtual clock) and the rules' wall time (Date.now and new Date(), from `epoch`), both moved only by advance(ms); and Math.random
// seeded (mulberry32, the same numbers for the same seed everywhere). Self-contained on purpose: no import, no outer name, so its source runs anywhere.
export function installClock({ seed = 1, epoch = 1792238400000, t0 = 1000 } = {}) {
  if (globalThis.__playtestClock) throw new Error("the session clock is installed once a process (or page)");
  const clock = { t: t0, wall: epoch }, RealDate = Date;
  class StationDate extends RealDate { constructor(...a) { super(...(a.length ? a : [clock.wall])); } static now() { return clock.wall; } }
  globalThis.Date = StationDate;
  globalThis.performance.now = () => clock.t;
  let a = seed >>> 0;
  Math.random = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const c = { clock, RealDate, advance: (ms) => { clock.t += ms; clock.wall += ms; return clock.t; }, now: () => clock.t };
  globalThis.__playtestClock = c;
  return c;
}
// 2026-10-17 12:00 UTC: the goldens' Station date
export const EPOCH = 1792238400000;
