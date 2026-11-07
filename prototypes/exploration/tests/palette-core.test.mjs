// The core palette is 51 colours: the original 48 and the three sage colours (sageL, sage, sageD at 48-50, run letters w, x, y).
// Checks the page's palette count and run letters, and that the meadow palette file repeats the page's core and starts its extras at 51.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { pageRGB, pageTables } from "../tools/atlas-check.mjs";

const here = p => fileURLToPath(new URL(p, import.meta.url));
const html = readFileSync(here("../index.html"), "utf8");
const palSrc = /const PALETTE = \[([\s\S]*?)\n\];/.exec(html)[1];
const PAL = [...palSrc.matchAll(/\['(\w+)', '(#[0-9a-f]{6})'\]/g)].map(m => [m[1], m[2]]);
const LETTERS = /const RUN_LETTERS = '([^']+)'/.exec(html)[1];
const CORE_N = Number(/const CORE_N = (\d+)/.exec(html)[1]);
const meadow = JSON.parse(readFileSync(here("../../../art/companion-48/terrain/meadow/meadow-palette.json"), "utf8"));

test("the palette has 51 colours, the sage three at 48-50", () => {
  assert.equal(PAL.length, 51); assert.equal(CORE_N, 51); assert.equal(pageRGB().length, 51);
  assert.deepEqual(PAL.slice(48), [["sageL", "#bfccb6"], ["sage", "#87947f"], ["sageD", "#556251"]]);
  assert.equal(new Set(PAL.map(p => p[1])).size, 51, "no two colours share a hex");
  assert.equal(new Set(PAL.map(p => p[0])).size, 51, "no two colours share a name");
});
test("the run letters: one letter per colour, A-Z then a-y, the sage three w, x, y", () => {
  assert.equal(LETTERS.length, PAL.length);
  assert.equal(LETTERS, "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxy");
  assert.equal(new Set(LETTERS).size, 51);
  assert.deepEqual([LETTERS.indexOf("w"), LETTERS.indexOf("x"), LETTERS.indexOf("y")], [48, 49, 50]);
});
test("the page's lookup tables cover all 51 colours, and the sage three step among themselves as ruled", () => {
  const T = pageTables(), at = n => PAL.findIndex(p => p[0] === n);
  for (const f of ["dark", "light", "dark2", "fog", "fade"]) { assert.equal(T[f].length, 51, f); assert.ok(T[f].every(v => Number.isInteger(v) && v >= 0 && v < 51), f); }
  assert.deepEqual([T.dark[at("sageD")], T.dark[at("sage")], T.dark[at("sageL")]], [at("ink"), at("sageD"), at("sage")]);
  assert.deepEqual([T.light[at("sageD")], T.light[at("sage")], T.light[at("sageL")]], [at("sage"), at("sageL"), at("bone")]);
});
test("the meadow palette file repeats the page's 51 core entries and its biome extras start at 51", () => {
  const T = pageTables(), E = meadow.entries;
  assert.ok(E.length > 51, "the biome extras follow the core");
  E.forEach((e, k) => assert.equal(e.i, k, "entry " + k + " has i " + e.i));
  for (let i = 0; i < 51; i++) {
    assert.equal(E[i].name, PAL[i][0], "name " + i); assert.equal(E[i].hex, PAL[i][1], "hex " + i);
    for (const f of ["dark", "light", "dark2"]) assert.equal(E[i][f], T[f][i], f + " " + i);
    for (const f of ["fog", "fade"]) assert.ok(Number.isInteger(E[i][f]) && E[i][f] >= 0 && E[i][f] < E.length, f + " " + i);
  }
  assert.ok(E.slice(51).every(e => !PAL.some(p => p[1] === e.hex)), "no extra repeats a core colour");
});
