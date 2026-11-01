// Day 1 of chunk 1: the masters against the house bands. The annotations in calibration/masters.json are read by eye; this turns them into the
// measures the house rules name, and reads each one through the house file. A master outside a band is reported, never fitted around.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { MB_HOME, HERE, RESULTS } from "./paths.mjs";
import { loadImage } from "./imgtools.mjs";
import { loadHouseFile } from "../form/house/house-file.mjs";
import { checkRules } from "../form/house/house.mjs";
import { measureAll } from "../form/house/measures.mjs";
import { loadSpecimens } from "./specimens.mjs";
import { express } from "./express.mjs";
import { makeTile } from "./sheets.mjs";
import { masterProfile } from "./silhouette.mjs";
import { MASTER } from "./paths.mjs";

// render-level values of the build at 304 (the nose against its muzzle, the ring's top against its bottom) and the same read off the signed master by boxes read by eye
const renderMeasures = (house, specimen) => { const t = makeTile(house, specimen, { sizes: [304] }); return { "nose-value/L": t.measured["nose-value/L"], "ring-shade/L": t.measured["ring-shade/L"] }; };
const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const Lstar = (d, i) => { const Y = 0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]); return Y > 0.008856 ? 116 * Math.cbrt(Y) - 16 : 903.3 * Y; };
function masterNoseValue(img) { // the nose mound's box (x 55-85, y 140-160) against the dark skin round it (x 40-100, y 140-175, L* under 45)
  let ns = 0, nn = 0, ms = 0, mn = 0;
  for (let y = 140; y <= 175; y++) for (let x = 40; x <= 100; x++) { const i = (y * img.width + x) * 4; if (img.data[i + 3] < 250) continue; const L = Lstar(img.data, i), inNose = x >= 55 && x <= 85 && y <= 160; if (inNose) { ns += L; nn++; } else if (L < 45) { ms += L; mn++; } }
  return ns / nn - ms / mn;
}
function masterRing(img) { // the near eye (centre 125, 147, iris radius 21): the cream ring's lower third's mean L* minus its upper third's
  const px = []; for (let y = 110; y <= 185; y++) for (let x = 90; x <= 160; x++) { const d = Math.hypot(x - 125, y - 147), i = (y * img.width + x) * 4; if (d > 24.5 && d < 29 && img.data[i + 3] > 250) { const L = Lstar(img.data, i); if (L > 55) px.push([y, L]); } }
  px.sort((a, b) => a[0] - b[0]); const k = Math.floor(px.length / 3), mean = (v) => v.reduce((s, q) => s + q[1], 0) / v.length; return mean(px.slice(-k)) - mean(px.slice(0, k));
}

const rad = (d) => (d * Math.PI) / 180;
export const loadMasters = () => JSON.parse(readFileSync(path.join(HERE, "calibration", "masters.json"), "utf8"));

