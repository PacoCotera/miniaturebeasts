// The moving sets (Station M1 §1.2, §1.5, §2.6; the look in the atlas id: layer-bake §7): the animator's numbers and the art director's cell ids, one file a species (ui/specs/station/moving/<SXX>.json),
// merged into the one spec `moving` the face takes. The host composes each atlas, one picture a species, stage and part (walk, close, nap, shadow): a 1 px clear column, then the cells in the set's order in one
// row, the mirrors made here (each row reversed, exact pixels; LVGL's software renderer cannot flip), shadow-75 derived here (alpha × 3 / 4, rounded down). A cell is its placed master (mibi-<stage>-SXX-<key>[-<step>]-WxH)
// or, until it is placed, the stand-in of §1.5 (whole pixels, registered as a placeholder). An atlas is a master only when every one of its cells is; a set plays only when all its atlases are (the play gate), else only under
// the developer switch "Motion sets (stand-ins)" or in the face tests. The face never makes an id: the props name the atlases.
import { assetEntry, asset as assetOf, registerAsset, hasAsset } from "../../ui/assets.mjs";
import { footprintOf } from "../../ui/specs/derive.mjs";
import { gradedOf } from "./light-grade.mjs";

let MOVING = {};
// the stand-in shadow's ink (the art director's Q6 ruling for M1a: #1e1a22 at alpha 110, a literal, no new palette name); one constant, so a ruling changes one place
export const SHADOW_INK = { rgb: [0x1e, 0x1a, 0x22], alpha: 110 };
export const setMoving = (json) => { MOVING = json || {}; };
export const movingSpec = () => MOVING;
const atlasStage = (stage) => (stage === "elder" ? "adult" : stage);   // an elder takes the adult's cells at the elder's tempo (the face reads the tempo)
export function movingOf(species, stage) { const set = MOVING[species], s = set && set[atlasStage(stage)]; return s && s.walk ? { species, native: set.native, gait: set.gait, stage: atlasStage(stage), ...s } : null; }
// the atlas ids (amendment 2): moving:<stage>:<SXX>:<part>:<w>x<h>:<look>, the look the literal `species` until layers exist; the shadows species-level, with no look
export function movingIds(species, stage, look = "species", light = "day") {
  const s = movingOf(species, stage); if (!s) return null; const st = s.stage, [w, h] = s.walk.size, [cw, ch] = s.close.size, [nw, nh] = s.nap.size;
  const L = light === "day" ? "" : ":" + light;   // fix 7: a graded atlas names its light (day, the master, adds nothing); the contact shadows are not graded, so their ids never carry one
  return { walk: `moving:${st}:${species}:walk:${w}x${h}:${look}${L}`, close: `moving:${st}:${species}:close:${cw}x${ch}:${look}${L}`, nap: `moving:${st}:${species}:nap:${nw}x${nh}:${look}${L}`,
    shadow: `moving:${st}:${species}:shadow:${s.shadow.walk[0]}x${s.shadow.walk[1]}`, closeShadow: `moving:${st}:${species}:shadow:${s.shadow.close[0]}x${s.shadow.close[1]}` };
}
const parse = (id) => { const m = /^moving:(juvenile|adult):(S\d{2}):(walk|close|nap|shadow):(\d+)x(\d+)(?::([0-9a-f]{16}|species))?(?::(dawn|day|dusk|night))?$/.exec(id); return m && { stage: m[1], species: m[2], part: m[3], w: +m[4], h: +m[5], look: m[6] ?? null, light: m[7] ?? "day" }; };
// a part's cells in atlas order: the painted cells, then the mirrors (walk); each { name, master, mirror }
export function cellsOf(species, stage, part, w, h) {
  const s = movingOf(species, stage); if (!s) return [];
  const id = (name) => `mibi-${s.stage}-${species}-${name}-${w}x${h}`;
  if (part === "shadow") return [{ name: "shadow", master: id("shadow") }, { name: "shadow-75", master: id("shadow"), derived75: true }];
  const p = s[part], base = p.cells.map((name) => ({ name, master: id(name) }));
  return part === "walk" ? [...base, ...(p.mirror ?? []).map((name) => ({ name, master: id(name), mirror: true }))] : base;
}
// A creature picture's footprint, the `foot` the host sends on its `asset` message (fix 14, FR4; the architect's ruling of 08:12): a `mibi:` still, master copy or rig render (graded copies alike): [x, feetY, w] at alpha T.alpha; a walk or close
// atlas: { stand, curl, shadow }, its cells found by name (the first painted, non-mirror cell of that name: no index is written anywhere) and `shadow` from cell 0 of the same-size shadow atlas at T.shadowAlpha, moved into the creature cell's
// coordinates (feetY + h - the shadow's h); a nap atlas: { curl }; a shadow atlas and the mibi-* master ids: none. `picOf(id)` gives the shadow atlas. Alpha only, so a graded copy measures as its master. Null when nothing has ink.
export function footOf(id, pic, picOf, T = { band: 6, alpha: 128, shadowAlpha: 1 }) {
  const rgba = typeof pic.rgba === "function" ? pic : { w: pic.w, h: pic.h, rgba: () => pic.data };
  if (/^mibi:/.test(id)) return footprintOf(rgba, 0, pic.w, T);
  const a = parse(id); if (!a || a.part === "shadow") return null;
  const cs = cellsOf(a.species, a.stage, a.part, a.w, a.h), at = (name) => { const i = cs.findIndex((c) => c.name === name && !c.mirror); return i < 0 ? null : 1 + i * a.w; }, out = {};
  for (const name of a.part === "nap" ? ["curl"] : ["stand", "curl"]) { const x = at(name); if (x == null) continue; const f = footprintOf(rgba, x, a.w, T); if (f) out[name] = f; }
  if (a.part !== "nap") {
    const s = movingOf(a.species, a.stage), [sw, sh] = s?.shadow?.[a.part] ?? [0, 0], sp = sw ? picOf?.(`moving:${a.stage}:${a.species}:shadow:${sw}x${sh}`) : null;
    if (sp) { const f = footprintOf(typeof sp.rgba === "function" ? sp : { w: sp.w, h: sp.h, rgba: () => sp.data }, 1, sw, { ...T, alpha: T.shadowAlpha }); if (f) out.shadow = [f[0], f[1] + a.h - sh, f[2]]; }
  }
  return Object.keys(out).length ? out : null;
}
const placed = (id) => { const e = assetEntry(id); return !!e && !!e.file && e.status !== "empty"; };   // a placed master (its file), not a built stand-in
export const atlasIsMaster = (id) => { const a = parse(id); return !!a && cellsOf(a.species, a.stage, a.part, a.w, a.h).every((c) => placed(c.master)); };
// the play gate (§1.5): every cell of every part of the set at this stage is a placed master
export function playable(species, stage) { const I = movingIds(species, stage); return !!I && [I.walk, I.close, I.nap, I.shadow, I.closeShadow].every(atlasIsMaster); }

