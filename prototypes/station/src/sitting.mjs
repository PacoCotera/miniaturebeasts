// The sitting (M6; the-portrait.md §1, §2, §6): a held right to one portrait, earned by research, spent in a ceremony on Habitat, waited out in a crate at the
// bay, opened to the mibi in a gilt frame. Every rule is a state transition on the save; no drawing, no screen. A timer stores its start and its rule, never a
// countdown (station-build.md §7). Nothing here costs Energy, Data or Essence: a sitting is never on sale (the-portrait.md §1).
//
// The save (all optional in an older save; normalize fills them):
//   st.sitting        null, or the held sitting { source: "moment" | "welcome" | "dev", key, at }  (one slot, one frame)
//   st.moments        the ledger of research moments already paid, so none pays twice: { "<key>": at }
//   st.welcomeGiven   the welcome sitting is given once per player
//   st.sittingCrates  the crates of sittings begun: { id, mibiId, pose, place, start, source, painted, opened }
//   m.habits          the habits the player has watched the mibi do (ids); m.walked the places it walked to; m.portrait null | { state, pose, place, crate, start, at }
//   st.face           the species' face in the book: { "<species>": mibiId }   (library.mjs)
import { frameOf } from "./genome.mjs";
import { speciesOf, mibiById, bayCrates, docked, logEv, plural, clamp, DEFAULT_SETTINGS } from "./state.mjs";
import { fieldGuide } from "./library.mjs";

// A sitting takes a few hours (three for testing under the developer toggle with every timer): longer than a bud, short enough to arrive the same day.
export const SITTING_WAIT_MS = { hours: 3 * 3600000, minute: 60000, now: 0 };
export const DEEP_LINE = 4;   // generations of the player's own crosses in a mibi's recorded tree; "the number is tuned with the cross" (the-portrait.md §1)
export const sittingWaitMs = (settings = DEFAULT_SETTINGS) => SITTING_WAIT_MS[settings.sittingWait ?? "hours"] ?? SITTING_WAIT_MS.hours;

// --- what a mibi has done: habits watched, places been -------------------------------------------------------------------------
export function recordHabit(st, m, habit) {
  if (!m || !habit) return { ok: false };
  if (!Array.isArray(m.habits)) m.habits = []; if (m.habits.includes(habit)) return { ok: false, again: true };
  m.habits.push(habit); return { ok: true };
}
export function recordWalk(st, m, place) {
  if (!m || !place) return { ok: false };
  if (!Array.isArray(m.walked)) m.walked = []; if (m.walked.includes(place)) return { ok: false, again: true };
  m.walked.push(place); return { ok: true };
}
// The places a mibi has been: where its pod came from, and every place it walked to.
export const placesOf = (m) => [...new Set([m.from?.g, ...(m.walked || []), ...(Array.isArray(m.places) ? m.places : [])].filter(Boolean))];
export const habitsOf = (m) => (Array.isArray(m.habits) ? m.habits : []);

// --- the held sitting ----------------------------------------------------------------------------------------------------------
export const sittingHeld = (st) => !!st.sitting;
// Grant one: refused while one is held ("a sitting earned while one is held is not given"), and a moment pays once. A moment that passes while one is held is
// spent (its key stays in the ledger) and says so, so the Station can have warned.
export function grantSitting(st, source, key, now = Date.now()) {
  if (key && st.moments[key]) return { ok: false, again: true };
  if (key) st.moments[key] = now;
  if (st.sitting) { logEv(st, "A sitting was earned (" + key + ") while one is held · not given"); return { ok: false, lost: true, msg: "A sitting is held · use it first" }; }
  st.sitting = { source, key: key || null, at: now }; logEv(st, "A sitting is held · " + (key || source));
  return { ok: true, sitting: st.sitting };
}
// The developer's held sitting (the ledger untouched).
export function devGrantSitting(st, now = Date.now()) { if (st.sitting) return { ok: false, msg: "A sitting is held" }; st.sitting = { source: "dev", key: null, at: now }; logEv(st, "Developer: a held sitting"); return { ok: true }; }

// The research moments (the-portrait.md §1): a field guide filled, a sealed chapter opened, a deep line. (The fourth, the first pod of a new drop identified, waits on
// what a drop is in the build.) Derived from the save, so each is found whenever it is true and paid once.
export function lineDepth(st, m, seen = new Set()) {
  if (!m || !m.parents || seen.has(m.id)) return 0; seen.add(m.id);
  return 1 + Math.max(0, ...m.parents.map((p) => lineDepth(st, mibiById(st, p.id), seen)));
}
export function momentsEarned(st, settings = DEFAULT_SETTINGS) {
  const out = [];
  for (const id of st.knownIds) {
    const fg = fieldGuide(st, id, settings); if (fg && fg.complete) out.push({ key: "guide:" + id, kind: "guide", species: id });
    for (const chId of st.readOnce[id] || []) { const ch = frameOf(id)?.chapters.find((c) => c.id === chId); if (ch && ch.sealed) out.push({ key: "sealed:" + id + ":" + chId, kind: "sealed", species: id, chapter: chId }); }
  }
  for (const m of st.mibis) if (lineDepth(st, m) >= DEEP_LINE) out.push({ key: "line:" + m.id, kind: "line", mibi: m.id });
  return out;
}
// Pay every moment not yet paid, in order; returns what happened to each.
export function collectMoments(st, settings = DEFAULT_SETTINGS, now = Date.now()) {
  const res = [];
  for (const mo of momentsEarned(st, settings)) { if (st.moments[mo.key]) continue; res.push({ ...mo, ...grantSitting(st, "moment", mo.key, now) }); }
  return res;
}
// The warning in time: while one is held, a guide one look from full pulses ("use your sitting first"), so the moment is not lost.
export function sittingWarning(st, settings = DEFAULT_SETTINGS) {
  if (!st.sitting) return [];
  return st.knownIds.filter((id) => !st.moments["guide:" + id] && fieldGuide(st, id, settings)?.oneFromFull);
}

