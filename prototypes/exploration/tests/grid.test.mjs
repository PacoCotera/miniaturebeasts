// The reach view's grid (the UI designer's ruling, the art director's signed "fix" variant): no dotted centre cross,
// orange brackets on the pawn's cell (2 px, arms 10 at tier 1 and 6 at tier 2), the pending outline skipping the dots
// under the arms on the pawn's cell only, and the signs at pad 4. Read from the source of drawReachView in index.html.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const PAGE = readFileSync(new URL("../index.html", import.meta.url), "utf8");
function source(name) {
  const fn = PAGE.match(new RegExp("^function " + name + "\\(", "m"));
  if (!fn) throw new Error("not found in index.html: " + name);
  let i = PAGE.indexOf("{", fn.index), depth = 0, q = null;
  for (; i < PAGE.length; i++) {
    const c = PAGE[i];
    if (q) { if (c === "\\") i++; else if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === "`") q = c;
    else if (c === "/" && PAGE[i + 1] === "/") i = PAGE.indexOf("\n", i);
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return PAGE.slice(fn.index, i + 1);
  }
  throw new Error("unclosed: " + name);
}
const SRC = source("drawReachView");
const code = SRC.split("\n").map(l => l.replace(/\/\/.*$/, "")).join("\n");   // comments stripped

test("the reach view draws no dotted cross through a cell's centre", () => {
  assert.doesNotMatch(code, /R\(x \+ h, y \+ k, 1, 1, C\.ink\)/);
  assert.doesNotMatch(code, /R\(x \+ k, y \+ h, 1, 1, C\.ink\)/);
  assert.doesNotMatch(code, /R\(x \+ h,[^)]*C\.ink\)/);
});

test("the pawn's cell has orange 2 px brackets, arms 10 at tier 1 and 6 at tier 2, drawn after the pawn", () => {
  assert.match(code, /L = q\.big \? 10 : 6/);
  const pawn = code.indexOf("blit(pawn,"), br = code.indexOf("R(bx, by, L, 2, C.orange)");
  assert.ok(pawn > 0 && br > pawn, "the top-left bracket's arm (x, y, L, 2) is drawn after the pawn");
  assert.match(code, /R\(bx, by, 2, L, C\.orange\)/);
  assert.equal((code.match(/C\.orange\)/g) || []).length, 8, "four corners, two arms each");
});

test("the pending outline skips the dots under the arms on the pawn's cell only", () => {
  assert.match(code, /onPawn = c === ex\.pos/);
  assert.match(code, /if \(onPawn && \(k < L \+ 2 \|\| k > q\.cs - L - 3\)\) continue;/);
  // the kept range at each tier: L + 2 <= k <= cs - L - 3
  const kept = (cs, L) => { const o = []; for (let k = 2; k < cs - 2; k += 3) if (!(k < L + 2 || k > cs - L - 3)) o.push(k); return o; };
  assert.deepEqual([kept(78, 10)[0], kept(78, 10).at(-1)], [14, 65]);
  assert.deepEqual([kept(48, 6)[0], kept(48, 6).at(-1)], [8, 38]);
});

test("the corner sign slots sit at pad 4", () => {
  assert.match(code, /const pad = 4;/);
  assert.doesNotMatch(code, /const pad = 3;/);
});
