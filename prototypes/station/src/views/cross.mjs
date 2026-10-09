// The Cross screen's view: the splice (prototypes/ui/specs/station/cross.json, station-layouts.md "Cross: the splice") as plain scene nodes, from the forecast and nothing else.
// It draws rects, text and 1 px lines, and names the pictures it needs (the parents' portraits, the child's ghost, the trait pictures, every master) as requests and placements;
// the screen registers them and draws a master only when its picture is signed. Nothing of an unread chapter is ever drawn: the forecast carries a missing trait with no copy, seed or
// range, and the view draws only its frost and the words "read {parent}'s {chapter}".
//   crossView(m, spec, ctx, frameSpec) → { nodes, masters: [{ id, master, rect }], pictures: [{ id, rect, kind, ... }], line, ring, glints, state, chapters }
//   m: { st, settings, a, b, fc (forecastOf or null), block (crossBlock), partners, away: { a, b }, state: 0 (the overview) | n (the nth chapter, in ring order), wish (wishForecast or null) }
import * as S from "../state.mjs";
import { SIZES } from "../../../ui/type.mjs";
import { overviewPlan, chapterPlan } from "../cross-layout.mjs";
import { fourSlots, traitLocusCount, chapterLocusCount } from "../splice.mjs";

const rect = (id, x, y, w, h, colour) => ({ id, kind: "rect", rect: [x, y, w, h], colour });
// Text at a size, left, centred or right of x; y is the top of the run's box.
const txt = (ctx, id, str, x, y, px, colour, align = "left") => { const w = Math.round(ctx.measure(str, px)); return { id, kind: "text", rect: [align === "right" ? x - w : align === "center" ? x - Math.round(w / 2) : x, y, w, ctx.line(px)], text: str, px, weight: SIZES[px], colour, align: "left" }; };
// A 1 or 2 px line, dashed on/off along it (the last dash cut to the length), or solid when off is 0.
function line(id, x, y, len, thick, colour, { on = 0, off = 0, vertical = false } = {}) {
  const out = [], put = (o, l, k) => out.push(rect(`${id}.${k}`, vertical ? x : x + o, vertical ? y + o : y, vertical ? thick : l, vertical ? l : thick, colour));
  if (!on || !off) { put(0, len, 0); return out; }
  for (let o = 0, k = 0; o < len; o += on + off, k++) put(o, Math.min(on, len - o), k);
  return out;
}
const box = (id, [x, y, w, h], colour) => [rect(id + ".t", x, y, w, 1, colour), rect(id + ".b", x, y + h - 1, w, 1, colour), rect(id + ".l", x, y, 1, h, colour), rect(id + ".r", x + w - 1, y, 1, h, colour)];
const dashedBox = (id, [x, y, w, h], colour, on, off) => [...line(id + ".t", x, y, w, 1, colour, { on, off }), ...line(id + ".b", x, y + h - 1, w, 1, colour, { on, off }), ...line(id + ".l", x, y, h, 1, colour, { on, off, vertical: true }), ...line(id + ".r", x + w - 1, y, h, 1, colour, { on, off, vertical: true })];
const MASTER_UNTIL = "the Cross masters (station-layouts.md, Masters on Cross)";
const sideWord = (parents, chapterName, names) => (parents.length > 1 ? `read both parents' ${chapterName}` : `read ${names[0]}'s ${chapterName}`);
// The first missing read in ring order, for the notice.
export const firstMissingWords = (fc) => (fc && fc.firstMissing ? sideWord(fc.firstMissing.parents, fc.firstMissing.chapterName, fc.firstMissing.names) : null);

// A seed's fill: a pigment's chip colour (a pair split in two halves) when the look names pigments, else a grey by its place among the locus's looks.
function seedFills(label, order, C) {
  const parts = String(label).split(" and "), chips = parts.map((p) => C.pigmentChips[p]);
  if (chips.every(Boolean)) return chips;
  return [C.seedLookFills[Math.max(0, order.indexOf(label)) % C.seedLookFills.length]];
}
const lookOrder = (seeds) => [...new Set(seeds.map((s) => s.label))];

