// The measure registry (plan 1.6): every quantity a house rule can name. A measure is a pure function of the measured rig `r` (built by the
// expression, in H units) and returns a number, or undefined when the rig does not carry what it needs (the rule then reads "not measured").
// A new rule on an existing measure is data; a new measure is one function here.
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const ratio = (a, b) => (num(a) !== undefined && num(b) ? a / b : undefined);

export const MEASURES = {
  "H/S": (r) => ratio(r.H, r.S),
  "H/T": (r) => ratio(r.H, r.T),
  "W/H": (r) => ratio(r.W, r.H),
  "D/H": (r) => ratio(r.D, r.H),
  "E/Wf": (r) => ratio(r.E, r.Wf ?? r.W),
  "E/H": (r) => ratio(r.E, r.H),
  "eye-drop/H": (r) => ratio(r.eyeDrop, 1),
  "spacing/E": (r) => num(r.spacing),
  "pupil/E": (r) => num(r.pupil),
  "lid/E": (r) => num(r.lid),
  "ring/E": (r) => num(r.ring),
  "forehead/H": (r) => (num(r.eyeDrop) !== undefined && num(r.E) !== undefined && num(r.H) ? r.eyeDrop - 0.5 * r.E / r.H : undefined),
  "eye-to-mouth/H": (r) => ratio(r.mouthDrop, 1),
  "nose-w/E": (r) => ratio(r.noseW, r.E),
  "nose-w/W": (r) => ratio(r.noseW, r.W),
  "nose-drop/E": (r) => ratio(r.noseDrop, r.E),
  "mouth-w/E": (r) => ratio(r.mouthW, r.E),
  "mouth-gap/H": (r) => ratio(r.gap, r.H),
  upturn: (r) => num(r.upturn),
  "projection/H": (r) => ratio(r.projection, r.H),
  "chin-up-deg": (r) => num(r.pitch),
  "back-gap/H": (r) => ratio(r.backGap, r.H),
  "yaw-body": (r) => num(r.yawBody),
  "yaw-face": (r) => num(r.yawFace),
  "yaw-head": (r) => num(r.yawHead),
  roll: (r) => num(r.roll),
  "gaze-offset/E": (r) => num(r.gazeOffset),
  "catch-disagree-px": (r) => num(r.catchDisagreePx),
  "eye-size-diff": (r) => num(r.eyeSizeDiff),
  "eye-share": (r) => num(r.eyeShare),
  "face-share": (r) => num(r.faceShare),
  "iris-px-48": (r) => num(r.px?.[48]?.iris),
  "pupil-px-48": (r) => num(r.px?.[48]?.pupil),
  "iris-px-96": (r) => num(r.px?.[96]?.iris),
  "nose-px-96": (r) => num(r.px?.[96]?.nose),
  "mouth-px-96": (r) => num(r.px?.[96]?.mouth),
  "head-breadth/H": (r) => num(r.headBreadth),
  "far-eye-inside/H": (r) => num(r.farEyeInside),
  "chin-overhang/H": (r) => num(r.chinOverhang),
  "nape-step/H": (r) => num(r.napeStep),
  "back-70/S": (r) => num(r.back70),
  "back-85/S": (r) => num(r.back85),
  "back-95/S": (r) => num(r.back95),
  "nose-mouth/E": (r) => ratio(r.gap, r.E),
  "nose-far-eye/H": (r) => num(r.noseFarEye),
  "features-pushed": (r) => num(r.featuresPushed),
  "sick-cues": (r) => num(r.sickCues),
  "face-contrast-ratio": (r) => num(r.faceContrast),
  "shade-ratio": (r) => num(r.shadeRatio),
};
export const measureAll = (r) => { const o = {}; for (const [k, f] of Object.entries(MEASURES)) { const v = f(r); if (v !== undefined) o[k] = v; } return o; };

// the sickness cues of R18 (soft cues only; the hard ones are forbidden outright elsewhere): lid > 0.2 E, mouth upturn < 0.05
export function sickCues(r, { upright = false } = {}) {
  let n = 0;
  if (num(r.lid) !== undefined && r.lid > 0.2) n++;
  if (num(r.upturn) !== undefined && r.upturn < 0.05) n++;
  if (upright && num(r.earDroop) !== undefined && (r.earDroop > 0.5 || r.earTilt > 20)) n++;
  return n;
}

// owner O1: how many features sit in the top 15 % of their band. `ts` is the shown t of each continuous gene of the individual that the house names as a feature.
export const featuresPushed = (ts, share = 0.15) => Object.values(ts).filter((t) => t >= 1 - share).length;
