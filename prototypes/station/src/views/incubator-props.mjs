// The Incubator props (lvgl-switch.md §2.1, §4 R; incubator.json): pure selectors from the state, the screen's UI state and the presentation to the props of the face's Incubator words. Props name *what*, never *where*: the state, counts, asset
// ids, strings and flags; no rectangle, no measure, no layout rule, no colour (the words place everything from incubator.json). The output is plain JSON:
// { props (state, regions, focus), line (the bottom line, for the frame), requests (the pictures the host makes ready before the props) }.
// Runs in Node, tested there (tests/incubator-props.test.mjs); the shape is incubator.props.json.
//   m: { st, sv, settings, now, ui: { inc: { hatch } }, lamp: lampText of the newest mibi (host), spec incubator.json, pods pods.json }
import * as S from "../state.mjs";
import { frameOf, stampSizing, genomeDigest, codeText } from "../genome.mjs";
import { slot, maxTraits } from "./pods-props.mjs";
import { choosePod } from "../intents/incubator.mjs";

const fill = (t, o) => t.replace(/\{([^}]+)\}/g, (_, k) => (k in o ? o[k] : "{" + k + "}"));

// The chapters a bud knows, by id: a founder's bud clears its unread ones one at a time across the wait (state.budChapterKnown; a shut sealed chapter never), a cross bud only what it was born knowing; once it is ready a founder's knows every chapter but a shut sealed one.
export function knownChapters(st, B, settings, now) {
  const fr = frameOf(B.species);
  return fr.chapters.filter((c) => (B.read || []).includes(c.id) || (B.kind !== "cross" && S.budChapterKnown(st, c.id, settings, now))).map((c) => c.id);
}
// The leaves of the wait: total the bud's minutes (at most the spec's maximum), full the whole minutes passed, rows 0 to 19 of the current leaf (its 20 whole rows a minute: a row every 3 s at the real pace).
export function leavesOf(st, settings, now, max, rowsOf = 20) {
  const B = st.bud, total = Math.min(B.minutes, max), p = S.budProgress(st, settings, now), done = p * total, full = S.budReady(st, settings, now) ? total : Math.min(total, Math.floor(done));
  return { total, full, rows: full >= total ? 0 : Math.min(rowsOf - 1, Math.floor((done - full) * rowsOf)) };
}

