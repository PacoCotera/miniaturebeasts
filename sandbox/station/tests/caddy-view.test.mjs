// The Caddy's e-paper on the play page (specs/station-dock-arrival-spec.md §5; play/src/caddy.mjs): each dock state's two lines, every line ≤ 744 px with its icons by the real measurer, one partial
// refresh per change and none for the same state, and the Station's side of it: what the last opening brought (kept until the next dock or lift, ✓ Skip included) and the Companion's partner.
//   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createMeasure } from "../../ui/specs/measure.mjs";
import { caddyLines, caddyLayout, createPaper, quantize, LINE_MAX, MARGIN, ICON } from "../../play/src/caddy.mjs";
import { setFrames, podGenome, frameOf } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { G, UI, SPECS } from "../src/game.mjs";
import { createHost, onFaceMessage } from "../src/host.mjs";
import { INTENTS } from "../src/intents/index.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), specs = path.resolve(here, "../../ui/specs/station"), fdir = path.resolve(here, "../../workbench/frames");
const measure = createMeasure(JSON.parse(readFileSync(path.resolve(here, "../../face/dist/metrics.json"), "utf8")));   // the real measurer (Inter 20 and 28)

test("each state's two lines (§5)", () => {
  const cases = [
    [{ docked: true, crates: 2 }, { line1: "Companion home", line2: "two crates", crates: 2 }],
    [{ docked: true, crates: 1 }, { line1: "Companion home", line2: "one crate", crates: 1 }],
    [{ docked: true, crates: 5 }, { line1: "Companion home", line2: "five crates", crates: 3 }],
    [{ docked: true, crates: 0 }, { line1: "Companion home", line2: "charging", crates: 0 }],
    [{ docked: true, crates: 0, opened: { crates: 2, newPods: 1 } }, { line1: "two crates home", line2: "one new pod", crates: 0 }],
    [{ docked: true, crates: 0, opened: { crates: 3, newPods: 2 } }, { line1: "three crates home", line2: "two new pods", crates: 0 }],
    [{ docked: true, crates: 0, opened: { crates: 1, newPods: 0 } }, { line1: "one crate home", line2: null, crates: 0 }],
    [{ docked: false, crates: 2, partner: "Moss" }, { line1: "Companion out", line2: "with Moss", crates: 0 }],
    [{ docked: false, crates: 0, partner: null }, { line1: "Companion out", line2: "exploring", crates: 0 }],
  ];
  for (const [s, want] of cases) assert.deepEqual(caddyLines(s), want, JSON.stringify(s));
  assert.deepEqual(caddyLines(null), { line1: "Companion out", line2: "exploring", crates: 0 }, "no state yet reads as out");
});

test("every line fits 744 px with its icons (24 px margins), by the real measurer; the icon slots are 32 × 32, 12 after the text and 8 apart", () => {
  const longest = [{ docked: true, crates: 9 }, { docked: true, crates: 0, opened: { crates: 12, newPods: 12 } }, { docked: false, partner: "Wwwwwwwwww" }, { docked: false }];   // a name is at most 10 letters (namer.json nameMax)
  for (const s of longest) {
    const L = caddyLayout(caddyLines(s), measure);
    assert.ok(L.line1.x + L.line1.w - MARGIN <= LINE_MAX, "line 1: " + L.line1.text);
    if (L.line2) { const end = L.crates.length ? L.crates.at(-1)[0] + ICON.size : L.line2.x + L.line2.w; assert.ok(end - MARGIN <= LINE_MAX, "line 2: " + L.line2.text + " ends at " + end); }
  }
  const L = caddyLayout(caddyLines({ docked: true, crates: 3 }), measure), w2 = measure("three crates", 20);
  assert.deepEqual(L.crates, [[24 + w2 + 12, 140, 32, 32], [24 + w2 + 12 + 40, 140, 32, 32], [24 + w2 + 12 + 80, 140, 32, 32]]);
  assert.deepEqual(L.companion, [24, 76, 32, 32]); assert.deepEqual([L.line1.x, L.line1.capTop, L.line1.px, L.line2.x, L.line2.capTop, L.line2.px], [64, 80, 28, 24, 148, 20]);
  assert.throws(() => caddyLayout({ line1: "W".repeat(60), line2: null, crates: 0 }, measure), /over 744/, "a line that does not fit fails with the string");
});

