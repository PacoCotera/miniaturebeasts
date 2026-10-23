// Pods' chapter page on the face (P1 to P7), in Node on the WebAssembly build, on the props views/pods-props.mjs gives for real pods of the real frames:
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
import { pageFrame, pageOrigin, pageGrid } from "../../ui/specs/derive.mjs";

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
  return { st, p, fr, m: { st, settings, docked: true, crates: 0, present: {}, focus: `rail.${ci}`, ui: { view: "chapter", cur: p.id, ci, cmp: null } } };
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

test("a read cell is a well (GB1 D1): the well first at P − (4, 4), no flat ground rect at P in any state; the crop 1:1 at P inside it, or the well alone", { skip }, async () => {
  const sc = scene("S01", { ci: 1 }), cells = podsProps(sc.m, podsSpec, frameSpec).props.regions.page.cells, cell = cells[0];
  assert.match(cell.crop, /^trait-S01-/, "the cell asks for its crop"); assert.match(cell.well, /^plate-well-136x168/, "and for its well");
  const crops = cells.map((c) => c.crop), bare = await draw(sc, { without: crops }), full = await draw(sc);
  assert.deepEqual(at(bare.lg, "page.cell", "chrome"), [], "no flat tone where the crop is not placed"); assert.ok(bare.lg.type.some((t) => t.region === "page.cell" && t.text === cell.name), "the name line still shows");
  assert.deepEqual(at(full.lg, "page.cell", "chrome"), [], "no flat ground rect under a placed crop either: the well's floor is the tone");
  const wells = at(bare.lg, "page.cell", "painted"); assert.equal(wells.length, 1, "the wells' union"); assert.deepEqual(wells[0].rect.slice(0, 2), [384 - 4, 232 - 4], "the first well at P − (4, 4)");
  assert.deepEqual(wells[0].rect.slice(2), [136 + 8 + 144 * (cells.length - 1) - 8, 168], "136×168 wells on a 144 pitch");
  assert.deepEqual(at(full.lg, "page.cell", "painted")[0].rect, wells[0].rect, "the crops lie inside their wells");
});

test("the sealed find draws no flat tone behind it; with no find picture the heading shows and nothing is drawn at the find (P3)", { skip }, async () => {
  const sc = scene("S02", { ci: 3 }), fr = sc.fr, ch = fr.chapters[3]; assert.ok(ch.sealed, "S02's fourth chapter is the shut one (Character)");
  const props = podsProps(sc.m, podsSpec, frameSpec).props.regions.page; assert.equal(props.sealedFind, true); assert.match(props.sealedWell, /^plate-well-120x120/); assert.ok(!("frame" in props), "GB1: no frame in the props");
  const find = (await draw(sc, { extra: [] })).body.requests.find((r) => /^find-/.test(r.id) || /^find-/.test(r.master ?? "")); assert.ok(find, "the chapter asks for its find picture by its kind");
  const shown = await draw(sc, { extra: [find.id] }), none = await draw(sc, { without: [find.id] });
  assert.deepEqual(at(shown.lg, "page.seal").map((r) => r.layer === "chrome" ? r.rect : null).filter(Boolean).length <= 1, true);
  assert.deepEqual(at(shown.lg, "page.seal")[0].rect, [388, 252, 120, 120], "the find at (392, 256, 112, 112) in its well at (388, 252): the painted union");
  assert.deepEqual(at(shown.lg, "page.seal").length, 1, "the picture alone: no tone rectangle beside it"); assert.deepEqual(at(none.lg, "page.seal").map((r) => r.rect), [[388, 252, 120, 120]], "an unsigned find draws nothing: the well alone");
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

test("GB1 D1: for counts 1 to 8 the cells' P rects are the table (x 384 + 144 a column; y 232, or 144 and 344), no well ends past x 952 or y 535, and no well of a two-row page starts above 140", { skip }, () => {
  const ROWS = { 1: [232], 2: [144, 344] };
  for (let n = 1; n <= 8; n++) {
    const cols = n <= 4 ? n : n <= 6 ? 3 : 4, rows = n > 4 ? 2 : 1, [ox, oy] = pageOrigin(PG, cols, rows), cells = pageGrid({ ...PG, rect: [ox, oy, PG.rect[2], PG.rect[3]] }, n).cells;
    assert.equal(cells.length, n);
    cells.forEach(([x, y, w, h], i) => { const want = [384 + 144 * (i % cols), ROWS[rows][Math.floor(i / cols)]]; assert.deepEqual([x, y], want, `${n} traits, cell ${i}`); assert.ok(x - 4 >= 0 && x + 128 + 4 <= 952 && y + 160 + 4 <= 535 && (rows === 1 || y - 4 >= 140), `${n} traits, cell ${i}: its well lies on the floor`); });
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

test("the heading word's cap top is the middle of its 24 px box, on a one-row and a two-row page (v_cap_in(box top, 24, 20))", { skip }, async () => {
  const LABEL_ABOVE_CAP = 7, CAP20 = 14, seen = new Set();   // a 20 px word's label box starts 7 px above its cap top; its cap is 14 px
  for (const sp of SPECIES) for (let ci = 0; ci < frameOf(sp).chapters.length; ci++) {
    const sc = scene(sp, { ci }), rows = podsProps(sc.m, podsSpec, frameSpec).props.regions.page.cells.length > 4 ? 2 : 1;
    const { lg } = await draw(sc), emblem = at(lg, "page", "art")[0]?.rect, word = at(lg, "page", "type")[0]?.rect; if (!emblem || !word) continue;
    assert.equal(word[1] + LABEL_ABOVE_CAP, emblem[1] + Math.floor((24 - CAP20) / 2), `${sp} chapter ${ci}, ${rows} row(s): the cap top is box top + 5 (box top ${emblem[1]})`); seen.add(rows);
  }
  assert.deepEqual([...seen].sort(), [1, 2], "the frames have both a one-row and a two-row chapter page");
});
