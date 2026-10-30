// The Companion's stand-in (the plan: "a run that needs the Companion uses a stub for the trip outcome until it has its own engine"). The Companion writes the shared save (the world, the turn,
// the crates in the bay); the Station reads it (game.storageChanged). This does the same for a seeded trip: one world turn, one sealed crate. The yields are ASSUMPTIONS, not measurements,
// taken from the economy tables of the design specs: Energy about 3 a trip, Data from creatures and the field yield, Essence 1 to 3, none to two pods of
// the three starter species (about one a trip: shedding is rare unless the creature is special). A report built on them says so (metrics.mjs prints STUB).
export const STUB = { energy: [2, 4], data: [4, 12], essence: [1, 3], pods: [0, 2], species: [0, 0, 1, 2], note: "stub trips: Energy 2-4, Data 4-12, Essence 1-3, 0-2 pods of Loika/Tuikis/Untuva a trip, about 1 (assumed, not measured)" };

export function mulberry32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const between = (rng, [a, b]) => a + Math.floor(rng() * (b - a + 1));
const PLACES = ["meadow", "pond", "rock", "wood", "cave"], HOWS = ["calm", "shake", "ground", "slab", "meal"];

// the world before the first trip: the Companion has a world and nothing in the bay
export const firstWorld = (seed) => ({ v: 8, seed: seed >>> 0, wid: "wbot" + (seed >>> 0).toString(36), turn: 0, phase: "setup", tier: 1, shield: 3, with: null, bay: [], mibis: [], known: [0], hold: null, walkTurn: -1, withSeen: 0, probeSeen: 0, retSeen: [], dockSeen: 0, cr: [], pods: [] });

// the crate of trip `turn`
export function crate(rng, wid, turn) {
  const pods = Array.from({ length: between(rng, STUB.pods) }, (_, i) => ({ id: "q" + i, sp: STUB.species[Math.floor(rng() * STUB.species.length)], g: PLACES[Math.floor(rng() * 5)], how: HOWS[Math.floor(rng() * 5)], gs: Math.floor(rng() * 4294967296) >>> 0, k: null }));
  return { id: "x" + wid + "-" + turn, n: turn, turn, at: 1, e: between(rng, STUB.energy), d: between(rng, STUB.data), s: between(rng, STUB.essence), pods, met: [...new Set(pods.map((p) => p.sp))], explored: 5, of: 20, lines: [] };
}
// one trip: the Companion writes turn `turn` and its crate into the shared save, and the Station takes it up (the page's storage event)
export function trip(session, rng, turn) {
  const cur = JSON.parse(session.save());
  cur.turn = turn; cur.bay.push(crate(rng, cur.wid, turn));
  globalThis.localStorage.setItem(session.game.saveKey(), JSON.stringify(cur));
  session.game.storageChanged();
  return cur.bay[cur.bay.length - 1];
}
