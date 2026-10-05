import { REGIONAL_SCENE_RULE } from "./regional-scene-catalogue.mjs";
import { digest } from "./evaluate.mjs";
import {
  BODY_ORGANIZATION_RULE,
  REGIONAL_GROWTH_FIELDS,
} from "./body-organization-catalogue.mjs";

export const GRAPH_SOURCE_PROFILE = Object.freeze({
  id: "graph-source/1",
  sourceRuleVersion: "developmental-analytic/1",
  view: "orthographic XY; positive X follows the body chain, positive Y is down",
  neckRatio: 0.65,
  intervalSamples: 12,
  capSamples: 16,
  rootIterations: 48,
  maximumNodes: 64,
  maximumEdges: 128,
  maximumCoordinateMagnitude: 10000,
  maximumVertices: 4096,
  minimumPolygonArea: 1e-10,
  geometryTolerance: 1e-7,
  sourceRoundingTolerance: 2e-6,
  firstHingeForwardFraction: 0.3,
  materialOwnership:
    "Nearest station; longitudinal domains split at station midpoints. Each original surface maps once.",
  maskMapping: "Uniform or two equal local-u fields in retained palette order.",
  staticAssembly:
    "Recovered source longitudinal roots; source XY directions; exact segment lengths/widths and longitudinal fin chord/span. Solved endpoints are new construction.",
  referencePaintOrder:
    "Appendage fields first, body fields last; root overlap is a static attachment depiction, not physical Z order.",
});

const isRecord = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const validId = (value) =>
  typeof value === "string" && /^[a-zA-Z0-9_.:-]+$/.test(value);
const sourceList = (value) =>
  Array.isArray(value) && value.every((item) => typeof item === "string");
const uniqueSources = (...groups) => [...new Set(groups.flat())];
const rounded = (value) => Number(value.toFixed(9));
const point = (values) => values.map(rounded);

function rejection(code, message, nodeIds = [], locusIds = []) {
  return { status: "rejected", errors: [{ code, nodeIds, locusIds, message }] };
}

