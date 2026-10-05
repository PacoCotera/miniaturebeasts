
import { COMPOSITIONAL_CONTENT } from "./compositional-source-package.mjs";
import { add, sub, mul, dot, cross, unit } from "./anatomical-source-construction.mjs";
const identityFrame = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const localVector = (frame, vector) => vector.reduce((sum, coordinate, index) => add(sum, mul(frame[index], coordinate)), [0, 0, 0]);
const worldPoint = (owner, point) => add(owner.center, localVector(owner.frame, point));
const localPoint = (owner, point) => owner.frame.map((axis) => dot(sub(point, owner.center), axis));
function frameAlong(direction) {
  const longitudinal = unit(direction);
  const transverse = unit(cross(Math.abs(longitudinal[2]) < 0.9 ? [0, 0, 1] : [0, 1, 0], longitudinal));
  return [longitudinal, transverse, cross(longitudinal, transverse)];
}
const rotateX = (point, angle) => [point[0], point[1] * Math.cos(angle) - point[2] * Math.sin(angle), point[1] * Math.sin(angle) + point[2] * Math.cos(angle)];
const radialExtent = (owner, direction) => 1 / Math.sqrt(owner.frame.reduce((sum, axis, index) => sum + (dot(direction, axis) / owner.radii[index]) ** 2, 0));
const inside = (owner, point) => localPoint(owner, point).reduce((sum, coordinate, index) => sum + (coordinate / owner.radii[index]) ** 2, 0) <= 1 + 1e-8;
const LEGACY_COMPOSITIONAL_PROFILE = "compositional-source/1";
const MESH_CONTACT_PROFILE = "compositional-source/2";

// The opaque mesh is inscribed within its mathematical ellipsoid. Contact must
// use the actual facets; analytical membership alone can leave a visible gap.
function meshContactGeometry(owner, direction) {
  const planes = owner.mesh.faces.map((face) => {
    const points = face.vertices.map((index) => owner.mesh.vertices[index]);
    let normal = unit(cross(sub(points[1], points[0]), sub(points[2], points[0])));
    if (dot(normal, sub(points[0], owner.center)) < 0) normal = mul(normal, -1);
    const offset = dot(normal, sub(points[0], owner.center));
    if (!Number.isFinite(offset) || offset <= 0 || points.some((point) => Math.abs(dot(normal, sub(point, owner.center)) - offset) > 1e-8)) {
      throw new Error(`Invalid convex contact facet on ${owner.id}`);
    }
    if (owner.mesh.vertices.some((point) => dot(normal, sub(point, owner.center)) > offset + 1e-8)) {
      throw new Error(`Inconsistent convex contact mesh on ${owner.id}`);
    }
    return { normal, offset };
  });
  const distances = planes
    .filter((plane) => dot(plane.normal, direction) > 1e-10)
    .map((plane) => plane.offset / dot(plane.normal, direction));
  const distance = Math.min(...distances);
  if (!Number.isFinite(distance) || distance <= 0) throw new Error(`No contact surface on ${owner.id}`);
  return {
    surfaceRoot: add(owner.center, mul(direction, distance)),
    distance,
    contains: (point) => planes.every((plane) => dot(plane.normal, sub(point, owner.center)) <= plane.offset + 1e-9),
  };
}

