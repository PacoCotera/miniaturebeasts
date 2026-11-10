// The per-light grade of the residents (global fix 7; the architect's ruling 2026-10-15 04:32): a resident's picture on Vivarium, Home, Idle and Habitat (close view) takes the scene's background light.
// A derived picture of its signed master, never code-drawn: rgb_out = srgb(lin(rgb_master) × GAIN[light]) per pixel, alpha unchanged, rounded to nearest with ties to even (numpy's round, as the oracle).
// The oracle is the art director's art/station-masters/pods/concepts/light-grade/light-grade.py (masters-pods 917a4801); this file is its arithmetic in its order, as a 256-entry table per channel, so the
// per-pixel work is integer lookups only and the goldens are byte-identical on WASM and native. Pure: no DOM, no clock. The face receives the graded pixels by the ordinary `asset` message (no recolour, no opa, no overlay).
import { stepOfKey } from "./light-curve.mjs";
import { assetEntry, asset as assetOf, registerAsset, hasAsset, dropAsset, manifest } from "../../ui/assets.mjs";

// Linear-light gains (R, G, B) per light, the art director's (masters-pods 917a4801). No gain exceeds 1: a resident is never brighter than its master. One block: the art director changes a gain on one line.
export const GAIN = {
  dawn: [0.86, 0.90, 1.00],
  day: [1, 1, 1],
  dusk: [1.00, 0.78, 0.72],
  night: [0.58, 0.50, 0.43],
};
export const LIGHTS = Object.keys(GAIN);

const lin = (a) => { a = a / 255; return a <= 0.04045 ? a / 12.92 : ((a + 0.055) / 1.055) ** 2.4; };
const srgb = (l) => { l = Math.min(1, Math.max(0, l)); return (l <= 0.0031308 ? l * 12.92 : 1.055 * l ** (1 / 2.4) - 0.055) * 255; };
const roundEven = (x) => { const r = Math.round(x); return Math.abs(x % 1) === 0.5 ? 2 * Math.round(x / 2) : r; };   // to nearest, a half to the even neighbour (Math.round takes it up)

const tableOf = (gain) => {   // Uint8Array(768), R0..R255, G0..G255, B0..B255
  const t = new Uint8Array(768);
  for (let c = 0; c < 3; c++) for (let v = 0; v < 256; v++) t[c * 256 + v] = roundEven(srgb(lin(v) * gain[c]));
  return t;
};
export const LUT = Object.fromEntries(LIGHTS.map((light) => [light, tableOf(GAIN[light])]));

// The day cycle (scheme revision 2): a light is a name (the four above) or a step key of the curve ("@Lmm" in the loop, "@HHMM" on the real clock; light-curve.mjs). A resident's gain at a step is the
// steps's painting mix of the residents' GAIN (linear light) times the step's own gain (deep, cool, warm, cloud); never above 1. The host gives the curve once (frame.json light.curve).
let CURVE = null;
export const useCurve = (C) => { CURVE = C; STEPS.clear(); };
const STEPS = new Map();   // key -> { gain, lut }
const stepOf = (key) => {
  if (STEPS.has(key)) return STEPS.get(key);
  const s = CURVE && stepOfKey(key, CURVE); if (!s) return null;
  const gain = [0, 1, 2].map((c) => Object.entries(s.mix).reduce((a, [k, v]) => a + v * GAIN[k][c], 0) * s.gain[c]);
  const e = { gain, lut: tableOf(gain) }; STEPS.set(key, e); return e;
};
export const gainOfKey = (key) => GAIN[key] ?? stepOf(key)?.gain ?? null;
const lutOf = (key) => LUT[key] ?? stepOf(key).lut;

const needLight = (light) => { if (!GAIN[light] && !stepOf(light)) throw new Error(`light-grade: "${light}" is not a light (${LIGHTS.join(", ")}) or a step of the curve`); };

// Two signed paintings of one room mixed in linear light, then the step's gain (at most 1): out = srgb((lin(a)·(1−w) + lin(b)·w) · gain), per channel, alpha from a. a, b: { w, h, rgba() } of one size;
// w: the share of b, 0..1; gain: [r, g, b]. Rounded to nearest, ties to even, as the oracle (tools/light-mix-oracle.py). The room pictures of a step are this; nothing is drawn.
const LIN = new Float64Array(256).map((_, v) => lin(v));
export function mixGrade(a, b, w, gain) {
  if (a.w !== b.w || a.h !== b.h) throw new Error("light-grade: mixGrade needs two pictures of one size");
  let data = null;
  return { w: a.w, h: a.h, rgba: () => {
    if (data) return data;
    const s = a.rgba(), u = b.rgba(); data = new Uint8ClampedArray(s.length);
    for (let i = 0; i < s.length; i += 4) {
      for (let c = 0; c < 3; c++) data[i + c] = roundEven(srgb((LIN[s[i + c]] * (1 - w) + LIN[u[i + c]] * w) * gain[c]));
      data[i + 3] = s[i + 3];
    }
    return data;
  } };
}

// A graded copy of a picture { w, h, rgba() }: RGB through the table, alpha copied, straight alpha throughout (the RGB of transparent pixels is mapped too, as the oracle does). Day is the picture itself.
export function grade(picture, light) {
  needLight(light); if (light === "day") return picture;
  let data = null; const t = lutOf(light);
  return { w: picture.w, h: picture.h, rgba: () => {
    if (data) return data;
    const s = picture.rgba(); data = new Uint8ClampedArray(s.length);
    for (let i = 0; i < s.length; i += 4) { data[i] = t[s[i]]; data[i + 1] = t[256 + s[i + 1]]; data[i + 2] = t[512 + s[i + 2]]; data[i + 3] = s[i + 3]; }
    return data;
  } };
}

// The resident masters: the stills at every size and the moving-set cells (the contact shadows are not graded: the art director's answer).
const RESIDENT = /^mibi-(juvenile|adult)-S\d{2}-(?!shadow-)/;
const graded = (id, light) => `${id}:${light}`;
// The id of the graded picture of a placed resident master at a light, registered on first ask (derived, built lazily and cached, never sent to the face itself); the master's own id at day or when the master is not placed
// (the caller falls through to its stand-in, ungraded). Throws for a master outside the resident families (halo, bed, paintings, founder) and for an unknown light.
export function gradedOf(masterId, light) {
  needLight(light);
  if (!RESIDENT.test(masterId)) throw new Error(`light-grade: ${masterId} is not a resident master`);
  if (light === "day") return masterId;
  const m = assetEntry(masterId); if (!m || !m.file || m.status === "empty") return masterId;
  const id = graded(masterId, light);
  if (!hasAsset(id)) registerAsset({ id, w: m.w, h: m.h, status: "derived", until: null, build: () => grade(assetOf(masterId), light) });
  return id;
}
// Forget a light's derived pictures (the host drops them when the light changes; a table pass re-derives them from the cached master if the light returns).
export function dropLight(light) {
  needLight(light); const tail = ":" + light;
  for (const e of manifest()) if (e.id.endsWith(tail) && /^(mibi-(juvenile|adult)-S\d{2}-|mibi:|moving:)/.test(e.id)) dropAsset(e.id);
}
