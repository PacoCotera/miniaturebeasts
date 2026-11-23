// The pairing screen as props (station step 8-3; the accepted walk-4 picture 6 with the owner's 10:4x readout and kin line): the same `page` state the nursery uses. The stage is ONE picture (`pairing`, nursery-pictures.mjs)
// and the words over it are `page.scale.texts`, placed from pods.json regions.page.pair. Every number and sentence is the model's (pairing-model.mjs, from pairing.mjs and the engine); nothing is computed here.
//   ui.pair: { aId, bId } (the first pick, the second pick the pad changes), ui.from (where ← goes)
import * as S from "../state.mjs";
import * as N from "../nursery.mjs";
import { frameOf } from "../genome.mjs";
import { faceOf } from "./page-props.mjs";
import { coatOf, coatMaster, placedAt, MARKED_PICTURE } from "../stands.mjs";
import { drawnLooks } from "../looks.mjs";
import { CROPS } from "../trait-crops.mjs";
import { readout } from "../pairing-model.mjs";
import { fill } from "./words.mjs";

const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(16).padStart(8, "0"); };

// The readout lists "both aims together" FIRST, then each trait (lead 13:38, bus 8e6908): a player reading it picks the pair by its weaker trait.
// The partners the pad walks (the mibi's own pairable ones: at home, not family), in the Cross room's order.
export const partnersOf = (st, sv, a, settings) => S.crossPartners(st, sv, a, settings).filter((p) => !p.away && !p.family).map((p) => p.id);

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
// What a pick or an example young stands as (station step 8-5): the game's signed per-coat stand (mibi-adult-S01-<tint>-<shade>[-lay-<marking>]-96x88), by its genome with every chapter shown (the screen is about what the
// coat would look like, read or not); a kind with no such stand shows its face disc (the id is then the face, `disc` true) and is listed in `noStand` for the report.
const looksOf = (fr, mb) => drawnLooks(fr, { genome: mb.genome, read: fr.chapters.map((c) => c.id) });
export function standOf(sp, mb, fr) {
  const looks = looksOf(fr, mb), id = coatMaster(`mibi-adult-${sp}-96x88`, sp, coatOf(sp, looks));
  return placedAt(id, 96, 88) ? { id, disc: false, looks } : { id: faceOf(sp, mb, fr), disc: true, looks };
}

