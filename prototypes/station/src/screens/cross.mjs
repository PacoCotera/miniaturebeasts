// Cross: two adults of one species left and right, the child to be misty between them, their stamps on
// plates, and per trait four seed pictures (quarters, never odds) or a range picture for a blend; an
// ineligible pair greys out with the reason and draws no ✓ cap; the cross is paid only after the child
// is drawn and builds. ◀ ▶ pick the partner, ▲ ▼ page the traits, ✓ Cross them, ← Habitat.
import { SW, C, R, blit, text, textW, clipText, wrapText, panel, focusRing, art, PB, clamp, clock, motion } from "../gfx.mjs";
import { mibiArt, ghostArt, traitPic, stampArt, paintedArt, famArt } from "../art.mjs";
import { G, FX, UI, msg, lockInput, save, goScreen, registerScreen, mibiById, effWithId } from "../game.mjs";
import { benchBg, drawTop, beam } from "./frame.mjs";
import { landedSet } from "../caddy.mjs";
import * as S from "../state.mjs";
import { frameOf, traitState, codeText, genomeDigest } from "../genome.mjs";
import { flush } from "../caddy.mjs";

const X = () => UI.cross;
export function openCross(a) { UI.cross = { aId: a.id, bId: null, page: 0, fc: null, clash: [] }; const ps = S.crossPartners(G.st, G.sv, a, G.settings); if (ps.length) UI.cross.bId = ps[0].id; goScreen("cross"); }
const pair = () => { const x = X(); return x ? [mibiById(x.aId), mibiById(x.bId)] : [null, null]; };
const ROWS = 5, ROW_H = 50, ROW_Y = 292;
function forecast() { const x = X(), [a, b] = pair(); if (!a || !b) return null; const key = a.id + ":" + b.id; if (x.fc && x.fcKey === key) return x.fc; x.fc = S.forecastOf(G.st, a, b, G.settings); x.fcKey = key; return x.fc; }
// A seed's child: the trait's lead locus as the seed has it, the sleeping parts one from each parent, the rest from the mother.
function seedGenome(fr, a, b, t, copies) {
  const g = structuredClone(a.genome); g.loci[t.locus] = [...copies];
  for (const id of t.sleeping || []) g.loci[id] = [a.genome.loci[id][0], b.genome.loci[id][1]];
  return g;
}
const seedPic = (fr, a, b, t, copies, w, h) => traitPic(fr, seedGenome(fr, a, b, t, copies), t.trait, w, h);
// Four slots from the seeds' weights (largest remainder), so a penalty shows as more seeds wearing the hidden look.
function fourSlots(seeds) {
  const n = 4, raw = seeds.map((s) => s.weight * n), base = raw.map(Math.floor); let left = n - base.reduce((x, y) => x + y, 0);
  const order = raw.map((v, i) => [v - base[i], i]).sort((p, q) => q[0] - p[0]); for (let k = 0; k < order.length && left > 0; k++, left--) base[order[k][1]]++;
  const out = []; seeds.forEach((s, i) => { for (let k = 0; k < base[i]; k++) out.push(s); }); return out.slice(0, 4);
}
function parentArt(m, size) { const set = landedSet(m); if (set) return paintedArt(set, m.sha, size, size, { sprite: true }); const fr = frameOf(S.speciesOf(m)); return fr && m.genome ? mibiArt(fr, m.genome, size, size, "portrait") : null; }
function draw() {
  benchBg(); drawTop("Cross");
  const x = X(), [a, b] = pair(); if (!a) { goScreen("habitat"); return; }
  const fr = frameOf(S.speciesOf(a)), partners = S.crossPartners(G.st, G.sv, a, G.settings);
  // the parents, left and right, alive; their names and stamps on plates
  const side = (m, px, label) => {
    beam(px + 120, 44, 240, 260);
    if (!m) { panel(px + 20, 80, 200, 200, C.night, C.slate); text("no partner yet", px + 120, 170, C.stone, 2, "center"); text(label, px + 120, 194, C.stone, 2, "center"); return; }
    const away = m.id === effWithId(), spr = parentArt(m, 200); if (spr) blit(spr, px + 20, 70);
    if (away) { panel(px + 40, 150, 160, 30, C.night, C.slate); text("away with you", px + 120, 157, C.fog, 2, "center"); }
    text(clipText(m.name, 220, 3), px + 120, 276, C.bone, 3, "center");
    const st = stampArt(fr, m.genome, m.read, 96); if (st) { panel(px + 70, 306, st.w + 12, st.h + 12, C.bone, C.slate); blit(st, px + 76, 312); }
    text(codeText(m.code), px + 120, 430, C.fog, 2, "center");
  };
  side(a, 10, ""); side(b, 764, partners.length ? "◀ ▶ picks one" : "no adult of its kind");
  // the child to be, misty: never a promise
  blit(ghostArt(fr, a.genome, 150, 150), 437, 60); text("the child to be", 512, 216, C.fog, 2, "center");
  const block = S.crossBlock(G.st, G.sv, a, b, G.settings), fc = block === "another species" || !b ? null : forecast();
  const kin = fc ? S.kinshipWord(fc.kinship) + (fc.kinship === 0 && fc.identity > 0 ? " · " + Math.round(fc.identity * 100) + "% alike" : "") : "";
  text(clipText(kin, 400, 2), 512, 240, fc && fc.kinship >= 0.25 ? C.amber : C.mist, 2, "center");
  if (block && b) { panel(362, 262, 300, 30, C.wine, C.red); text(clipText("refused · " + block, 280, 2), 512, 269, C.blush, 2, "center"); }
  if (!fc) return;
  // the forecast: one row per trait, paged by five
  const rows = fc.traits, pages = Math.ceil(rows.length / ROWS), page = clamp(x.page, 0, Math.max(0, pages - 1)), shown = rows.slice(page * ROWS, page * ROWS + ROWS);
  panel(280, ROW_Y - 8, 464, ROWS * ROW_H + 12, C.night, C.slate);
  shown.forEach((t, i) => {
    const y = ROW_Y + i * ROW_H, trait = fr.chapters.flatMap((c) => c.traits).find((q) => q.id === t.trait), isClash = x.clash.includes(t.trait);
    text(clipText(t.name, 110, 2), 292, y + 4, isClash ? C.coral : C.bone, 2);
    if (t.sealed) { text("sealed", 292, y + 26, C.stone, 2); for (let k = 0; k < 4; k++) R(410 + k * 80, y + 2, 72, 44, C.slate); return; }
    if (t.kind === "switch") {
      const slots = fourSlots(t.seeds);
      slots.forEach((s, k) => { const px = 410 + k * 80; blit(seedPic(fr, a, b, t, s.copies, 72, 44), px, y + 2); R(px - 1, y + 1, 74, 1, C.slate); R(px - 1, y + 46, 74, 1, C.slate); R(px - 1, y + 1, 1, 46, C.slate); R(px + 72, y + 1, 1, 46, C.slate);
        if (s.hides != null) blit(art("seedbud", () => { const pb = new PB(10, 10); pb.ell(5, 5, 4, 4, C.frost); pb.ell(5, 6, 2, 2, C.frostS); pb.outline(() => C.stone); return pb; }), px + 60, y + 40); });
      text(t.firm ? "known for sure" : "one in four each", 292, y + 24, t.firm ? C.aqua : C.mist, 1);
      if (trait?.nature === "doing") blit(famArt(), 292 + textW(t.name, 2) + 8, y + 4);
    } else {
      const lo = seedPic(fr, a, b, t, [t.range[0], t.range[0]], 72, 44), hi = seedPic(fr, a, b, t, [t.range[1], t.range[1]], 72, 44), oneBin = t.bins.length === 1;
      blit(lo, 410, y + 2); if (!oneBin) { for (let k = 0; k < 150; k += 2) R(486 + k, y + 24 - (k % 4 === 0 ? 1 : 0), 1, 2, C.aqua); blit(hi, 640, y + 2); }
      text(clipText(oneBin ? "firm · " + t.bins[0] : t.bins[0] + " to " + t.bins.at(-1), 112, 1), 292, y + 24, oneBin ? C.aqua : C.mist, 1);
      if (fc.kinship >= 0.25 && !oneBin) text("narrowed", 292, y + 38, C.amber, 1);
    }
  });
  if (pages > 1) text("▲▼ " + (page + 1) + " of " + pages, 736, ROW_Y + ROWS * ROW_H - 10, C.stone, 2, "right");
  const sp = motion() ? Math.floor(clock.now / 500) % 2 : 0; if (!block && b) focusRing(760 + (sp ? 0 : 0), 66, 240, 220);
}
function line() {
  const [a, b] = pair(); if (!a) return {};
  const block = S.crossBlock(G.st, G.sv, a, b, G.settings), c = S.crossCost(G.settings), fc = b && block !== "another species" ? forecast() : null;
  const subject = a.name + (b ? " × " + b.name : "") + " · " + S.spName(a);
  if (!b) return { back: "Habitat", subject, need: "no adult of its kind to pair" };
  if (block) return { back: "Habitat", subject, need: block };
  const can = S.canPay(G.st, c.e, c.d, c.s);
  return { ok: "Cross them", price: can ? S.priceText(c.e, c.d, c.s) : S.shortText(G.st, c.e, c.d, c.s), dim: !can, back: "Habitat", subject, need: fc ? S.kinshipWord(fc.kinship) : null };
}
function act(k) {
  const x = X(), [a, b] = pair(); if (!a) return;
  const partners = S.crossPartners(G.st, G.sv, a, G.settings);
  if (k === "left" || k === "right") { if (!partners.length) return; const i = Math.max(0, partners.findIndex((m) => m.id === x.bId)); x.bId = partners[(i + (k === "right" ? 1 : partners.length - 1)) % partners.length].id; x.clash = []; }
  else if (k === "up" || k === "down") { const fc = forecast(); const pages = fc ? Math.ceil(fc.traits.length / ROWS) : 1; x.page = clamp(x.page + (k === "down" ? 1 : -1), 0, Math.max(0, pages - 1)); }
  else if (k === "back") { UI.cross = null; UI.hab.id = a.id; goScreen("habitat"); }
  else if (k === "confirm") {
    const r = S.doCross(G.st, G.sv, a, b, G.settings, Date.now()); if (!r.ok) { x.clash = r.clash || []; msg(r.msg); return; }
    FX.stamp = { at: clock.now, code: r.bud.code }; lockInput(900); UI.cross = null; save(); goScreen("incubator"); flush().catch(() => {});
    msg("Crossed · " + codeText(r.bud.code) + " · the child grows in the bud");
  }
}
registerScreen("cross", { draw, line, act });
