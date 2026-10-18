// The Incubator's regions as the face drew them against incubator.json (T-20261016-222, the painted capsule): every region of the face's log inside the rectangle the spec gives it, the layers a state does not name absent, and the pieces
// the spec says are registered and not drawn absent. log: the face's `log` message { regions: [{ id, layer, rect }], type: [{ text, px, region, rect? }] }; spec: incubator.json; state: "empty" | "growing" | "ready" | "hatch".
// Returns the departures as strings (none: the face keeps the spec).
const within = (b, r) => b[0] >= r[0] && b[1] >= r[1] && b[0] + b[2] <= r[0] + r[2] && b[1] + b[3] <= r[1] + r[3];
const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

export function departures(log, spec, frame, state = "growing") {
  const out = [], R = spec.regions, regions = log.regions ?? [], type = log.type ?? [], got = (id, layer) => regions.filter((r) => r.id === id && (!layer || r.layer === layer));
  const must = (ok, m) => { if (!ok) out.push(m); };
  for (const r of regions) must(within(r.rect, [0, 0, 1024, 600]), `${r.id} (${r.layer}) ${r.rect} leaves the screen`);
  for (const r of got("bench")) must(eq(r.rect, R.bench.rect), `the stage ground ${r.rect} is not ${R.bench.rect}`);
  for (const r of got("room")) must(eq(r.rect, R.room.rect), `the room ${r.rect} is not ${R.room.rect}`);
  for (const id of ["interior", "shell", "door", "glass", "seal"]) for (const r of got(id)) must(eq(r.rect, R.capsule.rect), `the capsule's ${id} ${r.rect} is not ${R.capsule.rect}`);
  { const c = R.capsule.rect, f = R.capsule.bar.full; for (const r of got("bar")) must(within(r.rect, [c[0] + f[0], c[1] + f[1], f[2], f[3]]), `the bar ${r.rect} leaves its window ${f}`); }
  for (const r of got("pod")) must(eq(r.rect, R.inside.rect), `the pod ${r.rect} is not ${R.inside.rect}`);
  { const [fx, fy] = R.juvenile.foot, lift = Math.max(R.juvenile.lift, ...(spec.events?.hatch?.steps ?? []).flatMap((x) => (Array.isArray(x.lift) ? x.lift.map((l) => l[1]) : []))); for (const r of got("juvenile")) must(within(r.rect, [fx - 160, fy - 200 - lift, 320, 200 + lift + 60]), `the juvenile ${r.rect} leaves its place on (${fx}, ${fy})`); }
  for (const r of got("stamp.plate", "painted")) must(eq(r.rect, R.stamp.rect), `the stamp label ${r.rect} is not ${R.stamp.rect}`);
  for (const r of [...got("stamp", "painted"), ...got("stamp", "art")]) must(within(r.rect, R.stampCase.rect), `the stamp ${r.rect} leaves its case ${R.stampCase.rect}`);
  for (const r of got("code")) must(within(r.rect, R.code.rect), `the code ${r.rect} leaves ${R.code.rect}`);
  for (const t of type.filter((x) => x.region === "readyIn" && x.rect)) must(within(t.rect, R.readyIn.rect), `the time ${t.rect} leaves ${R.readyIn.rect}`);
  for (const r of got("ribbon", "chrome")) must(eq(r.rect, R.ribbon.rect), `the ribbon ${r.rect} is not ${R.ribbon.rect}`);
  for (const t of type.filter((x) => x.region === "ribbon" && x.rect)) must(within(t.rect, R.ribbon.rect), `the ribbon's words ${t.rect} leave ${R.ribbon.rect}`);
  // what is gone with the old chamber: no rail, no leaves, no dome, nest, base, plaque or lamp, and the focus has no ring
  for (const id of ["rail.tab", "rail.well", "leaves", "dome", "nest", "nestFront", "domeFront", "base", "plaque", "lamp", "bud", "focus"]) must(got(id).length === 0 && !type.some((t) => t.region === id), `${id} draws nothing (retired with the old chamber)`);
  // what each state draws
  if (state === "empty") for (const id of ["stamp", "code", "readyIn", "pod", "juvenile"]) must(got(id).length === 0 && !type.some((t) => t.region === id), `the empty Incubator draws no ${id}`);
  else if (got("seal").length > 0) { /* the incubate moment: the column cuts in at 1200 while the ring is still going out by 1380 (incubator.test.mjs holds the exact times) */ }
  else { must(got("stamp.plate", "painted").length === 1, "the stamp label (its plate) is drawn once"); must(type.some((t) => t.region === "code"), "the code is drawn"); must(got("pod").length > 0 || state === "hatch", "the pod is inside"); }
  must(state === "growing" || !type.some((t) => t.region === "readyIn"), "the time is the growing state's alone");
  must(state === "hatch" || got("juvenile").length === 0, "the juvenile is drawn only in the hatch");
  must(state === "hatch" || got("ribbon", "chrome").length === 0 || got("ribbon", "chrome").every((r) => r.rect[2] === 0), "the ribbon shows only in the hatch");
  must(got("room").length > 0 && got("interior").length > 0 && got("shell").length > 0, "the room, the interior and the shell are drawn in every state");
  return out;
}
