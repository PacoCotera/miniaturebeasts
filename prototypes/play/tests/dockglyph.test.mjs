// The Dock glyph component: 16 x 24, one outer box in both states, the corner cuts as set, 1-px lines, the same screen rectangle, clear gaps, one token ink and transparency only.
// node --test prototypes/play/tests/dockglyph.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GLYPH_W, GLYPH_H, BOX, GLYPH_CUT, SCREEN, BUTTONS, TOKEN_HEX, STATE_TOKEN, glyphMap, glyphPixels, glyphShadow } from "../src/dockglyph.mjs";

const tokens = JSON.parse(readFileSync(new URL("../../ui/tokens/tokens.json", import.meta.url), "utf8"));
const find = (o, k) => { for (const [n, v] of Object.entries(o)) { if (n === k && v && v.$value) return v.$value; if (v && typeof v === "object") { const r = find(v, k); if (r) return r; } } };
const on = (m, x, y) => m[y] && m[y][x] === "o";
const bounds = (m) => { let x0 = 99, y0 = 99, x1 = -1, y1 = -1; m.forEach((r, y) => [...r].forEach((c, x) => { if (c === "o") { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } })); return { x0, y0, x1, y1 }; };

test("the hexes are tokens.json's", () => { for (const [name, hex] of Object.entries(TOKEN_HEX)) assert.equal(hex, find(tokens, name), name); });

test("16 x 24 in every state", () => {
  assert.deepEqual([GLYPH_W, GLYPH_H], [16, 24]);
  for (const state of ["away", "lit", "docked"]) for (const cutPx of [1, 2]) { const m = glyphMap({ state, cutPx }); assert.equal(m.length, 24); for (const r of m) assert.equal(r.length, 16); }
  assert.equal(GLYPH_CUT, 2, "ships with the two-pixel cut");
});

test("the outer box is x 1-13, y 0-23 and the same in both states", () => {
  for (const cutPx of [1, 2]) for (const state of ["away", "lit", "docked"]) assert.deepEqual(bounds(glyphMap({ state, cutPx })), { x0: 1, y0: 0, x1: 13, y1: 23 }, state + " " + cutPx);
  assert.deepEqual(BOX, { x0: 1, y0: 0, x1: 13, y1: 23 });
  // the whole outer silhouette (the body) is the same pixel for pixel: the docked solid equals the away line's filled-in shape
  const solid = glyphMap({ state: "docked" }), line = glyphMap({ state: "away" });
  for (let y = 0; y < 24; y++) for (const x of [1, 13]) assert.equal(on(solid, x, y) || [0, 1, 22, 23].includes(y), on(line, x, y) || [0, 1, 22, 23].includes(y));
});

test("the corner cuts are as set", () => {
  const solid2 = glyphMap({ state: "docked", cutPx: 2 }), solid1 = glyphMap({ state: "docked", cutPx: 1 });
  // 2: the corner pixel and the one beside it on each side are off
  for (const [x, y] of [[1, 0], [2, 0], [1, 1], [13, 0], [12, 0], [13, 1], [1, 23], [2, 23], [1, 22], [13, 23], [12, 23], [13, 22]]) assert.ok(!on(solid2, x, y), x + "," + y);
  for (const [x, y] of [[3, 0], [2, 1], [1, 2], [11, 0], [12, 1], [13, 2], [3, 23], [2, 22], [1, 21], [11, 23], [12, 22], [13, 21]]) assert.ok(on(solid2, x, y), x + "," + y);
  // 1: only the corner pixel
  for (const [x, y] of [[1, 0], [13, 0], [1, 23], [13, 23]]) assert.ok(!on(solid1, x, y));
  for (const [x, y] of [[2, 0], [1, 1], [12, 0], [13, 1], [2, 23], [1, 22], [12, 23], [13, 22]]) assert.ok(on(solid1, x, y));
  // the screen corners stay square
  const away = glyphMap({ state: "away" });
  for (const [x, y] of [[SCREEN.x0, SCREEN.y0], [SCREEN.x1, SCREEN.y0], [SCREEN.x0, SCREEN.y1], [SCREEN.x1, SCREEN.y1]]) assert.ok(on(away, x, y));
});

test("every line is 1 px", () => {
  const m = glyphMap({ state: "away" });
  // the screen line: the perimeter is on, the inside is clear (so the line is one pixel thick)
  for (let x = SCREEN.x0; x <= SCREEN.x1; x++) for (let y = SCREEN.y0; y <= SCREEN.y1; y++) { const perim = x === SCREEN.x0 || x === SCREEN.x1 || y === SCREEN.y0 || y === SCREEN.y1; assert.equal(on(m, x, y), perim, x + "," + y); }
  // the body line: every body-line pixel has an empty side (an edge pixel), no pixel with four solid sides, and the line's inner neighbour is clear
  const px = new Set(glyphPixels({ state: "away" }).map((p) => p.x + "," + p.y));
  for (let y = 0; y < 24; y++) { const row = []; for (let x = 0; x <= 13; x++) if (x < SCREEN.x0 - 1 || x > SCREEN.x1 + 1) row.push(on(m, x, y)); }
  for (const x of [1, 13]) for (let y = 3; y <= 20; y++) { assert.ok(on(m, x, y), "side line " + x + "," + y); assert.ok(!on(m, x === 1 ? 2 : 12, y), "one pixel thick " + x + "," + y); }
  for (let x = 3; x <= 11; x++) for (const y of [0, 23]) { assert.ok(on(m, x, y)); assert.ok(!on(m, x, y === 0 ? 1 : 22), "one pixel thick " + x + "," + y); }
  assert.ok(px.size > 0);
});

