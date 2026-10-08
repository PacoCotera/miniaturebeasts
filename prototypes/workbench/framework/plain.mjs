// The plain renderer (design/proposals/plain-renderer.md, technique C): the rasterizer's passes
// finished to the style guide by a deterministic post-process. Nothing here adds a part, a pigment
// or a gene: the silhouette, the slots and the markings are the rig's; the renderer adds craft.
//
// What each pass contributes:
//   gbuffer   per pixel the pigment slot (and its half, and whether a marking field lies there), the
//             Lambert term under the one light and how much the facet faces the viewer; the node in
//             the index buffer, the depth in the depth buffer. From these: the ramps, the contact
//             shades, the rim, the material grain.
//   index     (the node per pixel) the outline: 1 px in the darkest step of the part's own ramp,
//             never black, one step lighter on the lit side; touching parts get a contact shade
//             where the farther part meets the nearer, not a line.
//   slots     (the pigment per pixel) the ramp each pixel is shaded in: shadow cooled, highlight
//             warmed, three or four principal value masses with a grainy edge between them.
//   markings  (the field flags) the lighter field inside its slot, as the shaded pass draws it.
//   silhouette the ground: a soft cast shadow under the body on the plain ground, and the frame.
// The species sheet (plain/species-sheets/<species>.json, placeholders for now) says what the rig
// cannot: the eye (iris, its edge, the pupil, the catch light, how much bigger than the rig's eye),
// the mouth, and the material grain. Station: painted light, a fine pixel grain, no dither bands.
// Companion and token: the 48 ramps, the 4×4 Bayer only, no alpha, no anti-aliasing. Same genome,
// same bytes: every value here is integer or a deterministic hash of the pixel.
import { render, LIGHT, VIEWS } from "./raster.mjs";
import { dot } from "./geometry.mjs";

