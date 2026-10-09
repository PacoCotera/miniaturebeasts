// Layout: a spec file's regions placed on the screen, with only the rules the layout spec states
// (station-layouts.md): the chapter rail's compaction by chapter count, the chapter page's grid by trait count,
// and where the message plate sits. Every other rectangle is read from the spec as written. No general layout
// engine: a region is absolute, and a builder never retypes a rectangle.

export const rectOf = (r) => (Array.isArray(r) ? r.slice() : [r.x, r.y, r.w, r.h]);
export const offsetRect = (r, dx, dy) => [r[0] + dx, r[1] + dy, r[2], r[3]];

// The spec's regions as { id: { rect, ...fields } }, each rect copied.
export function regions(spec) {
  const out = {};
  for (const [id, r] of Object.entries(spec.regions)) out[id] = { ...r, rect: r.rect ? rectOf(r.rect) : null };
  return out;
}
// A repeated item (a well, a slot): the template's rectangles offset by the pitch, i times.
export function repeat(template, i, pitch) { return offsetRect(rectOf(template), (pitch[0] || 0) * i, (pitch[1] || 0) * i); }

// The chapter rail (station-layouts.md, "The chapter rail"): tabs on the rail's rectangle by chapter count.
//   up to seven: 112 wide on a 120 pitch from the rail's left edge; eight: 96 on 104, 824 in all, centred;
//   nine to twelve: compact 56 wide, the focused tab 112, on an 8 px gap, centred; more than twelve comes back
//   to the UI designer (overflow: true, no tabs). The rail's own rule table rides in the spec (rail.tabs).
export function railTabs(rail, n, focused = -1) {
  const [x0, y, w, h] = rail.rect, t = rail.tabs ?? { wide: [112, 120], eight: [96, 104], compact: [56, 112, 8], max: 12 };
  if (n <= 0) return { tabs: [], overflow: false };
  if (n > (t.max ?? 12)) return { tabs: [], overflow: true };
  if (n <= 7) return { tabs: Array.from({ length: n }, (_, i) => [x0 + t.wide[1] * i, y, t.wide[0], h]), overflow: false, mode: "wide" };
  if (n === 8) { const total = t.eight[1] * (n - 1) + t.eight[0], s = x0 + Math.round((w - total) / 2); return { tabs: Array.from({ length: n }, (_, i) => [s + t.eight[1] * i, y, t.eight[0], h]), overflow: false, mode: "eight" }; }
  const [narrow, wideFocused, gap] = t.compact, total = (n - 1) * narrow + wideFocused + (n - 1) * gap;
  let x = x0 + Math.round((w - total) / 2);
  const tabs = []; for (let i = 0; i < n; i++) { const tw = i === focused ? wideFocused : narrow; tabs.push([x, y, tw, h]); x += tw + gap; }
  return { tabs, overflow: false, mode: "compact" };
}

// The slanted chapter rail (station-layouts.md, "The chapter rail", corrected): tabs hang from the top bar (y 40, 40 tall), each a
// parallelogram of top-edge width w leaning `slant` px over its height, each starting where the one before ends. One to
// `fullUpTo` chapters: all full (136). More, up to `max`: compact (56) and the open chapter's tab full. `x0` is where the
// run starts: Pods at rail.pods.x, Create and Incubator centred on 512 and snapped down to the 8 px grid. More than `max`
// comes back to the UI designer (overflow: true, no tabs). Returns { tabs: [{ rect: [x, y, w, h], full }], run, x0, overflow }.
export function slantTabs(rail, n, open = 0, where = "pods") {
  if (n <= 0) return { tabs: [], run: 0, x0: rail.pods.x, overflow: false };
  if (n > rail.max) return { tabs: [], run: 0, x0: rail.pods.x, overflow: true };
  const compact = n > rail.fullUpTo, widths = Array.from({ length: n }, (_, i) => (!compact || i === open ? rail.full : rail.compact));
  const run = widths.reduce((a, b) => a + b, 0) + rail.slant;
  const x0 = where === "centred" || rail.pods.x === "centred" ? Math.floor((rail.centred.on - run / 2) / rail.centred.snap) * rail.centred.snap : rail.pods.x;
  let x = x0; const tabs = widths.map((w, i) => { const r = { rect: [x, rail.y, w, rail.h], full: w === rail.full }; x += w; return r; });
  return { tabs, run, x0, overflow: false };
}
// The pixel columns a slanted side has shifted right by at row r (0-based from the top): the side is the line x + slant * (y - top) / h,
// taken at the row's centre and floored, so every row of a tab is the same width.
export const slantAt = (rail, r) => Math.floor((rail.slant * (r + 0.5)) / rail.h);

// The page's height by its trait count: the spec's table of ranges ("1-4", "5-8"), else the region's own height.
export function pageHeight(page, n) {
  const key = Object.keys(page.heightByCount || {}).find((k) => { const [a, b] = k.split("-").map(Number); return n >= a && n <= (b ?? a); });
  return key ? page.heightByCount[key] : page.rect[3];
}
// The find's rectangle on a shut chapter's page (a shut page is as short as a one-trait page): centred across the page and down the room under the heading, which ends where the grid's first row begins.
export function sealedFindRect(page, n = 1) {
  const [px, py] = page.rect, h = pageHeight(page, n), top = Object.values(page.grid)[0].cells[0][1], [, , fw, fh] = page.sealedFind;
  return [px + Math.round((page.rect[2] - fw) / 2), py + top + Math.round((h - top - fh) / 2), fw, fh];
}
// The chapter page's grid by the focused chapter's trait count: the spec's grid table names the cells and the picture
// size per count ("1", "2", "3-4", "5-6"); more than the table holds comes back to the UI designer (overflow).
export function pageGrid(page, n) {
  const table = page.grid || {};
  const row = Object.entries(table).find(([k]) => { const [a, b] = k.split("-").map(Number); return n >= a && n <= (b ?? a); });
  if (!row || n <= 0) return { cells: [], picture: null, overflow: n > 0 };
  const [, g] = row, [px, py] = page.rect;
  return { cells: g.cells.slice(0, n).map((c) => [px + c[0], py + c[1], c[2], c[3]]), picture: g.picture.slice(), overflow: false };
}

// The message plate (station-layouts.md, "The frame"): centred on x 512, at most 640 wide, 16 + 20 px a line tall,
// its bottom edge at y 550, or its top at y 112 when that would cover the screen's focal box.
export function messagePlate(plate, lines, widest, focal = null) {
  const w = Math.min(plate.maxWidth, Math.max(0, Math.ceil(widest)) + plate.pad * 2), h = plate.lead + plate.line * Math.max(1, lines);
  const x = plate.centre - Math.round(w / 2);
  let y = plate.bottom - h;
  if (focal && focal[1] < y + h && y < focal[1] + focal[3] && focal[0] < x + w && x < focal[0] + focal[2]) y = plate.topOverFocal;
  return [x, y, w, h];
}