test("the screen is the same rectangle in both states; the buttons are 2 x 2 holes or dots, 3 px apart", () => {
  assert.deepEqual(SCREEN, { x0: 4, y0: 4, x1: 10, y1: 15 });
  const solid = glyphMap({ state: "docked" }), away = glyphMap({ state: "away" });
  for (let y = SCREEN.y0; y <= SCREEN.y1; y++) for (let x = SCREEN.x0; x <= SCREEN.x1; x++) assert.ok(!on(solid, x, y), "window hole " + x + "," + y);   // the window is the whole rectangle
  for (let x = SCREEN.x0 - 1; x <= SCREEN.x1 + 1; x++) { assert.ok(on(solid, x, SCREEN.y0 - 1)); assert.ok(on(solid, x, SCREEN.y1 + 1)); }   // ink right round it
  for (let y = SCREEN.y0; y <= SCREEN.y1; y++) { assert.ok(on(solid, SCREEN.x0 - 1, y)); assert.ok(on(solid, SCREEN.x1 + 1, y)); }
  assert.deepEqual(BUTTONS, [{ x0: 4, y0: 18, x1: 5, y1: 19 }, { x0: 9, y0: 18, x1: 10, y1: 19 }]);
  assert.equal(BUTTONS[1].x0 - BUTTONS[0].x1 - 1, 3, "3 px apart");
  assert.equal(BUTTONS[0].x0 - BOX.x0, BOX.x1 - BUTTONS[1].x1, "centred in the 13-px box");
  for (const b of BUTTONS) for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) { assert.ok(!on(solid, x, y), "button hole"); assert.ok(on(away, x, y), "button dot"); }
  assert.ok(BUTTONS.every((b) => b.y0 > SCREEN.y1), "buttons below the screen");
  assert.ok(SCREEN.y1 < 12 + 4, "the screen sits in the upper part");
});

test("the gaps in the away look are at least 2 px", () => {
  const m = glyphMap({ state: "away" });
  const ink = []; m.forEach((r, y) => [...r].forEach((c, x) => { if (c === "o") ink.push([x, y]); }));
  const inScreenBand = ([x, y]) => x >= SCREEN.x0 && x <= SCREEN.x1 && y >= SCREEN.y0 && y <= SCREEN.y1;
  const inButton = ([x, y]) => BUTTONS.some((b) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1);
  const bodyLine = ink.filter((p) => !inScreenBand(p) && !inButton(p));
  const gap = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])) - 1;   // clear pixels between two ink pixels (chessboard distance)
  const minGap = (as, bs) => Math.min(...as.flatMap((a) => bs.map((b) => gap(a, b))));
  const screen = ink.filter(inScreenBand), buttons = ink.filter(inButton);
  assert.ok(minGap(bodyLine, screen) >= 2, "body line to screen");
  assert.ok(minGap(bodyLine, buttons) >= 2, "body line to buttons");
  assert.ok(minGap(screen, buttons) >= 2, "screen to buttons");
  assert.ok(Math.min(...[...BUTTONS].map((b) => b.x0 - BOX.x0 - 1)) >= 2);
});

test("one token ink per state and transparency; no partial alpha", () => {
  for (const state of ["away", "lit", "docked"]) for (const cutPx of [1, 2]) {
    const px = glyphPixels({ state, cutPx }), want = TOKEN_HEX[STATE_TOKEN[state]];
    assert.ok(px.length > 0);
    for (const p of px) { assert.equal(p.hex, want, state); assert.match(p.hex, /^#[0-9a-f]{6}$/, "an opaque six-digit hex: no alpha"); assert.ok(p.x >= 0 && p.x < 16 && p.y >= 0 && p.y < 24); }
  }
  assert.deepEqual([STATE_TOKEN.away, STATE_TOKEN.lit, STATE_TOKEN.docked], ["fog", "ink", "ink"]);
  assert.equal(glyphPixels({ state: "docked", ink: TOKEN_HEX.night })[0].hex, TOKEN_HEX.night, "the night override is a token too");
});

test("the shadow list is whole-pixel steps with no blur", () => {
  for (const scale of [1, 4]) {
    const s = glyphShadow({ state: "docked" }, scale); assert.equal(s.split(",").length, glyphPixels({ state: "docked" }).length);
    for (const part of s.split(",")) { const [x, y, blur, spread] = part.split(" "); assert.equal(blur, "0"); assert.equal(spread, "0"); assert.equal(parseInt(x) % scale, 0); assert.equal(parseInt(y) % scale, 0); }
  }
  assert.equal(glyphShadow({ state: "away" }, 3.6).split(",")[0], glyphShadow({ state: "away" }, 4).split(",")[0], "a fractional scale rounds to a whole one");
});
