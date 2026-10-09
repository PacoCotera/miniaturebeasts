// The field guide's model and rules (prototypes/ui/specs/station/library.json): the bindings to library.mjs, lookCarriers, the pad, the face spread's clarity lines and Visit, and the spec data the
// guide rests on. Model and rules only: the drawing (the view's nodes, the tint, the layout numbers) is left to the LVGL face at L2.1.
//   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, chapterLooks } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import * as L from "../src/library.mjs";
import { guideModel, guideInit, guideMove } from "../src/guide.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), fdir = path.resolve(here, "../../workbench/frames");
setFrames(readdirSync(fdir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(fdir, f), "utf8"))));
const specs = (f) => JSON.parse(readFileSync(path.resolve(here, "../../ui/specs/station", f), "utf8"));
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided" };
const world = (id = "S09", n = 2, seed = 11) => { const st = S.freshSt("w1", 3, 1); S.normalize(st); const r = S.seedAdults(st, id, seed, n, settings); return { st, ms: r.mibis, fr: frameOf(id), id }; };

test("the guide model is bound to fieldGuide: its columns are the chapters in frame order, its cells the traits with their possible and found looks, a shut chapter has no cells", () => {
  const w = world("S09"), fg = L.fieldGuide(w.st, "S09", settings), model = guideModel(w.st, "S09", settings);
  assert.deepEqual(model.cols.map((c) => c.id), fg.chapters.map((c) => c.id)); assert.equal(model.complete, fg.complete);
  for (const [i, c] of fg.chapters.entries()) { const col = model.cols[i]; assert.equal(col.sealed, c.sealed); if (c.sealed) { assert.deepEqual(col.traits, [], "a shut chapter shows no traits"); continue; } assert.deepEqual(col.traits.map((t) => t.id), c.traits.map((t) => t.id)); for (const [j, t] of c.traits.entries()) { assert.deepEqual(col.traits[j].looks, t.possible); assert.equal(col.traits[j].found.length, t.found.length); assert.equal(col.traits[j].more, t.more); assert.deepEqual(col.traits[j].found, col.traits[j].found.slice().sort((a, b) => t.possible.indexOf(a) - t.possible.indexOf(b)), "found looks in the frame's order"); } }
  assert.ok(model.cols.some((c) => c.sealed), "S09 has a sealed chapter"); assert.ok(model.cols.every((c) => c.name === fg.chapters.find((x) => x.id === c.id).name), "the chapter names as the frame writes them, never recased");
});

test("lookCarriers: the mibis of the species, not released, that read the trait's chapter and carry the look in either copy; pods are not listed; the same test as wishCarriers", () => {
  const w = world("S09", 3), [a, b, c] = w.ms, fr = w.fr, ch = fr.chapters.find((x) => !x.sealed), t = ch.traits[0];
  const looksOf = (m) => chapterLooks(fr, ch, m.genome).find(([id]) => id === t.id)[1]; const look = looksOf(a)[0];
  const have = (m) => L.lookCarriers(w.st, "S09", t.id, look).some((x) => x.id === m.id);
  assert.ok(have(a), "a carries its own look"); for (const m of [b, c]) assert.equal(have(m), looksOf(m).includes(look), "a mibi carries it when its read looks include it");
  a.read = a.read.filter((x) => x !== ch.id); assert.ok(!have(a), "a chapter it has not read says nothing"); a.read.push(ch.id);
  a.released = true; assert.ok(!have(a), "a released mibi is not listed"); a.released = false;
  w.st.tray.push({ id: "p1", species: "S09", genome: a.genome, read: [ch.id], idd: 1 }); assert.ok(L.lookCarriers(w.st, "S09", t.id, look).every((x) => w.st.mibis.some((m) => m.id === x.id)), "no pod in the list");
  assert.deepEqual(L.lookCarriers(w.st, "S09", t.id, "no such look"), []); assert.deepEqual(L.lookCarriers(w.st, "S09", "no-trait", look), []); assert.deepEqual(L.lookCarriers(w.st, "S02", t.id, look), [], "another species' mibis are not carriers");
  L.wishPin(Object.assign(w.st, { knownIds: [...new Set([...w.st.knownIds, "S09"])] }), "S09", t.id, look, settings); assert.deepEqual(L.wishCarriers(w.st, "S09").mibis.map((x) => x.id).sort(), L.lookCarriers(w.st, "S09", t.id, look).map((x) => x.id).sort(), "the pinned look's carriers are lookCarriers' own");
});

