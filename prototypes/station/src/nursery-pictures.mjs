// The nursery's pictures (station step 5; the accepted walk-4 pictures 9a, 9b and 10), composed once by id and sent to the face as ONE picture each, as her page's are (reading-pictures.mjs): the face draws them 1:1 and the
// words come over them from the props (page.scale.texts). The art is the game's own, only placed: the capsule's 145 x 224 layers (interior, glass, shell, the lit bar clipped to the progress, the door), the sealed pod, the
// cabinet strip's wooden board, the capsule room's backdrop, the faces of the parents. The marks (rings, pills, the plank of a row, the keys) are interface drawn by code. Pure: the same request gives the same bytes.
//   nursery: { size, caps: [{ x, y, w, h, layers, state, progress, bar: [x0, x1], pod: { id, w, cx, foot } | null, ring, badge: [x, y, w, h, tone] }], head: { pill: [x, y, w, h, radius] }, rows: [{ x, y, w, h, radius, ring, isNew, tag: [x, y, w, h],
//             wood: [x, y, w], pods: [{ id, x, w, foot }], faces: [{ id, x, y, d }] }], keys: { pad: [x, y, w, h] | null, ok: [x, y, w, h] }, back: ids }
//   podpage: { size, back, shelfTop, pod: { id, w, cx, foot }, alike: [x, y, w, h, radius] | null, pill: [x, y, w, h, radius], faces: [{ id, x, y, d }], ring: [x, y, w, h, radius] | null, ok: [x, y, w, h], letgo: [x, y, w, h, radius, ring] | null }
import { cropOf, Pane, pixels as masterPixels, paintPage, rrectSd, sprite, discClip, PAGE_ORANGE, PAGE_INK, PAGE_GOLD } from "./reading-pictures.mjs";
import { assetEntry, asset as assetOf } from "../../ui/assets.mjs";

// a master's pixels, or a built picture's (the pod: registered by the same props, made by pictures.mjs); null when it is neither
const pixels = (id) => { const e = assetEntry(id); if (!e || e.status === "empty") return null; return e.file ? masterPixels(id) : assetOf(id)?.rgba?.() ?? null; };

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const CREAM = [239 / 255, 233 / 255, 220 / 255], INK = [14 / 255, 17 / 255, 24 / 255], FLAT = [27 / 255, 32 / 255, 42 / 255];

// the capsule room's backdrop covering a w x h area at the top left (the room's own painting, centred across), else the flat ground
function backdrop(out, h) {
  const bg = pixels("capsule-room-day-1024x522"), W = out.w;
  for (let i = 0; i < out.w * out.h; i++) { out.c.set(FLAT, i * 3); out.a[i] = 1; }
  if (bg) { const w = Math.max(W, Math.round((h * 1024) / 522)); sprite(out, bg, 1024, 522, Math.round((W - w) / 2), 0, w, { clip: (x, y) => (y < h ? 1 : 0) }); }
}
function pill(out, [x, y, w, h, r], col = PAGE_INK, a = 0.84) { paintPage(out, x - 1, y - 1, x + w + 1, y + h + 1, (px, py) => [col, a * clamp01(0.5 - rrectSd(px, py, x, y, w, h, r ?? h / 2))]); }
function ring(out, [x, y, w, h, r], border, col = PAGE_ORANGE) {   // a rounded frame (border wide) with a faint fill and a soft halo
  paintPage(out, x - 12, y - 12, x + w + 12, y + h + 12, (px, py) => { const sd = rrectSd(px, py, x, y, w, h, r); if (sd > 8) return null; if (sd <= -border) return [col, 0.1 * clamp01(0.5 - sd)]; if (sd <= 0.5) return [col, clamp01(0.5 - sd) * clamp01(sd + border + 0.5)]; return [col, 0.3 * clamp01(1 - sd / 8)]; });
}
function dashed(out, x, y, d, border, dash, col) {   // a dashed rounded-square rim (dash lp on, dash lp off), as her page draws "no look of yours has this"
  paintPage(out, x - 2, y - 2, x + d + 2, y + d + 2, (px, py) => { const sd = rrectSd(px, py, x, y, d, d, 8); if (sd > 0.5 || sd < -border) return null;
    const along = Math.abs(px - (x + d / 2)) > Math.abs(py - (y + d / 2)) ? py - y : px - x; return Math.floor(along / dash) % 2 === 0 ? [col, 0.95 * clamp01(0.5 - sd) * clamp01(sd + border + 0.5)] : null; });
}
function face(out, f) { const px = pixels(f.id), cx = f.x + f.d / 2, cy = f.y + f.d / 2;
  paintPage(out, f.x - 3, f.y - 3, f.x + f.d + 3, f.y + f.d + 3, (x, y) => [CREAM, 0.95 * clamp01(f.d / 2 + 2.5 - Math.hypot(x - cx, y - cy))]);
  if (px) sprite(out, px, 64, 64, f.x, f.y, f.d, { clip: discClip(cx, cy, f.d / 2 - 1.5) }); else paintPage(out, f.x, f.y, f.x + f.d, f.y + f.d, (x, y) => [FLAT, clamp01(f.d / 2 - 1.5 - Math.hypot(x - cx, y - cy))]); }
