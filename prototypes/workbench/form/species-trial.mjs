// The five trial species: the base forms of shape-model.md section 3, numbers verbatim, with their open ranges
// (genome.mjs), the reference pose and the stand camera. Plain JavaScript, no node: imports.
// Knots read "ds k psi | w u d" in U and degrees per U, listed from the pelvis.
import { K } from "./spine.mjs";
import { TUNING, applyTuning, getPath } from "./tuning.mjs";

// the three fingers of a hand: short spines on the palm (1.6)
const fingers = { count: 3, length: 0.06, r: 0.022, fan: 28 };

export const SECTION3 = {};

// ---- Curlop (S19) --------------------------------------------------------------------------------------------
SECTION3.curlop = {
  id: "S19", key: "curlop", name: "Curlop", stand: "stand-E-curlop", phi0: 92, nape: 0,
  front: { knots: [
    K("pelvis", "0 0 0|.86 .82 .84", "body"), K("belly", ".55 6 0|.90 .84 .94", "body"), K("chest", ".55 6 0|.84 .88 .82", "body"),
    K("chin", ".40 -50 -30|.80 .90 .72", "neck"), K("head", ".40 -70 -40|.92 .92 .84", "head"), K("cap", ".30 -50 0|.56 .60 .58", "head"),
  ] },
  regions: { neck: "chin", chest: "chest", head: "head" },
  tail: { knots: [K("seat", ".45 190 0|.72 .70 .66", "tail"), K("tail1", ".55 -20 25|.52 .50 .46", "tail"), K("run", ".85 -20 10|.36 .35 .33", "tail")],
    coil: { N: 0.95, W: 3.5, L: 2.1, plane: 0, part: "tail" } },
  branches: [
    { id: "leg", part: "legs", pair: true, root: { sigma: 0.25, angle: 135, out: 0.85 }, dir: [0.5, 0.3, -1], blend: 0.18,
      knots: [K("", "0|.30"), K("", ".40 -120|.26"), K("foot", ".30 0|.22 .13 .12")] },
    { id: "arm", part: "arms", pair: true, root: { sigma: 1.45, angle: 140, out: 1.0 }, dir: [0.35, 0.5, -1], normal: "forward", blend: 0.10, fingers,
      knots: [K("", "0|.15"), K("", ".24|.14"), K("elbow", ".06 150|.13"), K("", ".24 120 -300|.12"), K("hand", ".10|.15 .10 .10")] },
  ],
  contacts: [{ kind: "branches", id: "leg", last: true }, { kind: "tail", upToKnot: 1 }],
  face: { sigma: 2.02, t: 1, v: 0.35, eyes: { spread: 30, elev: 14, r: 0.15 },
    patch: { angle: 50, top: -0.08 }, belly: { beta: 62, s0: -0.2, s1: 1.75 },
    marks: [{ kind: "nose", id: "nose", t: 1, v: 0.55, spread: 0, elev: 0, size: 0.05 }, { kind: "mouth", id: "mouth", t: 1, v: 0.85, spread: 0, elev: 0, size: 0.1 }] },
  coat: { depth: 0.08, locks: 0.012 },
  camera: { yaw: 55, pitch: 8 },
  look: {
    slots: { body: "coat", neck: "coat", head: "coat", tail: "coat", legs: "coat", arms: "coat" },
    pigments: { coat: [88, 189, 160], patch: [226, 228, 190], belly: [226, 228, 190] },
    eyes: { rim: [226, 232, 208], iris: [34, 92, 88], pupil: [14, 24, 28], pupil_r: 0.46, iris_r: 0.8 }, nose: [60, 100, 90], mouth: [60, 100, 90],
  },
};

// ---- Wickle (S17) --------------------------------------------------------------------------------------------
SECTION3.wickle = {
  id: "S17", key: "wickle", name: "Wickle", stand: "stand-A-wickle", phi0: 90, nape: 0, base: -0.45,
  front: { knots: [
    K("pelvis", "0|.84 .80 .82", "drop"), K("belly", ".38|1.00 .95 .98", "drop"), K("shoulder", ".43|.86 .82 .84", "drop"),
    K("face", ".25|.70 .66 .68", "drop"), K("top", ".47 -6|.36 .34 .35", "plume"), K("mid", ".40 -8|.22 .21 .21", "plume"), K("end", ".40 0|.17 .16 .16", "plume"),
  ], coil: { N: 1.3, W: 6, L: 1.8, plane: -85, part: "plume", emit: { from: 0.45 } } },
  regions: null,
  branches: [
    { id: "foot", part: "feet", pair: true, root: { sigma: 0.05, angle: 150, out: 0.75 }, dir: [0.6, 0.35, -1], blend: 0.06,
      knots: [K("", "0|.13"), K("foot", ".25|.14 .09 .09")] },
  ],
  contacts: [{ kind: "base" }], // it sits on its floor cut; the feet are two small nubs in front
  face: { sigma: 1.05, t: 0.15, v: 1, eyes: { spread: 26, elev: 8, r: 0.11 }, patch: { angle: 40 },
    marks: [{ kind: "nose", id: "nose", t: 0.15, v: 1, spread: 0, elev: -9, size: 0.055 }] },
  coat: { depth: 0.11, locks: 0.02, bare: { angle: 30, factor: 0.15 } },
  camera: { yaw: 22, pitch: 8 },
  look: {
    slots: { drop: "coat", plume: "coat", feet: "coat" },
    pigments: { coat: [226, 176, 96], patch: [244, 226, 186], belly: [244, 226, 186], glow: [255, 120, 60] },
    eyes: { rim: [214, 190, 150], iris: [58, 40, 30], pupil: [18, 12, 12], pupil_r: 0.5, iris_r: 0.86 }, nose: [150, 100, 70],
  },
};