// ---- the pictures: { w, h, rgba() } with straight alpha ----
const pic = (w, h, data = new Uint8ClampedArray(w * h * 4)) => ({ w, h, data, rgba: () => data });
const blit = (dst, src, dx, dy) => { const s = src.rgba(); for (let y = 0; y < src.h; y++) { const ty = y + dy; if (ty < 0 || ty >= dst.h) continue; for (let x = 0; x < src.w; x++) { const tx = x + dx; if (tx < 0 || tx >= dst.w) continue; const i = (y * src.w + x) * 4, o = (ty * dst.w + tx) * 4; dst.data[o] = s[i]; dst.data[o + 1] = s[i + 1]; dst.data[o + 2] = s[i + 2]; dst.data[o + 3] = s[i + 3]; } } };
// §1.5's stand-ins, whole pixels only. `stand(w, h)`: the placed juvenile stand-in (its baked shadow and all) or, for an adult, Pip's placed stand, else the rig at that size; `nap()`: the 96 × 88 juvenile stand-in
function standIn(name, w, h, src) {
  const st = src.stand(w, h), out = pic(w, h);
  const shiftRows = (k, lastRow) => { const s = st.rgba(); for (let y = 0; y < h; y++) { const from = y + k <= lastRow ? y + k : y; out.data.set(s.subarray(from * w * 4, (from * w + w) * 4), y * w * 4); } };   // a row past the moved block keeps its own pixels
  switch (name) {
    case "stand": case "air": case "pass": case "stepa": case "stepb": case "blink": blit(out, st, 0, 0); return out;
    case "stand-b1": shiftRows(1, h - 25); return out;   // rows 0..(h − 25) moved up 1 px, the feet fixed
    case "stand-b2": shiftRows(2, h - 25); return out;
    case "crouch": blit(out, st, 0, 2); return out;   // the stand moved down 2 px
    case "curl": case "curl-b1": { const n = src.nap(); let p = n;
      if (name === "curl-b1") { p = pic(n.w, n.h); const s = n.rgba(); for (let y = 0; y < n.h; y++) { const from = y < n.h - 12 ? Math.min(y + 1, n.h - 13) : y; p.data.set(s.subarray(from * n.w * 4, (from * n.w + n.w) * 4), y * n.w * 4); } }   // its rows above the last 12 moved up 1 px
      blit(out, p, Math.floor((w - n.w) / 2), h - n.h); return out; }   // bottom-centred in the cell
    default: blit(out, st, 0, 0); return out;
  }
}
function shadowStandIn(w, h, ink) {   // a flat ellipse of the shadow ink, w × h (ink: { rgb, alpha })
  const out = pic(w, h), rx = w / 2, ry = h / 2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const dx = (x + 0.5 - rx) / rx, dy = (y + 0.5 - ry) / ry; if (dx * dx + dy * dy <= 1) { const o = (y * w + x) * 4; out.data[o] = ink.rgb[0]; out.data[o + 1] = ink.rgb[1]; out.data[o + 2] = ink.rgb[2]; out.data[o + 3] = ink.alpha; } }
  return out;
}
// compose one atlas: the gutter column clear, the cells at 1 + i·w, a mirror each row reversed, shadow-75 the shadow's alpha × 3 / 4 rounded down; `layers` (the look's, empty in M1) are composed over each cell by the bake slot
export function compose(id, src, layers = []) {
  const a = parse(id); if (!a) throw new Error("not a moving atlas id: " + id);
  if (layers.length) throw new Error("moving: the look's layers are composed in the bake slot (layer-bake §3.1); M1 composes none");
  const cells = cellsOf(a.species, a.stage, a.part, a.w, a.h), out = pic(1 + cells.length * a.w, a.h);
  const cellPic = (c) => { if (placed(c.master)) return assetOf(a.part === "shadow" ? c.master : gradedOf(c.master, a.light)); return a.part === "shadow" ? shadowStandIn(a.w, a.h, src.shadowInk ?? SHADOW_INK) : standIn(c.name, a.w, a.h, { stand: (w, h) => src.stand(a.species, a.stage, w, h, a.light), nap: () => src.nap(a.species, a.light) }); };
  const byName = new Map();
  cells.forEach((c, i) => {
    let p = c.derived75 ? null : c.mirror ? byName.get(c.name) : cellPic(c);
    if (c.derived75) { const s = byName.get("shadow").rgba(); p = pic(a.w, a.h, new Uint8ClampedArray(s)); for (let k = 3; k < p.data.length; k += 4) p.data[k] = Math.floor(p.data[k] * 3 / 4); }
    else if (c.mirror) { const s = p.rgba(), m = pic(a.w, a.h); for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) { const i2 = (y * a.w + x) * 4, o = (y * a.w + (a.w - 1 - x)) * 4; m.data[o] = s[i2]; m.data[o + 1] = s[i2 + 1]; m.data[o + 2] = s[i2 + 2]; m.data[o + 3] = s[i2 + 3]; } p = m; }
    else byName.set(c.name, p);
    if (p.w !== a.w || p.h !== a.h) throw new Error(`moving: the cell ${c.master} is ${p.w}×${p.h}, the atlas ${id} takes ${a.w}×${a.h}`);
    blit(out, p, 1 + i * a.w, 0);
  });
  return out;
}
// register an atlas in the manifest (pictures.mjs `case "moving"`): built by compose, status master only when every cell is a placed master
// ---- the figure of a moving set (T-20261018-235): measured once per atlas, when it is composed ----
// The union of the ink bbox (alpha >= 128, the shadow is its own atlas) over the set's grounded cells (the walk atlas's cells but the hop's air frame and the curls, mirrors included, so the box is the same either way it
// faces), as [dx, dy, W, H] in the cell: its width and x-centre, and its lowest ink row. The resident's ring and tag hold still on it while the cells animate; a hop keeps its F. Kept with the atlas by id.
const FIGURES = new Map(); let SOURCE = null;
export const setMovingSource = (src) => { SOURCE = src; FIGURES.clear(); };
const AIRBORNE = /^(air|curl|curl-b1)$/;
export function atlasFigure(id, pic) {
  const a = parse(id); if (!a || a.part !== "walk") return null;
  const cells = cellsOf(a.species, a.stage, "walk", a.w, a.h), px = pic.rgba(); let x0 = a.w, y0 = a.h, x1 = -1, y1 = -1, sy = -1;   // sy: the lowest solid row (alpha >= 200), the feet line; a soft fringe is not ground
  cells.forEach((c, i) => { if (AIRBORNE.test(c.name)) return; const ox = 1 + i * a.w;
    for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) { const al = px[(y * pic.w + ox + x) * 4 + 3]; if (al >= 128) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (al >= 200 && y > sy) sy = y; } } });
  if (x1 >= 0 && sy >= 0) y1 = sy;
  return x1 < 0 ? null : [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
}
// the figure of the set's walk atlas of a species, stage and look, composed here from its sources (the day atlas: a light grades colour, never alpha), cached by the atlas id; null with no source or no ink
export function movingFigure(walkId) {
  if (FIGURES.has(walkId)) return FIGURES.get(walkId); if (!SOURCE) return null;
  const f = atlasFigure(walkId, compose(walkId.replace(/:(dawn|dusk|night)$/, ""), SOURCE)); FIGURES.set(walkId, f); return f;
}
export function registerMoving(id, src) {
  if (hasAsset(id)) return id; const a = parse(id), n = cellsOf(a.species, a.stage, a.part, a.w, a.h).length;
  registerAsset({ id, w: 1 + n * a.w, h: a.h, status: atlasIsMaster(id) ? "master" : "placeholder", until: "the motion proof's signed cells (Station M1 §1.3, M1b)", build: () => compose(id, src, []) });
  return id;
}
// whether a mibi of this species and stage plays its moving set: it has one, and every cell is a placed master or the developer's switch is on (the face tests pass motionSets too)
export const plays = (species, stage, motionSets) => !!movingOf(species, stage) && (!!motionSets || playable(species, stage));
