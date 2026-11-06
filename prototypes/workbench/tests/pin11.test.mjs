// Catalogue pin 11 (ticket G1 of the genome-string proposal, T-20261102-genome-string): Tuliko's genes as catalogue records. 43 new trunk records and 5 branch records of
// the new clan C20, the marking layout's four appended alleles, the content digest, and the guarantee that no frame S01 to S19 moves.
//   node --test tests/pin11.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CATALOGUE, LOCI, VALIDATED, PART_SWITCHES, inClan, isContinuous, resolveCopies, wakesFor, lookConflicts, LOOK_PAIRS, stepValue, stepOf, BLEND_STEPS, digestAt, alleleIds, catalogueHeader } from "../framework/catalogue.mjs";
import { sha256hex } from "../framework/sha256.mjs";
import { CLANS, SPECIES, specOf } from "../framework/roster.mjs";
import { buildFrame } from "../framework/species.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const framesDir = path.resolve(here, "../frames");
const sha16 = (s) => createHash("sha256").update(s).digest("hex").slice(0, 16);

// The 54 records of the proposal's table A.3, in the frame's ring order (Coat, Face, Shape, Legs & tail, Movement): [Chunk 7 locus, record, how the record stands].
// "existing" is in pin 10; "new" is added in pin 11; "C20" is a new branch record of the Tuliko's clan; "borrowed" is a branch record of C18 the Tuliko borrows.
const A3 = [
  ["appearance.body-hue", "appearance.body-hue", "new"], ["appearance.coat-value", "appearance.body-value", "new"],
  ["coat.gradient", "appearance.countershade", "new"], ["skin.grain", "appearance.surface-grain", "new"], ["skin.sheen", "appearance.sheen", "existing"],
  ["coat.fleck", "appearance.fleck", "new"], ["appearance.bib-reach", "appearance.cream-extent", "new"], ["appearance.marking-layout (plain)", "appearance.marking-switch", "existing"],
  ["appearance.marking-layout (five)", "appearance.marking-layout", "existing"], ["coat.rd", "appearance.pattern-kind", "new"], ["coat.rd-scale", "appearance.pattern-scale", "new"],
  ["coat.rd-contrast", "appearance.pattern-contrast", "new"], ["coat.rosette", "appearance.marking-rosette", "new"], ["coat.bands", "appearance.band-count", "new"],
  ["coat.mark", "appearance.emblem", "new"], ["coat.mark-where", "appearance.emblem-place", "new"], ["coat.mark-size", "appearance.emblem-size", "new"],
  ["coat.freckle-density", "appearance.freckle-density", "new"], ["coat.freckle-glow", "appearance.freckle-glow", "C20"], ["appearance.glow", "appearance.emission-brightness", "existing"],
  ["appearance.glow-hue", "appearance.emission-hue", "new"], ["coat.bleed", "appearance.lantern-bleed", "C20"], ["coat.glow-pattern", "appearance.glow-pattern", "C20"],
  ["growth.exterior-eye-size-ratio", "form.eye-size", "new"], ["growth.exterior-eye-height-ratio", "form.eye-height", "new"], ["growth.exterior-eye-spacing-ratio", "form.eye-spacing", "new"],
  ["face.mouth-width", "form.mouth-width", "new"], ["face.mouth-height", "form.mouth-height", "new"], ["face.expression", "appearance.mouth-rest", "new"],
  ["face.blush", "appearance.blush", "new"], ["face.fangs", "anatomy.fang-presence", "new"], ["face.whisker-count (zero)", "anatomy.whisker-presence", "new"], ["face.whisker-count", "form.whisker-count", "new"],
  ["face.whisker-length", "form.whisker-length", "new"], ["face.whisker-droop", "form.whisker-droop", "new"], ["face.whisker-curl", "form.whisker-curl", "new"],
  ["face.whisker-glow", "appearance.whisker-glow", "C20"], ["coat.brow", "anatomy.brow-tuft-presence", "borrowed"], ["body.ear-family", "form.ear-kind", "new"],
  ["body.ear-length", "form.ear-length", "new"], ["body.ear-girth", "form.ear-width", "new"], ["body.ear-splay", "form.ear-splay", "new"], ["body.ear-droop", "form.ear-droop", "new"],
  ["body.head-size", "form.head", "new"], ["body.torso-girth", "form.torso-girth", "new"],
  ["body.limb-length", "form.leg-length", "new"], ["body.limb-girth", "form.leg-girth", "new"], ["body.tail-length", "form.tail-length", "new"], ["body.tail-girth", "form.tail-girth", "new"],
  ["body.tail-curl", "form.tail-curl", "new"], ["body.tail-lift", "form.tail-carry", "new"], ["body.tail-tip", "anatomy.tail-tip-form", "C20"], ["body.tip-size", "form.tail-tip-size", "new"],
  ["movement.cycle-rate", "movement.cycle-rate", "existing"],
];
const NAMED = ["appearance.marking-switch", "appearance.marking-layout", "appearance.pattern-kind", "appearance.emblem", "appearance.emblem-place", "appearance.glow-pattern", "appearance.mouth-rest",
  "appearance.blush", "anatomy.fang-presence", "anatomy.whisker-presence", "appearance.whisker-glow", "anatomy.brow-tuft-presence", "form.ear-kind", "anatomy.tail-tip-form"];
