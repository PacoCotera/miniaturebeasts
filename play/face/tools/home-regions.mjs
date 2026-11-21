// Check 1 for Home (lvgl-switch.md §4): every region the face's log says it drew, against the rectangle home.json (and frame.json for the ring's reach) gives it. `departures` returns the list of departures, empty when none.
// log: the face's `log` message { regions: [{ id, layer, rect }], type: [{ text, px, region, rect? }] }; spec: home.json; frame: frame.json; cur: the focus ("room" when none).
const within = (b, r) => b[0] >= r[0] && b[1] >= r[1] && b[0] + b[2] <= r[0] + r[2] && b[1] + b[3] <= r[1] + r[3];
const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
export const STATIONS = ["pods", "incubator", "companion", "bay"], BEZELS = ["vivarium", "library"], TARGETS = [...BEZELS, ...STATIONS, "settings"];

// props: the Home props the log was drawn from (the Settings knob is drawn exactly when its target is listed: behind the developer setting realmSleep); without them the knob is held to its rectangle when drawn.
export function departures(log, spec, frame, cur = "room", props = null) {
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
  // the Library's window (build spec 4.2): its picture is the window 1:1, the shade, the glints and the captions inside it
  { const W = R.library.window, pic = got("library.window", "painted"); must(pic.length <= 1 && pic.every((r) => eq(r.rect, W)), `the Library's specimen ${pic[0]?.rect} is not the window ${W}`);
    for (const r of got("library.window")) must(within(r.rect, W), `the Library's window (${r.layer}) ${r.rect} leaves ${W}`);
    for (const r of got("library.window", "art")) must(r.rect[2] <= W[2] && r.rect[3] <= W[3], `the Library's glints ${r.rect}`); }
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
  // the Settings knob (regions.settings): one art-layer picture of exactly its rectangle, on every Home state
  { const k = got("settings"), want = props ? (props.focus?.targets ?? []).some((t) => t.id === "settings") : k.length > 0; must(k.length === (want ? 1 : 0) && k.every((r) => r.layer === "art" && eq(r.rect, R.settings.rect)), `the Settings knob ${k[0]?.rect ?? "not drawn"} is ${want ? "not " + R.settings.rect + " on the art layer" : "drawn without its target"}`); }
  for (const r of got("focus")) must(within(r.rect, [0, 0, 1024, 600]), `the ring ${r.rect} leaves the screen`);
  // the ring is the object as drawn grown by 5 (frame.json focus.ring.reach), on a target only; at rest none
  { const rings = got("focus"), reach = frame.focus.ring.reach;
    if (TARGETS.includes(cur)) { const b = R[cur].rect, want = [b[0] - reach, b[1] - reach, b[2] + 2 * reach, b[3] + 2 * reach]; must(rings.length === 1 && eq(rings[0].rect, want), `the ring ${rings[0]?.rect} is not ${want}: the object as drawn grown by ${reach}`); }
    else must(rings.length === 0, `a ring is drawn at rest: ${rings[0]?.rect}`); }
  for (const t of type) if (![16, 1016, 20, 28].includes(t.px)) out.push(`"${t.text}" is set at ${t.px} px`);
  return out;
}

