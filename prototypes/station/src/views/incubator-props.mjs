// The Incubator props (lvgl-switch.md §2.1, §4 R; incubator.json): pure selectors from the state, the screen's UI state and the presentation to the props of the face's Incubator words. Props name *what*, never *where*: the state, counts, asset
// ids, strings and flags; no rectangle, no measure, no layout rule, no colour (the words place everything from incubator.json). The output is plain JSON:
// { props (state, regions, focus), line (the bottom line, for the frame), requests (the pictures the host makes ready before the props) }.
// Runs in Node, tested there (tests/incubator-props.test.mjs); the shape is incubator.props.json.
//   m: { st, sv, settings, now, ui: { inc: { hatch, grow, f } }, spec incubator.json, pods pods.json }
// Option B, candling (specs/station-incubator-tabs-ruling.md): the ring of time with a cut for each chapter that will clear, the bud's own pod in its cradle lit from below with the founder's shadow in it, the slip and the just-cleared card.
import * as S from "../state.mjs";
import { plateMasterReq, kPct } from "../stamplook.mjs";
import { warnWords } from "./goal-words.mjs";
import { frameOf, stampSizing, genomeDigest, codeText, traitState } from "../genome.mjs";
import { slot } from "./pods-props.mjs";
import { inWords } from "./create-props.mjs";
import { choosePod } from "../intents/incubator.mjs";
import { mibiReq, movingProp } from "./home-props.mjs";

const fill = (t, o) => t.replace(/\{([^}]+)\}/g, (_, k) => (k in o ? o[k] : "{" + k + "}"));

// The chapters a bud knows, by id: a founder's bud clears its unread ones one at a time across the wait (state.budChapterKnown; a shut sealed chapter never), a cross bud only what it was born knowing; once it is ready a founder's knows every chapter but a shut sealed one.
export function knownChapters(st, B, settings, now) {
  const fr = frameOf(B.species);
  return fr.chapters.filter((c) => (B.read || []).includes(c.id) || (B.kind !== "cross" && S.budChapterKnown(st, c.id, settings, now))).map((c) => c.id);
}
// The step of the candling light (ruling §4): cool to a third of the wait, warm to two thirds, glowing after, ready when it is. One rule for the shadow and the pod's overlays.
export function lightStep(st, settings, now) { const p = S.budProgress(st, settings, now); return p >= 1 ? "ready" : p < 1 / 3 ? "cool" : p < 2 / 3 ? "warm" : "glowing"; }
// The pod's own shell and its candling light (ruling §4, T-20261016-28; the Incubator build, T-40, places them): the shell is the bud's species' identified pod at 224 × 272, the id Pods and Cargo draw for the same species and size (a cross bud has
// its species' shell too); the overlays are the signed masters cut over the shell (incubator-shell-cool, -warm, -glowing, -seams, -crack-1, -crack-2, 224 × 272 at the shell's own origin). The view names the stage; which overlay shows when is the word's:
// cool, warm or glowing by the step, glowing and the seams at ready, and in the hatch the crack-1 at 600 and the crack-2 at 800.
export const POD = [224, 272];
export function podReq(req, st, settings, now) {
  const B = st.bud, species = B.species, step = lightStep(st, settings, now), ov = (name) => req({ kind: "slot", id: `incubator-shell-${name}`, master: `incubator-shell-${name}`, size: POD, until: "the candling light's overlay master (art director, T-20261016-27)" });
  return { species, step, shell: req({ kind: "pod", id: `pod:${species}:i:${POD.join("x")}`, species, state: "identified", size: POD }),
    cool: ov("cool"), warm: ov("warm"), glowing: ov("glowing"), seams: ov("seams"), crack1: ov("crack-1"), crack2: ov("crack-2") };
}
// The founder's shadow's request (specs/face-arc-and-shadow.md §2; the Incubator build, T-40, calls it): the chapters known now (the bud's read and every chapter the wait has cleared), the step of the light (cool to a third of the wait, warm to two
// thirds, glowing after, ready when it is), and an id that changes only when one of them does, so a minute passing asks for nothing new. A cross's picture is the type specimen's ghost whatever it has cleared, but its id still follows the known chapters.
export function shadowReq(req, st, settings, now) {
  const B = st.bud, known = knownChapters(st, B, settings, now), step = lightStep(st, settings, now);
  return req({ kind: "shadow", id: `shadow:${B.sha.slice(0, 16)}:${[...known].sort().join(",")}:${step}:160x192`, species: B.species, read: [...known], step, cross: B.kind === "cross", size: [160, 192] });
}

