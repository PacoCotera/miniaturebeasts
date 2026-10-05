import { add, sub, mul, dot, cross, unit } from "./anatomical-source-construction.mjs";
import { constructCompositionalVocabulary, localVector, meshEnvelope, worldPoint } from "./compositional-vocabulary-construction.mjs";
import { ROLES_CONTENT } from "./anatomical-roles-package.mjs";
import { COAT_CONTENT } from "./coherent-coat-package.mjs";
import { MARKING_CONTENT } from "./marking-field-package.mjs";

function addFace(owner, points, coordinates, outward) {
  const normal = unit(cross(sub(points[1], points[0]), sub(points[2], points[0])));
  if (dot(normal, outward) < 0) {
    points = [...points].reverse();
    coordinates = [...coordinates].reverse();
  }
  const vertices = points.map((point) => {
    if (point.some((coordinate) => !Number.isFinite(coordinate) || Math.abs(coordinate) >= ROLES_CONTENT.limits.absoluteCoordinate)) {
      throw new Error("Anatomical role coordinate bound exceeded");
    }
    const existing = owner.mesh.vertices.findIndex((vertex) => vertex.every((coordinate, axis) => Math.abs(coordinate - point[axis]) < 1e-10));
    if (existing >= 0) return existing;
    owner.mesh.vertices.push(point);
    return owner.mesh.vertices.length - 1;
  });
  owner.mesh.faces.push({ vertices, u: coordinates, normal: unit(cross(sub(points[1], points[0]), sub(points[2], points[0]))) });
}

function contactWitness(parent, position, axes, radius, childContains, childProof) {
  const envelope = meshEnvelope(parent);
  const footprint = [position, ...axes.flatMap((axis) => [add(position, mul(axis, radius)), sub(position, mul(axis, radius))])];
  if (!footprint.every((point) => envelope.contains(point) && childContains(point))) throw new Error(`Anatomical attachment has no shared tissue interior on ${parent.id}`);
  return { position, radius, footprint, owner: parent.id, childProof, profile: "shared-tissue-interior-footprint/1" };
}

// A bowl triangle and its translated back form an exact closed triangular
// skin prism. Interior barycentric coordinates prove child tissue membership.
function skinPrism(front, extrusion) {
  const first = sub(front[1], front[0]), second = sub(front[2], front[0]);
  const determinant = dot(first, cross(second, extrusion));
  if (Math.abs(determinant) < 1e-12) throw new Error("Degenerate auricular basal skin prism");
  return (point) => {
    const displacement = sub(point, front[0]);
    const u = dot(displacement, cross(second, extrusion)) / determinant;
    const v = dot(first, cross(displacement, extrusion)) / determinant;
    const depth = dot(first, cross(second, displacement)) / determinant;
    return u > 0 && v > 0 && u + v < 1 && depth > 0 && depth < 1;
  };
}

