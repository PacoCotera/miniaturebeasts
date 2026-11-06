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
import { loadStandSizesFs, unloadStands } from "../tools/stand-layers-fs.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames/language");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const lib = JSON.parse(readFileSync(path.resolve(here, "../../ui/specs/station/library.json"), "utf8")), rgb = (n) => RGB[C[n]];
before(() => { loadStandSizesFs(); });
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

// retired (release 21a): a face picture at each size: opaque... needs the layered stand's face window of S01, retired
