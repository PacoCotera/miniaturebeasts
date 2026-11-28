// Riding (companion-riding-build-2): a home mibi's picture is a cut of her own signed master, chosen by the one picker (src/data/riding-cut.mjs):
// her coat and marking from her genome (the Station's ownLooks and coatOf), her 96 cut by the same key, a young one her young cut, a kind with one painted stand that stand's cut, no stock picture where none exists.
//   node --test prototypes/exploration/tests/riding-cut.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { cutName, kindId, CUT_DIR } from "../src/data/riding-cut.mjs";
import { coatOf } from "../../station/src/stands.mjs";
import { ownLooks } from "../../station/src/looks.mjs";
import { setFrames, frameOf } from "../../station/src/genome.mjs";
import * as ST from "../../station/src/state.mjs";

const dir = new URL("../../species/frames/language/", import.meta.url).pathname;
setFrames(readdirSync(dir).filter(f => f.startsWith("species-")).map(f => JSON.parse(readFileSync(path.join(dir, f), "utf8"))));
const have = new Set(JSON.parse(readFileSync(new URL("../" + CUT_DIR + "index.json", import.meta.url), "utf8")));

test("the picker returns her own cut: her coat and marking from her genome, her 96 cut by the same key, the young one's young cut, the painted stand's cut for a kind with one", () => {
  for (const sp of ["S01", "S03", "S12"]) {   // kinds with coats
    const st = ST.normalize(ST.freshSt("w1", 1)); assert.ok(ST.seedAdults(st, sp, 11, 4).ok);
    for (const m of st.mibis.filter(q => q.species === sp)) {
      const coat = coatOf(sp, ownLooks(frameOf(sp), m)), [c, lay] = coat.split("+"), got = cutName(sp, "adult", coat, "big", have);
      assert.ok(got, sp + ": a cut is found");
      if (c !== "between-dark" || sp !== "S01") assert.ok(got.includes("-" + c) || got.endsWith("-228x234.png"), got + " carries her coat " + c);
      const marked = lay && `cut-adult-${sp}-${c}-${lay}-228x234.png`; if (marked && have.has(marked)) assert.equal(got, marked, "her marking, where the kind's master carries it");
      assert.ok(have.has(got) && got.endsWith("-228x234.png"), got); assert.ok(have.has(cutName(sp, "adult", coat, "row", have)), "her 96 cut by the same key");
    }
  }
  assert.equal(cutName("S01", "adult", "between-dark+lay-saddle", "big", have), "cut-adult-S01-between-dark-lay-saddle-228x234.png", "the saddled Loika in her dark coat");
  assert.equal(cutName("S01", "adult", "between-dark", "big", have), "cut-adult-S01-228x234.png", "the painted coat is the kind's painted stand");
  assert.equal(cutName("S02", "adult", null, "big", have), "cut-adult-S02-228x234.png", "a kind with one painted stand gets that stand's cut");
  assert.equal(cutName("S01", "juvenile", null, "row", have), "cut-juvenile-S01-96x88.png", "a young one: her young cut");
  assert.equal(cutName("S99", "adult", null, "big", have), null, "no cut, no stock picture");
  const order = [{ id: "S01" }, { id: "S03" }, { id: "S02" }];   // the game's species order: Loika, Tuikis, Untuva
  assert.equal(kindId({ sp: 2 }, order), "S02"); assert.equal(kindId({ sp: -1, species: "S10" }, order), "S10"); assert.equal(kindId({ sp: 2 }), null, "no id, no order: no cut");
});
