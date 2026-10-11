// The seeded world of the Companion: the map, the places and the RNG. Pure: it never reads the page's state, the DOM,
// storage, the clock or Math.random, and never draws. Generator 1 is frozen; a new generator is added beside it, never in its place.

export const NEW_GEN = 1;          // the generator newWorld gives a new world
export const GENS = [1, 2];        // the generators this module can build

export const MW = 16, MH = 20;                       // world map, cells
export const PW = 28, PH = 32;
export const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
export const L = { MEADOW: 0, POND: 1, ROCK: 2, WOOD: 3, WATER: 4, CLIFF: 5 };
export const T = { GRASS: 0, TALL: 1, FLOWERS: 2, DARK: 3, SAND: 4, WATER: 5, REEDS: 6, ROCK: 7, TRUNK: 8, CLIFF: 9, CFLOOR: 10, CWALL: 11, STEP: 12, DEEP: 13, ISLE: 14, FACE: 15, LIP: 16, STAIR: 17, APRON: 18 };
export const T_BLOCK = [0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 0];   // 15–18 are generator 2's: faces and lips block, stairs and aprons are walked on

export function hash() {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < arguments.length; i++) {
    const v = arguments[i];
    if (typeof v === 'string') {
      for (let j = 0; j < v.length; j++) { h ^= v.charCodeAt(j); h = Math.imul(h, 16777619); }
    } else {
      const n = Math.floor(v) | 0;
      for (let k = 0; k < 4; k++) { h ^= (n >>> (k * 8)) & 255; h = Math.imul(h, 16777619); }
    }
    h ^= 0x5bd1e995; h = Math.imul(h, 16777619);
  }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return h >>> 0;
}
export function rnd() { return hash.apply(null, arguments) / 4294967296; }
export function mulberry32(a) {
  return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function makeRng(seed) {
  const f = mulberry32(seed);
  return {
    f, int: n => Math.floor(f() * n), range: (a, b) => a + Math.floor(f() * (b - a + 1)),
    pick: a => a[Math.floor(f() * a.length)], chance: p => f() < p,
    shuffle: a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(f() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
  };
}
export function noise2(seed, x, y, sc) {
  const gx = x / sc, gy = y / sc, x0 = Math.floor(gx), y0 = Math.floor(gy);
  const s = t => t * t * (3 - 2 * t), ux = s(gx - x0), uy = s(gy - y0);
  const a = rnd(seed, x0, y0), b = rnd(seed, x0 + 1, y0), c = rnd(seed, x0, y0 + 1), d = rnd(seed, x0 + 1, y0 + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
export function fbm(seed, x, y, sc) { return noise2(seed, x, y, sc) * .65 + noise2(seed + 7, x, y, sc / 2) * .35; }
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
export const man = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
export const cxy = c => ({ x: c % MW, y: (c / MW) | 0 });
export const cdist = (a, b) => man(cxy(a), cxy(b));

export function passableIn(G, c) { const l = G.land[c]; return (l !== L.WATER || G.ford[c] === 1) && l !== L.CLIFF; }

export function genWorld(seed, gen = 1) {
  if (gen === 2) return genWorld2(seed);
  if (gen !== 1) throw new RangeError('unknown world generator: ' + gen);
  const passable = c => passableIn(G, c);
  const R = makeRng(hash(seed, 'world'));
  const N = MW * MH, land = new Array(N), ford = new Array(N).fill(0), island = new Array(N).fill(0);
  const at = (x, y) => y * MW + x;
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const m = fbm(hash(seed, 'm'), x, y, 5), h = fbm(hash(seed, 'h'), x, y, 4);
    land[at(x, y)] = m > .6 ? L.WOOD : h > .63 ? L.ROCK : L.MEADOW;
  }
  // One river, top to bottom, meandering on the east half.
  const rxs = []; let rx = 9 + R.int(3);
  for (let y = 0; y < MH; y++) {
    if (y > 0 && R.chance(.45)) { const nx = clamp(rx + (R.chance(.5) ? 1 : -1), 8, 13); if (nx !== rx) { land[at(nx, y - 1)] = L.WATER; rx = nx; } }
    land[at(rx, y)] = L.WATER; rxs[y] = rx;
  }
  // The river widens around an island (seen, not reachable without a swimmer).
  const iy = 11 + R.int(3), ix = rxs[iy];
  for (let y = iy - 1; y <= iy + 1; y++) for (let x = ix - 1; x <= ix + 2; x++) land[at(clamp(x, 0, MW - 1), y)] = L.WATER;
  land[at(rxs[iy - 2], iy - 1)] = L.WATER; land[at(rxs[iy + 2], iy + 1)] = L.WATER;
  land[at(ix, iy)] = L.MEADOW; land[at(ix + 1, iy)] = R.chance(.5) ? L.WOOD : L.MEADOW;
  island[at(ix, iy)] = 1; island[at(ix + 1, iy)] = 1;
  // Two shallow fords so both banks are walkable.
  for (const fy of [1 + R.int(3), 16 + R.int(3)]) for (let x = 0; x < MW; x++) if (land[at(x, fy)] === L.WATER) ford[at(x, fy)] = 1;
  // Cliff band west of the river, with one step; a cave mouth in its face.
  const cy = 5 + R.int(2), xEnd = rxs[cy] - 3, x0 = 1;
  const stepX = x0 + 2 + R.int(Math.max(1, xEnd - x0 - 3));
  for (let x = x0; x <= xEnd; x++) {
    land[at(x, x >= stepX ? cy + 1 : cy)] = L.CLIFF;
    if (x === stepX) land[at(x, cy)] = L.CLIFF;
  }
  let gx = x0 + 1 + R.int(Math.max(1, xEnd - x0 - 1));
  if (gx === stepX) gx = Math.max(x0, gx - 1);
  const gcy = gx >= stepX ? cy + 1 : cy;
  const gate = at(gx, gcy + 1), mouth = at(gx, gcy);
  land[gate] = L.ROCK;
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, 1]]) { const c = at(gx + dx, gcy + 1 + dy); if (land[c] !== L.WATER && land[c] !== L.CLIFF && R.chance(.6)) land[c] = L.ROCK; }
  // A small lake somewhere south-west.
  const lx = 1 + R.int(5), ly = 12 + R.int(6);
  if (land[at(lx, ly)] !== L.CLIFF) land[at(lx, ly)] = L.WATER;
  // Pond edges along every bank.
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const c = at(x, y); if (land[c] === L.WATER || land[c] === L.CLIFF || island[c] || c === gate) continue;
    const wet = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const X = x + dx, Y = y + dy; return X >= 0 && Y >= 0 && X < MW && Y < MH && land[at(X, Y)] === L.WATER && !ford[at(X, Y)]; });
    if (wet && (land[c] === L.MEADOW || R.chance(.35))) land[c] = L.POND;
  }
  const G = { seed, land, ford, island, gate, mouth, deep: -1, swim: -1, swimDir: null, spawns: [], comp: new Array(N).fill(0) };
  // Largest walkable component (fords count).
  const seen = new Array(N).fill(-1); let best = -1, bestN = 0;
  for (let s = 0; s < N; s++) {
    if (seen[s] >= 0 || !passable(s)) continue;
    let n = 0; const q = [s]; seen[s] = s;
    while (q.length) { const c = q.pop(); n++; const { x, y } = cxy(c);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= MW || Y >= MH) continue; const d = at(X, Y); if (seen[d] < 0 && passable(d)) { seen[d] = s; q.push(d); } } }
    if (n > bestN) { bestN = n; best = s; }
  }
  for (let c = 0; c < N; c++) G.comp[c] = seen[c] === best ? 1 : 0;
  // The deep "?" sits in a rock field away from the gate.
  const rocks = []; for (let c = 0; c < N; c++) if (G.comp[c] && c !== gate && cdist(c, gate) >= 5) (land[c] === L.ROCK ? rocks : []).push(c);
  if (!rocks.length) for (let c = 0; c < N; c++) if (G.comp[c] && cdist(c, gate) >= 5 && land[c] !== L.WATER) rocks.push(c);
  G.deep = R.pick(rocks); land[G.deep] = L.ROCK;
  // The swimmer gate: the reachable bank right across the fast water from the island.
  const isl = []; for (let c = 0; c < N; c++) if (island[c]) isl.push(cxy(c));
  const sc = [];
  for (let c = 0; c < N; c++) {
    if (!G.comp[c] || land[c] === L.WATER || c === gate || c === G.deep || island[c]) continue;
    const p = cxy(c);
    for (const [dn, dx, dy] of [['up', 0, -1], ['down', 0, 1], ['left', -1, 0], ['right', 1, 0]]) {
      const X = p.x + dx, Y = p.y + dy; if (X < 0 || Y < 0 || X >= MW || Y >= MH) continue; const w = at(X, Y);
      if (land[w] !== L.WATER || ford[w]) continue;
      const d = Math.min(...isl.map(i => cheb(i, { x: X, y: Y })));
      if (d <= 1) sc.push({ c, dn, k: d * 100 + Math.min(...isl.map(i => man(i, p))) * 10 + (dn === 'left' || dn === 'right' ? 0 : 1) });
    }
  }
  sc.sort((a, b) => a.k - b.k || a.c - b.c);
  if (sc.length) { G.swim = sc[0].c; G.swimDir = sc[0].dn; }
  // Start glints: one near the cliff gate, the rest spread out.
  const ok = c => G.comp[c] && c !== gate && c !== G.deep && land[c] !== L.WATER &&
    [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].filter(([dx, dy]) => { const p = cxy(c), X = p.x + dx, Y = p.y + dy; return X >= 0 && Y >= 0 && X < MW && Y < MH && passable(at(X, Y)); }).length >= 6;
  const cand = []; for (let c = 0; c < N; c++) if (ok(c)) cand.push(c);
  const near = cand.filter(c => cdist(c, gate) >= 2 && cdist(c, gate) <= 4);
  if (near.length) G.spawns.push(R.pick(near));
  for (const c of R.shuffle(cand.slice())) { if (G.spawns.length >= 5) break; if (G.spawns.every(s => cdist(s, c) >= 5)) G.spawns.push(c); }
  // An early burrower: beside every start glint there is a rock or wood cell where Tuikis live and
  // an overhang to shelter under, so a burrower pod is reachable in the first storm without the burrow.
  G.glow = [];
  for (const s of G.spawns) {
    const p = cxy(s), nb = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const x = p.x + dx, y = p.y + dy; if ((!dx && !dy) || x < 0 || y < 0 || x >= MW || y >= MH) continue;
      const c = at(x, y); if (G.comp[c] && passable(c) && land[c] !== L.WATER && c !== gate && c !== G.deep && c !== G.swim && !island[c] && !G.spawns.includes(c)) nb.push(c); }
    if (!nb.length) continue;
    let c = nb.find(n => land[n] === L.ROCK || land[n] === L.WOOD);
    if (c == null) { c = nb[0]; land[c] = L.ROCK; }
    if (!G.glow.includes(c)) G.glow.push(c);
  }
  return G;
}

