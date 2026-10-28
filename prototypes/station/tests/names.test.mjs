// The mibi names (T-20261027-322): es-pets-1, 256 names common for pets in Mexico, the current list on both devices; en-short-1, the twelve English names, archived 2026-10-27.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { setFrames, frameIds, frameOf } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { NAME_LISTS, NAME_LIST_CURRENT, NAME_LIST_ARCHIVED, MIBI_NAMES, MIBI_NAMES_ARCHIVED } from "../../play/src/names.mjs";
import { createMeasure } from "../../ui/specs/measure.mjs";
import NAMER from "../../ui/specs/station/namer.json" with { type: "json" };

const here = (p) => new URL(p, import.meta.url);
const fdir = here("../../workbench/frames/");
setFrames(readdirSync(fdir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(new URL(f, fdir), "utf8"))));
const first = (g, n) => { const out = []; for (const c of g) { out.push(c); if (out.length >= n) break; } return out; };

test("one home for the lists: the Station's MIBI_NAMES is the current list, the archived list sits beside it with its date", () => {
  assert.equal(NAME_LIST_CURRENT, "es-pets-1"); assert.deepEqual(Object.keys(NAME_LISTS), ["es-pets-1", "en-short-1"]);
  assert.equal(S.MIBI_NAMES, MIBI_NAMES); assert.equal(MIBI_NAMES, NAME_LISTS["es-pets-1"]); assert.equal(MIBI_NAMES_ARCHIVED, NAME_LISTS["en-short-1"]);
  assert.deepEqual(NAME_LIST_ARCHIVED, { "en-short-1": "2026-10-27" });
  assert.deepEqual(MIBI_NAMES_ARCHIVED, ["Dot", "Moss", "Bean", "Fig", "Nib", "Tuft", "Pebble", "Wren", "Pip", "Sorrel", "Burr", "Quill"]);
});

