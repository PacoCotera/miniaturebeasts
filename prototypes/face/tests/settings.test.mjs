// Settings (settings.json; views/settings-props.mjs; intents/settings.mjs; screens/settings.c): the props in Node (every scene validates against settings.props.json, names no rectangle or colour, and says why the sleep row cannot act in the
// order the sleep's own preflight does), the intents against a recording host (← is Home with the ring on the Settings knob, ✓ does nothing on a row yet, Home's knob opens Settings only behind the developer setting realmSleep), and the face on
// the WebAssembly build (every scene draws with no error, each vector of the spec is played and the focus is said on the frame of the key, every word stays inside its row or the detail, nothing is set by a pixel size the frame does not hold).
// Skipped, for the face part, when the face has not been built (build.sh).
//   node --test prototypes/face/tests/settings.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import * as S from "../../station/src/state.mjs";
import { INDEX_KEY } from "../../station/src/sleep.mjs";
import { settingsBuild, sleepBlock, dayWords, TARGETS, SLEEP_INDEX_KEY } from "../../station/src/views/settings-props.mjs";
import { INTENTS } from "../../station/src/intents/index.mjs";
import { bootFace } from "../../station/src/face-lvgl.mjs";
import { setFrames } from "../../station/src/genome.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist"), built = existsSync(path.join(dist, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
const specs = path.resolve(here, "../../ui/specs/station"), J = (n) => JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8")), spec = J("settings"), schema = J("settings.props"), frameSpec = J("frame"), homeSpec = J("home");
const palette = JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours;
setFrames(readdirSync(path.resolve(here, "../../workbench/frames")).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.resolve(here, "../../workbench/frames", f), "utf8"))));
const T0 = 1_000_000, BEGAN = Date.UTC(2026, 10, 4, 12);

function validate(v, sc, at = "$", out = []) {
  if (sc.$ref) return validate(v, schema.$defs[sc.$ref], at, out);
  if ("const" in sc && v !== sc.const) out.push(`${at}: ${JSON.stringify(v)} is not ${JSON.stringify(sc.const)}`);
  if (sc.enum && !sc.enum.includes(v)) { out.push(`${at}: ${JSON.stringify(v)} is not one of ${JSON.stringify(sc.enum)}`); return out; }
  if (sc.type) {
    const ts = [].concat(sc.type), ty = v === null ? "null" : Array.isArray(v) ? "array" : Number.isInteger(v) ? "integer" : typeof v;
    if (!ts.includes(ty) && !(ty === "integer" && ts.includes("number"))) { out.push(`${at}: a ${ty}, wanted ${ts.join(" or ")}`); return out; }
  }
  if (typeof v === "string" && sc.minLength !== undefined && v.length < sc.minLength) out.push(`${at}: shorter than ${sc.minLength}`);
  if (Array.isArray(v) && sc.maxItems !== undefined && v.length > sc.maxItems) out.push(`${at}: more than ${sc.maxItems}`);
  if (Array.isArray(v) && sc.minItems !== undefined && v.length < sc.minItems) out.push(`${at}: fewer than ${sc.minItems}`);
  if (Array.isArray(v) && sc.items) v.forEach((x, i) => validate(x, sc.items, `${at}[${i}]`, out));
  if (v && typeof v === "object" && !Array.isArray(v)) {
    for (const k of sc.required ?? []) if (!(k in v)) out.push(`${at}: ${k} is required`);
    for (const [k, x] of Object.entries(v)) { const p = sc.properties?.[k]; if (p) validate(x, p, `${at}.${k}`, out); else if (sc.additionalProperties === false) out.push(`${at}: ${k} is not a prop`); }
  }
  return out;
}

