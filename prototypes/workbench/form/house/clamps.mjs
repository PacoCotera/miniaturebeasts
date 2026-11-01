// The face clamps (plan 2.1 step 3). Interaction rules only: one gene alone never needs one, because its band is already inside the house.
// Every clamp is a strictly monotone compression (never a hard stop), so two different genomes never collapse into one picture. The order, the
// limits and whether each is on are all read from the house file. A face-parameter record `fp` is what the band map gives, in the bands' own units:
//   eW (E / Wf), WoverH, spacing (in E), eyeDrop (H), lid (E), noseW (W), noseDrop (E), gap (H), carriage (deg), hs (H/S) ...
import { softClamp, clampsInOrder, bandOf, valueAt, tAt } from "./house.mjs";


// E in H units, and the vertical stack of the face below the eye line (nose centre, then the nose base, then the gap to the mouth)
export const eyeInH = (fp) => fp.eW * fp.WoverH;
export const noseHalfH = (fp) => 0.5 * fp.noseAspect * fp.noseW * fp.WoverH; // in H (the aspect is a rig number of the house file)
export const faceStack = (fp) => fp.noseDrop * eyeInH(fp) + noseHalfH(fp) + fp.gap; // eye line to mouth line, in H

export function clampEyeFit(fp, c, ctx) {
  // the iris' outer edges, (spacing + 1) E, stay within the share of the head's width (0.9 W): the eyes never reach the head's sides
  // the width at the eye line is the skull's W widened by the cheek there (rig face cheek-eye): the iris' outer edges stay within the share of that
  const k = 1 + (ctx?.house?.rig?.[ctx?.plan]?.["cheek-eye"] ?? ctx?.house?.rig?.face?.["cheek-eye"] ?? 0), e = fp.eW, hi = (c.params["spacing-share-of-width"] * k) / e - 1, sb = ctx?.house ? bandOf(ctx.house, ctx.plan, "form.eye-spacing") : { lo: 1.5, hi: 2.2 };
  return { ...fp, spacing: softClamp(fp.spacing, null, hi, 0.15 * (sb.hi - sb.lo)) };
}
export function clampNoseFit(fp, c, ctx) {
  const kind = ctx?.kinds?.nose, hiE = (kind && c.params["by-kind"]?.[kind]) ?? c.params["max-nose-over-E"]; // R4 by kind: a skin mound up to 1.1 E, a dark pad 0.6 E, a bump 0.35 E
  const hi = hiE * fp.eW;
  return { ...fp, noseW: softClamp(fp.noseW, null, hi, 0.15 * hi) };
}
// R4-forehead: the eye centre drops until crown to eye top is at least min-forehead (a big eye set high cannot eat the dome)
export function clampForehead(fp, c) {
  const lo = c.params["min-forehead-H"] + 0.5 * eyeInH(fp);
  return { ...fp, eyeDrop: softClamp(fp.eyeDrop, lo, null, 0.15 * 0.22) };
}
// the far eye stays at least `inside-H` inside the head's outline in the stand view, and the nose never touches the far eye's ring. The order the art director
// ruled (house clamps.far-eye.params.order): the face yaw first, toward the viewer, down to its floor (a pose change, not a genome change); then the spacing, down to
// its floor; then E, inside its own band; the ring last, down to its floor (0.15 E on a dark body, 0.10 E on a light one). Each stage takes the largest value that
// holds (a search on the stage's own gene) and stops there: min(v, that), continuous and weakly monotone (the floors hold values together; the ladder's later
// stages and the pose tell them apart). If all four cannot hold it, the face is built
// as it is and flagged (`farOutside`): the clamp never hides it. The type specimen never needs this clamp. ctx.measureAt(fp, yawFace) -> { inside, noseGap }.
export function clampFarEye(fp, c, ctx) {
  const { house, plan, measureAt } = ctx; if (!measureAt) return fp;
  const P = c.params, tgt = P["inside-H"], gmin = P["nose-gap-H"] ?? 0, yawNow = ctx.yaw;
  // the slack of a state: the worse of the two margins (>= 0 holds). A stage never takes a value that makes the worse margin worse: the far eye's margin wants the eyes
  // closer, the nose's wants them further apart, so a stage looks for the best value in its range, not simply the lowest
  const slack = (f, yaw) => { const m = measureAt(f, yaw); return Math.min(m.inside - tgt, m.noseGap - gmin); };
  if (slack(fp, yawNow) >= -1e-9) return fp;
  let f = { ...fp }, yaw = yawNow, cur = slack(f, yaw);
  const stage = (key, floor, w) => {
    const v = f[key]; if (!(v > floor)) return false;
    const xs = Array.from({ length: 12 }, (_, i) => floor + ((v - floor) * i) / 11), ss = xs.map((x) => slack({ ...f, [key]: x }, yaw));
    let hold = -1; for (let i = 11; i >= 0; i--) if (ss[i] >= -1e-9) { hold = i; break; }
    if (hold >= 0) { // the largest value that holds, refined by bisection between it and the next one up, then a soft compression to it
      let a = xs[hold], b = xs[Math.min(11, hold + 1)]; if (hold < 11) for (let i = 0; i < 8; i++) { const m = (a + b) / 2; if (slack({ ...f, [key]: m }, yaw) >= -1e-9) a = m; else b = m; }
      f = { ...f, [key]: Math.max(floor, Math.min(v, a)) }; cur = slack(f, yaw); return cur >= -1e-9;
    }
    let bi = 0; for (let i = 1; i < 12; i++) if (ss[i] > ss[bi]) bi = i;
    if (ss[bi] > cur + 1e-6) { f = { ...f, [key]: Math.max(floor, Math.min(v, xs[bi])) }; cur = slack(f, yaw); }
    return false;
  };
  for (const step of P.order) {
    if (step === "face-yaw") {
      const fl = P["yaw-floor-deg"], ys = []; for (let y = yaw - 2.5; ys.length === 0 || ys[ys.length - 1] > fl; y -= 2.5) ys.push(Math.max(fl, y)); if (yaw <= fl) continue;
      let best = null; for (const y of ys) { const sl = slack(f, y); if (sl >= -1e-9) { return { ...f, faceYaw: y }; } if (!best || sl > best.sl) best = { y, sl }; }
      if (best.sl > cur + 1e-6) { yaw = best.y; cur = best.sl; }
    } else if (step === "spacing") { const sb = bandOf(house, plan, "form.eye-spacing"); if (stage("spacing", P["spacing-floor-E"]?.[plan] ?? sb.lo, 0.15 * (sb.hi - sb.lo))) return { ...f, faceYaw: yaw }; }
    else if (step === "eye-size") { const eb = bandOf(house, plan, "form.eye-size"); if (stage("eW", eb.lo, 0.15 * (eb.hi - eb.lo))) return { ...f, faceYaw: yaw }; }
    else if (step === "ring") { const rb = bandOf(house, plan, "form.eye-ring"); if (stage("ring", ctx.dark ? P["ring-floor-E"].dark : P["ring-floor-E"].light, 0.15 * (rb.hi - rb.lo))) return { ...f, faceYaw: yaw }; }
  }
  return { ...f, faceYaw: yaw, farOutside: true };
}
export function clampFaceStack(fp, c, ctx) {
  const lim = c.params["max-eye-to-mouth-H"], w = c.params["soft-width"] * lim;
  const stack = faceStack(fp);
  if (stack <= lim - w) return fp;
  // the gap's floor by nose kind, in E (R-nose-mouth): the gap compresses first, down to the floor, then the nose drop
  const fl = (ctx?.kinds?.nose && c.params["gap-floor-E"]?.[ctx.kinds.nose]) ?? 0, floorGap = fl * eyeInH(fp);
  const fixed = fp.noseDrop * eyeInH(fp) + noseHalfH(fp), room = lim - fixed, out = { ...fp };
  if (room - floorGap > w) out.gap = softClamp(fp.gap, floorGap, room, Math.min(w, (room - floorGap) * 0.5));
  else {
    out.gap = Math.max(floorGap, Math.min(fp.gap, floorGap + 0.002)); const target = softClamp(stack - fp.gap + out.gap, null, lim, w), k = target / (stack - fp.gap + out.gap);
    out.noseDrop = fp.noseDrop * k;
  }
  return out;
}
// a heavy lid raises the floor of carriage, continuously in the lid (so the floor is 0 up to lid-over-E and 5 degrees from 0.1 above it)
export function clampCarriageLid(fp, c) {
  const over = c.params["lid-over-E"], floor = c.params["min-carriage-deg"] * Math.min(1, Math.max(0, (fp.lid - over) / 0.1));
  if (floor <= 0) return fp;
  return { ...fp, carriage: softClamp(fp.carriage, floor, null, 0.15 * 15) };
}
// the eye share: E grows within its own band first, then the head within its band; a partial correction (gain < 1) keeps it strictly monotone.
// shareOf(fp) is the plan's eye share on the rig (E over the root of the core silhouette's area): supplied by the expression.
export function clampEyeShare(fp, c, ctx) {
  const { house, plan, shareOf, range } = ctx; if (!range || !shareOf) return fp;
  const lo = range[0], hi = range[1], gain = c.params.gain ?? 0.8, s = shareOf(fp);
  const eb = bandOf(house, plan, "form.eye-size"), hb = bandOf(house, plan, "form.head"), out = { ...fp };
  if (hi !== null && c.params["two-sided"] && s > hi) { // over the band: E shrinks within its own band (partial gain keeps it strictly monotone)
    out.eW = Math.max(eb.lo + 1e-9 * (eb.hi - eb.lo), fp.eW - gain * (fp.eW - (fp.eW * hi) / s)); return out;
  }
  if (lo === null || s >= lo) return fp;
  // the share is proportional to E: the E that would reach the floor, and how far past the band's top that would be
  const need = fp.eW * lo / s, room = eb.hi - fp.eW;
  if (need <= eb.hi) out.eW = fp.eW + gain * (need - fp.eW);
  else {
    out.eW = fp.eW + gain * room; // E goes as far as its own band lets it, then the head makes up the rest, from the excess alone (continuous at the boundary)
    if (hb) { const key = plan === "D" ? "ht" : "hs"; out[key] = softClamp(fp[key] * (1 + gain * (need / eb.hi - 1)), null, hb.hi, c.params["soft-width"] * (hb.hi - hb.lo)); }
  }
  out.eW = Math.min(out.eW, eb.hi - 1e-9 * (eb.hi - eb.lo));
  return out;
}

