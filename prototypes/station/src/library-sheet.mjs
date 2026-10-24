// The Library's Level 2 sheet generator, in the logic process: one generated picture per species and state (the form, the chapter plates, the colours found and every look), the lit variant of one chapter,
// that chapter's page, and a found look's 16 px disc; with each picture the layout facts the face needs to place its targets and glints. Built on specimen.mjs's exports (model, layout, drawForm, finish,
// lookColours, pictogram), whose drawing and RECIPE stay as they are: Home's panel and Level 1's cells are not touched. The pictures are drawn on paint2d.mjs (a pure-JavaScript Canvas 2D subset on a
// Float32Array, no canvas of the page) and on plain RGBA bytes; the type is printed from the glyph tables baked from Inter Regular-tnum and Medium-tnum (ui/fonts/inter/glyphs, bake-glyphs.mjs), painted, never face strings.
// Every number of the layout is library.json's l2 (the face reads the same numbers). Coordinates inside the sheet are the screen's, as l2 writes them; the facts a picture returns are in its own coordinates.
import { createCanvas } from "./paint2d.mjs";
import { model, layout, drawForm, finish, lookColours, pictogram } from "./specimen.mjs";
import { RGB, C } from "./pixels.mjs";
import { canLight } from "./views/requests.mjs";
import LIB from "../../ui/specs/station/library.json" with { type: "json" };
import REG12 from "../../ui/fonts/inter/glyphs/inter-regular-12.json" with { type: "json" };
import REG14 from "../../ui/fonts/inter/glyphs/inter-regular-14.json" with { type: "json" };
import MED12 from "../../ui/fonts/inter/glyphs/inter-medium-12.json" with { type: "json" };
import MED14 from "../../ui/fonts/inter/glyphs/inter-medium-14.json" with { type: "json" };

export const L2 = LIB.l2;
const SH = L2.sheet, PL = SH.plates, PG = L2.page, EV = SH.every, CO = SH.colours;
const [SX, SY, SW, SHH] = SH.rect, [PX, PY, PW, PH] = PG.rect;
const T = (n) => RGB[C[n]];
const TOK = { libGround: T("libGround"), libPanel: T("libPanel"), libHead: T("libHead"), libWell: T("libWell"), bone: T("bone"), fog: T("fog"), frostS: T("frostS"), ink: T("ink") };
const hex = (c) => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const TAU = Math.PI * 2;

// ---- the form: its centre, ruler, ticks, dots and the per-species scale ----
export const FORM = { cx: 348, cy: 286, ruler: 156, tick: 160, dot: 164, keep: 168, max: 0.94, reach: 152, nodeR: 5.5, ss: 2 };
// The finish of the sheet's form: the approved Loika sheet's numbers (grain 4, vignette 0.22 over the 1024 x 600 screen, bloom 0.8; the met pencil study takes no bloom and no halation). It adds the form's light to the ground; the ground itself passes through (formOnGround).
export const FINISH = { grain: 4, vignette: 0.22, bloom: 0.8, screen: [1024, 600] };
const LEGACY = (sid) => (sid === "S01" ? { markings: ["plain"] } : {});   // specimen.mjs model's legacy looks: shown once found, never a slot

// A frame with its sealed flags set to the chapters still shut (the found looks never hold a shut chapter's).
const withShut = (frame, shut = []) => ({ ...frame, chapters: frame.chapters.map((ch) => ({ ...ch, sealed: shut.includes(ch.id) })) });
const allFound = (frame) => { const st = {}; for (const ch of frame.chapters) for (const t of ch.traits) st[t.id] = [...t.looks]; return { [frame.species.id]: st }; };

// S_form, a fact of the species: min(0.94, floor(1000 * 152 / N) / 1000), N the farthest node edge in form units with every look found (legacy looks included, sealed chapters opened).
export function formScale(frame) {
  const m = layout(model(withShut(frame), allFound(frame))); let n = 0;
  for (const ch of m.chapters) { const K = m.body.twist * ch.side;
    for (const t of ch.traits) for (const s of t.slots) { const a = s.ang + K * s.r; n = Math.max(n, Math.hypot(ch.root[0] + s.r * Math.cos(a), ch.root[1] + s.r * Math.sin(a)) + Math.min(FORM.nodeR, 0.48 * s.pitch * s.r)); } }
  return Math.min(FORM.max, Math.floor(1000 * FORM.reach / n) / 1000);
}