test("the pad: ▶ ◀ move across the columns that are not sealed, ▲ from the first row goes to the band's first plate, ◀ from the first column turns back to the face; ▼ from the band returns to the open cell", () => {
  const w = world("S09"), model = guideModel(w.st, "S09", settings), g0 = guideInit(model); assert.equal(g0.zone, "grid"); assert.equal(model.cols[g0.col].sealed, false);
  assert.equal(guideMove(model, w.st, g0, "left"), "turn", "◀ from the first column turns the page back");
  const sealed = model.cols.findIndex((c) => c.sealed); let g = g0, seen = [g.col]; for (let i = 0; i < 9; i++) { const n = guideMove(model, w.st, g, "right"); if (n === g) break; g = n; seen.push(g.col); }
  assert.ok(!seen.includes(sealed), "a sealed column is skipped"); assert.equal(seen.at(-1), model.cols.length - 1, "to the last column; ▶ there does nothing"); assert.equal(guideMove(model, w.st, g, "right"), g);
  const lastRow = (c) => model.cols[c].traits.length - 1; let d = { ...g0 }; for (let i = 0; i < 10; i++) d = guideMove(model, w.st, d, "down"); assert.equal(d.row, lastRow(d.col), "▼ stops at the column's last row");
  const up = guideMove(model, w.st, g0, "up"); assert.equal(up.zone, "plate"); assert.equal(up.plate, g0.look ?? 0); const back = guideMove(model, w.st, up, "down"); assert.deepEqual([back.zone, back.col, back.row], ["grid", g0.col, g0.row]);
  // a column with fewer rows: the row clamps to its last
  const short = model.cols.findIndex((c, i) => !c.sealed && c.traits.length < model.cols[g0.col].traits.length && i > g0.col); const tall = { ...g0, row: model.cols[g0.col].traits.length - 1, open: { col: g0.col, row: model.cols[g0.col].traits.length - 1 } };
  if (short > 0) { let k = tall; for (let i = 0; i < 8 && k.col < short; i++) k = guideMove(model, w.st, k, "right"); assert.ok(k.row <= lastRow(k.col), "the row is clamped to the column's last"); }
});

test("the face spread's clarity line: 'A typical Belatz, not one of yours.', the portrayed mibi's line, the released one's; ✓ Visit needs a living mibi as the face", () => {
  const w = world("S09", 1), m = w.ms[0]; assert.equal(L.faceLine(w.st, "S09"), "A typical Belatz, not one of yours."); assert.equal(L.visitFace(w.st, "S09"), null, "the type face: no ✓");
  m.portrait = { state: "delivered" }; w.st.face.S09 = m.id; assert.equal(L.faceLine(w.st, "S09"), `${m.name}, your Belatz, sat for this.`); assert.equal(L.visitFace(w.st, "S09").id, m.id, "a living face");
  m.released = true; assert.equal(L.faceLine(w.st, "S09"), `${m.name} sat for this, now in the wild.`); assert.equal(L.visitFace(w.st, "S09"), null, "a face in the wild: no ✓");
});

test("the spec data the guide rests on: the strings, the jumps, the ring on paper and the species' wireframes", () => {
  const pods = specs("pods.json"), frame = specs("frame.json"), lib = specs("library.json"); assert.equal(pods.strings.thisPod, "this pod"); assert.equal(pods.strings.theSpecies, "the species"); assert.equal(pods.strings.openGuide, "Open the guide"); assert.equal(pods.strings.legsTail.heading, "Legs & Tail");
  assert.ok(frame.navigation.jumps.some((j) => j.from === "pods.overview" && j.to === "book" && j.spread === "guide")); assert.ok(frame.navigation.jumps.some((j) => j.from === "habitat" && j.to === "book" && j.spread === "guide")); assert.equal(frame.navigation.screens.book.back, "Library");
  assert.equal(frame.focus.ring.onPaper, "rust"); assert.deepEqual([frame.focus.ring.width, frame.focus.ring.outside, frame.focus.ring.radius], [2, 4, 6]);
  assert.equal(lib.regions.faceSpread.visit, "derived.faceVisit"); assert.deepEqual(lib.regions.faceSpread.stamp.rect, [832, 112, 120, 120]); assert.deepEqual(lib.regions.detail.carried.names.capTops, [124, 144]);
});
