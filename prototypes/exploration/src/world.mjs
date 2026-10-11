// The seeded world of the Companion: the map, the places and the RNG. Pure: it never reads the page's state, the DOM,
// storage, the clock or Math.random, and never draws. Generator 1 is frozen; a new generator is added beside it, never in its place.

export const NEW_GEN = 1;          // the generator newWorld gives a new world
export const GENS = [1];           // the generators this module can build

export const MW = 16, MH = 20;                       // world map, cells
export const PW = 28, PH = 32;
export const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
export const L = { MEADOW: 0, POND: 1, ROCK: 2, WOOD: 3, WATER: 4, CLIFF: 5 };
export const T = { GRASS: 0, TALL: 1, FLOWERS: 2, DARK: 3, SAND: 4, WATER: 5, REEDS: 6, ROCK: 7, TRUNK: 8, CLIFF: 9, CFLOOR: 10, CWALL: 11, STEP: 12, DEEP: 13, ISLE: 14 };
export const T_BLOCK = [0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1];

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

export function genPlace(G, seed, key) { return key[0] === 'c' ? genCave(seed, +key.slice(1)) : genPatch(G, seed, +key); }
