// The Library's seen record (library.json seen): entering Level 2 of a species notes that species' looks (ui.lib.pending[X], unsaved), leaving the Library records the note in st.libSeen and saves. Entering the Library notes nothing,
// so a visit that shows no Level 2 leaves Home as it was; nothing is recorded on entry or inside the Library; a panel, the wish pinning or the idle rest over it is not a leave; a look found after the Level 2 entry stays new;
// each visit records once. Home's glints and "{n} new" clear for what was recorded (Home re-derives).
//   node --test prototypes/station/tests/lib-seen-save.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const store = new Map(); let writes = 0; globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => { writes++; store.set(k, String(v)); }, removeItem: (k) => store.delete(k) };
const { setFrames, frameOf } = await import("../src/genome.mjs");
const S = await import("../src/state.mjs");
const Lib = await import("../src/library.mjs");
const game = await import("../src/game.mjs");
const { newLooksOf, libraryOf, warmLibrary } = await import("../src/views/specimen-props.mjs");
const { currentLooks } = await import("../../workbench/framework/describe.mjs");
const here = path.dirname(fileURLToPath(import.meta.url)), fd = path.resolve(here, "../../workbench/frames"), home = JSON.parse(readFileSync(path.resolve(here, "../../ui/specs/station/home.json"), "utf8"));
setFrames(readdirSync(fd).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(fd, f), "utf8"))));
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 12 };
function start() {
  const st = S.freshSt("w1", 3, 1e6); S.normalize(st); S.seedAdults(st, "S01", 5, 2, settings); st.libSeen = {};   // every look the Loika's mibis show is new
  game.G.st = st; game.G.settings = settings; game.G.sv = { v: S.SAVE_V, wid: "w1", turn: 3, st, bay: [], mibis: [], carried: [], tier: 1, shield: 3 }; game.save();
  game.UI.screen = "home"; game.UI.lib.pending = null; game.UI.panel = null; game.UI.idle = false; return st;
}
const level2 = (id) => { game.UI.lib.species = id; game.goScreen("library.species"); };   // Level 2 of a species, as its ways in leave it (intents/library.mjs openSpecies)
const unseenLook = (st) => { const fr = frameOf("S01"); for (const ch of fr.chapters) for (const t of ch.traits) for (const l of currentLooks(fr, t)) if (!S.guideLooks(st, "S01", t.id).includes(l)) return [t.id, l]; return null; };

test("leaving the Library records what it showed and saves: Home's count clears, and a reload keeps it seen", () => {
  const st = start(); warmLibrary(st, settings); const before = libraryOf(st, settings, home).region;
  assert.ok(newLooksOf(st, "S01", settings).size > 0 && before.new && before.glints.length > 0, "Home glints and counts the new looks before the visit");
  game.goScreen("library"); assert.deepEqual(game.UI.lib.pending, {}, "entering the Library notes nothing");
  level2("S01"); assert.ok(newLooksOf(st, "S01", settings).size > 0, "nothing is recorded on entry"); assert.ok(Object.keys(game.UI.lib.pending?.S01 ?? {}).length, "Level 2 of the Loika is noted");
  game.goScreen("library"); assert.ok(newLooksOf(st, "S01", settings).size > 0, "nothing is recorded inside the Library");
  game.goScreen("home"); assert.equal(newLooksOf(st, "S01", settings).size, 0, "leaving records the visit"); assert.equal(game.UI.lib.pending, null);
  const after = libraryOf(st, settings, home).region; assert.equal(after.new, undefined, "Home's {n} new clears"); assert.equal(after.glints.length, 0, "and its glints");
  game.load(); assert.equal(newLooksOf(game.G.st, "S01", settings).size, 0, "the record was saved: a reload shows nothing new");
});

test("a look found after the Level 2 entry stays new after leaving", () => {
  const st = start(); game.goScreen("library"); level2("S01"); const [t, l] = unseenLook(st); S.guideAdd(st, "S01", t, [l]);
  game.goScreen("vivarium"); assert.deepEqual([...newLooksOf(st, "S01", settings)], [`${t}|${l}`], "only the look found during the visit is new");
});

