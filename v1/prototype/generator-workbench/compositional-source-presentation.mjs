// Camera and lighting consume the retained solid; they never move an attachment.
// Actual geometry fragments and base inks remain in the source, before shading.
// Only primary region owners receive scales in this version. Optional heads,
// chains and sheets keep their declared smooth materials.
import { add, sub, mul, dot, cross, unit } from "./anatomical-source-construction.mjs";
import { localPoint } from "./compositional-source-construction.mjs";
const right = [Math.sqrt(3) / 2, -0.5, 0];
const up = [0.25, Math.sqrt(3) / 4, Math.sqrt(3) / 2];
const towardViewer = cross(right, up);
const light = unit([-0.55, -0.6, 0.8]);
const project = (point) => [dot(point, right), -dot(point, up)];
const center = (points) => mul(points.reduce(add, [0, 0, 0]), 1 / points.length);
function clipField(polygon, threshold, below) {
  const output = [];
  for (let index = 0; index < polygon.length; index++) {
    const a = polygon[index], b = polygon[(index + 1) % polygon.length];
    const aInside = below ? a.u <= threshold : a.u >= threshold;
    const bInside = below ? b.u <= threshold : b.u >= threshold;
    if (aInside) output.push(a);
    if (aInside !== bInside) {
      const fraction = (threshold - a.u) / (b.u - a.u);
      output.push({ point: add(a.point, mul(sub(b.point, a.point), fraction)), u: threshold });
    }
  }
  return output;
}
function realizePigmentFields(scene) {
  for (const owner of scene.nodes) {
    owner.surfaceFragments = [];
    for (const face of owner.mesh.faces) {
      const polygon = face.vertices.map((index, i) => ({ point: owner.mesh.vertices[index], u: face.u[i] }));
      const fields = owner.palette.length === 1 ? [{ polygon, pigment: owner.palette[0], interval: [0, 1] }] : [
        { polygon: clipField(polygon, 0.5, true), pigment: owner.palette[0], interval: [0, 0.5] },
        { polygon: clipField(polygon, 0.5, false), pigment: owner.palette[1], interval: [0.5, 1] }
      ];
      for (const field of fields) if (field.polygon.length >= 3) owner.surfaceFragments.push({ points: field.polygon.map((p) => p.point), u: field.polygon.map((p) => p.u), basePigment: field.pigment, localInterval: field.interval });
    }
  }
  return scene;
}
function clipPlane(polygon, signedDistance, keepPositive) {
  const output = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    const da = signedDistance(a.point), db = signedDistance(b.point);
    const ia = keepPositive ? da >= -1e-10 : da <= 1e-10, ib = keepPositive ? db >= -1e-10 : db <= 1e-10;
    if (ia) output.push(a);
    if (ia !== ib) {
      const t = da / (da - db);
      output.push({ point: add(a.point, mul(sub(b.point, a.point), t)), u: a.u + (b.u - a.u) * t });
    }
  }
  return output;
}
function realizeMaterialFields(scene, values, facts, convention) {
  const kind = values["covering.kind"], extent = values["covering.localExtent"], size = values["covering.localScaleLength"];
  const owners = scene.nodes.filter((owner) => owner.role === "primary-region");
  const cells = [];
  const materialSources = facts.filter((f) => f.state === "expressed" && f.target?.startsWith("covering.")).map((f) => f.locusId);
  for (const owner of scene.nodes) owner.material = { kind: owner.role === "thin-surface" ? "smooth-thin-surface" : "smooth-skin", profileVersion: convention.profile };
  if (kind === "scales") for (const owner of owners) {
    const output = [], start = convention.startU, end = start + extent;
    const masks = [];
    const rows = Math.ceil(extent / size);
    owner.material = { kind: "scales", base: "smooth-skin", profileVersion: convention.profile, sources: materialSources, localInterval: [start, end], rows, bands: 3, exclusions: masks };
    for (let row = 0; row < rows; row++) for (let band = 0; band < 3; band++) cells.push({ owner: owner.id, row, band, interval: [start + row * size, Math.min(end, start + (row + 1) * size)], fragments: [] });
    for (const fragment of owner.surfaceFragments) {
      const polygon = fragment.points.map((point, i) => ({ point, u: fragment.u[i] }));
      const append = (poly, material, cell = null) => {
        const samePoint = (a, b) => a.point.every((coordinate, index) => Math.abs(coordinate - b.point[index]) < 1e-10);
        poly = poly.filter((point, index) => !index || !samePoint(point, poly[index - 1]));
        if (poly.length > 1 && samePoint(poly[0], poly.at(-1))) poly.pop();
        if (poly.length < 3 || !poly.slice(1, -1).some((point, index) => Math.hypot(...cross(sub(point.point, poly[0].point), sub(poly[index + 2].point, poly[0].point))) > 1e-12)) return;
        const part = { ...fragment, points: poly.map((p) => p.point), u: poly.map((p) => p.u), material };
        output.push(part);
        if (cell) cell.fragments.push(output.length - 1);
      };
      append(clipField(polygon, start, true), "smooth");
      append(clipField(polygon, end, false), "smooth");
      for (const cell of cells.filter((c) => c.owner === owner.id)) {
        let piece = clipField(clipField(polygon, cell.interval[0], false), cell.interval[1], true);
        const a = cell.band * 2 * Math.PI / 3, b = (cell.band + 1) * 2 * Math.PI / 3;
        const y = (p) => localPoint(owner, p)[1] / owner.radii[1], z = (p) => localPoint(owner, p)[2] / owner.radii[2];
        piece = clipPlane(piece, (p) => Math.cos(a) * z(p) - Math.sin(a) * y(p), true);
        piece = clipPlane(piece, (p) => Math.cos(b) * z(p) - Math.sin(b) * y(p), false);
        append(piece, "scales", cell);
      }
    }
    owner.surfaceFragments = output;
  }
  if (cells.length > convention.maximumCells) throw new Error("Material cell bound exceeded");
  scene.covering = { profileVersion: convention.profile, kind, sources: materialSources, owners: owners.map((n) => n.id), cells };
  return scene;
}
function shade(hex, amount) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error("Unsupported source pigment");
  return `#${[1, 3, 5].map((index) => Math.round(parseInt(hex.slice(index, index + 2), 16) * amount).toString(16).padStart(2, "0")).join("")}`;
}
function compositionalSourceReference(scene) {
  if (scene.status !== "constructed" || !["compositional-source/1", "compositional-source/2"].includes(scene.profileVersion)) throw new Error("Unsupported compositional construction");
  const polygons = [];
  for (const owner of scene.nodes) for (const fragment of owner.surfaceFragments) {
    const points = fragment.points, centroid = center(points);
    let rawNormal = null;
    for (let index = 1; index < points.length - 1; index++) {
      const candidate = cross(sub(points[index], points[0]), sub(points[index + 1], points[0]));
      if (Math.hypot(...candidate) > 1e-12) {
        rawNormal = candidate;
        break;
      }
    }
    if (!rawNormal) continue;
    let normal = unit(rawNormal);
    const referenceCenter = owner.center ?? (owner.root && owner.end ? mul(add(owner.root, owner.end), 0.5) : center(owner.mesh.vertices));
    if (dot(normal, sub(centroid, referenceCenter)) < 0) normal = mul(normal, -1);
    if (dot(normal, towardViewer) <= 0) continue;
    polygons.push({ points: points.map(project), depth: dot(centroid, towardViewer), fill: shade(fragment.basePigment, 0.75 + 0.25 * Math.max(0, dot(normal, light))), owner: owner.id, material: fragment.material ?? "smooth" });
  }
  const projected = scene.nodes.flatMap((owner) => owner.mesh.vertices.map(project));
  const minimumX = Math.min(...projected.map((p) => p[0])), maximumX = Math.max(...projected.map((p) => p[0]));
  const minimumY = Math.min(...projected.map((p) => p[1])), maximumY = Math.max(...projected.map((p) => p[1]));
  const side = Math.max(maximumX - minimumX, maximumY - minimumY) * 1.12;
  if (!Number.isFinite(side) || side <= 0) throw new Error("Invalid source camera");
  const scale = 456 / side, offsetX = 256 - (minimumX + maximumX) * scale / 2, offsetY = 256 - (minimumY + maximumY) * scale / 2;
  polygons.sort((a, b) => a.depth - b.depth);
  const shapes = polygons.map((p) => `<polygon data-owner="${p.owner}" points="${p.points.map(([x, y]) => `${(x * scale + offsetX).toFixed(3)},${(y * scale + offsetY).toFixed(3)}`).join(" ")}" fill="${p.fill}" stroke="${p.material === "scales" ? shade(p.fill, 0.8) : p.fill}" stroke-width="${p.material === "scales" ? 0.75 : 0.4}" stroke-linejoin="round"/>`).join("");
  return { status: "constructed", profileVersion: scene.profileVersion === "compositional-source/2" ? "compositional-reference/2" : "compositional-reference/1", camera: { right, up, towardViewer, framing: "own-source bounds" }, mapping: { scale, offsetX, offsetY }, svg: `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><title>Provisional compositional source</title><rect width="512" height="512" fill="#f7f3e8"/>${shapes}</svg>` };
}
export {
  compositionalSourceReference,
  realizeMaterialFields,
  realizePigmentFields
};
