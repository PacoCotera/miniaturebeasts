#!/usr/bin/env node
// Writes prototypes/face/tests/vectors/rings.json: the focus ring's masks (ui/rings.mjs, the integer definition of lvgl-switch.md §2.2) as SHA-256 hashes, the 20x20 source's nine-slice
// expansions, and each refusal. face_test runs the C ops (src/prim/ring.c, prim_compose) on the same cases on all three builds, and ring.test.mjs checks the file is current.
//   node prototypes/face/tools/make-ring-vectors.mjs          (writes)     node prototypes/face/tools/make-ring-vectors.mjs --check
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { ringMask, tabRingMask } from "../../ui/rings.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), out = path.resolve(here, "../tests/vectors/rings.json");
const frame = JSON.parse(readFileSync(path.resolve(here, "../../ui/specs/station/frame.json"), "utf8")), F = frame.focus.ring, tabTop = frame.regions.rail.y;
const sha = (m) => createHash("sha256").update(m).digest("hex");
const range = (a, b, s = 1) => { const o = []; for (let i = a; i <= b; i += s) o.push(i); return o; };
const cases = [];
// the round ring (width 2, radius 6): every width to 24 and a spread beyond, at the heights the Station's targets have
for (const h of [16, 20, 24, 32, 40, 57, 100, 200]) for (const w of [...range(1, 24), ...range(25, 400, 9)]) cases.push({ op: "ring", shape: "round", w, h, width: 2, radius: F.radius, sha256: sha(ringMask(w, h, 2, F.radius)) });
for (const [w, h, width, radius] of [[100, 60, 1, 0], [100, 60, 3, 10], [64, 64, 2, 40], [40, 40, 20, 30], [30, 30, 2, 100]]) cases.push({ op: "ring", shape: "round", w, h, width, radius, sha256: sha(ringMask(w, h, width, radius)) });
// the creature's ellipse (24 tall) at every width a body can make, circles and every ellipse to 40 x 40
for (const w of [...range(1, 64), ...range(65, 1040, 11)]) cases.push({ op: "ring", shape: "ellipse", w, h: 24, width: 2, radius: 0, sha256: sha(ringMask(w, 24, 2, 0, "ellipse")) });
for (const d of [...range(1, 60, 1), 80, 120, 168, 200, 260]) cases.push({ op: "ring", shape: "ellipse", w: d, h: d, width: 2, radius: 0, sha256: sha(ringMask(d, d, 2, 0, "ellipse")) });
for (const w of range(1, 40, 3)) for (const h of range(1, 40, 3)) cases.push({ op: "ring", shape: "ellipse", w, h, width: 2, radius: 0, sha256: sha(ringMask(w, h, 2, 0, "ellipse")) });
// the rail tab's ring: the full tab, the compact tab and bodies between
for (const body of [...range(8, 400, 8), 136, 56, 137, 1]) { const t = { ...F.tab, body, width: F.width, radius: F.tab.radiusBottom, tabTop }; const m = tabRingMask(body, { tab: F.tab, width: F.width, tabTop }); cases.push({ op: "tabRing", body, width: t.width, slant: t.slant, outside: t.outside, top: t.top, slantTo: t.slantTo, bottom: t.bottom, radius: t.radius, tabTop, w: m.w, h: m.h, sha256: sha(m.mask) }); }
// the round ring as a nine-slice of its 20 x 20 source (insets 8, the middle tiled): equal to the full-size ring at every size from 16 to 400 by 16 to 200 (sampled)
for (const w of range(16, 400, 16)) for (const h of range(16, 200, 16)) cases.push({ op: "nine", w, h, sha256: sha(ringMask(w, h, 2, 6)) });
// refusals: the picture is refused (prim_compose returns -1) in a 64 x 64 picture
const R = (what, ops) => cases.push({ op: "refuse", what, ops: JSON.stringify(ops) });
R("a non-integer", [["ring", "round", 0, 0, 20.5, 20, 2, 6, "focus"]]); R("an unknown palette name", [["ring", "round", 0, 0, 20, 20, 2, 6, "nosuchcolour"]]); R("an unknown shape", [["ring", "square", 0, 0, 20, 20, 2, 6, "focus"]]);
R("width 0", [["ring", "round", 0, 0, 20, 20, 0, 6, "focus"]]); R("w 0", [["ring", "round", 0, 0, 0, 20, 2, 6, "focus"]]); R("h 0", [["ring", "round", 0, 0, 20, 0, 2, 6, "focus"]]);
R("a negative radius", [["ring", "round", 0, 0, 20, 20, 2, -1, "focus"]]); R("an ellipse with a radius", [["ring", "ellipse", 0, 0, 20, 20, 2, 3, "focus"]]);
R("a box outside its picture", [["ring", "round", 50, 0, 20, 20, 2, 6, "focus"]]); R("a negative origin", [["ring", "round", -1, 0, 20, 20, 2, 6, "focus"]]);
const tab = (o = {}) => { const a = { x: 0, y: 0, body: 20, width: 2, slant: 16, outside: 4, top: 42, slantTo: 80, bottom: 84, radius: 6, tabTop: 40, ...o }; return ["tabRing", a.x, a.y, a.body, a.width, a.slant, a.outside, a.top, a.slantTo, a.bottom, a.radius, a.tabTop, "focus"]; };
R("a tab body 0", [tab({ body: 0 })]); R("a negative slant", [tab({ slant: -1 })]); R("a negative outside", [tab({ outside: -1 })]); R("T = 0 (slantTo = tabTop)", [tab({ slantTo: 40 })]);
R("bottom above slantTo", [tab({ bottom: 79 })]); R("top at bottom", [tab({ top: 84 })]); R("a tab box outside its picture", [tab({ x: 40 })]); R("a fractional tab argument", [tab({ slant: 16.5 })]);
const text = JSON.stringify({ note: "Made by tools/make-ring-vectors.mjs from ui/rings.mjs. ring/tabRing: the SHA-256 of the 0/255 mask row by row; nine: the full-size round ring (width 2, radius 6) that the 20x20 source's nine-slice (insets 8, middle tiled) must equal; refuse: ops that prim_compose must refuse in a 64x64 picture.", cases }).replace(/\},\{"op"/g, "},\n{\"op\"") + "\n";
if (process.argv.includes("--check")) { if (readFileSync(out, "utf8") !== text) { console.error("tests/vectors/rings.json is not current: run tools/make-ring-vectors.mjs"); process.exit(1); } console.log(`ring vectors current: ${cases.length} cases`); }
else { writeFileSync(out, text); console.log(`wrote ${cases.length} cases, ${text.length} bytes`); }
