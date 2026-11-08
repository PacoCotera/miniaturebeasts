// The Cross screen as props (lvgl-switch.md §2.1; cross.json): pure selectors from the state, the Cross screen's UI (UI.cross) and the forecast to the props of the face's Cross words (screens/cross.c).
// Props name *what*, never where: the two parents and the child to be, and for the overview each chapter (open, unread or sealed) with the rows of its loci, for a chapter view the traits with their copies,
// gates and outcomes, the chapter rail and the focus target; no rectangle, no measure, no layout rule (the words place every module, wire, gate and plate from cross.json). A fraction along a catalogue is
// in ten-thousandths. The forecast is the one source: it shows only what the player has read, and a copy, look, seed or range of a chapter either parent has not read is never named here.
// The output is plain JSON: { props (state, regions, focus), line (the bottom line, for the frame), requests (the pictures), top }, and `nav` (not sent: the partners and the state count the intent needs).
//   m: { st, sv, settings, ui (UI.cross: { aId, bId, state, clash }), light }
import * as S from "../state.mjs";
import * as Lib from "../library.mjs";
import { frameOf } from "../genome.mjs";
import { fourSlots, traitLocusCount, chapterLocusCount } from "../splice.mjs";
import { fill } from "./words.mjs";
import { req } from "./requests.mjs";
import { mibiRequest, mibiVariantReq } from "./home-props.mjs";

const PORTRAIT = [48, 50], VIEW = "vivariumHouse";   // the kind's own 48 px stand (stand-sizes.json), placed 1:1 on the 48 x 48 head
const F4 = (v) => Math.round(v * 10000);
const sideWord = (S_, parents, chapterName, names) => (parents.length > 1 ? fill(S_.missingBoth, { chapter: chapterName }) : fill(S_.missingOne, { parent: names[0], chapter: chapterName }));

// A seed's fill: a pigment's chip colour (a pair split in two halves) when the look names pigments, else a grey by its place among the locus's looks.
function seedFills(label, order, C) {
  const chips = String(label).split(" and ").map((p) => C.pigmentChips[p]);
  if (chips.every(Boolean)) return chips;
  return [C.seedLookFills[Math.max(0, order.indexOf(label)) % C.seedLookFills.length]];
}
const lookOrder = (seeds) => [...new Set(seeds.map((s) => s.label))];

