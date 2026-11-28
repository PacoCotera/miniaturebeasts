// The dusk, night and dawn cards move a little (#175, "minimalistic animation"). No new art: every frame is the signed card with
// pixels it already has moved or re-toned back to its own palette. One motion a card, a gentle loop of 4 steps, one rhythm:
//   night: the fireflies blink and drift a pixel;  dusk: the sun's glow rings breathe;  dawn: the mist drifts three pixels (#175 round 4: seen within 2 s at 412).
// Pure: grids are Uint8Array RGB on the card's 225 x 300 grid (the 450 x 600 file is 2x nearest).
export const CARD_W = 225, CARD_H = 300;
// ms a step lasts, and the order the frames play (ping-pong where the motion is a breath or a drift)
export const CARD_BEAT = { night: { ms: 300, seq: [0, 1, 2, 3] }, dusk: { ms: 500, seq: [0, 1, 2, 1] }, dawn: { ms: 400, seq: [0, 1, 2, 1] } };

export function gridOf(rgba) {   // the 450 x 600 RGBA bytes -> the 225 x 300 RGB grid
  const a = new Uint8Array(CARD_W * CARD_H * 3);
  for (let y = 0; y < CARD_H; y++) for (let x = 0; x < CARD_W; x++) {
    const i = (y * 2 * 450 + x * 2) * 4, j = (y * CARD_W + x) * 3;
    a[j] = rgba[i]; a[j + 1] = rgba[i + 1]; a[j + 2] = rgba[i + 2];
  }
  return a;
}
export function rgbaOf(a) {   // the grid -> 450 x 600 RGBA bytes, 2x nearest
  const o = new Uint8ClampedArray(450 * 600 * 4);
  for (let y = 0; y < 600; y++) for (let x = 0; x < 450; x++) {
    const j = ((y >> 1) * CARD_W + (x >> 1)) * 3, i = (y * 450 + x) * 4;
    o[i] = a[j]; o[i + 1] = a[j + 1]; o[i + 2] = a[j + 2]; o[i + 3] = 255;
  }
  return o;
}
const at = (a, x, y) => (y * CARD_W + x) * 3;
const palOf = (a) => { const s = new Map(); for (let i = 0; i < a.length; i += 3) s.set(a[i] << 16 | a[i + 1] << 8 | a[i + 2], [a[i], a[i + 1], a[i + 2]]); return [...s.values()]; };
function snapTo(pal, r, g, b) { let best = pal[0], bd = 1e9; for (const p of pal) { const d = (p[0] - r) ** 2 + (p[1] - g) ** 2 + (p[2] - b) ** 2; if (d < bd) { bd = d; best = p; } } return best; }
const put = (a, i, c) => { a[i] = c[0]; a[i + 1] = c[1]; a[i + 2] = c[2]; };

function nightFrames(a) {
  const pal = palOf(a), warm = new Uint8Array(CARD_W * CARD_H);
  for (let y = 131; y < CARD_H; y++) for (let x = 0; x < CARD_W; x++) { const i = at(a, x, y), r = a[i], g = a[i + 1], b = a[i + 2]; if (r > 150 && g > 120 && b < 0.75 * g) warm[y * CARD_W + x] = 1; }
  const seen = new Uint8Array(warm.length), flies = [];
  for (let s = 0; s < warm.length; s++) {
    if (!warm[s] || seen[s]) continue;
    const st = [s], c = []; seen[s] = 1;
    while (st.length) {
      const p = st.pop(), py = (p / CARD_W) | 0, px = p % CARD_W; c.push([px, py]);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = px + dx, ny = py + dy; if (nx >= 0 && ny >= 0 && nx < CARD_W && ny < CARD_H && warm[ny * CARD_W + nx] && !seen[ny * CARD_W + nx]) { seen[ny * CARD_W + nx] = 1; st.push(ny * CARD_W + nx); } }
    }
    const own = new Set(c.map(([x, y]) => y * CARD_W + x)), ring = [];
    const xs = c.map(p => p[0]), ys = c.map(p => p[1]);
    for (let y = Math.min(...ys) - 2; y <= Math.max(...ys) + 2; y++) for (let x = Math.min(...xs) - 2; x <= Math.max(...xs) + 2; x++) {
      if (x < 0 || y < 0 || x >= CARD_W || y >= CARD_H || own.has(y * CARD_W + x)) continue;
      let near = false; for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) if (own.has((y + dy) * CARD_W + x + dx)) { near = true; break; }
      if (!near) ring.push(at(a, x, y));
    }
    const med = (o) => { const v = ring.map(i => a[i + o]).sort((p, q) => p - q); return v.length ? v[v.length >> 1] : 0; };
    flies.push({ c, bg: snapTo(pal, med(0), med(1), med(2)) });   // the surround's tone, as the card's own colour
  }
  const cycles = [
    [[1, 0, 0], [1, 1, 0], [.5, 1, 1], [0, 0, 1]],
    [[.5, 0, 0], [1, 0, 0], [1, 0, 1], [.5, 1, 1]],
    [[0, 0, 0], [.5, 0, 0], [1, 1, 0], [1, 1, 0]],
    [[1, 0, 0], [0, 0, 0], [.5, 0, 0], [1, 0, 1]],
  ];
  const out = [];
  for (let f = 0; f < 4; f++) {
    const o = a.slice();
    for (const fl of flies) for (const [x, y] of fl.c) put(o, at(o, x, y), fl.bg);
    flies.forEach((fl, i) => {
      const [s, dx, dy] = cycles[i % 4][(f + i) % 4];
      if (!s) return;
      for (const [x, y] of fl.c) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= CARD_W || ny >= CARD_H) continue;
        const j = at(a, x, y);
        put(o, at(o, nx, ny), s < 1 ? snapTo(pal, (a[j] + fl.bg[0]) >> 1, (a[j + 1] + fl.bg[1]) >> 1, (a[j + 2] + fl.bg[2]) >> 1) : [a[j], a[j + 1], a[j + 2]]);
      }
    });
    out.push(o);
  }
  return out;
}