export const FEAT_MIX = {
  [L.MEADOW]: { b: [2, 3], h: .13, u: [0, 1], k: [1, 2], s: [1, 1], n: [0, 1] },
  [L.POND]: { b: [1, 2], h: .09, u: [2, 3], k: [1, 1], s: [0, 1], n: [0, 1] },
  [L.ROCK]: { b: [0, 1], h: .25, u: [0, 1], k: [2, 3], s: [1, 2], n: [1, 2] },
  [L.WOOD]: { b: [2, 3], h: .09, u: [1, 2], k: [0, 1], s: [1, 1], n: [1, 2] },
  [L.WATER]: { b: [1, 1], h: .2, u: [2, 2], k: [1, 1], s: [0, 0], n: [0, 1] },
};
export const DECOR = 'oemi';   // feature kinds that are scenery: never acted on, never block

export function finishLayout(lay, R, spawnPt0, occ) {
  let spawnPt = spawnPt0;
  const { tiles, feats } = lay, I = (x, y) => y * PW + x;
  const solid = new Uint8Array(PW * PH);
  for (let i = 0; i < PW * PH; i++) solid[i] = T_BLOCK[tiles[i]];
  for (const f of feats) if (!DECOR.includes(f.kind)) solid[I(f.x, f.y)] = 1;
  // Anchor on the largest open region, so an edge band of cliff or water can't swallow the entry.
  const comp = new Int16Array(PW * PH).fill(-1); let best = -1, bestN = 0;
  for (let s0 = 0; s0 < PW * PH; s0++) {
    if (solid[s0] || comp[s0] >= 0) continue; let n = 0; const st = [s0]; comp[s0] = s0;
    while (st.length) { const i = st.pop(), x = i % PW, y = (i / PW) | 0; n++;
      for (const [dx, dy] of Object.values(DIRS)) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= PW || Y >= PH) continue; const j = I(X, Y); if (!solid[j] && comp[j] < 0) { comp[j] = s0; st.push(j); } } }
    if (n > bestN) { bestN = n; best = s0; }
  }
  const reach = new Uint8Array(PW * PH);
  for (let i = 0; i < PW * PH; i++) if (comp[i] === best && best >= 0) reach[i] = 1;
  if (!reach[I(spawnPt.x, spawnPt.y)]) { let bd = 1e9, bp = spawnPt;
    for (let i = 0; i < PW * PH; i++) if (reach[i]) { const x = i % PW, y = (i / PW) | 0, d = Math.hypot(x - spawnPt.x, y - spawnPt.y); if (d < bd) { bd = d; bp = { x, y }; } }
    spawnPt = bp; }
  // Slabs must be pushable where they spawn: some way has a free tile beyond and a reachable tile to stand on,
  // and water or cliff touches at most one side. A slab that fails moves to the nearest spot that passes.
  { const wet = t => t === T.WATER || t === T.DEEP || t === T.CLIFF || t === T.CWALL || t === T.ISLE;
    const ok = (x, y) => { if (x < 2 || y < 2 || x >= PW - 2 || y >= PH - 2) return false;
      if (Object.values(DIRS).filter(([dx, dy]) => wet(tiles[I(x + dx, y + dy)])).length > 1) return false;
      return Object.values(DIRS).some(([dx, dy]) => { const tx = x + dx, ty = y + dy, sx = x - dx, sy = y - dy; return !solid[I(tx, ty)] && tiles[I(tx, ty)] !== T.STEP && tx >= 1 && ty >= 1 && tx < PW - 1 && ty < PH - 1 && reach[I(sx, sy)] && !solid[I(sx, sy)]; }); };
    for (const f of feats) { if (f.kind !== 's' || ok(f.x, f.y)) continue;
      solid[I(f.x, f.y)] = 0; let bd = 1e9, bp = null;
      for (let i = 0; i < PW * PH; i++) { const x = i % PW, y = (i / PW) | 0; if (solid[i] || !reach[i] || tiles[i] === T.STEP || (x === spawnPt.x && y === spawnPt.y)) continue; solid[i] = 1; const good = ok(x, y); solid[i] = 0;
        if (good) { const d = Math.abs(x - f.x) + Math.abs(y - f.y); if (d < bd) { bd = d; bp = { x, y }; } } }
      if (bp) { f.x = bp.x; f.y = bp.y; } solid[I(f.x, f.y)] = 1; reach[I(f.x, f.y)] = 0; } }
  // Drop features nobody could ever stand next to.
  lay.feats = feats.filter(f => DECOR.includes(f.kind) || f.kind === 'g' ||
    Object.values(DIRS).some(([dx, dy]) => { const x = f.x + dx, y = f.y + dy; return x >= 0 && y >= 0 && x < PW && y < PH && reach[I(x, y)]; }));
  lay.reach = reach; lay.spawnPt = spawnPt;
  // Distance to the nearest shelter, for creatures heading for cover.
  const sd = new Int16Array(PW * PH).fill(999), sq = [];
  for (let i = 0; i < PW * PH; i++) if (lay.shelter[i] && !T_BLOCK[tiles[i]]) { sd[i] = 0; sq.push(i); }
  for (let h = 0; h < sq.length; h++) { const i = sq[h], x = i % PW, y = (i / PW) | 0;
    for (const [dx, dy] of Object.values(DIRS)) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= PW || Y >= PH) continue; const j = I(X, Y); if (sd[j] > sd[i] + 1 && !T_BLOCK[tiles[j]]) { sd[j] = sd[i] + 1; sq.push(j); } } }
  lay.sdist = sd;
  return lay;
}

