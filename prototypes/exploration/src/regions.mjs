// Regions: a realm is many maps. A region is today's world (16 x 20 cells) with its own seed, generator and biome; the realm keeps
// everything else. Pure functions on plain objects, no page, no storage but an adapter.
// The page keeps reading S.seed, S.revealed, S.pods and the rest; the region in use is
// mounted onto S, and unmounted before anything is written.
//   save v9 on disk: { v: 9, seed (= regions[0].seed), began, here, regions: [Region …], …the realm's fields… }
//   Region = { id, n, kind: "home" | "season", biome, slot: [ax, ay] | null, ev, name, seed, gen, opened, openedTurn, turnSeen,
//              closes, closed, exploredN, seenN, map: { …MAP_KEYS… } }
import { MW, MH, GENS, hash } from "./world.mjs";

export const REALM_SAVE_V = 9;
// the fields of a region's own map state: on S while the region is mounted, in regions[i].map when it is not.
// lastPos lives in S.ui.lastPos on the page (the last start flag of the inset) and moves with the region.
export const MAP_KEYS = ["revealed", "visited", "called", "signs", "pins", "cells", "pods", "cr", "veil", "svy", "svyF", "opened", "skulls", "lastStorm", "lastEntered", "lastTrail", "lastPos"];
export const BIOMES = ["mixed", "woods", "fells", "marsh"];
export const BIOME_NAME = { mixed: "Meadows", woods: "Woods", fells: "Fells", marsh: "Marsh" };   // the player's words (the copywriter owns them)
export const ATLAS = 5, CENTER = [2, 2], MAX_HOME = 25, REGION_EVERY = 140;
const GOOD_CLOCK = Date.UTC(2026, 0, 1);   // a time before this is a clock that was never set

export const regionId = n => "g" + n;
// Region 1 keeps the realm's seed, so its map stays the same cell for cell. Region n takes a seed of its own (a seasonal region takes the event's).
export const regionSeed = (seed1, n) => n === 1 ? seed1 : hash(seed1, "region", n);

// ---- a region's map state ----
// A new region's map, as a new world starts it (the page's worldFields, map part). Fields the page creates only when needed
// (svyF, skulls, lastEntered, lastTrail, lastPos) are absent until then.
export function blankMap() {
  return { revealed: new Array(MW * MH).fill(0), visited: new Array(MW * MH).fill(0), called: {}, signs: {}, pins: [], cells: {}, pods: [], cr: [], veil: {}, svy: {}, opened: {}, lastStorm: null };
}
// the counts the atlas and the opening rule read: "explored" is visited and called (the page's explored(c)); "seen" is revealed
export function exploredCount(map) { let n = 0; for (let c = 0; c < MW * MH; c++) if (map.visited && map.visited[c] && map.called && map.called[c]) n++; return n; }
export function seenCount(map) { let n = 0; for (let c = 0; c < MW * MH; c++) if (map.revealed && map.revealed[c]) n++; return n; }

export function regionRecord(o) {
  const n = o.n, kind = o.kind || "home";
  if (!Number.isInteger(n) || n < 1) throw new Error("a region needs n, from 1");
  if (kind !== "home" && kind !== "season") throw new Error("region kind " + kind);
  const biome = o.biome || "mixed"; if (!BIOMES.includes(biome)) throw new Error("region biome " + biome);
  if (kind === "home" && !(Array.isArray(o.slot) && o.slot.length === 2)) throw new Error("a home region needs a slot");
  if (typeof o.seed !== "number") throw new Error("a region needs a seed");
  if (!Number.isInteger(o.gen)) throw new Error("a region needs a generator");
  const map = o.map || blankMap();
  return { id: o.id || regionId(n), n, kind, biome, slot: kind === "home" ? o.slot.slice() : null, ev: o.ev ?? null, name: o.name ?? null, seed: o.seed, gen: o.gen,
    opened: o.opened, openedTurn: o.openedTurn ?? 0, turnSeen: o.turnSeen ?? o.openedTurn ?? 0, closes: o.closes ?? null, closed: !!o.closed,
    exploredN: o.exploredN ?? exploredCount(map), seenN: o.seenN ?? seenCount(map), map };
}

// Pod ids in region n >= 2 carry the region ("g2.w0"), so two regions never hold the same id. Region 1 keeps its ids. The input is not changed.
export function prefixPods(pods, n) {
  return n === 1 ? pods.slice() : pods.map(p => ({ ...p, id: "g" + n + "." + p.id }));
}

