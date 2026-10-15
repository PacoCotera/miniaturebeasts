// The field guide's model and its pad (prototypes/ui/specs/station/library.json; station-layouts.md "Book: the guide spread"): the species whole, every chapter a column, every trait a cell with its
// found looks, the open trait and the ring's place. Rules only, no drawing and no geometry: the model comes from fieldGuide, wishOf and lookCarriers (library.mjs) and nothing is new state; the
// face draws it (L2.1), from props the view derives from this.
//   guideModel(st, id, settings) → { id, fr, cols: [{ id, name, sealed, traits: [{ id, name, looks, found, more, pinned }] }], complete }
//   guideInit(model) → g;  guideKeep(model, g) → g;  guideMove(model, st, g, dir) → g | "turn"
import * as Lib from "./library.mjs";
import { frameOf } from "./genome.mjs";

export function guideModel(st, id, settings) {
  const fr = frameOf(id), fg = Lib.fieldGuide(st, id, settings), wish = Lib.wishOf(st, id); if (!fr || !fg) return null;
  const cols = fg.chapters.map((c) => ({ id: c.id, name: c.name, sealed: c.sealed, traits: c.sealed ? [] : c.traits.map((t) => ({ id: t.id, name: t.name, looks: t.possible, found: t.found.slice().sort((a, b) => t.possible.indexOf(a) - t.possible.indexOf(b)), more: t.more, pinned: wish[t.id] ?? null })) }));
  return { id, fr, cols, complete: fg.complete };
}
const traitAt = (model, c, r) => model.cols[c]?.traits[r] ?? null;
const slotsOf = (t) => (t ? [...t.found, ...(t.more ? ["more?"] : [])] : []);
const carriersOf = (st, model, c, r, look) => { const t = traitAt(model, c, r); return t && look != null ? Lib.lookCarriers(st, model.id, t.id, look) : []; };
// The look a trait opens on: the pinned one if it is found, else the first found (an index into the plates; null with none found).
const openLook = (t) => { if (!t || !t.found.length) return null; const i = t.pinned ? t.found.indexOf(t.pinned) : -1; return i >= 0 ? i : 0; };
// Arrival: the ring on the first trait cell of the first chapter that is not sealed.
export function guideInit(model) {
  const c = Math.max(0, model.cols.findIndex((x) => !x.sealed && x.traits.length)), t = traitAt(model, c, 0);
  return { zone: "grid", col: c, row: 0, plate: 0, carrier: 0, open: { col: c, row: 0 }, look: openLook(t) };
}
// A state kept valid against the model (a read may have changed what is found).
export function guideKeep(model, g) {
  if (!g || !traitAt(model, g.open.col, g.open.row)) return guideInit(model);
  const t = traitAt(model, g.open.col, g.open.row), n = slotsOf(t).length;
  return { ...g, plate: Math.min(g.plate, Math.max(0, n - 1)), look: g.look != null && g.look < t.found.length ? g.look : openLook(t), zone: g.zone === "grid" && !traitAt(model, g.col, g.row) ? "grid" : g.zone };
}
// The pad. Grid: ▲▼ along the column (▲ from the first row to the band's first plate), ◀▶ to the same row of the previous or next column that is not sealed (◀ from the first: "turn", back to the
// face spread). Band: ◀▶ along the plates (◀ from the first plate to the last carrier name), ▼ back to the open cell. Carriers: ◀▶ along the names (▶ from the last, the first plate).
export function guideMove(model, st, g, dir) {
  const open = (c, r) => { const t = traitAt(model, c, r); return { zone: "grid", col: c, row: r, plate: 0, carrier: 0, open: { col: c, row: r }, look: openLook(t) }; };
  if (g.zone === "grid") {
    const col = model.cols[g.col];
    if (dir === "down") return g.row + 1 < col.traits.length ? { ...open(g.col, g.row + 1) } : g;
    if (dir === "up") { if (g.row > 0) return open(g.col, g.row - 1); const t = traitAt(model, g.col, g.row); return slotsOf(t).length ? { ...g, zone: "plate", plate: g.look ?? 0 } : g; }
    const step = dir === "left" ? -1 : 1; let c = g.col + step;
    while (c >= 0 && c < model.cols.length && (model.cols[c].sealed || !model.cols[c].traits.length)) c += step;
    if (c < 0) return "turn"; if (c >= model.cols.length) return g;
    return open(c, Math.min(g.row, model.cols[c].traits.length - 1));
  }
  const t = traitAt(model, g.open.col, g.open.row), slots = slotsOf(t), cars = carriersOf(st, model, g.open.col, g.open.row, g.look != null ? t.found[g.look] : null);
  if (g.zone === "plate") {
    if (dir === "down") return { ...g, zone: "grid", col: g.open.col, row: g.open.row };
    if (dir === "right") { if (g.plate + 1 >= slots.length) return g; const p = g.plate + 1; return { ...g, plate: p, look: p < t.found.length ? p : g.look }; }
    if (dir === "left") { if (g.plate > 0) { const p = g.plate - 1; return { ...g, plate: p, look: p < t.found.length ? p : g.look }; } return cars.length ? { ...g, zone: "carrier", carrier: cars.length - 1 } : g; }
    return g;
  }
  if (dir === "down") return { ...g, zone: "grid", col: g.open.col, row: g.open.row };
  if (dir === "left") return g.carrier > 0 ? { ...g, carrier: g.carrier - 1 } : g;
  if (dir === "right") return g.carrier + 1 < cars.length ? { ...g, carrier: g.carrier + 1 } : slots.length ? { ...g, zone: "plate", plate: 0 } : g;
  return g;
}