// ---- Drapet (S18) --------------------------------------------------------------------------------------------
SECTION3.drapet = {
  id: "S18", key: "drapet", name: "Drapet", stand: "stand-B-drapet", phi0: 90, nape: 0, base: -0.05,
  front: { knots: [K("pelvis", "0|1.22 1.20 1.20", "dome"), K("lower", ".40|1.20 1.18 1.18", "dome"), K("upper", ".55|.98 .96 .96", "dome"), K("top", ".40|.62 .60 .60", "dome")] },
  regions: null,
  hair: { depth: 0.20, partLine: 1.05, flare: 0.22, gamma: 1.2, hem: 0.16, lobes: 11, strands: 46, window: { c: [1.16, 0, 0.98], r: [0.42, 0.36, 0.30], k: 0.05 } },
  branches: [
    { id: "legF", part: "legs", pair: true, root: { sigma: 0.2, angle: 150, out: 0.7 }, dir: [0.05, 0.2, -1], blend: 0.08, knots: [K("", "0|.2"), K("foot", ".15|.17")] },
    { id: "legB", part: "legs", pair: true, root: { sigma: 0.2, angle: 40, out: 0.7 }, dir: [-0.05, 0.2, -1], blend: 0.08, knots: [K("", "0|.2"), K("foot", ".15|.17")] },
  ],
  contacts: [{ kind: "base" }],
  face: { sigma: 1.05, t: 0.15, v: 1, eyes: { spread: 14, elev: 4, r: 0.10 }, patch: { angle: 30 },
    marks: [{ kind: "nose", id: "nose", t: 0.15, v: 1, spread: 0, elev: -6, size: 0.045 }] },
  camera: { yaw: 28, pitch: 14 },
  look: {
    slots: { hair: "hair", face: "face", legs: "face", dome: "hair" },
    pigments: { hair: [138, 120, 190], face: [128, 124, 150], patch: [128, 124, 150], belly: [128, 124, 150] },
    eyes: { rim: [200, 194, 226], iris: [60, 54, 96], pupil: [18, 16, 30], pupil_r: 0.5, iris_r: 0.84 }, nose: [92, 88, 112],
  },
};

// ---- Loika (S01) ---------------------------------------------------------------------------------------------
SECTION3.loika = {
  id: "S01", key: "loika", name: "Loika", stand: "mibi-adult-S01", art: true, phi0: 6, nape: 0.2,
  front: { knots: [
    K("pelvis", "0|.64 .62 .58", "body"), K("belly", ".35 0|.72 .66 .68", "body"), K("chest", ".35 40|.68 .64 .62", "body"),
    K("chin", ".25 45 8|.62 .64 .50", "neck"), K("head", ".35 -20 12|.98 .90 .80", "head"), K("stop", ".30 -60|.84 .56 .72", "head"), K("snout", ".15 -40|.58 .30 .46", "head"),
  ] },
  regions: { neck: "chin", chest: "chest", head: "head" },
  tail: { knots: [K("stub", ".25 30|.50 .50 .44", "tail"), K("stub2", ".10|.32 .32 .28", "tail")] },
  branches: [
    { id: "hind", part: "legs", pair: true, root: { sigma: -0.02, angle: 120, out: 0.7 }, dir: [0.1, 0.35, -1], blend: 0.2, knots: [K("", "0|.27"), K("", ".34 -150|.23"), K("foot", ".20|.24 .13 .11")] },
    { id: "fore", part: "legs", pair: true, root: { sigma: 0.62, angle: 125, out: 0.7 }, dir: [0.15, 0.4, -1], blend: 0.18, knots: [K("", "0|.25"), K("", ".34 -150|.22"), K("foot", ".20|.23 .12 .11")] },
    { id: "leafM", part: "crest", root: { sigma: 1.22, angle: 0, out: 0.8 }, dir: [-0.15, 0, 1], normal: "forward", blend: 0.08, knots: [K("", "0|.07 .0175 .0175"), K("", ".30|.10 .0175 .0175"), K("tip", ".30|.01 .0175 .0175")] },
    { id: "leafS", part: "crest", pair: true, root: { sigma: 1.18, angle: 25, out: 0.8 }, dir: [-0.15, 0.58, 0.82], normal: "forward", blend: 0.08, knots: [K("", "0|.06 .0175 .0175"), K("", ".22|.09 .0175 .0175"), K("tip", ".22|.01 .0175 .0175")] },
  ],
  contacts: [{ kind: "branches", id: "hind", last: true }, { kind: "branches", id: "fore", last: true }],
  face: { sigma: 1.30, t: 1, v: 0.1, eyes: { spread: 50, elev: 12, r: 0.20 }, patch: { angle: 58, top: -0.22 }, belly: { beta: 55, s0: -0.1, s1: 1.1 },
    marks: [{ kind: "nose", id: "nose", t: 1, v: 0.1, spread: 0, elev: -4, size: 0.07 }] },
  camera: { yaw: -40, pitch: 12 },
  look: {
    slots: { body: "skin", neck: "skin", head: "skin", tail: "skin", legs: "skin", crest: "leaf" },
    pigments: { skin: [58, 56, 64], patch: [232, 212, 176], belly: [232, 212, 176], leaf: [98, 128, 52] },
    eyes: { rim: [240, 226, 196], iris: [210, 112, 36], pupil: [24, 14, 12], big: true }, nose: [96, 84, 80],
  },
};