// a plank of the cabinet strip's wooden board: `rows` source-scaled rows of it, w wide, its top at y
function plank(out, x, y, w, rows = 12) { const px = pixels("cabinet-strip-672x228"), k = w / 672;
  if (px) sprite(out, px, 672, 228, x, y - Math.round(30 * k), w, { clip: (X, Y) => (Y >= y && Y < y + rows ? clamp01(Math.min(Y - y + 1, y + rows - Y)) : 0) });
  else paintPage(out, x, y, x + w, y + rows, () => [[0.52, 0.32, 0.2], 1]); }
function keys(out, K) {
  if (K.pad) { const [x, y, w, h] = K.pad;
    paintPage(out, x - 1, y - 1, x + w + 1, y + h + 1, (px, py) => { const sd = rrectSd(px, py, x, y, w, h, 9), a = clamp01(0.5 - sd); return a <= 0 ? null : sd > -1.5 ? [[1, 1, 1], 0.3 * a] : [[43 / 255, 49 / 255, 64 / 255], a]; });
    const cx = x + w / 2, cy = y + h / 2; paintPage(out, cx - 9, cy - 6, cx + 9, cy + 6, (px, py) => { const u = px - cx, v = Math.abs(py - cy); const l = u < -1 && u > -8 && v < ((u + 8) / 7) * 4.5, r = u > 1 && u < 8 && v < ((8 - u) / 7) * 4.5; return l || r ? [[244 / 255, 239 / 255, 226 / 255], 1] : null; }); }
  if (K.ok) { const [x, y, w, h] = K.ok, cx = x + w / 2, cy = y + h / 2, a = [cx - 6.5, cy + 0.5], b = [cx - 2, cy + 5], c = [cx + 7, cy - 5];
    paintPage(out, x - 1, y - 1, x + w + 1, y + h + 1, (px, py) => [PAGE_ORANGE, clamp01(w / 2 + 0.5 - Math.hypot(px - cx, py - cy))]);
    paintPage(out, cx - 10, cy - 10, cx + 10, cy + 10, (px, py) => [[1, 1, 1], clamp01(1.7 - Math.min(segDist2(px, py, a, b), segDist2(px, py, b, c)))]); } }
const segDist2 = (px, py, [x1, y1], [x2, y2]) => { const dx = x2 - x1, dy = y2 - y1, L = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / L)); return Math.hypot(px - x1 - t * dx, py - y1 - t * dy); };