function validateSource(result, options) {
  const regionalProfile =
    isRecord(options) &&
    options.profileVersion === "graph-source/2" &&
    options.sourceRuleVersion === BODY_ORGANIZATION_RULE;
  if (
    !isRecord(options) ||
    (!regionalProfile &&
      (options.profileVersion !== GRAPH_SOURCE_PROFILE.id ||
        options.sourceRuleVersion !==
          GRAPH_SOURCE_PROFILE.sourceRuleVersion)) ||
    Object.keys(options).some(
      (key) => !["profileVersion", "sourceRuleVersion"].includes(key),
    )
  )
    return rejection(
      "unsupported-profile",
      "Only explicit matching graph-source/1 or graph-source/2 conventions are supported.",
    );
  if (
    !isRecord(result) ||
    result.status !== "resolved" ||
    !isRecord(result.graph) ||
    !Array.isArray(result.facts)
  )
    return rejection(
      "resolved-source",
      "A resolved graph and copied expression facts are required.",
    );
  if (
    (regionalProfile &&
      (![BODY_ORGANIZATION_RULE, REGIONAL_SCENE_RULE].includes(
        result.sourceRuleVersion,
      ) ||
        (result.sourceRuleVersion === REGIONAL_SCENE_RULE &&
          (result.baseGraphRuleVersion !== BODY_ORGANIZATION_RULE ||
            result.ocularModuleRuleVersion !== "ocular-module/3" ||
            result.coveringModuleRuleVersion !== "body-covering/2")) ||
        result.bodyConstructionProfileVersion !== "graph-source/2")) ||
    (!regionalProfile &&
      [BODY_ORGANIZATION_RULE, REGIONAL_SCENE_RULE].includes(
        result.sourceRuleVersion,
      ))
  )
    return rejection(
      "source-rule-mismatch",
      "Regional source requires its actual graph-source/2 convention.",
    );
  const { nodes, edges, surfaces } = result.graph;
  if (
    !Array.isArray(nodes) ||
    !nodes.length ||
    nodes.length > GRAPH_SOURCE_PROFILE.maximumNodes ||
    !Array.isArray(edges) ||
    edges.length > GRAPH_SOURCE_PROFILE.maximumEdges ||
    !Array.isArray(surfaces)
  )
    return rejection(
      "source-budget",
      "Nonempty bounded node, edge and surface arrays are required.",
    );
  for (const node of nodes) {
    if (!isRecord(node) || !validId(node.id) || !sourceList(node.sources))
      return rejection(
        "malformed-node",
        "Every node requires an ID and source-locus array.",
      );
    if (!["volume", "link", "contact-link", "fin"].includes(node.role))
      return rejection(
        "unsupported-role",
        "This proof supports volumes, articulated contacts and fins only.",
        [node.id],
        node.sources,
      );
    if (
      ![node.position, node.dimensions].every(
        (values) =>
          Array.isArray(values) &&
          values.length === 3 &&
          values.every(
            (value) =>
              typeof value === "number" &&
              Number.isFinite(value) &&
              Math.abs(value) <=
                GRAPH_SOURCE_PROFILE.maximumCoordinateMagnitude,
          ),
      ) ||
      node.dimensions.some((value) => value <= 0)
    )
      return rejection(
        "nonfinite-geometry",
        "Node coordinates must be finite and dimensions positive within the profile bounds.",
        [node.id],
        node.sources,
      );
    if (node.role === "volume" && node.deformation !== "none")
      return rejection(
        "unsupported-deformation",
        "This static source proof requires undeformed volumes.",
        [node.id],
        node.sources,
      );
    if (
      ["link", "contact-link"].includes(node.role) &&
      (!Number.isFinite(node.jointRange) || node.jointRange < 0)
    )
      return rejection(
        "invalid-joint-range",
        "Articulated nodes require their finite nonnegative joint range.",
        [node.id],
        node.sources,
      );
  }
  const byId = new Map(nodes.map((node) => [node.id, node]));
  if (byId.size !== nodes.length)
    return rejection("duplicate-node", "Node IDs must be unique.");
  for (const edge of edges) {
    if (
      !isRecord(edge) ||
      !validId(edge.id) ||
      !sourceList(edge.sources) ||
      !byId.has(edge.from) ||
      !byId.has(edge.to) ||
      edge.from === edge.to
    )
      return rejection(
        "dangling-edge",
        "Every edge requires distinct existing endpoints and source loci.",
      );
    const parent = byId.get(edge.from),
      child = byId.get(edge.to);
    const validRelation =
      (edge.role === "connected-volume" &&
        parent.role === "volume" &&
        child.role === "volume") ||
      (edge.role === "hinge" &&
        ["volume", "link"].includes(parent.role) &&
        ["link", "contact-link"].includes(child.role)) ||
      (edge.role === "rooted-surface" &&
        parent.role === "volume" &&
        child.role === "fin");
    if (!validRelation)
      return rejection(
        "unsupported-edge",
        "The edge role must match its actual construction endpoints.",
        [edge.from, edge.to],
        edge.sources,
      );
  }
  if (new Set(edges.map((edge) => edge.id)).size !== edges.length)
    return rejection("duplicate-edge", "Edge IDs must be unique.");
  const symmetry = result.facts.find(
    (fact) => isRecord(fact) && fact.id === "symmetry",
  );
  if (symmetry?.value !== "bilateral")
    return rejection(
      "unsupported-symmetry",
      "The first construction profile supports bilateral sources only.",
      [],
      symmetry?.sources ?? [],
    );
  for (const surface of surfaces) {
    if (
      !isRecord(surface) ||
      !validId(surface.id) ||
      !byId.has(surface.nodeId) ||
      !sourceList(surface.sources) ||
      !Array.isArray(surface.palette) ||
      ![1, 2].includes(surface.palette.length) ||
      surface.palette.some(
        (color) =>
          typeof color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(color),
      ) ||
      !Array.isArray(surface.markings) ||
      !["smooth", "fine-ridged"].includes(surface.texture)
    )
      return rejection(
        "malformed-surface",
        "Every surface requires a supported palette, texture, retained markings and source loci.",
      );
    if (
      surface.partition !==
      (surface.palette.length === 1
        ? "uniform"
        : "two declared equal local masks")
    )
      return rejection(
        "unsupported-mask",
        "Only source-declared uniform or equal two-field masks are supported.",
        [surface.nodeId],
        surface.sources,
      );
    if (surface.markings.length)
      return rejection(
        "unsupported-marked-surface",
        "This first exterior proof retains only unmarked surfaces; no marking is discarded or relocated.",
        [surface.nodeId],
        surface.sources,
      );
    for (const mark of surface.markings) {
      if (
        !isRecord(mark) ||
        !validId(mark.id) ||
        ![mark.u, mark.v, mark.scale, mark.orientation, mark.contrast].every(
          (value) => typeof value === "number" && Number.isFinite(value),
        ) ||
        mark.u < 0 ||
        mark.u > 1 ||
        mark.v < 0 ||
        mark.v > 1 ||
        mark.scale <= 0 ||
        mark.scale > 1 ||
        mark.contrast < 0 ||
        mark.contrast > 1 ||
        !["bands", "patches", "bands-and-patches"].includes(mark.layout)
      )
        return rejection(
          "malformed-marking",
          "Realized markings must retain finite local placements and supported shapes.",
          [surface.nodeId],
          surface.sources,
        );
    }
  }
  if (
    surfaces.length !== nodes.length ||
    new Set(surfaces.map((surface) => surface.nodeId)).size !== nodes.length ||
    new Set(surfaces.map((surface) => surface.id)).size !== surfaces.length
  )
    return rejection(
      "surface-cardinality",
      "Every actual node requires exactly one unique source surface.",
    );
  const volumes = nodes.filter((node) => node.role === "volume");
  if (!volumes.length)
    return rejection("missing-body", "At least one body volume is required.");
  const volumeEdges = edges.filter((edge) => edge.role === "connected-volume");
  const roots = volumes.filter(
    (node) => !volumeEdges.some((edge) => edge.to === node.id),
  );
  if (
    roots.length !== 1 ||
    volumeEdges.length !== volumes.length - 1 ||
    volumes.some(
      (node) =>
        volumeEdges.filter((edge) => edge.from === node.id).length > 1 ||
        volumeEdges.filter((edge) => edge.to === node.id).length > 1,
    )
  )
    return rejection(
      "branched-or-disconnected-body",
      "Body volumes must form one nonbranched directed chain.",
      volumes.map((node) => node.id),
    );
  const orderedVolumes = [];
  let current = roots[0];
  while (current && !orderedVolumes.includes(current)) {
    orderedVolumes.push(current);
    const next = volumeEdges.find((edge) => edge.from === current.id);
    current = next ? byId.get(next.to) : null;
  }
  if (orderedVolumes.length !== volumes.length)
    return rejection(
      "disconnected-body",
      "All volumes must be reachable through the declared chain.",
    );
  for (let index = 0; index < orderedVolumes.length; index++) {
    const node = orderedVolumes[index];
    if (
      Math.abs(node.position[1] - orderedVolumes[0].position[1]) >
        GRAPH_SOURCE_PROFILE.geometryTolerance ||
      Math.abs(node.position[2] - orderedVolumes[0].position[2]) >
        GRAPH_SOURCE_PROFILE.geometryTolerance ||
      (index && node.position[0] <= orderedVolumes[index - 1].position[0])
    )
      return rejection(
        "unsupported-body-layout",
        "This proof requires a straight, positively ordered axial volume chain.",
        [node.id],
        node.sources,
      );
  }
  for (const node of nodes.filter((candidate) => candidate.role !== "volume")) {
    const incoming = edges.filter((edge) => edge.to === node.id);
    const outgoing = edges.filter((edge) => edge.from === node.id);
    if (
      incoming.length !== 1 ||
      outgoing.length > 1 ||
      (node.role !== "link" && outgoing.length) ||
      (node.role === "link" && outgoing.length !== 1)
    )
      return rejection(
        "invalid-appendage-chain",
        "Appendages require one incoming root and a nonbranched chain ending in a contact or fin.",
        [node.id],
        node.sources,
      );
    const visited = new Set();
    let ancestor = node;
    while (ancestor.role !== "volume") {
      if (visited.has(ancestor.id))
        return rejection(
          "cyclic-appendage",
          "An appendage cannot contain a cycle.",
          [...visited],
        );
      visited.add(ancestor.id);
      const parentEdge = edges.find((edge) => edge.to === ancestor.id);
      if (!parentEdge)
        return rejection(
          "disconnected-appendage",
          "Every appendage must reach an actual body volume.",
          [ancestor.id],
          ancestor.sources,
        );
      ancestor = byId.get(parentEdge.from);
    }
  }
  return { status: "valid", orderedVolumes, byId };
}

