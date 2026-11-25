// the signed dusk card in its slot (dusk-card-place-1): shown once when the clock crosses into dusk, any press passes it; night and dawn stay empty
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { makePage } from "./page-harness.mjs";
import { DAY } from "../src/words.mjs";

const duskAt = DAY.parts.slice(0, 4).reduce((a, q) => a + q[1], 0);   // the light spent when dusk begins
const start = "newWorld(7); TEST.calm = true; startExpedition('weather', G.spawns[0]); CARD_ART.dusk = document.createElement('canvas'); S.exp.fog = null;";

test("the card file is the AD's signed dusk card", () => {
  const buf = readFileSync(new URL("../art/cards/dusk-card-450x600.png", import.meta.url));
  assert.ok(createHash("sha256").update(buf).digest("hex").startsWith("53624a5e73b7"));
  assert.equal(buf.readUInt32BE(16), 450); assert.equal(buf.readUInt32BE(20), 600);
});

test("the slot: dusk points at the file, night and dawn stay empty", () => {
  const p = makePage({ console: "silent", canvas: true });
  p.run("newWorld(7);");
  assert.equal(p.run("NIGHT_CARDS.dusk.file"), "art/cards/dusk-card-450x600.png");
  assert.equal(p.run("NIGHT_CARDS.night.file"), null); assert.equal(p.run("NIGHT_CARDS.dawn.file"), null);
  assert.equal(p.run("cardShow('night')"), false); assert.equal(p.run("cardShow('dawn')"), false);
  assert.equal(p.run("cardShow('dusk')"), false, "picture not loaded: the message-box line stays");
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

test("night keeps its message-box line (no card)", () => {
  const p = makePage({ gen: 7, console: "collect", els: true, canvas: true, raf: "count" });
  p.run(start);
  p.run(`S.day.spent = ${DAY.parts.slice(0, 5).reduce((a, q) => a + q[1], 0) - 1}; advance('map', null);`);
  assert.equal(p.run("dayPart()"), "night");
  assert.equal(p.run("!FX.card"), true);
  assert.equal(p.run("FX.notes.some(n => /^Night\\. Dawn in/.test(n.text))"), true);
});
