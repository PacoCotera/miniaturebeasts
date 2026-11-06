// The Loika's crown (frame version 5, still as version 6 left it) in the Station (owner, 2026-11-01 14:26, refined: all Loikas carry the crown's genes, not all show a crown): seeds 1 to 12 draw a crest exactly
// when their crown switch shows one, a bare pod still carries its crown's size, leaf count and form, and its trait line says what it carries asleep in at most six words.
//   node --test prototypes/station/tests/loika-crown.test.mjs
import { test, before, after } from "node:test";
import "./fixtures/rooms.mjs";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, podGenome, traitState, stampFrameOf } from "../src/genome.mjs";
import { drawnLooks } from "../src/looks.mjs";
import { layeredStand, setStandSizes, layersFor, composeStand, standLayersLoaded } from "../src/layered-stand.mjs";
import { loadStandLayersFs, loadStandLooksFs, unloadStands } from "../tools/stand-layers-fs.mjs";
import { LOCI, resolveCopies } from "../../workbench/framework/catalogue.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames"), specs = path.resolve(here, "../../ui/specs/station");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const fr = frameOf("S01"), allRead = fr.chapters.map((c) => c.id), crown = fr.chapters.flatMap((c) => c.traits).find((t) => t.id === "crown");
const SWITCH = "anatomy.crown-presence", PARAMS = ["growth.crown-height-ratio", "growth.crest-leaf-count", "anatomy.crown-form"];
const shows = (g) => resolveCopies(LOCI.get(SWITCH), g.loci[SWITCH]);
before(() => { loadStandLayersFs(); loadStandLooksFs(); setStandSizes(JSON.parse(readFileSync(path.join(specs, "stand-sizes.json"), "utf8"))); });
after(() => unloadStands());

test("seeds 1 to 12: a pod draws the crest exactly when its crown switch shows one, and the stand carries the crest layer for those and not for the others", () => {
  assert.ok(standLayersLoaded());
  const st = layeredStand("S01", "adult", [304, 312]); assert.ok(st);
  let crowned = 0, bare = 0;
  for (let gs = 1; gs <= 12; gs++) {
    const g = podGenome(fr, gs), looks = drawnLooks(fr, { genome: g, read: allRead });
    assert.equal(g.frameVersion, 6);
    assert.equal(looks.crown, shows(g) ? "leaf crest" : "bare head", `seed ${gs}`);
    assert.equal(layersFor(st, looks).some((l) => l.trait === "crown"), shows(g), `seed ${gs}: the crest layer`);
    assert.equal(traitState(fr, crown, g).shows, looks.crown);
    for (const id of PARAMS) assert.ok(Array.isArray(g.loci[id]) && g.loci[id].length === 2, `seed ${gs} carries ${id}`);
    shows(g) ? crowned++ : bare++;
  }
  assert.deepEqual([crowned, bare], [8, 4], "seeds 1, 2, 3 and 10 are bare; the other eight show a crown");
  const a = composeStand(st, { crown: "leaf crest" }).rgba(), b = composeStand(st, { crown: "bare head" }).rgba();
  assert.notDeepEqual(a, b, "the crest is drawn");
});

test("a bare pod's Crown trait is asleep, says what it carries in the player's words in six words or fewer, and reads the crest it would show", () => {
  let n = 0;
  for (let gs = 0; gs < 120; gs++) {
    const g = podGenome(fr, gs), s = traitState(fr, crown, g);
    if (shows(g)) { assert.notEqual(s.kind, "asleep"); continue; }
    n++; assert.equal(s.kind, "asleep"); assert.match(s.asleep, /^(low crest|tall crest|crest)$/);
    assert.ok(s.line.split(/\s+/).filter((w) => /\w/.test(w)).length <= 6, s.line);
  }
  assert.ok(n > 10);
});

test("a version-4 Loika still stamps as version 4, a version-5 one as version 5 and a new one as version 6", () => {
  const g = podGenome(fr, 1);
  assert.equal(stampFrameOf(fr, g).version, 6); assert.equal(stampFrameOf(fr, { ...g, frameVersion: 5 }).version, 5); assert.equal(stampFrameOf(fr, { ...g, frameVersion: 4 }).version, 4);
});