export function nurseryPicture(r) {
  const [W, H] = r.size, out = new Pane(W, H), bodyTop = r.shelfTop ?? 296;
  backdrop(out, bodyTop);
  paintPage(out, 0, 0, W, 76, (x, y) => [INK, 0.5 * (1 - y / 76)]);   // the title reads over the painting
  paintPage(out, 0, bodyTop - 26, W, H, (x, y) => [INK, clamp01((y - (bodyTop - 26)) / 26) * 0.97]);   // the painting fades into the shelf's ink
  pill(out, r.head.pill);
  for (const c of r.caps) {
    const L = c.layers, at = (id, o = {}) => { const px = pixels(id); if (px) sprite(out, px, c.w, c.h, c.x, c.y, c.w, o); };
    at(L.interior);
    if (c.pod) { const px = pixels(c.pod.id); if (px) sprite(out, px, 144, 176, Math.round(c.x + c.pod.cx - c.pod.w / 2), Math.round(c.y + c.pod.foot - (c.pod.w * 176) / 144), c.pod.w); }
    if (c.state === "young") at(L.door); else at(L.glass);
    at(L.shell);
    if (c.state === "growing" || c.state === "ready") { const x1 = c.bar[0] + Math.round((c.bar[1] - c.bar[0]) * c.progress); at(L.bar, { clip: (X) => (X - c.x < x1 ? 1 : 0) }); }
    if (c.ring) ring(out, c.ring, r.ringBorder ?? 3);
    if (c.badge) { const [x, y, w, h, tone] = c.badge; pill(out, [x, y, w, h, h / 2], PAGE_INK, tone === "ready" ? 0.92 : 0.8); if (tone === "ready") paintPage(out, x, y, x + w, y + h, (px, py) => { const sd = rrectSd(px, py, x, y, w, h, h / 2); return sd > -1.5 ? [PAGE_GOLD, clamp01(0.5 - sd)] : null; }); }
  }
  for (const w of r.rows) {
    const rc = [w.x, w.y, w.w, w.h, w.radius]; if (w.ring) ring(out, rc, w.ringBorder ?? 2.5); else paintPage(out, w.x, w.y, w.x + w.w, w.y + w.h, (px, py) => [[1, 1, 1], 0.04 * clamp01(0.5 - rrectSd(px, py, w.x, w.y, w.w, w.h, w.radius))]);
    if (w.wood) plank(out, w.wood[0], w.wood[1], w.wood[2]);
    for (const p of w.pods) { const px = pixels(p.id); if (px) sprite(out, px, 144, 176, p.x, Math.round(p.foot - (p.w * 176) / 144), p.w); }
    for (const f of w.faces ?? []) face(out, f);
    if (w.tag) { const [x, y, tw, th] = w.tag; paintPage(out, x - 1, y - 1, x + tw + 1, y + th + 1, (px, py) => [PAGE_GOLD, clamp01(0.5 - rrectSd(px, py, x, y, tw, th, th / 2))]); }
  }
  keys(out, r.keys);
  return out.rgba();
}

// The pairing screen's stage (station step 8-5, round 2; the accepted walk-4 picture 6): the two picks and the four example young STANDING (the game's signed per-coat stands, placed; a kind with no stand shows its
// face disc), a name pill under each parent, the gold "new to you" tags, where the young can land (a bar a blend with the green range and the parents' marks; a card a marking, the ones a young cannot wear dimmed, the
// parents' marks on the ones they wear, a gold "new" tag) and Pair them's key. The words come over it from the props. The art is the game's own, only placed; the pills, bars, cards and the key are interface drawn by code.
//   pairing: { size, stands: [{ id, x, y, w, h, disc, tag: [x, y, w, h] | null }], names: [[x, y, w, h, radius]], bars: [{ x, y, w, h, range: [x0, x1] | null, marks: [{ id, cx }], d }],
//              cards: [{ id, x, y, d, dim, marks: [id], tag: [x, y, w, h] | null, mark: d }], ok: [x, y, w, h] | null }
function standing(out, s) {
  if (s.disc) { face(out, { id: s.id, x: s.x + Math.round((s.w - s.h) / 2), y: s.y, d: s.h }); return; }
  const px = pixels(s.id);
  if (px) { paintPage(out, s.x + 6, s.y + s.h - 9, s.x + s.w - 6, s.y + s.h + 3, (x, y) => { const t = Math.hypot((x - (s.x + s.w / 2)) / (s.w * 0.4), (y - (s.y + s.h - 3)) / 6); return t < 1 ? [[0.03, 0.03, 0.04], 0.4 * (1 - t) * (1 - t)] : null; });   // a soft shadow under the feet
    sprite(out, px, s.sw ?? 96, s.sh ?? 88, s.x, s.y, s.w); }
}
function tag(out, [x, y, w, h]) { paintPage(out, x - 1, y - 1, x + w + 1, y + h + 1, (px, py) => [PAGE_GOLD, clamp01(0.5 - rrectSd(px, py, x, y, w, h, h / 2))]); }
export function pairingPicture(r) {
  const [W, H] = r.size, out = new Pane(W, H);
  backdrop(out, 300);
  paintPage(out, 0, 0, W, 76, (x, y) => [INK, 0.5 * (1 - y / 76)]);
  paintPage(out, 0, 200, W, H, (x, y) => [INK, clamp01((y - 200) / 40) * 0.97]);
  for (const s of r.stands) { standing(out, s); if (s.tag) tag(out, s.tag); }
  for (const n of r.names) pill(out, n);
  for (const n of r.plates ?? []) pill(out, n);   // the copies lines' own dark plate under each name
  for (const b of r.bars) {
    paintPage(out, b.x - 1, b.y - 1, b.x + b.w + 1, b.y + b.h + 1, (px, py) => [[1, 1, 1], 0.14 * clamp01(0.5 - rrectSd(px, py, b.x, b.y, b.w, b.h, b.h / 2))]);
    if (b.range) { const [x0, x1] = b.range; paintPage(out, x0 - 1, b.y - 1, x1 + 1, b.y + b.h + 1, (px, py) => [[0.45, 0.8, 0.5], 0.85 * clamp01(0.5 - rrectSd(px, py, x0, b.y, Math.max(2, x1 - x0), b.h, b.h / 2))]); }
    for (const m of b.marks) face(out, { id: m.id, x: Math.round(m.cx - b.d / 2), y: Math.round(b.y + b.h / 2 - b.d / 2), d: b.d });
  }
  for (const c of r.cards) {
    const dim = c.dim ? 0.35 : 1, x = c.x, y = c.y, d = c.d;
    paintPage(out, x - 1, y - 1, x + d + 1, y + d + 1, (px, py) => [[1, 1, 1], 0.12 * clamp01(0.5 - rrectSd(px, py, x, y, d, d, 8))]);
    if (!c.dim) ring(out, [x, y, d, d, 8], 2, [0.45, 0.8, 0.5]);
    // station step 8-7 (AD 14:48): the signed SQUARE page card her page uses (page-card-markings-<marking>-66x66: the square window of the lay master) fills the card inside a 2 lp rim, whole at full strength;
    // a marking the pair cannot give is marked as her page marks a look none of yours has: a dashed pale rim, the picture unchanged
    if (c.crop) { const i = d - 4, cr = cropOf(c.id, c.crop, i, i); if (cr) sprite(out, cr.rgba, i, i, x + 2, y + 2, i, { clip: (px, py) => clamp01(0.5 - rrectSd(px, py, x + 2, y + 2, i, i, 6)) }); }
    else { const px = pixels(c.id); if (px) sprite(out, px, 48, 48, x + Math.round((d - 40) / 2), y + Math.round((d - 40) / 2), 40, { clip: () => (c.dim ? 0.85 : 1) }); }
    if (c.dim) dashed(out, x, y, d, 2, 4, [0.85, 0.88, 0.95]);
    c.marks.forEach((id, i) => face(out, { id, x: x + d - 12 - i * 12, y: y - 7, d: c.mark }));
    if (c.tag) tag(out, c.tag);
  }
  keys(out, { pad: null, ok: r.ok });
  return out.rgba();
}

