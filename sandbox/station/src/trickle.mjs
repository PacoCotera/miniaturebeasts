// The hooks of the bench Data trickle (state.mjs benchWatch, benchCompare): what the page calls each frame and after each key, as plain functions of plain data, so the Node host can call them too. No DOM, no screen.
import * as S from "./state.mjs";

// The resident Habitat shows (the Habitat's rule, as the face's screen will keep it): UI.hab.id, else the first resident the Companion does not carry, else the first.
export function habitatShown(st, sv, habId) {
  const l = st.mibis.filter((m) => !m.released), c = S.carriedIds(st, sv);
  return l.find((m) => m.id === habId) || l.find((m) => !c.includes(m.id)) || l[0] || null;
}
// Once per frame, before the Idle check: on Habitat and awake, the shown resident is watched for dt (clamped to 250 ms inside). Nothing accumulates on Idle or any other screen. Returns the result, or null.
// Only one mibi up close in rest or meet (habitat.json rules.watch): the mibi chosen there (never habitatShown's fallback when none is), at home and not carried.
export function watchFrame({ st, sv, settings, screen, idle, habId, dt, now }) {
  if (screen !== "habitat" || idle || habId == null) return null;
  const m = habitatShown(st, sv, habId); if (!m || m.id !== habId || S.isAway(st, sv, m) || S.carriedIds(st, sv).includes(m.id)) return null;
  return S.benchWatch(st, sv, m, dt, settings, now);
}
// After the Cross screen acts: with both chosen and the forecast opened (state 1 or more), the pair is compared. Returns the result, or null.
export function compareAfterKey({ st, sv, settings, cross, now }) {
  if (!cross || cross.state < 1 || cross.aId == null || cross.bId == null) return null;
  return S.benchCompare(st, sv, S.mibiById(st, cross.aId), S.mibiById(st, cross.bId), settings, now);
}