export const PLAIN_VERSION = "mb-plain/1";
export const BG = [246, 243, 236];
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
// A deterministic grain in [0, 1) from the pixel and a salt.
function hash(x, y, salt = 0) {
  let h = (x * 374761393 + y * 668265263 + salt * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
const COOL = [48, 44, 60], WARM = [255, 240, 205];

// The four value masses of a ramp, from its pigment: shadow (cooled), mid, lit, highlight (warmed).
function ramp(pigment) {
  return [mix(mix(pigment, COOL, 0.18), [0, 0, 0], 0.2), mix(pigment, [0, 0, 0], 0.05), mix(pigment, WARM, 0.16), mix(pigment, WARM, 0.46)];
}
const darkest = (pigment) => mix(mix(pigment, COOL, 0.35), [0, 0, 0], 0.4); // the outline step, never black

// The value masses a Lambert term falls in: on the Station a painted step (a short smooth blend at
// each edge, with grain); on the Companion and the token a hard step with a grainy edge.
const EDGES = [0.3, 0.56, 0.84];
function painted(l, r, x, y, grainWidth, device) {
  const n = (hash(x, y, 7) - 0.5) * grainWidth;
  const v = l + n;
  let k = 0;
  for (const e of EDGES) if (v > e) k++;
  if (device !== "station" || k === 3 && v > EDGES[2] + 0.05) return r[k];
  // a soft blend across the edge above this mass, over ±0.06 of the Lambert term
  const next = Math.min(3, k + 1), e = EDGES[Math.min(2, k)], t = Math.max(0, Math.min(1, (v - (e - 0.06)) / 0.12));
  return k < 3 && v > e - 0.06 ? mix(r[k], r[next], t * t * (3 - 2 * t)) : r[k];
}
const unit3 = (v) => { const n = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / n, v[1] / n, v[2] / n]; };

export function plainRender(scene, camera, options = {}) {
  const { device = "station", sheet = {}, palette = null } = options;
  // One warm light from the viewer's top left, a little in front (the style guide), whatever the view.
  const view = VIEWS[camera.view];
  const light = unit3([-0.55 * view.right[0] + 0.6 * view.up[0] + 0.5 * view.toward[0], -0.55 * view.right[1] + 0.6 * view.up[1] + 0.5 * view.toward[1], -0.55 * view.right[2] + 0.6 * view.up[2] + 0.5 * view.toward[2]]);
  const g = render(scene, camera, "gbuffer", { light });
  const W = g.width, H = g.height, data = g.data, index = g.index, depth = g.depth;
  // The facets' Lambert term smoothed within each node (a 5×5 box), so the volumes read round, not faceted.
  const partIds = new Map();
  for (const n of scene.nodes) if (!partIds.has(n.part ?? n.id)) partIds.set(n.part ?? n.id, partIds.size);
  const partAt = (i) => (index[i] ? partIds.get(scene.nodes[index[i] - 1].part ?? scene.nodes[index[i] - 1].id) : -1);
  const lam = new Float32Array(W * H);
  const R = Math.max(2, Math.round(W / 50)); // the smoothing radius grows with the size: about 6 px at the Station, 12 at the master
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (!index[i]) continue;
    const pi = partAt(i);
    let sum = 0, n = 0;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const j = yy * W + xx; if (!index[j] || partAt(j) !== pi) continue; sum += data[j * 4 + 1]; n++; }
    lam[i] = sum / (255 * n);
  }
  // The marking field flags are per facet; smoothed within the part and thresholded they are patches, not facets.
  const fieldAt = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (!index[i]) continue;
    const pi = partAt(i);
    let sum = 0, n = 0;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const j = yy * W + xx; if (!index[j] || partAt(j) !== pi) continue; sum += (data[j * 4] & 128) ? 1 : 0; n++; }
    fieldAt[i] = sum * 2 > n ? 1 : 0;
  }
  const slotNames = Object.keys(scene.slots).filter((k) => scene.slots[k]);
  const nodes = scene.nodes;
  const out = new Uint8ClampedArray(W * H * 4);
  const inside = new Uint8Array(W * H);
  const partOf = new Int32Array(W * H).fill(-1); // a part id per pixel (node.part), for contact shades
  const tile = device === "tile";
  const partColours = Object.fromEntries(Object.entries(sheet.partColours ?? {}).map(([k, v]) => [k, hex(v)])); // the sheet's colour for a part the rig draws in a slot (the crest's leaves)
  const grainWidth = tile ? 0 : device === "companion" ? 0.1 : 0.14;
  const material = sheet.material ?? scene.covering.kind;
  const grainAmp = sheet.grain ?? 0.03;
  // --- base colour: the ramp step of the pixel's slot under the light, with the material's grain ---
  const base = new Float32Array(W * H * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, ni = index[i];
    if (!ni) continue;
    const node = nodes[ni - 1];
    inside[i] = 1; partOf[i] = partIds.get(node.part ?? node.id);
    const code = data[i * 4], facing = data[i * 4 + 2] / 255;
    const si = code & 63, half = (code & 64) !== 0, field = fieldAt[i] === 1;
    const slot = slotNames[si] ?? "body";
    const pigments = scene.slots[slot] ?? scene.slots.body;
    let pigment = partColours[node.part] ?? hex(node.ink ?? (pigments[half ? 1 : 0] ?? pigments[0]));
    if (field) pigment = mix(pigment, hex(scene.slots.second?.[0] ?? "#e8e8e8"), 0.85 * (scene.markings?.contrast ?? 0.6) + 0.3); // a marking is the second pigment's field, as Pip's cream patches
    // material grain on the light itself, so it lives in the shading, not on top of it
    let l = lam[i];
    if (material === "fur") l += (hash(x >> 1, y, 3) - 0.5) * 2.2 * grainAmp + (hash(x, y >> 2, 5) - 0.5) * grainAmp;
    else if (material === "feathers") { const row = Math.floor(y / 5), ph = (row & 1) * 3; l += (((x + ph) % 6) < 3 ? 0.4 : -0.4) * grainAmp + ((y % 5) === 4 ? -1.2 * grainAmp : 0); }
    else if (material === "scales" || scene.covering.kind === "scales") { const d = ((x + y) % 7 === 0 || (x - y + 7000) % 7 === 0); l += d ? -1.4 * grainAmp : 0.2 * grainAmp; }
    else if (material === "velvet") l += (hash(x, y, 9) - 0.5) * 2 * grainAmp - 0.03 * (1 - facing);
    else l += (hash(x, y, 11) - 0.5) * 1.2 * grainAmp; // skin: a fine grain
    const r = ramp(pigment);
    let c = painted(l, r, x, y, grainWidth, device);
    // rim: a facet turned away from the viewer on the lit side catches a thin warm light
    if (facing < 0.42 && device === "station") c = mix(c, r[3], 0.35 * (1 - facing / 0.42));
    if (node.opacity !== undefined && node.opacity < 1) c = mix(c, BG, 0.55 * (1 - node.opacity)); // translucent flaps: lightened toward the ground, no dither on the Station
    base[i * 3] = c[0]; base[i * 3 + 1] = c[1]; base[i * 3 + 2] = c[2];
  }
  // --- outline and contact shades ---
  const result = new Float32Array(W * H * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (!inside[i]) { result[i * 3] = BG[0]; result[i * 3 + 1] = BG[1]; result[i * 3 + 2] = BG[2]; continue; }
    let c = [base[i * 3], base[i * 3 + 1], base[i * 3 + 2]];
    const node = nodes[index[i] - 1];
    const code = data[i * 4]; const slot = slotNames[code & 63] ?? "body";
    const pig = partColours[node.part] ?? hex(node.ink ?? ((scene.slots[slot] ?? scene.slots.body)[(code & 64) ? 1 : 0] ?? (scene.slots[slot] ?? scene.slots.body)[0]));
    const at = (dx, dy) => { const xx = x + dx, yy = y + dy; return xx < 0 || yy < 0 || xx >= W || yy >= H ? -1 : yy * W + xx; };
    let edgeBg = false, lit = false, contact = false;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const j = at(dx, dy);
      if (j < 0 || !inside[j]) { edgeBg = true; if (dx < 0 || dy < 0) lit = true; continue; }
      if (partOf[j] !== partOf[i] && depth[j] > depth[i] + 1e-6) contact = true; // the neighbour is nearer: this pixel is the farther part at the join
    }
    if (edgeBg) c = lit && !tile ? mix(darkest(pig), pig, 0.45) : darkest(pig);
    else if (contact) c = mix(c, darkest(pig), tile ? 0.5 : 0.35);
    result[i * 3] = c[0]; result[i * 3 + 1] = c[1]; result[i * 3 + 2] = c[2];
  }
  // --- the face: eyes and mouth from the species sheet ---
  drawEyes(scene, index, inside, result, W, H, sheet, tile);
  if (sheet.mouth && sheet.mouth !== "none") drawMouth(scene, index, inside, result, W, H, sheet, tile);
  // --- the ground: a soft cast shadow under the body ---
  if (!tile) castShadow(inside, result, W, H, device);
  // --- fine grain on the Station; the 48 ramps with Bayer on the Companion and the token ---
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    let c = [result[i * 3], result[i * 3 + 1], result[i * 3 + 2]];
    if (device === "station" && inside[i]) { const n = (hash(x, y, 13) - 0.5) * 6; c = [c[0] + n, c[1] + n, c[2] + n]; }
    if (palette && (inside[i] || device !== "station")) c = nearest(palette, c, inside[i] ? (BAYER[y & 3][x & 3] / 16 - 0.5) * 22 : 0);
    out[i * 4] = clamp(c[0]); out[i * 4 + 1] = clamp(c[1]); out[i * 4 + 2] = clamp(c[2]); out[i * 4 + 3] = 255;
  }
  return { width: W, height: H, data: out, pass: "plain", view: camera.view, version: PLAIN_VERSION, device };
}

