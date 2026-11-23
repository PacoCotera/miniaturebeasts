// A home mibi draws her own coat and marking whether or not her Coat chapter is read (owner 2026-11-23); wild ones keep drawnLooks.
//   node --test prototypes/station/tests/own-looks.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, podGenome, traitState } from "../src/genome.mjs";
import { drawnLooks, ownLooks } from "../src/looks.mjs";
import { coatOf } from "../src/stands.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../species/frames/language");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const fr = frameOf("S01"), mibi = (gs, read) => ({ id: gs, genome: podGenome(fr, gs), read });

test("ownLooks with nothing read equals drawnLooks with everything read", () => {
  const all = fr.chapters.map((c) => c.id);
  for (let gs = 0; gs < 40; gs++) assert.deepEqual(ownLooks(fr, mibi(gs, [])), drawnLooks(fr, mibi(gs, all)));
});

test("an unread coat draws nothing under drawnLooks (wild) but her own coat under ownLooks", () => {
  let seen = 0;
  for (let gs = 0; gs < 40; gs++) {
    const m = mibi(gs, []);
    assert.equal(coatOf("S01", drawnLooks(fr, m)), null);
    const own = coatOf("S01", ownLooks(fr, m)); if (own) seen++;
  }
  assert.ok(seen > 0, "some genome draws a coat of its own");
});

test("a hidden copy still never shows (the lens is untouched)", () => {
  for (let gs = 0; gs < 40; gs++) {
    const m = mibi(gs, []), looks = ownLooks(fr, m);
    for (const ch of fr.chapters) for (const t of ch.traits) if (t.nature === "look" && !ch.sealed && looks[t.id] != null) assert.equal(looks[t.id], traitState(fr, t, m.genome).shows);
  }
});

test("no genome: nothing drawn", () => { assert.deepEqual(ownLooks(fr, { id: 1, read: [] }), {}); });