// --- a mibi may sit once, when it has a habit and a place -----------------------------------------------------------------------
export function portraitBlock(st, m) {
  if (!m) return "pick a mibi";
  if (m.portrait) return "one sitting each, ever";
  if (!habitsOf(m).length || !placesOf(m).length) return m.name + " needs a walk first";
  return "";
}
// The welcome sitting (the-portrait.md §2): the first moment any mibi has both a habit and a place; one per player; it waits for the slot if one is held.
export function checkWelcome(st, now = Date.now()) {
  if (st.welcomeGiven) return { ok: false, again: true };
  if (!st.mibis.some((m) => !m.released && !portraitBlock(st, m))) return { ok: false, early: true };
  if (st.sitting) return { ok: false, waits: true };
  st.welcomeGiven = true; st.moments.welcome = now; return grantSitting(st, "welcome", null, now);
}

// --- the ceremony: pose, place, confirm ---------------------------------------------------------------------------------------
// The offer on Habitat: the mibi, the poses it can take (habits watched), the places (where it has been). `armed` is the first ✓ of the screen's arm-then-confirm.
export function offer(st, m) {
  const block = st.sitting ? portraitBlock(st, m) : "no sitting held";
  return { held: !!st.sitting, mibi: m ? m.id : null, poses: m ? habitsOf(m).slice() : [], places: m ? placesOf(m) : [], block, portrayed: !!(m && m.portrait) };
}
export function beginBlock(st, m, pose, place) {
  if (!st.sitting) return "no sitting held";
  const b = portraitBlock(st, m); if (b) return b;
  if (!habitsOf(m).includes(pose)) return "pick a pose " + m.name + " has done";
  if (!placesOf(m).includes(place)) return "pick a place " + m.name + " has been";
  return "";
}
// Begin: the frame leaves the slot and the crate goes to the bay; it costs the sitting and nothing else.
export function beginSitting(st, m, pose, place, settings = DEFAULT_SETTINGS, now = Date.now()) {
  const b = beginBlock(st, m, pose, place); if (b) return { ok: false, msg: "Begin the sitting · " + b };
  const source = st.sitting.source; st.sitting = null;
  st.crateN = (st.crateN || 0) + 1;
  const crate = { id: "sit" + st.crateN, mibiId: m.id, pose, place, start: now, source, painted: false, opened: false };
  st.sittingCrates.push(crate); m.portrait = { state: "painting", pose, place, crate: crate.id, start: now };
  logEv(st, m.name + " sits for its portrait · " + pose + " · " + place);
  return { ok: true, crate, wait: sittingWaitMs(settings) };
}

// --- the crate: the lamp fills, the painting lands, the bay opens --------------------------------------------------------------
// The timer stores the start and the rule; the lamp is a fraction (never a clock or digits). A crate is ready when the wait is over AND its painting has landed (the wait
// covers the painting and its retries; offline, the crate waits behind the door).
export const crateLamp = (c, settings = DEFAULT_SETTINGS, now = Date.now()) => { const w = sittingWaitMs(settings); return w === 0 ? 1 : clamp((now - c.start) / w, 0, 1); };
export function crateState(c, settings = DEFAULT_SETTINGS, now = Date.now()) {
  if (c.opened) return "opened";
  if (crateLamp(c, settings, now) < 1) return "filling";
  return c.painted ? "ready" : "waiting for the cloud";
}
export function landPortrait(st, crateId) { const c = st.sittingCrates.find((x) => x.id === crateId); if (!c || c.opened) return { ok: false }; if (c.painted) return { ok: false, again: true }; c.painted = true; return { ok: true }; }
export const readyCrates = (st, settings, now) => st.sittingCrates.filter((c) => crateState(c, settings, now) === "ready");
// Home's bay: the walk crates (when docked) and the sittings' crates that are ready; amber when anything waits.
export function bayState(st, sv, settings = DEFAULT_SETTINGS, now = Date.now()) {
  const walk = docked(st) ? bayCrates(st, sv).length : 0, sitting = readyCrates(st, settings, now).length, total = walk + sitting;
  return { walk, sitting, total, amber: total > 0, label: total ? "Open the bay · " + plural(total, "crate") : "" };
}
export function openSittingCrate(st, crateId, settings = DEFAULT_SETTINGS, now = Date.now()) {
  const c = st.sittingCrates.find((x) => x.id === crateId); if (!c) return { ok: false, msg: "no such crate" };
  const s = crateState(c, settings, now); if (s !== "ready") return { ok: false, msg: s === "opened" ? "already opened" : s === "filling" ? "the crate is still filling" : "waiting for the cloud" };
  c.opened = true; st.sittingCrates = st.sittingCrates.filter((x) => x !== c);
  const m = mibiById(st, c.mibiId); if (m && m.portrait) { m.portrait.state = "delivered"; m.portrait.at = now; }
  logEv(st, (m ? m.name : "A mibi") + "'s portrait has come");
  return { ok: true, mibi: m, ribbon: (m ? m.name : "") + "'s portrait" };
}
