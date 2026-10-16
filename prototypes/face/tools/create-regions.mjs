// Check 1 for Create (lvgl-switch.md §4): every region the face's log says it drew, against the rectangle create.json (and frame.json for the stage) gives it. `departures` returns the list of departures, empty when none.
// log: the face's `log` message { regions: [{ id, layer, rect }], type: [{ text, px, region, rect? }] }; spec: create.json; frame: frame.json; state: "nothingRead" | "shape" | "grow".
const within = (b, r) => b[0] >= r[0] && b[1] >= r[1] && b[0] + b[2] <= r[0] + r[2] && b[1] + b[3] <= r[1] + r[3];
const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const RETIRED = ["rail", "rail.tab", "rail.well", "roll", "traitLine", "chamber", "chamberFront", "dome", "domeFront", "bud", "stampCase", "stampCaseFront", "cradle", "cradleFront", "podShadow", "origin", "founderShadow", "leaves"];

export function departures(log, spec, frame, state = "shape") {
  const out = [], R = spec.regions, regions = log.regions ?? [], type = log.type ?? [], got = (id, layer) => regions.filter((r) => r.id === id && (!layer || r.layer === layer));
  const must = (ok, m) => { if (!ok) out.push(m); };
  for (const r of regions) must(within(r.rect, [0, 0, 1024, 600]), `${r.id} (${r.layer}) ${r.rect} leaves the screen`);
  for (const id of RETIRED) must(got(id).length === 0, `${id} is retired: the bench draws no ${id} (specs/station-create-bench-spec.md §2)`);
  for (const id of ["bench", "well", "geneLine", "dish", "slip"]) for (const r of got(id).filter((x) => x.layer !== "type")) must(eq(r.rect, R[id].rect), `${id} ${r.rect} is not ${R[id].rect}`);
  for (const r of got("founder")) must(within(r.rect, R.founder.rect), `the founder ${r.rect} leaves ${R.founder.rect}`);
  for (const r of got("pod")) must(within(r.rect, R.travel.rect), `the pod ${r.rect} leaves the bench ${R.travel.rect}`);
  for (const r of got("travel")) must(within(r.rect, [R.travel.rect[0], R.travel.rect[1], R.travel.clipRight - R.travel.rect[0], R.travel.rect[3]]), `the carried pod ${r.rect} leaves the interior's edge ${R.travel.clipRight}`);
  for (const r of got("name", "painted")) must(r.rect[2] <= R.name.plate.max && r.rect[3] === R.name.plate.h && r.rect[1] === R.name.rect[1] && Math.abs(r.rect[0] + r.rect[2] / 2 - R.name.centre) <= 1, `the name plate ${r.rect} is not centred on ${R.name.centre} at y ${R.name.rect[1]}, ${R.name.plate.h} tall, at most ${R.name.plate.max} wide`);
  for (const r of got("name", "type")) must(within(r.rect, R.name.rect), `the name ${r.rect} leaves ${R.name.rect}`);
  for (const r of got("found", "type")) must(within(r.rect, R.found.rect), `the found sentence ${r.rect} leaves ${R.found.rect}`);
  for (const r of got("slip", "type")) must(within(r.rect, [R.slip.textX, R.slip.rect[1] + R.slip.pad, R.slip.maxLine, R.slip.rect[3] - 2 * R.slip.pad]), `the slip's text ${r.rect} leaves its text column`);
  // the bank: every drum node inside the tray, never over a more mark; the ring on the focused drum
  const tray = R.bank.rect;
  for (const r of got("bank")) must(within(r.rect, [tray[0], tray[1] + 4, tray[2], tray[3] - 4]), `the bank's ${r.layer} ${r.rect} leaves the tray ${tray}`);
  for (const r of got("bank", "type")) must(r.rect[1] >= tray[1] && r.rect[1] + r.rect[3] <= R.bank.drum.y, `the chapter words ${r.rect} are not above the drums`);
  for (const r of got("focus")) must(within(r.rect, [tray[0], tray[1] - 12, tray[2], tray[3] + 12]), `the ring ${r.rect} is not on a drum of the tray ${tray}`);
  for (const r of got("stamp.plate", "painted")) must(r.rect[2] === 0 || eq(r.rect, R.stamp.rect), `the stamp label ${r.rect} is not ${R.stamp.rect}`);
  for (const r of [...got("stampImage", "painted"), ...got("stampImage", "art")]) must(within(r.rect, R.stamp.rect), `the stamp ${r.rect} leaves its label ${R.stamp.rect}`);
  for (const r of got("code")) must(within(r.rect, R.code.rect), `the code ${r.rect} leaves ${R.code.rect}`);
  for (const r of got("toIncubator", "type")) must(within(r.rect, R.toIncubator.rect), `"to the Incubator" ${r.rect} leaves ${R.toIncubator.rect}`);
  for (const r of got("action")) { const z = frame.regions.action.rect; must(r.rect[0] >= z[0] && r.rect[0] + r.rect[2] <= z[0] + z[2] && r.rect[1] >= 566 && r.rect[1] + r.rect[3] <= 594, `the Grow line's ${r.layer} ${r.rect} leaves the action zone ${z} across x, or y 566 to 594`); }
  // what each state draws, and what it does not
  must(state === "grow" ? got("pod").length === 0 && got("travel").length === 1 : got("travel").length === 0 && got("pod").length === 1, state === "grow" ? "the pod is carried in grow" : "the pod stands in its well outside grow");
  must(state === "grow" || type.every((t) => t.region !== "code" || !t.text), "the code is printed at Grow");
  must(state === "grow" || got("stamp.plate", "painted").every((r) => r.rect[2] === 0), "the stamp is printed at Grow, on the slip");
  must(state !== "grow" || got("focus").length === 0, "grow: the drums are locked, no ring");
  must(state === "grow" || got("focus").length === 1, "the ring is on one drum");
  must(got("founder").length === 1, "the founder is drawn");
  for (const t of type) if (![16, 20, 28].includes(t.px)) out.push(`"${t.text}" is set at ${t.px} px`);
  return out;
}
