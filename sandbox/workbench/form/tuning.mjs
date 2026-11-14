// The round 3 tuning of the ROUND3 numbers (build-brief round 3, "Base forms and tuning"): each entry changes one ROUND3 number by at most
// +-15 % (a camera by at most 10 degrees) to meet a gate, with its reason. The report lists every entry with its before and after.
// Paths read from the form: "front.knots.1.w", "camera.yaw", "hair.flare"; arrays are indexed by position. Round 1's list is TRIAL1 in species-trial.mjs.
export const TUNING = [
  { species: "rupar", path: "camera.yaw", after: 50, why: "overlap48 (floor .62): the design's 45/4 measured .610 at 48 px on this build (the design's .622 was run on a scratch copy): yaw +5 degrees" },
  { species: "rupar", path: "camera.pitch", after: 8, why: "same: pitch +4 degrees (a search over the allowance: .643 at 50/8 on the 1/150 silhouette against .606 at 50/4)" },
  { species: "rupar", path: "face.eyes.r", after: 0.086, why: "face.ink.304 and face.place: the eye's pupil was 12 px against >= 28 and its diameter with the ring .041 H against >= .053: +15 %" },
  { species: "rupar", path: "face.mouth.y", after: -0.115, why: "face.mouth and face.order: the mouth ink lay level with the nose (99 px) at 304: +15 % lower" },
  { species: "rupar", path: "face.mouth.w", after: 0.138, why: "face.mouth: the stroke was 5 px long against >= 10: +15 %" },
  { species: "rupar", path: "face.R", after: 0.23, why: "face.ink.96: the plate was 17 px at 96 against >= 30: +15 %" },
  { species: "curlop", path: "face.nose.y", after: -0.13, why: "face.place: the nose .021 H under the eye line against >= .0255 (+13 % lower than the round 2 tuning's -.115)" },
  { species: "curlop", path: "face.mouth.y", after: -0.21, why: "face.place: the mouth .034 H under the eye line against >= .036 (+14 % lower than the round 2 tuning's -.184)" },
  { species: "curlop", path: "face.nose.r", after: 0.033, why: "face.ink.304: the nose was 4 px against >= 6 (+15 % over the round 2 tuning's .0287)" },
  { species: "curlop", path: "face.eyes.ey", after: 0.092, why: "face.place: the nose .023 H under the eye line against >= .0255 with the nose at the allowance's end: the eyes +15 % higher (a camera change cost the overlap floor)" },
  { species: "curlop", path: "camera.yaw", after: 49, why: "face.place: the eye separation .157 H at the design's e_x .52 against >= .168 (the 3D separation test keeps e_x near the chord) and the nose: yaw -10 degrees turns the face to the viewer (.175 H)" },
  { species: "curlop", path: "camera.pitch", after: 12, why: "same: pitch +2 degrees" },
  { species: "rupar", path: "face.mouth.t", after: 0.01725, why: "face.mouth: the stroke was .4 px wide against >= 1.5: +15 %" },
  { species: "drapet", path: "camera.yaw", after: 36, why: "face.place and drapet.face: the face pod turned 46 degrees from the viewer showed 1750 plate px against the stand's ~2300 and the far eye hid: yaw -10 degrees" },
  { species: "drapet", path: "face.eyes.r", after: 0.125, why: "face.place: the eye's visible diameter .076 H against >= .080 (the stand's eyes are 26 px, ours 21): +8.7 % over the round 2 tuning's .115 (more would break the corner gap guard at eye-size 1.2 and spacing .85)" },
  { species: "drapet", path: "camera.pitch", after: 14, why: "drapet.e: the width at .9 of the height down was 251 px against >= 264 at the design's pitch 16 (269 at 14): pitch -2 degrees (overlap holds at .89)" },
  { species: "drapet", path: "hair.notch", after: 0.068, why: "drapet.c: the hem's notch .08 U is 8.9 px at 304, over the 8 px the floor-row measure allows (.547 of the columns against >= .6): -15 %" },
  { species: "drapet", path: "hair.flare", after: 0.085, why: "overlap48 (.886 against .89) and drapet.a: a grid over the allowance: flare -15 % from the design's .10" },
  { species: "drapet", path: "hair.Ld", after: 0.31, why: "same: the hang length -7.7 % from the round 2 tuning's .336 (.894, width at .9 of the height 265 px)" },
  { species: "drapet", path: "face.eyes.ex", after: 0.24, why: "face.place: the eye separation .130 H against >= .131: +4 % over the round 2 tuning's .23 (the 3D separation test holds within 10 %)" },
  { species: "drapet", path: "face.nose.y", after: -0.0459, why: "face.place: the nose .026 H under the eye line against >= .027 (this keeps the allowance's end of -.046)" },
  { species: "wickle", path: "look.material.k0", after: 0.62, why: "surface.value: the body's 5th percentile L* was 57.5 against the stand's 48.4 +- 6 at k0 .70 (and the median fell under at .60): -11.4 %" },
  { species: "drapet", path: "look.material.k0", after: 0.561, why: "surface.value: the body's 5th percentile L* was 39.8 against the stand's 26.6 +- 6 at k0 .66: -15 %" },
  { species: "loika", path: "face.phi", after: 21.25, why: "design 5, 96 far eye (w/h .40 .. .70, inside the outline): at the design's 25 the far eye's centre sat 2.5 px inside the outline and C4 clipped its glyph to 3 x 11 (.27); phi -15 % (the allowance's end) turns the face toward the viewer: 5 x 12 (.42) at 96, 304 far w/h .625, throat top .533" },
]; // round 3 tuning; round 2's list is TRIAL2 in species-trial.mjs, folded into ROUND3

const walk = (o, path) => { const ps = path.split("."); for (let i = 0; i < ps.length - 1; i++) o = o[ps[i]]; return [o, ps.at(-1)]; };
export const getPath = (form, path) => { const [o, k] = walk(form, path); return o[k]; };
export function applyTuning(form, entries) {
  const f = structuredClone(form);
  for (const t of entries) { const [o, k] = walk(f, t.path); o[k] = t.after; }
  return f;
}
export const withinAllowance = (path, before, after) => (path.startsWith("camera.") ? Math.abs(after - before) <= 10 + 1e-9 : before === 0 ? after === 0 : Math.abs(after / before - 1) <= 0.15 + 1e-9);
