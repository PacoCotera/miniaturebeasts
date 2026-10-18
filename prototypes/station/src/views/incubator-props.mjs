// The Incubator props, the painted capsule (T-20261016-222; the UI/UX build spec; lvgl-switch.md §2.1, §4 R; incubator.json): pure selectors from the state, the screen's UI state and the presentation to the props of the face's Incubator words. Props name *what*, never *where*: the state, counts, asset
// ids, strings and flags; no rectangle, no measure, no layout rule, no colour (the words place everything from incubator.json). The output is plain JSON:
// { props (state, regions, focus), line (the bottom line, for the frame), requests (the pictures the host makes ready before the props) }.
// Runs in Node, tested there (tests/incubator-props.test.mjs); the shape is incubator.props.json.
//   m: { st, sv, settings, now, ui: { inc: { hatch } }, spec incubator.json, pods pods.json }
import * as S from "../state.mjs";
import { plateMasterReq, kPct } from "../stamplook.mjs";
import { warnWords } from "./goal-words.mjs";
import { frameOf, stampSizing, genomeDigest, codeText } from "../genome.mjs";
import { slot } from "./pods-props.mjs";
import { choosePod } from "../intents/incubator.mjs";
import { layers, relitPod, podArea, bgOf } from "./capsule-props.mjs";
import { mibiReq } from "./home-props.mjs";
import { RECIPE } from "../relight.mjs";

const fill = (t, o) => t.replace(/\{([^}]+)\}/g, (_, k) => (k in o ? o[k] : "{" + k + "}"));

// The chapters a bud knows, by id: a founder's bud clears its unread ones one at a time across the wait (state.budChapterKnown; a shut sealed chapter never), a cross bud only what it was born knowing; once it is ready a founder's knows every chapter but a shut sealed one.
export function knownChapters(st, B, settings, now) {
  const fr = frameOf(B.species);
  return fr.chapters.filter((c) => (B.read || []).includes(c.id) || (B.kind !== "cross" && S.budChapterKnown(st, c.id, settings, now))).map((c) => c.id);
}
// A relit juvenile: the new mibi's own juvenile stand (layered, from drawnLooks) at the incubator view's figure height (stand-sizes.json views.incubator), lit the same way. Returns { picture, size, anchor }.
// bg: the interior the blades come from, { id, size, at: its top left on the screen }; the juvenile's feet are on spec.regions.juvenile.foot.
export function relitJuvenile(req, st, mb, settings, spec, light = "day", interior = null) {
  const H = spec.regions.juvenile.height, species = S.speciesOf(mb);
  const src = mibiReq(req, st, mb, [304, 312], settings, light, "incubator"), area = podArea(H), id = `relit:${species ?? "-"}:${src}:${light}:${area.size.join("x")}:v${RECIPE}`;
  req({ kind: "relit", id, parts: [{ id: src }], figH: H, area: area.size, anchor: area.anchor, bg: interior && bgOf(interior, spec.regions.juvenile.foot, area.anchor) });
  return { picture: id, size: area.size, anchor: area.anchor };
}