export function crossView(m, spec, ctx, frameSpec) {
  const { a, b, fc, block, state } = m, R = spec.regions, C = spec.colours, nodes = [], masters = [], pictures = [], glints = new Set();
  const wishOf = (traitId) => (m.wish ? m.wish.pinned.find((p) => p.trait === traitId) : null);
  const master = (id, rect) => { masters.push({ id: `${id}:${rect[2]}x${rect[3]}`, master: id, rect, until: MASTER_UNTIL }); };
  const chapters = fc ? fc.chapters : [], nState = chapters.length, at = Math.max(0, Math.min(state ?? 0, nState)), open = at === 0 ? null : chapters[at - 1];
  const overview = at === 0, heads = overview ? R.heads.overview : R.heads.chapter;
  // --- the heads: the pick (left), the partner (right, the focus ring), the child to be between them with its kinship pill ---
  const head = (side, mibi, away, h, id) => {
    const right = side === "b", px = h.portrait[0];
    if (!mibi) { nodes.push(...box(id + ".none", h.portrait, "slate")); }
    else { pictures.push({ kind: "portrait", id: `xp:${mibi.id}:${mibi.sha}`, mibi: mibi.id, rect: h.portrait.slice() }); if (away) for (let y = 0; y < 48; y += 2) nodes.push(rect(`${id}.veil.${y}`, px, h.portrait[1] + y, 48, 1, "stone")); }
    if (mibi) nodes.push(txt(ctx, id + ".name", mibi.name, right ? 952 : h.name[0], h.name[1], 20, "bone", right ? "right" : "left"));
    const words = !mibi ? (right ? "no adult of its kind" : "") : away ? "away with you" : right ? (m.partners.length ? "◀ ▶ picks one" : "no adult of its kind") : S.spName(mibi);
    if (words) nodes.push(txt(ctx, id + ".line", words, right ? 952 : h.line[0], h.line[1], 16, "mist", right ? "right" : "left"));
  };
  head("a", a, m.away.a, heads.a, "head.a"); head("b", b, m.away.b, heads.b, "head.b");
  if (b) pictures.push({ kind: "ghost", id: `xg:${a.id}:${a.sha}`, mibi: a.id, rect: heads.child.ghost.slice() });
  nodes.push(txt(ctx, "head.child", "the child to be", heads.child.words[0], heads.child.words[1], 16, "bone"));
  if (fc) { const w = S.kinshipWord(fc.kinship), pw = Math.round(ctx.measure(w, 16)) + 16, [kx, ky] = heads.child.kin; nodes.push(rect("head.kin", kx, ky, pw, 24, C.kinship), txt(ctx, "head.kin.word", w, kx + 8, ky + 2, 16, "ink")); }
  const ring = [...heads.b.ring.slice(0, 2), heads.b.ring[2], heads.b.ring[3]];
  // --- the chapters, drawn by the state ---
  if (fc && b) {
    if (overview) overviewNodes(m, spec, ctx, fc, nodes, masters, pictures, master, wishOf, glints);
    else chapterNodes(m, spec, ctx, fc, open, nodes, masters, pictures, master, wishOf, glints);
  }
  // --- the bottom line: ✓ Cross them · price | context | notice | ← Habitat ---
  const cost = S.crossCost(m.settings), can = S.canPay(m.st, cost.e, cost.d, cost.s), species = a ? S.spName(a) : "";
  const context = !b ? "" : overview ? `${a.name} × ${b.name} · ${S.cap(species)}` : `${open.name} · ${a.name} × ${b.name}`;
  const notice = !b ? "no adult of its kind to pair" : block ? block : firstMissingWords(fc) ?? (fc && fc.kinship > 0 ? S.kinshipWord(fc.kinship) : null);
  const lineOut = !b || block ? { back: "Habitat", subject: context, need: notice } : { ok: "Cross them", price: can ? S.priceText(cost.e, cost.d, cost.s) : S.shortText(m.st, cost.e, cost.d, cost.s), dim: !can, back: "Habitat", subject: context, need: notice };
  return { nodes, masters, pictures, line: lineOut, ring, glints, state: at, chapters, open };
}

