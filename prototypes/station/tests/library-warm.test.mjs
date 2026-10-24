// The Library's pictures made off the open path (pictures.mjs: wantLibrary, warmLibraryNext, libraryMade, droppedPictures), in Node: the props never name a picture that is not made (the Library 3 gate's P1), so the host
// makes them one at a time, the player's lit chapter first (its variant, then its page), then a sheet, then Level 1's cells; a newer lit variant, page or sheet supersedes a waiting one of its kind; a picture a newer one
// superseded leaves the face (P4: droppedPictures); the one-time paper is made on its own (P5), its time printed; a face whose mibi grew is a new picture under the same id, the old one dropped (F4: no stale face); the quiet
// stand-in is made at once (ground, surfaces, type and mosaic, no form). Every time is printed.
//   node --test prototypes/station/tests/library-warm.test.mjs
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { setFrames, frameOf, podGenome } = await import("../src/genome.mjs");
const { SPECS } = await import("../src/game.mjs");
const P = await import("../src/pictures.mjs");
const L = await import("../src/library-sheet.mjs");
const { sheet: sheetReqs, quiet: quietReq, req: collector } = await import("../src/views/requests.mjs");
const { drawnLooks } = await import("../src/looks.mjs");
const { asset } = await import("../../ui/assets.mjs");
const { loadStandLayersFs, loadStandLooksFs, loadStandSizesFs, unloadStands } = await import("../tools/stand-layers-fs.mjs");

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const lib = JSON.parse(readFileSync(path.resolve(here, "../../ui/specs/station/library.json"), "utf8")); SPECS.library = lib;
const mid = JSON.parse(readFileSync(path.join(here, "fixtures/specimen/states/mid.json"), "utf8")).S01;
const env = { frameOf }, said = [], say = (s) => said.push(s);
const input = (found) => ({ species: "S01", mode: "found", found, shut: [], fresh: [], readOnce: [], sealedOpen: false });
const reqs = (inp, lit = null) => { const out = []; sheetReqs(collector(out))(lib, inp, L.speciesFacts(frameOf("S01")), lit); return out; };
before(() => { loadStandLooksFs(); loadStandLayersFs(); loadStandSizesFs(); });
after(() => unloadStands());

test("P5: the one-time paper is made on its own, its time printed; a second ask makes nothing", () => {
  const ms = P.warmLibraryPaper(); console.log(`# library paper: made in ${ms.toFixed(0)} ms (once a process; about 3-4 times that on a Pi 4)`);
  assert.ok(ms > 0); assert.equal(P.warmLibraryPaper(), 0, "made once");
});

test("P1, P2: what is asked is made one at a time, the lit chapter's variant first, then its page, then the sheet, then the cells; made, it is named; a newer lit request supersedes a waiting one", () => {
  P.clearLibraryCells(); L.clearSheets();
  const A = input(mid), [sheet, lit, page] = reqs(A, "coat"), cell = { kind: "librarycell", id: "library-cell-S01-0000feed", species: "S01", status: "found", found: mid, shut: [], size: [140, 114], ground: "libPanel" };
  for (const r of [cell, sheet, lit, page]) assert.equal(P.libraryMade(r.id), false);
  P.wantLibrary([cell, sheet]); P.wantLibrary([lit, page]); P.wantLibrary([sheet]);   // asked again: waits once
  assert.deepEqual(P.libraryWaiting(), [cell.id, sheet.id, lit.id, page.id]);
  const [, lit2, page2] = reqs(A, "face"); P.wantLibrary([lit2, page2]); assert.deepEqual(P.libraryWaiting(), [cell.id, sheet.id, lit2.id, page2.id], "the newer lit chapter supersedes the waiting one");
  const order = []; for (let w; (w = P.warmLibraryNext(env, say));) { order.push(w.kind); console.log(`# library swap-in ${w.kind} ${w.id}: made in ${w.ms.toFixed(0)} ms, ${w.waited.toFixed(0)} ms after it was asked`); assert.ok(w.ms >= 0 && w.waited >= w.ms); }
  assert.deepEqual(order, ["librarylit", "librarypage", "librarysheet", "librarycell"]);
  for (const r of [cell, sheet, lit2, page2]) assert.ok(P.libraryMade(r.id), r.id + " is made");
  assert.equal(P.lastSheet("S01"), sheet.id, "the species' last made sheet"); assert.equal(P.lastSheet("S02"), null);
  assert.equal(P.warmLibraryNext(env, say), null, "nothing waits");
});

test("P4: a sheet, lit variant or page a newer one of its kind superseded is dropped from the face", () => {
  const A = input(mid), B = input({ ...mid, colour: [...mid.colour, "ash"] }), [a] = reqs(A), [b] = reqs(B);
  P.droppedPictures(); P.registerPictures([a], env); P.registerPictures([b], env);
  assert.deepEqual(P.droppedPictures(), [a.id], "the older sheet goes"); assert.deepEqual(P.droppedPictures(), [], "taken once");
});

test("the quiet stand-in is made at once: the ground, the surfaces, the type and the mosaic, no form; its time printed against the 150 ms target", () => {
  const out = []; quietReq(collector(out))(lib, input(mid), L.speciesFacts(frameOf("S01"))); const q = out[0], t0 = performance.now(), pic = L.sheetPicture(frameOf("S01"), q, { print: say }), ms = performance.now() - t0;
  console.log(`# library quiet stand-in ${q.id}: made in ${ms.toFixed(0)} ms (target 150 ms here)`);
  assert.deepEqual([pic.w, pic.h], lib.l2.sheet.rect.slice(2)); assert.ok(ms < 1000, ms + " ms"); assert.ok(P.libraryMade(q.id));
  const full = L.renderSheet(frameOf("S01"), input(mid)); let differ = 0; for (let i = 0; i < pic.rgba.length; i += 4) if (pic.rgba[i] !== full.rgba[i]) differ++;
  assert.ok(differ > 1000, "no form: it differs from the sheet where the form is"); assert.deepEqual(pic.facts.plates, full.facts.plates, "the same facts");
});

test("F4: a face whose mibi has grown is drawn again under the same id and the old picture leaves the face; a portrayed mibi's face keeps its portrait's stage (the request's)", () => {
  const fr = frameOf("S01"), m = { id: 41, genome: podGenome(fr, 5), read: fr.chapters.map((c) => c.id) }, looks = drawnLooks(fr, m);
  const face = (stage) => ({ kind: "face", id: "face:41:64", mibi: 41, species: "S01", stage, looks, size: [64, 64], faded: false });
  P.droppedPictures(); P.registerPictures([face("juvenile")], env); const young = Buffer.from(asset("face:41:64").rgba());
  P.registerPictures([face("juvenile")], env); assert.deepEqual(P.droppedPictures(), [], "the same stage: the same picture");
  P.registerPictures([face("adult")], env); assert.deepEqual(P.droppedPictures(), ["face:41:64"], "grown: the old face leaves the face");
  const grown = Buffer.from(asset("face:41:64").rgba()); assert.ok(!young.equals(grown), "the grown face is the adult's picture, not the cached juvenile's");
});
