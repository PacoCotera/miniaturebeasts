// The plain placeholder (design/proposals/plain-renderer.md, technique C, reduced): the rasterizer's
// gbuffer pass finished by a deterministic post-process, so a mibi looks deliberate on the device
// while its Grow painting is pending or has failed its checks. The standard look of every mibi is
// the Grow painting (grow/); this is the offline fallback and nothing more: ramps, an outline, a
// grain, a contact shade at the joins and a cast shadow. No face, no materials, no species sheet.
// Nothing here adds a part, a pigment or a gene: the silhouette, the slots and the markings are the
// rig's. Same genome, same bytes: every value here is integer or a deterministic hash of the pixel.
//
// What each pass contributes:
//   gbuffer   per pixel the pigment slot (and its half, and whether a marking field lies there), the
//             Lambert term under the one light and how much the facet faces the viewer; the node in
//             the index buffer, the depth in the depth buffer. From these: the ramps and the rim.
//   index     (the node per pixel) the outline: 1 px in the darkest step of the part's own ramp,
//             never black, one step lighter on the lit side; touching parts get a contact shade
//             where the farther part meets the nearer, not a line.
//   slots     (the pigment per pixel) the ramp each pixel is shaded in: shadow cooled, highlight
//             warmed, four value masses with a grainy edge between them.
//   markings  (the field flags) the second pigment's field, smoothed to a patch.
//   silhouette the ground: a soft cast shadow under the body on the plain ground.
// Station: painted light, a fine pixel grain. Companion and token: the 48 ramps, the 4×4 Bayer
// only, no alpha, no anti-aliasing.
import { render, VIEWS } from "./raster.mjs";

export const PLAIN_VERSION = "mb-plain/2";
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
  const next = Math.min(3, k + 1), e = EDGES[Math.min(2, k)], t = Math.max(0, Math.min(1, (v - (e - 0.06)) / 0.12));
  return k < 3 && v > e - 0.06 ? mix(r[k], r[next], t * t * (3 - 2 * t)) : r[k];
}
const unit3 = (v) => { const n = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / n, v[1] / n, v[2] / n]; };