// Beacons for the whole world, chosen once: the same seeded roll per cell as before, but a beacon is kept only
// if no beacon already stands within 2 cells (a spacing of at least 3), so two never sit side by side.
export function beaconCells(G, seed) {
  if (G.beacons && G.beacons.seed === seed) return G.beacons.set;
  const set = new Set();
  for (let c = 0; c < MW * MH; c++) { const land = G.land[c]; if (land !== L.ROCK && land !== L.MEADOW) continue;
    const cr = makeRng(hash(seed, 'cairn', c)); if (!cr.chance(land === L.ROCK ? .35 : .08)) continue;
    const p = cxy(c); let near = false; for (const b of set) { const q = cxy(b); if (Math.max(Math.abs(p.x - q.x), Math.abs(p.y - q.y)) <= 2) { near = true; break; } }
    if (!near) set.add(c); }
  G.beacons = { seed, set }; return set;
}
// Depots: about six per world, never two in one 5×5 area (Chebyshev distance 5 or more), on open land.
export function depotCells(G, seed) {
  if (G.depots && G.depots.seed === seed) return G.depots.set;
  const set = new Set(), R = makeRng(hash(seed, 'depots')), cand = [];
  for (let c = 0; c < MW * MH; c++) if (passableIn(G, c) && G.land[c] !== L.WATER && !G.island[c] && c !== G.gate && c !== G.deep && c !== G.swim && !beaconCells(G, seed).has(c)) cand.push({ c, r: R.f() });
  cand.sort((a, b) => a.r - b.r);
  for (const { c } of cand) { if (set.size >= 6) break; const p = cxy(c);
    if ([...set].every(d => { const q = cxy(d); return Math.max(Math.abs(p.x - q.x), Math.abs(p.y - q.y)) >= 5; })) set.add(c); }
  G.depots = { seed, set }; return set;
}
export function genPatch(G, seed, cell) {
  const R = makeRng(hash(seed, 'patch', cell)), ns = hash(seed, 'pn', cell);
  const land = G.land[cell], { x: cx, y: cy } = cxy(cell), isFord = land === L.WATER;
  const tiles = new Uint8Array(PW * PH), shelter = new Uint8Array(PW * PH), feats = [], occ = new Uint8Array(PW * PH);
  const I = (x, y) => y * PW + x, inb = (x, y) => x >= 0 && y >= 0 && x < PW && y < PH;
  const setT = (x, y, t) => { if (inb(x, y)) tiles[I(x, y)] = t; };
  const base = land === L.WOOD ? T.DARK : land === L.ROCK ? T.SAND : T.GRASS;
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
    let t = base; const n = fbm(ns, x, y, 5);
    if (base === T.GRASS) { if (n > .63) t = T.TALL; else if (rnd(ns, x, y, 1) < .045) t = T.FLOWERS; }
    else if (base === T.DARK) { if (n > .6) t = T.TALL; }
    else if (n < .34) t = T.GRASS;
    tiles[I(x, y)] = t;
  }
  // Edges that face wide water or cliffs on the map become water or cliff here.
  // On the bank across from the island, the edge is fast deep water with the island beyond it.
  const nbLand = (dx, dy) => { const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= MW || y >= MH) return -1; const c = y * MW + x;
    if (G.land[c] === L.WATER) return G.ford[c] ? L.POND : L.WATER; return G.land[c]; };
  for (const [dn, dx, dy] of [['up', 0, -1], ['down', 0, 1], ['left', -1, 0], ['right', 1, 0]]) {
    const swimSide = cell === G.swim && dn === G.swimDir;
    const nl = nbLand(dx, dy); if (!swimSide && nl !== L.WATER && nl !== L.CLIFF) continue;
    if (isFord && dx === 0) continue;
    const len = dx === 0 ? PW : PH;
    for (let k = 0; k < len; k++) {
      const depth = swimSide ? 7 + Math.round(fbm(ns + 61, k, 0, 4) * 1.5) : 3 + Math.round(fbm(ns + dx * 7 + dy * 13 + 99, k, 0, 4) * 2.5);
      for (let d = 0; d <= depth; d++) {
        const x = dn === 'left' ? d : dn === 'right' ? PW - 1 - d : k, y = dn === 'up' ? d : dn === 'down' ? PH - 1 - d : k;
        if (swimSide) { if (d < 3) setT(x, y, T.ISLE); else if (d < depth) setT(x, y, T.DEEP); else if (!T_BLOCK[tiles[I(x, y)]]) setT(x, y, rnd(ns, x, y, 2) < .5 ? T.REEDS : T.SAND); }
        else if (d < depth) { if (tiles[I(x, y)] !== T.DEEP && tiles[I(x, y)] !== T.ISLE) setT(x, y, nl === L.WATER ? T.WATER : T.CLIFF); }
        else if (nl === L.WATER && !T_BLOCK[tiles[I(x, y)]]) setT(x, y, rnd(ns, x, y, 2) < .5 ? T.REEDS : T.SAND);
      }
    }
  }
  if (isFord) { // a shallow river through the middle, with stepping stones across
    for (let y = 0; y < PH; y++) { const w = Math.round((fbm(ns + 3, 0, y, 4) - .5) * 4);
      for (let x = 9 + w; x <= 18 + w; x++) setT(x, y, T.WATER); setT(8 + w, y, T.REEDS); setT(19 + w, y, T.SAND); }
    for (let x = 0; x < PW; x++) if (tiles[I(x, 16)] === T.WATER) setT(x, 16, T.STEP);
  }
  const keep = i => tiles[i] === T.DEEP || tiles[i] === T.ISLE || tiles[i] === T.CLIFF;
  if (land === L.POND) {
    const px = 6 + R.int(16), py = 5 + R.int(16), rx = 3.5 + R.f() * 2.5, ry = 3.5 + R.f() * 3;
    for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
      if (keep(I(x, y))) continue;
      const dx = (x - px) / rx, dy = (y - py) / ry, v = dx * dx + dy * dy + (fbm(ns + 5, x, y, 3) - .5) * .8;
      if (v < 1) setT(x, y, T.WATER); else if (v < 1.6 && tiles[I(x, y)] !== T.WATER) setT(x, y, rnd(ns, x, y, 3) < .55 ? T.REEDS : T.SAND);
    }
  }
  const walk = (x, y) => inb(x, y) && !T_BLOCK[tiles[I(x, y)]];
  // Rock outcrops with an overhang to shelter under.
  const ovN = Math.max(G.glow.includes(cell) ? 1 : 0, land === L.ROCK ? 2 : land === L.MEADOW ? 1 : R.chance(.45) ? 1 : 0);
  for (let k = 0, tries = 0; k < ovN && tries < 400; tries++) {
    const ox = 2 + R.int(PW - 7), oy = 2 + R.int(PH - 8); let okO = true;
    for (let dy = 0; dy <= 3 && okO; dy++) for (let dx = -1; dx <= 3; dx++) if (!walk(ox + dx, oy + dy)) { okO = false; break; }
    if (!okO) continue;
    for (let dx = 0; dx < 3; dx++) { setT(ox + dx, oy, T.ROCK); setT(ox + dx, oy + 1, T.ROCK); shelter[I(ox + dx, oy + 2)] = 1; occ[I(ox + dx, oy + 2)] = 1; }
    feats.push({ id: 'o' + k, kind: 'o', x: ox, y: oy }); k++;
  }
  // Boulders.
  const rockN = land === L.ROCK ? 6 + R.int(4) : R.int(2) + (land === L.MEADOW ? 1 : 0);
  for (let k = 0; k < rockN; k++) { const x = 2 + R.int(PW - 4), y = 2 + R.int(PH - 4), s = R.chance(.45) ? 1 : 0;
    for (let dy = -s; dy <= s; dy++) for (let dx = -s; dx <= s; dx++) if (walk(x + dx, y + dy) && (s === 0 || R.chance(.8))) setT(x + dx, y + dy, T.ROCK); }
  // Trees (trunk blocks; the canopy is see-through and gives no shelter).
  const treeN = land === L.WOOD ? 11 + R.int(5) : land === L.MEADOW ? 1 + R.int(2) : R.int(2);
  for (let k = 0, tries = 0; k < treeN && tries < 200; tries++) {
    const x = 2 + R.int(PW - 4), y = 2 + R.int(PH - 4); let okT = true;
    for (let dy = -1; dy <= 1 && okT; dy++) for (let dx = -1; dx <= 1; dx++) if (!walk(x + dx, y + dy)) { okT = false; break; }
    for (let dy = -2; dy <= 2 && okT; dy++) for (let dx = -2; dx <= 2; dx++) if (inb(x + dx, y + dy) && tiles[I(x + dx, y + dy)] === T.TRUNK) { okT = false; break; }
    if (okT) { setT(x, y, T.TRUNK); k++; }
  }
  // The cliff gate: a narrow burrow in the cliff face under the cave mouth.
  const spawnPt = { x: 14, y: PH - 3 };
  const carve = (x0, y0, x1, y1) => {
    const fix = (x, y) => { if (!inb(x, y)) return; const t = tiles[I(x, y)]; if (t === T.WATER) setT(x, y, T.STEP); else if (T_BLOCK[t]) setT(x, y, base === T.DARK ? T.DARK : T.SAND); occ[I(x, y)] = 1; };
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) fix(x0, y);
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) fix(x, y1);
  };
  if (cell === G.gate) {
    for (let x = 0; x < PW; x++) { const depth = 4 + Math.round(fbm(ns + 41, x, 0, 4) * 2); for (let y = 0; y < depth; y++) setT(x, y, T.CLIFF); }
    const gx = 11 + R.int(6); let gy = 0; while (tiles[I(gx, gy + 1)] === T.CLIFF) gy++;
    for (let dx = -1; dx <= 1; dx++) { setT(gx + dx, gy + 1, T.SAND); occ[I(gx + dx, gy + 1)] = 1; }
    carve(gx, gy + 1, spawnPt.x, spawnPt.y);
    feats.push({ id: 'g', kind: 'g', x: gx, y: gy });
  }
  if (cell === G.swim) { // a pod lies on the island shore, in plain sight and out of reach
    const m = G.swimDir, ix = m === 'left' ? 2 : m === 'right' ? PW - 3 : 13, iy = m === 'up' ? 2 : m === 'down' ? PH - 3 : 15;
    feats.push({ id: 'i', kind: 'i', x: ix, y: iy });
    // keep a dry strip along the bank so the fast water can be reached
    for (let k = 0; k < (m === 'up' || m === 'down' ? PW : PH); k++) {
      for (let d = 10; d <= 12; d++) { const x = m === 'left' ? d : m === 'right' ? PW - 1 - d : k, y = m === 'up' ? d : m === 'down' ? PH - 1 - d : k;
        if (inb(x, y) && T_BLOCK[tiles[I(x, y)]] && tiles[I(x, y)] !== T.DEEP) setT(x, y, base === T.DARK ? T.DARK : T.SAND); }
    }
  }
  // (Tree canopies give no shelter: only overhangs, caves and a lit outpost keep strikes off you.)
  // Interactive features.
  const spot = (minSep) => { for (let t = 0; t < 90; t++) {
      const x = 2 + R.int(PW - 4), y = 2 + R.int(PH - 4), i = I(x, y);
      if (T_BLOCK[tiles[i]] || tiles[i] === T.STEP || occ[i]) continue;
      if (Math.abs(x - spawnPt.x) + Math.abs(y - spawnPt.y) < 4) continue;
      if (feats.some(f => f.kind !== 'o' && Math.abs(f.x - x) + Math.abs(f.y - y) < minSep)) continue;
      occ[i] = 1; return { x, y }; } return null; };
  const mix = FEAT_MIX[land] || FEAT_MIX[L.MEADOW];
  const n = ([a, b]) => a + R.int(b - a + 1);
  const addF = (kind, count, init) => { for (let k = 0; k < count; k++) { const p = spot(3); if (p) feats.push(Object.assign({ id: kind + k, kind, x: p.x, y: p.y }, init ? init() : {})); } };
  addF('b', n(mix.b));
  R.chance(mix.h);   // humming stones were cut this round (they gave Data); the roll stays so layouts don't shift
  addF('u', n(mix.u), () => ({ full: R.chance(.75) }));
  addF('k', n(mix.k), () => ({ ch: R.chance(.1) ? 2 : 0 }));
  addF('s', n(mix.s), () => ({ under: R.chance(.22) ? 'pod' : null }));
  addF('n', n(mix.n) + (cell === G.gate ? 1 : 0));
  // A beacon: lighting it shows land 3 cells around, beyond the Probe's range. (The hash salt keeps its old name so worlds stay the same.)
  if (beaconCells(G, seed).has(cell)) addF('j', 1);
  if (depotCells(G, seed).has(cell)) addF('h', 1);   // a depot: a post with a hut and a mast lamp
  if (cell === G.deep) { const p = { x: 14 + R.int(5) - 2, y: 12 + R.int(4) };
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = p.x + dx, Y = p.y + dy; if (T_BLOCK[tiles[I(X, Y)]]) setT(X, Y, T.SAND); }
    carve(p.x, p.y + 1, spawnPt.x, spawnPt.y);
    for (let i = feats.length - 1; i >= 0; i--) if (cheb(feats[i], p) <= 1 && feats[i].kind !== 'o') feats.splice(i, 1);
    feats.push({ id: 'd', kind: 'd', x: p.x, y: p.y }); }
  const lay = { key: String(cell), cell, cave: false, land, base, tiles, shelter, feats };
  return finishLayout(lay, R, spawnPt, occ);
}

export function genCave(seed, cell) {
  const R = makeRng(hash(seed, 'cave', cell)), ns = hash(seed, 'cn', cell);
  const tiles = new Uint8Array(PW * PH).fill(T.CWALL), shelter = new Uint8Array(PW * PH).fill(1), feats = [], occ = new Uint8Array(PW * PH);
  const I = (x, y) => y * PW + x, setT = (x, y, t) => { if (x >= 0 && y >= 0 && x < PW && y < PH) tiles[I(x, y)] = t; };
  for (let y = 1; y < PH - 1; y++) for (let x = 1; x < PW - 1; x++) {
    const dx = (x - 13.5) / 12, dy = (y - 15) / 13.5, v = dx * dx + dy * dy + (fbm(ns, x, y, 4) - .5) * .9;
    if (v < .9) setT(x, y, T.CFLOOR);
  }
  for (let k = 0; k < 4; k++) { const px = 5 + R.int(18), py = 5 + R.int(15); for (let dy = -1; dy <= 0; dy++) for (let dx = -1; dx <= 0; dx++) if (R.chance(.85)) setT(px + dx, py + dy, T.CWALL); }
  for (let y = 21; y <= 28; y++) for (let x = 12; x <= 16; x++) setT(x, y, T.CFLOOR);
  for (let y = 6; y <= 21; y++) setT(14, y, T.CFLOOR);
  const spawnPt = { x: 14, y: 27 };
  feats.push({ id: 'x', kind: 'x', x: 14, y: 28 }); occ[I(14, 28)] = 1;
  for (let y = 25; y <= 27; y++) for (let x = 13; x <= 15; x++) occ[I(x, y)] = 1;
  const spot = (pred) => { for (let t = 0; t < 120; t++) { const x = 2 + R.int(PW - 4), y = 2 + R.int(PH - 4), i = I(x, y);
      if (tiles[i] !== T.CFLOOR || occ[i] || (pred && !pred(x, y))) continue;
      if (feats.some(f => Math.abs(f.x - x) + Math.abs(f.y - y) < 3)) continue; occ[i] = 1; return { x, y }; } return null; };
  for (let k = 0; k < 3; k++) { const p = spot((x, y) => y >= 13 && y <= 21); if (p) feats.push({ id: 'e' + k, kind: 'e', x: p.x, y: p.y }); }
  for (let k = 0; k < 7; k++) { const p = spot(); if (p) { feats.push({ id: 'm' + k, kind: 'm', x: p.x, y: p.y }); occ[I(p.x, p.y)] = 0; } }
  [2, 2, 0].forEach((ch, k) => { const p = spot(); if (p) feats.push({ id: 'k' + k, kind: 'k', x: p.x, y: p.y, ch }); });
  for (let k = 0; k < 2; k++) { const p = spot(); if (p) feats.push({ id: 'u' + k, kind: 'u', x: p.x, y: p.y, full: true }); }
  { const p = spot(); if (p) feats.push({ id: 'n0', kind: 'n', x: p.x, y: p.y }); }
  { const p = spot(); if (p) feats.push({ id: 's0', kind: 's', x: p.x, y: p.y, under: 'pod' }); }
  const lay = { key: 'c' + cell, cell, cave: true, land: L.ROCK, base: T.CFLOOR, tiles, shelter, feats };
  finishLayout(lay, R, spawnPt, occ);
  for (let i = 0; i < PW * PH; i++) if (tiles[i] === T.CFLOOR && !lay.reach[i] && !lay.feats.some(f => f.y * PW + f.x === i)) tiles[i] = T.CWALL;
  return lay;
}

