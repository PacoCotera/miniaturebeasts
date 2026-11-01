import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { sheet, sheetHtml, renderSheet, checkLayout, loadPlaywright, MIN_FONT_PX } from "../page.mjs";
import { tileLines } from "../sheets.mjs";
import { blank } from "../imgtools.mjs";
import { WORKBENCH } from "../paths.mjs";

const pic = (w, h) => blank(w, h, [90, 90, 90]);
const long = [["H/S 0.52, eye t 0.9", "name"], ["Outside the house", "bad"], ["Breaks eye share, face stack, far eye, head breadth, nose at eye", "bad"], ["H/S 0.52, E/W 0.32, share 0.245", "dim"]];
const havePw = (() => { try { return existsSync(path.join(process.env.PW_HOME ?? path.join(process.env.HOME, "pw156"), "node_modules/playwright")); } catch { return false; } })();

test("a sheet is an HTML page: real text labels at 14 px or more in a system sans, pictures as <img> with their pixels kept", () => {
  const spec = sheet("A title", [{ pics: [[{ img: pic(96, 88), scale: 2 }]], lines: long }], 1), files = [], { html } = sheetHtml(spec, "x-img", files);
  assert.match(html, /DejaVu Sans/); assert.match(html, /image-rendering:pixelated/); assert.match(html, /<span class="l bad">Outside the house<\/span>/);
  assert.match(html, /width="192" height="176"/); assert.equal(files.length, 1);
  assert.ok(MIN_FONT_PX >= 14); assert.ok(!/font:\s*\d+px/.test(html.replace('font:14px/1.35', '')), "one body size, set at 14");
});
test("checkLayout refuses a label wider than its column, two overlapping labels, a label over a picture, a label under 14 px and one off the page", () => {
  const L = { x: 20, y: 20, w: 200, h: 40, text: "A", scrollW: 200, font: 14, col: { x: 16, y: 10, w: 240, h: 300 } }, ok = { labels: [L, { ...L, y: 80, text: "B" }], titles: [], imgs: [{ x: 16, y: 130, w: 100, h: 100 }], page: { w: 400, h: 400, scrollW: 400 } };
  assert.ok(checkLayout(ok));
  assert.throws(() => checkLayout({ ...ok, labels: [{ ...L, scrollW: 260 }] }), /wider than its column/);
  assert.throws(() => checkLayout({ ...ok, labels: [L, { ...L, y: 50, text: "B" }] }), /overlaps/);
  assert.throws(() => checkLayout({ ...ok, imgs: [{ x: 16, y: 50, w: 100, h: 100 }] }), /overlaps a picture/);
  assert.throws(() => checkLayout({ ...ok, labels: [{ ...L, font: 12 }] }), /12px/);
  assert.throws(() => checkLayout({ ...ok, labels: [{ ...L, x: 380, col: { x: 300, y: 0, w: 200, h: 300 } }] }), /leaves the page/);
  assert.throws(() => checkLayout({ ...ok, labels: [{ ...L, x: 10 }] }), /crosses its column/);
});
test("the page's own layout fits long labels to the column in every column count we use, and the check passes on what the browser laid out", { skip: !havePw && "Playwright (~/pw156) is not installed" }, async () => {
  const dir = mkdtempSync(path.join(WORKBENCH, "out", "sheet-test-")), pw = await loadPlaywright();
  try {
    for (const [cols, cw] of [[4, 304], [3, 260], [3, 192], [2, 304]]) {
      const cells = Array.from({ length: 2 * cols }, () => ({ pics: [[{ img: pic(Math.min(cw, 120), 100) }], [{ img: pic(40, 40), scale: 2 }]], lines: long })), r = await renderSheet(sheet("A long title for the sheet that has to wrap onto a second line when the sheet is narrow", cells, cols, { cellW: cw }), dir, `t${cols}-${cw}`, pw);
      assert.ok(r.layout.labels.length === cells.length && r.layout.labels.every((l) => l.font >= 14 && l.scrollW <= l.w + 0.5));
      assert.ok(existsSync(r.png) && existsSync(r.html) && readFileSync(r.png).length > 1000, "the HTML is kept beside the PNG");
    }
    await assert.rejects(renderSheet(sheet("t", [{ pics: [[{ img: pic(40, 40) }]], lines: [["Supercalifragilisticexpialidociousnonbreakingword", "name"]] }], 1, { cellW: 100 }), dir, "toolong", pw), /crosses its column|wider than its column/, "a word that cannot fit is an error, never a smudge");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test("a tile's label: the name, the verdict in plain words, then the numbers", () => {
  const t = { label: "H/S 0.52, eye t 0.9", measured: { "H/S": 0.52, "E/Wf": 0.3, "eye-share": 0.245 }, fails: [{ id: "R1-face", value: 0.245, range: [0.16, 0.24] }, { id: "R4-stack" }, { id: "R-far-eye" }] };
  const l = tileLines(t); assert.equal(l[0][0], "H/S 0.52, eye t 0.9"); assert.equal(l[1][0], "Outside the house"); assert.equal(l[2][0], "Breaks face stack"); assert.match(l[3][0], /^H\/S 0.52, E\/W 0.30, share 0.245$/);
  assert.equal(tileLines({ ...t, fails: [] })[1][0], "Passes the house");
  assert.match(tileLines({ ...t, fails: Array.from({ length: 5 }, (_, i) => ({ id: `Rx${i}` })) })[1][0], /^Breaks 5 rules$/);
});
