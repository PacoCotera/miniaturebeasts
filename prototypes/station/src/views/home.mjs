// The Home view: pure selectors from the state, the focus and the presentation (the residents' walk, the arrival) to the
// props of each region, the focus targets, the bottom line and the pictures it asks for (technical-architecture.md §5.1,
// §5.2). No canvas, no keys; coordinates come from the spec file (specs/station/home.json) and the presentation's
// 0..1 walk positions. The output is plain JSON; it runs in Node and is tested there.
import * as S from "../state.mjs";
import { repeat } from "../../../ui/layout.mjs";

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const PLACE_KEYS = ["meadow", "pond", "rock", "wood", "cave"];
const shell = (g) => (PLACE_KEYS.includes(g) ? g : "rock");
const add = (r, o) => [r[0] + o[0], r[1] + o[1], o[2], o[3]];

// m: { st, settings, docked, crates: [crate], residents: [{ id, name, species, stage, u, v, face, dy, painted, sha, lamp }], withName, tier, probe, focus, present: { arrival, report, restAt } }
// arrival: { i, k, plays: [{ c, ids }] } | null; report: { lines: [string], tot: { e, d, s }, top, mend, world } | null
export function homeView(m, spec, ctx) {
  const { st, settings, docked, crates } = m, R = spec.regions, C = spec.colours, requests = [], focus = m.focus ?? null, arr = m.present?.arrival ?? null;
  const req = (r) => { requests.push(r); return r.id; }, icon = (name) => req({ kind: "icon", id: `icon:${name}:16`, name, px: 16 });
  const nd = S.need(st, m.sv ?? null, settings, m.ui ?? {});
  const view = { requests, line: null, targets: [] }, shellSpecies = (p) => (st.knownIds.includes(S.speciesOf(p)) ? S.speciesOf(p) : null);

  // ---- the residents, standing on the ground band, nearer ones in front
  const [gx, , gw] = R.glass.rect, band = R.glass.ground, resRect = [];
  const residents = m.residents.map((r) => {
    const [w, h] = r.stage === "juvenile" ? R.resident.juvenile : R.resident.adult, feet = band[1] + Math.round(r.v * band[3]), x = gx + Math.round(r.u * (gw - w));
    const focused = focus === "r:" + r.id, lift = focused ? R.resident.lift : 0, y = feet - h + (r.dy || 0) - lift, flip = r.face < 0;
    const asset = req({ kind: "resident", id: `res:${r.id}:${w}x${h}:${r.painted ? "p" + r.sha : "h"}:${flip ? "l" : "r"}`, mibi: r.id, w, h, flip, painted: !!r.painted });
    const lamp = r.lamp ? req({ kind: "lamp", id: "lamp:waiting", fill: C.waitingLamp.fill, rim: C.waitingLamp.rim }) : null;
    resRect.push({ id: "r:" + r.id, feet, box: [x, feet - h, w, h] });
    return { id: "r" + r.id, rect: [x, y, w, h], asset, lamp, feet, name: r.name, species: r.species, stage: r.stage };
  }).sort((a, b) => a.feet - b.feet);
  const withM = m.withName ?? null;
  view.window = { colours: { bezel: C.bezel, glass: C.glass },
    residents: residents.map(({ id, rect, asset, lamp }) => ({ id, rect, asset, lamp })),
    bed: { asset: req({ kind: "bed", id: "bed:128x56", col: C.bed }), mark: withM ? { asset: req({ kind: "compMark", id: `compmark:${docked ? "asleep" : "away"}`, docked, col: C.bed }), size: docked ? [24, 16] : R.bed.mark } : null },
    knob: req({ kind: "knob", id: "knob:32x8", col: C.knob }) };

  // ---- the four modules
  const needs = { bay: nd.act === "bay", rack: nd.act === "pods", incubator: nd.act === "inc", probe: false };
  const inUse = { bay: docked && crates.length > 0, rack: st.tray.length > 0, incubator: !!st.bud, probe: !!(docked && st.probe) };
  const lamp = (key) => { const state = needs[key] ? "needsYou" : inUse[key] ? "well" : "off"; return req({ kind: "lamp", id: `lamp:${state}`, fill: C.lamp[state], rim: C.lamp.rim }); };
  const modules = {}, mod = (key, items) => (modules[key] = { word: spec.strings.modules[key], lamp: lamp(key), lift: key === "bay" && arr ? R.bay.lift : 0, items });
  // Bay: the door, then the crates it holds (one per consignment; while the bays open, the ones already opened)
  {
    const B = R.bay, base = B.rect, door = add(base, B.door), beamOn = arr && arr.k > 0.25 && arr.k < 0.45 ? arr.i : -1;
    const items = [{ id: "door", rect: door, asset: req({ kind: "door", id: `door:${docked || arr ? "open" : "shut"}:${beamOn}`, open: !!(docked || arr), beam: beamOn, col: C.bay }) }];
    const list = arr ? arr.plays.map((p) => p.c) : docked ? crates : [];
    list.slice(0, B.max).forEach((c, i) => {
      const opened = arr && i < arr.i;
      items.push({ id: "crate" + i, rect: [door[0] + B.crateAt[0] + i * B.pitch, door[1] + B.crateAt[1], B.crate[0], B.crate[1]], asset: req({ kind: "crate", id: `crate:${opened ? "open" : "sealed"}`, open: !!opened, col: C.bay }) });
    });
    mod("bay", items);
  }
  // Rack: six wells with their pods, a glint star above a well that has one
  {
    const Rk = R.rack, w = Rk.wells, items = [], rack = settings.rack || S.RACK, hidden = new Set(arr ? hiddenPods(arr) : []);
    for (let i = 0; i < w.slots; i++) {
      const slot = repeat(add(Rk.rect, [w.at[0], w.at[1], w.size[0], w.size[1]]), i, w.pitch);
      items.push({ id: "well" + i, rect: slot, asset: req({ kind: "wellslot", id: i < rack ? "wellslot:open" : "wellslot:shut", open: i < rack, col: C.rack }) });
      const p = st.tray[i];
      if (p && i < rack && !hidden.has(p.id)) {
        const species = shellSpecies(p);
        items.push({ id: "pod" + i, rect: [slot[0] + Rk.pod.at[0], slot[1] + Rk.pod.at[1], 32, 40], asset: req({ kind: "pod", id: `pod:${species ?? "-"}:${p.idd ? "i" : "s"}:32x40`, species, state: p.idd ? "identified" : "sealed", size: [32, 40] }) });
        if (S.podGlints(st, p)) items.push({ id: "star" + i, rect: [slot[0] + Rk.starAt[0], slot[1] + Rk.starAt[1], Rk.star[0], Rk.star[1]], asset: req({ kind: "glint", id: "glint:12", col: C.rack }) });
      }
    }
    if (arr) for (const f of flights(arr, R, st, shellSpecies)) items.push({ id: "fly" + f.id, rect: f.rect, asset: req({ kind: "pod", id: `pod:${f.species ?? "-"}:s:32x40`, species: f.species, state: "sealed", size: [32, 40] }) });
    mod("rack", items);
  }
  // Incubator: the dome (empty, a bud growing in two stages, ready) and one leaf per minute of the bud, each filling in four steps
  {
    const I = R.incubator, B = st.bud, ready = S.budReady(st, settings), p = B ? S.budProgress(st, settings) : 0, stage = !B ? "empty" : ready ? "ready" : p < 0.5 ? "bud0" : "bud1";
    const items = [{ id: "dome", rect: add(I.rect, I.dome), asset: req({ kind: "dome", id: `dome:${stage}`, stage, col: C.incubator }) }];
    if (B) {
      const L = I.leaves, n = Math.min(B.minutes, L.rows * L.perRow), [lx, ly] = [I.rect[0] + L.at[0], I.rect[1] + L.at[1]];
      for (let i = 0; i < n; i++) { const step = Math.round(clamp(p * n - i, 0, 1) * 3), row = Math.floor(i / L.perRow), col = i % L.perRow; items.push({ id: "leaf" + i, rect: [lx + col * L.pitch, ly + row * L.rowPitch, L.leaf[0], L.leaf[1]], asset: req({ kind: "leaf", id: `leaf:${step}`, step, col: C.incubator }) }); }
    }
    mod("incubator", items);
  }
  // Probe: in its cradle (or its ghost while it is away), its Shield plates, the sitting slot
  {
    const P = R.probe, pr = docked && st.probe ? st.probe : null, items = [{ id: "probe", rect: add(P.rect, P.cradle), asset: req({ kind: "probe", id: `probe:${pr ? "in" : "away"}`, present: !!pr, col: C.probe }) }];
    const n = Math.min(P.shields.count, pr ? pr.smax : S.TIER[S.tierNow(st, m.sv)].shield), sh = pr ? pr.shield : -1, flash = !!m.present?.mendFlash;
    for (let i = 0; i < n; i++) items.push({ id: "plate" + i, rect: [P.rect[0] + P.shields.at[0] + i * P.shields.pitch, P.rect[1] + P.shields.at[1], P.shields.size[0], P.shields.size[1]], asset: req({ kind: "plate", id: `plate:${sh < 0 ? "none" : i < sh ? (flash ? "flash" : "full") : "lost"}`, state: sh < 0 ? "none" : i < sh ? (flash ? "flash" : "full") : "lost", col: C.probe }) });
    items.push({ id: "slot", rect: add(P.rect, P.slot), asset: req({ kind: "slot", id: `slot:${st.sitting ? "held" : "empty"}`, held: !!st.sitting, col: C.probe }) });
    mod("probe", items);
  }
  view.modules = modules; view.moduleColours = C.module;

  // ---- the arrival's ribbon and the report card
  view.ribbon = arr ? { text: (arr.plays[arr.i].c.dev ? "Developer crate " : "Expedition ") + arr.plays[arr.i].c.n + " home · " + S.plural((arr.plays[arr.i].c.pods || []).length, "pod") + (arr.plays[arr.i].c.of ? " · explored " + arr.plays[arr.i].c.explored + " of " + arr.plays[arr.i].c.of : ""), colours: { fill: C.ribbon.fill, edge: C.ribbon.edge, text: C.ribbon.text } } : null;
  view.report = !arr && m.present?.report ? reportData(m.present.report, m, spec, icon) : null;

  // ---- the focus targets: each resident's ring box, the modules, the rest knob
  const t = [];
  for (const r of resRect) { const ring = R.resident.focus; t.push({ id: r.id, group: "resident", rect: [r.box[0], r.box[1], r.box[2], r.box[3] + ring.top + ring.height / 2 - 0], shape: "ellipse", feet: r.feet }); }
  for (const key of ["bay", "rack", "incubator", "probe"]) t.push({ id: key, group: "module", rect: R[key].rect.slice(), shape: "round" });
  const K = R.knob, [kw, kh] = K.target; t.push({ id: "knob", group: "knob", rect: [K.rect[0] + K.rect[2] / 2 - kw / 2, K.rect[1] + K.rect[3] / 2 - kh / 2, kw, kh], shape: "round" });
  view.targets = t;
  view.arriving = !!arr;
  view.line = lineOf(m, spec, nd, residents, arr);
  return view;
}