function buildBody(
  volumes,
  graph,
  neckRatio = GRAPH_SOURCE_PROFILE.neckRatio,
  inheritedSources = [],
) {
  const centerY = volumes[0].position[1];
  const controls = [];
  for (let index = 0; index < volumes.length; index++) {
    const node = volumes[index];
    controls.push([node.position[0], node.dimensions[1] / 2]);
    const next = volumes[index + 1];
    if (next)
      controls.push([
        (node.position[0] + next.position[0]) / 2,
        (neckRatio * Math.min(node.dimensions[1], next.dimensions[1])) / 2,
      ]);
  }
  const lowerEnvelope = [];
  const first = volumes[0],
    last = volumes.at(-1);
  for (let step = 0; step <= GRAPH_SOURCE_PROFILE.capSamples; step++) {
    const angle = ((step / GRAPH_SOURCE_PROFILE.capSamples) * Math.PI) / 2;
    lowerEnvelope.push(
      point([
        first.position[0] - (first.dimensions[0] / 2) * Math.cos(angle),
        centerY + (first.dimensions[1] / 2) * Math.sin(angle),
      ]),
    );
  }
  for (let index = 0; index < controls.length - 1; index++) {
    const [startX, startWidth] = controls[index],
      [endX, endWidth] = controls[index + 1];
    for (let step = 1; step <= GRAPH_SOURCE_PROFILE.intervalSamples; step++) {
      const t = step / GRAPH_SOURCE_PROFILE.intervalSamples;
      const smooth = t * t * (3 - 2 * t);
      lowerEnvelope.push(
        point([
          startX + (endX - startX) * t,
          centerY + startWidth + (endWidth - startWidth) * smooth,
        ]),
      );
    }
  }
  for (let step = 1; step <= GRAPH_SOURCE_PROFILE.capSamples; step++) {
    const angle = ((step / GRAPH_SOURCE_PROFILE.capSamples) * Math.PI) / 2;
    lowerEnvelope.push(
      point([
        last.position[0] + (last.dimensions[0] / 2) * Math.sin(angle),
        centerY + (last.dimensions[1] / 2) * Math.cos(angle),
      ]),
    );
  }
  const outline = [
    ...lowerEnvelope,
    ...lowerEnvelope
      .slice(1, -1)
      .reverse()
      .map(([x, y]) => point([x, 2 * centerY - y])),
  ];
  const edgeIds = graph.edges
    .filter((edge) => edge.role === "connected-volume")
    .map((edge) => edge.id);
  const sources = uniqueSources(
    inheritedSources,
    ...volumes.map((node) => node.sources),
    ...graph.edges
      .filter((edge) => edge.role === "connected-volume")
      .map((edge) => edge.sources),
  );
  return {
    id: "body-exterior",
    kind: volumes.length === 1 ? "single-ellipse" : "joined-axial-outline",
    sourceNodeIds: volumes.map((node) => node.id),
    sourceEdgeIds: edgeIds,
    sources,
    centerY,
    controls: controls.map(point),
    lowerEnvelope,
    outline,
    stations: volumes.map((node) => ({
      nodeId: node.id,
      position: [...node.position],
      dimensions: [...node.dimensions],
    })),
  };
}

