// R3 trees for the Companion's 48 px place and its 26 px map: the fruit tree, the hollow trunk and the Shade column.
// Code-drawn on the page's own 48 core colours, by name. Pure functions, no DOM: each returns indexed sprites
// ({ w, h, p: Int16Array, -1 clear }) that the page wraps in a PB (pb.p.set(s.p)).
//
// How the page uses them (one tree on one T.TRUNK tile, as today's trunk and canopy):
//   const t = treeSprites(kind, { asleep, crop, seed }, C, DARK);
//   t.trunk  32 × 32, drawn where the trunk stand is today: tile (8, 16), under every sprite. t.trunk.shadow is a mask of ground
//            pixels to step down once with DARK before the trunk goes on (the tree's foot shadow on the real lawn).
//   t.canopy 88 × 76, drawn where canopyArt is today: tile (8 + 16 - 44, 16 + 16 - 58) = (-20, -26), over every sprite, and thinned
//            to the checkerboard when something stands within one tile (the page's own rule; nothing changes there).
//   Both go through the page's tables like any sprite: PLACE_FOG asleep, the veil, the storm; the Shade's asleep wash is SHADE_WASH.
//   kind:  'fruit'  the fruit tree (Meadows, Orchard vale). crop: 'bare' (leaves and blossom: open woken, closed buds asleep) or
//                   'fruit' (after a bloom: fruit to shake, the blossom gone). Shaking sets it back to 'bare'.
//          'hollow' the hollow trunk (Woods, Tallwood): one dark opening at the foot, on the trunk layer so it is never thinned.
//          'shade'  the Shade column: one tall dark pillar under a high, flat teal roof, pale fungus shelves at its foot.
//   asleep: true draws the closed state (buds, no light coin); the page's table does the muting. seed: per tree (hash of place and tile).
//
// The map (26 px cells): mapTuft(kind, { asleep, crop, seed }, C) returns a small sprite with its anchor (ax, ay): blit it at
// (tx - ax, ty - ay) where buildMapPB today draws a wood tuft at (tx, ty).
//
// Palette entries each kind uses (all core names; asleep they go through the fog table, the Shade through SHADE_WASH):
export const PALETTE_USED = {
  fruit: ['ink', 'soil', 'bark', 'forest', 'leaf', 'grass', 'sprout', 'lime', 'cream', 'blush', 'pink', 'peach', 'coral', 'red', 'wine', 'pine', 'ink'],
  hollow: ['ink', 'soil', 'bark', 'clay', 'pine', 'forest', 'leaf', 'grass', 'sprout'],
  round: ['ink', 'soil', 'bark', 'pine', 'forest', 'leaf', 'grass', 'sprout'],
  broad: ['ink', 'soil', 'bark', 'pine', 'forest', 'leaf', 'grass'],
  shade: ['void', 'ink', 'night', 'soil', 'bark', 'pine', 'tealD', 'teal', 'bone', 'fog', 'mist'],
};
export const KINDS = ['fruit', 'hollow', 'shade', 'round', 'broad'];
export const CANOPY = { w: 88, h: 76, dx: -20, dy: -26 }, TRUNK = { w: 32, h: 32, dx: 8, dy: 16 };

const TW = 88, TH = 76, FX = 44, FY = 69;               // the whole tree's box is the canopy box; the foot sits at tile (24, 43)
const BX = TRUNK.dx - CANOPY.dx, BY = TRUNK.dy - CANOPY.dy;   // the trunk box inside it: (28, 42) to (60, 74)
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

function rng(seed) { let a = (seed >>> 0) || 1; const f = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return { f, u: (a0, b0) => a0 + (b0 - a0) * f(), i: n => Math.floor(f() * n) }; }

