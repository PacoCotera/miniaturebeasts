// Level 3's pictures (library.json l3.far, l3.mini), drawn in the logic process on plain RGBA bytes from a lineage (lineage.mjs) and named by views/requests.mjs:
//   lineage-far-{SNN}-{digest}, 992 x 510 at l3.far.rect: the whole lineage as one picture, composited over the ground master's own pixels for its rect (flat libGround until the master is placed);
//   lineage-mini-{SNN}-{digest}, 208 x 96: the same drawing reduced by one uniform scale, on a clear ground (the inset's panel shows through).
// The geometry (lineage.mjs farGeometry, miniGeometry) is pure and cheap: the props builder takes the dot boxes from it as the generator's facts, in the picture's own coordinates; the face adds the picture's place.
//   - spacing: sx = clamp(floor(0.85 * 992 / span), 16, 48) per sibling step (span in sibling steps, 2 u), sy = min(max(round(1.5 sx), syMin), floor((510 - dot - 2 margin) / (R - 1))) for R rows, the tree centred;
//     below 16 px sx, or rows fitting below syMin apart, FAR would need a camera: the generator refuses, naming the species and the span or the rows.
//   - a mibi's dot: 12 px in its read, shown body colour (two halves for a two-tone, the first on the left), never from hidden copies; an open frostS ring when Coat is unread or the colour is locked;
//     a released mibi's dot faded as its face is (library.json faces.faded). Pods: a 1 px mist outline oval 8 x 10 at (2, 1) in the dot box, the bud's in mint, the ground inside.
//   - links: 1 px mist, a faded parent's stone, drawn first; the nodes over them.
// Every pixel is the ground's, a palette token's or a dot's body colour: no anti-aliasing, no master.
import { lookColours } from "./specimen.mjs";
import { traitState } from "./genome.mjs";
import { farGeometry, miniGeometry } from "./lineage.mjs";
export { farGeometry, miniGeometry };

const hexRGB = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
// The read, shown body colour of mibi `m` (its Colour trait's shown look, as hex: one, or two for a two-tone), or null when its Coat is unread or the colour is locked (the species has no Colour trait, or its loci are locked).
export function bodyColour(frame, m) {
  if (!frame || !m?.genome) return null;
  const ch = frame.chapters.find((c) => c.traits.some((t) => t.id === "colour")), t = ch?.traits.find((x) => x.id === "colour"); if (!t) return null;
  if (t.loci.every((id) => frame.loci.find((l) => l.id === id)?.kind === "locked")) return null;
  if (ch.sealed || !(m.read ?? []).includes(ch.id)) return null;
  const shows = traitState(frame, t, m.genome).shows; if (!shows) return null;
  return lookColours({ id: t.id, sid: frame.species.id, chapterId: ch.id, pod: (frame.pod?.colourPair ?? []).map((c) => c.hex) }, shows, Math.max(0, t.looks.indexOf(shows)));
}

// An ellipse's pixels in a W x H box (the art director's rule): (i, j) is inside when ((2i + 1 - W) / W)^2 + ((2j + 1 - H) / H)^2 <= 1; it is ink of the outline when inside and at least one 4-neighbour is not.
const inside = (i, j, W, H) => i >= 0 && j >= 0 && i < W && j < H && ((2 * i + 1 - W) / W) ** 2 + ((2 * j + 1 - H) / H) ** 2 <= 1;
const ring = (i, j, W, H) => inside(i, j, W, H) && (!inside(i - 1, j, W, H) || !inside(i + 1, j, W, H) || !inside(i, j - 1, W, H) || !inside(i, j + 1, W, H));

