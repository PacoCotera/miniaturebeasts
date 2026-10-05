import { digest } from "./evaluate.mjs";
export const RADIAL_SOURCE_PROFILE = Object.freeze({
  id: "graph-radial/1",
  sourceRuleVersion: "developmental-regional-scene/1",
  maximumNodes: 64,
  maximumEdges: 128,
  maximumVertices: 4096,
  maximumCoordinateMagnitude: 10000,
  tolerance: 2e-6,
  ellipseSamples: 96,
  sweptCapSamples: 16,
  firstHingeForwardFraction: 0.3,
  sourceHeightDisplacement: -0.25,
  view: "Orthographic along X; page horizontal=Y, vertical=Z down; X retained as depth.",
  bodyPrimitive:
    "One ellipsoid with source full dimensions; no joined tissue or head.",
  segmentPrimitive:
    "Neutral round-ended swept segment of source width/2; not physical joints.",
  atlas:
    "Body local-u normalized projected Y; segments local-u root to tip, with end caps assigned to their nearest endpoint. Equal masks in source order.",
  textureProjection:
    "Fine-ridged: six transverse inspection lines clipped to each owning surface; neutral ink, not inherited pigment.",
  paintOrder:
    "Body first, contacts over body for inspection; not opacity or physical depth sorting.",
});
const record = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const strings = (value) =>
  Array.isArray(value) && value.every((item) => typeof item === "string");
const vector = (value) =>
  Array.isArray(value) &&
  value.length === 3 &&
  value.every((item) => Number.isFinite(item) && Math.abs(item) <= 10000);
const unique = (...groups) => [...new Set(groups.flat())];
const subtract = (a, b) => a.map((value, index) => value - b[index]);
const add = (a, b) => a.map((value, index) => value + b[index]);
const dot = (a, b) =>
  a.reduce((sum, value, index) => sum + value * b[index], 0);
