// The art director's layer table on Pods' words: every scene of Pods (tests/pods-scenes.mjs: the inventory, the tray, Find, the reading room, the overlay) and the Compare cases of
// tests/vectors/pods-words.json is drawn with palette-exact pictures for the ids the table calls art and pictures outside the palette
// (a painted master's stand-in) for every other id; chrome (pass 1) and chrome + art (pass 2) must then read 0 pixels outside the palette, and the painted layer must show them (pass 3 reads more).
// A picture tagged art that the table calls painted, or the reverse, fails here. Skipped when the face has not been built (build.sh).
//   node --test prototypes/face/tests/layers.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { withPolicy } from "./node-scene.mjs";
import { bootFace } from "../../station/src/face-lvgl.mjs";
import { decodePNG } from "../../ui/png.mjs";
import { policyOf } from "../../ui/asset-policy.mjs";
import { podsCases } from "./pods-scenes.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist"), built = existsSync(path.join(dist, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
const specs = path.resolve(here, "../../ui/specs/station"), frameSpec = JSON.parse(readFileSync(path.join(specs, "frame.json"), "utf8")), podsSpec = JSON.parse(readFileSync(path.join(specs, "pods.json"), "utf8"));
const palette = JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours;
const cases = [...podsCases(), ...JSON.parse(readFileSync(path.join(here, "vectors/pods-words.json"), "utf8")).cases.filter((c) => c.state === "compare")];
const inPalette = new Set(palette.map(([, hex]) => hex.toLowerCase())), rgbs = palette.map(([, hex]) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)));
const hex = (r, g, b) => "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");

// The table is ui/asset-policy.mjs, the host's too (lvgl-switch.md §2.1): art ids are drawn palette-exact, every other id as a painted master's stand-in outside the palette. The kin ring and the hatch are art as
// placeholders and painted once their master is placed (status "master"); the real masters below are placed.
const statusOf = (id) => (id in MASTERS ? "master" : "placeholder");
const isArt = (id) => policyOf(id, statusOf(id)) === "art";
// The signed masters that are placed (ui/assets/masters/pods) are used as they are: the kin ring, the hatch and the "differs" lamp have left the palette, so they are painted. (Art while a placeholder, painted once
// the master is placed: the art director's rule; until the asset message carries the policy the words tag the placed masters.)
const MASTERS = { "kinring:56": "ring-kin-56x56.png", "hatch:80x56": "ring-hatch-80x56.png", "frame-lamp-12-amber:12x12": "frame-lamp-12-amber.png" };
const realMaster = (id) => { const f = MASTERS[id]; if (!f) return null; const png = decodePNG(readFileSync(path.resolve(here, "../../ui/assets/masters/pods", f))); return { w: png.width, h: png.height, data: png.data, status: "master" }; };
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const standIn = (id, w, h, slice, tile, salt = 0) => {
  const real = realMaster(id); if (real) return real;
  const d = new Uint8ClampedArray(w * h * 4), k = hash(id) + salt;
  let rgb; if (isArt(id)) rgb = rgbs[k % rgbs.length]; else { rgb = [70 + (k & 127), 70 + ((k >> 7) & 127), 70 + ((k >> 14) & 127)]; while (inPalette.has(hex(...rgb))) rgb[0]++; }
  for (let i = 0; i < w * h; i++) { d[i * 4] = rgb[0]; d[i * 4 + 1] = rgb[1]; d[i * 4 + 2] = rgb[2]; d[i * 4 + 3] = 255; }
  return { w, h, data: d, status: statusOf(id), ...(slice ? { slice, tile } : {}) };
};
async function setup(c, salted = null) {
  const f = await bootFace(pathToFileURL(dist + "/"), { test: true });
  assert.equal(f.send({ t: "palette", name: "station", colours: palette }), 0); assert.equal(f.send({ t: "spec", screen: "frame", json: frameSpec }), 0); assert.equal(f.send({ t: "spec", screen: "pods", json: podsSpec }), 0);
  for (const p of c.pictures) f.handleOf(p.id, withPolicy((id) => (id === p.id ? standIn(id, p.w, p.h, p.slice, p.tile, id === salted ? 1 : 0) : null)));   // a probe for another id (a founder's adult master) finds none
  return f;
}
const frames = (f, n = 3) => { for (let i = 0; i < n; i++) f.frame((f.t = (f.t ?? 0) + 16)); };

let painted = 0;
for (const c of cases) {
  test(`layers, Pods ${c.state}: ${c.name}`, { skip }, async () => {
    const f = await setup(c);
    assert.equal(f.props(c.props), 0, f.errors().join("; ")); frames(f);
    if (c.events) { const t0 = f.t; for (const e of c.events) assert.equal(f.send({ t: "event", ...e }), 0); f.frame(t0 + c.at); }
    f.pass(1); assert.equal(f.offPalette(), 0, "chrome reads pixels outside the palette");
    f.pass(2); assert.equal(f.offPalette(), 0, "chrome and art read pixels outside the palette");
    f.pass(3); painted += f.offPalette();
  });
}
test("the check bites: the painted layer shows pictures outside the palette in some case", { skip }, () => { assert.ok(painted > 0, "no case drew a painted picture"); });

