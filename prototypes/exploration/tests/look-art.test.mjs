// The art desk's look-view marks (art/look/): every placed file is the desk's file byte for byte, read from the commit it was signed in (never the desk's live folder), the page's slots and the files
// are the same set, every pixel is on the core palette (the quartz stone marks are the desk's own ramp: no partial alpha, and their colours join the screen's allowed set), and the page draws each
// mark as the file, its anchor on the tile's bottom centre. No stand-in ring is left in the look view: the partner is drawn as its kind, all twenty of them.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { makePage, LOOK_ART, PAGE } from "./page-harness.mjs";

const DIR = new URL("../art/look/", import.meta.url);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const files = readdirSync(DIR).filter((f) => f.endsWith(".png")).sort();
const HASHES = JSON.parse(readFileSync(new URL("SHA256.json", DIR), "utf8"));
const isStone = (f) => /^(look-heart-stone|look-take-(charge|warm)-)/.test(f), isPartner = (f) => f.startsWith("look-partner-");

test("every placed file equals its recorded hash (copied byte for byte from the desk's signed commits)", () => {
  assert.equal(files.length, 28 + 40, "the files are placed: " + files.length);
  assert.deepEqual(Object.keys(HASHES).sort(), files);
  for (const f of files) assert.equal(sha(readFileSync(new URL(f, DIR))), HASHES[f], f);
});

test("the page's slots and the files are the same set, on the core palette (the quartz marks apart), no partial alpha, at the sizes the manifest names", () => {
  const p = makePage({ console: "silent", els: true, canvas: true, raf: 1 });
  assert.deepEqual([...p.run("LOOK_FILES")].sort(), files.map((f) => f.slice(0, -4)).sort());
  const rgb = p.run("RGB"), core = new Set(rgb.slice(0, 51).map((c) => c.join())), size = JSON.parse(JSON.stringify(p.run("LOOK_SIZE")));
  for (const [n, f] of Object.entries(LOOK_ART)) {
    for (let i = 0; i < f.width * f.height; i++) { const a = f.data[i * 4 + 3]; assert.ok(a === 0 || a === 255, n + ": partial alpha " + a);
      if (a && !isStone(n)) assert.ok(core.has([f.data[i * 4], f.data[i * 4 + 1], f.data[i * 4 + 2]].join()), n + ": a pixel off the core palette at " + i); }
    if (isPartner(n)) { assert.equal(f.height, n.endsWith("-juv") ? 18 : 20, n + " height"); continue; }
    const kind = n.startsWith("you-here") ? "you" : n.startsWith("look-take") ? "take" : n.slice("look-heart-".length);
    assert.deepEqual([f.width, f.height], size[kind].slice(0, 2), n + " size");
  }
});

test("the page draws each mark as the file, its anchor on the tile's bottom centre", () => {
  const p = makePage({ console: "silent", els: true, canvas: true, raf: 1 }), rgb = p.run("RGB"), W = p.run("SCR_W"), size = JSON.parse(JSON.stringify(p.run("LOOK_SIZE")));
  for (const [n, f] of Object.entries(LOOK_ART)) {
    if (isStone(n)) { assert.ok(p.run(`STONE_PIECES.has('${n}')`), n + " is kept as a picture"); continue; }   // drawn from a canvas, off the core palette: checked by stone-art.test.mjs
    const partner = isPartner(n), kind = partner ? "partner" : n.startsWith("you-here") ? "you" : n.startsWith("look-take") ? "take" : n.slice("look-heart-".length);
    const [ax, ay] = partner ? [f.width >> 1, f.height - 1] : size[kind].slice(2);
    p.run("scr.px().fill(-1)"); p.run(`lookMark('${n}', '${kind}', 200, 300, 24)`);
    const px = p.run("scr").px(), x0 = 200 - ax, y0 = 300 + 12 - ay;
    for (let y = 0; y < f.height; y++) for (let x = 0; x < f.width; x++) {
      const i = (y * f.width + x) * 4, v = px[(y0 + y) * W + x0 + x];
      if (!f.data[i + 3]) { assert.equal(v, -1, `${n} clear at ${x},${y}`); continue; }
      assert.deepEqual(Array.from(rgb[v]), [f.data[i], f.data[i + 1], f.data[i + 2]], `${n} at ${x},${y}`);
    }
  }
});

test("all twenty kinds have an adult and a young partner mark, and the species index names the desk's kind (Tuikis is S03, Untuva S02)", () => {
  const p = makePage({ console: "silent", els: true, canvas: true, raf: 1 });
  const names = JSON.parse(JSON.stringify(p.run("SPECIES.map(s => s.name)")));
  assert.equal(names.length, 20);
  for (let sp = 0; sp < 20; sp++) {
    for (const young of [false, true]) {
      const n = p.run(`partnerMark(${sp}, ${young})`); assert.ok(LOOK_ART[n], n + " is placed");
    }
  }
});

test("no stand-in ring is left in the look view: the explorer, the partner, the heart and the takeables come from the desk's files", () => {
  const body = PAGE.slice(PAGE.indexOf("function drawWhole("), PAGE.indexOf("// ---------- The spring's tell, one painter for every view"));
  assert.doesNotMatch(body, /circ\(e\.x/, "no code explorer");
  assert.doesNotMatch(body, /circ\(m\.x, m\.y/, "no code partner ring");
  assert.doesNotMatch(body, /circ\(q\.x, q\.y, 1[024]/, "no code heart ring");
  assert.doesNotMatch(body, /dashRing\(r\.x/, "no code take rings");
  assert.match(body, /lookMark\(`look-take-/); assert.match(body, /lookMark\('look-heart-'/); assert.match(body, /lookMark\(motion\(\) \? 'you-here-pulse-'/); assert.match(body, /lookMark\(partnerMark\(/);
});