class Buf {   // the page's PB drawing rules (set, ell with its sh shading, line), so a builder can swap in PB itself
  constructor(w, h) { this.w = w; this.h = h; this.p = new Int16Array(w * h).fill(-1); }
  set(x, y, c) { x = Math.floor(x); y = Math.floor(y); if (c >= 0 && x >= 0 && y >= 0 && x < this.w && y < this.h) this.p[y * this.w + x] = c; }
  get(x, y) { return (x < 0 || y < 0 || x >= this.w || y >= this.h) ? -1 : this.p[y * this.w + x]; }
  ell(cx, cy, rx, ry, c, o) { o = o || {}; const R = Math.max(rx, ry) + 1;
    for (let y = Math.floor(cy - R); y <= Math.ceil(cy + R); y++) for (let x = Math.floor(cx - R); x <= Math.ceil(cx + R); x++) {
      const px = x + .5 - cx, py = y + .5 - cy, nx = px / rx, ny = py / ry; if (nx * nx + ny * ny > 1) continue; let col = c;
      if (o.sh) { const ux = px / rx, uy = py / ry; if ((ux + .38) ** 2 + (uy + .45) ** 2 < .16) col = o.sh[0]; else if (ux * .45 + uy * .9 > .58) col = o.sh[1]; }
      this.set(x, y, col); } return this; }
  line(x0, y0, x1, y1, c, th) { x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
    for (;;) { for (let j = 0; j < (th || 1); j++) for (let i = 0; i < (th || 1); i++) this.set(x0 + i, y0 + j, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } } return this; }
}

// A trunk from the foot (x0, y0, width w0) up to (x1, y1, width w1), lit from the left: ramp [dark, mid, light].
function trunk(b, x0, y0, x1, y1, w0, w1, ramp, R, flare = 0, streak = true) {
  const n = Math.abs(y0 - y1) + 1;
  for (let i = 0; i < n; i++) { const t = i / Math.max(1, n - 1), y = Math.round(y0 + (y1 - y0) * t), cx = x0 + (x1 - x0) * t;
    const ww = w0 + (w1 - w0) * t + flare * Math.max(0, 1 - t * 5) ** 2, l = Math.round(cx - ww / 2), r = Math.round(cx + ww / 2);
    for (let x = l; x <= r; x++) { const u = (x - l) / Math.max(1, r - l); let k = u < .28 ? 2 : u < .7 ? 1 : 0;
      if (streak && k === 1 && R.f() < .10) k = 0; if (streak && k === 2 && R.f() < .06) k = 1; b.set(x, y, ramp[k]); } }
}

// A crown of leaf clusters over spheres (cx, cy, r): each leaf cell lit top-left and dark lower-right over the crown's own shading,
// quantised onto the ramp (dark to light) with the 4 × 4 ordered dither. Plain loops, no DOM.
const LD = (() => { const v = [-.55, -.75, .65], n = Math.hypot(...v); return v.map(q => q / n); })();
function foliage(w, h, clumps, ramp, R, { leaf = 4, leafk = .75, gap = true, jag = 1.2, lift = 0 } = {}) {
  const N = w * h, Hh = new Float64Array(N).fill(-1e9);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const X = x + .5, Y = y + .5;
    for (const [cx, cy, r] of clumps) { const d2 = (X - cx) ** 2 + (Y - cy) ** 2; if (d2 < r * r) Hh[y * w + x] = Math.max(Hh[y * w + x], Math.sqrt(r * r - d2) - cy * .25); } }
  const np = Math.floor(N / (leaf * leaf) * 1.1), px = [], py = [];
  for (let i = 0; i < np; i++) { px.push(R.u(0, w)); py.push(R.u(0, h)); }
  const inside = px.map((x, i) => clumps.some(([cx, cy, r]) => (x - cx) ** 2 + (py[i] - cy) ** 2 < (r - jag) ** 2));
  const idx = new Int32Array(N), d1 = new Float64Array(N), d2b = new Float64Array(N), mask = new Uint8Array(N);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const k = y * w + x; if (Hh[k] <= -1e8) continue; const X = x + .5, Y = y + .5; let a = 1e9, b2 = 1e9, ia = 0;
    for (let i = 0; i < np; i++) { const d = (X - px[i]) ** 2 + (Y - py[i]) ** 2; if (d < a) { b2 = a; a = d; ia = i; } else if (d < b2) b2 = d; }
    idx[k] = ia; d1[k] = a; d2b[k] = b2; mask[k] = inside[ia] || Math.sqrt(Math.max(Hh[k], 0)) > 3 ? 1 : 0; }
  const H0 = k => mask[k] ? Hh[k] : 0, G = (x, y) => H0(y * w + x);
  let top = h, bot = 0; for (let k = 0; k < N; k++) if (mask[k]) { const y = (k / w) | 0; top = Math.min(top, y); bot = Math.max(bot, y); }
  const out = new Int16Array(N).fill(-1), n = ramp.length;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const k = y * w + x; if (!mask[k]) continue;
    const gx = x === 0 ? G(1, y) - G(0, y) : x === w - 1 ? G(x, y) - G(x - 1, y) : (G(x + 1, y) - G(x - 1, y)) / 2;
    const gy = y === 0 ? G(x, 1) - G(x, 0) : y === h - 1 ? G(x, y) - G(x, y - 1) : (G(x, y + 1) - G(x, y - 1)) / 2;
    const lx = px[idx[k]] - (x + .5), ly = py[idx[k]] - (y + .5), nx = -gx * .5 - lx * leafk / leaf, ny = -gy * .5 - ly * leafk / leaf, nz = 1, nr = Math.hypot(nx, ny, nz);
    const bl = (nx * LD[0] + ny * LD[1] + nz * LD[2]) / nr, vert = 1 - (y - top) / Math.max(1, bot - top);
    let br = .30 + .55 * bl + .35 * vert - .25 + lift;
    if (gap && Math.sqrt(d2b[k]) - Math.sqrt(d1[k]) < .9 && vert < .85) br -= .28;
    let v = Math.min(Math.max(br, 0), .999) * n + (BAYER[(y & 3) * 4 + (x & 3)] / 16 - .5) * .9;
    out[k] = ramp[Math.min(n - 1, Math.max(0, Math.floor(v)))]; }
  return out;
}
const stamp = (b, src) => { for (let k = 0; k < src.length; k++) if (src[k] >= 0) b.p[k] = src[k]; };

