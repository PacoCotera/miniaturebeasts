// The Library's data (M5): the field guide per species and chapter, "more?", a species unmet, met or found, the face, and the wish.
//   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, frameIds, podGenome, traitState, chapterLooks } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import * as L from "../src/library.mjs";
import { traitLooks } from "../../workbench/framework/describe.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided" };
const fresh = () => { const st = S.freshSt("w1", 3, 1000); S.normalize(st); return st; };

test("every look a pod can carry is among the looks the guide could still lack, in all sixteen frames", () => {
  for (const id of frameIds()) {
    const fr = frameOf(id);
    for (let gs = 1; gs < 40; gs++) {
      let g; try { g = podGenome(fr, gs); } catch { continue; }
      for (const ch of fr.chapters) for (const t of ch.traits) { const possible = L.possibleLooks(fr, t); for (const l of traitState(fr, t, g).carried) assert.ok(possible.includes(l), `${id} ${t.id}: "${l}" is not among ${JSON.stringify(possible)}`); }
    }
  }
});

// The looks a field guide counts are the frame's own player words (research-loop.md §4, game design 2026-10-09): a blend's bins, "between" one look, never the catalogue's pair
// labels. Two frames still name fewer looks than their pool can show, which the copywriter fills; they are listed here so a third cannot arrive unseen, and so each one is
// removed from the list the day it is fixed.
const FRAME_GAPS = { "S03:feet": "the frame names 3 of the 6 foot forms its pool can carry", "S11:head": "the frame names 3 looks for a pool of 4 head sizes" };
test("each species' look count matches its frame: every trait enumerates to the frame's own looks, bar the two listed gaps", () => {
  const seen = new Set(); let total = 0;
  for (const id of frameIds()) {
    const fr = frameOf(id); let n = 0, m = 0;
    for (const ch of fr.chapters) for (const t of ch.traits) {
      const list = traitLooks(fr, t), key = id + ":" + t.id, same = JSON.stringify(list) === JSON.stringify(t.looks || []);
      if (FRAME_GAPS[key]) { assert.ok(!same, key + " is fixed: take it off the list"); seen.add(key); continue; }
      assert.ok(same, `${key}: the guide would count ${JSON.stringify(list)}, the frame names ${JSON.stringify(t.looks)}`); n += list.length; m += (t.looks || []).length;
    }
    assert.equal(n, m, id); total += n;
  }
  assert.deepEqual([...seen].sort(), Object.keys(FRAME_GAPS).sort(), "the listed gaps are still gaps"); assert.ok(total > 500);
});

test("the Tuikis' and the Untuva's reads give the frame's words: a coat's pure colours and 'two side by side', the markings' four, 'between' for a blend's middle bin, never a pair label", () => {
  for (const id of ["S02", "S03"]) {
    const fr = frameOf(id);
    for (let gs = 1; gs < 200; gs++) { const g = podGenome(fr, gs); for (const ch of fr.chapters) for (const t of ch.traits) { if (FRAME_GAPS[id + ":" + t.id]) continue; for (const l of traitState(fr, t, g).carried) assert.ok(t.looks.includes(l), `${id} ${t.id}: "${l}" is not one of the frame's looks ${JSON.stringify(t.looks)}`); } }
  }
  const fr = frameOf("S03"), mk = fr.chapters.flatMap((c) => c.traits).find((t) => t.id === "markings"), words = new Set();
  for (let gs = 1; gs < 300; gs++) words.add(traitState(fr, mk, podGenome(fr, gs)).shows); assert.deepEqual([...words].sort(), [...mk.looks].sort(), "all four markings looks appear");
  const eyes = fr.chapters.flatMap((c) => c.traits).find((t) => t.id === "eyes"), eyeWords = new Set(); for (let gs = 1; gs < 300; gs++) eyeWords.add(traitState(fr, eyes, podGenome(fr, gs)).shows);
  assert.ok(eyeWords.has("between") && [...eyeWords].every((w) => eyes.looks.includes(w)), "'between' is the one in-between look");
});

test("a species is unmet, met (a pencil study) or found (a plate); a mibi of it or an identified pod finds it", () => {
  const st = fresh(); assert.equal(L.speciesStatus(st, "S01"), "unmet");
  st.metIds.push("S01"); assert.equal(L.speciesStatus(st, "S01"), "met");
  st.knownIds.push("S01"); assert.equal(L.speciesStatus(st, "S01"), "found");
  const st2 = fresh(); S.seedAdults(st2, "S03", 5, 1, settings); assert.equal(L.speciesStatus(st2, "S03"), "found", "a mibi of the species");
  assert.deepEqual(L.spread(st, ["S01", "S02"]).map((x) => x.status), ["found", "unmet"]);
  assert.equal(L.book(st, "S02").guide, null, "an unmet species has no guide to show");
});

