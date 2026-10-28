// The Station's state: the save's Station part (`st` under mb-save-v8) and every rule as a pure
// function over it. No drawing, no DOM: the tests run this in Node. Screens call these and read
// the results; presentation events come back as return values, never as side effects on a renderer.
// The Companion page owns every top-level field of the save and reads these fields of `st`:
// accepted, dockN, known, probe, carryReqs, returned (with species, gs), and each mibi's id, name, sp, species, spName, born, since, sinceFloor, from, bonded.
// The care fields of a mibi (care, tends, bondCare, grownTurn, notches, outings, bonded) are the Companion's; the Station mirrors them at the dock (mergeCare) and never writes one, except normalize's additive defaults and the idempotent legacy-bond back-fill (the same values the Companion computes).
// Those keep their shape (station-build.md §2.3).
import { currentLooks } from "../../workbench/framework/describe.mjs";
import { shedPod, SELF_KINSHIP } from "../../workbench/framework/cross.mjs";
import { fill, capLine } from "./views/words.mjs";
import FRAME from "../../ui/specs/station/frame.json" with { type: "json" };
import VIVARIUM from "../../ui/specs/station/vivarium.json" with { type: "json" };
import { frameOf, frameIds, speciesIndex, speciesId, podGenome, chapterOf, chapterLooks, chapterSeal, genomeSha, nameCode, stampCode, checkGenome, genomeDigest, traitOf, traitState, shapeTrait, genomeProblems, quantizeGenome } from "./genome.mjs";

