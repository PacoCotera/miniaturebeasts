// Create (the review): the founder large and misty where unread; the chapter rail; the opened pod at the
// left, the empty chamber and the stamp at the right; each read, shapeable trait rolls among three
// pictures from the pod's own copies (▲▼); changed tags; doings say breed to change; a clash marks its
// traits and withholds Grow; the total on the bottom line. ← goes back to Pods with nothing spent.
import { SW, C, R, blit, text, textW, clipText, wrapText, panel, focusRing, art, PB, clamp, clock, motion } from "../gfx.mjs";
import { podSprite } from "../podsprites.mjs";
import { emblemArt, traitPic, frostPic, famArt, stampArt, domeArt, mistyArt } from "../art.mjs";
import { G, FX, UI, msg, lockInput, save, goScreen, registerScreen, podById } from "../game.mjs";
import { benchBg, beam } from "./frame.mjs";
import { podFrame } from "./home.mjs";
import * as S from "../state.mjs";
import { traitState, codeText, genomeDigest } from "../genome.mjs";
import { flush } from "../caddy.mjs";

const CR = () => UI.create;
const pod = () => (CR() ? podById(CR().podId) : null);
export function openCreate(p) { UI.create = { podId: p.id, choices: {}, f: 0, clash: [] }; goScreen("create"); }
// The traits on the review: every trait of a read chapter, in ring order (the shapeable ones roll).
const reviewTraits = (p) => { const fr = podFrame(p); return fr.chapters.filter((c) => p.read.includes(c.id)).flatMap((c) => c.traits.map((t) => ({ t, c }))); };
const surprises = (p) => podFrame(p).chapters.filter((c) => !p.read.includes(c.id)).map((c) => c.name);
function draw() {
  benchBg();   const cr = CR(), p = pod(); if (!p) { goScreen("pods"); return; }
  const fr = podFrame(p), genome = S.founderGenome(p, cr.choices), list = reviewTraits(p), changed = S.changedTraits(cr.choices), clash = cr.clash;
  beam(512, 44, 320, 330);
  // the chapter rail: read chapters lit, unread ones named as surprises
  const tabs = fr.chapters, tw = Math.min(150, Math.floor((820 - (tabs.length - 1) * 8) / tabs.length)), tx0 = 190 + Math.round((820 - (tabs.length * tw + (tabs.length - 1) * 8)) / 2);
  tabs.forEach((c, i) => { const read = p.read.includes(c.id), x = tx0 + i * (tw + 8); panel(x, 50, tw, 40, read ? C.tealD : C.night, read ? C.aqua : C.slate); blit(emblemArt(c.id), x + 8, 60); text(clipText(c.name, tw - 36, 2), x + 30, 61, read ? C.mint : C.stone, 2); });
  // the founder, misty where unread
  const misty = fr.chapters.filter((c) => !p.read.includes(c.id)).flatMap((c) => c.traits.map((t) => t.id));
  const fx = 362, fy = 150; blit(art("fshadow", () => { const pb = new PB(300, 24); pb.ell(150, 12, 140, 10, C.deep, { chk: 1 }); return pb; }), fx, fy + 290);
  const bob = motion() ? Math.round(Math.sin(clock.now / 700) * 2) : 0;
  blit(mistyArt(fr, genome, misty, 300, 310), fx, fy + bob);
  if (clash.length) { panel(fx + 40, fy + 10, 220, 30, C.wine, C.red); text("this shape won't grow", fx + 150, fy + 17, C.blush, 2, "center"); }
  // the opened pod at the left; the empty chamber and the stamp at the right
  const pa = podSprite(fr.species.id, "well", "identified"); blit(pa, 150 - pa.w / 2, 130); text("from the pod", 150, 250, C.fog, 2, "center");
  S.podOriginLines(p).flatMap((l) => wrapText(l, 220, 2)).slice(0, 3).forEach((l, i) => text(l, 150, 274 + i * 22, C.mist, 2, "center"));
  blit(domeArt(140, 140, false), 820, 110); text(G.st.bud ? "busy" : "empty", 890, 258, G.st.bud ? C.amber : C.fog, 2, "center");
  const stamp = stampArt(fr, genome, fr.chapters.filter((c) => p.read.includes(c.id) || changed.some((id) => c.traits.some((t) => t.id === id))).map((c) => c.id), 120);
  if (stamp) { panel(824, 286, stamp.w + 12, stamp.h + 12, C.bone, C.slate); blit(stamp, 830, 292); }
  text("the code appears at Grow", 896, 440, C.stone, 2, "center");
  // the trait strip: the focused trait's three pictures, the others as small tags
  const sy = 468, f = clamp(cr.f, 0, Math.max(0, list.length - 1)), cur = list[f];
  if (!list.length) text("Read a chapter first to shape anything", 512, sy + 20, C.mist, 2, "center");
  else {
    const opts = S.rollOptions(p, cur.t.id), choice = cr.choices[cur.t.id] || 0, state = traitState(fr, cur.t, genome), isClash = clash.includes(cur.t.id);
    text(clipText(cur.c.name + " · " + cur.t.name, 300, 2), 190, sy, C.bone, 2);
    if (opts.length > 1) { opts.forEach((o, i) => { const x = 190 + i * 96; blit(art("roll" + o.look + ":" + cur.t.id + ":" + genomeDigest(o.genome), () => traitPic(fr, o.genome, cur.t.id, 88, 60)), x, sy + 22);
        R(x - 2, sy + 20, 92, 2, i === choice ? C.amber : C.slate); R(x - 2, sy + 82, 92, 2, i === choice ? C.amber : C.slate); R(x - 2, sy + 20, 2, 64, i === choice ? C.amber : C.slate); R(x + 88, sy + 20, 2, 64, i === choice ? C.amber : C.slate); });
      text("▲", 480, sy + 30, C.amber, 2); text("▼", 480, sy + 56, C.amber, 2);
      text(clipText((choice ? "changed · " : "as the pod is · ") + state.line, 290, 2), 504, sy + 22, isClash ? C.coral : choice ? C.focus : C.fog, 2);
      text(choice ? "+1 ◆ · ▲▼ to roll back" : "▲▼ roll · +1 ◆ a change", 504, sy + 46, C.mist, 2); }
    else { blit(traitPic(fr, genome, cur.t.id, 88, 60), 190, sy + 22); text(clipText(state.line, 500, 2), 290, sy + 22, C.fog, 2);
      if (cur.t.nature === "doing") { blit(famArt(), 290, sy + 46); text("breed to change", 322, sy + 46, C.mist, 2); } else text("this pod carries one look here", 290, sy + 46, C.mist, 2); }
    text("◀ ▶ " + (f + 1) + " of " + list.length + " read traits", 1010, sy, C.stone, 2, "right");
    const s = surprises(p); if (s.length) text(clipText((s.length > 1 ? s.slice(0, -1).join(", ") + " and " + s.at(-1) + " stay" : s[0] + " stays") + " a surprise", 200, 2), 1010, sy + 24, C.mist, 2, "right");
    if (changed.length) text(clipText("changed: " + changed.map((id) => clash.includes(id) ? id + " ✕" : id).join(", "), 200, 2), 1010, sy + 48, clash.length ? C.coral : C.focus, 2, "right");
  }
  focusRing(184, sy + 16, 300, 72);
}
function line() {
  const cr = CR(), p = pod(); if (!p) return {};
  const cost = S.growCost(G.st, cr.choices, G.settings), b = S.growBlock(G.st, p, cr.choices, G.settings, cr.clash), list = reviewTraits(p), fr = podFrame(p);
  const looks = list.map(({ t }) => traitState(fr, t, S.founderGenome(p, cr.choices)).shows).filter(Boolean);
  const mins = S.budMinutes(G.st, S.changedTraits(cr.choices).length, G.settings);
  return { ok: "Grow it", price: b ? b : (G.st.firstMibi ? "first founder: " : "") + S.priceText(cost.e, cost.d, cost.s), dim: !!b, back: "Pods", subject: S.spName(p) + (looks.length ? " · " + looks.slice(0, 4).join(", ") : ""), need: b ? null : "grows in " + S.plural(mins, "leaf", "leaves") };
}
function act(k) {
  const cr = CR(), p = pod(); if (!p) return; const list = reviewTraits(p);
  if (k === "left" || k === "right") cr.f = clamp(cr.f + (k === "right" ? 1 : -1), 0, Math.max(0, list.length - 1));
  else if (k === "up" || k === "down") { const cur = list[clamp(cr.f, 0, list.length - 1)]; if (!cur) return; const opts = S.rollOptions(p, cur.t.id);
    if (opts.length <= 1) { msg(cur.t.nature === "doing" ? "Only through breeding" : !p.read.includes(cur.c.id) ? "Read it first to choose" : "This pod carries one look here"); return; }
    const i = cr.choices[cur.t.id] || 0, n = (i + (k === "down" ? 1 : opts.length - 1)) % opts.length; if (n) cr.choices[cur.t.id] = n; else delete cr.choices[cur.t.id];
    cr.clash = S.clashTraits(p, cr.choices); }
  else if (k === "confirm") { const r = S.grow(G.st, p, cr.choices, G.settings, Date.now()); if (!r.ok) { msg(r.msg); return; }
    FX.stamp = { at: clock.now, code: r.bud.code }; lockInput(900); UI.create = null; UI.pods.cur = null; save(); goScreen("incubator"); flush().catch(() => {}); msg("Grown · " + codeText(r.bud.code) + " · the pod is in the incubator"); }
  else if (k === "back") { UI.create = null; goScreen("pods"); }
}
registerScreen("create", { draw, line, act });