test("the field guide counts looks found per chapter and trait, says more? where some are unseen, and is complete when none is", () => {
  const st = fresh(); st.knownIds.push("S01"); const fr = frameOf("S01");
  let fg = L.fieldGuide(st, "S01", settings); assert.ok(fg.unseen > 0 && !fg.complete && fg.found === 0);
  assert.ok(fg.chapters.every((c) => c.more), "nothing seen: every chapter says more?");
  const coat = fr.chapters[0], t0 = coat.traits[0], all = L.possibleLooks(fr, t0);
  S.guideAdd(st, "S01", t0.id, [all[0]]); fg = L.fieldGuide(st, "S01", settings);
  const c0 = fg.chapters[0].traits[0]; assert.deepEqual(c0.found, [all[0]]); assert.equal(c0.unseen, all.length - 1); assert.ok(c0.more);
  for (const ch of fr.chapters) for (const t of ch.traits) S.guideAdd(st, "S01", t.id, L.possibleLooks(fr, t));
  fg = L.fieldGuide(st, "S01", settings); assert.equal(fg.unseen, 0); assert.ok(fg.complete); assert.ok(fg.chapters.every((c) => !c.more));
  // one look short: oneFromFull
  S.guideAdd(st, "S01", "x", []); st.guide.S01[t0.id] = st.guide.S01[t0.id].filter((l) => l !== all[0]); assert.ok(L.fieldGuide(st, "S01", settings).oneFromFull);
});

test("a shut sealed chapter shows only its notch, but its looks count as unseen: the guide fills only after the find; once read it counts like any other", () => {
  const id = frameIds().find((s) => frameOf(s).chapters.some((c) => c.sealed)), fr = frameOf(id), sealed = fr.chapters.find((c) => c.sealed);
  const st = fresh(); st.knownIds.push(id);
  let fg = L.fieldGuide(st, id, settings), c = fg.chapters.find((x) => x.id === sealed.id); assert.ok(c.sealed, "its notch"); assert.ok(c.unseen > 0 && c.more, "its looks are unseen"); assert.ok(c.traits.every((t) => t.found.length === 0));
  for (const ch of fr.chapters) for (const t of ch.traits) if (ch !== sealed) S.guideAdd(st, id, t.id, L.possibleLooks(fr, t));
  fg = L.fieldGuide(st, id, settings); assert.ok(!fg.complete && fg.unseen === fg.chapters.find((x) => x.id === sealed.id).unseen, "everything but the sealed chapter seen: not complete");
  sealed.traits.forEach((t, i) => S.guideAdd(st, id, t.id, i === sealed.traits.length - 1 ? L.possibleLooks(fr, t).slice(0, -1) : L.possibleLooks(fr, t))); assert.ok(L.fieldGuide(st, id, settings).oneFromFull, "one look short, the sealed chapter's last");
  for (const t of sealed.traits) S.guideAdd(st, id, t.id, L.possibleLooks(fr, t)); assert.ok(L.fieldGuide(st, id, settings).complete);
  st.readOnce[id] = [sealed.id]; fg = L.fieldGuide(st, id, settings); assert.ok(!fg.chapters.find((x) => x.id === sealed.id).sealed, "read: no longer shut");
  const open = { ...settings, sealedOpen: true }; assert.ok(!L.fieldGuide(fresh(), id, open).chapters.find((x) => x.id === sealed.id).sealed, "the developer's switch opens it");
});

test("the wish pins only looks the guide holds, glints what carries them, and never touches a genome", () => {
  const st = fresh(); st.knownIds.push("S01"); const fr = frameOf("S01"), t = fr.chapters[0].traits[0], looks = L.possibleLooks(fr, t);
  assert.match(L.wishPinBlock(st, "S01", t.id, looks[0]), /field guide/, "not seen yet");
  assert.match(L.wishPinBlock(st, "S99", t.id, looks[0]), /no such species/); assert.match(L.wishPinBlock(fresh(), "S01", t.id, looks[0]), /not in the field guide/);
  assert.match(L.wishPinBlock(st, "S01", "nope", "x"), /no such trait/);
  S.seedAdults(st, "S01", 11, 2, settings); const m = st.mibis[0], before = JSON.stringify(m.genome), shown = traitState(fr, t, m.genome).shows;
  assert.ok(L.wishPin(st, "S01", t.id, shown).ok); assert.deepEqual(L.wishOf(st, "S01"), { [t.id]: shown }); assert.ok(L.wishPin(st, "S01", t.id, shown).again);
  const c = L.wishCarriers(st, "S01"); assert.ok(c.mibis.some((x) => x.id === m.id), "the mibi that shows it carries a piece of the wish"); assert.equal(L.wishHeld(st, "S01", m), 1);
  assert.equal(JSON.stringify(m.genome), before, "knowing a variant never injects it");
  assert.ok(L.wishUnpin(st, "S01", t.id).ok); assert.deepEqual(L.wishOf(st, "S01"), {}); assert.ok(!L.wishUnpin(st, "S01", t.id).ok);
  // an unread pod carries nothing for the wish
  const st2 = fresh(); st2.knownIds.push("S01"); S.guideAdd(st2, "S01", t.id, [shown]); L.wishPin(st2, "S01", t.id, shown);
  S.seedCrate(st2, "S01", 1, 3); assert.deepEqual(L.wishCarriers(st2, "S01").pods, []);
});

