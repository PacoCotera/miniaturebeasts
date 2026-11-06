// The Station loads the twenty frames of version 8 (workbench/frames/language): none is draft or parked, every kind lists its asleep habit, S20 Tuliko is among them and the Library's catalogue is twenty.
// Release 21a: the form frames (versions 2 to 6) stay on disk for the studio and the stamp registry, but the game no longer fetches them.
//   node --test prototypes/station/tests/frames-twenty.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameIds, frameOf, podGenome, SP_INDEX, speciesIndex, speciesId } from "../src/genome.mjs";
import { stampFrameOf, stampCode, decodeStampCode } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { libraryBuild } from "../src/views/library-props.mjs";
import { buildIndividual } from "../../workbench/framework/species.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames/language"), specs = path.resolve(here, "../../ui/specs/station");
const FRAMES = readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8")));
const J = (f) => JSON.parse(readFileSync(path.join(specs, f), "utf8"));
const IDS = Array.from({ length: 20 }, (_, i) => `S${String(i + 1).padStart(2, "0")}`);

test("the language registry holds twenty frames of version 8, and none is draft or parked", () => {
  assert.equal(FRAMES.length, 20);
  assert.deepEqual(FRAMES.map((f) => f.species.id).sort(), IDS);
  for (const f of FRAMES) {
    assert.equal(f.frameVersion, 8, f.species.id); assert.equal(f.species.draft, undefined, `${f.species.id} is not a draft`); assert.equal(f.species.parked, undefined, `${f.species.id} is not parked`);
    assert.ok(f.habits.includes("sleep-curled"), `${f.species.id} lists sleep-curled`);
  }
  const index = JSON.parse(readFileSync(path.join(framesDir, "index.json"), "utf8"));
  assert.equal(index.species.length, 20);
  for (const s of index.species) { assert.equal(s.draft, undefined); assert.equal(s.parked, undefined); assert.equal(s.frameVersion, 8); }
  assert.deepEqual(FRAMES.find((f) => f.species.id === "S01").habits, ["shake-dry", "calm", "sleep-curled"]);
  assert.deepEqual(FRAMES.find((f) => f.species.id === "S02").habits, ["sniff", "puff", "sleep-curled"]);
  assert.deepEqual(FRAMES.find((f) => f.species.id === "S03").habits, ["dig", "glow", "sleep-curled"]);
});

test("the Station loads all twenty, in the species list the saves use (the first three keep their numbers)", () => {
  setFrames(FRAMES);
  assert.deepEqual(frameIds(), IDS);
  assert.deepEqual(SP_INDEX.slice(0, 3), ["S01", "S03", "S02"]);
  assert.equal(new Set(SP_INDEX).size, 20); assert.deepEqual([...SP_INDEX].sort(), IDS);
  for (const id of IDS) { assert.equal(speciesId(speciesIndex(id)), id); assert.ok(frameOf(id), id); }
  assert.equal(speciesIndex("S20"), 19); assert.equal(speciesId(20), null);
});

test("every kind draws a pod that builds, and every kind's Markings trait names the six looks of the layout", async () => {
  setFrames(FRAMES);
  const { traitState } = await import("../src/genome.mjs"), six = ["plain", "back spots", "saddle", "gradient", "bands", "patches"];
  for (const id of IDS) {
    const fr = frameOf(id), g = podGenome(fr, 11); assert.equal(buildIndividual(fr, g).validation.status, "valid", id);
    const m = fr.chapters.flatMap((c) => c.traits).find((t) => t.id === "markings");
    assert.deepEqual(m.looks, six, `${id}: the six looks`);
    for (let gs = 1; gs <= 25; gs++) assert.ok(six.includes(traitState(fr, m, podGenome(fr, gs)).shows), `${id} seed ${gs}`);
  }
});

test("an Untuva with the saddle layout and the marking switch on reads Markings 'saddle'; with the switch off it reads 'plain'", async () => {
  setFrames(FRAMES);
  const { traitState } = await import("../src/genome.mjs");
  const fr = frameOf("S02"), m = fr.chapters.flatMap((c) => c.traits).find((t) => t.id === "markings"), g = podGenome(fr, 3);
  const withLoci = (on, layout) => ({ ...g, loci: { ...g.loci, "appearance.marking-switch": [on, on], "appearance.marking-layout": [layout, layout] } });
  assert.equal(traitState(fr, m, withLoci("on", "saddle")).shows, "saddle");
  assert.equal(traitState(fr, m, withLoci("off", "saddle")).shows, "plain");
  for (const [layout, word] of [["back-spots", "back spots"], ["gradient", "gradient"], ["bands", "bands"], ["patches", "patches"]]) assert.equal(traitState(fr, m, withLoci("on", layout)).shows, word);
});

test("Tuliko's frame is its own (key 20.8): the stamp reads it back and the form frames' S20 fixture key is not the Station's", () => {
  setFrames(FRAMES);
  const fr = frameOf("S20"), g = podGenome(fr, 5), sf = stampFrameOf(fr, g);
  assert.equal(sf.species, 20); assert.equal(sf.version, 8);
  const code = stampCode(fr, g, []), back = decodeStampCode(code);
  assert.ok(back.ok && back.genome.species === 20 && back.genome.version === 8, "the stamp decodes to S20 v8");
});

test("Level 1 of the Library takes all twenty: twenty cells in species order, in the form of 20", () => {
  setFrames(FRAMES);
  const st = S.freshSt("w1", 3, 1_000_000); S.normalize(st); st.firstMibi = false;
  const b = libraryBuild({ st, settings: { ...S.DEFAULT_SETTINGS, economy: "decided", rooms: 2, sealedOpen: true }, ui: { l1: null } }, J("library.json"), J("frame.json"));
  assert.deepEqual(b.props.regions.cells.map((c) => c.id), IDS);
});