export function podPagePicture(r) {
  const [W, H] = r.size, out = new Pane(W, H);
  backdrop(out, r.shelfTop + 20);
  paintPage(out, 0, 0, W, 90, (x, y) => [INK, 0.5 * (1 - y / 90)]);
  { const bw = W, k = bw / 672, top = r.shelfTop - 30, px = pixels("cabinet-strip-672x228");   // the wooden board across, under the pod, fading into the ink below
    if (px) sprite(out, px, 672, 228, 0, top, bw, { clip: (X, Y) => clamp01(Math.min(Y - top + 1, 1)) }); else paintPage(out, 0, top, W, top + 60, () => [[0.52, 0.32, 0.2], 1]);
    paintPage(out, 0, r.shelfTop + 36, W, H, (x, y) => [INK, clamp01((y - (r.shelfTop + 36)) / 34) * 0.98]); void k; }
  { const px = pixels(r.pod.id); if (px) { const w = r.pod.w, h = Math.round((w * 176) / 144);
    paintPage(out, r.pod.cx - w * 0.6, r.pod.foot - 10, r.pod.cx + w * 0.6, r.pod.foot + 16, (x, y) => { const t = Math.hypot((x - r.pod.cx) / (w * 0.6), (y - (r.pod.foot + 3)) / 12); return t < 1 ? [[0.05, 0.03, 0.02], 0.45 * (1 - t) * (1 - t)] : null; });   // its soft shadow on the board
    sprite(out, px, 144, 176, Math.round(r.pod.cx - w / 2), r.pod.foot - h, w); } }
  if (r.alike) pill(out, r.alike);
  pill(out, r.pill);
  for (const f of r.faces ?? []) face(out, f);
  if (r.ring) ring(out, r.ring, 2.5);
  keys(out, { pad: null, ok: r.ok });
  if (r.letgo) { const [x, y, w, h, rad] = r.letgo; paintPage(out, x - 1, y - 1, x + w + 1, y + h + 1, (px, py) => [[1, 1, 1], 0.07 * clamp01(0.5 - rrectSd(px, py, x, y, w, h, rad))]); if (r.letgoRing) ring(out, r.letgo, 2); }
  return out.rgba();
}
