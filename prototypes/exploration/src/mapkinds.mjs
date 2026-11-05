// Map looks for the full map (26 px cells, the core 48 colours only): Tarns read as high grey rock with deep stone-rimmed pools and crouch pines,
// Thickets as dark tangles of thorn and cane on open grass, Tallwood as one big old crown per cell. Drawing only: the ground shares are untouched.
// The page calls these in buildMapPB: cell() draws a whole cell and returns true for the cells it owns (false: the page draws it as before),
// foam() is the shore colour of a water cell, and post() runs after the second pass (the Thickets' tangles, joined across cell edges).
import { L } from "./world.mjs";

const CELL = 26;
const sp = (pb, px, py, R, n, cols) => { for (let i = 0; i < n; i++) pb.set(px + R.int(CELL), py + R.int(CELL), R.pick(cols)); };
const mix = (a, b) => (((a * 2654435761) ^ (b * 40503)) >>> 0);

// ---- Tallwood: one big old crown per cell, standing apart, on a darker floor with ferns
function tallCell(pb, px, py, R, C) {
  pb.rect(px, py, CELL, CELL, C.forest); sp(pb, px, py, R, 16, [C.pine, C.leaf, C.pine]);
  for (let i = 0; i < 3; i++) { const fx = px + 2 + R.int(CELL - 4), fy = py + 3 + R.int(CELL - 5); pb.set(fx, fy, C.leaf); pb.set(fx - 1, fy + 1, C.leaf); pb.set(fx + 1, fy + 1, C.grass); }
  const x = px + 11 + R.int(5), y = py + 10 + R.int(4);
  pb.ell(x + 2, y + 5, 10, 6.5, C.ink); pb.rect(x, y + 6, 2, 3, C.soil);
  pb.ell(x - 4, y, 6.4, 6, C.forest, { sh: [C.leaf, C.pine] }); pb.ell(x + 4, y - 1, 6.6, 6.2, C.forest, { sh: [C.grass, C.pine] }); pb.ell(x, y - 4, 5, 4.2, C.leaf, { sh: [C.grass, C.forest] });
}

// ---- Tarns: grey rock, stony moor turf with heather, moss and sedge round the tarns, dark cold water with a stone rim, crouch pines
function stones(pb, px, py, R, C, n, big) {
  for (let i = 0; i < n; i++) { const rx = px + 5 + R.int(CELL - 10), ry = py + 6 + R.int(CELL - 10), s = (big ? 2.6 : 1.4) + R.f() * (big ? 2 : 1);
    pb.ell(rx, ry + 1, s * 1.25, s, C.slate); pb.ell(rx, ry, s * 1.2, s - .4, C.stone, { sh: [C.rockL, C.slate] }); if (R.chance(.4)) pb.set(rx - 1, ry - 1, C.lime); }
}
function heather(pb, px, py, R, C, n) {   // ling in plum (the level tint lifts it to lilac, never to red)
  for (let i = 0; i < n; i++) { const hx = px + 2 + R.int(CELL - 9), hy = py + 2 + R.int(CELL - 7), w = 5 + R.int(4), h = 3 + R.int(2);
    for (let k = 0; k < w * h * .8; k++) { const x = hx + R.int(w), y = hy + R.int(h); pb.set(x, y, R.pick([C.plumD, C.plum, C.plumD, C.pine])); }
    pb.set(hx + 1, hy - 1, C.lilac); }
}
function tarnsCell(pb, G, c, px, py, l, R, C, L) {
  if (l === L.ROCK) {
    pb.rect(px, py, CELL, CELL, C.rock); sp(pb, px, py, R, 30, [C.stone, C.mist, C.stone, C.rockL]);
    for (let i = 0; i < 3; i++) { const x = px + R.int(CELL - 6), y = py + 2 + R.int(CELL - 4); pb.rect(x, y, 4 + R.int(4), 1, C.stone); }   // bedding lines in the stone
    stones(pb, px, py, R, C, 2 + R.int(2), true); if (R.chance(.35)) { const x = px + 4 + R.int(18), y = py + 4 + R.int(18); pb.set(x, y, C.gold); pb.set(x + 1, y, C.lime); }
    return true;
  }
  if (l === L.MEADOW) {   // moor turf: dark, stony, heathered; never the lowland's lawn
    pb.rect(px, py, CELL, CELL, C.forest); sp(pb, px, py, R, 40, [C.pine, C.stone, C.pine, C.leaf, C.stone]);
    heather(pb, px, py, R, C, 3 + R.int(2)); stones(pb, px, py, R, C, 2 + R.int(2), false);
    return true;
  }
  if (l === L.POND) {   // the tarn's collar: cushion moss and sedge on wet ground, no pool of its own
    pb.rect(px, py, CELL, CELL, C.forest); sp(pb, px, py, R, 18, [C.pine, C.teal, C.leaf]);
    for (let i = 0; i < 2; i++) { const mx = px + 5 + R.int(16), my = py + 5 + R.int(16); pb.ell(mx, my, 3, 2.2, C.leaf, { sh: [C.sprout, C.forest] }); }
    for (let i = 0; i < 4; i++) { const rx = px + 2 + R.int(CELL - 4), ry = py + 6 + R.int(CELL - 8); pb.rect(rx, ry, 1, 3, C.grass); pb.set(rx + 1, ry + 1, C.leaf); }
    stones(pb, px, py, R, C, 1, false);
    return true;
  }
  if (l === L.WATER) {   // deep cold water: the sea blue, a few river glints (fords keep today's look)
    if (G.ford && G.ford[c]) return false;
    pb.rect(px, py, CELL, CELL, C.sea);
    for (let i = 0; i < 2; i++) { const wx = px + 3 + R.int(12), wy = py + 6 + i * 11 + R.int(3); pb.rect(wx, wy, 5, 1, C.river); pb.rect(wx + 5, wy - 1, 3, 1, C.river); }
    for (let i = 0; i < 5; i++) pb.set(px + R.int(CELL), py + R.int(CELL), C.deep);
    return true;
  }
  if (l === L.WOOD) {   // crouch pines: low, wide, dark, pressed by the wind, among stones
    pb.rect(px, py, CELL, CELL, C.forest); sp(pb, px, py, R, 18, [C.pine, C.stone, C.leaf]); stones(pb, px, py, R, C, 1, false);
    for (let i = 0; i < 2; i++) { const x = px + 7 + R.int(12), y = py + 7 + i * 9 + R.int(3);
      pb.ell(x, y + 2, 7, 2.8, C.ink); pb.ell(x - 1, y, 6.6, 2.6, C.forest, { sh: [C.leaf, C.pine] }); pb.ell(x - 2, y - 3, 4.2, 2, C.forest, { sh: [C.grass, C.pine] }); }
    return true;
  }
  return false;
}

