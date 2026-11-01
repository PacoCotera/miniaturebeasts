// Dumps what the SDF (foundation/) says about one specimen, as a JSON fixture for the Python port's tests: the face parameters, the pose, the scene's
// numbers, and field samples at fixed points. Read only: nothing in foundation/ or form/ is written.
import { writeFileSync } from "node:fs";
import { loadHouseFile } from "../../form/house/house-file.mjs";
import { loadSpecimens } from "../../foundation/specimens.mjs";
import { express } from "../../foundation/express.mjs";
const [id = "S01", outFile] = process.argv.slice(2);
const house = loadHouseFile(), sp = loadSpecimens(house)[id];
const withClamps = express(house, sp), noClamps = express(house, sp, { clamps: false });
const sc = withClamps.scene, head = sc.head;
// a fixed set of sample points (a small LCG, so the file never changes)
let s = 12345; const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
const pts = Array.from({ length: 400 }, () => [-1.2 + rnd() * 2.0, -0.7 + rnd() * 1.4, -0.7 + rnd() * 1.4]);
const world = Array.from({ length: 400 }, () => [-1.6 + rnd() * 2.2, -0.7 + rnd() * 1.4, rnd() * 2.1]);
const legs = sc.extra.legs;
const out = {
  id, commit: process.env.COMMIT ?? null,
  fp: noClamps.fp, fpClamped: withClamps.fp, clampLog: withClamps.log, kinds: sp.kinds, t: sp.t, look: sp.look,
  S: sc.S, kc: sc.kc, pose: withClamps.pose, W: head.W, D: head.D, geometry: head.geometry,
  M: head.M, K: head.K, nose: { c: head.nose.c, r: head.nose.r, n: head.nose.frame.n, lat: head.nose.frame.lat, up: head.nose.frame.up },
  eyes: head.eyes.map((e) => ({ side: e.side, c: e.c, n: e.n, up: e.up, lat: e.lat, E: e.E, Riris: e.Riris, Reye: e.Reye, pupilR: e.pupilR, Rsock: e.Rsock })),
  mouth: { w: head.mouth.w, z: head.mouth.z, tube: head.mouth.tube, pts: head.mouth.pts },
  chest: sc.extra.chest, pelvis: sc.extra.pelvis, zBack: sc.extra.zBack,
  leaves: sc.extra.leaves.map((l) => ({ c: l.c, len: l.len, wid: l.wid, thick: l.thick, ax: l.f.ax, aw: l.f.aw, an: l.f.an })),
  legs: legs.map((l) => ({ fore: l.fore, side: l.side, toes: l.toes.map((t) => ({ c: t.c, r: t.r })) })),
  samples: {
    headLocal: pts.map((p) => [...p, head.dK(...p), head.dM ? head.dM(...p) : null, head.d0(...p)]),
    world: world.map((p) => [...p, sc.parts.chest(...p), ...legs.map((l) => l.d(...p)), ...legs.map((l) => l.dPaw(...p)), sc.parts.core(...p), sc.legWeight(...p)]),
  },
};
writeFileSync(outFile, JSON.stringify(out));
console.log("wrote", outFile, "clamps moved:", withClamps.log.length);
