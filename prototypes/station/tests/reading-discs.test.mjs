// The reading screen's unread discs (UI/UX 2026-10-30, S1): the "?" about 18 px tall in an 88 px disc, a light stroke, in the chapter colour at 70 % over dark glass; a trait with no stand to crop (a doing, a drawn template) has no flat grey under the ghost.
//   node --test prototypes/station/tests/reading-discs.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf } from "../src/genome.mjs";
import { discPicture } from "../src/reading-pictures.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const env = { frameOf };
const unread = (species, chapter, trait, d, look) => { const px = discPicture({ d, species, chapter, trait, look, q: true, ghost: true }, env), P = d + 8; return { px, P }; };
const rowsWith = (px, P, test) => { const rows = new Set(); for (let y = 0; y < P; y++) for (let x = 0; x < P; x++) { const i = (y * P + x) * 4; if (px[i + 3] > 200 && test(px[i], px[i + 1], px[i + 2])) rows.add(y); } return [...rows]; };

test("an unread disc's \"?\" is about 18 px tall in an 88 px disc and scales with it, in a light stroke", () => {
  for (const [d, want] of [[88, 18], [104, 21], [64, 13]]) {
    const { px, P } = unread("S01", "movement", "drive", d, "steady"), ink = rowsWith(px, P, (r, g, b) => g > 110 && g > r + 20 && g > b + 20), h = Math.max(...ink) - Math.min(...ink) + 1;
    assert.ok(Math.abs(h - want) <= 3, `${d} px disc: the "?" is ${h} px tall, wanted about ${want}`);
  }
});
test("a doing's or a drawn template's unread disc is dark glass under the ghost, never a flat grey fill", () => {
  for (const [sp, ch, t] of [["S01", "movement", "drive"], ["S03", "shape", "build"]]) {
    const fr = frameOf(sp), trait = fr.chapters.find((c) => c.id === ch)?.traits.find((x) => x.id === t) ?? fr.chapters.find((c) => c.id === ch).traits[0], { px, P } = unread(sp, ch, trait.id, 88, Array.isArray(trait.looks) ? trait.looks[0] : null);
    const at = (x, y) => [...px.slice((y * P + x) * 4, (y * P + x) * 4 + 3)], c = at(Math.round(P / 2) - 22, Math.round(P / 2) + 14);
    assert.ok(c[0] < 40 && c[1] < 70 && c[2] < 75 && c[1] > c[0], `${sp} ${t}: dark glass at the disc's side (${c})`);
  }
});
