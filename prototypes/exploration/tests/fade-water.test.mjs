// Owner bug #65 ("That doesn't look like wide water", seed 183, start pick): the faded sign (FADE, drawn for revealed cells out of view) sent
// river and sea to the same grey-purple as faded rock, so faded wide water read as rock. FADE keeps water sea blue; nothing else in it moved.
import test from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

test("FADE: river and sea fade to sea blue, never to the faded rock colour", () => {
  const p = makePage({ gen: 7, console: "silent" });
  const [river, sea, rock] = ["river", "sea", "rock"].map(n => p.run(`C.${n}`));
  const fade = Array.from(p.run("FADE.slice()"));
  assert.notEqual(fade[river], fade[rock]);
  assert.notEqual(fade[sea], fade[rock]);
  assert.equal(fade[river], sea);
  assert.equal(fade[sea], sea);
});

test("the start pick on seed 183: the faded wide-water cell 20 shows sea blue, not the faded rock colour", () => {
  const p = makePage({ gen: 7, console: "silent", canvas: true });
  p.run("newWorld(183); ensureMap();");
  const W = p.run("MW * CELL"), CELL = p.run("CELL"), cell = 20;
  const x0 = (cell % p.run("MW")) * CELL, y0 = Math.floor(cell / p.run("MW")) * CELL;
  const fadeCv = p.run("mapCvFade").px(), own = p.run("mapCv").px();
  const [river, sea, rock] = ["river", "sea", "rock"].map(n => p.run(`C.${n}`)), fadedRock = p.run(`FADE[C.rock]`);
  let water = 0;
  for (let y = y0; y < y0 + CELL; y++) for (let x = x0; x < x0 + CELL; x++) {
    const i = y * W + x; if (own[i] !== river && own[i] !== sea) continue;
    water++; assert.notEqual(fadeCv[i], fadedRock, `faded water pixel ${x},${y} is the faded rock colour`); assert.equal(fadeCv[i], sea);
  }
  assert.ok(water > 100, "cell 20 has water pixels on the map: " + water);
  assert.ok(rock >= 0);
});