const C20 = A3.filter((r) => r[2] === "C20").map((r) => r[1]);
const NEW = A3.filter((r) => r[2] === "new" || r[2] === "C20").map((r) => r[1]);

test("pin 12 (pin 11 and the Peplos genome), as pin 13 still sees it at frame 7: 227 records, and a content digest that is the SHA-256 of what a genome rests on", () => {
  assert.equal(CATALOGUE.version, 14); assert.equal(CATALOGUE.schema, "mb-catalogue/14");   // the language pin (tests/pin13.test.mjs) adds records and alleles that start at frame 8
  assert.equal(CATALOGUE.loci.filter((l) => !(l.sinceFrame > 7)).length, 179 + 48); assert.equal(CATALOGUE.loci.length, 179 + 48 + 7); assert.equal(VALIDATED.length, 173 + 48 + 7);
  assert.match(CATALOGUE.digest, /^[0-9a-f]{64}$/);
  assert.equal(CATALOGUE.digest, digestAt(Infinity)); assert.notEqual(CATALOGUE.digest, digestAt(7), "pin 13 is another content");
  assert.equal(digestAt(7), "98419b59dd1a826d66bbd1b0c17988dec64c51fcc2076e2b18bd72eb987d876c", "pin 12 names this content (pin 11, 2666ebb3e6be79739a49f45aa840a876e87737e27361c01e1be5722d0cd8ada4, was its genome-string content before the Peplos records, and is named only by the S20 body frame): a change to a record, an allele, a pair map or a scope is a new pin");
  assert.equal(digestAt(6), "2ca450b04bfbcb4ca434b8e14195f111e9f381a27ea7c6c207cb06884f5ec42b", "the 179 records a frame of version 6 or older sees: pin 10's 178 on the build branches plus the dew tongue, with the antenna form's curl in place of feather, digested the same way (retaken once at the merge onto catalogue 12)");
  assert.equal(CATALOGUE.loci.filter((l) => !(l.sinceFrame > 6)).length, 179);
  assert.notEqual(digestAt(6), digestAt(7));
});

test("the SHA-256 the digest uses agrees with node:crypto, on the empty string, a short one, a block boundary, multi-byte text and a long one", () => {
  for (const s of ["", "abc", "a".repeat(55), "a".repeat(56), "a".repeat(64), "é—日本語 ✓", "x\n".repeat(5000)]) assert.equal(sha256hex(s), createHash("sha256").update(s, "utf8").digest("hex"), JSON.stringify(s.slice(0, 20)));
});