// ================================================ the overview ================================================
function overviewNodes(m, spec, ctx, fc, nodes, masters, pictures, master, wishOf, glints) {
  const R = spec.regions, O = R.overview, C = spec.colours, K = fc.kinship;
  const lociOf = (c) => fc.traits.filter((t) => t.chapter === c.id).flatMap((t) => (t.splice ? t.splice.loci.map((l) => ({ ...l, trait: t.trait })) : Array.from({ length: traitLocusCount(m.frame, t.trait) }, (_, i) => ({ id: t.trait + "#" + i, trait: t.trait, play: false }))));
  const sealedLoci = (c) => chapterLocusCount(m.frame, c.id);
  const plan = overviewPlan(planInput(fc, lociOf, sealedLoci), spec);
  for (const c of plan.chapters) {
    const info = fc.chapters.find((x) => x.id === c.id), id = "ov." + c.id, pid = (m.wish?.pinned || []).filter((p) => info.traits.includes(p.trait));
    // the modules, one a side
    for (const [side, x] of [["a", O.moduleA[0]], ["b", O.moduleB[0]]]) {
      const lacks = info.state === "unread" && info.lacking.some((l) => l.parent === side), edge = "bevel", w = O.moduleA[1], mr = [x, c.y, w, c.h];
      nodes.push(rect(`${id}.${side}`, x, c.y, w, c.h, "panel"));
      if (info.state === "sealed") for (let y = 4; y < c.h - 1; y += 4) nodes.push(rect(`${id}.${side}.slat.${y}`, x + 1, c.y + y, w - 2, 1, "bar"));
      nodes.push(...(lacks ? dashedBox(`${id}.${side}.edge`, mr, "frostS", 3, 2) : box(`${id}.${side}.edge`, mr, edge)));
      nodes.push(txt(ctx, `${id}.${side}.word`, info.name, side === "a" ? x + 8 : x + w - 8, c.y + 2, 16, info.state === "open" ? "bone" : "mist", side === "a" ? "left" : "right"));
    }
    if (info.state === "sealed") {
      for (const row of c.rows) { const y = row.y + 1; nodes.push(...line(`${id}.sa.${row.id}`, 128, y, 248, 1, "hairline", { on: 1, off: 2 }), ...line(`${id}.sb.${row.id}`, 648, y, 248, 1, "hairline", { on: 1, off: 2 })); }
      const col = O.child; nodes.push(rect(`${id}.col`, col[0], c.y, col[1], c.h, "panel"));
      for (let y = 4; y < c.h - 1; y += 4) nodes.push(rect(`${id}.col.slat.${y}`, col[0] + 1, c.y + y, col[1] - 2, 1, "bar"));
      const kind = info.findKind; if (kind) master(`find-${kind}-16x16`, [col[0] + 8, c.y + Math.round((c.h - 16) / 2), 16, 16]);
      nodes.push(txt(ctx, `${id}.col.word`, `sealed · ${info.opensWith}`, col[0] + 8 + 16 + 8, c.y + Math.round((c.h - ctx.line(16)) / 2), 16, "mist"));
      continue;
    }
    if (info.state === "unread") {
      const lackSides = new Set(info.lacking.map((l) => l.parent));
      for (const row of c.rows) for (const [side, x0, w] of [["a", 128, 248], ["b", 648, 248]]) {
        const y = row.y + 1; nodes.push(...(lackSides.has(side) ? line(`${id}.u${side}.${row.id}`, x0, y, w, 1, "frostS", { on: 3, off: 2 }) : line(`${id}.u${side}.${row.id}`, x0, y, w, 1, "bevel")));
      }
      const col = O.child; nodes.push(rect(`${id}.col`, col[0], c.y, col[1], c.h, C.missing.fill));
      nodes.push(txt(ctx, `${id}.col.word`, sideWord(info.lacking.map((l) => l.parent), info.name, info.lacking.map((l) => l.name)), col[0] + 8, c.y + Math.round((c.h - ctx.line(16)) / 2), 16, C.missing.word));
      continue;
    }
    // an open chapter: rows at play are wired through a gate to the child; the rest are one hairline
    const byId = new Map(lociOf(info).map((l) => [l.id, l])); let wished = false;
    for (const row of c.rows) {
      const l = byId.get(row.id); if (!l) continue;
      if (!row.play) { nodes.push(rect(`${id}.s.${row.id}`, 128, row.y + 1, 768, 1, C.wire.settled)); continue; }
      const cy = row.y + Math.floor(row.h / 2), kindColour = l.kind === "switch" ? C.wire.switch : C.wire.blend, rid = `${id}.${row.id}`;
      for (const [side, x0, gx] of [["a", 128, O.gateA[0]], ["b", 896, O.gateB[0] + O.gateB[1]]]) for (let i = 0; i < 2; i++) {
        const hid = l.hides[side][i], wy = cy + (i === 0 ? -3 : 1), len = side === "a" ? gx - x0 : x0 - gx;
        nodes.push(...line(`${rid}.${side}${i}`, side === "a" ? x0 : gx, wy, len, 2, kindColour, hid ? { on: 4, off: 2 } : {}));
      }
      master(`cross-gate-${l.kind}-8x8`, [O.gateA[0], cy - 4, 8, 8]); master(`cross-gate-${l.kind}-8x8`, [O.gateB[0], cy - 4, 8, 8]);
      if (l.kind === "switch") {
        nodes.push(rect(`${rid}.oa`, O.gateA[0] + 8, cy - 1, O.seeds.x - (O.gateA[0] + 8), 2, kindColour), rect(`${rid}.ob`, O.seeds.x + 44, cy - 1, O.gateB[0] - (O.seeds.x + 44), 2, kindColour));
        const order = lookOrder(l.seeds), pin = wishOf(l.trait), lead = m.frame.chapters.flatMap((x) => x.traits).find((t) => t.id === l.trait)?.loci[0] === l.id;
        fourSlots(l.seeds).forEach((s, k) => {
          const sx = O.seeds.x + k * O.seeds.pitch, fills = seedFills(s.label, order, C), sid = `${rid}.seed.${k}`;
          if (fills.length === 2) nodes.push(rect(sid + ".l", sx, cy - 4, 4, 8, fills[0]), rect(sid + ".r", sx + 4, cy - 4, 4, 8, fills[1])); else nodes.push(rect(sid, sx, cy - 4, 8, 8, fills[0]));
          if (pin && lead && pin.kind === "switch" && pin.seeds.includes(l.seeds.indexOf(s))) nodes.push(...box(sid + ".pin", [sx - 2, cy - 6, 12, 12], C.wishEdge));
          if (K > 0 && s.hides != null) nodes.push(rect(sid + ".kin", sx + 6, cy - 4, 2, 2, C.kinship));
        });
      } else {
        const [clo, chi] = l.catalogue, tx = (v) => O.track[0] + Math.round(((v - clo) / (chi - clo)) * O.track[1]);
        nodes.push(rect(`${rid}.oa`, O.gateA[0] + 8, cy - 1, O.track[0] - (O.gateA[0] + 8), 2, kindColour), rect(`${rid}.ob`, O.track[0] + O.track[1], cy - 1, O.gateB[0] - (O.track[0] + O.track[1]), 2, kindColour), rect(`${rid}.track`, O.track[0], cy, O.track[1], 1, "bevel"));
        if (l.narrowed > 2 / O.track[1] * (chi - clo)) nodes.push(...dashedBox(`${rid}.r0`, [tx(l.range0[0]), cy - 3, Math.max(2, tx(l.range0[1]) - tx(l.range0[0])), 7], C.kinship, 2, 2));
        const rx = tx(l.range[0]), rw = Math.max(3, tx(l.range[1]) - rx); nodes.push(rect(`${rid}.band`, rx, cy - 2, rw, 5, C.band.edge), rect(`${rid}.band.in`, rx + 1, cy - 1, Math.max(1, rw - 2), 3, C.band.fill));
        master("cross-tick-a-6x4", [tx(l.parents[0]) - 3, cy - 6, 6, 4]); master("cross-tick-b-6x4", [tx(l.parents[1]) - 3, cy + 3, 6, 4]);
      }
      const pin = wishOf(l.trait);
      if (pin && !wished && row.play) { wished = true; master(`cross-wish-${pin.lit ? "lit" : "hollow"}-8x8`, [O.wish[0], cy - 4, 8, 8]); }
    }
    if (pid.length && !wished) { const p = pid[0], first = c.rows[0]; master(`cross-wish-${p.lit ? "lit" : "hollow"}-8x8`, [O.wish[0], first.y + Math.floor(first.h / 2) - 4, 8, 8]); }
  }
  for (const p of m.wish?.pinned || []) if (p.lit) { const ch = fc.chapters.find((c) => c.traits.includes(p.trait)); if (ch) glints.add(ch.id); }
}
// The overview plan's input: each chapter's loci with whether each is at play (open chapters only).
function planInput(fc, lociOf, sealedLoci) {
  return fc.chapters.map((c) => c.state === "open" ? { id: c.id, state: "open", loci: lociOf(c).map((l) => ({ id: l.id, play: !!l.play })) }
    : c.state === "sealed" ? { id: c.id, state: "sealed", loci: Array.from({ length: sealedLoci(c) }, (_, i) => ({ id: c.id + "#" + i, play: false })) }
    : { id: c.id, state: "unread", loci: lociOf(c).map((l) => ({ id: l.id, play: false })) });
}