// Pick spots on a mask with a clear margin, at least 6 px apart (Manhattan).
function pickOn(w, h, m, R, n, margin = 2, test = () => true) {
  const ok = []; for (let y = margin; y < h - margin; y++) for (let x = margin; x < w - margin; x++) { if (!test(x, y)) continue; let all = true;
    for (let j = -margin; j <= margin && all; j++) for (let i = -margin; i <= margin; i++) if (!m[(y + j) * w + x + i]) { all = false; break; } if (all) ok.push([x, y]); }
  for (let i = ok.length - 1; i > 0; i--) { const j = R.i(i + 1); [ok[i], ok[j]] = [ok[j], ok[i]]; }
  const out = []; for (const p of ok) { if (out.every(q => Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) > 6)) out.push(p); if (out.length >= n) break; } return out;
}

// One tree, drawn as two layers on the one 88 × 76 box (a = trunk layer, c = canopy layer), outlined together, then split.
export function treeSprites(kind, o, C, DARK) {
  o = o || {}; const R = rng((o.seed || 1) * 7919 + kind.length), a = new Buf(TW, TH), c = new Buf(TW, TH), shadow = new Uint8Array(32 * 32);
  const asleep = !!o.asleep, crop = o.crop || 'bare';
  const foot = (rx, ry) => { for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const u = (x + .5 - (FX - BX)) / rx, v = (y + .5 - (FY - BY + 1)) / ry, d = u * u + v * v;
    if (d < 1 && (d < .55 || BAYER[(y & 3) * 4 + (x & 3)] > 7)) shadow[y * 32 + x] = 1; } };
  if (kind === 'fruit') {
    // a smaller, wider, flatter tree than the round-crown: a short trunk forking low into two limbs, an open crown of light leaves
    foot(13, 3.6);
    trunk(a, FX, FY, FX - 1, BY, 9, 7, [C.ink, C.soil, C.bark], R, 7);
    trunk(c, FX - 1, BY + 1, FX - 1, 46, 7, 6, [C.ink, C.soil, C.bark], R);
    c.line(FX - 2, 48, FX - 15, 35, C.soil, 3); c.line(FX - 1, 48, FX + 14, 33, C.soil, 3); c.line(FX - 1, 47, FX - 14, 34, C.bark, 1);
    const cl = [[22, 30, 13], [42, 24, 16], [64, 28, 13], [32, 37, 10], [55, 38, 10], [76, 34, 7], [10, 36, 7], [44, 12, 9]];
    const cr = foliage(TW, TH, cl, [C.forest, C.leaf, C.grass, C.sprout, C.lime], R, { leaf: 4.5, lift: .04 });
    stamp(c, cr);
    const m = cr.map(v => v >= 0 ? 1 : 0);
    if (crop === 'fruit') {   // after a bloom: fruit on the lower crown, the bush's coral with a blush light and red shade; the blossom is over
      for (const [x, y] of pickOn(TW, TH, m, R, 10, 2, (x, y) => y > 24)) { c.set(x, y, C.coral); c.set(x + 1, y, C.coral); c.set(x, y + 1, C.red); c.set(x + 1, y + 1, C.red); c.set(x, y - 1, C.blush); c.set(x - 1, y, C.coral); c.set(x - 1, y + 1, C.red); c.set(x, y + 2, C.wine); }
    } else {
      pickOn(TW, TH, m, R, 22, 1).forEach(([x, y], i) => { const petal = i % 2 ? C.cream : C.blush;
        if (!asleep) { for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) c.set(x + dx, y + dy, petal); c.set(x, y, i % 2 ? C.pink : C.cream); }
        else { c.set(x, y, i % 2 ? C.grass : C.peach); c.set(x, y - 1, i % 2 ? C.grass : C.peach); } });
    }
  } else if (kind === 'hollow') {
    // a thick old trunk; one low dark arch at its foot, off to the right (one opening, never a pair: no face); moss up its north side
    foot(15, 3.8);
    trunk(a, FX, FY, FX, BY, 22, 18, [C.soil, C.bark, C.clay], R, 8);   // a lighter, older bark than the wood's: the dark opening must read on it
    trunk(c, FX, BY + 1, FX + 1, 20, 18, 13, [C.soil, C.bark, C.clay], R);
    c.line(FX - 6, 34, FX - 20, 20, C.soil, 3); c.line(FX + 6, 30, FX + 20, 16, C.soil, 3);
    const hx = FX - 1, hy = FY - 6;
    for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) { const t = Math.max(0, (hy - (y + .5)) / 7.5), rx = 5.4 - 2.6 * t * t, d = ((x + .5 - hx) / rx) ** 2 + ((y + .5 - hy) / 7.5) ** 2;
      const lip = y < hy - 4 && ((x * 5 + y * 3) % 7 === 0);
      if (y <= FY && d <= 1 && !lip) a.set(x, y, C.ink); else if (y <= FY - 1 && d <= 1.5 && a.get(x, y) >= 0) a.set(x, y, x < hx - 1 && y > hy - 2 ? C.clay : C.soil); }
    for (let y = hy + 1; y <= FY; y++) a.set(hx - 2 + ((y * 7) % 3), y, y > FY - 2 ? C.soil : C.ink);
    for (const b of [a, c]) for (let y = 22; y < FY - 3; y++) for (let x = FX - 13; x < FX - 3; x++)   // moss on the north-west side, thinning down
      if (b.get(x, y) >= 0 && R.f() < .6 * (1 - (y - 22) / 52) && x < FX - 10 + (y - 22) * .09 + R.i(3)) b.set(x, y, R.f() < .7 ? C.leaf : C.grass);
    const cl = [[44, 24, 21], [18, 30, 13], [70, 30, 13], [30, 13, 12], [58, 13, 12], [44, 37, 11], [8, 24, 7], [80, 24, 7]];
    stamp(c, foliage(TW, TH, cl, [C.pine, C.forest, C.leaf, C.grass, C.sprout], R, { leaf: 5.5, jag: 2 }));
  } else if (kind === 'shade') {
    // a column: one tall straight dark pillar, its crown high and flat, a roof of teal that reaches the box's edges so neighbours close
    foot(13, 3.6);
    trunk(a, FX, FY, FX, BY, 13, 12, [C.void, C.ink, C.night], R, 12);   // void is the one dark the wash keeps dark (stone): the pillars show asleep
    trunk(c, FX, BY + 1, FX, 14, 12, 10, [C.void, C.ink, C.night], R);
    for (const [x0, y0, x1, y1] of [[FX - 2, 22, FX - 16, 14], [FX + 2, 20, FX + 18, 12]]) c.line(x0, y0, x1, y1, C.night, 2);
    const cl = [[9, 23, 9], [25, 18, 12], [44, 15, 14], [63, 18, 12], [79, 23, 9], [17, 29, 7], [71, 29, 7], [44, 26, 9], [34, 10, 7], [55, 10, 7]];
    const cr = foliage(TW, TH, cl, [C.ink, C.pine, C.tealD, C.tealD, C.teal], R, { leaf: 4.5, lift: -.04 });
    stamp(c, cr);
    // the roof hangs: strands of dark moss drop from its underside, so the column stands in a room, not under a table
    for (let x = 3; x < TW - 3; x += 3) { if (Math.abs(x - FX) < 9) continue; let y0 = -1; for (let y = TH - 1; y >= 0; y--) if (cr[y * TW + x] >= 0) { y0 = y; break; }
      if (y0 < 0) continue; const len = 3 + R.i(7) + (Math.abs(x - FX) < 22 ? 3 : 0);
      for (let y = y0 + 1; y <= y0 + len; y++) c.set(x + ((y >> 2) & 1 && x % 2 ? 1 : 0), y, y > y0 + len - 2 ? C.pine : C.tealD); }
    // fungus shelves stepping out of the pillar's foot: half discs lit on top (bone, fog), mist beneath, the Shade's pale life
    for (const [x, y, s] of [[FX - 7, FY - 9, -1], [FX + 7, FY - 6, 1], [FX + 7, FY - 14, 1]]) for (let dy = -1; dy <= 1; dy++) for (let dx = 0; dx <= 4; dx++) {
      if ((dx / 4.4) ** 2 + (dy / 1.8) ** 2 > 1) continue; a.set(x + s * dx, y + dy, dy < 0 ? (dx < 2 ? C.bone : C.fog) : dy === 0 ? C.fog : C.mist); }
    if (!asleep) for (let y = 0; y < 5; y++) for (let x = 0; x < 2; x++) if (c.get(FX - 3 + x, 32 + y) >= 0) c.set(FX - 3 + x, 32 + y, x ? C.soil : C.bark);   // a coin of light on the pillar
  } else if (kind === 'round') {
    // the round-crown, redrawn in the same hand: a full round crown on a short trunk, lighter than the wood's broadleaf
    foot(14, 3.8);
    trunk(a, FX, FY, FX, BY, 13, 11, [C.ink, C.soil, C.bark], R, 9);
    trunk(c, FX, BY + 1, FX, 38, 11, 9, [C.ink, C.soil, C.bark], R);
    const cl = [[44, 26, 22], [24, 33, 13], [64, 33, 13], [34, 14, 13], [54, 14, 13], [44, 42, 12]];
    stamp(c, foliage(TW, TH, cl, [C.pine, C.forest, C.leaf, C.grass, C.sprout], R, { leaf: 5 }));
  } else if (kind === 'broad') {
    // the broadleaf (the wood's tree): darker, wider, ragged, a limb out to the right, the crown lifted off a longer trunk
    foot(14, 3.8);
    trunk(a, FX, FY, FX + 1, BY, 12, 10, [C.ink, C.soil, C.bark], R, 9);
    trunk(c, FX + 1, BY + 1, FX + 2, 30, 10, 8, [C.ink, C.soil, C.bark], R);
    c.line(FX + 2, 42, FX + 16, 30, C.soil, 3);
    const cl = [[44, 24, 19], [22, 31, 13], [68, 29, 13], [32, 12, 11], [58, 12, 12], [46, 38, 12], [8, 22, 7], [82, 20, 7]];
    stamp(c, foliage(TW, TH, cl, [C.ink, C.pine, C.forest, C.leaf, C.grass], R, { leaf: 6, leafk: .9, jag: 2.5 }));
  } else throw new RangeError('unknown tree kind: ' + kind);

  // the outline: one pixel outside the whole tree, the DARK of what it touches (never void, except the Shade's: void washes to stone),
  // kept on the layer of what it touches
  const any = k => a.p[k] >= 0 || c.p[k] >= 0, col = k => c.p[k] >= 0 ? c.p[k] : a.p[k];
  const add = [];
  for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) { const k = y * TW + x; if (any(k)) continue;
    for (const [dx, dy] of [[0, 1], [0, -1], [-1, 0], [1, 0]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= TW || Y >= TH) continue; const q = Y * TW + X;
      if (!any(q)) continue; let v = DARK[col(q)]; if (v === C.void && kind !== 'shade') v = C.ink; add.push([k, v, c.p[q] >= 0]); break; } }
  for (const [k, v, onC] of add) (onC ? c : a).p[k] = v;
  // the split: the trunk layer must sit inside the trunk box; anything of it outside goes up to the canopy
  const tr = new Int16Array(32 * 32).fill(-1);
  for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) { const k = y * TW + x; if (a.p[k] < 0) continue;
    const X = x - BX, Y = y - BY; if (X >= 0 && Y >= 0 && X < 32 && Y < 32) tr[Y * 32 + X] = a.p[k]; else if (c.p[k] < 0) c.p[k] = a.p[k]; }
  return { trunk: { w: 32, h: 32, p: tr, shadow }, canopy: { w: TW, h: TH, p: c.p } };
}

