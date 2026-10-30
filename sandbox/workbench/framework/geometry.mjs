// Vector helpers and the finite solid operators the rig builds bodies from. The ring solid
// (superellipse cross-section with the ovoid, barrel and tapered longitudinal weights), the 6×12
// ellipsoid, the eight-sided tapered segment and the thin quad sheet carry the exact v1 meshes
// (v1/prototype/generator-workbench/compositional-vocabulary-construction.mjs `ringSolid`,
// `ellipsoid`, `segment`; the sheet from the wing construction), reorganised to take an explicit
// frame and axis. The convex-envelope test is v1's `meshEnvelope`.
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norm = (a) => Math.hypot(a[0], a[1], a[2]);
export function unit(v) {
  const n = norm(v);
  if (!Number.isFinite(n) || n <= 1e-10) throw new Error("degenerate vector");
  return mul(v, 1 / n);
}
export const IDENTITY = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
export const localVector = (frame, v) => add(add(mul(frame[0], v[0]), mul(frame[1], v[1])), mul(frame[2], v[2]));
export const worldPoint = (node, p) => add(node.center, localVector(node.frame, p));
export const localPoint = (node, p) => { const d = sub(p, node.center); return [dot(d, node.frame[0]), dot(d, node.frame[1]), dot(d, node.frame[2])]; };
export function frameAlong(direction, upHint = [0, 0, 1]) {
  const x = unit(direction);
  const hint = Math.abs(dot(x, upHint)) < 0.9 ? upHint : [0, 1, 0];
  const y = unit(cross(hint, x));
  return [x, y, cross(x, y)];
}
export const rotateZ = (p, a) => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a), p[2]];
export const rotateFrameZ = (frame, a) => frame.map((axis) => rotateZ(axis, a));
export const lerp = (a, b, t) => a + (b - a) * t;

const LIMIT = 1000;
export function addFace(node, points, u, outward = null) {
  if (points.some((p) => p.some((c) => !Number.isFinite(c) || Math.abs(c) >= LIMIT))) throw new Error(`invalid coordinates on ${node.id}`);
  const n = cross(sub(points[1], points[0]), sub(points[2], points[0]));
  if (norm(n) < 1e-12) return;
  if (outward && dot(n, outward) < 0) { points = [...points].reverse(); u = [...u].reverse(); }
  const vertices = points.map((p) => {
    const key = p.map((c) => c.toFixed(9)).join(",");
    let index = node.mesh.index.get(key);
    if (index === undefined) { index = node.mesh.vertices.length; node.mesh.vertices.push(p); node.mesh.index.set(key, index); }
    return index;
  });
  node.mesh.faces.push({ vertices, u });
}

export function newNode(id, role, parent, slot, frame = IDENTITY) {
  return { id, role, parent, slot, frame, center: [0, 0, 0], radii: null, mesh: { vertices: [], faces: [], index: new Map() }, attachment: null };
}

// Longitudinal weights, exactly as v1 declares them.
const TAPER_MAX_AT = (0.78 - Math.sqrt(0.78 ** 2 + 8 * 0.22 ** 2)) / (4 * 0.22);
const taperWeight = (t) => Math.sqrt(Math.max(0, 1 - t * t)) * (0.78 - 0.22 * t);
const TAPER_MAX = taperWeight(TAPER_MAX_AT);
export function longitudinalWeight(form, t) {
  if (form === "ovoid") return Math.sqrt(Math.max(0, 1 - t * t));
  if (form === "barrel") return Math.abs(t) <= 0.55 ? 1 : Math.sqrt(Math.max(0, 1 - ((Math.abs(t) - 0.55) / 0.45) ** 2));
  if (form === "tapered") return taperWeight(t) / TAPER_MAX;
  if (form === "blunt-pad") return Math.max(0, 1 - t ** 4) ** 0.25;
  throw new Error(`longitudinal form ${form}`);
}
const STATIONS = [-1, -0.82, -0.6, -0.35, 0, 0.35, 0.6, 0.82, 1];

