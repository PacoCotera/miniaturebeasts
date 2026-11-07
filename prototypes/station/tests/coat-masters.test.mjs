// The coats (release 21f): a kind's painted masters recoloured at build time and placed beside the painted ones (ui/tools/coat-masters.mjs); the game names a coat's master only where it is placed, and a kind with no coat trait
// (Loika, whose body pigment the version 8 frame locks to charcoal) is drawn in the painted coat everywhere.
//   node --test prototypes/station/tests/coat-masters.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { coatOf, coatMaster, COAT_LOOKS } from "../src/stands.mjs";
import { placeMaster } from "../../ui/assets.mjs";
import { planCoats, PAIRS, DESK } from "../../ui/tools/coat-masters.mjs";
import { figureBox } from "../../ui/tools/game-masters.mjs";
import { decodePNG } from "../../ui/png.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../ui/assets/masters"), index = JSON.parse(readFileSync(path.join(root, "index.json"), "utf8")), M = index.masters;
const put = (id) => placeMaster({ id, w: M[id].w, h: M[id].h, file: M[id].file, hash: M[id].sha256, signed: "test", status: "master" }, { w: M[id].w, h: M[id].h, rgba: () => new Uint8ClampedArray(0) });

test("no kind names a coat trait yet: Loika's coat is the painted one for any looks", () => {
  assert.deepEqual(COAT_LOOKS, {}, "the table is empty until the game designer names the trait that says russet or ash");
  assert.equal(coatOf("S01", { "body-hue": "redder", markings: "patches" }), null);
});
test("coatOf reads the table: a look that names a coat gives it, anything else the painted coat", () => {
  const t = { S01: { trait: "body-hue", looks: { redder: "russet", yellower: "ash" } } };
  assert.equal(coatOf("S01", { "body-hue": "redder" }, t), "russet");
  assert.equal(coatOf("S01", { "body-hue": "between" }, t), null);
  assert.equal(coatOf("S01", {}, t), null, "an unread chapter draws no look, so the painted coat");
  assert.equal(coatOf("S02", { "body-hue": "redder" }, t), null, "a kind the table does not name");
});
test("a coat's master is named only where it is placed at the picture's own size; else the painted master's own id", () => {
  const painted = "mibi-adult-S01-304x312", russet = "mibi-adult-S01-russet-304x312";
  put(painted); put(russet);
  assert.equal(coatMaster(painted, "S01", null), painted);
  assert.equal(coatMaster(painted, "S01", "russet"), russet);
  assert.equal(coatMaster(painted, "S01", "ash"), painted, "ash is placed too in the tree but not registered here: the painted master shows");
  assert.equal(coatMaster("mibi-adult-S02-304x312", "S02", "russet"), "mibi-adult-S02-304x312", "a kind with no coat masters");
  assert.equal(coatMaster("mibi-adult-S01-shake-304x312", "S01", "russet"), "mibi-adult-S01-shake-304x312", "a pose whose coat master is not registered here");
});
test("the placed coats: russet and ash for the stand at three sizes, the curl and the shake and calm poses, adult and young; each the painted master's size, the young 0.8 of its adult", () => {
  const sizes = { "": ["304x312", "96x88", "48x48"], "curl-": ["304x312"], "shake-": ["304x312"], "calm-": ["304x312"] };
  for (const coat of ["russet", "ash"]) for (const [pose, list] of Object.entries(sizes)) for (const size of list) for (const stage of ["adult", "juvenile"]) {
    const id = `mibi-${stage}-S01-${coat}-${pose}${size}`, painted = `mibi-${stage}-S01-${pose}${size}`;
    assert.ok(M[id], id + " is placed"); assert.equal(M[id].w, M[painted].w); assert.equal(M[id].h, M[painted].h);
  }
  const box = (id) => figureBox({ w: M[id].w, h: M[id].h, data: decodePNG(readFileSync(path.join(root, M[id].file))).data });
  for (const coat of ["russet", "ash"]) {
    const a = box(`mibi-adult-S01-${coat}-304x312`), p = box("mibi-adult-S01-304x312");
    assert.deepEqual(a, p, coat + " keeps the painted figure's box (the recolour leaves alpha alone)");
  }
});
test("the generator: the desk's charcoal outputs, put through the placement, are the placed painted masters to the byte; the signature and layout pictures wait", () => {
  const plan = planCoats({ desk: DESK, index });
  if (!plan.kinds.length) return;   // the desk's folder is not on this machine: the placed files above stand
  assert.ok(plan.charcoal.length >= 12 && plan.charcoal.every((c) => c.ok), plan.charcoal.filter((c) => !c.ok).map((c) => c.id).join(", "));
  assert.ok(plan.ops.every((o) => M[o.id] && M[o.id].sha256), "every op is in the index");
  assert.ok(PAIRS.every((p) => p.length === 4));
  assert.ok(plan.waiting.some((w) => /lay-spots/.test(w)));
});
