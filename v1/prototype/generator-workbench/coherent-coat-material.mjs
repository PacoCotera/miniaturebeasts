import { add, sub, mul, dot, cross, unit } from "./anatomical-source-construction.mjs";
import { localPoint, localVector, worldPoint } from "./compositional-vocabulary-construction.mjs";
import { bindAnatomicalRoleSurfaces } from "./anatomical-roles-presentation.mjs";
import { realizeVocabularyMaterials } from "./compositional-vocabulary-presentation.mjs";
import { COAT_CONTENT } from "./coherent-coat-package.mjs";

const smoothstep = (value) => value * value * (3 - 2 * value);
const average = (points) => mul(points.reduce(add, [0, 0, 0]), 1 / points.length);

function ownerMantle(owner, potentialLength, flowAngle, sources) {
  const convention = COAT_CONTENT.conventions.coat;
  const samples = new Map(), normalSums = owner.mesh.vertices.map(() => [0, 0, 0]);
  const baseTriangles = [];
  for (let facetIndex = 0; facetIndex < owner.mesh.faces.length; facetIndex++) {
    const face = owner.mesh.faces[facetIndex];
    const points = face.vertices.map((index) => owner.mesh.vertices[index]);
    let normal = unit(cross(sub(points[1], points[0]), sub(points[2], points[0])));
    if (dot(normal, sub(average(points), owner.center)) < 0) normal = mul(normal, -1);
    for (const index of face.vertices) normalSums[index] = add(normalSums[index], normal);
    for (let index = 1; index < face.vertices.length - 1; index++) {
      const vertices = [face.vertices[0], face.vertices[index], face.vertices[index + 1]];
      if (dot(cross(sub(owner.mesh.vertices[vertices[1]], owner.mesh.vertices[vertices[0]]),
        sub(owner.mesh.vertices[vertices[2]], owner.mesh.vertices[vertices[0]])), normal) < 0) vertices.reverse();
      baseTriangles.push({ vertices: vertices.map((vertex) => `v${vertex}`), facetIndex });
    }
  }
  function sample(id, position, normal, origin) {
    let local = localPoint(owner, position);
    let u = (local[0] / owner.radii[0] + 1) / 2;
    const boundary = [0, 0.5, 1].find((plane) => Math.abs(u - plane) < 1e-10);
    if (boundary !== undefined) {
      u = boundary;
      local[0] = (2 * u - 1) * owner.radii[0];
      position = worldPoint(owner, local);
    }
    const value = { id, originalPosition: position, u, normal: unit(normal), origin, boundary: boundary ?? null };
    samples.set(id, value);
    return value;
  }
  owner.mesh.vertices.forEach((position, index) => sample(`v${index}`, position, normalSums[index], { kind: "original-vertex", vertexIndex: index }));
  function midpoint(firstId, secondId) {
    const edge = [firstId, secondId].sort(), id = `mid:${edge.join(":")}`;
    if (!samples.has(id)) {
      const first = samples.get(edge[0]), second = samples.get(edge[1]);
      sample(id, mul(add(first.originalPosition, second.originalPosition), 0.5), add(first.normal, second.normal), { kind: "shared-edge-midpoint", edge });
    }
    return id;
  }
  const triangles = baseTriangles.flatMap(({ vertices: [first, second, third], facetIndex }) => {
    const firstSecond = midpoint(first, second), secondThird = midpoint(second, third), thirdFirst = midpoint(third, first);
    return [[first, firstSecond, thirdFirst], [firstSecond, second, secondThird], [thirdFirst, secondThird, third],
      [firstSecond, secondThird, thirdFirst]].map((vertices) => ({ vertices, facetIndex }));
  });
  if (triangles.length > convention.maximumTrianglesPerOwner) throw new Error("Owner mantle triangle bound exceeded");

  function boundaryIntersection(first, second, plane) {
    if (first.u === plane) return first;
    if (second.u === plane) return second;
    // Canonical edge ordering makes neighboring/oppositely wound polygons use
    // literally the same intersection object before any displacement.
    const edge = [first.id, second.id].sort(), id = `mask:${plane}:${edge.join(":")}`;
    if (!samples.has(id)) {
      const start = samples.get(edge[0]), end = samples.get(edge[1]);
      const fraction = (plane - start.u) / (end.u - start.u);
      sample(id, add(start.originalPosition, mul(sub(end.originalPosition, start.originalPosition), fraction)),
        add(start.normal, mul(sub(end.normal, start.normal), fraction)), { kind: "shared-mask-intersection", edge, plane });
    }
    return samples.get(id);
  }
  function clip(polygon, plane, below) {
    const output = [];
    for (let index = 0; index < polygon.length; index++) {
      const first = polygon[index], second = polygon[(index + 1) % polygon.length];
      const firstInside = below ? first.u <= plane : first.u >= plane;
      const secondInside = below ? second.u <= plane : second.u >= plane;
      if (firstInside) output.push(first);
      if (firstInside !== secondInside) output.push(boundaryIntersection(first, second, plane));
    }
    const unique = output.filter((point, index) => !index || point.id !== output[index - 1].id);
    if (unique.length > 1 && unique[0].id === unique.at(-1).id) unique.pop();
    return unique;
  }

  const displaced = new Map();
  function displace(original) {
    if (displaced.has(original.id)) return displaced.get(original.id);
    const local = localPoint(owner, original.originalPosition);
    const azimuth = Math.atan2(local[2] / owner.radii[2], local[1] / owner.radii[1]);
    const circumferentialDirection = localVector(owner.frame, [0, -Math.sin(azimuth), Math.cos(azimuth)]);
    const projectedAxial = sub(owner.frame[0], mul(original.normal, dot(owner.frame[0], original.normal)));
    const fallback = Math.hypot(...projectedAxial) < 1e-10;
    const axial = unit(fallback ? sub(circumferentialDirection, mul(original.normal, dot(circumferentialDirection, original.normal))) : projectedAxial);
    let circumferential = unit(cross(original.normal, axial));
    if (dot(circumferential, circumferentialDirection) < 0) circumferential = mul(circumferential, -1);
    const tangent = add(mul(axial, Math.cos(flowAngle)), mul(circumferential, Math.sin(flowAngle)));
    const phase = convention.azimuthCycles * azimuth - convention.azimuthCycles *
      (local[0] / Math.min(owner.radii[1], owner.radii[2])) * Math.tan(flowAngle);
    const fraction = ((phase / (2 * Math.PI)) % 1 + 1) % 1;
    const crest = fraction <= convention.crestRiseFraction
      ? smoothstep(fraction / convention.crestRiseFraction)
      : smoothstep((1 - fraction) / (1 - convention.crestRiseFraction));
    const capTaper = Math.sin(Math.PI * original.u);
    const strength = original.u === 0 || original.u === 1 ? 0 : crest * capTaper;
    const potentialDisplacement = add(mul(original.normal, convention.normalRiseOverPotentialLength * potentialLength * strength),
      mul(tangent, convention.tangentLeanOverPotentialLength * potentialLength * strength));
    const nextLocal = localPoint(owner, add(original.originalPosition, potentialDisplacement));
    const interval = owner.palette.length === 1 ? [0, 1] : original.u < 0.5 ? [0, 0.5] : [0.5, 1];
    // Cap/seam samples are pinned before transport. Other samples cannot cross
    // their original pigment interval, even when inherited flow leans axially.
    nextLocal[0] = original.boundary !== null ? local[0] :
      Math.max((2 * interval[0] - 1) * owner.radii[0], Math.min((2 * interval[1] - 1) * owner.radii[0], nextLocal[0]));
    const position = strength === 0 ? original.originalPosition : worldPoint(owner, nextLocal);
    if (position.some((coordinate) => !Number.isFinite(coordinate) || Math.abs(coordinate) >= COAT_CONTENT.limits.absoluteCoordinate)) throw new Error("Mantle coordinate bound exceeded");
    const result = { ...original, position, azimuth, phase, crest, capTaper, potentialLength, flowAngle,
      tangentFrame: { axial, circumferential, tangent, fallback }, potentialDisplacement,
      realizedDisplacement: sub(position, original.originalPosition), pigmentInterval: interval,
      clipping: original.boundary !== null ? "original mask plane pinned" : "transport clamped to original pigment interval" };
    displaced.set(original.id, result);
    return result;
  }

  const fragments = [], polygons = [];
  for (const triangle of triangles) {
    const original = triangle.vertices.map((id) => samples.get(id));
    const fields = owner.palette.length === 1 ? [{ points: original, interval: [0, 1], pigment: owner.palette[0] }] : [
      { points: clip(original, 0.5, true), interval: [0, 0.5], pigment: owner.palette[0] },
      { points: clip(original, 0.5, false), interval: [0.5, 1], pigment: owner.palette[1] }
    ];
    for (const field of fields) {
      if (field.points.length < 3) continue;
      if (field.points.length > convention.maximumPolygonVertices) throw new Error("Mantle polygon vertex bound exceeded");
      const vertices = field.points.map(displace), points = vertices.map((vertex) => vertex.position);
      const originalPoints = vertices.map((vertex) => vertex.originalPosition);
      let baseNormal = null;
      for (let index = 1; !baseNormal && index < originalPoints.length - 1; index++) {
        const candidate = cross(sub(originalPoints[index], originalPoints[0]), sub(originalPoints[index + 1], originalPoints[0]));
        if (Math.hypot(...candidate) > 1e-12) baseNormal = candidate;
      }
      if (!baseNormal) continue;
      let rawNormal = null;
      for (let index = 1; !rawNormal && index < points.length - 1; index++) {
        const candidate = cross(sub(points[index], points[0]), sub(points[index + 1], points[0]));
        if (Math.hypot(...candidate) > 1e-12) rawNormal = candidate;
      }
      if (!rawNormal || dot(rawNormal, baseNormal) <= 0) throw new Error("Degenerate or inverted mantle polygon");
      const normal = unit(rawNormal);
      fragments.push({ points, u: points.map((point) => (localPoint(owner, point)[0] / owner.radii[0] + 1) / 2),
        basePigment: field.pigment, localInterval: field.interval, material: "fur-mantle", directedNormal: normal,
        sources: [...sources, ...owner.sources], mantle: { facetIndex: triangle.facetIndex, sampleIds: vertices.map((vertex) => vertex.id) } });
      polygons.push({ facetIndex: triangle.facetIndex, baseTriangleIds: triangle.vertices, sampleIds: vertices.map((vertex) => vertex.id),
        originalPoints, displacedPoints: points, pigmentInterval: field.interval, pigment: field.pigment, normal });
    }
  }
  if (polygons.length > convention.maximumPolygonsPerOwner) throw new Error("Owner mantle polygon bound exceeded");
  return { fragments, audit: { owner: owner.id, profile: convention.profile, potentialLength, flowAngle, sources,
    baseTriangles: baseTriangles.length, refinedTriangles: triangles.length, clippedPolygons: polygons.length,
    samples: [...displaced.values()], polygons, coverage: [0, 1], opaqueBaseRetained: true,
    semantics: "potential fibre reach; shallow field relief/lean is a representation envelope, not literal thickness or hair count" } };
}