// ---- type: the baked glyph tables ----
const FONTS = { "regular-12": REG12, "regular-14": REG14, "medium-12": MED12, "medium-14": MED14 };
const GLYPHS = new Map();
function glyphOf(font, code) {
  const key = font.font + font.size + ":" + code; let g = GLYPHS.get(key);
  if (!g) { const e = font.glyphs[code] ?? font.glyphs[63]; const bits = Uint8Array.from(atob(e[5]), (c) => c.charCodeAt(0)); g = { adv: e[0], x: e[1], y: e[2], w: e[3], h: e[4], bits }; GLYPHS.set(key, g); }
  return g;
}
// The pen steps of a string in whole pixels: (advance + kerning to the next glyph + 8) >> 4 for each glyph, as LVGL draws a font of this converter.
function steps(font, s) {
  const cps = [...s].map((c) => c.codePointAt(0));
  return cps.map((c, i) => (glyphOf(font, c).adv + (i + 1 < cps.length ? font.kern[c]?.[cps[i + 1]] ?? 0 : 0) + 8) >> 4);
}
export const textWidth = (fontId, s) => steps(FONTS[fontId], s).reduce((a, b) => a + b, 0);
// Words joined by `join`, broken only between words, each line within `room`.
export function wrapJoined(fontId, words, room, join = " · ") {
  const lines = []; let cur = [];
  for (const w of words) { const t = [...cur, w].join(join); if (cur.length && textWidth(fontId, t) > room) { lines.push(cur.join(join)); cur = [w]; } else cur.push(w); }
  if (cur.length) lines.push(cur.join(join)); return lines;
}
// Prints a string on RGBA bytes (w wide) with its baseline at y: each glyph's coverage blends the ink over the pixel beneath, out = round(under + (ink - under) * a / 255).
function print(px, w, h, s, x, y, fontId, ink) {
  const font = FONTS[fontId], cps = [...s].map((c) => c.codePointAt(0)), st = steps(font, s); let pen = Math.round(x);
  cps.forEach((c, i) => {
    const g = glyphOf(font, c), top = y - (g.y + g.h), left = pen + g.x;
    for (let j = 0; j < g.h; j++) { const yy = top + j; if (yy < 0 || yy >= h) continue;
      for (let k = 0; k < g.w; k++) { const a = g.bits[j * g.w + k], xx = left + k; if (!a || xx < 0 || xx >= w) continue; const o = (yy * w + xx) * 4;
        for (let q = 0; q < 3; q++) px[o + q] = Math.round(px[o + q] + (ink[q] - px[o + q]) * a / 255); } }
    pen += st[i];
  });
}
// The 30 % of a non-lit chapter's content on a flat surface, pre-mixed and opaque: round(0.3 * ink + 0.7 * surface).
const premix = (ink, surface, k) => (k === 1 ? ink : ink.map((v, i) => Math.round(k * v + (1 - k) * surface[i])));

// ---- surfaces: kit_bezel pixels (prim/ring.c ring_in_round), radius 6, libPanel, the libHead band on rows 1..b and one libWell rule row at b + 1 ----
export function ringInRound(X, Y, x0, y0, x1, y1, r) {
  const R = 2 * r; if (X < 2 * x0 || Y < 2 * y0 || X > 2 * x1 || Y > 2 * y1) return false;
  const cx = X < 2 * x0 + R ? 2 * x0 + R : X > 2 * x1 - R ? 2 * x1 - R : X, cy = Y < 2 * y0 + R ? 2 * y0 + R : Y > 2 * y1 - R ? 2 * y1 - R : Y;
  return (X - cx) ** 2 + (Y - cy) ** 2 <= R * R;
}
function bezel(px, pw, ph, x, y, w, h, b) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const X = 2 * i + 1, Y = 2 * j + 1; if (!ringInRound(X, Y, 0, 0, w, h, 6)) continue;
    const inner = ringInRound(X, Y, 1, 1, w - 1, h - 1, 5), c = inner && j >= 1 && j <= b ? TOK.libHead : inner && j === b + 1 ? TOK.libWell : TOK.libPanel;
    const xx = x + i, yy = y + j; if (xx < 0 || yy < 0 || xx >= pw || yy >= ph) continue; const o = (yy * pw + xx) * 4; px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = 255;
  }
}
const setPx = (px, w, x, y, c) => { const o = (y * w + x) * 4; px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = 255; };
const getPx = (px, w, x, y) => { const o = (y * w + x) * 4; return [px[o], px[o + 1], px[o + 2]]; };
const over = (under, ink, a) => under.map((v, i) => v + (ink[i] - v) * a);   // straight "source-over" of an ink at alpha a, unrounded

// ---- the comma form: a two-colour look prints "a, b" (genome.mjs pairSep); any other look, "and" included, verbatim ----
export function printed(trait, look) { const parts = look.split(" and "); return parts.length === 2 && lookColours(trait, look, 0).length === 2 ? parts.join(", ") : look; }

