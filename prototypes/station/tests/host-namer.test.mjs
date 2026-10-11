// The meet and the namer on the host (habitat.json events.meet, namer.json): the meet persists until the first press, the first ✓ in it opens the namer with the ring on Done, the namer is the only graph while it is open (habitat's intents and
// focus are dropped, a room key closes it), Done closes it with the ring on the resident (the name tag after a rename) and plays the named flash on the tag, ← walks back through the field and closes it on an empty one, and a namer message after
// it closed is dropped.
//   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { G, UI, SPECS } from "../src/game.mjs";
import { createHost, onFaceMessage } from "../src/host.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), fdir = path.resolve(here, "../../workbench/frames"), specs = path.resolve(here, "../../ui/specs/station");
setFrames(readdirSync(fdir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(fdir, f), "utf8"))));
for (const k of ["frame", "pods", "home", "cargo", "create", "vivarium", "habitat", "namer"]) SPECS[k] = JSON.parse(readFileSync(path.join(specs, k + ".json"), "utf8"));
const rig = ({ motion = true } = {}) => {
  const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 8 };
  G.st = S.freshSt("w1", 3, 1000); S.normalize(G.st); G.st.firstMibi = false; G.settings = settings; S.seedAdults(G.st, "S01", 5, 3, settings); for (const m of G.st.mibis) m.paint = { state: "landed" };
  G.sv = { v: 8, seed: 7, wid: "w1", turn: 3, bay: [], mibis: [], carried: [], tier: 1, shield: 3, carryReqs: [], st: G.st };
  const m = G.st.mibis[0]; UI.screen = "habitat"; UI.idle = false; UI.resting = false; UI.hab = { id: m.id, f: "resident", wildArm: 0, namer: null, prev: null }; UI.meet = m.id;
  const sent = []; let t = 0; const h = createHost({ send: (x) => sent.push(x), nowMs: () => t, light: () => "day", motion: () => motion }); h.save = () => {};
  return { h, sent, m, at: (ms) => { t = ms; h.frame(); } };
};
const on = (h, screen, target, verb) => onFaceMessage(h, { t: "intent", seq: 1, screen, target, verb });
const typeKeys = (h, ...cs) => { for (const c of cs) { const n = UI.hab.namer, i = SPECS.namer.keys.pages.letters.indexOf(c.toLowerCase()); on(h, "namer", "key." + i, "confirm"); void n; } };

test("the meet lasts until the first press; its ✓ opens the namer over it, the ring on Done, the field holding the name selected", () => {
  const { h, m, at } = rig(); at(0);
  onFaceMessage(h, { t: "focus", screen: "habitat", target: "resident" }); assert.equal(UI.meet, null, "a focus message is a press");
  UI.meet = m.id; on(h, "habitat", "resident", "confirm");
  assert.equal(UI.meet, null, "✓ ends the meet"); assert.deepEqual([UI.hab.namer.mode, UI.hab.namer.f, UI.hab.namer.fs, UI.hab.namer.text], ["meet", "act.done", "selected", m.name]);
});
test("while the namer is open habitat's intents and focus are dropped and its own focus is kept; a room key closes it and opens that room", () => {
  const { h, m, at } = rig(); at(0); on(h, "habitat", "resident", "confirm");
  on(h, "habitat", "name", "confirm"); onFaceMessage(h, { t: "focus", screen: "habitat", target: "door" }); assert.equal(UI.hab.f, "resident", "habitat's focus is dropped"); assert.equal(UI.hab.namer.mode, "meet");
  onFaceMessage(h, { t: "focus", screen: "namer", target: "key.3" }); assert.equal(UI.hab.namer.f, "key.3");
  on(h, "namer", "key.3", "room:home"); assert.deepEqual([UI.screen, UI.hab.namer], ["home", null], "nothing written"); assert.equal(S.mibiById(G.st, m.id).name, m.name);
});
test("Done: the new name is written, the namer closes with the ring on the resident, the named flash is sent for the tag (hold 0 with reduced motion), and a namer message after it closed is dropped", () => {
  for (const motion of [true, false]) {
    const { h, sent, m, at } = rig({ motion }); at(0); on(h, "habitat", "resident", "confirm");
    on(h, "namer", "mod.page", "back"); assert.equal(UI.hab.namer.fs, "empty", "← clears the selection");
    typeKeys(h, "M", "o", "s"); assert.equal(UI.hab.namer.text, "Mos"); typeKeys(h, "k"); const sFlash = sent.filter((x) => x.t === "event" && x.kind === "flash");
    on(h, "namer", "act.done", "confirm");
    const nm = UI.hab.namer; assert.equal(nm, null, "closed"); assert.equal(UI.hab.f, "resident"); assert.equal(S.mibiById(G.st, m.id).name, "Mosk");
    const flash = sent.filter((x) => x.t === "event" && x.kind === "flash"); assert.equal(flash.length - sFlash.length, 1, "the flash event is sent"); assert.deepEqual([flash.at(-1).target, flash.at(-1).ms, flash.at(-1).hold], ["nameTag", SPECS.namer.events.named.ms, motion ? SPECS.namer.events.named.hold : 0], "reduced motion sends hold 0 (the face draws no flash)");
    const before = S.mibiById(G.st, m.id).name; on(h, "namer", "key.0", "confirm"); assert.equal(S.mibiById(G.st, m.id).name, before, "dropped");
  }
});
test("Keep (Done on the name as it stands) writes nothing and plays no flash; Rename from the name tag closes on the name; ← on an empty field closes writing nothing", () => {
  const { h, sent, m, at } = rig(); at(0); UI.meet = null; on(h, "habitat", "name", "confirm"); assert.equal(UI.hab.namer.mode, "rename");
  on(h, "namer", "act.done", "confirm"); assert.deepEqual([UI.hab.namer, UI.hab.f], [null, "name"]); assert.equal(sent.some((x) => x.kind === "flash"), false); assert.equal(S.mibiById(G.st, m.id).name, m.name);
  on(h, "habitat", "name", "confirm"); on(h, "namer", "mod.page", "back"); assert.equal(UI.hab.namer.fs, "empty"); on(h, "namer", "mod.page", "back"); assert.equal(UI.hab.namer, null, "an empty field closes"); assert.equal(S.mibiById(G.st, m.id).name, m.name);
});
