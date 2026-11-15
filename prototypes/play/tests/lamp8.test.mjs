// The cradle lamp component: 8 × 8, the corner cuts as set, only token colours and transparency, nothing but fully on or fully off.
// node --test prototypes/play/tests/lamp8.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LAMP_SIZE, LAMP_CUT, TOKEN_HEX, STATE_TOKEN, HIGHLIGHT_TOKEN, lampMap, lampPixels, lampShadow } from "../src/lamp8.mjs";

const tokens = JSON.parse(readFileSync(new URL("../../ui/tokens/tokens.json", import.meta.url), "utf8"));
const find = (o, k) => { for (const [n, v] of Object.entries(o)) { if (n === k && v && v.$value) return v.$value; if (v && typeof v === "object") { const r = find(v, k); if (r) return r; } } };

test("the hexes are tokens.json's", () => { for (const [name, hex] of Object.entries(TOKEN_HEX)) assert.equal(hex, find(tokens, name), name); });

test("8 x 8, the corner cuts as set", () => {
  for (const c of [1, 2]) { const m = lampMap({ cutPx: c }); assert.equal(m.length, 8); for (const r of m) assert.equal(r.length, 8); }
  assert.equal(LAMP_CUT, 2, "ships with the two-pixel cut");
  assert.deepEqual(lampMap({ cutPx: 1 }), [".oooooo.", "oooooooo", "oooooooo", "oooooooo", "oooooooo", "oooooooo", "oooooooo", ".oooooo."]);
  assert.deepEqual(lampMap({ cutPx: 2 }), ["..oooo..", ".oooooo.", "oooooooo", "oooooooo", "oooooooo", "oooooooo", ".oooooo.", "..oooo.."]);
});

test("only the state's token, the highlight's fog, and transparency; no partial alpha", () => {
  for (const state of ["off", "mint", "warm", "amber"]) for (const cutPx of [1, 2]) for (const highlight of [false, true]) {
    const px = lampPixels({ state, cutPx, highlight }), body = TOKEN_HEX[STATE_TOKEN[state]], hi = TOKEN_HEX[HIGHLIGHT_TOKEN[state]], hexes = new Set(px.map((p) => p.hex));
    for (const h of hexes) assert.ok(h === body || (highlight && h === hi), state + " " + h);
    assert.equal(px.filter((p) => p.hex === hi).length, highlight ? 1 : 0);
    if (highlight) { const p = px.find((q) => q.hex === hi); assert.deepEqual([p.x, p.y], [1, 1]); }
    for (const p of px) { assert.ok(p.x >= 0 && p.x < LAMP_SIZE && p.y >= 0 && p.y < LAMP_SIZE); assert.match(p.hex, /^#[0-9a-f]{6}$/, "an opaque six-digit hex: no alpha"); }
    assert.equal(px.length, (cutPx === 1 ? 60 : 52), "the cut pixels are transparent");
  }
  assert.deepEqual([HIGHLIGHT_TOKEN.mint, HIGHLIGHT_TOKEN.warm, HIGHLIGHT_TOKEN.off, HIGHLIGHT_TOKEN.amber], ["white", "white", "fog", "fog"], "white on mint, fog on stone and amber");
  assert.equal(TOKEN_HEX[STATE_TOKEN.off], TOKEN_HEX.stone); assert.equal(TOKEN_HEX[STATE_TOKEN.mint], TOKEN_HEX.mint); assert.equal(TOKEN_HEX[STATE_TOKEN.amber], TOKEN_HEX.amber);
});

test("the shadow list is whole-pixel steps with no blur", () => {
  const s = lampShadow({ state: "mint" }, 2); assert.equal(s.split(",").length, 52);
  for (const part of s.split(",")) { const [x, y, blur, spread] = part.split(" "); assert.equal(blur, "0"); assert.equal(spread, "0"); assert.equal(parseInt(x) % 2, 0); assert.equal(parseInt(y) % 2, 0); }
  assert.equal(lampShadow({ state: "mint" }, 1.5).split(",")[0], lampShadow({ state: "mint" }, 2).split(",")[0], "a fractional scale rounds to a whole one");
});