// The 26 px map: one tuft per tree, in the built tufts' manner (an ink shadow, a shaded ellipse, a few marks).
export function mapTuft(kind, o, C) {
  o = o || {}; const b = new Buf(16, 18), x = 8, y = 7, woken = !o.asleep;
  if (kind === 'fruit') {   // flatter and lighter than the wood tuft, flecked with blossom (woken) or fruit (after a bloom)
    b.ell(x + 1, y + 2, 6.4, 4, C.pine); b.ell(x, y, 6, 4, C.leaf, { sh: [C.sprout, C.forest] }); b.set(x, y + 5, C.bark); b.set(x, y + 6, C.soil);
    const fl = [[-3, -1], [2, 0], [0, 2], [1, -2], [-1, 1], [4, -1]];
    if (o.crop === 'fruit') for (const [dx, dy] of fl.slice(0, 4)) { b.set(x + dx, y + dy + 1, C.coral); b.set(x + dx, y + dy + 2, C.red); }
    else for (const [dx, dy] of fl) b.set(x + dx, y + dy, woken ? (dx % 2 === 0 ? C.cream : C.pink) : C.grass);
  } else if (kind === 'hollow') {   // the broad tuft, set higher, on a thick trunk with the dark hole at its foot
    b.ell(x, y + 1, 6.2, 5, C.ink); b.ell(x - 2, y - 1, 4.2, 4, C.forest, { sh: [C.leaf, C.pine] }); b.ell(x + 2, y - 2, 4.4, 4.2, C.forest, { sh: [C.leaf, C.pine] });
    for (let k = 0; k < 4; k++) { b.set(x - 2, y + 4 + k, C.soil); b.set(x - 1, y + 4 + k, C.bark); b.set(x, y + 4 + k, C.bark); b.set(x + 1, y + 4 + k, C.clay); b.set(x + 2, y + 4 + k, C.soil); }
    b.set(x, y + 6, C.ink); b.set(x + 1, y + 6, C.ink); b.set(x, y + 7, C.ink); b.set(x + 1, y + 7, C.ink); b.set(x - 2, y + 4, C.leaf);
  } else if (kind === 'shade') {   // a teal roof on a dark pillar, a pale fungus fleck at its foot
    b.ell(x, y + 1, 6, 4.4, C.ink); b.ell(x, y - 1, 5.6, 4, C.tealD, { sh: [C.teal, C.ink] });
    for (let k = 0; k < 6; k++) { b.set(x - 1, y + 3 + k, C.ink); b.set(x, y + 3 + k, C.night); }
    b.set(x - 3, y + 7, C.fog); b.set(x - 2, y + 7, C.bone); b.set(x - 2, y + 8, C.mist);
  } else throw new RangeError('unknown tree kind: ' + kind);
  return { w: b.w, h: b.h, p: b.p, ax: x, ay: y };
}

// The Shade's ground in a place, retoned by value onto a cool moss ramp, so the asleep wash takes it to mist and rock (grey-lavender)
// and never to sprout: a 100-entry table for the 48 px Shade place, applied to the ground layers only. rgb: the page's RGB array.
export function shadeMossLut(rgb, C) {
  const ramp = [C.ink, C.tealD, C.pine, C.tealD, C.pine, C.teal], lum = ([r, g, b]) => .299 * r + .587 * g + .114 * b, out = [];
  const greens = new Set([C.pine, C.forest, C.leaf, C.grass, C.sprout, C.lime]);
  for (let i = 0; i < rgb.length; i++) { const [r, g, b] = rgb[i], green = greens.has(i) || (i >= 48 && g > r && g > b);
    if (!green) { out.push(i); continue; } const L = Math.min(1, Math.max(0, (lum(rgb[i]) - 40) / 120)); out.push(ramp[Math.min(ramp.length - 1, Math.floor(L * ramp.length))]); }
  return out;
}
