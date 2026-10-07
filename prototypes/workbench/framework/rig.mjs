// The body rig: a parametric 3D body built from a resolved individual's plan facts and values.
// Capsule, ellipsoid and ring-solid volumes, tube chains and thin sheets, as the compositional
// contract's meshes (v1/design/anatomical-source-prototype/compositional-contract.md), with the
// changes art-pipeline.md §2 asks for:
//   - limbs root on the region their station names (plans.mjs limbStations), not on region-root;
//   - a mass hierarchy (development.regional-growth) and the posterior taper scale the regions;
//   - link count, posture and ground contact come from the limb set; the body stands on a ground
//     plane in a reference pose, so every view is framed the same way;
//   - a neck (narrow join, structure.join-neck-ratio) or a fused head (broad join);
//   - radial plans are symmetric about the up axis: a dome with its face in front, rays or
//     trailing feelers round it, a cap or petals on top, fan arms in the horizontal plane
//     (v1 rotated radial frames round the length axis, which no pet reads as).
// Every part roots on its owner's actual facets (rootOn) and keeps an attachment witness inside
// both meshes (sharedWitness), as the contract requires. A guard never rejects into a narrower
// survivor set: anything the plan carries is built; what cannot be built throws, and validate.mjs
// reports it. Nothing is repaired.
import { add, sub, mul, unit, norm, dot, cross, IDENTITY, localVector, worldPoint, localPoint, frameAlong, rotateFrameZ, lerp, newNode, ringSolid, ellipsoid, segment, sheet, sweep, surfaceAlong, addFace, envelope, sharedWitness, rootOn, longitudinalWeight } from "./geometry.mjs";

const EYE_RIM = "#f1eddc", PUPIL = "#273036"; // v1 fixed inks (COMPOSITIONAL_CONTENT.surfaces.fixedEyes)

function massScales(growth, depth) {
  const table = {
    even: [1, 1, 1], central: [0.82, 1.15, 0.85], anterior: [1.18, 0.9, 0.72],
    "even-central": [0.91, 1.07, 0.93], "even-anterior": [1.09, 0.95, 0.86], "central-anterior": [1, 1.02, 0.78],
  }[growth ?? "even"];
  if (depth === 1) return [1];
  if (depth === 2) return [table[0], (table[1] + table[2]) / 2];
  return table;
}

