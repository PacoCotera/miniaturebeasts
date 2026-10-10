// Check 1 for Home (lvgl-switch.md §4): every region the face's log says it drew, against the rectangle home.json (and frame.json for the stage) gives it. `departures` returns the list of departures, empty when none.
// log: the face's `log` message { regions: [{ id, layer, rect }], type: [{ text, px, region, rect? }] }; spec: home.json; frame: frame.json; cur: the focus ("room" when none).
const within = (b, r) => b[0] >= r[0] && b[1] >= r[1] && b[0] + b[2] <= r[0] + r[2] && b[1] + b[3] <= r[1] + r[3];
const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
export const MODULES = ["cargo", "pods", "incubator", "probe", "library"];

export function departures(log, spec, frame, cur = "room") {
  const out = [], R = spec.regions, regions = log.regions ?? [], type = log.type ?? [], got = (id, layer) => regions.filter((r) => r.id === id && (!layer || r.layer === layer));
  const must = (ok, m) => { if (!ok) out.push(m); };
  const lift = spec.focus.targets.cargo.lift, glass = R.glass.rect, tagBox = [glass[0] + 8, glass[1], glass[2] - 16, glass[3]];
  for (const r of got("stage")) must(eq(r.rect, frame.regions.stage.rect), `stage ${r.rect} is not ${frame.regions.stage.rect}`);
  for (const r of got("bezel")) must(eq(r.rect, R.bezel.rect), `bezel ${r.rect} is not ${R.bezel.rect}`);
  for (const r of got("glass", "chrome")) must(eq(r.rect, glass), `glass ${r.rect} is not ${glass}`);
  for (const r of got("glass", "painted")) must(eq(r.rect, glass), `the glass master ${r.rect} is not ${glass}`);
  for (const id of ["resident", "bed"]) for (const r of got(id)) must(within(r.rect, glass), `${id} (${r.layer}) ${r.rect} leaves the glass ${glass}`);   // the residents and the bed are clipped to the glass
  for (const r of got("nameTag")) must(within(r.rect, tagBox), `the name tag (${r.layer}) ${r.rect} is not 8 px inside the glass ${glass}`);
  { const tag = got("nameTag", "chrome")[0], txt = got("nameTag", "type")[0]; if (tag && txt) must(within(txt.rect, tag.rect), `the name ${txt.rect} leaves its tag ${tag.rect}`); must(!!tag === /^resident\./.test(cur), `the name tag shows only on a resident (focus ${cur}, tag ${tag ? "drawn" : "absent"})`); }
  for (const r of got("knob")) must(within(r.rect, [R.knob.rect[0], R.knob.rect[1], R.knob.rect[2], R.knob.rect[3]]), `the knob ${r.rect} leaves ${R.knob.rect}`);
  for (const m of MODULES) {
    const M = R[m].rect, up = cur === m ? lift : 0, box = [M[0], M[1] - up, M[2], M[3] + up];
    const panel = got(m, "chrome"); must(panel.length === 1 && eq(panel[0].rect, [M[0], M[1] - up, M[2], M[3]]), `${m}'s panel ${panel[0]?.rect} is not ${[M[0], M[1] - up, M[2], M[3]]}`);
    for (const layer of ["art", "painted"]) for (const r of got(m, layer)) { const obj = [M[0] + R[m].objects[0], M[1] - up + R[m].objects[1], R[m].objects[2], R[m].objects[3]]; must(within(r.rect, obj) || within(r.rect, [obj[0], obj[1] - up, obj[2], obj[3]]), `${m}'s objects (${layer}) ${r.rect} leave their zone ${obj}`); }
    const w = got(m, "type")[0], zone = [M[0] + R[m].word[0], M[1] - up + R[m].word[1], R[m].objects[0] - R[m].word[0], 24]; must(!!w && within(w.rect, zone), `${m}'s word ${w?.rect} leaves its zone ${zone}`);
    must(within(panel[0]?.rect ?? [0, 0, 0, 0], box), `${m}'s panel leaves its box`);
  }
  for (const r of got("focus")) must(within(r.rect, frame.regions.stage.rect), `the ring ${r.rect} leaves the stage`);
  for (const t of type) if (![16, 20, 28].includes(t.px)) out.push(`"${t.text}" is set at ${t.px} px`);
  return out;
}