test("A.3: the 54 records exist; 6 stand in pin 10 (one of them C18's, borrowed), 43 are new trunk records and 5 are new branch records of C20", () => {
  assert.equal(A3.length, 54);
  assert.equal(new Set(A3.map((r) => r[1])).size, 54, "54 distinct records");
  for (const [, id] of A3) assert.ok(LOCI.has(id), `${id} is in the catalogue`);
  const existing = A3.filter((r) => r[2] === "existing" || r[2] === "borrowed");
  assert.equal(existing.length, 6);
  for (const [, id] of existing) assert.ok(!(LOCI.get(id).sinceFrame > 6), `${id} was in pin 10`);
  assert.deepEqual(LOCI.get("anatomy.brow-tuft-presence").clan, "C18", "the brow tuft is borrowed, never changed");
  assert.equal(NEW.length, 48);
  for (const id of NEW) assert.equal(LOCI.get(id).sinceFrame, 7, `${id} is new at frame version 7`);
  assert.deepEqual(CATALOGUE.loci.filter((l) => l.sinceFrame === 7).map((l) => l.id).sort(), [...NEW].sort(), "nothing else is new, and every new record is in the table");
  const trunk = NEW.filter((id) => LOCI.get(id).scope === "trunk"), branch = NEW.filter((id) => LOCI.get(id).scope === "branch");
  assert.equal(trunk.length, 43); assert.equal(branch.length, 5);
  assert.deepEqual(branch.sort(), [...C20].sort()); for (const id of C20) assert.equal(LOCI.get(id).clan, "C20", id);
  assert.deepEqual([...C20].sort(), ["anatomy.tail-tip-form", "appearance.freckle-glow", "appearance.glow-pattern", "appearance.lantern-bleed", "appearance.whisker-glow"], "the lantern and its glow family");
  const cont = A3.filter((r) => isContinuous(LOCI.get(r[1])));
  assert.equal(cont.length, 40, "40 continuous"); assert.equal(54 - cont.length, 14, "14 named");
  assert.ok(!LOCI.has("appearance.body-hue-shift") && !LOCI.has("appearance.pattern-rosette"), "the hue shift is dropped (a second gene for one colour) and the rosette has its new name");
  assert.deepEqual(A3.filter((r) => !isContinuous(LOCI.get(r[1]))).map((r) => r[1]).sort(), [...NAMED].sort());
});

test("owner ruling 3: Tuliko's generic looks (whiskers, fangs, blush, emblems, coat patterns, shape measures) are trunk, open to every clan; only C20 sees the lantern family", () => {
  for (const id of ["form.whisker-count", "form.whisker-length", "form.whisker-droop", "form.whisker-curl", "anatomy.fang-presence", "appearance.blush", "appearance.emblem", "appearance.emblem-place", "appearance.emblem-size",
    "appearance.pattern-kind", "appearance.pattern-scale", "appearance.pattern-contrast", "appearance.marking-rosette", "appearance.band-count", "anatomy.whisker-presence", "form.eye-size", "form.leg-length", "form.tail-length", "form.head", "form.torso-girth"]) {
    assert.equal(LOCI.get(id).scope, "trunk", id); assert.ok(inClan(LOCI.get(id), "C04") && inClan(LOCI.get(id), "C20"), id);
  }
  for (const id of C20) { assert.ok(inClan(LOCI.get(id), "C20"), id); assert.ok(!inClan(LOCI.get(id), "C04") && !inClan(LOCI.get(id), "C03"), `${id} is no other clan's`); }
});

