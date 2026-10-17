// The Incubator's regions as the face drew them against incubator.json: every region of the face's log inside the rectangle the spec gives it, the retired regions absent, the parts a state does not name absent. Option B, candling
// (specs/station-incubator-tabs-ruling.md). log: the face's `log` message { regions: [{ id, layer, rect }], type: [{ text, px, region }] }; spec: incubator.json; state: "empty" | "growing" | "ready" | "hatch".
// Returns the departures as strings (none: the face keeps the spec).
const within = (b, r) => b[0] >= r[0] && b[1] >= r[1] && b[0] + b[2] <= r[0] + r[2] && b[1] + b[3] <= r[1] + r[3];
const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const RETIRED = ["rail", "rail.tab", "rail.well", "leaves", "dome", "domeFront", "nest", "nestFront", "base", "plaque", "lamp", "bud", "bench", "footLight"];

export function departures(log, spec, frame, state = "growing") {
  const out = [], R = spec.regions, regions = log.regions ?? [], type = log.type ?? [], got = (id, layer) => regions.filter((r) => r.id === id && (!layer || r.layer === layer));
  const must = (ok, m) => { if (!ok) out.push(m); };
  const STANDIN_FEET = 424;   // the curl stand-in's feet in the moving hatch, 1000-2320 ms (motion-spec §2.7a, M1a only): face/src/screens/incubator.c HATCH_STANDIN_FEET; both go at M1b
  const lift = Math.max(R.juvenile.lift, ...(spec.events?.hatch?.moving?.steps ?? []).flatMap((x) => (Array.isArray(x.lift) ? x.lift : [])), R.juvenile.rect[1] + R.juvenile.rect[3] - STANDIN_FEET);   // the step-out's lift, the moving hatch's first hop (Station M1 §2.5), or the stand-in's anchor
  for (const r of regions) must(within(r.rect, [0, 0, 1024, 600]), `${r.id} (${r.layer}) ${r.rect} leaves the screen`);
  for (const id of RETIRED) must(got(id).length === 0, `${id} is retired: the candling screen draws no ${id} (specs/station-incubator-tabs-ruling.md §2)`);
  for (const r of got("stage").filter((x) => x.layer !== "type")) must(eq(r.rect, R.stage.rect), `the stage ${r.rect} is not ${R.stage.rect}`);
  for (const r of got("ring")) must(within(r.rect, R.ring.rect), `the ring's ${r.layer} ${r.rect} leaves ${R.ring.rect}`);
  for (const r of got("cradle")) must(eq(r.rect, R.cradle.rect), `the cradle ${r.rect} is not ${R.cradle.rect}`);
  for (const r of got("cradleFront")) must(eq(r.rect, R.cradleFront.rect), `the cradle's front ${r.rect} is not ${R.cradleFront.rect}`);
  for (const r of got("pod")) must(within(r.rect, R.pod.rect), `the pod ${r.rect} leaves ${R.pod.rect}`);
  for (const r of got("shadow")) must(within(r.rect, R.shadow.rect), `the shadow ${r.rect} leaves ${R.shadow.rect}`);
  for (const r of got("slip").filter((x) => x.layer !== "type")) must(eq(r.rect, R.slip.rect), `the slip ${r.rect} is not ${R.slip.rect}`);
  for (const r of got("slip", "type")) must(within(r.rect, [R.slip.textX, R.slip.rect[1] + R.slip.pad, R.slip.maxLine, R.slip.rect[3] - 2 * R.slip.pad]), `the slip's text ${r.rect} leaves its column`);
  for (const r of got("card").filter((x) => x.layer !== "type")) must(within(r.rect, R.card.rect), `the card's ${r.layer} ${r.rect} leaves ${R.card.rect}`);
  for (const r of got("card", "type")) must(within(r.rect, R.card.rect), `the card's words ${r.rect} leave ${R.card.rect}`);
  for (const r of got("juvenile")) must(within(r.rect, [R.juvenile.rect[0], R.juvenile.rect[1] - lift, R.juvenile.rect[2], R.juvenile.rect[3] + lift + 2]), `the juvenile ${r.rect} leaves ${R.juvenile.rect} by more than its ${lift} px step or anchor`);   // + 2: the moving hatch's crouch, drawn 2 px lower
  for (const r of got("stamp.plate", "painted")) must(r.rect[2] === 0 || eq(r.rect, R.stamp.rect), `the stamp label ${r.rect} is not ${R.stamp.rect}`);
  for (const r of [...got("stamp", "painted"), ...got("stamp", "art")]) must(within(r.rect, R.stamp.rect), `the stamp ${r.rect} leaves its label ${R.stamp.rect}`);
  for (const r of got("code")) must(within(r.rect, [R.code.rule.x[0], R.code.rect[1], R.code.rule.x[1] - R.code.rule.x[0], R.code.rule.y + R.code.rule.h - R.code.rect[1]]), `the code ${r.rect} leaves its rule ${R.code.rule.x} and box ${R.code.rect}`);
  for (const r of got("ribbon", "chrome")) must(r.rect[2] === 0 || eq(r.rect, R.ribbon.rect), `the ribbon ${r.rect} is not ${R.ribbon.rect}`);
  for (const r of got("ribbon", "type")) must(within(r.rect, R.ribbon.rect), `the ribbon's words ${r.rect} leave ${R.ribbon.rect}`);
  // the ring's focus: on the pod (an oval round its box) or the card
  const T = spec.focus.targets; for (const r of got("focus")) must(within(r.rect, [T.pod.rect[0] - 4, T.pod.rect[1] - 4, T.pod.rect[2] + 8, T.pod.rect[3] + 8]) || within(r.rect, [T.card.rect[0] - 4, T.card.rect[1] - 4, T.card.rect[2] + 8, T.card.rect[3] + 8]), `the ring ${r.rect} is on neither the pod nor the card`);
  // what each state draws
  if (state === "empty") for (const id of ["pod", "shadow", "slip", "card", "stamp.plate", "stamp", "code", "juvenile", "focus"]) must(got(id).filter((x) => x.rect[2] > 0).length === 0 && !type.some((t) => t.region === id && t.text), `the empty Incubator draws no ${id}`);
  else {
    must(got("pod").length > 0 || state === "hatch", "the pod is drawn"); must(got("slip").length > 0, "the slip is drawn"); must(got("stamp.plate", "painted").length === 1, "the stamp label (its dimmed plate) is drawn once"); must(type.some((t) => t.region === "code"), "the code is drawn");
  }
  must(state !== "hatch" || got("focus").length === 0, "the hatch holds no ring"); must(state === "hatch" || got("juvenile").every((r) => r.rect[2] === 0), "the juvenile is drawn only in the hatch");
  must(state === "hatch" || got("ribbon", "chrome").length === 0 || got("ribbon", "chrome").every((r) => r.rect[2] === 0), "the ribbon shows only in the hatch");
  for (const t of type) if (![16, 20, 28].includes(t.px)) out.push(`"${t.text}" is set at ${t.px} px`);
  return out;
}
