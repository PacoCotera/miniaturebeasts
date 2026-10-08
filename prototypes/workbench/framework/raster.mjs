// A small deterministic software rasterizer: orthographic cameras per view, a depth buffer,
// flat shading from one light at the top left, and separate passes for the structural sketch:
// shaded turnaround, pigment-slot map, marking masks, part index and black silhouette.
// It runs unchanged in Node and in the browser (the page copies the RGBA buffer into a canvas),
// so the same genome gives the same bytes everywhere. No anti-aliasing, no alpha blending but
// the declared flap translucency, which is drawn as an ordered dither so it stays deterministic.
import { sub, cross, dot, unit, mul, add, norm, longitudinalWeight, localPoint } from "./geometry.mjs";

// Views: the camera basis (right, up, toward viewer) in world space. World: X back, Y right, Z up;
// the head looks toward -X, so "front" looks along +X at the face.
export const VIEWS = {
  front: { right: [0, 1, 0], up: [0, 0, 1] },
  side: { right: [-1, 0, 0], up: [0, 0, 1] },
  "three-quarter": { right: unit([-Math.sqrt(3) / 2, 0.5, 0]), up: unit([0.25 * 0.5, 0.25 * Math.sqrt(3) / 2, Math.sqrt(3) / 2]) },
  top: { right: [0, 1, 0], up: [-1, 0, 0] },
};
for (const view of Object.values(VIEWS)) {
  view.right = unit(view.right);
  view.up = unit(sub(view.up, mul(view.right, dot(view.up, view.right))));
  view.toward = unit(cross(view.right, view.up));
}
export const LIGHT = unit([-0.55, -0.6, 0.8]); // v1 presentation light: from the top left of the viewer
export const SCALES = { tile: [48, 48], companion: [280, 300], station: [300, 310], large: [600, 620] };

export function fitCamera(scene, viewName, size, margin = 0.08) {
  const view = VIEWS[viewName];
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const node of scene.nodes) for (const p of node.mesh.vertices) {
    const x = dot(p, view.right), y = dot(p, view.up);
    if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  const w = maxX - minX, h = maxY - minY;
  const scale = Math.min((size[0] * (1 - 2 * margin)) / w, (size[1] * (1 - 2 * margin)) / h);
  return { view: viewName, scale, center: [(minX + maxX) / 2, (minY + maxY) / 2], size, extent: [w, h] };
}
// A camera for a plan: fitted to a reference body and reused, so individuals keep their relative size.
export const cameraFrom = (reference, viewName, size, margin) => ({ ...fitCamera(reference, viewName, size, margin), fixed: true });

const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

// Marking fields on a primary region face, by the face's mean atlas (u along, v around), using
// the contract's logical placement: n = max(1, round(10*extent)) masks per owner, bands as scale-wide
// stripes, patches as ellipses (primary-local-marking-field/1, simplified to a per-face mask).
function markingAt(markings, u, vAngle) {
  const n = Math.max(1, Math.round(10 * markings.extent));
  const kind = markings.layout;
  for (let i = 0; i < n; i++) {
    const cu = (i + 1) / (n + 1), cv = (i + 0.5) / n;
    const isBand = kind === "bands" || (kind === "bands-and-patches" && i % 2 === 0);
    const c = Math.cos(markings.orientation), s = Math.sin(markings.orientation);
    const du = u - cu, dv = ((vAngle - cv + 1.5) % 1) - 0.5;
    const ru = du * c + dv * s, rv = -du * s + dv * c;
    if (isBand ? Math.abs(ru) < markings.scale : (ru / markings.scale) ** 2 + (rv / (0.6 * markings.scale)) ** 2 < 1) return true;
  }
  return false;
}