// the state through the rules' own fields, the Companion's part as a v9 save holds it, and the Companion the Station knows
function model(o = {}) {
  const st = S.freshSt("w1", o.turn ?? 41, T0); S.normalize(st); st.firstMibi = false; st.dock = { docked: o.docked ?? true, at: T0 };
  S.seedAdults(st, "S01", 5, o.mibis ?? 3, { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 12 });
  const sv = o.noSave ? { v: 8, seed: 7, wid: "w1", turn: 41 } : { v: 9, wid: "w1", seed: 7, began: o.began === undefined ? BEGAN : o.began, turn: 41, regions: Array.from({ length: o.regions ?? 3 }, (_, i) => ({ id: "g" + (i + 1) })) };
  const companion = o.noCompanion ? null : { name: "Companion A", since: BEGAN, keyed: o.keyed ?? true };
  return { st, sv, settings: { ...S.DEFAULT_SETTINGS, realmSleep: true }, docked: o.docked ?? true, companion, sleeping: o.sleeping ?? 0, ui: { f: o.f ?? null } };
}
const SCENES = {
  "docked and keyed, the first row": () => model(),
  "the Companion row": () => model({ f: "companion" }),
  "sleeping realms, none": () => model({ f: "sleeping" }),
  "sleeping realms, two kept": () => model({ f: "sleeping", sleeping: 2 }),
  "the sleep row, docked": () => model({ f: "sleep" }),
  "the sleep row, lifted": () => model({ f: "sleep", docked: false }),
  "the sleep row, no key": () => model({ f: "sleep", keyed: false }),
  "the sleep row, no save": () => model({ f: "sleep", noSave: true }),
  "no Companion yet": () => model({ f: "companion", noCompanion: true, docked: false }),
  "one region, no date": () => model({ regions: 1, began: null, mibis: 1 }),
};

for (const [name, mk] of Object.entries(SCENES)) {
  test(`Settings, ${name}: validates against settings.props.json, names no rectangle or colour`, () => {
    const b = settingsBuild(mk(), spec); assert.deepEqual(validate(b.props, schema), [], JSON.stringify(b.props).slice(0, 300));
    assert.ok(!/"(rect|rects|x|y|w|h|colour|color)":/.test(JSON.stringify(b.props)), "names no rectangle and no colour");
    assert.deepEqual(b.props.focus.targets.map((t) => t.id), TARGETS); assert.deepEqual(b.requests, []);
  });
}

test("the sleep row says why it cannot act, in the order of the sleep's own preflight: lifted, then no key, then no save", () => {
  assert.equal(sleepBlock(model()), null);
  assert.equal(sleepBlock(model({ docked: false, keyed: false, noSave: true })), "not docked");
  assert.equal(sleepBlock(model({ keyed: false, noSave: true })), "no key");
  assert.equal(sleepBlock(model({ noSave: true })), "no save");
  assert.equal(sleepBlock({ ...model(), companion: null }), "no key");
  const R = spec.strings.reasons;
  for (const [sc, why] of [["the sleep row, lifted", "not docked"], ["the sleep row, no key", "no key"], ["the sleep row, no save", "no save"]]) {
    const p = settingsBuild(SCENES[sc](), spec).props.regions; assert.equal(p.sleep.dim, true); assert.equal(p.sleep.sub, R[why]); assert.ok(p.detail.blocks.some((b) => b.kind === "notice" && b.text === R[why]), sc);
  }
  const ok = settingsBuild(SCENES["the sleep row, docked"](), spec).props.regions; assert.equal(ok.sleep.dim, false); assert.equal(ok.sleep.sub, spec.strings.rows.sleep.hint); assert.ok(!ok.detail.blocks.some((b) => b.kind === "notice"));
});

test("the realm's words: the day it began, the regions, the mibis that are not released, the world turn; plural and singular; no date when the save has none", () => {
  const m = model({ mibis: 3 }); m.st.mibis[0].released = true;
  assert.equal(settingsBuild(m, spec).props.regions.detail.blocks[0].text, "Began 4 Nov 2026 · 3 regions · 2 mibis · world turn 41");
  assert.equal(settingsBuild(model({ regions: 1, mibis: 1 }), spec).props.regions.detail.blocks[0].text, "Began 4 Nov 2026 · 1 region · 1 mibi · world turn 41");
  const nd = settingsBuild(model({ began: null, regions: 2 }), spec).props.regions; assert.equal(nd.realm.sub, spec.strings.rows.realm.subNoDate); assert.equal(nd.detail.blocks[0].text, "2 regions · 3 mibis · world turn 41");
  assert.equal(dayWords(BEGAN), "4 Nov 2026"); assert.equal(dayWords(undefined), "");
  const c = settingsBuild(model({ f: "companion" }), spec).props.regions; assert.equal(c.companion.sub, "Companion A · docked"); assert.equal(c.detail.blocks[0].text, "Companion A · docked · with this realm since 4 Nov 2026");
  assert.equal(settingsBuild(model({ f: "companion", docked: false }), spec).props.regions.companion.sub, "Companion A · lifted");
  assert.equal(settingsBuild(model({ f: "companion", noCompanion: true }), spec).props.regions.companion.sub, spec.strings.rows.companion.subNone);
  assert.equal(settingsBuild(model({ f: "sleeping", sleeping: 2 }), spec).props.regions.sleeping.sub, "2 kept");
  assert.equal(settingsBuild(model({ f: "sleeping" }), spec).props.regions.detail.blocks[0].text, "None yet");
});