const near = (a, b) => Math.abs(a - b) <= RADIAL_SOURCE_PROFILE.tolerance;
function reject(code, message, nodeIds = []) {
  return {
    status: "rejected",
    errors: [{ code, message, nodeIds, locusIds: [] }],
  };
}
function factMap(result) {
  const facts = new Map();
  for (const fact of result.facts) {
    if (
      !record(fact) ||
      typeof fact.id !== "string" ||
      facts.has(fact.id) ||
      !strings(fact.sources) ||
      !strings(fact.prerequisites) ||
      (Object.hasOwn(fact, "copies") && !strings(fact.copies))
    )
      return null;
    facts.set(fact.id, fact);
  }
  return facts;
}
function circle(center, radiusX, radiusY, samples) {
  return Array.from({ length: samples }, (_, index) => {
    const angle = (index * 2 * Math.PI) / samples;
    return [
      center[0] + radiusX * Math.cos(angle),
      center[1] + radiusY * Math.sin(angle),
    ];
  });
}
function capsule(start, end, radius) {
  const angle = Math.atan2(end[1] - start[1], end[0] - start[0]);
  const points = [];
  for (let index = 0; index <= RADIAL_SOURCE_PROFILE.sweptCapSamples; index++) {
    const a =
      angle -
      Math.PI / 2 +
      (index * Math.PI) / RADIAL_SOURCE_PROFILE.sweptCapSamples;
    points.push([end[0] + radius * Math.cos(a), end[1] + radius * Math.sin(a)]);
  }
  for (let index = 0; index <= RADIAL_SOURCE_PROFILE.sweptCapSamples; index++) {
    const a =
      angle +
      Math.PI / 2 +
      (index * Math.PI) / RADIAL_SOURCE_PROFILE.sweptCapSamples;
    points.push([
      start[0] + radius * Math.cos(a),
      start[1] + radius * Math.sin(a),
    ]);
  }
  return points;
}
function ellipsoidMinimum(start, end, body) {
  const origin = subtract(start, body.center).map(
    (value, index) => value / body.halfAxes[index],
  );
  const delta = subtract(end, start).map(
    (value, index) => value / body.halfAxes[index],
  );
  const squared = dot(delta, delta);
  const t =
    squared === 0 ? 0 : Math.max(0, Math.min(1, -dot(origin, delta) / squared));
  return dot(
    add(
      origin,
      delta.map((value) => value * t),
    ),
    add(
      origin,
      delta.map((value) => value * t),
    ),
  );
}
function validate(result, options) {
  if (
    !record(options) ||
    options.profileVersion !== RADIAL_SOURCE_PROFILE.id ||
    options.sourceRuleVersion !== RADIAL_SOURCE_PROFILE.sourceRuleVersion ||
    Object.keys(options).some(
      (key) => !["profileVersion", "sourceRuleVersion"].includes(key),
    )
  )
    return reject(
      "unsupported-profile",
      "Exact graph-radial/1 and regional-scene source conventions are required.",
    );
  if (
    !record(result) ||
    result.status !== "resolved" ||
    result.sourceRuleVersion !== RADIAL_SOURCE_PROFILE.sourceRuleVersion ||
    result.baseGraphRuleVersion !== "developmental-regional-growth/1" ||
    result.bodyConstructionProfileVersion !== "graph-source/2" ||
    result.ocularModuleRuleVersion !== "ocular-module/3" ||
    result.coveringModuleRuleVersion !== "body-covering/2" ||
    !record(result.graph) ||
    !Array.isArray(result.facts)
  )
    return reject(
      "unsupported-source",
      "Exact resolved regional scene source metadata and facts are required.",
    );
  const { nodes, edges, surfaces } = result.graph;
  if (
    !Array.isArray(nodes) ||
    !nodes.length ||
    nodes.length > 64 ||
    !Array.isArray(edges) ||
    edges.length > 128 ||
    !Array.isArray(surfaces)
  )
    return reject(
      "source-budget",
      "Bounded node, edge and surface arrays are required.",
    );
  const facts = factMap(result);
  if (!facts)
    return reject(
      "malformed-facts",
      "Unique typed fact source arrays are required.",
    );
  for (const id of [
    "ocularPair",
    "ocularPlacement",
    "ocularSize",
    "coveringKind",
    "coveringExtent",
    "coveringScale",
  ])
    if (!facts.has(id))
      return reject(
        "missing-module-facts",
        "Complete retained eye and covering facts are required, even though this consumer does not project them.",
      );
  const required = {
    symmetry: "radial",
    axialCount: 1,
    attachmentGroups: 1,
    membranes: false,
    fins: false,
    axialActuator: false,
    markings: false,
  };
  for (const [id, value] of Object.entries(required)) {
    const fact = facts.get(id);
    if (!fact || fact.state !== "expressed" || fact.value !== value)
      return reject(
        "ineligible-source",
        "Single radial, one-group contacts with no deformation, membrane, fin or marks are required.",
      );
  }
  const links = facts.get("links");
  if (!links || links.state !== "expressed" || ![1, 2].includes(links.value))
    return reject(
      "ineligible-chain",
      "Exactly one or two inherited links per radial chain are supported.",
    );
  const byId = new Map();
  for (const node of nodes) {
    if (
      !record(node) ||
      typeof node.id !== "string" ||
      !/^[a-zA-Z0-9_.:-]+$/.test(node.id) ||
      byId.has(node.id) ||
      !vector(node.position) ||
      !vector(node.dimensions) ||
      node.dimensions.some((value) => value <= 0) ||
      !strings(node.sources)
    )
      return reject(
        "malformed-node",
        "Unique finite bounded nodes and source arrays are required.",
      );
    if (!["volume", "link", "contact-link"].includes(node.role))
      return reject(
        "unsupported-role",
        "Only one volume and articulated contact chains are supported.",
      );
    byId.set(node.id, node);
  }
  const volumes = nodes.filter((node) => node.role === "volume");
  if (
    volumes.length !== 1 ||
    nodes.length !== 1 + 3 * links.value ||
    volumes[0].deformation !== "none"
  )
    return reject(
      "ineligible-counts",
      "One undeformed volume and exactly three complete contact chains are required.",
    );
  const volume = volumes[0];
  for (const [index, id] of [
    "bodyLength",
    "bodyWidth",
    "bodyHeight",
  ].entries()) {
    const fact = facts.get(id);
    if (
      !fact ||
      fact.state !== "expressed" ||
      !Number.isFinite(fact.value) ||
      fact.value <= 0 ||
      !near(fact.value, volume.dimensions[index])
    )
      return reject(
        "body-facts",
        "Active body dimensions must match the actual single source volume.",
      );
  }
  const parents = new Map(),
    children = new Map(),
    edgeIds = new Set();
  for (const edge of edges) {
    if (
      !record(edge) ||
      typeof edge.id !== "string" ||
      edgeIds.has(edge.id) ||
      !byId.has(edge.from) ||
      !byId.has(edge.to) ||
      edge.to === volume.id ||
      edge.role !== "hinge" ||
      parents.has(edge.to) ||
      !strings(edge.sources)
    )
      return reject(
        "malformed-edge",
        "Unique non-dangling hinge parents and edge sources are required.",
      );
    edgeIds.add(edge.id);
    parents.set(edge.to, edge);
    if (!children.has(edge.from)) children.set(edge.from, []);
    children.get(edge.from).push(edge.to);
  }
  if (
    edges.length !== nodes.length - 1 ||
    (children.get(volume.id) ?? []).length !== 3
  )
    return reject(
      "chain-topology",
      "Exactly three roots and one parent for every segment are required.",
    );
  const visited = new Set([volume.id]),
    chains = [];
  for (const root of children.get(volume.id)) {
    const chain = [];
    let id = root;
    while (id) {
      if (visited.has(id))
        return reject("cyclic-chain", "Chains must be acyclic and distinct.");
      visited.add(id);
      chain.push(byId.get(id));
      const next = children.get(id) ?? [];
      if (next.length > 1)
        return reject("branched-chain", "Branches are unsupported.");
      id = next[0];
    }
    if (
      chain.length !== links.value ||
      chain.some(
        (node, index) =>
          node.role !== (index === chain.length - 1 ? "contact-link" : "link"),
      )
    )
      return reject(
        "chain-topology",
        "Every radial chain must end in exactly one contact.",
      );
    chains.push(chain);
  }
  if (visited.size !== nodes.length)
    return reject(
      "disconnected-graph",
      "Every node must be reachable from the one body.",
    );
  const sourceSurfaces = new Map();
  const palette = facts.get("bodyPalette");
  const texture = facts.get("texture");
  if (
    !palette ||
    palette.state !== "expressed" ||
    !Array.isArray(palette.value) ||
    !texture ||
    texture.state !== "expressed" ||
    !["smooth", "fine-ridged"].includes(texture.value)
  )
    return reject(
      "material-facts",
      "Active source body palette and supported texture are required.",
    );
  for (const surface of surfaces) {
    if (
      !record(surface) ||
      typeof surface.id !== "string" ||
      sourceSurfaces.has(surface.nodeId) ||
      !byId.has(surface.nodeId) ||
      surface.region !== byId.get(surface.nodeId).role ||
      !strings(surface.sources) ||
      !Array.isArray(surface.palette) ||
      ![1, 2].includes(surface.palette.length) ||
      surface.palette.some(
        (value) => typeof value !== "string" || !/^#[a-f0-9]{6}$/i.test(value),
      ) ||
      JSON.stringify(surface.palette) !== JSON.stringify(palette.value) ||
      surface.texture !== texture.value ||
      surface.partition !==
        (surface.palette.length === 1
          ? "uniform"
          : "two declared equal local masks") ||
      !Array.isArray(surface.markings) ||
      surface.markings.length
    )
      return reject(
        "unsupported-surface",
        "Each node needs one exact body-pigment surface, supported texture and no marks.",
      );
    sourceSurfaces.set(surface.nodeId, surface);
  }
  if (
    sourceSurfaces.size !== nodes.length ||
    new Set(surfaces.map((surface) => surface.id)).size !== surfaces.length
  )
    return reject(
      "missing-surface",
      "Every source surface ID and node ownership must be unique and complete.",
    );
  for (const chain of chains) {
    for (const [index, node] of chain.entries()) {
      const length = facts.get(index === 0 ? "proximal" : "distal");
      const width = facts.get("contactWidth");
      if (
        !length ||
        length.state !== "expressed" ||
        !Number.isFinite(length.value) ||
        !width ||
        width.state !== "expressed" ||
        !Number.isFinite(width.value) ||
        !near(node.dimensions[0], length.value) ||
        !near(node.dimensions[1], width.value) ||
        !near(node.dimensions[2], width.value)
      )
        return reject(
          "segment-facts",
          "Actual active source segment length and width must match retained facts.",
        );
    }
  }
  return { facts, volume, chains, sourceSurfaces, parents };
}
function retainedMaterial(geometry, source, body) {
  const isBody = geometry === body;
  const start = isBody
    ? [body.center[1] - body.halfAxes[1], body.center[2]]
    : geometry.projectedStart;
  const end = isBody
    ? [body.center[1] + body.halfAxes[1], body.center[2]]
    : geometry.projectedEnd;
  const length = Math.hypot(...subtract(end, start));
  const direction = subtract(end, start).map((value) => value / length);
  const transverse = [-direction[1], direction[0]];
  const halfWidth = isBody ? body.halfAxes[2] : geometry.width / 2;
  const endExtension = isBody ? 0 : halfWidth;
  const point = (u, v) =>
    add(
      start,
      add(
        direction.map((value) => value * u),
        transverse.map((value) => value * v),
      ),
    );
  const rectangle = (minimum, maximum) => [
    point(minimum, -halfWidth),
    point(maximum, -halfWidth),
    point(maximum, halfWidth),
    point(minimum, halfWidth),
  ];
  const masks =
    source.palette.length === 1
      ? [
          {
            paletteIndex: 0,
            outline: rectangle(-endExtension, length + endExtension),
          },
        ]
      : [
          { paletteIndex: 0, outline: rectangle(-endExtension, length / 2) },
          {
            paletteIndex: 1,
            outline: rectangle(length / 2, length + endExtension),
          },
        ];
  const textureLines =
    source.texture === "fine-ridged"
      ? Array.from({ length: 6 }, (_, index) => [
          point((length * (index + 1)) / 7, -halfWidth),
          point((length * (index + 1)) / 7, halfWidth),
        ])
      : [];
  return {
    ...structuredClone(source),
    shapeId: geometry.id,
    atlas: {
      kind: isBody ? "projected-YZ-body" : "root-tip-segment",
      start,
      end,
      uAxis: isBody ? "sourceY" : "root-to-tip",
      vAxis: isBody ? "sourceZ" : "transverse swept profile",
      length,
      halfWidth,
      endExtension,
    },
    masks,
    textureLines,
  };
}
export function constructRadialGraphSource(result, options = {}) {
  const validated = validate(result, options);
  if (validated.status === "rejected") return validated;
  const { facts, volume, chains, sourceSurfaces, parents } = validated;
  const body = {
    id: "radial-body",
    sourceNodeId: volume.id,
    center: [...volume.position],
    halfAxes: volume.dimensions.map((value) => value / 2),
    sourcePosition: [...volume.position],
    sourceDimensions: [...volume.dimensions],
    projectedCenter: volume.position.slice(1),
    sources: unique(
      ...[
        "bodyLength",
        "bodyWidth",
        "bodyHeight",
        "symmetry",
        "axialCount",
        "axialActuator",
      ].map((id) => facts.get(id).sources),
    ),
  };
  body.projectedOutline = circle(
    body.projectedCenter,
    body.halfAxes[1],
    body.halfAxes[2],
    RADIAL_SOURCE_PROFILE.ellipseSamples,
  );
  const appendages = [];
  const chainRoots = [];
  for (const [chainIndex, chain] of chains.entries()) {
    const first = chain[0];
    const rootX = first.position[0] - 0.3 * first.dimensions[0];
    const internalReference = [rootX, volume.position[1], volume.position[2]];
    const normalizedX = (rootX - body.center[0]) / body.halfAxes[0];
    if (Math.abs(normalizedX) >= 1)
      return reject(
        "root-outside-body",
        "Recovered longitudinal root lies outside the ellipsoid domain.",
        [first.id],
      );
    const firstDelta = subtract(first.position, internalReference);
    const yzMagnitude = Math.hypot(firstDelta[1], firstDelta[2]);
    if (yzMagnitude <= RADIAL_SOURCE_PROFILE.tolerance)
      return reject(
        "degenerate-ray",
        "The actual source radial YZ direction must be nonzero.",
        [first.id],
      );
    const factor = Math.sqrt(1 - normalizedX ** 2);
    const crossAxes = [body.halfAxes[1] * factor, body.halfAxes[2] * factor];
    const multiplier =
      1 /
      Math.hypot(firstDelta[1] / crossAxes[0], firstDelta[2] / crossAxes[1]);
    let start = [
      rootX,
      body.center[1] + firstDelta[1] * multiplier,
      body.center[2] + firstDelta[2] * multiplier,
    ];
    const root = [...start];
    chainRoots.push({
      chainIndex,
      sourceNodeId: first.id,
      internalReference,
      rootXYZ: root,
      projectedRoot: root.slice(1),
      rootX,
      normalizedX,
      crossSectionHalfAxes: crossAxes,
      sources: unique(first.sources, body.sources),
    });
    for (const [segmentIndex, node] of chain.entries()) {
      const sourceParent =
        segmentIndex === 0
          ? internalReference
          : chain[segmentIndex - 1].position;
      const delta = subtract(node.position, sourceParent);
      const magnitude = Math.hypot(...delta);
      if (
        !Number.isFinite(magnitude) ||
        magnitude <= RADIAL_SOURCE_PROFILE.tolerance
      )
        return reject(
          "degenerate-direction",
          "Source XYZ segment direction must be nonzero.",
          [node.id],
        );
      const direction = delta.map((value) => value / magnitude);
      const end = add(
        start,
        direction.map((value) => value * node.dimensions[0]),
      );
      if (!vector(start) || !vector(end))
        return reject(
          "constructed-budget",
          "Solved XYZ endpoints exceed finite coordinate bounds.",
          [node.id],
        );
      const normal = subtract(start, body.center).map(
        (value, index) => value / body.halfAxes[index] ** 2,
      );
      if (
        (segmentIndex === 0 && dot(normal, direction) <= 0) ||
        ellipsoidMinimum(start, end, body) < 1 - RADIAL_SOURCE_PROFILE.tolerance
      )
        return reject(
          "body-penetration",
          "Actual solved centerline must leave the ellipsoid outward without crossing it; no direction repair.",
          [node.id],
        );
      const projectedStart = start.slice(1),
        projectedEnd = end.slice(1);
      if (
        Math.hypot(...subtract(projectedEnd, projectedStart)) <=
        RADIAL_SOURCE_PROFILE.tolerance
      )
        return reject(
          "degenerate-projection",
          "A projected segment must have finite YZ extent.",
          [node.id],
        );
      appendages.push({
        id: "radial-" + node.id,
        nodeId: node.id,
        role: node.role,
        chainIndex,
        segmentIndex,
        parentNodeId: parents.get(node.id).from,
        sourcePosition: [...node.position],
        sourceParentReference: [...sourceParent],
        sourceDimensions: [...node.dimensions],
        sourceDelta: delta,
        rootXYZ: [...start],
        endpointXYZ: end,
        direction,
        length: node.dimensions[0],
        width: node.dimensions[1],
        projectedStart,
        projectedEnd,
        projectedLength: Math.hypot(...subtract(projectedEnd, projectedStart)),
        depthRange: [
          Math.min(start[0], end[0]) - node.dimensions[1] / 2,
          Math.max(start[0], end[0]) + node.dimensions[1] / 2,
        ],
        projectedOutline: capsule(
          projectedStart,
          projectedEnd,
          node.dimensions[1] / 2,
        ),
        sources: unique(
          node.sources,
          parents.get(node.id).sources,
          body.sources,
        ),
      });
      start = end;
    }
  }
  const inactiveSources = new Set(
    result.facts
      .filter((fact) => fact.state === "inactive")
      .flatMap((fact) => fact.sources),
  );
  for (const geometry of [body, ...chainRoots, ...appendages])
    geometry.sources = geometry.sources.filter(
      (id) => !inactiveSources.has(id),
    );
  const geometries = [body, ...appendages];
  const surfaces = geometries.map((geometry) =>
    retainedMaterial(
      geometry,
      sourceSurfaces.get(geometry.sourceNodeId ?? geometry.nodeId),
      body,
    ),
  );
  const points = geometries.flatMap((geometry) => geometry.projectedOutline);
  if (
    points.length > 4096 ||
    points.some((point) =>
      point.some((value) => !Number.isFinite(value) || Math.abs(value) > 10000),
    )
  )
    return reject(
      "constructed-budget",
      "Projected points exceed finite bounds.",
    );
  const construction = {
    status: "constructed",
    schemaVersion: "critter-radial-source/1",
    profile: { ...RADIAL_SOURCE_PROFILE },
    sourceResultDigest: digest(result),
    sourceGraph: structuredClone(result.graph),
    body,
    chainRoots,
    appendages,
    surfaces,
    bounds: {
      minimumX: Math.min(...points.map((point) => point[0])),
      maximumX: Math.max(...points.map((point) => point[0])),
      minimumY: Math.min(...points.map((point) => point[1])),
      maximumY: Math.max(...points.map((point) => point[1])),
    },
    traces: geometries.map((geometry) => ({
      targetId: geometry.id,
      nodeIds: [geometry.sourceNodeId ?? geometry.nodeId],
      locusIds: geometry.sources,
    })),
    notProjected: [
      "ocularPair",
      "ocularPlacement",
      "ocularSize",
      "coveringKind",
      "coveringExtent",
      "coveringScale",
    ].map((id) => ({
      fact: structuredClone(facts.get(id)),
      status: "not-projected",
      reason:
        "This contacts-only source consumer has no radial eye or covering module; not biological absence.",
    })),
    limitations: [
      "Static XYZ ellipsoid/centerline construction with YZ projection, not physical joints, collisions, 3D tissue mesh, movement or game art.",
      "Projected root occlusion is legitimate; overpaint is a neutral inspection overlay.",
      "No radial ocular or covering module is projected; complete source facts remain in the packet.",
    ],
  };
  return { ...construction, constructionDigest: digest(construction) };
}