// ---- the facts of a species: plates, leaders, the mosaic's tier and cells ----
const wrapA = (a) => ((a + Math.PI) % TAU + TAU) % TAU - Math.PI;
// The plates in frame order: { ch, i, slot, side, x, y, w, h, ax, ay } (screen); a plate's rect is a fact of the species.
export function platesOf(m) {
  const n = m.chapters.length, slots = PL.slots[String(n)]; if (!slots) throw new Error(`library.json l2.sheet.plates.slots has no table for ${n} chapters`);
  const nl = slots.filter((s) => s[0] === "L").length, nr = n - nl, [w, h] = PL.size;
  return m.chapters.map((ch, i) => { const s = slots[i], side = s[0], k = +s.slice(1) - 1, y = PL.tops[String(side === "L" ? nl : nr)][k], x = PL.x[side];
    const an = PL.anchor[side]; return { ch, i, slot: s, side, x, y, w, h, ax: x + an[0], ay: y + an[1] }; });
}
// The leader of a plate: the dot on radius 164 and the orthogonal route to the plate's anchor (I straight, L, Z).
export function leaderOf(m, p) {
  const { cx: CX, cy: CY, dot: R, keep } = FORM, ch = p.ch, mu = ch.mid, h = (ch.a1 - ch.a0) / 2, sgn = p.side === "L" ? -1 : 1;
  if (Math.abs(p.ay - CY) <= R) {
    const s = Math.asin((p.ay - CY) / R), phi = sgn < 0 ? Math.PI - s : s;
    if (Math.abs(wrapA(phi - mu)) <= 0.75 * h) { const xd = Math.round(CX + R * Math.cos(phi)); return { kind: "I", phi, dot: [xd, p.ay], pts: [[xd, p.ay], [p.ax, p.ay]] }; }
  }
  const al = Math.atan2(p.ay - CY, p.ax - CX), phi = mu + Math.max(-h / 2, Math.min(h / 2, wrapA(al - mu)));
  const xd = Math.round(CX + R * Math.cos(phi)), yd = Math.round(CY + R * Math.sin(phi));
  if ((p.ay - yd) * (yd - CY) > 0) return { kind: "L", phi, dot: [xd, yd], pts: [[xd, yd], [xd, p.ay], [p.ax, p.ay]] };
  const xe = CX + sgn * Math.ceil(Math.sqrt(Math.max(0, keep * keep - (p.ay - CY) ** 2)));
  return { kind: "Z", phi, dot: [xd, yd], pts: [[xd, yd], [xe, yd], [xe, p.ay], [p.ax, p.ay]] };
}
// The pixels of an orthogonal route on pixel centres with square caps: every pixel from each point to the next, inclusive, once.
export function routePixels(pts) {
  const seen = new Set(), out = [];
  for (let i = 0; i + 1 < pts.length; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let k = 0; k <= n; k++) { const x = x0 + Math.sign(x1 - x0) * k, y = y0 + Math.sign(y1 - y0) * k, key = x + "," + y; if (!seen.has(key)) { seen.add(key); out.push([x, y]); } } }
  return out;
}
// The tier of a species (slot looks only, never the state): the first tier whose rows hold every trait group, a group never split across rows.
function placeGroups(groups, tier) {
  let row = 0, x = EV.x0; const at = [];
  for (const n of groups) { const wdt = (n - 1) * tier.pitch + tier.cell; if (x + wdt > EV.xMax) { row++; x = EV.x0; } if (row >= tier.rows.length) return null; at.push({ x, row }); x += n * tier.pitch + EV.traitGap; }
  return { at, rows: row + 1, next: { x, row } };
}
export function tierOf(frame) {
  const lg = LEGACY(frame.species.id), groups = frame.chapters.flatMap((ch) => ch.traits.map((t) => t.looks.filter((l) => !(lg[t.id] || []).includes(l)).length));
  for (const tier of EV.tiers) { const p = placeGroups(groups, tier); if (p) return { ...tier, rowsUsed: p.rows }; }
  throw new Error(`${frame.species.id}: no tier of library.json l2.sheet.every holds every trait group`);
}
// The mosaic cells of a model at a tier, in frame order, found first within a trait: { ch, t, s, x, y, legacy }; a found legacy look is its own trailing group after the last trait group.
function mosaicOf(m, tier) {
  const lg = LEGACY(m.sid), groups = [], extra = [];
  for (const ch of m.chapters) for (const t of ch.traits) { const own = t.slots.filter((s) => !(s.found && (lg[t.id] || []).includes(s.look))); groups.push({ ch, t, own }); for (const s of t.slots) if (s.found && (lg[t.id] || []).includes(s.look)) extra.push({ ch, t, s }); }
  const p = placeGroups(groups.map((g) => g.own.length), tier), cells = [];
  groups.forEach((g, i) => g.own.forEach((s, k) => cells.push({ ch: g.ch, t: g.t, s, x: p.at[i].x + k * tier.pitch, y: tier.rows[p.at[i].row], legacy: false })));
  if (extra.length) { let { x, row } = p.next; const wdt = (extra.length - 1) * tier.pitch + tier.cell; if (x + wdt > EV.xMax) { row++; x = EV.x0; }
    extra.forEach((e, k) => cells.push({ ...e, x: x + k * tier.pitch, y: tier.rows[row], legacy: true })); }
  return cells;
}

