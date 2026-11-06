import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  LANGUAGE, validateRegistry, checkFamilyOnce, checkMasses, checkQuads, checkEyes, checkLands, checkComplete, checkCoats, checkExceptions,
  hexToOklch, isExcepted, exceptionsFor, kindOf, roster,
} from "../framework/language.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const clone = () => structuredClone(LANGUAGE);

test("the registry holds nine lands, twenty families, twenty kinds and the studio quad", () => {
  assert.equal(LANGUAGE.lands.length, 9);
  assert.equal(LANGUAGE.families.length, 20);
  assert.equal(roster(LANGUAGE).length, 20);
  assert.equal(LANGUAGE.kinds.length, 21);
  assert.deepEqual(LANGUAGE.families.map((f) => f.n), Array.from({ length: 20 }, (_, i) => i + 1));
});

test("land colours carry hex and OKLCH, a body range, a marking offset and a chroma cap", () => {
  const meadows = LANGUAGE.lands.find((l) => l.id === "mixed");
  assert.equal(meadows.art, "Meadows");
  assert.equal(meadows.body.hex, "#D4B060");
  assert.deepEqual(meadows.bodyRange, { hue: 12, lightness: 0.07 });
  assert.ok(meadows.chromaCap > meadows.chromaTop);
  const w = hexToOklch("#FFFFFF"); assert.ok(Math.abs(w.L - 1) < 1e-3 && w.C < 1e-3);
  for (const l of LANGUAGE.lands) {
    const { body, marking, markingOffset } = l;
    assert.ok(Math.abs(body.oklch.L + markingOffset.dL - marking.oklch.L) < 2e-4, l.id);
    assert.ok(Math.abs(body.oklch.C + markingOffset.dC - marking.oklch.C) < 2e-4, l.id);
    assert.ok(Math.max(body.oklch.C, marking.oklch.C, l.accent.oklch.C) <= l.chromaTop + 1e-9);
  }
});

test("the roster as approved passes every roster rule", () => {
  for (const r of validateRegistry(LANGUAGE).filter((r) => r.level === "red")) assert.ok(r.pass, `${r.id}: ${r.messages.join("; ")}`);
});

test("every land has one to three kinds; the ids match the game's biomes", () => {
  const counts = Object.fromEntries(LANGUAGE.lands.map((l) => [l.id, roster(LANGUAGE).filter((k) => k.land === l.id).length]));
  assert.deepEqual(counts, { mixed: 3, woods: 2, tallwood: 3, thickets: 2, fells: 2, downs: 3, marsh: 1, tarns: 2, meres: 2 });
  assert.equal(kindOf(LANGUAGE, "S15").land, "downs");
});

test("only Lehten has three eyes; Belatz has two; nothing varies eye count", () => {
  assert.deepEqual(roster(LANGUAGE).filter((k) => k.eyes.count === 3).map((k) => k.id), ["S15"]);
  assert.equal(kindOf(LANGUAGE, "S09").eyes.count, 2);
});

test("four-legged families number nine; simple masses are five of twenty: Wickle, Drapet, Blikur, Usvel, Igara", () => {
  assert.equal(LANGUAGE.families.filter((f) => f.fourLegged).length, 9);
  assert.equal(LANGUAGE.families.filter((f) => f.simpleMass).length, 5);
  assert.deepEqual(roster(LANGUAGE).filter((k) => LANGUAGE.families.find((f) => f.id === k.family).simpleMass).map((k) => k.name).sort(), ["Blikur", "Drapet", "Igara", "Usvel", "Wickle"]);
  assert.equal(checkMasses(LANGUAGE).pass, true, "five of twenty is inside the one-third cap");
});

test("failing copy: two kinds on one family", () => {
  const r = clone(); kindOf(r, "S02").family = "trotter";
  const out = checkFamilyOnce(r); assert.equal(out.pass, false);
  assert.match(out.messages[0], /S01 and S02 share the family trotter/);
  const l = checkLands(r); assert.equal(l.pass, true); // different lands, so the land rule still holds
  const same = clone(); kindOf(same, "S03").family = "hopper"; kindOf(same, "S07").family = "hopper";
  assert.equal(checkLands(same).pass, false);
});

test("failing copy: a second three-eyed kind", () => {
  const r = clone(); kindOf(r, "S09").eyes.count = 3;
  const out = checkEyes(r); assert.equal(out.pass, false);
  assert.ok(out.messages.some((m) => /one kind at most/.test(m)));
  const four = clone(); kindOf(four, "S04").eyes.count = 4;
  assert.equal(checkEyes(four).pass, false);
  const none = clone(); kindOf(none, "S15").eyes.count = 2;
  assert.equal(checkEyes(none).pass, false);
});

