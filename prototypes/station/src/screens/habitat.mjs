// Habitat: one resident large (the placeholder from its genome), its card with the stamp and code, the
// with-you door, the bond heart, the strip of bays. M2 adds return to the wild; the sitting comes in M6.
import { SW, SH, LINE_H, C, R, blit, text, textW, clipText, wrapText, panel, focusRing, art, PB, cropPB, clock, motion } from "../gfx.mjs";
import { ICON, mibiArt, stampArt, vivArt, traitPic } from "../art.mjs";
import { G, FX, UI, msg, lockInput, save, goScreen, registerScreen, docked, effWithId, mibiById } from "../game.mjs";
import { stageBg, drawTop, tgt, navSpatial, DIRS, stageWord } from "./frame.mjs";
import * as S from "../state.mjs";
import { frameOf, codeText } from "../genome.mjs";

const H = () => UI.hab;
const habList = () => G.st.mibis.filter((m) => !m.released);
function shown() { const l = habList(); return l.find((m) => m.id === H().id) || l.find((m) => m.id !== effWithId()) || l[0] || null; }
function targets() {
  const t = [tgt("stage", 30, 66, 576, 360), tgt("door", 636, 306, 186, 136), tgt("heart", 832, 306, 178, 136)];
  habList().forEach((m, i) => t.push(tgt("s" + m.id, 24 + i * 140, 456, 128, 92)));
  return t;
}
function draw() {
  stageBg(); drawTop("Habitat");
  const m = shown(), h = H(), NOW = clock.now;
  if (!m) { blit(vivArt(600, 380), 20, 56); text("No mibis yet", 320, 200, C.fog, 3, "center"); text("Grow a founder from a read pod · the next build", 320, 246, C.mist, 2, "center"); return; }
  h.id = m.id; if (UI.meet === m.id) UI.meet = null;
  const fr = frameOf(S.speciesOf(m));
  blit(art("habviv", () => cropPB(vivArt(SW, SH - LINE_H), 200, 120, 600, 380)), 20, 56);
  const isW = m.id === effWithId(), mo = FX.moment && FX.moment.id === m.id && NOW - FX.moment.at < 1800 ? NOW - FX.moment.at : -1;
  const st = stageWord(m), size = st === "juvenile" ? 230 : 290, x = 320 - size / 2, y = 420 - size;
  blit(art("hshadow" + size, () => { const pb = new PB(size, 16); pb.ell(size / 2, 8, size * 0.36, 7, C.moss0, { chk: 1 }); return pb; }), x, y + size * 0.86);
  if (fr && m.genome) blit(mibiArt(fr, m.genome, size, size, "portrait"), x, y - (mo >= 0 ? Math.round(Math.abs(Math.sin(mo / 150)) * 16) : 0));
  if (m.paint == null) { blit(art("waitlampL", () => { const pb = new PB(14, 14); pb.ell(7, 7, 6, 6, C.sky); pb.ell(5, 5, 2, 2, C.ice); pb.outline(() => C.deep); return pb; }), 40, 400); text("its painting is on its way · placeholder", 60, 400, C.fog, 2); }
  if (isW) { panel(36, 70, 250, 34, C.lamp, C.wood2); text("in the Companion with you", 161, 80, C.wood0, 2, "center"); }
  // the card
  panel(636, 50, 374, 246, C.paper, C.wood2);
  text(clipText(m.name, 220, 3), 654, 62, C.wood0, 3); if (m.bonded) blit(ICON.heart(true), 654 + textW(clipText(m.name, 220, 3), 3) + 10, 60);
  text(S.spName(m) + " · " + st, 654, 98, C.bark, 2); text(clipText(fr?.species.summary || "", 236, 2), 654, 120, C.bark, 2);
  text(clipText(m.mem ? "remembers the " + m.mem : m.from.g ? "from the " + (S.PLACE_WORD[m.from.g] || m.from.g) : "hasn’t been out yet", 236, 2), 654, 142, C.clay, 2);
  text(codeText(m.code), 654, 164, C.wood2, 2);
  if (fr && m.genome) { const sp = stampArt(fr, m.genome, m.read, 88); if (sp) blit(sp, 904, 58); }
  if (fr && m.genome) fr.chapters.slice(0, 4).forEach((ch, i) => { const px = 650 + i * 88, py = 184; panel(px, py, 80, 72, C.wood3, C.wood1);
    const t = ch.traits[0]; if (t) blit(art("minipic" + m.sha + t.id, () => cropPB(traitPic(fr, m.genome, t.id, 150, 110), 38, 24, 74, 62)), px + 3, py + 5);
    text(clipText(ch.name, 84, 2), px + 40, py + 76, C.bark, 2, "center"); });
  // the with-you door and the bond heart
  const wm = mibiById(effWithId()), pend = S.pendingWith(G.st, G.sv);
  panel(636, 306, 186, 136, C.wood2, C.wood1); panel(650, 316, 70, 112, C.wood0, C.wood3);
  const wfr = wm && frameOf(S.speciesOf(wm)); if (wm && wfr && wm.genome) blit(mibiArt(wfr, wm.genome, 60, 60, "portrait"), 655, 340); else blit(ICON.comp(), 678, 360);
  text("with you", 772, 330, C.lamp, 2, "center"); text(clipText(wm ? wm.name : "no one", 90, 2), 772, 356, C.creamT, 2, "center");
  if (pend && !docked()) wrapText(pend.name + " next dock", 96, 2).forEach((l, i) => text(l, 772, 384 + i * 20, C.amber, 2, "center"));
  panel(832, 306, 178, 136, C.wood2, C.wood1); blit(ICON.heart(!!m.bonded), 906, 330);
  text(m.bonded ? "bonded" : S.bondOffered(m) ? "bond · offered" : "bond", 921, 372, m.bonded ? C.coral : C.lamp, 2, "center");
  if (!m.bonded && !S.bondOffered(m)) ["offered after", "a first outing"].forEach((l, i) => text(l, 921, 396 + i * 20, C.lampD, 2, "center"));
  // the strip of bays
  panel(16, 450, 994, 104, C.moss1, C.moss3);
  habList().forEach((q, i) => { const sx = 24 + i * 140, qf = frameOf(S.speciesOf(q)); panel(sx, 456, 128, 92, q.id === m.id ? C.moss3 : C.moss2, C.wood2); if (qf && q.genome) blit(mibiArt(qf, q.genome, 60, 60, "portrait"), sx + 34, 460); text(clipText(q.name, 120, 2), sx + 64, 526, q.id === effWithId() ? C.amber : C.fog, 2, "center"); });
  for (let i = habList().length; i < (G.settings.bays || S.BAYS) + 1 && i < 7; i++) { const sx = 24 + i * 140; for (let k = 0; k < 128; k += 8) { R(sx + k, 456, 4, 2, C.moss4); R(sx + k, 546, 4, 2, C.moss4); } text("free", sx + 64, 496, C.moss4, 2, "center"); }
  const t = targets().find((q) => q.id === h.f); if (t) focusRing(t.x - 3, t.y - 3, t.w + 6, t.h + 6); else h.f = "stage";
}
function line() {
  const m = shown(), h = H(), back = h.from === "library" ? "Library" : "Home"; if (!m) return { back, subject: "no mibis yet" };
  const isW = m.id === effWithId(), subj = m.name + " · " + S.spName(m) + " · " + stageWord(m);
  if (h.f === "stage" || (h.f[0] === "s" && h.f !== "stage")) return { ok: "Spend time with " + m.name, back, subject: subj, need: isW ? m.name + " is with you" : null };
  if (h.f === "door") { if (isW) return { back, subject: m.name + " is with you" + (docked() ? "" : " · away") }; return { ok: "Take " + m.name + " with you", price: docked() ? "now" : "at the next dock", back, subject: subj }; }
  if (h.f === "heart") { if (m.bonded) return { back, subject: m.name + " is bonded" }; if (!S.bondOffered(m)) return { back, subject: "bond is offered after a first outing" }; return { ok: h.bondArm ? "Again: bond with " + m.name : "Bond with " + m.name, back, subject: "a small heart · no meters" }; }
  return { back };
}
function act(k) {
  const h = H(), m = shown(); if (k !== "confirm") h.bondArm = 0;
  if (k === "back") { const from = h.from; h.from = null; goScreen(from === "library" ? "library" : "home"); return; }
  if (k in DIRS) { const f = navSpatial(targets(), h.f, k); h.f = f; if (f[0] === "s" && f !== "stage") h.id = +f.slice(1); return; }
  if (k !== "confirm" || !m) return;
  if (h.f === "stage" || (h.f[0] === "s" && h.f !== "stage")) { FX.moment = { id: m.id, at: clock.now }; lockInput(300); msg(m.name + " leans on the glass · " + (m.mem ? "it remembers the " + m.mem : m.from.g ? "it came from the " + (S.PLACE_WORD[m.from.g] || m.from.g) : "it hasn’t been out yet")); }
  else if (h.f === "door") { if (m.id !== effWithId()) { const r = S.takeWith(G.st, G.sv, m); if (r.ok) { msg(r.msg); save(); } } }
  else if (h.f === "heart" && S.bondOffered(m)) { if (!h.bondArm) { h.bondArm = 1; msg("Bond with " + m.name + "? A deliberate choice · ✓ again"); } else { h.bondArm = 0; msg(S.bond(G.st, m).msg); save(); } }
}
registerScreen("habitat", { draw, line, act });