// ---- Rupar (S08) ---------------------------------------------------------------------------------------------
SECTION3.rupar = {
  id: "S08", key: "rupar", name: "Rupar", stand: "mibi-adult-S08", art: true, phi0: 4, nape: 1,
  front: { knots: [
    K("pelvis", "0|.26 .30 .30", "body"), K("barrel", ".40|.29 .31 .35", "body"), K("withers", ".34 70|.26 .30 .30", "body"),
    K("neckbase", ".28 120|.15 .18 .20", "neck"), K("throat", ".62 -10 -45|.11 .13 .14", "neck"), K("poll", ".12 -260 -60|.15 .17 .16", "head"),
    K("stop", ".22 -40|.12 .12 .12", "head"), K("nose", ".22 0|.065 .055 .075", "head"),
  ] },
  regions: { neck: "throat", chest: "withers", head: "poll" },
  tail: { knots: [K("tail1", ".16 -60|.11 .11 .10", "tail"), K("tail2", ".12 -40|.045", "tail")] },
  branches: [
    { id: "hind", part: "legs", pair: true, root: { sigma: 0.10, angle: 115, out: 0.5 }, dir: [0, 0.1, -1], blend: 0.08, knots: [K("", "0|.14"), K("", ".46|.075"), K("hock", ".10 60|.05"), K("", ".50|.036"), K("hoof", ".06|.045")] },
    { id: "fore", part: "legs", pair: true, root: { sigma: 0.72, angle: 120, out: 0.5 }, dir: [0.02, 0.08, -1], blend: 0.08, knots: [K("", "0|.11"), K("", ".50|.065"), K("knee", ".10 -40|.045"), K("", ".50|.036"), K("hoof", ".06|.045")] },
    { id: "horn", part: "horns", pair: true, root: { sigma: 1.80, angle: 25, out: 0.6 }, dir: [-0.55, 0.15, 1], blend: 0.03, knots: [K("", "0|.045"), K("tip", ".60|.012")], coil: null },
    { id: "ear", part: "ears", pair: true, root: { sigma: 1.78, angle: 70, out: 0.7 }, dir: [-0.3, 1, 0.6], normal: "forward", blend: 0.03, knots: [K("", "0|.03 .012 .012"), K("", ".12|.05 .012 .012"), K("tip", ".14|.01 .012 .012")] },
  ],
  contacts: [{ kind: "branches", id: "hind", last: true }, { kind: "branches", id: "fore", last: true }],
  face: { sigma: 1.95, t: 1, v: 0.2, eyes: { spread: 62, elev: 18, r: 0.06 },
    marks: [{ kind: "nose", id: "nose", t: 1, v: 0.2, spread: 0, elev: 0, size: 0.03 }] },
  camera: { yaw: 55, pitch: 8 },
  look: {
    slots: { body: "coat", neck: "coat", head: "coat", tail: "coat", legs: "leg", horns: "horn", ears: "coat" },
    pigments: { coat: [196, 132, 70], patch: [236, 220, 190], belly: [236, 220, 190], leg: [226, 206, 170], horn: [226, 214, 190] },
    eyes: { rim: [92, 62, 44], iris: [60, 36, 22], pupil: [14, 10, 10], pupil_r: 0.55, iris_r: 0.9 }, nose: [60, 44, 40],
  },
};

// every unnamed branch knot gets a name too, in SECTION3 (the levers and the tests name knots)
for (const f of Object.values(SECTION3)) for (const b of f.branches) b.knots.forEach((k, i) => { if (!k.name) k.name = `${b.id}${i}`; });