export function genPlace(G, seed, key) {
  if (G.gen === 2) return key[0] === 'c' ? genCave2(seed, +key.slice(1)) : genPatch2(G, seed, +key);
  return key[0] === 'c' ? genCave(seed, +key.slice(1)) : genPatch(G, seed, +key);
}

// ---- generator 2 (integer only) ----
// Terrain levels and stairs: today's meadow with three height levels, one-level steps, cliff edges and stairs (ramp edges) on a spanning
// tree. Integers only, so a C port gives the same worlds: every random number comes from hash() or makeRng(...).int(n), every
// sort breaks ties by the lower index, arrays are of fixed size and queues are capped at 320. No generator 2 world writes L.CLIFF.

export const LEVELS = 3;
export const EDGE = { OPEN: 0, CLIFF: 1, RAMP: 2 };          // 3 LEDGE, 4 RIVER, 5 FOREST, 6 GATE reserved for phases 2–5
export const STAIR = { W: 2, H: 2, LANDING_ROWS: 1, FACE_ROWS_PER_LEVEL: 2, JITTER: 4,
                       PER_EDGE: 1, MIN_RUN_BETWEEN: 2, PITCH: 4 };
export const CLIFF_EDGE_GAPS = 0;                              // cliff edges are solid
export const G2 = { TRIES: 8, P1: 8, P2: 4, WOOD_N: 80, ROCK_N: 48, RAMP_Q: 16384, LV_PCT: [15, 45, 40],
                    ZONE_MIN: 4, MIN_SHARE_PCT: 10, MIN_COMP_PCT: 70, START_REACH: 12, SADDLE_SCANS: 64 };
// The terrain layer of a generator 2 place: the piece kind in lay.terr, its mask or part in lay.tmask.
export const TERR = { NONE: 0, LIP: 1, FACE: 2, SIDE: 3, SHADOW: 4, STAIR: 5, LANDING: 6, FOOT: 7, APRON_TOP: 8 };

const NC = MW * MH;
const NB8 = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];   // N, NE, E, SE, S, SW, W, NW: a lip's mask bits
const SIDES = [['up', 0, -1], ['down', 0, 1], ['left', -1, 0], ['right', 1, 0]];

// Value noise in Q15 (0–32767) at integer x, y >= 0 on a lattice of P.
const sm = f => (((f * f) >>> 15) * (98304 - 2 * f)) >>> 15;          // smoothstep in Q15
const lerpQ = (a, b, w) => a + (((b - a) * w) >> 15);                  // arithmetic shift (floor)
export function noiseQ(s, x, y, P) {
  const ix = (x / P) | 0, iy = (y / P) | 0, fx = (((x % P) * 32768) / P) | 0, fy = (((y % P) * 32768) / P) | 0;
  const v = (i, j) => hash(s, i, j) >>> 17, sx = sm(fx), sy = sm(fy);
  return lerpQ(lerpQ(v(ix, iy), v(ix + 1, iy), sx), lerpQ(v(ix, iy + 1), v(ix + 1, iy + 1), sx), sy); }
const n2 = (s, x, y) => ((2 * noiseQ(hash(s, 1), x, y, G2.P1) + noiseQ(hash(s, 2), x, y, G2.P2)) / 3) | 0;   // two octaves, lattices 8 and 4
// noiseQ over a place's tiles (0 <= x < PW, 0 <= y < PH) with each lattice value hashed once: the same numbers as noiseQ(s, x, y, P).
function noiseTab(s, P) {
  const gw = (((PW - 1) / P) | 0) + 2, gh = (((PH - 1) / P) | 0) + 2, g = new Int32Array(gw * gh);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) g[j * gw + i] = hash(s, i, j) >>> 17;
  return (x, y) => { const ix = (x / P) | 0, iy = (y / P) | 0, sx = sm((((x % P) * 32768) / P) | 0), sy = sm((((y % P) * 32768) / P) | 0), k = iy * gw + ix;
    return lerpQ(lerpQ(g[k], g[k + 1], sx), lerpQ(g[k + gw], g[k + gw + 1], sx), sy); };
}

// Edges (D10): edge[2c] is the kind of cell c's east side, edge[2c + 1] of its south side.
export function edgeIndex(a, dir) {   // a is a cell, dir a DIRS key; the caller has checked the neighbour is on the map
  return dir === 'right' ? 2 * a : dir === 'left' ? 2 * (a - 1) : dir === 'down' ? 2 * a + 1 : 2 * (a - MW) + 1; }
export function edgeKindIn(G, a, dir) { return G.edge ? G.edge[edgeIndex(a, dir)] : EDGE.OPEN; }   // generator 1: every edge is open
export function canStepIn(G, a, dir) {
  const [dx, dy] = DIRS[dir], x = a % MW + dx, y = ((a / MW) | 0) + dy;
  if (x < 0 || y < 0 || x >= MW || y >= MH) return false;
  const b = y * MW + x, k = edgeKindIn(G, a, dir);
  return passableIn(G, b) && (k === EDGE.OPEN || k === EDGE.RAMP); }   // an unknown kind blocks
// A stair's first tile along its side: i is the edge index, len PW on north and south sides, PH on east and west; seed is the world seed.
export function stairPos(seed, i, len) { return (len / 2 - 1) + (hash(seed, 'stair', i) % 9) - 4; }

const onMapXY = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH;
const rankTop = (vals, cells, n) => cells.slice().sort((a, b) => vals[b] - vals[a] || a - b).slice(0, n);
const nearWater = (land, c) => { const x = c % MW, y = (c / MW) | 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (onMapXY(x + dx, y + dy) && land[(y + dy) * MW + x + dx] === L.WATER) return true;
  return false; };

// Stage 1: base land, today's meadow made integer.
function g2Land(sub) {
  const at = (x, y) => y * MW + x;
  const land = new Uint8Array(NC), ford = new Uint8Array(NC), island = new Uint8Array(NC);
  const m = new Int32Array(NC), r = new Int32Array(NC), sM = sub('m'), sR = sub('r'), all = [];
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) { m[at(x, y)] = n2(sM, x, y); r[at(x, y)] = n2(sR, x, y); }
  for (let c = 0; c < NC; c++) all.push(c);
  for (const c of rankTop(m, all, G2.WOOD_N)) land[c] = L.WOOD;
  for (const c of rankTop(r, all.filter(c => land[c] !== L.WOOD), G2.ROCK_N)) land[c] = L.ROCK;
  const R = makeRng(sub('river')), rxs = new Int32Array(MH);
  let rx = 9 + R.int(3);
  for (let y = 0; y < MH; y++) {
    if (y > 0 && R.int(100) < 45) { const nx = clamp(rx + (R.int(2) ? 1 : -1), 8, 13); if (nx !== rx) { land[at(nx, y - 1)] = L.WATER; rx = nx; } }
    land[at(rx, y)] = L.WATER; rxs[y] = rx;
  }
  const iy = 11 + R.int(3), ix = rxs[iy];
  for (let y = iy - 1; y <= iy + 1; y++) for (let x = ix - 1; x <= ix + 2; x++) land[at(clamp(x, 0, MW - 1), y)] = L.WATER;
  land[at(rxs[iy - 2], iy - 1)] = L.WATER; land[at(rxs[iy + 2], iy + 1)] = L.WATER;
  land[at(ix, iy)] = L.MEADOW; land[at(ix + 1, iy)] = R.int(2) ? L.WOOD : L.MEADOW;
  island[at(ix, iy)] = 1; island[at(ix + 1, iy)] = 1;
  for (const fy of [1 + R.int(3), 16 + R.int(3)]) for (let x = 0; x < MW; x++) if (land[at(x, fy)] === L.WATER) ford[at(x, fy)] = 1;
  const lx = 1 + R.int(5), ly = 12 + R.int(6);
  land[at(lx, ly)] = L.WATER;
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const c = at(x, y); if (land[c] === L.WATER || island[c]) continue;
    let wet = false;
    for (const [, dx, dy] of SIDES) { const X = x + dx, Y = y + dy; if (onMapXY(X, Y) && land[at(X, Y)] === L.WATER && !ford[at(X, Y)]) wet = true; }
    if (wet && (land[c] === L.MEADOW || R.int(100) < 35)) land[c] = L.POND;
  }
  return { land, ford, island };
}

