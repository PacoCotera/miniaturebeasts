// Check 1 for the Vivarium's whole (lvgl-switch.md §4): every region the face's log says it drew, against the rectangles vivarium.json gives it. `departures` returns the list of departures, empty when none.
// log: the face's `log` message { regions: [{ id, layer, rect }], type: [{ text, px, region, rect? }] }; spec: vivarium.json; state: "rest" | "empty"; cur: the ring ("room" when none); n: the bays (the tiles drawn).
import { listPitch } from "../../ui/specs/derive.mjs";
const within = (b, r) => b[0] >= r[0] && b[1] >= r[1] && b[0] + b[2] <= r[0] + r[2] && b[1] + b[3] <= r[1] + r[3];
const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

export function departures(log, spec, state = "rest", cur = "room", n = 0) {
  const out = [], R = spec.regions, regions = log.regions ?? [], type = log.type ?? [], got = (id, layer) => regions.filter((r) => r.id === id && (!layer || r.layer === layer)), win = R.window.rect;
  const must = (ok, m) => { if (!ok) out.push(m); };
  for (const r of regions) must(within(r.rect, [0, 0, 1024, 600]), `${r.id} (${r.layer}) ${r.rect} leaves the screen`);
  for (const id of ["top", "plate", "notBuilt.stage", "notBuilt.line"]) must(got(id).length === 0 || id === "top" || id === "plate", `the whole draws no ${id}`);
  for (const r of got("stage")) must(eq(r.rect, R.stage.rect), `stage ${r.rect} is not ${R.stage.rect}`);
  for (const r of got("window", "chrome")) must(eq(r.rect, win), `the window's plates ${r.rect} are not the window ${win}`);   // edge to edge, no bezel
  for (const r of got("window", "painted")) must(eq(r.rect, win), `the window's painting ${r.rect} is not ${win}`);
  must(got("window", "painted").length === 0 || got("window", "chrome").length === 0, "the window's plates show under the light's painting");
  for (const id of ["resident", "bed", "resident.lamp", "bed.lamp"]) for (const r of got(id)) must(within(r.rect, win), `${id} (${r.layer}) ${r.rect} leaves the window ${win}`);   // clipped to the window
  { const w = R.resident.walk.ground; for (const r of [...got("resident", "art"), ...got("resident", "painted")]) must(r.rect[0] >= w[0] && r.rect[0] + r.rect[2] <= w[0] + w[2] && r.rect[1] + r.rect[3] >= w[1] && r.rect[1] + r.rect[3] <= w[1] + w[3] + 1, `the residents ${r.rect} leave the walk ground ${w}`); }
  { const b = R.bed.rect; for (const r of [...got("bed", "art"), ...got("bed", "painted")]) must(within(r.rect, [b[0], b[1] - 48, b[2], b[3] + 48]), `the bed and its sleepers (${r.layer}) ${r.rect} leave the bed ${b} and the nap's height above it`); }
  if (state === "empty") for (const id of ["resident", "bed", "nameTag", "focus"]) must(got(id).length === 0, `the empty whole draws no ${id}`);
  { const tag = got("nameTag", "chrome")[0], txt = got("nameTag", "type")[0]; must(!!tag === /^resident\./.test(cur), `the name tag shows ${tag ? "" : "no "}when the ring is on ${cur}`);
    if (tag) { must(within(tag.rect, [win[0] + 8, win[1], win[2] - 16, win[3]]), `the name tag ${tag.rect} is not 8 px inside the window ${win}`); must(tag.rect[3] === R.nameTag.h, `the name tag is ${tag.rect[3]} tall, not ${R.nameTag.h}`); must(tag.rect[2] % R.nameTag.round === 0 && tag.rect[2] >= R.nameTag.min && tag.rect[2] <= R.nameTag.max, `the name tag's width ${tag.rect[2]} is not a multiple of ${R.nameTag.round} in ${R.nameTag.min} to ${R.nameTag.max}`); }
    if (tag && txt) must(within(txt.rect, tag.rect), `the name ${txt.rect} leaves its tag ${tag.rect}`); }
  for (const r of got("strip", "chrome")) must(eq(r.rect, R.strip.rect), `the strip ${r.rect} is not ${R.strip.rect}`);
  if (n > 0) {
    const items = listPitch(R.tiles, n).items, tiles = got("tiles");
    for (const r of tiles) must(within(r.rect, [R.tiles.rect[0], R.tiles.rect[1] - R.focus.targets.tile.lift, R.tiles.rect[2], R.tiles.rect[3] + R.focus.targets.tile.lift]), `a tile's part ${r.rect} leaves ${R.tiles.rect}`);
    for (const t of tiles.filter((r) => r.layer === "chrome" && r.rect[3] === items[0][3] && r.rect[2] === items[0][2])) must(items.some((b) => b[0] === t.rect[0] && (b[1] === t.rect[1] || b[1] - R.focus.targets.tile.lift === t.rect[1])), `a tile at ${t.rect} is not on the list's pitch`);
    must(tiles.filter((r) => r.rect[2] === items[0][2] && r.rect[3] === items[0][3]).length >= 1, "no tile is drawn at the form's size");
  }
  for (const r of got("focus")) must(within(r.rect, [0, 0, 1024, 600]), `the ring ${r.rect} leaves the screen`);
  for (const t of type) must([16, 20, 28].includes(t.px), `"${t.text}" is set at ${t.px} px`);
  for (const t of type) if (t.region !== "nameTag" && !/^(frame|top|line|title|materials|turn|back|need|bottom|plate|companion)/.test(t.region ?? "") && t.region) out.push(`the whole sets "${t.text}" (${t.region}): no word in the window but the name tag`);
  return out;
}
