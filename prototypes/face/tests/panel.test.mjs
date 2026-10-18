// The decision panel on the face (lvgl-switch.md §2.2; panel.json, frame.json regions.panel; specs/station-decision-panel-spec.md Part 1): the words and the binding table (screens/panel.c) on the props views/panel-props.mjs gives,
// over Create, in Node on the WebAssembly build: the veil, the panel and the cards draw without an error or a refusal (one, two and three cards, a dimmed card, a card with no picture), the cards sit at the spec's rectangles
// (776, 380 and 248 wide), the ring is the one ring (the frame ring 4 px out, Create draws none), the keys (◀ ▶ walk and stop at the ends, ▲ ▼ do nothing, ✓ ← and the room keys are intents of the overlay's id with the focused card),
// and a focus move redraws the two cards' boxes only (at most 153,600 px). Skipped when the face has not been built (build.sh).
//   node --test prototypes/face/tests/panel.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { withPolicy } from "./node-scene.mjs";
import { bootFace } from "../../station/src/face-lvgl.mjs";
import { setFrames, frameOf, podGenome } from "../../station/src/genome.mjs";
import * as S from "../../station/src/state.mjs";
import { createBuild, reviewTraits } from "../../station/src/views/create-props.mjs";
import { incubatorBuild } from "../../station/src/views/incubator-props.mjs";
import { panelBuild, artOf } from "../../station/src/views/panel-props.mjs";
import { pinnedPictures } from "../../ui/specs/derive.mjs";
import { departures } from "../tools/create-regions.mjs";
import { dirty, dirtyRects } from "./dirty.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist"), built = existsSync(path.join(dist, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
// The Grow this founder? panel and its fixture are retired (T-20261016-222): the card form's one, two and three cards are tested on the Hatch now? panel's cards (and a third made of them), the Incubate | Keep shaping form on its own props.
const specs = path.resolve(here, "../../ui/specs/station"), J = (n) => JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8")), frameSpec = J("frame"), podsSpec = J("pods"), createSpec = J("create"), panelSpec = J("panel"), incSpec = J("incubator");
const palette = JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours;
const framesDir = path.resolve(here, "../../workbench/frames");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const rgbOf = (name) => { const h = palette.find((c) => c[0] === name)[1]; return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 12 }, T0 = 1_000_000, R = createSpec.regions, EV = createSpec.events;

// ---- scenes: the state through the rules, the props through the view ----
const world = () => { const st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = 99; st.d = 99; st.s = 99; st.firstMibi = false; return st; };
// o: { species, gs, read (chapters read), f (the trait the ring is on), roll (a ▼ on it), clash, busy, short, grown }
function scene(o = {}) {
  const st = world(), id = o.species ?? "S01"; S.seedPodFromGenome(st, podGenome(frameOf(id), o.gs ?? 3), settings, T0); const p = st.tray[0]; S.skipIdentify(st, p);
  frameOf(id).chapters.slice(0, o.read ?? 0).forEach((c) => S.read(st, p, c.id, settings));
  const cr = { podId: p.id, choices: {}, f: o.f ?? 0, clash: [], grown: null };
  if (o.roll) { const list = reviewTraits(p, frameOf(id)), t = list[cr.f].t, opts = S.rollOptions(p, t.id); cr.choices[t.id] = o.roll; assert.ok(opts.length > 1, "the trait rolls"); }
  if (o.clash) cr.clash = Object.keys(cr.choices);
  if (o.busy) st.bud = { kind: "founder", species: id, sp: 0, gs: 5, genome: p.genome, sha: "bud", code: "BUD", start: T0, minutes: 20, firstEver: false, parents: null, from: { n: 0, g: "meadow", how: "ground", podId: null }, read: [], shaped: [], early: false };
  if (o.short) st.s = 1;
  if (o.grown) { const r = S.grow(st, p, cr.choices, settings, T0); assert.ok(r.ok); cr.grown = { code: r.bud.code, cost: r.cost, pod: p }; }
  return { ...createBuild({ st, settings, ui: { create: cr } }, createSpec, podsSpec), st, p, cr };
}
const frameProps = (line = {}) => ({ top: { screen: "create", title: "Create", turn: 4, turnFlash: false, materials: { e: 9, d: 9, s: 9 }, flash: {}, companion: { docked: true, withMibi: null } }, line: { back: null, need: "", ...line }, plate: { text: "", timed: false } });

// stand-in pictures: a flat block keyed by id, at the size the request names; the colour is the id's, so a picture is told by one pixel
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const colourOf = (id) => { const k = hash(id); return [70 + (k & 127), 70 + ((k >> 7) & 127), 70 + ((k >> 14) & 127)]; };
function standIn(id, size, hollow = false) { const [w, h] = size, d = new Uint8ClampedArray(w * h * 4), [r, g, b] = colourOf(id); for (let i = 0; i < w * h; i++) { const x = i % w, y = (i / w) | 0, edge = x === 0 || y === 0 || x === w - 1 || y === h - 1; d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = (hollow && !edge) || CLEAR.test(id) ? 0 : 255; } return { w, h, data: d }; }   // a PH hollow has its edge only
const sizeOf = (r) => (typeof r.size === "number" ? [r.size, r.size] : r.size) ?? r.area ?? (r.kind === "star" ? [12, 12] : r.kind === "emblem" ? [24, 24] : [16, 16]);
const PINNED = pinnedPictures(podsSpec, frameSpec);

async function start(b, { motion = true, t0 = 0, noWait = false, skip = [] } = {}) {
  const f = await bootFace(pathToFileURL(dist + "/"), { test: true });
  f.send({ t: "palette", name: "station", colours: palette }); for (const [n, j] of [["frame", frameSpec], ["pods", podsSpec], ["create", createSpec]]) assert.equal(f.send({ t: "spec", screen: n, json: j }), 0);
  for (const id of ["energy", "data", "essence", "cross"]) f.handleOf(`icon:${id}:16`, withPolicy((i) => standIn(i, [16, 16])));
  f.handleOf("icon-cross-16", withPolicy((i) => standIn(i, [16, 16])));   // the clash line's ✕: the cross icon master (a test-only stand-in)
  if (!noWait) f.handleOf("icon-wait-16", withPolicy((i) => standIn(i, [16, 16])));   // a test-only stand-in for the signed master: the wait's picture (fix 6 A3)
  for (const p of PINNED) f.handleOf(p.id, withPolicy((i) => standIn(i, [p.w, p.h])));
  for (const r of b.requests) if (!skip.includes(r.id)) f.handleOf(r.id, withPolicy((i) => standIn(i, sizeOf(r), r.hollow)));   // skip: a picture the host does not have (an unplaced master)
  f.t = t0; f.motion = motion; f.build = b;
  const rc = f.props({ screen: "create", ...b.props, motion, frame: frameProps(b.line) }); f.initErrors = f.errors(); assert.equal(rc, 0, f.initErrors.join("; ")); frames(f); return f;   // initErrors: what the first build said (reading errors() drains it)
}
const frames = (f, n = 2, dt = 16) => { for (let i = 0; i < n; i++) f.frame((f.t += dt)); };
const logOf = (f) => { let lg = null; for (let m; (m = f.poll("log"));) lg = m; return lg; };
const key = (f, k) => { f.send({ t: "key", k }); frames(f); const out = []; for (let m; (m = f.poll());) if (m.t === "focus" || m.t === "intent") out.push(m); return out; };
const region = (lg, id, layer) => lg.regions.find((r) => r.id === id && (!layer || r.layer === layer)) ?? null;
const pixelIs = (f, x, y, id) => { const got = f.pixel(x, y), want = colourOf(id); return got.every((v, i) => v === want[i]); };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const CLEAR = /^capsule-(shell|shell-dusk|door-open|bar-lit|seal-ring|glass-closed)/;   // the layers over the pod are clear stand-ins


// o: { kind: "growNow" (the card form: a bud growing) | "incubate" (Create under the Incubate | Keep shaping panel), focus, cards: 1 | 2 | 3, species }; the panel's props ride on Create's as an overlay, the bottom line is the focused card's
function panelScene(o = {}) {
  const st = world(), id = o.species ?? "S01"; S.seedPodFromGenome(st, podGenome(frameOf(id), 3), settings, T0); const p = st.tray[0]; S.skipIdentify(st, p);
  frameOf(id).chapters.slice(0, o.read ?? 2).forEach((c) => S.read(st, p, c.id, settings));
  const cr = { podId: p.id, choices: {}, f: 1, clash: [], grown: null }, kind = o.kind ?? "growNow", ui = { create: cr, panel: { screen: kind === "growNow" ? "incubator" : "create", id: kind, focus: o.focus ?? "" } };
  if (kind === "growNow") { const q = st.tray[0]; assert.ok(S.grow(st, q, {}, settings, T0).ok); if (o.short) st.s = 0; }
  const b = kind === "growNow" ? { ...incubatorBuild({ st, settings, now: T0 + 1000, ui: { inc: {}, ...ui }, lamp: "" }, incSpec, podsSpec), screen: "incubator" } : createBuild({ st, settings, ui }, createSpec, podsSpec), pb = panelBuild({ st, settings, ui, jump: "arrival", now: T0 + 1000, create: createSpec }, panelSpec, frameSpec, podsSpec);
  if (kind === "incubate") b.props.focus = { cur: "", targets: [] };
  b.screen ??= "create";
  if (kind === "growNow" && (o.cards ?? 2) !== 2) { const c = pb.overlay.regions.cards, extra = { ...c[0], id: "third", name: "Third" }; pb.overlay.regions.cards = o.cards === 3 ? [...c.slice(0, 1), c[0].id === "grow" ? { ...c[1], id: "wait2" } : c[1], c[1]].map((x, i) => ({ ...x, id: ["grow", "wait", "third"][i] })) : [c[0]]; { const n = pb.overlay.regions.cards.length, art = artOf(frameSpec, n, pb.requests); pb.overlay.regions.art = { housing: art.housing, veil: art.veil, shadow: art.shadow, chip: art.chip }; pb.overlay.regions.cards = pb.overlay.regions.cards.map((x) => ({ ...x, art: art.card })); } pb.overlay.focus.targets = pb.overlay.regions.cards.map((x) => ({ id: "card." + x.id, enabled: true })); pb.overlay.focus.cur = "card." + pb.overlay.regions.cards[0].id; void extra; }
  b.props.overlay = pb.overlay; b.line = pb.line; b.requests = [...b.requests, ...pb.requests];
  return { ...b, st, p, pb };
}
async function startPanel(b, { motion = false } = {}) {
  const f = await bootFace(pathToFileURL(dist + "/"), { test: true });
  f.send({ t: "palette", name: "station", colours: palette }); for (const [n, j] of [["frame", frameSpec], ["pods", podsSpec], ["create", createSpec], ["incubator", incSpec], ["panel", panelSpec]]) assert.equal(f.send({ t: "spec", screen: n, json: j }), 0, f.errors().join("; "));
  for (const id of ["energy", "data", "essence", "cross"]) f.handleOf(`icon:${id}:16`, withPolicy((i) => standIn(i, [16, 16])));
  for (const id of ["icon-cross-16", "icon-wait-16"]) f.handleOf(id, withPolicy((i) => standIn(i, [16, 16])));
  for (const p of PINNED) f.handleOf(p.id, withPolicy((i) => standIn(i, [p.w, p.h])));
  for (const r of b.requests) f.handleOf(r.id, withPolicy((i) => standIn(i, sizeOf(r), r.hollow)));
  f.t = 0; f.motion = motion; f.build = b;
  const rc = f.props({ screen: b.screen ?? "create", ...b.props, motion, frame: frameProps(b.line) }); assert.equal(rc, 0, f.errors().join("; ")); frames(f); return f;
}
const card = (n, i) => { const gap = 16, w = (776 - gap * (n - 1)) / n; return [124 + i * (w + gap), 152, w, 288]; };

for (const [name, o, n] of [["two cards (the Hatch now? panel)", {}, 2], ["three cards", { cards: 3 }, 3], ["one card", { cards: 1 }, 1], ["a dimmed card (short)", { short: true }, 2]]) {
  test(`the panel, ${name}: draws without an error or a refusal, the cards at the spec's rectangles, the one ring 4 px outside the focused card`, { skip }, async () => {
    const b = panelScene(o), f = await startPanel(b); assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0);
    assert.equal(b.props.overlay.regions.cards.length, n); const cur = b.props.overlay.focus.cur, at = b.props.overlay.regions.cards.findIndex((c) => "card." + c.id === cur);
    const lg = logOf(f), rings = lg.regions.filter((r) => r.id === "focus" && r.layer === "chrome"); assert.equal(rings.length, 1, "Create's ring is not drawn while the panel is open");
    const [x, y, w, h] = card(n, at), r = rings[0].rect; assert.deepEqual(r, [x - 4, y - 4, w + 8, h + 8], "the frame ring, 4 px out");
    for (let i = 0; i < n; i++) { assert.equal(card(n, i)[2], n === 3 ? 248 : n === 2 ? 380 : 776); }
  });
}
test("the keys: ◀ ▶ walk the cards and stop at the ends, ▲ ▼ do nothing; ✓ ← and the room keys say an intent of the overlay's id on the focused card", { skip }, async () => {
  const b = panelScene({ cards: 3 }), f = await startPanel(b); assert.equal(b.props.overlay.focus.cur, "card.grow");
  assert.deepEqual(key(f, "left"), [], "the first card: the end"); assert.deepEqual(key(f, "up"), []); assert.deepEqual(key(f, "down"), []);
  assert.deepEqual(key(f, "right").map((m) => [m.t, m.screen, m.target]), [["focus", "panel", "card.wait"]]);
  assert.deepEqual(key(f, "right").map((m) => [m.t, m.screen, m.target]), [["focus", "panel", "card.third"]]); assert.deepEqual(key(f, "right"), [], "the last card: the end");
  assert.deepEqual(key(f, "confirm").map((m) => [m.t, m.screen, m.target, m.verb]), [["intent", "panel", "card.third", "confirm"]]);
  assert.deepEqual(key(f, "back").map((m) => [m.screen, m.target, m.verb]), [["panel", "card.third", "back"]]);
  assert.deepEqual(key(f, "research").map((m) => [m.screen, m.verb]), [["panel", "room:research"]]);
});
test("a focus move redraws the two cards' boxes only: at most 2 × 256 × 296 = 151,552 px, inside the cards", { skip }, async () => {
  const b = panelScene({ cards: 3 }), f = await startPanel(b); dirty(f);
  f.send({ t: "key", k: "right" }); f.frame((f.t += 16)); const d = dirty(f); assert.ok(d > 0 && d <= 153600, `${d} px`);
  for (const q of dirtyRects(f)) assert.ok(q[0] >= 124 - 8 && q[1] >= 152 - 8 && q[0] + q[2] <= 124 + 776 + 8 && q[1] + q[3] <= 440 + 8, `${q} inside the cards' band`);
});

// ---- the Incubate | Keep shaping form (build spec 6a; panel.json incubate) ----
const I = panelSpec.incubate, BEZ = [I.bezels.incubate, I.bezels.keep];
for (const [name, o] of [["a Loika founder", { species: "S01" }], ["a second species", { species: "S02" }], ["focus on Keep shaping", { focus: "card.keep" }]]) {
  test(`the Incubate panel, ${name}: draws without an error or a refusal; the ground, two bezels, both windows with their frames and the pictures at the spec's places; the one ring 5 px round the focused bezel`, { skip }, async () => {
    const b = panelScene({ kind: "incubate", ...o }), f = await startPanel(b); assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0);
    const lg = logOf(f), cur = b.props.overlay.focus.cur, at = cur === "card.keep" ? 1 : 0;
    assert.deepEqual(region(lg, "panelGround").rect, [0, 40, 1024, 522]); for (const [i, r] of BEZ.entries()) assert.deepEqual(region(lg, `panelBezel.${i}`).rect, r, `bezel ${i} at ${r}`);
    assert.deepEqual(region(lg, "panelRoom").rect.slice(0, 2), [24, 76]); assert.deepEqual([region(lg, "panelWindow.0").rect, region(lg, "panelWindow.1").rect], [I.windows.left, I.windows.right], "the two window frames");
    assert.deepEqual(region(lg, "panelSnapshot").rect, I.windows.right, "the right window is Create as it stood (the snapshot), 474 x 468 at 526, 76");
    const rings = lg.regions.filter((r) => r.id === "focus" && r.layer === "chrome"); assert.equal(rings.length, 1); const [x, y, w, h] = BEZ[at]; assert.deepEqual(rings[0].rect, [x - 5, y - 5, w + 10, h + 10], "the house ring, reaching 5 px round the bezel");
    assert.deepEqual(lg.type.filter((t) => t.region === "panelHeader").map((t) => t.text).sort(), ["Incubate", "Keep shaping"], "the two verbs and nothing else: no title, no fact band");
    assert.equal(f.objects() <= 400, true, `${f.objects()} objects`);
  });
}
test("the Incubate panel: the right window is Create as it stood when it was left, drawn at 1:1 and offset so that Create's stage rect (275, 90, 474, 468) fills it, with no ring in it", { skip }, async () => {
  const b = panelScene({ kind: "incubate" }), create = { ...b, props: { ...b.props }, line: b.line }; delete create.props.overlay;
  const g = await startPanel(create), samples = []; for (const [x, y] of [[310, 110], [500, 150], [512, 400], [420, 300], [330, 540], [700, 500], [740, 120], [276, 95], [600, 160], [480, 250]]) samples.push([x, y, g.pixel(x, y).join()]);
  assert.ok(new Set(samples.map((s) => s[2])).size >= 3, "Create draws more than one colour in its stage rect");
  const f = await startPanel(b), P = I.right.snapshot, W = I.windows.right; let same = 0;
  for (const [x, y, c] of samples) if (f.pixel(W[0] + (x - P[0]), W[1] + (y - P[1])).join() === c) same++;
  assert.equal(same, samples.length, `every sampled pixel of Create is in the window at +251, -14 (${same} of ${samples.length})`);
  assert.deepEqual(f.errors(), []);
});
test("the Incubate panel's keys: the pad moves between the two bezels and stops at the ends, up and down do nothing; the check says confirm on the focused bezel (incubate first), back says back, a room key says its room", { skip }, async () => {
  const b = panelScene({ kind: "incubate" }), f = await startPanel(b); assert.equal(b.props.overlay.focus.cur, "card.incubate");
  assert.deepEqual(key(f, "left"), []); assert.deepEqual(key(f, "up"), []); assert.deepEqual(key(f, "down"), []);
  assert.deepEqual(key(f, "confirm").map((m) => [m.t, m.screen, m.target, m.verb]), [["intent", "panel", "card.incubate", "confirm"]]);
  assert.deepEqual(key(f, "right").map((m) => [m.t, m.screen, m.target]), [["focus", "panel", "card.keep"]]); assert.deepEqual(key(f, "right"), [], "the last bezel: the end");
  assert.deepEqual(key(f, "confirm").map((m) => [m.t, m.screen, m.target, m.verb]), [["intent", "panel", "card.keep", "confirm"]]);
  assert.deepEqual(key(f, "back").map((m) => [m.screen, m.target, m.verb]), [["panel", "card.keep", "back"]]); assert.deepEqual(key(f, "home").map((m) => [m.screen, m.verb]), [["panel", "room:home"]]);
  assert.deepEqual(key(f, "left").map((m) => [m.t, m.target]), [["focus", "card.incubate"]]);
});
test("the Incubate panel's dither in: the stage dither at 90 ms is level 8 of 16 over the stage, held (the host's hold); the panel stands whole at 180", { skip }, async () => {
  const b = panelScene({ kind: "incubate" }), f = await startPanel(b, { motion: true }); f.send({ t: "event", kind: "dither", target: "stage", ms: 180, hold: 180 }); const t0 = f.t;
  f.frame(t0 + 90); let covered = 0; for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) if (f.pixel(900 + i, 500 + j).join() === rgbOf("void").join()) covered++; assert.equal(covered, 8, "at 90 ms: level 16 - floor(16 x 90 / 180) = 8 cells of 16 covered");
  f.frame(t0 + 190); let after = 0; for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) if (f.pixel(900 + i, 500 + j).join() === rgbOf("void").join()) after++; assert.equal(after, 0, "at 180 the stage is clear");
  for (let k = 0; k < 3; k++) { f.send({ t: "key", k: "confirm" }); } 
});
test("a focus move between the two bezels redraws the two rings' places only, at most 2 x 500 x 516 px", { skip }, async () => {
  const b = panelScene({ kind: "incubate" }), f = await startPanel(b); dirty(f);
  f.send({ t: "key", k: "right" }); f.frame((f.t += 16)); const d = dirty(f); assert.ok(d > 0 && d <= 2 * 500 * 516, `${d} px`); console.log(`# the Incubate panel's focus move: ${d} px (${(100 * d / 614400).toFixed(1)}%)`);
  for (const q of dirtyRects(f)) assert.ok(q[0] >= 8 && q[1] >= 38 && q[0] + q[2] <= 1016 && q[1] + q[3] <= 562, `${q} inside the stage`);
});
