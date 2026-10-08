// The incubator: the dome large with the glowing bud (a bean, never an embryo), a ring of leaves (one a
// minute), the chapter tabs clearing across the wait, the stamp and the code; ✓ Grow now · price while
// growing; ready: the shape glows inside and ✓ Open plays the hatch, then the meet view on Habitat.
import { SW, C, R, blit, text, textW, clipText, panel, focusRing, art, PB, clamp, clock, motion } from "../gfx.mjs";
import { emblemArt, domeArt, budArt, crackArt, leafArt, stampArt, mibiArt, paintedArt } from "../art.mjs";
import { landedSet } from "../caddy.mjs";
import { G, FX, UI, msg, lockInput, save, goScreen, registerScreen, mibiById } from "../game.mjs";
import { benchBg, drawTop } from "./frame.mjs";
import * as S from "../state.mjs";
import { frameOf, codeText } from "../genome.mjs";

export const HATCH_MS = 2600;
const hatching = () => FX.hatch && clock.now - FX.hatch.at < HATCH_MS;
function draw() {
  benchBg(); drawTop("Incubator");
  const B = G.st.bud, NOW = clock.now;
  if (hatching()) { drawHatch(); return; }
  if (!B) { blit(domeArt(260, 260, false), 382, 250); text("The incubator is empty", 512, 120, C.fog, 3, "center"); text("Shape a founder from a read pod at Research", 512, 166, C.mist, 2, "center"); return; }
  const fr = frameOf(B.species), pr = S.budProgress(G.st, G.settings), ready = pr >= 1;
  // the chapter tabs: known from the start, cleared as it grew, still misty
  const tabs = fr.chapters, tw = Math.min(150, Math.floor((820 - (tabs.length - 1) * 8) / tabs.length)), tx0 = 190 + Math.round((820 - (tabs.length * tw + (tabs.length - 1) * 8)) / 2);
  tabs.forEach((c, i) => { const known = S.budChapterKnown(G.st, c.id, G.settings), fromRead = B.read.includes(c.id), x = tx0 + i * (tw + 8);
    panel(x, 50, tw, 54, known ? C.tealD : C.night, known ? C.aqua : C.slate); blit(emblemArt(c.id), x + 8, 58); text(clipText(c.name, tw - 36, 2), x + 30, 59, known ? C.mint : C.stone, 2);
    text(fromRead ? "read" : known ? "cleared" : "misty", x + 30, 81, fromRead ? C.aqua : known ? C.lamp : C.stone, 2); });
  blit(domeArt(300, 300, ready), 362, 180);
  const stage = pr < 0.5 ? 0 : 1, e = budArt(stage), bob = motion() ? Math.round(Math.sin(NOW / 500) * 3) : 0;
  if (ready) { const spr = mibiArt(fr, B.genome, 120, 120, "portrait"); blit(art("glowpool", () => { const pb = new PB(160, 60); pb.ell(80, 30, 78, 28, C.cream, { dith: [C.lamp, 8] }); return pb; }), 432, 350); blit(spr, 452, 270 + bob); }
  else blit(e, 512 - e.w / 2, 360 - e.h / 2 + bob);
  // one leaf per minute, filling smoothly over its minute (capped at twenty-one around the dome)
  const n = Math.min(B.minutes, 21);
  for (let i = 0; i < n; i++) { const a = -Math.PI + (i + 0.5) * Math.PI / n, f = clamp(pr * n - i, 0, 1), lf = leafArt(f, true); blit(lf, 512 + Math.cos(a) * 196 - lf.w / 2, 360 + Math.sin(a) * 170 - lf.h / 2); }
  if (B.minutes > 21) text("and " + (B.minutes - 21) + " more leaves", 512, 500, C.mist, 2, "center");
  // the stamp on its label and the code as live text
  const stamp = stampArt(fr, B.genome, fr.chapters.filter((c) => S.budChapterKnown(G.st, c.id, G.settings)).map((c) => c.id), 120);
  if (stamp) { panel(830, 300, stamp.w + 12, stamp.h + 12, C.bone, C.slate); blit(stamp, 836, 306); }
  text(codeText(B.code), 896, 452, C.lamp, 2, "center"); text(B.kind === "cross" ? "child of " + B.parents.map((p) => p.name).join(" and ") : S.spName(B) + " founder", 896, 476, C.fog, 2, "center");
  if (FX.stamp && NOW - FX.stamp.at < 1500) { panel(362, 120, 300, 50, C.lamp, C.wood2); text(codeText(FX.stamp.code), 512, 134, C.wood0, 3, "center"); }
  if (ready && motion() && Math.floor(NOW / 400) % 2) focusRing(358, 176, 308, 308);
}
function drawHatch() {
  const h = FX.hatch, m = mibiById(h.id); if (!m) return; const k = clamp((clock.now - h.at) / HATCH_MS, 0, 1), fr = frameOf(S.speciesOf(m));
  const lift = Math.round(Math.min(1, k * 2) * 220); blit(domeArt(300, 300, true, "base"), 362, 180); if (k < 0.5) blit(domeArt(300, 300, true, "glass"), 362, 180 - lift);
  if (k < 0.35) blit(crackArt(), 477, 325);
  else { const size = 180, x = 512 - size / 2 + Math.round(Math.max(0, k - 0.5) * 2 * 140), y = 230, set = landedSet(m); blit(set ? paintedArt(set, m.sha, size, size, { sprite: true }) : mibiArt(fr, m.genome, size, size, "portrait"), x, y); }
  if (k > 0.45) { const t = m.name + " · " + S.spName(m) + " · juvenile", w = textW(t, 3) + 40; panel(512 - w / 2, 92, w, 48, C.lamp, C.wood2); text(t, 512, 103, C.wood0, 3, "center"); }
}
function line() {
  const B = G.st.bud; if (hatching()) return { back: "Home", subject: "a new mibi" };
  if (!B) return { back: "Home", subject: "the incubator is empty" };
  if (S.budReady(G.st, G.settings)) return { ok: "Open", back: "Home", subject: (B.kind === "cross" ? "the child of " + B.parents.map((p) => p.name).join(" and ") : S.spName(B) + " bud") + " · ready" + (S.bayFull(G.st, G.settings) ? " · no bay free" : ""), dim: S.bayFull(G.st, G.settings) };
  const c = S.instantGrowCost(G.settings), can = S.canPay(G.st, c.e, c.d, c.s);
  return { ok: "Grow now", price: can ? S.priceText(c.e, c.d, c.s) : S.shortText(G.st, c.e, c.d, c.s), dim: !can, back: "Home", subject: S.spName(B) + " bud · growing", need: "surprises clear as it grows" };
}
function act(k) {
  if (k === "back") { goScreen("home"); return; }
  if (k !== "confirm" || !G.st.bud) return;
  if (S.budReady(G.st, G.settings)) { const r = S.openBud(G.st, G.sv, G.settings, Date.now()); if (!r.ok) { msg(r.msg); return; }
    FX.hatch = { id: r.mibi.id, at: clock.now, go: true }; lockInput(HATCH_MS); UI.meet = r.mibi.id; save(); }
  else { const r = S.instantGrow(G.st, G.settings, Date.now()); if (!r.ok) { if (r.msg) msg(r.msg); return; } msg("The bud grows now"); save(); }
}
registerScreen("incubator", { draw, line, act });
