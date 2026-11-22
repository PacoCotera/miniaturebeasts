// Her page as props (station-match-3 slice 1a, station-match-4 slice 1b; the accepted walk-3-page): a hatched mibi on a screen of her own. Pure selectors from the state and the Pods UI to the props of the face's `page`
// state (pods.json regions.page): her name and where she is from, the "All of her" tag, the stage as ONE picture (the room, her, the chips on her body, the ring on the chapter in hand, and the rail band of every chapter
// with its rings and the frame on the chapter in hand), the two hints, and the rail's cells (name, line, where each stands). Props name what is drawn; the cells' x is the spec's space-between rule (regions.page.rail.cell).
//   ui.pods: page (the mibi's id), lane (the chapter in hand)
import * as S from "../state.mjs";
import { frameOf } from "../genome.mjs";
import { pageSpotsOf, PAGE_BODY_BOX, closeOf, pagePod } from "../page.mjs";
import { coatOf, PAINTED_COAT } from "../stands.mjs";
import { drawnLooks } from "../looks.mjs";
import { shapeOf, scalePlace, shapeModel } from "../trait-shapes.mjs";
import { roundOf, squareOf } from "../trait-crops.mjs";
import { pageModel } from "./reading-props.mjs";
import { fill } from "./words.mjs";

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(16).padStart(8, "0"); };
const isDoings = (ch) => ch.traits.every((t) => t.nature === "doing");

// The origin line under her name: her kind, and where she came from when her record has it (`from.g`: the place she was found or her pod's, as the Vivarium and Let go say it).
export function originOf(m) { const where = S.PLACE_WORD[m.from?.g]; return S.cap(S.spName(m)) + (where ? ` · from the ${where}` : ""); }

// One petal a trait: 1 seen, 0 not yet. A chapter about her body is seen once it is looked at (all its petals); a chapter about what she does fills a petal a trait by watching her.
const petalsOf = (m, ch) => { const looked = S.pageRead(m).includes(ch.id); return ch.traits.map((t) => ((t.nature === "doing" ? S.pageKnown(m, t) >= 1 : looked) ? "1" : "0")).join(","); };

// A cell's left edge: n cells of w, space-between, `inset` from both edges (regions.page.rail.cell.rule)
export const cellX = (i, n, W, c) => c.inset + (n > 1 ? Math.floor((i * (W - 2 * c.inset - n * c.w)) / (n - 1)) : 0) + i * c.w;