// ---- the input: what a sheet is made from ----
// input: { species, mode: "found" | "met", found: { <trait>: [looks, in the order found] }, shut: [chapter ids still shut], fresh: ["<trait>|<look>", ...] (new this visit: the glints), readOnce, sealedOpen }
const SPECIES = new Map();
export function speciesFacts(frame) {
  const id = frame.species.id; let f = SPECIES.get(id);
  if (!f) { const m = layout(model(withShut(frame), {})); f = { sForm: formScale(frame), tier: tierOf(frame), plates: platesOf(m).map((p) => ({ chapter: p.ch.id, slot: p.slot, rect: [p.x, p.y, p.w, p.h] })) }; SPECIES.set(id, f); }
  return f;
}
const colourTrait = (m) => { for (const ch of m.chapters) for (const t of ch.traits) if (t.id === "colour") return { ch, t }; return null; };
// The picture ids and the lit rule are the requests' (views/requests.mjs), made from these species facts.
export { canLight };
function modelOf(frame, input) {
  const sid = frame.species.id;
  return layout(model(withShut(frame, input.mode === "met" ? [] : input.shut), input.mode === "met" ? {} : { [sid]: input.found }));
}
// The layout facts of a sheet (picture coordinates), with no render: { plates: { <chapter>: rect }, glints: [[x, y], ...] (at most 8), tier, sForm, colours: "none" | "named" | "chips", page (with lit) }.
export function sheetFacts(frame, input, lit = null) {
  const f = speciesFacts(frame), m = modelOf(frame, input), cells = mosaicOf(m, f.tier), cell = f.tier.cell, fresh = new Set(input.mode === "met" ? [] : input.fresh ?? []);
  const plates = {}; for (const p of f.plates) plates[p.chapter] = [p.rect[0] - SX, p.rect[1] - SY, p.rect[2], p.rect[3]];
  const rank = (c) => { const ci = frame.chapters.findIndex((ch) => ch.id === c.ch.id), ch = frame.chapters[ci], ti = ch.traits.findIndex((t) => t.id === c.t.id); return [ci, ti, ch.traits[ti].looks.indexOf(c.s.look)]; };
  const glints = cells.filter((c) => c.s.found && fresh.has(`${c.t.id}|${c.s.look}`)).sort((a, b) => { const A = rank(a), B = rank(b); return A[0] - B[0] || A[1] - B[1] || A[2] - B[2]; }).slice(0, 8).map((c) => [c.x + cell - SX, c.y - SY]);
  const ct = input.mode === "met" ? null : colourTrait(m), n = ct ? ct.t.slots.filter((s) => s.found).length : 0;
  const out = { plates, glints, tier: f.tier.id, sForm: f.sForm, colours: n === 0 ? "none" : n <= CO.named.upTo ? "named" : "chips" };
  if (lit) { if (!canLight(input, lit)) throw new Error(`${frame.species.id}: chapter ${lit} cannot be lit (shut, or a met sheet)`); out.page = pagePlan(m, lit).facts; }
  return out;
}

// ---- the sheet picture ----
// The ground under the sheet: the ground master's pixels for the rect (library-ground-1024x522, placed at the stage's [0, 40]), or flat libGround while it is not placed. ground: { w, h, rgba } or null.
function groundAt(ground, x, y) { if (!ground) return TOK.libGround; const o = ((y - 40) * ground.w + x) * 4; return [ground.rgba[o], ground.rgba[o + 1], ground.rgba[o + 2]]; }

