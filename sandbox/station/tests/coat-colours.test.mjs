// The swatch colours of a coat (release 21g, art desk ruling R21-COAT-V8): Loika's from the desk's palette beside the fixed cream; any other kind's from its land band, turned by the Tint word, never one colour for all.
//   node --test prototypes/station/tests/coat-colours.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { coatColours, LAND_OF, LAND_BODY, CREAM } from "../src/coat-colours.mjs";
import { lookColours } from "../src/specimen.mjs";

const lang = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../workbench/frames/language");
test("Loika: the nine coat_main hexes of the ruling, beside the cream", () => {
  const want = { redder: ["#482a1e", "#864d2b", "#a26b4f"], between: ["#2e2a2d", "#615c5f", "#989397"], yellower: ["#3e301f", "#72583b", "#9f805a"] };
  for (const [t, row] of Object.entries(want)) row.forEach((hex, i) => assert.deepEqual(coatColours("S01", t, ["dark", "between", "light"][i]), [hex, CREAM]));
  assert.deepEqual(lookColours({ id: "body-hue", sid: "S01", chapterId: "coat" }, "redder", 0), ["#864d2b", CREAM], "the Tint trait's swatch is the between shade of the tint");
});
test("every kind's Tint looks are three different colours of its own land, and the table matches the frames", () => {
  for (const f of readdirSync(lang).filter((f) => /^species-S\d\d\.json$/.test(f))) {
    const fr = JSON.parse(readFileSync(path.join(lang, f), "utf8")), tint = fr.chapters.flatMap((c) => c.traits).find((t) => t.id === "body-hue");
    assert.equal(LAND_OF[fr.species.id], fr.land, fr.species.id + " land"); assert.ok(LAND_BODY[fr.land]);
    const cols = tint.looks.map((l) => lookColours({ id: "body-hue", sid: fr.species.id, chapterId: "coat" }, l, 0)[0]);
    assert.equal(new Set(cols).size, 3, `${fr.species.id}: ${cols}`);
    assert.notEqual(cols[0], "#bf9157", fr.species.id + " is not the chapter's one tan");
  }
});