export function plainRender(scene, camera, options = {}) {
  const { device = "station", palette = null } = options;
  // One warm light from the viewer's top left, a little in front (the style guide), whatever the view.
  const view = VIEWS[camera.view];
  const light = unit3([-0.55 * view.right[0] + 0.6 * view.up[0] + 0.5 * view.toward[0], -0.55 * view.right[1] + 0.6 * view.up[1] + 0.5 * view.toward[1], -0.55 * view.right[2] + 0.6 * view.up[2] + 0.5 * view.toward[2]]);
  const g = render(scene, camera, "gbuffer", { light });
  const W = g.width, H = g.height, data = g.data, index = g.index, depth = g.depth;
  const partIds = new Map();
  for (const n of scene.nodes) if (!partIds.has(n.part ?? n.id)) partIds.set(n.part ?? n.id, partIds.size);
  const partAt = (i) => (index[i] ? partIds.get(scene.nodes[index[i] - 1].part ?? scene.nodes[index[i] - 1].id) : -1);
  // The facets' Lambert term and the marking flags smoothed within each part, so the volumes read
  // round and a marking is a patch, not a facet. The radius grows with the size: about 6 px at the
  // Station, 12 at the master.
  const R = Math.max(2, Math.round(W / 50));
  const lam = new Float32Array(W * H), fieldAt = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (!index[i]) continue;
    const pi = partAt(i);
    let sum = 0, f = 0, n = 0;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      const j = yy * W + xx; if (!index[j] || partAt(j) !== pi) continue;
      sum += data[j * 4 + 1]; if (data[j * 4] & 128) f++; n++;
    }
    lam[i] = sum / (255 * n); fieldAt[i] = f * 2 > n ? 1 : 0;
  }
  const slotNames = Object.keys(scene.slots).filter((k) => scene.slots[k]);
  const nodes = scene.nodes;
  const out = new Uint8ClampedArray(W * H * 4);
  const inside = new Uint8Array(W * H);
  const partOf = new Int32Array(W * H).fill(-1);
  const tile = device === "tile";
  const grainWidth = tile ? 0 : device === "companion" ? 0.1 : 0.14;
  const pigmentAt = (i) => {
    const node = nodes[index[i] - 1], code = data[i * 4];
    const pigments = scene.slots[slotNames[code & 63] ?? "body"] ?? scene.slots.body;
    return hex(node.ink ?? (pigments[(code & 64) ? 1 : 0] ?? pigments[0]));
  };
  // --- base colour: the ramp step of the pixel's slot under the light, with a fine grain ---
  const base = new Float32Array(W * H * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, ni = index[i];
    if (!ni) continue;
    const node = nodes[ni - 1];
    inside[i] = 1; partOf[i] = partIds.get(node.part ?? node.id);
    const facing = data[i * 4 + 2] / 255;
    let pigment = pigmentAt(i);
    if (fieldAt[i]) pigment = mix(pigment, hex(scene.slots.second?.[0] ?? "#e8e8e8"), 0.85 * (scene.markings?.contrast ?? 0.6) + 0.3);
    const l = lam[i] + (hash(x, y, 11) - 0.5) * 0.036;
    const r = ramp(pigment);
    let c = painted(l, r, x, y, grainWidth, device);
    if (facing < 0.42 && device === "station") c = mix(c, r[3], 0.35 * (1 - facing / 0.42)); // rim: a facet turned away on the lit side
    if (node.opacity !== undefined && node.opacity < 1) c = mix(c, BG, 0.55 * (1 - node.opacity)); // a translucent flap: a flat tint toward the ground
    base[i * 3] = c[0]; base[i * 3 + 1] = c[1]; base[i * 3 + 2] = c[2];
  }
  // --- outline and contact shades ---
  const result = new Float32Array(W * H * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (!inside[i]) { result[i * 3] = BG[0]; result[i * 3 + 1] = BG[1]; result[i * 3 + 2] = BG[2]; continue; }
    let c = [base[i * 3], base[i * 3 + 1], base[i * 3 + 2]];
    const pig = pigmentAt(i);
    const at = (dx, dy) => { const xx = x + dx, yy = y + dy; return xx < 0 || yy < 0 || xx >= W || yy >= H ? -1 : yy * W + xx; };
    let edgeBg = false, lit = false, contact = false;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const j = at(dx, dy);
      if (j < 0 || !inside[j]) { edgeBg = true; if (dx < 0 || dy < 0) lit = true; continue; }
      if (partOf[j] !== partOf[i] && depth[j] > depth[i] + 1e-6) contact = true;
    }
    if (edgeBg) c = lit && !tile ? mix(darkest(pig), pig, 0.45) : darkest(pig);
    else if (contact) c = mix(c, darkest(pig), tile ? 0.5 : 0.35);
    result[i * 3] = c[0]; result[i * 3 + 1] = c[1]; result[i * 3 + 2] = c[2];
  }
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
    const t = device === "station" ? (1 - d) * 0.9 : (1 - d) > 0.35 ? 0.7 : 0;
    const c = mix(BG, shade, t);
    result[i * 3] = c[0]; result[i * 3 + 1] = c[1]; result[i * 3 + 2] = c[2];
  }
}

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
// The plain set for one body, as the Grow service and the device serve it: the portrait and side
// Station pictures (from a 600×620 master by a 2×2 box), the Companion 280×300 and the 48 px token
// from the portrait view. `cameras` is the species rig ({ view: { large, companion, tile } }).
export function plainSet(scene, cameras, palette) {
  const set = {};
  for (const view of ["portrait", "side"]) {
    const master = plainRender(scene, cameras[view].large, { device: "station" });
    set[`plain-${view}-600x620`] = master; set[`plain-${view}-300x310`] = downsample2(master);
  }
  set["plain-companion-280x300"] = plainRender(scene, cameras.portrait.companion, { device: "companion", palette });
  set["plain-token-48"] = plainRender(scene, cameras.portrait.tile, { device: "tile", palette });
  return set;
}
