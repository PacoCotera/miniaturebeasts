// The Library's data (M5): the field guide per species and chapter, "more?", a species unmet, met or found, the face, and the wish.
//   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, frameIds, podGenome, traitState } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import * as L from "../src/library.mjs";

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

test("a shut sealed chapter shows its notch and counts nothing; once read it counts like any other", () => {
  const id = frameIds().find((s) => frameOf(s).chapters.some((c) => c.sealed)), fr = frameOf(id), sealed = fr.chapters.find((c) => c.sealed);
  const st = fresh(); st.knownIds.push(id);
  let fg = L.fieldGuide(st, id, settings), c = fg.chapters.find((x) => x.id === sealed.id); assert.ok(c.sealed); assert.equal(c.unseen, 0); assert.ok(c.traits.every((t) => !t.possible.length && !t.more));
  st.readOnce[id] = [sealed.id]; fg = L.fieldGuide(st, id, settings); c = fg.chapters.find((x) => x.id === sealed.id); assert.ok(!c.sealed); assert.ok(c.unseen > 0);
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