// The form on the ground (picture pixels, 664 x 522, opaque): out = G + F(bg + light) - F(bg), each F reduced 2 x 2 and rounded, clamped; F is specimen.mjs finish over the 1024 x 600 screen at 2x (bg libGround, the FINISH
// numbers), G the ground's own pixels (groundAt). Where the form's light does not reach, F(bg + light) = F(bg) and the pixel is G exactly: the ground is never toned, vignetted or grained here (the master carries its own).
// The paper and the vignette are fixed functions of position, so F(bg) and the finish's noise are made once per process; F(bg + light) is made only on a crop, the light's box plus CROP_PAD at 2x (more than the widest blur's
// reach, its reduction blocks and its enlargement) on the reduction grid, clipped to the sheet: outside it the light and every blur of it are exactly 0. `full` makes F(bg + light) over the whole screen with finish itself (the reference).
export const CROP_PAD = 176;
let PAPER = null;
function paper() {
  if (PAPER) return PAPER;
  const t0 = performance.now(), ss = FORM.ss, W = FINISH.screen[0] * ss, H = FINISH.screen[1] * ss, out = createCanvas(W, H); let probe = null;
  finish(out, createCanvas(W, H), { bg: TOK.libGround, grain: FINISH.grain, vignette: FINISH.vignette, bloom: FINISH.bloom, probe: (p) => { probe = { md: p.md, seed: p.seed }; } });
  const big = out.getContext("2d").getImageData(0, 0, W, H).data, base = reduceRect(big, W), x0 = SX * ss, y0 = SY * ss, w = SW * ss, h = SHH * ss, NZ = new Float64Array(w * h);
  let sd = probe.seed; const rnd = () => ((sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296);   // the finish's own noise, in its order
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const n = (rnd() + rnd() - 1) * FINISH.grain + (probe.md[(y * W + x) * 4] - 128) * 0.09; if (x >= x0 && x < x0 + w && y >= y0 && y < y0 + h) NZ[(y - y0) * w + x - x0] = n; }
  PAPER = { base, NZ, ms: performance.now() - t0 }; return PAPER;
}
export const paperMs = () => paper().ms;
// The sheet rect of a 2x screen picture, reduced 2 x 2 and rounded: RGB bytes, 664 x 522.
function reduceRect(big, W, ss = FORM.ss) {
  const out = new Uint8Array(SW * SHH * 3);
  for (let y = 0; y < SHH; y++) for (let x = 0; x < SW; x++) for (let c = 0; c < 3; c++) { let t = 0; for (let j = 0; j < ss; j++) for (let i = 0; i < ss; i++) t += big[(((SY + y) * ss + j) * W + (SX + x) * ss + i) * 4 + c]; out[(y * SW + x) * 3 + c] = Math.round(t / (ss * ss)); }
  return out;
}
function formOnGround(m, sForm, met, lit, ground, { full = false } = {}) {
  const ss = FORM.ss, W = FINISH.screen[0] * ss, H = FINISH.screen[1] * ss, P = paper(), bloom = met ? 0 : FINISH.bloom;
  const light = createCanvas(W, H);
  drawForm(light.getContext("2d"), { cx: FORM.cx * ss, cy: FORM.cy * ss, s: sForm * ss, lw: FORM.max * ss }, m, { nodeR: FORM.nodeR, lit, pencil: met });
  let lifted;   // F(bg + light), reduced, over the sheet rect; null where it equals F(bg)
  if (full) { const out = createCanvas(W, H); finish(out, light, { bg: TOK.libGround, grain: FINISH.grain, vignette: FINISH.vignette, bloom }); lifted = { rgb: reduceRect(out.getContext("2d").getImageData(0, 0, W, H).data, W), x0: 0, y0: 0, x1: SW, y1: SHH, w: SW }; }
  else lifted = cropFinish(light, W, H, bloom, P);
  const px = new Uint8ClampedArray(SW * SHH * 4);
  for (let y = 0; y < SHH; y++) for (let x = 0; x < SW; x++) { const o = (y * SW + x) * 4, g = groundAt(ground, SX + x, SY + y), inC = lifted && x >= lifted.x0 && x < lifted.x1 && y >= lifted.y0 && y < lifted.y1;
    for (let c = 0; c < 3; c++) px[o + c] = inC ? g[c] + lifted.rgb[((y - lifted.y0) * lifted.w + x - lifted.x0) * 3 + c] - P.base[(y * SW + x) * 3 + c] : g[c];
    px[o + 3] = 255; }
  return { px, reach: lifted?.reach ?? null };
}
// The finish of the light on the crop only, byte for byte what finish gives there over the whole screen: the same composite and blurs (the blur radii from the screen's width), the same tone, vignette and noise.
function cropFinish(light, W, H, bloom, P) {
  const ss = FORM.ss, L = light.data, gx0 = SX * ss, gy0 = SY * ss, gx1 = (SX + SW) * ss, gy1 = (SY + SHH) * ss;
  let bx0 = W, by0 = H, bx1 = -1, by1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; if (L[i] || L[i + 1] || L[i + 2] || L[i + 3]) { if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; } }
  if (bx1 < 0) return null;
  // the crop on the screen's reduction grid (8 at 2x), clipped to the screen only, so its edges clamp where the screen's do
  const al = 8, X0 = Math.max(0, Math.floor((bx0 - CROP_PAD) / al) * al), Y0 = Math.max(0, Math.floor((by0 - CROP_PAD) / al) * al), X1 = Math.min(W, Math.ceil((bx1 + 1 + CROP_PAD) / al) * al), Y1 = Math.min(H, Math.ceil((by1 + 1 + CROP_PAD) / al) * al), cw = X1 - X0, ch = Y1 - Y0;
  const lc = createCanvas(cw, ch); for (let y = 0; y < ch; y++) lc.data.set(L.subarray(((Y0 + y) * W + X0) * 4, ((Y0 + y) * W + X1) * 4), y * cw * 4);
  const oc = createCanvas(cw, ch), o = oc.getContext("2d");
  o.fillStyle = `rgb(${TOK.libGround})`; o.fillRect(0, 0, cw, ch);   // finish's composite, at the screen's blur radii
  o.globalCompositeOperation = "lighter"; o.drawImage(lc, 0, 0, cw, ch);
  if (bloom) {   // at bloom 0 every bloom draw adds 0
    for (const [r, a] of [[1.2, 0.3], [4, 0.2], [12, 0.12]]) { o.filter = `blur(${r * W / 1024 * 2}px)`; o.globalAlpha = a * bloom; o.drawImage(lc, 0, 0, cw, ch); }
    o.filter = `blur(${10 * W / 1024 * 2}px) sepia(1) saturate(3) hue-rotate(-25deg)`; o.globalAlpha = 0.1 * bloom; o.drawImage(lc, 0, 0, cw, ch);
  }
  o.filter = "none"; o.globalAlpha = 1; o.globalCompositeOperation = "source-over";
  const d = o.getImageData(0, 0, cw, ch).data, nw = SW * ss, vg = FINISH.vignette, bg = TOK.libGround;
  const tx0 = Math.max(X0, gx0), ty0 = Math.max(Y0, gy0), tx1 = Math.min(X1, gx1), ty1 = Math.min(Y1, gy1);   // the part on the sheet
  const reach = new Uint8Array(SW * SHH);   // the sheet pixels the light's composite reaches (the form, its bloom and halation), before the tone
  for (let Y = ty0; Y < ty1; Y++) for (let X = tx0; X < tx1; X++) { const i = ((Y - Y0) * cw + X - X0) * 4; if (d[i] !== bg[0] || d[i + 1] !== bg[1] || d[i + 2] !== bg[2]) reach[((Y - gy0) >> 1) * SW + ((X - gx0) >> 1)] = 1; }
  for (let Y = ty0; Y < ty1; Y++) for (let X = tx0; X < tx1; X++) {   // finish's print tone, vignette and noise at the screen position
    const i = ((Y - Y0) * cw + X - X0) * 4, dx = X / W - 0.5, dy = Y / H - 0.5, v = 1 - vg * (dx * dx + dy * dy) * 2, n = P.NZ[(Y - gy0) * nw + X - gx0];
    for (let c = 0; c < 3; c++) { let val = d[i + c] / 255; val = val / (1 + 0.25 * val) * 1.18; val = val * v; d[i + c] = Math.max(0, Math.min(255, val * 255 + n * (c === 2 ? 0.9 : 1))); }
  }
  const x0 = (tx0 - gx0) / ss, y0 = (ty0 - gy0) / ss, w = (tx1 - tx0) / ss, h = (ty1 - ty0) / ss, rgb = new Uint8Array(w * h * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 3; c++) { let t = 0; for (let j = 0; j < ss; j++) for (let i = 0; i < ss; i++) t += d[((ty0 - Y0 + y * ss + j) * cw + tx0 - X0 + x * ss + i) * 4 + c]; rgb[(y * w + x) * 3 + c] = Math.round(t / (ss * ss)); }
  return { rgb, x0, y0, x1: x0 + w, y1: y0 + h, w, reach };
}

