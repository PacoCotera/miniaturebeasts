// The Loika's ears at frame version 6 in the Station (art director, 2026-11-03): every pod carries the ear length and has ears, the Face chapter holds the Ears trait with three looks, the pod
// reads its ears in the player's words, and a version-5 Loika is never crossed with a version-6 one (the Cross refuses before cost, in words, and the forecast says nothing).
//   node --test prototypes/station/tests/loika-ears.test.mjs
import { test } from "node:test";
import "./fixtures/rooms.mjs";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, podGenome, traitState, stampFrameOf } from "../src/genome.mjs";
import { drawnLooks } from "../src/looks.mjs";
import { buildIndividual } from "../../workbench/framework/species.mjs";
import { versionRefusal } from "../../workbench/framework/cross.mjs";
import * as S from "../src/state.mjs";

const framesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../workbench/frames");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const fr = frameOf("S01"), allRead = fr.chapters.map((c) => c.id), LEN = "growth.auricular-length-ratio";
const ears = fr.chapters.flatMap((c) => c.traits).find((t) => t.id === "ears");

test("seeds 1 to 12: every pod is a version-6 Loika that carries the ear length, has two ears of the band's length, and reads its ears as one of the three looks", () => {
  assert.ok(fr.chapters.find((c) => c.id === "face").traits.includes(ears), "the Ears trait is in the Face chapter");
  assert.deepEqual(ears.looks, ["small ears", "between", "larger ears"]);
  const seen = new Set();
  for (let gs = 1; gs <= 12; gs++) {
    const g = podGenome(fr, gs); assert.equal(g.frameVersion, 6); assert.equal(stampFrameOf(fr, g).version, 6);
    assert.ok(Array.isArray(g.loci[LEN]) && g.loci[LEN].length === 2, `seed ${gs} carries the ear length`);
    const b = buildIndividual(fr, g), len = b.resolved.values["ears.lengthOverHeadRz"];
    assert.equal(b.scene.nodes.filter((n) => n.role === "auricular-sheet").length, 2, `seed ${gs}: two ears`);
    assert.ok(len >= 0.45 - 1e-9 && len <= 0.75 + 1e-9, `seed ${gs}: ${len}`);
    const shows = traitState(fr, ears, g).shows; assert.ok(ears.looks.includes(shows), shows); assert.equal(drawnLooks(fr, { genome: g, read: allRead }).ears, shows); seen.add(shows);
  }
  assert.ok(seen.size >= 2, `the twelve show more than one ear look: ${[...seen]}`);
});

test("a version-5 and a version-6 Loika are not crossed: the Cross refuses before cost with a reason in words, and the forecast says nothing", () => {
  const a = { id: 1, species: "S01", genome: podGenome(fr, 1) }, b = { id: 2, species: "S01", genome: { ...podGenome(fr, 2), frameVersion: 5 } }, c = { id: 3, species: "S01", genome: podGenome(fr, 3) };
  assert.equal(S.crossBlock({}, null, a, b), "born on different frame versions"); assert.equal(S.crossBlock({}, null, b, a), "born on different frame versions");
  assert.equal(S.forecastOf({}, a, b), null);
  assert.equal(versionRefusal(fr, a.genome, c.genome), null, "two of one version are not refused for it");
});
