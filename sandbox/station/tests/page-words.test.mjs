// The two pages' chrome never says "Caddy" to the player (loop audit 2, finding 12): visible text, title, aria-label and alt in station/index.html and play/index.html. Comments, ids, classes and code names stay.
//   node --test prototypes/station/tests/page-words.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "../..");
function visible(file) {
  const html = readFileSync(path.join(root, file), "utf8").replace(/<!--[\s\S]*?-->/g, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<script[\s\S]*?<\/script>/gi, "");
  const out = [];
  for (const m of html.matchAll(/\s(?:title|aria-label|alt)="([^"]*)"/g)) out.push(m[1]);
  for (const m of html.matchAll(/>([^<]+)</g)) out.push(m[1]);
  return out;
}
for (const file of ["station/index.html", "play/index.html"]) {
  test(`${file}: no "Caddy" in visible text, title, aria-label or alt`, () => {
    const found = visible(file).filter((s) => /caddy/i.test(s));
    assert.deepEqual(found, []);
  });
}
test("the Keys help and the dock controls use the player's words", () => {
  const st = readFileSync(path.join(root, "station/index.html"), "utf8"), pl = readFileSync(path.join(root, "play/index.html"), "utf8");
  assert.ok(st.includes("The Dock control, or <kbd>D</kbd>: <b>Dock</b> or <b>Lift</b> the Companion."));
  // the play page has one Dock / Lift key: its page words say "Dock the Companion", the shell says "Lift the Companion" in the same label and title once docked
  const shell = readFileSync(path.join(root, "play/src/shell.mjs"), "utf8");
  assert.ok(pl.includes('id="dockKey"') && pl.includes('aria-label="Dock the Companion"') && pl.includes('title="Dock the Companion"') && pl.includes('aria-label="The dock\'s screen"'));
  assert.ok(shell.includes('"Lift the Companion"'));
});
