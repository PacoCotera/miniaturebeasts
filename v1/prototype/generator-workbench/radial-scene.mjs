import { digest } from "./evaluate.mjs";
import { constructRadialGraphSource } from "./graph-radial-construction.mjs";

export const RADIAL_SCENE_VERSION = "module-scene/3";
export const RADIAL_OCULAR_PROFILE = Object.freeze({
  id: "ocular-radial-slice/1",
  rim: 0.005,
  pupilRatio: 0.55,
  outerPigment: "#f1eddc",
  pupilPigment: "#273036",
  boundarySearchSamples: 128,
  boundarySearchIterations: 48,
  attachment:
    "Diagnostic YZ module slice at inherited X, not exterior eye tissue.",
});
export const RADIAL_COVERING_PROFILE = Object.freeze({
  id: "covering-radial-surface/1",
  intervalStart: 0.2,
  halfHeightRatio: 0.65,
  pitchXRatio: 1.35,
  angularPitchRatio: 1.1,
  staggerRatio: 0.5,
  contourSamples: 24,
  taperBase: 0.82,
  taperAmplitude: 0.18,
  rim: 0.005,
  maximumCandidates: 1024,
  maximumPlates: 128,
  maximumVertices: 4096,
  view: "Look from negative X; retain rear coverage without painting it through the body.",
  footprint:
    "Continuous local plate polygon mapped through the ellipsoid atlas; 24 retained boundary samples approximate the curved perimeter. Whole parameter rectangle bounds enclose its full continuous surface patch.",
  vertexBudget:
    "Sum of mapped plate outlines, pigment-fragment outlines and front-fragment outlines; maximum4096.",
  exclusion:
    "Conservative full mapped-footprint XYZ bounds clear root spheres and ocular slice discs; excluded safe candidates are possible.",
});
const record = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const unique = (...groups) => [...new Set(groups.flat())];
const distance = (a, b) =>
  Math.hypot(...a.map((value, index) => value - b[index]));
const rejected = (code, message, extra = {}) => ({
  status: "rejected",
  errors: [{ code, message, nodeIds: [], locusIds: [] }],
  ...extra,
});

