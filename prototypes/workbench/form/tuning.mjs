// The round 3 tuning of the ROUND3 numbers (build-brief round 3, "Base forms and tuning"): each entry changes one ROUND3 number by at most
// +-15 % (a camera by at most 10 degrees) to meet a gate, with its reason. The report lists every entry with its before and after.
// Paths read from the form: "front.knots.1.w", "camera.yaw", "hair.flare"; arrays are indexed by position. Round 1's list is TRIAL1 in species-trial.mjs.
export const TUNING = []; // round 3: empty (round 2's list is TRIAL2 in species-trial.mjs, folded into ROUND3)

const walk = (o, path) => { const ps = path.split("."); for (let i = 0; i < ps.length - 1; i++) o = o[ps[i]]; return [o, ps.at(-1)]; };
export const getPath = (form, path) => { const [o, k] = walk(form, path); return o[k]; };
export function applyTuning(form, entries) {
  const f = structuredClone(form);
  for (const t of entries) { const [o, k] = walk(f, t.path); o[k] = t.after; }
  return f;
}
export const withinAllowance = (path, before, after) => (path.startsWith("camera.") ? Math.abs(after - before) <= 10 + 1e-9 : before === 0 ? after === 0 : Math.abs(after / before - 1) <= 0.15 + 1e-9);
