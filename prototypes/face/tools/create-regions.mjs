// Check 1 for Create (lvgl-switch.md §4): every region the face's log says it drew, against the rectangle create.json (and frame.json for the stage and the rail) gives it. `departures` returns the list of departures, empty when none.
// log: the face's `log` message { regions: [{ id, layer, rect }], type: [{ text, px, region, rect? }] }; spec: create.json; frame: frame.json; state: "nothingRead" | "shape" | "grow".
const within = (b, r) => b[0] >= r[0] && b[1] >= r[1] && b[0] + b[2] <= r[0] + r[2] && b[1] + b[3] <= r[1] + r[3];
const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

export function departures(log, spec, frame, state = "shape", pod = null, rolled = state !== "nothingRead") {   // rolled: the props carry a roll (Grow from nothing read has none)
  const out = [], R = spec.regions, regions = log.regions ?? [], type = log.type ?? [], got = (id, layer) => regions.filter((r) => r.id === id && (!layer || r.layer === layer));
  const must = (ok, m) => { if (!ok) out.push(m); };
  for (const r of regions) must(within(r.rect, [0, 0, 1024, 600]), `${r.id} (${r.layer}) ${r.rect} leaves the screen`);
  for (const r of got("bench")) must(eq(r.rect, R.bench.rect), `the bench ${r.rect} is not ${R.bench.rect}`);
  for (const r of regions.filter((x) => x.id === "rail.tab")) must(within(r.rect, [R.rail.rect[0] - 16, R.rail.rect[1], R.rail.rect[2] + 32, R.rail.rect[3] + 16]), `the rail's ${r.layer} ${r.rect} leaves the rail ${R.rail.rect}`);
  for (const id of ["chamber", "chamberFront", "dome", "domeFront", "cradle", "cradleFront", "bud"]) for (const r of got(id)) must(eq(r.rect, R[id].rect), `${id} ${r.rect} is not ${R[id].rect}`);
  for (const r of got("founder")) must(within(r.rect, R.founder.rect), `the founder ${r.rect} leaves ${R.founder.rect}`);
  for (const r of got("pod")) must(within(r.rect, R.pod.rect), `the pod ${r.rect} leaves ${R.pod.rect}`);
  for (const r of got("podShadow")) must(r.rect[2] === 0 || (within(r.rect, R.podShadow.rect) && r.rect[0] + r.rect[2] / 2 === R.pod.axis && r.rect[1] === R.pod.feet - 7 && r.rect[3] === 14), `the pod's shadow ${r.rect} is not on the foot (${R.pod.axis}, ${R.pod.feet}) inside ${R.podShadow.rect}`);
  for (const r of got("travel")) must(within(r.rect, R.travel.rect), `the travelling pod ${r.rect} leaves the travel rectangle ${R.travel.rect}`);
  for (const r of got("origin")) must(within(r.rect, R.origin.rect), `the origin ${r.rect} leaves ${R.origin.rect}`);
  for (const r of got("roll")) must(within(r.rect, R.roll.rect), `the roll's ${r.layer} ${r.rect} leaves the roll ${R.roll.rect}`);
  for (const r of got("traitLine")) must(within(r.rect, R.traitLine.rect), `the trait line's ${r.layer} ${r.rect} leaves ${R.traitLine.rect}`);
  must(got("leaves").length === 0, "Create draws no leaves region (fix 6 N1)");
  for (const r of got("founderShadow")) must(within(r.rect, R.founderShadow.rect), `the founder's shadow ${r.rect} leaves ${R.founderShadow.rect}`);
  for (const r of got("action")) { const z = frame.regions.action.rect; must(r.rect[0] >= z[0] && r.rect[0] + r.rect[2] <= z[0] + z[2] && r.rect[1] >= 566 && r.rect[1] + r.rect[3] <= 594, `the Grow line's ${r.layer} ${r.rect} leaves the action zone ${z} across x, or y 566 to 594 (a text box's line sits 2 px above the zone)`); }   // the wait is the price's last group: the whole action ends at x <= 392
  for (const r of got("stamp.plate", "painted")) must(eq(r.rect, R.stamp.rect), `the stamp label ${r.rect} is not ${R.stamp.rect}`);
  for (const r of [...got("stampImage", "painted"), ...got("stampImage", "art")]) must(within(r.rect, R.stamp.rect), `the stamp ${r.rect} leaves its label ${R.stamp.rect}`);
  for (const r of [...got("stamp", "painted"), ...got("stamp", "art")]) must(within(r.rect, R.stampCase.rect), `the stamp ${r.rect} leaves its case ${R.stampCase.rect}`);   // the case (788, 320, 152, 152) holds the label and the stamp; the case is drawn in every state (fix 5 Create C1)
  must(got("stamp", "painted").some((r) => eq(r.rect, R.stampCase.rect)), `the stamp case is not drawn at ${R.stampCase.rect}`);
  must(R.stamp.rect[0] >= R.stampCase.rect[0] && R.stamp.rect[1] >= R.stampCase.rect[1] && R.stamp.rect[0] + R.stamp.rect[2] <= R.stampCase.rect[0] + R.stampCase.rect[2] && R.stamp.rect[1] + R.stamp.rect[3] <= R.stampCase.rect[1] + R.stampCase.rect[3], "the label lies inside its case");
  for (const r of got("code")) must(within(r.rect, R.code.rect), `the code ${r.rect} leaves ${R.code.rect}`);
  { const roll = got("roll", "chrome"), ring = got("focus"); for (const r of ring) must(within(r.rect, [R.roll.rect[0] - 8, R.roll.rect[1], R.roll.rect[2] + 16, R.roll.rect[3]]), `the ring ${r.rect} is not on the roll ${R.roll.rect}`); void roll; }
  // what each state draws, and what it does not
  must(rolled || (got("roll").length === 0 && got("focus").length === 0), "nothing read: no roll and no ring");
  must(!rolled || got("roll").length > 0, "the roll is drawn");
  must(state === "grow" ? got("pod").length === 0 && got("travel").length === 1 : got("travel").length === 0, state === "grow" ? "the pod travels in grow" : "nothing travels outside grow");
  must(state === "grow" || got("code", "type").length === 0, "the code is printed at Grow");
  must(got("stamp.plate", "painted").length === 1, "the stamp label (its dimmed plate) is drawn once");
  must(got("founder").length === 1, "the founder is drawn");
  for (const t of type) if (![16, 20, 28].includes(t.px)) out.push(`"${t.text}" is set at ${t.px} px`);
  void pod; return out;
}
