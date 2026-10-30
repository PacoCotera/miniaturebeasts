// Check 1 for the Vivarium (lvgl-switch.md §4; the collection v2 design §8): every region the face's log says it drew, against the rectangles vivarium.json gives it. `departures` returns the list of departures, empty when none.
// log: the face's `log` message { regions: [{ id, layer, rect }], type: [{ text, px, region, rect? }] }; spec: vivarium.json; props: the props the face drew (state, view, regions, focus); hasBed: the room has a bed (Roots only).
// The field is the window [0, 88, 688, 472]: the room view's residents, bed, drop spots, reserved silhouettes and marks inside it; the house view's four tiles and their places, the cold page's rails and boxes; the chip row and the card at their rects.
import { listPitch } from "../../ui/specs/derive.mjs";
const within = (b, r) => b[0] >= r[0] && b[1] >= r[1] && b[0] + b[2] <= r[0] + r[2] && b[1] + b[3] <= r[1] + r[3];
const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

export function departures(log, spec, props, hasBed = true) {
  const out = [], R = spec.regions, regions = log.regions ?? [], type = log.type ?? [], got = (id, layer) => regions.filter((r) => r.id === id && (!layer || r.layer === layer)), win = R.window.rect, view = props.view ?? "room", cur = props.focus?.cur ?? "";
  const must = (ok, m) => { if (!ok) out.push(m); };
  const fnv = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }, nodeRects = (id) => (log.nodes ?? []).filter((x) => x[0] === fnv(id)).map((x) => x.slice(4, 8));
  for (const r of regions) must(within(r.rect, [0, 0, 1024, 600]), `${r.id} (${r.layer}) ${r.rect} leaves the screen`);
  for (const id of ["notBuilt.stage", "notBuilt.line", "strip", "places", "tiles"]) must(got(id).length === 0, `the Vivarium draws no ${id}`);
  for (const r of got("stage")) must(eq(r.rect, R.stage.rect), `stage ${r.rect} is not ${R.stage.rect}`);
  for (const r of [...got("window", "painted"), ...got("window", "chrome")]) must(eq(r.rect, win), `the field ${r.rect} is not the window ${win}`);
  for (const id of ["resident", "bed", "bed.sleepers", "resident.lamp", "bed.lamp", "drops", "reserved", "carry.from", "marks", "tucked", "house.mibi", "pick"]) for (const r of got(id)) must(within(r.rect, win), `${id} (${r.layer}) ${r.rect} leaves the window ${win}`);
  if (view === "room") {
    const g = R.resident.walk.ground;
    for (const r of [...got("resident", "art"), ...got("resident", "painted")]) must(r.rect[0] >= g[0] - 8 && r.rect[0] + r.rect[2] <= g[0] + g[2] + 8, `the residents ${r.rect} leave the walk's clamp ${g}`);
    { const b = R.bed.rect, pics = [...got("bed", "art"), ...got("bed", "painted")];
      must(hasBed ? pics.some((r) => eq(r.rect, b)) : pics.length === 0, hasBed ? `the bed is not drawn exactly at ${b}` : "a room with no bed draws no bed"); for (const r of pics) must(eq(r.rect, b), `a bed picture ${r.rect} is not the bed ${b}`); }
    // a region is the union of its nodes: the drop spots' at least one 64 x 10 ellipse, on its rows; the discs' at least one 20 x 20 disc
    for (const r of got("drops")) must(r.rect[2] >= R.drops.ellipse[0] && r.rect[3] >= R.drops.ellipse[1] && (props.regions?.drops?.items ?? []).length > 0, `the drop spots ${r.rect} are not ${R.drops.ellipse.join(" x ")} ellipses, or are drawn with none in the props`);
    for (const r of got("marks", "chrome")) must(r.rect[2] >= 20 && r.rect[3] >= 20, `the mark discs ${r.rect} are not 20 x 20`);
    const tag = got("nameTag", "chrome")[0]; must(!!tag === (/^resident\./.test(cur) || /^drop\./.test(cur)), `the name tag shows ${tag ? "" : "no "}when the ring is on ${cur}`);
    if (tag) { must(within(tag.rect, [win[0] + 8, win[1], win[2] - 16, win[3]]), `the name tag ${tag.rect} is not 8 px inside the window ${win}`); must(tag.rect[3] === R.nameTag.h, `the name tag is ${tag.rect[3]} tall`); }
    if (props.state === "empty") for (const id of ["resident", "bed.sleepers", "nameTag"]) must(got(id).length === 0, `the empty room draws no ${id}`);
  } else must(got("resident", "art").length + got("resident", "painted").length <= 1, `the ${view} view walks nobody`);
  if (view === "house") {
    const TR = R.house.tile.rects, tileAt = (r) => TR.findIndex((t) => within(r, t));   // the four windows at the quarters of the field; every figure, plate and disc inside one of them
    for (const [j, t] of TR.entries()) { const rs = nodeRects(`tile.${j}`); must(rs.length === 0 || rs.some((r) => eq(r, t)), `tile ${j} is not drawn at ${t}`); }
    for (const r of got("window", "chrome")) must(within(r.rect, R.window.rect), `the house tiles ${r.rect} leave the field`);
    for (const r of got("seams", "chrome")) must(within(r.rect, R.window.rect), `the seams ${r.rect} leave the field`);
    for (const r of regions.filter((x) => /^place\.\d\.\d$/.test(x.id))) must(tileAt(r.rect) >= 0, `place ${r.id} ${r.rect} leaves its tile`);
    for (const r of regions.filter((x) => /^tile\.\d\.plate$/.test(x.id))) { const t = TR[+r.id.split(".")[1]], at = R.house.plate.at; must(r.rect[0] === t[0] + at[0] && r.rect[1] === t[1] + at[1] && r.rect[3] === R.house.plate.h, `the plate ${r.id} ${r.rect} is not at the tile's (+${at}), ${R.house.plate.h} tall`); }
  }
  if (view === "tucked") {
    for (const [i, rr] of R.tucked.rails.entries()) must(got(`rail.${i}`, "chrome").some((r) => eq(r.rect, rr) || within(r.rect, rr)), `rail ${i} is not drawn at ${rr}`);
    for (const r of got("tucked")) { const B = R.tucked.boxes, span = [B.x[0], B.tops[0], B.x.at(-1) + B.size[0] - B.x[0], B.tops.at(-1) + B.size[1] - B.tops[0]];   // the cold figures' union: inside the boxes' columns, its foot on a box's foot (a 96 x 99 figure stands 3 px over its 96 x 96 box)
      must(r.rect[0] >= span[0] && r.rect[0] + r.rect[2] <= span[0] + span[2] && r.rect[1] >= span[1] - (R.resident.adult[1] - B.size[1]) && B.tops.some((t) => r.rect[1] + r.rect[3] === t + B.size[1]), `the cold figures ${r.rect} do not stand in their boxes on their rails`); }
  }
  // the chip row: a chip a room on the row's pitch, All rooms and Tucked away at theirs; the lit chip's underline at y 80
  { const n = (props.regions?.rooms?.items ?? []).length;
    for (let i = 0; i < n; i++) { const it = props.regions.rooms.items[i], want = it.kind === "all" ? R.chips.all : it.kind === "tucked" ? R.chips.tucked : listPitch(R.chips, 4, i), rs = nodeRects(`chip.${i}`);   // the chips are the region rooms, each node its own id
      must(rs.some((r) => eq(r, want)), `chip ${i} (${it.kind}) is not drawn at ${want}`); for (const r of got("rooms")) must(within(r.rect, [16, 48, 992, 32]), `the chip row ${r.rect} leaves its row`);
      const lit = got(`chip.${i}.lit`, "chrome")[0]; must(!!lit === !!it.lit, `chip ${i}'s underline ${lit ? "drawn" : "missing"}`); if (lit) must(lit.rect[1] === R.chips.underline.y && lit.rect[3] === R.chips.underline.h && lit.rect[0] === want[0], `chip ${i}'s underline ${lit.rect}`); } }
  // the card and its plates
  { const c = got("card", "chrome")[0]; must(!!c && eq(c.rect, R.card.rect), `the card ${c?.rect} is not ${R.card.rect}`);
    for (const r of regions.filter((x) => /^card/.test(x.id) || /^plate\.\d$/.test(x.id))) must(within(r.rect, R.card.rect), `${r.id} ${r.rect} leaves the card`);
    for (const r of regions.filter((x) => /^plate\.\d$/.test(x.id) && x.layer === "chrome")) { const k = +r.id.slice(6), want = [R.card.plates.first[0], R.card.plates.first[1] + R.card.plates.pitch * k, R.card.plates.first[2], R.card.plates.first[3]]; must(r.rect[2] === 0 || eq(r.rect, want), `plate ${k} ${r.rect} is not ${want}`); } }
  for (const r of got("focus")) must(within(r.rect, [0, 0, 1024, 600]), `the ring ${r.rect} leaves the screen`);
  for (const t of type) must([14, 15, 16, 1016, 20, 28].includes(t.px), `"${t.text}" is set at ${t.px} px`);
  for (const r of regions.filter((x) => x.layer === "type" && within(x.rect, win) && !/^(nameTag|tile\.\d\.plate\.(name|count)|place\.\d\.\d\.more|panel(Title|Header|Caption|Price)|cardText)$/.test(x.id))) out.push(`the Vivarium sets a word (${r.id}) in the field: no word there but the name tag and the tile plates`);
  return out;
}
