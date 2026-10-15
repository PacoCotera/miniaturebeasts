// Pods' chapter page on the face (station-fix5-pods-spec.md, P1 to P7), in Node on the WebAssembly build, on the props views/pods-props.mjs gives for real pods of the real frames:
//   P2 a read cell draws its tone only under a placed crop; P3 no flat tone behind the sealed find; P4 the origin comes from the pod's frame and the heading never moves as the rail steps;
//   P7 a read doing asks for its one plate (no look suffix) and draws its value under the name, an unread doing draws no line; P1 no page cell ends right of x 952 for any frame of S01 to S16.
// Skipped when the face has not been built (build.sh).
//   node --test prototypes/face/tests/pods-page.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { withPolicy } from "./node-scene.mjs";
import { bootFace } from "../../station/src/face-lvgl.mjs";
import { setFrames, frameOf, podGenome } from "../../station/src/genome.mjs";
import * as S from "../../station/src/state.mjs";
import { podsProps } from "../../station/src/views/pods-props.mjs";
import { pageFrame, pageOrigin } from "../../ui/specs/derive.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist"), built = existsSync(path.join(dist, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
const specs = path.resolve(here, "../../ui/specs/station"), J = (n) => JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8")), frameSpec = J("frame"), podsSpec = J("pods");
const palette = JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours, placed = JSON.parse(readFileSync(path.resolve(here, "../../ui/assets/masters/index.json"), "utf8")).masters;
const framesDir = path.resolve(here, "../../workbench/frames");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const SPECIES = readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => f.slice(8, 11));
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided" }, FLOOR_RIGHT = 952, PG = podsSpec.regions.chapter.page;

// ---- scenes: a pod of a species, identified, the first `read` chapters read (all when null), the chapter page open on chapter `ci` ----
function scene(species, { read = null, ci = 0, gs = 3 } = {}) {
  const st = S.freshSt("w1", 3, 1000); S.normalize(st); st.e = st.d = st.s = 99;
  S.seedPodFromGenome(st, podGenome(frameOf(species), gs), settings, 1000); const p = st.tray[0]; S.skipIdentify(st, p);
  const fr = frameOf(species); fr.chapters.slice(0, read ?? fr.chapters.length).forEach((c) => S.read(st, p, c.id, settings));
  return { st, p, fr, m: { st, settings, docked: true, crates: 0, present: {}, focus: `rail.${ci}`, ui: { view: "chapter", cur: p.id, ci, cmp: null, wildArm: 0 } } };
}
// stand-in pictures: a flat block at the size the request names; a slot is a picture only when the master is placed at exactly its size (the host's rule), else an empty slot that draws nothing
const standIn = (w, h) => { const d = new Uint8ClampedArray(w * h * 4); for (let i = 0; i < d.length; i += 4) { d[i] = 90; d[i + 1] = 100; d[i + 2] = 110; d[i + 3] = 255; } return { w, h, data: d }; };
const sizeOf = (r) => (typeof r.size === "number" ? [r.size, r.size] : r.size) ?? (r.kind === "star" ? [12, 12] : r.kind === "emblem" ? [24, 24] : [16, 16]);
const isPlaced = (r) => r.kind !== "slot" || (placed[r.master] && placed[r.master].w === r.size[0] && placed[r.master].h === r.size[1]);
const frameProps = (line) => ({ top: { screen: "pods", title: "Pods", turn: 4, turnFlash: false, materials: { e: 9, d: 9, s: 9 }, flash: {}, companion: { docked: true, withMibi: null } }, line: { back: null, need: "", ...line }, plate: { text: "", timed: false } });
async function draw(sc, { extra = [], without = [] } = {}) {
  const body = podsProps(sc.m, podsSpec, frameSpec), f = await bootFace(pathToFileURL(dist + "/"), { test: true });
  f.send({ t: "palette", name: "station", colours: palette }); for (const [n, j] of [["frame", frameSpec], ["pods", podsSpec]]) assert.equal(f.send({ t: "spec", screen: n, json: j }), 0);
  for (const r of body.requests) if (isPlaced(r) && !without.includes(r.id)) f.handleOf(r.id, withPolicy(() => standIn(...sizeOf(r))));
  for (const id of extra) { const [w, h] = id.match(/(\d+)x(\d+)$/).slice(1).map(Number); f.handleOf(id, withPolicy(() => standIn(w, h))); }
  assert.equal(f.props({ screen: "pods", ...body.props, motion: false, frame: frameProps(body.line) }), 0, f.errors().join("; ")); f.t = 0; for (let i = 0; i < 3; i++) f.frame((f.t += 16));
  let lg = null; for (let m; (m = f.poll("log"));) lg = m;
  assert.deepEqual(f.errors(), []); return { f, lg, body };
}
const pageRegions = (lg) => lg.regions.filter((r) => /^page/.test(r.id)), at = (lg, id, layer) => lg.regions.filter((r) => r.id === id && (!layer || r.layer === layer));
const frameOfPod = (fr) => pageFrame(fr.chapters.map((c) => (c.sealed ? 1 : Math.min(c.traits.length, 8))));
const chapterIndex = (fr, id) => fr.chapters.findIndex((c) => c.id === id);

test("a read cell with no placed crop draws no node at its picture rectangle (P2); with the crop placed it draws its tone and the picture", { skip }, async () => {
  const sc = scene("S01", { ci: 1 }), cell = podsProps(sc.m, podsSpec, frameSpec).props.regions.page.cells[0];
  assert.match(cell.crop, /^trait-S01-/, "the cell asks for its crop");
  const crops = podsProps(sc.m, podsSpec, frameSpec).props.regions.page.cells.map((c) => c.crop), bare = await draw(sc, { without: crops }), full = await draw(sc);
  assert.deepEqual(at(bare.lg, "page.cell", "chrome"), [], "no flat tone where the crop is not placed"); assert.ok(bare.lg.type.some((t) => t.region === "page.cell" && t.text === cell.name), "the name line still shows"); assert.deepEqual(at(bare.lg, "page.cell", "painted"), [], "no picture either");
  const tone = at(full.lg, "page.cell", "chrome"); assert.equal(tone.length, 1, "the tone under the placed crops (the region's union)"); assert.deepEqual(tone[0].rect.slice(2), [128 + 144, 160], "both cells' tones: 128×160 each, 16 apart");
  const one = await draw(sc, { without: [crops[1]] }); assert.deepEqual(at(one.lg, "page.cell", "chrome")[0].rect.slice(2), [128, 160], "only the placed crop has its tone");
});

test("the sealed find draws no flat tone behind it; with no find picture the heading shows and nothing is drawn at the find (P3)", { skip }, async () => {
  const sc = scene("S02", { ci: 3 }), fr = sc.fr, ch = fr.chapters[3]; assert.ok(ch.sealed, "S02's fourth chapter is the shut one (Character)");
  const props = podsProps(sc.m, podsSpec, frameSpec).props.regions.page; assert.equal(props.sealedFind, true); assert.deepEqual(props.frame, { cols: 3, rows: 2 });
  const find = (await draw(sc, { extra: [] })).body.requests.find((r) => /^find-/.test(r.id) || /^find-/.test(r.master ?? "")); assert.ok(find, "the chapter asks for its find picture by its kind");
  const shown = await draw(sc, { extra: [find.id] }), none = await draw(sc, { without: [find.id] });
  assert.deepEqual(at(shown.lg, "page.seal").map((r) => r.layer === "chrome" ? r.rect : null).filter(Boolean).length <= 1, true);
  assert.deepEqual(at(shown.lg, "page.seal")[0].rect, [432 + 32, 88 + 84, 112, 112], "the find at the origin + (32, 84): (464, 172) on S02's frame of 3 columns × 2 rows");
  assert.deepEqual(at(shown.lg, "page.seal").length, 1, "the picture alone: no tone rectangle beside it"); assert.deepEqual(at(none.lg, "page.seal"), [], "an unsigned find draws nothing");
  assert.ok(none.lg.type.some((t) => t.region === "page" && t.text === ch.name), "the heading still shows");
});

test("a read doing cell asks for its one plate with no look suffix and draws its value under the name; an unread doing draws no line (P7)", { skip }, async () => {
  const sc = scene("S01"), fr = sc.fr, ci = fr.chapters.findIndex((c) => c.traits.some((t) => t.name === "Drive")); assert.ok(ci >= 0, "S01 has a Movement chapter with Drive");
  sc.m.ui.ci = ci; sc.m.focus = `rail.${ci}`;
  const body = podsProps(sc.m, podsSpec, frameSpec), cell = body.props.regions.page.cells.find((c) => c.name === "Drive"); assert.equal(cell.doing, true); assert.equal(cell.crop, "trait-S01-drive-128x160:128x160");
  assert.ok(body.requests.some((r) => r.kind === "slot" && r.master === "trait-S01-drive-128x160"), "it asks for trait-S01-drive-128x160");
  assert.ok(cell.lines.length === 1 && cell.lines[0], "the value in words is its line");
  const { lg } = await draw(sc), lines = lg.type.filter((t) => t.region === "page.cell" && t.text !== cell.name);
  assert.ok(lines.length >= 1 && lines.length <= 2, "the doing line is drawn, in at most two lines"); assert.equal(lines.map((t) => t.text).join(" ").replace(/ ·( |$)/g, " ").trim(), cell.lines[0].replace(/ · /g, " ").trim(), "the look's words"); for (const t of lines) assert.equal(t.px, 16);
  const box = at(lg, "page.cell", "type")[0].rect; assert.ok(box[2] <= 140, "name and line within the name line's reach (140)"); assert.ok(box[1] + box[3] >= 416 + 14 && box[1] + box[3] <= 456, "the line sits in the two line boxes under the name line (y 416 to 456 on a one-row frame)");
  const un = scene("S01", { read: 0 }); un.m.ui.ci = ci; un.m.focus = `rail.${ci}`; const ub = podsProps(un.m, podsSpec, frameSpec).props.regions.page.cells.find((c) => c.name === "Drive");
  assert.ok(!ub.lines.length && !ub.doing && ub.frost, "an unread doing carries no value"); const quiet = await draw(un);
  assert.deepEqual(quiet.lg.type.filter((t) => t.region === "page.cell").map((t) => t.text), ["Drive"], "an unread doing draws its name and nothing else");
});

test("the heading and the first cell never move as the rail steps through a pod's chapters; the origin is the frame's (P4)", { skip }, async () => {
  for (const id of ["S01", "S02", "S03"]) {
    const fr = frameOf(id), frame = frameOfPod(fr), [ox, oy] = pageOrigin(PG, frame.cols, frame.rows), heads = [], firsts = [];
    for (let ci = 0; ci < fr.chapters.length; ci++) {
      const { lg } = await draw(scene(id, { ci })), emblem = at(lg, "page", "art")[0];
      if (fr.chapters[ci].sealed) continue; heads.push(emblem.rect.slice(0, 2)); firsts.push(at(lg, "page.rule", "chrome")[0].rect.slice(0, 2));
    }
    assert.ok(heads.every((h) => h.join() === heads[0].join()), `${id}: the heading stays put (${heads.join(" | ")})`); assert.ok(firsts.every((h) => h.join() === firsts[0].join()), `${id}: the rule and the first column stay put`);
    assert.deepEqual(firsts[0], [ox + 24, oy + 36], `${id}: the rule from the first column, at the frame's origin + (24, 36)`); assert.deepEqual(heads[0], [ox + 24, oy + 6], `${id}: the heading's emblem at the frame's origin + (24, 6)`);
  }
});

test("no page cell ends right of x 952 for any frame of S01 to S16, and every region of the page lies on the floor (P1)", { skip }, async () => {
  assert.equal(SPECIES.length, 16);
  for (const id of SPECIES) {
    const fr = frameOf(id); for (let ci = 0; ci < fr.chapters.length; ci++) {
      const { lg } = await draw(scene(id, { ci }));
      for (const r of pageRegions(lg)) { assert.ok(r.rect[0] + r.rect[2] <= FLOOR_RIGHT + 1, `${id} chapter ${ci}: ${r.id} ${r.rect} ends right of x 952`); assert.ok(r.rect[0] >= 64 && r.rect[1] >= 88 && r.rect[1] + r.rect[3] <= 536, `${id} chapter ${ci}: ${r.id} ${r.rect} is off the floor`); }
          }
    void chapterIndex;
  }
});