export const ST_SCHEMA = 4;
export const SAVE_KEY = "mb-save-v8", SAVE_V = 8, V7_KEY = "mb-exploration-v7";
export const OLD_SAVE_KEYS = ["mb-exploration-v1", "mb-exploration-v2", "mb-exploration-v3", "mb-exploration-v4", "mb-exploration-v5", "mb-exploration-v6", V7_KEY];
export const DEV_KEY = "mb-station-dev";
// The decided prices (research-economy.md §2).
export const PRICE = { identify: 1 /* Data: ◆1, always, no free first one (owner 2026-10-11 15:20) */, readTrait: 1, change: 1, growE: 2, growS: 4, mend: 1, room: [4, 8, 12] /* Energy for rooms 2, 3, 4 */, tier2E: 12, tier2D: 4, wild: 1, wildMibi: 2 };
export const RACK = 6;
export const ROOM = 8, ROOMS_MAX = 4;   // places in a room, rooms in the Vivarium
export const ROOM_NAMES = VIVARIUM.strings.rooms;
// The rack: the wells in play (the developer setting, else the six of the Station)
export const rackSize = (settings = DEFAULT_SETTINGS) => settings.rack || RACK;
export const TIER = { 1: { shield: 3 }, 2: { shield: 4 } };
// The plates the dock leaves whole when it does not mend every plate (the bench's switch off): two, free; the switch on mends all at the price.
export const DOCK_MEND_FLOOR = 2;
// What Probe tier 2 gains, as data the bench shows (the fourth is reading the deep "?"). PLACEHOLDER wording; the copywriter's lists replace the strings.
export const TIER2_GAINS = [{ id: "reach", text: "reaches 4 cells" }, { id: "pods", text: "carries 3 pods" }, { id: "plates", text: "4 plates" }, { id: "deep", text: "reads the deep" }];
export const JUVENILE_TURNS = 2, ELDER_TURNS = 16, CARRY_MAX = 3;   // young for 2 world turns, an adult for 16 more: an elder at turn 18 (game designer, option A)
// A device clock before 2026 is unset: no `since` is written from it (normalize back-fills at the first good clock).
export const GOOD_CLOCK = Date.UTC(2026, 0, 1);
export const MIBI_NAMES = ["Dot", "Moss", "Bean", "Fig", "Nib", "Tuft", "Pebble", "Wren", "Pip", "Sorrel", "Burr", "Quill"];
// --- names (the game designer's brief): a name never carries a digit and is never reused among living mibis, released ones included -----------------------------------------------------------
export const NAME_MAX = 10;
// PLACEHOLDER heads and tails for the compound names (tiers 2 and 3): the naming board's lists replace them; the tests inject their own.
export const NAME_HEADS = ["Ka", "Lo", "Mi", "Ne", "Pu", "Ro", "Su", "Te"], NAME_TAILS = ["ri", "sa", "mo", "vu", "li", "po"];
const SEPARATORS = " -’";
// How names compare: lowercase, accents removed, œ → oe, separators removed ("Mo-Mo" = "momo" = "Mómo"); the apostrophe folds to ’.
export const nameKey = (s) => String(s).replace(/'/g, "’").toLowerCase().replace(/œ/g, "oe").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/œ/g, "oe").split("").filter((c) => !SEPARATORS.includes(c)).join("");
// The pool in its fixed order: the twelve names, then heads[k mod H] + tails[⌊k / H⌋] for k = 0 … H·T − 1, then head + tail + tail in the same order (tails[(⌊k/H⌋) mod T], tails[⌊k / (H·T)⌋]); then, only if all of
// those are used (never reached in play: a safety net), capitalised letter names of two letters and up so a draw never fails. A candidate that is used (by nameKey), holds a digit or is longer than NAME_MAX is skipped.
export function* namePool({ names = MIBI_NAMES, heads = NAME_HEADS, tails = NAME_TAILS } = {}) {
  for (const n of names) yield n;
  const H = heads.length, T = tails.length;
  for (let k = 0; k < H * T; k++) yield heads[k % H] + tails[Math.floor(k / H)];
  for (let k = 0; k < H * T * T; k++) yield heads[k % H] + tails[Math.floor(k / H) % T] + tails[Math.floor(k / (H * T))];
  for (let k = 0; ; k++) { let s = "", x = k; do { s = String.fromCharCode(97 + (x % 26)) + s; x = Math.floor(x / 26) - 1; } while (x >= 0); if (s.length < 2) s += "a"; yield s[0].toUpperCase() + s.slice(1); }
}
const usedKeys = (st) => st.namesUsed || (st.namesUsed = []);
// The next name: the first in pool order whose key is not used, appended to st.namesUsed (never pruned).
export function drawName(st, pool = {}) {
  const used = new Set(usedKeys(st));
  for (const c of namePool(pool)) { const k = nameKey(c); if (/\d/.test(c) || [...c].length > NAME_MAX || used.has(k)) continue; st.namesUsed.push(k); return c; }
}
export const PLACE_WORD = { meadow: "meadow", pond: "pond edge", rock: "rock field", wood: "wood", cave: "cave" };
// The origin line is one sentence: "Found <where>, <what happened>." Each half is at most 24 characters with its comma or full stop, so the sentence breaks after the comma (design/style-guide/station-layouts.md, Pods, Origin).
export const FOUND_WORD = { meadow: "in the meadow", pond: "at the pond edge", rock: "on the rock field", wood: "in the wood", cave: "in the cave" };
export const FIND_WORD = { shake: "as {who} shook dry", calm: "as {who} felt safe", curl: "as {who} curled up", meal: "as {who} ate well", slab: "it lay under a slab", ground: "it lay buried", deep: "it lay deep below", cave: "it lay buried" };
// Developer settings (their own key, never in the shared save). The economy is loose by default (decided 2026-10-08, for testing).
export const DEFAULT_SETTINGS = { jump: "arrival", light: null, economy: "loose", topUp: { e: 2, d: 3, s: 4 }, sealedOpen: false, rooms: null, rack: RACK, budScale: 1, firstBud: true, sittingWait: "hours", adultTurns: JUVENILE_TURNS, elderTurns: ELDER_TURNS, mockDelay: 20, growCap: 10, painter: "mock", instantGrowPreset: "rule", watchMs: 60000, trickleCap: 2 };

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const plural = (n, w, p) => n + " " + (n === 1 ? w : p || w + "s");
export const aAn = (w) => (/^[aeiou]/i.test(w) ? "an " : "a ") + w;
export const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

// --- the record ------------------------------------------------------------------------------------
export function freshSt(wid, turn, now = Date.now()) {
  return { schema: ST_SCHEMA, wid: wid == null ? null : wid, at: now, turn: turn || 0, e: 0, d: 0, s: 0,
    tray: [], waiting: [], accepted: [], devBay: [], known: [], met: [], knownIds: [], metIds: [], readOnce: {}, guide: {}, libSeen: {}, readEver: false, freeId: false, firstMibi: true,
    mibis: [], nextMibi: 1, nameN: 0, namesUsed: [], bud: null, rooms: 1, sheds: [], sitting: null, moments: {}, welcomeGiven: false, owed: [], doorAt: null, wish: {}, face: {}, sittingCrates: [], outbox: [],
    dock: { docked: false, at: now }, dockN: 0, carryReqs: [], carrySeq: 0, carryRefusedSeen: 0, probe: null, mendFull: false, returned: [], log: [] };
}
export function logEv(st, t) { st.log.push("T" + (st.turn + 1) + " · " + t); if (st.log.length > 60) st.log.splice(0, st.log.length - 60); }

// A pod's or mibi's frame: by species id, else by the Companion's index.
export const speciesOf = (x) => x.species ?? speciesId(x.sp);
export const frameFor = (x) => frameOf(speciesOf(x));
export const spName = (x) => frameFor(x)?.species.name ?? "unknown";
// A starting mibi's chapters read: every open one; a sealed chapter only once it is opened in play (readMibi), so its stamp carries no shut sealed chapter.
const openChapterIds = (frame) => frame.chapters.filter((c) => !c.sealed).map((c) => c.id);
const mibiFromGenome = (frame, genome) => {
  const sha = genomeSha(genome);
  return { genome, sha, code: nameCode(sha), read: openChapterIds(frame) };
};
// The migration steps, in order, each idempotent on its own output: forward only, logged. Step 2: a v8 `st` written by the stand-in (schema 1) becomes the research loop.
// Pods keep their identity (the genome is sampled from the pod's seed); studies start again; an existing
// mibi becomes a founder from its seed, fully read. The Companion-read fields keep their shape.
function toResearch(st, now) {
  const out = Object.assign(freshSt(st.wid, st.turn, now), st);
  out.schema = 2;
  const notes = [];
  const podOf = (p) => {
    const q = { id: p.id, sp: p.sp, species: speciesOf(p), g: p.g, how: p.how, gs: p.gs >>> 0, k: p.k ?? null, n: p.n || 0, idd: p.idd ? 1 : 0, newSp: 0, read: [], fresh: p.fresh ? 1 : 0 };
    const fr = frameOf(q.species); if (fr) q.genome = podGenome(fr, q.gs);
    if (p.st && p.st.some(Boolean)) notes.push(`${q.species} pod ${q.id}: its studies start again as chapters`);
    return q;
  };
  out.tray = (st.tray || []).map(podOf); out.waiting = (st.waiting || []).map(podOf);
  out.knownIds = [...new Set((st.known || []).map(speciesId).filter(Boolean))]; out.metIds = [...new Set((st.met || []).map(speciesId).filter(Boolean))];
  out.readOnce = {}; out.guide = {}; out.readEver = !!(st.studyPaid && Object.keys(st.studyPaid).length);
  out.mibis = (st.mibis || []).map((m, i) => {
    const q = { id: m.id, name: m.name, sp: m.sp, species: speciesOf(m), gs: m.gs >>> 0, born: m.born || 0, from: m.from || { n: 0, g: "", how: "" }, mem: m.mem || null, outings: m.outings || 0, notches: m.notches || 0, bonded: !!m.bonded, ...(m.places ? { places: m.places } : {}),
      parents: null, bay: i, paint: null, released: false };
    const fr = frameOf(q.species); if (fr) Object.assign(q, mibiFromGenome(fr, podGenome(fr, q.gs)));
    return q;
  });
  out.bud = null;
  if (st.inc && st.inc.m) { const m = st.inc.m, species = speciesOf(m), fr = frameOf(species);
    if (fr) { const genome = podGenome(fr, m.gs >>> 0); out.bud = { kind: "founder", species, sp: m.sp, genome, sha: genomeSha(genome), start: st.inc.start, minutes: st.inc.mins || 5, firstEver: false, parents: null, from: m.from, read: openChapterIds(fr) }; } }
  out.sitting = null; out.moments = {}; out.welcomeGiven = false; out.wish = {}; out.outbox = []; out.devBay = [];
  delete out.seen; delete out.studiedW; delete out.studyPaid; delete out.inc;
  rebuildGuide(out);
  logEv(out, `Save migrated to the research loop (schema 2)` + (notes.length ? " · " + notes.join(" · ") : ""));
  return out;
}
// Step 3, the carried set: the old single request ("swap") becomes an add in the queue when the Companion has not applied it (the Station never cleared withReq, so withSeen decides); the old mibi stays carried.
function toCarry(st, now, sv) {
  const r = st.withReq;
  if (r && r.seq > ((sv && sv.withSeen) || 0) && !carriedIds(st, sv).includes(r.id)) { st.carryReqs = [{ seq: 1, op: "add", id: r.id }]; st.carrySeq = 1; } else { st.carryReqs = []; st.carrySeq = 0; }
  delete st.withReq; st.carryRefusedSeen = st.carryRefusedSeen || 0;
  return st;
}
// Step 4, the rooms: the housed, in (bay, id) order, take room floor(i / 8) and slot i mod 8; a save over eight housed gets the rooms it needs, free (game designer); a released mibi holds no place; no pod is owed for a release made before this step.
// `bays` and each mibi's `bay` stay (room * 8 + slot) for one release, so a rolled-back Station reads a coherent save.
function toRooms(st) {
  const housedNow = st.mibis.filter((m) => !m.released).sort((a, b) => (a.bay ?? 0) - (b.bay ?? 0) || a.id - b.id);
  housedNow.forEach((m, i) => { m.room = Math.floor(i / ROOM); m.slot = i % ROOM; m.bay = m.room * ROOM + m.slot; });
  for (const m of st.mibis) if (m.released) { m.room = null; m.slot = null; }
  st.rooms = clamp(Math.ceil(housedNow.length / ROOM), 1, ROOMS_MAX); st.sheds = [];
  st.bays = Math.min(12, ROOM * st.rooms);
  return st;
}
const STEPS = [[2, toResearch], [3, toCarry], [4, toRooms]];
export function migrate(st, now = Date.now(), sv = null) {
  if (!st || st.schema >= ST_SCHEMA) return st;
  let out = st;
  for (const [n, step] of STEPS) if (n > (out.schema || 0)) { out = step(out, now, sv); out.schema = n; }
  return out;
}
// What a record may lack after an older write.
export function normalize(st, now = Date.now()) {
  for (const k of ["tray", "waiting", "accepted", "devBay", "known", "met", "knownIds", "metIds", "mibis", "returned", "log", "outbox", "releases", "sittingCrates", "owed", "sheds"]) if (!Array.isArray(st[k])) st[k] = [];
  st.outbox = st.outbox.filter((o) => o.sitting);   /* the Caddy is called only for the sitting's portrait: an old Grow or Cross entry never goes (additive, no schema bump) */
  if (st.welcomePending) { st.owed.unshift({ key: null, at: 0, source: "welcome" }); st.welcomeGiven = true; }   /* an older save kept the waiting welcome as a flag: it joins the queue, first as it was (additive, no schema bump) */
  delete st.welcomePending;
  for (const o of st.owed) if (!o.source) o.source = "moment";   /* an older queue held moments only */
  if (st.doorAt === undefined) st.doorAt = null;   /* the sitting's door: null until it first opens on this save (sitting.mjs openSittingDoor); additive, no schema bump */
  for (const k of ["readOnce", "guide", "moments", "wish", "guideNotes", "face"]) if (!st[k] || typeof st[k] !== "object") st[k] = {};
  if (!st.libSeen || typeof st.libSeen !== "object") st.libSeen = libSnapshot(st);   /* the looks the Library had shown when it was last opened full screen (build spec 4.2, "new"): a save from before it holds none, so what it knows now is not new; additive, no schema bump */
  st.dock = st.dock || { docked: false, at: now };
  if (!(st.face.room >= 0 && st.face.room < 4)) st.face.room = 0;   /* the room the whole last showed (additive, no schema bump) */
  for (const r of st.returned) if (r && r.species === undefined) r.species = speciesId(r.sp);   /* a returned pod from before it carried its species: 0-2 resolve, -1 stays null; additive, no schema bump */
  for (const p of st.tray.concat(st.waiting)) { p.species = speciesOf(p); if (!Array.isArray(p.read)) p.read = []; if (!Array.isArray(p.first)) p.first = [];   /* p.first (the traits whose look this pod showed first) is optional in a save: an older pod loads with none and shows no mark; no schema bump, the default is the migration */ const fr = frameFor(p); if (fr && !p.genome) p.genome = podGenome(fr, p.gs >>> 0); }
  for (const m of st.mibis) { m.species = speciesOf(m); const fr = frameFor(m); m.spName = fr ? fr.species.name : null; if (fr && !m.genome) Object.assign(m, mibiFromGenome(fr, podGenome(fr, m.gs >>> 0))); if (fr) m.genome = quantizeGenome(fr, m.genome);   /* blends on the step (2026-10-09): idempotent; m.sha (the painting key) and m.code stay */ if (!m.from) m.from = { n: 0, g: "", how: "" }; if (!Array.isArray(m.habits)) m.habits = []; if (!Array.isArray(m.walked)) m.walked = []; if (m.portrait === undefined) m.portrait = null;
    if (!Number.isInteger(m.since) || m.since <= 0) { delete m.since; delete m.sinceFloor; if (now >= GOOD_CLOCK) { m.since = now; m.sinceFloor = true; } }   /* an older save holds no clock for the mibi: it has been yours for at least this long, written once and never again (additive, no schema bump); an unset clock writes nothing and the first good one does */
    m.care = m.care > 0 ? m.care | 0 : 0; m.tends = m.tends > 0 ? m.tends | 0 : 0; if (m.grownTurn === undefined) m.grownTurn = null;
    if (m.bonded && m.bondCare == null) { m.bondCare = m.care || 0; if (m.grownTurn == null && st.turn - (m.born || 0) >= JUVENILE_TURNS) m.grownTurn = (m.born || 0) + JUVENILE_TURNS; } }   /* a bond made on the Station before the care rules: the marker is bonded with no bondCare, only old bonds match, and after this it is false (idempotent) */
  if (!Array.isArray(st.carryReqs)) st.carryReqs = []; if (!(st.carrySeq >= 0)) st.carrySeq = 0; if (!(st.carryRefusedSeen >= 0)) st.carryRefusedSeen = 0;
  syncKnown(st);
  claimExisting(st); renameDigits(st);
  return st;
}
// Every name the save already holds is used: living and released mibis, the release records, the field-guide notes and the parents of a child or a bud.
function claimExisting(st) {
  const used = usedKeys(st), add = (n) => { if (typeof n === "string" && n) { const k = nameKey(n); if (!used.includes(k)) used.push(k); } };
  for (const m of st.mibis) { add(m.name); for (const q of m.parents || []) add(q?.name); }
  for (const r of st.releases) add(r?.name);
  for (const list of Object.values(st.guideNotes)) for (const n of Array.isArray(list) ? list : []) add(n?.name);
  if (st.bud) for (const q of st.bud.parents || []) add(q?.name);
}
// A name with a digit is renamed in id order from the pool, and what refers to it follows: the `of` of any mibi's origin, the parents of any child or the bud (by id), the release record (by id) and the field-guide
// note (by code). Idempotent; the log says each once.
function renameDigits(st) {
  for (const m of [...st.mibis].sort((a, b) => a.id - b.id)) {
    if (!/\d/.test(m.name)) continue;
    const old = m.name, fresh = drawName(st); followName(st, m, old, fresh);
    logEv(st, "Renamed " + old + " to " + fresh);
  }
}
// A mibi takes a new name and what refers to the old one follows.
function followName(st, m, old, fresh) {
  m.name = fresh;
  for (const x of st.mibis) { const of = x.from?.of; if (Array.isArray(of)) x.from.of = of.map((n) => (n === old ? fresh : n)); for (const q of x.parents || []) if (q && q.id === m.id) q.name = fresh; }
  if (st.bud) { const of = st.bud.from?.of; if (Array.isArray(of)) st.bud.from.of = of.map((n) => (n === old ? fresh : n)); for (const q of st.bud.parents || []) if (q && q.id === m.id) q.name = fresh; }
  for (const r of st.releases) if (r && r.id === m.id) r.name = fresh;
  for (const list of Object.values(st.guideNotes)) for (const n of Array.isArray(list) ? list : []) if (n && n.code === m.code && n.name === old) n.name = fresh;
}
// --- naming one's mibi (namer.json; station-layouts.md, The namer) -------------------------------------------------------------------------------------------------------------------------
// What stops a name from being saved, in the order the say line gives it: fewer than two letters; a character past NAME_MAX; a mark first, last or beside another mark (space, hyphen, ’); a species' name; a clan's name; a name another living
// mibi holds (the holder's name says it). `atDone` adds the mark last, which is only refused at Done. Returns null when the name can be saved, else { key: short | full | first | last | twice | species | clan | taken, holder? }.
export function nameProblem(st, m, text, atDone = true) {
  const t = String(text ?? "").replace(/'/g, "’"), cs = [...t], marks = cs.map((c) => SEPARATORS.includes(c));
  if (cs.filter((c, i) => !marks[i]).length < 2) return { key: "short" };
  if (cs.length > NAME_MAX) return { key: "full" };
  if (marks[0]) return { key: "first" };
  if (marks.some((x, i) => x && marks[i + 1])) return { key: "twice" };
  if (atDone && marks.at(-1)) return { key: "last" };
  const k = nameKey(t);
  for (const id of frameIds()) { const f = frameOf(id); if (nameKey(f.species.name) === k) return { key: "species" }; if (f.taxonomy?.clanName && nameKey(f.taxonomy.clanName) === k) return { key: "clan" }; }
  const held = st.mibis.find((x) => x !== m && !x.released && nameKey(x.name) === k); if (held) return { key: "taken", holder: held.name };
  return null;
}
// The next names of the pool, as births draw them, that this mibi could be given (not used, not held at home, not a species' or clan's name, not over the limit): n of them, nothing consumed.
export function peekNames(st, m, n = 12, pool = {}) {
  const used = new Set(usedKeys(st)), out = [];
  for (const c of namePool(pool)) {
    if (out.length >= n) break;
    if (/\d/.test(c) || [...c].length > NAME_MAX || used.has(nameKey(c)) || nameProblem(st, m, c)) continue;
    out.push(c);
  }
  return out;
}
// Saves a name: exactly the mibi's own is Keep (nothing written, nothing logged); a refused name changes nothing; otherwise the name is the mibi's (a change of case only is a rename too), what refers to the old one follows and its key is used.
export function renameMibi(st, m, text) {
  const t = String(text ?? "").replace(/'/g, "’");
  if (t === m.name) return { ok: true, kept: true, name: m.name };
  const why = nameProblem(st, m, t); if (why) return { ok: false, why };
  const old = m.name; followName(st, m, old, t); const used = usedKeys(st), k = nameKey(t); if (!used.includes(k)) used.push(k);
  logEv(st, "Renamed " + old + " to " + t);
  return { ok: true, kept: false, name: t, old };
}
// known/met as Companion indexes (the Companion reads them) follow knownIds/metIds, the Station's truth.
function syncKnown(st) {
  for (const id of st.knownIds) if (!st.metIds.includes(id)) st.metIds.push(id);
  st.known = st.knownIds.map(speciesIndex).filter((i) => i >= 0); st.met = st.metIds.map(speciesIndex).filter((i) => i >= 0);
}
export function rebuildGuide(st) {
  st.guide = {};
  for (const m of st.mibis) { const fr = frameFor(m); if (fr && m.genome) for (const ch of fr.chapters) for (const [t, looks] of chapterLooks(fr, ch, m.genome)) guideAdd(st, fr.species.id, t, looks); }
  for (const p of st.tray.concat(st.waiting)) { const fr = frameFor(p); if (fr && p.genome) for (const id of p.read) { const ch = chapterOf(fr, id); if (ch) for (const [t, looks] of chapterLooks(fr, ch, p.genome)) guideAdd(st, fr.species.id, t, looks); } }
}
export function guideAdd(st, species, traitId, looks) { const g = st.guide[species] || (st.guide[species] = {}), a = g[traitId] || (g[traitId] = []); for (const l of looks) if (!a.includes(l)) a.push(l); }
export const guideLooks = (st, species, traitId) => st.guide[species]?.[traitId] ?? [];
// A look is new in the Library (build spec 4.2) when it was found since the Library was last opened full screen: libSeen holds the guide as it stood at that open, and opening it again takes it up to date.
export const libSnapshot = (st) => JSON.parse(JSON.stringify(st.guide || {}));
// The Library's seen record is written when the player leaves the Library (game.mjs goScreen): `note` is { <species>: { <trait>: [looks] } } as taken on entry (library.mjs seenNote), added to st.libSeen look by look.
export const libRecord = (st, note) => { if (!st.libSeen || typeof st.libSeen !== "object") st.libSeen = {}; for (const [sp, traits] of Object.entries(note || {})) { const g = st.libSeen[sp] || (st.libSeen[sp] = {}); for (const [t, looks] of Object.entries(traits)) { const a = g[t] || (g[t] = []); for (const l of looks) if (!a.includes(l)) a.push(l); } } };
export const libNewLooks = (st, species, traitId) => { const seen = st.libSeen?.[species]?.[traitId] ?? []; return guideLooks(st, species, traitId).filter((l) => !seen.includes(l)); };

// The band of a crate's reach (explored of the land, `of`): thirds of it, all of it, none for a crate with no map (cargo.json regions.report.reach.thresholds)
export const reachBand = (c) => { const of = c.of | 0, x = c.explored | 0; return of <= 0 ? "" : x * 3 < of ? "underThird" : x * 3 < 2 * of ? "underTwoThirds" : x < of ? "underAll" : "all"; };

// --- what the Station can know about the Companion (read-only) -----------------------------------
export const hasWorld = (sv) => !!(sv && sv.wid && typeof sv.seed === "number");
export const docked = (st) => !!(st.dock && st.dock.docked);
export const bayCrates = (st, sv) => (sv && Array.isArray(sv.bay) ? sv.bay : []).concat(st.devBay).filter((c) => !st.accepted.includes(c.id));
export const mibiById = (st, id) => st.mibis.find((m) => m.id === id) || null;
export const podById = (st, id) => st.tray.find((p) => p.id === id) || null;
// The carried set lives on the Companion (`sv.carried`); the Station reads it and asks for changes through the request queue `st.carryReqs`.
// carriedIds is the one accessor: the Companion's carried list (or the old single `with` of a save the Companion has not migrated), as ids of the Station's mibis that are not released.
export function carriedIds(st, sv) {
  const raw = sv && Array.isArray(sv.carried) ? sv.carried : sv && sv.with != null ? [sv.with] : [];
  return raw.filter((id) => { const m = mibiById(st, id); return m && !m.released; });
}
// The Companion's partner, as the Companion picks it: its lead if carried and grown, else the first grown mibi with it, else none (exploration partnerMibi). The Caddy's lifted line names it.
export function partnerOf(st, sv, settings = DEFAULT_SETTINGS) {
  const c = carriedIds(st, sv).map((id) => mibiById(st, id)).filter(Boolean), grown = (m) => !!m && isAdult(st, m, settings), l = c.find((m) => m.id === (sv && sv.lead));
  return grown(l) ? l : c.find(grown) || null;
}
// The requests the Companion has not applied yet, in seq order. The face shows them as pending, never as carried.
export const pendingCarry = (st, sv) => (st.carryReqs || []).filter((r) => r.seq > ((sv && sv.carrySeen) || 0)).sort((a, b) => a.seq - b.seq);
// The set as it will be once every request applies (the Companion's own rules: an add is refused when full, already carried or released; a home is a no-op when not carried).
export function projectCarried(st, sv) {
  const out = carriedIds(st, sv);
  for (const r of pendingCarry(st, sv)) {
    if (r.op === "home") { const i = out.indexOf(r.id); if (i >= 0) out.splice(i, 1); }
    else { const m = mibiById(st, r.id); if (m && !m.released && !out.includes(r.id) && out.length < CARRY_MAX) out.push(r.id); }
  }
  return out;
}
export const homeMibis = (st, sv) => { const c = carriedIds(st, sv); return st.mibis.filter((m) => !m.released && !c.includes(m.id)); };
// A Station request to take a mibi with the Companion or bring it home: queued, applied by the Companion at the dock. why: "full" | "carried" | "not-carried" | "released" | "unknown".
function carryOp(st, sv, m, op) {
  if (!m || !mibiById(st, m.id)) return { ok: false, why: "unknown" };
  const proj = projectCarried(st, sv);
  if (op === "add") { if (m.released) return { ok: false, why: "released" }; if (proj.includes(m.id)) return { ok: false, why: "carried" }; if (proj.length >= CARRY_MAX) return { ok: false, why: "full" }; }
  else if (!proj.includes(m.id)) return { ok: false, why: "not-carried" };
  st.carryReqs.push({ seq: ++st.carrySeq, op, id: m.id });
  logEv(st, op === "add" ? m.name + " chosen to go with you" : m.name + " chosen to come home");
  return { ok: true };
}
export const carryAdd = (st, sv, m) => carryOp(st, sv, m, "add");
export const carryHome = (st, sv, m) => carryOp(st, sv, m, "home");
// On save: the ops the Companion has applied or refused are gone (carrySeq is never reused).
export function trimCarryReqs(st, sv) { const seen = (sv && sv.carrySeen) || 0; if (st.carryReqs.some((r) => r.seq <= seen)) st.carryReqs = st.carryReqs.filter((r) => r.seq > seen); }
// The Companion's refusal to show once on Habitat: the newest refused add (why "full") that is a Station mibi and not yet seen. Other reasons show nothing.
export function carryRefusal(st, sv) {
  const seen = st.carryRefusedSeen || 0, list = sv && Array.isArray(sv.carryRefused) ? sv.carryRefused : [];
  const r = list.filter((x) => x && x.seq > seen && x.why === "full" && mibiById(st, x.id)).sort((a, b) => b.seq - a.seq)[0];
  return r ? { seq: r.seq, id: r.id, name: mibiById(st, r.id).name } : null;
}
export function seenCarryRefusal(st, sv) { const r = carryRefusal(st, sv); if (r) st.carryRefusedSeen = r.seq; return r; }
// The stage, one definition on both pages (the Companion's index.html has the same text; the parity test proves they agree).
export function stageAt(m, turn, j, e) {
  if (m.grownTurn != null) return turn >= m.grownTurn + e ? 'elder' : 'adult';
  if (m.bonded) return 'juvenile';                       // a bonded juvenile waits (14)
  const age = turn - (m.born || 0); return age < j ? 'juvenile' : age >= j + e ? 'elder' : 'adult';
}
export const mibiStage = (st, m, settings = DEFAULT_SETTINGS) => stageAt(m, st.turn, settings.adultTurns ?? JUVENILE_TURNS, settings.elderTurns ?? ELDER_TURNS);
// Who walked with a trip record: its carried set, else (an older record) its partner.
export const tripCarried = (rec) => (Array.isArray(rec.carried) ? rec.carried : rec.partner != null ? [rec.partner] : []);
export const tierNow = (st, sv) => (st.probe && st.probe.tier) || (sv && sv.tier) || 1;
export const podName = (p) => (p.idd ? spName(p) + " pod" : "unknown pod");
// The sentence in its two halves, which are the two lines under the pod; a pod with no find has one.
export function podOriginLines(p) {
  const where = "Found " + (FOUND_WORD[p.g] || "out in the wild"), find = FIND_WORD[p.how];
  return find ? [where + ",", find.replace("{who}", p.idd ? aAn(spName(p)) : "a creature") + "."] : [where + "."];
}
export const podOrigin = (p) => podOriginLines(p).join(" ");

// --- prices ------------------------------------------------------------------------------------------
export const price = (base, settings = DEFAULT_SETTINGS) => (settings.economy === "free" ? 0 : base);
export const canPay = (st, e, d, s) => st.e >= (e || 0) && st.d >= (d || 0) && st.s >= (s || 0);
// The materials a price is short of, as icons in the order of shortText, space-separated (the form of needKey's icons): "⚡ ◆", "◆"; "" when none is short.
export const shortIcons = (st, e, d, s) => [e > st.e ? "⚡" : "", d > st.d ? "◆" : "", s > st.s ? "❀" : ""].filter(Boolean).join(" ");
export function shortText(st, e, d, s) {
  const p = []; if (e > st.e) p.push("⚡ " + (e - st.e)); if (d > st.d) p.push("◆ " + (d - st.d)); if (s > st.s) p.push("❀ " + (s - st.s));   // the icon before its figure
  return "needs " + p.join(" ") + " more";
}
// The two forms of a log line or a button: what is gained and what is spent. One place, so the answer on the wording is a one-line change (forms PLACEHOLDER until the UI designer and copywriter answer).
export const gainText = (s) => "❀ +" + s;
export const spendText = (e, d, s) => [e ? "⚡ −" + e : "", s ? "❀ −" + s : "", d ? "◆ −" + d : ""].filter(Boolean).join(" ") || "free";
// `w` the bud's wait in minutes, the last group (Create's Grow line, fix 6 N1a): "free" only when all four are 0
export const priceText = (e, d, s, w = 0) => [e ? "⚡ " + e : "", s ? "❀ " + s : "", d ? "◆ " + d : "", w ? "⧗ " + w : ""].filter(Boolean).join(" ") || "free";

// --- dock and the bay ------------------------------------------------------------------------------
export function probeNow(st, sv) {
  const c = sv || {}, tier = Math.max(c.tier || 1, st.probe ? st.probe.tier : 1), smax = TIER[tier].shield;
  if (st.probe && st.probe.seq > (c.probeSeen || 0)) return { shield: st.probe.shield, smax, tier };
  return { shield: c.shield == null ? smax : clamp(c.shield, 0, smax), smax, tier };
}
export function payMend(st, settings = DEFAULT_SETTINGS) {
  let paid = 0; const cost = price(PRICE.mend, settings);
  while (st.probe.shield < st.probe.smax && st.e >= cost) { st.e -= cost; st.probe.shield++; paid++; }
  if (paid) { st.probe.seq++; logEv(st, "Mended " + plural(paid, "plate") + (cost ? " · " + spendText(paid * cost, 0, 0) : "")); }
  return paid;
}
// The care the Companion earned, taken in at the dock and whenever the Station reads the save while docked. Max / OR only, so a repeated dock, a lift and redock and a reload change nothing; the Station never sets `bonded`
// itself and never writes a care field the Companion has not sent. Returns the ids of the mibis whose outings went up (they came home from a walk).
export function mergeCare(st, sv) {
  const home = [];
  for (const m of (sv && sv.mibis) || []) {
    const q = mibiById(st, m.id); if (!q) continue;
    const was = q.outings || 0;
    if (m.mem) q.mem = m.mem; if (m.places) q.places = m.places;
    q.outings = Math.max(was, m.outings || 0); q.notches = Math.max(q.notches || 0, m.notches || 0); q.care = Math.max(q.care || 0, m.care || 0); q.tends = Math.max(q.tends || 0, m.tends || 0);
    if (m.bondCare != null) q.bondCare = q.bondCare == null ? m.bondCare : Math.max(q.bondCare, m.bondCare);
    if (m.grownTurn != null) q.grownTurn = q.grownTurn == null ? m.grownTurn : Math.max(q.grownTurn, m.grownTurn);
    q.bonded = !!q.bonded || !!m.bonded;
    if (q.outings > was) { home.push(q.id); for (const h of m.habitsDone || []) recordHabit(st, q, h); }
  }
  for (const rec of (sv && Array.isArray(sv.trips)) ? sv.trips : []) for (const id of tripCarried(rec)) { const q = mibiById(st, id); if (q) for (const p of rec.places || []) recordWalk(st, q, p); }   // a set insert: the whole list every time is idempotent
  return home;
}
// Dock or lift: docking always works; it brings the crates and the Probe (a break mended free, else up to two plates, then 1 Energy a plate while the switch is on).
export function dockKey(st, sv, settings = DEFAULT_SETTINGS, now = Date.now()) {
  if (!hasWorld(sv) && !st.devBay.length && !st.devWorld) return { ok: false, msg: "The Companion has no world yet: set out with it first" };
  if (docked(st)) { st.dock = { docked: false, at: now }; logEv(st, "Companion lifted"); return { ok: true, lifted: true, msg: "Lifted · the Companion can set out" }; }
  st.dock = { docked: true, at: now }; st.dockN = (st.dockN || 0) + 1;
  st.turn = Math.max(st.turn, (sv && sv.turn) || 0);
  const pr = probeNow(st, sv), broke = pr.shield <= 0, floor = Math.min(DOCK_MEND_FLOOR, pr.smax);
  let sh = pr.shield, free = 0; if (broke) { free = pr.smax; sh = pr.smax; } else if (sh < floor) { free = floor - sh; sh = floor; }
  st.probe = { shield: sh, smax: pr.smax, tier: pr.tier, seq: (st.probe ? st.probe.seq : 0) + 1 };
  const paid = st.mendFull ? payMend(st, settings) : 0;
  // what came home with the Companion: the care it earned (mergeCare), the habits it did and the places it entered on the way
  const home = mergeCare(st, sv);
  const n = bayCrates(st, sv).length;
  logEv(st, "Companion docked" + (n ? " · " + plural(n, "crate") : ""));
  return { ok: true, docked: true, home, mend: { free, paid, broke, spent: paid * price(PRICE.mend, settings) }, crates: n, msg: n ? "Docked · " + plural(n, "sealed crate") + " in the bay" : broke ? "Docked · the Probe is mended free" : "Docked · the bay is empty" };
}
export function fillWells(st, settings = DEFAULT_SETTINGS, now = Date.now()) { const rack = rackSize(settings); while (st.tray.length < rack && st.waiting.length) { const p = st.waiting.shift(); p.landAt = now; st.tray.push(p); } }
// Opening the bay: one arrival per crate, in order, each accepted exactly once (the ids are kept).
export function openBay(st, sv, settings = DEFAULT_SETTINGS, now = Date.now()) { return openCrates(st, sv, settings, now, bayCrates(st, sv)); }
// The same for the crates named (a run opens them one at a time, T-20261016-216: the crates not yet opened stay sealed in the bay when the player leaves).
export function openCrates(st, sv, settings = DEFAULT_SETTINGS, now = Date.now(), cs = bayCrates(st, sv)) {
  if (!docked(st) || !cs.length) return { ok: false, plays: [] };
  const plays = [], rack = rackSize(settings);
  for (const c of cs) {
    st.accepted.push(c.id); if (st.accepted.length > 60) st.accepted.splice(0, st.accepted.length - 60);
    const top = settings.economy === "loose" && !c.dev ? settings.topUp || DEFAULT_SETTINGS.topUp : { e: 0, d: 0, s: 0 };
    st.e += (c.e | 0) + top.e; st.d += (c.d | 0) + top.d; st.s += (c.s | 0) + top.s;
    const ids = [], skipped = [];
    for (const q of c.pods || []) {
      const species = q.species ?? speciesId(q.sp), fr = frameOf(species);
      if (!fr) { skipped.push(q.id); continue; }   // a malformed record never breaks the bay; it is named, never dropped silently
      const pod = { id: c.id + ":" + q.id, sp: q.sp ?? speciesIndex(species), species, g: q.g, how: q.how, gs: q.gs >>> 0, k: q.k ?? null, n: c.n, idd: 0, newSp: 0, read: [], fresh: 1, genome: q.genome && !checkGenome(fr, q.genome).length ? q.genome : podGenome(fr, q.gs >>> 0), shed: q.shed ?? null };
      if (q.shed != null) { const rec = (st.sheds || []).find((r) => r.id === q.shed); if (rec) rec.state = "found"; }   // a shed pod opened: its record is kept for the Library
      if (st.tray.length < rack) st.tray.push(pod); else st.waiting.push(pod);
      ids.push(pod.id);
    }
    for (const sp of c.met || []) { const id = typeof sp === "string" ? sp : speciesId(sp); if (id && !st.metIds.includes(id)) st.metIds.push(id); }
    const before = st.turn; st.turn = Math.max(st.turn, c.turn | 0);
    const paid = st.mendFull && st.probe ? payMend(st, settings) : 0;
    const gained = { e: (c.e | 0) + top.e, d: (c.d | 0) + top.d, s: (c.s | 0) + top.s };   // what the crate brought, the top-up with it; the plates it paid for cost `spent` Energy
    plays.push({ c, ids, skipped, paid, spent: paid * price(PRICE.mend, settings), gained, turnFrom: before, turnTo: st.turn, top });
    logEv(st, "Crate " + c.n + " opened · " + plural(ids.length, "pod") + " · +" + gained.e + " Energy +" + gained.d + " Data +" + gained.s + " Essence" + (skipped.length ? " · not opened, no species: " + skipped.join(", ") : ""));
  }
  st.devBay = st.devBay.filter((c) => !st.accepted.includes(c.id));
  syncKnown(st);
  return { ok: true, plays };
}

// --- what a mibi has done: habits watched, places been (the-portrait.md §8) ----------------------------------------------------------
// A habit is one of the species' routine acts (the frame's `habits`). It is recorded when a resident is kept in focus for a minute of its routine (`watchResident`, the bench),
// and at the dock for what the mibi with the player did on the walk; a place is recorded once for every place the mibi entered while with the player (`recordWalk`, at the dock).
export const WATCH_MS = 60000;   // the default of settings.watchMs
// A habit only seen in the field: the bench's watch never records it (calm is felt, not watched); it is recorded at the dock from the habits the Companion's mibi did (mergeCare).
export const FIELD_ONLY_HABITS = ["calm"];
export const habitsOf = (m) => (Array.isArray(m.habits) ? m.habits : []);
// The places a mibi has been: where its pod came from, and every place it walked to.
// A founder keeps its pod's place first, then the walk order; a bred mibi's places are only the ones it walked to (its "from.g" is its parent's).
export const placesOf = (m) => [...new Set([m.from?.how === "cross" ? null : m.from?.g, ...(m.walked || [])].filter(Boolean))];
export function recordHabit(st, m, habit) {
  if (!m || !habit) return { ok: false };
  const fr = frameFor(m); if (!fr || !(fr.habits || []).includes(habit)) return { ok: false, msg: "not a habit of " + (fr ? fr.species.name : "that species") };
  if (!Array.isArray(m.habits)) m.habits = []; if (m.habits.includes(habit)) return { ok: false, again: true };
  m.habits.push(habit); logEv(st, m.name + " is seen: " + habit); return { ok: true };
}
export function recordWalk(st, m, place) {
  if (!m || !place) return { ok: false };
  if (!Array.isArray(m.walked)) m.walked = []; if (m.walked.includes(place) || m.from?.g === place) return { ok: false, again: true };
  m.walked.push(place); return { ok: true };
}
// The bench's watch: a resident kept in focus for a minute of its routine records the habit it was doing. Under a minute records nothing.
export function watchResident(st, m, habit, focusedMs) {
  if (!m || m.released) return { ok: false };
  if (!(focusedMs >= WATCH_MS)) return { ok: false, short: true };
  return recordHabit(st, m, habit);
}

// --- the bench Data trickle (the game designer's brief): a little Data a day for residents watched and pairs compared ----------------------------------------------------------------
// st.bench = { day: "YYYY-MM-DD", d (earned today), watchMs: { id: ms }, watched: [ids], compared: ["lo-hi"] }. The day is the local calendar date of `now` on the Station's clock (wall time: no bud scale, sitting wait,
// Grow now, skip or economy preset touches it); a later date resets the ledger, an earlier one keeps it. Numbers (illus., to tune): +1 Data a watch or a compare, 60 s a watch (settings.watchMs), 2 Data a day
// (settings.trickleCap; 0 is off). Nothing here reads a screen: the page calls it each frame (trickle.mjs) and the Node host can too.
export const BENCH_DATA = 1;
const dayOf = (now) => { const d = new Date(now), p = (n) => String(n).padStart(2, "0"); return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()); };
function benchLedger(st, now) {
  const day = dayOf(now);
  if (!st.bench || typeof st.bench !== "object") st.bench = { day, d: 0, watchMs: {}, watched: [], compared: [] };
  else if (day > st.bench.day) st.bench = { day, d: 0, watchMs: {}, watched: [], compared: [] };   // a later date resets; an earlier one keeps the ledger
  return st.bench;
}
export function benchToday(st, now = Date.now(), settings = DEFAULT_SETTINGS) {
  const L = benchLedger(st, now), cap = settings.trickleCap ?? 2; return { d: L.d, cap, full: L.d >= cap };
}
function benchEarn(st, L, settings, text) {
  const cap = settings.trickleCap ?? 2; if (L.d >= cap) return { earned: 0, full: true };
  L.d += BENCH_DATA; st.d += BENCH_DATA; logEv(st, "Bench · " + text + " · +" + BENCH_DATA + " Data"); return { earned: BENCH_DATA, full: L.d >= cap };
}
// The resident shown on Habitat, watched for dtMs (clamped to 250 ms a frame). At watchMs of awake time today it earns once and, once, records the first of the frame's habits it has not been seen doing.
export function benchWatch(st, sv, m, dtMs, settings = DEFAULT_SETTINGS, now = Date.now()) {
  const none = { ok: false, earned: 0, full: false };
  if (!m || m.released || carriedIds(st, sv).includes(m.id)) return none;
  const L = benchLedger(st, now), need = settings.watchMs ?? WATCH_MS; if (L.watched.includes(m.id)) return { ok: true, earned: 0, full: L.d >= (settings.trickleCap ?? 2) };
  const dt = Math.max(0, Math.min(250, +dtMs || 0)); L.watchMs[m.id] = (L.watchMs[m.id] || 0) + dt;
  if (L.watchMs[m.id] < need) return { ok: true, earned: 0, full: L.d >= (settings.trickleCap ?? 2) };
  L.watched.push(m.id);
  const fr = frameFor(m), habit = fr && (fr.habits || []).find((h) => !FIELD_ONLY_HABITS.includes(h) && !habitsOf(m).includes(h)); if (habit) recordHabit(st, m, habit);   // the first unseen habit, in frame order
  const r = settings.trickleCap === 0 ? { earned: 0, full: false } : benchEarn(st, L, settings, "watched " + m.name);
  return { ok: true, earned: r.earned, full: r.full, habit: habit ?? null };
}
// A pair compared on Cross: once per unordered pair a day. The caller says when a compare happens (the page: after a key, the cross at state 1 or more); here the pair must be two at home of one species with a chapter read on both.
export function benchCompare(st, sv, a, b, settings = DEFAULT_SETTINGS, now = Date.now()) {
  const none = { ok: false, earned: 0, full: false };
  if (!a || !b || a === b || a.id === b.id || a.released || b.released || speciesOf(a) !== speciesOf(b)) return none;
  const c = carriedIds(st, sv); if (c.includes(a.id) || c.includes(b.id)) return none;
  if (!(a.read || []).some((c) => (b.read || []).includes(c))) return none;
  const L = benchLedger(st, now), key = Math.min(a.id, b.id) + "-" + Math.max(a.id, b.id);
  if (L.compared.includes(key) || settings.trickleCap === 0) return { ok: false, earned: 0, full: L.d >= (settings.trickleCap ?? 2) };
  if (L.d >= (settings.trickleCap ?? 2)) return { ok: false, earned: 0, full: true };
  L.compared.push(key); const r = benchEarn(st, L, settings, "compared " + a.name + " and " + b.name); return { ok: true, earned: r.earned, full: r.full };
}

// --- pods: identify, read, glint, compare, return ----------------------------------------------------
export function identifyCost(st, settings = DEFAULT_SETTINGS) { return price(PRICE.identify, settings); }   // Data, always: no pod is ever identified free (st.freeId stays in the save for its shape and nothing reads it)
export function identify(st, p, settings = DEFAULT_SETTINGS) {
  if (!p || p.idd) return { ok: false };
  const fr = frameFor(p); if (!fr) return { ok: false, msg: "This pod's species has no frame in the registry" };
  const cost = identifyCost(st, settings), known = st.knownIds.includes(fr.species.id);
  if (st.d < cost) return { ok: false, msg: (known ? "Logging" : "Identifying") + " costs " + cost + " ◆ · " + shortText(st, 0, cost, 0) };
  st.d -= cost;
  if (!known) st.knownIds.push(fr.species.id); if (!st.metIds.includes(fr.species.id)) st.metIds.push(fr.species.id); syncKnown(st);
  p.idd = 1; p.seen = 1; p.fresh = 0; p.newSp = known ? 0 : 1;
  logEv(st, (known ? "Logged · " : "New species · ") + fr.species.name + (cost ? " · " + spendText(0, cost, 0) : " (free)"));
  return { ok: true, free: !cost, newSp: !known, species: fr.species.id };
}
// A chapter's read price: 1 Data a trait; half, rounded up, once it was read on an earlier pod of the species;
// the first read ever free; a read chapter is free to look at again; a sealed chapter has no price.
export function readCost(st, p, chapterId, settings = DEFAULT_SETTINGS) {
  const fr = frameFor(p), ch = fr && chapterOf(fr, chapterId); if (!ch) return null;
  if (p.read.includes(chapterId)) return 0;
  if (ch.sealed && !settings.sealedOpen) return null;
  if (!st.readEver) return 0;
  const n = ch.traits.length, half = (st.readOnce[fr.species.id] || []).includes(chapterId);
  return price((half ? Math.ceil(n / 2) : n) * PRICE.readTrait, settings);
}
export function readBlock(st, p, chapterId, settings = DEFAULT_SETTINGS) {
  const fr = frameFor(p), ch = fr && chapterOf(fr, chapterId); if (!ch) return "no such chapter";
  if (!p.idd) return "identify it first";
  if (p.read.includes(chapterId)) return null;                       // read: free to look at
  if (ch.sealed && !settings.sealedOpen) return "sealed · opens with " + chapterSeal(fr, ch);
  const cost = readCost(st, p, chapterId, settings); if (st.d < cost) return shortText(st, 0, cost, 0);
  return "";
}
export function read(st, p, chapterId, settings = DEFAULT_SETTINGS) {
  const b = readBlock(st, p, chapterId, settings); if (b) return { ok: false, msg: "Read " + chapterOf(frameFor(p), chapterId)?.name + " · " + b }; if (b === null) return { ok: false, again: true };
  const fr = frameFor(p), ch = chapterOf(fr, chapterId), cost = readCost(st, p, chapterId, settings), first = !st.readEver;
  st.d -= cost; st.readEver = true; p.read.push(chapterId);
  const once = st.readOnce[fr.species.id] || (st.readOnce[fr.species.id] = []); if (!once.includes(chapterId)) once.push(chapterId);
  p.first = p.first || [];
  const looks = chapterLooks(fr, ch, p.genome), newLooks = [];
  for (const [t, ls] of looks) { const had = guideLooks(st, fr.species.id, t); let brought = false; for (const l of ls) if (!had.includes(l)) { newLooks.push(l); brought = true; } if (brought && !p.first.includes(t)) p.first.push(t); guideAdd(st, fr.species.id, t, ls); }   // p.first: the traits whose look this pod showed first, written at read time (the page's new mark stays)
  logEv(st, "Read " + fr.species.name + " " + ch.name + " on " + p.id + (first ? " · free (the first read ever)" : cost ? " · −" + cost + " Data" : " · free") + (newLooks.length ? " · new: " + newLooks.join(", ") : ""));
  return { ok: true, cost, first, chapter: ch, newLooks };
}
// A glint: this chapter of the species has been read on some pod, this pod's chapter is unread, and this pod
// carries a look not yet seen in that species. It says "new here", never what.
export function glint(st, p, chapterId) {
  if (!p.idd || p.read.includes(chapterId)) return false;
  const fr = frameFor(p), ch = fr && chapterOf(fr, chapterId); if (!ch || !p.genome) return false;
  if (!(st.readOnce[fr.species.id] || []).includes(chapterId)) return false;
  return chapterLooks(fr, ch, p.genome).some(([t, ls]) => { const seen = guideLooks(st, fr.species.id, t); return ls.some((l) => !seen.includes(l)); });
}
// The pod that most needs the player: a new one (unidentified), then one that glints, then the first.
export const neediestPod = (st) => st.tray.find((p) => !p.idd) || st.tray.find((p) => podGlints(st, p)) || st.tray[0] || null;
export const podGlints = (st, p) => { const fr = frameFor(p); return !!fr && fr.chapters.some((c) => glint(st, p, c.id)); };
// Progress: traits read ÷ traits in chapters that are not sealed (shown only as the ring, no digits).
export function progress(p, settings = DEFAULT_SETTINGS) {
  const fr = frameFor(p); if (!fr || !p.idd) return 0;
  const open = fr.chapters.filter((c) => !c.sealed || settings.sealedOpen), all = open.reduce((a, c) => a + c.traits.length, 0);
  return all ? open.filter((c) => p.read.includes(c.id)).reduce((a, c) => a + c.traits.length, 0) / all : 1;
}
export const fullyRead = (p, settings) => p.idd && progress(p, settings) >= 1;
// Compare: two identified pods of one species; the traits read on both that differ.
export function compareDiff(st, a, b) {
  if (!a || !b || a === b || !a.idd || !b.idd || speciesOf(a) !== speciesOf(b)) return null;
  const fr = frameFor(a), diff = [];
  for (const ch of fr.chapters) if (a.read.includes(ch.id) && b.read.includes(ch.id)) for (const t of ch.traits) if (traitState(fr, t, a.genome).line !== traitState(fr, t, b.genome).line) diff.push(t.id);   // what each pod reads as: the mark never sits on two identical lines
  return diff;
}
export const canCompare = (st, a, b) => compareDiff(st, a, b) !== null;
export function returnPod(st, p, settings = DEFAULT_SETTINGS, now = Date.now()) {
  if (!st.tray.includes(p)) return { ok: false };
  st.tray = st.tray.filter((q) => q !== p); st.s += PRICE.wild;
  st.returned.push({ id: p.id, sp: p.sp, species: speciesOf(p), g: p.g, gs: p.gs >>> 0, k: p.k || null }); if (st.returned.length > 30) st.returned.shift();
  logEv(st, "Returned " + aAn(podName(p)) + " to the wild · +1 Essence"); fillWells(st, settings, now);
  return { ok: true, msg: "Back to the " + (PLACE_WORD[p.g] || "wild") + " · " + gainText(1) + " · the Companion learns at the next dock" };
}

// --- residents and the Probe (as built) --------------------------------------------------------------
// The bench's switch: whether the dock mends every plate at its price (on) or only brings it to the floor, free (off). Nothing else sets it.
export function setMendFull(st, on) { st.mendFull = !!on; logEv(st, st.mendFull ? "The dock mends every plate" : "The dock mends two plates, free"); }
export function mendPlate(st, settings = DEFAULT_SETTINGS) {
  const pr = st.probe; if (!docked(st) || !pr || pr.shield >= pr.smax) return { ok: false };
  const cost = price(PRICE.mend, settings); if (st.e < cost) return { ok: false, msg: "Mend a plate · " + shortText(st, cost, 0, 0) };
  st.e -= cost; pr.shield++; pr.seq++; logEv(st, "Mended a plate" + (cost ? " · " + spendText(cost, 0, 0) : "")); return { ok: true };
}
export const tier2Ready = (st, settings = DEFAULT_SETTINGS) => docked(st) && !!st.probe && st.probe.tier < 2 && canPay(st, price(PRICE.tier2E, settings), price(PRICE.tier2D, settings), 0);
export function installTier2(st, settings = DEFAULT_SETTINGS) {
  if (!tier2Ready(st, settings)) return { ok: false }; st.e -= price(PRICE.tier2E, settings); st.d -= price(PRICE.tier2D, settings);
  st.probe = { shield: TIER[2].shield, smax: TIER[2].shield, tier: 2, seq: st.probe.seq + 1 };
  logEv(st, "Probe tier 2 installed"); return { ok: true, msg: "Probe tier 2 · " + TIER2_GAINS.map((g) => g.text).join(", ") };
}
// The bud: M2 grows it; for now a migrated bud only reports ready when its minutes have passed.
export const budProgress = (st, settings = DEFAULT_SETTINGS, now = Date.now()) => { const B = st.bud; if (!B) return 0; if (B.early) return 1; const scale = settings.budScale === "instant" ? 1e9 : settings.budScale || 1; return clamp(((now - B.start) * scale) / (B.minutes * 60000), 0, 1); };
// The minutes a growing bud has left, rounded up and at least 1 (the Incubator's "ready in about {n} min", owner ruling 3).
export const budMinutesLeft = (st, settings, now) => { const B = st.bud; return B ? Math.max(1, Math.ceil(B.minutes * (1 - budProgress(st, settings, now)) - 1e-9)) : 0; };
export const budReady = (st, settings, now) => !!st.bud && budProgress(st, settings, now) >= 1;
// The leaves of the wait, one rule for the Incubator, its intents and Home's chamber: total the bud's minutes (at most max), full the whole minutes passed, rows 0 to rowsOf - 1 of the current leaf (rowsOf whole rows a minute: a row every 3 s at the real pace); rows is 0 once full reaches total.
export function budLeaves(st, settings, now, max, rowsOf = 20) {
  const B = st.bud; if (!B) return { total: 0, full: 0, rows: 0 };
  const total = Math.min(B.minutes || 0, max), done = budProgress(st, settings, now) * total, full = budReady(st, settings, now) ? total : Math.min(total, Math.floor(done));
  return { total, full, rows: full >= total ? 0 : Math.min(rowsOf - 1, Math.floor((done - full) * rowsOf)) };
}

// --- what most needs the player (the bottom line's right part; ✓ on the room does it) -----------------
// The words are frame.json strings.needs (one table); need() keeps the order and the facts. A count in a sentence is spelled out (a, two to six); above what the picture holds the count is dropped, never digits, never "many".
const COUNT_WORDS = ["", "a", "two", "three", "four", "five", "six"];
const countWord = (n, max) => (n >= 1 && n <= max ? COUNT_WORDS[n] : "");
const NEEDS = FRAME.strings.needs;
// a line of the table filled and cased: a dropped count leaves no space behind
const needLine = (t, values = {}) => capLine(fill(t, values).replace(/ {2,}/g, " ").trim());
// the notice of a count: its one-form at one, else its many-form with the spelled count ({N}, dropped above max)
const counted = (T, n, max) => (n === 1 ? needLine(T.noticeOne) : needLine(T.notice, { N: countWord(n, max) }));
// The Vivarium is full and something waits for a place: a ready bud, or a pod that could be incubated now (read, the price in hand).
function waitsForPlace(st, settings) {
  if (!vivFull(st, settings)) return false;
  if (budReady(st, settings)) return true;
  const grown = st.tray.filter((p) => p.idd && p.read.length && !st.bud); if (!grown.length) return false;
  const c = growCost(st, {}, settings); return canPay(st, c.e, 0, c.s);
}
// portraits: the ready portraits (sitting.mjs readyCrates), docked or away; counted apart from the walk crates, and with walk crates too the notice names both (strings.needs.crates.withPortrait).
export function need(st, sv, settings = DEFAULT_SETTINGS, ui = {}, portraits = 0) {
  const cs = bayCrates(st, sv), N = NEEDS;
  if (docked(st) && cs.length) return { text: portraits ? (cs.length === 1 ? needLine(N.crates.withPortrait.noticeOne) : needLine(N.crates.withPortrait.notice, { count: countWord(cs.length, 3) })) : counted(N.crates, cs.length, 3), act: "bay", label: needLine(N.crates.label) };
  if (waitsForPlace(st, settings)) { const add = !addRoomBlock(st, settings); return { text: needLine(N.full.notice), act: "vivarium", ring: add ? "room.new" : "resident", label: needLine(add ? N.full.labelAdd : N.full.labelMake) }; }
  if (budReady(st, settings)) return { text: needLine(N.budReady.notice), act: "inc", label: needLine(N.budReady.label) };
  if (portraits) return { text: needLine(N.portrait.notice), act: "bay", label: needLine(N.portrait.label) };
  if (ui.meet != null && mibiById(st, ui.meet)) { const m = mibiById(st, ui.meet); return { text: needLine(N.meet.notice, { name: m.name }), act: "meet", label: needLine(N.meet.label, { name: m.name }) }; }
  // needKey's one order: the unseen new pods (news) above the full rack, the seen ones below it and below a pod that can be incubated now
  const fresh = st.tray.filter((p) => !p.idd), unseen = fresh.filter((p) => !p.seen), pods = (T, n) => ({ text: counted(T, n, 6), act: "pods", label: needLine(n === 1 ? T.labelOne : T.label) });
  if (unseen.length) return pods(N.fresh, unseen.length);
  const glinting = st.tray.filter((p) => podGlints(st, p));
  if (glinting.length) return pods(N.glints, glinting.length);
  if (st.waiting.length) return { text: needLine(N.waiting.notice), act: "pods", label: needLine(N.waiting.label) };   // no count: the rack is full, whatever waits on the mat
  const grown = st.tray.filter((p) => p.idd && p.read.length && !st.bud), named = (p) => { const sp = cap(spName(p)); return { A: cap(aAn(sp).split(" ")[0]), Species: sp }; };
  let short = null;
  if (grown.length && !vivFull(st, settings)) { const p = grown[0], c = growCost(st, {}, settings); if (canPay(st, c.e, 0, c.s)) return { text: needLine(N.couldGrow.notice, named(p)), act: "pods", label: needLine(N.couldGrow.label) };
    short = { text: needLine(N.couldGrow.short, { ...named(p), icons: shortIcons(st, c.e, 0, c.s) }), act: "pods", label: needLine(N.couldGrow.label) }; }
  if (fresh.length) return pods(N.fresh, fresh.length);
  if (short) return short;
  const unread = st.tray.filter((p) => p.idd && !fullyRead(p, settings));
  if (unread.length) { const p = unread[0], ch = frameFor(p).chapters.find((c) => !p.read.includes(c.id) && (!c.sealed || settings.sealedOpen)), cost = ch ? readCost(st, p, ch.id, settings) : 0;
    return { text: cost && st.d < cost ? needLine(N.toRead.short, { ...named(p), icons: "◆" }) : needLine(N.toRead.notice, named(p)), act: "pods", label: needLine(N.toRead.label) }; }
  if (!hasWorld(sv) && !st.devBay.length && !st.tray.length && !st.waiting.length && !st.mibis.length) return { text: needLine(N.firstOut.notice), act: null };
  return { text: "", act: null };
}

// The room's one need, as facts (home.json strings.needs.order, the same order as need() above): the key of the first that holds, its count and the max the picture holds, the name or species and article it is about, the materials
// short for it, and the screen its ✓ goes to. The Home view builds the words from home.json's strings; the room's ✓ goes where `act` says. null when nothing needs the player.
export function needKey(st, sv, settings = DEFAULT_SETTINGS, ui = {}, afterCrates = false) {
  const cs = bayCrates(st, sv), art = (w) => aAn(w).split(" ")[0];
  if (!afterCrates && docked(st) && cs.length) return { key: "crates", n: cs.length, max: 3, act: "cargo" };
  if (waitsForPlace(st, settings)) return { key: "full", act: "vivarium", ring: addRoomBlock(st, settings) ? "resident" : "room.new" };   // no place is free and something waits for one: add a room (the ring on the new room) or make room (the ring on a resident)
  if (budReady(st, settings)) return { key: "budReady", act: "incubator" };
  const meet = ui.meet != null ? mibiById(st, ui.meet) : null;
  if (meet) return { key: "meet", name: meet.name, act: "meet" };
  const fresh = st.tray.filter((p) => !p.idd), unseen = fresh.filter((p) => !p.seen);
  if (unseen.length) return { key: "newPods", n: unseen.length, max: 6, act: "pods" };   // firm: an unidentified pod Pods has not drawn yet
  const glint = st.tray.filter((p) => podGlints(st, p)); if (glint.length) return { key: "glints", n: glint.length, max: 6, act: "pods" };
  if (st.waiting.length) return { key: "waitingPods", n: st.waiting.length, max: 6, act: "pods" };
  const grown = st.tray.filter((p) => p.idd && p.read.length && !st.bud);
  let couldGrow = null;
  if (grown.length && !vivFull(st, settings)) {
    const p = grown[0], c = growCost(st, {}, settings), short = [st.e < c.e ? "⚡" : "", st.s < c.s ? "❀" : ""].filter(Boolean).join(" ");
    couldGrow = { key: "couldGrow", species: spName(p), a: art(spName(p)), short: short || null, act: "pods" };
  }
  if (couldGrow && !couldGrow.short) return couldGrow;
  // the soft group: every unidentified pod has been seen (the goal takes the notice, the lamp is not amber)
  if (fresh.length) return { key: "newPods", n: fresh.length, soft: true, max: 6, act: "pods" };
  if (couldGrow) return couldGrow;
  const unread = st.tray.filter((p) => p.idd && !fullyRead(p, settings));
  if (unread.length) {
    const p = unread[0], ch = frameFor(p).chapters.find((c) => !p.read.includes(c.id) && (!c.sealed || settings.sealedOpen)), cost = ch ? readCost(st, p, ch.id, settings) : 0;
    return { key: "toRead", species: spName(p), a: art(spName(p)), short: cost && st.d < cost ? "◆" : null, act: "pods" };
  }
  return null;
}
// The one fact Idle's line says (frame.json idle.strings.order: crates, budReady, budGrowing, out; the first that holds), as a key for the view to put in words; null: none. Never a demand, and it is not needKey's order (which would hide a growing bud behind a new pod).
export function idleKey(st, sv, settings = DEFAULT_SETTINGS) {
  const cs = bayCrates(st, sv);
  if (docked(st) && cs.length) return { key: "crates", n: cs.length };
  if (budReady(st, settings)) return { key: "budReady" };
  if (st.bud) return { key: "budGrowing" };
  if (!docked(st)) { const ms = carriedIds(st, sv).map((id) => mibiById(st, id)).filter(Boolean); if (ms.length) return { key: "out", n: ms.length, name: ms[0].name }; }
  return null;
}

// A species' field guide is complete when no look is unseen and a chapter that is open has traits: the same rule as library.mjs fieldGuide(...).complete, kept here so state.mjs never imports library.mjs
// (library.mjs imports state.mjs); tests/economy-x10.test.mjs holds the two equal.
export function guideComplete(st, id, settings = DEFAULT_SETTINGS) {
  const fr = frameOf(id); if (!fr) return false;
  let unseen = 0, open = false;
  for (const ch of fr.chapters) {
    const shut = !!ch.sealed && !settings.sealedOpen && !(st.readOnce[id] || []).includes(ch.id);
    if (!shut && ch.traits.length > 0) open = true;
    for (const t of ch.traits) { const seen = guideLooks(st, id, t.id); unseen += currentLooks(fr, t).filter((l) => !seen.includes(l)).length; }
  }
  return unseen === 0 && open;
}
// --- the next goal (station-x10-economy.md ruling 4) ---------------------------------------------------
// Where a short price has to come from: "field" (a walk brings ⚡ and ❀), "bench" (the Probe bench's trickle and the mibis' watching bring ◆), "fieldOrPod" (❀ alone, with a pod in a well to return) or
// "fieldAndBench" (◆ and ⚡ or ❀); null when nothing is short. The one rule growBlockKey, needMore (Pods, Create) and goalKey's short step share.
export function shortFrom(st, e, d, s) {
  const eS = (e || 0) > st.e, dS = (d || 0) > st.d, sS = (s || 0) > st.s; if (!eS && !dS && !sS) return null;
  if (dS && (eS || sS)) return "fieldAndBench"; if (dS) return "bench";
  return sS && !eS && st.tray.length ? "fieldOrPod" : "field";
}
// What the player works toward, as facts only (no words, no rects): where needKey answers "what needs me now". The first rung that holds; `doors` is { cross: boolean } (state.mjs does not import nav.mjs): a missing
// `doors`, or `doors.cross !== true`, is a shut Cross, and then the cross and readChild rungs are skipped and the ladder falls through to the guide. Returns
// { key, ...facts, step, meanwhile, probe } or null.
export function goalKey(st, sv, settings = DEFAULT_SETTINGS, doors) {
  const crossOpen = !!doors && doors.cross === true, aT = settings.adultTurns ?? JUVENILE_TURNS;
  const living = st.mibis.filter((m) => !m.released).sort((a, b) => a.id - b.id), cs = bayCrates(st, sv), bud = st.bud;
  const short = (e, d, s) => ({ key: "short", icons: shortIcons(st, e, d, s), from: shortFrom(st, e, d, s) });
  const kn = (sp) => (sp && st.knownIds.includes(sp) ? sp : null);   // a goal fact names a species only once the player knows it (a pod of it identified, or adults of it arrived): never before the first Identify (game designer, 2026-10-15 07:56)
  const budStep = () => ({ key: "bud", ready: budReady(st, settings, Date.now()) });
  // the pod chain for one species (or, with none named, for the first pod there is)
  const chain = (species) => {
    if (docked(st) && cs.length) return { key: "openBay" };
    const mine = st.tray.filter((p) => !species || speciesOf(p) === species);
    const idd = mine.find((p) => p.idd);
    if (idd) { if (bud) return budStep(); if (vivFull(st, settings)) return { key: "full" };
      const c = growCost(st, {}, settings); return canPay(st, c.e, c.d, c.s) ? { key: "grow", species: kn(speciesOf(idd)) } : short(c.e, c.d, c.s); }
    const fresh = mine.find((p) => !p.idd);
    if (fresh) { const c = identifyCost(st, settings); return canPay(st, 0, c, 0) ? { key: "identify", species: kn(speciesOf(fresh)) } : short(0, c, 0); }
    return { key: "findPod", species: kn(species) };
  };
  const speciesIn = (m) => speciesOf(m), members = (sp) => living.filter((m) => speciesIn(m) === sp);
  const unreadOf = (m) => { const fr = frameFor(m); return fr ? fr.chapters.find((c) => !m.read.includes(c.id) && (!c.sealed || settings.sealedOpen)) : null; };
  const readStep = (m) => { const ch = unreadOf(m), cost = mibiReadCost(st, m, ch.id, settings) || 0; return st.d >= cost ? { key: "read", name: m.name } : short(0, cost, 0); };
  // the guide's step for one species: a read on a pod of it in a well (a glinting chapter first, else the cheapest unread), else identify one, else find one
  const guideStep = (sp) => {
    const cand = [];
    for (const p of st.tray) { if (!p.idd || speciesOf(p) !== sp) continue; const fr = frameOf(sp); if (!fr) continue;
      for (const ch of fr.chapters) { if (p.read.includes(ch.id) || (ch.sealed && !settings.sealedOpen)) continue; const cost = readCost(st, p, ch.id, settings); if (cost == null) continue; cand.push({ pod: p, chapter: ch.id, glint: glint(st, p, ch.id), cost }); } }
    cand.sort((a, b) => (b.glint ? 1 : 0) - (a.glint ? 1 : 0) || a.cost - b.cost);
    if (cand[0]) { const c = cand[0]; return st.d >= c.cost ? { key: "read", species: sp, pod: c.pod.id, chapter: c.chapter, glint: c.glint, cost: c.cost } : short(0, c.cost, 0); }
    if (docked(st) && cs.length) return { key: "openBay" };
    const fresh = st.tray.find((p) => !p.idd && speciesOf(p) === sp);
    if (fresh) { const c = identifyCost(st, settings); return canPay(st, 0, c, 0) ? { key: "identify", species: sp } : short(0, c, 0); }
    return { key: "findPod", species: sp };
  };
  let g = null;
  if (!living.length && !bud && !st.tray.length && !st.waiting.length && !cs.length) g = { key: "firstPod", step: { key: "goOut" } };
  else if (!living.length) g = { key: "firstMibi", step: bud ? budStep() : chain(null) };   // no species named: the chain runs on the first pod there is
  else {
    const spOrder = [...new Set(living.map(speciesIn))], count = (sp) => members(sp).length + (bud && speciesOf(bud) === sp ? 1 : 0);
    if (!spOrder.some((sp) => count(sp) >= 2)) { const m = living[0], sp = speciesIn(m); g = { key: "pair", name: m.name, species: sp, step: chain(sp) }; }
    if (!g) for (const sp of spOrder.concat(bud ? [speciesOf(bud)] : [])) {
      if (count(sp) < 2) continue;
      const adults = members(sp).filter((m) => isAdult(st, m, settings)); if (adults.length >= 2) continue;
      const two = members(sp).slice(0, 2), budIsSecond = two.length < 2 && !!bud && speciesOf(bud) === sp;
      const walkOf = (m) => Math.max(0, (m.born || 0) + aT - st.turn);
      const walks = Math.max(...two.map(walkOf), budIsSecond ? aT : 0);
      const bondedWaits = two.some((m) => m.bonded && m.grownTurn == null && !isAdult(st, m, settings));
      g = { key: "growUp", names: [two[0].name, budIsSecond ? null : two[1]?.name ?? null], walks, bondedWaits, step: budIsSecond ? budStep() : { key: "goOut" } }; break;
    }
    if (!g && crossOpen && !living.some((m) => m.from && m.from.how === "cross") && !(bud && bud.kind === "cross")) {
      for (const sp of spOrder) { const ad = members(sp).filter((m) => isAdult(st, m, settings)); if (ad.length < 2) continue;
        const [a, b] = ad, why = crossBlock(st, sv, a, b, settings), c = crossCost(settings);
        g = { key: "cross", names: [a.name, b.name], step: why ? { key: "blocked", why } : canPay(st, c.e, c.d, c.s) ? { key: "cross" } : short(c.e, c.d, c.s) }; break; }
    }
    if (!g && crossOpen) { const child = living.find((m) => m.from && m.from.how === "cross" && unreadOf(m)); if (child) g = { key: "readChild", name: child.name, step: readStep(child) }; }
    // the guide rung: the living species in lowest-mibi-id order, then the species of the pods in the wells and waiting, in tray order; the first whose guide is not complete
    if (!g) { const sp = [...new Set([...spOrder, ...st.tray.map(speciesOf), ...st.waiting.map(speciesOf)])].find((x) => x && st.knownIds.includes(x) && !guideComplete(st, x, settings)); if (sp) g = { key: "guide", species: sp, step: guideStep(sp) }; }
    // the rack rung: a pod in the rack and no rung above holds: the pod chain on the first pod there is (step lines only: the chain never goes out)
    if (!g && st.tray.length) g = { key: "rack", step: chain(null) };
  }
  // the Probe stands in when no rung holds and it is below tier 2; null only when the ladder is empty and the Probe is at tier 2
  if (!g && tierNow(st, sv) < 2) g = { key: "probe", step: st.probe && tier2Ready(st, settings) ? { key: "fit" } : { key: "goOut" }, e: [st.e, PRICE.tier2E], d: [st.d, PRICE.tier2D] };   // the Probe stands in; a save with no Probe goes out, never fits
  if (!g) return null;
  // the second goal, from growUp onward while the Probe is below tier 2
  g.probe = null; if (["growUp", "cross", "readChild", "guide", "rack"].includes(g.key) && tierNow(st, sv) < 2) g.probe = st.probe && tier2Ready(st, settings) ? { key: "fit" } : { key: "save", e: [st.e, PRICE.tier2E], d: [st.d, PRICE.tier2D] };
  if (g.probe && g.probe.key === "fit" && (["goOut", "findPod", "bud"].includes(g.step.key) || (g.key === "guide" && g.step.key !== "openBay"))) g.step = { key: "fit" };
  // the read to suggest while the step is a wait
  g.meanwhile = null;
  if (["goOut", "findPod", "bud", "short"].includes(g.step.key)) {
    const cand = [];
    for (const p of st.tray) { if (!p.idd) continue; const fr = frameFor(p); if (!fr) continue;
      for (const ch of fr.chapters) { if (p.read.includes(ch.id) || (ch.sealed && !settings.sealedOpen)) continue; const cost = readCost(st, p, ch.id, settings); if (cost == null || st.d < cost) continue; cand.push({ pod: p, chapter: ch.id, glint: glint(st, p, ch.id), cost }); } }
    cand.sort((a, b) => (b.glint ? 1 : 0) - (a.glint ? 1 : 0) || a.cost - b.cost); g.meanwhile = cand[0] ? { pod: cand[0].pod, chapter: cand[0].chapter, glint: cand[0].glint, cost: cand[0].cost } : null;
  }
  return g;
}

// The one-line warning before a spend that would leave the goal's next price short: null, or { step, species | name, icons }. `price` is { e, d, s }, what the act pays; `act` is { key: "identify" | "read" | "grow" |
// "growNow" | "mend" | "cross", pod?, mibi? } so that the act that IS the step never warns. Only identify, grow, cross, read and fit are priced; a step that is a wait, a short, a block or the guide is not. The Probe's `save` never
// warns. Cross is never the priced step while its door is shut (goalKey is asked without doors, as every caller does today).
export function goalSpendWarn(st, sv, settings = DEFAULT_SETTINGS, price = {}, act = {}, doors) {
  const g = goalKey(st, sv, settings, doors); if (!g) return null;
  const step = g.step, p = { e: price.e || 0, d: price.d || 0, s: price.s || 0 }, grow = growCost(st, {}, settings), ident = { e: 0, d: identifyCost(st, settings), s: 0 };
  let next = null, who = {}, key = step.key;
  if (step.key === "identify") { if (act.key === "identify" && act.pod && speciesOf(act.pod) === step.species) return null; if (step.species == null) return null;   // a goal that names no species has no nameless warning (ruling): silent, whether the act identifies another unknown pod or anything else
     const both = { e: grow.e, d: ident.d + grow.d, s: grow.s }; next = canPay(st, both.e, both.d, both.s) ? both : ident; who = { species: step.species }; }
  else if (step.key === "grow") { if (act.key === "grow" && act.pod && speciesOf(act.pod) === step.species) return null; next = grow; who = { species: step.species }; }
  else if (step.key === "cross") { if (act.key === "cross") return null; next = crossCost(settings); who = { name: g.names[0] }; }
  else if (step.key === "read" && g.key === "guide") { if (act.key === "read" && act.pod && speciesOf(act.pod) === step.species) return null; next = { e: 0, d: step.cost, s: 0 }; who = {}; }
  else if (step.key === "read") { const m = g.key === "readChild" || g.key === "guide" ? st.mibis.find((x) => x.name === step.name && !x.released) : null; if (!m) return null; if (act.key === "read" && act.mibi && act.mibi.id === m.id) return null;
    const fr = frameFor(m), ch = fr && fr.chapters.find((c) => !m.read.includes(c.id) && (!c.sealed || settings.sealedOpen)); if (!ch) return null; next = { e: 0, d: mibiReadCost(st, m, ch.id, settings) || 0, s: 0 }; who = { name: m.name }; }
  else if (step.key === "fit") { if (act.key === "fit") return null; next = { e: price_(PRICE.tier2E, settings), d: price_(PRICE.tier2D, settings), s: 0 }; who = {}; }
  else return null;
  if (!canPay(st, next.e, next.d, next.s)) return null;   // it cannot be paid now: the act's own short or the step's own short says so
  const after = { e: st.e - p.e, d: st.d - p.d, s: st.s - p.s }; if (canPay(after, next.e, next.d, next.s)) return null;
  return { step: key, ...who, icons: shortIcons(after, next.e, next.d, next.s) };
}
const price_ = price;
// --- developer seeds and skips (dev.mjs calls these; they go through the same rules) ------------------
// A crate of pods of one species in the Station's own dev bay: it arrives like any crate, at the dock.
export function seedCrate(st, species, count, seed, now = Date.now()) {
  const fr = frameOf(species); if (!fr) return { ok: false, msg: "no frame " + species };
  const n = (st.devN = (st.devN || 0) + 1), id = "dev-" + n + "-" + (seed >>> 0).toString(36);
  const places = ["meadow", "pond", "rock", "wood", "cave"], hows = ["calm", "shake", "ground", "slab", "meal"];
  const pods = Array.from({ length: Math.min(6, Math.max(1, count | 0)) }, (_, i) => { const gs = (Math.imul((seed >>> 0) + i * 7919, 2654435761) ^ (i * 40503)) >>> 0; return { id: "p" + i, species, sp: speciesIndex(species), g: places[(seed + i) % 5], how: hows[(seed + 2 * i) % 5], gs, k: null }; });
  const crate = { id, n, turn: st.turn, at: now, e: 3, d: 3, s: 4, pods, met: [species], explored: 0, of: 0, lines: [], dev: true };
  st.devBay.push(crate); st.devWorld = true;
  logEv(st, "Developer crate " + n + " · " + plural(pods.length, fr.species.name + " pod") + " · seed " + (seed >>> 0));
  return { ok: true, crate };
}
// A pod from a pasted genome (validated whole against its frame), straight into a well.
export function seedPodFromGenome(st, genome, settings = DEFAULT_SETTINGS, now = Date.now()) {
  const fr = genome && frameOf(genome.species); if (!fr) return { ok: false, msg: "the genome names no species in the registry" };
  const problems = checkGenome(fr, genome); if (problems.length) return { ok: false, msg: problems.slice(0, 3).join("; ") };
  const n = (st.devN = (st.devN || 0) + 1), digest = genomeDigest(genome);
  const pod = { id: "dev-" + n + ":" + digest, sp: speciesIndex(fr.species.id), species: fr.species.id, g: "meadow", how: "ground", gs: parseInt(digest.slice(-8), 16) >>> 0, k: null, n: 0, idd: 0, newSp: 0, read: [], fresh: 1, genome: structuredClone(genome) };
  if (st.tray.length < rackSize(settings)) st.tray.push(pod); else st.waiting.push(pod);
  logEv(st, "Developer pod from a genome · " + digest);
  return { ok: true, pod };
}
export function skipIdentify(st, p) { if (!p || p.idd) return; const fr = frameFor(p); p.idd = 1; p.seen = 1; p.fresh = 0; if (fr && !st.knownIds.includes(fr.species.id)) st.knownIds.push(fr.species.id); syncKnown(st); logEv(st, "Developer: identified " + p.id); }
export function skipRead(st, p, settings = DEFAULT_SETTINGS) {
  skipIdentify(st, p); const fr = frameFor(p); if (!fr) return;
  for (const ch of fr.chapters) { if (p.read.includes(ch.id) || (ch.sealed && !settings.sealedOpen)) continue; p.read.push(ch.id); const once = st.readOnce[fr.species.id] || (st.readOnce[fr.species.id] = []); if (!once.includes(ch.id)) once.push(ch.id); for (const [t, ls] of chapterLooks(fr, ch, p.genome)) guideAdd(st, fr.species.id, t, ls); }
  st.readEver = true; logEv(st, "Developer: read " + p.id + " whole");
}
export function addMaterials(st, e, d, s) { st.e += e | 0; st.d += d | 0; st.s += s | 0; logEv(st, "Developer: +" + (e | 0) + " Energy +" + (d | 0) + " Data +" + (s | 0) + " Essence"); }
// Both copies of every locus of a genome, with the trait and chapter each belongs to (the inspect panel).
export function inspectGenome(frame, genome) {
  return frame.loci.map((l) => ({ id: l.id, kind: l.kind, chapter: l.chapter, trait: l.trait, copies: genome.loci[l.id] ?? null }));
}
export const stampCodeOf = (p) => { const fr = frameFor(p); return fr && p.genome ? stampCode(fr, p.genome, p.read || []) : null; };

// --- Create: the founder from one pod (research-loop.md §5; station-build.md M2) -------------------------
// choices: { traitId: 0 | 1 | 2 } — as the pod is, only the first copy, only the second. Only read, shapeable
// look-traits roll; untouched and unread traits stay as the pod has them.
export const shapeableTraits = (p) => { const fr = frameFor(p); return fr ? fr.chapters.filter((c) => p.read.includes(c.id)).flatMap((c) => c.traits.filter((t) => t.shapeable && t.nature !== "doing")) : []; };
export function rollOptions(p, traitId) {
  const fr = frameFor(p), t = traitOf(fr, traitId); if (!t || t.nature === "doing" || !t.shapeable || !p.read.includes(fr.chapters.find((c) => c.traits.includes(t)).id)) return [];
  const same = t.loci.every((id) => { const c = p.genome.loci[id]; return c && c[0] === c[1]; });
  if (same) return [{ choice: 0, genome: p.genome, look: traitState(fr, t, p.genome).shows }];
  return [0, 1, 2].map((choice) => { const genome = choice ? shapeTrait(fr, p.genome, t.id, choice) : p.genome; return { choice, genome, look: traitState(fr, t, genome).shows }; });
}
export function founderGenome(p, choices = {}) {
  const fr = frameFor(p); let g = p.genome;
  for (const [id, c] of Object.entries(choices)) if (c && traitOf(fr, id)) g = shapeTrait(fr, g, id, c);
  return g;
}
export const changedTraits = (choices = {}) => Object.keys(choices).filter((id) => choices[id]);
// Traits whose shape won't build: reverting one of them alone makes the body build; when none does, every changed trait.
export function clashTraits(p, choices = {}, problemsOf = genomeProblems) {
  const fr = frameFor(p), changed = changedTraits(choices); if (!changed.length) return [];
  if (!problemsOf(fr, founderGenome(p, choices)).length) return [];
  const fixers = changed.filter((id) => !problemsOf(fr, founderGenome(p, { ...choices, [id]: 0 })).length);
  return fixers.length ? fixers : changed;
}
export function growCost(st, choices = {}, settings = DEFAULT_SETTINGS) {
  return { e: price(PRICE.growE, settings), s: st.firstMibi ? 0 : price(PRICE.growS, settings), d: price(PRICE.change, settings) * changedTraits(choices).length };
}
// --- the rooms: up to four rooms of eight places; a housed mibi holds m.room (0-3) and m.slot (0-7); m.bay = room * 8 + slot is written for a rolled-back Station only ---
export const housed = (st) => st.mibis.filter((m) => !m.released);
export const roomCount = (st, settings = DEFAULT_SETTINGS) => clamp(settings.rooms || st.rooms || 1, 1, ROOMS_MAX);
export const inRoom = (st, i) => housed(st).filter((m) => m.room === i).sort((a, b) => a.slot - b.slot);
// The first free place: `prefer` first if it has a free slot, else the first room with one; the lowest free slot; null when every place is taken.
export function freePlace(st, settings = DEFAULT_SETTINGS, prefer = null) {
  const taken = new Set(housed(st).map((m) => m.room * ROOM + m.slot)), n = roomCount(st, settings);
  const slotIn = (r) => { for (let s = 0; s < ROOM; s++) if (!taken.has(r * ROOM + s)) return s; return -1; };
  const order = (prefer != null && prefer >= 0 && prefer < n ? [prefer] : []).concat(Array.from({ length: n }, (_, r) => r));
  for (const r of order) { const s = slotIn(r); if (s >= 0) return { room: r, slot: s }; }
  return null;
}
export const vivFull = (st, settings = DEFAULT_SETTINGS) => freePlace(st, settings) === null;
export const roomPrice = (st, settings = DEFAULT_SETTINGS) => (st.rooms >= ROOMS_MAX ? null : price(PRICE.room[st.rooms - 1], settings));
export function addRoomBlock(st, settings = DEFAULT_SETTINGS) {
  const p = roomPrice(st, settings); if (p === null) return { key: "all" };
  return canPay(st, p, 0, 0) ? null : { key: "short", short: ["e"] };
}
export function addRoom(st, settings = DEFAULT_SETTINGS) {
  const b = addRoomBlock(st, settings); if (b) return { ok: false, ...b };
  const p = roomPrice(st, settings); st.e -= p; st.rooms++;
  logEv(st, "Added the " + ROOM_NAMES[st.rooms - 1] + " room · " + spendText(p, 0, 0));
  return { ok: true, room: st.rooms - 1 };
}
// What stops a move to room i, as a key: null when nothing does.
export function moveBlock(st, m, i, settings = DEFAULT_SETTINGS) {
  if (!m || m.released) return { key: "released" };
  if (m.room === i) return { key: "own" };
  if (!(i >= 0 && i < roomCount(st, settings))) return { key: "noRoom" };
  const there = inRoom(st, i).length; if (there >= ROOM) return { key: "full" };
  return null;
}
// A move is free and instant: the room and its lowest free slot; a mibi with the Companion moves too and keeps its place in the carried set.
export function moveMibi(st, m, i, settings = DEFAULT_SETTINGS) {
  const b = moveBlock(st, m, i, settings); if (b) return { ok: false, ...b };
  const taken = new Set(inRoom(st, i).map((x) => x.slot)); let slot = 0; while (taken.has(slot)) slot++;
  m.room = i; m.slot = slot; m.bay = i * ROOM + slot;
  logEv(st, m.name + " moves to the " + ROOM_NAMES[i] + " room");
  return { ok: true, room: i, slot };
}
// The integer-seeded generator the developer siblings and the shed pod draw from: the same seed, the same stream.
export function seededRng(seed) { let x = seed >>> 0; return () => { x = (Math.imul(x ^ (x >>> 15), 0x2c1b3c6d) + 0x9e3779b9) >>> 0; return (x >>> 8) / 16777216; }; }
// The record fields of a place: room, slot and the rollback index.
const placeOf = (p) => ({ room: p.room, slot: p.slot, bay: p.room * ROOM + p.slot });
// The words state.mjs returns when no place is free (cw C10): the message, and the plate's lines (the third only while a room can still be added).
const fullWords = (st) => ({ msg: "The Vivarium is full", plate: ["The Vivarium is full", "Return a mibi to make room"].concat(st.rooms < ROOMS_MAX ? ["or add a room"] : []) });
// Minutes a bud takes: the first ever five (the dev rule), else twenty plus one per shaped trait.
export const budMinutes = (st, nChanged, settings = DEFAULT_SETTINGS) => (st.firstMibi && settings.firstBud ? 5 : 20 + nChanged);
// What stops Grow, as a key, in the rules' order (unidentified, busy, full, clash, short): null when nothing does, else { key, short } where short is the icons of the materials the price is short of (key "short" only).
export function growBlockKey(st, p, choices = {}, settings = DEFAULT_SETTINGS, clash = null) {
  if (!p || !p.idd) return { key: "unidentified", short: null };
  if (st.bud) return { key: "busy", short: null };
  if (vivFull(st, settings)) return { key: "full", short: null };
  if ((clash ?? clashTraits(p, choices)).length) return { key: "clash", short: null };
  const cost = growCost(st, choices, settings); if (!canPay(st, cost.e, cost.d, cost.s)) return { key: "short", short: shortIcons(st, cost.e, cost.d, cost.s), from: shortFrom(st, cost.e, cost.d, cost.s) };
  return null;
}
export function growBlock(st, p, choices = {}, settings = DEFAULT_SETTINGS, clash = null) {
  const k = growBlockKey(st, p, choices, settings, clash); if (!k) return "";
  if (k.key === "unidentified") return "identify it first";
  if (k.key === "busy") return "the incubator is busy";
  if (k.key === "full") return "the Vivarium is full";
  if (k.key === "clash") { const c = clash ?? clashTraits(p, choices); return "this shape won't grow · " + c.map((id) => traitOf(frameFor(p), id)?.name ?? id).join(", "); }
  const cost = growCost(st, choices, settings); return shortText(st, cost.e, cost.d, cost.s);
}
// Grow: one pod becomes one fixed individual; the stamp is pressed; the pod goes into the incubator; the
// Grow paints nothing: the mibi is drawn from its layers (decisions 10-11 14:17); the own painting is made only at the sitting. Validated whole before anything is spent.
export function grow(st, p, choices = {}, settings = DEFAULT_SETTINGS, now = Date.now()) {
  const b = growBlock(st, p, choices, settings); if (b) return { ok: false, msg: "Incubate · " + b };
  const fr = frameFor(p), cost = growCost(st, choices, settings), changed = changedTraits(choices), genome = founderGenome(p, choices), sha = genomeSha(genome);
  st.e -= cost.e; st.s -= cost.s; st.d -= cost.d;
  const first = !!st.firstMibi, minutes = budMinutes(st, changed.length, settings);
  for (const id of changed) { const ch = fr.chapters.find((c) => c.traits.some((t) => t.id === id)); if (ch) for (const [t, ls] of chapterLooks(fr, ch, genome)) guideAdd(st, fr.species.id, t, ls); }
  const read = [...p.read]; for (const id of changed) { const ch = fr.chapters.find((c) => c.traits.some((t) => t.id === id)); if (ch && !read.includes(ch.id)) read.push(ch.id); }
  st.bud = { kind: "founder", species: fr.species.id, sp: p.sp, gs: p.gs, genome, sha, code: nameCode(sha), start: now, minutes, firstEver: first, parents: null, from: { n: p.n || 0, g: p.g, how: p.how, podId: p.id }, read, shaped: changed, early: false };
  st.firstMibi = false;
  st.tray = st.tray.filter((q) => q !== p); fillWells(st, settings, now);
  logEv(st, "Incubated " + aAn(fr.species.name) + " founder · " + st.bud.code + " · " + plural(minutes, "minute") + (changed.length ? " · shaped " + changed.join(", ") : "") + " · " + spendText(cost.e, cost.d, cost.s));
  return { ok: true, bud: st.bud, cost };
}
// A chapter that is sealed and still shut stays unknown to a founder: it opens known in every chapter but that one.
export const shutSealed = (c, settings) => !!c.sealed && !settings.sealedOpen;
// The bud's chapters. A read chapter is known from the start. A bred bud (kind "cross") keeps every other chapter unread, always: while it grows, after Grow now and skipBud, at ready and after (what
// the Station could be sure of is B.read, set from the parents). A founder (a missing kind counts as one) clears its unread chapters one by one across the wait: with U the unread chapters in frame order
// (a shut sealed chapter is never among them) and n = |U|, U[k] is known when the bud is (k + 1) / (n + 1) grown.
export function budChapterKnown(st, chapterId, settings = DEFAULT_SETTINGS, now = Date.now()) {
  const B = st.bud; if (!B) return false; if (B.read.includes(chapterId)) return true;
  if (B.kind === "cross") return false;
  const fr = frameOf(B.species), unread = fr.chapters.filter((c) => !B.read.includes(c.id) && !shutSealed(c, settings)).map((c) => c.id), k = unread.indexOf(chapterId);
  return k >= 0 && budProgress(st, settings, now) >= (k + 1) / (unread.length + 1);
}
// Grow now (research-economy.md §5, §9, decided 2026-10-09): 1 Essence for every 2 minutes left on the bud, rounded up; no Energy, no Data. The price falls as the bud grows; the
// developer's "free" preset waives it. With no bud, or a ready one, there is nothing to pay.
export function instantGrowCost(st, settings = DEFAULT_SETTINGS, now = Date.now()) {
  const B = st && st.bud; if (!B || settings.instantGrowPreset === "free") return { e: 0, d: 0, s: 0 };
  const left = B.minutes * (1 - budProgress(st, settings, now));
  return { e: 0, d: 0, s: left > 1e-9 ? price(Math.ceil(left / 2 - 1e-9), settings) : 0 };
}
// Hatch now: pays the price for the minutes left, ends the wait and opens the bud as Open does, in one press (game text 1). A place is checked before anything is spent: none free (only a developer
// path reaches it) refuses with Open's words and spends nothing, then short of Essence refuses with "Hatch now · {short}". One log line, "Hatched {name} now · ...". Returns { ok, mibi, bud, cost }.
export function instantGrow(st, settings = DEFAULT_SETTINGS, now = Date.now()) {
  if (!st.bud || budReady(st, settings, now)) return { ok: false };
  if (vivFull(st, settings)) return { ok: false, ...fullWords(st) };
  const c = instantGrowCost(st, settings, now); if (!canPay(st, c.e, c.d, c.s)) return { ok: false, msg: "Hatch now · " + shortText(st, c.e, c.d, c.s) };
  st.e -= c.e; st.d -= c.d; st.s -= c.s; const bud = st.bud; bud.early = true;
  const r = hatchBud(st, settings, now, (m, sp, room) => "Hatched " + m.name + " now · " + sp + " · juvenile · the " + room + " room · " + spendText(c.e, c.d, c.s));
  return { ok: true, mibi: r.mibi, bud, cost: c };
}
// Open: a press; the juvenile steps out fully known, into a free place, wearing the placeholder until its painting lands (M3).
export function openBud(st, sv, settings = DEFAULT_SETTINGS, now = Date.now()) {
  if (!budReady(st, settings, now)) return { ok: false, msg: "The bud is still growing" };
  if (vivFull(st, settings)) return { ok: false, ...fullWords(st) };
  return hatchBud(st, settings, now, (m, sp, room) => "Opened · " + m.name + " · " + sp + " · juvenile · the " + room + " room");
}
// The hatch both presses share (a place is already known free; `now` is the Station's clock, the mibi's `since` in ms UTC, left out while the clock is unset): the bud's mibi, known as the rules say, the field guide, the chamber emptied, the one log line `line(mibi, species name, room name)`.
function hatchBud(st, settings, now, line) {
  const place = freePlace(st, settings, st.face?.room ?? 0), B = st.bud, fr = frameOf(B.species), id = st.nextMibi++;
  const name = drawName(st);
  // a founder opens known in every chapter but a shut sealed one; a bred child only where the Station could be sure (switch parents matched), the rest read later
  const read = B.kind === "cross" ? [...(B.read || [])] : fr.chapters.filter((c) => (B.read || []).includes(c.id) || !shutSealed(c, settings)).map((c) => c.id);
  const m = { id, name, sp: B.sp, species: B.species, gs: B.gs, born: st.turn, ...(now >= GOOD_CLOCK ? { since: now } : {}), from: B.from, mem: null, outings: 0, notches: 0, bonded: false, genome: B.genome, sha: B.sha, code: B.code, read, parents: B.parents, room: place.room, slot: place.slot, bay: place.room * ROOM + place.slot, paint: B.paint ?? null, released: false, shaped: B.shaped || [] };
  for (const ch of fr.chapters) if (read.includes(ch.id)) for (const [t, ls] of chapterLooks(fr, ch, m.genome)) guideAdd(st, fr.species.id, t, ls);
  st.mibis.push(m); st.bud = null;
  logEv(st, line(m, fr.species.name, ROOM_NAMES[place.room]));
  return { ok: true, mibi: m };
}
// Return a mibi to the wild (research-economy.md §6): +2 Essence, a field-guide note, the release handed to the
// Companion at the next dock. Never a bonded mibi, one carried by the Companion or waiting to be. A young mibi may go.
export function returnMibiBlock(st, sv, m) {
  if (!m || m.released) return "already released";
  if (m.bonded) return "a bonded mibi stays";
  if (carriedIds(st, sv).includes(m.id)) return "already with you";
  if (pendingCarry(st, sv).some((r) => r.op === "add" && r.id === m.id)) return "goes at the next dock";
  return "";
}
export function returnMibi(st, sv, m, settings = DEFAULT_SETTINGS) {
  const b = returnMibiBlock(st, sv, m); if (b) return { ok: false, why: b };   // the block is the Wild module's context, not a plate
  m.released = true; m.releasedAt = st.turn; st.s += PRICE.wildMibi; m.room = m.slot = null;   // its place is free at once
  if (!Array.isArray(st.releases)) st.releases = [];
  st.releases.push({ id: m.id, name: m.name, sp: m.sp, species: m.species, k: m.from?.k ?? null, g: m.from?.g ?? null, code: m.code, turn: st.turn }); if (st.releases.length > 30) st.releases.shift();
  // the shed pod of its line (owner 2026-10-26 16:33): due no sooner than the later of its growing up and its release, plus two turns; its kinship no lower than the mibi's own
  const aT = settings.adultTurns ?? JUVENILE_TURNS, grown = m.grownTurn ?? (m.born ?? 0) + aT, own = m.genome?.origin?.kinship ?? 0, k = Math.max(SELF_KINSHIP, own);
  const genome = shedPod(frameFor(m), m, { rng: seededRng((m.id * 2654435761) >>> 0), kinship: k });
  if (!Array.isArray(st.sheds)) st.sheds = [];
  st.sheds.push({ id: m.id, name: m.name, sp: m.sp, species: m.species, g: m.from?.g ?? null, due: Math.max(grown, st.turn) + 2, kinship: k, genome, state: genome ? "due" : "none" });
  const notes = st.guideNotes || (st.guideNotes = {}); (notes[m.species] || (notes[m.species] = [])).push({ name: m.name, code: m.code, g: m.from?.g ?? null, turn: st.turn });
  logEv(st, "Returned " + m.name + " to the wild · +2 Essence · its place remembers it");
  return { ok: true, msg: m.name + " goes back to the " + (PLACE_WORD[m.from?.g] || "wild") + " · " + gainText(2) + " · the Companion takes it at the next dock" };
}
// Developer skips for M2.
export function skipBud(st, settings = DEFAULT_SETTINGS, how = "ready") { const B = st.bud; if (!B) return; if (how === "ready") B.early = true; else { B.early = false; B.start = Date.now() - (B.minutes * 60000) / 2; } logEv(st, "Developer: bud " + how); }
export function seedAdults(st, species, seed, n = 2, settings = DEFAULT_SETTINGS) {
  const fr = frameOf(species); if (!fr) return { ok: false, msg: "no frame " + species };
  const made = [];
  for (let i = 0; i < n; i++) { if (vivFull(st, settings)) break; const gs = (Math.imul((seed >>> 0) + i * 104729, 2654435761) ^ (i * 7)) >>> 0, genome = podGenome(fr, gs), sha = genomeSha(genome), id = st.nextMibi++;
    const name = drawName(st);
    const m = { id, name, sp: speciesIndex(species), species, gs, born: st.turn - JUVENILE_TURNS, ...(Date.now() >= GOOD_CLOCK ? { since: Date.now() } : {}), from: { n: 0, g: "meadow", how: "ground", podId: null }, mem: null, outings: 0, notches: 0, bonded: false, genome, sha, code: nameCode(sha), read: openChapterIds(fr), parents: null, ...placeOf(freePlace(st, settings, st.face?.room ?? 0)), paint: null, released: false, shaped: [] };
    st.mibis.push(m); made.push(m); for (const ch of fr.chapters) for (const [t, ls] of chapterLooks(fr, ch, genome)) guideAdd(st, fr.species.id, t, ls); }
  if (made.length && !st.knownIds.includes(species)) { st.knownIds.push(species); syncKnown(st); }   // a species that arrives as adults is known (its Library frame and Book open)
  st.firstMibi = false; logEv(st, "Developer: " + plural(made.length, "adult " + fr.species.name) + " · seed " + (seed >>> 0));
  return { ok: !!made.length, mibis: made, msg: made.length ? made.map((m) => m.name).join(" and ") + " live in the vivarium" : "the Vivarium is full" };
}

// --- The cross (the-cross.md, decided; station-build.md M4): two adults of one species make one child --------
import { lociOf, copyWords, copyHides, rangeWords } from "./splice.mjs";
import { cross as crossGenomes, forecast as crossForecast, kinship as pedigreeKinship, identity as genomeIdentity } from "./genome.mjs";
export const crossCost = (settings = DEFAULT_SETTINGS) => ({ e: price(PRICE.growE, settings), s: price(PRICE.growS, settings), d: 0 });
// The pedigree by id, never by digest (two mibis with equal genomes are two mibis): an id names a mibi's record in the vivarium, else the
// parent snapshot a child holds (a parent no longer in the vivarium counts as a founder beyond it).
export function genomeLookup(st) {
  const byId = new Map();
  for (const m of st.mibis) for (const p of m.parents || []) if (p && p.id != null && !byId.has(p.id)) byId.set(p.id, p);
  for (const m of st.mibis) if (m.id != null) byId.set(m.id, m);
  return (id) => byId.get(id) ?? null;
}
// An elder crosses as an adult does (a juvenile does not): for the cross and for the partner list.
export const isAdult = (st, m, settings) => { const s = mibiStage(st, m, settings); return s === "adult" || s === "elder"; };
// Out with the Companion while it is away: a mibi in the carried set cannot be crossed until the Companion docks.
export const isAway = (st, sv, m) => !!m && !docked(st) && carriedIds(st, sv).includes(m.id);
// Refused before cost, on the pick itself: the same individual, another species, not adult, released, out with the Companion (away).
export function crossBlock(st, sv, a, b, settings = DEFAULT_SETTINGS) {
  if (!a || !b) return "pick two";
  if (a === b || a.id === b.id) return "one mibi is not a pair";
  if (speciesOf(a) !== speciesOf(b)) return "another species";
  if (!isAdult(st, a, settings) || !isAdult(st, b, settings)) return "not adult";
  if (a.released || b.released) return "gone to the wild";
  if (isAway(st, sv, a) || isAway(st, sv, b)) return "away";
  if (st.bud) return "the incubator is busy";
  if (vivFull(st, settings)) return "the Vivarium is full";
  return "";
}
// The partners of an adult or an elder, in place order. A partner out with the Companion while it is away is kept in the list marked `away: true` (its face is drawn dimmed and it cannot be picked), not dropped.
export const crossPartners = (st, sv, a, settings = DEFAULT_SETTINGS) => st.mibis.filter((m) => m !== a && !m.released && speciesOf(m) === speciesOf(a) && isAdult(st, m, settings)).map((m) => (isAway(st, sv, m) ? { ...m, away: true } : m));
export function kinshipOf(st, a, b) { const k = pedigreeKinship(a, b, genomeLookup(st)); return k; }   // the mibi records: compared by id, parents by their ids
export const kinshipWord = (k) => (k <= 0 ? "wild founders · kinship 0" : k >= 0.5 ? "the same line" : k >= 0.25 ? "close kin · a quarter" : k >= 0.125 ? "half kin · an eighth" : k >= 0.0625 ? "cousins · a sixteenth" : "distant kin");
// The forecast per trait: four seeds (quarters) for a switch, a range for a blend, firm where both parents match. It shows only what the player has read (the owner, 2026-10-09: "only what you
// have read, and an indication of everything missing"): a trait whose chapter either parent has not read is marked `missing`, with no seeds, range or firmness, and names which parent
// and which chapter to read; a sealed chapter's traits stay `sealed`. `missing` counts the readable traits still unknown, `sealedTraits` the sealed ones, `unknown` both; the genome-wide
// likeness is shown only when nothing is unknown. The cross itself (`doCross`) still draws on the whole genomes: the mask is only what the screen may say.
export function forecastOf(st, a, b, settings = DEFAULT_SETTINGS) {
  const fr = frameFor(a); if (!fr || crossBlock(st, null, a, b, settings) === "another species") return null;
  const k = kinshipOf(st, a, b), opts = { kinship: k, lookup: genomeLookup(st) }, full = crossForecast(fr, a, b, opts);   // the mibi records: by id
  const traitOf = (id) => fr.chapters.flatMap((c) => c.traits).find((t) => t.id === id), chapterName = (id) => fr.chapters.find((c) => c.id === id)?.name || id;
  let loci = null;   // every locus's own outcome, computed once and only read for a trait whose chapter both parents have read
  let missing = 0, sealedTraits = 0;
  const traits = full.traits.map((t) => {
    if (t.sealed) { sealedTraits++; return t; }
    const need = [[a, "a"], [b, "b"]].filter(([m]) => !(m.read || []).includes(t.chapter)).map(([m, side]) => ({ parent: side, id: m.id, name: m.name, chapter: t.chapter, chapterName: chapterName(t.chapter) }));
    if (need.length) {   // what the read parent shows of its own copies is known to the player; nothing of the pairing is
      missing++; const tr = traitOf(t.trait), known = {};
      for (const [m, side] of [[a, "a"], [b, "b"]]) if (!need.some((q) => q.parent === side)) known[side] = { words: copyWords(fr, tr, m.genome), hides: copyHides(tr, m.genome), loci: tr.loci.length };
      return { chapter: t.chapter, trait: t.trait, name: t.name, sealed: false, locus: t.locus, kind: "missing", missing: need, known };
    }
    loci ??= lociOf(fr, a.genome, b.genome, opts);
    const tr = traitOf(t.trait);
    return { ...t, splice: { loci: tr.loci.map((id) => loci.get(id)).filter(Boolean), words: { a: copyWords(fr, tr, a.genome), b: copyWords(fr, tr, b.genome) }, hides: { a: copyHides(tr, a.genome), b: copyHides(tr, b.genome) }, ends: t.kind === "blend" ? rangeWords(fr, tr, a.genome, t.range) : null } };
  });
  // The chapters in ring order, as the splice draws them: open (both parents have read it), unread (either has not: which), or sealed (with what opens it).
  const chapters = fr.chapters.map((c) => {
    const sealed = !!c.sealed, lacking = sealed ? [] : [[a, "a"], [b, "b"]].filter(([m]) => !(m.read || []).includes(c.id)).map(([m, side]) => ({ parent: side, id: m.id, name: m.name }));
    return { id: c.id, name: c.name, state: sealed ? "sealed" : lacking.length ? "unread" : "open", lacking, findKind: c.findKind ?? null, opensWith: sealed ? chapterSeal(fr, c) : null, traits: c.traits.map((t) => t.id) };
  });
  const first = chapters.find((c) => c.state === "unread"), unknown = missing + sealedTraits;
  return { ...full, traits, chapters, firstMissing: first ? { chapter: first.id, chapterName: first.name, parents: first.lacking.map((l) => l.parent), names: first.lacking.map((l) => l.name) } : null, missing, sealedTraits, unknown, identity: unknown ? null : genomeIdentity(fr, a.genome, b.genome) };
}
// Chapters a child is known in before any read: every trait firm (switch parents match); a blend is never firm.
export function childKnownChapters(fr, fc) { return fr.chapters.filter((c) => !c.sealed && c.traits.every((t) => fc.traits.find((x) => x.trait === t.id)?.firm)).map((c) => c.id); }
// The cross: one draw, validated whole before anything is spent (not re-rolled: a child that cannot be built never exists and the clashing traits are named); then paid, the child in the bud with its real parents.
export function doCross(st, sv, a, b, settings = DEFAULT_SETTINGS, now = Date.now(), rng = Math.random) {
  const block = crossBlock(st, sv, a, b, settings); if (block) return { ok: false, msg: "Cross them · " + block };
  const cost = crossCost(settings); if (!canPay(st, cost.e, cost.d, cost.s)) return { ok: false, msg: "Cross them · " + shortText(st, cost.e, cost.d, cost.s) };
  const fr = frameFor(a), k = kinshipOf(st, a, b);
  const genome = crossGenomes(fr, a, b, { rng, kinship: k, lookup: genomeLookup(st) });   // the mibi records: refused by id, the child records its parents' ids
  const problems = genomeProblems(fr, genome);
  if (problems.length) { const clash = fr.chapters.flatMap((c) => c.traits).filter((t) => problems.some((p) => t.loci.some((id) => p.includes(id)))).map((t) => t.id); return { ok: false, clash, msg: "This child would not build · " + (clash.length ? clash.join(", ") : problems[0]) + " · nothing spent" }; }
  st.e -= cost.e; st.s -= cost.s;
  const sha = genomeSha(genome), fc = crossForecast(fr, a, b, { kinship: k }), read = childKnownChapters(fr, fc);
  const snap = (m) => ({ id: m.id, name: m.name, code: m.code, sha: m.sha, genome: structuredClone(m.genome) });
  const minutes = budMinutes(st, 0, settings);
  st.bud = { kind: "cross", species: fr.species.id, sp: a.sp, gs: null, genome, sha, code: nameCode(sha), start: now, minutes, firstEver: !!st.firstMibi, parents: [snap(a), snap(b)], kinship: k, from: { n: 0, g: a.from?.g ?? null, how: "cross", podId: null, of: [a.name, b.name] }, read, shaped: [], early: false };
  st.firstMibi = false;
  logEv(st, "Crossed " + a.name + " × " + b.name + " · " + st.bud.code + " · kinship " + Math.round(k * 1000) / 1000 + " · " + plural(minutes, "minute") + " · " + spendText(cost.e, cost.d, cost.s));
  return { ok: true, bud: st.bud, cost };
}
// Reading a child (or any mibi with chapters still unread): the same prices as a pod's chapters.
export function mibiReadCost(st, m, chapterId, settings = DEFAULT_SETTINGS) { return readCost(st, { ...m, idd: 1, read: m.read }, chapterId, settings); }
export function readMibi(st, m, chapterId, settings = DEFAULT_SETTINGS) {
  const fr = frameFor(m), ch = fr && chapterOf(fr, chapterId); if (!ch) return { ok: false };
  if (m.read.includes(chapterId)) return { ok: false, again: true };
  if (ch.sealed && !settings.sealedOpen) return { ok: false, msg: "Read " + ch.name + " · sealed · opens with " + chapterSeal(fr, ch) };
  const cost = mibiReadCost(st, m, chapterId, settings); if (st.d < cost) return { ok: false, msg: "Read " + ch.name + " · " + shortText(st, 0, cost, 0) };
  const first = !st.readEver; st.d -= cost; st.readEver = true; m.read.push(chapterId);
  const once = st.readOnce[fr.species.id] || (st.readOnce[fr.species.id] = []); if (!once.includes(chapterId)) once.push(chapterId);
  const newLooks = []; for (const [t, ls] of chapterLooks(fr, ch, m.genome)) { const had = guideLooks(st, fr.species.id, t); for (const l of ls) if (!had.includes(l)) newLooks.push(l); guideAdd(st, fr.species.id, t, ls); }
  logEv(st, "Read " + m.name + "'s " + ch.name + (first ? " · free (the first read ever)" : cost ? " · −" + cost + " Data" : " · free") + (newLooks.length ? " · new: " + newLooks.join(", ") : ""));
  return { ok: true, cost, first, chapter: ch, newLooks };
}
export const mibiFullyRead = (m, settings = DEFAULT_SETTINGS) => { const fr = frameFor(m); return !fr || fr.chapters.every((c) => m.read.includes(c.id) || (c.sealed && !settings.sealedOpen)); };
// Developer: two siblings of two unrelated adults, born adult.
export function seedSiblings(st, species, seed, settings = DEFAULT_SETTINGS) {
  const r = seedAdults(st, species, seed, 2, settings); if (!r.ok || r.mibis.length < 2) return { ok: false, msg: r.msg };
  const [a, b] = r.mibis, fr = frameOf(species), made = [];
  const rng = seededRng(seed);
  for (let i = 0; i < 2 && !vivFull(st, settings); i++) {
    let genome = null; for (let t = 0; t < 8 && !genome; t++) { const g = crossGenomes(fr, a.genome, b.genome, { rng, kinship: 0 }); if (!genomeProblems(fr, g).length) genome = g; }
    if (!genome) break;
    const sha = genomeSha(genome), id = st.nextMibi++, name = drawName(st), read = childKnownChapters(fr, crossForecast(fr, a.genome, b.genome, { kinship: 0 }));   // the rule doCross uses for B.read
    const snap = (m) => ({ id: m.id, name: m.name, code: m.code, sha: m.sha, genome: structuredClone(m.genome) });
    const m = { id, name, sp: a.sp, species, gs: null, born: st.turn - JUVENILE_TURNS, ...(Date.now() >= GOOD_CLOCK ? { since: Date.now() } : {}), from: { n: 0, g: a.from.g, how: "cross", podId: null, of: [a.name, b.name] }, mem: null, outings: 0, notches: 0, bonded: false, genome, sha, code: nameCode(sha), read, parents: [snap(a), snap(b)], ...placeOf(freePlace(st, settings, st.face?.room ?? 0)), paint: null, released: false, shaped: [] };
    st.mibis.push(m); made.push(m); for (const ch of fr.chapters) for (const [t, ls] of chapterLooks(fr, ch, genome)) guideAdd(st, fr.species.id, t, ls);
  }
  logEv(st, "Developer: siblings " + made.map((m) => m.name).join(" and ") + " of " + a.name + " and " + b.name);
  return { ok: made.length === 2, parents: [a, b], mibis: made, msg: made.length === 2 ? made.map((m) => m.name).join(" and ") + ", siblings of " + a.name + " and " + b.name : "no place free for both siblings" };
}
