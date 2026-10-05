import { add, sub, mul, dot, cross, unit } from "./anatomical-source-construction.mjs";
import { localPoint } from "./compositional-vocabulary-construction.mjs";
import { realizeVocabularyMaterials } from "./compositional-vocabulary-presentation.mjs";
import { ROLES_CONTENT } from "./anatomical-roles-package.mjs";
import { COAT_CONTENT } from "./coherent-coat-package.mjs";
import { MARKING_CONTENT } from "./marking-field-package.mjs";

function clipOwnerField(points, owner, threshold, below) {
  const coordinate = (point) => (localPoint(owner, point)[0] / owner.radii[0] + 1) / 2;
  const output = [];
  for (let index = 0; index < points.length; index++) {
    const first = points[index], second = points[(index + 1) % points.length];
    const firstU = coordinate(first), secondU = coordinate(second);
    const insideFirst = below ? firstU <= threshold : firstU >= threshold;
    const insideSecond = below ? secondU <= threshold : secondU >= threshold;
    if (insideFirst) output.push(first);
    if (insideFirst !== insideSecond) output.push(add(first, mul(sub(second, first), (threshold - firstU) / (secondU - firstU))));
  }
  const same = (first, second) => first.every((value, axis) => Math.abs(value - second[axis]) < 1e-10);
  const unique = output.filter((point, index) => index === 0 || !same(point, output[index - 1]));
  if (unique.length > 1 && same(unique[0], unique.at(-1))) unique.pop();
  return unique;
}

export function bindAnatomicalRoleSurfaces(scene, materialProfile) {
  for (const owner of scene.nodes) {
    owner.material.profileVersion = materialProfile;
    if (["auricular-sheet", "axial-tail"].includes(owner.role)) {
      owner.material.kind = "smooth-skin";
      for (const fragment of owner.surfaceFragments) {
        const face = owner.mesh.faces.find((candidate) => {
          const point = owner.mesh.vertices[candidate.vertices[0]];
          return fragment.points.every((vertex) => Math.abs(dot(candidate.normal, sub(vertex, point))) < 1e-8);
        });
        if (!face) throw new Error(`Lost directed anatomical surface on ${owner.id}`);
        fragment.directedNormal = face.normal;
        fragment.sources = [...owner.sources];
      }
    }
  }
}