test("failing copies: too many simple masses, too few four-legged families, a land with no kind or four", () => {
  const m = clone(); for (const id of ["S02", "S03", "S04"]) kindOf(m, id).family = "roundling";
  const masses = clone(); for (const id of ["S01", "S02", "S03", "S04", "S05", "S06", "S07", "S08"]) kindOf(masses, id).family = ["roundling", "mound", "swimmer", "floater"][Number(id.slice(1)) % 4];
  assert.equal(checkMasses(masses).pass, false);
  const q = clone(); for (const f of q.families) if (f.fourLegged && !["trotter", "loaf", "hopper", "digger"].includes(f.id)) f.plan = "biped", f.fourLegged = false;
  assert.equal(checkQuads(q).pass, false);
  const none = clone(); for (const k of none.kinds) if (k.land === "marsh") k.land = "meres";
  assert.equal(checkLands(none).pass, false);
  const four = clone(); for (const id of ["S01", "S05", "S03"]) kindOf(four, id).land = "tallwood";
  assert.equal(checkLands(four).pass, false);
  void m;
});

test("each kind has one land, one coat material, one signature type and socket", () => {
  assert.equal(checkComplete(LANGUAGE).pass, true);
  for (const mutate of [(k) => { k.land = "moor"; }, (k) => { k.coat.material = "vinyl"; }, (k) => { k.signature.type = null; }, (k) => { k.signature.socket = "face"; }, (k) => { k.coat.pile = "teddy"; }]) {
    const r = clone(); mutate(kindOf(r, "S04")); assert.equal(checkComplete(r).pass, false);
  }
  const fur = clone(); kindOf(fur, "S08").coat.pile = null; assert.equal(checkComplete(fur).pass, false);
});

test("the studio quad and the old Tuliko are not kinds: roster rules skip them", () => {
  assert.equal(kindOf(LANGUAGE, "S22").template, true);
  assert.equal(checkFamilyOnce(LANGUAGE).pass, true); // S22 shares the trotter with S01
  assert.equal(LANGUAGE.fixtures.length, 1);
  assert.equal(LANGUAGE.fixtures[0].frozen, true);
});

test("roster.coats passes: Tuikis is speckled suede, Azkon short plush fur; the stands stay in Fells", () => {
  const r = checkCoats(LANGUAGE);
  assert.equal(r.level, "amber");
  assert.deepEqual(r.messages, []);
  const tuikis = kindOf(LANGUAGE, "S03"), azkon = kindOf(LANGUAGE, "S07");
  assert.equal(tuikis.land, "fells"); assert.equal(azkon.land, "fells");
  assert.deepEqual(tuikis.coat, { material: "suede", pile: null });
  assert.deepEqual(azkon.coat, { material: "fur", pile: "plush" });
  assert.equal(azkon.chestFur, "fluffy");
  assert.ok(tuikis.coatPattern.spotMax <= 1 / 12 && tuikis.coatPattern.scale === "fine", "fine speckle only: spots at most 1/12 of the body length");
  assert.ok(azkon.coatPattern.patchMin >= 1 / 6 && azkon.coatPattern.scale === "big", "big patches only: at least 1/6 of the body length");
  const same = clone(); kindOf(same, "S07").coat = { material: "suede", pile: null };
  assert.equal(checkCoats(same).messages.length, 1, "two suede kinds in one land is still amber");
});

test("iris and attitude pools are the art desk's table: the first iris is the default, content is in every pool and the default", () => {
  const want = {
    S01: ["amber,honey,copper", "content,curious"], S02: ["teal,moss,slate", "content,deadpan"], S03: ["copper,hazel,amber", "content,curious"], S04: ["slate,violet,hazel", "content,curious,knowing"],
    S05: ["slate,olive,honey", "content,curious,deadpan"], S06: ["copper,honey,amber", "content,deadpan"], S07: ["olive,hazel,honey", "content,deadpan,knowing"], S08: ["teal,slate,violet", "content,curious,knowing"],
    S09: ["hazel,copper,amber", "content,curious,knowing"], S10: ["violet,copper,honey", "content,curious"], S11: ["violet,honey,moss", "content,curious,deadpan"], S12: ["copper,violet,slate", "content,curious"],
    S13: ["hazel,copper,honey", "content,curious"], S14: ["hazel,copper,violet", "content,deadpan"], S15: ["olive,moss,honey", "content,knowing"], S16: ["slate,teal,honey", "content,curious"],
    S17: ["amber,honey", "content,curious"], S18: ["violet,slate", "content,deadpan"], S19: ["hazel,teal", "content,knowing"], S20: ["slate,hazel,violet", "content,curious"],
  };
  for (const [id, [iris, att]] of Object.entries(want)) {
    const k = kindOf(LANGUAGE, id);
    assert.equal(k.eyes.irisPool.join(","), iris, id); assert.equal(k.eyes.attitudePool.join(","), att, id);
    assert.equal(k.eyes.irisDefault, k.eyes.irisPool[0], id); assert.equal(k.eyes.attitudeDefault, "content", id);
  }
  const bad = clone(); kindOf(bad, "S02").eyes.attitudePool = ["curious", "deadpan"];
  assert.equal(checkComplete(bad).pass, false);
  const narrow = clone(); kindOf(narrow, "S02").eyes.irisPool = ["teal", "moss"];
  assert.equal(checkComplete(narrow).pass, false, "only an anchor's pool may be as narrow as two");
});

