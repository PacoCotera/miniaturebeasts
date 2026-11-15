// The cradle lamp component: 8 × 8, the corner cuts as set, only token colours and transparency, nothing but fully on or fully off.
// node --test prototypes/play/tests/lamp8.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LAMP_SIZE, LAMP_CUT, TOKEN_HEX, STATE_TOKEN, RIM_TOKEN, HIGHLIGHT_TOKEN, lampMap, lampPixels, lampShadow } from "../src/lamp8.mjs";

const tokens = JSON.parse(readFileSync(new URL("../../ui/tokens/tokens.json", import.meta.url), "utf8"));
const find = (o, k) => { for (const [n, v] of Object.entries(o)) { if (n === k && v && v.$value) return v.$value; if (v && typeof v === "object") { const r = find(v, k); if (r) return r; } } };

test("the hexes are tokens.json's", () => { for (const [name, hex] of Object.entries(TOKEN_HEX)) assert.equal(hex, find(tokens, name), name); });

test("8 x 8, the corner cuts as set", () => {
  for (const c of [1, 2]) { const m = lampMap({ cutPx: c }); assert.equal(m.length, 8); for (const r of m) assert.equal(r.length, 8); }
  assert.equal(LAMP_CUT, 2, "ships with the two-pixel cut");
  assert.deepEqual(lampMap({ cutPx: 1 }), [".oooooo.", "oooooooo", "oooooooo", "oooooooo", "oooooooo", "oooooooo", "oooooooo", ".oooooo."]);
  assert.deepEqual(lampMap({ cutPx: 2 }), ["..oooo..", ".oooooo.", "oooooooo", "oooooooo", "oooooooo", "oooooooo", ".oooooo.", "..oooo.."]);
});

test("only the state's body, rim and highlight tokens, and transparency; no partial alpha", () => {
  for (const state of ["off", "mint", "warm", "amber"]) for (const cutPx of [1, 2]) for (const highlight of [false, true]) {
    const px = lampPixels({ state, cutPx, highlight }), body = TOKEN_HEX[STATE_TOKEN[state]], rim = RIM_TOKEN[state] ? TOKEN_HEX[RIM_TOKEN[state]] : body, hi = TOKEN_HEX[HIGHLIGHT_TOKEN[state]], hexes = new Set(px.map((p) => p.hex));
    for (const h of hexes) assert.ok(h === body || h === rim || (highlight && h === hi), state + " " + h);
    assert.equal(px.filter((p) => p.hex === hi).length, highlight ? 1 : 0);
    // the rim is exactly the pixels with an empty side (the outermost ring of the cut disc), one pixel wide
    const solid = new Set(px.map((p) => p.x + "," + p.y)), isEdge = (p) => ![[-1, 0], [1, 0], [0, -1], [0, 1]].every(([dx, dy]) => solid.has((p.x + dx) + "," + (p.y + dy)));
    for (const p of px) if (!(highlight && p.hex === hi)) assert.equal(p.hex, isEdge(p) ? rim : body, state + " " + p.x + "," + p.y);
    if (RIM_TOKEN[state]) assert.ok(px.some((p) => p.hex === rim) && px.some((p) => p.hex === body && !isEdge(p)), "both a rim and a body");
    else assert.ok(px.filter((p) => !(highlight && p.hex === hi)).every((p) => p.hex === body), "off is one solid colour, no rim");
    if (highlight) { const p = px.find((q) => q.hex === hi); assert.deepEqual([p.x, p.y], [2, 2]); }
    for (const p of px) { assert.ok(p.x >= 0 && p.x < LAMP_SIZE && p.y >= 0 && p.y < LAMP_SIZE); assert.match(p.hex, /^#[0-9a-f]{6}$/, "an opaque six-digit hex: no alpha"); }
    assert.equal(px.length, (cutPx === 1 ? 60 : 52), "the cut pixels are transparent");
  }
  assert.deepEqual([HIGHLIGHT_TOKEN.mint, HIGHLIGHT_TOKEN.warm, HIGHLIGHT_TOKEN.off, HIGHLIGHT_TOKEN.amber], ["white", "white", "glassQuiet", "cream"], "white on mint, cream on amber, glassQuiet on off");
  assert.deepEqual([RIM_TOKEN.mint, RIM_TOKEN.warm, RIM_TOKEN.amber, RIM_TOKEN.off], ["aqua", "aqua", "gold", null], "a darker step of the lit ramps; off has no rim token");
  assert.equal(TOKEN_HEX[STATE_TOKEN.off], "#565c63", "off is the neutral bevel grey"); assert.equal(TOKEN_HEX[STATE_TOKEN.mint], TOKEN_HEX.mint); assert.equal(TOKEN_HEX[STATE_TOKEN.amber], TOKEN_HEX.amber);
});

test("the shadow list is whole-pixel steps with no blur", () => {
  const s = lampShadow({ state: "mint" }, 2); assert.equal(s.split(",").length, 52);
  for (const part of s.split(",")) { const [x, y, blur, spread] = part.split(" "); assert.equal(blur, "0"); assert.equal(spread, "0"); assert.equal(parseInt(x) % 2, 0); assert.equal(parseInt(y) % 2, 0); }
  assert.equal(lampShadow({ state: "mint" }, 1.5).split(",")[0], lampShadow({ state: "mint" }, 2).split(",")[0], "a fractional scale rounds to a whole one");
});