test("the face of a species is a portrayed mibi the player chose; a released mibi keeps its place in the book", () => {
  const st = fresh(); S.seedAdults(st, "S01", 3, 2, settings); const [a, b] = st.mibis;
  assert.match(L.makeFace(st, a).msg, /only a portrayed mibi/); assert.equal(L.faceOf(st, "S01"), null);
  a.portrait = { state: "delivered" }; b.portrait = { state: "painting" };
  assert.deepEqual(L.book(st, "S01", settings).faceChoices, [a.id]);
  assert.ok(L.makeFace(st, a).ok); assert.equal(L.faceOf(st, "S01"), a.id); assert.ok(L.makeFace(st, a).again); assert.ok(!L.makeFace(st, b).ok);
  a.released = true; assert.equal(L.faceOf(st, "S01"), a.id, "released, its portrait stays in the book");
});

test("the wish glint marks the chapter arc that holds a piece of the wish: either copy gives the pinned look, shown or hidden; read chapters only", () => {
  const st = fresh(); st.knownIds.push("S01"); const fr = frameOf("S01"); S.seedAdults(st, "S01", 5, 1, settings); const m = st.mibis[0];
  const pick = fr.chapters.flatMap((c) => c.traits.map((t) => [c, t])).find(([c, t]) => traitState(fr, t, m.genome).kind === "hides");
  assert.ok(pick, "a trait that hides a look"); const [ch, t] = pick, hidden = traitState(fr, t, m.genome).hides;
  assert.deepEqual(L.wishChapters(st, m), [], "no wish, no glint"); S.guideAdd(st, "S01", t.id, [hidden]); assert.ok(L.wishPin(st, "S01", t.id, hidden).ok);
  assert.deepEqual(L.wishChapters(st, m), [ch.id], "the hidden copy counts"); assert.ok(L.wishGlint(st, m, ch.id)); assert.ok(!L.wishGlint(st, m, "nope"));
  m.read = m.read.filter((c) => c !== ch.id); assert.deepEqual(L.wishMarks(st, m), [{ chapter: ch.id, read: false }], "a chapter not yet read is marked, as unread: where, never what");
});

test("the wish in the cross forecast: a switch lights the seeds that show the pinned look, a blend marks the pinned bin when the range reaches it; closeness is the pinned traits lit, never a number", () => {
  const st = fresh(); st.knownIds.push("S01"); const fr = frameOf("S01"); S.seedAdults(st, "S01", 21, 2, settings); const [a, b] = st.mibis, fc = S.forecastOf(st, a, b, settings);
  assert.equal(L.wishForecast(st, a, b, settings), null, "no wish pinned, nothing to light");
  const sw = fc.traits.find((x) => x.kind === "switch"), bl = fc.traits.find((x) => x.kind === "blend"), tr = (id) => fr.chapters.flatMap((c) => c.traits).find((t) => t.id === id);
  const withLoci = (loci) => ({ ...a.genome, loci: { ...a.genome.loci, ...loci } });
  const seedLook = traitState(fr, tr(sw.trait), withLoci({ [sw.locus]: sw.seeds[0].copies })).shows; S.guideAdd(st, "S01", sw.trait, [seedLook]); assert.ok(L.wishPin(st, "S01", sw.trait, seedLook).ok);
  const first = L.wishForecast(st, a, b, settings), p = first.pinned[0]; assert.equal(p.kind, "switch"); assert.ok(p.seeds.includes(0) && p.lit); assert.deepEqual(first.lit, [sw.trait]); assert.equal(first.of, 1);
  const binLook = traitState(fr, tr(bl.trait), withLoci({ [bl.locus]: [bl.bins[0], bl.bins[0]] })).shows; S.guideAdd(st, "S01", bl.trait, [binLook]); assert.ok(L.wishPin(st, "S01", bl.trait, binLook).ok);
  const two = L.wishForecast(st, a, b, settings), q = two.pinned.find((x) => x.trait === bl.trait); assert.equal(q.kind, "blend"); assert.ok(q.bins.includes(bl.bins[0]) && q.lit); assert.deepEqual(two.lit.sort(), [sw.trait, bl.trait].sort()); assert.equal(two.of, 2);
  assert.ok(Object.values(two).every((v) => typeof v !== "number" || v === two.of), "closeness is the lit traits, with no percentage in the data");
  // a pinned look the pair cannot reach lights nothing
  const unreach = L.possibleLooks(fr, tr(sw.trait)).find((l) => !sw.seeds.some((sd, i) => traitState(fr, tr(sw.trait), withLoci({ [sw.locus]: sd.copies })).shows === l));
  if (unreach) { S.guideAdd(st, "S01", sw.trait, [unreach]); L.wishPin(st, "S01", sw.trait, unreach); const r = L.wishForecast(st, a, b, settings), z = r.pinned.find((x) => x.trait === sw.trait); assert.deepEqual(z.seeds, []); assert.ok(!z.lit); assert.ok(!r.lit.includes(sw.trait)); }
});