export function constructAnatomicalRoles(values, facts, profileVersion = ROLES_CONTENT.constructionProfile) {
  if (![ROLES_CONTENT.constructionProfile, COAT_CONTENT.constructionProfile, MARKING_CONTENT.constructionProfile].includes(profileVersion)) throw new Error("Unsupported anatomical role construction profile");
  const content = profileVersion === MARKING_CONTENT.constructionProfile ? MARKING_CONTENT :
    profileVersion === COAT_CONTENT.constructionProfile ? COAT_CONTENT : ROLES_CONTENT;
  // The old primary, head, chain and sheet mathematics remains literal. Only
  // the new source selects this wrapper and its additional role operators.
  const scene = constructCompositionalVocabulary(values, facts, "compositional-source/4");
  scene.profileVersion = content.constructionProfile;
  scene.baseline = content.baseline;
  const sources = (...targets) => facts.filter((fact) => fact.state === "expressed" && targets.includes(fact.target)).map((fact) => fact.locusId);
  const head = scene.nodes.find((owner) => owner.role === "typed-head");
  if (values["ears.enabled"] && head) {
    const convention = content.conventions.ear;
    const length = values["ears.lengthOverHeadRz"] * head.radii[2];
    const width = convention.widthOverLength * length;
    const depth = convention.bowlDepthOverLength * length;
    const thickness = convention.thicknessOverLength * length;
    for (const side of [-1, 1]) {
      const direction = unit(localVector(head.frame, [0, side * convention.portDirection[1], convention.portDirection[2]]));
      const hit = meshEnvelope(head).rayHit(head.center, direction);
      const penetration = convention.rootPenetrationOverLength * length;
      const root = sub(hit.position, mul(direction, penetration));
      // Only source6 rotates the original plane: head-minus-X fronts turn
      // toward each side's outward head-Y. Ports and penetration stay exact.
      const yaw = -side * (convention.outwardFrontYawRadians ?? 0);
      const widthAxis = convention.outwardFrontYawRadians
        ? localVector(head.frame, [-Math.sin(yaw), Math.cos(yaw), 0]) : head.frame[1];
      const lengthAxis = head.frame[2];
      const frontNormal = convention.outwardFrontYawRadians
        ? localVector(head.frame, [-Math.cos(yaw), -Math.sin(yaw), 0]) : mul(head.frame[0], -1);
      const trace = [...new Set([...head.sources, ...sources("ears.enabled", "ears.form", "ears.lengthOverHeadRz")])];
      const ear = {
        id: `ear-${side}`, role: "auricular-sheet", parent: head.id, palette: [...head.palette], sources: trace,
        frame: [lengthAxis, widthAxis, frontNormal], center: add(root, mul(lengthAxis, 0.48 * length)),
        root, length, form: values["ears.form"],
        atlas: { kind: "head-owned-longitudinal-field", minimum: 0, maximum: 1 },
        mesh: { vertices: [], faces: [] }
      };
      // A narrow basal edge opens into an eight-vertex rim. The recessed
      // center and a separate back skin make a closed shallow concave bowl.
      const boundary = ear.form === "pointed"
        ? [[-0.12, 0], [-0.50, 0.38], [-0.36, 0.75], [0, 1], [0.36, 0.75], [0.50, 0.38], [0.12, 0], [0, -0.03]]
        : [[-0.12, 0], [-0.50, 0.32], [-0.48, 0.73], [-0.24, 0.96], [0.24, 0.96], [0.48, 0.73], [0.50, 0.32], [0.12, 0]];
      const front = boundary.map(([across, along]) => add(root, add(mul(widthAxis, across * width), mul(lengthAxis, along * length))));
      const back = front.map((point) => sub(point, mul(frontNormal, thickness)));
      const bowl = sub(add(root, mul(lengthAxis, 0.48 * length)), mul(frontNormal, depth));
      const backCenter = sub(bowl, mul(frontNormal, thickness));
      const pigmentU = (point) => (dot(sub(point, head.center), head.frame[0]) / head.radii[0] + 1) / 2;
      for (let index = 0; index < boundary.length; index++) {
        const next = (index + 1) % boundary.length;
        const inner = [bowl, front[index], front[next]], outer = [backCenter, back[next], back[index]];
        addFace(ear, inner, inner.map(pigmentU), frontNormal);
        addFace(ear, outer, outer.map(pigmentU), mul(frontNormal, -1));
        const rim = [front[index], back[index], back[next], front[next]];
        const outward = sub(mul(add(front[index], front[next]), 0.5), ear.center);
        addFace(ear, rim, rim.map(pigmentU), outward);
      }
      ear.attachment = {
        owner: head.id, surfaceRoot: hit.position, position: root, facetIndex: hit.facetIndex,
        normal: hit.normal, penetration, portDirection: direction,
        rootEdge: front.slice(0, 1).concat(front.slice(-1))
      };
      const basalFront = [bowl, front.at(-1), front[0]];
      const extrusion = mul(frontNormal, -thickness);
      const witnessCenter = add(add(mul(bowl, 0.02), mul(add(front.at(-1), front[0]), 0.49)), mul(extrusion, 0.5));
      ear.attachment.witness = contactWitness(head, witnessCenter, head.frame, Math.min(penetration, thickness) * 0.002,
        skinPrism(basalFront, extrusion), { kind: "closed-basal-skin-prism", front: basalFront, extrusion, strictBarycentricInterior: true });
      ear.auricular = { profile: "concave-auricular-sheet/1", side, localBilateral: true, length, width, bowlDepth: depth, thickness, innerOuterNormals: "retained per face", paletteOwner: head.id };
      if (convention.outwardFrontYawRadians) {
        ear.auricular.profile = "concave-auricular-sheet/2";
        ear.auricular.headLocalYawRadians = yaw;
      }
      scene.nodes.push(ear);
      scene.edges.push({ from: head.id, to: ear.id, role: "true-facet-root" });
    }
  }
  if (values["tail.enabled"]) {
    const primary = scene.nodes.filter((owner) => owner.role === "primary-region");
    const fan = values["organization.layout"] === "fan";
    const terminal = primary.filter((owner) => !primary.some((child) => child.parent === owner.id));
    const owner = fan ? primary.find((candidate) => candidate.id === "region-root") : terminal.length === 1 ? terminal[0] : null;
    if (!owner) throw new Error("Axial tail developmental owner is ambiguous");
    const convention = ROLES_CONTENT.conventions.tail;
    const length = values["tail.lengthOverOwnerRx"] * owner.radii[0];
    const radius = values["tail.baseRadiusOverOwnerCross"] * Math.min(owner.radii[1], owner.radii[2]);
    const bend = values["tail.bendRadians"];
    const hit = meshEnvelope(owner).rayHit(owner.center, owner.frame[0]);
    const penetration = convention.rootPenetrationOverBase * radius;
    const root = sub(hit.position, mul(owner.frame[0], penetration));
    const trace = [...new Set([...owner.sources, ...sources("tail.enabled", "tail.lengthOverOwnerRx", "tail.baseRadiusOverOwnerCross", "tail.bendRadians", "organization.layout", "organization.depth")])];
    const tail = {
      id: "axial-tail", role: "axial-tail", parent: owner.id, palette: [...owner.palette], sources: trace,
      frame: structuredClone(owner.frame), root, length, baseRadius: radius, bendRadians: bend,
      atlas: { kind: "root-to-tip", minimum: 0, maximum: 1 }, mesh: { vertices: [], faces: [] }
    };
    const stations = Array.from({ length: convention.stations }, (_, index) => {
      const u = index / (convention.stations - 1), angle = bend * u;
      const axial = Math.abs(bend) < 1e-10 ? length * u : length * Math.sin(angle) / bend;
      const lift = Math.abs(bend) < 1e-10 ? 0 : length * (1 - Math.cos(angle)) / bend;
      const center = add(root, localVector(owner.frame, [axial, 0, lift]));
      const normal = localVector(owner.frame, [-Math.sin(angle), 0, Math.cos(angle)]);
      const tangent = localVector(owner.frame, [Math.cos(angle), 0, Math.sin(angle)]);
      return { u, center, tangent, normal, radius: radius * (1 - (1 - convention.tipRadiusOverBase) * u) };
    });
    const rings = stations.map((station) => Array.from({ length: convention.ringVertices }, (_, index) => {
      const angle = index * 2 * Math.PI / convention.ringVertices;
      return add(station.center, add(mul(owner.frame[1], station.radius * Math.cos(angle)), mul(station.normal, station.radius * Math.sin(angle))));
    }));
    for (let station = 0; station < stations.length - 1; station++) {
      for (let index = 0; index < convention.ringVertices; index++) {
        const next = (index + 1) % convention.ringVertices;
        const points = [rings[station][index], rings[station][next], rings[station + 1][next], rings[station + 1][index]];
        const midpoint = mul(add(stations[station].center, stations[station + 1].center), 0.5);
        const outward = sub(mul(points.reduce(add, [0, 0, 0]), 0.25), midpoint);
        // Curved strips are triangulated, retaining a real normal per facet.
        addFace(tail, points.slice(0, 3), [stations[station].u, stations[station].u, stations[station + 1].u], outward);
        addFace(tail, [points[0], points[2], points[3]], [stations[station].u, stations[station + 1].u, stations[station + 1].u], outward);
      }
    }
    addFace(tail, [...rings[0]].reverse(), Array(8).fill(0), mul(stations[0].tangent, -1));
    addFace(tail, rings.at(-1), Array(8).fill(1), stations.at(-1).tangent);
    tail.center = mul(stations.map((station) => station.center).reduce(add, [0, 0, 0]), 1 / stations.length);
    tail.end = stations.at(-1).center;
    // A tiny3D footprint lies forward of the root cap inside both the parent
    // and the first closed sweep cell. Use actual retained side/cap planes,
    // not only radius or a point on the child's boundary.
    const firstCellPlanes = tail.mesh.faces.slice(0, 16).map((face) => ({
      normal: face.normal, position: tail.mesh.vertices[face.vertices[0]]
    }));
    firstCellPlanes.push({ normal: mul(stations[0].tangent, -1), position: stations[0].center },
      { normal: stations[1].tangent, position: stations[1].center });
    const childContains = (point) => firstCellPlanes.every((plane) => dot(plane.normal, sub(point, plane.position)) < -1e-10);
    const witnessCenter = add(root, mul(owner.frame[0], 0.1 * penetration));
    tail.attachment = { owner: owner.id, position: root, surfaceRoot: hit.position, facetIndex: hit.facetIndex, penetration,
      witness: contactWitness(owner, witnessCenter, owner.frame, penetration * 0.002, childContains,
        { kind: "closed-first-sweep-cell", planes: firstCellPlanes, strictInterior: true }) };
    tail.sweep = {
      profile: "continuous-axial-tail-sweep/1", ownerRule: convention.ownerRule,
      selectedOwner: owner.id, layout: values["organization.layout"], depth: values["organization.depth"],
      ownerFrame: structuredClone(owner.frame), ownerCenter: [...owner.center], ownerRadii: [...owner.radii],
      ownerSources: [...owner.sources], inheritedArcLength: length,
      curve: convention.curve, stations, ringVertices: convention.ringVertices,
      realizedPolylineLength: stations.slice(1).reduce((sum, station, index) => sum + Math.hypot(...sub(station.center, stations[index].center)), 0),
      rootInteriorPenetration: penetration, paletteOwner: owner.id
    };
    scene.nodes.push(tail);
    scene.edges.push({ from: owner.id, to: tail.id, role: "true-facet-root" });
    if (scene.conventions.primarySymmetry === "radial") {
      scene.conventions.wholeAssemblySymmetry = head
        ? "radial primary assembly with bilateral local head and axial tail modules"
        : "radial primary assembly with an axial tail module";
    }
  }
  if (scene.nodes.length > ROLES_CONTENT.limits.graphNodes || scene.edges.length > ROLES_CONTENT.limits.graphEdges ||
      scene.nodes.reduce((count, owner) => count + owner.mesh.vertices.length, 0) > ROLES_CONTENT.limits.meshVertices) {
    throw new Error("Anatomical role graph/mesh bound exceeded");
  }
  scene.conventions.anatomicalRoles = { profile: "ear-tail-roles/1", tailOwnerRule: ROLES_CONTENT.conventions.tail.ownerRule, hearing: "unimplemented", collisionFree: "unproven" };
  return scene;
}
