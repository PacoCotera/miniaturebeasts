import { realizeCoherentCoatMaterials } from "./coherent-coat-material.mjs";
import { localPoint } from "./compositional-vocabulary-construction.mjs";
import { MARKING_CONTENT, MARKING_TARGETS } from "./marking-field-package.mjs";

const EPSILON = 1e-10;

function area(points) {
  return points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point.uv[0] * next.uv[1] - next.uv[0] * point.uv[1];
  }, 0) / 2;
}

function deduplicate(points) {
  const same = (first, second) => first.uv.every((value, axis) => Math.abs(value - second.uv[axis]) <= EPSILON) &&
    first.position.every((value, axis) => Math.abs(value - second.position[axis]) <= EPSILON);
  const result = points.filter((point, index) => index === 0 || !same(point, points[index - 1]));
  if (result.length > 1 && same(result[0], result.at(-1))) result.pop();
  return result;
}

function originalAtlas(owner, originalPoints, actualPoints) {
  if (originalPoints.length !== actualPoints.length || originalPoints.length < 3) {
    throw new Error(`Original/current marking fragment mismatch on ${owner.id}`);
  }
  const coordinates = originalPoints.map((point) => {
    const local = localPoint(owner, point);
    const u = (local[0] / owner.radii[0] + 1) / 2;
    const y = local[1] / owner.radii[1], z = local[2] / owner.radii[2];
    // Barrel endpoint arithmetic can retain a tiny transverse residue. The
    // original longitudinal cap still has no independent azimuth; preserve
    // its actual3D point and use the declared mean non-pole cap coordinate.
    const cap = Math.abs(u) <= EPSILON || Math.abs(u - 1) <= EPSILON;
    const pole = cap || Math.hypot(y, z) <= EPSILON;
    const angle = Math.atan2(z, y) / (2 * Math.PI);
    return { u, v: (angle + 1) % 1, pole };
  });
  const anchor = coordinates.find((point) => !point.pole)?.v;
  if (anchor === undefined) throw new Error(`Marking atlas has no non-pole frame on ${owner.id}`);
  const unwrapped = coordinates.filter((point) => !point.pole).map((point) => point.v + Math.round(anchor - point.v));
  const poleV = unwrapped.reduce((sum, value) => sum + value, 0) / unwrapped.length;
  const points = coordinates.map((coordinate, index) => ({
    uv: [coordinate.u, coordinate.pole ? poleV : coordinate.v + Math.round(anchor - coordinate.v)],
    originalPosition: originalPoints[index],
    position: actualPoints[index],
  }));
  if (points.some((point) => [...point.uv, ...point.position, ...point.originalPosition].some((value) => !Number.isFinite(value))) ||
      coordinates.some((point) => point.u < -EPSILON || point.u > 1 + EPSILON) ||
      Math.max(...points.map((point) => point.uv[1])) - Math.min(...points.map((point) => point.uv[1])) > 0.5 + EPSILON) {
    throw new Error(`Incoherent original marking atlas on ${owner.id}`);
  }
  return deduplicate(points);
}

function bounds(points) {
  return [
    Math.min(...points.map((point) => point[0])), Math.max(...points.map((point) => point[0])),
    Math.min(...points.map((point) => point[1])), Math.max(...points.map((point) => point[1])),
  ];
}
function overlap(first, second) {
  return first[0] <= second[1] && second[0] <= first[1] && first[2] <= second[3] && second[2] <= first[3];
}

function logicalMask(index, count, layout, scale, orientation) {
  const kind = layout === "bands" || layout === "bands-and-patches" && index % 2 === 0 ? "band" : "patch";
  const center = [(index + 1) / (count + 1), (index + 0.5) / count];
  const localBoundary = kind === "band"
    ? [[-scale / 2, -0.5], [scale / 2, -0.5], [scale / 2, 0.5], [-scale / 2, 0.5]]
    : Array.from({ length: MARKING_CONTENT.markings.patchVertices }, (_, vertex) => {
      const angle = vertex * 2 * Math.PI / MARKING_CONTENT.markings.patchVertices;
      return [scale * Math.cos(angle), MARKING_CONTENT.markings.patchAspect * scale * Math.sin(angle)];
    });
  const cosine = Math.cos(orientation), sine = Math.sin(orientation);
  const boundary = localBoundary.map(([u, v]) => [center[0] + u * cosine - v * sine, center[1] + u * sine + v * cosine]);
  return { id: `mark-${index}`, index, kind, center, scale, orientation, boundary };
}

function interpolate(first, second, fraction) {
  const blend = (a, b) => a.map((value, axis) => value + (b[axis] - value) * fraction);
  return {
    uv: blend(first.uv, second.uv),
    originalPosition: blend(first.originalPosition, second.originalPosition),
    position: blend(first.position, second.position),
  };
}

function clipMask(parent, mask) {
  let clipped = parent;
  for (let edge = 0; edge < mask.length && clipped.length; edge++) {
    const start = mask[edge], end = mask[(edge + 1) % mask.length];
    const distance = (point) => (end[0] - start[0]) * (point.uv[1] - start[1]) -
      (end[1] - start[1]) * (point.uv[0] - start[0]);
    const output = [];
    for (let index = 0; index < clipped.length; index++) {
      const first = clipped[index], second = clipped[(index + 1) % clipped.length];
      const firstDistance = distance(first), secondDistance = distance(second);
      const firstInside = firstDistance >= 0, secondInside = secondDistance >= 0;
      if (firstInside) output.push(first);
      if (firstInside !== secondInside) output.push(interpolate(first, second, firstDistance / (firstDistance - secondDistance)));
    }
    clipped = deduplicate(output);
  }
  return clipped;
}

