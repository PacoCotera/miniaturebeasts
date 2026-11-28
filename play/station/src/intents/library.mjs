// The Library's intents (library.json l1.keys, l2.keys). Level 1: ✓ on a met or found cell opens that species' Level 2 (library.species) and ← goes Home with the ring on the Library bezel.
// Level 2: ✓ on a plate lights its chapter (lit) or clears it; ✓ on the face jumps to that mibi up close, on a family face to Level 3 (library.family, close on that mibi); ← clears a lit chapter, else returns to Level 1
// with the ring on this species. Level 3: ✓ Zoom in (far) to close on the ring's node; ✓ Compare from {name} (close, and compare off the held mibi) holds the ring's mibi; ✓ Look at {name} on the held mibi jumps
// to it up close; ← from far to Level 2, from close to far when the tree exceeds CLOSE's view, else to Level 2, from compare to close; in close and compare a ring move that would leave the comfort zone pans the camera. The pads are the face's (l1.focus.graph, l2.focus.<state>): the host keeps the species of Level 1's ring in ui.lib.l1 and Level 2's ring in ui.lib.cur, its memory in ui.lib.l2[species]. An unmet cell is not a target.
import * as Lib from "../library.mjs";
import { frameIds, frameOf } from "../genome.mjs";
import { speciesOf } from "../state.mjs";
import { lineageOf, targetsOf, resolveOf, fitsClose, camAt, farGeometry, camOffset, camFromOffset, panFor, nameBelow } from "../lineage.mjs";

const cellSpecies = (target) => (typeof target === "string" && target.startsWith("cell.") && frameIds().includes(target.slice(5)) ? target.slice(5) : null);
// The ring moved to a cell (the face says `cell.<SNN>`): the Library keeps its species.
export function focus(h, target) { const id = cellSpecies(target); if (id) h.ui.lib.l1 = id; }
// A way in that names a species (Home's Library bezel): Level 1 with the ring on it.
export function openAt(h, id) { if (id && frameIds().includes(id)) h.ui.lib.l1 = id; h.goto("library"); }
// Level 2 of a met or found species, in `sheet` (library.json l2.focus.initial: the ring on ui.lib.l2[species], else the first open chapter): Level 1's ✓ and "Open the guide" (Pods' figure, the card's species word).
// Level 1's ring is put on it too, so ← lands there. An unmet species has no Level 2: nothing happens.
export function openSpecies(h, id) {
  if (!id || !frameIds().includes(id) || Lib.speciesStatus(h.st, id) === "unmet") return false;
  const L = h.ui.lib; L.l1 = id; L.species = id; L.state = "sheet"; L.lit = null; L.cur = null; L.l2 ??= {};
  h.goto("library.species"); return true;
}
// `target`: `cell.<SNN>` on Level 1. ✓ opens that species' Level 2.
export function intent(h, target, verb) {
  if (verb === "back") { h.ui.home.f = "library"; h.goto("home"); return; }
  if (verb !== "confirm") return;
  const id = cellSpecies(target); if (!id) return;
  openSpecies(h, id);
}

// ---- Level 2 (library.species) ----
const chapterOf = (target) => (typeof target === "string" && target.startsWith("chapter.") ? target.slice(8) : null);
// The ring moved on Level 2: the host keeps it; in sheet its memory is written on each move, in lit the memory holds the lit chapter's plate whatever the ring is on.
function speciesFocus(h, target) {
  const L = h.ui.lib; if (!L.species) return;
  L.cur = target; L.l2 ??= {}; L.l2[L.species] = L.state === "lit" && L.lit ? "chapter." + L.lit : target;
}
// Clear the lit chapter: back to sheet with the ring on its plate.
function clear(h) { const L = h.ui.lib, ch = L.lit; L.state = "sheet"; L.lit = null; if (ch) { L.cur = "chapter." + ch; L.l2[L.species] = L.cur; } }
function speciesIntent(h, target, verb) {
  const L = h.ui.lib, sid = L.species; if (!sid || !frameOf(sid)) return;
  if (verb === "back") { if (L.state === "lit") { clear(h); return; } L.l1 = sid; h.goto("library"); return; }
  if (verb !== "confirm" || Lib.speciesStatus(h.st, sid) !== "found") return;   // met-only: no ✓
  const ch = chapterOf(target);
  if (ch) {
    if (!frameOf(sid).chapters.some((c) => c.id === ch)) return;
    if (L.state === "lit" && L.lit === ch) { clear(h); return; }   // ✓ Clear {Chapter}
    L.state = "lit"; L.lit = ch; L.cur = target; L.l2 ??= {}; L.l2[sid] = target; return;   // ✓ Show {Chapter}: the ring stays on the plate; the lit variant and the page are asked for (the props)
  }
  if (target === "face") { const m = Lib.visitFace(h.st, sid); if (m) { h.ui.hab.id = m.id; h.ui.hab.f = "resident"; h.goto("habitat"); } return; }   // ✓ Look at {name}: that mibi up close (none when released)
  if (typeof target === "string" && target.startsWith("family.")) { openFamily(h, +target.slice(7)); return; }   // ✓ See the family: Level 3, close on that mibi
  // the wish: no ✓ until pinning has a screen (its line names none); a look disc: no ✓
}
export const species = { intent: speciesIntent, focus: speciesFocus };