const CLAMPS = { "eye-fit": clampEyeFit, "nose-fit": clampNoseFit, forehead: clampForehead, "far-eye": clampFarEye, "face-stack": clampFaceStack, "carriage-lid": clampCarriageLid, "eye-share": clampEyeShare };
export function applyClamps(house, plan, fp, ctx = {}) {
  const log = []; let cur = fp;
  for (const c of clampsInOrder(house)) {
    const fn = CLAMPS[c.id]; if (!c.on || !fn) continue;
    const before = cur; cur = fn(cur, c, { house, plan, ...ctx });
    const moved = Object.keys(cur).filter((k) => cur[k] !== before[k]);
    if (moved.length) log.push({ clamp: c.id, moved: moved.map((k) => `${k} ${before[k]?.toFixed?.(4) ?? before[k]} -> ${cur[k]?.toFixed?.(4) ?? cur[k]}`) });
  }
  return { fp: cur, log };
}

// ---- from t to values and back -------------------------------------------------------------------------------------------
// the face-parameter record of a plan from a map of gene t's (genes the plan lacks are left out)
const FP = { hs: "form.head", WoverH: "form.head-width", DoverH: "form.head-depth", cheek: "form.cheek", eW: "form.eye-size", eyeDrop: "form.eye-height", spacing: "form.eye-spacing", pupil: "form.pupil", lid: "form.lid", ring: "form.eye-ring", projection: "form.muzzle", muzzleW: "form.muzzle-width", muzzleH: "form.muzzle-height", noseW: "form.nose", noseDrop: "form.nose-drop", mouthW: "form.mouth-width", upturn: "form.mouth-upturn", gap: "form.mouth-gap", carriage: "form.carriage" };
export const FP_GENES = FP;
export function faceParams(house, plan, tOf) {
  const fp = {};
  for (const [k, g] of Object.entries(FP)) { const b = house.resolved[plan][g]; if (b) fp[k] = valueAt(b, tOf(g)); }
  fp.noseAspect = house.rig.face["nose-aspect"];
  if (plan === "D") { const b = house.resolved.D["form.head"]; fp.ht = valueAt(b, tOf("form.head")); delete fp.hs; }
  return fp;
}
export const tOfFace = (house, plan, fp) => { const o = {}; for (const [k, g] of Object.entries(FP)) { const b = house.resolved[plan][g]; if (b && fp[k] !== undefined) o[g] = tAt(b, fp[k]); } return o; };
