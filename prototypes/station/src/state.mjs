// The Station's state: the save's Station part (`st` under mb-save-v8) and every rule as a pure
// function over it. No drawing, no DOM: the tests run this in Node. Screens call these and read
// the results; presentation events come back as return values, never as side effects on a renderer.
// The Companion page owns every top-level field of the save and reads these fields of `st`:
// accepted, dockN, known, probe, withReq, returned, and each mibi's id, name, sp, born, from, bonded.
// Those keep their shape (station-build.md §2.3).
import { frameOf, speciesIndex, speciesId, podGenome, chapterOf, chapterLooks, chapterSeal, genomeSha, nameCode, stampCode, checkGenome, genomeDigest, traitOf, traitState, shapeTrait, genomeProblems } from "./genome.mjs";

export const ST_SCHEMA = 2;
export const SAVE_KEY = "mb-save-v8", SAVE_V = 8, V7_KEY = "mb-exploration-v7";
export const OLD_SAVE_KEYS = ["mb-exploration-v1", "mb-exploration-v2", "mb-exploration-v3", "mb-exploration-v4", "mb-exploration-v5", "mb-exploration-v6", V7_KEY];
export const DEV_KEY = "mb-station-dev";
// The decided prices (research-economy.md §2).
export const PRICE = { identify: 1, readTrait: 1, change: 1, growE: 2, growS: 4, mend: 1, tier2E: 12, tier2D: 4, wild: 1, wildMibi: 2 };
export const RACK = 6, BAY = 3, BAYS = 6;
export const TIER = { 1: { shield: 3 }, 2: { shield: 4 } };
export const JUVENILE_TURNS = 2, ELDER_TURNS = 6;
export const MIBI_NAMES = ["Dot", "Moss", "Bean", "Fig", "Nib", "Tuft", "Pebble", "Wren", "Pip", "Sorrel", "Burr", "Quill"];
export const PLACE_WORD = { meadow: "meadow", pond: "pond edge", rock: "rock field", wood: "wood", cave: "cave" };
// The origin line is one sentence: "Found <where>, <what happened>." Each half is at most 24 characters with its comma or full stop, so the sentence breaks after the comma (design/style-guide/station-layouts.md, Pods, Origin).
export const FOUND_WORD = { meadow: "in the meadow", pond: "at the pond edge", rock: "on the rock field", wood: "in the wood", cave: "in the cave" };
export const FIND_WORD = { shake: "as {who} shook dry", calm: "as {who} felt safe", curl: "as {who} curled up", meal: "as {who} ate well", slab: "it lay under a slab", ground: "it lay buried", deep: "it lay deep below", cave: "it lay buried" };
// Developer settings (their own key, never in the shared save). The economy is loose by default (decided 2026-10-08, for testing).
export const DEFAULT_SETTINGS = { economy: "loose", topUp: { e: 2, d: 3, s: 2 }, sealedOpen: false, bays: BAYS, rack: RACK, budScale: 1, firstBud: true, sittingWait: "hours", adultTurns: JUVENILE_TURNS, mockDelay: 20, growCap: 10, painter: "mock", instantGrowPreset: "1e2s", instantGrow: { e: 1, d: 0, s: 2 } };

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const plural = (n, w, p) => n + " " + (n === 1 ? w : p || w + "s");
export const aAn = (w) => (/^[aeiou]/i.test(w) ? "an " : "a ") + w;
export const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

// --- the record ------------------------------------------------------------------------------------
export function freshSt(wid, turn, now = Date.now()) {
  return { schema: ST_SCHEMA, wid: wid == null ? null : wid, at: now, turn: turn || 0, e: 0, d: 0, s: 0,
    tray: [], waiting: [], accepted: [], devBay: [], known: [], met: [], knownIds: [], metIds: [], readOnce: {}, guide: {}, readEver: false, freeId: false, firstMibi: true,
    mibis: [], nextMibi: 1, nameN: 0, bud: null, bays: BAYS, sitting: null, moments: {}, welcomeGiven: false, wish: {}, outbox: [],
    dock: { docked: false, at: now }, dockN: 0, withReq: null, probe: null, mendFull: true, returned: [], log: [] };
}
export function logEv(st, t) { st.log.push("T" + (st.turn + 1) + " · " + t); if (st.log.length > 60) st.log.splice(0, st.log.length - 60); }