// The sheet: { w: 664, h: 522, rgba, facts, ms }. input as above; lit: a chapter id for the lit variant, or null; ground: the ground master's pixels, or null; full: the form's finish over the whole screen (the reference
// the crop is proved against); layers: also { form (the form on the ground, before the surfaces), reach (the pixels the light's composite reaches) }, for the tests.
export function renderSheet(frame, input, { lit = null, ground = null, full = false, layers = false } = {}) {
  const t0 = performance.now(), met = input.mode === "met", f = speciesFacts(frame), m = modelOf(frame, input);
  if (lit && !canLight(input, lit)) throw new Error(`${frame.species.id}: chapter ${lit} cannot be lit (shut, or a met sheet)`);
  // 1-2. the ground and the form: the ground passes through as it is, and the finish adds only the form's light and its bloom
  const { px, reach } = formOnGround(m, f.sForm, met, lit, ground, { full }), layer = layers ? px.slice() : null;
  const dim = (id) => (lit && id !== lit ? 0.3 : 1);
  // 3. the surfaces
  const plates = platesOf(m), cells = mosaicOf(m, f.tier), ct = met ? null : colourTrait(m), colours = ct ? ct.t.slots.filter((s) => s.found) : [];
  for (const p of plates) bezel(px, SW, SHH, p.x - SX, p.y - SY, p.w, p.h, PL.head - 1);
  if (colours.length) bezel(px, SW, SHH, CO.rect[0] - SX, CO.rect[1] - SY, CO.rect[2], CO.rect[3], 21);
  bezel(px, SW, SHH, EV.rect[0] - SX, EV.rect[1] - SY, EV.rect[2], EV.rect[3], 21);
  // 4-5. the ruler arcs and ticks (0.6 px, bone 30 %), the leaders (1 px bone 42 %) and their dots (r 1.8, bone 90 %); a non-lit chapter's at alpha 0.3 over the ground
  const cv = createCanvas(SW, SHH), a = cv.getContext("2d"), img = a.createImageData(SW, SHH); img.data.set(px); a.putImageData(img, 0, 0);
  const ox = -SX, oy = -SY, { cx: CX, cy: CY } = FORM;
  a.lineWidth = 0.6;
  for (const ch of m.chapters) { a.globalAlpha = dim(ch.id); a.strokeStyle = rgba(TOK.bone, 0.3); a.beginPath();
    for (let i = 0; i <= 30; i++) { const an = ch.a0 + (ch.a1 - ch.a0) * i / 30, x = CX + FORM.ruler * Math.cos(an) + ox, y = CY + FORM.ruler * Math.sin(an) + oy; i ? a.lineTo(x, y) : a.moveTo(x, y); }
    a.stroke();
    for (const t of ch.traits) for (const s of t.slots) { a.beginPath(); a.moveTo(CX + FORM.ruler * Math.cos(s.ang) + ox, CY + FORM.ruler * Math.sin(s.ang) + oy); a.lineTo(CX + FORM.tick * Math.cos(s.ang) + ox, CY + FORM.tick * Math.sin(s.ang) + oy); a.stroke(); } }
  const routes = plates.map((p) => ({ p, ...leaderOf(m, p) }));
  for (const r of routes) { a.globalAlpha = dim(r.p.ch.id); a.fillStyle = rgba(TOK.bone, 0.42); for (const [x, y] of routePixels(r.pts)) a.fillRect(x + ox, y + oy, 1, 1);
    a.fillStyle = rgba(TOK.bone, 0.9); a.beginPath(); a.arc(r.dot[0] + 0.5 + ox, r.dot[1] + 0.5 + oy, 1.8, 0, TAU); a.fill(); }
  a.globalAlpha = 1;
  px.set(a.getImageData(0, 0, SW, SHH).data);
  // 6. type, mosaic cells and swatches
  for (const p of plates) { const ch = p.ch, k = dim(ch.id), x = p.x - SX, y = p.y - SY;
    print(px, SW, SHH, String(p.i + 1).padStart(2, "0"), x + PL.num.x, y + PL.num.baseline, "medium-14", premix(TOK.bone, TOK.libHead, k));
    if (met) continue;
    print(px, SW, SHH, ch.name, x + PL.name.x, y + PL.name.baseline, "medium-14", premix(TOK.bone, TOK.libHead, k));
    if (ch.sealed) { print(px, SW, SHH, "sealed", x + PL.shut.x, y + PL.shut.baseline, "regular-12", premix(TOK.fog, TOK.libPanel, k)); continue; }
    wrapJoined("regular-12", ch.traits.map((t) => t.name), PL.index.room, PL.index.join).slice(0, PL.index.lines).forEach((l, j) => print(px, SW, SHH, l, x + PL.index.x, y + PL.index.baselines[j], "regular-12", premix(TOK.fog, TOK.libPanel, k))); }
  if (colours.length) {
    const k = dim(ct.ch.id), named = colours.length <= CO.named.upTo;
    print(px, SW, SHH, `${ct.ch.name} colours found`, CO.rect[0] + 12 - SX, EV.title[1] - SY, "medium-12", premix(TOK.fog, TOK.libHead, k));   // the band's title dims with its chapter's content
    colours.forEach((s, j) => { const cols = lookColours(ct.t, s.look, s.idx).map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));
      const [w, h] = named ? [CO.named.size[0] - 1, CO.named.size[1] - 1] : [CO.chips.size[0] - 1, CO.chips.size[1] - 1];
      const x0 = named ? CO.named.x0 + CO.named.pitch * j : CO.chips.x0 + CO.chips.pitch * (j % CO.chips.perRow), y0 = named ? CO.named.y : CO.chips.rows[Math.floor(j / CO.chips.perRow)];
      const split = cols.length === 1 ? w : named ? w / 2 : 16;
      for (let yy = 0; yy <= h; yy++) for (let xx = 0; xx <= w; xx++) {
        const X = x0 + xx - SX, Y = y0 + yy - SY; let c = getPx(px, SW, X, Y);
        if (xx < w && yy < h) c = cols[xx < split ? 0 : cols.length - 1];
        if (xx === 0 || yy === 0 || xx === w || yy === h) c = over(c, TOK.bone, 0.35);
        setPx(px, SW, X, Y, premix(c.map((v) => Math.round(v)), TOK.libPanel, k).map(Math.round)); }
      if (named) printed(ct.t, s.look).split(", ").forEach((wd, q, all) => print(px, SW, SHH, wd + (q < all.length - 1 ? "," : ""), x0 - SX, CO.named.nameBaselines[q] - SY, "regular-12", premix(TOK.fog, TOK.libPanel, k)));
    });
  }
  print(px, SW, SHH, "Every look", EV.title[0] - SX, EV.title[1] - SY, "medium-12", TOK.fog);
  const cell = f.tier.cell, S = f.tier.id === "S";
  for (const c of cells) { const k = met ? 1 : dim(c.ch.id), x0 = c.x - SX, y0 = c.y - SY, found = c.s.found && !met;
    const cols = found ? lookColours(c.t, c.s.look, c.s.idx).map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))) : null;
    for (let yy = 0; yy < cell; yy++) for (let xx = 0; xx < cell; xx++) { let v;
      if (found) { if (cols.length === 1) v = cols[0]; else if (S) v = cols[xx < 6 ? 0 : 1]; else { const half = cell / 2, cov = Math.max(0, Math.min(1, half - xx)); v = cols[0].map((q, i) => q * cov + cols[1][i] * (1 - cov)); } }
      else { v = over(TOK.libPanel, [22, 17, 16], 0.95); if (xx === 0 || yy === 0 || xx === cell - 1 || yy === cell - 1) v = over(v, TOK.bone, 0.14); }
      setPx(px, SW, x0 + xx, y0 + yy, premix(v, TOK.libPanel, k).map(Math.round)); }
    if (found && lit === c.ch.id) for (let q = -2; q <= cell + 1; q++) { setPx(px, SW, x0 + q, y0 - 2, TOK.bone); setPx(px, SW, x0 + q, y0 + cell + 1, TOK.bone); setPx(px, SW, x0 - 2, y0 + q, TOK.bone); setPx(px, SW, x0 + cell + 1, y0 + q, TOK.bone); }
  }
  const facts = sheetFacts(frame, input, lit);
  return { w: SW, h: SHH, rgba: px, facts, ...(layers ? { layers: { form: layer, reach } } : {}), routes: routes.map((r) => ({ chapter: r.p.ch.id, slot: r.p.slot, kind: r.kind, dot: r.dot, pts: r.pts })), ms: performance.now() - t0 };
}

