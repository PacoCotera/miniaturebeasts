
import { add, sub, mul, dot, cross, unit } from "./anatomical-source-construction.mjs";
import { realizeMaterialFields } from "./compositional-source-presentation.mjs";
import { meshEnvelope, localPoint, localVector, worldPoint, FUR_DEPICTION_PROFILE } from "./compositional-vocabulary-construction.mjs";
import { VOCABULARY_CONTENT, VOCABULARY_PROFILE } from "./compositional-vocabulary-package.mjs";
function clipLocalU(points, owner, threshold, below) {
  const u = (point) => (localPoint(owner, point)[0] / owner.radii[0] + 1) / 2;
  const output = [];
  for (let index = 0; index < points.length; index++) {
    const start = points[index], end = points[(index + 1) % points.length];
    const startU = u(start), endU = u(end);
    const startInside = below ? startU <= threshold : startU >= threshold;
    const endInside = below ? endU <= threshold : endU >= threshold;
    if (startInside) output.push(start);
    if (startInside !== endInside) output.push(add(start, mul(sub(end, start), (threshold - startU) / (endU - startU))));
  }
  const same = (a, b) => a.every((coordinate, index) => Math.abs(coordinate - b[index]) < 1e-10);
  const unique = output.filter((point, index) => !index || !same(point, output[index - 1]));
  if (unique.length > 1 && same(unique[0], unique.at(-1))) unique.pop();
  return unique;
}
function realizeVocabularyMaterials(scene, values, facts) {
  const content = VOCABULARY_CONTENT;
  const furPresence = facts.find((fact) => fact.target === "covering.furEnabled");
  if (!values["covering.furEnabled"]) {
    const result = realizeMaterialFields(scene, values, facts, {
      profile: content.materialProfile,
      startU: 0.2,
      maximumCells: content.limits.materialCells
    });
    result.covering.sources.push(furPresence.locusId);
    result.covering.fur = { enabled: false, coverage: "none", potentialRibbons: 0 };
    return result;
  }
  const furSources = facts.filter((fact) => fact.state === "expressed" && ["covering.furEnabled", "fur.lengthOverMinTransverseRadius", "fur.tangentAngleRadians"].includes(fact.target)).map((fact) => fact.locusId);
  const owners = scene.nodes.filter((owner) => owner.role === "primary-region");
  const ribbons = [];
  for (const owner of scene.nodes) owner.material = { kind: owner.role === "thin-surface" ? "smooth-thin-surface" : "smooth-skin", profileVersion: content.materialProfile };
  for (const owner of owners) {
    owner.material = {
      kind: "fur",
      base: "smooth-skin",
      profileVersion: content.materialProfile,
      sources: furSources,
      localInterval: [0, 1]
    };
    const envelope = meshEnvelope(owner);
    const length = values["fur.lengthOverMinTransverseRadius"] * Math.min(owner.radii[1], owner.radii[2]);
    for (let row = 0; row < 4; row++) for (let band = 0; band < 12; band++) {
      const u = (row + 0.5) / 4, angle = 2 * Math.PI * (band + 0.5) / 12;
      const origin = worldPoint(owner, [(2 * u - 1) * owner.radii[0], 0, 0]);
      const hit = envelope.rayHit(origin, localVector(owner.frame, [0, Math.cos(angle), Math.sin(angle)]));
      const root = hit.position, normal = hit.normal;
      const localAxial = owner.frame[0];
      const circumferentialDirection = localVector(owner.frame, [0, -Math.sin(angle), Math.cos(angle)]);
      const projectedAxial = sub(localAxial, mul(normal, dot(localAxial, normal)));
      const fallback = Math.hypot(...projectedAxial) < 1e-10;
      const axial = fallback ? unit(sub(circumferentialDirection, mul(normal, dot(circumferentialDirection, normal)))) : unit(projectedAxial);
      let circumferential = unit(cross(normal, axial));
      if (dot(circumferential, circumferentialDirection) < 0) circumferential = mul(circumferential, -1);
      const flowAngle = values["fur.tangentAngleRadians"];
      const flow = add(mul(axial, Math.cos(flowAngle)), mul(circumferential, Math.sin(flowAngle)));
      const widthDirection = unit(cross(normal, flow));
      const tip = add(root, add(mul(flow, length), mul(normal, 0.1 * length)));
      const potentialPoints = [sub(root, mul(widthDirection, 0.035 * length)), add(root, mul(widthDirection, 0.035 * length)), add(tip, mul(widthDirection, 7e-3 * length)), sub(tip, mul(widthDirection, 7e-3 * length))];
      const interval = owner.palette.length === 1 ? [0, 1] : u < 0.5 ? [0, 0.5] : [0.5, 1];
      const points = clipLocalU(clipLocalU(potentialPoints, owner, interval[0], false), owner, interval[1], true);
      if (points.length < 3 || points.length > content.conventions.fur.maximumClippedVertices) throw new Error(
        "Invalid clipped fur ribbon"
      );
      if (points.some((point) => point.some((coordinate) => !Number.isFinite(coordinate) || Math.abs(coordinate) >= content.limits.absoluteCoordinate))) throw new Error("Fur coordinate bound exceeded");
      const pigment = owner.palette[owner.palette.length === 1 || u < 0.5 ? 0 : 1];
      const fragmentIndex = owner.surfaceFragments.length;
      owner.surfaceFragments.push({ points, u: points.map((point) => (localPoint(owner, point)[0] / owner.radii[0] + 1) / 2), basePigment: pigment, localInterval: interval, material: "fur", facetNormal: normal, sources: [
        ...furSources,
        ...owner.sources
      ] });
      ribbons.push({
        owner: owner.id,
        row,
        band,
        rootU: u,
        azimuth: angle,
        root,
        facetIndex: hit.facetIndex,
        normal,
        tangentFrame: { axial, circumferential, flow, widthDirection, fallback },
        potentialLength: length,
        potentialPoints,
        fragmentIndex,
        visibleInterval: interval,
        clipping: "owner u0\u20131 and exact root pigment half-field",
        sources: furSources
      });
    }
  }
  if (ribbons.length > content.conventions.fur.maximumRibbons) throw new Error("Fur ribbon bound exceeded");
  scene.covering = { profileVersion: content.materialProfile, kind: "fur", sources: furSources, owners: owners.map((owner) => owner.id), cells: [], fur: { enabled: true, localInterval: [0, 1], ribbons, potentialRibbons: ribbons.length, maximumRibbons: content.conventions.fur.maximumRibbons } };
  return scene;
}
const right = [Math.sqrt(3) / 2, -0.5, 0];
const up = [0.25, Math.sqrt(3) / 4, Math.sqrt(3) / 2];
const towardViewer = cross(right, up);
const light = unit([-0.55, -0.6, 0.8]);
const project = (point) => [dot(point, right), -dot(point, up)];
const center = (points) => mul(points.reduce(add, [0, 0, 0]), 1 / points.length);
function shade(hex, amount) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error("Unsupported source pigment");
  return `#${[1, 3, 5].map((index) => Math.round(parseInt(hex.slice(index, index + 2), 16) * amount).toString(
    16
  ).padStart(2, "0")).join("")}`;
}
function vocabularySourceReference(scene) {
  if (scene.status !== "constructed" || scene.profileVersion !== VOCABULARY_PROFILE || scene.covering.profileVersion !== VOCABULARY_CONTENT.materialProfile) throw new Error("Unsupported vocabulary source/reference identity");
  const polygons = [];
  for (const owner of scene.nodes) for (const fragment of owner.surfaceFragments) {
    const points = fragment.points, centroid = center(points);
    let rawNormal = fragment.facetNormal ?? null;
    for (let index = 1; !rawNormal && index < points.length - 1; index++) {
      const candidate = cross(sub(points[index], points[0]), sub(points[index + 1], points[0]));
      if (Math.hypot(...candidate) > 1e-12) rawNormal = candidate;
    }
    if (!rawNormal) continue;
    let normal = unit(rawNormal);
    const referenceCenter = owner.center ?? center(owner.mesh.vertices);
    if (dot(normal, sub(centroid, referenceCenter)) < 0) normal = mul(normal, -1);
    if (dot(normal, towardViewer) <= 0) continue;
    polygons.push({ points: points.map(project), depth: dot(centroid, towardViewer), fill: shade(
      fragment.basePigment,
      0.75 + 0.25 * Math.max(0, dot(normal, light))
    ), owner: owner.id, material: fragment.material ?? "smooth" });
  }
  const projected = scene.nodes.flatMap((owner) => [...owner.mesh.vertices, ...owner.surfaceFragments.flatMap(
    (fragment) => fragment.points
  )].map(project));
  const minimumX = Math.min(...projected.map((point) => point[0])), maximumX = Math.max(...projected.map((point) => point[0]));
  const minimumY = Math.min(...projected.map((point) => point[1])), maximumY = Math.max(...projected.map((point) => point[1]));
  const side = Math.max(maximumX - minimumX, maximumY - minimumY) * 1.12;
  if (!Number.isFinite(side) || side <= 0) throw new Error("Invalid vocabulary source camera");
  const scale = 456 / side, offsetX = 256 - (minimumX + maximumX) * scale / 2, offsetY = 256 - (minimumY + maximumY) * scale / 2;
  polygons.sort((a, b) => a.depth - b.depth);
  const shapes = polygons.map((polygon) => `<polygon data-owner="${polygon.owner}" data-material="${polygon.material}" points="${polygon.points.map(([x, y]) => `${(x * scale + offsetX).toFixed(3)},${(y * scale + offsetY).toFixed(
    3
  )}`).join(" ")}" fill="${polygon.fill}" stroke="${polygon.material === "scales" ? shade(polygon.fill, 0.8) : polygon.fill}" stroke-width="${polygon.material === "scales" ? 0.75 : 0.4}" stroke-linejoin="round"/>`).join(
    ""
  );
  return { status: "constructed", profileVersion: VOCABULARY_CONTENT.referenceProfile, camera: {
    right,
    up,
    towardViewer,
    framing: "own-source and visible material bounds"
  }, mapping: { scale, offsetX, offsetY }, svg: `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><title>Provisional compositional vocabulary source</title><rect width="512" height="512" fill="#f7f3e8"/>${shapes}</svg>` };
}
function vocabularyFurReference(scene) {
  if (scene.status !== "constructed" || scene.profileVersion !== FUR_DEPICTION_PROFILE || scene.covering.profileVersion !== VOCABULARY_CONTENT.materialProfile) {
    throw new Error("Unsupported fur depiction source/reference identity");
  }
  // Reuse the original trusted renderer without changing its geometry, camera
  // or light. Only its exact generated fur-polygon attributes are transformed.
  const original = vocabularySourceReference({ ...scene, profileVersion: VOCABULARY_PROFILE });
  const expectedFurPolygons = (original.svg.match(/data-material="fur"/g) ?? []).length;
  let changedFurPolygons = 0;
  const furPolygon = /(<polygon data-owner="[a-z0-9-]+" data-material="fur" points="[^"]+" fill="(#[0-9a-f]{6})" )stroke="\2" stroke-width="0\.4"( stroke-linejoin="round"\/>)/g;
  const svg = original.svg.replace(furPolygon, (_, prefix, fill, suffix) => {
    changedFurPolygons++;
    return `${prefix}stroke="${shade(fill, 0.8)}" stroke-width="0.7"${suffix}`;
  });
  if (changedFurPolygons !== expectedFurPolygons) {
    throw new Error("Unsupported generated fur-polygon attributes");
  }
  return { ...original, profileVersion: "compositional-reference/4", svg };
}
export {
  realizeVocabularyMaterials,
  vocabularySourceReference,
  vocabularyFurReference
};
