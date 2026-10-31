// The round 2 tuning of the ROUND2 numbers (build-brief round 2, "Base forms and tuning"): each entry changes one ROUND2 number by at most
// +-15 % (a camera by at most 10 degrees) to meet a gate, with its reason. The report lists every entry with its before and after.
// Paths read from the form: "front.knots.1.w", "camera.yaw", "hair.flare"; arrays are indexed by position. Round 1's list is TRIAL1 in species-trial.mjs.
export const TUNING = [
  { species: "wickle", path: "front.knots.4.ds", after: 0.5175, why: "trans.slope: the drop-to-plume join's outer slope peaked at .689 against .6; a longer top segment (+15 %) brings it to .587" },
  { species: "curlop", path: "branches.1.root.angle", after: 160, why: "limbs.reach: the palms' target was .68 U from the arm's root and the arm is .64 U long; +14 % (140 to 160 degrees) puts the root nearer the midline" },
  { species: "loika", path: "face.sigma", after: 1.075, why: "face.eyes: the anchor nearer the head's centre (sigma 1.26 to 1.075, -14.7 %) so the cast wraps less: eye separation 0.90 of 2 e_x (gate 0.90); e_x stays .36 so the corners hold the gap guard" },
  { species: "rupar", path: "face.eyes.ex", after: 0.12, why: "face.eyes: the cast eyes were 27 % nearer than 2 e_x on the narrow head (gate 10 %): -7.7 % (the corners need e_x >= .117 for the gap guard at eye-size 1.25)" },
  { species: "rupar", path: "face.sigma", after: 1.7, why: "same: the anchor at the head's centre (1.98 to 1.70, -14 %)" },
  { species: "wickle", path: "face.mouth.w", after: 0.069, why: "face.mouth: the smile's ink was 8 px long at 304 (gate 10 px): +15 %" },
  { species: "wickle", path: "face.mouth.t", after: 0.0287, why: "same: the stroke +15 % (round ends add to the length)" },
  { species: "wickle", path: "camera.yaw", after: 22, why: "face.mouth: the face seen nearer front-on (the stand's), -10 degrees: the smile reads 10 px" },
  { species: "rupar", path: "front.knots.4.w", after: 0.115, why: "guards: the neck pinch fell to .409 at the corner (neck x .8, head x 1.2) against .45; the throat +15 % (type pinch .617 to .709)" },
  { species: "rupar", path: "front.knots.4.u", after: 0.138, why: "guards: the neck pinch fell to .409 at the corner (neck x .8, head x 1.2) against .45; the throat +15 % (type pinch .617 to .709)" },
  { species: "rupar", path: "front.knots.4.d", after: 0.1495, why: "guards: the neck pinch fell to .409 at the corner (neck x .8, head x 1.2) against .45; the throat +15 % (type pinch .617 to .709)" },
  { species: "rupar", path: "front.knots.6.w", after: 0.165, why: "face.eyes: the stop +10 % wider so the cast wraps less (eye separation .91 of 2 e_x, gate .90)" },
];

const walk = (o, path) => { const ps = path.split("."); for (let i = 0; i < ps.length - 1; i++) o = o[ps[i]]; return [o, ps.at(-1)]; };
export const getPath = (form, path) => { const [o, k] = walk(form, path); return o[k]; };
export function applyTuning(form, entries) {
  const f = structuredClone(form);
  for (const t of entries) { const [o, k] = walk(f, t.path); o[k] = t.after; }
  return f;
}
export const withinAllowance = (path, before, after) => (path.startsWith("camera.") ? Math.abs(after - before) <= 10 + 1e-9 : before === 0 ? after === 0 : Math.abs(after / before - 1) <= 0.15 + 1e-9);
