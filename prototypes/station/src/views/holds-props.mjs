// What the pods hold as props (station step 9-1; the accepted walk-4 picture 13): the blue key in the nursery opens it. Pure selectors from the save and the Pods UI to the props of the face's `page` state, as her board
// (page-props.mjs boardScreen) does: the stage is the `pageboard` picture and `page.scale.texts` the words over it, each placed from pods.json regions.page.holds (and her board's rows, regions.page.board).
//   ui.pods: view "holds"; hold { i } (the row the ring is on, in the ring's order: the left column then the right); only (the trait whose pods the shelf shows after "Show the pods")
import * as S from "../state.mjs";
import { frameOf } from "../genome.mjs";
import { boardOf, boardKind } from "../nursery-board.mjs";
import * as N from "../nursery.mjs";
import { ringOf, podId } from "./nursery-props.mjs";
import { fill } from "./words.mjs";

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(16).padStart(8, "0"); };

// The board the ring is on: the kind (the ring's row on the shelf, else the first row, else your first mibi), its model, and the ring clamped to its rows.
export function holdsOf(st, ui) {
  const rows = N.shelfRows(st, ui.order ?? "newest"), kind = ui.holdKind ?? boardKind(st, rows, ringOf(st, ui, rows)), board = kind == null ? null : boardOf(st, kind, ui.order ?? "newest");
  const i = board ? clamp(ui.hold?.i ?? 0, 0, Math.max(0, board.flat.length - 1)) : 0;
  return { board, i, row: board?.flat[i] ?? null };
}
// "2 pods, from the reeds" / "6 pods of Tita + Kenya" / "3 pods, 2 origins": which pods bring one look
export function whichPods(Sg, s) {
  const n = s.pods, o = s.one;
  if (!o) return fill(Sg.podsIn, { n, k: s.origins });
  if (o.kind === "pair") return fill(n === 1 ? Sg.pods1Of : Sg.podsOf, { n, names: o.words });
  if (o.kind === "line") return fill(n === 1 ? Sg.pods1Line : Sg.podsLine, { n, name: o.words });
  return fill(n === 1 ? Sg.pods1From : Sg.podsFrom, { n, place: o.words });
}