// Round 1's tuning (the trial module, tuning.mjs of 40635e30), folded into ROUND2 below: each entry changed one SECTION3 number.
const TRIAL1 = [
  { species: "wickle", path: "face.eyes.r", after: 0.1265, why: "eyes readable at 48 px (face check): +15 %" },
  { species: "drapet", path: "face.sigma", after: 0.9, why: "guard: the fringe edge 0.03 U above the eyes: face lower on the front" },
  { species: "drapet", path: "face.t", after: 0.13, why: "same: eyes lower" },
  { species: "drapet", path: "hair.window.c.2", after: 1.1, why: "same: the window centred on the lowered eyes" },
  { species: "curlop", path: "branches.1.root.out", after: 0.9, why: "guard: the arm root must lie inside its parent by 0.3 of the root radius (out 1.0 is on the surface)" },
  { species: "wickle", path: "coat.locks", after: 0.017, why: "convexity of the drop outline (wickle.c): smaller lock noise" },
  { species: "loika", path: "front.knots.4.w", after: 0.588, why: "owner note 2026-10-30 19:21: Loika's head region smaller, measured against the signed art (x 0.6, beyond the 15 % allowance)", owner: true },
  { species: "loika", path: "front.knots.4.u", after: 0.54, why: "owner note 2026-10-30 19:21: Loika's head region smaller, measured against the signed art (x 0.6, beyond the 15 % allowance)", owner: true },
  { species: "loika", path: "front.knots.4.d", after: 0.48, why: "owner note 2026-10-30 19:21: Loika's head region smaller, measured against the signed art (x 0.6, beyond the 15 % allowance)", owner: true },
  { species: "loika", path: "front.knots.5.w", after: 0.504, why: "owner note 2026-10-30 19:21: Loika's head region smaller, measured against the signed art (x 0.6, beyond the 15 % allowance)", owner: true },
  { species: "loika", path: "front.knots.5.u", after: 0.336, why: "owner note 2026-10-30 19:21: Loika's head region smaller, measured against the signed art (x 0.6, beyond the 15 % allowance)", owner: true },
  { species: "loika", path: "front.knots.5.d", after: 0.432, why: "owner note 2026-10-30 19:21: Loika's head region smaller, measured against the signed art (x 0.6, beyond the 15 % allowance)", owner: true },
  { species: "loika", path: "front.knots.6.w", after: 0.348, why: "owner note 2026-10-30 19:21: Loika's head region smaller, measured against the signed art (x 0.6, beyond the 15 % allowance)", owner: true },
  { species: "loika", path: "front.knots.6.u", after: 0.18, why: "owner note 2026-10-30 19:21: Loika's head region smaller, measured against the signed art (x 0.6, beyond the 15 % allowance)", owner: true },
  { species: "loika", path: "front.knots.6.d", after: 0.276, why: "owner note 2026-10-30 19:21: Loika's head region smaller, measured against the signed art (x 0.6, beyond the 15 % allowance)", owner: true },
  { species: "loika", path: "front.knots.0.w", after: 0.736, why: "body larger to carry the smaller head (+15 %)" },
  { species: "loika", path: "front.knots.0.u", after: 0.713, why: "body larger to carry the smaller head (+15 %)" },
  { species: "loika", path: "front.knots.0.d", after: 0.667, why: "body larger to carry the smaller head (+15 %)" },
  { species: "loika", path: "front.knots.1.w", after: 0.828, why: "body larger to carry the smaller head (+15 %)" },
  { species: "loika", path: "front.knots.1.u", after: 0.759, why: "body larger to carry the smaller head (+15 %)" },
  { species: "loika", path: "front.knots.1.d", after: 0.782, why: "body larger to carry the smaller head (+15 %)" },
  { species: "loika", path: "front.knots.2.w", after: 0.782, why: "body larger to carry the smaller head (+15 %)" },
  { species: "loika", path: "front.knots.2.u", after: 0.736, why: "body larger to carry the smaller head (+15 %)" },
  { species: "loika", path: "front.knots.2.d", after: 0.713, why: "body larger to carry the smaller head (+15 %)" },
  { species: "drapet", path: "hair.partLine", after: 0.987, why: "overlap at 48 px (coordinate search within the allowance)" },
  { species: "drapet", path: "hair.flare", after: 0.2068, why: "overlap at 48 px (coordinate search within the allowance)" },
  { species: "drapet", path: "hair.gamma", after: 1.272, why: "overlap at 48 px (coordinate search within the allowance)" },
  { species: "drapet", path: "front.knots.0.d", after: 1.128, why: "overlap at 48 px (coordinate search within the allowance)" },
  { species: "drapet", path: "front.knots.1.w", after: 1.128, why: "overlap at 48 px (coordinate search within the allowance)" },
  { species: "drapet", path: "front.knots.1.u", after: 1.1092, why: "overlap at 48 px (coordinate search within the allowance)" },
  { species: "drapet", path: "front.knots.2.w", after: 1.0388, why: "overlap at 48 px (coordinate search within the allowance)" },
  { species: "drapet", path: "front.knots.2.u", after: 1.0176, why: "overlap at 48 px (coordinate search within the allowance)" },
  { species: "drapet", path: "front.knots.2.d", after: 1.0176, why: "overlap at 48 px (coordinate search within the allowance)" },
  { species: "drapet", path: "front.knots.3.w", after: 0.5828, why: "overlap at 48 px (coordinate search within the allowance)" },
  { species: "drapet", path: "front.knots.3.u", after: 0.636, why: "overlap at 48 px (coordinate search within the allowance)" },
  { species: "drapet", path: "front.knots.3.d", after: 0.6, why: "overlap at 48 px (coordinate search within the allowance)" },
  { species: "drapet", path: "front.knots.2.ds", after: 0.583, why: "overlap at 48 px (coordinate search within the allowance)" },
  { species: "drapet", path: "camera.yaw", after: 38, why: "overlap at 48 px (coordinate search within the allowance)" },
  { species: "drapet", path: "camera.pitch", after: 24, why: "overlap at 48 px (coordinate search within the allowance)" },
  { species: "wickle", path: "front.knots.0.w", after: 0.8778, why: "overlap at 48 px (coordinate search within the allowance)" },
  { species: "wickle", path: "front.knots.1.w", after: 0.895, why: "overlap at 48 px (coordinate search within the allowance)" },
  { species: "wickle", path: "front.knots.1.u", after: 0.9785, why: "overlap at 48 px (coordinate search within the allowance)" },
  { species: "wickle", path: "front.knots.1.d", after: 0.9212, why: "overlap at 48 px (coordinate search within the allowance)" },
  { species: "wickle", path: "front.knots.1.ds", after: 0.3686, why: "overlap at 48 px (coordinate search within the allowance)" },
  { species: "wickle", path: "front.knots.2.w", after: 0.7697, why: "overlap at 48 px (coordinate search within the allowance)" },
  { species: "wickle", path: "front.knots.2.u", after: 0.7708, why: "overlap at 48 px (coordinate search within the allowance)" },
  { species: "wickle", path: "front.knots.2.ds", after: 0.4687, why: "overlap at 48 px (coordinate search within the allowance)" },
  { species: "wickle", path: "front.knots.3.w", after: 0.742, why: "overlap at 48 px (coordinate search within the allowance)" },
  { species: "wickle", path: "front.knots.3.u", after: 0.6996, why: "overlap at 48 px (coordinate search within the allowance)" },
  { species: "wickle", path: "front.knots.3.d", after: 0.7208, why: "overlap at 48 px (coordinate search within the allowance)" },
  { species: "wickle", path: "front.knots.3.ds", after: 0.2575, why: "overlap at 48 px (coordinate search within the allowance)" },
  { species: "wickle", path: "front.knots.4.u", after: 0.3604, why: "overlap at 48 px (coordinate search within the allowance)" },
  { species: "wickle", path: "front.knots.6.w", after: 0.1751, why: "overlap at 48 px (coordinate search within the allowance)" },
  { species: "wickle", path: "front.knots.6.d", after: 0.1648, why: "overlap at 48 px (coordinate search within the allowance)" },
  { species: "wickle", path: "camera.yaw", after: 32, why: "overlap at 48 px (coordinate search within the allowance)" },
  { species: "wickle", path: "camera.pitch", after: 18, why: "overlap at 48 px (coordinate search within the allowance)" },
  { species: "curlop", path: "front.knots.0.w", after: 0.9116, why: "overlap at 48 px" },
  { species: "curlop", path: "front.knots.0.d", after: 0.8652, why: "overlap at 48 px" },
  { species: "curlop", path: "front.knots.1.w", after: 0.927, why: "overlap at 48 px" },
  { species: "curlop", path: "front.knots.1.u", after: 0.9156, why: "overlap at 48 px" },
  { species: "curlop", path: "front.knots.1.d", after: 0.9682, why: "overlap at 48 px" },
  { species: "curlop", path: "front.knots.1.ds", after: 0.5335, why: "overlap at 48 px" },
  { species: "curlop", path: "front.knots.1.k", after: 6.18, why: "overlap at 48 px" },
  { species: "curlop", path: "front.knots.2.u", after: 0.9724, why: "overlap at 48 px" },
  { species: "curlop", path: "front.knots.2.d", after: 0.8692, why: "overlap at 48 px" },
  { species: "curlop", path: "front.knots.3.w", after: 0.872, why: "overlap at 48 px" },
  { species: "curlop", path: "front.knots.3.u", after: 0.954, why: "overlap at 48 px" },
  { species: "curlop", path: "front.knots.3.d", after: 0.7632, why: "overlap at 48 px" },
  { species: "curlop", path: "front.knots.3.k", after: -54.5, why: "overlap at 48 px" },
  { species: "curlop", path: "front.knots.4.w", after: 1.0028, why: "overlap at 48 px" },
  { species: "curlop", path: "front.knots.4.u", after: 0.9338, why: "overlap at 48 px" },
  { species: "curlop", path: "front.knots.4.d", after: 0.7896, why: "overlap at 48 px" },
  { species: "curlop", path: "front.knots.4.ds", after: 0.406, why: "overlap at 48 px" },
  { species: "curlop", path: "front.knots.5.w", after: 0.5936, why: "overlap at 48 px" },
  { species: "curlop", path: "front.knots.5.u", after: 0.564, why: "overlap at 48 px" },
  { species: "curlop", path: "front.knots.5.d", after: 0.6148, why: "overlap at 48 px" },
  { species: "curlop", path: "tail.knots.0.d", after: 0.6204, why: "overlap at 48 px" },
  { species: "curlop", path: "tail.knots.1.w", after: 0.4888, why: "overlap at 48 px" },
  { species: "curlop", path: "tail.knots.1.ds", after: 0.517, why: "overlap at 48 px" },
  { species: "curlop", path: "tail.knots.1.k", after: -18.8, why: "overlap at 48 px" },
  { species: "curlop", path: "tail.knots.2.d", after: 0.3102, why: "overlap at 48 px" },
  { species: "curlop", path: "tail.knots.2.ds", after: 0.799, why: "overlap at 48 px" },
  { species: "curlop", path: "tail.knots.2.k", after: -21.2, why: "overlap at 48 px" },
  { species: "curlop", path: "tail.coil.L", after: 1.974, why: "overlap at 48 px" },
  { species: "curlop", path: "tail.coil.W", after: 3.29, why: "overlap at 48 px" },
  { species: "curlop", path: "tail.coil.N", after: 0.893, why: "overlap at 48 px" },
  { species: "curlop", path: "camera.yaw", after: 65, why: "overlap at 48 px" },
  { species: "curlop", path: "camera.pitch", after: 18, why: "overlap at 48 px" },
  { species: "curlop", path: "coat.depth", after: 0.0848, why: "overlap at 48 px" },
];