// ---- the chapter page ----
// The page's plan (page coordinates): the trait groups at g, their look-name lines, H, and the facts (disc boxes of the found looks by look.{trait}.{look}).
function pagePlan(m, chapterId) {
  const ch = m.chapters.find((c) => c.id === chapterId), T2 = PG.trait, groups = []; let g = T2.first;
  for (const t of ch.traits) { const found = t.slots.filter((s) => s.found).map((s) => printed(t, s.look)), lines = found.length ? wrapJoined("regular-12", found, T2.names.room) : [""];
    groups.push({ t, g, lines }); g += T2.pitch + T2.nameLine * (lines.length - 1); }
  const last = groups[groups.length - 1], H = last.g + T2.names.dy + T2.nameLine * (last.lines.length - 1) + PG.bottomPad, discs = {};
  for (const gr of groups) gr.t.slots.forEach((s, k) => { if (s.found) discs[`look.${gr.t.id}.${s.look}`] = [T2.x + T2.disc.pitch * k, gr.g + T2.disc.dy, T2.disc.size, T2.disc.size]; });
  return { ch, index: m.chapters.indexOf(ch), groups, H, facts: { height: H, discs } };
}
// A found look's disc on a context: a filled circle in lookColours (a pair in two halves, the first colour on the left), the pictogram at 0.9 R, 1 px, bone 95 % on a dark disc (channel sum < 330), else ink 90 %.
function lookDisc(a, t, s, cx, cy, R0) {
  const cols = lookColours(t, s.look, s.idx);
  if (cols.length === 2) { a.fillStyle = cols[0]; a.beginPath(); a.arc(cx, cy, R0, Math.PI / 2, Math.PI * 1.5); a.fill(); a.fillStyle = cols[1]; a.beginPath(); a.arc(cx, cy, R0, -Math.PI / 2, Math.PI / 2); a.fill(); }
  else { a.fillStyle = cols[0]; a.beginPath(); a.arc(cx, cy, R0, 0, TAU); a.fill(); }
  const dark = cols.length === 1 && [1, 3, 5].reduce((n, i) => n + parseInt(cols[0].slice(i, i + 2), 16), 0) < 330;
  pictogram(a, t, s.look, cx, cy, R0 * 0.9, dark ? rgba(TOK.bone, 0.95) : rgba(TOK.ink, 0.9), 1);
}
// The page of a lit chapter: { w: 308, h: 500, rgba, facts, ms }. Never for a shut chapter or a met sheet.
export function renderPage(frame, input, chapterId, { ground = null } = {}) {
  const t0 = performance.now(); if (!canLight(input, chapterId)) throw new Error(`${frame.species.id}: no page for chapter ${chapterId} (shut, or a met sheet)`);
  const m = modelOf(frame, input), plan = pagePlan(m, chapterId), px = new Uint8ClampedArray(PW * PH * 4), T2 = PG.trait;
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) setPx(px, PW, x, y, groundAt(ground, PX + x, PY + y));   // the ground master's pixels at (700 + x, 10 + y) of the master
  bezel(px, PW, PH, 0, 0, PW, plan.H, PG.head - 1);
  const cv = createCanvas(PW, PH), a = cv.getContext("2d"), img = a.createImageData(PW, PH); img.data.set(px); a.putImageData(img, 0, 0);
  const half = T2.disc.size / 2;
  for (const gr of plan.groups) gr.t.slots.forEach((s, k) => { const bx = T2.x + T2.disc.pitch * k, by = gr.g + T2.disc.dy;
    if (s.found) lookDisc(a, gr.t, s, bx + half, by + half, half); else { a.strokeStyle = hex(TOK.frostS); a.lineWidth = 1; a.beginPath(); a.arc(bx + half, by + half, 5, 0, TAU); a.stroke(); } });
  px.set(a.getImageData(0, 0, PW, PH).data);
  print(px, PW, PH, String(plan.index + 1).padStart(2, "0"), PG.num.x, PG.num.baseline, "medium-14", TOK.bone);
  print(px, PW, PH, plan.ch.name, PG.name.x, PG.name.baseline, "medium-14", TOK.bone);
  for (const gr of plan.groups) { print(px, PW, PH, gr.t.name, T2.x, gr.g, "medium-12", TOK.fog); gr.lines.forEach((l, j) => l && print(px, PW, PH, l, T2.x, gr.g + T2.names.dy + T2.nameLine * j, "regular-12", TOK.fog)); }
  return { w: PW, h: PH, rgba: px, facts: plan.facts, ms: performance.now() - t0 };
}

