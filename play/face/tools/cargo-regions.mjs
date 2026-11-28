// Check 1 for Cargo (lvgl-switch.md §4): every region the face's log says it drew, against the rectangle cargo.json (and frame.json for the stage) gives it. `departures` returns the list of departures (empty when none).
// log: the face's `log` message { regions: [{ id, layer, rect }], type: [{ text, px, region, rect? }] }; spec: cargo.json; frame: frame.json; state: "bay"; opts.narrow: the phone's form (530 x 600 lp), else the wide form (1024 x 600).
//   The Bay is four code panels (regions ledge, table, shelf, counters) with the signed pictures placed 1:1 on them: each region of the log stands inside the panel it belongs to, the words at 16 px and up.
//   A region is every node of one id, so its rect is their union: the ledge's crates (ledgeCrate) in the ledge, the table's crate (tableCrate) in the table, the rings in their panels, the dashed slots on their rects.
const within = (b, r) => b[0] >= r[0] && b[1] >= r[1] && b[0] + b[2] <= r[0] + r[2] && b[1] + b[3] <= r[1] + r[3];
const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

export function departures(log, spec, frame, state = "bay", opts = {}) {
  const out = [], F = spec.forms[opts.narrow ? "narrow" : "wide"], regions = log.regions ?? [], type = log.type ?? [], got = (id) => regions.filter((r) => r.id === id);
  const must = (ok, m) => { if (!ok) out.push(m); };
  const stage = frame.regions.stage.rect, window = opts.narrow ? [0, 0, 530, 600] : [0, 0, 1024, 600];
  for (const r of got("stage")) must(eq(r.rect, stage), `stage ${r.rect} is not ${stage}`);
  must(state === "bay", `the Bay has one state, not ${state}`);
  for (const [id, rect] of [["ledge", F.ledge], ["table", F.table], ["shelf", F.shelf], ["counters", F.counters], ["wood", F.wood], ["cradleSlot", F.cradle], ["openSlot", F.open]]) for (const r of got(id)) must(eq(r.rect, rect), `${id} ${r.rect} is not ${rect}`);
  for (const [id, rect] of [["ledgeCrate", F.ledge], ["ledgeRing", F.ledge], ["cradle", F.cradle], ["tableCrate", F.table], ["tableRing", F.table], ["handFrame", F.table], ["herSlot", F.table], ["contents", F.table], ["shelfPods", F.shelf]]) for (const r of got(id)) must(within(r.rect, rect), `${id} ${r.rect} leaves its place ${rect}`);
  must(got("openSlot").length === 0 || got("tableCrate").length === 0, "a crate is sealed on the table or open (its slot), never both");
  for (const id of ["ledge", "table", "shelf", "counters", "ledgeCrate", "tableCrate", "ledgeRing", "tableRing", "cradleSlot", "openSlot", "wood", "handFrame", "herSlot"]) for (const r of got(id)) must(within(r.rect, window), `${id} ${r.rect} is outside the form's window ${window}`);
  for (const t of type) if (![16, 1016, 20, 28].includes(t.px)) out.push(`"${t.text}" is set at ${t.px} px`);
  return out;
}
