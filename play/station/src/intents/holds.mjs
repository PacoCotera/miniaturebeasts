// What the pods hold: its keys (station step 9-1; the accepted walk-4 picture 13). The blue key in the nursery opens the board; the blue key again or ← returns to the shelf, the ring where it was. The pad moves the ring over the
// rows (down and up through the left column and then the right; left and right cross to the other column); ✓ on a row whose pods could bring a new look ("Show the pods") opens the nursery's shelf with only those rows,
// and ← there returns to the board on the same row. Nothing here changes the save: a pod is never read.
import * as N from "../nursery.mjs";
import { ringOf } from "../views/nursery-props.mjs";
import { holdsOf } from "../views/holds-props.mjs";
import { boardKind } from "../nursery-board.mjs";
import { fill } from "../views/words.mjs";

const pods = (h) => h.ui.pods;

// The blue key in the nursery: the board for the kind of the row the ring is on (else the first row, else your first mibi).
export function openHolds(h) {
  const p = pods(h), rows = N.shelfRows(h.st, p.order ?? "newest"), kind = boardKind(h.st, rows, ringOf(h.st, p, rows));
  p.view = "holds"; p.only = null; p.holdKind = kind; p.hold = { i: 0 }; p.ringBefore = null;
}
// ← or the blue key on the board: the shelf, the ring where it was (p.ring was never touched).
export function closeHolds(h) { const p = pods(h); p.view = "nursery"; p.only = null; p.holdKind = null; }
// ← on the filtered shelf: the board, on the row "Show the pods" was pressed on, and the shelf's ring put back.
export function backToHolds(h) { const p = pods(h), o = p.only; p.view = "holds"; p.hold = { i: o?.holdI ?? 0 }; p.only = null; if (p.ringBefore !== undefined) p.ring = p.ringBefore; p.ringBefore = null; p.first = 0; }

export function holdsIntent(h, target, verb) {
  const p = pods(h);
  if (verb === "back") return closeHolds(h);
  const { board, i, row } = holdsOf(h.st, p); if (!board) return;
  if (verb && verb.startsWith("step:")) {
    const d = verb.slice(5), n0 = board.flat.filter((r) => r.col === 0).length, n = board.flat.length;
    if (d === "down") p.hold = { i: Math.min(n - 1, i + 1) };
    else if (d === "up") p.hold = { i: Math.max(0, i - 1) };
    else if (d === "right" && i < n0 && n > n0) p.hold = { i: n0 + Math.min(i, n - n0 - 1) };
    else if (d === "left" && i >= n0) p.hold = { i: Math.min(i - n0, n0 - 1) };
    return;
  }
  if (verb !== "confirm" || !row) return;
  const news = board.byTrait[row.id], Sg = h.specs.pods.strings.nursery.holds;
  if (!news) return h.say(fill(Sg.noNew, { trait: row.name }));
  p.ringBefore = p.ring; p.only = { trait: row.id, name: row.name, keys: news.keys, holdI: i };   // "Show the pods": the shelf with only the rows whose pods could bring that look
  p.view = "nursery"; p.ring = { z: "shelf", i: 0 }; p.first = 0;
}
