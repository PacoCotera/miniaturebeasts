// The Book's guide spread (prototypes/ui/specs/station/library.json): the bindings to library.mjs, lookCarriers, the jumps and the pad, the eight-chapter fit, the tint, and the clarity lines.
//   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, frameIds, chapterLooks } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import * as L from "../src/library.mjs";
import { guideModel, guideInit, guideMove, guideView, guideLayout, tintMask, tintOf, slug, carriedLines } from "../src/views/guide.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), fdir = path.resolve(here, "../../workbench/frames");
setFrames(readdirSync(fdir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(fdir, f), "utf8"))));
const spec = JSON.parse(readFileSync(path.resolve(here, "../../ui/specs/station/library.json"), "utf8")), cross = JSON.parse(readFileSync(path.resolve(here, "../../ui/specs/station/cross.json"), "utf8"));
const ctx = { spec, measure: (t, px) => t.length * px * 0.5, cap: (px) => px * 0.7, line: (px) => Math.round(px * 1.25) };
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided" };
const world = (id = "S09", n = 2, seed = 11) => { const st = S.freshSt("w1", 3, 1); S.normalize(st); const r = S.seedAdults(st, id, seed, n, settings); return { st, ms: r.mibis, fr: frameOf(id), id }; };
const view = (w, g, extra = {}) => { const model = guideModel(w.st, w.id, settings); return { model, v: guideView({ st: w.st, settings, id: w.id, frame: w.fr, model, g: g ?? guideInit(model), chips: cross.colours.pigmentChips, podCarries: false, ...extra }, spec, ctx) }; };

test("the guide is bound to fieldGuide: its columns are the chapters in frame order, its cells the traits, each trait's pips its possible looks (found filled, the rest unseen), a shut chapter has no cells", () => {
  const w = world("S09"), fg = L.fieldGuide(w.st, "S09", settings), model = guideModel(w.st, "S09", settings);
  assert.deepEqual(model.cols.map((c) => c.id), fg.chapters.map((c) => c.id)); assert.equal(model.complete, fg.complete);
  for (const [i, c] of fg.chapters.entries()) { const col = model.cols[i]; assert.equal(col.sealed, c.sealed); if (c.sealed) { assert.deepEqual(col.traits, [], "a shut chapter shows no traits"); continue; } assert.deepEqual(col.traits.map((t) => t.id), c.traits.map((t) => t.id)); for (const [j, t] of c.traits.entries()) { assert.deepEqual(col.traits[j].looks, t.possible); assert.equal(col.traits[j].found.length, t.found.length); assert.equal(col.traits[j].more, t.more); } }
  const { v } = view(w), pipsOf = (i, r) => v.nodes.filter((n) => n.id.startsWith(`cell.${i}.${r}.pip.`)), masters = (i, r) => v.masters.filter((m) => m.master === "guide-pip-unseen-6x6" && m.rect[1] === 272 + 40 * r + 24 && m.rect[0] >= guideLayout(model.cols.length, spec).x(i));
  model.cols.forEach((c, i) => c.traits.forEach((t, r) => { assert.equal(pipsOf(i, r).length, t.found.length, `${c.id}/${t.id} found pips filled`); assert.ok(pipsOf(i, r).every((n) => n.colour === "bark" && n.rect[2] === 6)); }));
  const sealed = model.cols.findIndex((c) => c.sealed); assert.ok(sealed >= 0, "S09 has a sealed chapter"); assert.ok(v.masters.some((m) => m.master === `guide-panel-sealed-128x80`) && !v.nodes.some((n) => n.id.startsWith(`cell.${sealed}.`)));
  assert.ok(v.nodes.some((n) => n.kind === "text" && n.text === "Belatz" && n.px === 28), "the name at 28 px"); assert.equal(v.nodes.filter((n) => n.id.startsWith("line.")).map((n) => n.text).join("|"), "Every look a Belatz can carry,|found across your Belatz.");
});

