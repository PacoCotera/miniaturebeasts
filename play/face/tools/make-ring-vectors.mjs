#!/usr/bin/env node
// Writes prototypes/face/tests/vectors/rings.json: the focus ring's masks (ui/rings.mjs, the integer definition of lvgl-switch.md §2.2) as SHA-256 hashes, the 20x20 source's nine-slice
// expansions, and each refusal. face_test runs the C ops (src/prim/ring.c, prim_compose) on the same cases on all three builds, and ring.test.mjs checks the file is current.
//   node prototypes/face/tools/make-ring-vectors.mjs          (writes)     node prototypes/face/tools/make-ring-vectors.mjs --check
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { ringMask, tabRingMask, focusRingOps, ringRaster } from "../../ui/rings.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), out = path.resolve(here, "../tests/vectors/rings.json");
const frame = JSON.parse(readFileSync(path.resolve(here, "../../ui/specs/station/frame.json"), "utf8")), T = frame.focus.ring, tabTop = frame.regions.rail.y;
// the op-level cases keep the single-op ring the ops were first proven on (width 2, radius 6; the tab: outside 4, tops 42 to 84, radius 6): the ops are unchanged, the cased ring is made of three of them (the "cased" cases below)
const F = { radius: 6, width: 2, tab: { slant: 16, outside: 4, top: 42, slantTo: 80, bottom: 84, radiusBottom: 6 } };
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
// fix 14: the cased ring (lvgl-switch.md §2.2): three ops, key / core / key, one ring. A case holds the ops the face composes (JSON, as prim_compose takes them: `focus` the core, `void` the key), the picture they are composed in
// and the SHA-256 of the roles the oracle gives (0 none, 1 key, 2 core, row by row); a "nine" case is the S x S source of a rect ring expanded to its ring box w x h (insets R, the middle tiled).
const jops = (ring) => JSON.stringify(ring.ops.map((op) => (op.shape === "tab" ? ["tabRing", op.x, op.y, op.body, op.width, op.slant, op.outside, op.top, op.slantTo, op.bottom, op.radius, op.tabTop, op.band === "core" ? "focus" : "void"]
  : ["ring", op.shape, op.x, op.y, op.w, op.h, op.width, op.radius, op.band === "core" ? "focus" : "void"])));
