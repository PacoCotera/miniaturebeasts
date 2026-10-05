import { REGIONAL_SCENE_RULE } from "./regional-scene-catalogue.mjs";
import { BODY_ORGANIZATION_RULE } from "./body-organization-catalogue.mjs";
import { digest } from "./evaluate.mjs";
import { constructGraphSource } from "./graph-source-construction.mjs";
import { constructOcularModule } from "./graph-module-construction.mjs";

export const BODY_COVERING_PROFILE = Object.freeze({
  id: "body-covering/1",
  sourceRuleVersion: "developmental-covering/1",
  baseGraphRuleVersion: "developmental-analytic/1",
  ocularModuleRuleVersion: "ocular-module/2",
  intervalStart: 0.2,
  plateHalfHeightRatio: 0.65,
  pitchXRatio: 1.35,
  pitchYRatio: 1.1,
  staggerRatio: 0.5,
  contourSamples: 24,
  contourTaperBase: 0.82,
  contourTaperAmplitude: 0.18,
  rimClearance: 0.005,
  tolerance: 1e-9,
  maximumCandidates: 1024,
  maximumPlates: 128,
  contour:
    "x=h*cos(t), y=.65*h*sin(t)*(.82+.18*cos(t)); 24 retained samples, forward +X",
  field:
    "Body-local global longitudinal u .2 through .2+extent; not measured exact body-area percentage.",
  paintOrder:
    "Ascending row/column plate order is a provisional static overlap depiction, not physical tissue depth.",
  pigment:
    "Clip each full plate into original nearest-station surface domains and ordered local-u masks; no blending or center-color sampling.",
  outline:
    "Neutral diagnostic plate boundary; not an inherited pigment stripe.",
});

const isRecord = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const unique = (...groups) => [...new Set(groups.flat())];
function rejected(code, message, counts) {
  return {
    status: "rejected",
    errors: [{ code, message, nodeIds: [], locusIds: [] }],
    ...(counts ? { counts } : {}),
  };
}