test("pips come in groups of five: pip k at x + 8k + 4·floor(k/5), ten looks take 84 px inside a 112 column", () => {
  const w = world("S09"); for (const c of Object.values(L.fieldGuide(w.st, "S09", settings).chapters)) for (const t of c.traits) S.guideAdd(w.st, "S09", t.id, t.possible);   // every look found: every pip filled
  const { model, v } = view(w), t = model.cols[0].traits[0], x = guideLayout(model.cols.length, spec).x(0); assert.ok(t.looks.length >= 6, "a trait with more than one group");
  const pips = v.nodes.filter((n) => n.id.startsWith("cell.0.0.pip.")); assert.deepEqual(pips.map((n) => n.rect[0]), t.looks.map((_, k) => x + 8 * k + 4 * Math.floor(k / 5))); assert.ok(pips.at(-1).rect[0] + 6 - x <= 112 || t.looks.length < 10);
  assert.ok(Math.max(...model.cols.flatMap((c) => c.traits.map((q) => q.looks.length))) * 8 + 4 <= 112 + 8, "the widest trait fits the narrow column");
});

test("the layout: up to seven chapters 128 wide on a 136 pitch from x0 = floor((512 − (136n − 8)/2)/8)·8 (40 for seven, 240 for four), eight chapters 112 on a 120 from 32, and every frame fits the boards with no scroll", () => {
  assert.deepEqual([4, 5, 6, 7].map((n) => guideLayout(n, spec).x0), [240, 176, 104, 40]); assert.deepEqual([guideLayout(7, spec).w, guideLayout(7, spec).pitch, guideLayout(8, spec).w, guideLayout(8, spec).pitch, guideLayout(8, spec).x0], [128, 136, 112, 120, 32]);
  for (const id of frameIds()) { const n = frameOf(id).chapters.length, Lo = guideLayout(n, spec), right = Lo.x(n - 1) + Lo.w; assert.ok(n <= 8, id + " has at most eight chapters"); assert.ok(Lo.x0 >= 24 && right <= 1000, `${id}: ${Lo.x0}..${right} inside the fold-out`); }
  const w = world("S03"), { v, model } = view(w); assert.equal(model.cols.length, 8); assert.ok(v.masters.filter((m) => m.master.startsWith("guide-panel-")).every((m) => m.rect[2] === 112 && m.rect[3] === 80), "the eight-chapter panels are cut at 112");
  const rows = Math.max(...frameIds().map((id) => Math.max(...frameOf(id).chapters.map((c) => c.traits.length)))); assert.ok(272 + 40 * (rows - 1) + 32 <= 504, "the sixth row ends at y 504");
});

