// The sitting (M6; the-portrait.md §1, §2, §6, §8): a held right to one portrait, earned by research, spent in a ceremony on Habitat, waited out in a crate at the
// bay, opened to the mibi in a gilt frame. Every rule is a state transition on the save; no drawing, no screen. A timer stores its start and its rule, never a
// countdown (station-build.md §7). Nothing here costs Energy, Data or Essence: a sitting is never on sale (the-portrait.md §1).
//
// The save (all optional in an older save; normalize fills them):
//   st.sitting        null, or the held sitting { source: "moment" | "welcome" | "dev", key, at }  (one slot, one frame)
//   st.moments        the ledger of research moments already paid, so none pays twice: { "<key>": at }
//   st.welcomeGiven   the welcome sitting is given once per player; st.welcomePending: it came while one was held and waits for the slot
//   st.sittingCrates  the crates of sittings begun: { id, mibiId, pose, place, start, source, painted, opened }
//   m.habits          the habits seen (ids from the frame's `habits`); m.walked the places it walked to; m.portrait null | { state, pose, place, crate, start, at }
//   st.face           the species' face in the book: { "<species>": mibiId }   (library.mjs)
import { frameOf, chapterLooks } from "./genome.mjs";
import { mibiById, bayCrates, docked, logEv, plural, clamp, habitsOf, placesOf, dockKey, guideAdd, DEFAULT_SETTINGS } from "./state.mjs";
import { fieldGuide } from "./library.mjs";

// What a mibi has done (state.mjs): habits watched, places been; re-exported here, where the sitting reads them.
export { recordHabit, recordWalk, habitsOf, placesOf, watchResident, WATCH_MS } from "./state.mjs";

// A sitting takes a few hours (three for testing under the developer toggle with every timer): longer than a bud, short enough to arrive the same day.
export const SITTING_WAIT_MS = { hours: 3 * 3600000, minute: 60000, now: 0 };
export const DEEP_LINE = 4;   // generations of crosses in a mibi's recorded tree; a testing number, "tuned with the cross and the real economy" (the-portrait.md §8)
export const LAMP_SHORT = 31 / 32;   // the lamp with the wait over and the crate not yet able to open: just short of full
export const WARNING = "use your sitting first";
export const sittingWaitMs = (settings = DEFAULT_SETTINGS) => SITTING_WAIT_MS[settings.sittingWait ?? "hours"] ?? SITTING_WAIT_MS.hours;

// --- the held sitting ----------------------------------------------------------------------------------------------------------
export const sittingHeld = (st) => !!st.sitting;
// Grant one: refused while one is held ("a sitting earned while one is held is not given"), and a moment pays once. A moment that passes while one is held is
// spent, its key stays in the ledger and it does not wait (the-portrait.md §8): hence the warnings before the act that pays it.
export function grantSitting(st, source, key, now = Date.now()) {
  if (key && st.moments[key]) return { ok: false, again: true };
  if (key) st.moments[key] = now;
  if (st.sitting) { logEv(st, "A sitting was earned (" + key + ") while one is held · not given"); return { ok: false, lost: true, msg: "A sitting is held · " + WARNING }; }
  st.sitting = { source, key: key || null, at: now }; logEv(st, "A sitting is held · " + (key || source));
  return { ok: true, sitting: st.sitting };
}
// The developer's held sitting (the ledger untouched).
export function devGrantSitting(st, now = Date.now()) { if (st.sitting) return { ok: false, msg: "A sitting is held" }; st.sitting = { source: "dev", key: null, at: now }; logEv(st, "Developer: a held sitting"); return { ok: true }; }

