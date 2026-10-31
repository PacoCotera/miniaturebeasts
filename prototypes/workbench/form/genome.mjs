// Levers and ranges (shape-model.md 2.1, 2.2). A form locus is a copy t in [0, 1]; the shown value of a pair is the mean of its copies.
// A range turns t into a multiplier m(t) = lo * (hi / lo)^t (sizes and lengths, geometric) or an offset o(t) = lo + (hi - lo) t
// (angles, turns, positions); the type specimen sits at m = 1, o = 0. Each lever moves only the knots it names.
// Plain JavaScript, no node: imports.
import { SPECIES, cloneForm } from "./species-trial.mjs";

const find = (form, chain, name) => {
  const list = chain === "front" ? form.front.knots : chain === "tail" ? form.tail.knots : form.branches.find((b) => b.id === chain).knots;
  const k = list.find((x) => x.name === name);
  if (!k) throw new Error(`no knot ${chain}.${name}`);
  return k;
};
const sizes = (k, f) => { k.w *= f[0]; k.u *= f[1]; k.d *= f[2]; };

// ---- the lever kinds: (form, cfg, value) -> mutates a clone -------------------------------------------------------
export const KINDS = {
  // [w u d, tail root ... head]
  girth: (f, c, m) => { for (const n of c.knots) sizes(find(f, "front", n), [m, m, m]); },
  // [w x m, u d x m^-1/2]
  build: (f, c, m) => { for (const n of c.knots) sizes(find(f, "front", n), [m, 1 / Math.sqrt(m), 1 / Math.sqrt(m)]); },
  // [pelvis-side x m, chest-side x 1/m]
  mass: (f, c, m) => { for (const n of c.pelvis) sizes(find(f, "front", n), [m, m, m]); for (const n of c.chest) sizes(find(f, "front", n), [1 / m, 1 / m, 1 / m]); },
  // [lifts the knots between the peak and the ends toward the peak]
  fullness: (f, c, o) => { const p = find(f, "front", c.peak); const peak = [p.w, p.u, p.d]; for (const n of c.knots) { const k = find(f, "front", n); k.w += o * (peak[0] - k.w); k.u += o * (peak[1] - k.u); k.d += o * (peak[2] - k.d); } },
  // [trunk kappa x m]
  bend: (f, c, m) => { for (const n of c.knots) find(f, c.chain ?? "front", n).k *= m; },
  // [stop ... nose, delta sigma x m]
  length: (f, c, m) => { for (const n of c.knots) find(f, c.chain ?? "front", n).ds *= m; },
  // [head w u d]
  head: (f, c, m) => { for (const n of c.knots) sizes(find(f, "front", n), [m, m, m]); },
  // [neck pinch p, split dorsal 1 - (1 - p) nape, ventral p]
  neck: (f, c, m) => { const nape = f.nape ?? 0; for (const n of c.knots) sizes(find(f, "front", n), [m, 1 - (1 - m) * nape, m]); },
  // [neck kappa offset]
  carriage: (f, c, o) => { for (const n of c.knots) find(f, "front", n).k += o; },
  // [eye size]
  eyeSize: (f, c, m) => { if (m !== 1) f.face.eyes.size = (f.face.eyes.size ?? 1) * m; },
  // [coil N offset]
  coil: (f, c, o) => { const ch = c.chain === "tail" ? f.tail : c.chain === "front" ? f.front : f.branches.find((b) => b.id === c.chain); ch.coil.N += o; },
  // (a lever at its type value changes nothing: the type specimen is the base form, bit for bit)
  // [leg length x m: scales the thigh and the foot; the solved shin follows (design 4.1). Locked on all five: the lever would not show]
  legLength: (f, c, m) => { const b = f.branches.find((x) => x.id === c.chain); b.knots.forEach((k) => { if (k.name !== "shin" && k.ds > 0) k.ds *= m; }); },
  // [horn coil N, a helix of W 2.2 over a quarter U]
  hornCoil: (f, c, o) => { const b = f.branches.find((x) => x.id === c.chain); b.coil = o > 1e-9 ? { N: o, W: 2.2, L: 0.25, plane: 0, part: b.part } : null; },
  // [ear kappa offset]
  droop: (f, c, o) => { for (const n of c.knots) find(f, c.chain, n).k += -400 * o; },
  // [fur depth]
  furDepth: (f, c, m) => { if (f.hair) f.hair.depth *= m; if (f.coat) f.coat.depth *= m; },
  // [hair flare]
  flare: (f, c, o) => { f.hair.flare += o; },
  // [window top edge lowered by o]
  fringe: (f, c, o) => { f.hair.window.c[2] -= o / 2; f.hair.window.r[2] -= o / 2; },
};

