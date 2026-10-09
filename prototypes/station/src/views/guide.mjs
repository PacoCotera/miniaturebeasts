// The Book's guide spread (prototypes/ui/specs/station/library.json; station-layouts.md "Book: the guide spread"): the species whole, every chapter a column, every trait a cell with its pips, one
// detail band for the open trait. Pure: the model comes from fieldGuide, wishOf and lookCarriers (library.mjs) and nothing is new state; the view turns it into rects, text and 1 px lines, and
// asks for the pictures (the panels, the face, the seal, the pips, the marks, the look plates) by id; the screen draws one only where it is signed.
//   guideModel(st, id, settings) → { id, fr, cols: [{ id, name, sealed, traits: [{ id, name, looks, found, more, pinned }] }], complete, pinnedChapters }
//   guideInit(model) → g;  guideMove(model, st, g, dir) → g | "turn";  guideView(m, spec, ctx) → { nodes, masters, tints, targets, line, ring, g }
import * as S from "../state.mjs";
import * as Lib from "../library.mjs";
import { SIZES } from "../../../ui/type.mjs";
import { frameOf } from "../genome.mjs";

const rect = (id, x, y, w, h, colour) => ({ id, kind: "rect", rect: [x, y, w, h], colour });
const txt = (ctx, id, str, x, y, px, colour, align = "left") => { const w = Math.round(ctx.measure(str, px)); return { id, kind: "text", rect: [align === "center" ? x - Math.round(w / 2) : align === "right" ? x - w : x, y, w, ctx.line(px)], text: str, px, weight: SIZES[px], colour, align: "left" }; };
const box = (id, [x, y, w, h], colour) => [rect(id + ".t", x, y, w, 1, colour), rect(id + ".b", x, y + h - 1, w, 1, colour), rect(id + ".l", x, y, 1, h, colour), rect(id + ".r", x + w - 1, y, 1, h, colour)];
// A 1 px line dashed on/off along it (the last dash cut to the length), as Cross draws its dashed edges: short rects.
function dashes(id, x, y, len, colour, on, off, vertical) {
  const out = []; for (let o = 0, k = 0; o < len; o += on + off, k++) { const l = Math.min(on, len - o); out.push(rect(`${id}.${k}`, vertical ? x : x + o, vertical ? y + o : y, vertical ? 1 : l, vertical ? l : 1, colour)); }
  return out;
}
const dashedBox = (id, [x, y, w, h], colour, on, off) => [...dashes(id + ".t", x, y, w, colour, on, off, false), ...dashes(id + ".b", x, y + h - 1, w, colour, on, off, false), ...dashes(id + ".l", x, y, h, colour, on, off, true), ...dashes(id + ".r", x + w - 1, y, h, colour, on, off, true)];
export const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const MASTER_UNTIL = "the field guide masters (station-layouts.md, Masters for the guide)";

// The columns: 128 wide on a 136 pitch for up to seven chapters, 112 on a 120 for eight (never a scroll; more than eight comes back to the UI designer, and is laid out at the eight-chapter width).
export function guideLayout(n, spec) {
  const C = spec.regions.columns, c = n <= 7 ? C.upToSeven : C.eight, w = c.w, pitch = c.pitch, x0 = Math.floor((512 - (pitch * n - 8) / 2) / 8) * 8;
  return { w, pitch, x0, x: (i) => x0 + pitch * i, top: C.top, bottom: C.bottom, panel: n <= 7 ? "upToSeven" : "eight" };
}
// The tint's lattice: inside the panel, from its own origin, every pixel whose (x mod 4, y mod 4) is (0, 0) or (2, 2), for y 3 to 78 and x 1 to w - 2: one pixel in eight.
export function tintMask(w, h = 80) {
  const m = new Uint8Array(w * h);
  for (let y = 3; y <= 78 && y < h; y++) for (let x = 1; x <= w - 2; x++) if ((x % 4 === 0 && y % 4 === 0) || (x % 4 === 2 && y % 4 === 2)) m[y * w + x] = 255;
  return m;
}
// The species' colour: its first pod pigment through cross.json's pigmentChips; a pigment not listed tints `mist`.
export const tintOf = (fr, chips) => chips[fr.pod?.colourPair?.[0]?.pigment] ?? "mist";

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

