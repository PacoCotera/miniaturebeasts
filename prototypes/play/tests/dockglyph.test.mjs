// The Dock glyph component v4: the pixel lead's grid A (16 x 24, 11-15), the same pixels in every state, one token ink per state, holes of 2 px or more.
// node --test prototypes/play/tests/dockglyph.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as mod from "../src/dockglyph.mjs";
import { GLYPH_W, GLYPH_H, GRID, TOKEN_HEX, STATE_TOKEN, glyphMap, glyphPixels, glyphShadow } from "../src/dockglyph.mjs";

const tokens = JSON.parse(readFileSync(new URL("../../ui/tokens/tokens.json", import.meta.url), "utf8"));
const find = (o, k) => { for (const [n, v] of Object.entries(o)) { if (n === k && v && v.$value) return v.$value; if (v && typeof v === "object") { const r = find(v, k); if (r) return r; } } };
const STATES = ["away", "lit", "docked"];
const DRAWN = [
  "..############..", ".##############.", "###..........###", "###..........###", "###..........###", "###..........###",
  "###..........###", "###..........###", "###..........###", "###..........###", "###..........###", "###..........###",
  "###..........###", "################", "################", "####..##########", "####..####....##", "##......##....##",
  "##......##....##", "####..####....##", "####..##########", "################", ".##############.", "..############..",
];

test("the hexes are tokens.json's", () => { for (const [name, hex] of Object.entries(TOKEN_HEX)) assert.equal(hex, find(tokens, name), name); });

test("the grid equals the 24 strings drawn; 16 x 24; no fallback grid remains", () => {
  assert.deepEqual(GRID, DRAWN);
  assert.deepEqual([GLYPH_W, GLYPH_H], [16, 24]);
  assert.equal(GRID.length, 24);
  for (const r of GRID) assert.equal(r.length, 16);
  for (const k of ["GRID_22", "GRID_22_Y0", "GRID_24", "SHIP", "GRID_Y0"]) assert.equal(mod[k], undefined, k + " is gone");
  const m = glyphMap();
  assert.equal(m.length, 24);
  m.forEach((r, y) => assert.equal(r, DRAWN[y].replace(/#/g, "o"), "row " + y));
});

test("the same pixels in all three states", () => {
  const key = (s) => glyphPixels({ state: s }).map((p) => p.x + "," + p.y).join(";");
  assert.equal(key("away"), key("lit"));
  assert.equal(key("lit"), key("docked"));
});

test("each state's colour is its token; only that token, no partial alpha", () => {
  assert.deepEqual([STATE_TOKEN.away, STATE_TOKEN.lit, STATE_TOKEN.docked], ["mist", "ink", "ink"]);
  for (const state of STATES) {
    const px = glyphPixels({ state }), want = state === "away" ? TOKEN_HEX.mist : TOKEN_HEX.ink;
    assert.ok(px.length > 0);
    for (const p of px) { assert.equal(p.hex, want, state); assert.match(p.hex, /^#[0-9a-f]{6}$/, "an opaque six-digit hex: no alpha"); assert.ok(p.x >= 0 && p.x < 16 && p.y >= 0 && p.y < 24); }
  }
  assert.equal(glyphPixels({ state: "docked", ink: TOKEN_HEX.night })[0].hex, TOKEN_HEX.night, "the night override is a token too");
});

// every maximal run of holes inside the body, along rows and columns, between ink pixels, is >= 2 wide; and every ink wall between holes is >= 2 thick
const runs = (line) => { const out = []; let i = 0; while (i < line.length) { let j = i; while (j < line.length && line[j] === line[i]) j++; out.push([line[i], i, j - i]); i = j; } return out; };
const check = (line, what) => {
  const rs = runs(line);
  rs.forEach(([c, start, len], k) => {
    const inner = k > 0 && k < rs.length - 1;   // bounded on both sides by the other kind
    if (inner) assert.ok(len >= 2, what + " run of '" + c + "' at " + start + " is " + len + " px");
  });
};
test("every hole and gap is at least 2 px", () => {
  const m = glyphMap();
  for (let y = 0; y < 24; y++) check(m[y], "row " + y);
  for (let x = 0; x < 16; x++) check(m.map((r) => r[x]).join(""), "col " + x);
});

test("the shadow list is whole-pixel steps with no blur", () => {
  for (const scale of [1, 4]) {
    const s = glyphShadow({ state: "docked" }, scale); assert.equal(s.split(",").length, glyphPixels({ state: "docked" }).length);
    for (const part of s.split(",")) { const [x, y, blur, spread] = part.split(" "); assert.equal(blur, "0"); assert.equal(spread, "0"); assert.equal(parseInt(x) % scale, 0); assert.equal(parseInt(y) % scale, 0); }
  }
  assert.equal(glyphShadow({ state: "away" }, 3.6).split(",")[0], glyphShadow({ state: "away" }, 4).split(",")[0], "a fractional scale rounds to a whole one");
});
