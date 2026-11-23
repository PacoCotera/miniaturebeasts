// The top bar's part-of-day pictures (day-dial-swap-1, art director's sign 2026-11-23): the six files are the signed bytes, and the bar picks the one partOfDay names.
//   node --test prototypes/exploration/tests/day-dial-pictures.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { DAY, partOfDay } from "../src/words.mjs";

const PAGE = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const SIGNED = { dawn: "85ef4c1038cfe0f18d611935d1f3f869393d908b96f838b2f1887f5e9bb6a6ab", morning: "5de6d58b78604254cdfea509a7516c2d5a280b0f0b1754f736df19c0d9b299dd",
  midday: "e1f7deefe239d69b0c9bff80bf585dd4e0332f091e8aba476c3c218baa2db128", afternoon: "5038067d74bbf58014fb8eef481c74e5a7af1c5fd3a82593b3156cc6ffdc9af5",
  dusk: "50430f7728c3ae010e06ea019b56e06139efcae1d383e378804abbcd9c25f0c9", night: "e61a8ed322f0dcbf910ab6555b293668a98d6626a33fb312bc18dd0811dc1fe6" };
const sha = f => createHash("sha256").update(readFileSync(new URL("../../../art/day-dial/frames/" + f, import.meta.url))).digest("hex");

test("each picture's sha256 is the signed one (ledger ids be14733cf5, cab85581e9, bf2e2840b7, aefcfd2a07, 44c846e058, c41026351e)", () => {
  for (const [part, h] of Object.entries(SIGNED)) assert.equal(sha("day-" + part + ".png"), h, part);
  const ledger = "/home/mb/mb/mibi-art/boards/signed.jsonl";   // where the ledger is on the dev machine; CI has the pinned hashes above
  if (existsSync(ledger)) {
    const rows = readFileSync(ledger, "utf8").split("\n").filter(Boolean).map(l => JSON.parse(l));
    for (const [part, h] of Object.entries(SIGNED)) assert.ok(rows.some(r => r.slot === "day-" + part && r.sha256 === h), part + " is in the ledger with this sha");
  }
});

test("the bar loads those six files and draws the one partOfDay names, as loaded; the Station keeps the sun", () => {
  assert.deepEqual(PAGE.match(/const DAY_PARTS = \[([^\]]*)\]/)[1].replace(/['\s]/g, "").split(","), DAY.parts.map(p => p[0]), "the file list is the six parts, in order");
  assert.deepEqual(DAY.parts.map(p => partOfDay(p === DAY.parts[0] ? 0 : DAY.parts.slice(0, DAY.parts.indexOf(p)).reduce((s, q) => s + q[1], 0))), DAY.parts.map(p => p[0]));
  assert.match(PAGE, /'day-' \+ n \+ '\.png'/, "the file is day-<part>.png");
  assert.match(PAGE, /const part = S\.exp && S\.day \? dayPart\(\) : null;/, "on a walk the part comes from dayPart; at the Station none");
  assert.match(PAGE, /const pic = part && DAY_ART\[part\];\n\s+if \(pic\) g\.drawImage\(pic, x - 14, 10\); else blit\(art\('i-sun'/, "the picture by part, else the sun");
  assert.ok(!/function dayPic|i-day-/.test(PAGE), "the greybox is gone");
});
