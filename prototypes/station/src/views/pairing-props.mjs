// The pairing screen as props (station step 8-3; the accepted walk-4 picture 6 with the owner's 10:4x readout and kin line): the same `page` state the nursery uses. The stage is ONE picture (`pairing`, nursery-pictures.mjs)
// and the words over it are `page.scale.texts`, placed from pods.json regions.page.pair. Every number and sentence is the model's (pairing-model.mjs, from pairing.mjs and the engine); nothing is computed here.
//   ui.pair: { aId, bId } (the first pick, the second pick the pad changes), ui.from (where ← goes)
import * as S from "../state.mjs";
import * as N from "../nursery.mjs";
import { frameOf } from "../genome.mjs";
import { faceOf } from "./page-props.mjs";
import { readout } from "../pairing-model.mjs";
import { fill } from "./words.mjs";

const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(16).padStart(8, "0"); };

// The partners the pad walks (the mibi's own pairable ones: at home, not family), in the Cross room's order.
export const partnersOf = (st, sv, a, settings) => S.crossPartners(st, sv, a, settings).filter((p) => !p.away && !p.family).map((p) => p.id);

export function pairView(view, m, spec, req) {
  const { st, sv, settings, ui } = m, now = m.now || Date.now(), Z = spec.regions.page.pair, Sg = spec.strings.pairing, texts = [], x = ui.pair ?? {};
  const a = S.mibiById(st, x.aId); if (!a) return null;
  const partners = partnersOf(st, sv, a, settings), b = partners.includes(x.bId) ? S.mibiById(st, x.bId) : null;
  const R = readout(st, sv, spec, a, b, settings, now), text = (tx, X, base, role, align = "l", w) => { if (tx) texts.push({ text: tx, x: Math.round(X), ...(w ? { w } : {}), base: Math.round(base), role, align }); };
  const fr = frameOf(S.speciesOf(a)), W = spec.regions.page.rect[2], F = Z.faces;
  text(Sg.title, Z.title.x, Z.title.baseline, Z.title.role);
  text(fill(spec.strings.nursery.sub, { from: S.cap(a.name) }), Z.title.x, Z.crumb.baseline, Z.crumb.role);
  const faces = [{ id: faceOf(S.speciesOf(a), a, fr), x: F.ax, y: F.y, d: F.d }], names = [], pw = 120;
  const side = (mb, f, fx) => { if (!mb) return; const px = fx + Math.round((F.d - pw) / 2), py = F.y + F.d + Z.name.dy - Z.name.h; names.push([px, py, pw, Z.name.h, Z.name.radius]);
    text(S.cap(mb.name), px, Z.name.baseline, Z.name.role, "c", pw);
    if (f.rest) text(f.rest, px, Z.rest.baseline, Z.rest.role, "c", pw);   // "resting · n min" on the face, with its time
    if (f.counts.length) text(f.counts.map((c, i) => `${i ? "eyes" : "marking"} ${c}`).join(" · "), fx - 20, Z.copies.baseline + (f.rest ? 0 : -10), Z.copies.role, "c", F.d + 40); };
  side(a, R.a, F.ax);
  if (b) { faces.push({ id: faceOf(S.speciesOf(b), b, fr), x: F.bx, y: F.y, d: F.d }); side(b, R.b, F.bx); }
  text(Sg.plus, Z.plus.cx, Z.plus.baseline, Z.plus.role, "c", 40);
  const kinHead = b ? (R.raw ? S.kinshipWord(S.kinshipOf(st, a, b)) : "") : "";
  if (b && kinHead) text(kinHead, Z.kin.cx - Z.kin.w / 2, Z.kin.baseline, Z.kin.role, "c", Z.kin.w);
  // the four examples and where the young can land (green): the words the examples show, the ones new to you tagged
  const young = [], words = [];
  if (b) {
    const ex = S.exampleYoung(st, a, b), Y = Z.young;
    ex.forEach((q, i) => { const tag = N.knownWords(q, 4).some((w) => N.newToYou(st, q, w)); young.push({ id: faceOf(S.speciesOf(a), q, fr), x: Y.xs[i], y: Y.y, d: Y.d, tag: tag ? [Y.xs[i] + Math.round((Y.d - Y.tag.w) / 2), Y.y + Y.tag.dy, Y.tag.w, Y.tag.h] : null });
      if (tag) text(spec.strings.nursery.newToYou, Y.xs[i] + Math.round((Y.d - Y.tag.w) / 2), Y.y + Y.tag.dy + Y.tag.baseline, Y.tag.role, "c", Y.tag.w);
      for (const w of N.knownWords(q, 4)) if (!words.includes(w.word)) words.push(w.word); });
    text(Sg.young, Y.head.x, Y.head.baseline, Y.head.role);
    text(Sg.land, Z.land.head.x, Z.land.head.baseline, Z.land.head.role);
    text(words.slice(0, Z.land.words.max).join(" · "), Z.land.words.x, Z.land.words.baseline, Z.land.words.role);
  }
  // the readout on the aim: the aim (two traits), each pick's copies sit by its face; the pair's chances per trait and both; then the kin and vigour line and the pod's time
  const A = Z.aim;
  if (R.aim.length) { text(Sg.aimHead, A.head.x, A.head.baseline, A.head.role); R.aim.forEach((w, i) => text(w, A.lines.x, A.lines.top + i * A.lines.pitch - (b ? 0 : 0), A.lines.role)); }
  else text(R.noAim, A.head.x, A.head.baseline, A.head.role);
  if (b && R.chances.length) { text(Sg.chanceHead, A.head.x + 250, A.head.baseline, A.head.role); [...R.chances, R.both].forEach((w, i) => text(w, A.head.x + 250, A.lines.top + i * A.lines.pitch, A.lines.role)); }
  if (b) { text(R.kin, Z.kinLine.x, Z.kinLine.baseline, Z.kinLine.role); text(R.pod, Z.kinLine.x, Z.kinLine.baseline + Z.kinLine.pitch, Z.kinLine.role); }
  const block = b ? S.pairBlock(st, sv, a, b, settings) : "", can = !!b && !block;
  if (R.done) text(R.done, Z.done.x, Z.done.baseline, Z.done.role);
  else if (can) text(Sg.pairThem, Z.ok.right, Z.ok.baseline, Z.ok.role, "r");
  const pic = { size: [spec.regions.page.rect[2], spec.regions.page.rect[3]], faces, names, young, land: null, ok: can ? Z.ok.key : null };
  const stage = req({ kind: "pairing", id: `pairing:${hash(JSON.stringify(pic))}`, ...pic });
  view.page = { name: "", origin: "", tag: "", stage, hints: { chapters: "", look: "" }, rail: { cells: [] }, scale: { texts } };
  view.line = { ok: can ? Sg.pairThem : null, back: S.cap(a.name), subject: b && R.a.resting ? R.a.rest : "", need: block ? S.cap(block) : !b ? (partners.length ? "" : spec.strings.nursery.empty) : "" };
  view.targets = [{ id: "rail.0", group: "rail", index: 0 }]; view.cur = "rail.0"; view.resolve = {}; view.first = 0;
  view.pairing = { aId: a.id, bId: b?.id ?? null, partners, can, block, readout: R, W };
  return view;
}