test("the Companion page reads the same list from the same file", () => {
  const page = readFileSync(here("../../exploration/index.html"), "utf8");
  assert.ok(/import\('\.\.\/play\/src\/names\.mjs'\)\.then\(m => \{ MIBI_NAMES = m\.MIBI_NAMES;/.test(page), "loaded from the shared file, not copied"); assert.ok(!/const MIBI_NAMES\s*=/.test(page), "no second list on the page");
});

test("es-pets-1: 256 names, the owner's own pets first, unique by nameKey, none over NAME_MAX, no digit, none a species' or clan's name", () => {
  assert.equal(MIBI_NAMES.length, 256);
  assert.deepEqual(MIBI_NAMES.slice(0, 9), ["Tita", "Kenya", "Simba", "Nina", "Arya", "Wero", "Jax", "Totopo", "Churro"]); assert.equal(MIBI_NAMES.at(-1), "Pistache");
  const keys = MIBI_NAMES.map(S.nameKey); assert.equal(new Set(keys).size, 256, "unique by nameKey");
  for (const n of MIBI_NAMES) { assert.ok([...n].length <= S.NAME_MAX, n + " is over NAME_MAX"); assert.ok(!/\d/.test(n), n + " has a digit"); assert.ok(/^\p{Lu}\p{Ll}+$/u.test(n), n + " is a capital and small letters"); }
  const forbidden = new Map(); for (const id of frameIds()) { const f = frameOf(id); forbidden.set(S.nameKey(f.species.name), "species " + f.species.name); if (f.taxonomy?.clanName) forbidden.set(S.nameKey(f.taxonomy.clanName), "clan " + f.taxonomy.clanName); }
  assert.ok(forbidden.size > 0, "the frames are loaded");
  for (const n of MIBI_NAMES) assert.ok(!forbidden.has(S.nameKey(n)), n + " is the " + forbidden.get(S.nameKey(n)));
  for (const n of MIBI_NAMES) assert.equal(S.nameProblem(S.freshSt("w", 0), { id: 1, name: "" }, n), null, n + " could be given");
});

test("a new game's first twelve draws are the list's first twelve; a new draw takes the first unused name", () => {
  S.useNameList(); const st = S.freshSt("w1", 1, 1);
  assert.deepEqual(Array.from({ length: 12 }, () => S.drawName(st)), MIBI_NAMES.slice(0, 12));
  assert.equal(S.drawName(st), MIBI_NAMES[12]);
  const s2 = S.freshSt("w2", 1, 1); s2.namesUsed.push("tita", "nina"); assert.equal(S.drawName(s2), "Kenya"); assert.equal(S.drawName(s2), "Simba"); assert.equal(S.drawName(s2), "Arya", "the first unused, Nina skipped");
  const s3 = S.freshSt("w3", 1, 1); assert.deepEqual(S.peekNames(s3, { id: 1, name: "" }, 3), ["Tita", "Kenya", "Simba"]);
});

test("an old save's names stay: its mibis keep them, and a held name is not drawn again", () => {
  const st = S.freshSt("w1", 1, 1); const mk = (id, name) => ({ id, name, species: "S01", sp: 0, released: false });
  st.mibis.push(mk(1, "Dot"), mk(2, "Moss"), mk(3, "Tita")); st.nextMibi = 4; S.normalize(st);
  assert.deepEqual(st.mibis.map((m) => m.name), ["Dot", "Moss", "Tita"], "names unchanged by normalize");
  assert.ok(st.namesUsed.includes("dot") && st.namesUsed.includes("tita"));
  assert.equal(S.drawName(st), "Kenya", "Tita is held, the next of the current list");
  S.useNameList("en-short-1"); const old = S.freshSt("w1", 1, 1); assert.equal(S.drawName(old), "Dot", "pinned: the archived list draws as it did"); S.useNameList();
});

test("the archived list can be pinned by key; an unknown key is refused", () => {
  S.useNameList("en-short-1"); assert.deepEqual(first(S.namePool({ heads: [], tails: [] }), 3), ["Dot", "Moss", "Bean"]); S.useNameList();
  assert.deepEqual(first(S.namePool({ heads: [], tails: [] }), 2), ["Tita", "Kenya"]); assert.throws(() => S.useNameList("nope"));
});

test("every name draws on the face: each letter has a glyph in every font a name is set in", () => {
  const metrics = JSON.parse(readFileSync(here("../../face/dist/metrics.json"), "utf8")), fonts = Object.keys(metrics.fonts); assert.ok(fonts.length >= 4, fonts.join());
  const chars = new Set(MIBI_NAMES.join("") + MIBI_NAMES_ARCHIVED.join("")); assert.ok(["á", "é", "í", "ó", "ú", "ñ"].every((c) => chars.has(c)), "the accents the list uses");
  for (const f of fonts) for (const c of chars) assert.ok(metrics.fonts[f].advance[c.codePointAt(0)] > 0, `${c} (U+${c.codePointAt(0).toString(16)}) has no glyph in Inter ${f}`);
  const width = createMeasure(metrics); for (const n of MIBI_NAMES) assert.ok(width(n, "20") > 0);
  for (const c of "ÁÉÍÓÚÑ") for (const f of fonts) assert.ok(metrics.fonts[f].advance[c.codePointAt(0)] > 0, `${c} in ${f}`);   // the capitals the face holds (a typed name may start with one)
});

test("every name can be typed in the namer: each letter is on the letters page or the accents page", () => {
  const typeable = new Set([...NAMER.keys.pages.letters, ...NAMER.keys.pages.accents].filter((c) => c != null).flatMap((c) => [c, c.toUpperCase()]));
  for (const n of [...MIBI_NAMES, ...MIBI_NAMES_ARCHIVED]) for (const c of n) assert.ok(typeable.has(c), `${n}: ${c} has no key`);
  assert.ok(MIBI_NAMES.some((n) => /ñ/.test(n)) && MIBI_NAMES.some((n) => /ú/.test(n)), "the accents page is used");
});
