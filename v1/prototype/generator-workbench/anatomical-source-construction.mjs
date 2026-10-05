// These coarse finite solid operators follow the authored anatomical source convention.
// Surface-local u belongs to construction, including fragments at pigment boundaries.
// The root and both links are retained even when hidden by the near side.
import { ANATOMICAL_CONTENT, ANATOMICAL_PROFILE } from "./anatomical-source-package.mjs";
const add = (a, b) => a.map((value, index) => value + b[index]);
const sub = (a, b) => a.map((value, index) => value - b[index]);
const mul = (a, scale) => a.map((value) => value * scale);
const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
function unit(vector) {
  const length = Math.hypot(...vector);
  if (!Number.isFinite(length) || length <= 1e-10) throw new Error("Degenerate source vector");
  return mul(vector, 1 / length);
}
function constructAnatomicalSource(values, facts) {
  const nodes = [], edges = [];
  const value = (target) => values[target];
  const sources = (...targets) => facts.filter((fact) => targets.includes(fact.target)).map((fact) => fact.locusId);
  const L = value("core.rx");
  const coreR = [L, value("core.ryOverRx") * L, value("core.rzOverRx") * L];
  const headR = [value("head.rxOverCoreRx") * L, value("head.ryOverCoreRx") * L, value("head.rzOverCoreRx") * L];
  const terminalR = [value("terminal.rxOverCoreRx") * L, 0.73 * value("terminal.rxOverCoreRx") * L, value("terminal.rzOverCoreRx") * L];
  const D = value("support.rootToEndDropOverCoreRx") * L, S = value("support.outwardEndOffsetOverCoreRx") * L;
  const coreC = [0, 0, terminalR[2] + D - 0.1 * coreR[2]];
  const headC = [-L - 0.8 * headR[0], 0, coreC[2] + value("head.centerLiftOverCoreRx") * L];
  const bodyPalette = value("appearance.bodyPalette"), modulePalette = value("appearance.modulePalette");
  const inside = (point, center, radii) => point.reduce((sum, coordinate, index) => sum + ((coordinate - center[index]) / radii[index]) ** 2, 0) <= 1 + 1e-8;
  function node(id, role, parent, palette, directSources, atlas) {
    const item = { id, role, parent, sources: [...new Set(directSources)], palette, atlas, mesh: { vertices: [], faces: [] } };
    nodes.push(item);
    if (parent) edges.push({ from: parent, to: id, role: "owned-attachment" });
    return item;
  }
  function face(item, points, u) {
    if (points.some((point) => point.some((coordinate) => !Number.isFinite(coordinate) || Math.abs(coordinate) >= ANATOMICAL_CONTENT.bounds.absoluteCoordinate))) throw new Error("Non-finite or out-of-bounds surface");
    const indices = points.map((point) => {
      const existing = item.mesh.vertices.findIndex((vertex) => vertex.every((coordinate, index) => Math.abs(coordinate - point[index]) < 1e-10));
      if (existing >= 0) return existing;
      item.mesh.vertices.push(point);
      return item.mesh.vertices.length - 1;
    });
    if (Math.hypot(...cross(sub(points[1], points[0]), sub(points[2], points[0]))) <= 1e-12) return;
    item.mesh.faces.push({ vertices: indices, u });
  }
  function ellipsoid(id, role, parent, center, radii, palette, directSources, axis = "x") {
    if (radii.some((radius) => !Number.isFinite(radius) || radius <= 0)) throw new Error(`Invalid ${id} volume`);
    const item = node(id, role, parent, palette, directSources, { kind: "local-linear", axis, minimum: 0, maximum: 1 });
    item.center = center;
    item.radii = radii;
    const point = (latitude, longitude) => {
      const theta = latitude * Math.PI / 6, phi = longitude * 2 * Math.PI / 12;
      return add(center, [radii[0] * Math.sin(theta) * Math.cos(phi), radii[1] * Math.sin(theta) * Math.sin(phi), radii[2] * Math.cos(theta)]);
    };
    const localU = (p) => ((p[axis === "z" ? 2 : 0] - center[axis === "z" ? 2 : 0]) / radii[axis === "z" ? 2 : 0] + 1) / 2;
    for (let latitude = 0; latitude < 6; latitude++) for (let longitude = 0; longitude < 12; longitude++) {
      const points = latitude === 0 ? [point(0, 0), point(1, longitude), point(1, longitude + 1)] : latitude === 5 ? [point(5, longitude), point(6, 0), point(5, longitude + 1)] : [point(latitude, longitude), point(latitude + 1, longitude), point(latitude + 1, longitude + 1), point(latitude, longitude + 1)];
      face(item, points, points.map(localU));
    }
    return item;
  }
  function segment(id, role, parent, start, end, radius, tipRadius, palette, directSources) {
    const direction = unit(sub(end, start));
    const first = unit(cross(direction, Math.abs(direction[2]) < 0.9 ? [0, 0, 1] : [0, 1, 0]));
    const second = cross(direction, first);
    const ring = (center, r, j) => add(center, add(mul(first, r * Math.cos(j * Math.PI / 4)), mul(second, r * Math.sin(j * Math.PI / 4))));
    const item = node(id, role, parent, palette, directSources, { kind: "root-to-end", minimum: 0, maximum: 1 });
    item.root = start;
    item.end = end;
    item.length = Math.hypot(...sub(end, start));
    item.radii = [radius, tipRadius];
    for (let j = 0; j < 8; j++) face(item, [ring(start, radius, j), ring(start, radius, j + 1), ring(end, tipRadius, j + 1), ring(end, tipRadius, j)], [0, 0, 1, 1]);
    face(item, Array.from({ length: 8 }, (_, j) => ring(start, radius, 7 - j)), Array(8).fill(0));
    face(item, Array.from({ length: 8 }, (_, j) => ring(end, tipRadius, j)), Array(8).fill(1));
    return item;
  }
  const coreSources = sources("core.rx", "core.ryOverRx", "core.rzOverRx", "support.rootToEndDropOverCoreRx", "terminal.rzOverCoreRx", "appearance.bodyPalette");
  ellipsoid("core", "support-core", null, coreC, coreR, bodyPalette, coreSources);
  ellipsoid("head", "head", "core", headC, headR, bodyPalette, [...coreSources, ...sources("head.rxOverCoreRx", "head.ryOverCoreRx", "head.rzOverCoreRx", "head.centerLiftOverCoreRx")]);
  const line = unit(sub(coreC, headC));
  const rayDistance = (radii) => 1 / Math.sqrt(line.reduce((sum, v, i) => sum + (v / radii[i]) ** 2, 0));
  const headRoot = add(headC, mul(line, rayDistance(headR) - 0.05 * L));
  const coreRoot = sub(coreC, mul(line, rayDistance(coreR) - 0.05 * L));
  if (!inside(headRoot, headC, headR) || !inside(coreRoot, coreC, coreR)) throw new Error("Neck root disconnected");
  const neck = segment("neck", "head-core-connection", "core", coreRoot, headRoot, 0.7 * Math.min(headR[1], coreR[1]), 0.7 * Math.min(headR[1], coreR[1]), bodyPalette, [...coreSources, ...sources("head.rxOverCoreRx", "head.ryOverCoreRx", "head.rzOverCoreRx", "head.centerLiftOverCoreRx")]);
  edges.push({ from: "neck", to: "head", role: "true-surface-root" });
  neck.attachments = [{ owner: "core", position: coreRoot }, { owner: "head", position: headRoot }];
  if (value("modules.muzzleAndJaw")) {
    const radii = [value("muzzle.rxOverHeadRx") * headR[0], value("muzzle.ryOverHeadRy") * headR[1], 0.45 * headR[2]];
    const center = [headC[0] - headR[0] + 0.15 * headR[0] - 0.5 * radii[0], 0, headC[2] - 0.38 * headR[2]];
    const trace = [...sources("modules.muzzleAndJaw", "muzzle.rxOverHeadRx", "muzzle.ryOverHeadRy", "appearance.bodyPalette"), ...nodes[1].sources];
    ellipsoid("muzzle", "muzzle", "head", center, radii, bodyPalette, trace);
    ellipsoid("lower-jaw", "lower-jaw", "muzzle", add(center, [0.07 * headR[0], 0, -0.3 * headR[2]]), [0.88 * radii[0], 0.89 * radii[1], 0.28 * headR[2]], bodyPalette, trace);
  }
  if (value("modules.posterior")) {
    const radii = [value("posterior.rxOverCoreRx") * L, value("posterior.ryOverCoreRy") * coreR[1], value("posterior.ryOverCoreRy") * coreR[2]];
    ellipsoid("posterior", "posterior", "core", [L + radii[0] - 0.18 * Math.min(L, radii[0]), 0, coreC[2]], radii, bodyPalette, [...coreSources, ...sources("modules.posterior", "posterior.rxOverCoreRx", "posterior.ryOverCoreRy")]);
  }
  const stations = value("support.pairCount") === 2 ? [-0.65, 0.65] : [-0.65, 0, 0.65];
  const supportSources = [...coreSources, ...sources("support.pairCount", "support.outwardEndOffsetOverCoreRx", "support.proximalRadiusOverCoreRx", "terminal.rxOverCoreRx", "terminal.rzOverCoreRx", "appearance.modulePalette")];
  for (let station = 0; station < stations.length; station++) for (const side of [-1, 1]) {
    const x = stations[station] * L, y = coreR[1] * Math.sqrt(1 - (x / L) ** 2 - 0.1 ** 2);
    const root = [x, side * y, coreC[2] + 0.1 * coreR[2]], joint = [x - 0.04 * L, side * (y + 0.6 * S), terminalR[2] + 0.5 * D], end = [x - 0.1 * L, side * (y + S), terminalR[2]];
    const id = `support-${station}-${side}`, radius = value("support.proximalRadiusOverCoreRx") * L;
    const proximal = segment(`${id}-proximal`, "support-proximal", "core", root, joint, radius, 0.86 * radius, modulePalette, supportSources);
    proximal.rootFrame = { owner: "core", position: root, station, side };
    ellipsoid(`${id}-joint`, "support-joint", proximal.id, joint, Array(3).fill(0.9 * radius), modulePalette, supportSources);
    const distal = segment(`${id}-distal`, "support-distal", `${id}-joint`, joint, end, 0.8 * radius, 0.68 * radius, modulePalette, supportSources);
    const terminalC = add(end, [-0.09 * L, 0, 0]);
    if (!inside(end, terminalC, terminalR)) throw new Error("Distal root outside inherited terminal");
    const terminal = ellipsoid(`${id}-terminal`, "support-terminal", distal.id, terminalC, terminalR, modulePalette, supportSources);
    terminal.attachment = { owner: distal.id, position: end };
  }
  if (value("modules.exteriorEyePair")) for (const side of [-1, 1]) {
    const y = side * value("eye.anchorYOverHeadRy") * headR[1], z = 0.2 * headR[2], r = value("eye.radiusOverHeadMinYZ") * Math.min(headR[1], headR[2]);
    if ((Math.abs(y) + 0.82 * r) / headR[1] > 1 || (Math.abs(z) + r) / headR[2] > 1) throw new Error("Full ocular rim outside head-local frame");
    const root = add(headC, [-headR[0] * Math.sqrt(1 - (y / headR[1]) ** 2 - (z / headR[2]) ** 2), y, z]);
    const trace = [...nodes[1].sources, ...sources("modules.exteriorEyePair", "eye.anchorYOverHeadRy", "eye.radiusOverHeadMinYZ")];
    const rim = ellipsoid(`eye-${side}-rim`, "ocular-rim", "head", add(root, [-0.04 * r, 0, 0]), [0.24 * r, 0.82 * r, r], [ANATOMICAL_CONTENT.surfaceOwnership.fixedOcular.rim], trace);
    rim.attachment = { owner: "head", position: root, frame: { forward: [-1, 0, 0], paired: [0, side, 0], up: [0, 0, 1] } };
    ellipsoid(`eye-${side}-pupil`, "ocular-pupil", rim.id, add(root, [-0.25 * r, 0, 0]), [0.12 * r, 0.44 * r, 0.57 * r], [ANATOMICAL_CONTENT.surfaceOwnership.fixedOcular.pupil], trace);
  }
  if (value("modules.crownPair")) for (const side of [-1, 1]) {
    const x = 0.06 * headR[0], y = side * 0.67 * headR[1], z = headR[2] * Math.sqrt(1 - 0.06 ** 2 - 0.67 ** 2);
    const root = add(headC, [x, y, z]), height = value("crown.heightOverHeadRz") * headR[2], radius = 0.36 * Math.min(headR[1], headR[2]);
    const trace = [...nodes[1].sources, ...sources("modules.crownPair", "crown.form", "crown.heightOverHeadRz")];
    let crown;
    if (value("crown.form") === "rounded") crown = ellipsoid(`crown-${side}`, "crown", "head", add(root, [0, 0, 0.4 * height]), [radius, radius, 0.6 * height], bodyPalette, trace, "z");
    else {
      crown = node(`crown-${side}`, "crown", "head", bodyPalette, trace, { kind: "base-to-tip", minimum: 0, maximum: 1 });
      const base = Array.from({ length: 6 }, (_, i) => add(root, [radius * Math.cos(i * Math.PI / 3), radius * Math.sin(i * Math.PI / 3), -0.08 * height]));
      for (let i = 0; i < 6; i++) face(crown, [base[i], base[(i + 1) % 6], add(root, [0, 0, height])], [0, 0, 1]);
      face(crown, base.toReversed(), Array(6).fill(0));
    }
    crown.attachment = { owner: "head", position: root };
  }
  if (value("modules.wingPair")) for (const side of [-1, 1]) {
    const root = add(coreC, [0.15 * L, side * coreR[1] * Math.sqrt(1 - 0.15 ** 2 - 0.7 ** 2), 0.7 * coreR[2]]);
    const span = value("wing.outwardSpanOverCoreRx") * L, chord = value("wing.longitudinalChordOverCoreRx") * L, sweep = value("wing.posteriorSweepOverSpan") * span;
    const outer = add(root, [sweep, side * span, 0.2 * span]), thickness = 0.015 * L;
    const trace = [...coreSources, ...sources("modules.wingPair", "wing.outwardSpanOverCoreRx", "wing.longitudinalChordOverCoreRx", "wing.posteriorSweepOverSpan", "appearance.modulePalette")];
    const mount = ellipsoid(`wing-${side}-mount`, "wing-root", "core", root, [0.55 * chord, 0.08 * L, 0.06 * L], modulePalette, trace);
    mount.attachment = { owner: "core", position: root };
    const wing = node(`wing-${side}`, "wing", mount.id, modulePalette, trace, { kind: "root-to-outer-edge", minimum: 0, maximum: 1 });
    const corners = [add(root, [-0.5 * chord, 0, 0]), add(root, [0.5 * chord, 0, 0]), add(outer, [0.3 * chord, 0, 0]), add(outer, [-0.3 * chord, 0, 0])];
    for (const direction of [-1, 1]) face(wing, (direction === 1 ? corners : corners.toReversed()).map((p) => add(p, [0, 0, direction * thickness / 2])), direction === 1 ? [0, 0, 1, 1] : [1, 1, 0, 0]);
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      face(wing, [add(corners[i], [0, 0, -thickness / 2]), add(corners[j], [0, 0, -thickness / 2]), add(corners[j], [0, 0, thickness / 2]), add(corners[i], [0, 0, thickness / 2])], [i < 2 ? 0 : 1, j < 2 ? 0 : 1, j < 2 ? 0 : 1, i < 2 ? 0 : 1]);
    }
    wing.attachment = { owner: mount.id, position: root, rootEdge: corners.slice(0, 2) };
    wing.corners = corners;
    wing.thickness = thickness;
  }
  for (const child of nodes) {
    const parent = nodes.find((node2) => node2.id === child.parent);
    if (!parent || child.id === "head" || !child.center || !parent.center || !child.radii || !parent.radii) continue;
    const delta = sub(child.center, parent.center), distance = Math.hypot(...delta);
    if (distance < 1e-10) {
      child.connectionWitness = child.center;
      continue;
    }
    const direction = mul(delta, 1 / distance);
    const radialExtent = (radii) => 1 / Math.sqrt(direction.reduce((sum, coordinate, index) => sum + (coordinate / radii[index]) ** 2, 0));
    const lower = Math.max(0, distance - radialExtent(child.radii));
    const upper = Math.min(distance, radialExtent(parent.radii));
    if (lower > upper + 1e-9) throw new Error(`Disconnected required volume ${child.id}`);
    const witness = add(parent.center, mul(direction, (lower + upper) / 2));
    if (!inside(witness, parent.center, parent.radii) || !inside(witness, child.center, child.radii)) throw new Error(`Invalid attachment witness ${child.id}`);
    child.connectionWitness = witness;
  }
  if (nodes.length > ANATOMICAL_CONTENT.bounds.graphNodes || edges.length > ANATOMICAL_CONTENT.bounds.graphEdges || nodes.reduce((sum, n) => sum + n.mesh.vertices.length, 0) > ANATOMICAL_CONTENT.bounds.meshVertices) throw new Error("Source bounds exceeded");
  return { status: "constructed", profileVersion: ANATOMICAL_PROFILE, baseline: ANATOMICAL_CONTENT.inheritedBaseline, nodes, edges, conventions: { units: "arbitrary source length", pose: "neutral supported", linksPerSupport: 2, supportPairs: stations.length } };
}
export {
  add,
  constructAnatomicalSource,
  cross,
  dot,
  mul,
  sub,
  unit
};