export function incubatorBuild(m, spec, pods) {
  const { st, settings } = m, now = m.now ?? Date.now(), requests = [], req = (r) => { requests.push(r); return r.id; }, R = spec.regions, hatch = m.ui.inc.hatch ?? null;
  const ph = (id, size, hollow, until) => req({ kind: "ph", id, size, hollow, until });
  const stale = "its master (incubator.json placeholders)", B = st.bud, ready = !!B && S.budReady(st, settings, now);
  const state = hatch ? "hatch" : !B ? "empty" : ready ? "ready" : "growing";
  const regions = {};
  regions.bench = { room: [slot(req, R.bench.slice, R.bench.rect, "the Incubator stage master"), slot(req, R.bench.until, R.bench.rect, "the room master")] };

  // the bud being shown: the one in the chamber, or while the hatch plays the one that was opened (the rule has emptied the chamber)
  const species = hatch ? hatch.species : B?.species, fr = species ? frameOf(species) : null, kind = hatch ? hatch.kind : B?.kind, readIds = hatch ? hatch.read : B?.read;
  // the rail: a tab a chapter, read once the bud knows it (a founder's clears across the wait), its pips filled with it; a sealed chapter still shut shows unread
  if (fr) {
    const known = hatch ? fr.chapters.filter((c) => (readIds || []).includes(c.id) || (kind !== "cross" && !(c.sealed && !settings.sealedOpen))).map((c) => c.id) : knownChapters(st, B, settings, now);
    regions.rail = { focused: null, open: -1, star: req({ kind: "star", id: "star:12" }), tabs: fr.chapters.map((c) => {
      const isKnown = known.includes(c.id), n = Math.min(c.traits.length, maxTraits(pods.regions.chapter.page));
      return { id: c.id, word: c.legsTail ? c.name : c.name, state: isKnown ? "read" : "unread", pips: n, filled: isKnown ? n : 0, glint: false, emblem: req({ kind: "emblem", id: `emblem:${c.id}:${isKnown ? "read" : "unread"}:24`, chapter: c.id, state: isKnown ? "read" : "unread" }) };
    }) };
  }
  // the leaves (growing and ready): empty outlines, the full leaf, the filling one by its rows
  if (state === "growing" || state === "ready") {
    const L = leavesOf(st, settings, now, R.leaves.max, R.leaves.leaf[1]);
    regions.leaves = { total: L.total, full: L.full, rows: L.rows, empty: ph("leaf-empty-16x20", R.leaves.leaf, true, stale), filled: ph("leaf-full-16x20", R.leaves.leaf, false, stale) };
  }
  // the chamber: its back by state, the nest, the bud, the nest's front and the window's front (registered; what is drawn of them waits for the Station lead's ruling), the base with its plaque
  const back = state === "empty" ? "standby" : state === "growing" ? "growing" : "ready";
  regions.dome = { back: ph(`dome-inside-${back}-304x272`, R.dome.rect.slice(2), false, stale) };
  regions.nest = { picture: ph("nest-208x48", R.nest.rect.slice(2), false, stale) };
  regions.nestFront = { picture: ph("nest-front-208x48", R.nestFront.rect.slice(2), true, stale) };
  regions.domeFront = { picture: ph("incubator-dome-front-304x272", R.domeFront.rect.slice(2), true, stale) };
  if (state !== "empty") {
    const [bw, bh] = R.bud.rect.slice(2), p = B ? S.budProgress(st, settings, now) : 1, pic = (id) => ph(id, [bw, bh], false, stale);
    regions.bud = { stage: state === "hatch" ? "hatch" : ready ? "ready" : p < 0.5 ? "early" : "late", early: pic("bud-early-128x160"), late: pic("bud-late-128x160"), ready: pic("bud-ready-128x160"), readyFront: ph("bud-ready-front-128x160", [bw, bh], true, stale),
      crack1: pic("bud-crack-1-128x160"), crack2: pic("bud-crack-2-128x160"), shape: slot(req, `bud-shape-${species}-112x112`, R.bud.shape.rect, "the species' silhouette master") };
  }
  regions.base = { picture: ph("incubator-base-336x96", R.base.rect.slice(2), false, stale), plate: ph("incubator-plaque-128x32", R.base.plate.slice(2), false, stale) };
  regions.plaque = state === "hatch" ? "" : spec.strings.plaque[state];
  regions.lamp = state === "hatch" && (m.lamp === spec.strings.painting || m.lamp === spec.strings.offline) ? (m.lamp === spec.strings.offline ? "offline" : "waiting") : "";
  // the stamp of the chapters the bud knows, its code, and in the hatch the juvenile and its ribbon
  if (state !== "empty") {
    const known = hatch ? (regions.rail.tabs.filter((t) => t.state === "read").map((t) => t.id)) : knownChapters(st, B, settings, now), g = hatch ? m.mibiGenome : B.genome, sz = stampSizing(fr, g);
    regions.stamp = { size: sz.size, N: sz.N, cell: sz.cell, asset: req({ kind: "stamp", id: `stamp:${genomeDigest(g)}:${[...known].sort().join(",")}:${sz.size}`, species, read: known, size: sz.size, ...(hatch ? { mibi: hatch.mibi } : { bud: true }) }) };
    regions.code = codeText(hatch ? hatch.code : B.code);
  }
  if (state === "hatch") {
    const mb = S.mibiById ? S.mibiById(st, hatch.mibi) : st.mibis.find((x) => x.id === hatch.mibi), [jw, jh] = R.juvenile.rect.slice(2);
    regions.juvenile = { picture: req({ kind: "mibi", id: `mibi:${mb.id}:${jw}x${jh}`, mibi: mb.id, species, size: [jw, jh] }) };
    regions.ribbon = fill(spec.strings.hatchRibbon, { Name: mb.name, Species: S.cap(S.spName(mb)) });
  }

  // the bottom line (incubator.json bottomLine): Choose a pod, Grow now, Open; the context, the notice, ← Home
  const Sg = spec.strings; let line = { ok: null, back: Sg.back, subject: "", need: null };
  if (state === "empty") { line = { ok: choosePod({ st, settings }) !== null ? Sg.choose : null, back: Sg.back, subject: Sg.empty, need: S.bayFull(st, settings) ? Sg.noBay : null }; }
  else if (state === "growing" || state === "ready") {
    const subject = kind === "cross" ? fill(Sg.crossBud, { A: S.cap(B.parents?.[0]?.name ?? ""), B: S.cap(B.parents?.[1]?.name ?? "") }) : fill(Sg.bud, { "a/an": S.aAn(S.spName(B)).split(" ")[0], Species: S.cap(S.spName(B)) });
    const bud = kind === "cross" && B.parents?.length === 2 ? subject : S.cap(S.aAn(S.spName(B))) + " bud";
    if (state === "growing") {
      const c = S.instantGrowCost(st, settings, now), key = S.canPay(st, c.e, c.d, c.s) ? null : { short: S.shortIcons(st, c.e, c.d, c.s) };
      line = { ok: Sg.grow, price: S.priceText(c.e, c.d, c.s), back: Sg.back, subject: bud, need: null };
      if (key) { line.dim = true; line.short = key.short; line.need = fill(pods.strings.needMore, { icons: key.short }); }
    } else {
      const noBay = S.bayFull(st, settings);
      line = { ok: Sg.open, back: Sg.back, subject: bud, need: noBay ? Sg.noBay : null }; if (noBay) line.dim = true;   // a dimmed cap when no bay is free: a guard only
    }
  } else line = { ok: null, back: Sg.back, subject: regions.lamp === "offline" ? Sg.offline : regions.lamp === "waiting" ? Sg.painting : "", need: null };
  const props = { state, regions, focus: { cur: "room", targets: [] } };
  return { props, line, requests };
}