test("e-paper: one partial refresh per change, none for the same state, and no animation (each draw is the whole new frame at once)", () => {
  const drawn = [], paper = createPaper((L) => drawn.push(L.line1.text + " / " + (L.line2 ? L.line2.text : "")), measure);
  const seq = [{ docked: false }, { docked: false }, { docked: true, crates: 2 }, { docked: true, crates: 2 }, { docked: true, crates: 0, opened: { crates: 2, newPods: 1 } }, { docked: true, crates: 0, opened: { crates: 2, newPods: 1 } }, { docked: false, partner: "Moss" }];
  const changed = seq.map((s) => paper.show(s));
  assert.deepEqual(changed, [true, false, true, false, true, false, true]); assert.equal(paper.refreshes, 4);
  assert.deepEqual(drawn, ["Companion out / exploring", "Companion home / two crates", "two crates home / one new pod", "Companion out / with Moss"]);
  assert.deepEqual([0, 42, 43, 127, 128, 212, 213, 255].map(quantize), [0, 0, 85, 85, 170, 170, 255, 255], "four grays by v1's rule, level = floor((luma + 42) / 85)");
});

// ---- the Station's side: the state it posts (main.mjs caddyState: opened, partner) ----
setFrames(readdirSync(fdir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(fdir, f), "utf8"))));
for (const k of ["frame", "pods", "home", "cargo", "create", "vivarium", "habitat", "namer", "incubator"]) SPECS[k] = JSON.parse(readFileSync(path.join(specs, k + ".json"), "utf8"));
const rig = () => {
  G.st = S.freshSt("w1", 1, 1000); S.normalize(G.st); G.sv = { v: 8, seed: 7, wid: "w1", turn: 0, bay: [], mibis: [], carried: [], tier: 1, shield: 3, st: G.st }; UI.idle = false; UI.resting = false; UI.caddyOpened = null; UI.skip = null;
  let t = 0; const h = createHost({ send: () => {}, nowMs: () => t, light: () => "day", motion: () => true }); h.save = () => {};
  const crate = (id, n) => ({ id, n, turn: 2, at: 0, e: 3, d: 2, s: 4, pods: [], met: [], explored: 0, of: 0, lines: [] });
  G.sv.bay = [crate("c1", 1), crate("c2", 2)]; G.st.dock = { docked: true, at: 0 }; UI.screen = "cargo"; UI.cargo.state = "bay"; UI.cargo.run = null; h.pendingDock = false;
  return { h, at: (ms) => { t = ms; h.frame(); } };
};
test("the opening's end records what it brought for the Caddy (crates opened, new pods), ✓ Skip included; the next dock or lift clears it", () => {
  { const { h, at } = rig(); at(0); onFaceMessage(h, { t: "intent", seq: 1, screen: "cargo", target: "room", verb: "confirm" }); assert.equal(UI.caddyOpened, null, "not before the end");
    at(3820); assert.deepEqual(UI.caddyOpened, { crates: 2, newPods: 0 }); assert.deepEqual(caddyLines({ docked: true, crates: 0, opened: UI.caddyOpened }), { line1: "two crates home", line2: null, crates: 0 });
    at(4000); INTENTS.frame.dock(h); assert.equal(UI.caddyOpened, null, "the lift clears it"); }
  { const { h, at } = rig(); at(0); onFaceMessage(h, { t: "intent", seq: 1, screen: "cargo", target: "room", verb: "confirm" }); at(500); onFaceMessage(h, { t: "intent", seq: 2, screen: "cargo", target: "room", verb: "confirm" }); onFaceMessage(h, { t: "intent", seq: 3, screen: "cargo", target: "room", verb: "confirm" });
    assert.deepEqual(UI.caddyOpened, { crates: 2, newPods: 0 }, "a skip records it too"); }
  { const { h, at } = rig(); at(0); onFaceMessage(h, { t: "intent", seq: 1, screen: "cargo", target: "room", verb: "confirm" }); at(500); onFaceMessage(h, { t: "intent", seq: 2, screen: "cargo", target: "room", verb: "back" });
    assert.deepEqual(UI.caddyOpened, { crates: 1, newPods: 0 }, "← records the crate that was open, the other waits sealed"); }
});
test("the partner the lifted line names: the lead if carried and grown, else the first grown mibi with the Companion, else none", () => {
  rig(); const mk = (id, name, grown) => ({ id, name, sp: 0, born: 0, ...(grown ? { grownTurn: 0 } : { bonded: true }) });   // grownTurn: an adult; bonded with no grownTurn: a juvenile (stageAt)
  G.st.mibis = [mk(1, "Moss", false), mk(2, "Fern", true), mk(3, "Pip", true)];
  const name = () => S.partnerOf(G.st, G.sv)?.name ?? null;
  G.sv.carried = [1, 2, 3]; G.sv.lead = 3; assert.equal(name(), "Pip", "the lead, carried and grown");
  G.sv.lead = 1; assert.equal(name(), "Fern", "a lead not grown gives way to the first grown mibi with the Companion");
  G.sv.lead = null; G.sv.carried = [1]; assert.equal(name(), null, "none grown: exploring");
  G.sv.carried = [2]; G.sv.lead = 3; assert.equal(name(), "Fern", "a lead not carried does not count");
  G.sv.carried = []; assert.equal(name(), null, "none carried: exploring");
});