const slug = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const RING_START = 228, RING_SWEEP = 264;
// The chapters a founder's wait will clear, in the order it clears them (U): the ones unread at Grow, a shut sealed chapter never; a crossed bud has none (its chapters read after the meeting).
export const toClear = (B, settings) => (B.kind === "cross" ? [] : frameOf(B.species).chapters.filter((c) => !(B.read || []).includes(c.id) && !S.shutSealed(c, settings)));
// The look of a chapter in words (the card's and the slip's line): the looks the founder shows in its traits, at most two, joined.
export function lookWords(fr, ch, genome) { return ch.traits.map((t) => traitState(fr, t, genome)).filter((x) => !x.doing && x.shows).slice(0, 2).map((x) => x.shows).join(", ") || ch.traits.map((t) => t.name).slice(0, 2).join(", "); }
// The minutes left on the bud, rounded to the nearest whole, at least 1 (the one minute count on the Station, owner ruling 3).
export const minutesLeft = (st, settings, now) => Math.max(1, Math.round(st.bud.minutes * (1 - S.budProgress(st, settings, now))));

export function incubatorBuild(m, spec, pods) {
  const { st, settings } = m, now = m.now ?? Date.now(), requests = [], req = (r) => { requests.push(r); return r.id; }, R = spec.regions, SG = spec.strings, hatch = m.ui.inc.hatch ?? null;
  const art = (id, size) => req({ kind: "slot", id: `${id}:${size.join("x")}`, master: id, size, until: "its master (art director, T-20261016-27)" });
  const gs = !hatch && st.bud && m.ui.inc.grow && now < m.ui.inc.grow.until ? m.ui.inc.grow : null;   // gs: growNow is playing: the screen shows the bud as it was (the cuts, the card, the slip, the stamp, the line) until the event ends, then the ready state on one refresh
  const B = hatch ? hatch.bud : st.bud, sv = hatch ? { ...st, bud: B } : st;   // the bud shown: the one in the cradle, or while the hatch plays the one that was opened (the rule has emptied the cradle; its snapshot is `hatch.bud`)
  const ready = !!B && !gs && (hatch ? true : S.budReady(st, settings, now));
  const mb = hatch ? S.mibiById(st, hatch.mibi) : null;   // the mibi that hatched, while the hatch plays
  const state = hatch ? "hatch" : !B ? "empty" : ready ? "ready" : "growing";
  const regions = {}, fr = B ? frameOf(B.species) : null, cross = B?.kind === "cross";
  regions.stage = { room: [slot(req, R.stage.slice, R.stage.rect, "the Incubator stage master (signed)")] };

  // the chapters this bud knows now, the chapters its wait will clear, and the step of the candling light
  const known = !B ? [] : hatch ? fr.chapters.filter((c) => (B.read || []).includes(c.id) || (!cross && !S.shutSealed(c, settings))).map((c) => c.id) : gs ? gs.known : knownChapters(st, B, settings, now);
  const U = B ? toClear(B, settings) : [], cleared = U.filter((c) => known.includes(c.id));
  const step = !B ? null : gs ? gs.step : hatch ? "ready" : lightStep(st, settings, now), light = step === "ready" ? "glowing" : step;
  const f = !B ? 0 : state === "ready" || hatch ? 1 : gs ? gs.f : S.budProgress(st, settings, now);

  // the ring of time: the fill's degrees (the face takes floor(264 · f)), the closed art at ready, a cut an emblem on the track for each chapter that will clear (none in the hatch: the ring goes)
  const emblem = (c, isRead) => req({ kind: "emblem", id: `emblem:${c.id}:${isRead ? "read" : "unread"}:24`, chapter: c.id, state: isRead ? "read" : "unread" });
  regions.ring = { fill: art("incubator-ring-fill", R.ring.rect.slice(2)), closedArt: art("incubator-ring-closed", R.ring.rect.slice(2)), f: state === "hatch" || state === "empty" ? 0 : Math.floor(f * 10000), closed: state === "ready",
    cuts: state === "hatch" || state === "empty" ? [] : U.map((c, k) => ({ chapter: c.id, at: (RING_START + Math.round((RING_SWEEP * (k + 1)) / (U.length + 1))) % 360, read: known.includes(c.id), emblem: emblem(c, known.includes(c.id)) })) };

  // the cradle (the candling light under it grows with the step; empty, the lamp at its first step) and its near lip over the pod's foot
  regions.cradle = { picture: art(state === "empty" ? "incubator-cradle-empty" : `incubator-cradle-${light}`, R.cradle.rect.slice(2)), front: state === "empty" ? "" : art(`incubator-cradle-front-${light}`, R.cradle.rect.slice(2)) };

  // the pod (its own shell, the species' at 224 × 272, and the light of its step) and the founder's shadow in it (from the chapters known): not drawn when the cradle is empty or after the hatch's 1000
  if (B) {
    const P = podReq(req, sv, settings, now); regions.pod = { species: P.species, step: state === "ready" || hatch ? "ready" : step, stage: hatch ? "hatch" : state, shell: P.shell, cool: P.cool, warm: P.warm, glowing: P.glowing, seams: P.seams, crack1: P.crack1, crack2: P.crack2 };
    regions.shadow = { asset: gs ? req({ kind: "shadow", id: `shadow:${B.sha.slice(0, 16)}:${[...known].sort().join(",")}:${step}:160x192`, species: B.species, read: [...known], step, cross, size: [160, 192] }) : shadowReq(req, sv, settings, now), step: state === "ready" || hatch ? "ready" : step };
    if (hatch) { const id = regions.shadow.asset; void id; }
  }

  // the slip: the species, how it was found (or laid at home), what the player changed, what the wait has cleared (newest first) and how many are still to come
  if (B && R.slip.drawn !== false) {   // the slip is not drawn (incubator.json regions.slip.drawn): the region stays empty until the machine's display replaces it
    const p = { g: B.from?.g, how: B.from?.how, idd: 1, species: B.species, sp: B.sp };
    const found = cross ? [fill(SG.slip.crossFound, { A: S.cap(B.parents?.[0]?.name ?? ""), B: S.cap(B.parents?.[1]?.name ?? "") })] : S.podOriginLines(p);
    const changes = cross ? [] : (Array.isArray(B.shaped) ? B.shaped : []).slice(0, R.slip.maxChanges).map((id) => { const t = fr.chapters.flatMap((c) => c.traits).find((x) => x.id === id); return t ? fill(SG.slip.trait, { Trait: t.name, look: traitState(fr, t, B.genome).shows }) : null; }).filter(Boolean);
    const lines = [...cleared].reverse().slice(0, R.slip.maxCleared).map((c) => fill(SG.slip.clearedLine, { Chapter: c.name, look: lookWords(fr, c, B.genome) })), left = U.length - cleared.length;
    regions.slip = { paper: art("slip-208x408", R.slip.rect.slice(2)), name: S.cap(S.spName(B)), found, changes, cleared: lines, toCome: !cross && left > 0 ? fill(SG.slip.toCome, { "n in words": inWords(left) }) : "", cross };
  }

  // the card (a founder with a chapter to clear, growing and ready): the chapter just cleared, else the next to clear (before the first clearing); the picture is the first trait's crop at 160 × 128, the emblem when none is placed
  let cardWords = "", card = null;
  if ((state === "growing" || state === "ready") && !cross && U.length) {
    const last = cleared.at(-1) ?? null, ch = last ?? U[0], t = last ? last.traits.find((x) => !x.doing && traitState(fr, x, B.genome).shows) ?? null : null, look = last ? lookWords(fr, last, B.genome) : "";
    card = { ground: art("incubator-card-ground", R.card.rect.slice(2)), id: ch.id, heading: last ? SG.card.just : SG.card.next, picture: t ? slot(req, `trait-${B.species}-${slug(t.name)}-${slug(traitState(fr, t, B.genome).shows)}-160x128`, [0, 0, ...R.card.picture.size], "the trait's crop master (160 × 128)") : "", chapter: ch.name, look, cleared: !!last, emblem: emblem(ch, false) };
    cardWords = last ? fill(SG.card.line, { Chapter: ch.name, look }) : fill(SG.card.nextLine, { Chapter: ch.name });
  }
  regions.card = card;

  // the stamp of the chapters the bud knows, its code, and in the hatch the juvenile and its ribbon
  if (state !== "empty") {
    const g = hatch ? mb.genome : B.genome, sz = stampSizing(fr, g), k = spec.colours.stampLabel.k, kn = hatch ? mb.read : known;
    regions.stamp = { size: sz.size, N: sz.N, cell: sz.cell, plate: plateMasterReq(req), asset: req({ kind: "stamp", id: `stamp:${genomeDigest(g)}:${[...kn].sort().join(",")}:${sz.size}:k${kPct(k)}`, species: B.species, read: kn, size: sz.size, k, ...(hatch ? { mibi: hatch.mibi } : { bud: true }) }) };
    regions.code = codeText(hatch ? hatch.code : B.code);
  }
  if (state === "hatch") {
    const [jw, jh] = R.juvenile.rect.slice(2);   // the stage the mibi has now is in the id: the meet draws the same picture
    regions.juvenile = { picture: mibiReq(req, st, mb, [jw, jh], settings) };
    { const mv = movingProp(mb, S.mibiStage(st, mb, settings), req, m, ["close", "closeShadow"]); if (mv) regions.juvenile.moving = { set: mv.set, close: mv.close, shadow: mv.closeShadow }; }   // the hatch's first motion (Station M1 §2.5) for a juvenile with a set
    regions.ribbon = fill(SG.hatchRibbon, { Name: mb.name, Species: S.cap(S.spName(mb)) });
  }

  // focus: the pod (initial) and the card, a card only while it is drawn; ◀ ▶ move between them
  const cur = m.ui.inc.f === "card" && card ? "card" : "pod";
  const targets = state === "growing" || state === "ready" ? [{ id: "pod", group: "pod" }, ...(card ? [{ id: "card", group: "card" }] : [])] : state === "empty" || state === "hatch" ? [] : [];

  // the bottom line (incubator.json bottomLine): Choose a pod, Grow now, Open; the context, the notice, ← Home
  let line = { ok: null, back: SG.back, subject: "", need: null };
  if (state === "empty") { line = { ok: choosePod({ st, settings }) !== null ? SG.choose : null, back: SG.back, subject: SG.empty, need: S.bayFull(st, settings) ? SG.noBay : null }; }
  else if (state === "growing" || state === "ready") {
    const bud = cross ? fill(SG.crossBud, { A: S.cap(B.parents?.[0]?.name ?? ""), B: S.cap(B.parents?.[1]?.name ?? "") }) : fill(SG.bud, { "a/an": S.aAn(S.spName(B)).split(" ")[0], Species: S.cap(S.spName(B)) });
    const subject = cur === "card" ? cardWords : state === "growing" && !cross ? fill(SG.readyIn, { n: gs ? gs.n : minutesLeft(st, settings, now) }) : bud;
    if (state === "growing") {
      const c = gs ? gs.cost : S.instantGrowCost(st, settings, now), key = S.canPay(st, c.e, c.d, c.s) || gs ? null : { short: S.shortIcons(st, c.e, c.d, c.s) };
      line = { ok: SG.grow, price: S.priceText(c.e, c.d, c.s), back: SG.back, subject, need: gs ? gs.need : null };   // while growNow plays the notice is the one the bud had (the snapshot)
      if (key) { line.dim = true; line.short = key.short; line.need = fill(pods.strings.needMore, { icons: key.short }); }
      else if (!gs && m.frame) line.need = warnWords(st, m.sv, settings, m.frame, c, { key: "growNow" }) ?? line.need;
    } else {
      const noBay = S.bayFull(st, settings);
      line = { ok: SG.open, back: SG.back, subject, need: noBay ? SG.noBay : null }; if (noBay) line.dim = true;   // a dimmed cap when no bay is free: a guard only
    }
  } else line = { ok: null, back: SG.back, subject: m.lamp === "offline" ? SG.offline : m.lamp === "waiting" ? SG.painting : "", need: null };
  const props = { state, regions, focus: { cur: targets.length ? cur : "room", targets } };
  return { props, line, requests };
}