// A pod's or mibi's frame: by species id, else by the Companion's index.
export const speciesOf = (x) => x.species ?? speciesId(x.sp);
export const frameFor = (x) => frameOf(speciesOf(x));
export const spName = (x) => frameFor(x)?.species.name ?? "unknown";
const mibiFromGenome = (frame, genome) => {
  const sha = genomeSha(genome);
  return { genome, sha, code: nameCode(sha), read: frame.chapters.map((c) => c.id) };
};
// The migration of a v8 `st` written by the stand-in (schema 1) to schema 2: once, forward only, logged.
// Pods keep their identity (the genome is sampled from the pod's seed); studies start again; an existing
// mibi becomes a founder from its seed, fully read. The Companion-read fields keep their shape.
export function migrate(st, now = Date.now()) {
  if (!st || st.schema >= ST_SCHEMA) return st;
  const out = Object.assign(freshSt(st.wid, st.turn, now), st);
  out.schema = ST_SCHEMA;
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
    const q = { id: m.id, name: m.name, sp: m.sp, species: speciesOf(m), gs: m.gs >>> 0, born: m.born || 0, from: m.from || { n: 0, g: "", how: "" }, mem: m.mem || null, outings: m.outings || 0, notches: m.notches || 0, bonded: !!m.bonded, places: m.places,
      parents: null, bay: i, paint: null, released: false };
    const fr = frameOf(q.species); if (fr) Object.assign(q, mibiFromGenome(fr, podGenome(fr, q.gs)));
    return q;
  });
  out.bud = null;
  if (st.inc && st.inc.m) { const m = st.inc.m, species = speciesOf(m), fr = frameOf(species);
    if (fr) { const genome = podGenome(fr, m.gs >>> 0); out.bud = { kind: "founder", species, sp: m.sp, genome, sha: genomeSha(genome), start: st.inc.start, minutes: st.inc.mins || 5, firstEver: false, parents: null, from: m.from, read: fr.chapters.map((c) => c.id) }; } }
  out.bays = BAYS; out.sitting = null; out.moments = {}; out.welcomeGiven = false; out.wish = {}; out.outbox = []; out.devBay = [];
  delete out.seen; delete out.studiedW; delete out.studyPaid; delete out.inc;
  rebuildGuide(out);
  logEv(out, `Save migrated to the research loop (schema ${ST_SCHEMA})` + (notes.length ? " · " + notes.join(" · ") : ""));
  return out;
}
// What a record may lack after an older write.
export function normalize(st, now = Date.now()) {
  for (const k of ["tray", "waiting", "accepted", "devBay", "known", "met", "knownIds", "metIds", "mibis", "returned", "log", "outbox", "releases"]) if (!Array.isArray(st[k])) st[k] = [];
  for (const k of ["readOnce", "guide", "moments", "wish", "guideNotes"]) if (!st[k] || typeof st[k] !== "object") st[k] = {};
  st.dock = st.dock || { docked: false, at: now }; if (!st.bays) st.bays = BAYS;
  for (const p of st.tray.concat(st.waiting)) { p.species = speciesOf(p); if (!Array.isArray(p.read)) p.read = []; if (!Array.isArray(p.first)) p.first = [];   /* p.first (the traits whose look this pod showed first) is optional in a save: an older pod loads with none and shows no mark; no schema bump, the default is the migration */ const fr = frameFor(p); if (fr && !p.genome) p.genome = podGenome(fr, p.gs >>> 0); }
  for (const m of st.mibis) { m.species = speciesOf(m); const fr = frameFor(m); if (fr && !m.genome) Object.assign(m, mibiFromGenome(fr, podGenome(fr, m.gs >>> 0))); if (!m.from) m.from = { n: 0, g: "", how: "" }; }
  syncKnown(st);
  return st;
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

// --- what the Station can know about the Companion (read-only) -----------------------------------
export const hasWorld = (sv) => !!(sv && sv.wid && typeof sv.seed === "number");
export const docked = (st) => !!(st.dock && st.dock.docked);
export const bayCrates = (st, sv) => (sv && Array.isArray(sv.bay) ? sv.bay : []).concat(st.devBay).filter((c) => !st.accepted.includes(c.id));
export const withId = (sv) => (sv && sv.with != null ? sv.with : null);
export const mibiById = (st, id) => st.mibis.find((m) => m.id === id) || null;
export const podById = (st, id) => st.tray.find((p) => p.id === id) || null;
export function effWithId(st, sv) { const r = st.withReq; if (r && docked(st) && r.seq > ((sv && sv.withSeen) || 0)) return r.id; return withId(sv); }
export function pendingWith(st, sv) { const r = st.withReq; return r && r.seq > ((sv && sv.withSeen) || 0) && r.id !== withId(sv) ? mibiById(st, r.id) : null; }
export const atHome = (st, sv) => st.mibis.filter((m) => m.id !== effWithId(st, sv) && !m.released);
export function mibiStage(st, m, settings = DEFAULT_SETTINGS) { const age = st.turn - (m.born || 0), j = settings.adultTurns ?? JUVENILE_TURNS; return age < j ? "juvenile" : age >= JUVENILE_TURNS + ELDER_TURNS ? "elder" : "adult"; }
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
export function shortText(st, e, d, s) {
  const p = []; if (e > st.e) p.push(e - st.e + " ⚡"); if (d > st.d) p.push(d - st.d + " ◆"); if (s > st.s) p.push(s - st.s + " ❀");
  return "needs " + p.join(" ") + " more";
}
export const priceText = (e, d, s) => [e ? e + " ⚡" : "", s ? s + " ❀" : "", d ? d + " ◆" : ""].filter(Boolean).join(" ") || "free";

// --- dock and the bay ------------------------------------------------------------------------------
export function probeNow(st, sv) {
  const c = sv || {}, tier = Math.max(c.tier || 1, st.probe ? st.probe.tier : 1), smax = TIER[tier].shield;
  if (st.probe && st.probe.seq > (c.probeSeen || 0)) return { shield: st.probe.shield, smax, tier };
  return { shield: c.shield == null ? smax : clamp(c.shield, 0, smax), smax, tier };
}
export function payMend(st, settings = DEFAULT_SETTINGS) {
  let paid = 0; const cost = price(PRICE.mend, settings);
  while (st.probe.shield < st.probe.smax && st.e >= cost) { st.e -= cost; st.probe.shield++; paid++; }
  if (paid) { st.probe.seq++; logEv(st, "Mended " + plural(paid, "plate") + (cost ? " · −" + paid * cost + " Energy" : "")); }
  return paid;
}
// Dock or lift: docking always works; it brings the crates and the Probe (a break mended free, else up to two plates, then 1 Energy a plate while the switch is on).
export function dockKey(st, sv, settings = DEFAULT_SETTINGS, now = Date.now()) {
  if (!hasWorld(sv) && !st.devBay.length && !st.devWorld) return { ok: false, msg: "No Companion world yet · open the Companion page first, or seed a crate in the developer panel" };
  if (docked(st)) { st.dock = { docked: false, at: now }; logEv(st, "Companion lifted"); return { ok: true, lifted: true, msg: "Lifted · the Companion can set out" }; }
  st.dock = { docked: true, at: now }; st.dockN = (st.dockN || 0) + 1;
  st.turn = Math.max(st.turn, (sv && sv.turn) || 0);
  const pr = probeNow(st, sv), broke = pr.shield <= 0, floor = Math.min(2, pr.smax);
  let sh = pr.shield, free = 0; if (broke) { free = pr.smax; sh = pr.smax; } else if (sh < floor) { free = floor - sh; sh = floor; }
  st.probe = { shield: sh, smax: pr.smax, tier: pr.tier, seq: (st.probe ? st.probe.seq : 0) + 1 };
  const paid = st.mendFull ? payMend(st, settings) : 0;
  for (const m of (sv && sv.mibis) || []) { const q = mibiById(st, m.id); if (q) { if (m.mem) q.mem = m.mem; q.outings = Math.max(q.outings || 0, m.outings || 0); q.notches = Math.max(q.notches || 0, m.notches || 0); q.places = m.places || q.places; } }
  const n = bayCrates(st, sv).length;
  logEv(st, "Companion docked" + (n ? " · " + plural(n, "crate") : ""));
  return { ok: true, docked: true, mend: { free, paid, broke }, crates: n, msg: n ? "Docked · " + plural(n, "sealed crate") + " in the bay" : broke ? "Docked · the Probe is mended free" : "Docked · the bay is empty" };
}
export function fillWells(st, settings = DEFAULT_SETTINGS, now = Date.now()) { const rack = settings.rack || RACK; while (st.tray.length < rack && st.waiting.length) { const p = st.waiting.shift(); p.landAt = now; st.tray.push(p); } }
// Opening the bay: one arrival per crate, in order, each accepted exactly once (the ids are kept).
export function openBay(st, sv, settings = DEFAULT_SETTINGS, now = Date.now()) {
  const cs = bayCrates(st, sv); if (!docked(st) || !cs.length) return { ok: false, plays: [] };
  const plays = [], rack = settings.rack || RACK;
  for (const c of cs) {
    st.accepted.push(c.id); if (st.accepted.length > 60) st.accepted.splice(0, st.accepted.length - 60);
    const top = settings.economy === "loose" && !c.dev ? settings.topUp || DEFAULT_SETTINGS.topUp : { e: 0, d: 0, s: 0 };
    st.e += (c.e | 0) + top.e; st.d += (c.d | 0) + top.d; st.s += (c.s | 0) + top.s;
    const ids = [];
    for (const q of c.pods || []) {
      const species = q.species ?? speciesId(q.sp), fr = frameOf(species);
      if (!fr) continue;   // a malformed record never breaks the bay
      const pod = { id: c.id + ":" + q.id, sp: q.sp ?? speciesIndex(species), species, g: q.g, how: q.how, gs: q.gs >>> 0, k: q.k ?? null, n: c.n, idd: 0, newSp: 0, read: [], fresh: 1, genome: q.genome && !checkGenome(fr, q.genome).length ? q.genome : podGenome(fr, q.gs >>> 0) };
      if (st.tray.length < rack) st.tray.push(pod); else st.waiting.push(pod);
      ids.push(pod.id);
    }
    for (const sp of c.met || []) { const id = typeof sp === "string" ? sp : speciesId(sp); if (id && !st.metIds.includes(id)) st.metIds.push(id); }
    const before = st.turn; st.turn = Math.max(st.turn, c.turn | 0);
    const paid = st.mendFull && st.probe ? payMend(st, settings) : 0;
    plays.push({ c, ids, paid, turnFrom: before, turnTo: st.turn, top });
    logEv(st, "Crate " + c.n + " opened · " + plural((c.pods || []).length, "pod") + " · +" + ((c.e | 0) + top.e) + " Energy +" + ((c.d | 0) + top.d) + " Data +" + ((c.s | 0) + top.s) + " Essence");
  }
  st.devBay = st.devBay.filter((c) => !st.accepted.includes(c.id));
  syncKnown(st);
  return { ok: true, plays };
}

// --- pods: identify, read, glint, compare, return ----------------------------------------------------
export function identifyCost(st, settings = DEFAULT_SETTINGS) { return st.freeId ? price(PRICE.identify, settings) : 0; }
export function identify(st, p, settings = DEFAULT_SETTINGS) {
  if (!p || p.idd) return { ok: false };
  const fr = frameFor(p); if (!fr) return { ok: false, msg: "This pod's species has no frame in the registry" };
  const cost = identifyCost(st, settings), known = st.knownIds.includes(fr.species.id);
  if (st.e < cost) return { ok: false, msg: (known ? "Logging" : "Identifying") + " costs " + cost + " ⚡ · " + shortText(st, cost, 0, 0) };
  if (!st.freeId) st.freeId = true; st.e -= cost;
  if (!known) st.knownIds.push(fr.species.id); if (!st.metIds.includes(fr.species.id)) st.metIds.push(fr.species.id); syncKnown(st);
  p.idd = 1; p.fresh = 0; p.newSp = known ? 0 : 1;
  logEv(st, (known ? "Logged · " : "New species · ") + fr.species.name + (cost ? " · −" + cost + " Energy" : " (free)"));
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
  for (const ch of fr.chapters) if (a.read.includes(ch.id) && b.read.includes(ch.id)) for (const t of ch.traits) if (t.loci.some((id) => JSON.stringify([...a.genome.loci[id]].sort()) !== JSON.stringify([...b.genome.loci[id]].sort()))) diff.push(t.id);
  return diff;
}
export const canCompare = (st, a, b) => compareDiff(st, a, b) !== null;
export function returnPod(st, p, settings = DEFAULT_SETTINGS, now = Date.now()) {
  if (!st.tray.includes(p)) return { ok: false };
  st.tray = st.tray.filter((q) => q !== p); st.s += PRICE.wild;
  st.returned.push({ id: p.id, sp: p.sp, g: p.g, k: p.k || null }); if (st.returned.length > 30) st.returned.shift();
  logEv(st, "Returned " + aAn(podName(p)) + " to the wild · +1 Essence"); fillWells(st, settings, now);
  return { ok: true, msg: "Back to the " + (PLACE_WORD[p.g] || "wild") + " · +1 ❀ · the Companion learns at the next dock" };
}

// --- residents and the Probe (as built) --------------------------------------------------------------
export function takeWith(st, sv, m) {
  if (!m || m.id === effWithId(st, sv)) return { ok: false };
  const prev = mibiById(st, effWithId(st, sv));
  st.withReq = { id: m.id, seq: (st.withReq ? st.withReq.seq : 0) + 1 };
  logEv(st, m.name + " chosen to go with you");
  return { ok: true, msg: docked(st) ? m.name + " goes into the Companion" + (prev ? " · " + prev.name + " comes home" : "") : m.name + " goes with you at the next dock" };
}
export const bondOffered = (m) => !!m && !m.bonded && (m.outings || 0) >= 1;
export function bond(st, m) { m.bonded = true; logEv(st, "Bonded with " + m.name); return { ok: true, msg: m.name + " and you are bonded · a small heart" }; }
export function mendPlate(st, settings = DEFAULT_SETTINGS) {
  const pr = st.probe; if (!docked(st) || !pr || pr.shield >= pr.smax) return { ok: false };
  const cost = price(PRICE.mend, settings); if (st.e < cost) return { ok: false, msg: "Mend a plate · " + shortText(st, cost, 0, 0) };
  st.e -= cost; pr.shield++; pr.seq++; logEv(st, "Mended a plate" + (cost ? " · −" + cost + " Energy" : "")); return { ok: true };
}
export const tier2Ready = (st, settings = DEFAULT_SETTINGS) => docked(st) && !!st.probe && st.probe.tier < 2 && canPay(st, price(PRICE.tier2E, settings), price(PRICE.tier2D, settings), 0);
export function installTier2(st, settings = DEFAULT_SETTINGS) {
  if (!tier2Ready(st, settings)) return { ok: false }; st.e -= price(PRICE.tier2E, settings); st.d -= price(PRICE.tier2D, settings);
  st.probe = { shield: TIER[2].shield, smax: TIER[2].shield, tier: 2, seq: st.probe.seq + 1 };
  logEv(st, "Probe tier 2 installed"); return { ok: true, msg: "Probe tier 2 · reaches further, carries 3 pods, reads the deep" };
}
// The bud: M2 grows it; for now a migrated bud only reports ready when its minutes have passed.
export const budProgress = (st, settings = DEFAULT_SETTINGS, now = Date.now()) => { const B = st.bud; if (!B) return 0; if (B.early) return 1; const scale = settings.budScale === "instant" ? 1e9 : settings.budScale || 1; return clamp(((now - B.start) * scale) / (B.minutes * 60000), 0, 1); };
export const budReady = (st, settings, now) => !!st.bud && budProgress(st, settings, now) >= 1;

// --- what most needs the player (the bottom line's right part; ✓ on the room does it) -----------------
export function need(st, sv, settings = DEFAULT_SETTINGS, ui = {}) {
  const cs = bayCrates(st, sv);
  if (docked(st) && cs.length) return { text: plural(cs.length, "crate") + " in the bay", act: "bay", label: "Open the bay · " + plural(cs.length, "crate") };
  if (budReady(st, settings)) return { text: "the bud is ready", act: "inc", label: "Open the incubator" };
  if (ui.meet != null && mibiById(st, ui.meet)) { const m = mibiById(st, ui.meet); return { text: "meet " + m.name, act: "meet", label: "Meet " + m.name }; }
  const fresh = st.tray.filter((p) => !p.idd);
  if (fresh.length) return { text: fresh.length === 1 ? "a new pod waits" : plural(fresh.length, "new pod") + " wait", act: "pods", label: "Look at the new pod" + (fresh.length > 1 ? "s" : "") };
  const glinting = st.tray.filter((p) => podGlints(st, p));
  if (glinting.length) return { text: glinting.length === 1 ? "a pod glints" : plural(glinting.length, "pod") + " glint", act: "pods", label: "Look at the pods" };
  if (st.waiting.length) return { text: plural(st.waiting.length, "pod") + " wait sealed · free a well", act: "pods", label: "Look at the pods" };
  const grown = st.tray.filter((p) => p.idd && p.read.length && !st.bud);
  if (grown.length && !bayFull(st, settings)) { const p = grown[0], c = growCost(st, {}, settings); return { text: aAn(spName(p)) + " pod could grow" + (canPay(st, c.e, 0, c.s) ? "" : " · " + shortText(st, c.e, 0, c.s).replace(" more", "")), act: "pods", label: "Look at the pods" }; }
  const unread = st.tray.filter((p) => p.idd && !fullyRead(p, settings));
  if (unread.length) { const p = unread[0], ch = frameFor(p).chapters.find((c) => !p.read.includes(c.id) && (!c.sealed || settings.sealedOpen)), cost = ch ? readCost(st, p, ch.id, settings) : 0;
    return { text: aAn(spName(p)) + " pod waits" + (cost && st.d < cost ? " · needs " + (cost - st.d) + " ◆" : ""), act: "pods", label: "Look at the pods" }; }
  const b = st.mibis.find(bondOffered); if (b) return { text: b.name + " could bond", act: "hab", id: b.id, label: "Visit " + b.name };
  if (st.bud) return { text: "a bud is growing", act: "inc", label: "Look at the incubator" };
  if (!hasWorld(sv)) return { text: "open the Companion page", act: null };
  return { text: "", act: null };
}

// --- developer seeds and skips (dev.mjs calls these; they go through the same rules) ------------------
// A crate of pods of one species in the Station's own dev bay: it arrives like any crate, at the dock.
export function seedCrate(st, species, count, seed, now = Date.now()) {
  const fr = frameOf(species); if (!fr) return { ok: false, msg: "no frame " + species };
  const n = (st.devN = (st.devN || 0) + 1), id = "dev-" + n + "-" + (seed >>> 0).toString(36);
  const places = ["meadow", "pond", "rock", "wood", "cave"], hows = ["calm", "shake", "ground", "slab", "meal"];
  const pods = Array.from({ length: Math.max(1, count | 0) }, (_, i) => { const gs = (Math.imul((seed >>> 0) + i * 7919, 2654435761) ^ (i * 40503)) >>> 0; return { id: "p" + i, species, sp: speciesIndex(species), g: places[(seed + i) % 5], how: hows[(seed + 2 * i) % 5], gs, k: null }; });
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
  if (st.tray.length < (settings.rack || RACK)) st.tray.push(pod); else st.waiting.push(pod);
  logEv(st, "Developer pod from a genome · " + digest);
  return { ok: true, pod };
}
export function skipIdentify(st, p) { if (!p || p.idd) return; const fr = frameFor(p); p.idd = 1; p.fresh = 0; if (fr && !st.knownIds.includes(fr.species.id)) st.knownIds.push(fr.species.id); syncKnown(st); logEv(st, "Developer: identified " + p.id); }
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
export const bayCount = (st, settings = DEFAULT_SETTINGS) => settings.bays || st.bays || BAYS;
export const housed = (st) => st.mibis.filter((m) => !m.released);
export const bayFull = (st, settings = DEFAULT_SETTINGS) => housed(st).length >= bayCount(st, settings);
export const freeBay = (st, settings = DEFAULT_SETTINGS) => { const taken = new Set(housed(st).map((m) => m.bay)); for (let i = 0; i < bayCount(st, settings); i++) if (!taken.has(i)) return i; return -1; };
// Minutes a bud takes: the first ever five (the dev rule), else twenty plus one per shaped trait.
export const budMinutes = (st, nChanged, settings = DEFAULT_SETTINGS) => (st.firstMibi && settings.firstBud ? 5 : 20 + nChanged);
export function growBlock(st, p, choices = {}, settings = DEFAULT_SETTINGS, clash = null) {
  if (!p || !p.idd) return "identify it first";
  if (st.bud) return "the incubator is busy";
  if (bayFull(st, settings)) return "no bay free · return one";
  const c = clash ?? clashTraits(p, choices); if (c.length) return "this shape won't grow · " + c.map((id) => traitOf(frameFor(p), id)?.name ?? id).join(", ");
  const cost = growCost(st, choices, settings); if (!canPay(st, cost.e, cost.d, cost.s)) return shortText(st, cost.e, cost.d, cost.s);
  return "";
}
// Grow: one pod becomes one fixed individual; the stamp is pressed; the pod goes into the incubator; the
// genome joins the outbox for the Caddy service (M3). Validated whole before anything is spent.
export function grow(st, p, choices = {}, settings = DEFAULT_SETTINGS, now = Date.now()) {
  const b = growBlock(st, p, choices, settings); if (b) return { ok: false, msg: "Grow it · " + b };
  const fr = frameFor(p), cost = growCost(st, choices, settings), changed = changedTraits(choices), genome = founderGenome(p, choices), sha = genomeSha(genome);
  st.e -= cost.e; st.s -= cost.s; st.d -= cost.d;
  const first = !!st.firstMibi, minutes = budMinutes(st, changed.length, settings);
  for (const id of changed) { const ch = fr.chapters.find((c) => c.traits.some((t) => t.id === id)); if (ch) for (const [t, ls] of chapterLooks(fr, ch, genome)) guideAdd(st, fr.species.id, t, ls); }
  const read = [...p.read]; for (const id of changed) { const ch = fr.chapters.find((c) => c.traits.some((t) => t.id === id)); if (ch && !read.includes(ch.id)) read.push(ch.id); }
  st.bud = { kind: "founder", species: fr.species.id, sp: p.sp, gs: p.gs, genome, sha, code: nameCode(sha), start: now, minutes, firstEver: first, parents: null, from: { n: p.n || 0, g: p.g, how: p.how, podId: p.id }, read, shaped: changed, early: false };
  st.firstMibi = false;
  st.tray = st.tray.filter((q) => q !== p); fillWells(st, settings, now);
  st.outbox.push({ sha, species: fr.species.id, genome, at: now });
  logEv(st, "Grew " + aAn(fr.species.name) + " founder · " + st.bud.code + " · " + plural(minutes, "minute") + (changed.length ? " · shaped " + changed.join(", ") : "") + " · −" + priceText(cost.e, cost.d, cost.s));
  return { ok: true, bud: st.bud, cost };
}
// The bud's chapters: a read chapter is known from the start; the rest clear one by one across the wait.
export function budChapterKnown(st, chapterId, settings = DEFAULT_SETTINGS, now = Date.now()) {
  const B = st.bud; if (!B) return false; if (B.read.includes(chapterId)) return true;
  const fr = frameOf(B.species), unread = fr.chapters.filter((c) => !B.read.includes(c.id)).map((c) => c.id), k = unread.indexOf(chapterId);
  return k >= 0 && budProgress(st, settings, now) >= (k + 1) / (unread.length + 1);
}
export const instantGrowCost = (settings = DEFAULT_SETTINGS) => ({ e: price(settings.instantGrow?.e ?? 1, settings), d: price(settings.instantGrow?.d ?? 0, settings), s: price(settings.instantGrow?.s ?? 2, settings) });
export function instantGrow(st, settings = DEFAULT_SETTINGS, now = Date.now()) {
  if (!st.bud || budReady(st, settings, now)) return { ok: false };
  const c = instantGrowCost(settings); if (!canPay(st, c.e, c.d, c.s)) return { ok: false, msg: "Grow now · " + shortText(st, c.e, c.d, c.s) };
  st.e -= c.e; st.d -= c.d; st.s -= c.s; st.bud.early = true; logEv(st, "Grew the bud now · −" + priceText(c.e, c.d, c.s)); return { ok: true };
}
// Open: a press; the juvenile steps out fully known, into a free bay, wearing the placeholder until its painting lands (M3).
export function openBud(st, sv, settings = DEFAULT_SETTINGS, now = Date.now()) {
  if (!budReady(st, settings, now)) return { ok: false, msg: "The bud is still growing" };
  const bay = freeBay(st, settings); if (bay < 0) return { ok: false, msg: "No bay free · return a mibi to the wild first" };
  const B = st.bud, fr = frameOf(B.species), id = st.nextMibi++;
  const name = MIBI_NAMES[st.nameN % MIBI_NAMES.length] + (st.nameN >= MIBI_NAMES.length ? " " + (Math.floor(st.nameN / MIBI_NAMES.length) + 1) : ""); st.nameN++;
  // a founder opens fully known; a bred child only where the Station could be sure (switch parents matched), the rest read later
  const read = B.kind === "cross" ? [...(B.read || [])] : fr.chapters.map((c) => c.id);
  const m = { id, name, sp: B.sp, species: B.species, gs: B.gs, born: st.turn, from: B.from, mem: null, outings: 0, notches: 0, bonded: false, genome: B.genome, sha: B.sha, code: B.code, read, parents: B.parents, bay, paint: B.paint ?? null, released: false, shaped: B.shaped || [] };
  for (const ch of fr.chapters) if (read.includes(ch.id)) for (const [t, ls] of chapterLooks(fr, ch, m.genome)) guideAdd(st, fr.species.id, t, ls);
  st.mibis.push(m); st.bud = null;
  logEv(st, "Opened · " + m.name + " · " + fr.species.name + " · juvenile · bay " + (bay + 1));
  return { ok: true, mibi: m };
}
// Return a mibi to the wild (research-economy.md §6): +2 Essence, a field-guide note, the release handed to the
// Companion at the next dock. Never a bonded mibi, a juvenile, or the one with you.
export function returnMibiBlock(st, sv, m) {
  if (!m || m.released) return "already released";
  if (m.bonded) return "a bonded mibi stays";
  if (mibiStage(st, m) === "juvenile") return "not until it is adult";
  if (m.id === effWithId(st, sv)) return m.name + " is with you";
  return "";
}
export function returnMibi(st, sv, m, settings = DEFAULT_SETTINGS) {
  const b = returnMibiBlock(st, sv, m); if (b) return { ok: false, msg: "Return " + (m ? m.name : "") + " · " + b };
  m.released = true; m.releasedAt = st.turn; st.s += PRICE.wildMibi;
  if (!Array.isArray(st.releases)) st.releases = [];
  st.releases.push({ id: m.id, name: m.name, sp: m.sp, species: m.species, k: m.from?.k ?? null, g: m.from?.g ?? null, code: m.code, turn: st.turn }); if (st.releases.length > 30) st.releases.shift();
  const notes = st.guideNotes || (st.guideNotes = {}); (notes[m.species] || (notes[m.species] = [])).push({ name: m.name, code: m.code, g: m.from?.g ?? null, turn: st.turn });
  logEv(st, "Returned " + m.name + " to the wild · +2 Essence · its place remembers it");
  return { ok: true, msg: m.name + " goes back to the " + (PLACE_WORD[m.from?.g] || "wild") + " · +2 ❀ · the Companion takes it at the next dock" };
}
// Developer skips for M2.
export function skipBud(st, settings = DEFAULT_SETTINGS, how = "ready") { const B = st.bud; if (!B) return; if (how === "ready") B.early = true; else { B.early = false; B.start = Date.now() - (B.minutes * 60000) / 2; } logEv(st, "Developer: bud " + how); }
export function seedAdults(st, species, seed, n = 2, settings = DEFAULT_SETTINGS) {
  const fr = frameOf(species); if (!fr) return { ok: false, msg: "no frame " + species };
  const made = [];
  for (let i = 0; i < n; i++) { if (bayFull(st, settings)) break; const gs = (Math.imul((seed >>> 0) + i * 104729, 2654435761) ^ (i * 7)) >>> 0, genome = podGenome(fr, gs), sha = genomeSha(genome), id = st.nextMibi++;
    const name = MIBI_NAMES[st.nameN % MIBI_NAMES.length] + (st.nameN >= MIBI_NAMES.length ? " " + (Math.floor(st.nameN / MIBI_NAMES.length) + 1) : ""); st.nameN++;
    const m = { id, name, sp: speciesIndex(species), species, gs, born: st.turn - JUVENILE_TURNS, from: { n: 0, g: "meadow", how: "ground", podId: null }, mem: null, outings: 0, notches: 0, bonded: false, genome, sha, code: nameCode(sha), read: fr.chapters.map((c) => c.id), parents: null, bay: freeBay(st, settings), paint: null, released: false, shaped: [] };
    st.mibis.push(m); made.push(m); for (const ch of fr.chapters) for (const [t, ls] of chapterLooks(fr, ch, genome)) guideAdd(st, fr.species.id, t, ls); }
  st.firstMibi = false; logEv(st, "Developer: " + plural(made.length, "adult " + fr.species.name) + " · seed " + (seed >>> 0));
  return { ok: !!made.length, mibis: made, msg: made.length ? made.map((m) => m.name).join(" and ") + " live in the vivarium" : "no bay free" };
}

// --- The cross (the-cross.md, decided; station-build.md M4): two adults of one species make one child --------
import { cross as crossGenomes, forecast as crossForecast, kinship as pedigreeKinship, identity as genomeIdentity } from "./genome.mjs";
export const crossCost = (settings = DEFAULT_SETTINGS) => ({ e: price(PRICE.growE, settings), s: price(PRICE.growS, settings), d: 0 });
// The pedigree: a digest names a mibi's genome, in the vivarium or in a child's parent snapshot.
export function genomeLookup(st) {
  const byDigest = new Map();
  for (const m of st.mibis) { if (m.genome) byDigest.set(genomeDigest(m.genome), m.genome); for (const p of m.parents || []) if (p.genome) byDigest.set(genomeDigest(p.genome), p.genome); }
  return (d) => byDigest.get(d) ?? null;
}
export const isAdult = (st, m, settings) => mibiStage(st, m, settings) === "adult";
// Refused before cost, on the pick itself: the same individual, another species, not adult, released.
export function crossBlock(st, sv, a, b, settings = DEFAULT_SETTINGS) {
  if (!a || !b) return "pick two";
  if (a === b || a.id === b.id) return "one mibi is not a pair";
  if (speciesOf(a) !== speciesOf(b)) return "another species";
  if (!isAdult(st, a, settings) || !isAdult(st, b, settings)) return "not adult";
  if (a.released || b.released) return "gone to the wild";
  if (st.bud) return "the incubator is busy";
  if (bayFull(st, settings)) return "no bay free · return one";
  return "";
}
export const crossPartners = (st, sv, a, settings = DEFAULT_SETTINGS) => st.mibis.filter((m) => m !== a && !m.released && speciesOf(m) === speciesOf(a) && isAdult(st, m, settings));
export function kinshipOf(st, a, b) { const k = pedigreeKinship(a.genome, b.genome, genomeLookup(st)); return k; }
export const kinshipWord = (k) => (k <= 0 ? "wild founders · kinship 0" : k >= 0.5 ? "the same line" : k >= 0.25 ? "close kin · a quarter" : k >= 0.125 ? "half kin · an eighth" : k >= 0.0625 ? "cousins · a sixteenth" : "distant kin");
// The forecast per trait: four seeds (quarters) for a switch, a range for a blend, firm where both parents match.
export function forecastOf(st, a, b, settings = DEFAULT_SETTINGS) {
  const fr = frameFor(a); if (!fr || crossBlock(st, null, a, b, settings) === "another species") return null;
  const k = kinshipOf(st, a, b);
  return { ...crossForecast(fr, a.genome, b.genome, { kinship: k, lookup: genomeLookup(st) }), kinship: k, identity: genomeIdentity(fr, a.genome, b.genome) };
}
// Chapters a child is known in before any read: every trait firm (switch parents match); a blend is never firm.
export function childKnownChapters(fr, fc) { return fr.chapters.filter((c) => !c.sealed && c.traits.every((t) => fc.traits.find((x) => x.trait === t.id)?.firm)).map((c) => c.id); }
// The cross: one draw, validated whole before anything is spent (not re-rolled: a child that cannot be built never exists and the clashing traits are named); then paid, the child in the bud with its real parents.
export function doCross(st, sv, a, b, settings = DEFAULT_SETTINGS, now = Date.now(), rng = Math.random) {
  const block = crossBlock(st, sv, a, b, settings); if (block) return { ok: false, msg: "Cross them · " + block };
  const cost = crossCost(settings); if (!canPay(st, cost.e, cost.d, cost.s)) return { ok: false, msg: "Cross them · " + shortText(st, cost.e, cost.d, cost.s) };
  const fr = frameFor(a), k = kinshipOf(st, a, b);
  const genome = crossGenomes(fr, a.genome, b.genome, { rng, kinship: k, lookup: genomeLookup(st) });
  const problems = genomeProblems(fr, genome);
  if (problems.length) { const clash = fr.chapters.flatMap((c) => c.traits).filter((t) => problems.some((p) => t.loci.some((id) => p.includes(id)))).map((t) => t.id); return { ok: false, clash, msg: "This child would not build · " + (clash.length ? clash.join(", ") : problems[0]) + " · nothing spent" }; }
  st.e -= cost.e; st.s -= cost.s;
  const sha = genomeSha(genome), fc = crossForecast(fr, a.genome, b.genome, { kinship: k }), read = childKnownChapters(fr, fc);
  const snap = (m) => ({ id: m.id, name: m.name, code: m.code, sha: m.sha, genome: structuredClone(m.genome) });
  const minutes = budMinutes(st, 0, settings);
  st.bud = { kind: "cross", species: fr.species.id, sp: a.sp, gs: null, genome, sha, code: nameCode(sha), start: now, minutes, firstEver: !!st.firstMibi, parents: [snap(a), snap(b)], kinship: k, from: { n: 0, g: a.from?.g ?? null, how: "cross", podId: null, of: [a.name, b.name] }, read, shaped: [], early: false };
  st.firstMibi = false;
  st.outbox.push({ sha, species: fr.species.id, genome, at: now });
  logEv(st, "Crossed " + a.name + " × " + b.name + " · " + st.bud.code + " · kinship " + Math.round(k * 1000) / 1000 + " · " + plural(minutes, "minute") + " · −" + priceText(cost.e, cost.d, cost.s));
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
  let x = seed >>> 0; const rng = () => { x = (Math.imul(x ^ (x >>> 15), 0x2c1b3c6d) + 0x9e3779b9) >>> 0; return (x >>> 8) / 16777216; };
  for (let i = 0; i < 2 && !bayFull(st, settings); i++) {
    let genome = null; for (let t = 0; t < 8 && !genome; t++) { const g = crossGenomes(fr, a.genome, b.genome, { rng, kinship: 0 }); if (!genomeProblems(fr, g).length) genome = g; }
    if (!genome) break;
    const sha = genomeSha(genome), id = st.nextMibi++, name = MIBI_NAMES[st.nameN % MIBI_NAMES.length] + (st.nameN >= MIBI_NAMES.length ? " " + (Math.floor(st.nameN / MIBI_NAMES.length) + 1) : ""); st.nameN++;
    const snap = (m) => ({ id: m.id, name: m.name, code: m.code, sha: m.sha, genome: structuredClone(m.genome) });
    const m = { id, name, sp: a.sp, species, gs: null, born: st.turn - JUVENILE_TURNS, from: { n: 0, g: a.from.g, how: "cross", podId: null, of: [a.name, b.name] }, mem: null, outings: 0, notches: 0, bonded: false, genome, sha, code: nameCode(sha), read: fr.chapters.map((c) => c.id), parents: [snap(a), snap(b)], bay: freeBay(st, settings), paint: null, released: false, shaped: [] };
    st.mibis.push(m); made.push(m); for (const ch of fr.chapters) for (const [t, ls] of chapterLooks(fr, ch, genome)) guideAdd(st, fr.species.id, t, ls);
  }
  logEv(st, "Developer: siblings " + made.map((m) => m.name).join(" and ") + " of " + a.name + " and " + b.name);
  return { ok: made.length === 2, parents: [a, b], mibis: made, msg: made.length === 2 ? made.map((m) => m.name).join(" and ") + ", siblings of " + a.name + " and " + b.name : "no bay free for both siblings" };
}