test("Drapet's brow tassels: locks of the curtain, 0-5, 0-0.15 body height, hanging, never brows or horns, eyes clear, presence may be off", () => {
  const e = exceptionsFor(LANGUAGE, "S18", "face.clear").find((x) => x.scope === "brow-tufts");
  assert.deepEqual(e.tassels.count, [0, 5]); assert.deepEqual(e.tassels.length, [0, 0.15]); assert.equal(e.tassels.lengthUnit, "body height");
  assert.equal(e.tassels.hang, "down"); assert.equal(e.tassels.standUp, false); assert.equal(e.tassels.curl, false);
  assert.equal(e.tassels.brows, false); assert.equal(e.tassels.horns, false); assert.equal(e.tassels.eyesClear, true); assert.equal(e.tassels.presenceMayBeOff, true);
  assert.match(e.tassels.made, /curtain itself.*same hair.*same colour/);
  assert.equal(LANGUAGE.exceptions.filter((x) => x.tassels).length, 1);
  const bad = clone(); bad.exceptions.find((x) => x.tassels).tassels.standUp = true;
  assert.equal(checkExceptions(bad).pass, false);
});

test("Loika's cream muzzle sits inside its excepted coat.pale, and only there", () => {
  const e = exceptionsFor(LANGUAGE, "S01", "coat.pale")[0];
  assert.equal(e.muzzle.colour, "cream"); assert.equal(e.muzzle.inside, "coat.pale");
  assert.ok(e.covers.includes("anatomy.muzzle-presence"));
  assert.equal(LANGUAGE.exceptions.filter((x) => x.covers).length, 1);
  const bad = clone(); kindOf(bad, "S17"); bad.exceptions.find((x) => x.kind === "S17" && x.check === "coat.pale").covers = ["anatomy.muzzle-presence"];
  assert.equal(checkExceptions(bad).pass, false);
});

test("anchors carry per-check records; no kind is exempt as a whole", () => {
  assert.equal(checkExceptions(LANGUAGE).pass, true);
  for (const id of ["S01", "S17", "S18", "S19"]) assert.ok(exceptionsFor(LANGUAGE, id).length >= 4, id);
  assert.equal(isExcepted(LANGUAGE, "S01", "face.size"), true);
  assert.equal(isExcepted(LANGUAGE, "S01", "coat.material"), false);
  assert.equal(isExcepted(LANGUAGE, "S17", "sig.size"), false);
  assert.equal(isExcepted(LANGUAGE, "S02", "face.size"), false);
  assert.deepEqual(exceptionsFor(LANGUAGE, "S19").map((e) => e.check).sort(), ["coat.land", "coat.pale", "face.size", "sig.accent"]);
  for (const e of LANGUAGE.exceptions) { assert.equal(e.by, "art desk"); assert.ok(e.reason && e.date && e.until); }
  assert.ok(!LANGUAGE.kinds.some((k) => "exempt" in k || "waiver" in k));
});

test("Loika's ears record is small, round, on the sides below the crest, coat colour, never pointed, Loika only", () => {
  const e = exceptionsFor(LANGUAGE, "S01", "face.clear").find((x) => x.scope === "ears");
  assert.deepEqual(e.ears, { size: "small", shape: "round", position: "sides of the head, below the crest", colour: "coat", pointed: false, onlyKind: "S01" });
  assert.equal(exceptionsFor(LANGUAGE, "S18", "face.clear")[0].scope, "brow-tufts");
  assert.equal(LANGUAGE.exceptions.filter((x) => x.ears).length, 1);
  const bad = clone(); bad.exceptions.find((x) => x.ears).ears.pointed = true;
  assert.equal(checkExceptions(bad).pass, false);
});

test("failing copies: a blanket exception, a non-anchor exception, a maker signature", () => {
  const blanket = clone(); blanket.exceptions.push({ kind: "S01", check: "*", reason: "x", by: "art desk", date: "2026-11-06", until: "repaint" });
  assert.equal(checkExceptions(blanket).pass, false);
  const non = clone(); non.exceptions.push({ kind: "S02", check: "face.size", reason: "x", by: "art desk", date: "2026-11-06", until: "repaint" });
  assert.equal(checkExceptions(non).pass, false);
  const maker = clone(); maker.exceptions[0].by = "maker";
  assert.equal(checkExceptions(maker).pass, false);
});

test("language.json is generated from language.mjs and is current", () => {
  const json = JSON.parse(readFileSync(path.resolve(here, "../framework/language.json"), "utf8"));
  assert.deepEqual(json, JSON.parse(JSON.stringify(LANGUAGE)));
});
