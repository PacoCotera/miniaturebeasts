// Generator 7: a baked cell (bake7.mjs) and its IR to the page's layout `lay`. Pure: no page state.
// The baked place is the cell with its one-tile apron (26 x 30); the page's cell is the 24 x 28 inside it, so lay tile (x, y) is place tile (x + 1, y + 1) and the view is given ox = oy = -1.
// Everything the cell holds comes from the IR (src/gen7/hold.mjs): finds, spawns, the ways in, the landmark and its name, the signs and the strike marks. There is no heart: nothing in a
// cell is picked by the page, and no world edge is laid over the ground (the terrain at the cell's border already is the neighbour's).
import { T, T_BLOCK, L, hash } from './world.mjs';

export const INNER = { w: 24, h: 28 };
const PRESS_PROPS = ['boulder-a', 'boulder-a-m', 'split-stone'];   // the props fruit may be pressed on besides every tree's trunk (places/src/adapter.mjs PRESS_PROPS)
const RING_DEPTH = 2;   // tiles in from a side the range haze or a closed side's thicket takes (the page's LINE_DEPTH 3 counts the apron)
const CROWN_MARGIN = 6;  // pixels at 48 px round a crown's box that still count as under it
const SIDE_STEP = { N: 'up', S: 'down', W: 'left', E: 'right' };
export const sideDir = s => SIDE_STEP[s];