// ---- the atlas: 5 x 5 slots, region 1 at the centre ----
const NEIGHBOURS = [[2, 1], [3, 2], [2, 3], [1, 2]];   // north, east, south, west of region 1
// A slot's biome is fixed by the realm seed. The four slots around region 1 hold Woods, Fells and Marsh and one repeat of the three
// (which one, and where, comes from the seed), so the first choice always offers all three. Slots further out take any biome.
export function slotBiome(seed, ax, ay) {
  if (ax === CENTER[0] && ay === CENTER[1]) return "mixed";
  const i = NEIGHBOURS.findIndex(([x, y]) => x === ax && y === ay);
  if (i >= 0) {
    const three = ["woods", "fells", "marsh"], items = [...three, three[hash(seed, "slot", "repeat") % 3]];
    const order = [0, 1, 2, 3].sort((a, b) => hash(seed, "slot", "order", a) - hash(seed, "slot", "order", b) || a - b);
    return items[order[i]];
  }
  return BIOMES[hash(seed, "slot", ax, ay) % BIOMES.length];
}
const homes = regions => regions.filter(r => r.kind === "home" && r.slot);
// The slots a new region can open in: free, inside the 5 x 5, and sharing an edge with an open home region. Row by row.
export function freeSlots(regions) {
  const taken = new Set(homes(regions).map(r => r.slot.join(",")));
  const out = new Map();
  for (const r of homes(regions)) for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
    const x = r.slot[0] + dx, y = r.slot[1] + dy, k = x + "," + y;
    if (x >= 0 && y >= 0 && x < ATLAS && y < ATLAS && !taken.has(k)) out.set(k, [x, y]);
  }
  return [...out.values()].sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}
const isMounted = S => Array.isArray(S.visited);
// Explored cells of one region: live for the region that is mounted, cached (at its last unmount) for the others.
const exploredOf = (S, r) => r.id === S.here && isMounted(S) ? exploredCount(S) : r.exploredN;
// The rule: a realm with n home regions can open the next when 140 x n cells are explored across them, up to 25 regions. Seasonal regions do not count.
export function canOpen(S, every = REGION_EVERY) {
  const hs = homes(S.regions), n = hs.length;
  if (n >= MAX_HOME || !freeSlots(S.regions).length) return false;
  return hs.reduce((a, r) => a + exploredOf(S, r), 0) >= every * n;
}
export const exploredAcross = S => homes(S.regions).reduce((a, r) => a + exploredOf(S, r), 0);

// A home region is named by its side of region 1 and its biome: "the Meadows", "North Woods", and "Far East Fells" for the second on a side.
// A seasonal region has the event's own name. A home region off the four axes has no name yet: the copywriter owes the words.
const SIDE = { "0,-1": "North", "1,0": "East", "0,1": "South", "-1,0": "West" };
export function regionName(region, realm) {
  if (region.kind === "season") return region.name ?? null;
  if (region.n === 1 || (region.slot[0] === CENTER[0] && region.slot[1] === CENTER[1])) return "the " + BIOME_NAME[region.biome];
  const dx = region.slot[0] - CENTER[0], dy = region.slot[1] - CENTER[1];
  if (dx && dy) return null;
  const side = SIDE[Math.sign(dx) + "," + Math.sign(dy)], far = Math.abs(dx + dy) >= 2;
  return (far ? "Far " : "") + side + " " + BIOME_NAME[region.biome];
}

