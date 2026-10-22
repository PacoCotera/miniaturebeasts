// The Library opened full screen is saved at once (build spec 4.2, "new"): a reload right after opening it shows no look as new.
//   node --test prototypes/station/tests/lib-seen-save.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const store = new Map(); globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
const { setFrames } = await import("../src/genome.mjs");
const S = await import("../src/state.mjs");
const game = await import("../src/game.mjs");
const { newLooksOf } = await import("../src/views/specimen-props.mjs");
const here = path.dirname(fileURLToPath(import.meta.url)), fd = path.resolve(here, "../../workbench/frames");
setFrames(readdirSync(fd).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(fd, f), "utf8"))));

test("opening the Library full screen saves, and a reload right after expects no new looks", () => {
  const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 12 }, st = S.freshSt("w1", 3, 1e6); S.normalize(st); S.seedAdults(st, "S01", 5, 2, settings);
  game.G.st = st; game.G.sv = { v: S.SAVE_V, wid: "w1", turn: 3, st, bay: [], mibis: [], carried: [], tier: 1, shield: 3 }; game.save();
  assert.ok(newLooksOf(st, "S01", settings).size > 0, "found looks are new before the Library is opened");
  game.UI.screen = "home"; game.goScreen("library");
  game.load();   // the reload: the stored save is read back
  assert.equal(newLooksOf(game.G.st, "S01", settings).size, 0, "nothing is new after a reload");
});