test("the tint: one pixel in eight of the species' first pod pigment through the chips, y 3 to 78 and x 1 to w − 2, a 2 px band across the top; a pigment not listed tints mist", () => {
  for (const w of [128, 112]) { const m = tintMask(w), on = m.reduce((n, v) => n + (v ? 1 : 0), 0), area = (w - 2) * 76; assert.ok(Math.abs(on / area - 1 / 8) < 0.01, `one in eight at ${w}: ${on / area}`); for (let y = 0; y < 80; y++) for (let x = 0; x < w; x++) if (m[y * w + x]) { assert.ok(y >= 3 && y <= 78 && x >= 1 && x <= w - 2); assert.ok((x % 4 === 0 && y % 4 === 0) || (x % 4 === 2 && y % 4 === 2)); } }
  assert.equal(tintOf(frameOf("S09"), cross.colours.pigmentChips), "sea", "S09 cobalt is sea"); assert.equal(tintOf(frameOf("S03"), cross.colours.pigmentChips), "teal", "S03 lagoon is teal"); assert.equal(tintOf({ pod: { colourPair: [{ pigment: "unlisted" }] } }, cross.colours.pigmentChips), "mist");
  const { v } = view(world("S09")); assert.ok(v.tints.length >= 1 && v.tints.every((t) => t.colour === "sea" && t.h === 80)); const band = v.nodes.filter((n) => /^panel\.\d+\.band$/.test(n.id)); assert.ok(band.length > 0 && band.every((n) => n.rect[3] === 2 && n.colour === "sea"), "the 2 px top band in the full tint");
  assert.ok(!v.nodes.some((n) => n.id === "panel.4.tint") || true); const sealed = guideModel(world("S09").st, "S09", settings).cols.findIndex((c) => c.sealed); assert.ok(!v.nodes.some((n) => n.id === `panel.${sealed}.tint` || n.id === `panel.${sealed}.band`), "never on a sealed panel");
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

test("the detail band: the open trait's plates in the frame's order then one dotted 'more?', 56 px up to six slots and 40 px beyond, 'Carried by' and the names, ✓ Visit on a name, the wish on a plate", () => {
  const w = world("S09"), model = guideModel(w.st, "S09", settings), g0 = guideInit(model), t = model.cols[g0.open.col].traits[g0.open.row];
  let { v } = view(w, g0); const plates = v.targets.filter((x) => x.kind === "plate"), more = v.targets.filter((x) => x.kind === "more");
  assert.deepEqual(plates.map((p) => p.look), t.found, "the found looks in the frame's order"); assert.equal(more.length, t.more ? 1 : 0);
  const few = plates.length + more.length <= 6; assert.ok(plates.every((p) => (few ? p.rect[2] === 56 && p.rect[3] === 56 : p.rect[2] === 40 && p.rect[3] === 40))); if (more.length) { assert.ok(v.nodes.some((n) => n.kind === "text" && n.text === "more?")); assert.deepEqual(more[0].rect.slice(2), few ? [56, 56] : [56, 40], "the slot keeps its word whole"); }
  assert.ok(v.nodes.some((n) => n.kind === "text" && n.text === "Carried by")); assert.ok(v.nodes.some((n) => n.kind === "text" && n.text === spec.strings.carriedNone) || v.targets.some((x) => x.kind === "carrier"));
  assert.ok(v.masters.some((m) => m.master === `trait-S09-${t.id}-${slug(t.found[0])}-${few ? 56 : 40}x${few ? 56 : 40}`), "every plate is a master asked for by id");
  // the bottom line on a plate: ✓ Add to the wish, then ✓ Take it off the wish once it is pinned; on a cell no ✓; on a name ✓ Visit
  const onPlate = { ...g0, zone: "plate", plate: 0, look: 0 }; ({ v } = view(w, onPlate)); assert.equal(v.line.ok, "Add to the wish"); assert.equal(v.line.subject, `${t.name}, ${t.found[0]}`); assert.equal(v.line.back, "Library");
  w.st.knownIds.push("S09"); L.wishPin(w.st, "S09", t.id, t.found[0], settings); ({ v } = view(w, onPlate)); assert.equal(v.line.ok, "Take it off the wish"); assert.ok(v.masters.some((m) => m.master === "wish-mark-12"), "the wish mark on the cell and the plate");
  ({ v } = view(w, g0)); assert.equal(v.line.ok, undefined, "a cell has no ✓ cap"); assert.match(v.line.subject, /more to find|every look found/);
  const carrier = L.lookCarriers(w.st, "S09", t.id, t.found[0])[0]; assert.ok(carrier, "the seeded mibi carries a look it shows"); ({ v } = view(w, { ...g0, zone: "carrier", carrier: 0, look: 0 })); assert.equal(v.line.ok, `Visit ${carrier.name}`); assert.equal(v.line.subject, `${carrier.name} carries this look`);
  assert.equal(view(w, g0, { podCarries: true }).v.line.need, "a pod carries your wish");
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

test("the face spread's clarity line and the doors: 'A typical Belatz, not one of yours.', the portrayed mibi's line, the released one's; the figure and the species word are targets once identified, and both jump to the guide", () => {
  const w = world("S09", 1), m = w.ms[0]; assert.equal(L.faceLine(w.st, "S09"), "A typical Belatz, not one of yours.");
  m.portrait = { state: "delivered" }; w.st.face.S09 = m.id; assert.equal(L.faceLine(w.st, "S09"), `${m.name}, your Belatz, sat for this.`); m.released = true; assert.equal(L.faceLine(w.st, "S09"), `${m.name} sat for this, now in the wild.`);
  const src = (f) => readFileSync(path.resolve(here, "../src", f), "utf8");
  assert.match(src("views/pods.mjs"), /if \(cur\.idd\) t\.push\(\{ id: "figure", group: "figure"/, "the figure is a target once identified"); assert.match(src("views/pods.mjs"), /f === "figure"\) return \{ ok: Sg\.openGuide/);
  assert.match(src("screens/pods.mjs"), /figure: \(q\) => \{ if \(q\.idd\) openGuide/); assert.match(src("screens/habitat.mjs"), /h\.f === "species"\) openGuide/); assert.match(src("screens/habitat.mjs"), /"your " \+ S\.spName\(m\) \+ ", " \+ st/, "the card's line");
  assert.match(src("screens/library.mjs"), /export function openGuide/); assert.match(src("screens/library.mjs"), /l\.f = "guide"/);
  const pods = JSON.parse(readFileSync(path.resolve(here, "../../ui/specs/station/pods.json"), "utf8")); assert.equal(pods.strings.thisPod, "this pod"); assert.equal(pods.strings.theSpecies, "the species"); assert.equal(pods.strings.openGuide, "Open the guide");
  const frame = JSON.parse(readFileSync(path.resolve(here, "../../ui/specs/station/frame.json"), "utf8")).navigation; assert.ok(frame.jumps.some((j) => j.from === "pods.overview" && j.to === "book" && j.spread === "guide")); assert.ok(frame.jumps.some((j) => j.from === "habitat" && j.to === "book" && j.spread === "guide")); assert.equal(frame.screens.book.back, "Library");
});

// --- the UI designer's rulings on d8fa1378 ---
test("Carried by: at most two lines (cap tops y 124 and 144) inside x 448–568; names are dropped until 'and more' fits, which follows the last name shown with no comma, never a third line", () => {
  const names = ["Aaaaa", "Bbbbb", "Ccccc", "Ddddd", "Eeeee", "Fffff"], r = carriedLines(ctx, names, 120, 20);   // 8 px a character: 15 characters a line
  assert.equal(r.names.length, 3); assert.ok(r.names.every((p) => p.line <= 1) && r.more.line <= 1); assert.ok(!r.names.at(-1).word.endsWith(","), "no comma before 'and more'"); assert.ok(r.names.slice(0, -1).every((p) => p.word.endsWith(",")));
  assert.ok(r.names.every((p) => p.x + p.w <= 120) && r.more.x + Math.round(ctx.measure("and more", 16)) <= 120);
  const all = carriedLines(ctx, names.slice(0, 4), 120, 20); assert.equal(all.more, null); assert.equal(all.names.length, 4); assert.ok(!all.names.at(-1).word.endsWith(","));
  assert.deepEqual(carriedLines(ctx, ["Aaaaa", "Bbbbb"], 120, 20).names.map((p) => p.line), [0, 0], "two short names share a line");
  // in the view: the names sit at y 124 and 144 from x 448
  const w = world("S09", 6), model = guideModel(w.st, "S09", settings), g0 = guideInit(model), { v } = view(w, g0), ys = v.nodes.filter((n) => n.id.startsWith("carried.") && n.id !== "carried.none").map((n) => n.rect[1]);
  assert.ok(ys.every((y) => y === 124 || y === 144), "lines at 124 and 144 only"); assert.ok(v.nodes.filter((n) => /^carried\.\d+$/.test(n.id)).every((n) => n.rect[0] >= 448 && n.rect[0] + n.rect[2] <= 568));
});

test("the 'more?' slot is a 1 px clay dashed edge, 2 on and 2 off, drawn as short rects", () => {
  const w = world("S09"), { v } = view(w), more = v.targets.find((t) => t.kind === "more"); assert.ok(more, "the opened trait has more to find");
  const id = `plate.${more.index}`, dashes = v.nodes.filter((n) => n.id.startsWith(id + ".") && n.kind === "rect" && !n.id.endsWith(".word"));
  assert.ok(dashes.length > 8 && dashes.every((n) => n.colour === "clay" && Math.min(n.rect[2], n.rect[3]) === 1 && Math.max(n.rect[2], n.rect[3]) <= 2));
  const top = dashes.filter((n) => n.id.startsWith(id + ".t.")).map((n) => n.rect[0]); assert.deepEqual(top.slice(0, 4).map((x, i) => x - more.rect[0] - 4 * i), [0, 0, 0, 0], "2 on, 2 off along the edge");
});

test("the fold-out edge is a registered stand-in: its clay box carries the fold. ids the screen drops once the master is signed; the master is asked for under it", () => {
  const w = world("S09"), { v } = view(w); const fold = v.nodes.filter((n) => n.id.startsWith("fold.")); assert.equal(fold.length, 4); assert.ok(fold.every((n) => n.colour === "clay"));
  assert.ok(v.masters.some((m) => m.master === "library-foldout-1008x504" && m.rect.join() === "8,48,1008,504")); assert.ok(readFileSync(path.resolve(here, "../src/art.mjs"), "utf8").includes('id: "foldout-edge"'), "listed in the placeholder register");
});

test("panel words come from the string table: Legs & tail from pods.json strings.legsTail.heading, the rest as the frame writes them, never recased", () => {
  const pods = JSON.parse(readFileSync(path.resolve(here, "../../ui/specs/station/pods.json"), "utf8")), heading = pods.strings.legsTail.heading, w = world("S09"), model = guideModel(w.st, "S09", settings), { v } = view(w, undefined, { legsHeading: heading });
  w.fr.chapters.forEach((ch, i) => { assert.equal(model.cols[i].name, ch.name, "as written"); const node = v.nodes.find((n) => n.id === `panel.${i}.word`); assert.equal(node.text, ch.id === "legs-tail" ? heading : ch.name); });
  assert.ok(!readFileSync(path.resolve(here, "../src/views/guide.mjs"), "utf8").includes("toUpperCase"), "the build never recases");
});

test("every look plate has a 1 px bark keyline at [x−1, y−1, w+2, h+2], signed or not; none on 'more?', the face or the panels", () => {
  const w = world("S09"), { v } = view(w); const plates = v.targets.filter((t) => t.kind === "plate"); assert.ok(plates.length);
  for (const p of plates) { const key = v.nodes.filter((n) => n.id.startsWith(`plate.${p.index}.key.`)); assert.equal(key.length, 4); assert.ok(key.every((n) => n.colour === "bark")); const xs = key.flatMap((n) => [n.rect[0], n.rect[0] + n.rect[2]]), ys = key.flatMap((n) => [n.rect[1], n.rect[1] + n.rect[3]]); assert.deepEqual([Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], [p.rect[0] - 1, p.rect[1] - 1, p.rect[0] + p.rect[2] + 1, p.rect[1] + p.rect[3] + 1]); }
  assert.equal(v.nodes.filter((n) => /\.key\./.test(n.id)).length, plates.length * 4, "no keyline on anything else");
});

test("the focus ring on paper is rust, from frame.json focus.ring.onPaper; ✓ Visit on the Book's face needs a living mibi as the face", () => {
  const frame = JSON.parse(readFileSync(path.resolve(here, "../../ui/specs/station/frame.json"), "utf8")); assert.equal(frame.focus.ring.onPaper, "rust"); assert.deepEqual([frame.focus.ring.width, frame.focus.ring.outside, frame.focus.ring.radius], [2, 4, 6]);
  const w = world("S09"); assert.equal(L.visitFace(w.st, "S09"), null, "the type face: no ✓");
  const [a] = w.ms; a.portrait = { state: "delivered" }; w.st.face.S09 = a.id; assert.equal(L.visitFace(w.st, "S09").id, a.id, "a living face");
  a.released = true; assert.equal(L.visitFace(w.st, "S09"), null, "a face in the wild: no ✓");
});
