// The Library's generated pictures, in Node: the Level 1 cell picture (specimen.mjs renderCell, library.json l1.cell.picture) and the face pictures (face-pictures.mjs, library.json faces). The cell picture is opaque, on its
// cell's exact ground at every pixel within 4 px of its edge, the same bytes from the same input, and Home's own harness is untouched; a face is opaque, framed in libLine, ticked in fog at 40, 56 and 64 only, made at its size from
// the stand's face window, its faded variant the same picture mixed toward libGround (frame included), and a species with no layered stand is the labelled stand-in. Each prints its render time.
//   node --test prototypes/station/tests/library-pictures.test.mjs
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, podGenome } from "../src/genome.mjs";
import { renderCell, CELL, HARNESS, RECIPE } from "../src/specimen.mjs";
import { facePicture } from "../src/face-pictures.mjs";
import { drawnLooks } from "../src/looks.mjs";
import { RGB, C } from "../src/pixels.mjs";
import { loadStandLayersFs, loadStandLooksFs, loadStandSizesFs, unloadStands } from "../tools/stand-layers-fs.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const lib = JSON.parse(readFileSync(path.resolve(here, "../../ui/specs/station/library.json"), "utf8")), rgb = (n) => RGB[C[n]];
before(() => { loadStandLooksFs(); loadStandLayersFs(); loadStandSizesFs(); });
after(() => unloadStands());
const px = (p, x, y) => Array.from(p.rgba.subarray((y * p.w + x) * 4, (y * p.w + x) * 4 + 4));

test("a cell picture: 140 x 114, opaque, the exact ground within 4 px of its edge, the same bytes twice; the pencil study on libQuiet; Home's harness and recipe unchanged", () => {
  const fr = frameOf("S02"), found = {}; for (const ch of fr.chapters) if (!ch.sealed) for (const t of ch.traits) found[t.id] = t.looks.slice(0, 1);
  for (const [status, ground] of [["found", "libPanel"], ["met", "libQuiet"]]) {
    const g = rgb(ground), a = renderCell(fr, { S02: found }, { pencil: status === "met", ground: g }), b = renderCell(fr, { S02: found }, { pencil: status === "met", ground: g });
    console.log(`# library cell S02 ${status}: rendered in ${a.ms.toFixed(0)} ms (${a.w} x ${a.h})`);
    assert.deepEqual([a.w, a.h], lib.l1.cell.picture.rect.slice(2)); assert.deepEqual(Buffer.from(a.rgba), Buffer.from(b.rgba), "pure: the same bytes");
    let edge = 0, inner = 0; for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) { const p = px(a, x, y); assert.equal(p[3], 255); const d = Math.min(x, y, a.w - 1 - x, a.h - 1 - y); if (d < CELL.edge) { if (p[0] !== g[0] || p[1] !== g[1] || p[2] !== g[2]) edge++; } else if (p[0] !== g[0] || p[1] !== g[1] || p[2] !== g[2]) inner++; }
    assert.equal(edge, 0, status + ": every pixel within 4 px of the edge is the exact " + ground); assert.ok(inner > 200, status + ": the form is drawn (" + inner + " pixels)");
  }
  assert.deepEqual([HARNESS.w, HARNESS.h, HARNESS.scale, RECIPE], [344, 362, 1.0, 2], "Home's harness and recipe as they were");
});

test("a face picture at each size: opaque, the libLine frame, fog ticks at 40, 56 and 64 only, from the stand's face window; faded is round(0.38 p + 0.62 libGround), frame included; no stand: the stand-in", () => {
  const F = lib.faces, fr = frameOf("S01"), m = { id: 7, genome: podGenome(fr, 5), read: fr.chapters.map((c) => c.id) }, looks = drawnLooks(fr, m), line = rgb(F.frame), fog = rgb(F.ticks.colour), ground = rgb(F.ground);
  for (const n of F.sizes) {
    const p = facePicture({ species: "S01", stage: "adult", looks, size: n }, F, rgb), q = facePicture({ species: "S01", stage: "adult", looks, size: n, faded: true }, F, rgb);
    console.log(`# face S01 adult ${n}: rendered in ${p.ms.toFixed(0)} ms`);
    assert.deepEqual([p.w, p.h, p.standIn], [n, n, false]); for (let i = 0; i < n * n; i++) assert.equal(p.rgba[i * 4 + 3], 255);
    const ticked = F.ticks.sizes.includes(n); assert.deepEqual(px(p, 0, 0).slice(0, 3), ticked ? fog : line, n + ": the corner"); assert.deepEqual(px(p, Math.floor(n / 2), 0).slice(0, 3), line, n + ": the frame");
    assert.deepEqual(px(p, F.ticks.arm - 1, 0).slice(0, 3), ticked ? fog : line); assert.deepEqual(px(p, F.ticks.arm, 0).slice(0, 3), line, "the tick's arm is " + F.ticks.arm + " px");
    let inside = 0; for (let y = 1; y < n - 1; y++) for (let x = 1; x < n - 1; x++) { const c = px(p, x, y); if (c[0] !== ground[0] || c[1] !== ground[1] || c[2] !== ground[2]) inside++; } assert.ok(inside > n, n + ": the face is drawn inside the frame");
    for (let i = 0; i < n * n * 4; i++) if (i % 4 !== 3) assert.equal(q.rgba[i], Math.round(0.38 * p.rgba[i] + 0.62 * ground[i % 4]), "faded per channel at " + i);
  }
  const s = facePicture({ species: "S02", stage: "adult", looks: {}, size: 40 }, F, rgb); assert.equal(s.standIn, true, "a species with no layered stand: the stand-in"); assert.deepEqual(px(s, 20, 20).slice(0, 3), rgb("stone")); assert.deepEqual(px(s, 20, 0).slice(0, 3), line);
  const j = facePicture({ species: "S01", stage: "juvenile", looks, size: 18 }, F, rgb), e = facePicture({ species: "S01", stage: "elder", looks, size: 18 }, F, rgb), a = facePicture({ species: "S01", stage: "adult", looks, size: 18 }, F, rgb);
  assert.notDeepEqual(Buffer.from(j.rgba), Buffer.from(a.rgba), "the juvenile through its own window"); assert.deepEqual(Buffer.from(e.rgba), Buffer.from(a.rgba), "an elder takes the adult's stand");
});