export function incubatorBuild(m, spec, pods) {
  const { st, settings } = m, now = m.now ?? Date.now(), requests = [], req = (r) => { requests.push(r); return r.id; }, R = spec.regions, hatch = m.ui.inc.hatch ?? null;
  const signed = "signed (art director, the capsule masters list)", gs = !hatch && m.ui.inc.grow && now < m.ui.inc.grow.until ? m.ui.inc.grow : null, B = st.bud ?? gs?.bud ?? null;   // gs: Hatch now is playing (it has already hatched the bud, so gs.bud is the bud that was in the chamber): the screen shows the bud as it was until the event ends, then the hatch on one refresh
  const ready = !!B && !gs && S.budReady(st, settings, now);
  const mb = hatch ? S.mibiById(st, hatch.mibi) : null;   // the mibi that hatched, while the hatch plays
  const state = hatch ? "hatch" : !B ? "empty" : ready ? "ready" : "growing";
  const regions = {};
  regions.bench = {};
  const roomSize = R.capsule.rect.slice(2), RM = (n) => slot(req, n, R.room.rect, signed);
  regions.room = { day: RM(R.room.pictures.day), dusk: RM(R.room.pictures.dusk) };
  // the capsule: its layers (room view, 530 x 532 at (344, 26)); the glass is the host's, drawn in code along the interior's alpha
  const L = layers(req, roomSize, ["interior-day", "interior-dusk", "shell", "shell-dusk", "door-open", "bar-lit", "seal-ring", "glass-closed"]);
    const barPx = state === "growing" ? Math.max(1, Math.floor(R.capsule.bar.max * (gs ? gs.progress : S.budProgress(st, settings, now)))) : R.capsule.bar.max;   // from its first pixel (build spec 4.1: the bar from its first pixel), so the lit bar never pops off in the wait's first seconds
  regions.capsule = { interior: { day: L["interior-day"], dusk: L["interior-dusk"] }, shell: { day: L.shell, dusk: L["shell-dusk"] }, door: L["door-open"], bar: L["bar-lit"], seal: L["seal-ring"], glass: L["glass-closed"], barPx };
  // what stands inside: the bud's sealed pod (growing, ready, the hatch's beat), its cracks, the opened pod; the juvenile
  const species = hatch ? hatch.species : B?.species;
  if (state !== "empty") {
    const cv = { size: R.inside.rect.slice(2), anchor: R.inside.anchor }, at = R.capsule.rect, topLeft = [R.inside.foot[0] - cv.anchor[0], R.inside.foot[1] - cv.anchor[1]], h = R.capsule.podHeight;
    const bgOf2 = (light) => ({ id: L[light === "dusk" ? "interior-dusk" : "interior-day"], at: [at[0] - topLeft[0], at[1] - topLeft[1]] });
    const pod = (variant, light) => relitPod(req, { species, variant, light, h, area: cv, bg: bgOf2(light) });
    regions.inside = { pod: { day: pod("pod", "day"), dusk: state === "growing" ? pod("pod", "dusk") : "", crack: state === "hatch" ? pod("crack", "day") : "" }, opened: state === "hatch" ? pod("opened", "day") : "" };
  }
  // the stamp of the chapters the bud knows, its code, "ready in about {n} min"; in the hatch the juvenile and its ribbon
  const fr = species ? frameOf(species) : null, kind = hatch ? hatch.kind : B?.kind;
  if (state !== "empty") {
    const known = hatch ? mb.read : gs ? gs.known : knownChapters(st, B, settings, now), g = hatch ? mb.genome : B.genome, sz = stampSizing(fr, g), k = spec.colours.stampLabel.k;
    regions.stamp = { case: { back: slot(req, R.stampCase.slice, R.stampCase.rect, "the stamp case master"), front: slot(req, R.stampCaseFront.slice, R.stampCaseFront.rect, "the case's front glass") }, size: sz.size, N: sz.N, cell: sz.cell, plate: plateMasterReq(req), asset: req({ kind: "stamp", id: `stamp:${genomeDigest(g)}:${[...known].sort().join(",")}:${sz.size}:k${kPct(k)}`, species, read: known, size: sz.size, k, ...(hatch ? { mibi: hatch.mibi } : { bud: true }) }) };
    regions.code = codeText(hatch ? hatch.code : B.code);
  }
  if (state === "growing") regions.readyIn = fill(spec.strings.readyIn, { n: gs ? gs.left : S.budMinutesLeft(st, settings, now) });
  if (state === "hatch") {
    const interior = { id: L["interior-day"], size: roomSize, at: R.capsule.rect.slice(0, 2) };
    regions.juvenile = relitJuvenile(req, st, mb, settings, spec, "day", interior);
    regions.ribbon = fill(spec.strings.hatchRibbon, { Name: mb.name, Species: S.cap(S.spName(mb)) });
  }
  const waitingWhy = (state === "hatch" || state === "ready") && (m.lamp === "waiting" || m.lamp === "offline") ? m.lamp : "";   // the waiting painting, while the juvenile's painting has not landed

  // the bottom line (incubator.json bottomLine): Choose a pod, Hatch now, Open; the context, the notice, back Home
  const Sg = spec.strings; let line = { ok: null, back: Sg.back, subject: "", need: null };
  if (state === "empty") { line = { ok: choosePod({ st, settings }) !== null ? Sg.choose : null, back: Sg.back, subject: Sg.empty, need: S.bayFull(st, settings) ? Sg.noBay : null }; }
  else if (state === "growing" || state === "ready") {
    const subject = kind === "cross" ? fill(Sg.crossBud, { A: S.cap(B.parents?.[0]?.name ?? ""), B: S.cap(B.parents?.[1]?.name ?? "") }) : fill(Sg.bud, { "a/an": S.aAn(S.spName(B)).split(" ")[0], Species: S.cap(S.spName(B)) });
    const bud = kind === "cross" && B.parents?.length !== 2 ? fill(Sg.bud, { "a/an": S.aAn(S.spName(B)).split(" ")[0], Species: S.cap(S.spName(B)) }) : subject;
    if (state === "growing") {
      const c = gs ? gs.cost : S.instantGrowCost(st, settings, now), key = S.canPay(st, c.e, c.d, c.s) || gs ? null : { short: S.shortIcons(st, c.e, c.d, c.s) };
      line = { ok: Sg.grow, price: S.priceText(c.e, c.d, c.s), back: Sg.back, subject: bud, need: gs ? gs.need : null };   // the context is the bud; "ready in about {n} min" is the left wall's (regions.readyIn); while Hatch now plays the notice is the one the bud had (the snapshot)
      if (key) { line.dim = true; line.short = key.short; line.need = fill(pods.strings.needMore, { icons: key.short }); }
      else if (!gs && m.frame) line.need = warnWords(st, m.sv, settings, m.frame, c, { key: "growNow" }) ?? line.need;
    } else {
      const noBay = S.bayFull(st, settings);
      line = { ok: Sg.open, back: Sg.back, subject: bud, need: noBay ? Sg.noBay : null }; if (noBay) line.dim = true;   // a dimmed cap when no bay is free: a guard only
    }
  } else line = { ok: state === "hatch" && m.ui.skip ? Sg.skip : null, back: Sg.back, subject: waitingWhy === "offline" ? Sg.offline : waitingWhy === "waiting" ? Sg.painting : "", need: null };   // ✓ Skip only while the hatch's skippable hold runs (the host's ui.skip)
  const props = { state, regions, focus: { cur: "room", targets: [] } };
  return { props, line, requests };
}
