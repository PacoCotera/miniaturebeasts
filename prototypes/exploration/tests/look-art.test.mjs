// The art desk's look-view marks (art/look/, signed in mibi-art 07cd89ed6): every placed file is the desk's file byte for byte (against the desk's out/ when it is checked out beside
// this repo, and always against the recorded hashes), the page's slots and the files are the same set (the placeholder stone slots included), every pixel is on the core palette, and
// the page draws each mark as the file, its anchor on the tile's bottom centre. No stand-in ring is left in the look view.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { makePage, LOOK_ART, PAGE } from "./page-harness.mjs";

const DIR = new URL("../art/look/", import.meta.url), DESK = process.env.MIBI_ART_LOOK || "/home/mb/mb/mibi-art/art-jobs/2026-11-09-you-are-here/out/";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const files = readdirSync(DIR).filter((f) => f.endsWith(".png")).sort();
const HASHES = JSON.parse(readFileSync(new URL("SHA256.json", DIR), "utf8"));
const MANIFEST = existsSync(DESK + "manifest.json") ? JSON.parse(readFileSync(DESK + "manifest.json", "utf8")) : null;

test("every placed file equals the desk's file byte for byte (and its recorded hash)", () => {
  assert.equal(files.length, 3 + 4 + 21 - 1 + 1, "the files are placed: " + files.length);
  assert.deepEqual(Object.keys(HASHES).sort(), files);
  for (const f of files) assert.equal(sha(readFileSync(new URL(f, DIR))), HASHES[f], f);
  if (!MANIFEST) { console.log("# the desk's out/ is not beside this repo: byte check against the recorded hashes only"); return; }
  for (const f of files) assert.ok(readFileSync(new URL(f, DIR)).equals(readFileSync(DESK + f)), f + " differs from the desk's file");
});

test("the page's slots and the files are the same set, on the core palette, no partial alpha, at the sizes the manifest names", () => {
  const p = makePage({ console: "silent", els: true, canvas: true, raf: 1 });
  assert.deepEqual([...p.run("LOOK_FILES")].sort(), files.map((f) => f.slice(0, -4)).sort());
  const rgb = p.run("RGB"), core = new Set(rgb.slice(0, 51).map((c) => c.join())), size = JSON.parse(JSON.stringify(p.run("LOOK_SIZE")));
  for (const [n, f] of Object.entries(LOOK_ART)) {
    for (let i = 0; i < f.width * f.height; i++) { const a = f.data[i * 4 + 3]; assert.ok(a === 0 || a === 255, n + ": partial alpha " + a);
      if (a) assert.ok(core.has([f.data[i * 4], f.data[i * 4 + 1], f.data[i * 4 + 2]].join()), n + ": a pixel off the core palette at " + i); }
    const kind = n.startsWith("you-here") ? "you" : n.startsWith("look-take") ? "take" : n.slice("look-heart-".length);
    assert.deepEqual([f.width, f.height], size[kind].slice(0, 2), n + " size");
  }
  if (MANIFEST) { const m = MANIFEST;
    assert.deepEqual(size.you.slice(2), m.you.anchor); assert.deepEqual(size.take.slice(2), m.take.anchor);
    for (const k of ["spring", "nest", "moment", "stone"]) assert.deepEqual(size[k].slice(2), m.heart.by_kind[k].anchor, k + " anchor"); }
});

test("the page draws each mark as the file, its anchor on the tile's bottom centre", () => {
  const p = makePage({ console: "silent", els: true, canvas: true, raf: 1 }), rgb = p.run("RGB"), W = p.run("SCR_W"), size = JSON.parse(JSON.stringify(p.run("LOOK_SIZE")));
  for (const [n, f] of Object.entries(LOOK_ART)) {
    const kind = n.startsWith("you-here") ? "you" : n.startsWith("look-take") ? "take" : n.slice("look-heart-".length), [, , ax, ay] = size[kind];
    p.run("scr.px().fill(-1)"); p.run(`lookMark('${n}', '${kind}', 200, 300, 24)`);
    const px = p.run("scr").px(), x0 = 200 - ax, y0 = 300 + 12 - ay;
    for (let y = 0; y < f.height; y++) for (let x = 0; x < f.width; x++) {
      const i = (y * f.width + x) * 4, v = px[(y0 + y) * W + x0 + x];
      if (!f.data[i + 3]) { assert.equal(v, -1, `${n} clear at ${x},${y}`); continue; }
      assert.deepEqual(Array.from(rgb[v]), [f.data[i], f.data[i + 1], f.data[i + 2]], `${n} at ${x},${y}`);
    }
  }
});

test("no stand-in ring is left in the look view: the explorer, the heart and the takeables come from the desk's files", () => {
  const body = PAGE.slice(PAGE.indexOf("function drawWhole("), PAGE.indexOf("// ---------- The spring's tell, one painter for every view"));
  assert.doesNotMatch(body, /circ\(e\.x/, "no code explorer");
  assert.doesNotMatch(body, /circ\(q\.x, q\.y, 1[024]/, "no code heart ring");
  assert.doesNotMatch(body, /dashRing\(r\.x/, "no code take rings");
  assert.match(body, /lookMark\(`look-take-/); assert.match(body, /lookMark\('look-heart-'/); assert.match(body, /lookMark\(motion\(\) \? 'you-here-pulse-'/);
});
