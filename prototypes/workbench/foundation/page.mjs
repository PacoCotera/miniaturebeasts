// Sheets as HTML pages: the renders are <img> (enlarged ones with image-rendering: pixelated), the labels are real text in a system sans, mixed case, 14 px or more, dark
// on light, wrapped by the page's own layout. The page is screenshot with Playwright (the install in ~/pw156; no dependency of this repository) at 1x, and the layout is
// read back from the page: no label wider than its column, none overlapping another label or a picture, none off the page, none under 14 px. A sheet that fails
// the check throws. The HTML is kept next to the PNG.
import path from "node:path";
import os from "node:os";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { saveImage } from "./imgtools.mjs";

export const MIN_FONT_PX = 14, GAP = 14;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const picsWidth = (rows) => Math.max(0, ...rows.map((r) => r.reduce((w, p) => w + p.img.width * (p.scale ?? 1), 0) + 8 * (r.length - 1)));

// a sheet spec: a title, cells { pics: [[{ img, scale }]] (rows of pictures), lines: [[text, cls]] (cls: name | bad | dim) }, a column count
export function sheet(title, cells, cols, { cellW = null, note = "" } = {}) {
  return { title, cells, cols, cellW: cellW ?? Math.max(240, ...cells.map((c) => picsWidth(c.pics))), note };
}
const CSS = `
:root{color-scheme:light}
body{margin:0;padding:16px;background:#f6f3ec;color:#1c1a20;font:14px/1.35 "DejaVu Sans",Verdana,sans-serif}
h1{font-size:20px;line-height:1.25;margin:0 0 12px;font-weight:700}
.note{margin:10px 0 0;color:#3b3844}
.grid{display:grid;gap:0 ${GAP}px;align-items:start}
.cell{display:grid;grid-row:span 2;grid-template-rows:subgrid;row-gap:6px;border-top:1px solid #cfc9bc;margin-bottom:14px;padding-top:6px}
.label{margin:0;overflow-wrap:normal}
.label .l{display:block}
.name{font-weight:700}.bad{color:#a02323;font-weight:700}.dim{color:#3b3844}
.pics{display:flex;flex-direction:column;gap:8px;align-items:flex-start}
.row{display:flex;gap:8px;align-items:flex-end}
img{display:block;image-rendering:pixelated}
`;
export function sheetHtml(spec, imgDir, files) {
  const { title, cells, cols, cellW, note } = spec;
  const body = cells.map((c, i) => `<div class="cell" data-i="${i}"><p class="label">${c.lines.map(([t, cls]) => `<span class="l ${cls ?? "dim"}">${esc(t)}</span>`).join("")}</p><div class="pics">${c.pics.map((row) => `<div class="row">${row.map((p) => { const f = `${imgDir}/${files.length}.png`; files.push([f, p.img]); return `<img src="${f}" width="${p.img.width * (p.scale ?? 1)}" height="${p.img.height * (p.scale ?? 1)}" alt="">`; }).join("")}</div>`).join("")}</div></div>`).join("\n");
  const W = cols * cellW + (cols - 1) * GAP + 32;
  return { W, html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=${W}"><title>${esc(title)}</title><style>${CSS}.grid{grid-template-columns:repeat(${cols},${cellW}px)}.cell{width:${cellW}px}</style></head><body style="width:${W - 32}px"><h1>${esc(title)}</h1><div class="grid">\n${body}\n</div>${note ? `<p class="note">${esc(note)}</p>` : ""}</body></html>` };
}

// Playwright from the ~/pw156 install (or PW_HOME), its browsers from there too
export async function loadPlaywright() {
  const home = process.env.PW_HOME ?? path.join(os.homedir(), "pw156");
  process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.join(home, "browsers");
  return createRequire(path.join(home, "x.js"))("playwright");
}

// what the page laid out, as boxes; throws when a label is wider than its column, overlaps another label or a picture, leaves the page, or is under 14 px
export function checkLayout(m) {
  const bad = [], hit = (a, b) => a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;
  for (const l of m.labels) {
    if (l.font < MIN_FONT_PX) bad.push(`label "${l.text}" is ${l.font}px`);
    if (l.scrollW > l.w + 0.5) bad.push(`label "${l.text}" is wider than its column (${l.scrollW} > ${l.w})`);
    if (l.x < l.col.x - 0.5 || l.x + l.w > l.col.x + l.col.w + 0.5) bad.push(`label "${l.text}" crosses its column`);
    if (l.x < 0 || l.x + l.w > m.page.w + 0.5 || l.y < 0 || l.y + l.h > m.page.h + 0.5) bad.push(`label "${l.text}" leaves the page`);
  }
  const all = [...m.labels.map((l) => ({ ...l, what: l.text })), ...m.titles.map((l) => ({ ...l, what: l.text }))];
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) if (hit(all[i], all[j])) bad.push(`"${all[i].what}" overlaps "${all[j].what}"`);
  for (const l of all) for (const p of m.imgs) if (hit(l, p)) bad.push(`"${l.what}" overlaps a picture`);
  for (const t of m.titles) if (t.scrollW > t.w + 0.5 || t.x + t.w > m.page.w + 0.5) bad.push(`title "${t.text}" leaves the page`);
  if (m.page.scrollW > m.page.w + 0.5) bad.push(`the page is wider than its sheet (${m.page.scrollW} > ${m.page.w})`);
  if (bad.length) throw new Error("sheet layout: " + bad.join("; "));
  return true;
}
const MEASURE = () => {
  const box = (e) => { const r = e.getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height }; };
  const labels = [...document.querySelectorAll(".cell .label")].map((e) => ({ ...box(e), text: e.textContent.slice(0, 60), scrollW: e.scrollWidth, font: parseFloat(getComputedStyle(e).fontSize), col: box(e.closest(".cell")) }));
  const titles = [...document.querySelectorAll("h1, .note")].map((e) => ({ ...box(e), text: e.textContent.slice(0, 60), scrollW: e.scrollWidth }));
  return { labels, titles, imgs: [...document.querySelectorAll("img")].map(box), page: { w: document.documentElement.clientWidth, h: document.documentElement.scrollHeight, scrollW: document.documentElement.scrollWidth } };
};
// write dir/name.html (+ dir/name-img/), screenshot it to dir/name.png at 1x, check the layout. Returns { png, html, layout }.
export async function renderSheet(spec, dir, name, pw = null) {
  mkdirSync(path.join(dir, `${name}-img`), { recursive: true });
  const files = [], { W, html } = sheetHtml(spec, `${name}-img`, files);
  for (const [f, img] of files) saveImage(path.join(dir, f), img);
  const htmlFile = path.join(dir, `${name}.html`); writeFileSync(htmlFile, html);
  const { chromium } = pw ?? (await loadPlaywright()), browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: W, height: 200 }, deviceScaleFactor: 1 });
    await page.goto("file://" + htmlFile); await page.evaluate(() => document.fonts.ready); await page.waitForFunction(() => [...document.images].every((i) => i.complete));
    const layout = await page.evaluate(MEASURE); checkLayout(layout);
    const png = path.join(dir, `${name}.png`); await page.screenshot({ path: png, fullPage: true });
    return { png, html: htmlFile, layout };
  } finally { await browser.close(); }
}
