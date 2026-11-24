// station-step-8-round2-2 item 3 (AD 15:03): the dashed rim on a marking card matches the odds. Fixture: the rounds' draw (0.35 per marking copy), every pair of 40 households of six.
// A marking card wears the rim only when the pair cannot give that marking; a card the pair can give never wears it; and the printed chance of the aim's marking reads "never" if and only if no marking but plain can be given.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { setFrames } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import * as P from "../src/pairing.mjs";
import { podsBuild } from "../src/views/pods-props.mjs";
import { partnersOf } from "../src/views/pairing-props.mjs";
import { rng } from "../../species/framework/draws.mjs";
import { aimOf } from "../src/pairing-model.mjs";
import { CROPS } from "../src/trait-crops.mjs";
import { registerPending } from "../../ui/assets.mjs";

const here = import.meta.dirname, fdir = path.resolve(here, "../../species/frames/language"), specs = path.resolve(here, "../../ui/specs/station");
setFrames(readdirSync(fdir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(fdir, f), "utf8"))));
const pods = JSON.parse(readFileSync(path.join(specs, "pods.json"), "utf8"));
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", rooms: 3 };
const sv = { v: 8, seed: 7, wid: "w1", turn: 4, bay: [], mibis: [], trips: [], carried: [], carrySeen: 0, carryRefused: [], tier: 1, shield: 3 };
for (const id of Object.values(CROPS.S01.cards.markings.masters)) registerPending({ id, w: 304, h: 312, file: `x/${id}.png` });   // the cards' masters placed, as the game's loader does
const model = (st, ui) => ({ st, sv, settings, ui, now: 5_000_000 });

test("the dashed rim is on a marking card if and only if the pair cannot give it; the printed chance says never only when no marking can be given", () => {
  let pairs = 0, never = 0, some = 0, odd = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const st = S.freshSt("w1", 3, 1000); S.normalize(st); st.e = 99; st.s = 99; st.firstMibi = false;
    const r = S.seedAdults(st, "S01", seed * 7, 6, settings); if (!r.ok) continue;
    const g = rng(`rim:${seed}`);
    for (const m of r.mibis) m.genome.loci[P.MARKING] = [g() < 0.35 ? "on" : "off", g() < 0.35 ? "on" : "off"];
    if (!aimOf(st, "S01")) continue;
    for (const a of r.mibis) for (const bId of partnersOf(st, sv, a, settings)) {
      const v = podsBuild(model(st, { view: "pair", pair: { aId: a.id, bId } }), pods), req = v.requests.find((q) => q.kind === "pairing"), R = v.pairing.readout;
      const given = new Set(R.markings.map((q) => q.word)), isNever = /never/.test(R.chances[0]);
      pairs++; if (isNever) never++; else some++;
      assert.ok(req.cards.length >= 2, "the cards are drawn");
      for (const c of req.cards) assert.equal(c.dim, !given.has(c.word), `card ${c.word}: rim iff the pair cannot give it`);
      const named = /^the (\w+) marking: /.exec(R.chances[0]);
      if (isNever) assert.ok(named, "a never line keeps the marking's name beside its rimmed card");
      else if (named) assert.ok(given.has(named[1]), `the odds name "${named[1]}", a card the pair cannot give wears the rim`); else { assert.match(R.chances[0], /^a marking: /); odd++; }
      assert.equal(isNever, ![...given].some((w) => w !== "plain"), `printed "${R.chances[0]}" against the markings the pair can give: ${[...given].join(", ")}`);
    }
  }
  console.log(`pairs ${pairs}: printed never ${never}, some chance ${some}, odds say "a marking" ${odd}`);
  assert.ok(pairs > 20 && never > 0 && some > 0);
});