// ---- Level 3 (library.family) ----
// The lineage of the shown species (lineage.mjs, l3.block.gap) and the dither a zoom plays (the 180 ms stage dither, as Create's panel; none under reduced motion).
const below = (h) => nameBelow(h.specs.library.l3.close, h.specs.frame);
const lineage = (h, sid) => lineageOf(h.st, sid, { gap: h.specs.library.l3.block.gap });
const zoomDither = (h) => { if (h.motion ? h.motion() : true) h.play({ kind: "dither", target: "stage", ms: 180, hold: 180 }); };
// A way in (Level 2's family face, the Vivarium's up-close card): Level 3 of that mibi's species in close, the ring on it and the camera centring it in the comfort zone (l3.close.camera). Its parent is Level 2 of
// that species whichever way it was entered (stack navigation). A mibi not in the save opens nothing.
export function openFamily(h, mibiId) {
  const m = h.st.mibis.find((x) => x.id === mibiId), sid = m && speciesOf(m); if (!m || !frameIds().includes(sid) || Lib.speciesStatus(h.st, sid) !== "found") return false;
  const L = h.ui.lib, node = "node." + m.id; L.species = sid; L.l1 = sid; L.state = "sheet"; L.lit = null; L.cur = null; L.l3 ??= {}; L.l3last = null;
  const lin = lineage(h, sid), C = h.specs.library.l3.close; L.l3[sid] = { node, zoom: "close", cam: camOffset(lin, node, C, camAt(lin, node, C, null, below(h))), pan: null };   // the camera kept as an offset from its node
  h.goto("library.family"); return true;
}
// The ring moved on Level 3: its node is kept for both zooms; a move that lands on the parent the host answered for the last node is a ▲ (l3.focus.selectors.host), which the next selectors read.
// In close the host owns the camera (l3.close.camera): when the new node's box would lie outside the comfort zone, the camera moves the least whole pixels that bring it back and the pan plays
// (l3.close.pan: its steps; none under reduced motion, a cut to the new camera); the camera is kept as an offset from the new node.
function familyFocus(h, target) {
  const L = h.ui.lib, mem = L.l3?.[L.species]; if (!mem || typeof target !== "string" || !target.startsWith("node.")) return;
  const lin = lineage(h, L.species), r = resolveOf(lin, mem.node, mem.zoom, L.l3last); L.l3last = r["node.parent"] === target ? { up: mem.node } : null;
  if ((mem.zoom === "close" || mem.zoom === "compare") && lin.nodes.some((n) => n.id === target)) {
    const C = h.specs.library.l3.close, from = Array.isArray(mem.cam) ? camFromOffset(lin, mem.node, C, mem.cam) : camAt(lin, mem.node, C, null, below(h)), to = fitsClose(lin, C, below(h)) ? [...from] : panFor(lin, target, C, from), moved = to[0] !== from[0] || to[1] !== from[1];
    mem.pan = null;
    if (moved && (h.motion ? h.motion() : true)) { const P = C.pan; mem.pan = { from, to }; h.play({ kind: P.kind, target: P.target, from, to, steps: P.steps, frac: P.frac }); }
    mem.cam = camOffset(lin, target, C, to);
  }
  mem.node = target;
}
// ✓ Zoom in (far): close on the ring's node, put where its FAR dot was on screen, clamped into the comfort zone. ✓ in close on a mibi (released ones too): compare, that mibi held; in compare on another mibi: the hold
// moves to it; in compare on the held mibi: that mibi up close (Habitat), nothing when it is released (the hold stays). The bud has no ✓. ← in far: Level 2 of the species; in close: far when the tree exceeds
// CLOSE's view, else Level 2; in compare: close (stop comparing), the camera and the ring kept.
function familyIntent(h, target, verb) {
  const L = h.ui.lib, sid = L.species, mem = L.l3?.[sid]; if (!sid || !frameOf(sid) || !mem) return;
  const S3 = h.specs.library.l3, lin = lineage(h, sid);
  if (verb === "back") {
    if (mem.zoom === "compare") { mem.zoom = "close"; mem.held = null; mem.pan = null; return; }
    if (mem.zoom === "close" && !fitsClose(lin, S3.close, below(h))) { mem.zoom = "far"; mem.pan = null; L.l3last = null; zoomDither(h); return; }
    L.state = "sheet"; L.lit = null; L.cur = null; h.goto("library.species"); return;
  }
  if (verb !== "confirm" || !targetsOf(lin).includes(target)) return;
  if (mem.zoom === "close" || mem.zoom === "compare") {
    const n = lin.nodes.find((q) => q.id === target); if (n?.kind !== "mibi") return;   // the bud: no ✓
    if (mem.zoom === "compare" && mem.held === target) { const m = h.st.mibis.find((x) => x.id === n.mibi); if (m && !m.released) { h.ui.hab.id = m.id; h.ui.hab.f = "resident"; h.goto("habitat"); } return; }   // ✓ Look at {name}
    mem.zoom = "compare"; mem.held = target; mem.pan = null; return;   // ✓ Compare from {name}: holds it (or moves the hold)
  }
  if (mem.zoom !== "far") return;
  const g = farGeometry(lin, h.specs.library), b = g.boxes[target], o = S3.far.rect;
  mem.node = target; mem.zoom = "close"; mem.cam = camOffset(lin, target, S3.close, camAt(lin, target, S3.close, [o[0] + b[0] + b[2] / 2, o[1] + b[1] + b[3] / 2], below(h))); mem.pan = null; L.l3last = null; zoomDither(h);
}
export const family = { intent: familyIntent, focus: familyFocus };