// ---- per species: the open ranges ----------------------------------------------------------------------------------
// range [lo, hi]; kind "mult" or "off"; touches names the knots a lever may change (the test holds it to that).
const R = (id, kind, fn, range, cfg, touches, doc) => ({ id, kind, fn, range, cfg, touches, doc });
export const LEVERS = {
  curlop: [
    R("girth", "mult", "girth", [0.9, 1.12], { knots: ["pelvis", "belly", "chest", "chin", "head"] }, ["front.pelvis", "front.belly", "front.chest", "front.chin", "front.head"], "Build: girth"),
    R("build", "mult", "build", [0.9, 1.1], { knots: ["pelvis", "belly", "chest", "chin", "head"] }, ["front.pelvis", "front.belly", "front.chest", "front.chin", "front.head"], "Build: build"),
    R("bend", "mult", "bend", [0.6, 1.4], { knots: ["belly", "chest", "chin", "head", "cap"] }, ["front.belly", "front.chest", "front.chin", "front.head", "front.cap"], "Body: the S"),
    R("muzzle", "mult", "length", [0.7, 1.6], { knots: ["cap"] }, ["front.cap"], "Snout: flat face to button snout"),
    R("eye-size", "mult", "eyeSize", [0.85, 1.2], {}, ["face.eyes"], "Eyes"),
    R("coil", "off", "coil", [-0.15, 0.35], { chain: "tail" }, ["tail.coil"], "Curl: coil N .8 ... 1.3 (restored: W 4.5 and L 2.2 hold the whorl guard at 1.3)"),
  ],
  wickle: [
    R("girth", "mult", "girth", [0.92, 1.1], { knots: ["pelvis", "belly", "shoulder", "face"] }, ["front.pelvis", "front.belly", "front.shoulder", "front.face"], "Build: girth"),
    R("build", "mult", "build", [0.92, 1.08], { knots: ["pelvis", "belly", "shoulder", "face"] }, ["front.pelvis", "front.belly", "front.shoulder", "front.face"], "Build: build"),
    R("mass", "mult", "mass", [0.9, 1.1], { pelvis: ["pelvis", "belly"], chest: ["shoulder", "face"] }, ["front.pelvis", "front.belly", "front.shoulder", "front.face"], "Drop: low and full, or high-shouldered"),
    R("eye-size", "mult", "eyeSize", [0.85, 1.2], {}, ["face.eyes"], "Eyes"),
    R("coil", "off", "coil", [-0.4, 0.3], { chain: "front" }, ["front.coil"], "Curl: coil N .9 ... 1.6"),
  ],
  drapet: [
    R("girth", "mult", "girth", [0.92, 1.1], { knots: ["pelvis", "lower", "upper", "top"] }, ["front.pelvis", "front.lower", "front.upper", "front.top"], "Build: girth"),
    R("build", "mult", "build", [0.92, 1.08], { knots: ["pelvis", "lower", "upper", "top"] }, ["front.pelvis", "front.lower", "front.upper", "front.top"], "Build: build"),
    R("fullness", "off", "fullness", [0, 0.4], { peak: "pelvis", knots: ["upper", "top"] }, ["front.upper", "front.top"], "Body: dome to bell"),
    R("eye-size", "mult", "eyeSize", [0.85, 1.2], {}, ["face.eyes"], "Eyes"),
    R("fur-depth", "mult", "furDepth", [0.8, 1.25], {}, ["hair.depth"], "Fluff"),
    R("flare", "off", "flare", [-0.1, 0.15], {}, ["hair.flare"], "Hang"),
    R("fringe", "off", "fringe", [0, 0.1], {}, ["hair.window"], "Fringe"),
  ],
  loika: [
    R("eye-size", "mult", "eyeSize", [1, 1.3], {}, ["face.eyes"], "Eyes: large ... huge"),
  ],
  rupar: [
    R("build", "mult", "build", [0.9, 1.1], { knots: ["pelvis", "barrel", "withers"] }, ["front.pelvis", "front.barrel", "front.withers"], "Build"),
    R("head", "mult", "head", [0.9, 1.2], { knots: ["poll"] }, ["front.poll"], "Head"),
    R("head-length", "mult", "length", [0.85, 1.25], { knots: ["stop", "nose"] }, ["front.stop", "front.nose"], "Head: length"),
    R("carriage", "off", "carriage", [-12, 12], { knots: ["neckbase"] }, ["front.neckbase"], "Head: carriage"),
    R("eye-size", "mult", "eyeSize", [0.85, 1.25], {}, ["face.eyes"], "Eyes"),
    R("mass", "mult", "mass", [0.9, 1.1], { pelvis: ["pelvis", "barrel"], chest: ["withers"] }, ["front.pelvis", "front.barrel", "front.withers"], "Haunch"),
    R("neck", "mult", "neck", [0.8, 1.2], { knots: ["neckbase", "throat"] }, ["front.neckbase", "front.throat"], "Waist: neck"),
    R("ear-droop", "off", "droop", [0, 0.4], { chain: "ear", knots: ["ear1", "tip"] }, ["ear.ear1", "ear.tip"], "Ear tilt"),
    R("horn-coil", "off", "hornCoil", [0, 1.2], { chain: "horn" }, ["horn.coil"], "Horns: 0 ... 1.2 turns"),
  ],
};