test("the bottom line: the focused row's name, no ✓ yet, ← Home", () => {
  for (const id of TARGETS) { const b = settingsBuild(model({ f: id }), spec); assert.equal(b.props.focus.cur, id); assert.deepEqual([b.line.ok, b.line.subject, b.line.back], [null, spec.strings.rows[id].title, "Home"]); }
  assert.equal(settingsBuild(model({ f: "nowhere" }), spec).props.focus.cur, "realm", "a ring on no row opens on the first");
});

test("the index key the host reads is the sleep sequence's own", () => { assert.equal(SLEEP_INDEX_KEY, INDEX_KEY); });

// ---- the intents ----
function host(o = {}) {
  const h = { st: S.freshSt("w1", 3, T0), sv: { v: 9, wid: "w1", regions: [{ id: "g1" }] }, settings: { ...S.DEFAULT_SETTINGS, realmSleep: o.realmSleep ?? true }, ui: { screen: "home", home: { f: "room" }, settings: { f: null } }, specs: { home: homeSpec }, went: [] };
  h.goto = (s) => { h.went.push(s); h.ui.screen = s; }; h.now = () => T0; h.save = () => {}; h.say = () => {}; h.play = () => {}; h.at = () => {}; h.motion = () => false; return h;
}
test("← is Home with the ring on the Settings knob; ✓ does nothing on any row yet; the ring moves are the host's", () => {
  const h = host(); h.ui.screen = "settings";
  for (const id of TARGETS) { INTENTS.settings.focus(h, id); assert.equal(h.ui.settings.f, id); INTENTS.settings.intent(h, id, "confirm"); assert.deepEqual(h.went, []); assert.equal(h.ui.screen, "settings"); }
  INTENTS.settings.intent(h, "sleep", "back"); assert.deepEqual(h.went, ["home"]); assert.equal(h.ui.home.f, "settings");
});
test("Home's Settings knob: ✓ goes to Settings behind the developer setting realmSleep, and does nothing without it", () => {
  const on = host(); INTENTS.home.intent(on, "settings", "confirm"); assert.deepEqual(on.went, ["settings"]);
  const off = host({ realmSleep: false }); INTENTS.home.intent(off, "settings", "confirm"); assert.deepEqual(off.went, []);
  INTENTS.home.intent(on, "settings", "back"); assert.deepEqual(on.went, ["settings"], "only ✓ acts");
});

// ---- the face ----
async function start(b, { motion = false } = {}) {
  const f = await bootFace(pathToFileURL(dist + "/"), { test: true });
  assert.equal(f.send({ t: "palette", name: "station", colours: palette }), 0);
  for (const [n, j] of [["frame", frameSpec], ["settings", spec]]) assert.equal(f.send({ t: "spec", screen: n, json: j }), 0);
  f.t = 0; f.motion = motion; f.build = b;
  assert.equal(f.props({ screen: "settings", ...b.props, motion, frame: { top: { title: "Settings", turn: 42, materials: { e: 1, d: 2, s: 3 }, flash: {}, companion: { docked: true } }, line: { ...b.line, ok: null }, plate: { text: "" } } }), 0, f.errors().join("; "));
  frames(f); return f;
}
const frames = (f, n = 2) => { for (let i = 0; i < n; i++) f.frame((f.t += 16)); };
const logOf = (f) => { let lg = null; for (let m; (m = f.poll("log"));) lg = m; return lg; };
const key = (f, k) => { f.send({ t: "key", k }); frames(f); const out = []; for (let m; (m = f.poll());) if (m.t === "focus" || m.t === "intent") out.push(m); return out; };
const inside = (b, r) => b[0] >= r[0] && b[1] >= r[1] && b[0] + b[2] <= r[0] + r[2] && b[1] + b[3] <= r[1] + r[3];
const R = spec.regions;

