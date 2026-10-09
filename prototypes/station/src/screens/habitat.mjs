// Habitat: one resident large (the placeholder from its genome), its card with the stamp and code, the
// with-you door, the bond heart, the strip of bays. M2 adds return to the wild; the sitting comes in M6.
import { SW, SH, LINE_H, C, R, blit, text, textW, clipText, wrapText, panel, focusRing, art, PB, cropPB, clock, motion } from "../gfx.mjs";
import { ICON, mibiArt, stampArt, vivArt, traitPic, gateArt, paintedArt, waitLamp } from "../art.mjs";
import { landedSet, lampText } from "../caddy.mjs";
import { openCross } from "./cross.mjs";
import { openGuide } from "./library.mjs";
import { registerPictures } from "../pictures.mjs";
import { isFilled, asset as assetOf } from "../../../ui/assets.mjs";
import { emblemArt } from "../art.mjs";
import { G, FX, UI, msg, lockInput, save, goScreen, registerScreen, docked, effWithId, mibiById } from "../game.mjs";
import { stageBg, tgt, navSpatial, DIRS, stageWord } from "./frame.mjs";
import * as S from "../state.mjs";
import { habitatRows, habitatMove } from "../nav.mjs";
import { frameOf, codeText } from "../genome.mjs";

const H = () => UI.hab;
const isStrip = (f) => /^s\d+$/.test(f);   // the strip's targets are "s<mibi id>"; "stage" and "species" are not
const habList = () => G.st.mibis.filter((m) => !m.released);
function shown() { const l = habList(); return l.find((m) => m.id === H().id) || l.find((m) => m.id !== effWithId()) || l[0] || null; }
// The card's first line, "your Loika, adult": the species word is a door to the species' guide, with the guide mark 4 px after it.
const MARK_GUIDE = "mark-guide-16:16x16";
const speciesTarget = () => { const m = shown(), w = m ? textW("your " + S.spName(m), 2) : 60; return tgt("species", 654, 94, w + 4 + 16, 24); };
function targets() {
  const t = [tgt("stage", 30, 66, 576, 360), speciesTarget(), tgt("door", 636, 306, 128, 136), tgt("heart", 774, 306, 118, 136), tgt("wild", 902, 306, 108, 136)];
  const m = shown(), fr = m && frameOf(S.speciesOf(m));
  if (m && fr) fr.chapters.forEach((c, i) => t.push(tgt("ch" + i, 650 + (i % 4) * 88, 184 + Math.floor(i / 4) * 44, 80, 40)));
  if (m && S.isAdult(G.st, m, G.settings)) t.push(tgt("cross", 636, 250, 374, 46));
  habList().forEach((q, i) => t.push(tgt("s" + q.id, 24 + i * 140, 456, 128, 92)));
  return t;
}
// The pad's order is fixed (nav.mjs): the stage, the chapter plates, Cross, the door, the heart and the gate, then the strip.
function rows(m) { const fr = m && frameOf(S.speciesOf(m)); return habitatRows({ chapters: fr ? fr.chapters.length : 0, adult: !!(m && S.isAdult(G.st, m, G.settings)), bays: habList().map((q) => q.id) }); }
// The Habitat key: the resident last seen, the ring on it.
export function openTop() { const h = H(); h.f = "stage"; h.bondArm = 0; h.wildArm = 0; }
function draw() {
  stageBg();   const m = shown(), h = H(), NOW = clock.now;
  if (!m) { blit(vivArt(600, 380), 20, 56); text("No mibis yet", 320, 200, C.fog, 3, "center"); text("Grow a founder from a read pod · the next build", 320, 246, C.mist, 2, "center"); return; }
  h.id = m.id; if (UI.meet === m.id) { UI.meet = null; FX.meetId = m.id; }
  const fr = frameOf(S.speciesOf(m));
  blit(art("habviv", () => cropPB(vivArt(SW, SH - LINE_H), 200, 120, 600, 380)), 20, 56);
  const isW = m.id === effWithId(), mo = FX.moment && FX.moment.id === m.id && NOW - FX.moment.at < 1800 ? NOW - FX.moment.at : -1;
  const st = stageWord(m), size = st === "juvenile" ? 230 : 290, x = 320 - size / 2, y = 420 - size;
  blit(art("hshadow" + size, () => { const pb = new PB(size, 16); pb.ell(size / 2, 8, size * 0.36, 7, C.void, { chk: 1 }); return pb; }), x, y + size * 0.86);
  const set = landedSet(m), painted = set ? paintedArt(set, m.sha, size, Math.round(size * 310 / 300), { sprite: true }) : null;
  if (painted) blit(painted, x, y - (mo >= 0 ? Math.round(Math.abs(Math.sin(mo / 150)) * 16) : 0));
  else if (fr && m.genome) blit(mibiArt(fr, m.genome, size, size, "portrait"), x, y - (mo >= 0 ? Math.round(Math.abs(Math.sin(mo / 150)) * 16) : 0));
  const lamp = lampText(m); if (lamp) { blit(waitLamp(), 40, 402); text(lamp + " · placeholder", 58, 400, C.fog, 2); } else if (m.paint?.state === "failed") text("its painting failed · the placeholder stands", 40, 400, C.mist, 2);
  if (FX.meetId === m.id) { const t = "Meet " + m.name + " · new"; panel(36, 70, textW(t, 3) + 32, 44, C.focus, C.rust); text(t, 52, 79, C.panel, 3); }
  else if (isW) { panel(36, 70, 250, 34, C.focus, C.hairline); text("in the Companion with you", 161, 80, C.panel, 2, "center"); }
  // the card
  panel(636, 50, 374, 246, C.paper, C.hairline);
  text(clipText(m.name, 220, 3), 654, 62, C.panel, 3); if (m.bonded) blit(ICON.heart(true), 654 + textW(clipText(m.name, 220, 3), 3) + 10, 60);
  text("your " + S.spName(m) + ", " + st, 654, 98, C.bark, 2);
  registerPictures([{ kind: "slot", id: MARK_GUIDE, master: "mark-guide-16", size: [16, 16], until: "the field guide masters (station-layouts.md, Masters for the guide)" }], { podById: () => null, frameOf });
  if (isFilled(MARK_GUIDE)) blit(assetOf(MARK_GUIDE), 654 + textW("your " + S.spName(m), 2) + 4, 96); text(m.parents ? "bred · " + (S.mibiFullyRead(m, G.settings) ? "fully read" : "one of these until read") : m.shaped && m.shaped.length ? "shaped: " + clipText(m.shaped.join(", "), 170, 2) : "grown as its pod was", 654, 120, C.bark, 2);
  text(clipText(m.parents ? "of " + m.parents.map((p) => p.name).join(" and ") : m.mem ? "remembers the " + m.mem : m.from.g ? "from the " + (S.PLACE_WORD[m.from.g] || m.from.g) : "hasn’t been out yet", 236, 2), 654, 142, C.clay, 2);
  text(codeText(m.code), 654, 164, C.hairline, 2);
  if (fr && m.genome) { const sp = stampArt(fr, m.genome, m.read, 88); if (sp) blit(sp, 904, 58); }
  // the chapters as tabs: read ones show, unread ones (a bred child) name their price; ✓ on one reads it
  if (fr && m.genome) fr.chapters.forEach((ch, i) => { const px = 650 + (i % 4) * 88, py = 184 + Math.floor(i / 4) * 44, read = m.read.includes(ch.id), cost = read ? 0 : S.mibiReadCost(G.st, m, ch.id, G.settings);
    panel(px, py, 80, 40, read ? C.bevel : C.sand, C.bar); blit(emblemArt(ch.id), px + 4, py + 4);
    text(clipText(ch.name, 54, 1), px + 24, py + 4, read ? C.bone : C.panel, 1); text(read ? "read" : ch.sealed && !G.settings.sealedOpen ? "sealed" : cost === 0 ? "free" : cost + " ◆", px + 24, py + 21, read ? C.sand : C.rust, 1); });
  if (S.isAdult(G.st, m, G.settings)) { panel(636, 250, 374, 46, C.tealD, C.aqua); text("✕ cross " + m.name + " with another adult " + S.spName(m), 823, 262, C.mint, 2, "center"); }
  else text(S.mibiStage(G.st, m, G.settings) === "juvenile" ? "crosses once adult" : "", 823, 262, C.clay, 2, "center");
  // the with-you door and the bond heart
  const wm = mibiById(effWithId()), pend = S.pendingWith(G.st, G.sv);
  panel(636, 306, 128, 136, C.hairline, C.bar); panel(646, 316, 50, 112, C.panel, C.bevel);
  const wfr = wm && frameOf(S.speciesOf(wm)); if (wm && wfr && wm.genome) { const ws = landedSet(wm); blit(ws ? paintedArt(ws, wm.sha, 44, 44, { sprite: true }) : mibiArt(wfr, wm.genome, 44, 44, "portrait"), 649, 350); } else blit(ICON.comp(), 664, 360);
  text("with you", 730, 330, C.focus, 2, "center"); wrapText(wm ? wm.name : "no one", 60, 2).slice(0, 2).forEach((l, i) => text(l, 730, 356 + i * 20, C.bone, 2, "center"));
  if (pend && !docked()) wrapText(pend.name + " next dock", 60, 2).slice(0, 2).forEach((l, i) => text(l, 730, 396 + i * 20, C.amber, 2, "center"));
  panel(774, 306, 118, 136, C.hairline, C.bar); blit(ICON.heart(!!m.bonded), 818, 322);
  text(m.bonded ? "bonded" : S.bondOffered(m) ? "offered" : "bond", 833, 364, m.bonded ? C.coral : C.focus, 2, "center");
  if (!m.bonded && !S.bondOffered(m)) ["after a", "first outing"].forEach((l, i) => text(l, 833, 388 + i * 20, C.mist, 2, "center"));
  panel(902, 306, 108, 136, C.panel, C.hairline); blit(gateArt(), 918, 312); text("to the wild", 956, 386, C.fog, 2, "center"); text("+2 ❀", 956, 410, C.focus, 2, "center");
  if (h.wildArm) text("✓ again", 956, 428, C.amber, 2, "center");
  // the strip of bays
  panel(16, 450, 994, 104, C.ground, C.bar);
  habList().forEach((q, i) => { const sx = 24 + i * 140, qf = frameOf(S.speciesOf(q)); panel(sx, 456, 128, 92, q.id === m.id ? C.bar : C.panel, C.hairline); if (qf && q.genome) { const qs = landedSet(q); blit(qs ? paintedArt(qs, q.sha, 60, 60, { sprite: true }) : mibiArt(qf, q.genome, 60, 60, "portrait"), sx + 34, 460); } text(clipText(q.name, 120, 2), sx + 64, 526, q.id === effWithId() ? C.amber : C.fog, 2, "center"); });
  for (let i = habList().length; i < (G.settings.bays || S.BAYS) + 1 && i < 7; i++) { const sx = 24 + i * 140; for (let k = 0; k < 128; k += 8) { R(sx + k, 456, 4, 2, C.hairline); R(sx + k, 546, 4, 2, C.hairline); } text("free", sx + 64, 496, C.hairline, 2, "center"); }
  const t = targets().find((q) => q.id === h.f); if (t) focusRing(t.x - 3, t.y - 3, t.w + 6, t.h + 6); else h.f = "stage";
}
function line() {
  const m = shown(), h = H(), back = "Home"; if (!m) return { back, subject: "no mibis yet" };
  const isW = m.id === effWithId(), subj = m.name + " · " + S.spName(m) + " · " + stageWord(m);
  if (h.f === "stage" || isStrip(h.f)) return { ok: "Spend time with " + m.name, back, subject: subj, need: isW ? m.name + " is with you" : null };
  if (h.f === "species") return { ok: "Open the guide", back, subject: "every " + S.spName(m), need: null };   // a jump to the Book's guide spread: the species, not this mibi
  if (h.f === "door") { if (isW) return { back, subject: m.name + " is with you" + (docked() ? "" : " · away") }; return { ok: "Take " + m.name + " with you", price: docked() ? "now" : "at the next dock", back, subject: subj }; }
  if (h.f === "heart") { if (m.bonded) return { back, subject: m.name + " is bonded" }; if (!S.bondOffered(m)) return { back, subject: "bond is offered after a first outing" }; return { ok: h.bondArm ? "Again: bond with " + m.name : "Bond with " + m.name, back, subject: "a small heart · no meters" }; }
  if (h.f === "wild") { const b = S.returnMibiBlock(G.st, G.sv, m); if (b) return { back, subject: "return to the wild · " + b }; return { ok: h.wildArm ? "Again: return " + m.name : "Return " + m.name + " to the wild", price: "+2 ❀", back, subject: "its place remembers it · never taken back" }; }
  if (h.f === "cross") { const ps = S.crossPartners(G.st, G.sv, m, G.settings); return ps.length ? { ok: "Cross " + m.name, back, subject: subj, need: S.plural(ps.length, "adult " + S.spName(m)) + " to pair" } : { back, subject: subj, need: "no other adult " + S.spName(m) + " to pair" }; }
  if (h.f.startsWith("ch")) { const fr = frameOf(S.speciesOf(m)), ch = fr?.chapters[+h.f.slice(2)]; if (!ch) return { back };
    if (m.read.includes(ch.id)) return { back, subject: m.name + " · " + ch.name + " · read" };
    if (ch.sealed && !G.settings.sealedOpen) return { back, subject: m.name + " · " + ch.name + " · sealed" };
    const cost = S.mibiReadCost(G.st, m, ch.id, G.settings); return { ok: "Read " + ch.name, price: cost === 0 ? "free" : cost + " ◆", dim: G.st.d < cost, back, subject: m.name + " · " + ch.name + " · one of these until read" }; }
  return { back };
}
function act(k) {
  const h = H(), m = shown(); if (k !== "confirm") { h.bondArm = 0; h.wildArm = 0; }
  if (k === "back") { goScreen("home"); return; }   // up to Home, whichever way you came (a jump from the Book included)
  if (k in DIRS) { if (!m) return; const f = habitatMove(rows(m), h.f, k, m && m.id); h.f = f; if (isStrip(f)) h.id = +f.slice(1); return; }
  if (k !== "confirm" || !m) return;
  if (h.f === "stage" || isStrip(h.f)) { FX.moment = { id: m.id, at: clock.now }; lockInput(300); msg(m.name + " leans on the glass · " + (m.mem ? "it remembers the " + m.mem : m.from.g ? "it came from the " + (S.PLACE_WORD[m.from.g] || m.from.g) : "it hasn’t been out yet")); }
  else if (h.f === "species") openGuide(S.speciesOf(m));   // ✓ Open the guide: ← there reads Library
  else if (h.f === "door") { if (m.id !== effWithId()) { const r = S.takeWith(G.st, G.sv, m); if (r.ok) { msg(r.msg); save(); } } }
  else if (h.f === "wild") { if (S.returnMibiBlock(G.st, G.sv, m)) { msg(S.returnMibi(G.st, G.sv, m, G.settings).msg); return; } if (!h.wildArm) { h.wildArm = 1; msg("Return " + m.name + " to the wild? Never taken back · ✓ again"); } else { h.wildArm = 0; const r = S.returnMibi(G.st, G.sv, m, G.settings); msg(r.msg); if (r.ok) { h.id = null; h.f = "stage"; save(); } } }
  else if (h.f === "cross") { if (S.crossPartners(G.st, G.sv, m, G.settings).length) openCross(m); else msg("No other adult " + S.spName(m) + " to pair with " + m.name); }
  else if (h.f.startsWith("ch")) { const fr = frameOf(S.speciesOf(m)), ch = fr?.chapters[+h.f.slice(2)]; if (!ch) return; const r = S.readMibi(G.st, m, ch.id, G.settings); if (r.ok) { msg((r.first ? "The first read is free · " : "") + ch.name + " read" + (r.newLooks.length ? " · new: " + r.newLooks.slice(0, 3).join(", ") : "")); save(); } else if (r.msg) msg(r.msg); }
  else if (h.f === "heart" && S.bondOffered(m)) { if (!h.bondArm) { h.bondArm = 1; msg("Bond with " + m.name + "? A deliberate choice · ✓ again"); } else { h.bondArm = 0; msg(S.bond(G.st, m).msg); save(); } }
}
registerScreen("habitat", { draw, line, act });