// ---- Thickets: a tangle of thorn and berry cane on open grass; drawn after every cell so the tangles join across cell edges
function thicketsGround(pb, px, py, R, C) {
  pb.rect(px, py, CELL, CELL, C.grass); sp(pb, px, py, R, 26, [C.sprout, C.leaf, C.leaf]);
  for (let i = 0; i < 3; i++) { const tx = px + 2 + R.int(CELL - 4), ty = py + 3 + R.int(CELL - 5); pb.rect(tx, ty, 1, 2, C.leaf); pb.set(tx, ty - 1, C.lime); }
}
function thicketsPost(pb, G, X) {
  const { C, MW, MH, L, TINT } = X, wood = c => G.land[c] === L.WOOD, blobs = [];
  for (let c = 0; c < MW * MH; c++) { if (!wood(c)) continue; const x = c % MW, y = (c / MW) | 0, cx = x * CELL + 13, cy = y * CELL + 13, h = mix(G.seed || 0, c);
    let s = h; const r = () => { s = (Math.imul(s ^ (s >>> 15), 2246822519) + 0x9E3779B9) >>> 0; return s / 4294967296; };
    const nb = [[1, 0], [0, 1], [-1, 0], [0, -1]].filter(([dx, dy]) => x + dx >= 0 && y + dy >= 0 && x + dx < MW && y + dy < MH && wood((y + dy) * MW + x + dx));
    const kind = (h >> 3) % 3 === 0 ? 'cane' : 'thorn', lv = G.level ? G.level[c] : 0;
    for (const [dx, dy] of nb) for (let k = 0; k < 14; k += 3) blobs.push([cy + dy * k + Math.floor(r() * 3) - 1, cx + dx * k + Math.floor(r() * 3) - 1, 4.2 + r(), kind, lv]);
    blobs.push([cy, cx, 5.4, kind, lv]);   // a close tangle: the cell filled to its corners, the grass showing only between cells
    for (let k = 0; k < 7; k++) blobs.push([cy + Math.floor(r() * 20) - 10, cx + Math.floor(r() * 20) - 10, 4.2 + r() * 1.8, k % 3 === 2 ? (kind === 'thorn' ? 'cane' : 'thorn') : kind, lv]);
  }
  blobs.sort((a, b) => a[0] - b[0]);
  const tint = (v, lv) => { for (let k = 0; k < lv; k++) v = TINT[v]; return v; };
  const ell = (cx, cy, rx, ry, col, lv, sh) => { const o = { sh: sh && sh.map(q => tint(q, lv)) }; pb.ell(cx, cy, rx, ry, tint(col, lv), o); };
  for (const [by, bx, br, , lv] of blobs) ell(bx + 1, by + 2, br + .6, br * .8, C.ink, lv);
  for (const [by, bx, br, kind, lv] of blobs) kind === 'thorn' ? ell(bx, by, br, br * .75, C.pine, lv, [C.forest, C.ink]) : ell(bx, by, br, br * .75, C.forest, lv, [C.leaf, C.pine]);
  let s = (G.seed || 1) >>> 0; const r = () => { s = (Math.imul(s ^ (s >>> 13), 1597334677) + 0x7F4A7C15) >>> 0; return s / 4294967296; };
  for (const [by, bx, , kind, lv] of blobs) {
    if (kind === 'cane') for (let t = 0; t < 7; t++) pb.set(Math.round(bx - 3 + t), Math.round(by + 1 - 3 * Math.sin(t / 6 * Math.PI)), tint(C.rust, lv));
    if (r() < .5) pb.set(bx + Math.floor(r() * 5) - 2, by + Math.floor(r() * 3) - 2, tint(kind === 'thorn' ? C.cream : C.lavender, lv));
  }
}

export function mapHooks() {
  return {
    cell(pb, G, c, px, py, l, R, C) {
      if (G.biome === 'tarns') return tarnsCell(pb, G, c, px, py, l, R, C, L);
      if (l !== L.WOOD) return false;
      if (G.biome === 'tallwood') { tallCell(pb, px, py, R, C); return true; }
      if (G.biome === 'thickets') { thicketsGround(pb, px, py, R, C); return true; }
      return false;
    },
    foam: (G, c, C) => G.biome === 'tarns' ? C.rockL : null,
    post(pb, G, X) { if (G.biome === 'thickets') thicketsPost(pb, G, X); },
  };
}
