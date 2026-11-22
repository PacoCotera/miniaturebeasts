// fresh-save-amounts-1: a brand-new save starts with Energy 4, Data 6, Essence 6: enough to identify and read the first pod, pair two adults and grow a pod, with no "Needs" refusal. An old save loads unchanged.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, podGenome } from "../src/genome.mjs";
import { withSeals } from "./fixtures/sealed.mjs";
import * as S from "../src/state.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), fdir = path.resolve(here, "../../species/frames/language");
setFrames(withSeals(readdirSync(fdir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(fdir, f), "utf8")))));
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided" };

test("a fresh save starts from START", () => {
  const st = S.freshSt("w1", 0, 1); S.normalize(st);
  assert.deepEqual([st.e, st.d, st.s], [4, 6, 6]); assert.deepEqual(S.START, { e: 4, d: 6, s: 6 });
});

test("a fresh save identifies the first pod, reads its first chapter, pairs two adults and grows the pod, with no refusal", () => {
  const st = S.freshSt("w1", 3, 1000); S.normalize(st); st.firstMibi = false;   // the worst case: the growing's Essence is charged
  S.seedPodFromGenome(st, podGenome(frameOf("S01"), 3), settings, 1000); const p = st.tray[0];
  assert.equal(S.identify(st, p, settings).ok, true, "identify");
  const ch = S.readQueue(st, p, settings)[0]; assert.ok(ch, "a chapter to read");
  const r = S.read(st, p, ch.id, settings); assert.equal(r.ok, true, r.msg);
  const ad = S.seedAdults(st, "S01", 7, 2, settings), sv = { v: 8, seed: 7, wid: "w1", turn: 3, bay: [], mibis: [], with: null, tier: 1, shield: 3 };
  const g = S.grow(st, p, {}, settings, 3000); assert.equal(g.ok, true, g.msg);
  const o = S.openBud(st, sv, settings, 3000 + 1e9); assert.equal(o.ok, true, o.msg);   // the bud hatches; the incubator is free for the pairing
  const c = S.doCross(st, sv, ad.mibis[0], ad.mibis[1], settings, 3000 + 1e9); assert.equal(c.ok, true, c.msg);
  assert.ok(st.e >= 0 && st.d >= 0 && st.s >= 0, "nothing went below zero");
});

test("an old save loads unchanged: its own amounts, not topped up", () => {
  const st = S.freshSt("w1", 3, 1000); st.e = 0; st.d = 0; st.s = 0;
  const loaded = S.normalize(Object.assign(S.freshSt("w1", 3, 1000), st));
  assert.deepEqual([loaded.e, loaded.d, loaded.s], [0, 0, 0]);
  const old = S.freshSt("w1", 3, 1000); old.e = 1; old.d = 2; old.s = 3;
  const l2 = S.normalize(Object.assign(S.freshSt("w1", 3, 1000), old)); assert.deepEqual([l2.e, l2.d, l2.s], [1, 2, 3]);
});
