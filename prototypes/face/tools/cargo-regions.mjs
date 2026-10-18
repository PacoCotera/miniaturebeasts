// Check 1 for Cargo (lvgl-switch.md §4): every region the face's log says it drew, against the rectangle cargo.json (and frame.json for the stage) gives it. `departures` returns the list of departures, empty when none.
// log: the face's `log` message { regions: [{ id, layer, rect }], type: [{ text, px, region, rect? }] }; spec: cargo.json; frame: frame.json; state: "bay" | "opening" | "end" | "arrival".
//   The portrait crate's painting (region "portrait") is the one travel allowed to leave the bay (build spec 4). What else travels may reach past the bay: a material ends at a top-bar icon, a pod bound for the mat ends 4 px left of the bay,
//   a find bound for the strip's first place hangs 12 px off the screen's left edge (centred on its place, feet on the strip).
const within = (b, r) => b[0] >= r[0] && b[1] >= r[1] && b[0] + b[2] <= r[0] + r[2] && b[1] + b[3] <= r[1] + r[3];
const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const grow = (r, n) => [r[0] - n, r[1] - n, r[2] + 2 * n, r[3] + 2 * n];

export function departures(log, spec, frame, state = "bay", opts = {}) {
  const out = [], R = spec.regions, regions = log.regions ?? [], type = log.type ?? [], got = (id, layer) => regions.filter((r) => r.id === id && (!layer || r.layer === layer));
  const must = (ok, m) => { if (!ok) out.push(m); };
  const stage = frame.regions.stage.rect, art = (id) => [...got(id, "art"), ...got(id, "painted")];
  for (const r of got("stage")) must(eq(r.rect, stage), `stage ${r.rect} is not ${stage}`);
  for (const r of regions) if (r.id !== "travel" && r.id !== "portrait") must(within(r.rect, [0, 0, 1024, 600]), `${r.id} (${r.layer}) ${r.rect} leaves the screen`);
  if (state === "arrival") {   // the dock arrival keeps its own bay, crates, rack and ribbon (cargo.json regions.dock*)
    for (const r of got("bay")) must(eq(r.rect, R.dockBay.rect), `the bay ${r.rect} is not the painting ${R.dockBay.rect}`);
    for (const r of art("crates")) must(within(r.rect, R.dockBay.inside), `the crates and their shadows ${r.rect} leave the bay's inside ${R.dockBay.inside}`);
    for (const r of art("rack")) must(within(r.rect, R.dockRack.rect), `the rack's insert and pods ${r.rect} leave the rack ${R.dockRack.rect}`);
    for (const r of got("ribbon", "chrome")) must(r.rect[2] % 8 === 0 && r.rect[2] >= 160 && r.rect[2] <= R.dockRibbon.rect[2] && r.rect[0] + r.rect[2] / 2 === 512 && r.rect[1] === R.dockRibbon.rect[1] && r.rect[3] === R.dockRibbon.rect[3], `the ribbon ${r.rect} does not fit its words (w a multiple of 8, 160 to ${R.dockRibbon.rect[2]}, centred on 512, at y ${R.dockRibbon.rect[1]})`);
    for (const r of got("ribbon", "type")) must(within(r.rect, R.dockRibbon.rect), `the ribbon's words ${r.rect} leave its bound`);
    must(art("bay").some((r) => eq(r.rect, R.dockBay.rect)), "the painted bay is drawn");
    const AR = R.arrival;
    for (const r of got("apron")) must(eq(r.rect, AR.apron.rect), `the apron ${r.rect} is not ${AR.apron.rect}`);
    for (const r of got("light")) must(within(r.rect, AR.light.rect), `the link light ${r.rect} leaves its strip ${AR.light.rect}`);
    for (const r of got("mibis")) must(within(r.rect, [32, 216 - 4, 960, 312 + 4]) && r.rect[1] + r.rect[3] <= AR.mibis.feet + 1, `a mibi's picture ${r.rect} is not on the apron with its feet on ${AR.mibis.feet}`);
    for (const r of [...got("arrivalBand"), ...got("band.probe"), ...got("band.leaving")]) must(r.rect[1] >= 56 && r.rect[1] + r.rect[3] <= 100 && r.rect[0] >= 32 && r.rect[0] + r.rect[2] <= 992, `the band ${r.id} ${r.rect} leaves the bay's top corners`);
    for (const r of got("glint")) must(r.rect[1] >= 120 && r.rect[1] + r.rect[3] <= 140, `a glint ${r.rect} is not at the crate's top (y 128)`);
    for (const t of type) if (![16, 20, 28].includes(t.px)) out.push(`"${t.text}" is set at ${t.px} px`);
    return out;
  }
  must(got("apron").length === 0 && got("mibis").length === 0 && got("light").length === 0 && got("ribbon").length === 0, "the apron, the mibis, the link light and the ribbon show only in the arrival");
  // the bay (build spec 1): one picture at its rect, the frame's inner shade over it (a chrome composed box of the same rect); no panel, no fill
  for (const r of got("bay")) must(eq(r.rect, R.bay.rect), `the bay ${r.rect} is not the painting ${R.bay.rect}`);
  for (const r of got("bayEdge")) must(eq(r.rect, R.bay.rect), `the bay's edge ${r.rect} is not ${R.bay.rect}`);
  must(art("bay").some((r) => eq(r.rect, R.bay.rect)), "the bay is drawn at its rect in every state");
  // the berths: inside the berth band (the gold edge reaches 5 px outside the fourth berth's rect)
  const band = grow(R.berths.rect, 5);
  for (const r of art("berth")) must(within(r.rect, band), `the berths ${r.rect} leave their band ${band}`);
  must(art("berth").length >= 1, "the berths are drawn");
  // the hatch: its picture, ring, wells, lit wells and the find strip, inside the hatch's rectangle
  for (const id of ["hatch", "hatch.well", "hatch.strip"]) for (const r of art(id)) must(within(r.rect, R.hatch.rect), `${id} ${r.rect} leaves the hatch ${R.hatch.rect}`);
  must(art("hatch").some((r) => eq(r.rect, R.hatch.rect)), "the hatch is drawn at its rect in every state");
  // the waiting mat and the pods stored on it, "+n" on it
  for (const id of ["waiting", "waiting.pod", "waitingMore"]) for (const r of regions.filter((x) => x.id === id)) must(within(r.rect, R.waiting.rect), `${id} ${r.rect} is not on the mat ${R.waiting.rect}`);
  must(art("waiting").some((r) => eq(r.rect, R.waiting.rect)), "the mat is drawn at its rect in every state");
  // the display row: the open crate's contents inside the display rectangle, only in the opening; the portrait's painting may leave
  for (const id of ["display", "displayAmount"]) for (const r of regions.filter((x) => x.id === id)) must(within(r.rect, R.display.rect), `${id} ${r.rect} leaves the display ${R.display.rect}`);
  for (const r of got("portrait")) must(state === "opening", "the portrait crate's painting shows only in the opening");
  // what travels: inside the bay, but the materials end at the top bar's icons (the bar covers the screen above y 40) and the portrait leaves
  for (const r of got("travel")) must(within(r.rect, grow(R.travel.rect, 16)) && r.rect[1] >= -64, `what travels ${r.rect} leaves the travel rectangle ${R.travel.rect} by more than the spec's targets do`);
  must(state === "opening" || (got("display").length === 0 && got("travel").length === 0 && got("portrait").length === 0 && got("displayAmount").length === 0), "the display and what travels show only in the opening");
  must(state !== "bay" || art("hatch.well").length === 0, "the bay's hatch is shut: no wells");
  for (const t of type) if (![16, 20, 28].includes(t.px)) out.push(`"${t.text}" is set at ${t.px} px`);
  return out;
}