test("a continuous record holds a position: three bins at 0, 0.5 and 1, higher t is more of the last word, and a copy lies on the 59-step grid", () => {
  for (const [, id] of A3) {
    const l = LOCI.get(id);
    if (!NEW.includes(id) || !isContinuous(l)) continue;
    assert.equal(l.operator, "copy-mean", id); assert.equal(l.measure, "position", id);
    assert.deepEqual(l.alleles.map((a) => a.value), [0, 0.5, 1], `${id}: bins at 0, 0.5 and 1`);
    assert.equal(new Set(l.alleles.map((a) => a.id)).size, 3, `${id}: three words`);
    assert.equal(resolveCopies(l, [l.alleles[0].id, l.alleles[2].id]), 0.5, `${id}: low and high show the middle`);
    assert.equal(stepValue(l, 0), 0); assert.equal(stepValue(l, BLEND_STEPS), 1);
    assert.equal(stepValue(l, 47), 0.79661, `${id}: step 47 is 0.79661`); assert.equal(stepOf(l, 0.20339), 12, `${id}: 0.20339 is step 12`);
  }
  for (const id of ["appearance.sheen", "appearance.emission-brightness", "movement.cycle-rate"]) {
    const l = LOCI.get(id); assert.ok(!l.measure, `${id} stays in absolute units`); assert.ok(!(l.sinceFrame > 6));
  }
  assert.deepEqual(LOCI.get("movement.cycle-rate").alleles.map((a) => [a.id, a.value]), [["low", 0.6], ["high", 1.4]]);
});

test("pair maps are complete for every pair-map record, the new ones too, and each pair shows one of its two copies (bands and patches show both)", () => {
  let n = 0;
  for (const l of CATALOGUE.loci.filter((x) => x.operator === "pair-map")) {
    for (const a of l.alleles) for (const b of l.alleles) {
      const key = [a.id, b.id].sort().join("|");
      assert.ok(Object.hasOwn(l.pairMap, key), `${l.id}: ${key}`); n++;
      if (NEW.includes(l.id)) assert.ok([a.id, b.id].includes(l.pairMap[key]), `${l.id} ${key} shows ${l.pairMap[key]}`);
    }
    const keys = Object.keys(l.pairMap).length; assert.equal(keys, (l.alleles.length * (l.alleles.length + 1)) / 2, `${l.id}: exactly the unordered pairs`);
  }
  assert.ok(n > 150, "a few hundred pairs checked");
  // the dominance orders of A.3 (first wins)
  const win = (id, a, b) => resolveCopies(LOCI.get(id), [a, b]);
  assert.equal(win("appearance.pattern-kind", "rings", "none"), "none"); assert.equal(win("appearance.pattern-kind", "rings", "spots"), "spots"); assert.equal(win("appearance.pattern-kind", "labyrinth", "rings"), "labyrinth");
  assert.equal(win("appearance.emblem", "star", "heart"), "heart"); assert.equal(win("appearance.emblem", "star", "none"), "none");
  assert.equal(win("appearance.emblem-place", "belly", "forehead"), "forehead"); assert.equal(win("appearance.glow-pattern", "belly-arcs", "none"), "none");
  assert.equal(win("appearance.mouth-rest", "open", "content"), "content");
  assert.deepEqual(LOCI.get("appearance.mouth-rest").alleles.map((a) => a.id), ["content", "open", "smile"], "smile is appended: content and open keep their indexes in every copy");
  assert.equal(win("appearance.mouth-rest", "smile", "content"), "smile"); assert.equal(win("appearance.mouth-rest", "open", "smile"), "smile");
  assert.deepEqual(LOCI.get("form.ear-kind").alleles.map((a) => a.id), ["prick", "lop", "nub"], "the allele order is the Tuliko's (an index in every copy); dominance is another thing");
  assert.equal(win("form.ear-kind", "lop", "nub"), "nub"); assert.equal(win("form.ear-kind", "nub", "prick"), "prick"); assert.equal(win("form.ear-kind", "lop", "prick"), "prick");
  assert.equal(win("anatomy.tail-tip-form", "plain", "tuft"), "tuft"); assert.equal(win("anatomy.tail-tip-form", "tuft", "lantern"), "lantern"); assert.equal(win("anatomy.tail-tip-form", "plain", "lantern"), "lantern");
  // switches: blush, fangs and whisker glow recessive (blush since 3 Nov 2026), the marking switch recessive
  assert.equal(LOCI.get("appearance.blush").operator, "recessive-enable"); assert.equal(resolveCopies(LOCI.get("appearance.blush"), ["on", "off"]), false); assert.equal(resolveCopies(LOCI.get("appearance.blush"), ["on", "on"]), true);
  for (const id of ["anatomy.fang-presence", "appearance.whisker-glow", "appearance.marking-switch"]) { assert.equal(LOCI.get(id).operator, "recessive-enable", id); assert.equal(resolveCopies(LOCI.get(id), ["on", "off"]), false, id); assert.equal(resolveCopies(LOCI.get(id), ["on", "on"]), true, id); }
  // the whisker switch: dominant, so whiskerless (off/off) is the recessive look
  assert.equal(LOCI.get("anatomy.whisker-presence").operator, "dominant-enable"); assert.equal(resolveCopies(LOCI.get("anatomy.whisker-presence"), ["on", "off"]), true); assert.equal(resolveCopies(LOCI.get("anatomy.whisker-presence"), ["off", "off"]), false);
});