// ================================================ a chapter ================================================
function chapterNodes(m, spec, ctx, fc, open, nodes, masters, pictures, master, wishOf, glints) {
  const R = spec.regions, H = R.chapter, T = H.trait, C = spec.colours, K = fc.kinship, [rx, ry, rw] = H.rows;
  const info = open, traitsOf = fc.traits.filter((t) => t.chapter === info.id);
  for (const p of m.wish?.pinned || []) if (p.lit) { const ch = fc.chapters.find((c) => c.traits.includes(p.trait)); if (ch) glints.add(ch.id); }
  if (info.state === "sealed") {
    const loci = chapterLocusCount(m.frame, info.id);
    for (let i = 0; i < loci; i++) { const y = ry + i * 4; nodes.push(...line(`ch.sa.${i}`, 16, y, 440, 1, C.wire.sealed, { on: 1, off: 2 }), ...line(`ch.sb.${i}`, 568, y, 440, 1, C.wire.sealed, { on: 1, off: 2 })); }
    if (info.findKind) master(`find-${info.findKind}-112x112`, [456, 248, 112, 112]);
    nodes.push(txt(ctx, "ch.sealed", `opens with ${info.opensWith}`, 512, 248 + 112 + 16, 16, "mist", "center"));
    return;
  }
  const plan = chapterPlan(traitsOf.map((t) => ({ id: t.trait, loci: traitLocusCount(m.frame, t.trait) })), spec);
  plan.rows.forEach((row, ri) => {
    const t = traitsOf[ri], y = row.y, h = row.h, mid = y + h / 2, id = `ch.${t.trait}`, L = row.loci, pin = wishOf(t.trait), missing = t.kind === "missing";
    if (ri > 0) nodes.push(rect(id + ".rule", rx, y, rw, 1, "hairline"));
    // each parent's two copies as two buses of L wires on a 4 px pitch, turned at the jog into the gate's pins
    const parts = missing ? t.known : { a: { words: t.splice.words.a, hides: t.splice.hides.a }, b: { words: t.splice.words.b, hides: t.splice.hides.b } };
    const kind = missing ? "settled" : (t.splice.loci[0]?.kind ?? "switch"), wire = missing ? C.wire.settled : kind === "switch" ? C.wire.switch : C.wire.blend, settledGate = missing || !t.splice.loci.some((l) => l.play);
    for (const side of ["a", "b"]) {
      const x0 = side === "a" ? 16 : 1008, jog = side === "a" ? H.trait.jogA : H.trait.jogB, gx = side === "a" ? H.trait.gateA[0] : H.trait.gateB[0], lacking = missing && t.missing.some((q) => q.parent === side);
      for (let i = 0; i < 2; i++) {
        const yc = Math.round(y + (i === 0 ? h / 4 : (3 * h) / 4)), pin_y = Math.round(mid + (i === 0 ? -4 : 4)), part = parts[side], hid = !lacking && part?.hides[i], colour = lacking ? C.wire.unread : wire;
        for (let j = 0; j < L; j++) { const wy = yc + Math.round((j - (L - 1) / 2) * 4) - 1, xs = side === "a" ? x0 : jog, len = side === "a" ? jog - x0 : x0 - jog; nodes.push(...line(`${id}.${side}${i}.${j}`, xs, wy, len, lacking ? 1 : 2, colour, lacking ? { on: 3, off: 2 } : hid ? { on: 5, off: 3 } : {})); }
        const top = Math.min(yc - Math.round(((L - 1) / 2) * 4) - 1, pin_y - 1), bot = Math.max(yc + Math.round(((L - 1) / 2) * 4) + 1, pin_y + 1);
        nodes.push(rect(`${id}.${side}${i}.jog`, jog - (side === "a" ? 0 : 0), top, 2, bot - top, colour));
        nodes.push(rect(`${id}.${side}${i}.stub`, side === "a" ? jog + 2 : gx + 16, pin_y - 1, side === "a" ? gx - jog - 2 : jog - gx - 16, 2, colour));
        // the copy's look printed on its bus: a plate, the word in the player's words (a pigment follows a chip), a hidden copy dashed with "hides" beside it
        if (!lacking && part) { const word = part.words[i]; if (word) plate(ctx, nodes, `${id}.${side}${i}.plate`, word, side, yc, !!hid, C, wire); }
      }
    }
    // the gate, in the middle of its row, and the wires out of it
    master(`cross-gate-${kind === "settled" ? "switch" : kind}-16x16${settledGate ? "-settled" : ""}`, [H.trait.gateA[0], mid - 8, 16, 16]); master(`cross-gate-${kind === "settled" ? "switch" : kind}-16x16${settledGate ? "-settled" : ""}`, [H.trait.gateB[0], mid - 8, 16, 16]);
    nodes.push(rect(`${id}.oa`, H.trait.gateA[0] + 16, mid - 1, H.trait.outA - (H.trait.gateA[0] + 16), 2, missing ? C.wire.settled : wire), rect(`${id}.ob`, H.trait.outB, mid - 1, H.trait.gateB[0] - H.trait.outB, 2, missing ? C.wire.settled : wire));
    // the child's column: the trait's name line, then its four pictures or its two ends and the track
    const [cx] = H.trait.child;
    if (pin) master(`cross-wish-${pin.lit ? "lit" : "hollow"}-12x12`, [cx, y + 4, 12, 12]);
    const nameX = cx + (pin ? 16 : 0), nameW = Math.round(ctx.measure(t.name, 16));
    nodes.push(txt(ctx, id + ".name", t.name, nameX, y + 4, 16, "bone"));
    if (missing) {
      for (let k = 0; k < 4; k++) nodes.push(rect(`${id}.slot.${k}`, cx + k * 72, y + T.picY, 64, 32, "frostS"));
      const who = t.missing.map((q) => q.name), chap = t.missing[0].chapterName;
      nodes.push(txt(ctx, id + ".need", sideWord(t.missing.map((q) => q.parent), chap, who), nameX + nameW + 8, y + 4, 16, "mist"));
      return;
    }
    const lead = t.splice.loci[0], surface = K > 0 && t.kind === "switch" && t.seeds.some((s) => s.hides != null);
    const words = t.kind === "switch" ? (t.firm ? "known for sure" : "one in four each") : t.bins.length === 1 ? `firm · ${t.bins[0]}` : `${t.bins[0]} to ${t.bins.at(-1)}`;
    if (surface) { const w = Math.round(ctx.measure("hidden looks can surface", 16)) + 8; nodes.push(rect(id + ".surf", nameX + nameW + 8, y + 2, w, 20, C.kinship), txt(ctx, id + ".surf.word", "hidden looks can surface", nameX + nameW + 12, y + 4, 16, "ink")); }
    else nodes.push(txt(ctx, id + ".words", words, nameX + nameW + 8, y + 4, 16, "mist"));
    if (t.kind === "switch") {
      fourSlots(t.seeds).forEach((s, k) => {
        const px = cx + k * 72, py = y + T.picY; pictures.push({ kind: "seed", id: `xs:${m.a.id}:${m.b.id}:${t.trait}:${s.copies.join("|")}`, trait: t.trait, copies: s.copies, rect: [px, py, 64, 32], locus: t.locus });
        if (pin && pin.kind === "switch" && pin.seeds.includes(t.seeds.indexOf(s))) nodes.push(...box(`${id}.pin.${k}`, [px - 2, py - 2, 68, 36], C.wishEdge), ...box(`${id}.pin2.${k}`, [px - 3, py - 3, 70, 38], C.wishEdge));
        if (K > 0 && s.hides != null) master("cross-kin-surface-10x10", [px + 54, py + 22, 10, 10]);
      });
    } else {
      const fr = m.frame, lo = t.range[0], hi = t.range[1], [clo, chi] = lead.catalogue, tr = H.trait.track, tx = (v) => tr[0] + Math.round(((v - clo) / (chi - clo)) * tr[1]), ty = y + T.picY + 16;
      pictures.push({ kind: "seed", id: `xs:${m.a.id}:${m.b.id}:${t.trait}:lo`, trait: t.trait, blend: lo, rect: [cx, y + T.picY, 64, 32], locus: t.locus });
      if (t.bins.length > 1) {
        pictures.push({ kind: "seed", id: `xs:${m.a.id}:${m.b.id}:${t.trait}:hi`, trait: t.trait, blend: hi, rect: [584, y + T.picY, 64, 32], locus: t.locus });
        nodes.push(rect(id + ".track", tr[0], ty, tr[1], 1, "bevel"));
        const r0 = lead.range0, n = lead.narrowed; if (n > 2 / tr[1] * (chi - clo)) nodes.push(...dashedBox(id + ".r0", [tx(r0[0]), ty - 7, Math.max(2, tx(r0[1]) - tx(r0[0])), 15], C.kinship, 2, 2));
        const bx = tx(lo), bw = Math.max(3, tx(hi) - bx); nodes.push(rect(id + ".band", bx, ty - 4, bw, 9, C.band.edge), rect(id + ".band.in", bx + 1, ty - 3, Math.max(1, bw - 2), 7, C.band.fill));
        master("cross-tick-a-12x8", [tx(t.parents[0]) - 6, ty - 14, 12, 8]); master("cross-tick-b-12x8", [tx(t.parents[1]) - 6, ty + 7, 12, 8]);
        if (pin && pin.kind === "blend") { /* a pinned look at an end: that picture's 2 px yellow edge */ }
      } else nodes.push(rect(id + ".band", tr[0], ty - 4, tr[1], 9, "bevel"));
      void fr;
    }
  });
}
// A copy's plate on its bus: a `panel` rect 24 tall centred on the bus with a 1 px edge in the kind's colour, 8 px pad and the word in 16 px; a pigment's word follows a 12×12 chip; a hidden
// copy has its edge dashed, its word in `fog` and "hides" in `mist` outside the plate.
function plate(ctx, nodes, id, word, side, yc, hidden, C, wire) {
  const chip = C.pigmentChips[word], ww = Math.round(ctx.measure(word, 16)), inner = (chip ? 12 + 4 : 0) + ww, w = inner + 16, y = yc - 12, x = side === "a" ? 32 : 992 - w;
  nodes.push(rect(id, x, y, w, 24, "panel"));
  nodes.push(...(hidden ? dashedBox(id + ".edge", [x, y, w, 24], wire, 3, 2) : box(id + ".edge", [x, y, w, 24], wire)));
  let tx = x + 8; if (chip) { nodes.push(rect(id + ".chip", tx, yc - 6, 12, 12, "ink"), rect(id + ".chip.in", tx + 1, yc - 5, 10, 10, chip)); tx += 16; }
  nodes.push(txt(ctx, id + ".word", word, tx, y + 2, 16, hidden ? "fog" : "bone"));
  if (hidden) { const hw = Math.round(ctx.measure("hides", 16)); nodes.push(txt(ctx, id + ".hides", "hides", side === "a" ? x + w + 8 : x - 8, y + 2, 16, "mist", side === "a" ? "left" : "right")); void hw; }
}