export function pairView(view, m, spec, req) {
  const { st, sv, settings, ui } = m, now = m.now || Date.now(), Z = spec.regions.page.pair, Sg = spec.strings.pairing, texts = [], x = ui.pair ?? {};
  const a = S.mibiById(st, x.aId); if (!a) return null;
  const partners = partnersOf(st, sv, a, settings), b = partners.includes(x.bId) ? S.mibiById(st, x.bId) : null;
  const R = readout(st, sv, spec, a, b, settings, now), text = (tx, X, base, role, align = "l", w) => { if (tx) texts.push({ text: tx, x: Math.round(X), ...(w ? { w } : {}), base: Math.round(base), role, align }); };
  const sp = S.speciesOf(a), fr = frameOf(sp), W = spec.regions.page.rect[2], T = Z.stand, noStand = [];
  text(Sg.title, Z.title.x, Z.title.baseline, Z.title.role);
  const stands = [], names = [], plates = [], N = Z.name;
  const side = (mb, f, fx) => { if (!mb) return; const st1 = standOf(sp, mb, fr); if (st1.disc) noStand.push(mb.id);
    stands.push({ id: st1.id, disc: st1.disc, x: fx, y: T.y, w: T.w, h: T.h, tag: null }); names.push([fx, N.baseline - N.up, N.w, N.h, N.radius]);
    text((mb === b && partners.length > 1 ? "◀ " : "") + S.cap(mb.name) + (mb === b && partners.length > 1 ? " ▶" : ""), fx, N.baseline, N.role, "c", N.w);
    // station step 8-6 (AD 14:28): the copies lines sit below the pill, a line apart, on a dark plate of their own (the pale backdrop gave them no contrast); "resting · n min" is the plate's first line
    const C = Z.copies, lines = [...(f.rest ? [f.rest] : []), ...f.counts.map((c, i) => `${i ? "eyes" : "marking"} ${c}`)], pitch = lines.length > 2 ? C.pitch - 1 : C.pitch;
    if (lines.length) plates.push([fx, N.baseline - N.up + N.h + C.plate.dy, N.w, C.plate.h + (lines.length > 2 ? 12 : 0), C.plate.radius]);
    lines.forEach((tx, i) => text(tx, fx, C.baseline + i * pitch, C.role, "c", N.w)); };   // one line a trait, under the name
  side(a, R.a, T.ax);
  if (b) side(b, R.b, T.bx);
  text(Sg.plus, Z.plus.cx, Z.plus.baseline, Z.plus.role, "c", 40);
  const kinHead = b ? (R.raw ? S.kinshipWord(S.kinshipOf(st, a, b)) : "") : "";
  if (b && kinHead) text(kinHead, Z.kin.cx - Z.kin.w / 2, Z.kin.baseline, Z.kin.role, "c", Z.kin.w);
  // the four examples (standing, grown, the ones new to you tagged), and where the young can land: the tint and shade bars with the parents' marks, the marking cards with their new tags (green)
  const bars = [], cards = [];
  if (b) {
    const ex = S.exampleYoung(st, a, b), Y = Z.young, Ld = Z.land, B = Ld.bar, Cd = Ld.cards;
    ex.forEach((q, i) => { const tg = N_know(q, st), s1 = standOf(sp, q, fr); if (s1.disc) noStand.push("example " + (i + 1));
      const X0 = Y.xs[i], tagBox = tg ? [X0 + Math.round((Y.w - Y.tag.w) / 2), Y.y + Y.tag.dy, Y.tag.w, Y.tag.h] : null;
      stands.push({ id: s1.id, disc: s1.disc, x: X0, y: Y.y, w: Y.w, h: Y.h, tag: tagBox });
      if (tg) text(spec.strings.nursery.newToYou, tagBox[0], tagBox[1] + Y.tag.baseline, Y.tag.role, "c", Y.tag.w); });
    text(Sg.young, Y.head.x, Y.head.baseline, Y.head.role);
    text(Sg.land, Ld.head.x, Ld.head.baseline, Ld.head.role);
    const pos = (v) => B.x + clamp(v, 0, 1) * B.w, faceA = faceOf(sp, a, fr), faceB = faceOf(sp, b, fr);
    B.rows.forEach((row) => { const L = R.land?.[row.label]; if (!L) return;
      bars.push({ x: B.x, y: row.cy - Math.round(B.h / 2), w: B.w, h: B.h, range: [Math.round(pos(L.range[0])), Math.round(pos(L.range[1]))], marks: [{ id: faceA, cx: Math.round(pos(L.parents[0])) }, { id: faceB, cx: Math.round(pos(L.parents[1])) }], d: B.mark });
      text(Sg[row.label], B.labelX, row.cy + B.labelBase, B.labelRole); text(Sg[row.label + "Ends"], B.endsX, row.cy + B.endsBase, B.endsRole); });
    const sa = standOf(sp, a, fr).looks.markings ?? "plain", sb = standOf(sp, b, fr).looks.markings ?? "plain", can = new Map(R.markings.map((q) => [q.word, q]));
    const coat = "mibi-adult-" + sp + "-between-between", ids = ["plain", ...Object.keys(MARKED_PICTURE)].map((w) => [w, w === "plain" ? `${coat}-48x48` : `${coat}-${MARKED_PICTURE[w]}-48x48`]).filter(([, id]) => placedAt(id, 48, 48));
    // station step 8-6 (AD 14:28): each card is the signed Markings back-crop her page uses (trait-crops.mjs), cut live from the lay-<marking> 304s; a kind with no crops keeps the whole 48s
    // station step 8-7 (AD 14:48): the SQUARE window her page's set cards use (page-card-markings-<marking>-66x66), so the pattern fills the card
    const mc = CROPS[sp]?.cards?.markings, cropIds = mc?.square ? Object.entries(mc.masters).map(([w, id]) => [w, id, mc.squares?.[w] ?? mc.square]).filter(([, id]) => placedAt(id, 304, 312)) : [];
    if (cropIds.length) { ids.length = 0; cropIds.forEach(([w, id, win]) => ids.push([w, id, win])); }
    if (ids.length) { text(Sg.markings, Cd.labelX, Cd.labelBase, Cd.labelRole);
      ids.forEach(([w, id, win], i) => { const cx = Cd.x0 + i * Cd.pitch, c = can.get(w), tagBox = c?.isNew ? [cx + Math.round((Cd.d - Cd.tag.w) / 2), Cd.y + Cd.tag.dy, Cd.tag.w, Cd.tag.h] : null;
        cards.push({ id, word: w, crop: win ?? null, x: cx, y: Cd.y, d: Cd.d, dim: !c, marks: [sa === w ? faceA : null, sb === w ? faceB : null].filter(Boolean), mark: Cd.mark, tag: tagBox });
        text(w, cx - 6, Cd.nameBase, c ? Cd.nameRole : "glass.quiet", "c", Cd.d + 12);
        if (tagBox) text(Sg.newMark, tagBox[0], tagBox[1] + Cd.tag.base, Cd.tag.role, "c", Cd.tag.w); }); }
  }
  // the readout on the aim: the aim (two traits), each pick's copies sit by its face; the pair's chances per trait and both; then the kin and vigour line and the pod's time
  const A = Z.aim;
  if (R.aim.length) { text(Sg.aimHead, A.head.x, A.head.baseline, A.head.role); R.aim.forEach((w, i) => text(w, A.lines.x, A.lines.top + i * A.lines.pitch, A.lines.role)); }
  else text(R.noAim, A.head.x, A.head.baseline, A.head.role);
  if (b && R.chances.length) { text(Sg.chanceHead, A.chanceX, A.head.baseline, A.head.role); [R.both, ...R.chances].forEach((w, i) => text(w, A.chanceX, A.lines.top + i * A.lines.pitch, A.lines.role)); }
  if (b) { text(R.kin, Z.kinLine.x, Z.kinLine.baseline, Z.kinLine.role); text(R.pod, Z.kinLine.x, Z.kinLine.baseline + Z.kinLine.pitch, Z.kinLine.role); }
  const block = b ? S.pairBlock(st, sv, a, b, settings) : "", can = !!b && !block;
  if (R.done) text(R.done, Z.done.x, Z.done.baseline, Z.done.role);
  else if (can) text(Sg.pairThem, Z.ok.right, Z.ok.baseline, Z.ok.role, "r");
  const pic = { size: [spec.regions.page.rect[2], spec.regions.page.rect[3]], stands, names, plates, bars, cards, ok: can ? Z.ok.key : null };
  const stage = req({ kind: "pairing", id: `pairing:${hash(JSON.stringify(pic))}`, ...pic });
  view.page = { name: "", origin: "", tag: "", stage, hints: { chapters: "", look: "" }, rail: { cells: [] }, scale: { texts } };
  view.line = { ok: can ? Sg.pairThem : null, back: S.cap(a.name), subject: b && R.a.resting ? R.a.rest : "", need: block ? S.cap(block) : x.refused ? S.cap(x.refused) : !b ? (partners.length ? "" : spec.strings.nursery.empty) : "" };
  view.targets = [{ id: "rail.0", group: "rail", index: 0 }]; view.cur = "rail.0"; view.resolve = {}; view.first = 0;
  view.pairing = { aId: a.id, bId: b?.id ?? null, partners, can, block, readout: R, W, noStand };
  return view;
}
// an example young is "new to you" when one of its words shows on none of your mibis of the kind
const N_know = (q, st) => N.knownWords(q, 4).some((w) => N.newToYou(st, q, w));