function nearest(palette, c, dither) {
  const v = [c[0] + dither, c[1] + dither, c[2] + dither];
  let best = palette[0], bd = Infinity;
  for (const p of palette) { const d = (p[0] - v[0]) ** 2 + (p[1] - v[1]) ** 2 + (p[2] - v[2]) ** 2; if (d < bd) { bd = d; best = p; } }
  return best;
}

// The eye: the rig places a rim and a pupil; the sheet says how the species' eye is drawn. Each eye
// is redrawn as an ellipse over the rig's eye, enlarged by the sheet's scale, clipped to the head.
function drawEyes(scene, index, inside, result, W, H, sheet, tile) {
  const nodes = scene.nodes;
  const eyes = {};
  for (let i = 0; i < W * H; i++) {
    const ni = index[i]; if (!ni) continue;
    const n = nodes[ni - 1]; if (n.part !== "eye") continue;
    const side = n.id.endsWith("-L") ? "L" : "R";
    const e = (eyes[side] ??= { minX: W, maxX: -1, minY: H, maxY: -1, n: 0 });
    const x = i % W, y = (i - x) / W;
    e.minX = Math.min(e.minX, x); e.maxX = Math.max(e.maxX, x); e.minY = Math.min(e.minY, y); e.maxY = Math.max(e.maxY, y); e.n++;
  }
  const headPixels = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) { const ni = index[i]; if (ni && ["head", "eye", "muzzle", "beak"].includes(nodes[ni - 1].part)) headPixels[i] = 1; }
  const iris = hex(sheet.iris ?? "#e08a2c"), irisEdge = hex(sheet.irisEdge ?? "#8a4a12"), pupil = hex(sheet.pupil ?? "#273036"), catchC = hex(sheet.catch ?? "#fff6e8"), rimC = hex("#f1eddc");
  const scale = sheet.eyeScale ?? 1.3;
  for (const e of Object.values(eyes)) {
    if (e.n < 2) continue;
    const cx = (e.minX + e.maxX) / 2, cy = (e.minY + e.maxY) / 2;
    const rx = Math.max(1.2, ((e.maxX - e.minX + 1) / 2) * scale), ry = Math.max(1.2, ((e.maxY - e.minY + 1) / 2) * scale);
    const r = Math.max(rx, ry);
    if (tile && r < 1.6) { // at 48 px an eye is two or three pixels: ring, pupil, catch
      setPx(result, W, Math.round(cx), Math.round(cy), pupil); if (r > 1.1) setPx(result, W, Math.round(cx) - 1, Math.round(cy) - 1, catchC); continue;
    }
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const i = y * W + x;
      if (!inside[i] || !headPixels[i]) continue;
      const u = (x - cx) / rx, v = (y - cy) / ry, d = Math.sqrt(u * u + v * v);
      if (d > 1) continue;
      let c;
      if (d > 0.84) c = rimC;                                     // the cream ring
      else if (d > 0.7) c = irisEdge;                             // the iris's dark edge
      else {
        const pu = u + 0.08, pv = v + 0.1, pd = Math.sqrt(pu * pu + pv * pv);   // pupil a little toward the light
        c = pd < 0.36 ? pupil : mix(iris, irisEdge, Math.max(0, (d - 0.3) / 0.4)); // iris, darker toward its edge
        const hu = u + 0.38, hv = v + 0.38, hd = Math.sqrt(hu * hu + hv * hv);  // the catch light, top left
        if (hd < 0.2) c = catchC; else if (hd < 0.26) c = mix(c, catchC, 0.5);
        const su = u - 0.3, sv = v - 0.32; if (Math.sqrt(su * su + sv * sv) < 0.09) c = mix(c, catchC, 0.6); // a second small glint
      }
      if (d > 0.93 && !tile) c = mix(c, [40, 40, 50], 0.5); // a soft dark rim round the ring
      setPx(result, W, x, y, c);
    }
  }
}

