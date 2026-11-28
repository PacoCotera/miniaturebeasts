// The nursery's props and its keys (station step 5; the accepted walk-4 pictures 9a, 9b and 10): the shelf in rows by origin, three capsules in their three states, the pod's page with Grow it, the way back, and the
// progress of a growing capsule (#18) the same whether the Companion is here or away.
//   node --test prototypes/station/tests/nursery-props.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import * as N from "../src/nursery.mjs";
import { podsProps } from "../src/views/pods-props.mjs";
import { intent } from "../src/intents/pods.mjs";
import { createFocus } from "../../ui/focus.mjs";
S.useNameList("en-short-1");

const here = path.dirname(fileURLToPath(import.meta.url)), ui = (f) => JSON.parse(readFileSync(path.resolve(here, "../../ui/specs/station", f), "utf8"));
const spec = ui("pods.json"), frame = ui("frame.json"), Z = spec.regions.page.nursery, Sg = spec.strings.nursery;
setFrames(readdirSync(path.resolve(here, "../../species/frames")).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.resolve(here, "../../species/frames", f), "utf8"))).filter((f) => !f.species.draft));
const settings = { ...S.DEFAULT_SETTINGS }, T0 = Date.UTC(2026, 10, 22, 12), MIN = 60000;
const crate = (n, pods) => ({ id: "x" + n, n, turn: n, at: 0, e: 0, d: 0, s: 0, pods, met: [], explored: 5, of: 20, lines: [] });
const podOf = (i, g, gs) => ({ id: "p" + i, sp: 0, g, how: "calm", gs, k: null });
function home(pods) { const st = S.freshSt("w1", 0, T0); S.normalize(st, T0); const sv = { v: 8, seed: 7, wid: "w1", turn: 1, bay: [crate(1, pods)], mibis: [], with: null, tier: 1, shield: 3 }; S.dockKey(st, sv, settings, T0); S.openBay(st, sv, settings, T0); return { st, sv }; }
const base = (over = {}) => ({ view: "nursery", focus: createFocus({}, null), ...over });
const props = (st, u, now = T0) => podsProps({ st, settings, ui: u, focus: null, now }, spec, frame);
const texts = (b) => b.props.regions.page.scale.texts.map((t) => t.text);
// a host stand-in for the intents: what they call and say
function host(st, sv, u) { const said = [], going = []; return { st, sv, settings, ui: { pods: u, screen: "pods", inc: {}, hab: {}, home: {}, viv: {} }, specs: { pods: spec }, now: () => T0, save() {}, say: (t) => said.push(t), play() {}, at() {}, goto: (s) => going.push(s), said, going, motion: () => false, holding: () => false }; }

test("the nursery is the page state: the stage is one picture and the words are a list over it", () => {
  const { st } = home([podOf(0, "pond", 1), podOf(1, "meadow", 2), podOf(2, "rock", 3)]);
  const b = props(st, base()); assert.equal(b.props.state, "page");
  assert.match(b.props.regions.page.stage, /^nursery:/); assert.ok(texts(b).includes(Sg.title)); assert.ok(texts(b).includes(Sg.onShelf));
  assert.ok(texts(b).some((t) => t === "3 on the shelf"), "the pill says how many pods wait: " + texts(b).join(" | "));
  assert.ok(texts(b).includes(Sg.keep), "pods keep for good, said");
});

test("three capsules, three states: ready to hatch, growing with its time left, free", () => {
  const { st } = home([podOf(0, "pond", 1), podOf(1, "pond", 2)]);
  S.growPod(st, st.tray[0], settings, T0 - 60 * MIN); S.growPod(st, st.tray[0], settings, T0 - 2 * MIN);
  const t = texts(props(st, base(), T0));
  assert.ok(t.includes(Sg.readyToHatch), "ready to hatch: " + t.join(" | ")); assert.ok(t.some((x) => /^\d+ min$/.test(x)), "the time left: " + t.join(" | ")); assert.ok(t.includes(Sg.free));
});

test("the same capsule says the same time whether the Companion is here or away: it reads the clock", () => {
  const { st, sv } = home([podOf(0, "pond", 1)]); S.growPod(st, st.tray[0], settings, T0);
  const a = texts(props(st, base(), T0 + 3 * MIN)); S.dockKey(st, sv, settings, T0 + 3 * MIN); S.dockKey(st, sv, settings, T0 + 3 * MIN);
  assert.deepEqual(texts(props(st, base(), T0 + 3 * MIN)), a);
  const later = texts(props(st, base(), T0 + 4 * MIN)).find((x) => /min$/.test(x)), now = a.find((x) => /min$/.test(x)); assert.notEqual(later, now, "and it moves with the clock");
});

test("three young in three capsules: the nursery says so in one line", () => {
  const { st } = home([podOf(0, "pond", 1)]); st.caps = [{ young: 1 }, { young: 2 }, { young: 3 }];
  assert.ok(texts(props(st, base())).includes(Sg.allYoung));
});