function buildCompositionalSource(values, facts, profileVersion) {
  const nodes = [], edges = [];
  const value = (target) => values[target];
  const sources = (...targets) => facts.filter((fact) => fact.state === "expressed" && targets.includes(fact.target)).map((fact) => fact.locusId);
  const L = value("core.rx"), radial = value("organization.symmetry") === "radial";
  const radii = [L, (radial ? value("region.radialCrossRadiusOverAnchorRx") : value("core.ryOverRx")) * L, (radial ? value("region.radialCrossRadiusOverAnchorRx") : value("core.rzOverRx")) * L];
  const bodyPalette = value("appearance.bodyPalette"), modulePalette = radial ? bodyPalette : value("appearance.modulePalette");
  const primarySources = sources("core.rx", radial ? "region.radialCrossRadiusOverAnchorRx" : "core.ryOverRx", ...radial ? [] : ["core.rzOverRx"], "organization.symmetry", "organization.depth", "appearance.bodyPalette");
  function newNode(id, role2, parent, palette, trace, frame = identityFrame) {
    const node = { id, role: role2, parent, palette, sources: [...new Set(trace)], frame, atlas: { kind: "local-longitudinal", minimum: 0, maximum: 1 }, mesh: { vertices: [], faces: [] } };
    nodes.push(node);
    if (parent) edges.push({ from: parent, to: id, role: "owned-attachment" });
    return node;
  }
  function polygon(owner, points, u) {
    if (points.some((point) => point.some((coordinate) => !Number.isFinite(coordinate) || Math.abs(coordinate) >= COMPOSITIONAL_CONTENT.bounds.absoluteCoordinate))) throw new Error("Invalid compositional surface coordinates");
    if (Math.hypot(...cross(sub(points[1], points[0]), sub(points[2], points[0]))) < 1e-12) return;
    const vertices = points.map((point) => {
      const existing = owner.mesh.vertices.findIndex((vertex) => vertex.every((coordinate, index) => Math.abs(coordinate - point[index]) < 1e-10));
      if (existing >= 0) return existing;
      owner.mesh.vertices.push(point);
      return owner.mesh.vertices.length - 1;
    });
    owner.mesh.faces.push({ vertices, u });
  }
  function ellipsoid(id, role2, parent, center, radii2, palette, trace, frame = identityFrame, atlasAxis = 0) {
    if (radii2.some((radius) => !Number.isFinite(radius) || radius <= 0)) throw new Error(`Invalid ${id} radii`);
    const owner = newNode(id, role2, parent, palette, trace, frame);
    owner.center = center;
    owner.radii = radii2;
    owner.atlas.axis = atlasAxis;
    const point = (latitude, longitude) => worldPoint(owner, [radii2[0] * Math.sin(latitude * Math.PI / 6) * Math.cos(longitude * Math.PI / 6), radii2[1] * Math.sin(latitude * Math.PI / 6) * Math.sin(longitude * Math.PI / 6), radii2[2] * Math.cos(latitude * Math.PI / 6)]);
    for (let latitude = 0; latitude < 6; latitude++) for (let longitude = 0; longitude < 12; longitude++) {
      const points = latitude === 0 ? [point(0, 0), point(1, longitude), point(1, longitude + 1)] : latitude === 5 ? [point(5, longitude), point(6, 0), point(5, longitude + 1)] : [point(latitude, longitude), point(latitude + 1, longitude), point(latitude + 1, longitude + 1), point(latitude, longitude + 1)];
      polygon(owner, points, points.map((p) => (localPoint(owner, p)[atlasAxis] / radii2[atlasAxis] + 1) / 2));
    }
    return owner;
  }
  function segment(id, role2, parent, start, end, radius, tip, palette, trace) {
    const frame = frameAlong(sub(end, start)), owner = newNode(id, role2, parent, palette, trace, frame);
    owner.root = start;
    owner.end = end;
    owner.center = mul(add(start, end), 0.5);
    owner.length = Math.hypot(...sub(end, start));
    owner.sectionRadii = [radius, tip];
    owner.atlas.kind = "root-to-tip";
    const ring = (center, radius2, index) => add(center, localVector(frame, [0, radius2 * Math.cos(index * Math.PI / 4), radius2 * Math.sin(index * Math.PI / 4)]));
    for (let index = 0; index < 8; index++) polygon(owner, [ring(start, radius, index), ring(start, radius, index + 1), ring(end, tip, index + 1), ring(end, tip, index)], [0, 0, 1, 1]);
    polygon(owner, Array.from({ length: 8 }, (_, index) => ring(start, radius, 7 - index)), Array(8).fill(0));
    polygon(owner, Array.from({ length: 8 }, (_, index) => ring(end, tip, index)), Array(8).fill(1));
    return owner;
  }
  function sharedWitness(parent, child) {
    const difference = sub(child.center, parent.center), distance = Math.hypot(...difference), direction = unit(difference);
    const lower = Math.max(0, distance - radialExtent(child, direction)), upper = Math.min(distance, radialExtent(parent, direction));
    if (lower > upper + 1e-9) throw new Error(`Disconnected volume ${child.id}`);
    const witness = add(parent.center, mul(direction, (lower + upper) / 2));
    if (!inside(parent, witness) || !inside(child, witness)) throw new Error(`Invalid shared witness ${child.id}`);
    child.connectionWitness = witness;
  }
  function connect(parent, child, trace) {
    if (value("organization.join") === "broad") {
      sharedWitness(parent, child);
      return;
    }
    const direction = unit(sub(child.center, parent.center)), penetration = 0.05 * Math.min(L, child.radii[0]);
    const start = add(parent.center, mul(direction, radialExtent(parent, direction) - penetration));
    const end = sub(child.center, mul(direction, radialExtent(child, direction) - penetration));
    if (!inside(parent, start) || !inside(child, end)) throw new Error("Disconnected narrow roots");
    const radius = value("region.connectorRadiusRatio") * Math.min(parent.radii[1], parent.radii[2], child.radii[1], child.radii[2]);
    let realizedStart = start;
    let realizedEnd = end;
    let meshContact = null;
    if (profileVersion === MESH_CONTACT_PROFILE) {
      const parentContact = meshContactGeometry(parent, direction);
      const childContact = meshContactGeometry(child, mul(direction, -1));
      if (penetration >= Math.min(parentContact.distance, childContact.distance)) throw new Error("Narrow contact penetration exceeds owner interior");
      realizedStart = sub(parentContact.surfaceRoot, mul(direction, penetration));
      realizedEnd = add(childContact.surfaceRoot, mul(direction, penetration));
      if (!parentContact.contains(realizedStart) || !childContact.contains(realizedEnd)) throw new Error("Connector cap center is outside actual owner mesh");
      const witnessRadius = Math.min(radius, penetration) * 0.01;
      const connectorFrame = frameAlong(direction);
      const capInteriorWitnesses = [realizedStart, realizedEnd].map(center => ({
        center,
        radius: witnessRadius,
        points: [center, ...connectorFrame.slice(1).flatMap(axis => [add(center, mul(axis, witnessRadius)), sub(center, mul(axis, witnessRadius))])],
      }));
      if (!capInteriorWitnesses[0].points.every(parentContact.contains) || !capInteriorWitnesses[1].points.every(childContact.contains)) throw new Error("Connector cap lacks a shared mesh interior");
      meshContact = {
        profileVersion: "faceted-volume-contact/1",
        penetration,
        mathematicalSurfaceRoots: [add(parent.center, mul(direction, radialExtent(parent, direction))), sub(child.center, mul(direction, radialExtent(child, direction)))],
        meshSurfaceRoots: [parentContact.surfaceRoot, childContact.surfaceRoot],
        capInteriorWitnesses,
      };
    }
    const connector = segment(`${child.id}-join`, "region-connector", parent.id, realizedStart, realizedEnd, radius, radius, bodyPalette, [...trace, ...sources("region.connectorRadiusRatio")]);
    connector.attachments = [{ owner: parent.id, position: realizedStart }, { owner: child.id, position: realizedEnd }];
    if (meshContact) connector.meshContact = meshContact;
    edges.push({ from: connector.id, to: child.id, role: "true-surface-root" });
  }
  const anchor = ellipsoid("region-root", "primary-region", null, [0, 0, 0], radii, bodyPalette, primarySources);
  const depth = value("organization.depth"), fan = value("organization.layout") === "fan", armCount = fan ? radial ? 3 : 2 : 1;
  for (let arm = 0; arm < armCount; arm++) {
    let parent = anchor;
    for (let level = 1; level < depth; level++) {
      const direction = fan ? radial ? [0, Math.cos(arm * 2 * Math.PI / 3), Math.sin(arm * 2 * Math.PI / 3)] : [Math.cos(value("region.branchAngleRadians")), (arm === 0 ? -1 : 1) * Math.sin(value("region.branchAngleRadians")), 0] : radial ? [1, 0, 0] : [Math.cos(level * value("region.bendRadians")), 0, Math.sin(level * value("region.bendRadians"))];
      const frame = fan && radial ? frameAlong([0, 1, 0]).map((axis) => rotateX(axis, arm * 2 * Math.PI / 3)) : frameAlong(direction);
      const childRadii = radii.map((radius) => radius * value("region.childScale") ** level);
      const provisional = { frame, radii: childRadii }, parentExtent = radialExtent(parent, direction), childExtent = radialExtent(provisional, direction);
      const distance = parentExtent + childExtent + (value("organization.join") === "broad" ? -0.2 : 0.2) * Math.min(parentExtent, childExtent);
      const trace = [...primarySources, ...sources("organization.depth", "organization.layout", "organization.join", "region.childScale", fan && !radial ? "region.branchAngleRadians" : "region.bendRadians")];
      const child = ellipsoid(`region-${arm}-${level}`, "primary-region", parent.id, add(parent.center, mul(direction, distance)), childRadii, bodyPalette, trace, frame);
      connect(parent, child, trace);
      parent = child;
    }
  }
  if (value("modules.typedHead")) {
    const headR = [value("head.rxOverCoreRx") * L, value("head.ryOverCoreRx") * L, value("head.rzOverCoreRx") * L];
    let headCenter = [-L - 0.8 * headR[0], 0, value("head.centerLiftOverCoreRx") * L];
    if (value("organization.join") === "broad") {
      const direction = unit(headCenter), headExtent = radialExtent({ frame: identityFrame, radii: headR }, direction), parentExtent = radialExtent(anchor, direction);
      headCenter = mul(direction, parentExtent + headExtent - 0.2 * Math.min(parentExtent, headExtent));
    }
    const trace = [...primarySources, ...sources("modules.typedHead", "head.rxOverCoreRx", "head.ryOverCoreRx", "head.rzOverCoreRx", "head.centerLiftOverCoreRx", "organization.join")];
    const head = ellipsoid("optional-head", "typed-head", anchor.id, headCenter, headR, bodyPalette, trace);
    connect(anchor, head, trace);
    if (value("modules.muzzleAndJaw")) {
      const muzzleR = [value("muzzle.rxOverHeadRx") * headR[0], value("muzzle.ryOverHeadRy") * headR[1], 0.45 * headR[2]], center = add(headCenter, [-headR[0] + 0.15 * headR[0] - 0.5 * muzzleR[0], 0, -0.38 * headR[2]]);
      const cause = [...trace, ...sources("modules.muzzleAndJaw", "muzzle.rxOverHeadRx", "muzzle.ryOverHeadRy")];
      const muzzle = ellipsoid("optional-muzzle", "muzzle", head.id, center, muzzleR, bodyPalette, cause);
      sharedWitness(head, muzzle);
      const jaw = ellipsoid("optional-jaw", "lower-jaw", muzzle.id, add(center, [0.07 * headR[0], 0, -0.3 * headR[2]]), [0.88 * muzzleR[0], 0.89 * muzzleR[1], 0.28 * headR[2]], bodyPalette, cause);
      sharedWitness(muzzle, jaw);
    }
    if (value("modules.exteriorEyePair")) for (const side of [-1, 1]) {
      const y = side * value("eye.anchorYOverHeadRy") * headR[1], z = 0.2 * headR[2], radius = value("eye.radiusOverHeadMinYZ") * Math.min(headR[1], headR[2]);
      if (Math.abs(y) + 0.82 * radius > headR[1] || Math.abs(z) + radius > headR[2]) throw new Error("Ocular mount cannot fit inherited head frame");
      const root = add(headCenter, [-headR[0] * Math.sqrt(1 - (y / headR[1]) ** 2 - (z / headR[2]) ** 2), y, z]);
      const cause = [...trace, ...sources("modules.exteriorEyePair", "eye.anchorYOverHeadRy", "eye.radiusOverHeadMinYZ")];
      const rim = ellipsoid(`eye-${side}-rim`, "ocular-rim", head.id, add(root, [-0.04 * radius, 0, 0]), [0.24 * radius, 0.82 * radius, radius], [COMPOSITIONAL_CONTENT.surfaces.fixedEyes.rim], cause);
      rim.attachment = { owner: head.id, position: root };
      sharedWitness(head, rim);
      const pupil = ellipsoid(`eye-${side}-pupil`, "ocular-pupil", rim.id, add(root, [-0.25 * radius, 0, 0]), [0.12 * radius, 0.44 * radius, 0.57 * radius], [COMPOSITIONAL_CONTENT.surfaces.fixedEyes.pupil], cause);
      sharedWitness(rim, pupil);
    }
    if (value("modules.crownPair")) for (const side of [-1, 1]) {
      const root = add(headCenter, [0.06 * headR[0], side * 0.67 * headR[1], headR[2] * Math.sqrt(1 - 0.06 ** 2 - 0.67 ** 2)]), height = value("crown.heightOverHeadRz") * headR[2], radius = 0.36 * Math.min(headR[1], headR[2]);
      const cause = [...trace, ...sources("modules.crownPair", "crown.form", "crown.heightOverHeadRz")];
      if (value("crown.form") === "rounded") {
        const crown = ellipsoid(`crown-${side}`, "crown", head.id, add(root, [0, 0, 0.4 * height]), [radius, radius, 0.6 * height], bodyPalette, cause, identityFrame, 2);
        crown.attachment = { owner: head.id, position: root };
        sharedWitness(head, crown);
      } else {
        const crown = newNode(`crown-${side}`, "crown", head.id, bodyPalette, cause);
        crown.attachment = { owner: head.id, position: root };
        const base = Array.from({ length: 6 }, (_, i) => add(root, [radius * Math.cos(i * Math.PI / 3), radius * Math.sin(i * Math.PI / 3), -0.08 * height]));
        for (let i = 0; i < 6; i++) polygon(crown, [base[i], base[(i + 1) % 6], add(root, [0, 0, height])], [0, 0, 1]);
        polygon(crown, base.toReversed(), Array(6).fill(0));
      }
    }
  }
  const role = value("appendage.role"), bilateralContact = role === "contact-chain" && !radial;
  const groupCount = role === "none" ? 0 : bilateralContact ? value("support.pairCount") : value("appendage.groups");
  for (let group = 0; group < groupCount; group++) {
    const station = bilateralContact ? (groupCount === 2 ? [-0.65, 0.65] : [-0.65, 0, 0.65])[group] * L : groupCount === 1 ? 0 : (-0.5 + group / (groupCount - 1)) * L;
    for (let sector = 0; sector < (radial ? 3 : 2); sector++) {
      const side = sector === 0 ? -1 : 1, angle = radial ? sector * 2 * Math.PI / 3 : 0;
      const contact = role === "contact-chain", localRootZ = bilateralContact ? 0.1 * radii[2] : 0;
      const transverse = radii[1] * Math.sqrt(1 - (station / L) ** 2 - (localRootZ / radii[2]) ** 2);
      const root = radial ? rotateX([station, transverse, 0], angle) : [station, side * transverse, localRootZ];
      const trace = [...primarySources, ...sources("appendage.role", bilateralContact ? "support.pairCount" : "appendage.groups", ...bilateralContact ? ["support.rootToEndDropOverCoreRx", "support.outwardEndOffsetOverCoreRx"] : ["appendage.proximalOverAnchorRx", "appendage.distalOverAnchorRx", "appendage.freeLinks"], contact ? "support.proximalRadiusOverCoreRx" : "appendage.freeRadiusOverAnchorRx", radial ? "appearance.bodyPalette" : "appearance.modulePalette")];
      const radius = value(contact ? "support.proximalRadiusOverCoreRx" : "appendage.freeRadiusOverAnchorRx") * L;
      const links = contact ? 2 : value("appendage.freeLinks");
      let joint, end;
      if (bilateralContact) {
        const drop = value("support.rootToEndDropOverCoreRx") * L, spread = value("support.outwardEndOffsetOverCoreRx") * L;
        joint = [station - 0.04 * L, side * (transverse + 0.6 * spread), root[2] - 0.5 * drop];
        end = [station - 0.1 * L, side * (transverse + spread), root[2] - drop];
      } else {
        const direction = radial ? rotateX(unit([0, 1, 0.35]), angle) : unit([0, side, 0.35]);
        joint = add(root, mul(direction, value("appendage.proximalOverAnchorRx") * L));
        const distalDirection = unit(add(mul(direction, Math.cos(0.35)), [Math.sin(0.35), 0, 0]));
        end = links === 1 ? joint : add(joint, mul(distalDirection, value("appendage.distalOverAnchorRx") * L));
      }
      const id = `chain-${group}-${sector}`, proximal = segment(`${id}-proximal`, role, anchor.id, root, joint, radius, contact ? 0.86 * radius : 0.55 * radius, modulePalette, trace);
      proximal.attachment = { owner: anchor.id, position: root };
      let last = proximal;
      if (links === 2) {
        const jointNode = ellipsoid(`${id}-joint`, "chain-joint", proximal.id, joint, Array(3).fill(contact ? 0.9 * radius : 0.55 * radius), modulePalette, trace);
        last = segment(`${id}-distal`, role, jointNode.id, joint, end, contact ? 0.8 * radius : 0.55 * radius, contact ? 0.68 * radius : 0.35 * radius, modulePalette, trace);
      }
      if (contact) {
        const terminalFrame = radial ? identityFrame.map((axis) => rotateX(axis, angle)) : identityFrame;
        const terminalR = [value("terminal.rxOverCoreRx") * L, 0.73 * value("terminal.rxOverCoreRx") * L, value("terminal.rzOverCoreRx") * L];
        const terminal = ellipsoid(`${id}-terminal`, "contact-terminal", last.id, add(end, localVector(terminalFrame, [-0.09 * L, 0, 0])), terminalR, modulePalette, [...trace, ...sources("terminal.rxOverCoreRx", "terminal.rzOverCoreRx")], terminalFrame);
        if (!inside(terminal, end)) throw new Error("Contact endpoint outside terminal");
        terminal.attachment = { owner: last.id, position: end };
      }
    }
  }
  if (value("modules.wingPair")) for (let sector = 0; sector < (radial ? 3 : 2); sector++) {
    const side = sector === 0 ? -1 : 1, angle = radial ? sector * 2 * Math.PI / 3 : 0, frame = radial ? identityFrame.map((axis) => rotateX(axis, angle)) : identityFrame;
    const rootLocal = [0.15 * L, (radial ? 1 : side) * radii[1] * Math.sqrt(1 - 0.15 ** 2 - 0.7 ** 2), 0.7 * radii[2]], root = radial ? rotateX(rootLocal, angle) : rootLocal;
    const span = value("wing.outwardSpanOverCoreRx") * L, chord = value("wing.longitudinalChordOverCoreRx") * L, sweep = value("wing.posteriorSweepOverSpan") * span;
    const trace = [...primarySources, ...sources("modules.wingPair", "wing.outwardSpanOverCoreRx", "wing.longitudinalChordOverCoreRx", "wing.posteriorSweepOverSpan", radial ? "appearance.bodyPalette" : "appearance.modulePalette")];
    const mount = ellipsoid(`surface-${sector}-mount`, "surface-root", anchor.id, root, [0.55 * chord, 0.08 * L, 0.06 * L], modulePalette, trace, frame);
    mount.attachment = { owner: anchor.id, position: root };
    sharedWitness(anchor, mount);
    const outer = add(root, localVector(frame, [sweep, (radial ? 1 : side) * span, 0.2 * span])), surface = newNode(`surface-${sector}`, "thin-surface", mount.id, modulePalette, trace, frame);
    const corners = [add(root, localVector(frame, [-0.5 * chord, 0, 0])), add(root, localVector(frame, [0.5 * chord, 0, 0])), add(outer, localVector(frame, [0.3 * chord, 0, 0])), add(outer, localVector(frame, [-0.3 * chord, 0, 0]))], thickness = 0.015 * L;
    for (const direction of [-1, 1]) polygon(surface, (direction === 1 ? corners : corners.toReversed()).map((point) => add(point, mul(frame[2], direction * thickness / 2))), direction === 1 ? [0, 0, 1, 1] : [1, 1, 0, 0]);
    for (let index = 0; index < 4; index++) {
      const next = (index + 1) % 4;
      polygon(surface, [add(corners[index], mul(frame[2], -thickness / 2)), add(corners[next], mul(frame[2], -thickness / 2)), add(corners[next], mul(frame[2], thickness / 2)), add(corners[index], mul(frame[2], thickness / 2))], [index < 2 ? 0 : 1, next < 2 ? 0 : 1, next < 2 ? 0 : 1, index < 2 ? 0 : 1]);
    }
    surface.attachment = { owner: mount.id, position: root, rootEdge: corners.slice(0, 2) };
    surface.corners = corners;
    surface.thickness = thickness;
  }
  const primaryCount = nodes.filter((node) => node.role === "primary-region").length;
  if (primaryCount > COMPOSITIONAL_CONTENT.bounds.primaryRegions || nodes.length > COMPOSITIONAL_CONTENT.bounds.graphNodes || edges.length > COMPOSITIONAL_CONTENT.bounds.graphEdges || nodes.reduce((sum, node) => sum + node.mesh.vertices.length, 0) > COMPOSITIONAL_CONTENT.bounds.meshVertices) throw new Error("Compositional graph/mesh bound exceeded");
  return { status: "constructed", profileVersion, baseline: COMPOSITIONAL_CONTENT.baseline, nodes, edges, conventions: { primaryCount, primarySymmetry: radial ? "radial" : "bilateral", wholeAssemblySymmetry: radial && value("modules.typedHead") ? "radial primary assembly with bilateral local head module" : radial ? "radial" : "bilateral", layout: value("organization.layout"), depth, groundPlane: "none; contact chains retain only their local contact convention" } };
}
function constructCompositionalSource(values, facts) {
  // This entry point permanently retains the original saved-record recipe.
  return buildCompositionalSource(values, facts, LEGACY_COMPOSITIONAL_PROFILE);
}
function constructCompositionalSourceWithMeshContacts(values, facts) {
  return buildCompositionalSource(values, facts, MESH_CONTACT_PROFILE);
}
export {
  constructCompositionalSource,
  constructCompositionalSourceWithMeshContacts,
  LEGACY_COMPOSITIONAL_PROFILE,
  MESH_CONTACT_PROFILE,
  localPoint,
  localVector,
  worldPoint
};
