// The spec's derived rules (lvgl-switch.md §2.3 item 5): pure functions of a spec file's numbers and the counts the props give. They draw nothing. They are the reference the regions check
// compares the face against, and the second implementation of each rule beside the C one in prototypes/face/src/layout/layout.c; tests/vectors/layout.json, made from this file, is run by both.
// The rules are the closed list of station-layouts.md: the slanted rail's run, the page's size and grid by trait count, the rack's pitch, the kin ring's pitch, the name plate's width, the
// message plate's place, the stamp's cell. They were ui/layout.mjs, components/list.mjs, views/pods.mjs and components/stampLabel.mjs, which are frozen with the JavaScript drawing layer.

// The slanted chapter rail (frame.json regions.rail): tabs hang from the top bar, each a parallelogram of top-edge width w leaning `slant` px over its height, each starting where the one
// before ends. One to `fullUpTo` chapters: all full. More, up to `max`: compact, and the open chapter's tab full. `x0`: Pods at rail.pods.x, or centred on 512 and snapped down to the grid.
// More than `max` comes back to the UI designer (overflow: true, no tabs). Returns { tabs: [{ rect: [x, y, w, h], full }], run, x0, overflow }.
export function slantTabs(rail, n, open = 0, where = "pods") {
  if (n <= 0) return { tabs: [], run: 0, x0: rail.pods.x, overflow: false };
  if (n > rail.max) return { tabs: [], run: 0, x0: rail.pods.x, overflow: true };
  const compact = n > rail.fullUpTo, widths = Array.from({ length: n }, (_, i) => (!compact || i === open ? rail.full : rail.compact));
  const run = widths.reduce((a, b) => a + b, 0) + rail.slant;
  const x0 = where === "centred" || rail.pods.x === "centred" ? Math.floor((rail.centred.on - run / 2) / rail.centred.snap) * rail.centred.snap : rail.pods.x;
  let x = x0; const tabs = widths.map((w, i) => { const r = { rect: [x, rail.y, w, rail.h], full: w === rail.full }; x += w; return r; });
  return { tabs, run, x0, overflow: false };
}
// The pixel columns a slanted side has shifted right by at row r (0-based from the top): the side is the line x + slant * (y - top) / h, taken at the row's centre and floored.
export const slantAt = (rail, r) => Math.floor((rail.slant * (r + 0.5)) / rail.h);

// The page's size by its trait count: the spec's table (page.sizeByCount, [w, h] by count 1 to 8), else the region's own rectangle.
export function pageSize(page, n) {
  const t = page.sizeByCount; if (!t) return page.rect.slice(2);
  return t[String(Math.max(1, Math.min(n, Object.keys(t).length)))].slice();
}
// The chapter page's grid by the focused chapter's trait count: the spec's grid table names the cells and the picture size per count ("1", "2", "3-4", "5-6"); more than the table holds comes back to the UI designer (overflow).
export function pageGrid(page, n) {
  const table = page.grid || {};
  const row = Object.entries(table).find(([k]) => { const [a, b] = k.split("-").map(Number); return n >= a && n <= (b ?? a); });
  if (!row || n <= 0) return { cells: [], picture: null, overflow: n > 0 };
  const [, g] = row, [px, py] = page.rect;
  return { cells: g.cells.slice(0, n).map((c) => [px + c[0], py + c[1], c[2], c[3]]), picture: g.picture.slice(), overflow: false };
}
// A rack place (collection.places) and a kin ring (a kin region): the template offset by the pitch.
export const placeRect = (L, i) => [L.places.first[0] + L.places.pitch[0] * (i % L.places.grid[0]), L.places.first[1] + L.places.pitch[1] * Math.floor(i / L.places.grid[0]), L.places.first[2], L.places.first[3]];
export const kinRect = (K, i) => [K.first[0] + K.pitch[0] * i, K.first[1] + K.pitch[1] * i, K.first[2], K.first[3]];
// The name plate's width: the name and its padding, rounded up to the series' step, between its least and its most. `textWidth` is the name's width at the plate's size.
export const plateWidth = (N, textWidth) => Math.min(N.plate.max, Math.max(N.plate.min, Math.ceil((textWidth + 2 * N.plate.pad) / N.plate.round) * N.plate.round));
// The message plate: centred on x 512, at most 640 wide, 16 + 20 px a line tall, its bottom edge at y 550, or its top at y 112 when that would cover the screen's focal box.
export function platePosition(plate, lines, widest, focal = null) {
  const w = Math.min(plate.maxWidth, Math.max(0, Math.ceil(widest)) + plate.pad * 2), h = plate.lead + plate.line * Math.max(1, lines);
  const x = plate.centre - Math.round(w / 2);
  let y = plate.bottom - h;
  if (focal && focal[1] < y + h && y < focal[1] + focal[3] && focal[0] < x + w && x < focal[0] + focal[2]) y = plate.topOverFocal;
  return [x, y, w, h];
}
// The stamp's cell: floor(inner / (N + 2)), never less than `least`.
export const stampCell = (N, inner = 104, least = 2) => Math.max(least, Math.floor(inner / (N + 2)));

// ---- the vectors' interface (tests/vectors/layout.json): a rule by name with integer arguments over a spec subtree, its answer flattened to integers. layout_eval in layout.c is the same function. ----
export function evaluate(rule, node, args) {
  const out = [];
  switch (rule) {
    case "slantTabs": { const r = slantTabs(node, args[0], args[1], args[2] ? "centred" : "pods"); out.push(+r.overflow, r.run, typeof r.x0 === "number" ? r.x0 : 0, r.tabs.length); for (const t of r.tabs) out.push(...t.rect, +t.full); break; }
    case "slantAt": out.push(slantAt(node, args[0])); break;
    case "pageSize": out.push(...pageSize(node, args[0])); break;
    case "pageGrid": { const g = pageGrid(node, args[0]); out.push(+g.overflow, g.cells.length); for (const c of g.cells) out.push(...c); out.push(...(g.picture ?? [0, 0])); break; }
    case "placeRect": out.push(...placeRect(node, args[0])); break;
    case "kinRect": out.push(...kinRect(node, args[0])); break;
    case "plateWidth": out.push(plateWidth(node, args[0])); break;
    case "platePosition": out.push(...platePosition(node, args[0], args[1], args[2] ? args.slice(3, 7) : null)); break;
    case "stampCell": out.push(stampCell(args[0], args[1], args[2])); break;
    default: throw new Error("unknown rule " + rule);
  }
  return out;
}