const cased = (kind, ring, extra = {}) => cases.push({ op: "cased", kind, w: ring.w, h: ring.h, ...(ring.kind === "nine" ? { S: ring.S, R: ring.R } : {}), ...extra, ops: jops(ring), sha256: sha(ringRaster(ring)) });
for (const r of [0, 6]) for (const ground of ["default"]) {
  const R = r + T.reach;
  for (const w of [2 * R, 2 * R + 1, 2 * R + 2, ...range(2 * R + 8, 400, 56)]) for (const h of [2 * R, 2 * R + 1, ...range(2 * R + 8, 200, 48)]) cased("nine", focusRingOps({ rect: r }, [T.reach, T.reach, w - 2 * T.reach, h - 2 * T.reach], T, { ground }), { r, ground });
}
for (const w of range(20, 220, 10)) for (const h of [16, 18, 20, 22, 24, 26]) { cased("ellipse", focusRingOps("oval", [5, 5, w - 10, h - 10], T), { shape: "oval" }); cased("ellipse", focusRingOps("footprint", [0, 0, w, 40], T, { foot: [5, 20 + (h - 10) / 2, w - 10] }), { shape: "footprint" }); cased("ellipse", focusRingOps("footprint", [0, 0, w, 40], T, { foot: [5, 20 + (h - 10) / 2, w - 10], light: true }), { shape: "footprint", weight: "light" }); }
for (const d of range(66, 186, 20)) cased("ellipse", focusRingOps({ circle: { centre: [d / 2 - 5, d / 2 - 5], r: d / 2 - 5 } }, [5, 5, 0, 0], T), { shape: "circle" });
for (const body of [56, 136, 137, 8, 200]) for (const ground of ["default"]) cased("composed", focusRingOps("tab", [20, 40, body, 40], T, { ground, tabTop }), { shape: "tab", ground });
// the focusRing word on the face (tests/vectors/focus-ring-words.json): each case is a target (its `shape` and `ground` as the screen spec writes them), the rect the screen drew, and for a footprint the picture and cell it reads; words.test.mjs draws it on the
// face and compares every pixel of the ring's box with the roles this oracle gives (focusRingOps, ringRaster).
const wordCases = [
  { name: "rect 0, a wide target", target: { shape: { rect: 0 } }, box: [100, 100, 200, 80] }, { name: "rect 0, a square target", target: { shape: { rect: 0 } }, box: [300, 300, 40, 40] },
  { name: "rect 0, the smallest", target: { shape: { rect: 0 } }, box: [500, 200, 10, 10] }, { name: "rect 6, a plate (lifted)", target: { shape: { rect: 6 } }, box: [688, 38, 320, 88] },
  { name: "rect 6, a well", target: { shape: { rect: 6 } }, box: [32, 492, 152, 48] }, { name: "rect 0 with a chip, a text", target: { shape: { rect: 0, chip: 4 } }, box: [604, 64, 120, 24] },
  { name: "rect 0, a Library frame", target: { shape: { rect: 0 } }, box: [60, 400, 96, 112] }, { name: "oval, a pod", target: { shape: "oval" }, box: [196, 240, 120, 152] },
  { name: "circle, a kin", target: { shape: { circle: "box" } }, box: [600, 224, 56, 56] }, { name: "circle, Pods' place", target: { shape: { circle: { centre: [96, 88], r: 88 } } }, box: [64, 64, 176, 176] },
  { name: "tab, a full tab", target: { shape: "tab" }, box: [100, 40, 136, 40] }, { name: "tab, a compact tab", target: { shape: "tab" }, box: [300, 40, 56, 40] },
  { name: "footprint, a juvenile walker", target: { shape: "footprint" }, box: [200, 300, 104, 112], pic: { w: 104, h: 112, foot: { stand: [10, 100, 56], curl: [14, 108, 70] } }, cell: "stand" },
  { name: "footprint, an odd width", target: { shape: "footprint" }, box: [400, 300, 104, 112], pic: { w: 104, h: 112, foot: { stand: [3, 110, 57], curl: [14, 108, 70] } }, cell: "stand" },
  { name: "footprint, the mirrored cell", target: { shape: "footprint" }, box: [600, 300, 104, 112], pic: { w: 104, h: 112, foot: { stand: [10, 100, 56], curl: [14, 108, 70] } }, cell: "stand-m" },
  { name: "footprint, a sleeper's curl", target: { shape: "footprint" }, box: [800, 300, 104, 112], pic: { w: 104, h: 112, foot: { stand: [10, 100, 56], curl: [14, 108, 70] } }, cell: "curl" },
  { name: "footprint, a still picture", target: { shape: "footprint" }, box: [100, 450, 120, 100], pic: { w: 120, h: 100, foot: [8, 96, 100] }, cell: "" }];
const wordText = JSON.stringify({ note: "The focusRing word as fix 14 draws it: a target (its shape and ground), the rect the screen drew and, for a footprint, the picture and cell it reads. words.test.mjs draws each on the face and compares every pixel of the ring's box with the roles ui/rings.mjs gives.", cases: wordCases }, null, 1) + "\n";
const wordOut = path.resolve(here, "../tests/vectors/focus-ring-words.json");
const text = JSON.stringify({ note: "Made by tools/make-ring-vectors.mjs from ui/rings.mjs. ring/tabRing: the SHA-256 of the 0/255 mask row by row; nine: the full-size round ring (width 2, radius 6) that the 20x20 source's nine-slice (insets 8, middle tiled) must equal; refuse: ops that prim_compose must refuse in a 64x64 picture.", cases }).replace(/\},\{"op"/g, "},\n{\"op\"") + "\n";
if (process.argv.includes("--check")) { if (readFileSync(out, "utf8") !== text || readFileSync(wordOut, "utf8") !== wordText) { console.error("tests/vectors/rings.json or focus-ring-words.json is not current: run tools/make-ring-vectors.mjs"); process.exit(1); } console.log(`ring vectors current: ${cases.length} cases, ${wordCases.length} word cases`); }
else { writeFileSync(out, text); writeFileSync(wordOut, wordText); console.log(`wrote ${cases.length} cases, ${text.length} bytes; ${wordCases.length} word cases`); }