// A ring solid: `radii` = [along the frame's first axis, second, third]; form and cross exponent as v1.
// `bulge` swells the front of the solid (t = -1) and thins the back: a chest on a walker.
export function ringSolid(node, radii, form, crossExponent = 2, bulge = 0) {
  if (radii.some((r) => !Number.isFinite(r) || r <= 0)) throw new Error(`invalid radii on ${node.id}`);
  node.radii = radii;
  node.shape = { kind: "ring", form, crossExponent, bulge };
  const stations = [...STATIONS];
  if (form === "tapered" && !stations.includes(TAPER_MAX_AT)) stations.push(TAPER_MAX_AT);
  stations.sort((a, b) => a - b);
  const signedPower = (c) => Math.sign(c) * Math.abs(c) ** (2 / crossExponent);
  const point = (t, sector) => {
    const s = sector % 12, angle = (s * 2 * Math.PI) / 12;
    const cs = s === 3 || s === 9 ? 0 : Math.cos(angle), sn = s === 0 || s === 6 ? 0 : Math.sin(angle);
    const w = longitudinalWeight(form, t) * (1 + bulge * (0.5 - 0.5 * t));
    return worldPoint(node, [t * radii[0], radii[1] * w * signedPower(cs), radii[2] * w * signedPower(sn)]);
  };
  for (let i = 0; i < stations.length - 1; i++) {
    const lo = stations[i], hi = stations[i + 1];
    for (let s = 0; s < 12; s++) {
      const pts = lo === -1 ? [point(lo, 0), point(hi, s + 1), point(hi, s)] : hi === 1 ? [point(lo, s), point(lo, s + 1), point(hi, 0)] : [point(lo, s), point(lo, s + 1), point(hi, s + 1), point(hi, s)];
      addFace(node, pts, pts.map((p) => (localPoint(node, p)[0] / radii[0] + 1) / 2));
    }
  }
  return node;
}

export function ellipsoid(node, radii, atlasAxis = 0) {
  if (radii.some((r) => !Number.isFinite(r) || r <= 0)) throw new Error(`invalid radii on ${node.id}`);
  node.radii = radii;
  node.shape = { kind: "ellipsoid" };
  const point = (lat, lon) => worldPoint(node, [radii[0] * Math.sin((lat * Math.PI) / 6) * Math.cos((lon * Math.PI) / 6), radii[1] * Math.sin((lat * Math.PI) / 6) * Math.sin((lon * Math.PI) / 6), radii[2] * Math.cos((lat * Math.PI) / 6)]);
  for (let lat = 0; lat < 6; lat++) for (let lon = 0; lon < 12; lon++) {
    const pts = lat === 0 ? [point(0, 0), point(1, lon), point(1, lon + 1)] : lat === 5 ? [point(5, lon), point(6, 0), point(5, lon + 1)] : [point(lat, lon), point(lat + 1, lon), point(lat + 1, lon + 1), point(lat, lon + 1)];
    addFace(node, pts, pts.map((p) => (localPoint(node, p)[atlasAxis] / radii[atlasAxis] + 1) / 2));
  }
  return node;
}

// A tapered eight-sided segment from start to end (v1 `segment`), with a slight bulge option.
export function segment(node, start, end, radius, tip) {
  const frame = frameAlong(sub(end, start));
  node.frame = frame; node.root = start; node.end = end; node.center = mul(add(start, end), 0.5);
  node.length = norm(sub(end, start)); node.sectionRadii = [radius, tip];
  node.radii = [node.length / 2, Math.max(radius, tip), Math.max(radius, tip)];
  node.shape = { kind: "segment" };
  const ring = (c, r, i) => add(c, localVector(frame, [0, r * Math.cos((i * Math.PI) / 4), r * Math.sin((i * Math.PI) / 4)]));
  for (let i = 0; i < 8; i++) addFace(node, [ring(start, radius, i), ring(start, radius, i + 1), ring(end, tip, i + 1), ring(end, tip, i)], [0, 0, 1, 1]);
  addFace(node, Array.from({ length: 8 }, (_, i) => ring(start, radius, 7 - i)), Array(8).fill(0));
  addFace(node, Array.from({ length: 8 }, (_, i) => ring(end, tip, i)), Array(8).fill(1));
  return node;
}

// A thin sheet through four corners (root edge first), with the given thickness along `normal`.
export function sheet(node, corners, normal, thickness) {
  node.shape = { kind: "sheet" };
  node.corners = corners; node.thickness = thickness;
  node.center = mul(corners.reduce(add, [0, 0, 0]), 1 / corners.length);
  const n = unit(normal);
  const up = corners.map((c) => add(c, mul(n, thickness / 2))), down = corners.map((c) => sub(c, mul(n, thickness / 2)));
  const uOf = corners.map((_, i) => (i < 2 ? 0 : 1));
  addFace(node, up, uOf, n);
  addFace(node, [...down].reverse(), [...uOf].reverse(), mul(n, -1));
  for (let i = 0; i < corners.length; i++) {
    const j = (i + 1) % corners.length;
    addFace(node, [down[i], down[j], up[j], up[i]], [uOf[i], uOf[j], uOf[j], uOf[i]], sub(mul(add(corners[i], corners[j]), 0.5), node.center));
  }
  const extent = corners.map((c) => norm(sub(c, node.center)));
  node.radii = [Math.max(...extent), Math.max(...extent), thickness];
  return node;
}