// Her chapter (station-match-5; the accepted walk-4-scale and walk-4-copies): ✓ on a chapter of her page opens it (ui.pods.at "scale"), the trait in hand is ui.pods.trait. It is the same `page` state: the stage is the
// `pagescale` picture and `page.scale.texts` are the words over it, each placed from pods.json regions.page.scale. The trait is read from pageModel (her page's own rule: a doing trait a stretch, a mark after the lens).
// A trait that is a set shows its chip and one plain line until the set slice; everything else is the scale.
const NUM = ["no looks", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const hexRGB =(h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const faceOf = (sp, mb, fr) => `mibi-face-${sp}-${(coatOf(sp, drawnLooks(fr, { genome: mb.genome, read: S.pageRead(mb) })) ?? "").split("+")[0] || PAINTED_COAT[sp] || "between-dark"}-64x64`;
const gapSay = (pts, min) => {   // where "none of yours here yet" goes: the middle of the widest empty stretch of the bar (pins are 0.14 wide), if it is wide enough for the words
  const a = [...pts].sort((p, q) => p - q), gaps = [{ mid: ((a[0] ?? 0.5) - 0.07 + 0) / 2, w: (a[0] ?? 1.07) - 0.07 }]; if (!a.length) return 0.5;
  for (let i = 1; i < a.length; i++) gaps.push({ mid: (a[i - 1] + a[i]) / 2, w: a[i] - a[i - 1] - 0.14 }); gaps.push({ mid: (a.at(-1) + 0.07 + 1) / 2, w: 1 - a.at(-1) - 0.07 });
  const g = gaps.reduce((b, x) => (x.w > b.w ? x : b)); return g.w >= min ? g.mid : null;
};
function scaleScreen(view, m, spec, req, mibi, fr, ch) {
  const { st, ui } = m, R = spec.regions.page, Z = R.scale, Sg = spec.strings.read, sid = S.speciesOf(mibi), [W, H] = R.rect.slice(2), ti = clamp(ui.trait ?? 0, 0, ch.traits.length - 1), t = ch.traits[ti];
  const others = st.mibis.filter((x) => !x.released && x.id !== mibi.id && S.speciesOf(x) === sid && x.genome && S.pageRead(x).includes(ch.id));
  const model = pageModel(st, fr, t, pagePod(st, mibi.id), others.map((x) => x.genome), false), isScale = model.shape === "scale", copies = isScale && !!model.copies;
  const hid = !isScale ? model.looks.find((l) => l.hidden) : null, shown = !isScale ? model.looks.find((l) => l.shows) : null, dusk = copies || !!hid;   // a set after the lens: the look she carries in one blue lens
  const trayH = copies ? Z.tray.hCopies : !isScale ? Z.tray.hSet : Z.tray.h, T = H - trayH, top = T + Z.sc.top, X = (s) => Math.round(Z.x0 + s * (Z.x1 - Z.x0)), Hd = Z.head, texts = [];
  const text = (tx, x, base, role, align, w) => { if (tx) texts.push({ text: tx, x: Math.round(x), ...(w ? { w } : {}), base: Math.round(base), role, align }); };
  // the head: the chapter's ring (one petal a trait: the one in hand orange, the one the lens has been pointed at blue), its name, and the chips
  const read = S.pageRead(mibi).includes(ch.id), petals = ch.traits.map((tr, i) => (S.pageLensed(mibi, tr) ? "g" : i === ti ? "c" : (tr.nature === "doing" ? S.pageKnown(mibi, tr) >= 1 : read) ? "1" : "0")).join(",");
  text(S.cap(mibi.name), R.name.x, R.name.baseline, R.name.role, "l");
  text(copies ? fill(Sg.scaleCopiesHead, { traits: t.name.toLowerCase() + "s" }) : hid ? fill(Sg.setHead, { look: (/s$/.test(hid.look) ? "" : "a ") + hid.look }) : ch.name, Hd.nameX, T + Hd.nameBase, Hd.nameRole, "l");
  if (hid && shown) text(fill(Sg.setUnder, { look: shown.look }), Z.set.say.right, T + Hd.nameBase, Z.set.say.role, "r");
  const chips = []; if (!dusk) { let right = Hd.right; for (let i = ch.traits.length - 1; i >= 0; i--) { const tr = ch.traits[i], w = Math.round(Hd.chip.pad + tr.name.length * Hd.chip.perChar), x = right - w;
    chips.unshift({ x, y: T + Hd.cy - Hd.chip.h / 2, w, h: Hd.chip.h, on: i === ti, scale: shapeOf(fr, tr) === "scale" }); text(tr.name, x + 34, T + Hd.cy - Hd.chip.h / 2 + Hd.chip.base, i === ti ? Hd.chip.onRole : Hd.chip.role, "l"); right = x - Hd.chip.gap; } }
  // the one line
  const kindLine = !isScale ? fill(Sg.setKind, { Trait: t.name, n: NUM[model.looks.length] ?? String(model.looks.length), kind: S.cap(S.spName(mibi)) }) : copies ? fill(Sg.scaleCopiesKind, { Trait: t.name }) : fill(Sg.scaleKind, { Trait: t.name, kind: S.cap(S.spName(mibi)), low: model.ends[0], high: model.ends[1] });
  text(kindLine, Z.kind.x, T + Z.kind.base, Z.kind.role, "l");
  // the scale: the kind's pictured ends and middle, the bar, her mark, the others' faces
  const sc = { ends: [], bar: null, rough: null, she: null, cop: null, link: null, pins: [], legend: { dot: null, bar: null } };
  if (isScale) {
    const mast = roundOf(sid, t.id) ?? [null, null, null], A = Z.sc.anchor;
    [0, 0.5, 1].forEach((s, i) => { sc.ends.push({ cx: X(s), cy: top + A.d / 2, d: A.d, master: mast[i] }); if (i !== 1) text(model.ends[i / 2], X(s) - 45, top + A.wordBase, A.role, "c", 90); });
    const g = (Z.grads[t.id] ?? Z.grads.default).map(hexRGB), B = Z.sc.bar;
    sc.bar = { x0: Z.x0, x1: Z.x1, y: top + B.y, h: B.h, over: B.over, grad: g, ticks: [0, 0.5, 1].map(X), tick: [top + B.tick[0], top + B.tick[1]] };
    if (model.rough) sc.rough = [X(model.rough[0]), X(model.rough[1]), top + Z.sc.rough.y, Z.sc.rough.h];
    const P = Z.sc.pin, pinTop = top + (copies ? P.topCopies : P.top), pts = [];
    if (model.shows != null) { sc.she = { x: X(model.shows), y: top + Z.sc.she.cy, d: Z.sc.she.d }; sc.pins.push({ x: X(model.shows), top: pinTop, face: faceOf(sid, mibi, fr), her: true }); pts.push(model.shows); text(S.cap(mibi.name), X(model.shows) - P.w / 2, pinTop + P.name, P.herRole, "c", P.w); }
    for (const o of others) { const at = scalePlace(fr, t, o.genome)?.shows; if (at == null || pts.some((q) => Math.abs(q - at) < 0.12)) continue; sc.pins.push({ x: X(at), top: pinTop, face: faceOf(sid, o, fr), her: false }); pts.push(at); text(S.cap(o.name), X(at) - P.w / 2, pinTop + P.name, P.role, "c", P.w); }
    if (copies) { sc.cop = { xs: model.copies.map(X), y: top + Z.sc.cop.cy, h: Z.sc.cop.h }; const [a, b] = model.copies.map(X).sort((p, q) => p - q); sc.link = { x0: a, x1: b, y: top + Z.sc.link.y, h: Z.sc.link.h }; }
    else { const mid = gapSay(pts, Z.sc.say.min); if (mid != null) text(Sg.scaleNone, X(mid) - Z.sc.say.w / 2, top + Z.sc.say.base, Z.sc.say.role, "c", Z.sc.say.w); }
    // the legend: what the gold mark and the blue marks are (the lens has said the blue ones); after the lens, what the two copies mean for a young
    const Lg = Z.legend;
    if (copies) text(Sg.scaleYoung, Lg.x, Lg.base, Lg.blueRole, "l");
    else { if (model.shows != null) { sc.legend.dot = [Lg.dotX, Lg.base + Lg.dotDy]; text(Sg.scaleHere, Lg.x + 20, Lg.base, Lg.role, "l"); }
      const u = Sg.scaleUnknown, w = Math.round(u.length * Lg.perChar); sc.legend.bar = [Lg.right - w - Lg.barGap - Lg.barW, Lg.base - 15, Lg.barW, Lg.barH]; text(u, Lg.right, Lg.base, Lg.blueRole, "r"); }
  }
  // a set: one card a look (gold what she shows, a dashed blue rim the look she carries once the lens showed it, a dashed pale rim a look none of yours has), its word, and the small faces of yours that show or carry it
  const set = { cards: [], kin: [], pill: { w: Z.set.pill.w, h: Z.set.pill.h, dy: Z.set.pill.dy } };
  if (!isScale) {
    const Q = Z.set, n = model.looks.length, top = T + Q.top, theirs = others.map((o) => ({ o, looks: shapeModel(fr, t, o.genome).looks }));
    text(Sg.setNote, Q.say.right, T + Q.say.base, Q.say.role, "r");   // the accepted note shares the one line with the kind line; at a phone size the two do not fit, so it stands at the foot
    model.looks.forEach((l, i) => {
      const x = Q.x0 + (n > 1 ? Math.round((i * (Q.x1 - Q.x0 - Q.card)) / (n - 1)) : 0), rim = l.shows ? "gold" : l.hidden ? "blue" : l.none ? "dash" : "solid", sq = squareOf(sid, t.id, l.look), kin = [];
      set.cards.push({ x, y: top, s: Q.card, rim, master: sq?.master ?? null, window: sq?.window ?? null, bright: l.hidden ? 1.25 : 1, pill: l.shows ? "gold" : l.hidden ? "blue" : "" });
      if (l.shows || l.hidden) text(l.shows ? Sg.setShows : Sg.setCarries, x + Q.card / 2 - Q.pill.w / 2, top + Q.pill.dy + Q.pill.base, Q.pill.role, "c", Q.pill.w);
      text(l.look, x - 7, top + Q.label.base, Q.label[l.shows ? "shows" : l.hidden ? "carries" : l.none ? "none" : "role"] ?? Q.label.role, "c", Q.card + 14);
      if (l.shows) kin.push({ face: faceOf(sid, mibi, fr), her: true });
      for (const q of theirs) if (q.looks[i]?.shows || q.looks[i]?.hidden) kin.push({ face: faceOf(sid, q.o, fr), her: false });
      const K = Q.kin, w = kin.length * K.d + Math.max(0, kin.length - 1) * K.gap; kin.forEach((k, j) => set.kin.push({ ...k, x: Math.round(x + Q.card / 2 - w / 2 + j * (K.d + K.gap)), y: top + K.dy - K.d / 2, d: K.d }));
    });
  }
  // the picture: her close up with the ring on the chapter's place; after the lens the room at dusk with the two copies (a set: the look she carries) in one blue lens
  let body, lens, halves = null;
  if (hid) { const C = Z.set.lens, sq = squareOf(sid, t.id, hid.look); body = { left: C.bodyLeft, top: C.bodyTop, w: C.bodyW }; lens = { cx: C.cx, cy: C.cy, d: C.d, zoomW: C.zoomW, ox: C.ox, oy: C.oy }; halves = sq ? [sq.master] : null; }
  else if (copies) { const C = Z.copies, mast = roundOf(sid, t.id); body = { left: C.bodyLeft, top: C.bodyTop, w: C.bodyW }; lens = { cx: C.cx, cy: C.cy, d: C.d, zoomW: C.zoomW }; halves = mast ? model.copies.map((c) => mast[c < 0.5 ? 0 : 2]) : null; }
  else { const C = Z.close, bh = Math.round((C.bodyW * 312) / 304), [fx, fy] = closeOf(sid, ch.id), left = clamp(Math.round(C.cx - fx * C.bodyW), C.left[0], C.left[1]), bt = clamp(Math.round(C.cy - fy * bh), C.tray - bh, 0);
    body = { left, top: bt, w: C.bodyW }; lens = { cx: left + Math.round(fx * C.bodyW), cy: bt + Math.round(fy * bh), d: C.d, zoomW: C.zoomW, fx, fy }; }
  const pic = { species: sid, size: [W, H], dusk, copies, body, lens, halves, tray: { top: T, h: trayH, fade: Z.tray.fade }, ring: { cx: Hd.cx, cy: T + Hd.cy, s: Hd.ring, chapter: ch.id, petals }, chips, sc, set };
  const stage = req({ kind: "pagescale", id: `pagescale:${sid}:${hash(JSON.stringify(pic))}`, ...pic });
  return { name: "", origin: "", tag: "", stage, hints: { chapters: "", look: "" }, rail: { cells: [] }, scale: { texts } };
}

// Her board (station-match-7; the accepted walk-5-glance): "All of her" and the blue key open it (ui.pods.at "board"). The stage is the `pageboard` picture and `page.scale.texts` the words over it (the same list her chapters use),
// each placed from pods.json regions.page.board. Every trait of her kind is one small row in its own shape, a chapter a head; what a row shows comes from pageModel (an unlooked body chapter is shut, a doing a stretch, what she carries only after the lens).
function boardScreen(view, m, spec, req, mibi, fr) {
  const { st } = m, R = spec.regions.page, Bd = R.board, Sg = spec.strings.read, sid = S.speciesOf(mibi), [W, H] = R.rect.slice(2), texts = [], pod = pagePod(st, mibi.id), groups = [], colY = [Bd.top, Bd.top];
  const text = (tx, x, base, role, align, w) => { if (tx) texts.push({ text: tx, x: Math.round(x), ...(w ? { w } : {}), base: Math.round(base), role, align }); };
  const bodyN = fr.chapters.filter((c) => !isDoings(c)).length;   // the columns: the first half of the chapters about her body left, the rest right; those about what she does alternate, left first
  let nDo = 0; const colOf = new Map(fr.chapters.map((c, k) => [c.id, isDoings(c) ? nDo++ % 2 : k < Math.ceil(bodyN / 2) ? 0 : 1]));
  const rows = Math.max(...[0, 1].map((c) => fr.chapters.filter((x) => colOf.get(x.id) === c).reduce((n, ch) => n + ch.traits.length, 0))), groupsIn = Math.max(...[0, 1].map((c) => fr.chapters.filter((x) => colOf.get(x.id) === c).length));
  const rowH = clamp(Math.floor((Bd.foot - Bd.top - groupsIn * (Bd.head + 3 + Bd.gap)) / Math.max(1, rows)), Bd.rowMin, Bd.row);   // a kind with more traits than fit gets slimmer rows, never a second page
  text(S.cap(mibi.name), Bd.who.x, Bd.who.nameBase, Bd.who.nameRole, "l");
  text(S.cap(S.spName(mibi)), Bd.who.x + Bd.who.kindGap + Math.round(mibi.name.length * Bd.who.kindPerChar), Bd.who.nameBase, Bd.who.kindRole, "l");
  const label = [0, 1].map((c) => Math.max(Bd.label, ...fr.chapters.filter((x) => colOf.get(x.id) === c).flatMap((x) => x.traits.map((t) => Math.ceil(t.name.length * Bd.namePerChar) + Bd.nameGap))));   // a column's label width: no name clipped or touching its row's shape (the longest name sets it)
  const alone = [];   // what only she has among your mibis (the accepted "HERS ALONE"): a scale she stands at an end of with none of yours near, a look she shows or carries that none of yours has
  fr.chapters.forEach((ch) => {
    const col = colOf.get(ch.id), C = Bd.cols[col], barW = C.w - label[col] - Bd.barGap, y0 = colY[col], looked = S.pageRead(mibi).includes(ch.id), doing = isDoings(ch), shutChapter = !looked && !doing;
    const others = st.mibis.filter((x) => !x.released && x.id !== mibi.id && S.speciesOf(x) === sid && x.genome && S.pageRead(x).includes(ch.id)).map((x) => x.genome);
    const sights = doing ? Math.min(...ch.traits.map((t) => Math.round(S.pageKnown(mibi, t) * S.PAGE_SIGHTS))) : S.PAGE_SIGHTS;
    const note = shutChapter ? Sg.boardToLook : doing ? (sights <= 0 ? Sg.boardNotSeen : sights === 1 ? Sg.boardSeenOnce : sights < S.PAGE_SIGHTS ? Sg.boardWatch : "") : "";
    const quiet = shutChapter || (doing && sights <= 0);
    text(ch.name, C.x + 31, y0 + Bd.headBase, Bd.headRole, "l"); text(note, C.x + C.w - 2, y0 + Bd.headBase, Bd.noteRole, "r");
    const g = { chapter: ch.id, x: C.x, y: y0, dim: quiet, rows: [] }; let y = y0 + Bd.head + 3;
    for (const t of ch.traits) {
      const model = pageModel(st, fr, t, pod, others, shutChapter), cy = y + rowH / 2, bx = C.x + label[col], row = { cy, bx, shut: false, scale: null, set: null };
      if (model.shape === "scale") { row.scale = { w: barW, at: model.shows, rough: model.rough, copies: model.copies, others: model.others }; row.shut = model.shows == null && !model.rough; }
      else { const ls = model.looks, sh = ls.findIndex((l) => l.shows), cr = ls.findIndex((l) => l.hidden); row.set = { n: ls.length, step: Bd.step, found: ls.flatMap((l, k) => (l.others > 0 && !l.shows ? [k] : [])), shows: sh >= 0 ? sh : null, carries: cr >= 0 ? cr : null }; row.shut = sh < 0 && !ls.some((l) => l.others > 0); }
      if (others.length && !shutChapter) {
        if (model.shape === "scale" && model.shows != null && !model.rough) { const a = model.shows, end = a <= 0.25 ? model.ends[0] : a >= 0.75 ? model.ends[1] : ""; if (end && model.others.every((o) => Math.abs(o - a) > 0.2)) alone.push({ kind: "scale", text: S.cap(end) }); }
        else if (model.shape === "set") { const sh = model.looks.find((l) => l.shows && l.others === 0), cr = model.looks.find((l) => l.hidden && l.others === 0);
          if (sh) alone.push({ kind: "shows", text: S.cap(sh.look) }); if (cr) alone.push({ kind: "carries", text: fill(Sg.boardAloneCarries, { look: (/s$/.test(cr.look) ? "" : "a ") + cr.look }) }); } }
      text(t.name, C.x, cy + Bd.rowBase - 14, row.shut ? Bd.shutRole : Bd.nameRole, "l");
      g.rows.push(row); y += rowH;
    }
    groups.push(g); colY[col] = y + Bd.gap;
  });
  const Al = Bd.alone, aloneItems = alone.slice(0, Al.max).map((it, k) => ({ kind: it.kind, x: Al.x, y: Al.top + k * Al.pitch, d: Al.d }));
  if (aloneItems.length) { text(Sg.boardAlone, Al.x, Al.headBase, Al.headRole, "l"); aloneItems.forEach((it, k) => text(alone[k].text, Al.x + Al.d + Al.gap, it.y + Al.base, Al.role, "l")); }
  const Lg = Bd.legend, items = []; let lx = Lg.x;
  for (const [kind, word] of [["scale", Sg.boardLgScale], ["set", Sg.boardLgSet], ["shows", Sg.boardLgShows], ["carries", Sg.boardLgCarries], ["others", Sg.boardLgOthers]]) {
    items.push({ x: lx, kind }); const tx = lx + Lg.glyph[kind] + Lg.glyphGap; text(word, tx, Lg.y + 5, Lg.role, "l"); lx = tx + Math.round(word.length * Lg.perChar) + Lg.gap; }
  const pic = { species: sid, size: [W, H], body: Bd.body, alone: aloneItems, groups, legend: { y: Lg.y, items } };
  const stage = req({ kind: "pageboard", id: `pageboard:${sid}:${hash(JSON.stringify(pic))}`, ...pic });
  return { name: "", origin: "", tag: "", stage, hints: { chapters: "", look: "" }, rail: { cells: [] }, scale: { texts } };
}

// The page's view: { mode: "page", page: {...}, line, targets, cur, requests }
export function pageView(view, m, spec, req) {
  const { st, ui } = m, Sg = spec.strings.read, mibi = S.mibiById(st, ui.page);
  if (!mibi || mibi.released) return { ...view, mode: "inventory", broken: true };
  { const fr0 = frameOf(S.speciesOf(mibi)), chs0 = fr0 ? fr0.chapters : [], ch0 = chs0[clamp(ui.lane ?? 0, 0, Math.max(0, chs0.length - 1))];
    if (ui.at === "board" && fr0) { view.page = boardScreen(view, m, spec, req, mibi, fr0); view.line = { ok: null, back: S.cap(mibi.name), subject: "", need: "" }; view.targets = [{ id: "trait", group: "trait" }]; view.cur = "trait"; view.resolve = {}; return view; }
    if (ui.at === "scale" && ch0) { view.page = scaleScreen(view, m, spec, req, mibi, fr0, ch0); const hand = chs0.indexOf(ch0); view.line = { ok: null, back: S.cap(mibi.name), subject: "", need: "" }; view.targets = chs0.map((c, i) => ({ id: "rail." + i, group: "rail", index: i })); view.cur = "rail." + hand; view.resolve = {}; return view; } }
  const R = spec.regions.page, C = R.rail.cell, sid = S.speciesOf(mibi), fr = frameOf(sid), chs = fr ? fr.chapters : [], hand = clamp(ui.lane ?? 0, 0, Math.max(0, chs.length - 1)), ch = chs[hand] ?? null;
  const spots = pageSpotsOf(sid).filter((s) => chs.some((c) => c.id === s.chapter)).map((s) => ({ chapter: s.chapter, at: s.at, line: s.line, ring: ch && s.chapter === ch.id ? petalsOf(mibi, ch) : "" }));
  const cells = chs.map((c, i) => {
    const p = petalsOf(mibi, c), left = p.split(",").filter((x) => x === "0").length, x = cellX(i, chs.length, R.rect[2], C);
    const sub = isDoings(c) ? (left ? Sg.railWatch : Sg.railDone) : fill(left ? Sg.railToSee : Sg.railSeen, { n: left || c.traits.length });
    return { id: c.id, name: c.name, sub, x, petals: p, hand: i === hand };
  });
  const key = hash(spots.map((s) => `${s.chapter}:${s.ring}`).join("|") + "|" + cells.map((c) => `${c.id}:${c.petals}`).join("|") + "|" + (ch ? ch.id : "-"));
  const stage = req({ kind: "pagestage", id: `pagestage:${sid}:${key}`, species: sid, size: R.rect.slice(2), body: { x: PAGE_BODY_BOX.x, y: PAGE_BODY_BOX.y, w: PAGE_BODY_BOX.w }, spots, hand: ch ? ch.id : "", tag: R.tag.rect, radius: R.tag.radius, keys: [R.hints.chapters.key, R.hints.look.key],
    rail: { y: R.rail.rect[1], h: R.rail.rect[3], ring: C.ring, cy: R.rail.rect[1] + C.ringCy, grad: C.gradient, frame: C.frame, w: C.w, cells: cells.map((c) => ({ chapter: c.id, x: c.x, petals: c.petals, hand: c.hand })) } });
  const name = S.cap(mibi.name);
  view.page = { name, origin: originOf(mibi), tag: Sg.board, stage, hints: { chapters: Sg.pageHintChapters, look: Sg.pageHintLook }, rail: { cells: cells.map((c) => ({ id: c.id, name: c.name, sub: c.sub, hand: c.hand })) } };
  view.line = { ok: ch ? fill(isDoings(ch) ? Sg.open : Sg.pageLook, { chapter: ch.name }) : null, back: name, subject: ch ? fill(Sg[S.pageRead(mibi).includes(ch.id) ? "pageKnown" : isDoings(ch) ? "pageWatch" : "pageSurprise"], { chapter: ch.name }) : "", need: "" };   // not drawn on her page (no foot line); the intents and tests still read it
  view.targets = cells.map((c, i) => ({ id: "rail." + i, group: "rail", index: i }));   // the cells; the frame on the chapter in hand is the ring
  view.cur = hand < cells.length ? "rail." + hand : null; view.resolve = {};
  return view;
}
