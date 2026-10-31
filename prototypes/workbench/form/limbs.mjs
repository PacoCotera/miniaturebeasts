// Limbs (design 4): branches on the front or the tail chain, the floor, the shin solve, hand reaches, toes. Plain JavaScript, no node: imports.
// A leg's solved segment is the knot named `shin` (else its last segment): its length is bisected so the sole lands on the floor plane.
// spine.mjs calls buildLimbs with its own functions (the two modules import each other, so nothing here runs at load time).
const RAD = Math.PI / 180;
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const nrm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const sc = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const SOLVE = { tol: 0.005, lo: 0.5, hi: 1.6 };

export function buildLimbs(form, S) {
  const { front, tail, f0, integrateChain, interpChain, sectionPoint, lowestZ, applyFur } = S;
  const parents = { front, tail }, out = [], reaches = [], solves = [];
  const lowestOf = (chain, pred = () => true) => { let z = Infinity; for (const sm of chain.samples) if (pred(sm)) { const l = lowestZ(sm); if (l < z) z = l; } return z; };
  // one branch (and its toes) for a given length of its solved segment
  function make(br, side, tag, shinDs, reach) {
    const parent = parents[br.parent ?? "front"], root = interpChain(parent, br.root.s ?? br.root.sigma);
    // on a tail-parented branch T flips (and B with it): the angle is mirrored there, so +90 stays the creature's left (4.2)
    let angle = side === 1 ? br.root.angle : -br.root.angle; if (br.parent === "tail") angle = -angle;
    const rp = sectionPoint(root, angle, br.root.out);
    let dir = nrm([br.dir[0], br.dir[1] * side, br.dir[2]]), N0;
    if (br.normal === "forward") N0 = [1, 0, 0]; else if (br.normal && br.normal.length === 3) N0 = [br.normal[0], br.normal[1] * side, br.normal[2]]; else N0 = [0, 0, 1];
    const knots = br.knots.map((k, i) => ({ ...k, part: br.part, name: k.name || `${br.id}${i}` }));
    if (shinDs !== null && shinDs !== undefined) knots[shinIndex(br)].ds = shinDs;
    if (reach) { dir = reach.dir; N0 = reach.N0; knots[reach.elbow].k = reach.k; }
    if (Math.abs(dot(N0, dir)) > 0.95) N0 = [1, 0, 0];
    const ch = integrateChain({ id: br.id + tag, knots, coil: br.coil, frame0: { p: rp, T: dir, N: N0 }, sigmaSign: 1, yawSign: side, partOfCoil: br.part });
    ch.id = br.id + tag; ch.branch = br; ch.side = side; ch.rootSample = root; ch.rootPoint = rp; applyFur(ch, f0);
    const extra = [], lastS = ch.samples.at(-1);
    if (br.fingers) for (let j = 0; j < br.fingers.count; j++) { // a hand: short spines on the palm (1.6)
      const f = br.fingers, a = (j - (f.count - 1) / 2) * f.fan * RAD * side, d2 = nrm(add(sc(lastS.T, Math.cos(a)), sc(lastS.B, Math.sin(a))));
      const kn = [{ name: "", part: br.part, ds: 0, k: 0, psi: 0, w: f.r, u: f.r, d: f.r }, { name: "", part: br.part, ds: f.length, k: 0, psi: 0, w: f.r * 0.6, u: f.r * 0.6, d: f.r * 0.6 }];
      const fc = integrateChain({ id: `${br.id}${tag}f${j}`, knots: kn, frame0: { p: lastS.p, T: d2, N: lastS.N }, sigmaSign: 1 });
      fc.id = `${br.id}${tag}f${j}`; fc.branch = { id: fc.id, part: br.part, blend: 0.03 }; fc.side = side; fc.finger = true; applyFur(fc, f0); extra.push(fc);
    }
    if (br.toes) { // toes: the finger mechanism pointed forward and down, resting on the sole (4.3); `down` degrees below horizontal
      const t = br.toes, drop = lastS.p[2] - lowestZ(lastS);
      for (let j = 0; j < t.count; j++) {
        const a = (j - (t.count - 1) / 2) * t.fan * RAD * side, dn = (t.down ?? 25) * RAD;
        const d2 = nrm([Math.cos(a) * Math.cos(dn), Math.sin(a) * Math.cos(dn), -Math.sin(dn)]);
        const p0 = [lastS.p[0], lastS.p[1], lastS.p[2] - Math.max(0, drop - t.r * 1.2 - (lastS.fur ?? 0))];
        const kn = [{ name: "", part: br.part, ds: 0, k: 0, psi: 0, w: t.r, u: t.r, d: t.r }, { name: "", part: br.part, ds: t.length, k: 0, psi: 0, w: t.r * 0.7, u: t.r * 0.7, d: t.r * 0.7 }];
        const tc = integrateChain({ id: `${br.id}${tag}t${j}`, knots: kn, frame0: { p: p0, T: d2, N: [0, 0, 1] }, sigmaSign: 1 });
        tc.id = `${br.id}${tag}t${j}`; tc.branch = { id: tc.id, part: br.part, blend: 0.04, nail: t.nail ?? 0.6 }; tc.side = side; tc.finger = true; tc.toe = true; applyFur(tc, f0); extra.push(tc);
      }
    }
    return { ch, extra };
  }
  const shinIndex = (br) => { const i = br.knots.findIndex((k) => k.name === "shin"); return i >= 0 ? i : br.knots.length - 1; };
  const footZ = (r) => Math.min(lowestOf(r.ch, (sm) => sm.knot >= r.ch.samples.at(-1).knot), ...r.extra.map((c) => lowestOf(c)));

  // 1. the hand reaches: the initial direction and the elbow curvature, as a two-bone reach in the plane through the root, the target and a pole
  const placed = [];
  for (const br of form.branches ?? []) for (const [tag, side] of br.pair ? [["L", 1], ["R", -1]] : [["", 1]]) {
    let reach = null;
    if (br.reach) {
      reach = solveReach(br, side, tag);
      reaches.push({ id: br.id + tag, ...reach.info });
    }
    placed.push({ br, side, tag, reach });
  }
  function solveReach(br, side, tag) {
    const R = br.reach, parent = parents[br.parent ?? "front"], tgtS = interpChain(parent, R.target.sigma);
    const fur = Math.min(f0, 0.35 * Math.min(tgtS.w, tgtS.u, tgtS.d));
    const target = add(add(tgtS.p, sc(tgtS.N, -(tgtS.d + fur + R.target.out))), sc(tgtS.B, side * R.target.lateral));
    const pole = nrm([R.pole[0], R.pole[1] * side, R.pole[2]]);
    const root = interpChain(parent, br.root.s ?? br.root.sigma), rp = sectionPoint(root, side === 1 ? br.root.angle : -br.root.angle, br.root.out);
    const D = Math.hypot(...sub(target, rp)), u = nrm(sub(target, rp)), w = nrm(sub(pole, sc(u, dot(pole, u))));
    const elbow = br.knots.findIndex((k) => k.name === "elbow");
    const frame = (al) => { const d = nrm(add(sc(u, Math.cos(al)), sc(w, Math.sin(al)))), p1 = add(sc(u, -Math.sin(al)), sc(w, Math.cos(al))); return { dir: d, N0: sc(p1, -1) }; };
    const endOf = (x) => { const fr = frame(x[0]), knots = br.knots.map((k, i) => ({ ...k, part: br.part, k: i === elbow ? x[1] : k.k })), c = integrateChain({ id: "reach", knots, frame0: { p: rp, T: fr.dir, N: fr.N0 }, sigmaSign: 1 }); return c.samples.at(-1).p; };
    const resid = (x) => { const e = sub(endOf(x), rp); return [dot(e, u) - D, dot(e, w)]; };
    let x = [0.5, 120], r = resid(x);
    for (let it = 0; it < 40 && Math.hypot(...r) > 1e-4; it++) {
      const h = [0.01, 2], J = [0, 1].map((j) => { const x2 = x.slice(); x2[j] += h[j]; const r2 = resid(x2); return [(r2[0] - r[0]) / h[j], (r2[1] - r[1]) / h[j]]; });
      const det = J[0][0] * J[1][1] - J[1][0] * J[0][1]; if (Math.abs(det) < 1e-12) break;
      let step = [-(r[0] * J[1][1] - r[1] * J[1][0]) / det, -(r[1] * J[0][0] - r[0] * J[0][1]) / det], t = 1, nx, nr;
      for (let ls = 0; ls < 12; ls++) { nx = [x[0] + step[0] * t, x[1] + step[1] * t]; nr = resid(nx); if (Math.hypot(...nr) < Math.hypot(...r)) break; t *= 0.5; }
      x = nx; r = nr;
    }
    const fr = frame(x[0]);
    return { dir: fr.dir, N0: fr.N0, elbow, k: x[1], target, info: { alpha: x[0] / RAD, elbowK: x[1], miss: Math.hypot(...r), target } };
  }

  // 2. build every branch; the solved ones wait for the floor
  const built = placed.map((q) => ({ ...q, base: q.br.solve ? q.br.knots[shinIndex(q.br)].ds : null, ...make(q.br, q.side, q.tag, null, q.reach) }));
  // 3. the floor: the base (less the hover) on a base-borne body, else the lowest unsolved contact (the seat or the hind feet)
  const contactZ = (c) => {
    if (c.kind === "branches") return built.filter((q) => q.br.id === c.id).map((q) => ({ id: q.ch.id, z: footZ(q), q }));
    if (c.kind === "tail" && tail) return [{ id: "seat", z: lowestOf(tail, (sm) => sm.s <= tail.cum[c.upToKnot ?? 1] + 1e-9 && sm.s >= tail.cum[(c.upToKnot ?? 1) - 1] - 1e-9) }];
    if (c.kind === "base") return [{ id: "base", z: form.base }];
    return [];
  };
  const hover = form.hover ?? 0;
  let list = (form.contacts ?? []).flatMap(contactZ);
  if (form.base !== undefined && form.base !== null && !(form.contacts ?? []).some((c) => c.kind === "base")) list.push({ id: "base", z: form.base });
  const unsolved = list.filter((c) => !c.q?.br.solve && c.id !== "base");
  let floor = form.base !== undefined && form.base !== null ? form.base - hover : unsolved.length ? Math.min(...unsolved.map((c) => c.z)) : Math.min(...front.samples.map(lowestZ));
  // 4. the shin solve: bisection on the solved segment's length, |dz| <= 0.005 U
  for (const q of built.filter((b) => b.br.solve)) {
    const f = (ds) => footZ(make(q.br, q.side, q.tag, ds, q.reach)) - floor;
    let lo = q.base * 0.2, hi = q.base * 2.6, flo = f(lo), fhi = f(hi), ds;
    if (flo * fhi > 0) ds = Math.abs(flo) < Math.abs(fhi) ? lo : hi; // the floor is out of reach: the guard reports it
    else { for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2, fm = f(mid); if (Math.abs(fm) < 1e-5) { lo = hi = mid; break; } if ((fm > 0) === (flo > 0)) { lo = mid; flo = fm; } else hi = mid; } ds = (lo + hi) / 2; }
    Object.assign(q, make(q.br, q.side, q.tag, ds, q.reach));
    solves.push({ id: q.ch.id, base: q.base, ds, ratio: ds / q.base, dz: footZ(q) - floor });
  }
  const contacts = list.map((c) => ({ id: c.q ? c.q.ch.id : c.id, z: c.q ? footZ(c.q) : c.z }));
  for (const q of built) { out.push(q.ch, ...q.extra); }
  return { branches: out, contacts, floor, solves, reaches, hover };
}
