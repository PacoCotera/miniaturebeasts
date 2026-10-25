// Check 1 for the Library's Level 1 (library.json l1): every part the face's log says it drew, against the rectangles library.json gives it. The log holds one union rectangle a region and layer: the stage's ground and
// master at the stage's rectangle; the cells' region `grid`, whose pictures (the cell pictures, the marks, the face chips, the wish marks, the glints, the seeds) are held to the union of the parts the cells' states give, exactly,
// and whose chrome and type stay inside the grid; the ring, one, on the focused cell (the cell outset by the ring's reach). `departures` returns the list of departures, empty when none.
// log: the face's `log` message { regions: [{ id, layer, rect }], type: [{ text, px, region }] }; spec: library.json; props: Level 1's props (state, regions, focus); cur: the ring ("" for none).
import { listPitch } from "../../ui/specs/derive.mjs";
const within = (b, r) => b[0] >= r[0] && b[1] >= r[1] && b[0] + b[2] <= r[0] + r[2] && b[1] + b[3] <= r[1] + r[3];
const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const union = (rs) => { rs = rs.filter((r) => r[2] > 0 && r[3] > 0); if (!rs.length) return null; const x0 = Math.min(...rs.map((r) => r[0])), y0 = Math.min(...rs.map((r) => r[1])), x1 = Math.max(...rs.map((r) => r[0] + r[2])), y1 = Math.max(...rs.map((r) => r[1] + r[3])); return [x0, y0, x1 - x0, y1 - y0]; };
const at = (o, r) => [o[0] + r[0], o[1] + r[1], r[2], r[3]];

// The parts of cell k (its props entry `c`) as the spec places them: [part, shown, rect] in the node order, the rect at the cell's place; the bezel's two nodes first.
export function cellParts(spec, c, k) {
  const C = spec.l1.cell, o = listPitch(spec.l1.grid.forms["16"], 16, k), found = c.status === "found", met = c.status === "met", known = found || met, B = C.bezel, r = B.radius, chip = found && !!c.face;
  const g = C.glint, gx = o[0] + g.centre[0] - g.size[0] / 2, gy = o[1] + g.centre[1] - g.size[1] / 2;
  return [
    ["panel", true, at(o, B.rect)], ["bevel", true, [o[0] + B.rect[0] + r, o[1] + B.rect[1] + 1, B.rect[2] - 2 * r, 1]],
    ["picture", known && !!c.picture, at(o, C.picture.rect)], ["rule", met, [o[0] + C.rule.at[0], o[1] + C.rule.at[1], C.rule.len, 1]], ["mark", known && !!c.mark, at(o, C.mark.rect)], ["name", known, null],
    ["face", chip, at(o, C.face.rect)], ["wish", known && c.wish, at(o, chip ? C.wish.rect : C.wish.alone)], ["glint", found && c.glint, [gx, gy, g.size[0], g.size[1]]], ["seed", !known, at(o, C.seed.rect)], ["lip", !known, [o[0] + C.lip.at[0], o[1] + C.lip.at[1], C.lip.len, 1]],
  ];
}
const PICTURES = new Set(["picture", "mark", "face", "wish", "glint", "seed"]);

export function departures(log, spec, props, cur, reach = 5) {
  const out = [], L = spec.l1, regions = log.regions ?? [], got = (id, layer) => regions.filter((r) => r.id === id && (!layer || r.layer === layer)), must = (ok, m) => { if (!ok) out.push(m); };
  for (const r of regions) must(within(r.rect, [0, 0, 1024, 600]), `${r.id} (${r.layer}) ${r.rect} leaves the screen`);
  for (const id of ["notBuilt.stage", "notBuilt.line"]) must(got(id).length === 0, `Level 1 draws no ${id}`);
  for (const r of got("stage")) must(eq(r.rect, L.stage.rect), `stage (${r.layer}) ${r.rect} is not ${L.stage.rect}`);
  must(got("stage", "chrome").length === 1, "the stage's ground is drawn");
  const cells = props.regions.cells, pics = [], all = [];
  cells.forEach((c, k) => { for (const [part, shown, rect] of cellParts(spec, c, k)) { if (rect) all.push(rect); if (shown && PICTURES.has(part)) pics.push(rect); } });
  const grid = union(all);
  for (const r of got("grid")) { must(within(r.rect, grid), `grid (${r.layer}) ${r.rect} leaves the cells ${grid}`); must(within(r.rect, L.stage.rect), `grid (${r.layer}) ${r.rect} leaves the stage`); }
  const art = union([...got("grid", "art"), ...got("grid", "painted")].map((r) => r.rect)), want = union(pics);
  must((art === null) === (want === null) && (!want || eq(art, want)), `grid: its pictures ${art} are not the union of the parts the cells' states give ${want}`);
  const rings = got("focus"), k = cells.findIndex((c) => "cell." + c.id === cur);
  if (!cur) must(rings.length === 0, `no ring with nothing met (${rings.length} drawn)`);
  else { must(rings.length === 1 && k >= 0, `one ring on the focused cell (${rings.length} drawn, ${cur})`);
    if (rings.length === 1 && k >= 0) { const o = at(listPitch(L.grid.forms["16"], 16, k), L.cell.bezel.rect), w = [o[0] - reach, o[1] - reach, o[2] + 2 * reach, o[3] + 2 * reach]; must(eq(rings[0].rect, w), `the ring ${rings[0].rect} is not ${w} (the cell outset ${reach})`); } }
  return out;
}

// Check 1 per part (the node check beside the region unions): the box of every cell's every node as the face holds it, against l1.cell at the cell's place.
// boxOf(id): the node's [x, y, w, h] by its id string, or null when no node has the id (face_test_node_box, the test build); spec: library.json; props: Level 1's props.
// A part the state gives is at its place exactly; a part the state does not give is a node of no size (the dashed plate rule keeps its box, drawn with no ops); the name starts at its x and stays in its clip. Returns the departures.
export function partDepartures(boxOf, spec, props) {
  const out = [], must = (ok, m) => { if (!ok) out.push(m); }, N = spec.l1.cell.name;
  props.regions.cells.forEach((c, k) => {
    const o = listPitch(spec.l1.grid.forms["16"], 16, k);
    for (const [part, shown, want] of cellParts(spec, c, k)) {
      const id = `cell.${c.id}.${part}`, b = boxOf(id);
      if (!b) { out.push(`${id}: no node (a part a state does not show is a node of no size, never missing)`); continue; }
      if (part === "name") { if (shown) { must(b[0] === o[0] + N.x && b[2] > 0 && b[2] <= N.clip && b[1] >= o[1] + N.lineTop && b[1] < o[1] + N.lineTop + 20, `${id} ${b} is not on its line at x ${o[0] + N.x}, at most ${N.clip} wide`); } else must(b[2] === 0, `${id} is not given by state ${c.status} and has a width ${b[2]}`); continue; }
      if (shown || part === "panel" || part === "bevel" || part === "rule") must(eq(b, want), `${id} is at ${b}, not ${want} (the cell's place plus its offset)`);
      else must(b[2] === 0 || b[3] === 0, `${id} is not given by state ${c.status} and has a size ${b[2]} × ${b[3]}`);   // a hidden solid rule is len 0 by 1
    }
  });
  return out;
}
