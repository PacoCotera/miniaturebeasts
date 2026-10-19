// Check 1 for Home (lvgl-switch.md §4): every region the face's log says it drew, against the rectangle home.json (and frame.json for the ring's reach) gives it. `departures` returns the list of departures, empty when none.
// log: the face's `log` message { regions: [{ id, layer, rect }], type: [{ text, px, region, rect? }] }; spec: home.json; frame: frame.json; cur: the focus ("room" when none).
const within = (b, r) => b[0] >= r[0] && b[1] >= r[1] && b[0] + b[2] <= r[0] + r[2] && b[1] + b[3] <= r[1] + r[3];
const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
export const STATIONS = ["pods", "incubator", "companion", "bay"], BEZELS = ["vivarium", "library"], TARGETS = [...BEZELS, ...STATIONS];

export function departures(log, spec, frame, cur = "room") {
  const out = [], R = spec.regions, regions = log.regions ?? [], type = log.type ?? [], got = (id, layer) => regions.filter((r) => r.id === id && (!layer || r.layer === layer));
  const must = (ok, m) => { if (!ok) out.push(m); };
  for (const r of got("stage")) must(eq(r.rect, R.stage.rect), `stage ${r.rect} is not ${R.stage.rect}`);
  must(got("stage").length > 0, "the stage is not drawn");
  // the top bar: the shared picture 1:1 at the bar's rectangle (or its code panel), the words inside it
  for (const r of got("bar", "painted")) must(eq(r.rect, R.bar.rect), `the bar's picture ${r.rect} is not ${R.bar.rect}`);
  for (const r of got("bar")) must(within(r.rect, R.bar.rect), `the bar (${r.layer}) ${r.rect} leaves ${R.bar.rect}`);
  // the line: in its zone of the bar, wherever it is, and nowhere else
  for (const r of got("line")) must(within(r.rect, R.line.rect), `the line (${r.layer}) ${r.rect} leaves its zone ${R.line.rect}`);
  // the bezels: the panel is the bezel's rectangle; the window, the header's words and the expand mark are inside it, the words in the header
  for (const k of BEZELS) {
    const B = R[k].rect, H = [B[0], B[1], B[2], R.bezel.header];
    const chrome = got(k, "chrome"); must(chrome.length === 1 && eq(chrome[0].rect, B), `${k}'s panel ${chrome[0]?.rect} is not ${B}`);
    for (const r of got(k, "type")) must(within(r.rect, H), `${k}'s words ${r.rect} leave its header ${H}`);
    must(within(R[k].window, B), `${k}'s window leaves its bezel`);
  }
  { const c = got("console", "chrome"); must(c.length === 1 && eq(c[0].rect, R.console.rect), `the console ${c[0]?.rect} is not ${R.console.rect}`); }
  // the stations: everything of a station inside its rectangle; its lamp where the spec puts it; its words in the box left of the picture
  for (const k of STATIONS) {
    const S = R[k].rect, L = R.station.lamp, lamp = [S[0] + L[0], S[1] + L[1], L[2], L[3]];
    for (const r of regions.filter((x) => x.id === k)) must(within(r.rect, S), `${k} (${r.layer}) ${r.rect} leaves its station ${S}`);
    const chrome = got(k, "chrome"); must(chrome.length === 1 && eq(chrome[0].rect, S), `${k}'s panel ${chrome[0]?.rect} is not ${S}`);
    const art = got(k, "art"); must(art.length === 1 && eq(art[0].rect, lamp), `${k}'s lamp ${art[0]?.rect} is not ${lamp}`);
    // its picture (build spec 4.3, 11.4): right-aligned 8 in and vertically centred (the Bay's berths in line 1's row), the Probe's plates under line 1 on the left of the Companion's column
    const P = R[k].picture, pw = Array.isArray(P) ? P[0] : 3 * P.berth[0] + P.portrait[0] + 3 * P.gap, ph = Array.isArray(P) ? P[1] : P.berth[1], px = S[0] + S[2] - R.station.pictureInset - pw, py = Array.isArray(P) ? S[1] + Math.floor((S[3] - ph) / 2) : S[1] + P.top, pic = [px, py, pw, ph];
    for (const r of regions.filter((x) => x.id === k + ".picture")) must(within(r.rect, pic), `${k}'s picture (${r.layer}) ${r.rect} leaves its place ${pic}`);
    if (k === "incubator") for (const r of regions.filter((x) => x.id === "incubator.picture")) must(r.layer === "painted", `the capsule is drawn on the ${r.layer} layer, not painted`);
    if (k === "companion") { const pl = R.companion.plates, box = [S[0] + pl.at[0], S[1] + pl.at[1], pl.max * pl.size[0] + (pl.max - 1) * pl.gap, pl.size[1]]; for (const r of regions.filter((x) => x.id === "companion.plates")) must(within(r.rect, box), `the plates ${r.rect} leave their place ${box}`); }
  }
  for (const r of got("focus")) must(within(r.rect, [0, 0, 1024, 600]), `the ring ${r.rect} leaves the screen`);
  // the ring is the object as drawn grown by 5 (frame.json focus.ring.reach), on a target only; at rest none
  { const rings = got("focus"), reach = frame.focus.ring.reach;
    if (TARGETS.includes(cur)) { const b = R[cur].rect, want = [b[0] - reach, b[1] - reach, b[2] + 2 * reach, b[3] + 2 * reach]; must(rings.length === 1 && eq(rings[0].rect, want), `the ring ${rings[0]?.rect} is not ${want}: the object as drawn grown by ${reach}`); }
    else must(rings.length === 0, `a ring is drawn at rest: ${rings[0]?.rect}`); }
  for (const t of type) if (![16, 20, 28].includes(t.px)) out.push(`"${t.text}" is set at ${t.px} px`);
  return out;
}
