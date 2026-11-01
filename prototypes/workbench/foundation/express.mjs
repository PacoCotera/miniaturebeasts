// The expression (plan 2.1): gene -> band map -> soft clamp -> head, face -> body -> pose solve -> a scene. A specimen is a frame's type specimen:
// kinds and a t for each open gene (genes it does not name sit at mid-band). Colour is the species' look, kept apart from the frame (chunk 4 turns it into pigments).
import { valueAt, bandOf } from "../form/house/house.mjs";
import { faceParams, applyClamps, FP_GENES } from "../form/house/clamps.mjs";
import { measureAll, featuresPushed } from "../form/house/measures.mjs";
import { solvePose } from "./pose.mjs";
import { buildScene } from "./scene.mjs";
import { coarse } from "./render.mjs";

export const BODY_GENES = { A: [], D: ["form.body-length", "form.rise", "form.skirt", "form.antenna"] };

export function express(house, specimen, { t = {}, seed = specimen.seed ?? specimen.id, side = specimen.side ?? 1, clamps = true, shareClamp = false, camera = null } = {}) {
  const plan = specimen.plan, tOf = (g) => t[g] ?? specimen.t[g] ?? 0.5;
  let fp = faceParams(house, plan, tOf), log = [];
  const rule = house.rules.find((r) => r.id === "R1-face");
  if (clamps) {
    const shareOf = (f) => {
      const pose = solvePose(house, plan, { carriage: f.carriage, seed, side, pick: specimen.pick }), sc = buildScene(house, { plan, kinds: specimen.kinds, fp: f, body: bodyOf(house, plan, tOf, f), pose });
      return eyeShare(sc, pose);
    };
    const r = applyClamps(house, plan, fp, shareClamp ? { shareOf, range: rule.plans[plan] } : {});
    fp = r.fp; log = r.log;
  }
  const body = bodyOf(house, plan, tOf, fp), pose = solvePose(house, plan, { carriage: fp.carriage ?? 0, seed, side, pick: specimen.pick });
  const scene = buildScene(house, { plan, kinds: specimen.kinds, fp, body, pose });
  // the rig's measures (H units) and the plan's rule inputs
  const hm = scene.head.measures, hs = plan === "D" ? undefined : fp.hs;
  const rigm = { ...hm, S: scene.S, Wf: hm.W, yawBody: pose.yawBody, yawFace: pose.yawFace, yawHead: pose.yawHead, roll: Math.abs(pose.roll), pitch: pose.pitch };
  if (plan === "D") rigm.T = body.thick; if (plan === "A") rigm.backGap = scene.S - scene.extra.zBack;
  rigm.eyeShare = eyeShare(scene, pose);
  const ts = {}; for (const g of Object.values(FP_GENES)) if (house.resolved[plan][g]) ts[g] = tOf(g);
  rigm.featuresPushed = featuresPushed(ts);
  return { specimen, plan, fp, log, body, pose, scene, rig: rigm, measured: measureAll(rigm), tOf };
}

function bodyOf(house, plan, tOf, fp) {
  if (plan !== "D") return {};
  const v = (g) => valueAt(bandOf(house, plan, g), tOf(g));
  return { length: v("form.body-length"), thick: fp ? 1 / fp.ht : 0.74, rise: v("form.rise"), skirt: v("form.skirt"), antenna: v("form.antenna") };
}

// the eye share (plan 2.6): E over the root of the core silhouette's area, in the camera's own orthographic view; coarse rays, scale-free
export function eyeShare(scene, pose) {
  const c = coarse(scene, { yaw: pose.cameraYaw, pitch: scene.house.solver.camera["pitch-deg"] }, { n: 90, core: true });
  return scene.head.measures.E / Math.sqrt(c.area);
}
