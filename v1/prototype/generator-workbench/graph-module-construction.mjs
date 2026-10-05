import { REGIONAL_SCENE_RULE } from "./regional-scene-catalogue.mjs";
import { BODY_ORGANIZATION_RULE } from "./body-organization-catalogue.mjs";
import { digest } from "./evaluate.mjs";
import { constructGraphSource } from "./graph-source-construction.mjs";

export const OCULAR_MODULE_PROFILE = Object.freeze({
  id: "ocular-module/1",
  sourceRuleVersion: "developmental-ocular/1",
  baseGraphRuleVersion: "developmental-analytic/1",
  rimClearance: 0.005,
  pupilRatio: 0.55,
  outerPalette: "#f1eddc",
  pupilPalette: "#273036",
  maximumBoundaryVertices: 4096,
  rootExclusion:
    "Fin chord segments and first hinge root discs (half source width), with rim clearance.",
  construction:
    "X from leading source station longitudinal domain; radius from minimum full width/length; paired Y offsets at half the actual local exterior half-width.",
});

const isRecord = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
function reject(code, message, locusIds = []) {
  return {
    status: "rejected",
    errors: [{ code, message, nodeIds: ["volume-0"], locusIds }],
  };
}

function segmentDistance(center, start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const lengthSquared = dx * dx + dy * dy;
  const projection =
    lengthSquared === 0
      ? 0
      : Math.max(
          0,
          Math.min(
            1,
            ((center[0] - start[0]) * dx + (center[1] - start[1]) * dy) /
              lengthSquared,
          ),
        );
  return Math.hypot(
    center[0] - start[0] - projection * dx,
    center[1] - start[1] - projection * dy,
  );
}