function pointDistance(point, start, end) {
  const delta = [end[0] - start[0], end[1] - start[1]];
  const squared = delta[0] ** 2 + delta[1] ** 2;
  const amount =
    squared === 0
      ? 0
      : Math.max(
          0,
          Math.min(
            1,
            ((point[0] - start[0]) * delta[0] +
              (point[1] - start[1]) * delta[1]) /
              squared,
          ),
        );
  return Math.hypot(
    point[0] - start[0] - amount * delta[0],
    point[1] - start[1] - amount * delta[1],
  );
}
function cross(start, end, point) {
  return (
    (end[0] - start[0]) * (point[1] - start[1]) -
    (end[1] - start[1]) * (point[0] - start[0])
  );
}
function segmentsCross(a, b, c, d) {
  return (
    cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0
  );
}
function segmentDistance(a, b, c, d) {
  if (segmentsCross(a, b, c, d)) return 0;
  return Math.min(
    pointDistance(a, c, d),
    pointDistance(b, c, d),
    pointDistance(c, a, b),
    pointDistance(d, a, b),
  );
}
function inside(point, polygon) {
  let contained = false;
  for (
    let index = 0, previous = polygon.length - 1;
    index < polygon.length;
    previous = index++
  ) {
    const a = polygon[index],
      b = polygon[previous];
    if (
      a[1] > point[1] !== b[1] > point[1] &&
      point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      contained = !contained;
  }
  return contained;
}
function area(polygon) {
  return (
    Math.abs(
      polygon.reduce((sum, point, index) => {
        const next = polygon[(index + 1) % polygon.length];
        return sum + point[0] * next[1] - next[0] * point[1];
      }, 0),
    ) / 2
  );
}
function edges(polygon) {
  return polygon.map((point, index) => [
    point,
    polygon[(index + 1) % polygon.length],
  ]);
}

export function coveringFootprintContained(
  footprint,
  exterior,
  rim = BODY_COVERING_PROFILE.rimClearance,
) {
  if (
    ![footprint, exterior].every(
      (polygon) =>
        Array.isArray(polygon) &&
        polygon.length >= 3 &&
        polygon.every(
          (point) =>
            Array.isArray(point) &&
            point.length === 2 &&
            point.every(Number.isFinite),
        ),
    ) ||
    !Number.isFinite(rim) ||
    rim < 0
  )
    return false;
  if (
    area(footprint) <= BODY_COVERING_PROFILE.tolerance ||
    !footprint.every((point) => inside(point, exterior))
  )
    return false;
  // Edge-to-edge distance catches a plate bridging a concave neck even when all vertices are inside.
  return edges(footprint).every(([start, end]) =>
    edges(exterior).every(
      ([a, b]) =>
        !segmentsCross(start, end, a, b) &&
        segmentDistance(start, end, a, b) >= rim,
    ),
  );
}

function discOverlap(polygon, center, radius) {
  return (
    inside(center, polygon) ||
    edges(polygon).some(
      ([a, b]) =>
        pointDistance(center, a, b) <=
        radius + BODY_COVERING_PROFILE.rimClearance,
    )
  );
}
function rootOverlap(polygon, root) {
  if (root.kind === "disc")
    return discOverlap(polygon, root.center, root.radius);
  return (
    root.segment.some((point) => inside(point, polygon)) ||
    edges(polygon).some(
      ([a, b]) =>
        segmentDistance(a, b, ...root.segment) <=
        BODY_COVERING_PROFILE.rimClearance,
    )
  );
}

function clipAtX(polygon, boundary, keepAbove) {
  const output = [];
  const accepts = (point) =>
    keepAbove ? point[0] >= boundary : point[0] <= boundary;
  for (let index = 0; index < polygon.length; index++) {
    const previous = polygon[(index + polygon.length - 1) % polygon.length],
      current = polygon[index];
    if (accepts(previous) !== accepts(current)) {
      const ratio = (boundary - previous[0]) / (current[0] - previous[0]);
      output.push([boundary, previous[1] + ratio * (current[1] - previous[1])]);
    }
    if (accepts(current)) output.push([...current]);
  }
  return output;
}
function pigmentFragments(footprint, surfaces) {
  const fragments = [];
  for (const surface of surfaces) {
    const atlas = surface.atlas;
    for (let index = 0; index < surface.palette.length; index++) {
      const minimumX =
        atlas.minimumX +
        ((atlas.maximumX - atlas.minimumX) * index) / surface.palette.length;
      const maximumX =
        atlas.minimumX +
        ((atlas.maximumX - atlas.minimumX) * (index + 1)) /
          surface.palette.length;
      const polygon = clipAtX(
        clipAtX(footprint, minimumX, true),
        maximumX,
        false,
      );
      if (
        polygon.length >= 3 &&
        area(polygon) > BODY_COVERING_PROFILE.tolerance
      )
        fragments.push({
          surfaceId: surface.id,
          sourceNodeId: surface.nodeId,
          maskIndex: index,
          palette: surface.palette[index],
          polygon,
          sources: [...surface.sources],
          texture: surface.texture,
        });
    }
  }
  return fragments;
}

export function constructBodyCovering(
  result,
  bodyConstruction,
  ocularModule,
  options = {},
) {
  const profile =
    options?.profileVersion === "body-covering/2"
      ? {
          ...BODY_COVERING_PROFILE,
          id: "body-covering/2",
          sourceRuleVersion: REGIONAL_SCENE_RULE,
          baseGraphRuleVersion: BODY_ORGANIZATION_RULE,
          ocularModuleRuleVersion: "ocular-module/3",
        }
      : BODY_COVERING_PROFILE;
  if (
    !isRecord(options) ||
    options.profileVersion !== profile.id ||
    Object.keys(options).some((key) => key !== "profileVersion")
  )
    return rejected(
      "unsupported-profile",
      "An explicit body-covering/1 profile is required.",
    );
  if (
    !isRecord(result) ||
    result.status !== "resolved" ||
    result.sourceRuleVersion !== profile.sourceRuleVersion ||
    result.baseGraphRuleVersion !== profile.baseGraphRuleVersion ||
    result.ocularModuleRuleVersion !== profile.ocularModuleRuleVersion ||
    result.coveringModuleRuleVersion !== profile.id ||
    !Array.isArray(result.facts)
  )
    return rejected(
      "unsupported-source",
      "Exact full-source and consumer rule metadata is required.",
    );
  const body = constructGraphSource(result, {
    profileVersion:
      profile.id === "body-covering/2" ? "graph-source/2" : "graph-source/1",
    sourceRuleVersion: result.baseGraphRuleVersion,
  });
  if (
    body.status !== "constructed" ||
    !isRecord(bodyConstruction) ||
    digest(body) !== digest(bodyConstruction)
  )
    return rejected(
      "body-source-mismatch",
      "The exact source-derived body construction is required.",
    );
  const ocular = constructOcularModule(result, body, {
    profileVersion: result.ocularModuleRuleVersion,
  });
  if (
    ocular.status !== "constructed" ||
    !isRecord(ocularModule) ||
    digest(ocular) !== digest(ocularModule)
  )
    return rejected(
      "ocular-source-mismatch",
      "The exact source-derived ocular module is required.",
    );
  const targets = [
    "coveringKind",
    "coveringExtent",
    "coveringScale",
    "bodyWidth",
  ];
  const matches = targets.map((target) =>
    result.facts.filter((fact) => isRecord(fact) && fact.id === target),
  );
  if (matches.some((items) => items.length !== 1))
    return rejected(
      "covering-facts",
      "Each required covering and width fact must occur exactly once.",
    );
  const [kind, extent, scale, width] = matches.map((items) => items[0]);
  if (
    !["skin", "scales"].includes(kind.value) ||
    !Number.isFinite(extent.value) ||
    extent.value < 0.35 ||
    extent.value > 0.75 ||
    !Number.isFinite(scale.value) ||
    scale.value < 0.06 ||
    scale.value > 0.12 ||
    !Number.isFinite(width.value) ||
    width.value <= 0 ||
    [kind, extent, scale, width].some(
      (fact) =>
        ![fact.sources, fact.prerequisites, fact.copies].every(
          (items) =>
            Array.isArray(items) &&
            items.every((item) => typeof item === "string"),
        ) || fact.copies.length !== 2,
    )
  )
    return rejected(
      "covering-facts",
      "Typed bounded values and two-copy source facts are required.",
    );
  if (
    kind.state !== "expressed" ||
    (kind.value === "scales" && width.state !== "expressed") ||
    [extent, scale].some(
      (fact) =>
        fact.state !== (kind.value === "scales" ? "expressed" : "inactive"),
    )
  )
    return rejected(
      "covering-state",
      "Covering presence and dependent states must agree.",
    );
  const exterior = body.bodyExteriors[0];
  const surfaces = body.surfaces.filter(
    (surface) => surface.shapeId === exterior.id,
  );
  const roots = body.appendages
    .filter((appendage) =>
      exterior.sourceNodeIds.includes(appendage.parentNodeId),
    )
    .map((appendage) =>
      appendage.role === "fin"
        ? {
            id: appendage.id,
            kind: "segment",
            segment: structuredClone(appendage.rootChord),
            sources: [...appendage.sources],
          }
        : {
            id: appendage.id,
            kind: "disc",
            center: [...appendage.root],
            radius: appendage.width / 2,
            sources: [...appendage.sources],
          },
    );
  const directLocusIds =
    kind.value === "scales"
      ? unique(kind.sources, extent.sources, scale.sources)
      : [...kind.sources];
  let dependencyLocusIds =
    kind.value === "scales"
      ? unique(
          kind.prerequisites,
          extent.prerequisites,
          scale.prerequisites,
          exterior.sources,
          roots.flatMap((root) => root.sources),
          ocular.traces.flatMap((trace) => trace.locusIds),
          surfaces.flatMap((surface) => surface.sources),
        ).filter((id) => !directLocusIds.includes(id))
      : [];
  if (profile.id === "body-covering/2") {
    const inactiveRegional = result.facts
      .filter(
        (fact) =>
          isRecord(fact) &&
          ["regionalGrowth", "joinNeckRatio"].includes(fact.id) &&
          fact.state === "inactive",
      )
      .map((fact) => fact.locusId);
    dependencyLocusIds = dependencyLocusIds.filter(
      (id) => !inactiveRegional.includes(id),
    );
  }
  const plates = [],
    excludedCandidates = [];
  const counts = {
    plannedCandidates: 0,
    candidates: 0,
    accepted: 0,
    excluded: 0,
    exclusionReasons: {},
  };
  let field = null,
    plateProfile = null;
  if (kind.value === "scales") {
    const minimumX = Math.min(...exterior.outline.map((point) => point[0]));
    const maximumX = Math.max(...exterior.outline.map((point) => point[0]));
    const minimumY = Math.min(...exterior.outline.map((point) => point[1]));
    const maximumY = Math.max(...exterior.outline.map((point) => point[1]));
    const length = maximumX - minimumX;
    field = {
      atlas: "global-body-longitudinal-u",
      uStart: 0.2,
      uEnd: 0.2 + extent.value,
      minimumX: minimumX + 0.2 * length,
      maximumX: minimumX + (0.2 + extent.value) * length,
      minimumY,
      maximumY,
      bodyMinimumX: minimumX,
      bodyMaximumX: maximumX,
    };
    const halfWidth = scale.value * width.value;
    const halfHeight = halfWidth * profile.plateHalfHeightRatio;
    const pitchX = halfWidth * profile.pitchXRatio,
      pitchY = halfWidth * profile.pitchYRatio;
    const localOutline = Array.from(
      { length: profile.contourSamples },
      (_, index) => {
        const angle = (index * 2 * Math.PI) / profile.contourSamples;
        return [
          halfWidth * Math.cos(angle),
          halfHeight *
            Math.sin(angle) *
            (profile.contourTaperBase +
              profile.contourTaperAmplitude * Math.cos(angle)),
        ];
      },
    );
    plateProfile = {
      halfWidth,
      halfHeight,
      pitchX,
      pitchY,
      rowStagger: 0.5 * pitchX,
      orientation: [1, 0],
      localOutline,
      widthSource: "bodyWidth",
      scaleRatio: scale.value,
    };
    const rows = Math.floor((maximumY - minimumY) / pitchY) + 1;
    const columns = Math.floor((field.maximumX - field.minimumX) / pitchX) + 1;
    if (!Number.isFinite(rows * columns))
      return rejected(
        "candidate-budget",
        "The complete lattice exceeds finite bounds.",
        counts,
      );
    counts.plannedCandidates = rows * columns;
    if (counts.plannedCandidates > profile.maximumCandidates)
      return rejected(
        "candidate-budget",
        "The complete lattice exceeds its candidate budget; no truncated field is returned.",
        counts,
      );
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const center = [
          field.minimumX +
            halfWidth +
            column * pitchX +
            (row % 2) * 0.5 * pitchX,
          minimumY + halfHeight + row * pitchY,
        ];
        const outline = localOutline.map((point) => [
          point[0] + center[0],
          point[1] + center[1],
        ]);
        counts.candidates++;
        let reason = null;
        if (
          outline.some(
            (point) => point[0] < field.minimumX || point[0] > field.maximumX,
          )
        )
          reason = "outside-field";
        else if (!coveringFootprintContained(outline, exterior.outline))
          reason = "exterior-clearance";
        else if (
          ocular.features.some((feature) =>
            discOverlap(outline, feature.center, feature.radius),
          )
        )
          reason = "ocular-clearance";
        else if (roots.some((root) => rootOverlap(outline, root)))
          reason = "root-clearance";
        if (reason) {
          counts.excluded++;
          counts.exclusionReasons[reason] =
            (counts.exclusionReasons[reason] ?? 0) + 1;
          excludedCandidates.push({ row, column, center, reason });
          continue;
        }
        const fragments = pigmentFragments(outline, surfaces);
        if (
          Math.abs(
            fragments.reduce(
              (total, fragment) => total + area(fragment.polygon),
              0,
            ) - area(outline),
          ) > profile.tolerance
        )
          return rejected(
            "pigment-domain",
            "Every plate must be completely covered once by original source pigment masks.",
            counts,
          );
        counts.accepted++;
        if (counts.accepted > profile.maximumPlates)
          return rejected(
            "plate-budget",
            "The complete eligible field exceeds the plate budget; no truncated field is returned.",
            counts,
          );
        plates.push({
          id: `plate-${row}-${column}`,
          row,
          column,
          center,
          orientation: [1, 0],
          outline,
          pigmentFragments: fragments,
          directLocusIds: [...directLocusIds],
          dependencyLocusIds: [...dependencyLocusIds],
        });
      }
    }
    if (!plates.length)
      return rejected(
        "empty-field",
        "No complete plate footprint is eligible in this field; no placement repair is permitted.",
        counts,
      );
  }
  const covering = {
    status: "constructed",
    schemaVersion: "critter-body-covering/1",
    profile: { ...profile },
    sourceResultDigest: digest(result),
    bodyConstructionDigest: body.constructionDigest,
    ocularModuleDigest: ocular.moduleDigest,
    kind: kind.value,
    field,
    plateProfile,
    plates,
    excludedCandidates,
    counts,
    retainedFacts: structuredClone([kind, extent, scale]),
    exclusions:
      kind.value === "scales"
        ? {
            oculars: ocular.features.map((feature) => ({
              id: feature.id,
              center: [...feature.center],
              radius: feature.radius,
              rim: 0.005,
            })),
            roots,
          }
        : { oculars: [], roots: [] },
    traces: [
      {
        targetId: "body-covering",
        directLocusIds,
        dependencyLocusIds,
        sourceSurfaceIds:
          kind.value === "scales" ? surfaces.map((surface) => surface.id) : [],
      },
    ],
    limitations: [
      "Static body-only covering construction; no protection, physiology, motion or finished pet art.",
      "Interval extent is a placement domain, not exact measured percentage of covered body area.",
      "Skin retains inactive extent/scale copies; no plates or hidden surface operation is produced.",
      "Fur and feathers are unsupported and are not represented by symbolic plates.",
    ],
  };
  return { ...covering, coveringDigest: digest(covering) };
}