// ---- Home on an upright phone (home.json "narrow", the host's `narrow` prop): the left 530 lp of the screen ----
// The spec read as the face reads it: each path of `spec.narrow` over the plain one (spec.h spec_variant), objects merged key by key, anything else replaced.
export function narrowSpec(spec) {
  const merge = (a, b) => (b && typeof b === "object" && !Array.isArray(b) && a && typeof a === "object" && !Array.isArray(a) ? Object.fromEntries([...new Set([...Object.keys(a), ...Object.keys(b)])].map((k) => [k, k in b ? merge(a[k], b[k]) : a[k]])) : b);
  const { narrow, ...rest } = spec; return merge(rest, narrow);
}
export const NARROW_W = 530, CUE_GAP = 6;
// turned: the window shows the Library (the ring on the Library, or the turn left from the ring's last stand); cur: the focus ("room" when none); props: the Home props the log was drawn from.
// What a narrow Home holds to: one window (the turned-away one is not drawn at all), the four cards 2 x 2 whole inside the 530 lp and the console, none over another, the title, the line and the clock in the bar and in view, the date and the place name
// not drawn, the Settings knob not drawn, the turn cue two plates the same size under the window with CUE_GAP lp clear of the window's ring and of the console, and the ring on the window or the card it is on.
export function narrowDepartures(log, spec0, frame, cur = "room", turned = false, props = null) {
  const out = [], spec = narrowSpec(spec0), R = spec.regions, regions = log.regions ?? [], type = log.type ?? [], got = (id, layer) => regions.filter((r) => r.id === id && (!layer || r.layer === layer));
  const must = (ok, m) => { if (!ok) out.push(m); };
  const shown = turned ? "library" : "vivarium", other = turned ? "vivarium" : "library", view = [0, 0, NARROW_W, 600];
  must(got("stage").length > 0, "the stage is not drawn");
  for (const r of got("bar")) must(within(r.rect, R.bar.rect), `the bar (${r.layer}) ${r.rect} leaves ${R.bar.rect}`);
  for (const r of got("line")) must(within(r.rect, R.line.rect) && within(r.rect, view), `the line (${r.layer}) ${r.rect} leaves its zone ${R.line.rect} or the ${NARROW_W} lp window`);
  must(R.line.rect[0] + R.line.rect[2] <= NARROW_W, "the line's zone leaves the window");
  const title = type.filter((t) => t.region === "bar" && t.text === spec.strings.titles.bar); must(title.length === 1 && title.every((t) => !t.rect || within(t.rect, view)), "the title is not in view");
  const clock = type.filter((t) => t.region === "bar" && t.px === 20 && t.text !== spec.strings.titles.bar); must(clock.length === 1 && clock.every((t) => !t.rect || within(t.rect, view)), "the clock is not in view");
  must(!type.some((t) => t.region === "bar" && t.px === 16 && /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) /.test(t.text)), "the date is drawn in the narrow bar");
  must(!type.some((t) => t.region === "bar" && t.text === props?.regions?.bar?.place && props?.regions?.bar?.place), "the place name is drawn in the narrow bar");
  { const B = R[shown].rect, H = [B[0], B[1], B[2], R.bezel.header], chrome = got(shown, "chrome");
    must(chrome.length === 1 && eq(chrome[0].rect, B), `${shown}'s panel ${chrome[0]?.rect} is not ${B}`);
    for (const r of got(shown, "type")) must(within(r.rect, H), `${shown}'s words ${r.rect} leave its header ${H}`);
    must(within(R[shown].window, B) && within(B, view), `${shown}'s window leaves its bezel or the ${NARROW_W} lp window`);
    must(regions.filter((r) => r.id === other || r.id.startsWith(other + ".")).length === 0, `${other} is drawn while the window shows ${shown}`); }
  if (turned) { const W = R.library.window; for (const r of got("library.window")) must(within(r.rect, W), `the Library's window (${r.layer}) ${r.rect} leaves ${W}`);
    for (const r of got("library.window", "painted")) must(within(r.rect, W) && r.rect[2] <= R.library.window[2], `the Library's specimen ${r.rect} leaves the window`); }
  { const c = got("console", "chrome"); must(c.length === 1 && eq(c[0].rect, R.console.rect) && within(c[0].rect, view), `the console ${c[0]?.rect} is not ${R.console.rect} inside the window`); }
  const cards = STATIONS.map((k) => R[k].rect);
  for (const k of STATIONS) {
    const S = R[k].rect, L = R.station.lamp, lamp = [S[0] + L[0], S[1] + L[1], L[2], L[3]];
    must(S[2] === 226 && S[3] === 98, `${k}'s card is ${S[2]} x ${S[3]}, not 226 x 98`);
    must(within(S, R.console.rect) && within(S, view), `${k}'s card ${S} is not whole inside the console and the ${NARROW_W} lp window`);
    for (const j of STATIONS) if (j < k) { const T = R[j].rect; must(S[0] >= T[0] + T[2] || T[0] >= S[0] + S[2] || S[1] >= T[1] + T[3] || T[1] >= S[1] + S[3], `the cards ${j} and ${k} overlap`); }
    for (const r of regions.filter((x) => x.id === k)) must(within(r.rect, S), `${k} (${r.layer}) ${r.rect} leaves its card ${S}`);
    const chrome = got(k, "chrome"); must(chrome.length === 1 && eq(chrome[0].rect, S), `${k}'s panel ${chrome[0]?.rect} is not ${S}`);
    const art = got(k, "art"); must(art.length === 1 && eq(art[0].rect, lamp), `${k}'s lamp ${art[0]?.rect} is not ${lamp}`);
  }
  must(cards.length === 4 && new Set(cards.map((c) => c[0])).size === 2 && new Set(cards.map((c) => c[1])).size === 2, "the cards are not 2 x 2");
  must(cards[1][0] - cards[0][0] === 238 && cards[2][1] - cards[0][1] === 110, "the cards' pitch is not 238 across and 110 down");
  { const c = R.console.rect; must(Math.abs(cards[0][0] - c[0] - (c[0] + c[2] - cards[1][0] - 226)) <= 1, "the cards are not centred in the console"); }
  must(got("settings").length === 0, "the Settings knob is drawn on the narrow Home");
  { const cue = regions.filter((r) => r.id.startsWith("cue")), ring = got("focus"), win = R[shown].rect, reach = frame.focus.ring.reach, con = R.console.rect;
    const plates = R.cue.rects, span = [plates[0][0], plates[0][1], plates[plates.length - 1][0] + plates[plates.length - 1][2] - plates[0][0], plates[0][3]];   // the face logs the two plates as one region, "cue"
    must(plates.length === 2 && plates.every((p) => p[2] === plates[0][2] && p[3] === plates[0][3] && p[1] === plates[0][1]), "the turn cue is not two plates of one size on one row");
    must(cue.length === 1 && eq(cue[0].rect, span), `the turn cue ${cue.map((r) => r.rect)} is not its two plates ${span}`);
    for (const r of cue) { must(r.rect[1] >= win[1] + win[3] + reach + CUE_GAP, `the cue ${r.rect} is under ${CUE_GAP} lp from the window's ring (reach ${reach})`); must(r.rect[1] + r.rect[3] + CUE_GAP <= con[1], `the cue ${r.rect} is under ${CUE_GAP} lp from the console`); must(within(r.rect, view), `the cue ${r.rect} leaves the window`); }
    if (TARGETS.includes(cur)) { const b = R[cur].rect, want = [b[0] - reach, b[1] - reach, b[2] + 2 * reach, b[3] + 2 * reach]; must(ring.length === 1 && eq(ring[0].rect, want), `the ring ${ring[0]?.rect} is not ${want}`); must(ring.every((r) => within(r.rect, view)), `the ring ${ring[0]?.rect} leaves the window`); }
    else must(ring.length === 0, `a ring is drawn at rest: ${ring[0]?.rect}`); }
  return out;
}
