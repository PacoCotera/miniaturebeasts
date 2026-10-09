// The Cross forecast shows only what the player has read, and marks everything missing (the owner, 2026-10-09: "only what you have read, and an indication of everything missing.
// so the player has an incentive to continue research"). The cross itself still draws on the whole genomes.   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import * as L from "../src/library.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), fdir = path.resolve(here, "../../workbench/frames");
setFrames(readdirSync(fdir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(fdir, f), "utf8"))));
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", sealedOpen: true };
const world = (seed = 7) => { const st = S.freshSt("w1", 3, 1); S.normalize(st); const r = S.seedAdults(st, "S01", seed, 2, settings); return { st, a: r.mibis[0], b: r.mibis[1] }; };
// A chapter of the pair whose full forecast has a switch seed with a hidden copy: the thing the leak showed.
function hiddenChapter(st, a, b) {
  const full = S.forecastOf(st, a, b, settings);
  for (const t of full.traits) if (t.kind === "switch" && t.seeds.some((s) => s.hides != null)) return { ch: t.chapter, trait: t.trait, hides: t.seeds.filter((s) => s.hides != null).map((s) => String(s.hides)) };
  return null;
}

test("founders, fully read: the forecast is whole, nothing missing, the likeness shown", () => {
  const { st, a, b } = world(); const fc = S.forecastOf(st, a, b, settings);
  assert.equal(fc.missing, 0); assert.ok(fc.traits.every((t) => t.kind === "switch" || t.kind === "blend" || t.kind === "sealed")); assert.ok(fc.identity != null);
});

test("a pair with one unread chapter: its traits are missing, name the parent and the chapter to read, and show no seed, range or hidden look; read it and they appear", () => {
  const { st, a, b } = world(); const h = hiddenChapter(st, a, b); assert.ok(h, "this pair has a hidden copy in some chapter");
  const full = S.forecastOf(st, a, b, settings), inChapter = full.traits.filter((t) => t.chapter === h.ch).map((t) => t.trait);
  a.read = a.read.filter((c) => c !== h.ch);   // the first parent has not read it
  const fc = S.forecastOf(st, a, b, settings), mine = fc.traits.filter((t) => t.chapter === h.ch);
  assert.deepEqual(mine.map((t) => t.trait), inChapter, "every trait of the chapter is still listed");
  for (const t of mine) {
    assert.equal(t.kind, "missing", t.trait); assert.deepEqual(t.missing.map((m) => [m.parent, m.id, m.name, m.chapter]), [["a", a.id, a.name, h.ch]], "which parent and which chapter");
    assert.ok(!("seeds" in t) && !("bins" in t) && !("range" in t) && !("looks" in t) && !("firm" in t), "nothing of the outcome");
  }
  assert.equal(fc.missing, mine.length, "the count of traits still unknown"); assert.equal(fc.unknown, fc.missing + fc.sealedTraits); assert.equal(fc.identity, null, "no likeness while anything is unknown");
  const others = fc.traits.filter((t) => t.chapter !== h.ch); assert.ok(others.every((t) => t.kind !== "missing"), "the read chapters are shown");
  for (const hid of h.hides) assert.ok(!JSON.stringify(mine).includes('"' + hid + '"'), "the hidden look " + hid + " does not leak from the unread chapter");
  // both parents unread: both are named
  b.read = b.read.filter((c) => c !== h.ch); const both = S.forecastOf(st, a, b, settings).traits.find((t) => t.chapter === h.ch); assert.deepEqual(both.missing.map((m) => m.parent), ["a", "b"]);
  // read it: the traits appear again, as the full forecast has them
  a.read.push(h.ch); b.read.push(h.ch); const back = S.forecastOf(st, a, b, settings);
  assert.equal(back.missing, 0); assert.deepEqual(back.traits.filter((t) => t.chapter === h.ch), full.traits.filter((t) => t.chapter === h.ch)); assert.ok(back.identity != null);
});

test("the count of missing traits grows with the unread chapters, and a sealed chapter's traits stay sealed, counted apart", () => {
  const { st, a, b } = world(); const fr = frameOf("S01"), open = fr.chapters.filter((c) => !c.sealed);
  const none = S.forecastOf(st, a, b, settings); assert.equal(none.missing, 0);
  b.read = []; const all = S.forecastOf(st, a, b, settings);
  assert.equal(all.missing, open.reduce((n, c) => n + c.traits.length, 0), "every readable trait is unknown while the second parent has read nothing"); assert.ok(all.traits.filter((t) => t.kind === "missing").every((t) => t.missing.length === 1 && t.missing[0].parent === "b"));
  const s2 = world(); const f2 = frameOf("S02"), sealed = f2.chapters.find((c) => c.sealed); assert.ok(sealed);
  const p = S.seedAdults(s2.st, "S02", 5, 2, settings).mibis, fc = S.forecastOf(s2.st, p[0], p[1], settings);
  assert.equal(fc.sealedTraits, sealed.traits.length); assert.ok(fc.traits.filter((t) => t.chapter === sealed.id).every((t) => t.kind === "sealed")); assert.equal(fc.unknown, fc.missing + fc.sealedTraits);
});

test("the wish forecast says nothing of an unread chapter, and the real cross is unchanged by what has been read", () => {
  const { st, a, b } = world(); const h = hiddenChapter(st, a, b); st.knownIds.push("S01");
  const fr = frameOf("S01"), t = fr.chapters.find((c) => c.id === h.ch).traits.find((q) => q.id === h.trait), look = L.possibleLooks(fr, t)[0];
  st.guide.S01 = st.guide.S01 || {}; st.guide.S01[t.id] = L.possibleLooks(fr, t); L.wishPin(st, "S01", t.id, look, settings);
  a.read = a.read.filter((c) => c !== h.ch); const w = L.wishForecast(st, a, b, settings), pin = w.pinned.find((p) => p.trait === t.id);
  assert.equal(pin.kind, "missing"); assert.equal(pin.lit, false); assert.deepEqual(pin.missing.map((m) => m.chapter), [h.ch]);
  // the cross draws on the whole genomes whatever the screen may say: the same seed gives the same child
  const mk = () => { const w2 = world(); w2.a.read = w2.a.read.slice(0, 1); w2.st.e = 9; w2.st.s = 9; return S.doCross(w2.st, null, w2.a, w2.b, settings, 5, (() => { let x = 3; return () => ((x = (x * 16807) % 2147483647) / 2147483647); })()); };
  const m1 = mk(), full = (() => { const w2 = world(); w2.st.e = 9; w2.st.s = 9; return S.doCross(w2.st, null, w2.a, w2.b, settings, 5, (() => { let x = 3; return () => ((x = (x * 16807) % 2147483647) / 2147483647); })()); })();
  assert.ok(m1.ok && full.ok); assert.equal(m1.bud.sha, full.bud.sha, "reading changes what is shown, not what is made");
});
