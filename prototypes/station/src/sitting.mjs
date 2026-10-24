// The sitting (M6; the-portrait.md §1, §2, §6, §8): a held right to one portrait, earned by research, spent in a ceremony on Habitat, waited out in a crate at the
// bay, opened to the mibi in a gilt frame. Every rule is a state transition on the save; no drawing, no screen. A timer stores its start and its rule, never a
// countdown (station-build.md §7). Nothing here costs Energy, Data or Essence: a sitting is never on sale (the-portrait.md §1).
//
// The save (all optional in an older save; normalize fills them):
//   st.sitting        null, or the held sitting { source: "moment" | "welcome" | "dev", key, at }  (one slot, one frame)
//   st.moments        the ledger of research moments already paid, so none pays twice: { "<key>": at }
//   st.welcomeGiven   the welcome sitting is earned once per player (it is held at once, or joins st.owed when one is held)
//   st.doorAt         null until the sitting's door first opens on this save; until then no moment is paid and none is lost (the-portrait.md §8, X21)
//   st.owed           the one queue of earned sittings waiting behind the held one, oldest first by when each was earned: [{ key, at, source }] (source "moment" or "welcome"; the welcome's key is null);
//                     kept in the save, never trimmed, never expires; the head comes into the slot whenever it is empty
//   st.sittingCrates  the crates of sittings begun: { id, mibiId, pose, place, start, source, painted, opened }
//   m.habits          the habits seen (ids from the frame's `habits`); m.walked the places it walked to; m.portrait null | { state, pose, place, crate, start, at, digest }; digest: the first 16 hex of the SHA-256 of the 528×392 RGBA of the portrait's opening, written only by a rule when the source lands (not yet written in play)
//   st.face           the species' face in the book: { "<species>": mibiId }   (library.mjs)
import { frameOf } from "./genome.mjs";
import { mibiById, mergeCare, bayCrates, docked, logEv, plural, clamp, habitsOf, placesOf, frameFor, carriedIds, mibiStage, dockKey, DEFAULT_SETTINGS } from "./state.mjs";
import { fieldGuide } from "./library.mjs";

// What a mibi has done (state.mjs): habits watched, places been; re-exported here, where the sitting reads them.
export { recordHabit, recordWalk, habitsOf, placesOf, watchResident, WATCH_MS } from "./state.mjs";

// A sitting takes a few hours (three for testing under the developer toggle with every timer): longer than a bud, short enough to arrive the same day.
export const SITTING_WAIT_MS = { hours: 3 * 3600000, minute: 60000, now: 0 };
export const DEEP_LINE = 4;   // generations of crosses in a mibi's recorded tree; a testing number, "tuned with the cross and the real economy" (the-portrait.md §8)
export const LAMP_SHORT = 31 / 32;   // the lamp with the wait over and the crate not yet able to open: just short of full
export const sittingWaitMs = (settings = DEFAULT_SETTINGS) => SITTING_WAIT_MS[settings.sittingWait ?? "hours"] ?? SITTING_WAIT_MS.hours;