export function realizeAnatomicalRoleMaterials(scene, values, facts) {
  // Reuse literal scale/base coverage and exact48 fur roots from material2.
  // The new material replaces only its primary fibre depiction.
  realizeVocabularyMaterials(scene, values, facts);
  const oldRibbons = scene.covering.fur?.ribbons ?? [];
  const clusters = [];
  bindAnatomicalRoleSurfaces(scene, ROLES_CONTENT.materialProfile);
  for (const owner of scene.nodes) {
    if (owner.role !== "primary-region" || !values["covering.furEnabled"]) continue;
    // Opaque owner skin remains complete underneath every cluster.
    owner.surfaceFragments = owner.surfaceFragments.filter((fragment) => fragment.material !== "fur");
    for (const ribbon of oldRibbons.filter((entry) => entry.owner === owner.id)) {
      const length = ribbon.potentialLength;
      const { flow, widthDirection } = ribbon.tangentFrame;
      const interval = ribbon.visibleInterval;
      const pigment = owner.palette[owner.palette.length === 1 || ribbon.rootU < 0.5 ? 0 : 1];
      const fragmentIndices = [];
      const pieces = [];
      // Three overlapping tapered pieces share one real facet root and a broad
      // connected base. Side fringes splay; they are not parallel scratch marks.
      for (const part of [-1, 0, 1]) {
        const lateral = part * 0.20 * length;
        const partLength = length * (part === 0 ? 1 : 0.88);
        const base = add(ribbon.root, mul(widthDirection, part * 0.10 * length));
        const tip = add(ribbon.root, add(mul(flow, partLength), add(mul(widthDirection, lateral), mul(ribbon.normal, 0.10 * length))));
        const potentialPoints = [
          sub(base, mul(widthDirection, 0.25 * length)),
          add(base, mul(widthDirection, 0.25 * length)),
          add(tip, mul(widthDirection, 0.025 * length)),
          sub(tip, mul(widthDirection, 0.025 * length))
        ];
        const points = clipOwnerField(clipOwnerField(potentialPoints, owner, interval[0], false), owner, interval[1], true);
        if (points.length < 3 || points.length > ROLES_CONTENT.conventions.coat.maximumClippedVertices ||
            points.some((point) => point.some((coordinate) => !Number.isFinite(coordinate) || Math.abs(coordinate) >= ROLES_CONTENT.limits.absoluteCoordinate))) {
          throw new Error("Invalid clipped coat cluster");
        }
        fragmentIndices.push(owner.surfaceFragments.length);
        pieces.push({ part, potentialPoints, visiblePoints: points, potentialLength: length, depictedLength: partLength });
        owner.surfaceFragments.push({
          points, u: points.map((point) => (localPoint(owner, point)[0] / owner.radii[0] + 1) / 2),
          basePigment: pigment, material: "fur", localInterval: interval,
          facetNormal: ribbon.normal, sources: [...ribbon.sources, ...owner.sources],
          cluster: { row: ribbon.row, band: ribbon.band, part }
        });
      }
      const { fragmentIndex, potentialPoints, ...rootTrace } = ribbon;
      clusters.push({ ...rootTrace, fragmentIndices, pieces,
        profile: ROLES_CONTENT.conventions.coat.clusterProfile,
        potentialLength: length, visibleTrim: "exact root pigment field and owner u0–1", fragmentsPerRoot: 3 });
    }
  }
  if (clusters.length * 3 > ROLES_CONTENT.conventions.coat.maximumFragments) throw new Error("Coat fragment bound exceeded");
  scene.covering.profileVersion = ROLES_CONTENT.materialProfile;
  if (values["covering.furEnabled"]) {
    scene.covering.fur = {
      enabled: true, localInterval: [0, 1], clusters, potentialRoots: clusters.length,
      potentialFragments: clusters.length * 3, maximumFragments: ROLES_CONTENT.conventions.coat.maximumFragments,
      rootProfile: "facet-rooted-fur-ribbon/1", depictionProfile: ROLES_CONTENT.conventions.coat.clusterProfile
    };
  }
  return scene;
}

const right = [Math.sqrt(3) / 2, -0.5, 0];
const up = [0.25, Math.sqrt(3) / 4, Math.sqrt(3) / 2];
const towardViewer = cross(right, up);
const light = unit([-0.55, -0.6, 0.8]);
const project = (point) => [dot(point, right), -dot(point, up)];
const centroid = (points) => mul(points.reduce(add, [0, 0, 0]), 1 / points.length);
function shade(hex, amount) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error("Unsupported source pigment");
  return `#${[1, 3, 5].map((index) => Math.round(parseInt(hex.slice(index, index + 2), 16) * amount).toString(16).padStart(2, "0")).join("")}`;
}

