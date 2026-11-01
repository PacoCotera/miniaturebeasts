// The expression (plan 2.1): gene -> band map -> soft clamp -> head, face -> body -> pose solve -> a scene. A specimen is a frame's type specimen:
// kinds and a t for each open gene (genes it does not name sit at mid-band). Colour is the species' look, kept apart from the frame (chunk 4 turns it into pigments).
import { valueAt, bandOf } from "../form/house/house.mjs";
import { faceParams, applyClamps, FP_GENES } from "../form/house/clamps.mjs";
import { measureAll, featuresPushed } from "../form/house/measures.mjs";
import { solvePose } from "./pose.mjs";
import { buildScene } from "./scene.mjs";
import { coarse } from "./render.mjs";
import { headWorld, farEyeInside, headBreadth } from "./headview.mjs";

export const BODY_GENES = { A: [], D: ["form.body-length", "form.rise", "form.skirt", "form.antenna"] };

export function express(house, specimen, { t = {}, seed = specimen.seed ?? specimen.id, side = specimen.side ?? 1, clamps = true, shareClamp = false, camera = null } = {}) {
  const plan = specimen.plan, tOf = (g) => t[g] ?? specimen.t[g] ?? 0.5;
  let fp = faceParams(house, plan, tOf), log = [];
  const rule = house.rules.find((r) => r.id === "R1-face"), pitch = house.solver.camera["pitch-deg"];
  const poseOf = (f, pick = specimen.pick) => solvePose(house, plan, { carriage: f.carriage ?? 0, seed, side, pick });
  const farOf = (f, pick) => { const p = poseOf(f, pick); return farEyeInside(headWorld(house, plan, specimen.kinds, f, p), { yaw: p.cameraYaw, pitch }); };
  if (clamps) {
    const shareOf = (f) => { const pose = poseOf(f), sc = buildScene(house, { plan, kinds: specimen.kinds, fp: f, body: bodyOf(house, plan, tOf, f), pose }); return eyeShare(sc, pose); };
    const r = applyClamps(house, plan, fp, { kinds: specimen.kinds, farInside: (f) => farOf(f), ...(shareClamp ? { shareOf, range: rule.plans[plan] } : {}) });
    fp = r.fp; log = r.log;
  }
  // the far-eye clamp's second step: if spacing alone cannot keep the far eye inside, the face yaw gives way within its band
  let pick = { ...specimen.pick };
  if (fp.turnFace) { const fl = house.rules.find((q) => q.id === "R6-face-yaw").plans[plan], base = poseOf(fp).yawFace; for (let y = base; y > fl[0] + 2.5; y -= 2.5) { const u = (y - fl[0]) / (fl[1] - fl[0]); pick = { ...specimen.pick, "face-yaw": Math.max(0, (u - 1 / 6) / (2 / 3)) }; log.push({ clamp: "far-eye", moved: [`face yaw -> ${y.toFixed(1)}`] }); if (farOf(fp, pick) >= house.clamps.find((q) => q.id === "far-eye").params["inside-H"]) break; }
    if (farOf(fp, pick) < house.clamps.find((q) => q.id === "far-eye").params["inside-H"]) { pick = { ...specimen.pick }; log.push({ clamp: "far-eye", moved: ["the far eye cannot be held inside by spacing or by the face yaw: left as built, reported"] }); } }
  const body = bodyOf(house, plan, tOf, fp), pose = poseOf(fp, pick);
  const scene = buildScene(house, { plan, kinds: specimen.kinds, fp, body, pose });
  const hw = headWorld(house, plan, specimen.kinds, fp, pose), cam = { yaw: pose.cameraYaw, pitch };
  // the rig's measures (H units) and the plan's rule inputs
  const hm = scene.head.measures;
  const rigm = { ...hm, S: scene.S, Wf: hm.W, yawBody: pose.yawBody, yawFace: pose.yawFace, yawHead: pose.yawHead, roll: Math.abs(pose.roll), pitch: pose.pitch, headBreadth: headBreadth(hw, cam), farEyeInside: farEyeInside(hw, cam) };
  if (plan === "D") rigm.T = body.thick; if (plan === "A") rigm.backGap = scene.S - scene.extra.zBack;
  rigm.eyeShare = eyeShare(scene, pose);
  const ts = {}; for (const g of Object.values(FP_GENES)) if (house.resolved[plan][g]) ts[g] = tOf(g);
  rigm.featuresPushed = featuresPushed(ts);
  return { specimen, plan, fp, log, body, pose, pick, scene, rig: rigm, measured: measureAll(rigm), tOf };
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
