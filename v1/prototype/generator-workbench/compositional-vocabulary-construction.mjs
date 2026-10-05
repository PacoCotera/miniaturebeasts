// Root solving uses the actual convex facets for every owner, including new
// ring profiles. An ellipsoid equation does not describe those envelopes.
import { COMPOSITIONAL_CONTENT } from "./compositional-source-package.mjs";
import { VOCABULARY_CONTENT, VOCABULARY_PROFILE } from "./compositional-vocabulary-package.mjs";
import { add, sub, mul, dot, cross, unit } from "./anatomical-source-construction.mjs";
const identityFrame = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const localVector = (frame, vector) => vector.reduce(
  (sum, coordinate, index) => add(sum, mul(frame[index], coordinate)),
  [0, 0, 0]
);
const worldPoint = (owner, point) => add(owner.center, localVector(owner.frame, point));
const localPoint = (owner, point) => owner.frame.map((axis) => dot(sub(point, owner.center), axis));
function frameAlong(direction) {
  const longitudinal = unit(direction);
  const transverse = unit(cross(Math.abs(longitudinal[2]) < 0.9 ? [0, 0, 1] : [0, 1, 0], longitudinal));
  return [longitudinal, transverse, cross(longitudinal, transverse)];
}
const rotateX = (point, angle) => [point[0], point[1] * Math.cos(angle) - point[2] * Math.sin(angle), point[1] * Math.sin(angle) + point[2] * Math.cos(angle)];
const MESH_CONTACT_PROFILE = VOCABULARY_PROFILE;
const FUR_DEPICTION_PROFILE = "compositional-source/4";
function meshEnvelope(owner) {
  const planes = owner.mesh.faces.map((face, facetIndex) => {
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
    return { normal, offset, facetIndex };
  });
  const contains = (point) => planes.every((plane) => dot(plane.normal, sub(point, owner.center)) <= plane.offset + 1e-9);
  return {
    contains,
    rayHit(origin, direction) {
      if (!contains(origin)) throw new Error(`Root ray starts outside ${owner.id}`);
      let hit = null;
      for (const plane of planes) {
        const denominator = dot(plane.normal, direction);
        if (denominator <= 1e-10) continue;
        const distance = (plane.offset - dot(plane.normal, sub(origin, owner.center))) / denominator;
        if (distance <= 1e-10) continue;
        if (!hit || distance < hit.distance - 1e-10) {
          hit = { distance, facetIndex: plane.facetIndex, normal: plane.normal, position: add(origin, mul(
            direction,
            distance
          )) };
        }
      }
      if (!hit || !contains(hit.position)) throw new Error(`No valid facet root on ${owner.id}`);
      return hit;
    }
  };
}
function meshContactGeometry(owner, direction) {
  const envelope = meshEnvelope(owner);
  const hit = envelope.rayHit(owner.center, direction);
  return { surfaceRoot: hit.position, distance: hit.distance, contains: envelope.contains };
}
function buildCompositionalSource(values, facts, profileVersion) {
  const nodes = [], edges = [];
  const value = (target) => values[target];
  const sources = (...targets) => facts.filter((fact) => fact.state === "expressed" && targets.includes(fact.target)).map((fact) => fact.locusId);
  const anchorHalfLength = value("core.rx"), radial = value("organization.symmetry") === "radial";
  const radii = [anchorHalfLength, (radial ? value("region.radialCrossRadiusOverAnchorRx") : value("core.ryOverRx")) * anchorHalfLength, (radial ? value("region.radialCrossRadiusOverAnchorRx") : value("core.rzOverRx")) * anchorHalfLength];
  const bodyPalette = value("appearance.bodyPalette"), modulePalette = radial ? bodyPalette : value("appearance.modulePalette");
  const primarySources = sources(
    "core.rx",
    radial ? "region.radialCrossRadiusOverAnchorRx" : "core.ryOverRx",
    ...radial ? [] : ["core.rzOverRx", "region.crossExponent"],
    "region.longitudinalForm",
    "organization.symmetry",
    "organization.depth",
    "appearance.bodyPalette"
  );
  function newNode(id, roleName, parent, palette, trace, frame = identityFrame) {
    const node = { id, role: roleName, parent, palette, sources: [...new Set(trace)], frame, atlas: { kind: "local-longitudinal", minimum: 0, maximum: 1 }, mesh: { vertices: [], faces: [] } };
    nodes.push(node);
    if (parent) edges.push({ from: parent, to: id, role: "owned-attachment" });
    return node;
  }
  function polygon(owner, points, u) {
    if (points.some((point) => point.some((coordinate) => !Number.isFinite(coordinate) || Math.abs(coordinate) >= VOCABULARY_CONTENT.limits.absoluteCoordinate))) throw new Error("Invalid compositional surface coordinates");
    if (Math.hypot(...cross(sub(points[1], points[0]), sub(points[2], points[0]))) < 1e-12) return;
    const vertices = points.map((point) => {
      const existing = owner.mesh.vertices.findIndex((vertex) => vertex.every((coordinate, index) => Math.abs(
        coordinate - point[index]
      ) < 1e-10));
      if (existing >= 0) return existing;
      owner.mesh.vertices.push(point);
      return owner.mesh.vertices.length - 1;
    });
    owner.mesh.faces.push({ vertices, u });
  }
  function ellipsoid(id, roleName, parent, center, dimensions, palette, trace, frame = identityFrame, atlasAxis = 0) {
    if (dimensions.some((radius) => !Number.isFinite(radius) || radius <= 0)) throw new Error(`Invalid ${id} radii`);
    const owner = newNode(id, roleName, parent, palette, trace, frame);
    owner.center = center;
    owner.radii = dimensions;
    owner.atlas.axis = atlasAxis;
    const point = (latitude, longitude) => worldPoint(owner, [dimensions[0] * Math.sin(latitude * Math.PI / 6) * Math.cos(longitude * Math.PI / 6), dimensions[1] * Math.sin(latitude * Math.PI / 6) * Math.sin(longitude * Math.PI / 6), dimensions[2] * Math.cos(latitude * Math.PI / 6)]);
    for (let latitude = 0; latitude < 6; latitude++) for (let longitude = 0; longitude < 12; longitude++) {
      const points = latitude === 0 ? [point(0, 0), point(1, longitude), point(1, longitude + 1)] : latitude === 5 ? [point(5, longitude), point(6, 0), point(5, longitude + 1)] : [point(latitude, longitude), point(latitude + 1, longitude), point(latitude + 1, longitude + 1), point(latitude, longitude + 1)];
      polygon(owner, points, points.map((p) => (localPoint(owner, p)[atlasAxis] / dimensions[atlasAxis] + 1) / 2));
    }
    return owner;
  }
  function segment(id, roleName, parent, start, end, radius, tip, palette, trace) {
    const frame = frameAlong(sub(end, start)), owner = newNode(id, roleName, parent, palette, trace, frame);
    owner.root = start;
    owner.end = end;
    owner.center = mul(add(start, end), 0.5);
    owner.length = Math.hypot(...sub(end, start));
    owner.sectionRadii = [radius, tip];
    owner.atlas.kind = "root-to-tip";
    const ring = (center, ringRadius, index) => add(center, localVector(frame, [0, ringRadius * Math.cos(index * Math.PI / 4), ringRadius * Math.sin(index * Math.PI / 4)]));
    for (let index = 0; index < 8; index++) polygon(owner, [ring(start, radius, index), ring(start, radius, index + 1), ring(end, tip, index + 1), ring(end, tip, index)], [0, 0, 1, 1]);
    polygon(owner, Array.from({ length: 8 }, (_, index) => ring(start, radius, 7 - index)), Array(8).fill(0));
    polygon(owner, Array.from({ length: 8 }, (_, index) => ring(end, tip, index)), Array(8).fill(1));
    return owner;
  }
  function ringSolid(id, role2, parent, center, dimensions, palette, trace, frame, longitudinalForm, crossExponent) {
    if (dimensions.some((radius) => !Number.isFinite(radius) || radius <= 0)) throw new Error(`Invalid ${id} envelope`);
    if (![2, 3, 4].includes(crossExponent)) throw new Error(`Unsupported cross exponent on ${id}`);
    const taperedMaximumAt = (0.78 - Math.sqrt(0.78 ** 2 + 8 * 0.22 ** 2)) / (4 * 0.22);
    const taperWeight = (t) => Math.sqrt(Math.max(0, 1 - t * t)) * (0.78 - 0.22 * t);
    const maximumTaperWeight = taperWeight(taperedMaximumAt);
    const weight = (t) => {
      if (longitudinalForm === "ovoid") return Math.sqrt(Math.max(0, 1 - t * t));
      if (longitudinalForm === "barrel") return Math.abs(t) <= 0.55 ? 1 : Math.sqrt(Math.max(0, 1 - ((Math.abs(
        t
      ) - 0.55) / 0.45) ** 2));
      if (longitudinalForm === "tapered") return taperWeight(t) / maximumTaperWeight;
      if (longitudinalForm === "blunt-pad") return Math.max(0, 1 - t ** 4) ** 0.25;
      throw new Error(`Unsupported longitudinal form ${longitudinalForm}`);
    };
    const stations = [...VOCABULARY_CONTENT.conventions.primaryStations];
    if (longitudinalForm === "tapered") stations.push(taperedMaximumAt);
    stations.sort((a, b) => a - b);
    const owner = newNode(id, role2, parent, palette, trace, frame);
    owner.center = center;
    owner.radii = dimensions;
    owner.atlas.axis = 0;
    owner.shape = { longitudinalForm, crossExponent, stations, envelope: [...dimensions] };
    const point = (t, index) => {
      const sector = index % 12;
      const angle = sector * 2 * Math.PI / 12;
      // Fractional powers magnify sin(pi)'s tiny numerical residue. Retain
      // exact cardinal zeroes and the identical closing ring vertex instead.
      const cosine = sector === 3 || sector === 9 ? 0 : Math.cos(angle);
      const sine = sector === 0 || sector === 6 ? 0 : Math.sin(angle);
      const signedPower = (coordinate) => Math.sign(coordinate) * Math.abs(coordinate) ** (2 / crossExponent);
      return worldPoint(owner, [t * dimensions[0], dimensions[1] * weight(t) * signedPower(cosine), dimensions[2] * weight(t) * signedPower(sine)]);
    };
    for (let station = 0; station < stations.length - 1; station++) {
      const lower = stations[station], upper = stations[station + 1];
      for (let sector = 0; sector < 12; sector++) {
        const points = lower === -1 ? [point(lower, 0), point(upper, sector + 1), point(upper, sector)] : upper === 1 ? [point(lower, sector), point(lower, sector + 1), point(upper, 0)] : [point(lower, sector), point(
          lower,
          sector + 1
        ), point(upper, sector + 1), point(upper, sector)];
        polygon(owner, points, points.map((position) => (localPoint(owner, position)[0] / dimensions[0] + 1) / 2));
      }
    }
    meshEnvelope(owner);
    return owner;
  }
  function primaryRegion(id, parent, center, dimensions, trace, frame) {
    return ringSolid(id, "primary-region", parent, center, dimensions, bodyPalette, trace, frame, value("region.longitudinalForm"), radial ? 2 : value("region.crossExponent"));
  }
  function moveOwner(owner, nextCenter) {
    const difference = sub(nextCenter, owner.center);
    owner.mesh.vertices = owner.mesh.vertices.map((point) => add(point, difference));
    owner.center = nextCenter;
  }
  function sharedWitness(parent, child) {
    const difference = sub(child.center, parent.center), distance = Math.hypot(...difference), direction = unit(
      difference
    );
    const lower = Math.max(0, distance - meshContactGeometry(child, mul(direction, -1)).distance), upper = Math.min(distance, meshContactGeometry(parent, direction).distance);
    if (lower > upper + 1e-9) throw new Error(`Disconnected volume ${child.id}`);
    const witness = add(parent.center, mul(direction, (lower + upper) / 2));
    if (!meshEnvelope(parent).contains(witness) || !meshEnvelope(child).contains(witness)) throw new Error(`Invalid shared witness ${child.id}`);
    child.connectionWitness = witness;
  }
  function connect(parent, child, trace) {
    if (value("organization.join") === "broad") {
      sharedWitness(parent, child);
      return;
    }
    const direction = unit(sub(child.center, parent.center)), penetration = 0.05 * Math.min(anchorHalfLength, child.radii[0]);
    const start = add(parent.center, mul(direction, meshContactGeometry(parent, direction).distance - penetration));
    const end = sub(child.center, mul(direction, meshContactGeometry(child, mul(direction, -1)).distance - penetration));
    if (!meshEnvelope(parent).contains(start) || !meshEnvelope(child).contains(end)) throw new Error("Disconnected narrow roots");
    const radius = value("region.connectorRadiusRatio") * Math.min(
      parent.radii[1],
      parent.radii[2],
      child.radii[1],
      child.radii[2]
    );
    let realizedStart = start;
    let realizedEnd = end;
    let meshContact = null;
    if ([MESH_CONTACT_PROFILE, FUR_DEPICTION_PROFILE].includes(profileVersion)) {
      const parentContact = meshContactGeometry(parent, direction);
      const childContact = meshContactGeometry(child, mul(direction, -1));
      if (penetration >= Math.min(parentContact.distance, childContact.distance)) throw new Error("Narrow contact penetration exceeds owner interior");
      realizedStart = sub(parentContact.surfaceRoot, mul(direction, penetration));
      realizedEnd = add(childContact.surfaceRoot, mul(direction, penetration));
      if (!parentContact.contains(realizedStart) || !childContact.contains(realizedEnd)) throw new Error("Connector cap center is outside actual owner mesh");
      const witnessRadius = Math.min(radius, penetration) * 0.01;
      const connectorFrame = frameAlong(direction);
      const capInteriorWitnesses = [realizedStart, realizedEnd].map((center) => ({
        center,
        radius: witnessRadius,
        points: [center, ...connectorFrame.slice(1).flatMap((axis) => [add(center, mul(axis, witnessRadius)), sub(
          center,
          mul(axis, witnessRadius)
        )])]
      }));
      if (!capInteriorWitnesses[0].points.every(parentContact.contains) || !capInteriorWitnesses[1].points.every(
        childContact.contains
      )) throw new Error("Connector cap lacks a shared mesh interior");
      meshContact = {
        profileVersion: "faceted-volume-contact/1",
        penetration,
        meshSurfaceRoots: [parentContact.surfaceRoot, childContact.surfaceRoot],
        capInteriorWitnesses
      };
    }
    const connector = segment(
      `${child.id}-join`,
      "region-connector",
      parent.id,
      realizedStart,
      realizedEnd,
      radius,
      radius,
      bodyPalette,
      [...trace, ...sources("region.connectorRadiusRatio")]
    );
    connector.attachments = [{ owner: parent.id, position: realizedStart }, { owner: child.id, position: realizedEnd }];
    if (meshContact) connector.meshContact = meshContact;
    edges.push({ from: connector.id, to: child.id, role: "true-surface-root" });
  }
  const anchor = primaryRegion("region-root", null, [0, 0, 0], radii, primarySources, identityFrame);
  const depth = value("organization.depth"), fan = value("organization.layout") === "fan", armCount = fan ? radial ? 3 : 2 : 1;
  for (let arm = 0; arm < armCount; arm++) {
    let parent = anchor;
    for (let level = 1; level < depth; level++) {
      const direction = fan ? radial ? [0, Math.cos(arm * 2 * Math.PI / 3), Math.sin(arm * 2 * Math.PI / 3)] : [Math.cos(value("region.branchAngleRadians")), (arm === 0 ? -1 : 1) * Math.sin(value("region.branchAngleRadians")), 0] : radial ? [1, 0, 0] : [Math.cos(level * value("region.bendRadians")), 0, Math.sin(level * value(
        "region.bendRadians"
      ))];
      const frame = fan && radial ? frameAlong([0, 1, 0]).map((axis) => rotateX(axis, arm * 2 * Math.PI / 3)) : frameAlong(direction);
      const childRadii = radii.map((radius) => radius * value("region.childScale") ** level);
      const trace = [...primarySources, ...sources("organization.depth", "organization.layout", "organization.join", "region.childScale", fan && !radial ? "region.branchAngleRadians" : "region.bendRadians")];
      const child = primaryRegion(`region-${arm}-${level}`, parent.id, [0, 0, 0], childRadii, trace, frame);
      const parentExtent = meshContactGeometry(parent, direction).distance;
      const childExtent = meshContactGeometry(child, mul(direction, -1)).distance;
      const distance = parentExtent + childExtent + (value("organization.join") === "broad" ? -0.2 : 0.2) * Math.min(parentExtent, childExtent);
      moveOwner(child, add(parent.center, mul(direction, distance)));
      connect(parent, child, trace);
      parent = child;
    }
  }
  if (value("modules.typedHead")) {
    const headRadii = [
      value("head.rxOverCoreRx") * anchorHalfLength,
      value("head.ryOverCoreRx") * anchorHalfLength,
      value("head.rzOverCoreRx") * anchorHalfLength
    ];
    let headCenter = [-anchorHalfLength - 0.8 * headRadii[0], 0, value("head.centerLiftOverCoreRx") * anchorHalfLength];
    const seedCenter = [...headCenter];
    const trace = [...primarySources, ...sources(
      "modules.typedHead",
      "head.rxOverCoreRx",
      "head.ryOverCoreRx",
      "head.rzOverCoreRx",
      "head.centerLiftOverCoreRx",
      "organization.join"
    )];
    const head = ellipsoid("optional-head", "typed-head", anchor.id, [0, 0, 0], headRadii, bodyPalette, trace);
    const headDirection = unit(headCenter);
    const parentExtent = meshContactGeometry(anchor, headDirection).distance;
    const headExtent = meshContactGeometry(head, mul(headDirection, -1)).distance;
    headCenter = mul(headDirection, parentExtent + headExtent + (value("organization.join") === "broad" ? -0.2 : 0.2) * Math.min(parentExtent, headExtent));
    moveOwner(head, headCenter);
    head.placement = {
      convention: "inherited lift seeds direction; actual facet extents determine separation",
      seedCenter,
      direction: headDirection,
      parentExtent,
      headExtent,
      finalCenter: [...headCenter]
    };
    connect(anchor, head, trace);
    if (value("modules.muzzleAndJaw")) {
      const muzzleR = [
        value("muzzle.rxOverHeadRx") * headRadii[0],
        value("muzzle.ryOverHeadRy") * headRadii[1],
        0.45 * headRadii[2]
      ], center = add(headCenter, [
        -headRadii[0] + 0.15 * headRadii[0] - 0.5 * muzzleR[0],
        0,
        -0.38 * headRadii[2]
      ]);
      const cause = [...trace, ...sources("modules.muzzleAndJaw", "muzzle.rxOverHeadRx", "muzzle.ryOverHeadRy")];
      const muzzle = ellipsoid("optional-muzzle", "muzzle", head.id, center, muzzleR, bodyPalette, cause);
      sharedWitness(head, muzzle);
      const jaw = ellipsoid("optional-jaw", "lower-jaw", muzzle.id, add(center, [0.07 * headRadii[0], 0, -0.3 * headRadii[2]]), [0.88 * muzzleR[0], 0.89 * muzzleR[1], 0.28 * headRadii[2]], bodyPalette, cause);
      sharedWitness(muzzle, jaw);
    }
    if (value("modules.exteriorEyePair")) for (const side of [-1, 1]) {
      const y = side * value("eye.anchorYOverHeadRy") * headRadii[1], z = 0.2 * headRadii[2], radius = value("eye.radiusOverHeadMinYZ") * Math.min(headRadii[1], headRadii[2]);
      if (Math.abs(y) + 0.82 * radius > headRadii[1] || Math.abs(z) + radius > headRadii[2]) throw new Error("Ocular mount cannot fit inherited head frame");
      const root = add(headCenter, [-headRadii[0] * Math.sqrt(1 - (y / headRadii[1]) ** 2 - (z / headRadii[2]) ** 2), y, z]);
      const cause = [...trace, ...sources("modules.exteriorEyePair", "eye.anchorYOverHeadRy", "eye.radiusOverHeadMinYZ")];
      const rim = ellipsoid(`eye-${side}-rim`, "ocular-rim", head.id, add(root, [-0.04 * radius, 0, 0]), [0.24 * radius, 0.82 * radius, radius], [COMPOSITIONAL_CONTENT.surfaces.fixedEyes.rim], cause);
      rim.attachment = { owner: head.id, position: root };
      sharedWitness(head, rim);
      const pupil = ellipsoid(`eye-${side}-pupil`, "ocular-pupil", rim.id, add(root, [-0.25 * radius, 0, 0]), [
        0.12 * radius,
        0.44 * radius,
        0.57 * radius
      ], [COMPOSITIONAL_CONTENT.surfaces.fixedEyes.pupil], cause);
      sharedWitness(rim, pupil);
    }
    if (value("modules.crownPair")) for (const side of [-1, 1]) {
      const root = add(headCenter, [0.06 * headRadii[0], side * 0.67 * headRadii[1], headRadii[2] * Math.sqrt(
        1 - 0.06 ** 2 - 0.67 ** 2
      )]), height = value("crown.heightOverHeadRz") * headRadii[2], radius = 0.36 * Math.min(headRadii[1], headRadii[2]);
      const cause = [...trace, ...sources("modules.crownPair", "crown.form", "crown.heightOverHeadRz")];
      if (value("crown.form") === "rounded") {
        const crown = ellipsoid(`crown-${side}`, "crown", head.id, add(root, [0, 0, 0.4 * height]), [
          radius,
          radius,
          0.6 * height
        ], bodyPalette, cause, identityFrame, 2);
        crown.attachment = { owner: head.id, position: root };
        sharedWitness(head, crown);
      } else {
        const crown = newNode(`crown-${side}`, "crown", head.id, bodyPalette, cause);
        crown.attachment = { owner: head.id, position: root };
        const base = Array.from({ length: 6 }, (_, i) => add(root, [radius * Math.cos(i * Math.PI / 3), radius * Math.sin(i * Math.PI / 3), -0.08 * height]));
        for (let i = 0; i < 6; i++) polygon(crown, [base[i], base[(i + 1) % 6], add(root, [0, 0, height])], [
          0,
          0,
          1
        ]);
        polygon(crown, base.toReversed(), Array(6).fill(0));
      }
    }
  }
  const role = value("appendage.role"), bilateralContact = role === "contact-chain" && !radial;
  const groupCount = role === "none" ? 0 : bilateralContact ? value("support.pairCount") : value("appendage.groups");
  for (let group = 0; group < groupCount; group++) {
    const station = bilateralContact ? (groupCount === 2 ? [-0.65, 0.65] : [-0.65, 0, 0.65])[group] * anchorHalfLength : groupCount === 1 ? 0 : (-0.5 + group / (groupCount - 1)) * anchorHalfLength;
    for (let sector = 0; sector < (radial ? 3 : 2); sector++) {
      const side = sector === 0 ? -1 : 1, angle = radial ? sector * 2 * Math.PI / 3 : 0;
      const contact = role === "contact-chain", localRootZ = bilateralContact ? 0.1 * radii[2] : 0;
      const rootRay = radial ? rotateX([0, 1, 0], angle) : [0, side, 0];
      const root = meshEnvelope(anchor).rayHit([station, 0, localRootZ], rootRay).position;
      const transverse = Math.hypot(root[1], radial ? root[2] : 0);
      const trace = [...primarySources, ...sources("appendage.role", bilateralContact ? "support.pairCount" : "appendage.groups", ...bilateralContact ? ["support.rootToEndDropOverCoreRx", "support.outwardEndOffsetOverCoreRx"] : ["appendage.proximalOverAnchorRx", "appendage.distalOverAnchorRx", "appendage.freeLinks"], contact ? "support.proximalRadiusOverCoreRx" : "appendage.freeRadiusOverAnchorRx", radial ? "appearance.bodyPalette" : "appearance.modulePalette")];
      const radius = value(contact ? "support.proximalRadiusOverCoreRx" : "appendage.freeRadiusOverAnchorRx") * anchorHalfLength;
      const links = contact ? 2 : value("appendage.freeLinks");
      let joint, end;
      if (bilateralContact) {
        const drop = value("support.rootToEndDropOverCoreRx") * anchorHalfLength, spread = value("support.outwardEndOffsetOverCoreRx") * anchorHalfLength;
        joint = [station - 0.04 * anchorHalfLength, side * (transverse + 0.6 * spread), root[2] - 0.5 * drop];
        end = [station - 0.1 * anchorHalfLength, side * (transverse + spread), root[2] - drop];
      } else {
        const direction = radial ? rotateX(unit([0, 1, 0.35]), angle) : unit([0, side, 0.35]);
        joint = add(root, mul(direction, value("appendage.proximalOverAnchorRx") * anchorHalfLength));
        const distalDirection = unit(add(mul(direction, Math.cos(0.35)), [Math.sin(0.35), 0, 0]));
        end = links === 1 ? joint : add(joint, mul(distalDirection, value("appendage.distalOverAnchorRx") * anchorHalfLength));
      }
      const id = `chain-${group}-${sector}`, proximal = segment(
        `${id}-proximal`,
        role,
        anchor.id,
        root,
        joint,
        radius,
        contact ? 0.86 * radius : 0.55 * radius,
        modulePalette,
        trace
      );
      proximal.attachment = { owner: anchor.id, position: root };
      let last = proximal;
      if (links === 2) {
        const jointNode = ellipsoid(`${id}-joint`, "chain-joint", proximal.id, joint, Array(3).fill(contact ? 0.9 * radius : 0.55 * radius), modulePalette, trace);
        last = segment(
          `${id}-distal`,
          role,
          jointNode.id,
          joint,
          end,
          contact ? 0.8 * radius : 0.55 * radius,
          contact ? 0.68 * radius : 0.35 * radius,
          modulePalette,
          trace
        );
      }
      if (contact) {
        const terminalFrame = radial ? identityFrame.map((axis) => rotateX(axis, angle)) : identityFrame;
        const terminalRadii = [value("terminal.rxOverCoreRx") * anchorHalfLength, 0.73 * value("terminal.rxOverCoreRx") * anchorHalfLength, value("terminal.rzOverCoreRx") * anchorHalfLength];
        const terminalCenter = add(end, localVector(terminalFrame, [-0.2 * terminalRadii[0], 0, 0]));
        const terminalTrace = [...trace, ...sources("terminal.rxOverCoreRx", "terminal.rzOverCoreRx", "terminal.form")];
        const form = value("terminal.form");
        let terminal;
        if (form === "rounded") {
          terminal = ellipsoid(
            `${id}-terminal`,
            "contact-terminal",
            last.id,
            terminalCenter,
            terminalRadii,
            modulePalette,
            terminalTrace,
            terminalFrame
          );
        } else if (form === "pad") {
          terminal = ringSolid(
            `${id}-terminal`,
            "contact-terminal",
            last.id,
            terminalCenter,
            [
              terminalRadii[0],
              1.15 * terminalRadii[1],
              terminalRadii[2]
            ],
            modulePalette,
            terminalTrace,
            terminalFrame,
            "blunt-pad",
            4
          );
        } else if (form === "wedge") {
          terminal = newNode(`${id}-terminal`, "contact-terminal", last.id, modulePalette, terminalTrace, terminalFrame);
          terminal.center = terminalCenter;
          terminal.radii = terminalRadii;
          const corners = [-1, 1].flatMap((longitudinal) => [-1, 1].flatMap((y) => [-1, 1].map((z) => worldPoint(
            terminal,
            [longitudinal * terminalRadii[0], y * terminalRadii[1] * (longitudinal === 1 ? 0.6 : 1), z * terminalRadii[2] * (longitudinal === 1 ? 0.3 : 1)]
          ))));
          for (const indices of [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [
            1,
            5,
            7,
            3
          ]]) {
            polygon(terminal, indices.map((index) => corners[index]), indices.map((index) => index < 4 ? 0 : 1));
          }
        } else throw new Error(`Unsupported terminal form ${form}`);
        const terminalEnvelope = meshEnvelope(terminal);
        if (!terminalEnvelope.contains(end)) throw new Error("Contact endpoint outside actual terminal");
        const witnessRadius = Math.min(...terminal.radii, last.sectionRadii[1]) * 0.01;
        const witnesses = [end, ...last.frame.slice(1).flatMap((axis) => [add(end, mul(axis, witnessRadius)), sub(
          end,
          mul(axis, witnessRadius)
        )])];
        if (!witnesses.every(terminalEnvelope.contains)) throw new Error("Terminal lacks positive interior contact");
        terminal.terminalForm = { kind: form, inheritedRx: terminalRadii[0], inheritedRz: terminalRadii[2], derivedRy: terminal.radii[1], centerOffsetOverRx: -0.2, capInteriorWitness: { center: end, radius: witnessRadius, points: witnesses } };
        terminal.attachment = { owner: last.id, position: end };
      }
    }
  }
  if (value("modules.wingPair")) for (let sector = 0; sector < (radial ? 3 : 2); sector++) {
    const side = sector === 0 ? -1 : 1, angle = radial ? sector * 2 * Math.PI / 3 : 0, frame = radial ? identityFrame.map((axis) => rotateX(axis, angle)) : identityFrame;
    const rayOrigin = radial ? rotateX([0.15 * anchorHalfLength, 0, 0.7 * radii[2]], angle) : [
      0.15 * anchorHalfLength,
      0,
      0.7 * radii[2]
    ];
    const rayDirection = radial ? rotateX([0, 1, 0], angle) : [0, side, 0];
    const root = meshEnvelope(anchor).rayHit(rayOrigin, rayDirection).position;
    const span = value("wing.outwardSpanOverCoreRx") * anchorHalfLength, chord = value("wing.longitudinalChordOverCoreRx") * anchorHalfLength, sweep = value("wing.posteriorSweepOverSpan") * span;
    const trace = [...primarySources, ...sources("modules.wingPair", "wing.outwardSpanOverCoreRx", "wing.longitudinalChordOverCoreRx", "wing.posteriorSweepOverSpan", radial ? "appearance.bodyPalette" : "appearance.modulePalette")];
    const mount = ellipsoid(`surface-${sector}-mount`, "surface-root", anchor.id, root, [
      0.55 * chord,
      0.08 * anchorHalfLength,
      0.06 * anchorHalfLength
    ], modulePalette, trace, frame);
    mount.attachment = { owner: anchor.id, position: root };
    sharedWitness(anchor, mount);
    const outer = add(root, localVector(frame, [sweep, (radial ? 1 : side) * span, 0.2 * span])), surface = newNode(
      `surface-${sector}`,
      "thin-surface",
      mount.id,
      modulePalette,
      trace,
      frame
    );
    const corners = [add(root, localVector(frame, [-0.5 * chord, 0, 0])), add(root, localVector(frame, [
      0.5 * chord,
      0,
      0
    ])), add(outer, localVector(frame, [0.3 * chord, 0, 0])), add(outer, localVector(frame, [
      -0.3 * chord,
      0,
      0
    ]))], thickness = 0.015 * anchorHalfLength;
    for (const direction of [-1, 1]) polygon(surface, (direction === 1 ? corners : corners.toReversed()).map((point) => add(
      point,
      mul(frame[2], direction * thickness / 2)
    )), direction === 1 ? [0, 0, 1, 1] : [1, 1, 0, 0]);
    for (let index = 0; index < 4; index++) {
      const next = (index + 1) % 4;
      polygon(
        surface,
        [add(corners[index], mul(frame[2], -thickness / 2)), add(corners[next], mul(frame[2], -thickness / 2)), add(corners[next], mul(frame[2], thickness / 2)), add(corners[index], mul(frame[2], thickness / 2))],
        [index < 2 ? 0 : 1, next < 2 ? 0 : 1, next < 2 ? 0 : 1, index < 2 ? 0 : 1]
      );
    }
    surface.attachment = { owner: mount.id, position: root, rootEdge: corners.slice(0, 2) };
    surface.corners = corners;
    surface.thickness = thickness;
  }
  const primaryCount = nodes.filter((node) => node.role === "primary-region").length;
  if (primaryCount > VOCABULARY_CONTENT.limits.primaryRegions || nodes.length > VOCABULARY_CONTENT.limits.graphNodes || edges.length > VOCABULARY_CONTENT.limits.graphEdges || nodes.reduce((sum, node) => sum + node.mesh.vertices.length, 0) > VOCABULARY_CONTENT.limits.meshVertices) throw new Error("Compositional graph/mesh bound exceeded");
  return { status: "constructed", profileVersion, baseline: VOCABULARY_CONTENT.baseline, nodes, edges, conventions: {
    primaryCount,
    primarySymmetry: radial ? "radial" : "bilateral",
    wholeAssemblySymmetry: radial && value("modules.typedHead") ? "radial primary assembly with bilateral local head module" : radial ? "radial" : "bilateral",
    layout: value("organization.layout"),
    depth,
    groundPlane: "none; contact chains retain only their local contact convention"
  } };
}
function constructCompositionalVocabulary(values, facts, profileVersion = VOCABULARY_PROFILE) {
  if (![VOCABULARY_PROFILE, FUR_DEPICTION_PROFILE].includes(profileVersion)) {
    throw new Error("Unsupported vocabulary construction profile");
  }
  return buildCompositionalSource(values, facts, profileVersion);
}
export {
  constructCompositionalVocabulary,
  FUR_DEPICTION_PROFILE,
  localPoint,
  localVector,
  meshEnvelope,
  worldPoint
};
