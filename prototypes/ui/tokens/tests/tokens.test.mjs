// The token outputs hold exactly the values the faces use: the Station's palettes/station.json, and the Companion's PALETTE, which its page reads from the output.
// Run: node --test prototypes/ui/tokens/tests/tokens.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const out = (f) => root + "prototypes/ui/tokens/out/" + f;

test("the Station output equals palettes/station.json (names, values, order)", () => {
  const want = JSON.parse(fs.readFileSync(root + "prototypes/ui/palettes/station.json", "utf8")).colours;
  const got = JSON.parse(fs.readFileSync(out("station-palette.json"), "utf8")).colours;
  assert.deepEqual(got, want);
});

test("the Companion's palette is the Companion output itself (exploration/src/data/palette.mjs hands it on)", async () => {
  const { PALETTE } = await import(out("companion-colors.mjs"));
  const page = await import(root + "prototypes/exploration/src/data/palette.mjs");
  assert.equal(page.PALETTE, PALETTE);
  assert.equal(PALETTE.length, 51);
});

test("the CSS carries every Station colour and the Companion's own sage", () => {
  const css = fs.readFileSync(out("tokens.css"), "utf8");
  const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  const station = JSON.parse(fs.readFileSync(root + "prototypes/ui/palettes/station.json", "utf8")).colours;
  for (const [n, h] of station) assert.ok(css.includes(`--mb-${kebab(n)}: ${h};`), n);
  assert.ok(css.includes("--mb-companion-sage: #87947f;"));
  for (const s of ["--mb-space-4: 4px;", "--mb-space-48: 48px;", "--mb-size-web-14: 14px;", "--mb-duration-160: 160ms;", "--mb-duration-300: 300ms;"]) assert.ok(css.includes(s), s);
});
