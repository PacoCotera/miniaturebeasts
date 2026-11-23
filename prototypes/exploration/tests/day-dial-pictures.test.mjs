// The top bar's part-of-day pictures (day-dial-swap-1, art director's sign 2026-11-23): the six files are the signed bytes, and the bar picks the one partOfDay names.
//   node --test prototypes/exploration/tests/day-dial-pictures.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { DAY, partOfDay } from "../src/words.mjs";

const PAGE = readFileSync(new URL("../index.html", import.meta.url), "utf8");
// The signed shas, copied from the art ledger lines (mibi-art signed.jsonl) with these ids: dawn d0f6911e75, morning 0dca3108bd, midday e888a73ecb, afternoon b842e156ba, dusk 0928ab9c1e, night ba19e2e9d6.
const SIGNED = { dawn: "8184343a2214d9c7b0e8daa1bcbc6866e5a83f1b92654a4d8ba7d382c0a5c895", morning: "194042856c5eee726e1d1ad4ac76a5acdc24fcd8a36d8665375cc7e1f87de461",
  midday: "021e7d17b64679c80c9440b96278fbc23babdedcaadc9b73cb1948284497c48b", afternoon: "6bb481cffc02e3874d44ac5d39d08b102d08a89e392792debbf2155ecad5aba9",
  dusk: "5dd2718a626a3d4f8ca61e7e445209009a0d2d88b2ae80ccbbefb65b95fd2598", night: "2f7cdbbd98139e6bf84d9ee06429b15cf0bf5cb1434dcc37f099327f29fbf568" };
const sha = f => createHash("sha256").update(readFileSync(new URL("../../../art/day-dial/frames/" + f, import.meta.url))).digest("hex");

test("each picture's sha256 is the signed one (14x14, ledger ids d0f6911e75, 0dca3108bd, e888a73ecb, b842e156ba, 0928ab9c1e, ba19e2e9d6)", () => {
  for (const [part, h] of Object.entries(SIGNED)) assert.equal(sha("day-" + part + ".png"), h, part);
});

test("the bar loads those six files and draws the one partOfDay names, as loaded; the Station keeps the sun", () => {
  assert.deepEqual(PAGE.match(/const DAY_PARTS = \[([^\]]*)\]/)[1].replace(/['\s]/g, "").split(","), DAY.parts.map(p => p[0]), "the file list is the six parts, in order");
  assert.deepEqual(DAY.parts.map(p => partOfDay(p === DAY.parts[0] ? 0 : DAY.parts.slice(0, DAY.parts.indexOf(p)).reduce((s, q) => s + q[1], 0))), DAY.parts.map(p => p[0]));
  assert.match(PAGE, /'day-' \+ n \+ '\.png'/, "the file is day-<part>.png");
  assert.match(PAGE, /const part = S\.exp && S\.day \? dayPart\(\) : null;/, "on a walk the part comes from dayPart; at the Station none");
  assert.match(PAGE, /const pic = part && DAY_ART\[part\];\n\s+if \(pic\) g\.drawImage\(pic, x - 17, 9\); else blit\(art\('i-sun'/, "the picture by part, else the sun");
  assert.match(PAGE, /px\.width !== 14 \|\| px\.height !== 14/, "the loader takes 14 x 14 pictures");
  assert.ok(!/function dayPic|i-day-/.test(PAGE), "the greybox is gone");
});