// ---- mount and unmount ----
export const regionById = (S, id) => { const r = S.regions.find(x => x.id === id); if (!r) throw new Error("no region " + id); return r; };
// Puts the region on S: its map fields, its seed and generator, its last start. A key the region lacks is removed from S.
export function mount(S, id) {
  const R = regionById(S, id);
  for (const k of MAP_KEYS) { if (k === "lastPos") continue; if (Object.hasOwn(R.map, k)) S[k] = R.map[k]; else delete S[k]; }
  S.seed = R.seed; S.gen = R.gen; S.here = id;
  if (S.ui && typeof S.ui === "object") { if (Object.hasOwn(R.map, "lastPos")) S.ui.lastPos = R.map.lastPos; else delete S.ui.lastPos; }
  return R;
}
// Takes the fields back into the region that is mounted (a reassigned array is caught this way) and refreshes its counts.
export function unmount(S) {
  const R = regionById(S, S.here);
  for (const k of MAP_KEYS) { if (k === "lastPos") continue; if (S[k] !== undefined) R.map[k] = S[k]; else delete R.map[k]; }
  if (S.ui && typeof S.ui === "object" && S.ui.lastPos !== undefined) R.map.lastPos = S.ui.lastPos; else delete R.map.lastPos;
  R.exploredN = exploredCount(R.map); R.seenN = seenCount(R.map);
  return R;
}
// What goes to disk: the realm, with every region's map in its record. The mounted fields, `gen` and the mounted last start stay out.
// The seed written is the realm's: regions[0].seed. S is unmounted (so the regions are current) and left as it is.
export function serialize(S) {
  unmount(S);
  const o = {};
  for (const k of Object.keys(S)) { if (MAP_KEYS.includes(k) || k === "gen") continue; o[k] = S[k]; }
  o.seed = S.regions[0].seed;
  if (S.ui && typeof S.ui === "object") { const ui = { ...S.ui }; delete ui.lastPos; o.ui = ui; }
  return o;
}

// ---- save v8 to v9 ----
// The earliest real time the save holds (the Station's start, a mibi's `since`, a crate), else `now`.
function beganOf(s, now) {
  const t = [];
  const add = v => { if (Number.isFinite(v) && v >= GOOD_CLOCK) t.push(v); };
  if (s.st && typeof s.st === "object") { add(s.st.at); for (const m of s.st.mibis || []) add(m && m.since); }
  for (const m of s.mibis || []) add(m && m.since);
  for (const c of s.bay || []) add(c && c.at);
  return t.length ? Math.min(...t) : now;
}
// v8 -> v9, forward only, pure (the input is not changed). The save is as load() has filled it, so a new world's map fields are there;
// a field it still lacks stays absent in the region. Region 1 is the save's world: its seed and generator, its map state, its place at the
// centre of the atlas. Crates, the hold and an expedition under way carry no region: none means region 1.
export function migrate8(v8, { now = Date.now() } = {}) {
  if (!v8 || typeof v8 !== "object" || v8.v !== 8) throw new Error("migrate8 takes a v8 save");
  const s = JSON.parse(JSON.stringify(v8));
  const map = {};
  for (const k of MAP_KEYS) if (k !== "lastPos" && Object.hasOwn(s, k)) { map[k] = s[k]; delete s[k]; }
  if (s.ui && typeof s.ui === "object" && Object.hasOwn(s.ui, "lastPos")) { map.lastPos = s.ui.lastPos; delete s.ui.lastPos; }
  const gen = s.gen == null ? 1 : s.gen; delete s.gen;
  const began = beganOf(s, now);
  const g1 = regionRecord({ id: "g1", n: 1, kind: "home", biome: "mixed", slot: CENTER, seed: s.seed, gen, opened: began, openedTurn: 0, turnSeen: s.turn || 0, map });
  return { ...s, v: REALM_SAVE_V, began, here: "g1", regions: [g1] };
}

// 'ok' for a save this page can play, 'newer' for one from a newer page (a newer save version, or a region whose generator this page does not know:
// the whole realm is then read-only and never written), 'broken' for anything else.
export function realmStatus(s, gens = GENS) {
  if (!s || typeof s !== "object" || Array.isArray(s)) return "broken";
  if (typeof s.v === "number" && s.v > REALM_SAVE_V) return "newer";
  if (s.v !== REALM_SAVE_V || !Array.isArray(s.regions) || !s.regions.length || !s.regions.every(r => r && r.map && typeof r.map === "object")) return "broken";
  return s.regions.every(r => gens.includes(r.gen)) ? "ok" : "newer";
}

// The page's copy of the v8 bytes: written once, untouched, before the first v9 write, and kept until the next save version. `store` is a
// localStorage-like adapter (getItem, setItem). Returns true when the copy is in place and equal to `raw`; false when it could not be made
// (the save is then opened read-only, and never migrated). A copy already there is kept: it is the oldest v8 bytes.
export function keepPre9(store, key, raw) {
  const k = key + ".pre9";
  try {
    if (store.getItem(k) != null) return true;
    store.setItem(k, raw);
    return store.getItem(k) === raw;
  } catch (e) { return false; }
}