// The exact closure: two raster passes, so that every pair of 8-neighbours differs by at most 1. It only lowers cells.
function g2Close(lv) {
  const mn = (c, n) => { if (lv[n] + 1 < lv[c]) lv[c] = lv[n] + 1; };
  for (let c = 0; c < NC; c++) { const x = c % MW, y = (c / MW) | 0;
    if (x > 0) mn(c, c - 1); if (x > 0 && y > 0) mn(c, c - MW - 1); if (y > 0) mn(c, c - MW); if (x < MW - 1 && y > 0) mn(c, c - MW + 1); }
  for (let c = NC - 1; c >= 0; c--) { const x = c % MW, y = (c / MW) | 0;
    if (x < MW - 1) mn(c, c + 1); if (x < MW - 1 && y < MH - 1) mn(c, c + MW + 1); if (y < MH - 1) mn(c, c + MW); if (x > 0 && y < MH - 1) mn(c, c + MW - 1); }
}
const isSaddle = (lv, a) => { const b = a + 1, c = a + MW, d = a + MW + 1; return lv[a] === lv[d] && lv[b] === lv[c] && lv[a] !== lv[b]; };
function g2Saddles(lv) {
  for (let k = 0; k < G2.SADDLE_SCANS; k++) {
    let fixed = 0;
    for (let y = 0; y < MH - 1; y++) for (let x = 0; x < MW - 1; x++) { const a = y * MW + x;
      if (!isSaddle(lv, a)) continue;
      if (lv[a] > lv[a + 1]) lv[a + MW + 1]--; else lv[a + MW]--;   // the higher pair's larger-index cell
      fixed++; }
    if (!fixed) return;
    g2Close(lv);
  }
}
// Zones: 4-connected groups of passable, non-island cells of one level, numbered in cell-index scan order.
function g2Zones(Gp, lv) {
  const id = new Int16Array(NC).fill(-1), q = new Int16Array(NC), cells = [], lvOf = [];
  for (let s = 0; s < NC; s++) {
    if (id[s] >= 0 || !passableIn(Gp, s) || Gp.island[s]) continue;
    const z = cells.length, list = []; let h = 0, t = 0; q[t++] = s; id[s] = z;
    while (h < t) { const c = q[h++], x = c % MW, y = (c / MW) | 0; list.push(c);
      for (const [, dx, dy] of SIDES) { const X = x + dx, Y = y + dy; if (!onMapXY(X, Y)) continue; const d = Y * MW + X;
        if (id[d] < 0 && passableIn(Gp, d) && !Gp.island[d] && lv[d] === lv[s]) { id[d] = z; q[t++] = d; } } }
    cells.push(list); lvOf.push(lv[s]);
  }
  return { id, cells, lvOf, n: cells.length };
}
// Stage 3 step 5: a small zone whose bordering zones all have one level takes it (not upward beside water). Up to 4 rounds.
function g2SmallZones(Gp, lv) {
  for (let round = 0; round < 4; round++) {
    const Z = g2Zones(Gp, lv); let changed = false;
    for (let z = 0; z < Z.n; z++) {
      if (Z.cells[z].length >= G2.ZONE_MIN) continue;
      let to = -1, mixed = false, wet = false;
      for (const c of Z.cells[z]) { const x = c % MW, y = (c / MW) | 0; if (nearWater(Gp.land, c)) wet = true;
        for (const [, dx, dy] of SIDES) { const X = x + dx, Y = y + dy; if (!onMapXY(X, Y)) continue; const o = Z.id[Y * MW + X];
          if (o < 0 || o === z) continue; if (to < 0) to = Z.lvOf[o]; else if (to !== Z.lvOf[o]) mixed = true; } }
      if (to < 0 || mixed || (to !== 0 && wet)) continue;
      for (const c of Z.cells[z]) lv[c] = to;
      changed = true;
    }
    if (!changed) break;
    g2Close(lv);
  }
  g2Saddles(lv);
}
// Stage 6: the largest 4-connected set under canStepIn; ties keep the lowest start.
function g2Comp(Gp) {
  const seen = new Int16Array(NC).fill(-1), q = new Int16Array(NC), comp = new Uint8Array(NC); let best = -1, bestN = 0;
  for (let s = 0; s < NC; s++) {
    if (seen[s] >= 0 || !passableIn(Gp, s)) continue;
    let h = 0, t = 0; q[t++] = s; seen[s] = s;
    while (h < t) { const c = q[h++], x = c % MW, y = (c / MW) | 0;
      for (const [dir, dx, dy] of SIDES) { if (!canStepIn(Gp, c, dir)) continue; const d = (y + dy) * MW + x + dx; if (seen[d] < 0) { seen[d] = s; q[t++] = d; } } }
    if (t > bestN) { bestN = t; best = s; }
  }
  for (let c = 0; c < NC; c++) comp[c] = seen[c] === best && best >= 0 ? 1 : 0;
  return comp;
}
// The cells reachReach would give from c within Chebyshev r: a BFS over canStepIn, without the island.
function g2ReachCount(Gp, c0, r) {
  const seen = new Uint8Array(NC), q = new Int16Array(NC), x0 = c0 % MW, y0 = (c0 / MW) | 0; let h = 0, t = 0; q[t++] = c0; seen[c0] = 1;
  while (h < t) { const c = q[h++], x = c % MW, y = (c / MW) | 0;
    for (const [dir, dx, dy] of SIDES) { const X = x + dx, Y = y + dy; if (!onMapXY(X, Y)) continue; const d = Y * MW + X;
      if (seen[d] || !canStepIn(Gp, c, dir) || Gp.island[d] || Math.max(Math.abs(X - x0), Math.abs(Y - y0)) > r) continue; seen[d] = 1; q[t++] = d; } }
  return t;
}

// One attempt t (0–7; 8 is the fallback). Returns the world, or null when a set piece has no cell.
function g2Attempt(seed, t) {
  const s0 = hash(seed, 'g2', t), sub = k => hash(s0, k), fallback = t === G2.TRIES;
  const { land, ford, island } = g2Land(sub);
  const orient = hash(s0, 'orient') & 3, lv = new Uint8Array(NC), edge = new Uint8Array(2 * NC);
  const Gp = { land, ford, island, edge };
  let Z = null;
  if (!fallback) {
    // Stage 2: height, rising toward the mountain edge (east, or west when orient bit 0 is set).
    const H = new Int32Array(NC), sH = sub('h');
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) { const xr = (orient & 1) ? MW - 1 - x : x; H[y * MW + x] = n2(sH, x, y) + ((G2.RAMP_Q * xr / 15) | 0); }
    // Stage 3: levels by rank, the water ring, the closure, saddles, small zones.
    const dry = []; for (let c = 0; c < NC; c++) if (land[c] !== L.WATER) dry.push(c);
    dry.sort((a, b) => H[a] - H[b] || a - b);
    const q0 = (dry.length * G2.LV_PCT[0] / 100) | 0, q1 = (dry.length * (G2.LV_PCT[0] + G2.LV_PCT[1]) / 100) | 0;
    dry.forEach((c, i) => { lv[c] = i < q0 ? 0 : i < q1 ? 1 : 2; });
    for (let c = 0; c < NC; c++) if (nearWater(land, c)) lv[c] = 0;
    g2Close(lv);
    g2Saddles(lv);
    g2SmallZones(Gp, lv);
    Z = g2Zones(Gp, lv);
  } else {
    // The fallback: every level 0, one mouth cell raised to 1.
    const cand = [];
    for (let c = 0; c < NC; c++) { const x = c % MW, y = (c / MW) | 0;
      if (x >= 1 && x <= MW - 2 && y <= MH - 2 && land[c] !== L.WATER && land[c + MW] !== L.WATER && !island[c + MW] && !nearWater(land, c)) cand.push(c); }
    if (!cand.length) return null;
    lv[cand[makeRng(sub('flat')).int(cand.length)]] = 1;
  }
  // Stage 4: edges.
  for (let c = 0; c < NC; c++) { const x = c % MW, y = (c / MW) | 0;
    if (x < MW - 1 && lv[c] !== lv[c + 1]) edge[2 * c] = EDGE.CLIFF;
    if (y < MH - 1 && lv[c] !== lv[c + MW]) edge[2 * c + 1] = EDGE.CLIFF; }
  // Stage 5: ramps by spanning tree over the zones (Kruskal on hashed keys).
  if (!fallback) {
    const cand = [];
    for (let i = 0; i < 2 * NC; i++) { if (edge[i] !== EDGE.CLIFF) continue; const a = i >> 1, b = (i & 1) ? a + MW : a + 1;
      if (passableIn(Gp, a) && passableIn(Gp, b) && !island[a] && !island[b]) cand.push({ i, a, b, key: hash(s0, 'ramp', i) }); }
    cand.sort((p, q) => p.key - q.key || p.i - q.i);
    const up = new Int16Array(Z.n); for (let z = 0; z < Z.n; z++) up[z] = z;
    const find = z => { while (up[z] !== z) z = up[z]; return z; };
    for (const e of cand) { const ra = find(Z.id[e.a]), rb = find(Z.id[e.b]); if (ra === rb) continue; up[ra < rb ? rb : ra] = ra < rb ? ra : rb; edge[e.i] = EDGE.RAMP; }
  }
  const cross = [];
  for (let i = 0; i < 2 * NC; i++) if (edge[i] === EDGE.RAMP) cross.push({ c: i >> 1, side: (i & 1) ? 's' : 'e', kind: 'ramp' });
  // Stage 6.
  const comp = g2Comp(Gp);
  // Stage 7: set pieces, each with its own generator.
  const RG = makeRng(sub('gate')), gc = [];
  for (let c = MW; c < NC; c++) { const x = c % MW;
    if (x >= 1 && x <= MW - 2 && edge[2 * (c - MW) + 1] === EDGE.CLIFF && lv[c - MW] === lv[c] + 1 && comp[c] && land[c] !== L.WATER && land[c - MW] !== L.WATER) gc.push(c); }
  if (!gc.length) return null;
  const gate = gc[RG.int(gc.length)], mouth = gate - MW;
  land[gate] = L.ROCK;
  { const gx = gate % MW, gy = (gate / MW) | 0;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, 1]]) { const X = gx + dx, Y = gy + dy; if (!onMapXY(X, Y)) continue; const c = Y * MW + X;
      if (land[c] !== L.WATER && RG.int(100) < 60) land[c] = L.ROCK; } }
  const RD = makeRng(sub('deep')), rocks = [];
  for (let c = 0; c < NC; c++) if (comp[c] && c !== gate && land[c] === L.ROCK && cdist(c, gate) >= 5) rocks.push(c);
  if (!rocks.length) for (let c = 0; c < NC; c++) if (comp[c] && land[c] !== L.WATER && cdist(c, gate) >= 5) rocks.push(c);
  if (!rocks.length) return null;
  const deep = rocks[RD.int(rocks.length)]; land[deep] = L.ROCK;
  // The swimmer gate: generator 1's rule.
  let swim = -1, swimDir = null;
  { const isl = []; for (let c = 0; c < NC; c++) if (island[c]) isl.push(cxy(c));
    const sc = [];
    for (let c = 0; c < NC; c++) {
      if (!comp[c] || land[c] === L.WATER || c === gate || c === deep || island[c]) continue;
      const p = cxy(c);
      for (const [dn, dx, dy] of [['up', 0, -1], ['down', 0, 1], ['left', -1, 0], ['right', 1, 0]]) {
        const X = p.x + dx, Y = p.y + dy; if (!onMapXY(X, Y)) continue; const w = Y * MW + X;
        if (land[w] !== L.WATER || ford[w]) continue;
        const d = Math.min(...isl.map(i => cheb(i, { x: X, y: Y })));
        if (d <= 1) sc.push({ c, dn, k: d * 100 + Math.min(...isl.map(i => man(i, p))) * 10 + (dn === 'left' || dn === 'right' ? 0 : 1) });
      }
    }
    sc.sort((a, b) => a.k - b.k || a.c - b.c);
    if (sc.length) { swim = sc[0].c; swimDir = sc[0].dn; } }
  // Start glints: one near the gate, the rest spread out.
  const RS = makeRng(sub('spawn')), spawns = [];
  const ok = c => { if (!comp[c] || c === gate || c === deep || land[c] === L.WATER) return false;
    const x = c % MW, y = (c / MW) | 0; let n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy; if (onMapXY(X, Y) && passableIn(Gp, Y * MW + X) && lv[Y * MW + X] === lv[c]) n++; }
    return n >= 6 && g2ReachCount(Gp, c, 2) >= G2.START_REACH; };
  const sc = []; for (let c = 0; c < NC; c++) if (ok(c)) sc.push(c);
  const near = sc.filter(c => cdist(c, gate) >= 2 && cdist(c, gate) <= 4);
  if (near.length) spawns.push(near[RS.int(near.length)]);
  const sh = sc.slice(); for (let i = sh.length - 1; i > 0; i--) { const j = RS.int(i + 1), v = sh[i]; sh[i] = sh[j]; sh[j] = v; }
  for (const c of sh) { if (spawns.length >= 5) break; if (spawns.every(s => cdist(s, c) >= 5)) spawns.push(c); }
  // Glow neighbours: generator 1's rule, on the spawn's level.
  const glow = [];
  for (const s of spawns) {
    const p = cxy(s), nb = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const x = p.x + dx, y = p.y + dy; if ((!dx && !dy) || !onMapXY(x, y)) continue;
      const c = y * MW + x; if (comp[c] && passableIn(Gp, c) && land[c] !== L.WATER && c !== gate && c !== deep && c !== swim && !island[c] && !spawns.includes(c) && lv[c] === lv[s]) nb.push(c); }
    if (!nb.length) continue;
    let c = nb.find(n => land[n] === L.ROCK || land[n] === L.WOOD);
    if (c == null) { c = nb[0]; land[c] = L.ROCK; }
    if (!glow.includes(c)) glow.push(c);
  }
  // Beacons and outposts, computed here in the memo shape beaconCells and depotCells return.
  const bset = new Set();
  for (let c = 0; c < NC; c++) { if ((land[c] !== L.ROCK && land[c] !== L.MEADOW) || !comp[c]) continue;
    const cr = makeRng(hash(s0, 'cairn', c)); if (cr.int(100) >= (land[c] === L.ROCK ? 35 : 8)) continue;
    const p = cxy(c); let close = false; for (const b of bset) if (cheb(p, cxy(b)) <= 2) { close = true; break; }
    if (!close) bset.add(c); }
  const dc = [], dset = new Set();
  for (let c = 0; c < NC; c++) if (comp[c] && land[c] !== L.WATER && !island[c] && c !== gate && c !== deep && c !== swim && !bset.has(c)) dc.push({ c, k: hash(s0, 'depot', c) });
  dc.sort((a, b) => a.k - b.k || a.c - b.c);
  for (const { c } of dc) { if (dset.size >= 6) break; const p = cxy(c); if ([...dset].every(d => cheb(p, cxy(d)) >= 5)) dset.add(c); }
  return { seed, land, ford, island, gate, mouth, deep, swim, swimDir, spawns, comp, glow, gen: 2, attempt: t, orient, level: lv, edge, cross,
    beacons: { seed, set: bset }, depots: { seed, set: dset } };
}