// --- the held sitting ----------------------------------------------------------------------------------------------------------
export const sittingHeld = (st) => !!st.sitting;
// Grant one: a moment pays once (its key goes into the ledger when it is earned). With the slot empty it is held; with one held it joins the queue and waits behind it.
// An earned sitting is never discarded.
export function grantSitting(st, source, key, now = Date.now()) {
  if (key && st.moments[key]) return { ok: false, again: true };
  if (key) st.moments[key] = now;
  if (st.sitting) { queueSitting(st, source, key || null, now); logEv(st, "A sitting was earned (" + (key || source) + ") while one is held · it waits"); return { ok: true, queued: true, position: st.owed.length }; }
  st.sitting = { source, key: key || null, at: now }; logEv(st, "A sitting is held · " + (key || source));
  return { ok: true, sitting: st.sitting };
}
// Join the queue by the time earned: after every entry earned no later (oldest first; equal times keep the order they came).
export function queueSitting(st, source, key, at) {
  const e = { key, at, source }; let i = st.owed.length; while (i > 0 && st.owed[i - 1].at > at) i--;
  st.owed.splice(i, 0, e); return e;
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
// A species' research moment keys: a sealed chapter opened, its field guide filled (one helper for the moments earned and the sittings counted).
export const momentKey = { sealed: (id, chId) => "sealed:" + id + ":" + chId, guide: (id) => "guide:" + id };
export function momentsEarned(st, settings = DEFAULT_SETTINGS) {
  const out = [];
  for (const id of new Set(st.knownIds)) {
    for (const chId of st.readOnce[id] || []) { const ch = frameOf(id)?.chapters.find((c) => c.id === chId); if (ch && ch.sealed) out.push({ key: momentKey.sealed(id, chId), kind: "sealed", species: id, chapter: chId }); }
    const fg = fieldGuide(st, id, settings); if (fg && fg.complete) out.push({ key: momentKey.guide(id), kind: "guide", species: id });
  }
  for (const m of st.mibis) { const k = lineKey(st, m); if (lineDepth(st, m) >= DEEP_LINE && !out.some((o) => o.key === k)) out.push({ key: k, kind: "line", mibi: m.id }); }   // one moment a line
  return out;
}
// The research sittings a species has earned: its paid moments in the ledger (st.moments), a sealed chapter opened and the guide filled; a line or another species' moment is not its own.
export const sittingsOf = (st, species) => Object.keys(st.moments ?? {}).filter((k) => k === momentKey.guide(species) || k.startsWith(momentKey.sealed(species, ""))).length;
// Pay every moment not yet paid, in order; returns what happened to each. Behind the shut door nothing is paid: each moment stays earned.
export function collectMoments(st, settings = DEFAULT_SETTINGS, now = Date.now()) {
  if (!st.doorAt) return [];
  const res = [];
  for (const mo of momentsEarned(st, settings)) { if (st.moments[mo.key]) continue; res.push({ ...mo, ...grantSitting(st, "moment", mo.key, now) }); }
  return res;
}
const unpaid = (st, settings) => momentsEarned(st, settings).map((m) => m.key).filter((k) => !st.moments[k]);

// --- behind a shut door (the-portrait.md §8, X21) ------------------------------------------------------------------------------
// The door first opens: every moment earned before then is owed. It goes into the ledger (so it never pays twice) and waits in earned order; one comes into the slot whenever
// the slot is empty. An owed sitting is never lost and never expires. Idempotent: the save's doorAt is the rule's only view of the door.
export function openSittingDoor(st, settings = DEFAULT_SETTINGS, now = Date.now()) {
  if (st.doorAt) return { ok: false, again: true };
  st.doorAt = now;
  for (const k of unpaid(st, settings)) { st.moments[k] = now; queueSitting(st, "moment", k, now); }
  logEv(st, "Sittings owed · " + st.owed.length);
  return giveOwed(st, now);
}
// The oldest owed sitting into the slot, when it is empty, with its own source.
export function giveOwed(st, now = Date.now()) {
  if (st.sitting || !st.owed.length) return { ok: false };
  const { key, source } = st.owed.shift();
  st.sitting = { source: source || "moment", key, at: now }; logEv(st, "A sitting is held · " + (key || source));
  return { ok: true, source: st.sitting.source, key };
}

// --- a mibi may sit once, when it has a habit and a place -----------------------------------------------------------------------
// A juvenile may sit (the portrait keeps the stage it sat at); a mibi out with the Companion sits only while the Companion is docked (a sitting begun while docked goes on after undocking).
export function portraitBlock(st, m, sv) {
  if (!m) return "pick a mibi";
  if (m.released) return "back in the wild";
  if (!docked(st) && carriedIds(st, sv).includes(m.id)) return "sits when you dock";
  if (m.portrait) return "one sitting each, ever";
  if (!habitsOf(m).length) return "no pose seen yet";
  if (!placesOf(m).length) return "no expedition yet";
  return "";
}
// The welcome sitting (the-portrait.md §2, §8): at the first dock at which a mibi comes home from a walk with the player; one per player; it joins the queue (by when it came due)
// if one is held, and is never lost. `home` is the ids of the mibis that came home at this dock (dockKey's result). Returns grantSitting's shapes: held { ok: true, sitting }, queued { ok: true, queued: true, position }.
export function checkWelcome(st, now = Date.now(), home = []) {
  if (st.welcomeGiven) return { ok: false, again: true };
  if (!home.some((id) => { const m = mibiById(st, id); return m && !m.released; })) return { ok: false, early: true };
  st.welcomeGiven = true; st.moments.welcome = now;
  if (st.sitting) { queueSitting(st, "welcome", null, now); logEv(st, "The welcome sitting waits behind the held one"); return { ok: true, queued: true, position: st.owed.length }; }   // grantSitting's shape
  return grantSitting(st, "welcome", null, now);
}
// The dock, with the welcome: the Companion docks, what came home is recorded (habits, places), and the first walk home gives the welcome.
export function dock(st, sv, settings = DEFAULT_SETTINGS, now = Date.now()) {
  const r = dockKey(st, sv, settings, now);
  if (r.ok && r.docked) r.welcome = checkWelcome(st, now, r.home || []);
  return r;
}
// The save read while docked (the other page wrote it, or the page loaded): the care that came home, and the welcome if a mibi came home from a walk.
export function mergeHome(st, sv, now = Date.now()) {
  const home = mergeCare(st, sv);
  return { home, welcome: home.length ? checkWelcome(st, now, home) : null };
}

// --- the ceremony: pose, place, confirm ---------------------------------------------------------------------------------------
// The offer on Habitat: the mibi, the poses it can take (habits seen), the places (where it has been).
// Poses are offered in the species frame's habit order, not the order they were seen.
const inFrameOrder = (m, hs) => { const order = frameFor(m)?.habits || []; const at = (h) => { const i = order.indexOf(h); return i < 0 ? order.length : i; }; return hs.slice().sort((a, b) => at(a) - at(b)); };
export function offer(st, m, sv) {
  const block = st.sitting ? portraitBlock(st, m, sv) : "no sitting held";
  return { held: !!st.sitting, mibi: m ? m.id : null, poses: m ? inFrameOrder(m, habitsOf(m)) : [], places: m ? placesOf(m) : [], block, portrayed: !!(m && m.portrait) };
}
export function beginBlock(st, m, pose, place, sv) {
  if (!st.sitting) return "no sitting held";
  const b = portraitBlock(st, m, sv); if (b) return b;
  if (!habitsOf(m).includes(pose)) return "pick a pose " + m.name + " has done";
  if (!placesOf(m).includes(place)) return "pick a place " + m.name + " has been";
  return "";
}
// Begin: the frame leaves the slot and the crate goes to the bay; it costs the sitting and nothing else. A second sitting may begin while a crate waits (sitting crates do not count
// against the bay's three); the oldest sitting waiting in the queue comes into the slot now. Returns { ok, crate, wait, next }: `next` is true when a held sitting came forward from the
// queue (which one is st.sitting.source; no screen tells a welcome from a moment).
export function beginSitting(st, m, pose, place, settings = DEFAULT_SETTINGS, now = Date.now(), sv) {
  const b = beginBlock(st, m, pose, place, sv); if (b) return { ok: false, msg: "Begin the sitting · " + b };
  const source = st.sitting.source; st.sitting = null;
  st.crateN = (st.crateN || 0) + 1;
  const crate = { id: "sit" + st.crateN, mibiId: m.id, pose, place, start: now, source, painted: false, opened: false };
  st.sittingCrates.push(crate); m.portrait = { state: "painting", pose, place, crate: crate.id, start: now, stage: mibiStage(st, m, settings) };   // the portrait shows this stage forever
  logEv(st, m.name + " sits for its portrait · " + pose + " · " + place);
  const o = giveOwed(st, now);   // one queue, oldest first
  return { ok: true, crate, wait: sittingWaitMs(settings), next: !!o.ok };
}

// --- the crate: the lamp fills, the painting lands, the bay opens --------------------------------------------------------------
// The timer stores the start and the rule; the lamp is a fraction (never a clock or digits). A crate is ready at the later of two: the wait over (a minimum, never shortened) and the
// portrait landed. In the first build no portrait is painted, so the wait alone binds and the portrait lands when it ends (unless the developer's painter is off); a painting that is
// late says nothing and the lamp holds just short of full; "waiting for a signal" shows only when the Caddy is unreachable (or the painter is off).
const reachable = (settings) => settings.caddyReachable !== false && settings.painter !== "off";
export const crateWaitFraction = (c, settings = DEFAULT_SETTINGS, now = Date.now()) => { const w = sittingWaitMs(settings); return w === 0 ? 1 : clamp((now - c.start) / w, 0, 1); };
export const portraitLanded = (c, settings = DEFAULT_SETTINGS) => !!c.painted || (!settings.paintPortraits && settings.painter !== "off");
export function crateState(c, settings = DEFAULT_SETTINGS, now = Date.now()) {
  if (c.opened) return "opened";
  if (crateWaitFraction(c, settings, now) < 1) return "filling";
  if (portraitLanded(c, settings)) return "ready";   // a painted portrait is never locked behind the cloud
  return reachable(settings) ? "painting" : "waiting for a signal";
}
export const crateLamp = (c, settings = DEFAULT_SETTINGS, now = Date.now()) => (crateState(c, settings, now) === "ready" ? 1 : Math.min(crateWaitFraction(c, settings, now), LAMP_SHORT));
export function landPortrait(st, crateId) { const c = st.sittingCrates.find((x) => x.id === crateId); if (!c || c.opened) return { ok: false }; if (c.painted) return { ok: false, again: true }; c.painted = true; return { ok: true }; }
export const readyCrates = (st, settings, now) => st.sittingCrates.filter((c) => crateState(c, settings, now) === "ready");
// Home's bay: the walk crates (when docked) and the sittings' crates that are ready; amber when anything waits.
export function bayState(st, sv, settings = DEFAULT_SETTINGS, now = Date.now()) {
  const walk = docked(st) ? bayCrates(st, sv).length : 0, sitting = readyCrates(st, settings, now).length, total = walk + sitting;
  return { walk, sitting, total, amber: total > 0, label: total ? "Open the bay" : "" };
}
export function openSittingCrate(st, crateId, settings = DEFAULT_SETTINGS, now = Date.now()) {
  const c = st.sittingCrates.find((x) => x.id === crateId); if (!c) return { ok: false, msg: "no such crate" };
  const s = crateState(c, settings, now); if (s !== "ready") return { ok: false, msg: s === "opened" ? "already opened" : s === "filling" || s === "painting" ? "the crate is still filling" : "waiting for a signal" };
  c.opened = true; st.sittingCrates = st.sittingCrates.filter((x) => x !== c);
  const m = mibiById(st, c.mibiId); if (m && m.portrait) { m.portrait.state = "delivered"; m.portrait.at = now; }
  logEv(st, (m ? m.name : "A mibi") + "'s portrait has come");
  return { ok: true, mibi: m, ribbon: (m ? m.name : "") + "'s portrait" };
}
