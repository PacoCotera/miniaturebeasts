// The bud's own pod in the chamber (specs/station-incubator-tabs-ruling.md §4; T-20261016-28), in Node: podReq names the bud's species shell at 224 × 272, the id Pods and Cargo draw for the same species and size, and the candling light's
// overlays by id; a cross bud has its species' shell too; the step of the light is the shadow's.
//   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, podGenome } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { podReq, shadowReq, lightStep, POD } from "../src/views/incubator-props.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const T0 = 1_000_000, settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 12 };
function bud(species, cross = false) {
  const st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = st.d = st.s = 99; st.firstMibi = false; S.seedPodFromGenome(st, podGenome(frameOf(species), 3), settings, T0); const p = st.tray[0]; S.skipIdentify(st, p);
  frameOf(species).chapters.slice(0, 1).forEach((c) => S.read(st, p, c.id, settings)); assert.ok(S.grow(st, p, {}, settings, T0).ok); if (cross) st.bud.kind = "cross"; return st;
}
const take = () => { const r = []; return { req: (x) => { r.push(x); return x.id; }, r }; };

test("a founder bud requests its own species' identified pod at 224 × 272: species A asks for pod:A:i:224x272 and species B for pod:B:i:224x272", () => {
  for (const sp of ["S01", "S02", "S03"]) {
    const { req, r } = take(), st = bud(sp), q = podReq(req, st, settings, T0 + 1000);
    assert.equal(q.shell, `pod:${sp}:i:${POD.join("x")}`); assert.deepEqual(r.find((x) => x.id === q.shell), { kind: "pod", id: `pod:${sp}:i:224x272`, species: sp, state: "identified", size: [224, 272] });
  }
});
test("the shell's id is the one Pods and Cargo draw for the same species and size (the same form: pod:<species>:i:<w>x<h>)", () => {
  const st = bud("S01"), { req } = take(), q = podReq(req, st, settings, T0 + 1000);
  assert.match(q.shell, /^pod:S01:i:\d+x\d+$/); assert.equal(q.shell, "pod:S01:i:224x272");
  const form = (file, text) => assert.ok(readFileSync(path.resolve(here, "../src/views", file), "utf8").includes(text), `${file} builds its pod id as ${text}`);
  form("cargo-props.mjs", "id: `pod:${sp ?? \"-\"}:${q.idd ? \"i\" : \"s\"}:${podSize.join(\"x\")}`"); form("pods-props.mjs", "id: `pod:${S.speciesOf(cur)}:i:${box.join(\"x\")}`");
});
test("each stage requests its overlay: the three lights, the seams for ready, the two cracks for the hatch; the light steps with the wait", () => {
  const st = bud("S01"), B = st.bud, { req, r } = take(), q = podReq(req, st, settings, T0 + 1000);
  for (const k of ["cool", "warm", "glowing", "seams", "crack1", "crack2"]) { const id = q[k], item = r.find((x) => x.id === id); assert.ok(item && item.kind === "slot" && item.size[0] === 224 && item.size[1] === 272, k); }
  assert.deepEqual([q.cool, q.warm, q.glowing, q.seams, q.crack1, q.crack2], ["incubator-shell-cool", "incubator-shell-warm", "incubator-shell-glowing", "incubator-shell-seams", "incubator-shell-crack-1", "incubator-shell-crack-2"]);
  const at = (f) => lightStep(st, settings, T0 + f * B.minutes * 60000);
  assert.deepEqual([at(0.1), at(0.33), at(0.34), at(0.66), at(0.67), at(0.99), at(1)], ["cool", "cool", "warm", "warm", "glowing", "glowing", "ready"]);
  assert.equal(podReq(take().req, st, settings, T0 + B.minutes * 60000).step, "ready"); assert.equal(shadowReq((x) => x, st, settings, T0 + 1000).step, "cool", "the shadow takes the same step");
});
test("a cross bud has its species' shell too (the home moss: no layer for a place's dust is painted)", () => {
  const st = bud("S03", true), { req } = take(); assert.equal(st.bud.kind, "cross"); assert.equal(podReq(req, st, settings, T0 + 1000).shell, "pod:S03:i:224x272");
});