export function buildBody(resolved) {
  const { plan, values: v } = resolved;
  const nodes = [], edges = [];
  const envelopes = new Map();
  const envOf = (node) => { if (!envelopes.has(node.id)) envelopes.set(node.id, envelope(node)); return envelopes.get(node.id); };
  // Add a node. A solid gets a shared witness with its owner; a sheet or sweep gives its inner root.
  const push = (node, owner, rootInner = null) => {
    nodes.push(node);
    if (owner) {
      node.parent = owner.id;
      edges.push({ from: owner.id, to: node.id });
      node.attachment = rootInner ? { owner: owner.id, position: rootInner, kind: "facet-root" } : { owner: owner.id, position: sharedWitness(owner, node, envOf(owner), envOf(node)), kind: "shared-witness" };
    }
    return node;
  };
  const L = v["core.rx"];
  const radial = plan.radial, depth = plan.depth;
  const bodyPalette = v["appearance.bodyPalette"], secondPalette = radial ? bodyPalette : v["appearance.modulePalette"] ?? bodyPalette;
  const form = v["region.longitudinalForm"] ?? "ovoid", crossExp = radial ? 2 : v["region.crossExponent"] ?? 2;
  const childScale = v["region.childScale"] ?? 1;
  const mass = massScales(v["development.regional-growth"], depth);
  const join = plan.join;

  // --- primary regions ---------------------------------------------------------------------
  const regions = [];
  const baseRadii = radial
    ? [L, L, 2 * (v["region.radialCrossRadiusOverAnchorRx"] ?? 0.45) * L] // a dome: round in plan, height from roundness
    : [L, (v["core.ryOverRx"] ?? 0.45) * L, (v["core.rzOverRx"] ?? 0.5) * L];
  const regionRadii = (level) => {
    const taper = depth > 1 ? lerp(1, childScale, level / (depth - 1)) : 1;
    const s = (mass[Math.min(level, mass.length - 1)] ?? 1) * (level === 0 ? 1 : taper);
    return baseRadii.map((r) => r * s);
  };
  function primary(id, center, radii, frame) {
    const node = newNode(id, "primary-region", null, "body", frame);
    node.center = center;
    if (radial) { // a ring solid along the up axis: build with the frame's third axis first
      node.frame = [frame[2], frame[0], frame[1]];
      ringSolid(node, [radii[2], radii[0], radii[1]], form, 2);
      node.frame = frame; node.radii = radii; node.up = true;
    } else ringSolid(node, radii, form, crossExp);
    node.part = id;
    return node;
  }
  const root = push(primary("region-0", [0, 0, 0], regionRadii(0), IDENTITY), null);
  regions.push(root);
  const arms = plan.fan ? (radial ? 3 : 2) : 1;
  for (let arm = 0; arm < arms; arm++) {
    let parent = root;
    for (let level = 1; level < depth; level++) {
      let direction, frame;
      if (plan.fan && radial) { const a = Math.PI / 3 + (arm * 2 * Math.PI) / 3; direction = [Math.cos(a), Math.sin(a), 0]; frame = rotateFrameZ(IDENTITY, a); }
      else if (plan.fan) { const a = (v["region.branchAngleRadians"] ?? 0.8) * (arm === 0 ? -1 : 1); direction = [Math.cos(a), Math.sin(a), 0]; frame = rotateFrameZ(IDENTITY, a); }
      else if (radial) { direction = [0, 0, 1]; frame = IDENTITY; }
      else { const b = (v["region.bendRadians"] ?? 0) * level * 0.5; direction = [Math.cos(b), 0, Math.sin(b)]; frame = frameAlong(direction); }
      const radii = regionRadii(level);
      const child = primary(`region-${plan.fan ? `${arm}-` : ""}${level}`, [0, 0, 0], radii, frame);
      child.level = level; child.arm = arm;
      const pe = extentAlong(parent, direction, envOf), ce = extentAlong(child, mul(direction, -1), envOf);
      const gap = join === "broad" ? -0.22 * Math.min(pe, ce) : 0.18 * Math.min(pe, ce);
      moveNode(child, add(parent.center, mul(direction, pe + ce + gap)));
      envelopes.delete(child.id);
      connect(parent, child, direction, join, v, push, envOf, L);
      regions.push(child);
      parent = child;
    }
  }
  const serialRegions = regions.filter((r) => !plan.fan || r === root);

  // --- head, neck, face ----------------------------------------------------------------------
  const headR = [v["head.rxOverCoreRx"] * L, v["head.ryOverCoreRx"] * L, v["head.rzOverCoreRx"] * L];
  const lift = (v["head.centerLiftOverCoreRx"] ?? 0.5) * L * (radial ? 0.3 : 1);
  const head = newNode("head", "typed-head", null, "body");
  ellipsoid(head, headR);
  head.part = "head";
  const headDir = unit([-(L + 0.8 * headR[0]), 0, lift]);
  const pe = extentAlong(root, headDir, envOf), he = extentAlong(head, mul(headDir, -1), envOf);
  const neckLength = join === "narrow" ? (0.3 + 0.5 * ((v["structure.join-neck-ratio"] ?? 0.8) - 0.65) / 0.3) * Math.min(pe, he) : -0.25 * Math.min(pe, he);
  moveNode(head, mul(headDir, pe + he + neckLength));
  envelopes.delete(head.id);
  const headCenter = head.center;
  connect(root, head, headDir, join, v, push, envOf, L, "neck");
  if (v["beak.enabled"]) {
    const len = (v["growth.beak-length-ratio"] ?? 0.8) * headR[0];
    const rt = rootOn(head, headCenter, unit([-1, 0, -0.25]), 0.12 * headR[0], envOf(head));
    const beak = newNode("beak", "beak", head.id, "second"); beak.part = "beak";
    segment(beak, rt.inner, add(rt.surface, add(mul(rt.direction, len), [0, 0, -0.1 * len])), 0.42 * Math.min(headR[1], headR[2]), 0.05 * headR[1]);
    push(beak, head, rt.witness);
  } else if (v["modules.muzzleAndJaw"]) {
    const mR = [v["muzzle.rxOverHeadRx"] * headR[0], v["muzzle.ryOverHeadRy"] * headR[1], 0.45 * headR[2]];
    const mC = add(headCenter, [-headR[0] + 0.15 * headR[0] - 0.5 * mR[0], 0, -0.38 * headR[2]]);
    const muzzle = newNode("muzzle", "muzzle", head.id, "body"); muzzle.center = mC; ellipsoid(muzzle, mR); muzzle.part = "muzzle";
    push(muzzle, head);
    const jaw = newNode("jaw", "lower-jaw", muzzle.id, "body"); jaw.center = add(mC, [0.07 * headR[0], 0, -0.3 * headR[2]]); ellipsoid(jaw, [0.88 * mR[0], 0.89 * mR[1], 0.28 * headR[2]]); jaw.part = "muzzle";
    push(jaw, muzzle);
  }
  if (v["modules.exteriorEyePair"]) for (const side of [-1, 1]) {
    const y = side * v["eye.anchorYOverHeadRy"] * headR[1], z = 0.2 * headR[2], r = v["eye.radiusOverHeadMinYZ"] * Math.min(headR[1], headR[2]);
    if (Math.abs(y) + 0.82 * r > headR[1] || Math.abs(z) + r > headR[2]) throw new Error("eye does not fit the head (eye size against head size)");
    const analytic = [-headR[0] * Math.sqrt(Math.max(0.01, 1 - (y / headR[1]) ** 2 - (z / headR[2]) ** 2)), y, z];
    const rt = rootOn(head, headCenter, analytic, 0, envOf(head)); // on the actual facet
    const rim = newNode(`eye-${side < 0 ? "L" : "R"}`, "ocular-rim", head.id, "eyeRim"); rim.center = add(rt.surface, [-0.03 * r, 0, 0]); ellipsoid(rim, [0.24 * r, 0.82 * r, r]); rim.part = "eye"; rim.ink = EYE_RIM;
    push(rim, head);
    const pupil = newNode(`pupil-${side < 0 ? "L" : "R"}`, "ocular-pupil", rim.id, "pupil"); pupil.center = add(rim.center, [-0.16 * r, 0, 0]); ellipsoid(pupil, [0.12 * r, 0.44 * r, 0.57 * r]); pupil.part = "eye"; pupil.ink = PUPIL;
    push(pupil, rim);
  }
  if (v["modules.crownPair"]) {
    const leaves = v["growth.crest-leaf-count"] === 3 ? [-1, 0, 1] : [-1, 1];
    for (const side of leaves) {
      const dir = unit([side === 0 ? -0.12 : 0.06, side * 0.67, 0.74]);
      const rt = rootOn(head, headCenter, dir, 0.06 * headR[2], envOf(head));
      const height = v["crown.heightOverHeadRz"] * headR[2], radius = 0.36 * Math.min(headR[1], headR[2]);
      const crown = newNode(`crown-${side < 0 ? "L" : side === 0 ? "M" : "R"}`, "crown", head.id, "body"); crown.part = "crown";
      if (v["crown.form"] === "rounded") { crown.center = add(rt.inner, [0, 0, 0.4 * height]); ellipsoid(crown, [radius, radius, 0.6 * height], 2); push(crown, head); }
      else {
        crown.center = add(rt.inner, [0, 0, 0.5 * height]); crown.radii = [radius, radius, height / 2];
        const base = Array.from({ length: 6 }, (_, i) => add(rt.inner, [radius * Math.cos((i * Math.PI) / 3), radius * Math.sin((i * Math.PI) / 3), 0]));
        for (let i = 0; i < 6; i++) addFace(crown, [base[i], base[(i + 1) % 6], add(rt.inner, [0, 0, height])], [0, 0, 1]);
        addFace(crown, [...base].reverse(), Array(6).fill(0));
        crown.shape = { kind: "pyramid" };
        push(crown, head);
      }
    }
  }
  if (v["horns.enabled"]) for (const side of [-1, 1]) {
    const curl = v["growth.horn-curl"] ?? 0.6, length = 0.95 * headR[2], baseR = 0.14 * Math.min(headR[1], headR[2]);
    const dir = unit([0.25, side * 0.45, 0.85]);
    const rt = rootOn(head, headCenter, dir, 0.5 * baseR, envOf(head));
    const horn = newNode(`horn-${side < 0 ? "L" : "R"}`, "horn", head.id, "second"); horn.part = "horn";
    const frame = [unit([0.35, side * 0.3, 0.9]), [0, side, 0], unit([-0.9, 0, 0.35])]; // up and back, curling forward
    sweep(horn, rt.inner, frame, length, baseR, -curl, 6, 0.2);
    push(horn, head, add(rt.inner, mul(horn.stations[0].tangent, 0.12 * baseR)));
    if (v["anatomy.horn-branching"] === "antler") {
      const mid = horn.stations[2];
      const tine = newNode(`horn-${side < 0 ? "L" : "R"}-tine`, "horn", horn.id, "second"); tine.part = "horn";
      segment(tine, sub(mid.center, mul(mid.tangent, 0.2 * mid.radius)), add(mid.center, add(mul(unit([-0.6, side * 0.5, 0.6]), 0.45 * length), [0, 0, 0])), 0.8 * mid.radius, 0.2 * mid.radius);
      push(tine, horn, mid.center);
    }
  }
  if (v["ears.enabled"]) for (const side of [-1, 1]) {
    const length = v["ears.lengthOverHeadRz"] * headR[2], width = 0.55 * length;
    const drooping = v["anatomy.ear-tilt"] === "drooping";
    const dir = unit([0, side * 0.62, 0.78]);
    const rt = rootOn(head, headCenter, dir, 0.08 * length, envOf(head));
    const upAxis = drooping ? unit([-0.1, side * 0.95, -0.4]) : unit([-0.15, side * 0.35, 1]);
    const across = unit(cross(upAxis, [-1, 0, 0]));
    const pointed = v["ears.form"] === "pointed";
    const outline = pointed ? [[-0.12, 0], [-0.5, 0.38], [-0.36, 0.75], [0, 1], [0.36, 0.75], [0.5, 0.38], [0.12, 0]] : [[-0.12, 0], [-0.5, 0.32], [-0.48, 0.73], [-0.24, 0.96], [0.24, 0.96], [0.48, 0.73], [0.5, 0.32], [0.12, 0]];
    const corners = outline.map(([a, b]) => add(rt.inner, add(mul(across, a * width), mul(upAxis, b * length))));
    const ear = newNode(`ear-${side < 0 ? "L" : "R"}`, "auricular-sheet", head.id, "body"); ear.part = "ear";
    sheet(ear, corners, cross(across, upAxis), 0.03 * length);
    push(ear, head, rt.inner);
  }
  if (v["antennae.enabled"]) for (const side of [-1, 1]) {
    const length = v["growth.antenna-length-ratio"] * headR[2], formA = v["anatomy.antenna-form"];
    const dir = unit([-0.35, side * 0.45, 0.85]);
    const rt = rootOn(head, headCenter, dir, 0.06 * L, envOf(head));
    const joint = add(rt.surface, add(mul(dir, 0.45 * length), [-0.1 * length, 0, 0.1 * length]));
    const end = add(joint, [-0.5 * length, side * 0.15 * length, 0.25 * length]);
    const r = 0.03 * L;
    const a1 = newNode(`antenna-${side < 0 ? "L" : "R"}-1`, "antenna", head.id, "body"); segment(a1, rt.inner, joint, r, 0.8 * r); a1.part = "antenna";
    push(a1, head, rt.witness);
    const jn = newNode(`antenna-${side < 0 ? "L" : "R"}-joint`, "chain-joint", a1.id, "body"); jn.center = joint; ellipsoid(jn, [0.85 * r, 0.85 * r, 0.85 * r]); jn.part = "antenna";
    push(jn, a1);
    const a2 = newNode(`antenna-${side < 0 ? "L" : "R"}-2`, "antenna", jn.id, "body"); segment(a2, joint, end, 0.8 * r, formA === "thread" ? 0.4 * r : 0.7 * r); a2.part = "antenna";
    push(a2, jn);
    if (formA !== "thread") {
      const tip = newNode(`antenna-${side < 0 ? "L" : "R"}-tip`, "antenna-tip", a2.id, "body"); tip.part = "antenna";
      tip.center = add(end, mul(unit(sub(end, joint)), r)); ellipsoid(tip, formA === "club" ? [2.2 * r, 2 * r, 2 * r] : [3.5 * r, 1.2 * r, 4 * r]);
      push(tip, a2);
    }
  }

  // --- limbs: rooted per region at the plan's stations --------------------------------------
  const contactPoints = [];
  const stationShift = ((v["structure.attachment-position"] ?? 0.45) - 0.45) * 0.6; // along the region
  const chain = (id, owner, rt, joint, end, radius, part, taperJoint = 0.86, taperEnd = 0.68) => {
    const prox = newNode(`${id}-upper`, "contact-chain", owner.id, "second"); segment(prox, rt.inner, joint, radius, taperJoint * radius); prox.part = part;
    push(prox, owner, rt.witness);
    const jn = newNode(`${id}-joint`, "chain-joint", prox.id, "second"); jn.center = joint; ellipsoid(jn, [0.9 * radius, 0.9 * radius, 0.9 * radius]); jn.part = part;
    push(jn, prox);
    const dist = newNode(`${id}-lower`, "contact-chain", jn.id, "second"); segment(dist, joint, end, 0.8 * radius, taperEnd * radius); dist.part = part;
    push(dist, jn);
    return dist;
  };
  if (plan.limbSet === "legs") {
    const drop = v["support.rootToEndDropOverCoreRx"] * L, spread = v["support.outwardEndOffsetOverCoreRx"] * L;
    const radius = v["support.proximalRadiusOverCoreRx"] * L;
    plan.stations.forEach((station, g) => {
      const owner = serialRegions[Math.min(station.region, serialRegions.length - 1)];
      for (const side of [-1, 1]) {
        const u = Math.max(-0.75, Math.min(0.75, station.u + stationShift));
        const rt = rootOn(owner, worldPoint(owner, [u * owner.radii[0], 0, 0.1 * owner.radii[2]]), localVector(owner.frame, [0, side, 0]), 0.5 * radius, envOf(owner));
        let joint, end;
        if (plan.posture === "upright") {
          joint = add(rt.surface, [0.02 * L, side * 0.25 * spread, -0.55 * drop]);
          end = add(rt.surface, [-0.05 * L, side * 0.35 * spread, -1.1 * drop]);
        } else if (plan.posture === "splayed") {
          const s = Math.max(spread, 0.45 * L);
          joint = add(rt.surface, [0.05 * L * (g - 1), side * 0.6 * s, 0.35 * drop]);
          end = add(joint, [0.08 * L * (g - 1), side * 0.55 * s, -1.25 * drop]);
        } else {
          joint = add(rt.surface, [-0.04 * L, side * 0.6 * spread, -0.5 * drop]);
          end = add(rt.surface, [-0.1 * L, side * spread, -drop]);
        }
        const dist = chain(`leg-${g}-${side < 0 ? "L" : "R"}`, owner, rt, joint, end, radius, `leg-${g}`);
        terminal(`leg-${g}-${side < 0 ? "L" : "R"}-foot`, dist, end, v, L, push, contactPoints, null);
      }
    });
  } else if (plan.limbSet === "rays") {
    const station = plan.stations[0];
    const n = station.rays, prox = (v["appendage.proximalOverAnchorRx"] ?? 0.6) * L * 0.8, distal = (v["appendage.distalOverAnchorRx"] ?? 0.5) * L * 0.9;
    const radius = (v["support.proximalRadiusOverCoreRx"] ?? 0.11) * L;
    for (let i = 0; i < n; i++) {
      const a = Math.PI / n + (i * 2 * Math.PI) / n; // leave the front for the face
      const out = [Math.cos(a), Math.sin(a), 0];
      const rt = rootOn(root, add(root.center, [0, 0, -0.15 * root.radii[2]]), unit(add(out, [0, 0, -0.35])), 0.5 * radius, envOf(root));
      const joint = add(rt.surface, add(mul(out, prox), [0, 0, -0.45 * prox]));
      const end = add(joint, add(mul(out, 0.35 * distal), [0, 0, -distal]));
      const dist = chain(`ray-${i}`, root, rt, joint, end, radius, "ray");
      terminal(`ray-${i}-foot`, dist, end, v, L, push, contactPoints, a);
    }
  } else if (plan.limbSet === "feelers") {
    const prox = v["appendage.proximalOverAnchorRx"] * L, distal = (v["appendage.distalOverAnchorRx"] ?? 0.5) * L, radius = v["appendage.freeRadiusOverAnchorRx"] * L;
    const links = plan.links;
    plan.stations.forEach((station, g) => {
      const sides = radial ? [0, 1, 2] : [-1, 1];
      for (const side of sides) {
        let rt, dir1, dir2, owner;
        if (radial) {
          owner = root;
          const a = Math.PI / 3 + (side * 2 * Math.PI) / 3 + (g - 1) * 0.45;
          const out = [Math.cos(a), Math.sin(a), 0];
          rt = rootOn(root, add(root.center, [0, 0, -0.2 * root.radii[2]]), out, 0.5 * radius, envOf(root));
          dir1 = unit(add(out, [0, 0, -0.5])); dir2 = unit(add(out, [0, 0, -1.2]));
        } else {
          owner = serialRegions[Math.min(station.region, serialRegions.length - 1)];
          const u = Math.max(-0.75, Math.min(0.75, station.u + stationShift));
          rt = rootOn(owner, worldPoint(owner, [u * owner.radii[0], 0, -0.1 * owner.radii[2]]), localVector(owner.frame, [0, side, 0]), 0.5 * radius, envOf(owner));
          dir1 = unit([0.1, side * 0.9, -0.45]); dir2 = unit([0.05, side * 0.25, -1]);
        }
        const joint = add(rt.surface, mul(dir1, prox));
        const end = links === 2 ? add(joint, mul(dir2, distal)) : joint;
        const id = `feeler-${g}-${radial ? side : side < 0 ? "L" : "R"}`, part = `feeler-${g}`;
        const p = newNode(`${id}-1`, "free-chain", owner.id, "second"); segment(p, rt.inner, joint, radius, links === 2 ? 0.7 * radius : 0.35 * radius); p.part = part;
        push(p, owner, rt.witness);
        let last = p;
        if (links === 2) {
          const jn = newNode(`${id}-joint`, "chain-joint", p.id, "second"); jn.center = joint; ellipsoid(jn, [0.7 * radius, 0.7 * radius, 0.7 * radius]); jn.part = part;
          push(jn, p);
          const d = newNode(`${id}-2`, "free-chain", jn.id, "second"); segment(d, joint, end, 0.6 * radius, 0.3 * radius); d.part = part;
          push(d, jn);
          last = d;
        }
        if (plan.posture === "stilts") contactPoints.push(last.end);
      }
    });
  }

  // --- flaps: wings, fins, a cap or petals ---------------------------------------------------
  const flapOpacity = 1 - (v["appearance.flap-translucency"] ?? 0);
  if (plan.flapSet) {
    const span = v["wing.outwardSpanOverCoreRx"] * L, chord = v["wing.longitudinalChordOverCoreRx"] * L, swp = v["wing.posteriorSweepOverSpan"] * span;
    const thickness = 0.015 * L;
    const owner = serialRegions[Math.min(plan.flapRegion ?? 0, serialRegions.length - 1)];
    if (plan.flapSet === "wings") for (const side of [-1, 1]) {
      const rt = rootOn(owner, worldPoint(owner, [0.15 * owner.radii[0], 0, 0]), localVector(owner.frame, [0, side * 0.55, 0.83]), 0.05 * L, envOf(owner));
      const rootP = rt.surface;
      const outer = add(rootP, [swp, side * span, 0.2 * span]);
      const corners = [add(rootP, [-0.5 * chord, 0, 0]), add(rootP, [0.5 * chord, 0, 0]), add(outer, [0.3 * chord, 0, 0]), add(outer, [-0.3 * chord, 0, 0])];
      const wing = newNode(`wing-${side < 0 ? "L" : "R"}`, "thin-surface", owner.id, "second"); wing.part = "flap"; wing.opacity = flapOpacity;
      sheet(wing, corners, [0, 0, 1], thickness);
      push(wing, owner, rt.inner);
    } else if (plan.flapSet === "fins") {
      const finSpan = (v["structure.fin-span"] ?? 0.4) * L + 0.4 * span;
      const dorsalOwner = serialRegions[0];
      const top = rootOn(dorsalOwner, worldPoint(dorsalOwner, [0.1 * dorsalOwner.radii[0], 0, 0]), localVector(dorsalOwner.frame, [0, 0, 1]), 0.05 * L, envOf(dorsalOwner));
      const topRoot = top.surface;
      const dorsal = newNode("fin-dorsal", "thin-surface", dorsalOwner.id, "second"); dorsal.part = "flap"; dorsal.opacity = flapOpacity;
      sheet(dorsal, [add(topRoot, [-0.5 * chord, 0, 0]), add(topRoot, [0.5 * chord, 0, 0]), add(topRoot, [0.5 * chord + swp, 0, 0.7 * finSpan]), add(topRoot, [-0.2 * chord + swp, 0, 0.7 * finSpan])], [0, 1, 0], thickness);
      push(dorsal, dorsalOwner, top.inner);
      for (const side of [-1, 1]) {
        const rt = rootOn(dorsalOwner, worldPoint(dorsalOwner, [-0.1 * dorsalOwner.radii[0], 0, -0.15 * dorsalOwner.radii[2]]), localVector(dorsalOwner.frame, [0, side, 0]), 0.05 * L, envOf(dorsalOwner));
        const rootP = rt.surface;
        const outer = add(rootP, [0.3 * finSpan + swp, side * finSpan, -0.25 * finSpan]);
        const pect = newNode(`fin-${side < 0 ? "L" : "R"}`, "thin-surface", dorsalOwner.id, "second"); pect.part = "flap"; pect.opacity = flapOpacity;
        sheet(pect, [add(rootP, [-0.4 * chord, 0, 0]), add(rootP, [0.4 * chord, 0, 0]), add(outer, [0.25 * chord, 0, 0]), add(outer, [-0.2 * chord, 0, 0])], [0, 0, 1], thickness);
        push(pect, dorsalOwner, rt.inner);
      }
      if (!v["tail.enabled"]) {
        const last = serialRegions.at(-1);
        const rt = rootOn(last, last.center, last.frame[0], 0.05 * L, envOf(last));
        const back = rt.surface;
        const caudal = newNode("fin-caudal", "thin-surface", last.id, "second"); caudal.part = "flap"; caudal.opacity = flapOpacity;
        sheet(caudal, [add(back, [0, 0, 0.35 * last.radii[2]]), add(back, [0, 0, -0.35 * last.radii[2]]), add(back, [0.9 * finSpan, 0, -0.8 * finSpan]), add(back, [0.9 * finSpan, 0, 0.8 * finSpan])], [0, 1, 0], thickness);
        push(caudal, last, rt.inner);
      }
    } else if (plan.flapSet === "cap") {
      const hub = regions.at(-1);
      if (v["cap.enabled"]) {
        const cap = newNode("cap", "cap-sheet", hub.id, "cap"); cap.part = "cap";
        const r = 0.5 * chord + 0.5 * span;
        cap.center = add(hub.center, [0, 0, 0.78 * hub.radii[2]]); ellipsoid(cap, [r, r, 0.18 * chord + 0.1 * span + 0.12 * hub.radii[2]], 2);
        push(cap, hub);
      } else for (let i = 0; i < 3; i++) {
        const a = Math.PI / 2 + (i * 2 * Math.PI) / 3;
        const out = [Math.cos(a), Math.sin(a), 0], across = [-Math.sin(a), Math.cos(a), 0];
        const rt = rootOn(hub, hub.center, add(mul(out, 0.5), [0, 0, 0.85]), 0.05 * L, envOf(hub));
        const rootP = rt.surface;
        const outer = add(rootP, add(mul(out, span), [0, 0, 0.2 * span - swp]));
        const flap = newNode(`cap-${i}`, "thin-surface", hub.id, "second"); flap.part = "flap"; flap.opacity = flapOpacity;
        sheet(flap, [add(rootP, mul(across, -0.5 * chord)), add(rootP, mul(across, 0.5 * chord)), add(outer, mul(across, 0.3 * chord)), add(outer, mul(across, -0.3 * chord))], [0, 0, 1], thickness);
        push(flap, hub, rt.inner);
      }
    }
  }
  if (v["leaves.enabled"]) for (const region of regions) {
    const n = v["growth.leaf-count"], len = v["growth.leaf-length-ratio"] * Math.min(region.radii[1], region.radii[2]);
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + ((i + 0.5) * Math.PI) / n;
      const localDir = radial ? [Math.cos(a + Math.PI / 2), Math.sin(a + Math.PI / 2), 1.2] : [0.1, Math.sin(a), Math.max(0.3, Math.cos(a))];
      const dirW = unit(localVector(region.frame, localDir));
      const rt = rootOn(region, region.center, dirW, 0.04 * L, envOf(region));
      const outDir = unit(localVector(region.frame, radial ? [localDir[0], localDir[1], 0.6] : [0.05, localDir[1], 1]));
      const across = unit(cross(outDir, region.frame[0]));
      const tip = add(rt.inner, mul(outDir, len));
      const w = 0.4 * len;
      const leaf = newNode(`leaf-${region.id}-${i}`, "thin-surface", region.id, "leaf"); leaf.part = "leaf";
      sheet(leaf, [add(rt.inner, mul(across, -0.15 * w)), add(rt.inner, mul(across, 0.15 * w)), add(add(rt.inner, mul(outDir, 0.5 * len)), mul(across, 0.5 * w)), tip, add(add(rt.inner, mul(outDir, 0.5 * len)), mul(across, -0.5 * w))], cross(across, outDir), 0.012 * L);
      push(leaf, region, rt.inner);
    }
  }
  if (v["wingCases.enabled"]) {
    const owner = serialRegions[Math.min(1, serialRegions.length - 1)];
    const extent = v["growth.wing-case-extent"], parted = v["anatomy.wing-case-seam"] === "parted";
    const back = regions.at(-1);
    for (const side of [-1, 1]) {
      const c = newNode(`wing-case-${side < 0 ? "L" : "R"}`, "shell", owner.id, "second"); c.part = "wing-case";
      const reach = (back.center[0] + extent * back.radii[0] - owner.center[0]) / 2;
      c.center = add(owner.center, [reach - 0.1 * owner.radii[0], side * (0.5 * owner.radii[1] + (parted ? 0.15 * owner.radii[1] : 0)), 0.5 * owner.radii[2]]);
      c.frame = parted ? rotateFrameZ(IDENTITY, side * 0.25) : IDENTITY;
      ellipsoid(c, [reach + 0.15 * owner.radii[0], 0.55 * owner.radii[1], 0.5 * owner.radii[2]]);
      push(c, owner);
    }
  }
  if (v["shell.enabled"]) {
    const xs = serialRegions.flatMap((r) => [r.center[0] - r.radii[0], r.center[0] + r.radii[0]]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const dome = v["growth.shell-dome-ratio"] ?? 0.8;
    const shell = newNode("shell", "shell", root.id, "shell"); shell.part = "shell";
    shell.center = [(minX + maxX) / 2 + 0.05 * L, 0, root.center[2] + 0.2 * root.radii[2]];
    ellipsoid(shell, [(maxX - minX) / 2 + 0.05 * L, 1.15 * Math.max(...serialRegions.map((r) => r.radii[1])), dome * root.radii[2]], 2);
    push(shell, root);
  }
  if (v["skirt.enabled"]) {
    const over = v["growth.foot-skirt-width-ratio"];
    const xs = serialRegions.flatMap((r) => [r.center[0] - r.radii[0], r.center[0] + r.radii[0]]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const width = Math.max(...serialRegions.map((r) => r.radii[1])) * (1 + over);
    const skirt = newNode("foot-skirt", "foot-skirt", root.id, "second"); skirt.part = "skirt";
    const underside = Math.min(...serialRegions.map((r) => r.center[2] - 0.9 * r.radii[2]));
    skirt.center = [(minX + maxX) / 2, 0, underside + 0.08 * root.radii[2]];
    ringSolid(skirt, [(maxX - minX) / 2 + 0.1 * L, width, 0.16 * root.radii[2]], "barrel", 2);
    const under = serialRegions.reduce((a, b) => (Math.abs(a.center[0] - skirt.center[0]) < Math.abs(b.center[0] - skirt.center[0]) ? a : b));
    const lo = Math.max(under.center[2] - 0.9 * under.radii[2], skirt.center[2] - 0.9 * skirt.radii[2]), hi = Math.min(under.center[2] + 0.9 * under.radii[2], skirt.center[2] + 0.9 * skirt.radii[2]);
    if (lo > hi) throw new Error("foot-skirt is not connected to the body");
    push(skirt, under, [under.center[0], 0, (lo + hi) / 2]); // inside the region's underside and the skirt's top
    contactPoints.push([skirt.center[0], 0, skirt.center[2] - skirt.radii[2]]);
  }

  // --- tail ------------------------------------------------------------------------------------
  if (v["tail.enabled"]) {
    const owner = plan.fan ? root : serialRegions[plan.tailRegion];
    const length = v["tail.lengthOverOwnerRx"] * owner.radii[0], baseR = v["tail.baseRadiusOverOwnerCross"] * Math.min(owner.radii[1], owner.radii[2]);
    const dirW = radial ? unit([1, 0, -0.2]) : owner.frame[0];
    const rt = rootOn(owner, owner.center, dirW, 0.3 * baseR, envOf(owner));
    const tail = newNode("tail", "axial-tail", owner.id, "body"); tail.part = "tail";
    sweep(tail, rt.inner, radial ? IDENTITY : owner.frame, length, baseR, v["tail.bendRadians"], 6, v["tailBulb.enabled"] ? 0.35 : 0.16);
    push(tail, owner, add(rt.inner, mul(tail.stations[0].tangent, 0.12 * baseR))); // just inside the first station, still inside the owner
    if (v["tailBulb.enabled"]) {
      const bulb = newNode("tail-bulb", "tail-bulb", tail.id, "emission"); bulb.part = "tail";
      bulb.center = tail.end; ellipsoid(bulb, [1.6 * baseR, 1.4 * baseR, 1.4 * baseR]);
      const last = tail.stations.at(-1);
      push(bulb, tail, sub(last.center, mul(last.tangent, 0.4 * last.radius))); // inside the last tail station and the bulb
    }
  }

  // --- ground pose and bounds ---------------------------------------------------------------------
  const lowest = contactPoints.length ? Math.min(...contactPoints.map((p) => p[2])) : Math.min(...regions.map((r) => r.center[2] - r.radii[2]));
  for (const node of nodes) {
    node.center = add(node.center, [0, 0, -lowest]);
    node.mesh.vertices = node.mesh.vertices.map((p) => add(p, [0, 0, -lowest]));
    for (const k of ["root", "end"]) if (node[k]) node[k] = add(node[k], [0, 0, -lowest]);
    if (node.corners) node.corners = node.corners.map((p) => add(p, [0, 0, -lowest]));
    if (node.stations) for (const st of node.stations) st.center = add(st.center, [0, 0, -lowest]);
    if (node.attachment) node.attachment.position = add(node.attachment.position, [0, 0, -lowest]);
    if (node.attachments) for (const a of node.attachments) a.position = add(a.position, [0, 0, -lowest]);
    node.mesh.index = null; // the dedupe index is build-time only
  }
  const bounds = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
  for (const node of nodes) for (const p of node.mesh.vertices) for (let i = 0; i < 3; i++) { bounds.min[i] = Math.min(bounds.min[i], p[i]); bounds.max[i] = Math.max(bounds.max[i], p[i]); }
  const slots = {
    body: bodyPalette, second: secondPalette, eyeRim: [EYE_RIM], pupil: [PUPIL],
    cap: v["cap.enabled"] ? v["appearance.cap-palette"] ?? bodyPalette : null,
    emission: v["tailBulb.enabled"] || v["charged.enabled"] ? ["#ffd166"] : null, leaf: v["leaves.enabled"] ? ["#5aa65c"] : null,
    shell: v["shell.enabled"] ? secondPalette : null, mask: v["mask.enabled"] ? secondPalette : null,
    belly: v["belly.enabled"] ? secondPalette : null,
  };
  const covering = { kind: v["feathers.enabled"] ? "feathers" : v["covering.furEnabled"] ? "fur" : v["covering.kind"] === "scales" ? "scales" : "skin", featherLength: v["appearance.feather-length"] ?? null, furReach: v["appearance.fur-reach"] ?? "body", charged: !!v["charged.enabled"], phase: v["physiology.phase"] ?? 0, emission: v["appearance.emission-brightness"] ?? 0, furLength: v["fur.lengthOverMinTransverseRadius"] ?? null, furFlow: v["fur.tangentAngleRadians"] ?? null, scaleExtent: v["covering.localExtent"] ?? null, scaleSize: v["covering.localScaleLength"] ?? null, leafy: v["appearance.leaf-covering"] === "leafy", sheen: v["appearance.sheen"] ?? 0, texture: v["appearance.surface-texture"] ?? "smooth" };
  const markings = v["markings.enabled"] ? { layout: v["markings.layout"], extent: v["markings.extent"], scale: v["markings.scale"], orientation: v["markings.orientation"], contrast: v["markings.contrast"] } : null;
  const flapMarking = plan.flapSet && v["appearance.flap-marking"] && v["appearance.flap-marking"] !== "plain" ? v["appearance.flap-marking"] : null;
  const capSpots = !!v["cap.enabled"] && v["appearance.cap-spots"] === "spots";
  const mask = v["mask.enabled"] ? v["appearance.face-mask-shape"] ?? "band" : null;
  const tailRings = v["tailRings.enabled"] ? v["growth.tail-ring-count"] ?? 1 : 0;
  const shellPlates = !!v["shell.enabled"] && v["appearance.shell-plates"] === "plated";
  if (v["charged.enabled"]) for (const node of nodes) if (node.role === "primary-region" || node.role === "region-connector" || node.role === "typed-head") node.opacity = 1 - (v["physiology.phase"] ?? 0.4);
  return { status: "constructed", plan: { key: plan.key, code: plan.code, rig: plan.rig, limbSet: plan.limbSet, posture: plan.posture, ground: plan.ground, head: plan.head, flapSet: plan.flapSet, states: plan.states }, nodes, edges, bounds, slots, covering, markings, flapMarking, capSpots, mask, tailRings, shellPlates, belly: !!v["belly.enabled"], L };
}

// --- helpers ----------------------------------------------------------------------------------------
function extentAlong(node, worldDir, envOf) {
  const dir = unit(worldDir);
  return envOf(node).rayHit(node.center, dir).t;
}
function moveNode(node, center) {
  const d = sub(center, node.center);
  node.mesh.vertices = node.mesh.vertices.map((p) => add(p, d));
  node.center = center;
}
function connect(parent, child, direction, join, v, push, envOf, L, label = null) {
  const dir = unit(direction);
  const pe = extentAlong(parent, dir, envOf), ce = extentAlong(child, mul(dir, -1), envOf);
  const distance = norm(sub(child.center, parent.center));
  if (join === "broad" || distance <= pe + ce) { push(child, parent); return; }
  const pen = 0.12 * Math.min(L, ce);
  const start = add(parent.center, mul(dir, pe - pen)), end = sub(child.center, mul(dir, ce - pen));
  const radius = (v["region.connectorRadiusRatio"] ?? 0.5) * Math.min(parent.radii[1], parent.radii[2], child.radii[1], child.radii[2]);
  const connector = newNode(`${label ?? child.id}-join`, "region-connector", parent.id, "body");
  segment(connector, start, end, radius, radius); connector.part = label ?? child.id;
  connector.attachments = [{ owner: parent.id, position: start }, { owner: child.id, position: end }];
  push(connector, parent);
  push(child, connector);
}
function terminal(id, last, end, v, L, push, contactPoints, azimuth) {
  const form = v["terminal.form"] ?? "rounded";
  const tr = [(v["terminal.rxOverCoreRx"] ?? 0.18) * L, 0.73 * (v["terminal.rxOverCoreRx"] ?? 0.18) * L, (v["terminal.rzOverCoreRx"] ?? 0.1) * L];
  const frame = azimuth === null ? IDENTITY : rotateFrameZ(IDENTITY, azimuth);
  if (form === "root") {
    const spread = 1.2 * tr[0];
    for (let i = 0; i < 4; i++) {
      const a = (i * 2 * Math.PI) / 4 + Math.PI / 4;
      const tip = add(end, localVector(frame, [spread * Math.cos(a), spread * Math.sin(a) * 0.8, -1.3 * tr[2]]));
      const rootlet = newNode(`${id}-root-${i}`, "root-tuft", last.id, "second"); rootlet.part = last.part;
      segment(rootlet, add(end, mul(unit(sub(last.root, end)), 0.4 * last.sectionRadii[1])), tip, 0.4 * last.sectionRadii[1], 0.12 * last.sectionRadii[1]);
      push(rootlet, last);
      contactPoints.push(tip);
    }
    return;
  }
  const center = add(end, localVector(frame, [-0.2 * tr[0], 0, -0.25 * tr[2]]));
  const foot = newNode(id, "contact-terminal", last.id, "second"); foot.part = last.part; foot.frame = frame; foot.center = center;
  if (form === "pad") ringSolid(foot, [tr[0], 1.15 * tr[1], tr[2]], "blunt-pad", 4);
  else if (form === "hoof") ringSolid(foot, [0.75 * tr[0], 0.85 * tr[1], 1.4 * tr[2]], "blunt-pad", 4);
  else if (form === "webbed") ringSolid(foot, [1.15 * tr[0], 1.7 * tr[1], 0.55 * tr[2]], "blunt-pad", 4);
  else if (form === "wedge") {
    foot.radii = tr; foot.shape = { kind: "wedge" };
    const corners = [-1, 1].flatMap((lx) => [-1, 1].flatMap((y) => [-1, 1].map((z) => worldPoint(foot, [lx * tr[0], y * tr[1] * (lx === 1 ? 0.6 : 1), z * tr[2] * (lx === 1 ? 0.3 : 1)]))));
    for (const idx of [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]]) addFace(foot, idx.map((i) => corners[i]), idx.map((i) => (i < 4 ? 0 : 1)), sub(mul(idx.map((i) => corners[i]).reduce(add, [0, 0, 0]), 0.25), center));
  } else ellipsoid(foot, tr);
  push(foot, last);
  contactPoints.push([center[0], center[1], center[2] - tr[2]]);
}