function boundaryAt(body, x, side) {
  const envelope = body.lowerEnvelope;
  if (x < envelope[0][0] || x > envelope.at(-1)[0]) return null;
  for (let index = 0; index < envelope.length - 1; index++) {
    const start = envelope[index],
      end = envelope[index + 1];
    if (x < start[0] || x > end[0]) continue;
    const t = (x - start[0]) / (end[0] - start[0]);
    const halfWidth = start[1] + (end[1] - start[1]) * t - body.centerY;
    const slope = (side * (end[1] - start[1])) / (end[0] - start[0]);
    const normalLength = Math.hypot(slope, 1);
    return {
      position: point([x, body.centerY + side * halfWidth]),
      normal: point([(-side * slope) / normalLength, side / normalLength]),
      tangent: point([1 / normalLength, slope / normalLength]),
    };
  }
  return null;
}

function boundsOf(points) {
  return {
    minimumX: Math.min(...points.map((p) => p[0])),
    maximumX: Math.max(...points.map((p) => p[0])),
    minimumY: Math.min(...points.map((p) => p[1])),
    maximumY: Math.max(...points.map((p) => p[1])),
  };
}

function polygonArea(points) {
  return (
    Math.abs(
      points.reduce((sum, p, index) => {
        const next = points[(index + 1) % points.length];
        return sum + p[0] * next[1] - next[0] * p[1];
      }, 0),
    ) / 2
  );
}

