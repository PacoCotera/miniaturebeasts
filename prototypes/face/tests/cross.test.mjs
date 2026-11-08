// Cross (cross.json; views/cross-props.mjs; intents/cross.mjs; screens/cross.c): the face on the WebAssembly build. Every scene draws with no error and no refusal, no two words overlap, the overview's module words stay in their modules
// and the chapter view's plates and words stay on the screen, the pad is a stepper on the one target (each of the four keys says step:<key> on the partner and moves no pixel), ✓ and ← and the room keys say their intents, and the
// ring is on the partner's head in both states. The props are the Station's own (the rules, not hand-made). Skipped when the face has not been built (build.sh).
//   node --test prototypes/face/tests/cross.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import * as S from "../../station/src/state.mjs";
import { crossBuild } from "../../station/src/views/cross-props.mjs";
import { bootFace } from "../../station/src/face-lvgl.mjs";
import { setFrames, frameOf } from "../../station/src/genome.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist"), built = existsSync(path.join(dist, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
const specs = path.resolve(here, "../../ui/specs/station"), J = (n) => JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8")), spec = J("cross"), frameSpec = J("frame"), pods = J("pods");
const palette = JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours;
setFrames(readdirSync(path.resolve(here, "../../workbench/frames/language")).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.resolve(here, "../../workbench/frames/language", f), "utf8"))));
const T0 = 1_000_000, settings = { ...S.DEFAULT_SETTINGS, economy: "decided" };

function model(o = {}) {
  const st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = 99; st.d = 99; st.s = 99; st.firstMibi = false; const species = o.species ?? "S01", r = S.seedAdults(st, species, o.seed ?? 11, o.n ?? 2, settings), fr = frameOf(species);
  const [a, b] = r.mibis; a.read = fr.chapters.slice(0, o.ra ?? fr.chapters.length).map((c) => c.id); if (b) b.read = fr.chapters.slice(0, o.rb ?? fr.chapters.length).map((c) => c.id);
  return { st, sv: { v: 8, seed: 7, wid: "w1", turn: 3, bay: [], mibis: [], carried: [], tier: 1, shield: 3 }, settings, ui: { aId: a.id, bId: b?.id ?? null, state: o.state ?? 0, clash: [] }, light: "day" };
}
const SCENES = {
  "the overview, every chapter read": () => model(),
  "the overview, a parent short": () => model({ ra: 4, rb: 2 }),
  "the overview, the biggest frame (S03)": () => model({ species: "S03" }),
  "a chapter with switches and blends": () => model({ state: 1 }),
  "a chapter a parent has not read": () => model({ ra: 3, rb: 1, state: 2 }),
  "the tallest chapter (S09's Coat)": () => model({ species: "S09", state: 1 }),
  "no partner": () => model({ n: 1 }),
};

async function start(m) {
  const b = crossBuild(m, spec, pods), f = await bootFace(pathToFileURL(dist + "/"), { test: true });
  assert.equal(f.send({ t: "palette", name: "station", colours: palette }), 0);
  for (const [n, j] of [["frame", frameSpec], ["cross", spec]]) assert.equal(f.send({ t: "spec", screen: n, json: j }), 0);
  f.t = 0; f.motion = false; f.build = b;
  assert.equal(f.props({ screen: "cross", ...b.props, motion: false, frame: { top: { title: "Cross", turn: 4, materials: { e: 1, d: 2, s: 3 }, flash: {}, companion: { docked: true } }, line: { ...b.line }, plate: { text: "" } } }), 0, f.errors().join("; "));
  frames(f); return f;
}
const frames = (f, n = 2) => { for (let i = 0; i < n; i++) f.frame((f.t += 16)); };
const logOf = (f) => { let lg = null; for (let m; (m = f.poll("log"));) lg = m; return lg; };
const key = (f, k) => { f.send({ t: "key", k }); frames(f); const out = []; for (let m; (m = f.poll());) if (m.t === "focus" || m.t === "intent") out.push(m); return out; };
const overlap = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];

for (const [name, mk] of Object.entries(SCENES)) {
  test(`the face draws Cross, ${name}: no error, no refusal, no two words overlap, the words stay on the screen, the ring on the partner`, { skip }, async () => {
    const f = await start(mk()), lg = logOf(f);
    assert.deepEqual(f.errors(), []); assert.equal(f.refused(), f.build.props.regions.rail?.tabs.length ?? 0, "nothing is refused but the rail's tab grounds, which this test does not send");
    const type = (lg.type ?? []).filter((t) => t.rect && t.text && !/^(top|line|plate|rail)/.test(t.region)), body = type.filter((t) => t.rect[1] >= 40 && t.rect[1] < 562);
    for (let i = 0; i < body.length; i++) {
      assert.ok(body[i].rect[0] >= 0 && body[i].rect[0] + body[i].rect[2] <= 1024, `"${body[i].text}" leaves the screen`);
      for (let j = i + 1; j < body.length; j++) if (body[i].region !== "rail.tab" && body[j].region !== "rail.tab") assert.ok(!overlap(body[i].rect, body[j].rect), `"${body[i].text}" and "${body[j].text}" overlap`);
    }
    const ring = (lg.regions ?? []).filter((r) => r.id === "focus"); assert.equal(ring.length, 1, "one ring");
    const box = f.build.props.state === "chapter" ? spec.regions.heads.chapter.b.ring : spec.regions.heads.overview.b.ring; assert.deepEqual(ring[0].rect, [box[0] - 5, box[1] - 5, box[2] + 10, box[3] + 10], "the ring is on the partner's head");
    if (f.build.props.state === "overview" && f.build.props.regions.overview) {
      for (const t of type.filter((x) => /^ov\.\d+\.a\.word/.test(x.id ?? x.region))) assert.ok(t.rect[0] >= 16 && t.rect[0] + t.rect[2] <= 128, `module word "${t.text}"`);
    }
  });
}

test("the overview's rows fit the 440 on every frame at its worst: the words and wires stay between y 112 and 552", { skip }, async () => {
  for (const id of ["S03", "S09", "S16"]) {
    const f = await start(model({ species: id })), lg = logOf(f);
    for (const r of (lg.regions ?? []).filter((x) => /^ov\./.test(x.id))) assert.ok(r.rect[1] >= 112 && r.rect[1] + r.rect[3] <= 552, `${id}: ${r.id} ${r.rect}`);
  }
});

test("the pad is a stepper on the partner: each key says step:<key> and no pixel moves; ✓ ← and the room keys say their intents on the partner", { skip }, async () => {
  for (const state of [0, 2]) {
    const f = await start(model({ state })), before = f.hash();
    for (const v of spec.focus.vectors.filter((x) => /^step:/.test(x.intent))) { const out = key(f, v.key); assert.equal(out.length, 1, v.key); assert.deepEqual([out[0].t, out[0].screen, out[0].target, out[0].verb], ["intent", "cross", "partner", v.intent], v.key); assert.equal(f.hash(), before, `${v.key}: nothing redrawn`); }
    let [m] = key(f, "confirm"); assert.deepEqual([m.t, m.screen, m.target, m.verb], ["intent", "cross", "partner", "confirm"]);
    [m] = key(f, "back"); assert.deepEqual([m.t, m.screen, m.target, m.verb], ["intent", "cross", "partner", "back"]);
    [m] = key(f, "home"); assert.deepEqual([m.t, m.verb, m.target], ["intent", "room:home", "partner"]);
  }
});