// ---- values ---------------------------------------------------------------------------------------------------
export const valueOf = (lever, t) => {
  const [lo, hi] = lever.range;
  const v = lever.kind === "mult" ? lo * Math.pow(hi / lo, t) : lo + (hi - lo) * t;
  const ref = lever.kind === "mult" ? 1 : 0;
  return Math.abs(v - ref) < 1e-12 ? ref : v;
};
// the copy t at which a lever stands at its type value (m = 1, o = 0)
export const typeT = (lever) => {
  const [lo, hi] = lever.range;
  return lever.kind === "mult" ? Math.log(1 / lo) / Math.log(hi / lo) : (0 - lo) / (hi - lo);
};
export const typeCopies = (key) => Object.fromEntries(LEVERS[key].map((l) => [l.id, [typeT(l), typeT(l)]]));
const meanOf = (pair) => (pair[0] + pair[1]) / 2;

// The form of a species for copies { lever: [t1, t2] } (the shown value is their mean; a missing lever stays at its type)
export function formOf(key, copies = {}) {
  const f = cloneForm(SPECIES[key]);
  const levers = {};
  for (const lever of LEVERS[key]) {
    const pair = copies[lever.id];
    const t = pair ? meanOf(pair) : typeT(lever);
    const v = valueOf(lever, t);
    levers[lever.id] = v;
    KINDS[lever.fn](f, lever.cfg, v);
  }
  Object.defineProperty(f, "levers", { value: levers, enumerable: false });
  return f;
}
// a corner of the open ranges: a bit mask over the levers (bit set = t 1)
export function corner(key, mask) {
  const copies = {};
  LEVERS[key].forEach((l, i) => { const t = (mask >> i) & 1; copies[l.id] = [t, t]; });
  return formOf(key, copies);
}
export const cornerCount = (key) => 2 ** LEVERS[key].length;
// every lever at its type except one, at t
export function single(key, id, t) {
  const copies = typeCopies(key); copies[id] = [t, t];
  return formOf(key, copies);
}