export function anatomicalRolesReference(scene, profileVersion = ROLES_CONTENT.constructionProfile) {
  if (![ROLES_CONTENT.constructionProfile, COAT_CONTENT.constructionProfile, MARKING_CONTENT.constructionProfile].includes(profileVersion)) throw new Error("Unsupported anatomical role reference profile");
  const marked = profileVersion === MARKING_CONTENT.constructionProfile;
  const content = marked ? MARKING_CONTENT : profileVersion === COAT_CONTENT.constructionProfile ? COAT_CONTENT : ROLES_CONTENT;
  if (scene.status !== "constructed" || scene.profileVersion !== content.constructionProfile ||
      scene.covering.profileVersion !== content.materialProfile) throw new Error("Unsupported anatomical role reference identity");
  const polygons = [];
  for (const owner of scene.nodes) for (const fragment of owner.surfaceFragments) {
    const points = fragment.points, center = centroid(points);
    let rawNormal = fragment.directedNormal ?? fragment.facetNormal;
    for (let index = 1; !rawNormal && index < points.length - 1; index++) {
      const candidate = cross(sub(points[index], points[0]), sub(points[index + 1], points[0]));
      if (Math.hypot(...candidate) > 1e-12) rawNormal = candidate;
    }
    if (!rawNormal) continue;
    let normal = unit(rawNormal);
    // Concave ears and a curved tail carry true per-face outward normals;
    // inferring them from the whole object's center would invert the bowl.
    if (!fragment.directedNormal && dot(normal, sub(center, owner.center ?? centroid(owner.mesh.vertices))) < 0) normal = mul(normal, -1);
    if (dot(normal, towardViewer) <= 0) continue;
    const lighting = 0.75 + 0.25 * Math.max(0, dot(normal, light));
    const fill = shade(fragment.basePigment, lighting);
    polygons.push({ points: points.map(project), depth: dot(center, towardViewer), fill, owner: owner.id, material: fragment.material ?? "smooth",
      ...(marked ? { overlays: (fragment.markingOverlays ?? []).map((overlay) => ({
        ...overlay, fill: shade(overlay.ink, lighting), components: overlay.components.map((component) => component.map(project)),
      })) } : {}) });
  }
  const projected = scene.nodes.flatMap((owner) => [...owner.mesh.vertices, ...owner.surfaceFragments.flatMap((fragment) => fragment.points)].map(project));
  const minimumX = Math.min(...projected.map((point) => point[0])), maximumX = Math.max(...projected.map((point) => point[0]));
  const minimumY = Math.min(...projected.map((point) => point[1])), maximumY = Math.max(...projected.map((point) => point[1]));
  const side = Math.max(maximumX - minimumX, maximumY - minimumY) * 1.12;
  if (!Number.isFinite(side) || side <= 0) throw new Error("Invalid anatomical role camera");
  const scale = 456 / side, offsetX = 256 - (minimumX + maximumX) * scale / 2, offsetY = 256 - (minimumY + maximumY) * scale / 2;
  polygons.sort((first, second) => first.depth - second.depth);
  const shapes = polygons.map((polygon) => {
    const outlined = ["scales", "fur"].includes(polygon.material);
    const mantle = polygon.material === "fur-mantle";
    const points = polygon.points.map(([x, y]) => `${(x * scale + offsetX).toFixed(3)},${(y * scale + offsetY).toFixed(3)}`).join(" ");
    const base = `<polygon data-owner="${polygon.owner}" data-material="${polygon.material}" points="${points}" fill="${polygon.fill}" stroke="${mantle ? "none" : outlined ? shade(polygon.fill, 0.8) : polygon.fill}" stroke-width="${mantle ? 0 : outlined ? 0.7 : 0.4}" stroke-linejoin="round"/>`;
    if (!marked) return base;
    const overlays = polygon.overlays.map((overlay) => {
      // A compound nonzero path paints the union of this logical mask's seam
      // copies once. Parent grouping preserves the existing occlusion order.
      const path = overlay.components.map((component) => component.map(([x, y], index) =>
        `${index === 0 ? "M" : "L"}${(x * scale + offsetX).toFixed(3)},${(y * scale + offsetY).toFixed(3)}`).join(" ") + " Z").join(" ");
      return `<path data-mark="${overlay.logicalId}" data-kind="${overlay.kind}" d="${path}" fill="${overlay.fill}" fill-rule="nonzero" opacity="${overlay.opacity}" stroke="none"/>`;
    }).join("");
    return `<g data-owner="${polygon.owner}" data-parent-material="${polygon.material}">${base}${overlays}</g>`;
  }).join("");
  return {
    status: "constructed", profileVersion: content.referenceProfile,
    camera: { right, up, towardViewer, framing: "own-source and visible material bounds; natural occlusion" },
    mapping: { scale, offsetX, offsetY },
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><title>Provisional anatomical role source</title><rect width="512" height="512" fill="#f7f3e8"/>${shapes}</svg>`
  };
}