test("forty pods are a few rows with counts, six on screen at most; the shelf scrolls", () => {
  const places = ["meadow", "pond", "rock", "wood", "cave"], { st } = home(Array.from({ length: 40 }, (_, i) => podOf(i, places[i % 5], 100 + i)));
  const rows = N.shelfRows(st); assert.ok(rows.length <= 6, "rows " + rows.length); assert.ok(rows.every((r) => r.count >= 2));
  const b = props(st, base({ ring: { z: "shelf", i: rows.length - 1 } })); assert.equal(b.first, Math.max(0, rows.length - Z.shelf.visible), "the ring's row is in view");
});

test("a gold tag marks the rows that bring something new, and those rows come first", () => {
  const { st } = home([podOf(0, "pond", 1), podOf(1, "meadow", 2), podOf(2, "rock", 3)]); const rows = N.shelfRows(st);
  const t = texts(props(st, base())); assert.equal(t.filter((x) => x === Sg.newToYou).length, rows.filter((r) => r.isNew).length);
  assert.ok(rows[0].isNew || rows.every((r) => !r.isNew));
});

test("the way back is named on every page: where she is and how she came", () => {
  const { st } = home([podOf(0, "pond", 1)]);
  assert.ok(texts(props(st, base({ from: "home" }))).some((x) => x === "Back goes to the " + frame.strings.titles.vivarium), "the nursery names the screen ← returns to");
  const row = N.shelfRows(st)[0], t = texts(props(st, base({ view: "pod", podKey: row.key })));
  assert.ok(t.includes("Back goes to the " + Sg.crumb), "the pod's page names the nursery: " + t.join(" | "));
  assert.ok(t.includes(spec.strings.podpage.title) && t.includes(spec.strings.podpage.grow), "the pod's page names itself and its one act: " + t.join(" | "));
});

test("a pod's page: Grow it spends nothing, takes a capsule and goes back to the nursery with the ring on the capsule", () => {
  const { st, sv } = home([podOf(0, "pond", 1), podOf(1, "pond", 2)]), u = base(), h = host(st, sv, u), before = { e: st.e, d: st.d, s: st.s };
  intent(h, "rail.0", "confirm");   // the ring starts on the shelf's first row: ✓ looks closer
  assert.equal(u.view, "pod"); const row = N.shelfRows(st)[0]; assert.equal(u.podKey, row.key);
  intent(h, "rail.0", "confirm");   // Grow it
  assert.equal(u.view, "nursery"); assert.deepEqual({ e: st.e, d: st.d, s: st.s }, before); assert.equal(st.tray.length, 1); assert.deepEqual(u.ring, { z: "caps", i: 0 }); assert.ok(S.capsuleBuds(st).length === 1);
  assert.ok(h.said.some((x) => /ready/i.test(x)), "the plate says when it is ready");
});

test("letting a pod go takes two presses of ✓ on its page; ← goes back to the shelf on the same row", () => {
  const { st, sv } = home([podOf(0, "pond", 1), podOf(1, "meadow", 2)]), u = base(), h = host(st, sv, u);
  intent(h, "rail.0", "step:down"); intent(h, "rail.0", "confirm"); assert.equal(u.view, "pod");
  intent(h, "rail.0", "step:down"); assert.equal(u.act, "letgo"); intent(h, "rail.0", "confirm"); assert.equal(st.tray.length, 2, "the first ✓ only asks"); intent(h, "rail.0", "confirm"); assert.equal(st.tray.length, 1);
  assert.equal(u.view, "nursery", "its row is gone: back to the shelf");
  intent(h, "rail.0", "confirm"); intent(h, "rail.0", "back"); assert.equal(u.view, "nursery"); assert.deepEqual(u.ring, { z: "shelf", i: 0 });
});

test("the pad: ▲ from the first row to the capsules, ◀ ▶ among them, ▼ back to the shelf; ◀ ▶ on the shelf change the order", () => {
  const { st, sv } = home([podOf(0, "pond", 1), podOf(1, "meadow", 2)]), u = base(), h = host(st, sv, u);
  intent(h, "rail.0", "step:up"); assert.equal(u.ring.z, "caps"); intent(h, "rail.0", "step:right"); assert.equal(u.ring.i, 1); intent(h, "rail.0", "step:down"); assert.equal(u.ring.z, "shelf");
  intent(h, "rail.0", "step:right"); assert.equal(u.order, "parents"); intent(h, "rail.0", "step:left"); assert.equal(u.order, "newest");
});

test("← from the nursery goes back the way the player came", () => {
  const { st, sv } = home([podOf(0, "pond", 1)]), u = base({ from: "library" }), h = host(st, sv, u); intent(h, "rail.0", "back"); assert.deepEqual(h.going, ["library"]);
});

test("a ready capsule hatches on ✓ as today (the Incubator's hatch, on that capsule); a growing or free one says what it is", () => {
  const { st, sv } = home([podOf(0, "pond", 1)]); S.growPod(st, st.tray[0], settings, T0 - 60 * MIN);
  const u = base({ ring: { z: "caps", i: 0 } }), h = host(st, sv, u); h.ui.inc = {}; h.ui.arrival = null; h.specs.incubator = ui("incubator.json");
  intent(h, "rail.0", "confirm"); assert.ok(h.going.includes("incubator"), "the hatch's screen opens on the ready capsule");
  const h2 = host(st, sv, base({ ring: { z: "caps", i: 2 } })); intent(h2, "rail.0", "confirm"); assert.deepEqual(h2.said, [Sg.plateFree]);
});
