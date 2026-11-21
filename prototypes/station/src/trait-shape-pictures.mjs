// The picture of a trait's shape (trait-shapes.mjs's model), composed in the logic process once by id and sent to the face as one picture (the face never blends or scales): UI chrome drawn by code, as the
// rules allow (bars, marks, stretches, cards and their rims); no text and no art in it. The words (the trait, the end looks, the card looks) are the face's: it places them from the same LAYOUT, which is
// also `pods.json` regions.read.right.shapes (tests/trait-shapes.test.mjs holds the two equal); the props carry only what the words say. Three sizes: large (the trait's own page), small (a chapter's
// rows), tiny (the board's row).
//   scale  one track (the kind's own range; coloured end to end when `opts.colours` says so), a gold mark where she is, two blue marks above it for the copies she carries, a small pale dot below for each
//          of the player's other mibis, a wide dashed stretch for "roughly known". The pictured ends and middle are art slots: none is drawn here (`slotsOf`), and the report lists them.
//   set    separate cards, one a look: the look she shows gold, the one she hides a dashed blue rim, a look none of the player's has a dashed pale rim; a dot a mibi of the player's that shows or carries it.
// Pure: the same model, size and colours give the same bytes.
export const SIZES = { large: [318, 112], pictured: [318, 140], small: [318, 66], tiny: [318, 38] };
// "pictured" is the large size of a trait that has crops of signed art (trait-crops.mjs): a scale gets its three end pictures between the bar and the words, a set its picture in each card.
// Where things stand in each size (px in the picture): the margin, the baselines of the words, the track, the cards. The small cards and the tiny squares are the bigger ones of build 2 (phone size: the 1 px rims
// and 12 px squares barely read).
export const LAYOUT = {
  margin: 8,
  scale: { large: { nameY: 18, barY: 44, barH: 16, endsY: 100, dotsDy: 9 }, pictured: { nameY: 16, barY: 28, barH: 14, endsY: 134, dotsDy: 9, picY: 58, pic: 52 }, small: { nameY: 16, barY: 30, barH: 10, endsY: 62, dotsDy: 7 }, tiny: { nameY: 14, barY: 22, barH: 6, endsY: 0, dotsDy: 7 } },
  set: { large: { nameY: 18, top: 28, gap: 6, cardH: 34, labelDy: 22 }, pictured: { nameY: 16, top: 24, gap: 6, cardH: 54, labelDy: 50, picH: 32 }, small: { nameY: 16, top: 24, gap: 5, cardH: 26, labelY: 64 }, tiny: { nameY: 14, top: 19, gap: 6, cardH: 18, cardW: 26 } },
};
const GOLD = [240, 192, 96], BLUE = [104, 168, 240], PALE = [214, 222, 230], TRACK = [58, 72, 84], CARD = [36, 48, 56], DARK = [20, 28, 34];
const M = LAYOUT.margin;

function canvas(w, h) {
  const px = new Uint8ClampedArray(w * h * 4);
  const put = (x, y, c, a = 1) => { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= w || y >= h || a <= 0) return; const i = (y * w + x) * 4, ao = a + (px[i + 3] / 255) * (1 - a); for (let k = 0; k < 3; k++) px[i + k] = ao > 0 ? (a * c[k] + (px[i + 3] / 255) * px[i + k] * (1 - a)) / ao : 0; px[i + 3] = Math.round(ao * 255); };
  const rect = (x, y, rw, rh, c, a = 1) => { for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) put(x + i, y + j, c, a); };
  const blit = (img, x, y) => { for (let j = 0; j < img.h; j++) for (let i = 0; i < img.w; i++) { const k = (j * img.w + i) * 4, a = img.rgba[k + 3]; if (a) put(x + i, y + j, [img.rgba[k], img.rgba[k + 1], img.rgba[k + 2]], a / 255); } };
  const frame = (x, y, rw, rh, t, c, dash = 0) => {   // a rim t px thick, dashed (dash px on, dash px off) when dash > 0
    const on = (n) => !dash || Math.floor(n / dash) % 2 === 0;
    for (let i = 0; i < rw; i++) for (let k = 0; k < t; k++) { if (on(i)) { put(x + i, y + k, c); put(x + i, y + rh - 1 - k, c); } }
    for (let j = 0; j < rh; j++) for (let k = 0; k < t; k++) { if (on(j)) { put(x + k, y + j, c); put(x + rw - 1 - k, y + j, c); } }
  };
  const disc = (cx, cy, r, c) => { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r + r * 0.4) put(cx + i, cy + j, c); };
  return { px, put, rect, frame, disc, blit };
}
const lerp = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