export function realizeCoherentCoatMaterials(scene, values, facts) {
  // Retain exact old skin/scales and48 actual facet roots. The original surface
  // pigment fragments remain the opaque base; only source6 installs a mantle.
  realizeVocabularyMaterials(scene, values, facts);
  bindAnatomicalRoleSurfaces(scene, COAT_CONTENT.materialProfile);
  const originalRibbons = scene.covering.fur?.ribbons ?? [];
  const mantle = [];
  let refinedTriangles = 0, clippedPolygons = 0;
  for (const owner of scene.nodes) {
    owner.material.profileVersion = COAT_CONTENT.materialProfile;
    if (owner.role !== "primary-region" || !values["covering.furEnabled"]) continue;
    owner.surfaceFragments = owner.surfaceFragments.filter((fragment) => fragment.material !== "fur");
    const potentialLength = values["fur.lengthOverMinTransverseRadius"] * Math.min(owner.radii[1], owner.radii[2]);
    const sources = owner.material.sources;
    const result = ownerMantle(owner, potentialLength, values["fur.tangentAngleRadians"], sources);
    owner.surfaceFragments.push(...result.fragments);
    mantle.push(result.audit);
    refinedTriangles += result.audit.refinedTriangles;
    clippedPolygons += result.audit.clippedPolygons;
  }
  const convention = COAT_CONTENT.conventions.coat;
  if (refinedTriangles > convention.maximumTriangles || clippedPolygons > convention.maximumPolygons) throw new Error("Assembly mantle budget exceeded");
  scene.covering.profileVersion = COAT_CONTENT.materialProfile;
  if (values["covering.furEnabled"]) {
    const roots = originalRibbons.map(({ owner, row, band, rootU, azimuth, root, facetIndex, normal, tangentFrame, potentialLength, sources }) =>
      ({ owner, row, band, rootU, azimuth, root, facetIndex, normal, tangentFrame, potentialLength, sources }));
    if (roots.length !== mantle.length * convention.rootsPerOwner) throw new Error("Original coat root witnesses are incomplete");
    scene.covering.fur = { enabled: true, localInterval: [0, 1], rootProfile: "facet-rooted-fur-ribbon/1",
      depictionProfile: convention.profile, roots, mantle, refinedTriangles, clippedPolygons,
      maximumTriangles: convention.maximumTriangles, maximumPolygons: convention.maximumPolygons };
  }
  return scene;
}