// ---- ROUND2: round 1's SECTION3 with TRIAL1 folded in, plus the changes of design section 7 -----------------------------------------
// Each change is one line with its reason. `put` sets a number by path; structural changes assign directly. tuning.mjs (the round 2
// tuning, within the allowance of +-15 % on a number and 10 degrees on a camera, measured against ROUND2) restarts empty.
const put = (f, path, v) => { const ps = path.split("."); let o = f; for (let i = 0; i < ps.length - 1; i++) o = o[ps[i]]; o[ps.at(-1)] = v; };
const cumTo = (f, name) => { let s = 0; for (const k of f.front.knots) { s += k.ds; if (k.name === name) return s; } throw new Error(`no knot ${name}`); };
const kn = (f, name) => f.front.knots.find((k) => k.name === name);
const setSizes = (k, w, u, d) => { k.w = w; k.u = u ?? w; k.d = d ?? u ?? w; };
const setKnot = (k, str) => Object.assign(k, K(k.name, str, k.part));
export const ROUND2 = Object.fromEntries(Object.entries(SECTION3).map(([key, f]) => [key, applyTuning(f, TRIAL1.filter((t) => t.species === key))]));
{
  const R = ROUND2;
  // Curlop 7.1
  setKnot(R.curlop.tail.knots[0], ".45 190 0|.74 .72 .68"); // seat/root 0.82 (the tuned .62 gave 0.786: curlop.d failed)
  Object.assign(R.curlop.tail.coil, { N: 0.95, W: 4.5, L: 2.2 }); // a/rho .515 at the type, .570 at N 1.3 (limit .636): the owner's tight half
  // Wickle 7.2
  setKnot(kn(R.wickle, "top"), ".45 -10 -5|.48 .46 .47"); // the drop narrows into the plume: outer slope at the join .58
  setKnot(kn(R.wickle, "mid"), ".40 -25 -20|.33 .31 .32"); // plume radius .48 > .33 > .24: never increases to the tip
  setKnot(kn(R.wickle, "end"), ".38 -40 -45|.24 .23 .23"); // the last knots ramp psi toward the coil plane (design 5.3)
  Object.assign(R.wickle.front.coil, { N: 1.3, W: 6, L: 1.8, plane: -85 }); // a/rho .42 against a limit of .714
  // Drapet 7.3
  setKnot(kn(R.drapet, "top"), ".40|.70 .68 .68"); // the stand's top rows (.05-.3 H) are 10-13 px wider than the trial's
  Object.assign(R.drapet.hair, { Ld: 0.3, flare: 0.06, partLine: 0.987, depth: 0.2, locks: 17, notch: 0.1, lift: 0.015, splay: 0.04 }); // hang law (5.5) and hem of 17 locks (5.6)
  delete R.drapet.hair.lobes; delete R.drapet.hair.hem; delete R.drapet.hair.gamma;
  // ---- limbs (design 4) ----
  const toes = (count, length, r, fan, nail) => ({ count, length, r, fan, down: 25, nail });
  // Curlop 7.1: legs on the tail chain, the shin solved to the seat; hands by target (a two-bone reach)
  R.curlop.branches[0] = { id: "leg", part: "legs", pair: true, parent: "tail", solve: true, root: { s: 0.3, angle: 150, out: 0.75 }, dir: [0.45, 0.3, -1], blend: 0.18, // the trial's legs hung 0.54 U above the floor
    toes: toes(3, 0.07, 0.04, 25, 0.6), knots: [K("leg0", "0|.30"), K("shin", ".29 -40|.27"), K("foot", ".30 0|.22 .13 .12")] };
  Object.assign(R.curlop.branches[1], { reach: { target: { sigma: 1.15, lateral: 0.06, out: 0.05 }, pole: [-0.4, 1, 0.2] }, // palms at the chest's ventral surface, out and back elbows
    knots: [K("arm0", "0|.15"), K("arm1", ".24|.14"), K("elbow", ".06 150|.13"), K("arm3", ".24 0 0|.12"), K("hand", ".10|.15 .10 .10")] });
  delete R.curlop.branches[1].dir; R.curlop.branches[1].dir = [0.35, 0.5, -1]; delete R.curlop.branches[1].normal;
  Object.assign(R.curlop.camera, { yaw: 55, pitch: 10 }); // the trial's 65/18 hid the face (7.1)
  // Wickle 7.2: feet and arms, the base cut 0.03 U above the floor
  R.wickle.branches[0] = { id: "foot", part: "feet", pair: true, solve: true, root: { sigma: 0, angle: 160, out: 0.85 }, dir: [0.6, 0.3, -1], blend: 0.06, knots: [K("foot0", "0|.12"), K("shin", ".47|.15 .09 .09")] };
  R.wickle.branches.push({ id: "arm", part: "arms", pair: true, root: { sigma: 0.55, angle: 100, out: 0.85 }, dir: [0.2, 0.45, -1], blend: 0.14, knots: [K("arm0", "0|.15 .13 .13"), K("arm1", ".20|.13 .11 .11"), K("hand", ".08|.09")] });
  R.wickle.look.slots.arms = "coat"; R.wickle.hover = 0.03;
  R.wickle.contacts = [{ kind: "base" }, { kind: "branches", id: "foot", last: true }];
  // Loika 7.4: root out .85, splay .55, toes 3 x .08 (r .05, fan 30); the hind feet set the floor, the fore legs solve
  for (const b of R.loika.branches.filter((x) => x.id === "hind" || x.id === "fore")) { b.root.out = 0.85; b.dir[1] = 0.55; b.toes = toes(3, 0.08, 0.05, 30, 0.7); }
  R.loika.branches.find((x) => x.id === "fore").solve = true; R.loika.branches.find((x) => x.id === "fore").knots[1].name = "shin";
  // Rupar 7.5: the fore shins are solved (the lower leg segment); the hind feet set the floor
  { const fore = R.rupar.branches.find((x) => x.id === "fore"); fore.solve = true; fore.knots[3].name = "shin"; }
  // ---- heads and necks (7.4, 7.5) ----
  { const ks = R.loika.front.knots, set = (n, str) => setKnot(ks.find((k) => k.name === n), str);
    // Loika's head at x .71 of round 1 (the trial's x .6 shrank it below the neck), raised above a lower back, the neck pinched to .75
    set("pelvis", "0|.74 .60 .64"); set("belly", ".28 0|.83 .64 .74"); set("chest", ".30 30|.78 .64 .68"); set("chin", ".22 95 8|.50 .54 .40");
    set("head", ".36 -50 12|.70 .65 .57"); set("stop", ".26 -80|.60 .43 .51"); set("snout", ".14 -40|.44 .25 .35");
    R.loika.nape = 0.2;
    // three broad lenses (.47 long, .26 wide); the sides x .9 at dir (-.1, +-.75, .65)
    const leaf = [".04 .02 .02", ".10 -40|.10", ".16 -60|.13", ".14 -60|.09", ".07|.01"];
    const lk = (m) => [K("", `0|${[.04, .02, .02].map((v) => v * m).join(" ")}`), K("", `.10 -40|${.10 * m}`), K("", `.16 -60|${.13 * m}`), K("tip", `.14 -60|${.09 * m}`), K("end", `.07|${.01 * m}`)];
    const bm = R.loika.branches.find((b) => b.id === "leafM"), bs = R.loika.branches.find((b) => b.id === "leafS");
    bm.knots = lk(1); bm.dir = [-0.1, 0, 1]; bs.knots = lk(0.9); bs.dir = [-0.1, 0.75, 0.65];
    Object.assign(R.loika.camera, { yaw: -28, pitch: 14 }); } // the art looks at the face, not the flank
  { const ks = R.rupar.front.knots, set = (n, str) => setKnot(ks.find((k) => k.name === n), str);
    // a forward-leaning neck (56 degrees, not 77 at the throat) curving into a head 1.2 x larger, the head turned +20/+30 (profile, as the art)
    set("withers", ".34 60|.26 .30 .30"); set("neckbase", ".26 100|.16 .19 .21"); set("throat", ".62 -20 20|.10 .12 .13");
    set("poll", ".18 -160 30|.18 .20 .19"); set("stop", ".24 -170|.15 .15 .15"); set("nose", ".24 -40|.075 .07 .09");
    R.rupar.branches.find((b) => b.id === "horn").root.sigma = 1.82;
    const ear = R.rupar.branches.find((b) => b.id === "ear"); Object.assign(ear, { root: { sigma: 1.84, angle: 60, out: 0.6 }, dir: [-0.3, 1, 0.6], knots: [K("ear0", "0|.04 .016 .016"), K("ear1", ".12|.10 .016 .016"), K("ear2", ".14|.12 .016 .016"), K("tip", ".10|.02 .016 .016")] });
    Object.assign(R.rupar.camera, { yaw: 40, pitch: 10 }); }
  // ---- faces (7.1-7.5): the face model of design 2 ----
  const eye = (r, ex, ey, extra = {}) => ({ r, ex, ey, ...extra });
  R.curlop.face = { sigma: +(cumTo(R.curlop, "cap") - 0.1).toFixed(4), phi: 20, R: 0.42, aspect: 1.3, relief: 0.01, eyes: eye(0.2, 0.4, 0.08), nose: { kind: "button", r: 0.025, y: -0.1 }, mouth: { kind: "w", y: -0.16, w: 0.16, s: 0.2, t: 0.03 }, belly: R.curlop.face.belly };
  R.wickle.face = { sigma: 1.25, phi: 80, R: 0.55, aspect: 1.15, relief: 0.015, eyes: eye(0.127, 0.31, 0.09), nose: { kind: "button", r: 0.04, y: -0.12 }, mouth: { kind: "smile", y: -0.19, w: 0.06, s: 0.3, t: 0.025 } }; // the trial's face sat at .36 H, the stand's at .485 H
  R.drapet.face = { sigma: 1.05, phi: 85, R: 0.3, aspect: 1.2, relief: 0, eyes: eye(0.1, 0.2, 0.045), nose: { kind: "button", r: 0.03, y: -0.04 },
    opening: { omega: 0.34, gap: 0.6, locks: 4, amp: 0.025, setback: 0.02, taper: 0.04 } }; // hair opens over the face: no window, no socket
  delete R.drapet.hair.window;
  R.loika.face = { sigma: +(cumTo(R.loika, "head") + 0.1).toFixed(4), phi: 10, R: 0.55, aspect: 1.3, plateDy: -0.35, relief: 0, eyes: eye(0.22, 0.36, 0.1), nose: { kind: "nostrils", r: 0.02, tip: true, gap: 0.035 }, mouth: { kind: "line", y: -0.3, w: 0.42, s: 0.15, t: 0.02 }, belly: R.loika.face.belly }; // plateDy, mouth y: assumed (the design gives the patch only as the art's lower face)
  R.rupar.face = { sigma: 1.98, phi: 15, R: 0.2, aspect: 1, plateDy: -0.2, relief: 0, eyes: eye(0.075, 0.13, 0.03, { aspect: 0.65 }), nose: { kind: "pad", r: 0.045, tip: true }, mouth: { kind: "line", y: -0.1, w: 0.12, s: 0.1, t: 0.015 } };
  Object.assign(R.loika.look.eyes, { pupil_r: 0.22, iris_r: 0.7 }); delete R.loika.look.eyes.big; // rim .30 cream, iris .45 amber, pupil .22
  Object.assign(R.rupar.look.eyes, { pupil_r: 0.45, iris_r: 0.65, rim: [236, 224, 200] }); // a light ring .35 round the almond (the trial's was brown)
  // the coat has no lock noise and no bare patch (design 0.2-0.3, 5.4)
  for (const f of Object.values(R)) if (f.coat) { delete f.coat.locks; delete f.coat.bare; }
}
// every unnamed branch knot gets a name, branch id and position (the levers and the tests name knots)
for (const f of Object.values(ROUND2)) for (const b of f.branches) b.knots.forEach((k, i) => { if (!k.name) k.name = `${b.id}${i}`; });

// SPECIES is ROUND2 with the round 2 tuning applied (tuning.mjs, listed with before and after in the report).
export const SPECIES = Object.fromEntries(Object.entries(ROUND2).map(([k, f]) => [k, applyTuning(f, TUNING.filter((t) => t.species === k))]));

export const ORDER = ["curlop", "wickle", "drapet", "loika", "rupar"];
export const cloneForm = (f) => structuredClone(f);

// The stand camera: yaw 0 faces the viewer, + turns the face to the viewer's right; pitch raises the camera.
// Orthographic basis: right, up (screen), toward (the viewer).
export function cameraBasis({ yaw, pitch }) {
  const y = (yaw * Math.PI) / 180, p = (pitch * Math.PI) / 180;
  const right = [Math.sin(y), Math.cos(y), 0], tv = [Math.cos(y), -Math.sin(y), 0];
  const toward = [tv[0] * Math.cos(p), tv[1] * Math.cos(p), Math.sin(p)];
  const up = [-tv[0] * Math.sin(p), -tv[1] * Math.sin(p), Math.cos(p)];
  return { right, up, toward };
}