export function holdsView(view, m, spec, req) {
  const { st, ui } = m, R = spec.regions.page, Z = R.holds, Bd = R.board, Sg = spec.strings.nursery.holds, [W, H] = R.rect.slice(2), texts = [];
  const text = (tx, x, base, role, align, w) => { if (tx) texts.push({ text: tx, x: Math.round(x), ...(w ? { w } : {}), base: Math.round(base), role, align }); };
  const { board, i, row } = holdsOf(st, ui), fr = board ? frameOf(board.species) : null;
  const from = spec.strings.nursery.crumb;   // ← goes back to the shelf
  const pic = { species: board?.species ?? "", size: [W, H], alone: [], groups: [], legend: { y: 0, items: [] } };
  text(Sg.title, Z.title.x, Z.title.baseline, Z.title.role, "l");
  if (!board || !fr) { text(Sg.noKind, Z.title.x, Z.sub.baseline, Z.sub.role, "l"); }
  else {
    const kindName = board.kind, pods = board.pods === 1 ? Sg.pod1 : fill(Sg.pods, { n: board.pods });
    text(fill(Sg.sub, { kind: kindName, pods, found: board.found, pairs: board.pairs }), Z.sub.x, Z.sub.baseline, Z.sub.role, "l");
    pic.pod = { id: podId(req, board.species), x: Z.pod.x, y: Z.pod.y, w: Z.pod.w };
    // the strip: the looks only the pods can bring, each with its picture and which pods
    if (!board.pods) text(Sg.none, Z.strip.none.x, Z.strip.none.baseline, Z.strip.none.role, "l");
    else if (!board.strip.length) { text(fill(Sg.stripHead, { kind: kindName.toLowerCase() }).toUpperCase(), Z.strip.headX, Z.strip.headBase, Z.strip.headRole, "l"); text(Sg.stripNone, Z.strip.none.x, Z.strip.none.baseline, Z.strip.none.role, "l"); }
    else {
      const T = Z.strip; text(fill(Sg.stripHead, { kind: kindName.toLowerCase() }).toUpperCase(), T.headX, T.headBase, T.headRole, "l");
      if (board.strip.length > T.max) text(fill(Sg.stripMore, { n: board.strip.length - T.max }), T.moreRight, T.headBase, T.headRole, "r");
      board.strip.slice(0, T.max).forEach((s, k) => { const x = T.cols[k], mast = s.card?.master ?? s.round ?? null;
        pic.alone.push({ kind: s.shape === "scale" ? "scale" : "shows", x, y: T.top, d: T.d, master: mast, window: s.card?.window ?? null, rim: s.green ? "green" : "seen" });
        text(s.shape === "scale" ? `${s.word} ${s.traitName.toLowerCase()}` : s.word, x + T.d + T.gap, T.top + T.nameBase, T.nameRole, "l"); text(whichPods(Sg, s), x + T.d + T.gap, T.top + T.podsBase, T.podsRole, "l"); });
    }
    // the rows: her board's, for the whole shelf
    const colOf = new Map(board.chapters.map((g) => [g.id, g.col])), colY = [Z.top, Z.top];
    const rowsN = Math.max(...[0, 1].map((c) => board.chapters.filter((g) => g.col === c).reduce((n, g) => n + g.traits.length, 0)), 1), groupsIn = Math.max(...[0, 1].map((c) => board.chapters.filter((g) => g.col === c).length), 1);
    const rowH = clamp(Math.floor((Z.foot - Z.top - groupsIn * (Bd.head + 3 + Bd.gap)) / rowsN), Bd.rowMin, Bd.row);
    const label = [0, 1].map((c) => Math.max(Bd.label, ...board.chapters.filter((g) => colOf.get(g.id) === c).flatMap((g) => g.traits.map((t) => Math.ceil(t.name.length * Bd.namePerChar) + Bd.nameGap))));
    let k = 0, ringBox = null;
    for (const g of board.chapters) {
      const col = g.col, C = Bd.cols[col], y0 = colY[col], barW = C.w - label[col] - Bd.barGap - 14, grp = { chapter: g.id, x: C.x, y: y0, dim: false, rows: [] }; let y = y0 + Bd.head + 3;
      text(g.name, C.x + 31, y0 + Bd.headBase, Bd.headRole, "l");
      for (const t of g.traits) {
        const cy = y + rowH / 2, bx = C.x + label[col], goldX = C.x + C.w - Z.goldRight, w = { cy, bx, shut: false, scale: null, set: null, gold: t.gold ? goldX : null };
        if (t.shape === "scale") w.scale = { w: barW, at: null, rough: null, copies: null, others: t.yours, green: t.green, seen: t.seen, open: true };
        else w.set = { n: t.looks.length, step: Bd.step, found: t.yours, shows: null, carries: null, green: t.green, seen: t.seen };
        text(t.name, C.x, cy + Bd.rowBase - 14, Bd.nameRole, "l");
        const at = board.flat.findIndex((f) => f.id === t.id); if (at === i) ringBox = [C.x - Z.ring.padX, Math.round(cy - rowH / 2 + 1), C.w + 2 * Z.ring.padX, rowH - 2];
        grp.rows.push(w); y += rowH; k++;
      }
      pic.groups.push(grp); colY[col] = y + Bd.gap;
    }
    pic.ring = ringBox;
    text(Sg.limit, Z.limit.x, Z.limit.baseline, Z.limit.role, "l");
    // the legend, two rows of two
    const Lg = Z.legend, items = [[{ kind: "others", word: fill(Sg.lgYours, { kind: kindName }) }, { kind: "green", word: Sg.lgGreen }], [{ kind: "seen", word: Sg.lgSeen }, { kind: "gold", word: Sg.lgGold }]];
    items.forEach((line, r) => { let lx = Lg.x; for (const it of line) { pic.legend.items.push({ x: lx, kind: it.kind, y: Lg.ys[r] }); const tx = lx + Lg.glyph[it.kind] + Lg.glyphGap; text(it.word, tx, Lg.ys[r] + 5, Lg.role, "l"); lx = tx + Math.round(it.word.length * Lg.perChar) + Lg.gap; } });
    pic.legend.y = Lg.ys[0];
    // the ring's line, and ✓ Show the pods when the pods could bring a new look on this row
    const news = row ? board.byTrait[row.id] : null;
    if (row) text(news ? fill(news.pods === 1 ? Sg.newLook1 : Sg.newLook, { trait: row.name, n: news.pods }) : fill(Sg.noNew, { trait: row.name }), Z.line.x, Z.line.baseline, Z.line.role, "l");
    if (news) { text(Sg.show, Z.line.right, Z.line.baseline, Z.line.okRole, "r"); pic.ok = Z.line.key; }
  }
  const stage = req({ kind: "pageboard", id: `pageboard:${board?.species ?? "S01"}:${hash(JSON.stringify(pic))}`, ...pic });
  view.page = { name: "", origin: "", tag: "", stage, hints: { chapters: "", look: "" }, rail: { cells: [] }, scale: { texts } };
  view.line = { ok: pic.ok ? Sg.show : null, back: from, subject: "", need: "" };
  view.targets = [{ id: "rail.0", group: "rail", index: 0 }]; view.cur = "rail.0"; view.resolve = {}; view.first = 0;
  view.holds = { board, i, row, news: row && board ? board.byTrait[row.id] ?? null : null };
  return view;
}