for (const [name, mk] of Object.entries(SCENES)) {
  test(`the face draws Settings, ${name}: no error, no refusal, every word inside its row or the detail, the ring on the focused row`, { skip }, async () => {
    const b = settingsBuild(mk(), spec), f = await start(b), lg = logOf(f);
    assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0);
    const reg = (id, layer) => (lg.regions ?? []).filter((r) => r.id === id && (!layer || r.layer === layer));
    for (const id of TARGETS) { const c = reg("row." + id, "chrome"); assert.equal(c.length, 1, id + " has one panel"); assert.deepEqual(c[0].rect, R[id].rect, id + "'s panel is its rectangle"); for (const t of reg("row." + id, "type")) assert.ok(inside(t.rect, R[id].rect), `${id}'s words ${t.rect} leave its row`); }
    const d = reg("detail", "chrome"); assert.deepEqual(d[0].rect, R.detail.rect); for (const t of reg("detail", "type")) assert.ok(inside(t.rect, R.detail.rect), `the detail's words ${t.rect} leave it`);
    const ring = reg("focus"); assert.equal(ring.length, 1); const box = R[b.props.focus.cur].rect; assert.deepEqual(ring[0].rect, [box[0] - 5, box[1] - 5, box[2] + 10, box[3] + 10]);
    for (const t of (lg.type ?? []).filter((x) => x.region === "detail" || x.region.startsWith("row."))) assert.ok([16, 20, 28].includes(t.px), `"${t.text}" is set at ${t.px} px`);
    const detail = (lg.type ?? []).filter((t) => t.region === "detail").map((t) => t.text); assert.equal(detail[0], b.props.regions.detail.title);
  });
}

test("every vector of the spec is played on the face: the focus is said on the frame of the key, a key that moves nothing changes no pixel", { skip }, async () => {
  assert.equal(spec.focus.vectors.length, 16, "four rows, four keys each");
  for (const v of spec.focus.vectors) {
    const f = await start(settingsBuild(model({ f: v.from }), spec)), before = f.hash(), out = key(f, v.key);
    if (v.to === v.from) { assert.deepEqual(out, [], `${v.from} ${v.key} stays`); assert.equal(f.hash(), before, `${v.from} ${v.key}: nothing redrawn`); }
    else { assert.equal(out.length, 1, `${v.from} ${v.key}`); assert.deepEqual([out[0].t, out[0].screen, out[0].target], ["focus", "settings", v.to], `${v.from} ${v.key}`); }
  }
});

test("✓ and ← say an intent on the focused row; the room keys say theirs", { skip }, async () => {
  for (const id of TARGETS) {
    const f = await start(settingsBuild(model({ f: id }), spec));
    let [m] = key(f, "confirm"); assert.deepEqual([m.t, m.screen, m.target, m.verb], ["intent", "settings", id, "confirm"]);
    [m] = key(f, "back"); assert.deepEqual([m.t, m.screen, m.target, m.verb], ["intent", "settings", id, "back"]);
    [m] = key(f, "home"); assert.deepEqual([m.t, m.verb, m.target], ["intent", "room:home", id]);
  }
});

test("the sleep row's title is dimmed when it cannot act and in the loss colour when it can; the detail's title follows the loss colour", { skip }, async () => {
  const col = async (sc) => { const f = await start(settingsBuild(SCENES[sc](), spec)), lg = logOf(f); return { row: (lg.type ?? []).find((t) => (t.region === "row.sleep" && t.text === "Put this realm to sleep")), lg }; };
  const a = await col("the sleep row, docked"), b = await col("the sleep row, lifted");
  assert.ok(a.row && b.row, "the row's title is set in both"); assert.notDeepEqual(a.row.colour ?? a.row, b.row.colour ?? b.row, "dimmed and not dimmed differ");
});
