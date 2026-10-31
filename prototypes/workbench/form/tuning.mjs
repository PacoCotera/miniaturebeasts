// The round 2 tuning of the ROUND2 numbers (build-brief round 2, "Base forms and tuning"): each entry changes one ROUND2 number by at most
// +-15 % (a camera by at most 10 degrees) to meet a gate, with its reason. The report lists every entry with its before and after.
// Paths read from the form: "front.knots.1.w", "camera.yaw", "hair.flare"; arrays are indexed by position. Round 1's list is TRIAL1 in species-trial.mjs.
export const TUNING = [
  { species: "wickle", path: "front.knots.4.ds", after: 0.5175, why: "trans.slope: the drop-to-plume join's outer slope peaked at .689 against .6; a longer top segment (+15 %) brings it to .587" },
];

const walk = (o, path) => { const ps = path.split("."); for (let i = 0; i < ps.length - 1; i++) o = o[ps[i]]; return [o, ps.at(-1)]; };
export const getPath = (form, path) => { const [o, k] = walk(form, path); return o[k]; };
export function applyTuning(form, entries) {
  const f = structuredClone(form);
  for (const t of entries) { const [o, k] = walk(f, t.path); o[k] = t.after; }
  return f;
}
export const withinAllowance = (path, before, after) => (path.startsWith("camera.") ? Math.abs(after - before) <= 10 + 1e-9 : before === 0 ? after === 0 : Math.abs(after / before - 1) <= 0.15 + 1e-9);
