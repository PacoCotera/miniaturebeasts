// The reading dial's numbers (readDial): open chapters read ÷ open chapters, and the shut sealed count; null for an unidentified pod.
//   node --test prototypes/station/tests/read-dial.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, frameIds } from "../src/genome.mjs";
import * as S from "../src/state.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const framesDir = path.resolve(here, "../../workbench/frames");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))).filter((f) => !f.species.draft));
const byName = (n) => frameIds().map(frameOf).find((f) => f.species.name === n);
const pod = (fr, read = [], idd = 1) => ({ id: "p", species: fr.species.id, idd, read: [...read] });

test("readDial: an Untuva has one shut sealed chapter; a Tuikis has none; an unidentified pod has no dial", () => {
  const unt = byName("Untuva"), tui = byName("Tuikis");
  const open = unt.chapters.filter((c) => !c.sealed), sealed = unt.chapters.filter((c) => c.sealed);
  assert.equal(sealed.length, 1);
  assert.deepEqual(S.readDial(pod(unt), S.DEFAULT_SETTINGS), { n: 0, m: open.length, sealed: 1 });
  assert.deepEqual(S.readDial(pod(unt, [open[0].id]), S.DEFAULT_SETTINGS), { n: 1, m: open.length, sealed: 1 });
  assert.deepEqual(S.readDial(pod(unt, open.map((c) => c.id)), S.DEFAULT_SETTINGS), { n: open.length, m: open.length, sealed: 1 });
  assert.deepEqual(S.readDial(pod(tui, [tui.chapters[0].id]), S.DEFAULT_SETTINGS), { n: 1, m: tui.chapters.length, sealed: 0 });
  assert.equal(S.readDial(pod(tui, [], 0), S.DEFAULT_SETTINGS), null);
});

test("readDial: sealedOpen counts the sealed chapter as open; agrees with fullyRead", () => {
  const unt = byName("Untuva"), all = unt.chapters.map((c) => c.id), st = { ...S.DEFAULT_SETTINGS, sealedOpen: true };
  assert.deepEqual(S.readDial(pod(unt), st), { n: 0, m: unt.chapters.length, sealed: 0 });
  assert.deepEqual(S.readDial(pod(unt, all), st), { n: all.length, m: all.length, sealed: 0 });
  const d = S.readDial(pod(unt, unt.chapters.filter((c) => !c.sealed).map((c) => c.id)), S.DEFAULT_SETTINGS);
  assert.equal(d.n === d.m, !!S.fullyRead(pod(unt, unt.chapters.filter((c) => !c.sealed).map((c) => c.id)), S.DEFAULT_SETTINGS));
});
