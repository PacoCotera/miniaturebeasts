// The two shapes of a trait (build step 1): which shape a trait is comes from the kind's rules, never a table; a scale reads the two copies of a genome; a set marks what she shows, what she hides and what none of
// the player's mibis has; the pictures come at three sizes with the words they name, and the same model gives the same bytes.
//   node --test prototypes/station/tests/trait-shapes.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, podGenome } from "../src/genome.mjs";
import { shapeOf, shapeModel, scaleModel, setModel } from "../src/trait-shapes.mjs";
import { SIZES, shapePicture, cardsOf } from "../src/trait-shape-pictures.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../species/frames/language");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))).filter((f) => !f.species.draft));
const loika = frameOf("S01"), traits = loika.chapters.flatMap((c) => c.traits), T = (id) => traits.find((t) => t.id === id);
const genome = (seed) => podGenome(loika, seed);

test("the Loika has fourteen scales and four sets, read from the kind's rules", () => {
  assert.deepEqual([traits.filter((t) => shapeOf(loika, t) === "scale").length, traits.filter((t) => shapeOf(loika, t) === "set").length], [14, 4]);
  assert.deepEqual(traits.filter((t) => shapeOf(loika, t) === "set").map((t) => t.id).sort(), ["attitude", "iris", "markings", "signature-count"]);
});

test("every kind: every non-sealed trait is one of the two shapes, and a model builds for it", () => {
  for (const id of ["S01", "S03", "S05", "S12"]) { const fr = frameOf(id); if (!fr) continue; const g = podGenome(fr, 3);
    for (const ch of fr.chapters) for (const t of ch.traits) { const m = shapeModel(fr, t, g); assert.equal(m.shape, shapeOf(fr, t)); assert.equal(m.id, t.id); } }
});

test("a scale: the two copies and what she shows are on 0..1 of the kind's range; ends and middle are the frame's words", () => {
  const g = genome(7), m = scaleModel(loika, T("body-value"), g);
  assert.equal(m.shape, "scale"); assert.equal(m.copies.length, 2); for (const v of [...m.copies, m.shows]) assert.ok(v >= 0 && v <= 1);
  assert.ok(Math.abs(m.shows - (m.copies[0] + m.copies[1]) / 2) < 1e-6, "she shows the middle of her two copies");
  assert.deepEqual(m.ends, ["dark", "light"]); assert.equal(m.mid, "between");
  assert.equal(scaleModel(loika, T("signature-size"), g).mid, "", "two words, no middle");
});

test("a scale: the player's other mibis stand where they are; a rough stretch is clamped", () => {
  const m = scaleModel(loika, T("body-hue"), genome(1), [genome(2), genome(3)], [-0.2, 0.4]);
  assert.equal(m.others.length, 2); assert.deepEqual(m.rough, [0, 0.4]);
});

test("a set: one look is shown, at most one is hidden, a look none of the player's has is marked", () => {
  const g = genome(11), m = setModel(loika, T("markings"), g, []);
  assert.equal(m.looks.length, 6); assert.equal(m.looks.filter((l) => l.shows).length, 1); assert.ok(m.looks.filter((l) => l.hidden).length <= 1);
  for (const l of m.looks) assert.equal(l.none, !l.shows && !l.hidden);
  const withOthers = setModel(loika, T("markings"), g, [genome(5)]);
  for (const l of withOthers.looks) if (l.others > 0) assert.equal(l.none, false);
});

test("the pictures: three sizes, the size the table says, the same bytes twice", () => {
  const models = [shapeModel(loika, T("body-value"), genome(7), [genome(2)]), shapeModel(loika, T("markings"), genome(11), [genome(5)])];
  for (const m of models) for (const size of Object.keys(SIZES)) {
    const a = shapePicture(m, size), b = shapePicture(m, size);
    assert.deepEqual([a.w, a.h], SIZES[size]); assert.equal(a.rgba.length, a.w * a.h * 4); assert.deepEqual(a.rgba, b.rgba);
    assert.ok(a.rgba.some((v, i) => i % 4 === 3 && v > 0), "something is drawn");
  }
});

test("the spec's shapes table (what the face places the words from) is the picture's own LAYOUT", async () => {
  const { LAYOUT } = await import("../src/trait-shape-pictures.mjs"), spec = JSON.parse(readFileSync(path.resolve(here, "../../ui/specs/station/pods.json"), "utf8")).regions.read.right.shapes;
  assert.equal(spec.margin, LAYOUT.margin); assert.deepEqual(spec.size, SIZES);
  for (const form of ["scale", "set"]) for (const size of Object.keys(SIZES)) for (const [k, v] of Object.entries(spec[form][size])) assert.equal(LAYOUT[form][size][k], v, `${form}.${size}.${k}`);
});

test("the layout: a set's cards stay inside the picture at every look count; no per-size picture is bigger than its plate", () => {
  for (const n of [1, 2, 3, 5, 6]) for (const size of ["large", "small", "tiny"]) {
    const L = { cards: cardsOf(n, size), w: SIZES[size][0], h: SIZES[size][1] };
    for (const c of L.cards) assert.ok(c.x >= 0 && c.y >= 0 && c.x + c.w <= L.w && c.y + c.h <= L.h, `${n} cards, ${size}`);
  }
  assert.ok(SIZES.large[1] <= 156 && SIZES.small[1] <= 104 && SIZES.tiny[1] <= 84 && SIZES.large[0] <= 334, "the read plates (pods.json read1/read3/read4)");
});
