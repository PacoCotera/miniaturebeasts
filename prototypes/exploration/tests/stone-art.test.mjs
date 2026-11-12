// The painted stone family (art/stone/, signed in mibi-art art/art-fix-map-pieces, out/a2, a2b, a3, a3b): every placed file is its recorded hash (the files are copied byte for byte from that commit; the test never reads the desk's repo),
// the page keeps each as a picture, picks tall for the heart's stone and small for a field stone, draws a collected stone as spent (the plain picture, still small), has no ring round a warm stone
// and no stone drawn in code.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { makePage, STONE_ART, PAGE } from "./page-harness.mjs";

const DIR = new URL("../art/stone/", import.meta.url);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const files = readdirSync(DIR).filter((f) => f.endsWith(".png")).sort();
const HASHES = JSON.parse(readFileSync(new URL("SHA256.json", DIR), "utf8"));

test("the 42 placed stone files are the recorded hashes", () => {
  const want = ["tall", "small", "small-b"].flatMap((k) => ["plain", "charged-1", "charged-2", "warm-1", "warm-2", "warm-still", "spent"].flatMap((s) => ["16", "48"].map((r) => `stone-${k}-${s}@${r}.png`))).sort();
  assert.deepEqual(files, want);
  assert.deepEqual(Object.keys(HASHES).sort(), files);
  for (const f of files) assert.equal(sha(readFileSync(new URL(f, DIR))), HASHES[f], f);
  const f = STONE_ART;   // sizes: tall 16 x 24, small 16 x 16, at 1x and 3x; no partial alpha
  for (const [n, im] of Object.entries(f)) {
    const k = n.includes("@16") ? 1 : 3, h = n.startsWith("stone-tall") ? 24 : 16;
    assert.deepEqual([im.width, im.height], [16 * k, h * k], n + " size");
    for (let i = 0; i < im.width * im.height; i++) { const a = im.data[i * 4 + 3]; assert.ok(a === 0 || a === 255, n + " partial alpha"); }
  }
  assert.deepEqual(STONE_ART["stone-tall-spent@48"].data, STONE_ART["stone-tall-plain@48"].data, "spent is the plain picture");
});

test("the page picks tall for the heart's stone, small for a field stone, the frame by state, and a sign's stone is the small one doubled", () => {
  const p = makePage({ console: "silent", els: true, canvas: true, raf: 1 });
  p.ctx.__stoneArt = STONE_ART; p.run("loadStoneArt()");   // the family is given at once, decoded, as a browser loads it
  const pick = (args) => p.run(`(() => { const a = stoneArt(${args}); return [a.w, a.h, a.dx, a.dy]; })()`);
  const arr = (a) => Array.from(a);
  assert.deepEqual(arr(pick("0, false, 0, 0, 0, true")), [48, 72, -8, -40], "the heart's stone: tall, plain");
  assert.deepEqual(arr(pick("0, false, 0, 0, 0, false")), [48, 48, -8, -16], "a field stone: small, plain");
  assert.deepEqual(arr(pick("1, false, 1, 0, 0, true")), [48, 72, -8, -40], "charged, second frame");
  assert.deepEqual(arr(pick("0, false, -1, 1, 0, false")), [48, 48, -8, -16], "warm, the still");
  assert.deepEqual(arr(pick("0, false, 0, 0, 1")), [32, 32, 0, 0], "a sign's stone");
  const key = (args) => p.run(`(() => { const a = stoneArt(${args}); return [...STONE_PIECES].find(([, v]) => v === a)[0]; })()`);
  assert.equal(key("1, false, 0, 0, 0, true"), "stone-tall-charged-1@48"); assert.equal(key("1, false, 1, 0, 0, false"), "stone-small-charged-2@48");
  assert.equal(key("0, false, 1, 1, 0, false"), "stone-small-warm-2@48"); assert.equal(key("0, false, -1, 1, 1"), "stone-small-warm-still@16x2");
  // a field stone's second body (small b) keeps its body in every state; the heart's stone is tall whatever the body says
  assert.equal(key("1, false, 0, 0, 0, false, 1"), "stone-small-b-charged-1@48"); assert.equal(key("0, false, 1, 1, 0, false, 1"), "stone-small-b-warm-2@48");
  assert.equal(key("0, false, 0, 0, 1, false, 1"), "stone-small-b-plain@16x2"); assert.equal(key("0, false, 0, 0, 0, true, 1"), "stone-tall-plain@48");
  // the doubled sign stone is the 16 px master, each pixel twice
  const d = p.run("STONE_PIECES.get('stone-small-plain@16x2')"), m = STONE_ART["stone-small-plain@16"];
  assert.equal(d.w, 32); assert.equal(d.h, 32);
});

test("no stone is drawn in code and no ring surrounds a warm stone", () => {
  assert.doesNotMatch(PAGE, /stonew3/, "the old warm stone with its ring");
  assert.doesNotMatch(PAGE, /ART_SLOTS/, "the old stone-standing slot");
  assert.doesNotMatch(PAGE, /pb\.poly\(\[\[4, 27\], \[6, 14\]/, "the old grey rock polygon");
  assert.match(PAGE, /const STONE_FILES = /);
});