function validOptions(options, profile) {
  return (
    record(options) &&
    options.profileVersion === profile &&
    Object.keys(options).every((key) => key === "profileVersion")
  );
}
function sourceBody(result) {
  return constructRadialGraphSource(result, {
    profileVersion: "graph-radial/1",
    sourceRuleVersion: "developmental-regional-scene/1",
  });
}
function verifiedBody(result, body) {
  const expected = sourceBody(result);
  return expected.status === "constructed" && digest(expected) === digest(body)
    ? expected
    : null;
}
function fact(result, id) {
  return result.facts.find((item) => item.id === id);
}
function trace(direct, dependencies, targetId) {
  return {
    targetId,
    directLocusIds: unique(...direct.map((item) => item.sources)),
    dependencyLocusIds: unique(...dependencies),
    locusIds: unique(...direct.map((item) => item.sources), ...dependencies),
  };
}
function ellipseBoundaryDistance(y, radiusY, radiusZ) {
  const squared = (angle) =>
    (radiusY * Math.cos(angle) - y) ** 2 + (radiusZ * Math.sin(angle)) ** 2;
  const count = RADIAL_OCULAR_PROFILE.boundarySearchSamples;
  let nearest = 0;
  for (let index = 1; index < count; index++)
    if (
      squared((index * Math.PI) / count) < squared((nearest * Math.PI) / count)
    )
      nearest = index;
  let low = Math.max(0, ((nearest - 1) * Math.PI) / count),
    high = Math.min(Math.PI, ((nearest + 1) * Math.PI) / count);
  const ratio = (Math.sqrt(5) - 1) / 2;
  for (
    let iteration = 0;
    iteration < RADIAL_OCULAR_PROFILE.boundarySearchIterations;
    iteration++
  ) {
    const left = high - ratio * (high - low),
      right = low + ratio * (high - low);
    if (squared(left) < squared(right)) high = right;
    else low = left;
  }
  return Math.sqrt(
    Math.min(squared(0), squared(Math.PI), squared((low + high) / 2)),
  );
}
export function constructRadialOcularSlice(
  result,
  body,
  options = { profileVersion: RADIAL_OCULAR_PROFILE.id },
) {
  if (!validOptions(options, RADIAL_OCULAR_PROFILE.id))
    return rejected(
      "ocular-profile",
      "Exact ocular-radial-slice/1 options required.",
    );
  const expected = verifiedBody(result, body);
  if (!expected)
    return rejected(
      "ocular-body-binding",
      "Body must equal independently reconstructed radial source.",
    );
  const presence = fact(result, "ocularPair");
  if (presence.state !== "expressed" || typeof presence.value !== "boolean")
    return rejected(
      "ocular-presence",
      "Active typed ocular presence required.",
    );
  let plane = null,
    features = [];
  let dependencies = [];
  const direct = [presence];
  if (presence.value) {
    const placement = fact(result, "ocularPlacement"),
      size = fact(result, "ocularSize");
    if (
      placement.state !== "expressed" ||
      size.state !== "expressed" ||
      !Number.isFinite(placement.value) ||
      !Number.isFinite(size.value) ||
      placement.value <= 0 ||
      placement.value >= 1 ||
      size.value <= 0
    )
      return rejected(
        "ocular-parameters",
        "Active finite ocular placement and size required.",
      );
    direct.push(placement, size);
    dependencies = [
      body.body.sources,
      ...body.chainRoots.map((root) => root.sources),
      ...body.appendages.map((segment) => segment.sources),
    ];
    const center = body.body.center,
      axes = body.body.halfAxes;
    const x = center[0] + (placement.value - 0.5) * 2 * axes[0];
    const factor = Math.sqrt(1 - ((x - center[0]) / axes[0]) ** 2);
    const radiusY = axes[1] * factor,
      radiusZ = axes[2] * factor;
    const radius = size.value * Math.min(2 * axes[0], 2 * axes[1]);
    const offset = 0.5 * radiusY;
    const clearance = ellipseBoundaryDistance(offset, radiusY, radiusZ);
    if (
      !Number.isFinite(clearance) ||
      clearance < radius + RADIAL_OCULAR_PROFILE.rim ||
      2 * offset < 2 * radius + RADIAL_OCULAR_PROFILE.rim
    )
      return rejected(
        "ocular-clearance",
        "Full circles and pair rim do not fit the retained ellipsoid slice; no shrinking or relocation.",
      );
    plane = {
      x,
      localHalfAxes: [radiusY, radiusZ],
      radius,
      size: size.value,
      placement: placement.value,
      minimumBoundaryDistance: clearance,
      scope: RADIAL_OCULAR_PROFILE.attachment,
    };
    features = [-1, 1].map((side, index) => {
      const centerXYZ = [x, center[1] + side * offset, center[2]];
      return {
        id: "radial-eye-" + index,
        centerXYZ,
        projectedCenter: centerXYZ.slice(1),
        radius,
        pupilRadius: radius * RADIAL_OCULAR_PROFILE.pupilRatio,
        outerPigment: RADIAL_OCULAR_PROFILE.outerPigment,
        pupilPigment: RADIAL_OCULAR_PROFILE.pupilPigment,
      };
    });
    for (const feature of features)
      for (const root of body.chainRoots) {
        const segment = body.appendages.find(
          (item) =>
            item.chainIndex === root.chainIndex && item.segmentIndex === 0,
        );
        const separation = distance(feature.centerXYZ, root.rootXYZ);
        if (separation < radius + segment.width / 2 + RADIAL_OCULAR_PROFILE.rim)
          return rejected(
            "ocular-root-clearance",
            "Ocular slice intersects retained XYZ root clearance.",
          );
      }
  }
  const ocular = {
    status: "constructed",
    profile: { ...RADIAL_OCULAR_PROFILE },
    sourceResultDigest: digest(result),
    bodyDigest: body.constructionDigest,
    enabled: presence.value,
    plane,
    features,
    traces: [trace(direct, dependencies, "radial-ocular-slice")],
    limitations: [RADIAL_OCULAR_PROFILE.attachment],
  };
  return { ...ocular, moduleDigest: digest(ocular) };
}
function clipPolygon(points, axis, boundary, keepLower) {
  const output = [];
  for (let index = 0; index < points.length; index++) {
    const current = points[index],
      next = points[(index + 1) % points.length];
    const inside = keepLower
      ? current[axis] <= boundary
      : current[axis] >= boundary;
    const nextInside = keepLower
      ? next[axis] <= boundary
      : next[axis] >= boundary;
    if (inside) output.push(current);
    if (inside !== nextInside) {
      const ratio = (boundary - current[axis]) / (next[axis] - current[axis]);
      output.push(
        current.map((value, i) =>
          i === axis ? boundary : value + ratio * (next[i] - value),
        ),
      );
    }
  }
  return output;
}
const boundDistance = (point, bounds) =>
  Math.hypot(
    ...point.map((value, index) =>
      Math.max(bounds.minimum[index] - value, 0, value - bounds.maximum[index]),
    ),
  );