function appendageGeometry(node, parent, body, parentGeometry, edge) {
  const firstHinge = parent.role === "volume" && edge.role === "hinge";
  const rootX = firstHinge
    ? node.position[0] -
      GRAPH_SOURCE_PROFILE.firstHingeForwardFraction * node.dimensions[0]
    : node.position[0];
  const reference = firstHinge
    ? [rootX, parent.position[1], parent.position[2]]
    : parent.position;
  const delta = [
    node.position[0] - reference[0],
    node.position[1] - reference[1],
  ];
  const directionLength = Math.hypot(...delta);
  if (
    !Number.isFinite(directionLength) ||
    directionLength <= GRAPH_SOURCE_PROFILE.geometryTolerance
  )
    return rejection(
      "degenerate-direction",
      "A retained XY displacement must define the attachment direction.",
      [node.id, parent.id],
      node.sources,
    );
  const direction = delta.map((value) => value / directionLength);
  const side = Math.sign(delta[1]);
  let root;
  if (parent.role === "volume") {
    if (
      !side ||
      rootX <
        parent.position[0] -
          parent.dimensions[0] / 2 -
          GRAPH_SOURCE_PROFILE.sourceRoundingTolerance ||
      rootX >
        parent.position[0] +
          parent.dimensions[0] / 2 +
          GRAPH_SOURCE_PROFILE.sourceRoundingTolerance
    )
      return rejection(
        "invalid-longitudinal-root",
        "An exterior root must retain its source station domain and bilateral side.",
        [node.id, parent.id],
        uniqueSources(node.sources, parent.sources, edge.sources),
      );
    root = boundaryAt(body, rootX, side);
    if (!root)
      return rejection(
        "root-outside-exterior",
        "The recovered root lies outside the constructed exterior.",
        [node.id, parent.id],
        node.sources,
      );
  } else {
    root = {
      position: [...parentGeometry.end],
      normal: [-direction[1], direction[0]],
      tangent: [...direction],
    };
  }
  const sourceNodeIds = parentGeometry
    ? [...parentGeometry.sourceNodeIds, node.id]
    : [parent.id, node.id];
  const sources = uniqueSources(
    parentGeometry?.sources ?? body.sources,
    node.sources,
    edge.sources,
  );
  const base = {
    id: `constructed-${node.id}`,
    nodeId: node.id,
    role: node.role,
    parentNodeId: parent.id,
    sourceNodeIds,
    sourceEdgeIds: parentGeometry
      ? [...parentGeometry.sourceEdgeIds, edge.id]
      : [edge.id],
    sources,
    sourcePosition: [...node.position],
    sourceDimensions: [...node.dimensions],
    sourceReference: point(reference),
    root: root.position,
    localFrame: {
      origin: root.position,
      longitudinal: point(direction),
      lateral: point([-direction[1], direction[0]]),
      exteriorNormal: root.normal,
    },
  };
  if (node.role === "fin") {
    const chordXs = [
      rootX - node.dimensions[0] / 2,
      rootX + node.dimensions[0] / 2,
    ];
    if (
      chordXs.some(
        (x) =>
          x <
            parent.position[0] -
              parent.dimensions[0] / 2 -
              GRAPH_SOURCE_PROFILE.sourceRoundingTolerance ||
          x >
            parent.position[0] +
              parent.dimensions[0] / 2 +
              GRAPH_SOURCE_PROFILE.sourceRoundingTolerance,
      )
    )
      return rejection(
        "fin-chord-outside-station",
        "The retained fin chord must remain in its owning source station domain; no shortening is performed.",
        [node.id, parent.id],
        uniqueSources(node.sources, parent.sources),
      );
    const chord = chordXs.map((x) => boundaryAt(body, x, side)?.position);
    if (chord.some((value) => !value))
      return rejection(
        "fin-chord-outside-exterior",
        "The retained longitudinal fin chord must fit the exterior; no shortening is performed.",
        [node.id],
        node.sources,
      );
    const tip = point(
      root.position.map(
        (value, index) => value + root.normal[index] * node.dimensions[1],
      ),
    );
    return {
      status: "constructed",
      ...base,
      localFrame: {
        ...base.localFrame,
        longitudinal: root.normal,
        lateral: root.tangent,
      },
      kind: "tapered-fin",
      rootChord: chord,
      end: tip,
      outline: [chord[0], tip, chord[1]],
      span: node.dimensions[1],
      chordWidth: node.dimensions[0],
    };
  }
  const length = node.dimensions[0],
    width = node.dimensions[1];
  const end = point(
    root.position.map((value, index) => value + direction[index] * length),
  );
  const lateral = [-direction[1], direction[0]];
  const outline = [1, -1].map((sign) =>
    point(
      root.position.map(
        (value, index) => value + (sign * lateral[index] * width) / 2,
      ),
    ),
  );
  outline.push(
    ...[-1, 1].map((sign) =>
      point(
        end.map((value, index) => value + (sign * lateral[index] * width) / 2),
      ),
    ),
  );
  return {
    status: "constructed",
    ...base,
    kind:
      node.role === "contact-link"
        ? "terminal-contact-segment"
        : "jointed-segment",
    end,
    outline,
    length,
    width,
    jointRange: node.jointRange,
  };
}