// --- the research moments (the-portrait.md §1, §8) ----------------------------------------------------------------------------
// A sealed chapter opened (in the first build its first read; when finds come, the find opening it, under the same key), a field guide filled (the sealed chapter's looks
// included, so a species with one fills only after it; the sealed chapter's own moment comes first), a deep line. (The first pod of a new drop waits on what a drop is.)
// Derived from the save, so each is found whenever it is true and paid once.
// The crosses on the longest path of a mibi's recorded tree (a founder 0); released ancestors count.
export function lineDepth(st, m, seen = new Set()) {
  if (!m || !m.parents || seen.has(m.id)) return 0; seen.add(m.id);
  return 1 + Math.max(0, ...m.parents.map((p) => lineDepth(st, mibiById(st, p.id), new Set(seen))));
}
// A line is named by its founders (the mibis at the roots of the recorded tree): siblings, and every later child of the same line, share it, so a line pays once however deep it goes.
export function lineFounders(st, m, seen = new Set()) {
  if (!m || seen.has(m.id)) return [];
  if (!m.parents || !m.parents.length) return [m.id];
  seen.add(m.id); return [...new Set(m.parents.flatMap((p) => lineFounders(st, mibiById(st, p.id) || { id: p.id }, new Set(seen))))];
}
export const lineKey = (st, m) => "line:" + lineFounders(st, m).sort((x, y) => x - y).join("+");
export function momentsEarned(st, settings = DEFAULT_SETTINGS) {
  const out = [];
  for (const id of new Set(st.knownIds)) {
    for (const chId of st.readOnce[id] || []) { const ch = frameOf(id)?.chapters.find((c) => c.id === chId); if (ch && ch.sealed) out.push({ key: "sealed:" + id + ":" + chId, kind: "sealed", species: id, chapter: chId }); }
    const fg = fieldGuide(st, id, settings); if (fg && fg.complete) out.push({ key: "guide:" + id, kind: "guide", species: id });
  }
  for (const m of st.mibis) { const k = lineKey(st, m); if (lineDepth(st, m) >= DEEP_LINE && !out.some((o) => o.key === k)) out.push({ key: k, kind: "line", mibi: m.id }); }   // one moment a line
  return out;
}
// Pay every moment not yet paid, in order; returns what happened to each.
export function collectMoments(st, settings = DEFAULT_SETTINGS, now = Date.now()) {
  const res = [];
  for (const mo of momentsEarned(st, settings)) { if (st.moments[mo.key]) continue; res.push({ ...mo, ...grantSitting(st, "moment", mo.key, now) }); }
  return res;
}
// The warnings, before the act that pays a moment, while a sitting is held ("use your sitting first", on the price line, before anything is paid):
// a guide one look from full; the first read of a sealed chapter; a cross whose child would complete a deep line.
export function sittingWarning(st, settings = DEFAULT_SETTINGS) {
  if (!st.sitting) return [];
  return [...new Set(st.knownIds)].filter((id) => !st.moments["guide:" + id] && fieldGuide(st, id, settings)?.oneFromFull);
}
// The moments an act would earn that are not yet paid (the keys). The warning comes when the act would lose one: any, while a sitting is held, or the second of two earned at once
// (the slot holds one, so the second is spent). `act` changes a copy of the save the way the act would.
const unpaid = (st, settings) => momentsEarned(st, settings).map((m) => m.key).filter((k) => !st.moments[k]);
export function momentsOf(st, act, settings = DEFAULT_SETTINGS, species = null) {
  const base = structuredClone(st); if (species && !base.knownIds.includes(species)) base.knownIds.push(species);   // an act on a pod or mibi is on a known species
  const after = structuredClone(base); act(after); const before = new Set(unpaid(base, settings));
  return unpaid(after, settings).filter((k) => !before.has(k));
}
const losesOne = (st, n) => (st.sitting ? n >= 1 : n >= 2);
// A read of `chapterId` on `x` (a pod or a mibi): counts the moments it would earn: the sealed chapter's first read and the guide it may fill.
export function readWarning(st, species, chapterId, x = null, settings = DEFAULT_SETTINGS) {
  const fr = frameOf(species), ch = fr && fr.chapters.find((c) => c.id === chapterId); if (!ch) return "";
  const n = momentsOf(st, (c) => {
    const once = c.readOnce[species] || (c.readOnce[species] = []); if (!once.includes(chapterId)) once.push(chapterId);
    if (x && x.genome) for (const [t, ls] of chapterLooks(fr, ch, x.genome)) guideAdd(c, species, t, ls);
  }, settings, species).length;
  return losesOne(st, n) ? WARNING : "";
}
// A cross whose child would complete a deep line: one moment, lost if a sitting is held.
export function crossWarning(st, a, b, settings = DEFAULT_SETTINGS) {
  if (!a || !b) return "";
  const child = { id: -1, parents: [{ id: a.id }, { id: b.id }] }, snap = structuredClone(st); snap.mibis.push(child);
  const n = lineDepth(snap, child) >= DEEP_LINE && !st.moments[lineKey(snap, child)] ? 1 : 0;
  return losesOne(st, n) ? WARNING : "";
}

// --- a mibi may sit once, when it has a habit and a place -----------------------------------------------------------------------
export function portraitBlock(st, m) {
  if (!m) return "pick a mibi";
  if (m.released) return m.name + " has gone";
  if (m.portrait) return "one sitting each, ever";
  if (!habitsOf(m).length || !placesOf(m).length) return m.name + " no pose seen yet";
  return "";
}
// The welcome sitting (the-portrait.md §2, §8): at the first dock at which a mibi comes home from a walk with the player; one per player; it waits for the slot if one is
// held, and is never lost. `home` is the ids of the mibis that came home at this dock (dockKey's result).
export function checkWelcome(st, now = Date.now(), home = []) {
  if (st.welcomeGiven) return { ok: false, again: true };
  if (!st.welcomePending && !home.some((id) => { const m = mibiById(st, id); return m && !m.released; })) return { ok: false, early: true };
  if (st.sitting) { st.welcomePending = true; return { ok: false, waits: true }; }
  st.welcomeGiven = true; st.welcomePending = false; st.moments.welcome = now; return grantSitting(st, "welcome", null, now);
}
// The dock, with the welcome: the Companion docks, what came home is recorded (habits, places), and the first walk home gives the welcome.
export function dock(st, sv, settings = DEFAULT_SETTINGS, now = Date.now()) {
  const r = dockKey(st, sv, settings, now);
  if (r.ok && r.docked) r.welcome = checkWelcome(st, now, r.home || []);
  return r;
}