export function crossBuild(m, spec, pods) {
  const { st, sv, settings, ui } = m, Sg = spec.strings, C = spec.colours, R = spec.regions, requests = [], rq = req(requests, true);
  const a = S.mibiById(st, ui.aId), partners = a ? S.crossPartners(st, sv, a, settings) : [];
  if (!a) return null;
  const rec = partners.find((p) => p.id === ui.bId) ?? null, b = rec ? S.mibiById(st, rec.id) : null;   // the real mibi (a partner record is a copy marked away or family)
  const fc = b ? S.forecastOf(st, a, b, settings) : null, block = b ? S.crossBlock(st, sv, a, b, settings) : "", fr = frameOf(S.speciesOf(a));
  const wish = fc && b ? Lib.wishForecast(st, a, b, settings) : null, wishOf = (traitId) => wish?.pinned.find((p) => p.trait === traitId) ?? null;
  const away = { a: S.isAway(st, sv, a), b: !!b && (S.isAway(st, sv, b) || !!rec?.away) };
  const chapters = fc ? fc.chapters : [], at = Math.max(0, Math.min(ui.state ?? 0, chapters.length)), open = at === 0 ? null : chapters[at - 1], overview = at === 0;
  const glints = new Set(); for (const p of wish?.pinned ?? []) if (p.lit) { const ch = chapters.find((c) => c.traits.includes(p.trait)); if (ch) glints.add(ch.id); }

  // ---- the heads: the pick (right), the parent A (left), the child to be between them ----
  const portrait = (mb) => rq(mibiRequest(st, mb, PORTRAIT, settings, m.light ?? "day", VIEW));
  const head = (mb, isAway, isB) => {
    if (!mb) return { none: true, name: "", line: isB ? Sg.noPartner : "", away: false, picture: "" };
    const line = isAway ? Sg.away : isB ? (partners.length ? Sg.pick : Sg.noPartner) : S.spName(mb);
    const pic = portrait(mb);
    return { none: false, name: mb.name, line, away: !!isAway, picture: isAway ? mibiVariantReq(rq, requests.find((r) => r.id === pic), "dark") : pic };   // out with the Companion: the portrait dimmed (the dark variant)
  };
  const heads = { a: head(a, away.a, false), b: head(b, away.b, true), child: { words: Sg.child, ghost: "", kin: "" } };
  if (b) { const base = mibiRequest(st, a, PORTRAIT, settings, m.light ?? "day", VIEW); rq(base); heads.child.ghost = mibiVariantReq(rq, base, "ghost"); }
  if (fc) heads.child.kin = S.kinshipWord(fc.kinship);

  const regions = { heads };
  const K = fc ? fc.kinship : 0;
  if (fc && b) {
    if (overview) regions.overview = { chapters: chapters.map((c) => overviewChapter(c)) };
    else regions.chapter = chapterView(open);
  }
  if (fc && b && !overview) regions.rail = railOf();
  // the masters the state places 1:1 (the gates, ticks, glints, kin corner and finds of cross.json masters): named so the host has them on the face before the words draw
  if (fc && b) {
    const kinds = new Set(chapters.filter((c) => c.state === "sealed" && c.findKind).map((c) => c.findKind));
    regions.masters = overview ? ["cross-gate-switch-8x8", "cross-gate-blend-8x8", "cross-tick-a-6x4", "cross-tick-b-6x4", "cross-wish-lit-8x8", "cross-wish-hollow-8x8", ...[...kinds].map((k) => `find-${k}-16x16`)]
      : ["cross-gate-switch-16x16", "cross-gate-switch-16x16-settled", "cross-gate-blend-16x16", "cross-gate-blend-16x16-settled", "cross-tick-a-12x8", "cross-tick-b-12x8", "cross-wish-lit-12x12", "cross-wish-hollow-12x12", "cross-kin-surface-10x10", ...(open?.findKind ? [`find-${open.findKind}-112x112`] : [])];
  }

  // ---- the overview's chapters: open (one row a locus), unread (frost) or sealed (shut), in ring order ----
  function overviewChapter(c) {
    const lacks = { a: c.state === "unread" && c.lacking.some((l) => l.parent === "a"), b: c.state === "unread" && c.lacking.some((l) => l.parent === "b") };
    const out = { id: c.id, name: c.name, state: c.state, lacksA: lacks.a, lacksB: lacks.b, wish: "", wishRow: 0 };
    const traits = fc.traits.filter((t) => t.chapter === c.id), pins = (wish?.pinned ?? []).filter((p) => c.traits.includes(p.trait));
    if (c.state === "sealed") { out.rows = Array.from({ length: chapterLoci(c) }, () => ({ play: false })); out.find = c.findKind ?? ""; out.sealed = fill(Sg.sealedOverview, { opensWith: c.opensWith }); return out; }
    if (c.state === "unread") { out.rows = traits.flatMap((t) => Array.from({ length: lociIn(t) }, () => ({ play: false }))); out.need = sideWord(Sg, c.lacking.map((l) => l.parent), c.name, c.lacking.map((l) => l.name)); return out; }
    const rows = []; let wished = -1;
    for (const t of traits) for (const l of t.splice.loci) {
      const pin = wishOf(t.trait), lead = fr.chapters.flatMap((x) => x.traits).find((q) => q.id === t.trait)?.loci[0] === l.id;
      if (!l.play) { rows.push({ play: false }); continue; }
      const row = { play: true, kind: l.kind, hides: [...l.hides.a, ...l.hides.b] };
      if (l.kind === "switch") {
        const order = lookOrder(l.seeds);
        row.seeds = fourSlots(l.seeds).map((s, k) => ({ fill: seedFills(s.label, order, C), pin: !!(pin && lead && pin.kind === "switch" && pin.seeds.includes(k)), kin: K > 0 && s.hides != null }));
      } else {
        const [clo, chi] = l.catalogue, fr_ = (v) => F4((v - clo) / (chi - clo));
        row.range = [fr_(l.range[0]), fr_(l.range[1])]; row.parents = [fr_(l.parents[0]), fr_(l.parents[1])]; row.range0 = [fr_(l.range0[0]), fr_(l.range0[1])]; row.narrowed = F4(l.narrowed / (chi - clo));
      }
      if (pin && wished < 0) { wished = rows.length; out.wish = pin.lit ? "lit" : "hollow"; }
      rows.push(row);
    }
    if (wished < 0 && pins.length) { out.wish = pins[0].lit ? "lit" : "hollow"; wished = 0; }
    out.wishRow = Math.max(0, wished); out.rows = rows; return out;
  }
  // ---- a chapter view: the open chapter's traits (or its find, shut) ----
  function chapterView(c) {
    if (c.state === "sealed") return { name: c.name, sealed: true, find: c.findKind ?? "", opens: fill(Sg.sealedChapter, { opensWith: c.opensWith }), loci: chapterLoci(c), traits: [] };
    const traits = fc.traits.filter((t) => t.chapter === c.id).map((t) => {
      const pin = wishOf(t.trait), out = { id: t.trait, name: t.name, loci: lociIn(t), wish: pin ? (pin.lit ? "lit" : "hollow") : "" };
      if (t.kind === "missing") {
        out.missing = true; out.lacksA = t.missing.some((q) => q.parent === "a"); out.lacksB = t.missing.some((q) => q.parent === "b");
        out.need = sideWord(Sg, t.missing.map((q) => q.parent), t.missing[0].chapterName, t.missing.map((q) => q.name));
        out.a = t.known.a ? copies(t.known.a.words, t.known.a.hides) : []; out.b = t.known.b ? copies(t.known.b.words, t.known.b.hides) : [];
        return out;
      }
      const lead = t.splice.loci[0], settled = !t.splice.loci.some((l) => l.play), surface = K > 0 && t.kind === "switch" && t.seeds.some((s) => s.hides != null);
      Object.assign(out, { missing: false, kind: lead?.kind ?? "switch", settled, a: copies(t.splice.words.a, t.splice.hides.a), b: copies(t.splice.words.b, t.splice.hides.b), surface: surface ? Sg.surface : "" });
      const ends = t.splice.ends ?? (t.bins ? [t.bins[0], t.bins.at(-1)] : []);
      out.words = surface ? "" : t.kind === "switch" ? (t.firm ? Sg.firmSwitch : Sg.switch) : t.bins.length === 1 || ends[0] === ends[1] ? fill(Sg.firmBlend, { look: ends[0] }) : fill(Sg.blend, { low: ends[0], high: ends[1] });
      if (t.kind === "switch") {
        out.seeds = fourSlots(t.seeds).map((s, k) => ({ picture: seedPicture(t, s.copies, `${k}`), pin: !!(pin && pin.kind === "switch" && pin.seeds.includes(k)), kin: K > 0 && s.hides != null }));
      } else {
        const [clo, chi] = lead.catalogue, f = (v) => F4((v - clo) / (chi - clo));
        out.blend = { low: seedPicture(t, [t.range[0], t.range[0]], "lo"), high: t.bins.length > 1 ? seedPicture(t, [t.range[1], t.range[1]], "hi") : "", range: [f(t.range[0]), f(t.range[1])], parents: [f(t.parents[0]), f(t.parents[1])], range0: [f(lead.range0[0]), f(lead.range0[1])], narrowed: F4(lead.narrowed / (chi - clo)), one: t.bins.length <= 1 };
        if (pin && pin.kind === "blend") { /* a pinned look at an end: that picture's 2 px yellow edge (the forecast names the bins, not the ends: left unmarked) */ }
      }
      return out;
    });
    return { name: c.name, sealed: false, traits };
  }
  // a parent's two copies as the plates read them: the word, a pigment's chip colour, and whether the parent hides it
  function copies(words, hides) { return [0, 1].map((i) => ({ word: words[i] ?? "", chip: C.pigmentChips[words[i]] ?? "", hides: !!hides?.[i] })); }
  // a trait picture of the child's pairing, rendered at its size: the same locus pair on the first parent's genome (the sleeping loci as the pair carries them)
  function seedPicture(t, cp, tag) {
    const id = `xs:${a.id}:${b.id}:${t.trait}:${cp.join("|")}:64x32`;
    return rq({ kind: "crosspic", id, species: S.speciesOf(a), a: a.id, b: b.id, trait: t.trait, locus: t.locus, copies: cp, sleeping: t.sleeping ?? [], size: [64, 32], until: "the trait pictures rendered at their size", tag });
  }
  function lociIn(t) { return traitLocusCount(fr, t.trait); }
  function chapterLoci(c) { return chapterLocusCount(fr, c.id); }
  // the shared chapter rail: a tab is read when both parents have read the chapter, unread when either has not, sealed when it is sealed; the open tab is the chapter shown
  function railOf() {
    const star = rq({ kind: "star", id: "star:12" });
    return { open: at - 1, star, tabs: chapters.map((c) => { const state = c.state === "sealed" ? "sealed" : c.state === "open" ? "read" : "unread"; return { id: c.id, word: c.id === "legs-tail" ? (pods?.strings?.legsTail?.rail ?? c.name) : c.name, state, glint: glints.has(c.id), emblem: rq({ kind: "emblem", id: `emblem:${c.id}:${state}:24`, chapter: c.id, state }) }; }) };
  }

  // ---- the bottom line: ✓ Cross them · price | context | notice | ← {name} ----
  const cost = S.crossCost(settings), can = S.canPay(st, cost.e, cost.d, cost.s), species = S.cap(S.spName(a));
  const context = !b ? "" : overview ? fill(spec.bottomLine.context.overview, { a: a.name, b: b.name, species }) : fill(spec.bottomLine.context.chapter, { chapter: open.name, a: a.name, b: b.name });
  const first = fc?.firstMissing ? sideWord(Sg, fc.firstMissing.parents, fc.firstMissing.chapterName, fc.firstMissing.names) : null;
  const notice = !b ? Sg.noPartner : block ? block : first ?? (fc && fc.kinship > 0 ? S.kinshipWord(fc.kinship) : null);
  const line = !b || block ? { ok: null, subject: context, back: a.name, need: notice }
    : { ok: spec.bottomLine.verb, price: S.priceText(cost.e, cost.d, cost.s), ...(can ? {} : { dim: true, short: S.shortIcons(st, cost.e, cost.d, cost.s) }), subject: context, back: a.name, need: notice };
  const props = { state: overview || !fc || !b ? "overview" : "chapter", regions, focus: { cur: "partner", targets: [{ id: "partner", group: "partner" }] } };
  return { props, line, requests, nav: { a: a.id, b: b?.id ?? null, partners: partners.map((p) => p.id), last: chapters.length, state: at, block, can } };
}