// An attempt passes when all of these hold; the fallback is not held to the level shares or the ramp count.
function g2Check(G, fallback) {
  const lv = G.level, land = G.land, comp = G.comp, bad = [];
  for (let c = 0; c < NC; c++) { const x = c % MW, y = (c / MW) | 0;
    for (const [dx, dy] of NB8) { const X = x + dx, Y = y + dy; if (!onMapXY(X, Y)) continue; const n = Y * MW + X;
      if (Math.abs(lv[c] - lv[n]) > 1) bad.push('step'); if (land[c] === L.WATER && lv[n] !== 0) bad.push('ring'); }
    if (land[c] === L.WATER && lv[c] !== 0) bad.push('ring');
    if (x < MW - 1 && y < MH - 1 && isSaddle(lv, c)) bad.push('saddle'); }
  for (let Y = 0; Y <= MH; Y++) for (let X = 0; X <= MW; X++) { let ranks = 0;
    for (let dy = -1; dy <= 0; dy++) for (let dx = -1; dx <= 0; dx++) { const x = X + dx, y = Y + dy; if (!onMapXY(x, y)) continue; const c = y * MW + x;
      ranks |= 1 << (land[c] === L.WATER ? 0 : 1 + lv[c]); }
    if (((ranks & 1) + ((ranks >> 1) & 1) + ((ranks >> 2) & 1) + ((ranks >> 3) & 1)) > 2) bad.push('corner'); }
  if (!(G.gate >= 0)) bad.push('gate');
  if (G.spawns.length !== 5 || !(cdist(G.spawns[0], G.gate) >= 2 && cdist(G.spawns[0], G.gate) <= 4)) bad.push('spawns');
  const inComp = c => c >= 0 && comp[c] === 1;
  if (!inComp(G.deep) || !G.spawns.every(inComp) || !G.glow.every(inComp) || (G.swim >= 0 && !inComp(G.swim)) ||
      ![...G.beacons.set].every(inComp) || G.depots.set.size !== 6 || ![...G.depots.set].every(inComp)) bad.push('comp');
  let dry = 0, dryComp = 0; const per = [0, 0, 0];
  for (let c = 0; c < NC; c++) if (land[c] !== L.WATER && !G.island[c]) { dry++; if (comp[c]) dryComp++; per[lv[c]]++; }
  if (dryComp * 100 < G2.MIN_COMP_PCT * dry) bad.push('compShare');
  if (!fallback) {
    if (per.some(n => n * 100 < G2.MIN_SHARE_PCT * dry)) bad.push('share');
    if (G.cross.length < 1) bad.push('ramps');
  }
  return [...new Set(bad)];
}

export function genWorld2(seed) {
  for (let t = 0; t < G2.TRIES; t++) { const G = g2Attempt(seed, t); if (G && !g2Check(G, false).length) return G; }
  const G = g2Attempt(seed, G2.TRIES);
  if (G && !g2Check(G, true).length) return G;
  throw new RangeError('generator 2: no valid world for seed ' + seed);
}

// finishLayout with squared distances, ties by tile index; faces and lips count as wet beside a slab.
function finishLayout2(lay, spawnPt0) {
  let spawnPt = spawnPt0;
  const { tiles, feats } = lay, I = (x, y) => y * PW + x, NP = PW * PH, FAR = 1 << 30, DV = Object.values(DIRS);
  const solid = new Uint8Array(NP);
  for (let i = 0; i < NP; i++) solid[i] = T_BLOCK[tiles[i]];
  for (const f of feats) if (!DECOR.includes(f.kind)) solid[I(f.x, f.y)] = 1;
  const comp = new Int16Array(NP).fill(-1); let best = -1, bestN = 0;
  for (let s0 = 0; s0 < NP; s0++) {
    if (solid[s0] || comp[s0] >= 0) continue; let n = 0; const st = [s0]; comp[s0] = s0;
    while (st.length) { const i = st.pop(), x = i % PW, y = (i / PW) | 0; n++;
      for (const [dx, dy] of DV) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= PW || Y >= PH) continue; const j = I(X, Y); if (!solid[j] && comp[j] < 0) { comp[j] = s0; st.push(j); } } }
    if (n > bestN) { bestN = n; best = s0; }
  }
  const reach = new Uint8Array(NP);
  for (let i = 0; i < NP; i++) if (comp[i] === best && best >= 0) reach[i] = 1;
  if (!reach[I(spawnPt.x, spawnPt.y)]) { let bd = FAR, bp = spawnPt;
    for (let i = 0; i < NP; i++) if (reach[i]) { const x = i % PW, y = (i / PW) | 0, d = (x - spawnPt.x) * (x - spawnPt.x) + (y - spawnPt.y) * (y - spawnPt.y); if (d < bd) { bd = d; bp = { x, y }; } }
    spawnPt = bp; }
  { const wet = t => t === T.WATER || t === T.DEEP || t === T.CLIFF || t === T.CWALL || t === T.ISLE || t === T.FACE || t === T.LIP;
    const ok = (x, y) => { if (x < 2 || y < 2 || x >= PW - 2 || y >= PH - 2) return false;
      let w = 0; for (const [dx, dy] of DV) if (wet(tiles[I(x + dx, y + dy)])) w++;
      if (w > 1) return false;
      return DV.some(([dx, dy]) => { const tx = x + dx, ty = y + dy, sx = x - dx, sy = y - dy; return !solid[I(tx, ty)] && tiles[I(tx, ty)] !== T.STEP && tx >= 1 && ty >= 1 && tx < PW - 1 && ty < PH - 1 && reach[I(sx, sy)] && !solid[I(sx, sy)]; }); };
    for (const f of feats) { if (f.kind !== 's' || ok(f.x, f.y)) continue;
      solid[I(f.x, f.y)] = 0; let bd = FAR, bp = null;
      for (let i = 0; i < NP; i++) { const x = i % PW, y = (i / PW) | 0; if (solid[i] || !reach[i] || tiles[i] === T.STEP || (x === spawnPt.x && y === spawnPt.y)) continue; solid[i] = 1; const good = ok(x, y); solid[i] = 0;
        if (good) { const d = Math.abs(x - f.x) + Math.abs(y - f.y); if (d < bd) { bd = d; bp = { x, y }; } } }
      if (bp) { f.x = bp.x; f.y = bp.y; } solid[I(f.x, f.y)] = 1; reach[I(f.x, f.y)] = 0; } }
  lay.feats = feats.filter(f => DECOR.includes(f.kind) || f.kind === 'g' ||
    DV.some(([dx, dy]) => { const x = f.x + dx, y = f.y + dy; return x >= 0 && y >= 0 && x < PW && y < PH && reach[I(x, y)]; }));
  lay.reach = reach; lay.spawnPt = spawnPt;
  const sd = new Int16Array(NP).fill(999), sq = [];
  for (let i = 0; i < NP; i++) if (lay.shelter[i] && !T_BLOCK[tiles[i]]) { sd[i] = 0; sq.push(i); }
  for (let h = 0; h < sq.length; h++) { const i = sq[h], x = i % PW, y = (i / PW) | 0;
    for (const [dx, dy] of DV) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= PW || Y >= PH) continue; const j = I(X, Y); if (sd[j] > sd[i] + 1 && !T_BLOCK[tiles[j]]) { sd[j] = sd[i] + 1; sq.push(j); } } }
  lay.sdist = sd;
  return lay;
}