test("sleep rules: every one names the SHOWN look in a wakesWhen (any look listed wakes the record), none is left in the old sleepsWhen form, and each rule is the review's", () => {
  assert.ok(CATALOGUE.loci.every((l) => !("sleepsWhen" in l)), "the sleepsWhen form is gone");
  const wakes = Object.fromEntries(CATALOGUE.loci.filter((l) => l.wakesWhen).map((l) => [l.id, l.wakesWhen]));
  assert.deepEqual(wakes, {
    "appearance.pattern-scale": { "appearance.pattern-kind": ["spots", "labyrinth", "rings"] },
    "appearance.pattern-contrast": { "appearance.pattern-kind": ["spots", "labyrinth", "rings"] },
    "appearance.marking-rosette": { "appearance.marking-layout": ["spotted"] },
    "appearance.band-count": { "appearance.marking-layout": ["bands", "bands-and-patches"], "appearance.glow-pattern": ["belly-arcs"] },
    "appearance.emblem-place": { "appearance.emblem": ["heart", "star"] },
    "appearance.emblem-size": { "appearance.emblem": ["heart", "star"] },
    "appearance.lantern-bleed": { "anatomy.tail-tip-form": ["lantern"] },
  });
  // the listed looks are shown looks: the layout shows "bands-and-patches" for a bands copy with a patches copy, not a copy name
  assert.equal(resolveCopies(LOCI.get("appearance.marking-layout"), ["bands", "patches"]), "bands-and-patches");
  // wakesFor: awake when any named record shows a listed look; a record that shows nothing (not carried, or asleep) wakes nothing; no rule is always awake
  const shown = (m) => (id) => m[id];
  const band = LOCI.get("appearance.band-count"), rosette = LOCI.get("appearance.marking-rosette");
  assert.equal(wakesFor(band, shown({ "appearance.marking-layout": "bands" })), true); assert.equal(wakesFor(band, shown({ "appearance.marking-layout": "bands-and-patches" })), true);
  assert.equal(wakesFor(band, shown({ "appearance.marking-layout": "spotted", "appearance.glow-pattern": "belly-arcs" })), true, "the belly arcs wake it too");
  assert.equal(wakesFor(band, shown({ "appearance.marking-layout": "spotted", "appearance.glow-pattern": "none" })), false);
  assert.equal(wakesFor(band, shown({})), false); assert.equal(wakesFor(rosette, shown({ "appearance.marking-layout": "patches" })), false); assert.equal(wakesFor(rosette, shown({ "appearance.marking-layout": "spotted" })), true);
  assert.equal(wakesFor(LOCI.get("form.eye-size"), shown({})), true);
  assert.equal(digestAt(6), "2ca450b04bfbcb4ca434b8e14195f111e9f381a27ea7c6c207cb06884f5ec42b", "no record a frame of version 6 sees carries a rule");
});