// input: { species, nodes: [{ id, kind, row, u, released, colour (bodyColour, or null) }], links: [{ a, b, faded }], span, rows } (views/requests.mjs lineageInput). rgb: a palette token's [r, g, b].
// ground: { w, h, rgba } of the ground master (placed at l1.stage.rect), or null for flat libGround. Returns { w, h, rgba, boxes, ms }.
export function farPicture(input, spec, { rgb, ground = null } = {}) {
  const t0 = performance.now(), F = spec.l3.far, g = farGeometry(input, spec), [W, H] = F.rect.slice(2), px = new Uint8ClampedArray(W * H * 4), flat = rgb("libGround");
  const S = spec.l1.stage.rect, gx = F.rect[0] - S[0], gy = F.rect[1] - S[1];
  const groundAt = (x, y) => { if (!ground) return flat; const i = ((y + gy) * ground.w + (x + gx)) * 4; return [ground.rgba[i], ground.rgba[i + 1], ground.rgba[i + 2]]; };
  const put = (x, y, c) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 4; px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) put(x, y, groundAt(x, y));
  drawLinks(input.links, (u) => Math.floor(g.X(u)), (r) => Math.floor(g.Y(r)), (l) => rgb(l.faded ? F.link.faded : F.link.colour), put);
  const keep = spec.faces.faded.keep, fade = (c, x, y) => { const b = rgb(spec.faces.faded.ground); return c.map((v, i) => Math.round(keep * v + (1 - keep) * b[i])); };
  for (const n of input.nodes) {
    const [bx, by, d] = g.boxes[n.id], f = (c, x, y) => (n.released ? fade(c, x, y) : c);
    if (n.kind === "mibi" && n.colour) { const cols = n.colour.map(hexRGB); for (let j = 0; j < d; j++) for (let i = 0; i < d; i++) if (inside(i, j, d, d)) put(bx + i, by + j, f(cols[cols.length > 1 && i >= d / 2 ? 1 : 0], bx + i, by + j)); continue; }
    const [ow, oh, oi, oj, col] = n.kind === "mibi" ? [d, d, 0, 0, F.neutral] : [...F.pod.size, ...F.pod.at, n.kind === "bud" ? F.pod.bud : F.pod.colour];
    for (let j = 0; j < oh; j++) for (let i = 0; i < ow; i++) { if (!inside(i, j, ow, oh)) continue; const x = bx + oi + i, y = by + oj + j; put(x, y, ring(i, j, ow, oh) ? f(rgb(col), x, y) : groundAt(x, y)); }   // an outline: the ground inside
  }
  return { w: W, h: H, rgba: px, boxes: g.boxes, sx: g.sx, sy: g.sy, ms: performance.now() - t0 };
}
// The mini (208 x 96, clear outside its ink): the FAR drawing reduced: links 1 px, a mibi a d x d disc (lineage.mjs miniGeometry: 2 to 4 px by FAR's spacing) in its dot's colour by the pixel rule (the art director: at 4
// .##. / #### / #### / .##., a two-tone split at i = d / 2; the open ring at that size when neutral, a filled 2 x 2 at 2), a pod and the bud one pixel. Returns { w, h, rgba, boxes, scale, origin, ms }.
export function miniPicture(input, spec, { rgb } = {}) {
  const t0 = performance.now(), F = spec.l3.far, far = farGeometry(input, spec), m = miniGeometry(input, spec, far), [W, H] = spec.l3.mini.rect.slice(2), px = new Uint8ClampedArray(W * H * 4);
  const put = (x, y, c) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 4; px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255; };
  drawLinks(input.links, (u) => m.at(far.X(u), 0)[0], (r) => m.at(0, far.Y(r))[1], (l) => rgb(l.faded ? F.link.faded : F.link.colour), put);
  const keep = spec.faces.faded.keep, b = rgb(spec.faces.faded.ground), fade = (c) => c.map((v, i) => Math.round(keep * v + (1 - keep) * b[i]));
  for (const n of input.nodes) {
    const [x0, y0, w, h] = m.boxes[n.id], f = (c) => (n.released ? fade(c) : c);
    if (n.kind !== "mibi") { put(x0, y0, rgb(n.kind === "bud" ? F.pod.bud : F.pod.colour)); continue; }
    const cols = n.colour ? n.colour.map(hexRGB) : null;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { if (cols) { if (inside(i, j, w, h)) put(x0 + i, y0 + j, f(cols[cols.length > 1 && i >= w / 2 ? 1 : 0])); } else if (inside(i, j, w, h)) { if (ring(i, j, w, h)) put(x0 + i, y0 + j, f(rgb(F.neutral))); else { const k = ((y0 + j) * W + x0 + i) * 4; if (x0 + i >= 0 && y0 + j >= 0 && x0 + i < W && y0 + j < H) px.fill(0, k, k + 4); } } }   // a disc by the outline rule (.##. #### #### .##. at 4), two halves split at i = w / 2
  }
  return { w: W, h: H, rgba: px, boxes: m.boxes, scale: m.scale, origin: m.origin, ms: performance.now() - t0 };
}
// The links, 1 px, orthogonal: each from its grid point a to b (X, Y give a grid point's pixel column and row).
function drawLinks(links, X, Y, colourOf, put) {
  for (const l of links) {
    const c = colourOf(l), xa = X(l.a[0]), xb = X(l.b[0]), ya = Y(l.a[1]), yb = Y(l.b[1]);
    if (ya === yb) for (let x = Math.min(xa, xb); x <= Math.max(xa, xb); x++) put(x, ya, c);
    else for (let y = Math.min(ya, yb); y <= Math.max(ya, yb); y++) put(xa, y, c);
  }
}