// --- the ceremony: pose, place, confirm ---------------------------------------------------------------------------------------
// The offer on Habitat: the mibi, the poses it can take (habits seen), the places (where it has been).
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
// Begin: the frame leaves the slot and the crate goes to the bay; it costs the sitting and nothing else. A second sitting may begin while a crate waits (sitting crates do not count
// against the bay's three); a welcome that was waiting for the slot is given now.
export function beginSitting(st, m, pose, place, settings = DEFAULT_SETTINGS, now = Date.now()) {
  const b = beginBlock(st, m, pose, place); if (b) return { ok: false, msg: "Begin the sitting · " + b };
  const source = st.sitting.source; st.sitting = null;
  st.crateN = (st.crateN || 0) + 1;
  const crate = { id: "sit" + st.crateN, mibiId: m.id, pose, place, start: now, source, painted: false, opened: false };
  st.sittingCrates.push(crate); m.portrait = { state: "painting", pose, place, crate: crate.id, start: now };
  logEv(st, m.name + " sits for its portrait · " + pose + " · " + place);
  const w = st.welcomePending ? checkWelcome(st, now) : null;
  return { ok: true, crate, wait: sittingWaitMs(settings), welcome: w };
}

// --- the crate: the lamp fills, the painting lands, the bay opens --------------------------------------------------------------
// The timer stores the start and the rule; the lamp is a fraction (never a clock or digits). A crate is ready at the later of two: the wait over (a minimum, never shortened) and the
// portrait landed. In the first build no portrait is painted, so the wait alone binds and the portrait lands when it ends (unless the developer's painter is off); a painting that is
// late says nothing and the lamp holds just short of full; "waiting for the cloud" shows only when the Caddy is unreachable (or the painter is off).
const reachable = (settings) => settings.caddyReachable !== false && settings.painter !== "off";
export const crateWaitFraction = (c, settings = DEFAULT_SETTINGS, now = Date.now()) => { const w = sittingWaitMs(settings); return w === 0 ? 1 : clamp((now - c.start) / w, 0, 1); };
export const portraitLanded = (c, settings = DEFAULT_SETTINGS) => !!c.painted || (!settings.paintPortraits && settings.painter !== "off");
export function crateState(c, settings = DEFAULT_SETTINGS, now = Date.now()) {
  if (c.opened) return "opened";
  if (crateWaitFraction(c, settings, now) < 1) return "filling";
  if (portraitLanded(c, settings)) return "ready";   // a painted portrait is never locked behind the cloud
  return reachable(settings) ? "painting" : "waiting for the cloud";
}
export const crateLamp = (c, settings = DEFAULT_SETTINGS, now = Date.now()) => (crateState(c, settings, now) === "ready" ? 1 : Math.min(crateWaitFraction(c, settings, now), LAMP_SHORT));
export function landPortrait(st, crateId) { const c = st.sittingCrates.find((x) => x.id === crateId); if (!c || c.opened) return { ok: false }; if (c.painted) return { ok: false, again: true }; c.painted = true; return { ok: true }; }
export const readyCrates = (st, settings, now) => st.sittingCrates.filter((c) => crateState(c, settings, now) === "ready");
// Home's bay: the walk crates (when docked) and the sittings' crates that are ready; amber when anything waits.
export function bayState(st, sv, settings = DEFAULT_SETTINGS, now = Date.now()) {
  const walk = docked(st) ? bayCrates(st, sv).length : 0, sitting = readyCrates(st, settings, now).length, total = walk + sitting;
  return { walk, sitting, total, amber: total > 0, label: total ? "Open the bay · " + plural(total, "crate") : "" };
}
export function openSittingCrate(st, crateId, settings = DEFAULT_SETTINGS, now = Date.now()) {
  const c = st.sittingCrates.find((x) => x.id === crateId); if (!c) return { ok: false, msg: "no such crate" };
  const s = crateState(c, settings, now); if (s !== "ready") return { ok: false, msg: s === "opened" ? "already opened" : s === "filling" || s === "painting" ? "the crate is still filling" : "waiting for the cloud" };
  c.opened = true; st.sittingCrates = st.sittingCrates.filter((x) => x !== c);
  const m = mibiById(st, c.mibiId); if (m && m.portrait) { m.portrait.state = "delivered"; m.portrait.at = now; }
  logEv(st, (m ? m.name : "A mibi") + "'s portrait has come");
  return { ok: true, mibi: m, ribbon: (m ? m.name : "") + "'s portrait" };
}
