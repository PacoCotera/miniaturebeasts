// What the pods hold (station step 9-1; the accepted walk-4 picture 13): the board of one kind's whole shelf. Pure functions of the save; no drawing, no words (the view puts the words from pods.json strings.nursery).
// Her board's pattern (page-props.mjs boardScreen): every trait of the kind is one small row in its own shape (a scale bar, a set of squares), by chapter. On each row:
//   yours   your living mibis of the kind: a dot a mibi on a scale, a filled square a look some mibi shows on a set (what she shows only; nothing hidden is read);
//   green   where the young of your own pods can land: every pair row's two parents through state.landAllOf (landOf's own forecast); a pair whose parent is gone keeps what its row already says (nursery.knownWords);
//   seen    dashed white: what the Companion saw of a found pod's parent from afar, roughly (nursery.knownWords, as the shelf says it);
//   gold    a dot at the row's end when the pods reach a look none of your mibis shows.
// A pod is never read: the only things used are the pair row's parents and the found row's words. What a mibi does (the "doing" traits) is never known before the hatch, so those rows are not on this board.
import * as S from "./state.mjs";
import { frameOf, traitState } from "./genome.mjs";
import { shapeOf, scalePlace, scaleAt, scaleEnds } from "./trait-shapes.mjs";
import { roundOf, squareOf } from "./trait-crops.mjs";
import * as N from "./nursery.mjs";

export const END = 0.3;   // the ends of a scale: the first and last 30 % (the same reach as nursery.newToYou)
const isDoings = (ch) => ch.traits.every((t) => t.nature === "doing");
const living = (st, species) => st.mibis.filter((m) => !m.released && S.speciesOf(m) === species && m.genome);
const merge = (xs) => { const s = xs.map((x) => [Math.min(...x), Math.max(...x)]).sort((p, q) => p[0] - q[0]), out = []; for (const x of s) { const l = out[out.length - 1]; if (l && x[0] <= l[1] + 0.02) l[1] = Math.max(l[1], x[1]); else out.push([...x]); } return out; };
const hitsEnd = (r, e) => (e === 0 ? r[0] <= END : r[1] >= 1 - END);

// The columns of a list of chapters (her board's rule, shared): the first half of those about the body left, the rest right; those about what she does alternate, left first. -> Map(chapter id -> 0 | 1)
export function boardColumns(chapters) {
  const bodyN = chapters.filter((c) => !isDoings(c)).length; let nDo = 0;
  return new Map(chapters.map((c, k) => [c.id, isDoings(c) ? nDo++ % 2 : k < Math.ceil(bodyN / 2) ? 0 : 1]));
}

// The kind the board is for: the ring's row on the shelf, else the first row, else the kind of your first living mibi; null with neither.
export function boardKind(st, rows, ring) {
  const r = ring?.z === "shelf" ? rows[ring.i] : null, m = st.mibis.find((x) => !x.released && x.genome);
  return r?.species ?? rows[0]?.species ?? (m ? S.speciesOf(m) : null);
}

const parentsOf = (st, row) => { const ms = row.parents.map((q) => S.mibiById(st, q.id)); return ms.length === 2 && ms.every((m) => m && !m.released && m.genome) ? ms : null; };
// What one row's pods reach on one trait: { green, stretches: [[a, b]] (a scale), looks: [word] (a set) }.
function reachOf(st, fr, t, shape, row, land) {
  const green = row.kind === "pair";
  if (green && land) {
    if (shape === "scale") { const b = land.blends[t.id]; return b ? { green, stretches: [b.range.map((v) => scaleAt(fr, t, v))], looks: [] } : null; }
    const l = land.sets[t.id]; return l && l.length ? { green, stretches: [], looks: l } : null;
  }
  const ws = row.words.filter((w) => w.trait === t.id); if (!ws.length) return null;   // what the row already says (a found row's seen words; a pair whose parent is gone)
  return shape === "scale" ? { green, stretches: ws.map((w) => (w.at === 0 ? [0, END] : [1 - END, 1])), looks: [] } : { green, stretches: [], looks: ws.map((w) => w.word) };
}
const originWords = (row) => (row.kind === "pair" ? row.parents.map((q) => S.cap(q.name)).join(" + ") : row.kind === "line" ? S.cap(row.of ?? "a returned mibi") : S.PLACE_WORD[row.place] ?? "wild");

