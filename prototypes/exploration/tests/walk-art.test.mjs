// The art desk's walk art (art/walk/, signed in mibi-art ce97d1c19): every placed file is the desk's file byte for byte (against the desk's out/ when it is checked out beside this repo,
// and always against the hashes recorded when it was placed), every slot the page names has its file and every file a slot, every pixel is on the core palette, and the page draws the pieces as they are.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { makePage, WALK_ART } from "./page-harness.mjs";

const DIR = new URL("../art/walk/", import.meta.url), DESK = process.env.MIBI_ART_WALK || "/home/mb/mb/mibi-art/art-jobs/2026-11-09-walk-art/out/";
const sha = (buf) => createHash("sha256").update(buf).digest("hex");
const files = readdirSync(DIR).filter((f) => f.endsWith(".png")).sort();
const HASHES = JSON.parse(readFileSync(new URL("SHA256.json", DIR), "utf8"));

test("every placed file equals the desk's file byte for byte (and its recorded hash)", () => {
  assert.ok(files.length >= 70, "the files are placed: " + files.length);
  assert.deepEqual(Object.keys(HASHES).sort(), files, "the hash list names exactly the placed files");
  for (const f of files) assert.equal(sha(readFileSync(new URL(f, DIR))), HASHES[f], f + " is not what was placed");
  if (!existsSync(DESK)) { console.log("# the desk's out/ is not beside this repo (" + DESK + "): byte check against the recorded hashes only"); return; }
  for (const f of files) assert.ok(readFileSync(new URL(f, DIR)).equals(readFileSync(DESK + f)), f + " differs from the desk's file");
});

test("the page's slots and the placed files are the same set, and every pixel is on the core palette with no partial alpha", () => {
  const p = makePage({ console: "silent", els: true, canvas: true, raf: 1 });
  const names = p.run("WALK_FILES"), want = files.map((f) => f.slice(0, -4)).sort();
  assert.deepEqual([...names].sort(), want, "WALK_FILES names exactly the placed files");
  assert.equal(p.run("WART.ready"), true, "the art read at boot");
  const rgb = p.run("RGB"), core = new Set(rgb.slice(0, 51).map((c) => c.join()));
  for (const [n, f] of Object.entries(WALK_ART)) for (let i = 0; i < f.width * f.height; i++) {
    const a = f.data[i * 4 + 3]; assert.ok(a === 0 || a === 255, n + ": partial alpha " + a);
    if (a) assert.ok(core.has([f.data[i * 4], f.data[i * 4 + 1], f.data[i * 4 + 2]].join()), n + ": a pixel off the core palette at " + i);
  }
});

// a drawn buffer against the file: the same pixels
function same(p, expr, name) {
  const f = WALK_ART[name], pb = p.run(expr), rgb = p.run("RGB");
  assert.deepEqual([pb.w, pb.h], [f.width, f.height], name + " size");
  for (let i = 0; i < f.width * f.height; i++) {
    if (!f.data[i * 4 + 3]) { assert.equal(pb.p[i], -1, name + " clear at " + i); continue; }
    assert.deepEqual(Array.from(rgb[pb.p[i]]), [f.data[i * 4], f.data[i * 4 + 1], f.data[i * 4 + 2]], name + " at " + i);
  }
}

test("the page draws the desk's pieces as they are: marks, shimmer, bubble, the notice card and the puddle frames", () => {
  const p = makePage({ console: "silent", els: true, canvas: true, raf: 1 });
  for (const [land, kind] of [["L.MEADOW", "windstep"], ["L.POND", "reedpool"], ["L.ROCK", "splitstone"], ["L.WOOD", "hollowtree"]])
    for (const state of ["found", "been"]) for (const size of [26, 18, 12]) same(p, `placeMark(${land}, '${state}', ${size})`, `mark-${kind}-${state}-${size}`);
  same(p, "ICON.shimmer()", "icon-shimmer-16"); same(p, "bubbleArt('?')", "bubble-curious-11x13"); same(p, "walkPB('spot-notice-16x22')", "spot-notice-16x22");
  for (const [k, sc] of [["48", 1], ["24", .5], ["map7", .4], ["map4", .2]]) for (const s of [0, 1, 2]) {
    p.run("scr.px().fill(-1)"); p.run(`paintPuddle(100, 100, ${sc}, ${s})`);
    const f = WALK_ART[`spring-puddle-${k}-spark${s}`], at = { 48: -11, 24: -5, map7: -3, map4: -3 }[k], px = p.run("scr").px(), W = p.run("SCR_W"), rgb = p.run("RGB");
    for (let y = 0; y < f.height; y++) for (let x = 0; x < f.width; x++) {
      const i = (y * f.width + x) * 4; if (!f.data[i + 3]) continue;
      assert.deepEqual(Array.from(rgb[px[(100 + at + y) * W + 100 + x]]), [f.data[i], f.data[i + 1], f.data[i + 2]], `puddle ${k} spark ${s} at ${x},${y}`);
    }
  }
});

test("the land takes the desk's tiles at (wx mod w, wy mod h) for each cell size, and no code stand-in is left for them", () => {
  const p = makePage({ console: "silent", els: true, canvas: true, raf: 1 });
  p.run("newWorld(7)");
  const rgb = p.run("RGB");
  for (const cs of [72, 48, 26]) {
    for (const t of ["meadow", "wood", "rock", "pondrim", "beach", "foam", "water"]) {
      const f = WALK_ART[`map-tex-${t}-${cs}`], pb = p.run(`WART.pb.get('map-tex-${t}-${cs}')`);
      assert.deepEqual([pb.w, pb.h], [f.width, f.height], `${t} ${cs}`);
      for (let i = 0; i < f.width * f.height; i++) assert.deepEqual(Array.from(rgb[pb.p[i]]), [f.data[i * 4], f.data[i * 4 + 1], f.data[i * 4 + 2]], `${t} ${cs} at ${i}`);
    }
  }
  const src = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  for (const gone of ["function edgeMarkPB", "const EDGE_MARK", "i-shimmer", "'pmark:'", "col = C.sand;\n      else if (land === L.MEADOW"]) assert.ok(!src.includes(gone), "a code stand-in is still in the page: " + gone);
});
