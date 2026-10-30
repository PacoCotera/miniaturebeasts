// The three fluffy species (S17-S19) are drafts with no art: the workbench frames carry `species.draft`, and the Station does not load a draft, so the
// Library's level 1 and every pool built from the loaded frames stay at the sixteen until the flag comes off.
//   node --test prototypes/station/tests/draft-species.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameIds, frameOf, podGenome } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { libraryBuild } from "../src/views/library-props.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames"), specs = path.resolve(here, "../../ui/specs/station");
const FRAMES = readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8")));
const J = (f) => JSON.parse(readFileSync(path.join(specs, f), "utf8"));
const DRAFTS = ["S17", "S18", "S19"];

test("S17-S19 are drafts in the workbench, and only they", () => {
  assert.equal(FRAMES.length, 19);
  assert.deepEqual(FRAMES.filter((f) => f.species.draft).map((f) => f.species.id), DRAFTS);
  assert.deepEqual(JSON.parse(readFileSync(path.join(framesDir, "index.json"), "utf8")).species.filter((s) => s.draft).map((s) => s.id), DRAFTS);
});

test("while they are drafts the Station loads sixteen frames: no pool, no pod and no Library cell can name S17-S19", () => {
  setFrames(FRAMES);
  assert.equal(frameIds().length, 16);
  for (const id of DRAFTS) { assert.ok(!frameIds().includes(id)); assert.equal(frameOf(id), null, `${id}: no frame to draw a pod from`); }
  const st = S.freshSt("w1", 3, 1_000_000); S.normalize(st); st.firstMibi = false;
  const b = libraryBuild({ st, settings: { ...S.DEFAULT_SETTINGS, economy: "decided", rooms: 2, sealedOpen: true }, ui: { l1: null } }, J("library.json").l1 ? J("library.json") : null, J("frame.json"));
  const ids = b.props.regions.cells.map((c) => c.id);
  assert.equal(ids.length, 16); assert.ok(DRAFTS.every((id) => !ids.includes(id)), "the Library's list holds none of them");
  const prev = FRAMES.filter((f) => !f.species.draft); setFrames(prev);
  assert.deepEqual(frameIds(), prev.map((f) => f.species.id).sort());
  assert.ok(podGenome(frameOf("S01"), 7), "the sixteen still draw pods");
});