// A closed tapered sweep along a planar arc (v1 continuous-axial-tail-sweep/1), stations × 8.
export function sweep(node, root, frame, length, baseRadius, bend, stations = 6, tipOverBase = 0.16) {
  node.frame = frame; node.root = root; node.shape = { kind: "sweep" }; node.stations = [];
  const rings = [];
  const centers = [];
  for (let i = 0; i < stations; i++) {
    const u = i / (stations - 1), angle = bend * u;
    const axial = Math.abs(bend) < 1e-10 ? length * u : (length * Math.sin(angle)) / bend;
    const lift = Math.abs(bend) < 1e-10 ? 0 : (length * (1 - Math.cos(angle))) / bend;
    const c = add(root, localVector(frame, [axial, 0, lift]));
    const normal = localVector(frame, [-Math.sin(angle), 0, Math.cos(angle)]);
    const r = baseRadius * (1 - (1 - tipOverBase) * u);
    centers.push(c);
    node.stations = node.stations ?? [];
    node.stations.push({ center: c, radius: r, tangent: localVector(frame, [Math.cos(angle), 0, Math.sin(angle)]) });
    rings.push(Array.from({ length: 8 }, (_, k) => { const a = (k * 2 * Math.PI) / 8; return add(c, add(mul(frame[1], r * Math.cos(a)), mul(normal, r * Math.sin(a)))); }));
  }
  for (let s = 0; s < stations - 1; s++) for (let k = 0; k < 8; k++) {
    const n = (k + 1) % 8;
    const outward = sub(mul(add(add(rings[s][k], rings[s][n]), add(rings[s + 1][n], rings[s + 1][k])), 0.25), mul(add(centers[s], centers[s + 1]), 0.5));
    addFace(node, [rings[s][k], rings[s][n], rings[s + 1][n], rings[s + 1][k]], [s / (stations - 1), s / (stations - 1), (s + 1) / (stations - 1), (s + 1) / (stations - 1)], outward);
  }
  addFace(node, [...rings[0]].reverse(), Array(8).fill(0), sub(centers[0], centers[1]));
  addFace(node, rings.at(-1), Array(8).fill(1), sub(centers.at(-1), centers.at(-2)));
  node.center = mul(centers.reduce(add, [0, 0, 0]), 1 / centers.length);
  node.end = centers.at(-1);
  node.radii = [length / 2, baseRadius, baseRadius];
  node.length = length; node.baseRadius = baseRadius;
  return node;
}

// Convex envelope of a node's own mesh (v1 `meshEnvelope`): contains(point) and rayHit(origin, dir).
export function envelope(node) {
  const planes = [];
  for (const face of node.mesh.faces) {
    const pts = face.vertices.map((i) => node.mesh.vertices[i]);
    let n = cross(sub(pts[1], pts[0]), sub(pts[2], pts[0]));
    if (norm(n) < 1e-12) continue;
    n = unit(n);
    if (dot(n, sub(pts[0], node.center)) < 0) n = mul(n, -1);
    planes.push({ n, offset: dot(n, sub(pts[0], node.center)) });
  }
  const contains = (p, tolerance = 1e-9) => planes.every((pl) => dot(pl.n, sub(p, node.center)) <= pl.offset + tolerance);
  const rayHit = (origin, direction) => {
    let hit = null;
    for (const pl of planes) {
      const d = dot(pl.n, direction);
      if (d <= 1e-10) continue;
      const t = (pl.offset - dot(pl.n, sub(origin, node.center))) / d;
      if (t <= 1e-10) continue;
      if (!hit || t < hit.t) hit = { t, position: add(origin, mul(direction, t)), normal: pl.n };
    }
    if (!hit || !contains(hit.position, 1e-6)) throw new Error(`no facet root on ${node.id}`);
    return hit;
  };
  return { contains, rayHit, planes };
}