function ownerMarkings(owner, values, causes, mantleAudit) {
  const convention = MARKING_CONTENT.markings;
  const count = Math.max(1, Math.round(10 * values["markings.extent"]));
  const layout = values["markings.layout"];
  if (count > convention.maximumLogicalPerOwner || !["bands", "patches", "bands-and-patches"].includes(layout)) {
    throw new Error("Unsupported logical marking count/layout");
  }
  const logical = Array.from({ length: count }, (_, index) => ({
    ...logicalMask(index, count, layout, values["markings.scale"], values["markings.orientation"]),
    owner: owner.id, causes, emittedPolygons: 0,
  }));
  const mantleFragments = owner.surfaceFragments.filter((fragment) => fragment.material === "fur-mantle");
  if (mantleFragments.length && (!mantleAudit || mantleFragments.length !== mantleAudit.polygons.length)) {
    throw new Error(`Mantle marking audit count mismatch on ${owner.id}`);
  }
  let mantleIndex = 0, emittedPolygons = 0;
  const intersections = [];
  let culledBounds = 0, zeroAreaIntersections = 0;
  for (const [fragmentIndex, fragment] of owner.surfaceFragments.entries()) {
    let originalPoints = fragment.points;
    if (fragment.material === "fur-mantle") {
      const audit = mantleAudit.polygons[mantleIndex++];
      if (audit.displacedPoints.length !== fragment.points.length || audit.displacedPoints.some((point, index) =>
        point.some((coordinate, axis) => coordinate !== fragment.points[index][axis]))) {
        throw new Error(`Mantle marking audit position mismatch on ${owner.id}`);
      }
      originalPoints = audit.originalPoints;
    }
    const parent = originalAtlas(owner, originalPoints, fragment.points);
    const parentBounds = bounds(parent.map((point) => point.uv));
    const overlays = [];
    for (const mark of logical) {
      const components = [];
      for (const shift of convention.periodicShifts) {
        const periodicMask = mark.boundary.map(([u, v]) => [u, v + shift]);
        if (!overlap(parentBounds, bounds(periodicMask))) {
          culledBounds++;
          continue;
        }
        const clipped = clipMask(parent, periodicMask);
        if (clipped.length < 3 || Math.abs(area(clipped)) <= EPSILON * EPSILON) {
          zeroAreaIntersections++;
          continue;
        }
        if (clipped.length > convention.maximumPolygonVertices || clipped.some((point) =>
          [...point.uv, ...point.position, ...point.originalPosition].some((value) => !Number.isFinite(value)))) {
          throw new Error("Invalid clipped marking polygon");
        }
        emittedPolygons++;
        mark.emittedPolygons++;
        if (emittedPolygons > convention.maximumPolygonsPerOwner) throw new Error("Owner marking polygon bound exceeded");
        components.push(clipped.map((point) => point.position));
        intersections.push({ logicalId: mark.id, fragmentIndex, periodicShift: shift, vertices: clipped });
      }
      if (components.length) overlays.push({ logicalId: mark.id, kind: mark.kind, components, ink: convention.ink,
        opacity: values["markings.contrast"], sources: causes, profile: convention.profile });
    }
    if (overlays.length) fragment.markingOverlays = overlays;
  }
  return { owner: owner.id, logical, intersections, emittedPolygons, culledBounds, zeroAreaIntersections,
    discardReason: "Only empty or zero-area atlas intersections are discarded; logical masks remain retained.",
    atlas: "original normalized longitudinal u and periodic normalized azimuth v; nearest-period unwrap, mean non-pole cap azimuth",
    numericalTolerance: EPSILON };
}

export function realizeMarkingFieldMaterials(scene, values, facts) {
  // The complete source6 base, coat and original masks remain unchanged.
  realizeCoherentCoatMaterials(scene, values, facts);
  const enabled = values["markings.enabled"];
  const causes = Object.keys(MARKING_TARGETS);
  const contributors = facts.filter((fact) => causes.includes(fact.locusId)).map((fact) => ({
    locusId: fact.locusId, copies: fact.copies, value: fact.value, state: fact.state, target: fact.target,
  }));
  const owners = [];
  if (enabled) for (const owner of scene.nodes.filter((node) => node.role === "primary-region")) {
    const mantle = scene.covering.fur?.mantle?.find((audit) => audit.owner === owner.id);
    owners.push(ownerMarkings(owner, values, causes, mantle));
  }
  const logicalCount = owners.reduce((sum, owner) => sum + owner.logical.length, 0);
  const emittedPolygons = owners.reduce((sum, owner) => sum + owner.emittedPolygons, 0);
  const convention = MARKING_CONTENT.markings;
  if (logicalCount > convention.maximumLogical || logicalCount * convention.periodicShifts.length > convention.maximumPeriodicComponents ||
      emittedPolygons > convention.maximumPolygons) throw new Error("Assembly marking field budget exceeded");
  scene.covering.markings = { profile: convention.profile, enabled, contributors, owners, logicalCount, emittedPolygons,
    ink: convention.ink, inkSource: convention.inkSource, opacity: enabled ? values["markings.contrast"] : null,
    bounds: convention, masksAreSurfaceFields: true };
  if (enabled) scene.covering.sources = [...new Set([...scene.covering.sources, ...causes])];
  for (const owner of scene.nodes) owner.material.profileVersion = MARKING_CONTENT.materialProfile;
  scene.covering.profileVersion = MARKING_CONTENT.materialProfile;
  return scene;
}