// The board of one kind: { species, kind (its name), pods, found, pairs, rows (the shelf's rows of the kind), chapters: [{ id, name, col, traits: [row] }], flat (the rows in the ring's order: left column then right), strip, byTrait }
//   row = { id, name, chapter, shape, ends, yours: [pos] | [index], green: [[a, b]] | [index], seen: [[a, b]] | [index], looks: [word] (a set), gold, news: [{ word, end, index }] }
export function boardOf(st, species, order = "newest") {
  const fr = species == null ? null : frameOf(species); if (!fr) return null;
  const shelf = N.shelfRows(st, order).filter((r) => r.species === species), mine = living(st, species);
  const out = { species, kind: S.cap(fr.species.name ?? ""), rows: shelf, pods: shelf.reduce((n, r) => n + r.count, 0), found: shelf.filter((r) => r.kind !== "pair").reduce((n, r) => n + r.count, 0), pairs: shelf.filter((r) => r.kind === "pair").reduce((n, r) => n + r.count, 0), chapters: [], flat: [], strip: [], byTrait: {} };
  const lands = new Map(shelf.filter((r) => r.kind === "pair").map((r) => { const ms = parentsOf(st, r); let land = null; try { land = ms ? S.landAllOf(st, ms[0], ms[1]) : null; } catch { land = null; } return [r.key, land]; }));
  const chs = fr.chapters.filter((c) => !isDoings(c) && !c.sealed), cols = boardColumns(chs);
  for (const ch of chs) {
    const group = { id: ch.id, name: ch.name, col: cols.get(ch.id), traits: [] };
    for (const t of ch.traits) {
      if (t.nature === "doing") continue;
      const shape = shapeOf(fr, t), ends = shape === "scale" ? scaleEnds(t).ends : [], reach = shelf.map((r) => ({ r, c: reachOf(st, fr, t, shape, r, lands.get(r.key)) })).filter((x) => x.c);
      const row = { id: t.id, name: t.name, chapter: ch.id, shape, ends, looks: t.looks ?? [], yours: [], green: [], seen: [], gold: false, news: [] };
      if (shape === "scale") {
        row.yours = mine.map((m) => scalePlace(fr, t, m.genome)?.shows).filter((v) => v != null);
        row.green = merge(reach.filter((x) => x.c.green).flatMap((x) => x.c.stretches)); row.seen = merge(reach.filter((x) => !x.c.green).flatMap((x) => x.c.stretches));
        for (const e of [0, 1]) {
          const hit = reach.filter((x) => x.c.stretches.some((s) => hitsEnd(s, e))); if (!hit.length || mine.some((m) => { const v = scalePlace(fr, t, m.genome)?.shows; return v != null && Math.abs(v - e) <= END; })) continue;
          row.news.push({ word: ends[e] ?? "", end: e, index: e ? 1 : 0, hits: hit.map((x) => x.r) });
        }
      } else {
        const shown = new Set(mine.map((m) => String(traitState(fr, t, m.genome)?.shows)));
        row.yours = row.looks.map((l, i) => (shown.has(String(l)) ? i : -1)).filter((i) => i >= 0);
        row.green = [...new Set(reach.filter((x) => x.c.green).flatMap((x) => x.c.looks))].map((l) => row.looks.indexOf(l)).filter((i) => i >= 0);
        row.seen = [...new Set(reach.filter((x) => !x.c.green).flatMap((x) => x.c.looks))].map((l) => row.looks.indexOf(l)).filter((i) => i >= 0);
        for (const i of new Set([...row.green, ...row.seen])) { if (row.yours.includes(i)) continue; row.news.push({ word: row.looks[i], end: null, index: i, hits: reach.filter((x) => x.c.looks.includes(row.looks[i])).map((x) => x.r) }); }
        row.news.sort((p, q) => p.index - q.index);
      }
      row.gold = row.news.length > 0;
      if (row.gold) { const keys = [...new Set(row.news.flatMap((n) => n.hits.map((r) => r.key)))]; out.byTrait[t.id] = { keys, pods: keys.reduce((n, k) => n + shelf.find((r) => r.key === k).count, 0), looks: row.news.map((n) => n.word) }; }
      group.traits.push(row);
    }
    if (group.traits.length) out.chapters.push(group);
  }
  out.flat = [0, 1].flatMap((c) => out.chapters.filter((g) => g.col === c).flatMap((g) => g.traits.map((t) => ({ ...t, col: c }))));
  // the strip: each new look a pod can bring, with its picture and which pods (the rows that hit it)
  for (const g of out.chapters) for (const row of g.traits) for (const n of row.news) {
    const pods = n.hits.reduce((s, r) => s + r.count, 0), one = n.hits.length === 1 ? n.hits[0] : null;
    const card = row.shape === "set" ? squareOf(species, row.id, n.word) : null, round = row.shape === "scale" ? roundOf(species, row.id)?.[n.end ? 2 : 0] ?? null : null;
    out.strip.push({ trait: row.id, traitName: row.name, shape: row.shape, word: n.word, green: n.hits.some((r) => r.kind === "pair"), pods, origins: n.hits.length, one: one ? { kind: one.kind, words: originWords(one) } : null, card, round, keys: n.hits.map((r) => r.key) });
  }
  out.strip.sort((p, q) => (p.shape === "set" ? 0 : 1) - (q.shape === "set" ? 0 : 1));   // the looks with a card first (the strip's two cells), then the coat ends
  return out;
}
