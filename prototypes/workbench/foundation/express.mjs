// The expression (plan 2.1): gene -> band map -> soft clamp -> head, face -> body -> pose solve -> a scene. A specimen is a frame's type specimen:
// kinds and a t for each open gene (genes it does not name sit at mid-band). Colour is the species' look, kept apart from the frame (chunk 4 turns it into pigments).
import { valueAt, bandOf } from "../form/house/house.mjs";
import { faceParams, applyClamps, FP_GENES } from "../form/house/clamps.mjs";
import { measureAll, featuresPushed } from "../form/house/measures.mjs";
import { solvePose } from "./pose.mjs";
import { buildScene } from "./scene.mjs";
import { coarse } from "./render.mjs";
import { headWorld, farEyeInside, headBreadth, noseFarEyeGap } from "./headview.mjs";
import { chinOverhang, napeDip } from "./profile.mjs";

export const BODY_GENES = { A: [], D: ["form.body-length", "form.rise", "form.skirt", "form.antenna"] };

// the species' own rig numbers (the specimen's rig block) laid over the house's plan and face blocks: a species overrides a number, never adds one
export function withRig(house, rig = {}) {
  const over = Object.keys(rig); if (!over.length) return house;
  const r = { ...house.rig };
  for (const [blk, vals] of Object.entries(rig)) { if (!(blk in house.rig)) throw new Error(`specimen rig: no block ${blk} in the house`); for (const k of Object.keys(vals)) if (!(k in house.rig[blk])) throw new Error(`specimen rig ${blk}.${k}: the house has no such number`); r[blk] = { ...house.rig[blk], ...vals }; }
  return { ...house, rig: r };
}
export function express(house0, specimen, { t = {}, seed = specimen.seed ?? specimen.id, side = specimen.side ?? 1, clamps = true, shareClamp = false, camera = null } = {}) {
  const house = withRig(house0, specimen.rig), plan = specimen.plan, tOf = (g) => t[g] ?? specimen.t[g] ?? 0.5;
  let fp = faceParams(house, plan, tOf), log = [];
  const rule = house.rules.find((r) => r.id === "R1-face"), pitch = house.solver.camera["pitch-deg"];
  const poseOf = (f, faceYaw = null) => solvePose(house, plan, { carriage: f.carriage ?? 0, seed, side, pick: specimen.pick, faceYaw });
  // the stand view's two far-eye checks at a face yaw: the far eye's margin to the outline, and the nose's margin to the far eye's ring
  const measureAt = (f, yaw) => { const p = poseOf(f, yaw), hw = headWorld(house, plan, specimen.kinds, f, p), cam = { yaw: p.cameraYaw, pitch }; return { inside: farEyeInside(hw, cam), noseGap: noseFarEyeGap(hw, cam) }; };
  if (clamps) {
    const shareOf = (f) => { const pose = poseOf(f, f.faceYaw ?? null), sc = buildScene(house, { plan, kinds: specimen.kinds, fp: f, body: bodyOf(house, plan, tOf, f), pose }); return eyeShare(sc, pose); };
    const r = applyClamps(house, plan, fp, { kinds: specimen.kinds, measureAt, yaw: poseOf(fp).yawFace, dark: isDark(specimen.look?.body, house.clamps.find((q) => q.id === "far-eye").params["dark-lit-L"]), ...(shareClamp ? { shareOf, range: rule.plans[plan] } : {}) });
    fp = r.fp; log = r.log;
  }
  const pick = { ...specimen.pick };
  const body = bodyOf(house, plan, tOf, fp), pose = poseOf(fp, fp.faceYaw ?? null);
  const scene = buildScene(house, { plan, kinds: specimen.kinds, fp, body, pose });
  const hw = headWorld(house, plan, specimen.kinds, fp, pose), cam = { yaw: pose.cameraYaw, pitch };
  // the rig's measures (H units) and the plan's rule inputs
  const hm = scene.head.measures;
  const rigm = { ...hm, S: scene.S, Wf: hm.W, yawBody: pose.yawBody, yawFace: pose.yawFace, yawHead: pose.yawHead, roll: Math.abs(pose.roll), pitch: pose.pitch, headBreadth: headBreadth(hw, cam), farEyeInside: farEyeInside(hw, cam), noseFarEye: noseFarEyeGap(hw, cam) };
  if (plan === "D") rigm.T = body.thick; if (plan === "A") { rigm.backGap = scene.S - scene.extra.zBack; rigm.chinOverhang = chinOverhang(scene) ?? undefined; rigm.napeDip = napeDip(scene); }
  rigm.eyeShare = eyeShare(scene, pose);
  const ts = {}; for (const g of Object.values(FP_GENES)) if (house.resolved[plan][g]) ts[g] = tOf(g);
  rigm.featuresPushed = featuresPushed(ts);
  return { specimen, plan, fp, log, body, pose, pick, outside: !!fp.farOutside, scene, rig: rigm, measured: measureAll(rigm), tOf };
}

// the lit body is dark (L* of its albedo at or under the house's limit): the ring may then be wide (a spectacle mark on charcoal)
function isDark(rgb, limit) {
  if (!rgb) return false; const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }, Y = 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]), L = Y > 0.008856 ? 116 * Math.cbrt(Y) - 16 : 903.3 * Y;
  return L <= limit;
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