// The terrain bands of a place: kind, mask and tile code for each tile on the outer two rows and columns.
function g2Bands(G, cell, tiles, terr, tmask) {
  const cx = cell % MW, cy = (cell / MW) | 0, l = G.level[cell], I = (x, y) => y * PW + x;
  const onMap = (dx, dy) => onMapXY(cx + dx, cy + dy);
  const lvAt = (dx, dy) => onMap(dx, dy) ? G.level[(cy + dy) * MW + cx + dx] : l;   // off the map, the edge is never a drop
  const N = lvAt(0, -1), S = lvAt(0, 1), W = lvAt(-1, 0), E = lvAt(1, 0), NW = lvAt(-1, -1), NE = lvAt(1, -1), SW = lvAt(-1, 1), SE = lvAt(1, 1);
  const set = (x, y, kind, m, code) => { const i = I(x, y); terr[i] = kind; tmask[i] = m; if (code >= 0) tiles[i] = code; };
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
    if (x > 1 && x < PW - 2 && y > 1 && y < PH - 2) continue;
    let m = 0;
    for (let b = 0; b < 8; b++) { const X = x + NB8[b][0], Y = y + NB8[b][1], dx = X < 0 ? -1 : X >= PW ? 1 : 0, dy = Y < 0 ? -1 : Y >= PH ? 1 : 0;
      if ((dx || dy) && lvAt(dx, dy) < l) m |= 1 << b; }
    if (m) { set(x, y, TERR.LIP, m, T.LIP); continue; }
    if (y <= 1 && N > l) { let b = y === 1 ? 1 : 0;
      if (x === 0) { if (W > l) b |= 8; else if (!(W === l && NW > l)) b |= 2; }
      if (x === PW - 1) { if (E > l) b |= 16; else if (!(E === l && NE > l)) b |= 4; }
      set(x, y, TERR.FACE, b, T.FACE); continue; }
    const west = x === 0 && W > l, east = x === PW - 1 && E > l;
    if (west || east) { let b = west ? 1 : 0; const hiN = west ? NW : NE, hiS = west ? SW : SE;
      if (y === 0 && !(N === l && hiN > l)) b |= 2;
      if (y === PH - 1 && !(S === l && hiS > l)) { b |= 4; if (S === l && onMap(west ? -1 : 1, 1) && hiS === l) b |= 8; }
      set(x, y, TERR.SIDE, b, T.FACE); continue; }
    if (y <= 1 && x === 0 && NW > l && N === l && onMap(-1, 0) && W === l) { set(x, y, TERR.SIDE, 1 | (y === 1 ? 4 : 0), T.FACE); continue; }
    if (y <= 1 && x === PW - 1 && NE > l && N === l && onMap(1, 0) && E === l) { set(x, y, TERR.SIDE, y === 1 ? 4 : 0, T.FACE); continue; }
    if (y === PH - 1 && S > l) set(x, y, TERR.SHADOW, 0, -1);
  }
}
// The stairs of a place, one per ramp side, with their entry tiles.
function g2Stairs(G, seed, cell, tiles, terr, tmask) {
  const cx = cell % MW, cy = (cell / MW) | 0, l = G.level[cell], stairs = [];
  for (const [dir, dx, dy] of SIDES) {
    if (!onMapXY(cx + dx, cy + dy)) continue;
    const i = edgeIndex(cell, dir); if (G.edge[i] !== EDGE.RAMP) continue;
    const lo = G.level[(cy + dy) * MW + cx + dx] > l;
    const facing = dir === 'up' ? (lo ? 'S' : 'N') : dir === 'down' ? (lo ? 'N' : 'S') : dir === 'left' ? (lo ? 'E' : 'W') : (lo ? 'W' : 'E');
    const vertical = dir === 'up' || dir === 'down', s = stairPos(seed, i, vertical ? PW : PH);
    const xy = (k, d) => ({ x: dir === 'left' ? d : dir === 'right' ? PW - 1 - d : k, y: dir === 'up' ? d : dir === 'down' ? PH - 1 - d : k });
    const put = (k, d, kind, m, code) => { const p = xy(k, d), j = p.y * PW + p.x; terr[j] = kind; tmask[j] = m; tiles[j] = code; };
    const fc = { S: 0, N: 1, E: 2, W: 3 }[facing] << 4;
    const stair = depth => { const ps = []; for (let d = 0; d < depth; d++) for (let k = s; k <= s + 1; k++) ps.push(xy(k, d));
      const x0 = Math.min(...ps.map(p => p.x)), y0 = Math.min(...ps.map(p => p.y));
      for (const p of ps) { const j = p.y * PW + p.x; terr[j] = TERR.STAIR; tmask[j] = fc | ((p.y - y0) * 2 + (p.x - x0)); tiles[j] = T.STAIR; } };
    let ed;
    if (lo && facing === 'N') { put(s, 0, TERR.FOOT, 0, T.APRON); put(s + 1, 0, TERR.FOOT, 1, T.APRON); ed = 0; }
    else if (lo) { stair(2); put(s, 2, TERR.FOOT, 0, T.APRON); put(s + 1, 2, TERR.FOOT, 1, T.APRON); ed = 2; }
    else if (facing === 'N') { stair(1); put(s, 1, TERR.APRON_TOP, 0, T.APRON); put(s + 1, 1, TERR.APRON_TOP, 1, T.APRON); ed = 1; }
    else { put(s, 0, TERR.LANDING, 0, T.APRON); put(s + 1, 0, TERR.LANDING, 1, T.APRON); ed = 0; }
    stairs.push({ dir, facing, role: lo ? 'lo' : 'hi', s, entry: xy(s, ed) });
  }
  return stairs;
}

