// The Incubator props (lvgl-switch.md §2.1, §4 R; incubator.json): pure selectors from the state, the screen's UI state and the presentation to the props of the face's Incubator words. Props name *what*, never *where*: the state, counts, asset
// ids, strings and flags; no rectangle, no measure, no layout rule, no colour (the words place everything from incubator.json). The output is plain JSON:
// { props (state, regions, focus), line (the bottom line, for the frame), requests (the pictures the host makes ready before the props) }.
// Runs in Node, tested there (tests/incubator-props.test.mjs); the shape is incubator.props.json.
//   m: { st, sv, settings, now, ui: { inc: { hatch } }, spec incubator.json, pods pods.json }
import * as S from "../state.mjs";
import { warnWords } from "./goal-words.mjs";
import { frameOf, stampSizing, genomeDigest, codeText } from "../genome.mjs";
import { slot, maxTraits } from "./pods-props.mjs";
import { choosePod } from "../intents/incubator.mjs";
import { mibiReq } from "./home-props.mjs";

const fill = (t, o) => t.replace(/\{([^}]+)\}/g, (_, k) => (k in o ? o[k] : "{" + k + "}"));

// The chapters a bud knows, by id: a founder's bud clears its unread ones one at a time across the wait (state.budChapterKnown; a shut sealed chapter never), a cross bud only what it was born knowing; once it is ready a founder's knows every chapter but a shut sealed one.
export function knownChapters(st, B, settings, now) {
  const fr = frameOf(B.species);
  return fr.chapters.filter((c) => (B.read || []).includes(c.id) || (B.kind !== "cross" && S.budChapterKnown(st, c.id, settings, now))).map((c) => c.id);
}
export function incubatorBuild(m, spec, pods) {
  const { st, settings } = m, now = m.now ?? Date.now(), requests = [], req = (r) => { requests.push(r); return r.id; }, R = spec.regions, hatch = m.ui.inc.hatch ?? null;
  const ph = (id, size, hollow, until) => req({ kind: "ph", id, size, hollow, until });
  const stale = "its master (incubator.json placeholders)", signed = "signed (art director)", B = st.bud, gs = !hatch && B && m.ui.inc.grow && now < m.ui.inc.grow.until ? m.ui.inc.grow : null;   // gs: growNow is playing: the screen shows the bud as it was (the leaves, the tabs, the stamp, the line) until the event ends, then the ready state on one refresh
  const ready = !!B && !gs && S.budReady(st, settings, now);
  const mb = hatch ? S.mibiById(st, hatch.mibi) : null;   // the mibi that hatched, while the hatch plays
  const state = hatch ? "hatch" : !B ? "empty" : ready ? "ready" : "growing";
  const regions = {};
  regions.bench = { room: [slot(req, R.bench.slice, R.bench.rect, "the Incubator stage master (signed)")] };

  // the bud being shown: the one in the chamber, or while the hatch plays the one that was opened (the rule has emptied the chamber)
  const species = hatch ? hatch.species : B?.species, fr = species ? frameOf(species) : null, kind = hatch ? hatch.kind : B?.kind, readIds = hatch ? hatch.read : B?.read;
  // the rail: a tab a chapter, read once the bud knows it (a founder's clears across the wait), its pips filled with it; a sealed chapter still shut shows unread
  if (fr) {
    const known = hatch ? fr.chapters.filter((c) => (readIds || []).includes(c.id) || (kind !== "cross" && !(c.sealed && !settings.sealedOpen))).map((c) => c.id) : gs ? gs.known : knownChapters(st, B, settings, now);
    regions.rail = { focused: null, open: -1, star: req({ kind: "star", id: "star:12" }), tabs: fr.chapters.map((c) => {
      const isKnown = known.includes(c.id), n = Math.min(c.traits.length, maxTraits(pods.regions.chapter.page));
      return { id: c.id, word: c.name, state: isKnown ? "read" : "unread", pips: n, filled: isKnown ? n : 0, glint: false, emblem: req({ kind: "emblem", id: `emblem:${c.id}:${isKnown ? "read" : "unread"}:24`, chapter: c.id, state: isKnown ? "read" : "unread" }) };
    }) };
  }
  // the leaves (growing and ready): empty outlines, the full leaf, the filling one by its rows
  if (state !== "empty") {   // (the hatch: no leaf, the nodes stay)
    const L = state === "hatch" ? { total: 0, full: 0, rows: 0 } : gs ? gs.leaves : S.budLeaves(st, settings, now, R.leaves.max, R.leaves.leaf[1]);
    regions.leaves = { total: L.total, full: L.full, rows: L.rows, empty: slot(req, "leaf-empty-16x20", [0, 0, ...R.leaves.leaf], signed), filled: slot(req, "leaf-full-16x20", [0, 0, ...R.leaves.leaf], signed) };
  }
  // the chamber (signed masters): its back by state (standby, growing, ready; the hatch keeps ready), the nest and its front, the window's front over the nest and the bud; the base master carries the plaque plate and the foot light
  const back = state === "empty" ? "dome-inside-standby-304x272" : state === "growing" ? "dome-back-304x272" : "dome-inside-ready-304x272";
  regions.dome = { back: slot(req, back, R.dome.rect, signed) };
  regions.nestFront = { picture: slot(req, "nest-front-208x48", R.nestFront.rect, signed) };
  regions.domeFront = { picture: slot(req, "dome-front-304x272", R.domeFront.rect, signed) };
  regions.nest = { picture: slot(req, "nest-208x48", R.nest.rect, signed) };
  if (state !== "empty") {
    const [bw, bh] = R.bud.rect.slice(2), p = B ? S.budProgress(st, settings, now) : 1, pic = (id) => ph(id, [bw, bh], false, stale);
    regions.bud = { stage: state === "hatch" ? "hatch" : ready ? "ready" : p < 0.5 ? "early" : "late", early: pic("bud-early-128x160"), late: pic("bud-late-128x160"), ready: pic("bud-ready-128x160"),
      crack1: pic("bud-crack-1-128x160"), crack2: pic("bud-crack-2-128x160"), shape: slot(req, `bud-shape-${species}-112x112`, R.bud.shape.rect, "the species' silhouette master") };
  }
  regions.base = { picture: slot(req, "base-336x96", R.base.rect, signed) };
  regions.plaque = state === "hatch" ? "" : spec.strings.plaque[state];
  const waiting = (state === "hatch" || state === "ready") && (m.lamp === spec.strings.painting || m.lamp === spec.strings.offline);   // the base's waiting lamp, home-lamp-sky-12x12 1:1, steady, while the painting has not landed (no code-drawn fill)
  regions.lamp = { picture: slot(req, R.base.lamp.slice, R.base.lamp.rect, "the Home hand masters (home-lamp-sky-12x12)"), on: waiting, why: !waiting ? "" : m.lamp === spec.strings.offline ? "offline" : "waiting" };   // the lamp's node is there in every state
  // the stamp of the chapters the bud knows, its code, and in the hatch the juvenile and its ribbon
  if (state !== "empty") {
    const known = hatch ? mb.read : gs ? gs.known : knownChapters(st, B, settings, now), g = hatch ? mb.genome : B.genome, sz = stampSizing(fr, g);
    regions.stamp = { size: sz.size, N: sz.N, cell: sz.cell, asset: req({ kind: "stamp", id: `stamp:${genomeDigest(g)}:${[...known].sort().join(",")}:${sz.size}`, species, read: known, size: sz.size, ...(hatch ? { mibi: hatch.mibi } : { bud: true }) }) };
    regions.code = codeText(hatch ? hatch.code : B.code);
  }
  if (state === "hatch") {
    const [jw, jh] = R.juvenile.rect.slice(2);   // the stage the mibi has now is in the id: the meet draws the same picture
    regions.juvenile = { picture: mibiReq(req, st, mb, [jw, jh], settings) };
    regions.ribbon = fill(spec.strings.hatchRibbon, { Name: mb.name, Species: S.cap(S.spName(mb)) });
  }

  // the bottom line (incubator.json bottomLine): Choose a pod, Grow now, Open; the context, the notice, ← Home
  const Sg = spec.strings; let line = { ok: null, back: Sg.back, subject: "", need: null };
  if (state === "empty") { line = { ok: choosePod({ st, settings }) !== null ? Sg.choose : null, back: Sg.back, subject: Sg.empty, need: S.bayFull(st, settings) ? Sg.noBay : null }; }
  else if (state === "growing" || state === "ready") {
    const subject = kind === "cross" ? fill(Sg.crossBud, { A: S.cap(B.parents?.[0]?.name ?? ""), B: S.cap(B.parents?.[1]?.name ?? "") }) : fill(Sg.bud, { "a/an": S.aAn(S.spName(B)).split(" ")[0], Species: S.cap(S.spName(B)) });
    const bud = kind === "cross" && B.parents?.length === 2 ? subject : S.cap(S.aAn(S.spName(B))) + " bud";
    if (state === "growing") {
      const c = gs ? gs.cost : S.instantGrowCost(st, settings, now), key = S.canPay(st, c.e, c.d, c.s) || gs ? null : { short: S.shortIcons(st, c.e, c.d, c.s) };
      line = { ok: Sg.grow, price: S.priceText(c.e, c.d, c.s), back: Sg.back, subject: bud, need: gs ? gs.need : null };   // while growNow plays the notice is the one the bud had (the snapshot)
      if (key) { line.dim = true; line.short = key.short; line.need = fill(pods.strings.needMore, { icons: key.short }); }
      else if (!gs && m.frame) line.need = warnWords(st, m.sv, settings, m.frame, c, { key: "growNow" }) ?? line.need;
    } else {
      const noBay = S.bayFull(st, settings);
      line = { ok: Sg.open, back: Sg.back, subject: bud, need: noBay ? Sg.noBay : null }; if (noBay) line.dim = true;   // a dimmed cap when no bay is free: a guard only
    }
  } else line = { ok: null, back: Sg.back, subject: regions.lamp.why === "offline" ? Sg.offline : regions.lamp.why === "waiting" ? Sg.painting : "", need: null };
  const props = { state, regions, focus: { cur: "room", targets: [] } };
  return { props, line, requests };
}