// A camera with `center: null` keeps its scale and centres each body in its own frame.
export function cameraCenter(scene, camera) {
  if (camera.center) return camera.center;
  const view = VIEWS[camera.view];
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const node of scene.nodes) for (const p of node.mesh.vertices) {
    const x = dot(p, view.right), y = dot(p, view.up);
    if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  return [(minX + maxX) / 2, (minY + maxY) / 2];
}
// A camera with `scale: null` fits each body to its frame (the 48 px token fills its tile).
export function resolveCamera(scene, camera) {
  if (camera.scale === null || camera.scale === undefined) return { ...fitCamera(scene, camera.view, camera.size, camera.margin ?? 0.04), fixed: camera.fixed, shared: camera.shared };
  return { ...camera, center: cameraCenter(scene, camera) };
}
export function render(scene, camera, pass = "shaded", options = {}) {
  const [W, H] = camera.size;
  const view = VIEWS[camera.view];
  camera = resolveCamera(scene, camera);
  const rgb = new Uint8ClampedArray(W * H * 4);
  const depth = new Float32Array(W * H).fill(-Infinity);
  const index = new Uint16Array(W * H);
  const bg = options.background ?? (pass === "silhouette" ? [255, 255, 255] : pass === "slots" || pass === "index" || pass === "markings" ? [0, 0, 0] : [246, 243, 236]);
  for (let i = 0; i < W * H; i++) { rgb[i * 4] = bg[0]; rgb[i * 4 + 1] = bg[1]; rgb[i * 4 + 2] = bg[2]; rgb[i * 4 + 3] = 255; }
  const project = (p) => [W / 2 + (dot(p, view.right) - camera.center[0]) * camera.scale, H / 2 - (dot(p, view.up) - camera.center[1]) * camera.scale, dot(p, view.toward)];
  const slotColours = {};
  const slotNames = Object.keys(scene.slots).filter((k) => scene.slots[k]);
  slotNames.forEach((name, i) => { slotColours[name] = [[220, 80, 60], [60, 140, 220], [240, 230, 200], [40, 40, 50], [230, 150, 60], [255, 240, 120], [90, 180, 90], [200, 120, 200]][i % 8]; });
  const partIds = new Map();
  for (const node of scene.nodes) if (!partIds.has(node.part ?? node.id)) partIds.set(node.part ?? node.id, partIds.size + 1);
  const partColour = (id) => [(id * 53) % 256, (id * 97 + 40) % 256, (id * 151 + 90) % 256];
  const nodeIndex = new Map(scene.nodes.map((n, i) => [n.id, i + 1]));
  for (const node of scene.nodes) {
    const palette = scene.slots[node.slot] ?? scene.slots.body;
    const region = node.role === "primary-region";
    const opacity = node.opacity ?? 1;
    for (const face of node.mesh.faces) {
      const pts = face.vertices.map((i) => node.mesh.vertices[i]);
      const normal = cross(sub(pts[1], pts[0]), sub(pts[2], pts[0]));
      const nn = norm(normal);
      if (nn < 1e-12) continue;
      const n = mul(normal, 1 / nn);
      const facing = dot(n, view.toward);
      const meanU = face.u.reduce((a, b) => a + b, 0) / face.u.length;
      const centre = mul(pts.reduce(add, [0, 0, 0]), 1 / pts.length);
      let colour;
      if (pass === "silhouette") colour = [0, 0, 0];
      else if (pass === "index") colour = partColour(partIds.get(node.part ?? node.id));
      else {
        let slot = node.slot;
        let pigment = palette.length === 1 ? palette[0] : meanU < 0.5 ? palette[0] : palette[1];
        let slotKey = palette.length === 1 ? slot : `${slot}-${meanU < 0.5 ? 1 : 2}`;
        let marked = false, field = null;
        const mark = (name) => { if (!options.field || options.field === name) { marked = true; field = name; } };
        if (region) {
          const lp = localPoint(node, centre);
          const vAngle = (Math.atan2(lp[2] / node.radii[2], lp[1] / node.radii[1]) / (2 * Math.PI) + 1) % 1;
          if (scene.belly && scene.slots.belly && lp[2] < -0.35 * node.radii[2] && !node.up) { slot = "belly"; pigment = scene.slots.belly[0]; slotKey = "belly"; if (pass === "markings") mark("belly"); }
          if (scene.markings && markingAt(scene.markings, meanU, vAngle)) mark("coat");
        }
        if (node.role === "thin-surface" && scene.flapMarking && node.part === "flap") {
          const spots = scene.flapMarking !== "bars", bars = scene.flapMarking !== "spots";
          if ((spots && Math.abs(meanU - 0.6) < 0.12) || (bars && Math.abs(meanU - 0.35) < 0.06)) mark("flaps");
        }
        if (node.part === "head" && scene.mask && scene.slots.mask) {
          const lp = localPoint(node, centre);
          const inMask = scene.mask === "band" ? lp[0] < -0.25 * node.radii[0] && Math.abs(lp[2]) < 0.45 * node.radii[2] : lp[0] < -0.3 * node.radii[0] && Math.abs(lp[1]) < 0.22 * node.radii[1];
          if (inMask) { slot = "mask"; pigment = scene.slots.mask[0]; slotKey = "mask"; if (pass === "markings") mark("mask"); }
        }
        if (node.part === "tail" && scene.tailRings && node.role === "axial-tail") {
          const n = scene.tailRings;
          const ring = n === 1 ? meanU > 0.78 : Array.from({ length: n }, (_, k) => (k + 1) / (n + 1)).some((c) => Math.abs(meanU - c) < 0.5 / (n + 1) * 0.45);
          if (ring) { slot = "second"; pigment = scene.slots.second[0]; slotKey = "ring"; if (pass === "markings") mark("rings"); }
        }
        if (node.part === "shell" && scene.shellPlates) { const lp = localPoint(node, centre); if ((Math.floor((lp[0] / node.radii[0] + 1) * 3) + Math.floor((lp[1] / node.radii[1] + 1) * 3)) % 2 === 0) mark("shell"); }
        if (node.part === "cap" && scene.capSpots) { const lp = localPoint(node, centre); if (Math.abs(((lp[0] / node.radii[0]) * 3) % 1 - 0.5) < 0.2 && Math.abs(((lp[1] / node.radii[1]) * 3 + 0.5) % 1 - 0.5) < 0.2) mark("cap"); }
        if (pass === "slots") colour = slotColours[slot] ? slotColours[slot].map((c, i) => (slotKey.endsWith("-2") ? Math.round(c * 0.7) : c)) : [128, 128, 128];
        else if (pass === "markings") colour = marked && (!options.field || field === options.field) ? [255, 255, 255] : [0, 0, 0];
        else {
          const base = node.ink ? hex(node.ink) : hex(pigment);
          const lambert = Math.max(0, dot(n, LIGHT));
          const shade = 0.42 + 0.58 * lambert + (scene.covering?.sheen ?? 0) * 0.35 * Math.pow(Math.max(0, dot(n, unit(add(LIGHT, view.toward)))), 24);
          colour = base.map((c) => Math.min(255, Math.round(c * shade)));
          if (scene.covering?.charged && node.opacity < 1) colour = colour.map((c, i) => Math.min(255, Math.round(c + ([255, 240, 160][i] - c) * 0.45 * (scene.covering.emission ?? 0.5))));
          if (marked) colour = colour.map((c) => Math.round(c + (232 - c) * (scene.markings?.contrast ?? 0.6)));
        }
      }
      fillPolygon(pts.map(project), colour, facing, opacity, rgb, depth, index, nodeIndex.get(node.id), W, H, pass);
    }
  }
  return { width: W, height: H, data: rgb, depth, index, pass, view: camera.view };
}

