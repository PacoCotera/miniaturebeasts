// Check 1 for Cargo (lvgl-switch.md §4): every region the face's log says it drew, against the rectangle cargo.json (and frame.json for the stage) gives it; the containers are logged one region each, `stores.<material>`. `departures` returns the list of departures, empty when none.
// log: the face's `log` message { regions: [{ id, layer, rect }], type: [{ text, px, region, rect? }] }; spec: cargo.json; frame: frame.json; state: "bay" | "opening" | "report".
const within = (b, r) => b[0] >= r[0] && b[1] >= r[1] && b[0] + b[2] <= r[0] + r[2] && b[1] + b[3] <= r[1] + r[3];
const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

export function departures(log, spec, frame, state = "bay") {
  const out = [], R = spec.regions, regions = log.regions ?? [], type = log.type ?? [], got = (id, layer) => regions.filter((r) => r.id === id && (!layer || r.layer === layer));
  const must = (ok, m) => { if (!ok) out.push(m); };
  const stage = frame.regions.stage.rect, art = (id) => [...got(id, "art"), ...got(id, "painted")], union = (a, b) => { const x = Math.min(a[0], b[0]), y = Math.min(a[1], b[1]); return [x, y, Math.max(a[0] + a[2], b[0] + b[2]) - x, Math.max(a[1] + a[3], b[1] + b[3]) - y]; };
  for (const r of got("stage")) must(eq(r.rect, stage), `stage ${r.rect} is not ${stage}`);
  for (const r of regions) must(within(r.rect, [0, 0, 1024, 600]), `${r.id} (${r.layer}) ${r.rect} leaves the screen`);
  // the bay (R1, R2): the painting at its rect in every state, and its door (R2) at the door's; no panel, no fill, no rule
  for (const r of got("bay")) must(eq(r.rect, R.bay.rect), `the bay ${r.rect} is not the painting ${R.bay.rect}`);
  for (const r of got("bay.door")) must(eq(r.rect, R.bay.door), `the door ${r.rect} is not ${R.bay.door}`);
  must(got("bay", "chrome").length === 0, "the bay is a picture, never a panel");
  must(art("bay").some((r) => eq(r.rect, R.bay.rect)), "the painted bay is drawn at its rect in every state");
  must(state !== "opening" || got("bay.door").length === 0, "the door is open in the opening");
  if (state === "report") must(art("bay.door").some((r) => eq(r.rect, R.bay.door)), "the door is shut in the report");
  for (const r of art("crates")) must(within(r.rect, R.bay.inside), `the crates and their shadows ${r.rect} leave the bay's inside ${R.bay.inside}`);   // clipped to the inside, sliding in or at rest
  for (const r of got("waiting")) must(within(r.rect, R.waitingPods.rect), `a waiting pod or its shadow ${r.rect} leaves ${R.waitingPods.rect}`);
  for (const r of got("rack", "chrome")) out.push(`the rack's panel ${r.rect}: the rack is the painted insert`);
  for (const r of art("rack")) must(within(r.rect, R.rack.rect), `the rack's insert and pods ${r.rect} leave the rack ${R.rack.rect}`);
  // the dock arrival (cargo.json regions.arrival): the apron at its rect and only in the show, the link light inside its strip, a mibi's picture inside the apron's span and its feet on y 528, the band in the bay's top corners
  if (state === "arrival") { const AR = R.arrival;
    for (const r of got("apron")) must(eq(r.rect, AR.apron.rect), `the apron ${r.rect} is not ${AR.apron.rect}`);
    for (const r of got("light")) must(within(r.rect, AR.light.rect), `the link light ${r.rect} leaves its strip ${AR.light.rect}`);
    for (const r of got("mibis")) must(within(r.rect, [32, 216 - 4, 960, 312 + 4]) && r.rect[1] + r.rect[3] <= AR.mibis.feet + 1, `a mibi's picture ${r.rect} is not on the apron with its feet on ${AR.mibis.feet}`);
    for (const r of [...got("arrivalBand"), ...got("band.probe"), ...got("band.leaving")]) must(r.rect[1] >= 56 && r.rect[1] + r.rect[3] <= 100 && r.rect[0] >= 32 && r.rect[0] + r.rect[2] <= 992, `the band ${r.id} ${r.rect} leaves the bay's top corners`);
    for (const r of got("glint")) must(r.rect[1] >= 120 && r.rect[1] + r.rect[3] <= 140, `a glint ${r.rect} is not at the crate's top (y 128)`); }
  else { must(got("apron").length === 0 && got("mibis").length === 0 && got("light").length === 0, "the apron, the mibis and the link light show only in the arrival"); }
  // the ribbon (R9): fits its words, centred on 512, never wider than its bound
  for (const r of got("ribbon", "chrome")) must(r.rect[2] % 8 === 0 && r.rect[2] >= 160 && r.rect[2] <= R.ribbon.rect[2] && r.rect[0] + r.rect[2] / 2 === 512 && r.rect[1] === R.ribbon.rect[1] && r.rect[3] === R.ribbon.rect[3], `the ribbon ${r.rect} does not fit its words (w a multiple of 8, 160 to ${R.ribbon.rect[2]}, centred on 512, at y ${R.ribbon.rect[1]})`);
  for (const r of got("ribbon", "type")) must(within(r.rect, R.ribbon.rect), `the ribbon's words ${r.rect} leave its bound`);
  const crateBox = union(R.crate.rect, R.crate.shadow.rect);
  for (const r of art("crate")) must(within(r.rect, crateBox), `the crate's picture, pods and shadow ${r.rect} leave the crate ${R.crate.rect} and its shadow ${R.crate.shadow.rect}`);
  for (const r of art("travel")) must(within(r.rect, R.travel.rect), `a travelling pod ${r.rect} leaves the travel rectangle ${R.travel.rect}`);
  // each container is its own region (cargo.c names them stores.<material>): each logged id is its place or its shadow; no other stores id is legal
  for (const k of Object.keys(R.stores.places)) { const p = R.stores.places[k], sh = [p[0] + R.stores.shadow.at[0], p[1] + R.stores.shadow.at[1], ...R.stores.shadow.size]; const both = union(p, sh); for (const r of art(`stores.${k}`)) must(within(r.rect, both) && r.rect[0] === p[0], `the ${k} container and its shadow ${r.rect} are not inside ${both} (its place ${p}, its shadow ${sh})`); }
  for (const r of regions) if (/^stores(\.|$)/.test(r.id)) must(Object.hasOwn(R.stores.places, r.id.slice(7)), `${r.id} is not a container of cargo.json (stores.energy, stores.data, stores.essence)`);
  // the report (R6): the signed plate of its exact height (a multiple of 8, 128 to 288) at y = 64 + 8 × floor((288 − h) / 16), 560 wide; no panel, rule or shadow
  { const c = R.report.rect, mh = R.report.maxHeight;
    for (const r of art("report").filter((x) => x.rect[2] === c[2])) must(r.rect[0] === c[0] && r.rect[2] === c[2] && r.rect[3] % 8 === 0 && r.rect[3] >= 128 && r.rect[3] <= mh && r.rect[1] === c[1] + 8 * Math.floor((mh - r.rect[3]) / 16) && r.rect[1] + r.rect[3] <= R.bay.door[1] + R.bay.door[3] - 8, `the report plate ${r.rect} is not the plate of its height at (${c[0]}, y(h)) 560 wide inside the door`);
    for (const r of got("report", "chrome")) out.push(`the report ${r.rect}: the plate is painted, the face draws no fill, edge, rule or shadow`);
    for (const id of ["report.heading", "report.crate", "report.gathered", "report.probe", "report.world", "report.goal"]) for (const r of got(id)) must(within(r.rect, [c[0], c[1], c[2], mh]), `${id} (${r.layer}) ${r.rect} leaves the plate`); }
  if (state === "report") {   // GB-R6: the heading stands on the cream label plate, 12 px in from the plate's top and left, the label's words inside it
    const pl = art("report").find((x) => x.rect[2] === R.report.rect[2]), L = R.report.label, lab = pl && [pl.rect[0] + L.at[0], pl.rect[1] + L.at[1], L.size[0], L.size[1]], hd = got("report.heading", "type")[0];
    must(!!lab && within(lab, pl.rect), "the cream label plate lies inside the plate");   // the log holds one painted union where the plate and the label are both placed masters
    must(!!lab && !!hd && within(hd.rect, lab), `the heading ${hd?.rect} leaves its label plate ${lab}`);
    must(!!lab && lab[0] - pl.rect[0] >= 6 && lab[1] - pl.rect[1] >= 6 && lab[1] + lab[3] + 12 <= pl.rect[1] + R.report.rows.first, "the label lies 6 px inside the plate and ends 12 px above the first row (fix 2 F3)");
  }
  must(state === "report" || got("report").length === 0, "the report plate shows only in the report");
  must(state === "opening" || (got("crate").length === 0 && got("travel").length === 0 && (state === "arrival" || got("ribbon").length === 0)), "the ribbon (also in the arrival), the crate and the travelling pods show only in the opening");
  must(state === "opening" || !regions.some((r) => /^stores(\.|$)/.test(r.id)), "the containers show only in the opening");
  must(state === "bay" || (got("waiting").length === 0 && (state === "arrival" || got("crates").length === 0)), "the bay's crates (also in the arrival) and waiting pods show only in the bay");
  must(art("bay").length >= 1, "the bay is drawn in every state");
  // what each state must draw (a node with no size is not in the log, so a region that vanished is found here)
  must(state === "arrival" || art("rack").some((r) => eq(r.rect, R.rack.rect)), "the rack insert is drawn");   // the arrival draws the apron in its place during the show and the rack at the choice (tested there)
  if (state === "opening") must(got("crate").length >= 1, "the crate closer is drawn");
  if (state === "report") must(art("report").filter((x) => x.rect[2] === R.report.rect[2]).length === 1 && got("report.heading", "type").length === 1, "the report plate is drawn");
  for (const t of type) if (![16, 20, 28].includes(t.px)) out.push(`"${t.text}" is set at ${t.px} px`);
  return out;
}