// the silhouette's area (alpha >= 128), whole and core (minus the boxes of headgear, tail, wings and antennae)
export function areas(img, exclude = []) {
  let whole = 0, core = 0;
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) {
    if (img.data[(y * img.width + x) * 4 + 3] < 128) continue; whole++;
    if (!exclude.some(([x0, y0, x1, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1)) core++;
  }
  return { whole, core };
}

// the rig measures of one master, in pixels (ratios only leave this function)
export function measureMaster(m, img, kDepth = 0.85) {
  const { whole, core } = areas(img, m.exclude), S = m.floor - m.crown, f = m.yaw.face, E = Math.max(m.eyeNear.w, m.eyeNear.h);
  const eyeCy = (m.eyeNear.cy + m.eyeFar.cy) / 2, r = { plan: m.plan, S, E, eyeShare: E / Math.sqrt(core), eyeShareWhole: E / Math.sqrt(whole), spacing: Math.abs(m.eyeNear.cx - m.eyeFar.cx) / Math.cos(rad(f)) / E };
  r.yawFace = f; r.roll = m.roll; if (m.yaw.body !== null) { r.yawBody = m.yaw.body; r.yawHead = m.yaw.body - f; }
  r.mouthW = m.mouth.w / Math.cos(rad(f));
  if (m.headBottom !== undefined) {
    const H = m.headBottom - m.crown, Ws = m.headX[1] - m.headX[0], k = m.headKind === "round" ? 1 : kDepth;
    r.H = H; r.W = m.headKind === "round" ? Ws : Ws / (Math.cos(rad(f)) + k * Math.sin(rad(f)));
    r.eyeDrop = (eyeCy - m.crown) / H; r.mouthDrop = (m.mouth.cy - eyeCy) / H;
    if (m.nose) { r.noseW = m.nose.w / Math.cos(rad(f)); r.noseDrop = m.nose.cy - eyeCy; }
    if (m.bodyThick) r.T = m.bodyThick;
    r.Wf = r.W;
  } else { r.Wf = m.faceWindow[1] - m.faceWindow[0]; r.bodyW = m.bodyX[1] - m.bodyX[0]; r.domeOverS = (eyeCy - m.crown) / S; r.eyeOverBody = E / r.bodyW; }
  return r;
}

export function calibrate(house = loadHouseFile()) {
  const rows = [];
  for (const m of loadMasters().masters) {
    const img = loadImage(path.join(MB_HOME, m.file)), r = measureMaster(m, img), measured = measureAll(r);
    rows.push({ id: m.id, name: m.name, plan: m.plan, raw: r, measured, rules: checkRules(house, m.plan, measured, { kinds: m.noseKind ? { nose: m.noseKind } : null }), notes: m.notes });
  }
  return rows;
}

const f = (v, d = 2) => (v === null || v === undefined ? "-" : Number(v).toFixed(d));
export function toMarkdown(rows, house) {
  const L = [];
  L.push("# Chunk 1, day 1: the masters against the house bands", "");
  L.push(`House file: \`${house.id}\`. The masters were read by eye at 304 (\`foundation/calibration/masters.json\`, +-2 px); \`foundation/calibration.mjs\` makes this table. A value outside its band is a FAIL: it is reported, and no band was moved to make a master pass.`, "");
  L.push("## Measured values", "", "| master | plan | H/S | H/T | W/H | E/Wf | eye drop/H | spacing/E | forehead/H | eye to mouth/H | nose w/E | nose drop/E | mouth w/E | eye share (core) | eye share (whole) | yaw body | yaw face | yaw head | roll |", "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const r of rows) { const m = r.measured; L.push(`| ${r.id} ${r.name} | ${r.plan} | ${f(m["H/S"])} | ${f(m["H/T"])} | ${f(m["W/H"])} | ${f(m["E/Wf"])} | ${f(m["eye-drop/H"])} | ${f(m["spacing/E"])} | ${f(m["forehead/H"])} | ${f(m["eye-to-mouth/H"])} | ${f(m["nose-w/E"])} | ${f(m["nose-drop/E"])} | ${f(m["mouth-w/E"])} | ${f(m["eye-share"], 3)} | ${f(r.raw.eyeShareWhole, 3)} | ${f(m["yaw-body"], 0)} | ${f(m["yaw-face"], 0)} | ${f(m["yaw-head"], 0)} | ${f(m.roll, 0)} |`); }
  L.push("", "## One-mass masters (plan C)", "", "| master | E / body width | dome above the eye line / S | E / Wf |", "| --- | --- | --- | --- |");
  for (const r of rows.filter((x) => x.plan === "C")) L.push(`| ${r.id} ${r.name} | ${f(r.raw.eyeOverBody, 3)} | ${f(r.raw.domeOverS)} | ${f(r.measured["E/Wf"])} |`);
  L.push("", "## Each master against each band of its plan", "", "| master | rule | measure | value | band | status |", "| --- | --- | --- | --- | --- | --- |");
  for (const r of rows) for (const x of r.rules) { if (x.status === "not measured") continue; L.push(`| ${r.id} | ${x.id} | ${x.measure} | ${f(x.value, 3)} | ${x.range[0] ?? ""} to ${x.range[1] ?? ""} | ${x.status === "FAIL" ? "**FAIL**" : x.status}${x.status === "FAIL" ? ` by ${f(-x.margin, 3)}` : ""} |`); }
  const fails = rows.flatMap((r) => r.rules.filter((x) => x.status === "FAIL").map((x) => ({ master: r.id, ...x })));
  L.push("", "## Masters outside a band", "");
  if (!fails.length) L.push("None."); else for (const x of fails) L.push(`- ${x.master} ${x.id} (${x.measure}): ${f(x.value, 3)} against ${x.range[0] ?? ""} to ${x.range[1] ?? ""}.`);
  L.push("", "Read errors are about +-2 px on a 40 px eye (+-5 %) and +-5 degrees on the yaws. A miss smaller than that is a miss of the reading, not of the master.", "");
  return L.join("\n");
}

// the type specimens as the house builds them, against the master each was read from
export function specimenTable(house, rows) {
  const sp = loadSpecimens(house), keys = ["H/S", "H/T", "W/H", "E/Wf", "eye-drop/H", "spacing/E", "forehead/H", "eye-to-mouth/H", "nose-w/E", "nose-drop/E", "mouth-w/E", "eye-share", "yaw-body", "yaw-face", "yaw-head", "roll", "head-breadth/H", "far-eye-inside/H", "nose-far-eye/H", "chin-overhang/H", "nape-step/H", "back-70/S", "back-85/S", "back-95/S", "nose-mouth/E", "nose-value/L", "ring-shade/L"];
  const L = ["", "## The type specimens, as the house builds them, against their masters", "", `| value | ${Object.keys(sp).map((id) => `${id} master | ${id} house build`).join(" | ")} |`, `| --- | ${Object.keys(sp).map(() => "--- | ---").join(" | ")} |`];
  const built = Object.fromEntries(Object.keys(sp).map((id) => { const e = express(house, sp[id]); return [id, { ...e.measured, ...(sp[id].plan === "A" ? renderMeasures(house, sp[id]) : {}) }]; }));
  // the masters' extra values: the back line from the signed picture (crown set by eye at row 85, the leaves hiding it); the gap from the nose to the smile (the AD's reading, 0.35 E); the nose's value against its muzzle and the ring's top against its bottom from boxes read by eye on the picture
  const extra = { S01: (() => { const p = masterProfile(MASTER("S01", 304)), img = loadImage(MASTER("S01", 304)), ring = masterRing(img); return { "back-70/S": p.at[0.7], "back-85/S": p.at[0.85], "back-95/S": p.at[0.95], "nose-mouth/E": 0.35, "nose-value/L": masterNoseValue(img), "ring-shade/L": ring }; })() };
  for (const k of keys) { const cells = Object.keys(sp).map((id) => { const m = rows.find((r) => r.id === id).measured[k] ?? extra[id]?.[k], b = built[id][k]; return `${f(m, 2)} | ${f(b, 2)}`; }); if (cells.every((c) => c === "- | -")) continue; L.push(`| ${k} | ${cells.join(" | ")} |`); }
  const R = Object.keys(sp).flatMap((id) => { const e = express(house, sp[id]); return checkRules(house, sp[id].plan, e.measured, { kinds: sp[id].kinds }).filter((x) => x.on && x.status === "FAIL").map((x) => `${id} ${x.id} (${x.measure} ${f(x.value, 3)}, band ${x.range[0] ?? ""} to ${x.range[1] ?? ""})`); });
  L.push("", "House build rule failures at the type specimen (the render-level rules are in the sheets' labels): " + (R.length ? R.join("; ") : "none") + ".", "");
  return L.join("\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const house = loadHouseFile(), rows = calibrate(house), md = toMarkdown(rows, house) + specimenTable(house, rows);
  mkdirSync(RESULTS, { recursive: true });
  writeFileSync(path.join(RESULTS, "calibration.md"), md); writeFileSync(path.join(RESULTS, "calibration.json"), JSON.stringify(rows, null, 1));
  console.log(md);
}