test("owners: the three eye records ride the eye switch, form.head needs a head, and the whisker records sleep without the whisker switch", () => {
  for (const k of ["size", "height", "spacing"]) assert.equal(LOCI.get(`form.eye-${k}`).owner, "anatomy.exterior-eye-presence", `form.eye-${k}`);
  assert.equal(LOCI.get("form.head").owner, "head");
  const sw = LOCI.get("anatomy.whisker-presence");
  assert.deepEqual([sw.scope, sw.family, sw.owner, sw.operator], ["trunk", "structure", "head", "dominant-enable"]); assert.ok(PART_SWITCHES.has("anatomy.whisker-presence"));
  for (const id of ["form.whisker-count", "form.whisker-length", "form.whisker-droop", "form.whisker-curl", "appearance.whisker-glow"]) assert.equal(LOCI.get(id).owner, "anatomy.whisker-presence", id);
  assert.equal(CATALOGUE.loci.filter((l) => l.sinceFrame === 7).length, 48);
  assert.equal(CATALOGUE.loci.filter((l) => l.sinceFrame === 7 && l.scope === "trunk").length, 43); assert.equal(CATALOGUE.loci.filter((l) => l.sinceFrame === 7 && l.scope === "branch").length, 5);
});

test("the marking layout gains masked, points, spotted and capped after bands and patches; an older copy keeps its index, bands with patches stays co-dominant", () => {
  const l = LOCI.get("appearance.marking-layout");
  assert.deepEqual(l.alleles.slice(0, 6).map((a) => a.id), ["bands", "patches", "masked", "points", "spotted", "capped"], "appended, so every older copy keeps its index (catalogue 13 appends four more at 6 to 9)");
  assert.deepEqual(l.alleles.slice(0, 2).map((a) => a.sinceFrame), [undefined, undefined]); assert.deepEqual(l.alleles.slice(2, 6).map((a) => a.sinceFrame), [7, 7, 7, 7]);
  assert.equal(resolveCopies(l, ["bands", "bands"]), "bands"); assert.equal(resolveCopies(l, ["patches", "patches"]), "patches"); assert.equal(resolveCopies(l, ["bands", "patches"]), "bands-and-patches");
  const order = ["masked", "points", "bands", "patches", "spotted", "capped"];
  for (let i = 0; i < order.length; i++) for (let j = i + 1; j < order.length; j++) {
    if (order[i] === "bands" && order[j] === "patches") continue;
    assert.equal(resolveCopies(l, [order[j], order[i]]), order[i], `${order[i]} wins over ${order[j]}`);
  }
  assert.equal(l.version, 2); assert.equal(l.addedAlleles.since, 11);
  assert.deepEqual(alleleIds("appearance.marking-layout", 6), ["bands", "patches"], "a frame of version 6 or older sees two alleles");
  assert.deepEqual(alleleIds("appearance.marking-layout", 7), ["bands", "patches", "masked", "points", "spotted", "capped"]);
  assert.equal(Math.ceil(Math.log2(alleleIds("appearance.marking-layout", 6).length)), 1, "one bit, as in every stamp frame that opens it");
  assert.equal(resolveCopies(LOCI.get("appearance.marking-switch"), ["on", "off"]), false, "plain is the marking switch off");
});

// sha256 (first 16 hex) of each frame file: the baseline taken once at the merge of the studio and game lines (catalogue 12; every form frame rebuilt with its header naming pin 12 and
// the digest of its own version). Before the merge the studio line held the pin 10 bytes of S02 to S19; the game line had rewritten all sixteen in place. From here a frame file moves only
// with a new frame version and a stamp key (genome-stamp/tools/extract-frames.mjs --check).
const PIN12_FRAME_FILES = {
  "species-S01.json": "18412b5b642a9a22", "species-S02.json": "945dbed534c5ad02", "species-S03.json": "34142700d32d8c23", "species-S04.json": "e2f3026580462093",
  "species-S05.json": "29c83219408effcb", "species-S06.json": "1896809430bdac32", "species-S07.json": "274caf615ed6973c", "species-S08.json": "94b92823b80cc206",
  "species-S09.json": "0db7f57f0bd83cad", "species-S10.json": "3c8b5bce77b58e28", "species-S11.json": "44c2ceb0cd41aa50", "species-S12.json": "d52a2ec0b4303e9f",
  "species-S13.json": "3dfb89381196be9b", "species-S14.json": "5c39077cd17cbac0", "species-S15.json": "94c07719cd7e3528", "species-S16.json": "b878c100ea55d0ad",
  "species-S17.json": "2e2797cecb3e9c7a", "species-S18.json": "ee8db81d4bec0961", "species-S19.json": "21c7b4bfb5396f87", "index.json": "545c0cf83a79d254",
};

