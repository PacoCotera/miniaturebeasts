// the signed dusk, night and dawn cards in their slots (dusk-card-place-1, night-dawn-card-place-1): each shown once a day at its part of day, any press passes it
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { makePage } from "./page-harness.mjs";
import { DAY } from "../src/words.mjs";

const upTo = (n) => DAY.parts.slice(0, n).reduce((a, q) => a + q[1], 0);   // the light spent when part n begins
const duskAt = upTo(4);
const nightAt = upTo(5);
const start = "newWorld(7); TEST.calm = true; startExpedition('weather', G.spawns[0]); for (const k of ['dusk', 'night', 'dawn']) CARD_ART[k] = document.createElement('canvas'); S.exp.fog = null;";

for (const [k, sha] of [["dusk", "53624a5e73b7"], ["night", "9454ad7228bf"], ["dawn", "af6e535dac7b"]]) {
  test(`the ${k} card file is the AD's signed cut`, () => {
    const buf = readFileSync(new URL(`../art/cards/${k}-card-450x600.png`, import.meta.url));
    assert.ok(createHash("sha256").update(buf).digest("hex").startsWith(sha));
    assert.equal(buf.readUInt32BE(16), 450); assert.equal(buf.readUInt32BE(20), 600);
  });
}

test("the slots: all three point at their files; a card whose picture is not loaded returns false", () => {
  const p = makePage({ console: "silent", canvas: true });
  p.run("newWorld(7);");
  for (const k of ["dusk", "night", "dawn"]) {
    assert.equal(p.run(`NIGHT_CARDS.${k}.file`), `art/cards/${k}-card-450x600.png`);
    assert.equal(p.run(`cardShow('${k}')`), false, "picture not loaded: the message-box line stays");
  }
});

test("the card shows once at dusk, a press passes it and is spent on it", () => {
  const p = makePage({ gen: 7, console: "collect", els: true, canvas: true, raf: "count" });
  p.run(start);
  p.run(`S.day.spent = ${duskAt - 1}; advance('map', null);`);
  assert.equal(p.run("dayPart()"), "dusk");
  assert.equal(p.run("!!FX.card && FX.card.k"), "dusk", "the card is up at the change");
  assert.equal(p.run("FX.notes.some(n => /Dusk\\. Night in/.test(n.text))"), false, "no message-box line under it");
  const pos = p.run("JSON.stringify(S.exp.pos)"), spent = p.run("S.day.spent");
  p.run("press('right'); release('right');");
  assert.equal(p.run("FX.card"), null, "a press passes it");
  assert.equal(p.run("JSON.stringify(S.exp.pos)"), pos, "the press is spent on the card");
  assert.equal(p.run("S.day.spent"), spent);
  p.run("advance('map', null);");
  assert.equal(p.run("FX.card"), null, "once: the next step in dusk shows nothing");
  assert.deepEqual(p.errors, []);
});

test("the card shows once at night, a press passes it and is spent on it", () => {
  const p = makePage({ gen: 7, console: "collect", els: true, canvas: true, raf: "count" });
  p.run(start);
  p.run(`S.day.spent = ${nightAt - 1}; advance('map', null);`);
  assert.equal(p.run("dayPart()"), "night");
  assert.equal(p.run("!!FX.card && FX.card.k"), "night", "the card is up at the change");
  assert.equal(p.run("FX.notes.some(n => /^Night\\. Dawn in/.test(n.text))"), false, "no message-box line under it");
  const pos = p.run("JSON.stringify(S.exp.pos)"), spent = p.run("S.day.spent");
  p.run("press('right'); release('right');");
  assert.equal(p.run("FX.card"), null, "a press passes it");
  assert.equal(p.run("JSON.stringify(S.exp.pos)"), pos, "the press is spent on the card");
  assert.equal(p.run("S.day.spent"), spent);
  assert.equal(p.run("FX.notes.some(n => /Night falls\\./.test(n.text))"), true, "CARD_TEXT's night line follows the press");
  p.run("advance('map', null);");
  assert.equal(p.run("FX.card"), null, "once: the next step in the night shows nothing");
  assert.deepEqual(p.errors, []);
});

test("the card shows once at dawn, when the night passes; a press passes it", () => {
  const p = makePage({ gen: 7, console: "collect", els: true, canvas: true, raf: "count" });
  p.run(start);
  p.run(`S.day.spent = ${DAY.light}; advance('map', null);`);
  assert.equal(p.run("S.day.spent < " + DAY.light), true, "a fresh day started");
  assert.equal(p.run("!!FX.card && FX.card.k"), "dawn", "the dawn card is up");
  const pos = p.run("JSON.stringify(S.exp.pos)");
  p.run("press('right'); release('right');");
  assert.equal(p.run("FX.card"), null, "a press passes it");
  assert.equal(p.run("JSON.stringify(S.exp.pos)"), pos, "the press is spent on the card");
  p.run("advance('map', null);");
  assert.equal(p.run("FX.card"), null, "once: the next step shows nothing");
  assert.deepEqual(p.errors, []);
});