function mappedPoint(body, x, theta) {
  const { center, halfAxes } = body;
  const factor = Math.sqrt(1 - ((x - center[0]) / halfAxes[0]) ** 2);
  return [
    x,
    center[1] + halfAxes[1] * factor * Math.cos(theta),
    center[2] + halfAxes[2] * factor * Math.sin(theta),
  ];
}
function surfaceFrame(body, x, theta) {
  const { center, halfAxes } = body;
  const point = mappedPoint(body, x, theta);
  const factor = Math.sqrt(1 - ((x - center[0]) / halfAxes[0]) ** 2);
  const normalize = (vector) => {
    const length = Math.hypot(...vector);
    return vector.map((value) => value / length);
  };
  return {
    longitudinal: normalize([
      1,
      (-halfAxes[1] * (x - center[0]) * Math.cos(theta)) /
        (halfAxes[0] ** 2 * factor),
      (-halfAxes[2] * (x - center[0]) * Math.sin(theta)) /
        (halfAxes[0] ** 2 * factor),
    ]),
    circumferential: normalize([
      0,
      -halfAxes[1] * factor * Math.sin(theta),
      halfAxes[2] * factor * Math.cos(theta),
    ]),
    normal: normalize(
      point.map(
        (value, index) => (value - center[index]) / halfAxes[index] ** 2,
      ),
    ),
  };
}
function footprintBounds(body, atlas) {
  const xs = atlas.map((point) => point[0]),
    angles = atlas.map((point) => point[1]);
  const lowX = Math.min(...xs),
    highX = Math.max(...xs),
    lowTheta = Math.min(...angles),
    highTheta = Math.max(...angles);
  const candidateX = [lowX, highX];
  if (lowX <= body.center[0] && highX >= body.center[0])
    candidateX.push(body.center[0]);
  const candidateTheta = [lowTheta, highTheta];
  for (
    let n = Math.ceil(lowTheta / (Math.PI / 2));
    n <= Math.floor(highTheta / (Math.PI / 2));
    n++
  )
    candidateTheta.push((n * Math.PI) / 2);
  const points = candidateX.flatMap((x) =>
    candidateTheta.map((theta) => mappedPoint(body, x, theta)),
  );
  return {
    minimum: [
      lowX,
      Math.min(...points.map((point) => point[1])),
      Math.min(...points.map((point) => point[2])),
    ],
    maximum: [
      highX,
      Math.max(...points.map((point) => point[1])),
      Math.max(...points.map((point) => point[2])),
    ],
  };
}
function pigmentFragments(body, atlas, palette) {
  if (palette.length === 1)
    return [
      {
        paletteIndex: 0,
        atlasOutline: atlas,
        outlineXYZ: atlas.map(([x, theta]) => mappedPoint(body, x, theta)),
      },
    ];
  const minimum = Math.min(...atlas.map((point) => point[1])),
    maximum = Math.max(...atlas.map((point) => point[1]));
  const breaks = [minimum, maximum];
  for (
    let n = Math.ceil((minimum - Math.PI / 2) / Math.PI);
    Math.PI / 2 + n * Math.PI < maximum;
    n++
  )
    breaks.push(Math.PI / 2 + n * Math.PI);
  breaks.sort((a, b) => a - b);
  const fragments = [];
  for (let index = 0; index < breaks.length - 1; index++) {
    let polygon = clipPolygon(atlas, 1, breaks[index], false);
    polygon = clipPolygon(polygon, 1, breaks[index + 1], true);
    if (polygon.length < 3) continue;
    const paletteIndex =
      Math.cos((breaks[index] + breaks[index + 1]) / 2) < 0 ? 0 : 1;
    fragments.push({
      paletteIndex,
      atlasOutline: polygon,
      outlineXYZ: polygon.map(([x, theta]) => mappedPoint(body, x, theta)),
    });
  }
  return fragments;
}
export function constructRadialCovering(
  result,
  body,
  ocular,
  options = { profileVersion: RADIAL_COVERING_PROFILE.id },
) {
  if (!validOptions(options, RADIAL_COVERING_PROFILE.id))
    return rejected(
      "covering-profile",
      "Exact covering-radial-surface/1 options required.",
    );
  const expected = verifiedBody(result, body);
  if (!expected)
    return rejected(
      "covering-body-binding",
      "Verified full radial body required.",
    );
  const expectedOcular = constructRadialOcularSlice(result, expected);
  if (
    expectedOcular.status !== "constructed" ||
    digest(expectedOcular) !== digest(ocular)
  )
    return rejected(
      "covering-ocular-binding",
      "Ocular must equal independent full reconstruction.",
    );
  const kind = fact(result, "coveringKind");
  if (kind.state !== "expressed" || !["skin", "scales"].includes(kind.value))
    return rejected("covering-kind", "Active skin/scales kind required.");
  const plates = [],
    excluded = [];
  let field = null,
    candidateCount = 0;
  const direct = [kind];
  let dependencies = [];
  const sourceSurface = body.surfaces.find(
    (surface) => surface.region === "volume",
  );
  if (kind.value === "scales") {
    const extent = fact(result, "coveringExtent"),
      scale = fact(result, "coveringScale"),
      width = fact(result, "bodyWidth");
    if (
      [extent, scale, width].some(
        (item) =>
          item.state !== "expressed" ||
          !Number.isFinite(item.value) ||
          item.value <= 0,
      ) ||
      0.2 + extent.value >= 1
    )
      return rejected(
        "covering-parameters",
        "Active finite extent/scale/body width within ellipsoid domain required.",
      );
    direct.push(extent, scale);
    dependencies = [
      body.body.sources,
      ...body.chainRoots.map((root) => root.sources),
      ...body.appendages.map((segment) => segment.sources),
      ...ocular.traces.map((item) => item.locusIds),
      sourceSurface.sources,
    ];
    const h = scale.value * width.value,
      bodyShape = body.body,
      axes = bodyShape.halfAxes;
    const halfHeight = 0.65 * h,
      pitchX = 1.35 * h,
      pitchTheta = (1.1 * h) / Math.max(axes[1], axes[2]);
    const minimumX = bodyShape.center[0] - axes[0] + 0.2 * 2 * axes[0],
      maximumX =
        bodyShape.center[0] - axes[0] + (0.2 + extent.value) * 2 * axes[0];
    if (
      ![h, pitchX, pitchTheta, minimumX, maximumX].every(Number.isFinite) ||
      pitchX <= 0 ||
      pitchTheta <= 0
    )
      return rejected("covering-grid", "Finite nonzero grid required.");
    const rows = Math.ceil((2 * Math.PI) / pitchTheta),
      columns = Math.ceil((maximumX - minimumX) / pitchX);
    if (
      !Number.isSafeInteger(rows) ||
      !Number.isSafeInteger(columns) ||
      rows * columns > 1024
    )
      return rejected(
        "covering-candidate-budget",
        "Whole candidate grid exceeds unchanged1024 limit.",
      );
    field = {
      interval: [0.2, 0.2 + extent.value],
      xRange: [minimumX, maximumX],
      halfWidth: h,
      halfHeight,
      pitchX,
      pitchTheta,
      sourceSurfaceId: sourceSurface.id,
      palette: [...sourceSurface.palette],
      materialAxis:
        "Actual body Y low/high fields, independent of inherited X coverage interval.",
    };
    for (let row = 0; row < rows; row++)
      for (let column = 0; column < columns; column++) {
        const rootX = minimumX + h + column * pitchX + (row % 2) * 0.5 * pitchX,
          theta = row * pitchTheta;
        const id = `radial-plate-${row}-${column}`;
        candidateCount++;
        const atlasOutline = Array.from({ length: 24 }, (_, index) => {
          const angle = (index * 2 * Math.PI) / 24;
          return [
            rootX + h * Math.cos(angle),
            theta +
              (halfHeight * Math.sin(angle) * (0.82 + 0.18 * Math.cos(angle))) /
                Math.max(axes[1], axes[2]),
          ];
        });
        if (
          atlasOutline.some(
            ([x]) =>
              x < minimumX ||
              x > maximumX ||
              Math.abs((x - bodyShape.center[0]) / axes[0]) >= 1,
          )
        ) {
          excluded.push({
            id,
            rootX,
            theta,
            atlasOutline,
            reason: "whole-footprint-outside-longitudinal-field",
          });
          continue;
        }
        const bounds = footprintBounds(bodyShape, atlasOutline);
        let reason = null;
        for (const root of body.chainRoots) {
          const segment = body.appendages.find(
            (item) =>
              item.chainIndex === root.chainIndex && item.segmentIndex === 0,
          );
          if (
            boundDistance(root.rootXYZ, bounds) <=
            segment.width / 2 + 0.005
          ) {
            reason = "conservative-XYZ-root-clearance";
            break;
          }
        }
        if (!reason)
          for (const eye of ocular.features) {
            const withinPlane =
              eye.centerXYZ[0] >= bounds.minimum[0] - 0.005 &&
              eye.centerXYZ[0] <= bounds.maximum[0] + 0.005;
            const yzDistance = Math.hypot(
              ...[1, 2].map((axis) =>
                Math.max(
                  bounds.minimum[axis] - eye.centerXYZ[axis],
                  0,
                  eye.centerXYZ[axis] - bounds.maximum[axis],
                ),
              ),
            );
            if (withinPlane && yzDistance <= eye.radius + 0.005) {
              reason = "conservative-XYZ-ocular-slice-clearance";
              break;
            }
          }
        if (reason) {
          excluded.push({ id, rootX, theta, reason, bounds, atlasOutline });
          continue;
        }
        const outlineXYZ = atlasOutline.map(([x, t]) =>
          mappedPoint(bodyShape, x, t),
        );
        const fragments = pigmentFragments(
          bodyShape,
          atlasOutline,
          sourceSurface.palette,
        );
        const visibleAtlas = clipPolygon(
          atlasOutline,
          0,
          bodyShape.center[0],
          true,
        );
        const visibleFragments =
          visibleAtlas.length >= 3
            ? pigmentFragments(bodyShape, visibleAtlas, sourceSurface.palette)
            : [];
        plates.push({
          id,
          row,
          column,
          rootXYZ: mappedPoint(bodyShape, rootX, theta),
          rootAtlas: [rootX, theta],
          localFrame: surfaceFrame(bodyShape, rootX, theta),
          atlasOutline,
          outlineXYZ,
          projectedOutline: outlineXYZ.map((point) => point.slice(1)),
          bounds,
          pigmentFragments: fragments,
          visibleFragments: visibleFragments.map((fragment) => ({
            ...fragment,
            projectedOutline: fragment.outlineXYZ.map((point) =>
              point.slice(1),
            ),
          })),
          visibleOutline: visibleAtlas.map(([x, t]) =>
            mappedPoint(bodyShape, x, t).slice(1),
          ),
          visibility:
            visibleAtlas.length >= 3 ? "front-fragment" : "hidden-rear",
          sourceSurfaceId: sourceSurface.id,
        });
        if (plates.length > 128)
          return rejected(
            "covering-plate-budget",
            "Accepted plate field exceeds unchanged128 limit.",
          );
      }
    if (!plates.length)
      return rejected(
        "covering-empty-field",
        "No complete plate clears the inherited field/exclusion rules.",
        { candidateCount, excluded },
      );
    const vertexCount = plates.reduce(
      (sum, plate) =>
        sum +
        plate.outlineXYZ.length +
        plate.pigmentFragments.reduce(
          (n, fragment) => n + fragment.outlineXYZ.length,
          0,
        ) +
        plate.visibleFragments.reduce(
          (n, fragment) => n + fragment.outlineXYZ.length,
          0,
        ),
      0,
    );
    if (vertexCount > 4096)
      return rejected(
        "covering-vertex-budget",
        "Retained mapped plate geometry exceeds unchanged4096 vertex bound.",
      );
    if (
      plates.some((plate) =>
        plate.outlineXYZ.some((point) =>
          point.some(
            (value) => !Number.isFinite(value) || Math.abs(value) > 10000,
          ),
        ),
      )
    )
      return rejected(
        "covering-nonfinite",
        "Mapped footprint exceeds finite source bounds.",
      );
  }
  const covering = {
    status: "constructed",
    profile: { ...RADIAL_COVERING_PROFILE },
    sourceResultDigest: digest(result),
    bodyDigest: body.constructionDigest,
    ocularDigest: ocular.moduleDigest,
    kind: kind.value,
    field,
    plates,
    candidateCount,
    excluded,
    visibleCount: plates.filter(
      (plate) => plate.visibility === "front-fragment",
    ).length,
    hiddenCount: plates.filter((plate) => plate.visibility === "hidden-rear")
      .length,
    traces: [trace(direct, dependencies, "radial-body-covering")],
    limitations: [
      "Analytical ellipsoid surface sampling, not tissue/armor physics or measured area coverage.",
      "Negative-X reference paints only front fragments; rear extent remains in full artifact.",
    ],
  };
  return { ...covering, coveringDigest: digest(covering) };
}
export function constructRadialScene(
  result,
  options = { profileVersion: RADIAL_SCENE_VERSION },
) {
  if (!validOptions(options, RADIAL_SCENE_VERSION))
    return {
      ...rejected("radial-scene-profile", "Exact module-scene/3 required."),
      stage: "source",
    };
  const body = sourceBody(result);
  if (body.status !== "constructed") return { ...body, stage: "body" };
  const ocular = constructRadialOcularSlice(result, body);
  if (ocular.status !== "constructed") return { ...ocular, stage: "ocular" };
  const covering = constructRadialCovering(result, body, ocular);
  if (covering.status !== "constructed")
    return { ...covering, stage: "covering" };
  const scene = {
    status: "constructed",
    schemaVersion: "critter-module-scene/1",
    profileVersion: RADIAL_SCENE_VERSION,
    sourceResultDigest: digest(result),
    body,
    ocular,
    covering,
    limitations: [
      "Static negative-X YZ source projection with diagnostic ocular slice; not exterior eye tissue, physical anatomy, animation or finished pet art.",
    ],
  };
  return { ...scene, sceneDigest: digest(scene) };
}