test("every S01 to S19 frame is byte for byte the merge baseline, names pin 12 with the digest of its own version, and lists nothing a later frame version adds", () => {
  const files = readdirSync(framesDir).filter((f) => f.endsWith(".json")).sort();
  assert.deepEqual(files, Object.keys(PIN12_FRAME_FILES).sort(), "the registry holds S01 to S19 and the index, no more");
  for (const f of files) assert.equal(sha16(readFileSync(path.join(framesDir, f))), PIN12_FRAME_FILES[f], `${f} is unchanged`);
  for (const f of files.filter((x) => x.startsWith("species-"))) {
    const d = JSON.parse(readFileSync(path.join(framesDir, f), "utf8"));
    const fv = d.frameVersion ?? 4;
    assert.equal(d.catalogue.version, 12, `${d.species.id} names pin 12`); assert.equal(d.catalogue.digest, digestAt(fv), `${d.species.id}: the digest of the content its frame version ${fv} sees`);
    for (const l of d.loci) assert.ok(!(LOCI.get(l.id).sinceFrame > fv), `${d.species.id} lists ${l.id}`);
    for (const a of d.absent) assert.ok(!(LOCI.get(a.id).sinceFrame > fv), `${d.species.id} lists ${a.id} as absent`);
    for (const l of d.loci) for (const a of l.alleles ?? []) assert.ok(LOCI.get(l.id).alleles.some((x) => x.id === a && !(x.sinceFrame > fv)), `${d.species.id} ${l.id}: ${a}`);
  }
});

test("a frame of version 7 names pin 12 and its digest, carries the generic records of an open clan, and lists C20's records as another clan's branch loci", () => {
  assert.deepEqual(catalogueHeader(6), { id: CATALOGUE.id, version: 12, digest: digestAt(6), parent: CATALOGUE.parent });
  assert.equal(catalogueHeader(7).version, 12); assert.equal(catalogueHeader(7).digest, digestAt(7));
  const frame = buildFrame({ ...specOf(SPECIES.find((s) => s.id === "S04")), frameVersion: 7, openSwitches: ["anatomy.whisker-presence"] }, { samples: 5 });
  assert.equal(frame.catalogue.version, 12); assert.equal(frame.catalogue.digest, digestAt(7));
  assert.equal(frame.viability.constructed, frame.viability.sampled);
  for (const id of ["form.ear-kind", "form.whisker-count", "appearance.blush", "form.tail-length"]) assert.ok(frame.loci.some((l) => l.id === id), `${id} is open to a C04 species at version 7`);
  for (const id of C20) { assert.ok(!frame.loci.some((l) => l.id === id), `${id} is not carried by a C04 species`); assert.ok(frame.absent.some((a) => a.id === id && /branch locus/.test(a.why)), `${id} is an absent branch locus there`); }
  const old = buildFrame({ ...specOf(SPECIES.find((s) => s.id === "S04")), frameVersion: 6 }, { samples: 5 });
  assert.ok(!old.loci.some((l) => LOCI.get(l.id).sinceFrame === 7) && !old.absent.some((a) => LOCI.get(a.id).sinceFrame === 7), "the same species at version 6 sees nothing new");
});

test("clan C20 is in the roster with no generated species and no form plan, and the page's new-species list skips it", () => {
  assert.equal(CLANS.C20.number, 20); assert.equal(CLANS.C20.engine, "body"); assert.equal(CLANS.C20.plan, undefined);
  assert.equal(SPECIES.filter((s) => s.clan === "C20").length, 0, "no species of C20 is generated");
  assert.equal(SPECIES.length, 19);
  assert.equal(Object.entries(CLANS).filter(([, c]) => c.engine !== "body").length, 19);
});
