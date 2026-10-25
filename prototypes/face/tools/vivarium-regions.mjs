// Check 1 for the Vivarium's whole (lvgl-switch.md §4): every region the face's log says it drew, against the rectangles vivarium.json gives it. `departures` returns the list of departures, empty when none.
// log: the face's `log` message { regions: [{ id, layer, rect }], type: [{ text, px, region, rect? }] }; spec: vivarium.json; state: "rest" | "empty"; cur: the ring ("room" when none); n: the bays (the tiles drawn).
import { listPitch } from "../../ui/specs/derive.mjs";
const within = (b, r) => b[0] >= r[0] && b[1] >= r[1] && b[0] + b[2] <= r[0] + r[2] && b[1] + b[3] <= r[1] + r[3];
const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

const parts1 = (regions, n) => Math.min(1, n);
export function departures(log, spec, state = "rest", cur = "room", n = 0, figs = []) {   // figs: each resident's stage and figure [dx, dy, W, H] (T-20261018-235): the figures, not their pictures, stay on the walk ground
  const out = [], R = spec.regions, regions = log.regions ?? [], type = log.type ?? [], got = (id, layer) => regions.filter((r) => r.id === id && (!layer || r.layer === layer)), win = R.window.rect;
  const must = (ok, m) => { if (!ok) out.push(m); };
  for (const r of regions) must(within(r.rect, [0, 0, 1024, 600]), `${r.id} (${r.layer}) ${r.rect} leaves the screen`);
  for (const id of ["top", "plate", "notBuilt.stage", "notBuilt.line"]) must(got(id).length === 0 || id === "top" || id === "plate", `the whole draws no ${id}`);
  for (const r of got("stage")) must(eq(r.rect, R.stage.rect), `stage ${r.rect} is not ${R.stage.rect}`);
  for (const r of got("window", "chrome")) must(eq(r.rect, win), `the window's plates ${r.rect} are not the window ${win}`);   // edge to edge, no bezel
  for (const r of got("window", "painted")) must(eq(r.rect, win), `the window's painting ${r.rect} is not ${win}`);
  must(got("window", "painted").length === 0 || got("window", "chrome").length === 0, "the window's plates show under the light's painting");
  for (const id of ["resident", "bed", "bed.sleepers", "resident.lamp", "bed.lamp"]) for (const r of got(id)) must(within(r.rect, win), `${id} (${r.layer}) ${r.rect} leaves the window ${win}`);   // clipped to the window
  { const w = R.resident.walk.ground, size = (f) => R.resident[f.stage === "juvenile" ? "juvenile" : "adult"], slack = figs.reduce((a, f) => { if (!f.figure) return a; const [dx, dy, W, H] = f.figure, [pw, ph] = size(f); return [Math.max(a[0], dx), Math.max(a[1], pw - dx - W), Math.max(a[2], ph - dy - H)]; }, [0, 0, 0]);   // how far a picture reaches past its figure: left, right, below
    for (const r of [...got("resident", "art"), ...got("resident", "painted")]) must(r.rect[0] + slack[0] >= w[0] && r.rect[0] + r.rect[2] - slack[1] <= w[0] + w[2] && r.rect[1] + r.rect[3] >= w[1] && r.rect[1] + r.rect[3] - slack[2] <= w[1] + w[3] + 1, `the residents ${r.rect} leave the walk ground ${w}`); }
  { const b = R.bed.rect, k = R.bed.markRect, pics = [...got("bed", "art"), ...got("bed", "painted")], up = [b[0], b[1] - 48, b[2], b[3] + 48];   // the nest exactly at its rect, the Companion's mark exactly at its own; the sleepers (their own region) within the nap's height above the bed
    must(pics.some((r) => eq(r.rect, b)), `the bed is not drawn exactly at ${b}`);
    for (const r of pics) must(eq(r.rect, b) || eq(r.rect, k), `a bed picture (${r.layer}) ${r.rect} is neither the bed ${b} nor the Companion mark ${k}`);
    for (const r of [...got("bed.sleepers", "art"), ...got("bed.sleepers", "painted")]) must(r.rect[3] > up[3] || within(r.rect, up), `a sleeper (${r.layer}) ${r.rect} leaves the bed ${b} and the nap's height above it`); }
  if (state === "empty") for (const id of ["resident", "bed.sleepers", "nameTag", "focus"]) must(got(id).length === 0, `the empty whole draws no ${id}`);   // the bed stands, the nest alone (or with its mark while away)
  { const tag = got("nameTag", "chrome")[0], txt = got("nameTag", "type")[0]; must(!!tag === /^resident\./.test(cur), `the name tag shows ${tag ? "" : "no "}when the ring is on ${cur}`);
    if (tag) { must(within(tag.rect, [win[0] + 8, win[1], win[2] - 16, win[3]]), `the name tag ${tag.rect} is not 8 px inside the window ${win}`); must(tag.rect[3] === R.nameTag.h, `the name tag is ${tag.rect[3]} tall, not ${R.nameTag.h}`); const TP = R.nameTag.plate; must(tag.rect[2] % TP.round === 0 && tag.rect[2] >= TP.min && tag.rect[2] <= TP.max, `the name tag's width ${tag.rect[2]} is not a multiple of ${TP.round} in ${TP.min} to ${TP.max}`); }
    if (tag && txt) must(within(txt.rect, tag.rect), `the name ${txt.rect} leaves its tag ${tag.rect}`); }
  for (const r of got("strip", "painted")) must(r.rect[2] === 0 || eq(r.rect, R.strip.rect), `the strip's plate ${r.rect} is not ${R.strip.rect}`);
  must(!got("strip", "chrome").length, "the strip draws no fill or edge (fix 2 F1)");
  if (n > 0) {   // a region a tile (tile.<i>): its box is the list's pitch at its place, lifted by the spec's lift while the ring is on it (one tile at most)
    const items = Array.from({ length: n }, (_, i) => listPitch(R.tiles, n, i)), lift = spec.focus.targets.tile.lift; let lifted = 0;
    for (let i = 0; i < n; i++) {
      const plateOrChrome = (x) => x.layer === "chrome" || x.layer === "painted", parts = regions.filter((r) => r.id === `tile.${i}`); if (!parts.length) { out.push(`tile ${i} is not drawn`); continue; }
      for (const r of parts) {
        const base = items[i], up = plateOrChrome(r) ? r.rect[1] === base[1] - lift : parts.some((x) => plateOrChrome(x) && x.rect[1] === base[1] - lift), box = up ? [base[0], base[1] - lift, base[2], base[3]] : base;
        if (plateOrChrome(r)) { if (up && r.layer === "chrome") lifted++; must(eq(r.rect, box), `tile ${i} ${r.rect} is not its place on the pitch ${base}`); } else must(within(r.rect, box), `tile ${i}'s ${r.layer} ${r.rect} leaves the tile ${box}`);
      }
    }
    must(lifted <= parts1(regions, n), "more than one tile is lifted");
    must(!regions.some((r) => r.id.startsWith("tile.") && Number(r.id.slice(5)) >= n), "a tile past the bays is drawn");
  }
  for (const r of got("focus")) must(within(r.rect, [0, 0, 1024, 600]), `the ring ${r.rect} leaves the screen`);
  // fix 14, rule 5: a tile's ring is the tile as drawn (lifted) grown by 5
  if (/^tile\./.test(cur) && got("focus").length) { const ring = got("focus")[0].rect, tiles = regions.filter((x) => /^tile\./.test(x.id) && x.layer === "chrome").map((x) => [x.rect[0] - 5, x.rect[1] - 5, x.rect[2] + 10, x.rect[3] + 10]); must(tiles.some((b) => eq(ring, b)), `the ${cur} ring ${ring} is not a tile as drawn grown by 5`); }
  for (const t of type) must([16, 1016, 20, 28].includes(t.px), `"${t.text}" is set at ${t.px} px`);
  for (const r of regions.filter((x) => x.layer === "type" && x.id !== "nameTag" && within(x.rect, [0, 40, 1024, 520]))) out.push(`the whole sets a word (${r.id}) in the window or the strip: no word there but the name tag`);
  return out;
}
