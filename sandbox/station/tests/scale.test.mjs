// The one scale (release 21h2, art desk R21-SCALE): one factor per kind and scene from the stand's figure height as a share of the scene's height, the same for every pose; adult 0.40 (single-mibi scenes) or 0.24 (many-mibi),
// young 0.80 of its adult, size class small 0.80 / medium 1.00 / large 1.20, the Sitting cap on top.
//   node --test prototypes/station/tests/scale.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { placeMaster } from "../../ui/assets.mjs";
import { readIndex } from "../../ui/tools/index-io.mjs";
import { decodePNG } from "../../ui/png.mjs";
import { SHARE, YOUNG, SIZE_CLASS, SCENES, standInk, sceneFactor, scaleTable, targetHeight, sittingKindScale, GLASS } from "../src/scale.mjs";
import { setFrames } from "../src/genome.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../ui/assets/masters"), M = readIndex(root).masters;
const fdir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../workbench/frames/language"), frames = readdirSync(fdir).filter((f) => /^species-S\d\d\.json$/.test(f)).map((f) => JSON.parse(readFileSync(path.join(fdir, f), "utf8")));
setFrames(frames);
for (const [id, m] of Object.entries(M)) if (/^mibi-(adult|juvenile)-S\d\d(-(curl|shake|calm|puff|sniff|dig|glow))?-304x312$/.test(id) || /^mibi-adult-S\d\d-between-dark-lay-[a-z]+-304x312$/.test(id)) {
  const im = decodePNG(readFileSync(path.join(root, m.file)));
  placeMaster({ id, w: m.w, h: m.h, file: m.file, hash: m.sha256, signed: "test", status: "master" }, { w: m.w, h: m.h, rgba: () => im.data });
}
const KINDS = frames.map((f) => f.species.id).sort();

test("the table: the stand's figure height times the factor is the share of the scene's height, by the kind's size class", () => {
  assert.deepEqual(SHARE, { single: 0.40, many: 0.24 }); assert.equal(YOUNG, 0.80); assert.deepEqual(SIZE_CLASS, { small: 0.80, medium: 1.00, large: 1.20 });
  assert.deepEqual(Object.fromEntries(Object.entries(SCENES).map(([k, v]) => [k, v.share])), { home: "many", idle: "many", vivarium: "many", habitat: "single" });
  const T = scaleTable(KINDS);
  for (const sp of KINDS) for (const sc of Object.keys(SCENES)) {
    const a = standInk(sp, "adult"), j = standInk(sp, "juvenile"), { adult, juvenile } = T[sp][sc];
    assert.ok(adult > 0 && juvenile > 0, `${sp} ${sc}`);
    const capped = adult * a < targetHeight(sp, sc) - 1.5;   // the cap made the kind smaller (one ratio, every scene)
    if (!capped) assert.ok(Math.abs(adult * a - targetHeight(sp, sc)) <= 1.5, `${sp} ${sc}: the adult is ${adult * a} px, the table says ${targetHeight(sp, sc)}`);
    assert.ok(Math.abs(juvenile * j - YOUNG * adult * a) <= 1.5, `${sp} ${sc}: the young is 0.80 of its adult (${juvenile * j} vs ${YOUNG * adult * a})`);
    assert.equal(sceneFactor(sp, "adult", sc), adult, "one factor per kind and scene: asking again gives the same");
  }
});
test("a many-mibi scene's adult is smaller than a single-mibi scene's; a large kind is a fifth bigger than a medium one at the same stand height", () => {
  assert.ok(targetHeight("S01", "home") < targetHeight("S01", "habitat"));
  assert.ok(Math.abs(targetHeight("S01", "idle") - 0.24 * 600) < 1e-9 && Math.abs(targetHeight("S01", "habitat") - 0.40 * 408) < 1e-9, "S01 is medium");
  assert.ok(Math.abs(targetHeight("S02", "vivarium") - 0.24 * 472 * 1.2) < 1e-9, "S02 is large");
  assert.ok(Math.abs(targetHeight("S03", "home") - 0.24 * 362 * 0.8) < 1e-9, "S03 is small");
});
test("release 22 C: for the eight first kinds the kind keeps one ratio (its drawn figure over its table height) in the Habitat and the Sitting (the habitat scene), Vivarium, Home and Idle, adult and young", () => {
  const FIRST = ["S01", "S05", "S08", "S12", "S17", "S03", "S04", "S20"];   // Loika, Tepor, Rupar, Peplos, Wickle, Tuikis, Hiljan, Tuliko
  for (const sp of FIRST) {
    assert.ok(KINDS.includes(sp), sp + " has a frame");
    const a = standInk(sp, "adult"), j = standInk(sp, "juvenile"), ratios = [];
    for (const sc of Object.keys(SCENES)) {
      ratios.push(["adult", sceneFactor(sp, "adult", sc) * a / targetHeight(sp, sc)]);
      ratios.push(["young", sceneFactor(sp, "juvenile", sc) * j / (YOUNG * targetHeight(sp, sc))]);
    }
    const first = ratios[0][1];
    assert.ok(first > 0 && first <= 1 + 1e-3, `${sp}: the ratio is in (0, 1]`);
    for (const [who, r] of ratios) assert.ok(Math.abs(r - first) < 3e-3, `${sp} ${who}: ratio ${r} against ${first}`);
  }
});
test("the cap: every pose of the kind at the habitat's factor is inside 0.55 of the glass's width and 0.65 of its height", () => {
  for (const sp of KINDS) {
    const k = sittingKindScale(sp, GLASS), f = sceneFactor(sp, "adult", "habitat"); assert.ok(f <= k + 1e-3, `${sp}: factor ${f} over the cap ${k}`);
  }
});
