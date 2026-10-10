// Check 1 for Idle (lvgl-switch.md §4): every region the face's log says it drew, against the rectangles frame.json idle gives them. `departures` returns the list of departures, empty when none.
// log: the face's `log` message { regions: [{ id, layer, rect }], type: [{ text, px, region }] }; frame: frame.json.
const within = (b, r) => b[0] >= r[0] && b[1] >= r[1] && b[0] + b[2] <= r[0] + r[2] && b[1] + b[3] <= r[1] + r[3];
const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

export function departures(log, frame) {
  const out = [], I = frame.idle, R = I.regions, regions = log.regions ?? [], type = log.type ?? [], got = (id, layer) => regions.filter((r) => r.id === id && (!layer || r.layer === layer));
  const must = (ok, m) => { if (!ok) out.push(m); };
  for (const r of regions) must(within(r.rect, [0, 0, 1024, 600]), `${r.id} (${r.layer}) ${r.rect} leaves the screen`);
  for (const id of ["top", "line", "plate", "focus", "title", "materials", "notBuilt.ground", "notBuilt.line"]) must(got(id).length === 0, `Idle draws no ${id}`);
  for (const r of got("vivarium", "chrome")) must(within(r.rect, R.vivarium.rect), `the Vivarium's plates ${r.rect} leave ${R.vivarium.rect}`);
  { const back = got("vivarium", "chrome")[0]; must(!!back && eq(back.rect, R.vivarium.rect), `the Vivarium's plates ${back?.rect} are not the whole ${R.vivarium.rect}`); }
  for (const r of [...got("vivarium", "painted"), ...got("vivarium", "art")]) must(eq(r.rect, R.vivarium.rect), `the painting ${r.rect} is not ${R.vivarium.rect} (1:1, never cropped and enlarged)`);
  for (const id of ["resident", "bed"]) for (const r of got(id)) must(within(r.rect, R.vivarium.rect), `${id} (${r.layer}) ${r.rect} leaves the painting ${R.vivarium.rect}`);
  { const w = R.resident.walk.ground; for (const r of [...got("resident", "art"), ...got("resident", "painted")]) must(r.rect[0] >= w[0] && r.rect[0] + r.rect[2] <= w[0] + w[2] && r.rect[1] + r.rect[3] >= w[1] && r.rect[1] + r.rect[3] <= w[1] + w[3] + 1, `the residents ${r.rect}: their feet are not in the walk ground ${w}`); }
  { const b = R.bed.rect; for (const r of [...got("bed", "art"), ...got("bed", "painted")]) must(within(r.rect, [b[0], b[1] - 48, b[2], b[3] + 48]), `the bed and its sleepers (${r.layer}) ${r.rect} leave the bed ${b} and the nap's height above it`); }
  for (const r of got("idle.strip", "chrome")) must(eq(r.rect, R.strip.rect), `the strip ${r.rect} is not ${R.strip.rect}`);
  for (const r of got("idle.line", "type")) { const cx = r.rect[0] + r.rect[2] / 2; must(Math.abs(cx - R.line.centre) <= 1 && within(r.rect, R.line.rect), `the line ${r.rect} is not centred on ${R.line.centre} inside ${R.line.rect}`); }
  for (const t of type) must(t.px === R.line.px, `"${t.text}" is set at ${t.px} px, the line is ${R.line.px}`);
  return out;
}