// A set's cards in a size: the geometry the face's words follow (large: a grid of up to three a row; small: one row; tiny: one row of squares).
export function cardsOf(n, size) {
  const [w] = SIZES[size], L = LAYOUT.set[size];
  if (size === "large" || size === "pictured") { const cols = n <= 3 ? Math.max(1, n) : Math.ceil(n / 2), cw = Math.floor((w - 2 * M - L.gap * (cols - 1)) / cols);
    return Array.from({ length: n }, (_, i) => ({ x: M + (i % cols) * (cw + L.gap), y: L.top + Math.floor(i / cols) * (L.cardH + L.gap), w: cw, h: L.cardH })); }
  const cw = size === "small" ? Math.floor((w - 2 * M - L.gap * (n - 1)) / n) : L.cardW;
  return Array.from({ length: n }, (_, i) => ({ x: M + i * (cw + L.gap), y: L.top, w: cw, h: L.cardH }));
}
// The art slots a model leaves empty (the pictured ends and middle of a scale, one picture a look of a set): named for the report, never drawn.
// The size of the pictures a model's crops are placed at: { w, h } of each end picture of a scale, of each card's picture of a set (small cards: the card less its rim); null where a size has no pictures.
export function picSizeOf(model, size) {
  if (model.shape === "scale") return size === "pictured" ? { w: LAYOUT.scale.pictured.pic, h: LAYOUT.scale.pictured.pic } : null;
  if (size !== "pictured" && size !== "small") return null;
  const c = cardsOf(model.looks.length, size)[0]; return size === "pictured" ? { w: c.w - 4, h: LAYOUT.set.pictured.picH } : { w: c.w - 4, h: c.h - 4 };
}
export const slotsOf = (model, size) => size !== "large" ? [] : model.shape === "scale" ?["trait-end-low:" + model.id, "trait-end-mid:" + model.id, "trait-end-high:" + model.id] : model.looks.map((l) => "trait-card:" + model.id + ":" + l.look);

// opts: { colours: [[r,g,b] at the low end, [r,g,b] at the high end] } for a coloured track
export function shapePicture(model, size, opts = {}) {
  const [w, h] = SIZES[size], c = canvas(w, h);
  if (model.shape === "scale") {
    const L = LAYOUT.scale[size], by = L.barY, bh = L.barH, dots = by + bh + L.dotsDy, x0 = M + 3, x1 = w - M - 3, X = (t) => Math.round(x0 + t * (x1 - x0)), ends = opts.colours;
    for (let x = x0; x <= x1; x++) { const col = ends ? lerp(ends[0], ends[1], (x - x0) / (x1 - x0)) : TRACK; for (let y = 0; y < bh; y++) c.put(x, by + y, col); }
    c.frame(x0 - 1, by - 1, x1 - x0 + 3, bh + 2, 1, DARK);
    if (model.rough) { const a = X(model.rough[0]), b = X(model.rough[1]); c.rect(a, by - 2, b - a + 1, bh + 4, PALE, 0.22); c.frame(a, by - 2, b - a + 1, bh + 4, 1, PALE, 3); }
    const big = size === "large" || size === "pictured";
    for (const o of model.others) c.disc(X(o), dots, big ? 3 : 2, PALE);
    if (model.copies) {
      const bw = big ? 4 : size === "small" ? 3 : 2, bl = big ? 8 : size === "small" ? 6 : 4;
      for (const k of model.copies) { const x = X(k); c.rect(x - (bw >> 1), by - bl, bw, bl, BLUE); }
    }
    if (model.shows != null) { const gw = big ? 6 : size === "small" ? 4 : 3, ex = big ? 5 : 3, x = X(model.shows); c.rect(x - (gw >> 1), by - ex, gw, bh + 2 * ex, GOLD); c.frame(x - (gw >> 1) - 1, by - ex - 1, gw + 2, bh + 2 * ex + 2, 1, DARK); }
    if (size === "pictured" && opts.pics?.ends) {   // the crops of the signed coat at the low end, the middle and the high end of the kind's range, under the bar
      const n = L.pic, xs = [M, Math.round((w - n) / 2), w - M - n];
      opts.pics.ends.forEach((img, i) => { if (img) { c.rect(xs[i] - 1, L.picY - 1, n + 2, n + 2, DARK); c.blit(img, xs[i], L.picY); } });
    }
  } else {
    const cards = cardsOf(model.looks.length, size), tiny = size === "tiny", pics = opts.pics?.cards;
    model.looks.forEach((l, i) => {
      const r = cards[i], pic = pics?.[l.look];
      c.rect(r.x, r.y, r.w, r.h, l.shows ? lerp(CARD, GOLD, tiny ? 0.5 : 0.28) : CARD);
      if (pic) c.blit(pic, r.x + 2, r.y + 2);   // a card's picture, the rim drawn over its edge
      if (l.shows) c.frame(r.x, r.y, r.w, r.h, 2, GOLD);
      else if (l.hidden) c.frame(r.x, r.y, r.w, r.h, 2, BLUE, tiny ? 3 : 4);
      else if (l.none) c.frame(r.x, r.y, r.w, r.h, 2, PALE, 3);
      else c.frame(r.x, r.y, r.w, r.h, 1, TRACK);
      if (!tiny) for (let k = 0; k < Math.min(3, l.others); k++) c.disc(r.x + 6 + k * 7, r.y + r.h - 5, 2, PALE);
    });
  }
  return { w, h, rgba: c.px };
}