function insidePolygon(center, points) {
  let inside = false;
  for (
    let index = 0, previous = points.length - 1;
    index < points.length;
    previous = index++
  ) {
    const a = points[index];
    const b = points[previous];
    if (
      a[1] > center[1] !== b[1] > center[1] &&
      center[0] < ((b[0] - a[0]) * (center[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      inside = !inside;
  }
  return inside;
}

function localHalfWidth(body, x) {
  const points = body.lowerEnvelope;
  for (let index = 1; index < points.length; index++) {
    const previous = points[index - 1];
    const current = points[index];
    if (x >= previous[0] && x <= current[0]) {
      const fraction = (x - previous[0]) / (current[0] - previous[0]);
      return previous[1] + fraction * (current[1] - previous[1]) - body.centerY;
    }
  }
  return NaN;
}

export function constructOcularModule(result, bodyConstruction, options = {}) {
  const profile =
    options?.profileVersion === "ocular-module/3"
      ? {
          ...OCULAR_MODULE_PROFILE,
          id: "ocular-module/3",
          sourceRuleVersion: REGIONAL_SCENE_RULE,
          baseGraphRuleVersion: BODY_ORGANIZATION_RULE,
        }
      : options?.profileVersion === "ocular-module/2"
        ? {
            ...OCULAR_MODULE_PROFILE,
            id: "ocular-module/2",
            sourceRuleVersion: "developmental-covering/1",
          }
        : OCULAR_MODULE_PROFILE;
  if (
    !isRecord(options) ||
    options.profileVersion !== profile.id ||
    Object.keys(options).some((key) => key !== "profileVersion")
  )
    return reject(
      "unsupported-profile",
      "An explicit ocular-module/1 profile is required.",
    );
  if (
    !isRecord(result) ||
    result.status !== "resolved" ||
    result.baseGraphRuleVersion !== profile.baseGraphRuleVersion ||
    result.ocularModuleRuleVersion !== profile.id ||
    !Array.isArray(result.facts) ||
    (profile.id === "ocular-module/2" &&
      (result.sourceRuleVersion !== profile.sourceRuleVersion ||
        result.coveringModuleRuleVersion !== "body-covering/1"))
  )
    return reject(
      "unsupported-source",
      profile.id === "ocular-module/2"
        ? "Resolved developmental-covering/1 metadata and facts are required."
        : "Resolved developmental-ocular/1 metadata and facts are required.",
    );
  // Reconstruct from the source rather than trusting a rehashed caller-supplied exterior.
  if (
    profile.id === "ocular-module/3" &&
    (result.sourceRuleVersion !== REGIONAL_SCENE_RULE ||
      result.coveringModuleRuleVersion !== "body-covering/2" ||
      result.bodyConstructionProfileVersion !== "graph-source/2")
  )
    return reject(
      "unsupported-source",
      "Exact regional-scene source metadata is required.",
    );
  const expectedBody = constructGraphSource(result, {
    profileVersion:
      profile.id === "ocular-module/3" ? "graph-source/2" : "graph-source/1",
    sourceRuleVersion: result.baseGraphRuleVersion,
  });
  if (
    expectedBody.status !== "constructed" ||
    !isRecord(bodyConstruction) ||
    digest(bodyConstruction) !== digest(expectedBody)
  )
    return reject(
      "body-source-mismatch",
      "The exact graph-source construction for this resolved result is required.",
    );
  const body = expectedBody.bodyExteriors[0];
  if (body.outline.length > profile.maximumBoundaryVertices)
    return reject(
      "geometry-budget",
      "The retained exterior exceeds the ocular boundary budget.",
    );
  const targets = ["ocularPair", "ocularPlacement", "ocularSize"];
  const facts = targets.map((target) =>
    result.facts.filter((fact) => isRecord(fact) && fact.id === target),
  );
  if (facts.some((matches) => matches.length !== 1))
    return reject(
      "module-facts",
      "Exactly one presence, placement and size fact is required.",
    );
  const [presence, placement, size] = facts.map((matches) => matches[0]);
  if (
    typeof presence.value !== "boolean" ||
    !Number.isFinite(placement.value) ||
    placement.value < 0.35 ||
    placement.value > 0.65 ||
    !Number.isFinite(size.value) ||
    size.value < 0.18 ||
    size.value > 0.24 ||
    [presence, placement, size].some(
      (fact) =>
        ![fact.sources, fact.prerequisites, fact.copies].every(
          (values) =>
            Array.isArray(values) &&
            values.every((value) => typeof value === "string"),
        ) || fact.copies.length !== 2,
    )
  )
    return reject(
      "module-facts",
      "Bounded typed module values and retained copy/source arrays are required.",
    );
  if (
    presence.state !== "expressed" ||
    [placement, size].some(
      (fact) => fact.state !== (presence.value ? "expressed" : "inactive"),
    )
  )
    return reject(
      "module-state",
      "Presence and dependent expression states must agree.",
    );
  let sources = presence.value
    ? [
        ...new Set(
          [presence, placement, size].flatMap((fact) => [
            ...fact.sources,
            ...fact.prerequisites,
          ]),
        ),
      ]
    : [...presence.sources];
  if (profile.id === "ocular-module/3") {
    const inactiveRegional = result.facts
      .filter(
        (fact) =>
          isRecord(fact) &&
          ["regionalGrowth", "joinNeckRatio"].includes(fact.id) &&
          fact.state === "inactive",
      )
      .map((fact) => fact.locusId);
    sources = sources.filter((id) => !inactiveRegional.includes(id));
  }
  const features = [];
  let geometryRule = null;
  if (presence.value) {
    const station = body.stations.find((item) => item.nodeId === "volume-0");
    if (!station)
      return reject(
        "leading-domain",
        "The actual leading source volume is required.",
      );
    const x =
      station.position[0] -
      station.dimensions[0] / 2 +
      placement.value * station.dimensions[0];
    const halfWidth = localHalfWidth(body, x);
    const radius =
      size.value * Math.min(station.dimensions[1], station.dimensions[0]);
    if (
      ![x, halfWidth, radius].every(Number.isFinite) ||
      halfWidth <= 0 ||
      radius <= 0
    )
      return reject(
        "leading-domain",
        "The leading domain must produce finite positive geometry.",
      );
    if (
      x - radius < station.position[0] - station.dimensions[0] / 2 ||
      x + radius > station.position[0] + station.dimensions[0] / 2
    )
      return reject(
        "leading-domain",
        "The whole ocular circle must remain inside the leading longitudinal domain.",
        sources,
      );
    geometryRule = {
      sourceNodeId: station.nodeId,
      sourcePosition: [...station.position],
      sourceDimensions: [...station.dimensions],
      longitudinalX: x,
      localHalfWidth: halfWidth,
      radius,
      placementRatio: placement.value,
      sizeRatio: size.value,
    };
    for (const side of [-1, 1]) {
      const center = [x, station.position[1] + side * 0.5 * halfWidth];
      const clearance = Math.min(
        ...body.outline.map((point, index) =>
          segmentDistance(
            center,
            point,
            body.outline[(index + 1) % body.outline.length],
          ),
        ),
      );
      if (
        !insidePolygon(center, body.outline) ||
        clearance < radius + profile.rimClearance
      )
        return reject(
          "ocular-containment",
          "The full ocular circle must retain exterior rim clearance; no shrink or relocation is permitted.",
          sources,
        );
      for (const appendage of expectedBody.appendages.filter(
        (item) => item.parentNodeId === station.nodeId,
      )) {
        const distance =
          appendage.role === "fin"
            ? segmentDistance(center, ...appendage.rootChord)
            : Math.hypot(
                center[0] - appendage.root[0],
                center[1] - appendage.root[1],
              ) -
              appendage.width / 2;
        if (distance < radius + profile.rimClearance)
          return reject(
            "ocular-root-overlap",
            "The ocular circle overlaps a retained appendage root exclusion.",
            sources,
          );
      }
      features.push({
        id: side < 0 ? "ocular-negative" : "ocular-positive",
        role: "ocular",
        sourceNodeId: station.nodeId,
        center,
        radius,
        pupilRadius: radius * profile.pupilRatio,
        outerPalette: profile.outerPalette,
        pupilPalette: profile.pupilPalette,
        sources: [...sources],
      });
    }
    if (
      Math.hypot(
        features[0].center[0] - features[1].center[0],
        features[0].center[1] - features[1].center[1],
      ) <
      2 * radius + profile.rimClearance
    )
      return reject(
        "ocular-pair-overlap",
        "The pair must retain a positive separating rim.",
        sources,
      );
  }
  const module = {
    status: "constructed",
    schemaVersion:
      profile.id === "ocular-module/3"
        ? "critter-ocular-module/3"
        : profile.id === "ocular-module/2"
          ? "critter-ocular-module/2"
          : "critter-ocular-module/1",
    profile: { ...profile },
    sourceResultDigest: digest(result),
    bodyConstructionDigest: expectedBody.constructionDigest,
    enabled: presence.value,
    features,
    geometryRule,
    retainedFacts: structuredClone([presence, placement, size]),
    traces: [
      {
        targetId: "ocular-module",
        sourceNodeIds: presence.value ? ["volume-0"] : [],
        locusIds: sources,
      },
    ],
    limitations: [
      "Static circular module geometry only; no sensing, emotion, behavior, mouth or finished pet-art claim.",
      "Fixed module material and pupil ratio are explicit provisional profile constants.",
      "OFF retains inactive inherited placement/size without consuming them as visible geometry.",
    ],
  };
  return { ...module, moduleDigest: digest(module) };
}
