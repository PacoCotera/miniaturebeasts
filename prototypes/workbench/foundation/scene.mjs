// The creature as a signed distance field (negative inside), in world units with H = 1 and the floor at z = 0; x forward, y left, z up.
// Plan A (the quadruped's provisional body: chunk 2 replaces its legs and stance) and plan D (the limbless snail). Every number is the house file's
// rig block or a gene's value through its band; the scene holds no number of its own.
import { sdEllipsoid, sdRoundCone, sdCapsule, uRound, sMin, bounded, Rz, Ry, Rx, mul3, frameOf, toLocal, fromLocal, dirFromLocal, clamp, norm3, sstep } from "./sdf.mjs";
import { buildHead } from "./head.mjs";

const rad = (d) => (d * Math.PI) / 180;
// an ellipsoid in a rotated frame, as a closure over world coordinates
const ell = (c, r, R = null) => {
  if (!R) return (x, y, z) => sdEllipsoid(x - c[0], y - c[1], z - c[2], r[0], r[1], r[2]);
  const f = frameOf(c, R); return (x, y, z) => { const q = toLocal(f, x, y, z); return sdEllipsoid(q[0], q[1], q[2], r[0], r[1], r[2]); };
};

export function buildScene(house, spec) {
  const { plan, kinds, fp, body, pose } = spec, rig = house.rig[plan];
  const head = buildHead(house, plan, kinds, fp);
  const W = head.W;
  // the head's place: the crown is the top of the body (plan A: S = H / (H/S)); the snail's head stands on its rise
  const S = plan === "D" ? body.rise + 1.0 : 1 / fp.hs;
  const kc = plan === "D" ? [0, 0, body.rise + 0.5] : [0, 0, S - 0.5];
  const Rh = mul3(Rz(rad(pose.headYawSigned)), mul3(Ry(-rad(pose.pitch)), Rx(rad(pose.rollSigned))));
  const hf = frameOf(kc, Rh);
  const dHeadW = (x, y, z) => { const q = toLocal(hf, x, y, z); return head.d(q[0], q[1], q[2]); };
  const headBound = [kc, 0.5 * Math.max(W, head.D) + 0.7];
  const parts = {}; // named distance closures, for the material and the checks
  let dBody, extra = {}, bounds, regionOf, dAll, headWeight;
  if (plan === "A") {
    const zb = S - rig["back-drop"], zBelly = rig["belly-share"] * zb, rz = (zb - zBelly) / 2, zc = zb - rz;
    const cr = [rig["chest-rx"], 0.5 * rig["chest-width-of-W"] * W, rz], cc = [rig["chest-x"], 0, zc];
    const pr = cr.map((v) => v * rig["pelvis-share"]), pc = [cc[0] - rig["pelvis-gap"], 0, zc - 0.03];
    const dC = ell(cc, cr), dP = ell(pc, pr), uB = rig["union-body"];
    const legR = rig["leg-radius"], pawR = rig.paw, nToe = rig["toe-count"], stance = rig["stance-width-of-chest"];
    const legs = [], turn = rad(rig["paw-turn"]), tr = rig["toe-radii"];
    for (const [fore, cx, mass, rr] of [[true, cc[0] + rig["fore-x"], rig.shoulder, cr], [false, pc[0] + rig["hind-x"], rig.hip, pr]]) for (const sd of [1, -1]) {
      const y = sd * rr[1] * stance, lead = fore && sd === 1 ? rig["lead-paw"] : 0, px = cx + lead + (fore ? 0.02 : -0.04);
      const sh = ell([cx, y * 1.02, zc - 0.1], mass), top = [cx, y, zc - 0.1], ank = [px, y, pawR[2] * 1.7];
      // the bean paw: its own chubby mass, wider than the leg (1.3 to 1.5 x), flat on the floor, its front turned a little out; the toes are three soft beans
      // that bulge out of the front edge and the top of the foot (never under it), a soft crease between each, unioned with a small blend
      const fwd = [Math.cos(turn * sd), Math.sin(turn * sd)], lat = [-fwd[1], fwd[0]], pc0 = [px + 0.05 * fwd[0], y + 0.05 * fwd[1]];
      const pawF = frameOf([pc0[0], pc0[1], pawR[2]], Rz(turn * sd)), paw = (x, yy, z) => { const q = toLocal(pawF, x, yy, z); return sdEllipsoid(q[0], q[1], q[2], pawR[0], pawR[1], pawR[2]); };
      const toes = [];
      for (let i = 0; i < nToe; i++) { const a = (i - (nToe - 1) / 2) * 0.58, reach = pawR[0] * rig["toe-reach"] * Math.cos(a * 0.6), side = pawR[1] * 0.78 * Math.sin(a * 1.1) * 1.25, big = i === (nToe - 1) / 2 ? 1.12 : 1; toes.push({ c: [pc0[0] + fwd[0] * reach + lat[0] * side, pc0[1] + fwd[1] * reach + lat[1] * side, tr[2] * 1.05 + 0.02], r: [tr[0] * big, tr[1] * big, tr[2] * big], R: Rz((turn + a * 0.5) * sd) }); }
      const toeF = toes.map((t) => ({ f: frameOf(t.c, t.R), r: t.r }));
      const dToes = (x, yy, z) => { let d = 1e9; for (const t of toeF) { const q = toLocal(t.f, x, yy, z); d = Math.min(d, sdEllipsoid(q[0], q[1], q[2], t.r[0], t.r[1], t.r[2])); } return d; };
      const dLeg = (x, yy, z) => { let d = sdRoundCone(x, yy, z, top[0], top[1], top[2], ank[0], ank[1], ank[2], legR * 1.08, legR * 0.95); d = uRound(d, sh(x, yy, z), 0.12); d = uRound(d, paw(x, yy, z), 0.16); return sMin(d, dToes(x, yy, z), 0.022); };
      legs.push({ fore, side: sd, toes, dToes, dPaw: paw, d: bounded([cx, y, 0.55], 0.8, 0.2, dLeg) });
    }
    const dTorso = (x, y, z) => uRound(dC(x, y, z), dP(x, y, z), 0.25);
    dBody = (x, y, z) => { let d = dTorso(x, y, z); for (const l of legs) d = uRound(d, l.d(x, y, z), uB); return d; };
    // the leaf fan: one root on K's crown, each leaf a thin ellipsoid whose face looks forward (plan 2.7)
    const cr0 = rig.crest, leaves = cr0.leaves.map(([yoff, len, wid, rollDeg]) => {
      const a = rad(rollDeg), dir = [0.08, Math.sin(a), Math.cos(a)], dl = norm3(dir), across = [0, Math.cos(a), -Math.sin(a)], base = [cr0.root[0], cr0.root[1] + yoff * 0.25, cr0.root[2]];
      const c = [base[0] + dl[0] * len / 2, base[1] + dl[1] * len / 2, base[2] + dl[2] * len / 2], f = { c, ax: dl, aw: across, an: norm3([across[1] * dl[2] - across[2] * dl[1], across[2] * dl[0] - across[0] * dl[2], across[0] * dl[1] - across[1] * dl[0]]) };
      return { c, len, wid, thick: cr0.thick, f };
    });
    const dLeaf = (l) => (x, y, z) => { const X = x - l.c[0], Y = y - l.c[1], Z = z - l.c[2], f = l.f, u = X * f.ax[0] + Y * f.ax[1] + Z * f.ax[2], v = X * f.aw[0] + Y * f.aw[1] + Z * f.aw[2], w = X * f.an[0] + Y * f.an[1] + Z * f.an[2]; const t = clamp(u / (l.len / 2), -1, 1), taper = 0.18 + 0.82 * Math.sqrt(Math.max(0, 1 - t * t)) ** 0.8; return sdEllipsoid(u, v, w, l.len / 2, (l.wid / 2) * Math.max(taper, 0.2), l.thick / 2) * 0.9; };
    const dLeaves = leaves.map(dLeaf);
    const dCrestLocal = (x, y, z) => { let d = 1e9; for (const f of dLeaves) d = Math.min(d, f(x, y, z)); return d; };
    const dCrest = (x, y, z) => { const q = toLocal(hf, x, y, z); return dCrestLocal(q[0], q[1], q[2]); };
    const crestB = bounded(kc, 1.3, 0.2, dCrest), dCrestB = (x, y, z) => crestB(x, y, z);
    parts.chest = dC; parts.legs = legs; parts.crest = dCrestB; extra = { chest: { c: cc, r: cr }, pelvis: { c: pc, r: pr }, zBack: zb, legs, leaves };
    const dNoHead = (x, y, z) => { const b = dBody(x, y, z); return b; };
    const dHeadBody = (x, y, z) => { const hb = Math.sqrt((x - headBound[0][0]) ** 2 + (y - headBound[0][1]) ** 2 + (z - headBound[0][2]) ** 2) - headBound[1], dh = hb > 0.35 ? hb : dHeadW(x, y, z); return uRound(dh, dNoHead(x, y, z), rig["union-neck"]); };
    parts.head = dHeadW;
    
    bounds = { lo: [-2.3, -1.1, -0.02], hi: [1.2, 1.1, S + 1.0] };
    // the round union with the crest: the crest is a separate small part rooted in the head (smooth, small k)
    dAll = (x, y, z) => { const d = dHeadBody(x, y, z), c = dCrestB(x, y, z); return sMin(d, c, 0.06); };
    parts.all = dAll; parts.core = dHeadBody;
    regionOf = (x, y, z) => {
      if (dCrestB(x, y, z) < 0.012 && dCrestB(x, y, z) < dHeadW(x, y, z)) return "crest";
      if (z < 0.4) for (const l of legs) { const dt = l.dToes(x, y, z); if (dt < 0.014 && dt <= l.dPaw(x, y, z) + 0.004) return "toe"; }
      const dh = dHeadW(x, y, z), db = dNoHead(x, y, z);
      return dh <= db + 0.02 ? "head" : "body";
    };
    headWeight = (x, y, z) => sstep(0.05, -0.05, dHeadW(x, y, z) - dNoHead(x, y, z));
  } else if (plan === "D") {
    const nS = rig.segments, Lk = body.length / 1.6, T = body.thick, scaleR = T / 2 / rig["seg-radius"][0], rr = rig["seg-radius"].map((v) => v * scaleR), segs = [];
    // the line of action rises from the tail into the head: segments differ by 15 to 35 %, each one's top is higher than the next one back, the first runs under the head
    let xs = rig["seg-x0"];
    for (let i = 0; i < nS; i++) { const r = rr[i], c = [xs, 0, rig.skirt[2] * 1.5 + r * 0.95], rx = rig["seg-rx"] * Lk * (r / rr[0]) ** 0.5; segs.push(ell(c, [rx, r, r])); segs[i].c = c; segs[i].r = r; if (i + 1 < nS) xs -= (rx + rig["seg-rx"] * Lk * (rr[i + 1] / rr[0]) ** 0.5) * rig["seg-overlap"]; }
    const sk = rig.skirt, skC = [rig["skirt-x"], 0, sk[2]], skR = [sk[0] * Lk, (T / 2) * (1 + (body.skirt - 1) * 0.6), sk[2]];
    const dSkirt = ell(skC, skR);
    const dBodyD = (x, y, z) => { let d = segs[0](x, y, z); for (let i = 1; i < nS; i++) d = uRound(d, segs[i](x, y, z), 0.05); return uRound(d, dSkirt(x, y, z), rig.union); };
    // antennae: thin stalks with ball tips, rooted on the top of K, each a capsule chain (analytic, so they stay thin at 304)
    const at = rig["antenna-thick"], ants = rig.antennae.map(([ox, oy, oz, dx, dy, dz, bx, by, bz]) => {
      // a curved stalk: five points along root + dir L t + bend L t^2, tapering from the root collar to a ball tip
      const root = fromLocal(hf, [ox, oy, oz]), d = dirFromLocal(hf, norm3([dx, dy, dz])), bend = dirFromLocal(hf, [bx, by, bz]), L = body.antenna;
      const pts = [0, 0.25, 0.5, 0.75, 1].map((t) => [root[0] + d[0] * L * t + bend[0] * L * t * t, root[1] + d[1] * L * t + bend[1] * L * t * t, root[2] + d[2] * L * t + bend[2] * L * t * t]);
      return { root, pts };
    });
    const dAnt = (x, y, z) => { let d = 1e9; for (const a of ants) { for (let i = 0; i < 4; i++) { const k = 1 - i * 0.18; d = Math.min(d, sdCapsule(x, y, z, a.pts[i][0], a.pts[i][1], a.pts[i][2], a.pts[i + 1][0], a.pts[i + 1][1], a.pts[i + 1][2], (at / 2) * k * 1.25)); } const t = a.pts[4]; d = Math.min(d, Math.sqrt((x - t[0]) ** 2 + (y - t[1]) ** 2 + (z - t[2]) ** 2) - (at / 2) * rig["antenna-ball"], Math.sqrt((x - a.root[0]) ** 2 + (y - a.root[1]) ** 2 + (z - a.root[2]) ** 2) - rig["antenna-collar"]); } return d; };
    const antC = ants[0].root, antB = bounded(kc, body.antenna + 0.8, 0.1, dAnt);
    headWeight = (x, y, z) => sstep(0.04, -0.04, dHeadW(x, y, z) - dBodyD(x, y, z));
    regionOf = (x, y, z) => { if (dAnt(x, y, z) < 0.01) return "ant"; const dh = dHeadW(x, y, z), db = dBodyD(x, y, z); return dh <= db + 0.015 ? "head" : "seg"; };
    dAll = (x, y, z) => { const hb = Math.sqrt((x - kc[0]) ** 2 + (y - kc[1]) ** 2 + (z - kc[2]) ** 2) - (0.5 * Math.max(W, head.D) + 0.7), dh = hb > 0.3 ? hb : dHeadW(x, y, z); let d = uRound(dh, dBodyD(x, y, z), rig["neck-union"]); return sMin(d, antB(x, y, z), 0.03); };
    parts.core = (x, y, z) => { const hb = Math.sqrt((x - kc[0]) ** 2 + (y - kc[1]) ** 2 + (z - kc[2]) ** 2) - (0.5 * Math.max(W, head.D) + 0.7), dh = hb > 0.3 ? hb : dHeadW(x, y, z); return uRound(dh, dBodyD(x, y, z), rig["neck-union"]); };
    parts.head = dHeadW; parts.segs = segs; parts.ants = ants; parts.all = dAll; extra = { segs, ants, skirt: { c: skC, r: skR } };
    bounds = { lo: [-3.0, -1.0, -0.02], hi: [1.2, 1.0, S + 1.2 + body.antenna] };
  } else throw new Error(`plan ${plan} is not built in chunk 1`);
  return { plan, house, kinds, fp, head, hf, kc, S, W, pose, d: dAll, regionOf, headWeight, parts, extra, bounds, floorZ: 0, body };
}