export function genPatch2(G, seed, cell) {
  const R = makeRng(hash(seed, 'p2', cell)), ns = hash(seed, 'pn2', cell), NP = PW * PH;
  const land = G.land[cell], { x: cx, y: cy } = cxy(cell), isFord = land === L.WATER;
  const tiles = new Uint8Array(NP), shelter = new Uint8Array(NP), feats = [], occ = new Uint8Array(NP);
  const terr = new Uint8Array(NP), tmask = new Uint8Array(NP), resv = new Uint8Array(NP);
  const I = (x, y) => y * PW + x, inb = (x, y) => x >= 0 && y >= 0 && x < PW && y < PH;
  const setT = (x, y, t) => { if (inb(x, y)) tiles[I(x, y)] = t; };
  const base = land === L.WOOD ? T.DARK : land === L.ROCK ? T.SAND : T.GRASS;
  // 1. Base tiles.
  { const q5 = noiseTab(hash(ns, 1), 5), q3 = noiseTab(hash(ns, 2), 3);   // n2 with lattices 5 and 3
    for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
      let t = base; const n = ((2 * q5(x, y) + q3(x, y)) / 3) | 0;
      if (base === T.GRASS) { if (n > 20644) t = T.TALL; else if (hash(ns, x, y, 1) % 1000 < 45) t = T.FLOWERS; }
      else if (base === T.DARK) { if (n > 19661) t = T.TALL; }
      else if (n < 11141) t = T.GRASS;
      tiles[I(x, y)] = t;
    } }
  // 2. Water bands and the swimmer side (no cell is L.CLIFF in generator 2).
  const nbLand = (dx, dy) => { const x = cx + dx, y = cy + dy; if (!onMapXY(x, y)) return -1; const c = y * MW + x;
    if (G.land[c] === L.WATER) return G.ford[c] ? L.POND : L.WATER; return G.land[c]; };
  for (const [dn, dx, dy] of SIDES) {
    const swimSide = cell === G.swim && dn === G.swimDir;
    const nl = nbLand(dx, dy); if (!swimSide && nl !== L.WATER) continue;
    if (isFord && dx === 0) continue;
    const len = dx === 0 ? PW : PH;
    for (let k = 0; k < len; k++) {
      const depth = swimSide ? 7 + ((noiseQ(ns + 61, k, 0, 4) * 3 + 32768) >> 16) : 3 + ((noiseQ(ns + dx * 7 + dy * 13 + 99, k, 0, 4) * 5 + 32768) >> 16);
      for (let d = 0; d <= depth; d++) {
        const x = dn === 'left' ? d : dn === 'right' ? PW - 1 - d : k, y = dn === 'up' ? d : dn === 'down' ? PH - 1 - d : k;
        if (swimSide) { if (d < 3) setT(x, y, T.ISLE); else if (d < depth) setT(x, y, T.DEEP); else if (!T_BLOCK[tiles[I(x, y)]]) setT(x, y, hash(ns, x, y, 2) & 1 ? T.REEDS : T.SAND); }
        else if (d < depth) { if (tiles[I(x, y)] !== T.DEEP && tiles[I(x, y)] !== T.ISLE) setT(x, y, T.WATER); }
        else if (nl === L.WATER && !T_BLOCK[tiles[I(x, y)]]) setT(x, y, hash(ns, x, y, 2) & 1 ? T.REEDS : T.SAND);
      }
    }
  }
  // 3. Terrain bands, then stairs; from here on no random placement touches the terrain layer or the ring around a stair.
  g2Bands(G, cell, tiles, terr, tmask);
  const stairs = g2Stairs(G, seed, cell, tiles, terr, tmask);
  for (let i = 0; i < NP; i++) if (terr[i] >= TERR.STAIR) { const x = i % PW, y = (i / PW) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (inb(x + dx, y + dy)) resv[I(x + dx, y + dy)] = 1; }
  const free = i => !terr[i] && !resv[i];
  // 4. Ford river.
  if (isFord) {
    for (let y = 0; y < PH; y++) { const w = (noiseQ(ns + 3, 0, y, 4) - 16384 + 4096) >> 13;
      for (let x = 9 + w; x <= 18 + w; x++) setT(x, y, T.WATER); setT(8 + w, y, T.REEDS); setT(19 + w, y, T.SAND); }
    for (let x = 0; x < PW; x++) if (tiles[I(x, 16)] === T.WATER) setT(x, 16, T.STEP);
  }
  const keep = i => tiles[i] === T.DEEP || tiles[i] === T.ISLE || terr[i] !== 0;
  // 5. Pond.
  if (land === L.POND) {
    const px = 6 + R.int(16), py = 5 + R.int(16), rxq = 56 + R.int(41), ryq = 56 + R.int(49), q = noiseTab(ns + 5, 3);
    for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
      const i = I(x, y); if (keep(i) || resv[i]) continue;
      const X = (x - px) * 16, Y = (y - py) * 16;
      const v = ((X * X * 4096 / (rxq * rxq)) | 0) + ((Y * Y * 4096 / (ryq * ryq)) | 0) + ((q(x, y) / 10) | 0) - 1638;
      if (v < 4096) setT(x, y, T.WATER); else if (v < 6554 && tiles[i] !== T.WATER) setT(x, y, hash(ns, x, y, 3) % 100 < 55 ? T.REEDS : T.SAND);
    }
  }
  const walk = (x, y) => inb(x, y) && !T_BLOCK[tiles[I(x, y)]] && free(I(x, y));
  // 6. Overhangs, boulders, trees.
  const ovN = Math.max(G.glow.includes(cell) ? 1 : 0, land === L.ROCK ? 2 : land === L.MEADOW ? 1 : R.int(100) < 45 ? 1 : 0);
  for (let k = 0, tries = 0; k < ovN && tries < 400; tries++) {
    const ox = 2 + R.int(PW - 7), oy = 2 + R.int(PH - 8); let okO = true;
    for (let dy = 0; dy <= 3 && okO; dy++) for (let dx = -1; dx <= 3; dx++) if (!walk(ox + dx, oy + dy)) { okO = false; break; }
    if (!okO) continue;
    for (let dx = 0; dx < 3; dx++) { setT(ox + dx, oy, T.ROCK); setT(ox + dx, oy + 1, T.ROCK); shelter[I(ox + dx, oy + 2)] = 1; occ[I(ox + dx, oy + 2)] = 1; }
    feats.push({ id: 'o' + k, kind: 'o', x: ox, y: oy }); k++;
  }
  const rockN = land === L.ROCK ? 6 + R.int(4) : R.int(2) + (land === L.MEADOW ? 1 : 0);
  for (let k = 0; k < rockN; k++) { const x = 2 + R.int(PW - 4), y = 2 + R.int(PH - 4), s = R.int(100) < 45 ? 1 : 0;
    for (let dy = -s; dy <= s; dy++) for (let dx = -s; dx <= s; dx++) if (walk(x + dx, y + dy) && (s === 0 || R.int(100) < 80)) setT(x + dx, y + dy, T.ROCK); }
  const treeN = land === L.WOOD ? 11 + R.int(5) : land === L.MEADOW ? 1 + R.int(2) : R.int(2);
  for (let k = 0, tries = 0; k < treeN && tries < 200; tries++) {
    const x = 2 + R.int(PW - 4), y = 2 + R.int(PH - 4); let okT = true;
    for (let dy = -1; dy <= 1 && okT; dy++) for (let dx = -1; dx <= 1; dx++) if (!walk(x + dx, y + dy)) { okT = false; break; }
    for (let dy = -2; dy <= 2 && okT; dy++) for (let dx = -2; dx <= 2; dx++) if (inb(x + dx, y + dy) && tiles[I(x + dx, y + dy)] === T.TRUNK) { okT = false; break; }
    if (okT) { setT(x, y, T.TRUNK); k++; }
  }
  // 7. The burrow, on the bottom row of the gate's south-facing face.
  const spawnPt = { x: 14, y: PH - 3 };
  const carve2 = (x0, y0, x1, y1) => {
    const fix = (x, y) => { if (!inb(x, y) || terr[I(x, y)]) return; const t = tiles[I(x, y)]; if (t === T.WATER) setT(x, y, T.STEP); else if (T_BLOCK[t]) setT(x, y, base === T.DARK ? T.DARK : T.SAND); occ[I(x, y)] = 1; };
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) fix(x0, y);
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) fix(x, y1);
  };
  if (cell === G.gate) {
    const gx = 11 + R.int(6);
    for (let dx = -1; dx <= 1; dx++) { setT(gx + dx, 2, T.SAND); occ[I(gx + dx, 2)] = 1; }
    carve2(gx, 2, spawnPt.x, spawnPt.y);
    feats.push({ id: 'g', kind: 'g', x: gx, y: 1 });
  }
  // 8. The swimmer island and the dry strip (which never opens the terrain layer).
  if (cell === G.swim) {
    const m = G.swimDir, ix = m === 'left' ? 2 : m === 'right' ? PW - 3 : 13, iy = m === 'up' ? 2 : m === 'down' ? PH - 3 : 15;
    feats.push({ id: 'i', kind: 'i', x: ix, y: iy });
    for (let k = 0; k < (m === 'up' || m === 'down' ? PW : PH); k++) {
      for (let d = 10; d <= 12; d++) { const x = m === 'left' ? d : m === 'right' ? PW - 1 - d : k, y = m === 'up' ? d : m === 'down' ? PH - 1 - d : k;
        if (inb(x, y) && !terr[I(x, y)] && T_BLOCK[tiles[I(x, y)]] && tiles[I(x, y)] !== T.DEEP) setT(x, y, base === T.DARK ? T.DARK : T.SAND); }
    }
  }
  // 9. A path for each stair: straight inward to depth 3, then horizontal and vertical to the spawn point.
  for (const st of stairs) {
    const k = st.s, p = st.dir === 'up' ? { x: k, y: 3 } : st.dir === 'down' ? { x: k, y: PH - 4 } : st.dir === 'left' ? { x: 3, y: k } : { x: PW - 4, y: k };
    carve2(st.entry.x, st.entry.y, p.x, p.y);
    carve2(p.x, p.y, spawnPt.x, p.y);
    carve2(spawnPt.x, p.y, spawnPt.x, spawnPt.y);
  }
  // 10. Features.
  const spot = (minSep) => { for (let t = 0; t < 90; t++) {
      const x = 2 + R.int(PW - 4), y = 2 + R.int(PH - 4), i = I(x, y);
      if (T_BLOCK[tiles[i]] || tiles[i] === T.STEP || tiles[i] === T.STAIR || tiles[i] === T.APRON || occ[i] || !free(i)) continue;
      if (Math.abs(x - spawnPt.x) + Math.abs(y - spawnPt.y) < 4) continue;
      if (feats.some(f => f.kind !== 'o' && Math.abs(f.x - x) + Math.abs(f.y - y) < minSep)) continue;
      occ[i] = 1; return { x, y }; } return null; };
  const mix = FEAT_MIX[land] || FEAT_MIX[L.MEADOW];
  const n = ([a, b]) => a + R.int(b - a + 1);
  const addF = (kind, count, init) => { for (let k = 0; k < count; k++) { const p = spot(3); if (p) feats.push(Object.assign({ id: kind + k, kind, x: p.x, y: p.y }, init ? init() : {})); } };
  addF('b', n(mix.b));
  addF('u', n(mix.u), () => ({ full: R.int(100) < 75 }));
  addF('k', n(mix.k), () => ({ ch: R.int(100) < 10 ? 2 : 0 }));
  addF('s', n(mix.s), () => ({ under: R.int(100) < 22 ? 'pod' : null }));
  addF('n', n(mix.n) + (cell === G.gate ? 1 : 0));
  if (G.beacons.set.has(cell)) addF('j', 1);
  if (G.depots.set.has(cell)) addF('h', 1);
  if (cell === G.deep) { const p = { x: 14 + R.int(5) - 2, y: 12 + R.int(4) };
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = p.x + dx, Y = p.y + dy; if (T_BLOCK[tiles[I(X, Y)]]) setT(X, Y, T.SAND); }
    carve2(p.x, p.y + 1, spawnPt.x, spawnPt.y);
    for (let i = feats.length - 1; i >= 0; i--) if (cheb(feats[i], p) <= 1 && feats[i].kind !== 'o') feats.splice(i, 1);
    feats.push({ id: 'd', kind: 'd', x: p.x, y: p.y }); }
  const lay = { key: String(cell), cell, cave: false, land, base, tiles, shelter, feats, terr, tmask, stairs };
  return finishLayout2(lay, spawnPt);
}

export function genCave2(seed, cell) {
  const R = makeRng(hash(seed, 'cave', cell)), ns = hash(seed, 'cn', cell);
  const tiles = new Uint8Array(PW * PH).fill(T.CWALL), shelter = new Uint8Array(PW * PH).fill(1), feats = [], occ = new Uint8Array(PW * PH);
  const I = (x, y) => y * PW + x, setT = (x, y, t) => { if (x >= 0 && y >= 0 && x < PW && y < PH) tiles[I(x, y)] = t; };
  for (let y = 1; y < PH - 1; y++) for (let x = 1; x < PW - 1; x++) {
    const X = 2 * x - 27, Y = 2 * y - 30;
    const v = ((X * X * 4096 / 576) | 0) + ((Y * Y * 4096 / 729) | 0) + ((noiseQ(ns, x, y, 4) / 9) | 0) - 1820;
    if (v < 3686) setT(x, y, T.CFLOOR);
  }
  for (let k = 0; k < 4; k++) { const px = 5 + R.int(18), py = 5 + R.int(15); for (let dy = -1; dy <= 0; dy++) for (let dx = -1; dx <= 0; dx++) if (R.int(100) < 85) setT(px + dx, py + dy, T.CWALL); }
  for (let y = 21; y <= 28; y++) for (let x = 12; x <= 16; x++) setT(x, y, T.CFLOOR);
  for (let y = 6; y <= 21; y++) setT(14, y, T.CFLOOR);
  const spawnPt = { x: 14, y: 27 };
  feats.push({ id: 'x', kind: 'x', x: 14, y: 28 }); occ[I(14, 28)] = 1;
  for (let y = 25; y <= 27; y++) for (let x = 13; x <= 15; x++) occ[I(x, y)] = 1;
  const spot = (pred) => { for (let t = 0; t < 120; t++) { const x = 2 + R.int(PW - 4), y = 2 + R.int(PH - 4), i = I(x, y);
      if (tiles[i] !== T.CFLOOR || occ[i] || (pred && !pred(x, y))) continue;
      if (feats.some(f => Math.abs(f.x - x) + Math.abs(f.y - y) < 3)) continue; occ[i] = 1; return { x, y }; } return null; };
  for (let k = 0; k < 3; k++) { const p = spot((x, y) => y >= 13 && y <= 21); if (p) feats.push({ id: 'e' + k, kind: 'e', x: p.x, y: p.y }); }
  for (let k = 0; k < 7; k++) { const p = spot(); if (p) { feats.push({ id: 'm' + k, kind: 'm', x: p.x, y: p.y }); occ[I(p.x, p.y)] = 0; } }
  [2, 2, 0].forEach((ch, k) => { const p = spot(); if (p) feats.push({ id: 'k' + k, kind: 'k', x: p.x, y: p.y, ch }); });
  for (let k = 0; k < 2; k++) { const p = spot(); if (p) feats.push({ id: 'u' + k, kind: 'u', x: p.x, y: p.y, full: true }); }
  { const p = spot(); if (p) feats.push({ id: 'n0', kind: 'n', x: p.x, y: p.y }); }
  { const p = spot(); if (p) feats.push({ id: 's0', kind: 's', x: p.x, y: p.y, under: 'pod' }); }
  const lay = { key: 'c' + cell, cell, cave: true, land: L.ROCK, base: T.CFLOOR, tiles, shelter, feats };
  finishLayout2(lay, spawnPt);
  for (let i = 0; i < PW * PH; i++) if (tiles[i] === T.CFLOOR && !lay.reach[i] && !lay.feats.some(f => f.y * PW + f.x === i)) tiles[i] = T.CWALL;
  return lay;
}
// ---- end generator 2 ----