// ---- the wish may mark an unread chapter, but never say what (the game designer's brief) ----
function wished() {   // an adult with a trait that hides a look, the hidden look pinned
  const st = fresh(); st.knownIds.push("S01"); const fr = frameOf("S01"); S.seedAdults(st, "S01", 5, 1, settings); const m = st.mibis[0];
  const [ch, t] = fr.chapters.flatMap((c) => c.traits.map((q) => [c, q])).find(([c, q]) => traitState(fr, q, m.genome).kind === "hides"), hidden = traitState(fr, t, m.genome).hides;
  S.guideAdd(st, "S01", t.id, [hidden]); assert.ok(L.wishPin(st, "S01", t.id, hidden).ok); return { st, fr, m, ch, t, hidden };
}
test("W1 to W3, W7: a marked unread chapter reads read:false and reveals nothing, spends nothing and writes nothing; reading it flips the one boolean", () => {
  const { st, fr, m, ch } = wished(); m.read = m.read.filter((c) => c !== ch.id);
  const marks = L.wishMarks(st, m, settings); assert.deepEqual(marks, [{ chapter: ch.id, read: false }]); for (const x of marks) assert.deepEqual(Object.keys(x), ["chapter", "read"]);
  assert.deepEqual(L.wishChapters(st, m, settings), [ch.id]); assert.ok(L.wishGlint(st, m, ch.id, settings));
  // an identified pod with the look only in a hidden copy, in an unread chapter
  const p = { id: "p9", sp: m.sp, species: "S01", genome: m.genome, idd: 1, read: [], g: "meadow", how: "calm", gs: 1, k: null }; st.tray.push(p);
  const before = JSON.stringify({ d: st.d, guide: st.guide, first: p.first, read: p.read, readOnce: st.readOnce }); assert.deepEqual(L.wishMarks(st, p, settings), [{ chapter: ch.id, read: false }]);
  assert.equal(JSON.stringify({ d: st.d, guide: st.guide, first: p.first, read: p.read, readOnce: st.readOnce }), before, "marking writes nothing");
  p.read.push(ch.id); assert.deepEqual(L.wishMarks(st, p, settings), [{ chapter: ch.id, read: true }]);
  // W2: an unidentified pod gives nothing
  p.idd = 0; assert.deepEqual(L.wishMarks(st, p, settings), []);
  // W8: the carriers and the held share still need the chapter read
  const q = { ...m, read: m.read.filter((c) => c !== ch.id) }; assert.equal(L.wishHeld(st, "S01", q), 0, "wishHeld is 0 while the only carrying chapter is unread");
  void fr;
});
test("W4 to W6: a shut sealed chapter is unmarked (marked when sealedOpen), a released mibi is never marked, an unpinned look takes the mark away", () => {
  const { st, m, t, hidden } = wished(); assert.equal(L.wishMarks(st, { ...m, released: true }, settings).length, 0, "released");
  assert.ok(L.wishUnpin(st, "S01", t.id).ok); assert.deepEqual(L.wishMarks(st, m, settings), [], "unpinned");
  const s2 = fresh(); s2.knownIds.push("S02"); const f2 = frameOf("S02"), sealed = f2.chapters.find((c) => c.sealed); S.seedAdults(s2, "S02", 5, 1, settings); const x = s2.mibis[0];
  const pick = sealed.traits.find((q) => chapterLooks(f2, sealed, x.genome).some(([tt, ls]) => tt === q.id && ls.length)); assert.ok(pick, "a trait of the sealed chapter");
  const look = chapterLooks(f2, sealed, x.genome).find(([tt]) => tt === pick.id)[1][0]; s2.wish.S02 = { [pick.id]: look };
  assert.deepEqual(L.wishMarks(s2, x, { ...settings, sealedOpen: false }), [], "shut"); assert.ok(L.wishMarks(s2, x, { ...settings, sealedOpen: true }).some((q) => q.chapter === sealed.id), "open");
  void hidden;
});