function duskFrames(a) {
  let cx = 0, cy = 0, best = -1, n = 0;   // the sun: the brightest pixels in its box
  for (let y = 125; y < 170; y++) for (let x = 100; x < 200; x++) { const i = at(a, x, y), l = a[i] + a[i + 1] + a[i + 2]; if (l > best) best = l; }
  for (let y = 125; y < 170; y++) for (let x = 100; x < 200; x++) { const i = at(a, x, y); if (a[i] + a[i + 1] + a[i + 2] >= best - 6) { cx += x; cy += y; n++; } }
  cx = Math.floor(cx / n); cy = Math.floor(cy / n);
  const pal = palOf(a), steps = [-0.3, 0, 0.35], g3 = [];
  for (const k of steps) {
    const o = a.slice();
    if (k) for (let y = 0; y < CARD_H; y++) for (let x = 0; x < CARD_W; x++) {
      const d = Math.hypot(x - cx, y - cy); if (d < 8 || d > 56) continue;
      const t = k * (1 - (d - 8) / 48), tgt = t > 0 ? 255 : 0, i = at(a, x, y);
      put(o, i, snapTo(pal, a[i] + Math.trunc(Math.abs(t) * (tgt - a[i])), a[i + 1] + Math.trunc(Math.abs(t) * (tgt - a[i + 1])), a[i + 2] + Math.trunc(Math.abs(t) * (tgt - a[i + 2]))));
    }
    g3.push(o);
  }
  return [g3[0], g3[1], g3[2], g3[1]];
}

const MIST = [[160, 155, 151], [102, 120, 120], [119, 135, 137], [111, 120, 132], [187, 196, 174]];
function dawnFrames(a) {   // the mist band's own pixels take the colour of the mist pixel one step left, only where both are mist
  const M = new Uint8Array(CARD_W * CARD_H);
  for (let y = 130; y <= 235; y++) for (let x = 0; x < CARD_W; x++) { const i = at(a, x, y); if (MIST.some(m => m[0] === a[i] && m[1] === a[i + 1] && m[2] === a[i + 2])) M[y * CARD_W + x] = 1; }
  return [0, 1, 2, 1].map(s => {
    const o = a.slice();
    if (s) for (let y = 130; y <= 235; y++) for (let x = 0; x < CARD_W; x++) {
      const sx = (x - 3 * s + CARD_W) % CARD_W;
      if (M[y * CARD_W + x] && M[y * CARD_W + sx]) put(o, at(o, x, y), [a[at(a, sx, y)], a[at(a, sx, y) + 1], a[at(a, sx, y) + 2]]);
    }
    return o;
  });
}

// the loop's frames (grids) for a card kind, from the signed still's RGBA bytes
export function cardFrames(k, rgba) {
  const a = gridOf(rgba);
  return k === 'night' ? nightFrames(a) : k === 'dusk' ? duskFrames(a) : k === 'dawn' ? dawnFrames(a) : null;
}
// which frame shows at `ms` since the card came up
export function cardStep(k, ms) { const b = CARD_BEAT[k]; return b.seq[Math.floor(Math.max(0, ms) / b.ms) % b.seq.length]; }
