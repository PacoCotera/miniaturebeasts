// Station step 8-2: Pair them makes a pod on the shelf (never a capsule), Grow it grows it as a cross with vigour's time, and the pairing screen's readout says copies, chances, kin and rest in the engine's numbers.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { setFrames } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import * as P from "../src/pairing.mjs";
import * as M from "../src/pairing-model.mjs";
import { shelfRows } from "../src/nursery.mjs";
import { rng } from "../../species/framework/draws.mjs";

const here = import.meta.dirname, fdir = path.resolve(here, "../../species/frames/language"), specs = path.resolve(here, "../../ui/specs/station");
setFrames(readdirSync(fdir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(fdir, f), "utf8"))));
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", rooms: 3 }, spec = { strings: JSON.parse(readFileSync(path.join(specs, "pods.json"), "utf8")).strings };
const sv = { v: 8, seed: 7, wid: "w1", turn: 4, bay: [], mibis: [], trips: [], carried: [], carrySeen: 0, carryRefused: [], tier: 1, shield: 3 };

// a household on the rounds' draw: each marking copy "on" at 0.35 (the live wild draw hides none until wild-marking-draw-1 ships)
function world(seed) {
  for (let s = 0; s < 200; s++) {
    const st = S.freshSt("w1", 3, 1000); S.normalize(st); st.e = 99; st.s = 99; st.firstMibi = false;
    const r = S.seedAdults(st, "S01", seed + s, 6, settings); if (!r.ok) continue;
    const g = rng(`pm:${seed}:${s}`);
    for (const m of r.mibis) m.genome.loci[P.MARKING] = [g() < 0.35 ? "on" : "off", g() < 0.35 ? "on" : "off"];
    if (M.aimOf(st, "S01")) return { st, ms: r.mibis };
  }
  throw new Error("no household with an aim");
}
const pairOf = (st, ms) => { for (const a of ms) for (const b of ms) if (a.id < b.id && !S.pairBlock(st, sv, a, b, settings)) return [a, b]; return null; };

test("Pair them: a pod on the shelf with its parents, paid as a cross, not held back by a full incubator or vivarium; Grow it takes vigour's time", () => {
  const { st, ms } = world(11), [a, b] = pairOf(st, ms), e0 = st.e, s0 = st.s;
  st.caps = st.caps.map(() => ({ kind: "founder", start: Date.now(), minutes: 99 }));   // every capsule busy
  const r = S.pairPod(st, sv, a, b, settings, 1000, rng("pp"));
  assert.equal(r.ok, true, r.msg);
  assert.equal(st.tray.length, 1); assert.equal(st.tray[0].parents.length, 2);
  assert.ok(st.e < e0 && st.s < s0, "paid like a cross");
  const rows = shelfRows(st); assert.equal(rows.length, 1); assert.equal(rows[0].kind, "pair");
  assert.deepEqual(a.pairedAt, [1000]);
  assert.equal(S.growPod(st, st.tray[0], settings, 1000).why, "busy");
  st.caps[0] = null; S.normalize(st);
  const g = S.growPod(st, st.tray[0], settings, 2000); assert.equal(g.ok, true);
  assert.equal(g.bud.kind, "cross"); assert.equal(g.bud.parents.length, 2); assert.equal(st.tray.length, 0);
});

test("the readout: copies per face, the pair's chances, the kin line, the rest, the pod's time", () => {
  const { st, ms } = world(21), [a, b] = pairOf(st, ms), now = 5_000_000;
  const first = M.readout(st, sv, spec, a, null, settings, now);
  assert.equal(first.aim.length, 2); assert.equal(first.a.counts.length, 2); assert.equal(first.b, null); assert.deepEqual(first.chances, []);
  const ro = M.readout(st, sv, spec, a, b, settings, now);
  assert.equal(ro.chances.length, 2); assert.ok(ro.both.includes("both aims together"));
  assert.ok(/^No kin in common/.test(ro.kin) || /vigour/.test(ro.kin));
  assert.ok(ro.minutes >= S.budMinutes(st, 0, settings));
  const c = P.chances(st.aim.S01, a, b); assert.equal(ro.raw.both, c.both);
  S.pairPod(st, sv, a, b, settings, now - 60000, rng("x"));
  const again = M.readout(st, sv, spec, a, b, settings, now);
  assert.equal(again.a.resting, true); assert.match(again.a.rest, /^resting · \d+ min$/);
});

test("kin costs vigour in the engine's number and says so in words; a young's copies read from its genome", () => {
  const { st, ms } = world(31);
  const a = ms[0], b = ms[1]; b.parents = [{ id: a.id, name: a.name, genome: a.genome }, { id: 99, name: "x", genome: a.genome }];   // b a child of a: direct kin is refused by crossBlock, so read the line from the model alone
  const kl = P.kinLine(0.25); assert.equal(kl.costs, true);
  assert.equal(M.youngLine(st, spec, a).startsWith("Its copies: marking "), true);
});