// Signed depth of a point inside a convex envelope: the smallest distance to any face plane,
// negative outside.
export function depthIn(env, node, p) {
  let d = Infinity;
  for (const pl of env.planes) d = Math.min(d, pl.offset - dot(pl.n, sub(p, node.center)));
  return d;
}
// The attachment witness between two solids (compositional-contract.md, "shared inside witness"):
// the point on the line between their centres that lies deepest inside both actual meshes.
// Throws when no point is inside both, which is a disconnected part.
export function sharedWitness(owner, child, envOwner = envelope(owner), envChild = envelope(child)) {
  let best = null;
  // Along the centre line first; then along the line from the child's centre towards the owner's
  // nearest surface point, which finds the overlap of a flat part (an eye rim) that sits on a surface.
  const candidates = [];
  for (let i = 0; i <= 40; i++) candidates.push(add(owner.center, mul(sub(child.center, owner.center), i / 40)));
  const toOwner = sub(owner.center, child.center);
  if (norm(toOwner) > 1e-9) {
    const dir = unit(toOwner);
    const reach = Math.max(...child.radii) * 1.5;
    for (let i = 0; i <= 40; i++) candidates.push(add(child.center, mul(dir, (reach * (i - 20)) / 20)));
  }
  // Declared roots and ends of either part are candidates too (a connector's caps sit exactly on them).
  for (const n of [owner, child]) for (const k of ["root", "end"]) if (n[k]) candidates.push(n[k]);
  for (const p of candidates) {
    const depth = Math.min(depthIn(envOwner, owner, p), depthIn(envChild, child, p));
    if (!best || depth > best.depth) best = { depth, p };
  }
  if (best.depth < -1e-9) throw new Error(`${child.id} is not connected to ${owner.id}`);
  return best.p;
}
// Point containment for any part: convex solids by their envelope, a bent sweep by its stations.
export function containsPoint(node, p, env = null, tolerance = 1e-9) {
  if (node.shape?.kind === "sweep") {
    const s = node.stations;
    for (let i = 0; i + 1 < s.length; i++) {
      const a = s[i].center, b = s[i + 1].center, ab = sub(b, a), len2 = dot(ab, ab);
      const t = len2 > 0 ? Math.max(0, Math.min(1, dot(sub(p, a), ab) / len2)) : 0;
      const q = add(a, mul(ab, t)), r = s[i].radius + (s[i + 1].radius - s[i].radius) * t;
      if (norm(sub(p, q)) <= r * 0.92 + tolerance) return true;
    }
    return false;
  }
  return (env ?? envelope(node)).contains(p, tolerance);
}
// A root on an owner's actual facets: the ray from `origin` (world) along `direction` hits the
// mesh (v1 meshEnvelope.rayHit); `inner` is the root moved inside by `inset`.
export function rootOn(owner, origin, direction, inset, env = envelope(owner)) {
  const dir = unit(direction);
  const hit = env.rayHit(origin, dir);
  const inner = sub(hit.position, mul(dir, inset));
  // The witness sits between the root and the surface: inside the owner by 0.6 inset and inside a
  // part that starts at `inner` by 0.4 inset along the root direction.
  return { surface: hit.position, inner, witness: add(inner, mul(dir, 0.4 * inset)), normal: hit.normal, direction: dir };
}
// Surface point of a superellipsoid-like node along a local direction (analytic, for placing a
// part before its actual root is solved).
export function surfaceAlong(node, localDir) {
  const d = unit(localDir);
  const w = node.radii;
  const k = 1 / Math.sqrt((d[0] / w[0]) ** 2 + (d[1] / w[1]) ** 2 + (d[2] / w[2]) ** 2);
  return worldPoint(node, mul(d, k * 0.98));
}

// A covering as a silhouette modifier: push every vertex out along its surface normal by `depth`;
// with `scallop`, alternate vertices go a little further and a little less, so fluff reads as a
// soft, broken edge rather than a bigger smooth solid. Only ever enlarges, so attachment witnesses
// stay inside. Applied to solids (ellipsoids, ring solids, sweeps), never to thin sheets.
export function inflate(node, depth, scallop = 0) {
  if (!node.radii || node.shape?.kind === "sheet" || node.shape?.kind === "pyramid" || node.shape?.kind === "wedge") return;
  const [rx, ry, rz] = node.radii;
  node.mesh.vertices = node.mesh.vertices.map((p, i) => {
    let n;
    if (node.shape?.kind === "sweep") {
      let best = null;
      for (const st of node.stations) { const d = norm(sub(p, st.center)); if (!best || d < best.d) best = { d, c: st.center }; }
      n = sub(p, best.c);
    } else {
      const l = localPoint(node, p);
      n = localVector(node.frame, [l[0] / (rx * rx), l[1] / (ry * ry), l[2] / (rz * rz)]);
    }
    if (norm(n) < 1e-9) return p;
    const k = depth * (scallop ? (i % 2 ? 1 + scallop : 1 - scallop) : 1);
    return add(p, mul(unit(n), k));
  });
  node.radii = [rx + depth, ry + depth, rz + depth];
  node.inflated = (node.inflated ?? 0) + depth;
}