// "Carried by": at most two lines of names in `maxW`, a comma after every name but the last shown. When not every name fits, names are dropped from the end until the rest and "and more" fit, and
// "and more" (no comma before it) follows the last name shown, on line 2 if it does not fit on line 1; never a third line.
export function carriedLines(ctx, names, maxW, pitch, more = "and more") {
  const m = (t) => Math.round(ctx.measure(t, 16)), sp = m(" ");
  const tryK = (k) => {
    const out = []; let line = 0, x = 0;
    for (let q = 0; q < k; q++) {
      const word = names[q] + (q < k - 1 ? "," : ""), w = m(word), gap = x ? sp : 0;
      if (x && x + gap + w > maxW) { line++; x = 0; } if (line > 1 || w > maxW) return null;
      const px = x ? x + gap : 0; out.push({ q, word, x: px, line, w, nameW: m(names[q]) }); x = px + w;
    }
    if (k === names.length) return { names: out, more: null };
    const w = m(more), gap = x ? sp : 0; if (x && x + gap + w > maxW) { line++; x = 0; } if (line > 1 || w > maxW) return null;
    return { names: out, more: { x: x ? x + gap : 0, line } };
  };
  for (let k = names.length; k >= 0; k--) { const r = tryK(k); if (r) return r; }
  return { names: [], more: { x: 0, line: 0 } };
}

