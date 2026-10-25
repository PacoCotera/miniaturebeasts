// Check 1 for the Library's Level 2 (library.json l2, the screen library.species): every node the face drew, against the places library.json and the props give it. `speciesParts` is the oracle of the node table, in the
// fixed node order: the sheet picture, the eight glints, the shelf (Unlocked: its panel, title, wish row, face row, sittings row), the Families shelf and its eight faces, the page; each [id, shown, box, kind] with the box the
// spec and the props put it at ("text": the line's left x or centre and its lineTop; a part not shown is a node of no size). `partDepartures` holds the face's node boxes to it; `departures` holds the face's log (one union
// rectangle a region and layer) to the regions: the sheet, the shelf inside its column, the page while lit, one ring on the focused target. Each returns the list of departures, empty when none.
import { listPitch } from "../../ui/specs/derive.mjs";
const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const within = (b, r) => b[0] >= r[0] && b[1] >= r[1] && b[0] + b[2] <= r[0] + r[2] && b[1] + b[3] <= r[1] + r[3];

// The shelf's geometry from the props: w the wish pieces, s the sittings, n the family faces, face whether the face row is drawn, u whether Unlocked is (a row of it is); h the Unlocked shelf's height (0 when not u), yf the face row,
// ys the sittings row, yr the Families shelf's top (the Unlocked shelf's top when it is not drawn) and hr its height.
export function shelfOf(spec, props) {
  const L = spec.l2, SH = L.shelf, FA = L.families, R = props.regions.shelf, w = Math.min(R.wish.length, SH.wish.max), s = Math.min(R.sittings, SH.sittings.max), n = Math.min(R.families.length, FA.max), top = SH.rect[1];
  const face = !!R.face, rows = (w > 0) + face + (s > 0), u = rows > 0, B = SH.height.between;
  const yf = top + SH.height.head + SH.height.gap + (w > 0 ? SH.wish.pitch * w + B : 0), ys = yf + (face ? SH.face.picture.size + B : 0);
  const h = u ? SH.height.head + SH.height.gap + (w > 0 ? SH.wish.pitch * w : 0) + (face ? SH.face.picture.size : 0) + (s > 0 ? SH.sittings.row : 0) + B * (rows - 1) + SH.height.pad : 0;
  const yr = u ? top + h + FA.gap : top, hr = FA.head + FA.rowGap + FA.rowPitch * (n > FA.grid[0] ? 1 : 0) + FA.rowH + FA.pad;
  return { shown: R.shown, w, s, n, face, u, h, yf, ys, yr, hr };
}
// The nodes in the fixed order: [id, shown, box, kind]; kind "pic" (a picture or its slot), "panel" (a bezel's nine-slice, or its slot), "text" (box [x, lineTop, align]).
export function speciesParts(spec, props) {
  const L = spec.l2, SH = L.shelf, FA = L.families, R = props.regions, sh = shelfOf(spec, props), on = sh.shown, met = R.sheet.met, [sx, sy] = L.picture.rect, out = [];
  const pic = (id, shown, box) => out.push([id, shown, box, "pic"]), text = (id, shown, x, y, align = "left") => out.push([id, shown, [x, y, align], "text"]);
  pic("sheet.picture", !!R.sheet.picture, L.picture.rect);
  for (let i = 0; i < L.glint.max; i++) { const g = !met && i < R.sheet.glints.length ? R.sheet.glints[i] : null, [gw, gh] = L.glint.size; pic(`sheet.glint.${i}`, !!g, g ? [sx + g[0] - gw / 2, sy + g[1] - gh / 2, gw, gh] : null); }
  out.push(["shelf.unlocked.panel", on && sh.u, [SH.rect[0], SH.rect[1], SH.rect[2], sh.h], "panel"]);
  text("shelf.unlocked.title", on && sh.u, SH.title.x, SH.title.lineTop);
  text("shelf.wish.label", on && sh.w > 0, SH.wish.label.x, SH.wish.label.lineTop);
  for (let k = 0; k < SH.wish.max; k++) { const p = on && k < sh.w, dy = SH.wish.pitch * k;
    pic(`shelf.wish.${k}.disc`, p, [SH.wish.disc.at[0], SH.wish.disc.at[1] + dy, ...SH.wish.disc.size]); pic(`shelf.wish.${k}.star`, p, [SH.wish.star.at[0], SH.wish.star.at[1] + dy, ...SH.wish.star.size]); text(`shelf.wish.${k}.word`, p, SH.wish.word.x, SH.wish.word.lineTop + dy); }
  const f = on && !!R.shelf.face, fs = SH.face.picture.size;
  text("shelf.face.label", f, SH.face.label.x, sh.yf + SH.face.label.dy); pic("shelf.face.picture", f, [SH.face.picture.x, sh.yf, fs, fs]); text("shelf.face.name", f, SH.face.name.x, sh.yf + SH.face.name.dy);
  const s = on ? sh.s : 0; text("shelf.sit.label", s > 0, SH.sittings.label.x, sh.ys + SH.sittings.label.dy);
  for (let k = 0; k < SH.sittings.max; k++) pic(`shelf.sit.${k}`, k < s, [SH.sittings.x0 + SH.sittings.pitch * k, sh.ys + SH.sittings.dy, ...SH.sittings.size]);
  const fam = on && sh.n > 0; out.push(["shelf.families.panel", fam, [FA.x, sh.yr, FA.w, sh.hr], "panel"]); text("shelf.families.title", fam, FA.title.x, sh.yr + FA.title.dy);
  for (let j = 0; j < FA.max; j++) { const b = listPitch(FA, FA.max, j), p = fam && j < sh.n, y = sh.yr + b[1]; pic(`family.${j}.picture`, p, [b[0], y, b[2], b[3]]); text(`family.${j}.name`, p, b[0] + FA.name.dx, y + FA.name.dy, "centre"); }
  pic("page.picture", !!R.page.picture, L.page.rect);
  return out;
}
// The box of a focus target as the face draws it (the open plate's rect plus the sheet's origin, the page's disc plus the page's origin, the wish rows, the face, a family face), or null.
export function targetBox(spec, props, id) {
  const L = spec.l2, R = props.regions, sh = shelfOf(spec, props), [sx, sy] = L.picture.rect, [px, py] = L.page.rect;
  if (id.startsWith("chapter.")) { const p = R.sheet.plates.find((q) => q.id === id); return p ? [p.rect[0] + sx, p.rect[1] + sy, p.rect[2], p.rect[3]] : null; }
  if (id.startsWith("look.")) { const d = R.page.discs.find((q) => q.id === id); return d ? [d.rect[0] + px, d.rect[1] + py, d.rect[2], d.rect[3]] : null; }
  if (id === "wish") { const r = L.shelf.wish.focus.rect; return [r[0], r[1], r[2], r[3] + L.shelf.wish.pitch * sh.w]; }
  if (id === "face") return [L.shelf.face.picture.x, sh.yf, L.shelf.face.picture.size, L.shelf.face.picture.size];
  if (id.startsWith("family.")) { const j = R.shelf.families.findIndex((f) => "family." + f.id === id); if (j < 0) return null; const b = listPitch(L.families, L.families.max, j); return [b[0], sh.yr + b[1], b[2], b[3]]; }
  return null;
}
// boxOf(id): the node's [x, y, w, h] by its id string, or null when no node has the id (face_test_node_box). Every node is present; a shown part is at its box (a line starts at its x, or is centred on it, on its line);
// a part not shown has no size.
export function partDepartures(boxOf, spec, props) {
  const out = [], must = (ok, m) => { if (!ok) out.push(m); };
  for (const [id, shown, want, kind] of speciesParts(spec, props)) {
    const b = boxOf(id); if (!b) { out.push(`${id}: no node (a part a state does not show is a node of no size, never missing)`); continue; }
    if (!shown) { must(b[2] === 0 || b[3] === 0, `${id} is not shown and has a size ${b[2]} × ${b[3]}`); continue; }
    if (kind === "text") { const [x, y, align] = want, left = align === "centre" ? Math.abs(b[0] + b[2] / 2 - x) <= 1 : b[0] === x; must(left && b[2] > 0 && b[1] >= y && b[1] < y + 20, `${id} ${b} is not on its line at ${align} ${x}, lineTop ${y}`); continue; }
    must(eq(b, want), `${id} is at ${b}, not ${want}`);
  }
  return out;
}
// log: the face's `log` message { regions: [{ id, layer, rect }] }; spec: library.json; props: Level 2's props; cur: the ring ("" for none); reach: the ring's reach outside its object's box.
export function departures(log, spec, props, cur, reach = 5) {
  const out = [], L = spec.l2, regions = log.regions ?? [], got = (id, layer) => regions.filter((r) => r.id === id && (!layer || r.layer === layer)), must = (ok, m) => { if (!ok) out.push(m); };
  for (const r of regions) must(within(r.rect, [0, 0, 1024, 600]), `${r.id} (${r.layer}) ${r.rect} leaves the screen`);
  for (const id of ["notBuilt.stage", "notBuilt.line", "grid"]) must(got(id).length === 0, `Level 2 draws no ${id}`);
  for (const r of got("stage")) must(eq(r.rect, spec.l1.stage.rect), `stage (${r.layer}) ${r.rect} is not ${spec.l1.stage.rect}`);
  const sheetPics = [...got("sheet", "painted"), ...got("sheet", "art")].map((r) => r.rect);
  must(sheetPics.some((r) => eq(r, L.picture.rect)), `the sheet picture is drawn at ${L.picture.rect} (${JSON.stringify(sheetPics)})`);
  for (const r of got("sheet")) must(within(r.rect, L.picture.rect), `sheet (${r.layer}) ${r.rect} leaves the sheet`);
  const col = [L.shelf.rect[0], L.shelf.rect[1], L.shelf.rect[2], 600 - 40 - L.shelf.rect[1]], shelf = got("shelf");
  if (!props.regions.shelf.shown) must(shelf.every((r) => r.rect[2] === 0 || r.rect[3] === 0), "the shelf draws nothing while lit or met-only");
  for (const r of shelf) must(within(r.rect, col), `shelf (${r.layer}) ${r.rect} leaves the shelf's column ${col}`);
  const page = [...got("page", "painted"), ...got("page", "art")].filter((r) => r.rect[2] > 0);
  must(props.regions.page.picture ? page.length === 1 && eq(page[0].rect, L.page.rect) : page.length === 0, `the page: ${JSON.stringify(page.map((r) => r.rect))}, want ${props.regions.page.picture ? L.page.rect : "none"}`);
  const rings = got("focus");
  if (!cur) must(rings.length === 0, `no ring with no target (${rings.length} drawn)`);
  else { const b = targetBox(spec, props, cur); must(rings.length === 1 && !!b, `one ring on the focused target (${rings.length} drawn, ${cur})`);
    if (rings.length === 1 && b && !cur.startsWith("look.")) { const w = [b[0] - reach, b[1] - reach, b[2] + 2 * reach, b[3] + 2 * reach]; must(eq(rings[0].rect, w), `the ring ${rings[0].rect} is not ${w} (${cur} outset ${reach})`); }
    if (rings.length === 1 && b && cur.startsWith("look.")) must(within(b, rings[0].rect), `the ring ${rings[0].rect} holds the disc ${b}`); }
  return out;
}
