// Check 1 for Cargo (lvgl-switch.md §4): every region the face's log says it drew, against the rectangle cargo.json (and frame.json for the stage) gives it. `departures` returns the list of departures, empty when none.
// log: the face's `log` message { regions: [{ id, layer, rect }], type: [{ text, px, region, rect? }] }; spec: cargo.json; frame: frame.json; state: "bay" | "opening" | "report".
const within = (b, r) => b[0] >= r[0] && b[1] >= r[1] && b[0] + b[2] <= r[0] + r[2] && b[1] + b[3] <= r[1] + r[3];
const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

export function departures(log, spec, frame, state = "bay") {
  const out = [], R = spec.regions, regions = log.regions ?? [], type = log.type ?? [], got = (id, layer) => regions.filter((r) => r.id === id && (!layer || r.layer === layer));
  const must = (ok, m) => { if (!ok) out.push(m); };
  const stage = frame.regions.stage.rect, shadow = R.report.shadow ?? [2, 3];
  for (const r of got("stage")) must(eq(r.rect, stage), `stage ${r.rect} is not ${stage}`);
  for (const r of regions) must(within(r.rect, [0, 0, 1024, 600]), `${r.id} (${r.layer}) ${r.rect} leaves the screen`);
  for (const r of got("bay", "chrome")) must(eq(r.rect, R.bay.rect), `the bay's panel ${r.rect} is not ${R.bay.rect}`);
  for (const r of [...got("bay", "art"), ...got("bay", "painted")]) must(within(r.rect, R.bay.inside), `the bay's lid ${r.rect} leaves its inside ${R.bay.inside}`);
  for (const r of [...got("crates", "art"), ...got("crates", "painted")]) must(within(r.rect, R.bay.inside), `the crates ${r.rect} leave the bay's inside ${R.bay.inside}`);   // clipped to the inside, sliding in or at rest
  for (const r of got("waiting")) must(eq(r.rect, R.waiting.rect), `the waiting mark ${r.rect} is not ${R.waiting.rect}`);
  for (const r of got("rack", "chrome")) must(eq(r.rect, R.rack.rect), `the rack's panel ${r.rect} is not ${R.rack.rect}`);
  for (const layer of ["art", "painted"]) for (const r of got("rack", layer)) must(within(r.rect, R.rack.rect), `the rack's wells and pods (${layer}) ${r.rect} leave the rack ${R.rack.rect}`);
  for (const r of got("ribbon", "chrome")) must(eq(r.rect, R.ribbon.rect), `the ribbon ${r.rect} is not ${R.ribbon.rect}`);
  for (const r of got("ribbon", "type")) must(within(r.rect, R.ribbon.rect), `the ribbon's words ${r.rect} leave it`);
  for (const layer of ["art", "painted"]) for (const r of got("crate", layer)) must(within(r.rect, R.crate.rect), `the crate's picture and pods (${layer}) ${r.rect} leave the crate ${R.crate.rect}`);
  for (const layer of ["art", "painted"]) for (const r of got("travel", layer)) must(within(r.rect, R.travel.rect), `a travelling pod (${layer}) ${r.rect} leaves the travel rectangle ${R.travel.rect}`);
  { const c = R.report.rect; for (const r of got("report", "chrome")) must(r.rect[0] === c[0] && r.rect[1] === c[1] && r.rect[2] === c[2] + shadow[0] && r.rect[3] >= 104 + 24 && r.rect[1] + r.rect[3] <= c[1] + R.report.maxHeight + shadow[1], `the report card ${r.rect} is not at ${c.slice(0, 2)}, 560 wide (and its shadow ${shadow}) and at most ${R.report.maxHeight} tall`);
    for (const id of ["report.heading", "report.crate", "report.gathered", "report.probe", "report.world"]) for (const r of got(id)) must(within(r.rect, [c[0], c[1], c[2], R.report.maxHeight]), `${id} (${r.layer}) ${r.rect} leaves the card`); }
  must(state === "report" || got("report").length === 0, "the report card shows only in the report");
  must(state === "opening" || (got("ribbon").length === 0 && got("crate").length === 0 && got("travel").length === 0), "the ribbon, the crate and the travelling pods show only in the opening");
  must(state === "bay" || got("crates").length === 0, "the bay's crates show only in the bay");
  must(state === "opening" ? got("bay").length === 0 : got("bay", "chrome").length === 1, state === "opening" ? "the bay is not drawn in the opening" : "the bay is drawn once");
  // what each state must draw (a node with no size is not in the log, so a region that vanished is found here)
  must(got("rack", "chrome").length === 1, "the rack is drawn");
  if (state === "opening") must(got("crate").length >= 1, "the crate closer is drawn");
  if (state === "report") must(got("report", "chrome").length === 1 && got("report.heading", "type").length === 1, "the report card is drawn");
  for (const t of type) if (![16, 20, 28].includes(t.px)) out.push(`"${t.text}" is set at ${t.px} px`);
  return out;
}