// An art piece wrongly put on the painted layer would escape the palette check (it would simply not show on pass 2). So each art id the cases draw is also checked to be visible: its stand-in
// recoloured, the pass-2 frame must change.
const artSeen = new Map(); for (const c of cases) for (const p of c.pictures) if (isArt(p.id) && !artSeen.has(p.id)) artSeen.set(p.id, c);
const pass2 = async (c, salted) => { const f = await setup(c, salted); assert.equal(f.props(c.props), 0); frames(f); if (c.events) { const t0 = f.t; for (const e of c.events) f.send({ t: "event", ...e }); f.frame(t0 + c.at); } f.pass(2); return f.hash(); };
for (const [id, c] of artSeen) {
  test(`layers, the art id ${id} shows on pass 2`, { skip }, async () => {
    const same = await pass2(c, null), changed = await pass2(c, id);
    assert.notEqual(same, changed, `${id} is drawn in "${c.name}" but does not show with chrome and art`);
  });
}

test("the placed masters of the kin ring, the hatch and the differs lamp are off the palette, so they are painted: pass 2 reads 0 and pass 3 shows the painted (on the reading screen); Compare draws no lamp (a difference is a word, never amber)", { skip }, async () => {
  for (const id of Object.keys(MASTERS)) { const m = realMaster(id); let off = 0; for (let i = 0; i < m.data.length; i += 4) if (m.data[i + 3] > 0 && !inPalette.has(hex(m.data[i], m.data[i + 1], m.data[i + 2]))) off++; assert.ok(off > 0, `${id} is on the palette; it could be art`); }
  const ov = cases.find((c) => c.state === "read" && /a read chapter open/.test(c.name));
  const f = await setup(ov); assert.equal(f.props(ov.props), 0, f.errors().join("; ")); frames(f);
  f.pass(2); assert.equal(f.offPalette(), 0, ov.name + ": pass 2"); f.pass(3); assert.ok(f.offPalette() > 0);
  for (const c of cases.filter((x) => x.state === "compare")) assert.ok(!c.pictures.some((p) => /lamp/.test(p.id)), c.name + ": no lamp in Compare");
});


// (the kin ring and the hatch switched layer with their master on Pods' old overview; neither is drawn on Pods now)
// a palette-exact picture of an id's own, for the placeholders
function standInArt(id, w, h) { const d = new Uint8ClampedArray(w * h * 4), c = rgbs[hash(id) % rgbs.length]; for (let i = 0; i < w * h; i++) { d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = 255; } return { w, h, data: d }; }

// The Sitting's three families (ui/asset-policy.mjs; the art director confirmed them, 2026-10-24): one case each
test("the Sitting's gilt, at rest and lit, is art at either status (palette-exact); another size or an unknown gilt is in no family", () => {
  for (const id of ["sitting-gilt-560x424", "sitting-gilt-lit-560x424", "sitting-gilt-560x424:560x424", "sitting-gilt-lit-560x424:560x424"]) for (const st of ["placeholder", "master"]) assert.equal(policyOf(id, st), "art", `${id} ${st}`);
  for (const bad of ["sitting-gilt-560x400", "sitting-gilt-dim-560x424"]) assert.throws(() => policyOf(bad, "master"), /no layer family/, bad);
});
test("the Sitting's place cards and thumbs (96 and 48) of the five places are painted at either status; another size or place is in no family", () => {
  for (const g of ["meadow", "pond", "rock", "wood", "cave"]) for (const s of ["96x96", "48x48", "96x96:96x96", "48x48:48x48"]) for (const st of ["placeholder", "master"]) assert.equal(policyOf(`place-${g}-${s}`, st), "painted", `place-${g}-${s} ${st}`);
  for (const bad of ["place-wood-64x64", "place-beach-96x96"]) assert.throws(() => policyOf(bad, "master"), /no layer family/, bad);
});
test("the Sitting's five place backdrops are painted at either status; the plain backdrop of old is in no family", () => {
  for (const g of ["meadow", "pond", "rock", "wood", "cave"]) for (const s of ["", ":544x408"]) for (const st of ["placeholder", "master"]) assert.equal(policyOf(`sitting-backdrop-${g}-544x408${s}`, st), "painted", `${g}${s} ${st}`);
  for (const bad of ["sitting-backdrop-plain-544x408", "sitting-backdrop-wood-528x392"]) assert.throws(() => policyOf(bad, "master"), /no layer family/, bad);
});