export function guideView(m, spec, ctx) {
  const { st, settings, id, frame: fr, g } = m, model = m.model, R = spec.regions, nodes = [], masters = [], tints = [], targets = [];
  const master = (mid, rc) => { masters.push({ id: `${mid}:${rc[2]}x${rc[3]}`, master: mid, rect: rc, until: MASTER_UNTIL }); };
  const sp = id, name = fr.species.name, plural = fr.species.plural ?? name;
  // the fold-out and the head: face, name, species line, the seal
  master("library-foldout-1008x504", R.boards.rect.slice());
  nodes.push(...box("fold", R.foldout.rect, "clay"));
  master(`guide-face-${sp}-128x112`, R.face.rect.slice());
  nodes.push(txt(ctx, "name", name, R.name.rect[0], R.name.rect[1], 28, R.name.colour));
  spec.strings.speciesLine.forEach((l, i) => nodes.push(txt(ctx, "line." + i, l.replace("{species}", name).replace("{plural}", plural), R.speciesLine.rect[0], R.speciesLine.rect[1] + i * R.speciesLine.pitch, 16, R.speciesLine.colour)));
  if (model.complete) master("guide-seal-32", R.seal.rect.slice());
  // the columns
  const L = guideLayout(model.cols.length, spec), P = R.panel, tint = tintOf(fr, m.chips);
  model.cols.forEach((c, i) => {
    const x = L.x(i), w = L.w, py = L.top, rc = [x, py, w, 80];
    if (i > 0) nodes.push(rect(`rule.${i}`, L.x(i) - 4, R.columns.rules.y[0], 1, R.columns.rules.y[1] - R.columns.rules.y[0], R.columns.rules.colour));
    nodes.push(rect(`panel.${i}`, x, py, w, 80, P.ground));
    const word = c.id === "legs-tail" && m.legsHeading ? m.legsHeading : c.name;   // the string table's heading for Legs & tail, the frame's chapter name as written for the rest; never recased
    if (c.sealed) { master(`guide-panel-sealed-${w}x80`, rc); master(`rail-emblem-${c.id}-sealed-24x24`, [x + w / 2 - 12, py + 8, 24, 24]); nodes.push(txt(ctx, `panel.${i}.word`, word, x + w / 2, 240, 16, "mist", "center")); return; }
    const tid = `tint:${w}:${tint}`; if (!tints.some((q) => q.id === tid)) tints.push({ id: tid, w, h: 80, colour: tint });
    nodes.push({ id: `panel.${i}.tint`, kind: "sprite", rect: rc, asset: tid }, rect(`panel.${i}.band`, x + 1, py + 1, w - 2, 2, tint));
    master(`guide-panel-${c.id}-${w}x80`, rc);
    nodes.push(txt(ctx, `panel.${i}.word`, word, x + w / 2, 240, 16, P.word?.colour ?? "ink", "center"));
    c.traits.forEach((t, r) => {
      const y = 272 + 40 * r, opened = g.open.col === i && g.open.row === r, k = `cell.${i}.${r}`;
      if (opened) nodes.push(...box(k + ".open", [x - 2, y - 4, w + 4, 40], "clay"));
      nodes.push(txt(ctx, k + ".name", t.name, x, y, 16, "ink"));
      if (t.pinned) master("wish-mark-12", [x + w - 12, y + 4, 12, 12]);
      const total = t.looks.length;
      for (let q = 0; q < total; q++) { const px = x + 8 * q + 4 * Math.floor(q / 5), py2 = y + 24; if (q < t.found.length) nodes.push(rect(`${k}.pip.${q}`, px, py2, 6, 6, "bark")); else master("guide-pip-unseen-6x6", [px, py2, 6, 6]); }
      targets.push({ id: k, kind: "cell", col: i, row: r, rect: [x, y - 2, w, 36], trait: t });
    });
  });
  // the detail band: the open trait's name, its plates, the mibis that carry the open look
  const D = R.detail, ot = traitAt(model, g.open.col, g.open.row);
  nodes.push(...box("detail", D.rect, D.edge));
  let carriers = [];
  if (ot) {
    nodes.push(txt(ctx, "detail.trait", ot.name, D.trait.rect[0], D.trait.rect[1], 20, D.trait.colour));
    const slots = slotsOf(ot), few = slots.length <= 6, PL = few ? D.plates.upToSix : D.plates.sevenOrMore, [sw, sh] = PL.size, openLookName = g.look != null ? ot.found[g.look] : null;
    slots.forEach((look, k) => {
      const isMore = look === "more?" && k === ot.found.length && ot.more, row = few ? 0 : Math.floor(k / PL.perRow), col = few ? k : k % PL.perRow, x = D.plates.rect[0] + col * PL.pitch, y = PL.rows[row];
      const rc = isMore ? [x, y, ...(few ? [sw, sh] : PL.moreSize)] : [x, y, sw, sh];
      if (isMore) { nodes.push(...dashedBox(`plate.${k}`, rc, D.plates.more.border, D.plates.more.dash[0], D.plates.more.dash[1])); nodes.push(txt(ctx, `plate.${k}.word`, spec.strings.more, rc[0] + Math.round(rc[2] / 2), rc[1] + Math.round((rc[3] - ctx.line(16)) / 2), 16, D.plates.more.colour, "center")); }
      else {
        nodes.push(...box(`plate.${k}.key`, [rc[0] - 1, rc[1] - 1, rc[2] + 2, rc[3] + 2], "bark"));   // the keyline: drawn whether or not the master is signed
        master(`trait-${sp}-${ot.id}-${slug(look)}-${sw}x${sh}`, rc);
        if (k === g.look) nodes.push(rect(`plate.${k}.open`, rc[0], rc[1] + rc[3] + 2, rc[2], 2, "clay"));
        if (ot.pinned === look) master("wish-mark-12", [rc[0] + rc[2] - 12 - 2, rc[1] + 2, 12, 12]);
      }
      targets.push({ id: isMore ? "more" : `plate.${k}`, kind: isMore ? "more" : "plate", index: k, rect: rc, look: isMore ? null : look });
    });
    // "Carried by", then the names, two lines at most, each a target
    nodes.push(txt(ctx, "carried", spec.strings.carriedBy, D.carried.rect[0], D.carried.label.capTop, 16, D.carried.label.colour));
    carriers = openLookName != null ? Lib.lookCarriers(st, id, ot.id, openLookName) : [];
    if (!carriers.length) nodes.push(txt(ctx, "carried.none", spec.strings.carriedNone, D.carried.names.x[0], D.carried.names.capTops[0], 16, "stone"));
    else {
      const N = D.carried.names, tops = N.capTops, x0 = N.x[0], placed = carriedLines(ctx, carriers.map((c) => c.name), N.x[1] - N.x[0], 0), put = placed.names.map((p) => ({ ...p, px: x0 + p.x, py: tops[p.line] }));
      if (placed.more) nodes.push(txt(ctx, "carried.more", spec.strings.carriedMore, x0 + placed.more.x, tops[placed.more.line], 16, N.overflow.colour));
      put.forEach((p) => { nodes.push(txt(ctx, `carried.${p.q}`, p.word, p.px, p.py, 16, "ink")); targets.push({ id: `carrier.${p.q}`, kind: "carrier", index: p.q, rect: [p.px, p.py, p.nameW, 20], mibi: carriers[p.q] }); });
    }
  }
  // the ring, and the bottom line
  const focusId = g.zone === "grid" ? `cell.${g.col}.${g.row}` : g.zone === "plate" ? (slotsOf(ot)[g.plate] === "more?" && g.plate === ot.found.length && ot.more ? "more" : `plate.${g.plate}`) : `carrier.${g.carrier}`;
  const cur = targets.find((t) => t.id === focusId) ?? null, ring = cur ? cur.rect.slice() : null;
  let line = { back: "Library", need: m.podCarries ? spec.strings.wishPod : null, subject: "" };
  if (cur && cur.kind === "cell") line.subject = (cur.trait.more ? spec.strings.cellMore : spec.strings.cellComplete).replace("{trait}", cur.trait.name);
  else if (cur && cur.kind === "more") line.subject = spec.strings.cellMore.replace("{trait}", ot.name);
  else if (cur && cur.kind === "plate") {
    line.subject = spec.strings.plate.replace("{trait}", ot.name).replace("{look}", cur.look);
    const pinned = ot.pinned === cur.look, block = Lib.wishPinBlock(st, id, ot.id, cur.look, settings);
    if (pinned) line.ok = spec.strings.unpinWish; else if (!block) line.ok = spec.strings.addWish;
  } else if (cur && cur.kind === "carrier") { line.ok = spec.strings.visit.replace("{mibi}", cur.mibi.name); line.subject = spec.strings.carrier.replace("{mibi}", cur.mibi.name); }
  return { nodes, masters, tints, targets, line, ring, focus: focusId, carriers };
}