test("a visit that shows no Level 2 leaves Home unchanged: Level 1 alone records nothing", () => {
  const st = start(); const n = newLooksOf(st, "S01", settings).size, seen = JSON.stringify(st.libSeen); assert.ok(n > 0);
  game.goScreen("library"); game.goScreen("home"); assert.equal(newLooksOf(st, "S01", settings).size, n, "Home still counts the new looks"); assert.equal(JSON.stringify(st.libSeen), seen, "the record is as it was");
});

test("Level 2 of a species, then Level 1: its cell still glints until the Library is left", () => {
  const st = start(); game.goScreen("library"); level2("S01"); game.goScreen("library");
  assert.ok(newLooksOf(st, "S01", settings).size > 0, "Level 1's cell glints: its looks are new until the leave");
  game.goScreen("home"); assert.equal(newLooksOf(st, "S01", settings).size, 0, "the leave records the species whose sheet was shown");
});

test("Level 3 directly, ← to Level 2 of a species, then leave: that species is seen", () => {
  const st = start(); game.UI.lib.species = "S01"; game.goScreen("library.family"); assert.deepEqual(game.UI.lib.pending, {}, "Level 3 from outside notes nothing");
  game.goScreen("library.species"); assert.ok(Object.keys(game.UI.lib.pending.S01).length, "← to Level 2 is an entry to Level 2");
  game.goScreen("home"); assert.equal(newLooksOf(st, "S01", settings).size, 0, "the Loika is seen");
});

test("a met-only Level 2 sets an empty note; a later entry to a species replaces its note", () => {
  const st = start(); st.metIds = ["S04"]; game.goScreen("library"); level2("S04"); assert.deepEqual(game.UI.lib.pending, { S04: {} }, "met-only: an empty note");
  game.goScreen("library"); level2("S01"); const first = JSON.stringify(game.UI.lib.pending.S01); const [t, l] = unseenLook(st); S.guideAdd(st, "S01", t, [l]);
  game.goScreen("library"); level2("S01"); assert.notEqual(JSON.stringify(game.UI.lib.pending.S01), first, "the second entry's looks replace the first's"); assert.ok(game.UI.lib.pending.S01[t].includes(l));
  game.goScreen("home"); assert.equal(newLooksOf(st, "S01", settings).size, 0);
});

test("a panel, the wish pinning or the idle rest over the Library records nothing", () => {
  const st = start(); game.goScreen("library"); level2("S01"); const seen = JSON.stringify(st.libSeen), w0 = writes;
  game.UI.panel = { screen: "library", id: "x" }; game.UI.panel = null;
  const tr = Object.keys(st.guide.S01)[0]; assert.ok(Lib.wishPin(st, "S01", tr, st.guide.S01[tr][0], settings).ok);
  game.UI.idle = true; game.UI.idle = false;
  assert.equal(JSON.stringify(st.libSeen), seen, "the record is as it was"); assert.equal(writes, w0, "nothing saved by the Library"); assert.ok(newLooksOf(st, "S01", settings).size > 0);
  game.goScreen("home"); assert.equal(newLooksOf(st, "S01", settings).size, 0, "the leave records");
});

test("entering and leaving twice records once per visit", () => {
  const st = start();
  game.goScreen("library"); level2("S01"); game.goScreen("home"); const w = writes; game.goScreen("cargo"); assert.equal(writes, w, "a screen change outside the Library records nothing");
  const [t, l] = unseenLook(st); S.guideAdd(st, "S01", t, [l]); assert.equal(newLooksOf(st, "S01", settings).size, 1);
  game.goScreen("library"); level2("S01"); game.goScreen("library"); game.goScreen("home"); assert.equal(newLooksOf(st, "S01", settings).size, 0, "the second visit records what it showed");
  const w2 = writes; game.goScreen("vivarium"); game.goScreen("home"); assert.equal(writes, w2, "no visit, no record");
});
