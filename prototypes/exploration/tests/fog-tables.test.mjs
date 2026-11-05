// The three fog changes: the lightest grass fogs to fog (the page's map table and the meadow palette's place table say the same), the Shade's asleep
// wash is one table (built here, not drawn yet), and no cool colour survives that wash. Nothing else in the page's fog table moves.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { makePage } from "./page-harness.mjs";
import * as A from "../src/atlas.mjs";

const FILE = JSON.parse(readFileSync(new URL("../../../art/companion-48/terrain/meadow/meadow-palette.json", import.meta.url), "utf8"));
const rgbOf = e => [1, 3, 5].map(i => parseInt(e.hex.slice(i, i + 2), 16));
const NAMES = FILE.entries.map(e => e.name), at = n => NAMES.indexOf(n);
// the page's own rule, written again here: mix toward a target, then the nearest by weights 3, 4 and 2 among the first n colours
const nearest = (rgb, [r, g, b], n) => { let best = 0, bd = 1e9; for (let i = 0; i < n; i++) { const [R, G, B] = rgb[i], d = (R - r) ** 2 * 3 + (G - g) ** 2 * 4 + (B - b) ** 2 * 2; if (d < bd) { bd = d; best = i; } } return best; };
const mixTo = (rgb, target, t, n) => rgb.map(c => nearest(rgb, c.map((v, k) => v + (rgb[target][k] - v) * t), n));
const RGB100 = FILE.entries.map(rgbOf);

test("sprout fogs to fog in the page's table (map) and in the palette's place fog; no other core fog entry moved", () => {
  const p = makePage(), fog = Array.from(p.run("FOGLUT.slice(0, 48)"));
  const want = mixTo(RGB100.slice(0, 48), at("bone"), .62, 48); want[at("sprout")] = at("fog");
  assert.deepEqual(fog, want);
  assert.equal(fog[at("sprout")], at("fog"));
  assert.equal(FILE.entries[at("sprout")].fog, at("fog"), "the palette's place fog");
  assert.notEqual(mixTo(RGB100.slice(0, 48), at("bone"), .62, 48)[at("sprout")], at("fog"), "(it was lime before)");
});

test("the Shade's wash: every colour 48 % toward bone, to the nearest core colour, cool ones to mist; one table over all 100 entries once the palette is in (built, not drawn yet)", () => {
  const p = makePage();
  const cool = ["sky", "ice", "river", "aqua", "mint"].map(at), want = mixTo(RGB100, at("bone"), .48, 48).map(q => cool.includes(q) ? at("mist") : q);
  assert.deepEqual(Array.from(p.run("SHADE_WASH")), want.slice(0, 48), "the core's own 48 before any palette");
  const core = p.run("({ names: PALETTE.map(q => q[0]), dark: DARK.slice(0, 48), light: LIGHT.slice(0, 48), dark2: DARK2.slice(0, 48), fog: FOGLUT.slice(0, 48), fade: FADE.slice(0, 48) })");
  const table = A.paletteTable(p.run("RGB.slice(0, 48)"), core, FILE); assert.equal(table.errors, undefined, String(table.errors));
  p.ctx.__t = table; p.run("atlasInstall([], __t, undefined)");
  assert.deepEqual(Array.from(p.run("SHADE_WASH")), want, "all 100");
  assert.ok(want.every(q => q < 48 && !cool.includes(q)), "no cool colour comes out of the wash");
  assert.ok(p.run("REMAP[3] === FOGLUT && REMAP_PLACE[3] === PLACE_FOG"), "no drawing reads the wash yet: every place keeps the fog tables");
});