// o: { key, cell, land (L.*), G (the region), seed }
export function adaptCell(place, ir, ts, terrains, o) {
  const w = INNER.w, h = INNER.h, W = place.w, NP = w * h, I = (x, y) => y * w + x, P = (x, y) => (y + 1) * W + x + 1;
  const tileOf = new Map(terrains.map(t => [t.value, T[t.T]]));
  const tiles = new Uint8Array(NP), press = new Uint8Array(NP);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) tiles[I(x, y)] = tileOf.get(place.terrain[P(x, y)]) ?? T.GRASS;
  const cliffV = (terrains.find(t => t.id === 'cliff') || {}).value;
  // (a set bit on a walkable tile that is no cliff is the cell under a south lip, which blocks too; a prop's footprint cell is overwritten below)
  if (cliffV != null && place.blockMask) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const b = P(x, y); if (!((place.blockMask[b >> 3] >> (b & 7)) & 1)) continue;
    if (place.terrain[b] === cliffV) { tiles[I(x, y)] = T.ROCK; press[I(x, y)] = 1; } else if (!T_BLOCK[tiles[I(x, y)]]) tiles[I(x, y)] = T.ROCK;
  }
  for (const p of place.props) {
    const s = ts.sprites[p.kind], cx = Math.floor(p.x / 48) - 1, cy = Math.floor(p.y / 48) - 1;
    if (s.kind === 'tall-grass' && !s.footprint.length) { if (cx >= 0 && cy >= 0 && cx < w && cy < h && tiles[I(cx, cy)] === T.GRASS) tiles[I(cx, cy)] = T.TALL; continue; }
    for (let i = 0; i + 1 < s.footprint.length; i += 2) {
      const x = cx + s.footprint[i], y = cy + s.footprint[i + 1];
      if (x >= 0 && y >= 0 && x < w && y < h) { tiles[I(x, y)] = s.canopy >= 0 ? T.TRUNK : T.ROCK; if (PRESS_PROPS.includes(s.kind)) press[I(x, y)] = 1; else if (String(s.kind).startsWith('tree-')) press[I(x, y)] = 2; }
    }
  }
  // the tiles no crown hangs over: a crown's box at 48 px, a tile's pawn as its centre and a margin round it
  const clear = new Uint8Array(NP).fill(1), crowns = [];
  for (const p of place.props) { const c = ts.sprites[p.kind].canopy; if (c >= 0) crowns.push([c, p.x, p.y]); }
  for (const c of place.canopy) crowns.push([c.kind, c.x, c.y]);
  for (const [k, fx, fy] of crowns) {
    const s = ts.sprites[k], left = fx - s.anchor48[0] - 48, top = fy - s.anchor48[1] - 48;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const px = x * 48 + 24, py = y * 48 + 28; if (px > left - CROWN_MARGIN && px < left + s.w48 + CROWN_MARGIN && py > top - CROWN_MARGIN && py < top + s.h48 + CROWN_MARGIN) clear[I(x, y)] = 0; }
  }
  // the ways in: the IR's runs along a side, kept in the baked place's tiles (1..24 and 1..28 inside its apron), as the page's range lines read them (lay.baked has the offset)
  const openings = ir.openings.map(op => ({ side: op.side, from: op.from, to: op.to }));
  const arrive = (op) => { const mid = ((op.from + op.to) >> 1) - 1; return op.side === 'N' ? { x: mid, y: 0 } : op.side === 'S' ? { x: mid, y: h - 1 } : op.side === 'W' ? { x: 0, y: mid } : { x: w - 1, y: mid }; };
  let spawnPt = openings.length ? arrive(openings[0]) : { x: w >> 1, y: h >> 1 };
  const walks = (x, y) => x >= 0 && y >= 0 && x < w && y < h && !T_BLOCK[tiles[I(x, y)]];
  if (!walks(spawnPt.x, spawnPt.y)) { let best = null, bd = 1e9; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (walks(x, y)) { const d = (x - spawnPt.x) ** 2 + (y - spawnPt.y) ** 2; if (d < bd) { bd = d; best = { x, y }; } } if (best) spawnPt = best; }
  // A cell is walked from every way in (the generator holds that each walkable tile is reached from some side), so the walkable ground is the union of what each opening reaches. Each reached tile
  // carries the number of the first opening whose flood reached it (compId, 0: unreached), and compOfSide says which number a side's way in leads to: a player who comes in by that side starts there.
  const compId = new Uint8Array(NP), compOfSide = {}; let nc = 0;
  // every tile along a way in (a wall may split a run: its middle can lie on a cut-off strip while the rest of the run leads to the main ground)
  const runPts = (op) => { const out = []; for (let k = op.from - 1; k <= op.to - 1; k++) out.push(op.side === 'N' ? { x: k, y: 0 } : op.side === 'S' ? { x: k, y: h - 1 } : op.side === 'W' ? { x: 0, y: k } : { x: w - 1, y: k }); return out; };
  for (const pt of [spawnPt, ...openings.map(arrive), ...openings.flatMap(runPts)]) {
    if (!walks(pt.x, pt.y)) continue;
    let id = compId[I(pt.x, pt.y)];
    if (!id) { id = ++nc; const stack = [I(pt.x, pt.y)]; compId[stack[0]] = id;
      while (stack.length) { const i = stack.pop(), x = i % w, y = (i / w) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= w || Y >= h) continue; const j = I(X, Y); if (!compId[j] && !T_BLOCK[tiles[j]]) { compId[j] = id; stack.push(j); } } } }
  }
  const reach = compId.map(v => v ? 1 : 0), size = new Array(nc + 1).fill(0); for (let i = 0; i < NP; i++) size[compId[i]]++;
  let mainComp = 1; for (let k = 1; k <= nc; k++) if (size[k] > size[mainComp]) mainComp = k;   // the biggest ground: where a walk that comes from no side starts
  // the IR names the ground the cell's finds lie on (src/gen7/hold.mjs `ground`): a walk that comes from no side starts there, on a way in that leads to it
  if (ir.ground && walks(ir.ground.x - 1, ir.ground.y - 1) && compId[I(ir.ground.x - 1, ir.ground.y - 1)]) {
    mainComp = compId[I(ir.ground.x - 1, ir.ground.y - 1)];
    const nearMid = op => { const m = arrive(op); return runPts(op).sort((a, b) => Math.abs(a.x - m.x) + Math.abs(a.y - m.y) - Math.abs(b.x - m.x) - Math.abs(b.y - m.y)); };   // from the way in's middle outwards, so a wall in the middle never puts the start in a corner of the run
    const into = [...openings.map(arrive), ...openings.flatMap(nearMid)].find(pt => walks(pt.x, pt.y) && compId[I(pt.x, pt.y)] === mainComp); if (into) spawnPt = into;
  }
  // a side leads to the main ground when any tile of its ways in touches it; else to the ground its first way in's middle leads to
  const touches = {}; openings.forEach(op => { if (runPts(op).some(pt => walks(pt.x, pt.y) && compId[I(pt.x, pt.y)] === mainComp)) touches[op.side] = 1; });
  openings.forEach(op => { const pt = arrive(op); if (compOfSide[op.side] == null) { if (touches[op.side]) compOfSide[op.side] = mainComp; else if (walks(pt.x, pt.y)) compOfSide[op.side] = compId[I(pt.x, pt.y)]; } });
  const nextTo = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const X = x + dx, Y = y + dy; return X >= 0 && Y >= 0 && X < w && Y < h && reach[I(X, Y)]; });
  const standable = (x, y) => x >= 0 && y >= 0 && x < w && y < h && !T_BLOCK[tiles[I(x, y)]];
  // finds: a pod is a slot (the world's pods take them), the rest are the page's features. A find nobody could stand beside is dropped.
  const KIND = { fruit: 'b', dew: 'u', stone: 'k', material: 'n' }, count = {}, next = k => (count[k] = (count[k] ?? -1) + 1);
  const feats = [], podSlots = [], finds = [];
  // Everything the player can act on stands on a tile reachable on foot from the cell's ways in, outside the band the range haze and the closed sides' thicket take (o.shut(side): the page says the
  // side is past the Probe's range or closed), and a bush or a mark also off every crown. A thing on a tile that fails is moved to the nearest that passes, or not placed (notes 14, 15, 26-31).
  const ring = new Uint8Array(NP);
  if (o.shut) for (const side of ['N', 'S', 'W', 'E']) if (openings.some(op => op.side === side) && o.shut(side))
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if ((side === 'N' && y < RING_DEPTH) || (side === 'S' && y >= h - RING_DEPTH) || (side === 'W' && x < RING_DEPTH) || (side === 'E' && x >= w - RING_DEPTH)) ring[I(x, y)] = 1;
  // the ground walked on from the ways in that are open (a shut side's ways in lead nowhere now)
  const live = new Uint8Array(NP), lq = [];
  for (const op of openings) if (!(o.shut && o.shut(op.side))) for (const pt of runPts(op)) { const i = I(pt.x, pt.y); if (walks(pt.x, pt.y) && !live[i]) { live[i] = 1; lq.push(i); } }
  for (let h2 = 0; h2 < lq.length; h2++) { const i = lq[h2], x = i % w, y = (i / w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= w || Y >= h) continue; const j = I(X, Y); if (!live[j] && !ring[j] && !T_BLOCK[tiles[j]]) { live[j] = 1; lq.push(j); } } }
  const ground = lq.length ? live : reach;   // a cell with no way in open now keeps the ground its ways in lead to
  const used = new Set();
  const okAt = (x, y, bare) => x >= 0 && y >= 0 && x < w && y < h && ground[I(x, y)] && !ring[I(x, y)] && !T_BLOCK[tiles[I(x, y)]] && !used.has(I(x, y)) && (!bare || clear[I(x, y)]);
  const settle = (x, y, bare) => {
    for (let r = 0; r <= 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || !okAt(x + dx, y + dy, bare)) continue;
      used.add(I(x + dx, y + dy)); return { x: x + dx, y: y + dy };
    }
    return null;
  };
  if (ir.landmarks[0]) used.add(I(ir.landmarks[0].x - 1, ir.landmarks[0].y - 1));
  ir.finds.forEach((f, i) => {
    const what = f.kinds[0], at0 = { x: f.x - 1, y: f.y - 1 }, at = f.what === 'pearl' ? (nextTo(at0.x, at0.y) ? at0 : null) : settle(at0.x, at0.y, what === 'fruit'); if (!at || at.x < 0 || at.y < 0 || at.x >= w || at.y >= h) return;
    const x = at.x, y = at.y;
    finds.push({ x, y, what, i });
    if (what === 'pod') { podSlots.push({ x, y, on: true, forced: !!f.forced, herd: f.herd }); return; }
    if (f.what === 'pearl') return;   // the pearl has no picture or press yet: an empty slot in the IR
    const k = KIND[what], q = hash(o.seed, 'slotx7', o.cell, i), e = { id: k + next(k), kind: k, x, y };
    if (k === 'u') e.full = true;   // a cup is full when you come (editorial)
    if (k === 'k') { e.ch = q % 100 < 10 ? 2 : 0; if (f.forced) e.ch = Math.max(e.ch, 0); }
    if (f.hollow != null) e.hollow = f.hollow;
    feats.push(e);
  });
  const taken = new Set(feats.map(f => f.y * w + f.x)), G = o.G;
  const specials = []; if (G && o.cell === G.gate) specials.push({ id: 'g', kind: 'g' }); if (G && o.cell === G.deep) specials.push({ id: 'd', kind: 'd' });
  for (const s of specials) {   // the burrow and the deep stone: on reachable ground, far from the way in, by seed
    let best = null, bs = -1;
    for (let i = 0; i < NP; i++) { const sx = i % w, sy = (i / w) | 0;
      if (!ground[i] || ring[i] || taken.has(i) || Math.abs(sx - spawnPt.x) + Math.abs(sy - spawnPt.y) < 6 || !nextTo(sx, sy)) continue;
      if (podSlots.some(f => f.x === sx && f.y === sy)) continue;
      const sc = hash(o.seed, 'special7', o.cell, s.id, sx, sy); if (sc > bs) { bs = sc; best = { x: sx, y: sy }; } }
    if (best) { feats.push({ ...s, ...best }); taken.add(best.y * w + best.x); }
  }
  for (const s of specials) { const f = feats.find(q => q.id === s.id); if (f) used.add(I(f.x, f.y)); }
  // strike marks: ground decals, on open walkable ground off every crown (note 29), and on a tile no find holds
  const strikes = ir.strikes.map((m, i) => { const at = settle(m.x - 1, m.y - 1, true); return at ? { id: 'm' + i, x: at.x, y: at.y, age: m.age, glass: !!m.glass } : null; }).filter(Boolean);
  // decor keeps a one-tile gap round a find, and none stands on the foot of one below it that its picture would cover (notes 8, 25, 32)
  const gap = [...finds.filter(f => f.what !== 'pearl'), ...strikes].map(f => [f.x, f.y]);
  const keepDecal = d => { const dx = Math.floor(d.x / 48) - 1, dy = Math.floor(d.y / 48) - 1; return !gap.some(([gx, gy]) => Math.abs(dx - gx) <= 1 && dy - gy >= -1 && dy - gy <= 2); };
  place.decals = place.decals.filter(keepDecal);
  const decalNear = (x, y) => place.decals.some(d => Math.abs(Math.floor(d.x / 48) - 1 - x) <= 1 && Math.floor(d.y / 48) - 1 - y >= -1 && Math.floor(d.y / 48) - 1 - y <= 2);   // a tile (a fruit about to fall) whose picture some decor would cover
  const lm = ir.landmarks[0] || null;
  const lay = {
    key: o.key, cell: o.cell, cave: false, land: o.land, base: T.GRASS, tiles, shelter: new Uint8Array(NP), feats, terr: new Uint8Array(NP), tmask: new Uint8Array(NP), stairs: [], reach, spawnPt,
    sdist: new Int16Array(NP).fill(999), trees: {}, shade: false, w, h, openings, clear, compId, compOfSide, mainComp, findSlots: finds.map(f => ({ x: f.x, y: f.y, kinds: [f.what], chance: 1 })),
    baked: { id: place.id, ox: -1, oy: -1, w: place.w, h: place.h, place }, press, heart: null,
    name: lm ? lm.name : (ir.names[0] || ''), landmark: lm ? { kind: lm.kind, name: lm.name, slot: lm.slot, x: lm.x - 1, y: lm.y - 1 } : null,
    podSlots, spawns: ir.spawns.map(s => ({ x: s.x - 1, y: s.y - 1, w: s.w, h: s.h, species: s.species, count: s.count })),
    strikes, decalNear,
    signs: ir.signs, traces: ir.traces.map(t => ({ kind: t.kind, x: t.x - 1, y: t.y - 1 })),
  };
  if (G && G.land[o.cell] === L.WOOD) lay.base = T.DARK; else if (G && G.land[o.cell] === L.ROCK) lay.base = T.SAND;
  return lay;
}
