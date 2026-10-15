// The Incubator's regions as the face drew them against incubator.json: every region of the face's log inside the rectangle the spec gives it, the parts a state does not name absent, and the pieces the spec says are registered and not
// drawn absent. log: the face's `log` message { regions: [{ id, layer, rect }], type: [{ text, px, region, rect? }] }; spec: incubator.json; state: "empty" | "growing" | "ready" | "hatch". Returns the departures as strings (none: the face keeps the spec).
const within = (b, r) => b[0] >= r[0] && b[1] >= r[1] && b[0] + b[2] <= r[0] + r[2] && b[1] + b[3] <= r[1] + r[3];
const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

export function departures(log, spec, frame, state = "growing") {
  const out = [], R = spec.regions, regions = log.regions ?? [], type = log.type ?? [], got = (id, layer) => regions.filter((r) => r.id === id && (!layer || r.layer === layer));
  const must = (ok, m) => { if (!ok) out.push(m); };
  const STANDIN_FEET = 424;   // the curl stand-in's feet in the moving hatch, 1000-2320 ms (motion-spec §2.7a, M1a only): face/src/screens/incubator.c HATCH_STANDIN_FEET; both go at M1b
  const lift = Math.max(R.juvenile.lift, ...(spec.events?.hatch?.moving?.steps ?? []).flatMap((x) => (Array.isArray(x.lift) ? x.lift : [])), R.juvenile.rect[1] + R.juvenile.rect[3] - STANDIN_FEET);   // the step-out's lift, the moving hatch's first hop (Station M1 §2.5), or the stand-in's anchor
  for (const r of regions) must(within(r.rect, [0, 0, 1024, 600]), `${r.id} (${r.layer}) ${r.rect} leaves the screen`);
  for (const r of got("bench")) must(eq(r.rect, R.bench.rect), `the bench ${r.rect} is not ${R.bench.rect}`);
  for (const r of regions.filter((x) => x.id === "rail.tab")) must(within(r.rect, [R.rail.rect[0] - 16, R.rail.rect[1], R.rail.rect[2] + 32, R.rail.rect[3] + 16]), `the rail's ${r.layer} ${r.rect} leaves the rail ${R.rail.rect}`);
  for (const r of got("leaves")) must(within(r.rect, R.leaves.rect), `the leaves ${r.rect} leave ${R.leaves.rect}`);
  for (const r of got("dome")) must(eq(r.rect, R.dome.rect), `the chamber's back ${r.rect} is not ${R.dome.rect}`);
  for (const r of got("domeFront")) must(eq(r.rect, R.domeFront.rect), `the window's front ${r.rect} is not ${R.domeFront.rect}`);
  for (const r of got("nestFront")) must(eq(r.rect, R.nestFront.rect), `the nest's front ${r.rect} is not ${R.nestFront.rect}`);
  for (const r of got("nest")) must(eq(r.rect, R.nest.rect), `the nest ${r.rect} is not ${R.nest.rect}`);
  for (const r of got("bud")) must(within(r.rect, R.bud.rect), `the bud ${r.rect} leaves ${R.bud.rect}`);
  for (const r of got("base")) must(eq(r.rect, R.base.rect), `the base ${r.rect} is not ${R.base.rect}`);
  for (const r of got("plaque")) must(within(r.rect, R.plaque.rect), `the plaque ${r.rect} leaves ${R.plaque.rect}`);
  for (const r of got("lamp")) must(eq(r.rect, R.base.lamp.rect), `the lamp ${r.rect} is not ${R.base.lamp.rect}`);
  for (const r of got("juvenile")) must(within(r.rect, [R.juvenile.rect[0], R.juvenile.rect[1] - lift, R.juvenile.rect[2], R.juvenile.rect[3] + lift + 2]),   /* + 2: the moving hatch's crouch, drawn 2 px lower */ `the juvenile ${r.rect} leaves ${R.juvenile.rect} by more than its ${lift} px step or anchor`);
  for (const r of got("stamp.plate", "painted")) must(eq(r.rect, R.stamp.rect), `the stamp label ${r.rect} is not ${R.stamp.rect}`);
  for (const r of [...got("stamp", "painted"), ...got("stamp", "art")]) must(within(r.rect, R.stamp.rect), `the stamp ${r.rect} leaves its label ${R.stamp.rect}`);
  for (const r of got("code")) must(within(r.rect, R.code.rect), `the code ${r.rect} leaves ${R.code.rect}`);
  for (const r of got("ribbon", "chrome")) must(eq(r.rect, R.ribbon.rect), `the ribbon ${r.rect} is not ${R.ribbon.rect}`);
  for (const t of type.filter((x) => x.region === "ribbon" && x.rect)) must(within(t.rect, R.ribbon.rect), `the ribbon's words ${t.rect} leave ${R.ribbon.rect}`);
  // what is not drawn: the foot light is in the base master and the focus has no ring
  for (const id of ["footLight", "focus"]) must(got(id).length === 0, `${id} draws nothing (incubator.json base.footLight, derived.no ring)`);
  // what each state draws
  if (state === "empty") for (const id of ["rail.tab", "leaves", "bud", "stamp", "code", "juvenile"]) must(got(id).length === 0 && !type.some((t) => t.region === id), `the empty Incubator draws no ${id}`);
  else { must(regions.some((r) => r.id === "rail.tab"), "the rail is drawn"); must(got("stamp.plate", "painted").length === 1, "the stamp label (its dimmed plate) is drawn once"); must(type.some((t) => t.region === "code"), "the code is drawn"); }
  must(state === "hatch" || got("juvenile").length === 0, "the juvenile is drawn only in the hatch");
  must(state === "hatch" || got("ribbon", "chrome").length === 0 || got("ribbon", "chrome").every((r) => r.rect[2] === 0), "the ribbon shows only in the hatch");
  must(got("dome").length > 0 && got("domeFront").length > 0, "the chamber's back and window front are drawn"); must(got("base").length > 0 && got("nest").length > 0, "the nest and the base are drawn");
  must(type.some((t) => t.region === "plaque") === (state !== "hatch"), `the plaque's word ${state === "hatch" ? "is gone in the hatch" : "is drawn"}`);
  return out;
}