function fillPolygon(poly, colour, facing, opacity, rgb, depth, index, nodeId, W, H, pass) {
  let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity;
  for (const p of poly) { if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1]; if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0]; }
  const y0 = Math.max(0, Math.ceil(minY - 0.5)), y1 = Math.min(H - 1, Math.floor(maxY - 0.5));
  const x0 = Math.max(0, Math.ceil(minX - 0.5)), x1 = Math.min(W - 1, Math.floor(maxX - 0.5));
  if (y0 > y1 || x0 > x1) return;
  // depth plane from the first three vertices (polygons are planar)
  const [a, b, c] = poly;
  const det = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]);
  const n = poly.length;
  for (let y = y0; y <= y1; y++) {
    const py = y + 0.5;
    const xs = [];
    for (let i = 0; i < n; i++) {
      const p = poly[i], q = poly[(i + 1) % n];
      if ((p[1] <= py && q[1] > py) || (q[1] <= py && p[1] > py)) xs.push(p[0] + ((py - p[1]) / (q[1] - p[1])) * (q[0] - p[0]));
    }
    xs.sort((u, v) => u - v);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const xa = Math.max(x0, Math.ceil(xs[k] - 0.5)), xb = Math.min(x1, Math.floor(xs[k + 1] - 0.5));
      for (let x = xa; x <= xb; x++) {
        const px = x + 0.5;
        let z;
        if (Math.abs(det) < 1e-9) z = a[2];
        else {
          const l1 = ((b[0] - px) * (c[1] - py) - (c[0] - px) * (b[1] - py)) / det;
          const l2 = ((c[0] - px) * (a[1] - py) - (a[0] - px) * (c[1] - py)) / det;
          z = l1 * a[2] + l2 * b[2] + (1 - l1 - l2) * c[2];
        }
        const i = y * W + x;
        if (opacity < 1 && pass !== "silhouette" && BAYER[y & 3][x & 3] / 16 >= opacity) continue;
        if (z > depth[i]) {
          depth[i] = z; index[i] = nodeId;
          rgb[i * 4] = colour[0]; rgb[i * 4 + 1] = colour[1]; rgb[i * 4 + 2] = colour[2]; rgb[i * 4 + 3] = 255;
        }
      }
    }
  }
}

