// Check 1 for the Vivarium's whole (lvgl-switch.md §4): every region the face's log says it drew, against the rectangles vivarium.json gives it. `departures` returns the list of departures, empty when none.
// log: the face's `log` message { regions: [{ id, layer, rect }], type: [{ text, px, region, rect? }] }; spec: vivarium.json; state: "rest" | "empty"; cur: the ring ("room" when none); n: the bays (the tiles drawn).
import { listPitch } from "../../ui/specs/derive.mjs";
const within = (b, r) => b[0] >= r[0] && b[1] >= r[1] && b[0] + b[2] <= r[0] + r[2] && b[1] + b[3] <= r[1] + r[3];
const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

const parts1 = (regions, n) => Math.min(1, n);
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
  { const b = R.bed.rect, pics = [...got("bed", "art"), ...got("bed", "painted")];   // the nest exactly at its rect; the sleepers within the nap's height above the bed
    must(pics.some((r) => eq(r.rect, b)), `the bed is not drawn exactly at ${b}`);
    for (const r of pics) if (!eq(r.rect, b)) must(within(r.rect, [b[0], b[1] - 48, b[2], b[3] + 48]), `a sleeper (${r.layer}) ${r.rect} leaves the bed ${b} and the nap's height above it`); }
  for (const m of bedFramesDepartures(got, R)) must(false, m);
  if (state === "empty") for (const id of ["resident", "nameTag", "focus"]) must(got(id).length === 0, `the empty whole draws no ${id}`);   // the bed stands, the nest alone (docked, or away with nobody carried)
  { const tag = got("nameTag", "chrome")[0], txt = got("nameTag", "type")[0]; must(!!tag === /^resident\./.test(cur), `the name tag shows ${tag ? "" : "no "}when the ring is on ${cur}`);
    if (tag) { must(within(tag.rect, [win[0] + 8, win[1], win[2] - 16, win[3]]), `the name tag ${tag.rect} is not 8 px inside the window ${win}`); must(tag.rect[3] === R.nameTag.h, `the name tag is ${tag.rect[3]} tall, not ${R.nameTag.h}`); must(tag.rect[2] % R.nameTag.round === 0 && tag.rect[2] >= R.nameTag.min && tag.rect[2] <= R.nameTag.max, `the name tag's width ${tag.rect[2]} is not a multiple of ${R.nameTag.round} in ${R.nameTag.min} to ${R.nameTag.max}`); }
    if (tag && txt) must(within(txt.rect, tag.rect), `the name ${txt.rect} leaves its tag ${tag.rect}`); }
  for (const r of got("strip", "chrome")) must(eq(r.rect, R.strip.rect), `the strip ${r.rect} is not ${R.strip.rect}`);
  if (n > 0) {   // a region a tile (tile.<i>): its box is the list's pitch at its place, lifted by the spec's lift while the ring is on it (one tile at most)
    const items = Array.from({ length: n }, (_, i) => listPitch(R.tiles, n, i)), lift = spec.focus.targets.tile.lift; let lifted = 0;
    for (let i = 0; i < n; i++) {
      const parts = regions.filter((r) => r.id === `tile.${i}`); if (!parts.length) { out.push(`tile ${i} is not drawn`); continue; }
      for (const r of parts) {
        const base = items[i], up = r.layer === "chrome" ? r.rect[1] === base[1] - lift : parts.some((x) => x.layer === "chrome" && x.rect[1] === base[1] - lift), box = up ? [base[0], base[1] - lift, base[2], base[3]] : base;
        if (r.layer === "chrome") { if (up) lifted++; must(eq(r.rect, box), `tile ${i} ${r.rect} is not its place on the pitch ${base}`); } else must(within(r.rect, box), `tile ${i}'s ${r.layer} ${r.rect} leaves the tile ${box}`);
      }
    }
    must(lifted <= parts1(regions, n), "more than one tile is lifted");
    must(!regions.some((r) => r.id.startsWith("tile.") && Number(r.id.slice(5)) >= n), "a tile past the bays is drawn");
  }
  for (const r of got("focus")) must(within(r.rect, [0, 0, 1024, 600]), `the ring ${r.rect} leaves the screen`);
  for (const t of type) must([16, 20, 28].includes(t.px), `"${t.text}" is set at ${t.px} px`);
  for (const r of regions.filter((x) => x.layer === "type" && x.id !== "nameTag" && within(x.rect, [0, 40, 1024, 520]))) out.push(`the whole sets a word (${r.id}) in the window or the strip: no word there but the name tag`);
  return out;
}

// The away bed's frames (station-vivarium-polish, option D), for the three screens' checks: the region `bed.frames` holds, on the painted layer, the frames and the glyph's plate, and the minis and the glyph on their pictures' layers;
// each layer's union is exactly the signed table's for 1, 2 or 3 carried (the log keeps one union a region and layer). got: (id, layer) => the log's regions; R: the spec's regions (or Idle's).
const union = (rs) => { const x0 = Math.min(...rs.map((r) => r[0])), y0 = Math.min(...rs.map((r) => r[1])), x1 = Math.max(...rs.map((r) => r[0] + r[2])), y1 = Math.max(...rs.map((r) => r[1] + r[3])); return [x0, y0, x1 - x0, y1 - y0]; };
export function bedFramesDepartures(got, R) {
  const out = [], F = R.bed.frames, all = got("bed.frames");
  if (!all.length) return out;
  const fits = (n) => { const xs = F.places[n], x0 = xs[0], fr = xs.map((x) => [x, F.y, ...F.size]), mi = xs.map((x) => [x + F.thumb[0], F.y + F.thumb[1], F.thumb[2], F.thumb[3]]), gl = [x0 + F.glyph.at[0], F.y + F.glyph.at[1], ...F.glyph.size];
    const plates = union([...fr, [x0 + F.glyph.plate.at[0], F.y + F.glyph.plate.at[1], ...F.glyph.plate.size]]), ok = [plates, union(mi), union([...mi, gl]), gl];   // the glyph is a frame mark: its layer may differ from the minis'
    return all.every((r) => ok.some((o) => eq(r.rect, o))) && all.some((r) => r.layer === "painted" && eq(r.rect, plates)); };
  if (![1, 2, 3].some(fits)) out.push(`the bed's frames ${JSON.stringify(all.map((r) => [r.layer, r.rect]))} are not the frames' table for 1, 2 or 3 carried`);
  return out;
}