function drawMouth(scene, index, inside, result, W, H, sheet, tile) {
  const nodes = scene.nodes;
  let minX = W, maxX = -1, minY = H, maxY = -1, n = 0;
  for (let i = 0; i < W * H; i++) { const ni = index[i]; if (!ni) continue; const p = nodes[ni - 1].part; if (p !== "muzzle") continue; const x = i % W, y = (i - x) / W; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); n++; }
  if (n < 4) return;
  const w = maxX - minX + 1, h = maxY - minY + 1;
  const ink = [52, 42, 44];
  // the mouth sits low on the front half of the muzzle (the head faces right in side and three-quarter views)
  const cx = minX + 0.62 * w, cy = minY + 0.72 * h, span = Math.max(2, Math.round(0.34 * w)), lift = Math.max(1, Math.round(0.12 * h));
  for (let dx = -span; dx <= span; dx++) {
    const t = dx / span, y = Math.round(cy - lift * (1 - t * t) * (sheet.mouth === "smile" ? -1 : 1));
    const x = Math.round(cx + dx);
    for (let k = 0; k < (tile ? 1 : 2); k++) if (x >= 0 && x < W && y + k >= 0 && y + k < H && inside[y * W + x]) setPx(result, W, x, y + k, ink);
  }
}

function castShadow(inside, result, W, H, device) {
  let minX = W, maxX = -1, maxY = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inside[y * W + x]) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
  if (maxX < 0) return;
  const cx = (minX + maxX) / 2, w = maxX - minX, rx = 0.48 * w, ry = Math.max(3, 0.07 * w), cy = maxY + 1;
  const shade = [196, 188, 176];
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const i = y * W + x; if (inside[i]) continue;
    const u = (x - cx) / rx, v = (y - cy) / ry, d = u * u + v * v;
    if (d > 1) continue;
    const t = device === "station" ? (1 - d) * 0.9 : (1 - d) > 0.35 ? 0.7 : 0; // Station: soft; Companion: one flat step
    const c = mix(BG, shade, t);
    result[i * 3] = c[0]; result[i * 3 + 1] = c[1]; result[i * 3 + 2] = c[2];
  }
}

function setPx(result, W, x, y, c) { const i = (y * W + x) * 3; result[i] = c[0]; result[i + 1] = c[1]; result[i + 2] = c[2]; }

// The Station picture at device size from the master: a 2×2 box filter (the Station may be
// anti-aliased; the Companion and the token never are).
export function downsample2(img) {
  const W = img.width >> 1, H = img.height >> 1, out = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) for (let c = 0; c < 3; c++) {
    const i = ((2 * y) * img.width + 2 * x) * 4 + c;
    out[(y * W + x) * 4 + c] = Math.round((img.data[i] + img.data[i + 4] + img.data[i + img.width * 4] + img.data[i + img.width * 4 + 4]) / 4);
  }
  for (let i = 3; i < out.length; i += 4) out[i] = 255;
  return { width: W, height: H, data: out, pass: img.pass, view: img.view, version: img.version, device: img.device };
}
