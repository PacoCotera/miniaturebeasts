// A bounded inspection projection, not a mesh, tissue model or game renderer.
// Coordinates and pigment masks come from the already resolved graph.
const WIDTH = 1024;
const HEIGHT = 600;
const MARGIN = 72;
const INK = "#545d62";
const round = (value) => Number(value.toFixed(6));
const reject = (error) => ({ status: "rejected", error });
const isRecord = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const stringArray = (value) =>
  Array.isArray(value) && value.every((item) => typeof item === "string");
const safeId = (value) =>
  typeof value === "string" && /^[a-zA-Z0-9_-]+$/.test(value);

export function createGeometryReference(result, identity = {}) {
  if (
    result?.status !== "resolved" ||
    !Array.isArray(result.graph?.nodes) ||
    !result.graph.nodes.length
  )
    return reject("A resolved nonempty graph is required.");
  const { nodes, edges, surfaces } = result.graph;
  if (!Array.isArray(edges) || !Array.isArray(surfaces))
    return reject("Resolved edge and surface arrays are required.");
  if (
    nodes.some((node) => !isRecord(node) || !stringArray(node.sources)) ||
    edges.some((edge) => !isRecord(edge) || !stringArray(edge.sources)) ||
    surfaces.some(
      (surface) => !isRecord(surface) || !stringArray(surface.sources),
    )
  )
    return reject(
      "Node, edge and surface records require source string arrays.",
    );
  if (
    !isRecord(identity) ||
    Object.values(identity).some(
      (value) =>
        typeof value !== "string" &&
        !(typeof value === "number" && Number.isFinite(value)),
    )
  )
    return reject(
      "Reference identity requires scalar strings or finite numbers.",
    );
  if (
    nodes.some(
      (node) => !safeId(node.id) || !["volume", "fin"].includes(node.role),
    )
  )
    return reject("This reference supports volume and fin footprints only.");
  if (
    nodes.some(
      (node) =>
        !Array.isArray(node.position) ||
        node.position.length !== 3 ||
        node.position.some((value) => !Number.isFinite(value)) ||
        !Array.isArray(node.dimensions) ||
        node.dimensions.length !== 3 ||
        node.dimensions.some((value) => !Number.isFinite(value) || value <= 0),
    )
  )
    return reject(
      "Every node must have finite position and positive dimensions.",
    );
  const byId = new Map(nodes.map((node) => [node.id, node]));
  if (
    byId.size !== nodes.length ||
    !nodes.some((node) => node.role === "volume")
  )
    return reject("Unique nodes and at least one volume are required.");
  if (
    edges.some(
      (edge) =>
        !safeId(edge.id) ||
        !byId.has(edge.from) ||
        !byId.has(edge.to) ||
        !["connected-volume", "rooted-surface"].includes(edge.role),
    )
  )
    return reject("Unsupported or unresolved graph edge.");
  const surfaceByNode = new Map(
    surfaces.map((surface) => [surface.nodeId, surface]),
  );
  if (surfaceByNode.size !== nodes.length || surfaces.length !== nodes.length)
    return reject("Exactly one surface per node is required.");
  for (const node of nodes) {
    const surface = surfaceByNode.get(node.id);
    if (
      !surface ||
      !safeId(surface.id) ||
      !Array.isArray(surface.palette) ||
      ![1, 2].includes(surface.palette.length) ||
      surface.palette.some(
        (color) =>
          typeof color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(color),
      ) ||
      surface.partition !==
        (surface.palette.length === 1
          ? "uniform"
          : "two declared equal local masks") ||
      !Array.isArray(surface.markings) ||
      surface.markings.length
    )
      return reject(
        "Only declared uniform/equal two-color masks without markings are supported.",
      );
    const incoming = edges.filter((edge) => edge.to === node.id);
    if (
      node.role === "fin" &&
      (incoming.length !== 1 ||
        incoming[0].role !== "rooted-surface" ||
        byId.get(incoming[0].from).role !== "volume")
    )
      return reject("Each fin must have one actual volume root.");
  }
  const bounds = {
    minimumX: Math.min(
      ...nodes.map((node) => node.position[0] - node.dimensions[0] / 2),
    ),
    maximumX: Math.max(
      ...nodes.map((node) => node.position[0] + node.dimensions[0] / 2),
    ),
    minimumY: Math.min(
      ...nodes.map((node) => node.position[1] - node.dimensions[1] / 2),
    ),
    maximumY: Math.max(
      ...nodes.map((node) => node.position[1] + node.dimensions[1] / 2),
    ),
  };
  const scale = Math.min(
    (WIDTH - 2 * MARGIN) / (bounds.maximumX - bounds.minimumX),
    (HEIGHT - 2 * MARGIN) / (bounds.maximumY - bounds.minimumY),
  );
  const offsetX = (WIDTH - scale * (bounds.maximumX + bounds.minimumX)) / 2;
  const offsetY = (HEIGHT - scale * (bounds.maximumY + bounds.minimumY)) / 2;
  const project = (position) => [
    round(offsetX + scale * position[0]),
    round(offsetY + scale * position[1]),
  ];
  const drawOrder = [
    ...nodes.filter((node) => node.role === "volume"),
    ...nodes.filter((node) => node.role === "fin"),
  ];
  const traceNodes = [];
  let definitions = "";
  let body = `<rect width="${WIDTH}" height="${HEIGHT}" fill="#ffffff"/>`;
  for (const [index, node] of drawOrder.entries()) {
    const [x, y] = project(node.position);
    const width = round(node.dimensions[0] * scale);
    const height = round(node.dimensions[1] * scale);
    const surface = surfaceByNode.get(node.id);
    const ellipse = `<ellipse cx="${x}" cy="${y}" rx="${round(width / 2)}" ry="${round(height / 2)}"/>`;
    definitions += `<clipPath id="geometry-reference-clip-${node.id}">${ellipse}</clipPath>`;
    body += `<g data-node="${node.id}" data-surface="${surface.id}" clip-path="url(#geometry-reference-clip-${node.id})">`;
    body += `<rect x="${round(x - width / 2)}" y="${round(y - height / 2)}" width="${width}" height="${height}" fill="${surface.palette[0]}"/>`;
    if (surface.palette.length === 2)
      body += `<rect x="${x}" y="${round(y - height / 2)}" width="${round(width / 2)}" height="${height}" fill="${surface.palette[1]}"/>`;
    body += `</g><g fill="none" stroke="${INK}" stroke-width="1.5">${ellipse}</g>`;
    const root = edges.find(
      (edge) => edge.to === node.id && edge.role === "rooted-surface",
    );
    traceNodes.push({
      id: node.id,
      role: node.role,
      sourcePosition: [...node.position],
      sourceDimensions: [...node.dimensions],
      projectedCenter: [x, y],
      projectedDimensions: [width, height],
      drawIndex: index,
      footprint:
        "axis-aligned ellipse within exact XY node bounds; diagnostic construction profile",
      root: root ? { edgeId: root.id, volumeId: root.from } : null,
      sources: [...node.sources],
      surface: structuredClone(surface),
      masks: surface.palette.map((color, paletteIndex) => ({
        color,
        localU:
          surface.palette.length === 1
            ? [0, 1]
            : [paletteIndex / 2, (paletteIndex + 1) / 2],
        localV: [0, 1],
      })),
    });
  }
  const traceEdges = edges.map((edge) => ({
    ...structuredClone(edge),
    projectedFrom: project(byId.get(edge.from).position),
    projectedTo: project(byId.get(edge.to).position),
  }));
  // Draw graph annotations last so body overlap cannot hide a recorded root.
  for (const edge of traceEdges)
    body += `<line data-edge="${edge.id}" x1="${edge.projectedFrom[0]}" y1="${edge.projectedFrom[1]}" x2="${edge.projectedTo[0]}" y2="${edge.projectedTo[1]}" stroke="${INK}" stroke-width="1.5"/>`;
  return {
    status: "available",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="Exact projected graph footprints and pigment-mask diagnostic"><defs>${definitions}</defs>${body}</svg>`,
    manifest: {
      schemaVersion: "critter-geometry-reference/1",
      identity: structuredClone(identity),
      projection: {
        type: "orthographic XY",
        positiveX: "right",
        positiveY: "down",
        z: "retained in trace; not projected",
        width: WIDTH,
        height: HEIGHT,
        margin: MARGIN,
        scale,
        offsetX,
        offsetY,
        sourceBounds: bounds,
      },
      constructionProfile: {
        id: "elliptic-xy-local-masks/1",
        footprint: "ellipse within exact XY node bounds",
        equalMasks: "local u=0.5; palette order retained",
        order: "body footprints, fin footprints, neutral graph edges",
        texture: "retained in trace but not rendered",
      },
      counts: {
        volumes: nodes.filter((node) => node.role === "volume").length,
        fins: nodes.filter((node) => node.role === "fin").length,
        edges: edges.length,
      },
      nodes: traceNodes,
      edges: traceEdges,
      limitations: [
        "All nodes are visible for inspection: overlay paint order is not opacity, transparency anatomy or physical z-order.",
        "Neutral graph edges are annotations, not tissue bridges; source gaps remain unchanged.",
        "This is a static footprint and pigment-mask reference, not a whole 3D body, physical motion or finished creature art.",
      ],
    },
  };
}