// ---- a found look's disc at 16 (the page disc at 16), for the Level 2 shelf's wish pieces: transparent outside the disc ----
export function renderDisc(frame, traitId, look) {
  const t0 = performance.now(), m = layout(model(withShut(frame), allFound(frame)));
  const t = m.chapters.flatMap((c) => c.traits).find((x) => x.id === traitId), s = t && t.slots.find((x) => x.found && x.look === look);
  if (!s) throw new Error(`${frame.species.id}: no look "${look}" in trait ${traitId}`);
  const cv = createCanvas(16, 16), a = cv.getContext("2d"); lookDisc(a, t, s, 8, 8, 8);
  return { w: 16, h: 16, rgba: a.getImageData(0, 0, 16, 16).data, ms: performance.now() - t0 };
}

// ---- the cache: the current sheet, one lit variant and one page; a newer request supersedes an older one ----
const KEPT = { sheet: null, lit: null, page: null };
let made = 0;
export const sheetRenders = () => made;
export const keptPictures = () => Object.fromEntries(Object.entries(KEPT).map(([k, v]) => [k, v ? v.id : null]));
export const keptBytes = (bpp = 2) => Object.values(KEPT).reduce((n, v) => n + (v ? v.pic.w * v.pic.h * bpp : 0), 0);   // at RGB565, 2 bytes a pixel
export const clearSheets = () => { KEPT.sheet = KEPT.lit = KEPT.page = null; };
// The picture of a request ({ kind: "librarysheet" | "librarylit" | "librarypage", id, input, chapter }), made once while it is kept; its time printed.
export function sheetPicture(frame, r, { ground = null, print: say = (s) => console.log(s) } = {}) {
  const slot = r.kind === "librarysheet" ? "sheet" : r.kind === "librarylit" ? "lit" : "page", have = KEPT[slot];
  if (have && have.id === r.id) return have.pic;
  const pic = slot === "page" ? renderPage(frame, r.input, r.chapter, { ground }) : renderSheet(frame, r.input, { lit: slot === "lit" ? r.chapter : null, ground });
  made++; KEPT[slot] = { id: r.id, pic };
  say(`# library ${slot} ${r.id}: rendered in ${pic.ms.toFixed(0)} ms (${pic.w} x ${pic.h}); kept ${keptBytes()} bytes at RGB565`);
  return pic;
}