// The marking fields a body carries, each rendered as its own mask by render(..., "markings", { field }).
export function markingFields(scene) {
  const fields = [];
  if (scene.markings) fields.push("coat");
  if (scene.flapMarking) fields.push("flaps");
  if (scene.capSpots) fields.push("cap");
  if (scene.mask) fields.push("mask");
  if (scene.tailRings) fields.push("rings");
  if (scene.shellPlates) fields.push("shell");
  if (scene.belly) fields.push("belly");
  return fields;
}
// The pigment slots a body carries, with the flat colours the slot map uses for them.
export function slotLegend(scene) {
  const names = Object.keys(scene.slots).filter((k) => scene.slots[k]);
  const flat = [[220, 80, 60], [60, 140, 220], [240, 230, 200], [40, 40, 50], [230, 150, 60], [255, 240, 120], [90, 180, 90], [200, 120, 200]];
  return names.map((name, i) => ({ slot: name, pigments: scene.slots[name], flat: flat[i % 8], secondHalf: scene.slots[name].length > 1 ? flat[i % 8].map((c) => Math.round(c * 0.7)) : null }));
}

// Silhouette as a bit mask (1 = body), fitted and centred in a square of `n` pixels.
export function silhouetteMask(scene, viewName, n = 48) {
  const camera = fitCamera(scene, viewName, [n, n], 0.04);
  const image = render(scene, camera, "silhouette");
  const mask = new Uint8Array(n * n);
  for (let i = 0; i < n * n; i++) mask[i] = image.data[i * 4] < 128 ? 1 : 0;
  return mask;
}

// The part class a node belongs to, for the kind check's part measures (targets.mjs).
export function partClass(node) {
  const part = node.part ?? node.id, role = node.role;
  if (part === "head") return "head";
  if (part === "muzzle" || part === "beak") return "muzzle";
  if (part === "ear") return "ear";
  if (part === "tail") return "tail";
  if (part.startsWith("leg-") || part === "ray") return "leg";
  if (part === "crown" || part === "horn") return "crest";
  if (part === "antenna") return "antenna";
  if (part === "flap" || part === "cap") return "flap";
  if (part === "shell" || part === "wing-case") return "shell";
  if (part === "skirt") return "skirt";
  if (part === "leaf") return "leaf";
  if (part === "eye") return "head";
  if (role === "free-chain" || role === "chain-joint") return "feeler";
  return "body";
}
// The silhouette split by part class: { all, parts: { class: mask } }, fitted like silhouetteMask.
export function partMasks(scene, viewName, n = 48) {
  const camera = fitCamera(scene, viewName, [n, n], 0.04);
  const image = render(scene, camera, "silhouette");
  const classOf = new Map(scene.nodes.map((node, i) => [i + 1, partClass(node)]));
  const all = new Uint8Array(n * n), parts = {};
  for (let i = 0; i < n * n; i++) {
    if (image.data[i * 4] >= 128) continue;
    all[i] = 1;
    const c = classOf.get(image.index[i]) ?? "body";
    (parts[c] ??= new Uint8Array(n * n))[i] = 1;
  }
  return { all, parts };
}

// Shape distance between two masks: 1 − IoU after each is fitted into the same box. Zero means
// the same silhouette; two bodies of different kinds sit well above 0.3.
export function maskDistance(a, b) {
  let inter = 0, union = 0;
  for (let i = 0; i < a.length; i++) { if (a[i] && b[i]) inter++; if (a[i] || b[i]) union++; }
  return union ? 1 - inter / union : 0;
}