// The pods the arrival has not yet landed in the rack, and the ones in flight (a hop from the opened crate to their well).
function hiddenPods(arr) { const out = []; arr.plays.forEach((p, j) => { if (j > arr.i || (j === arr.i && arr.k < 0.9)) out.push(...p.ids); }); return out; }
function flights(arr, R, st, shellSpecies) {
  const p = arr.plays[arr.i]; if (!p || arr.k < 0.4 || arr.k >= 0.9) return [];
  const B = R.bay, door = add(B.rect, B.door), w = R.rack.wells, out = [];
  p.ids.forEach((id, j) => {
    const pod = st.tray.find((q) => q.id === id); if (!pod) return;
    const ci = st.tray.indexOf(pod), f = clamp((arr.k - 0.4 - j * 0.08) / 0.35, 0, 1);
    const sx = door[0] + B.crateAt[0] + arr.i * B.pitch + 24, sy = door[1] + B.crateAt[1], slot = repeat(add(R.rack.rect, [w.at[0], w.at[1], w.size[0], w.size[1]]), ci, w.pitch), ex = slot[0] + R.rack.pod.at[0], ey = slot[1] + R.rack.pod.at[1];
    out.push({ id, species: shellSpecies(pod), rect: [Math.round(sx + (ex - sx) * f), Math.round(sy + (ey - sy) * f - Math.sin(f * Math.PI) * 30), 32, 40] });
  });
  return out;
}
// The report card's data: what each crate brought and how far its land is explored, what was gathered, the Probe's mend, the world's lines.
function reportData(r, m, spec, icon) {
  const R = spec.regions;
  return { colours: spec.colours.report, strings: spec.strings.report, layout: R.report, crates: r.crates, gathered: r.gathered, probe: r.probe, world: r.world,
    assets: { pod: icon("pod"), shield: icon("shield"), shieldGone: icon("shieldGone"), energy: "icon:energy:16", data: "icon:data:16", essence: "icon:essence:16" } };
}
// The bottom line: what ✓ does with the focus, where ← goes, the subject, what needs you (station-layouts.md, Home §6).
function lineOf(m, spec, nd, residents, arr) {
  const f = m.focus ?? null, st = m.st, docked = m.docked;
  if (arr) return { subject: "the bay opens", need: "" };
  if (f == null) return { ok: nd.act ? nd.label : "", back: "", subject: "the room", need: nd.text };
  if (f === "knob") return { ok: spec.strings.rest, back: "room", subject: "the rest knob", need: nd.text };
  if (f.startsWith("r:")) { const r = residents.find((q) => "r:" + q.id.slice(1) === f); return r ? { ok: "Look at " + r.name, back: "room", subject: r.name + " · " + r.species + " · " + r.stage, need: nd.text } : { back: "room" }; }
  if (f === "bay") { const n = m.crates.length; if (docked && n) return { ok: "Open the bay", price: S.plural(n, "crate"), back: "room", subject: S.plural(n, "sealed crate") }; return { back: "room", subject: docked ? "the bay is empty" : spec.strings.bayClosed, need: nd.text }; }
  if (f === "rack") return { ok: "Look at the pods", back: "room", subject: st.tray.length ? S.plural(st.tray.length, "pod") + " in the rack" : "the rack is empty", need: nd.text };
  if (f === "incubator") { const ready = S.budReady(st, m.settings); return { ok: ready ? "Open the incubator" : "Look at the incubator", back: "room", subject: st.bud ? S.spName(st.bud) + " bud · " + (ready ? "ready" : "growing") : "the incubator is empty", need: nd.text }; }
  if (f === "probe") { const pr = docked && st.probe; return { ok: "Open the Probe bench", back: "room", subject: pr ? "Probe · " + pr.shield + " of " + pr.smax + " plates" : "the Probe is away", need: nd.text }; }
  return { back: "room" };
}
