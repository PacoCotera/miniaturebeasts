// The Library's seen record (library.json seen): entering the Library notes what it shows, leaving it records the note in st.libSeen and saves. Nothing is recorded on entry or inside the Library; a panel, the wish pinning or the
// idle rest over it is not a leave; a look found after the entry stays new; each visit records once. Home's glints and "{n} new" clear for what was recorded (Home re-derives).
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
const unseenLook = (st) => { const fr = frameOf("S01"); for (const ch of fr.chapters) for (const t of ch.traits) for (const l of currentLooks(fr, t)) if (!S.guideLooks(st, "S01", t.id).includes(l)) return [t.id, l]; return null; };

test("leaving the Library records what it showed and saves: Home's count clears, and a reload keeps it seen", () => {
  const st = start(); warmLibrary(st, settings); const before = libraryOf(st, settings, home).region;
  assert.ok(newLooksOf(st, "S01", settings).size > 0 && before.new && before.glints.length > 0, "Home glints and counts the new looks before the visit");
  game.goScreen("library"); assert.ok(newLooksOf(st, "S01", settings).size > 0, "nothing is recorded on entry"); assert.ok(game.UI.lib.pending?.S01, "the visit is noted");
  game.goScreen("library.species"); game.goScreen("library"); assert.ok(newLooksOf(st, "S01", settings).size > 0, "nothing is recorded inside the Library");
  game.goScreen("home"); assert.equal(newLooksOf(st, "S01", settings).size, 0, "leaving records the visit"); assert.equal(game.UI.lib.pending, null);
  const after = libraryOf(st, settings, home).region; assert.equal(after.new, undefined, "Home's {n} new clears"); assert.equal(after.glints.length, 0, "and its glints");
  game.load(); assert.equal(newLooksOf(game.G.st, "S01", settings).size, 0, "the record was saved: a reload shows nothing new");
});

test("a look found after the entry stays new after leaving", () => {
  const st = start(); game.goScreen("library"); const [t, l] = unseenLook(st); S.guideAdd(st, "S01", t, [l]);
  game.goScreen("vivarium"); assert.deepEqual([...newLooksOf(st, "S01", settings)], [`${t}|${l}`], "only the look found during the visit is new");
});

test("a panel, the wish pinning or the idle rest over the Library records nothing", () => {
  const st = start(); game.goScreen("library"); const seen = JSON.stringify(st.libSeen), w0 = writes;
  game.UI.panel = { screen: "library", id: "x" }; game.UI.panel = null;
  const tr = Object.keys(st.guide.S01)[0]; assert.ok(Lib.wishPin(st, "S01", tr, st.guide.S01[tr][0], settings).ok);
  game.UI.idle = true; game.UI.idle = false;
  assert.equal(JSON.stringify(st.libSeen), seen, "the record is as it was"); assert.equal(writes, w0, "nothing saved by the Library"); assert.ok(newLooksOf(st, "S01", settings).size > 0);
  game.goScreen("home"); assert.equal(newLooksOf(st, "S01", settings).size, 0, "the leave records");
});

test("entering and leaving twice records once per visit", () => {
  const st = start();
  game.goScreen("library"); game.goScreen("home"); const w = writes; game.goScreen("cargo"); assert.equal(writes, w, "a screen change outside the Library records nothing");
  const [t, l] = unseenLook(st); S.guideAdd(st, "S01", t, [l]); assert.equal(newLooksOf(st, "S01", settings).size, 1);
  game.goScreen("library"); game.goScreen("library"); game.goScreen("home"); assert.equal(newLooksOf(st, "S01", settings).size, 0, "the second visit records what it showed");
  const w2 = writes; game.goScreen("vivarium"); game.goScreen("home"); assert.equal(writes, w2, "no visit, no record");
});