function pointInside(polygon, position) {
  let inside = false;
  for (
    let index = 0, previous = polygon.length - 1;
    index < polygon.length;
    previous = index++
  ) {
    const a = polygon[index],
      b = polygon[previous];
    if (
      a[1] > position[1] !== b[1] > position[1] &&
      position[0] <
        ((b[0] - a[0]) * (position[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      inside = !inside;
  }
  return inside;
}

function strictCrossing(a, b, c, d) {
  const cross = (p, q, r) =>
    (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const tolerance = GRAPH_SOURCE_PROFILE.geometryTolerance;
  const first = cross(a, b, c),
    second = cross(a, b, d),
    third = cross(c, d, a),
    fourth = cross(c, d, b);
  return (
    ((first > tolerance && second < -tolerance) ||
      (first < -tolerance && second > tolerance)) &&
    ((third > tolerance && fourth < -tolerance) ||
      (third < -tolerance && fourth > tolerance))
  );
}

function conflictingAppendages(appendages) {
  for (let index = 0; index < appendages.length; index++) {
    for (const other of appendages.slice(index + 1)) {
      const current = appendages[index];
      if (
        current.sourceNodeIds.includes(other.nodeId) ||
        other.sourceNodeIds.includes(current.nodeId)
      )
        continue;
      const crossing = current.outline.some((start, vertex) =>
        other.outline.some((otherStart, otherVertex) =>
          strictCrossing(
            start,
            current.outline[(vertex + 1) % current.outline.length],
            otherStart,
            other.outline[(otherVertex + 1) % other.outline.length],
          ),
        ),
      );
      const centerOf = (outline) =>
        [0, 1].map(
          (coordinate) =>
            outline.reduce((sum, p) => sum + p[coordinate], 0) / outline.length,
        );
      if (
        crossing ||
        pointInside(other.outline, centerOf(current.outline)) ||
        pointInside(current.outline, centerOf(other.outline)) ||
        current.outline.some((p) => pointInside(other.outline, p)) ||
        other.outline.some((p) => pointInside(current.outline, p))
      )
        return [current, other];
    }
  }
  return null;
}

function validateRegionalField(result, volumes) {
  const ids = [
    "regionalGrowth",
    "joinNeckRatio",
    "bodyLength",
    "bodyWidth",
    "taper",
    "spacing",
  ];
  const facts = Object.fromEntries(
    ids.map((id) => [
      id,
      result.facts.find((item) => isRecord(item) && item.id === id),
    ]),
  );
  const allocation = result.regionalAllocation;
  const active = volumes.length > 1;
  const fieldNames =
    typeof facts.regionalGrowth?.value === "string"
      ? facts.regionalGrowth.value.split("-")
      : [];
  if (
    !isRecord(allocation) ||
    ![
      "even",
      "central",
      "anterior",
      "even-central",
      "even-anterior",
      "central-anterior",
    ].includes(facts.regionalGrowth?.value) ||
    fieldNames.some((name) => !Object.hasOwn(REGIONAL_GROWTH_FIELDS, name)) ||
    ids.some(
      (id) =>
        !isRecord(facts[id]) ||
        !sourceList(facts[id].sources) ||
        !sourceList(facts[id].prerequisites),
    ) ||
    facts.regionalGrowth.state !== (active ? "expressed" : "inactive") ||
    facts.joinNeckRatio.state !== (active ? "expressed" : "inactive") ||
    !["bodyLength", "bodyWidth", "taper"].every(
      (id) =>
        facts[id].state === "expressed" && Number.isFinite(facts[id].value),
    ) ||
    facts.spacing?.state !== (active ? "expressed" : "inactive") ||
    !Number.isFinite(facts.spacing?.value) ||
    !Number.isFinite(facts.joinNeckRatio.value) ||
    facts.joinNeckRatio.value < 0.65 ||
    facts.joinNeckRatio.value > 0.95 ||
    allocation.state !== (active ? "expressed" : "inactive") ||
    allocation.field !== facts.regionalGrowth.value
  )
    return rejection(
      "regional-field-facts",
      "Valid actual regional growth/join and active geometry facts are required.",
    );
  if (!sourceList(allocation.sources))
    return rejection(
      "regional-field-shape",
      "Retained field sources must be string IDs.",
    );
  const names = [
    "rawLengths",
    "rawWidths",
    "lengthWeights",
    "widthFactors",
    "lengths",
    "centers",
  ];
  if (
    names.some(
      (name) =>
        !Array.isArray(allocation[name]) ||
        allocation[name].length !== volumes.length ||
        allocation[name].some((value) => !Number.isFinite(value)),
    ) ||
    allocation.rawLengths.some((value) => value <= 0) ||
    allocation.rawWidths.some((value) => value <= 0)
  )
    return rejection(
      "regional-field-shape",
      "Regional arrays must retain finite positive sampled fields at every station.",
    );
  const near = (a, b) => Math.abs(a - b) <= 2e-6;
  const knots = (channel) =>
    [0, 1, 2].map(
      (index) =>
        fieldNames.reduce(
          (sum, name) => sum + REGIONAL_GROWTH_FIELDS[name][channel][index],
          0,
        ) / fieldNames.length,
    );
  const sample = (values, index) => {
    if (!active) return 1;
    const position = (index / (volumes.length - 1)) * 2;
    const left = Math.min(1, Math.floor(position));
    return values[left] + (values[left + 1] - values[left]) * (position - left);
  };
  if (
    !["length", "width"].every(
      (channel) =>
        Array.isArray(allocation[channel + "Knots"]) &&
        allocation[channel + "Knots"].length === 3 &&
        allocation[channel + "Knots"].every(
          (value, index) =>
            Number.isFinite(value) && near(value, knots(channel)[index]),
        ),
    )
  )
    return rejection(
      "regional-field-mismatch",
      "Retained knot fields must match the expressed contributor.",
    );
  const rawLength = volumes.map((_, index) => sample(knots("length"), index));
  const rawWidth = volumes.map((_, index) => sample(knots("width"), index));
  const total = rawLength.reduce((sum, value) => sum + value, 0);
  const maximum = Math.max(...rawWidth);
  let center = 0;
  for (let index = 0; index < volumes.length; index++) {
    const weight = rawLength[index] / total;
    const length = facts.bodyLength.value * weight;
    if (index)
      center +=
        (facts.bodyLength.value * rawLength[index - 1]) / total / 2 +
        facts.spacing.value +
        length / 2;
    const widthFactor = rawWidth[index] / maximum;
    const width =
      facts.bodyWidth.value *
      widthFactor *
      (1 - facts.taper.value * Math.abs((index + 0.5) / volumes.length - 0.5));
    if (
      ![
        [allocation.rawLengths[index], rawLength[index]],
        [allocation.rawWidths[index], rawWidth[index]],
        [allocation.lengthWeights[index], weight],
        [allocation.widthFactors[index], widthFactor],
        [allocation.lengths[index], length],
        [allocation.centers[index], center],
        [volumes[index].dimensions[0], length],
        [volumes[index].dimensions[1], width],
        [volumes[index].position[0], center],
      ].every(([a, b]) => near(a, b))
    )
      return rejection(
        "regional-field-mismatch",
        "Allocated source stations must match retained inherited fields without repair.",
        [volumes[index].id],
      );
  }
  return {
    status: "valid",
    neckRatio: active
      ? facts.joinNeckRatio.value
      : GRAPH_SOURCE_PROFILE.neckRatio,
    sources: active
      ? uniqueSources(
          facts.joinNeckRatio.sources,
          facts.joinNeckRatio.prerequisites,
        )
      : [],
  };
}

export function constructGraphSource(result, options = {}) {
  const validation = validateSource(result, options);
  if (validation.status === "rejected") return validation;
  try {
    const { orderedVolumes, byId } = validation;
    const graph = result.graph;
    const regional = options.profileVersion === "graph-source/2";
    const regionalCheck = regional
      ? validateRegionalField(result, orderedVolumes)
      : null;
    if (regionalCheck?.status === "rejected") return regionalCheck;
    const profile = regional
      ? {
          ...GRAPH_SOURCE_PROFILE,
          id: "graph-source/2",
          sourceRuleVersion: BODY_ORGANIZATION_RULE,
          neckRatio: regionalCheck.neckRatio,
          neckAuthority:
            "Inherited join-neck-ratio; inactive for a single station.",
        }
      : GRAPH_SOURCE_PROFILE;
    const body = buildBody(
      orderedVolumes,
      graph,
      profile.neckRatio,
      regionalCheck?.sources ?? [],
    );
    if (regional)
      body.inheritedBodyField = structuredClone(result.regionalAllocation);
    if (
      body.lowerEnvelope.some(
        (p, index) => index && p[0] <= body.lowerEnvelope[index - 1][0],
      )
    )
      return rejection(
        "degenerate-exterior",
        "The retained sampled envelope must have finite positive intervals.",
        body.sourceNodeIds,
        body.sources,
      );
    const appendages = [];
    const pending = graph.nodes.filter((node) => node.role !== "volume");
    while (pending.length) {
      const index = pending.findIndex((node) => {
        const edge = graph.edges.find((candidate) => candidate.to === node.id);
        return (
          byId.get(edge.from).role === "volume" ||
          appendages.some((geometry) => geometry.nodeId === edge.from)
        );
      });
      if (index < 0)
        return rejection(
          "unreachable-appendage",
          "No appendage can be assembled from an actual body root.",
        );
      const node = pending.splice(index, 1)[0];
      const edge = graph.edges.find((candidate) => candidate.to === node.id);
      const geometry = appendageGeometry(
        node,
        byId.get(edge.from),
        body,
        appendages.find((item) => item.nodeId === edge.from),
        edge,
      );
      if (geometry.status === "rejected") return geometry;
      const penetratesBody = [0.1, 0.25, 0.5, 0.75, 1].some((fraction) => {
        const sample = geometry.root.map(
          (value, coordinate) =>
            value + fraction * (geometry.end[coordinate] - value),
        );
        const boundary = boundaryAt(body, sample[0], 1);
        return (
          boundary &&
          Math.abs(sample[1] - body.centerY) <
            boundary.position[1] -
              body.centerY -
              GRAPH_SOURCE_PROFILE.geometryTolerance
        );
      });
      if (penetratesBody)
        return rejection(
          "appendage-inside-body",
          "The solved appendage centerline cannot pass back through the body exterior.",
          [node.id],
          geometry.sources,
        );
      appendages.push(geometry);
    }
    const conflict = conflictingAppendages(appendages);
    if (conflict)
      return rejection(
        "intersecting-appendages",
        "Unrelated appendage outlines intersect in the declared XY source view.",
        conflict.map((item) => item.nodeId),
        uniqueSources(...conflict.map((item) => item.sources)),
      );
    const surfaces = graph.surfaces.map((surface) => {
      const volumeIndex = orderedVolumes.findIndex(
        (node) => node.id === surface.nodeId,
      );
      if (volumeIndex >= 0) {
        const startX = volumeIndex
          ? (orderedVolumes[volumeIndex - 1].position[0] +
              orderedVolumes[volumeIndex].position[0]) /
            2
          : body.lowerEnvelope[0][0];
        const endX =
          volumeIndex < orderedVolumes.length - 1
            ? (orderedVolumes[volumeIndex].position[0] +
                orderedVolumes[volumeIndex + 1].position[0]) /
              2
            : body.lowerEnvelope.at(-1)[0];
        return {
          ...structuredClone(surface),
          shapeId: body.id,
          atlas: {
            kind: "longitudinal-body-ownership",
            minimumX: rounded(startX),
            maximumX: rounded(endX),
            minimumY: Math.min(...body.outline.map((p) => p[1])),
            maximumY: Math.max(...body.outline.map((p) => p[1])),
            maskAxis: "local-u",
          },
        };
      }
      const geometry = appendages.find(
        (item) => item.nodeId === surface.nodeId,
      );
      return {
        ...structuredClone(surface),
        shapeId: geometry.id,
        atlas: {
          kind: "rooted-appendage-local",
          frame: structuredClone(geometry.localFrame),
          bounds: boundsOf(geometry.outline),
          maskAxis: "local-u",
        },
      };
    });
    const allPoints = [
      ...body.outline,
      ...appendages.flatMap((item) => item.outline),
    ];
    if (
      allPoints.length > GRAPH_SOURCE_PROFILE.maximumVertices ||
      allPoints.some(
        (p) =>
          !p.every(
            (value) =>
              Number.isFinite(value) &&
              Math.abs(value) <=
                GRAPH_SOURCE_PROFILE.maximumCoordinateMagnitude,
          ),
      )
    )
      return rejection(
        "constructed-geometry-budget",
        "Constructed vertices must fit the declared finite geometry budget.",
      );
    if (
      [body, ...appendages].some(
        (item) =>
          polygonArea(item.outline) < GRAPH_SOURCE_PROFILE.minimumPolygonArea,
      )
    )
      return rejection(
        "degenerate-footprint",
        "Every retained footprint must have positive area at the declared profile precision.",
      );
    const construction = {
      status: "constructed",
      schemaVersion: "critter-graph-source/1",
      ...(result.sourceRuleVersion === REGIONAL_SCENE_RULE
        ? { sourceRuleVersion: REGIONAL_SCENE_RULE }
        : {}),
      profile: { ...profile },
      sourceResultDigest: digest(result),
      bodyExteriors: [body],
      localFrames: appendages.map((item) => ({
        nodeId: item.nodeId,
        ...structuredClone(item.localFrame),
      })),
      appendages,
      surfaces,
      traces: [body, ...appendages].map((item) => ({
        targetId: item.id,
        sourceNodeIds: [...item.sourceNodeIds],
        sourceEdgeIds: [...item.sourceEdgeIds],
        locusIds: [...item.sources],
        constructionProfile: profile.id,
      })),
      bounds: boundsOf(allPoints),
      limitations: [
        "Static planar construction proof; no physical tissue, motion, rig, pose validity or finished art is established.",
        `Rounded joins and nearest-station material domains are provisional ${profile.id} construction rules.`,
        "Original node centers remain source evidence; downstream endpoints are new solved positions.",
        "Height and source Z coordinates remain retained facts; the exported view is an XY projection.",
        "Membranes, radial symmetry, branches, deformation and marked-surface projection are unsupported in this slice.",
      ],
    };
    return { ...construction, constructionDigest: digest(construction) };
  } catch (error) {
    return rejection(
      "construction-failure",
      `The construction could not retain valid bounded source geometry: ${error.message}`,
    );
  }
}
