// The Station's state: the save's Station part (`st` under mb-save-v8) and every rule as a pure
// function over it. No drawing, no DOM: the tests run this in Node. Screens call these and read
// the results; presentation events come back as return values, never as side effects on a renderer.
// The Companion page owns every top-level field of the save and reads these fields of `st`:
// accepted, dockN, known, probe, withReq, returned, and each mibi's id, name, sp, born, from, bonded.
// Those keep their shape (station-build.md §2.3).
import { frameOf, speciesIndex, speciesId, podGenome, chapterOf, chapterLooks, chapterSeal, genomeSha, nameCode, stampCode, checkGenome, genomeDigest } from "./genome.mjs";

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
export const HOW_WORD = { shake: "shook itself dry", calm: "felt safe", curl: "curled up from the rain", meal: "had a full meal", slab: "under a slab", ground: "from the ground", deep: "from the deep", cave: "in the cave" };
export const HOW_ACT = ["shake", "calm", "curl", "meal"];
// Developer settings (their own key, never in the shared save). The economy is loose by default (decided 2026-10-08, for testing).
export const DEFAULT_SETTINGS = { economy: "loose", topUp: { e: 2, d: 3, s: 2 }, sealedOpen: false, bays: BAYS, rack: RACK, budScale: 1, firstBud: true, sittingWait: "hours", adultTurns: JUVENILE_TURNS, mockDelay: 20, growCap: 10, painter: "mock", instantGrow: { e: 1, d: 0, s: 2 } };

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
  for (const k of ["tray", "waiting", "accepted", "devBay", "known", "met", "knownIds", "metIds", "mibis", "returned", "log", "outbox"]) if (!Array.isArray(st[k])) st[k] = [];
  for (const k of ["readOnce", "guide", "moments", "wish"]) if (!st[k] || typeof st[k] !== "object") st[k] = {};
  st.dock = st.dock || { docked: false, at: now }; if (!st.bays) st.bays = BAYS;
  for (const p of st.tray.concat(st.waiting)) { p.species = speciesOf(p); if (!Array.isArray(p.read)) p.read = []; const fr = frameFor(p); if (fr && !p.genome) p.genome = podGenome(fr, p.gs >>> 0); }
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
export function mibiStage(st, m) { const age = st.turn - (m.born || 0); return age < JUVENILE_TURNS ? "juvenile" : age >= JUVENILE_TURNS + ELDER_TURNS ? "elder" : "adult"; }
export const tierNow = (st, sv) => (st.probe && st.probe.tier) || (sv && sv.tier) || 1;
export const podName = (p) => (p.idd ? spName(p) + " pod" : "unknown pod");
export function podOrigin(p) { return (PLACE_WORD[p.g] || p.g || "somewhere") + (p.how && HOW_WORD[p.how] ? " · " + (HOW_ACT.includes(p.how) ? (p.idd ? aAn(spName(p)) + " " : "a creature ") : "") + HOW_WORD[p.how] : "") + (p.n ? " · expedition " + p.n : ""); }

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
  const looks = chapterLooks(fr, ch, p.genome), newLooks = [];
  for (const [t, ls] of looks) { const had = guideLooks(st, fr.species.id, t); for (const l of ls) if (!had.includes(l)) newLooks.push(l); guideAdd(st, fr.species.id, t, ls); }
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
