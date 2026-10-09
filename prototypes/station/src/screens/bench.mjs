// The Probe bench (from Home's cradle) and Idle, as built.
import { SW, SH, LINE_H, C, art, PB, clock } from "../pixels.mjs";
import { R, blit, text, panel, focusRing } from "../gfx.mjs";
import { probeArt, vivArt } from "../art.mjs";
import { G, UI, msg, save, goScreen, registerScreen, docked, bayCrates, effWithId, atHome, mibiById } from "../game.mjs";
import { stageBg, lampPool, tgt, navSpatial, DIRS, drawResidents } from "./frame.mjs";
import { drawBed } from "./home.mjs";
import * as S from "../state.mjs";

const B = () => UI.bench;
const benchTargets = () => [tgt("plate", 120, 380, 300, 60), tgt("switch", 520, 120, 420, 90), tgt("slot", 520, 260, 420, 160)];
const P2 = () => ({ e: S.price(S.PRICE.tier2E, G.settings), d: S.price(S.PRICE.tier2D, G.settings) });
function draw() {
  stageBg();   const pr = docked() ? G.st.probe : null, b = B();
  lampPool(270, 300, 230, 200);
  blit(art("cradleBig", () => { const pb = new PB(340, 80); pb.ell(170, 44, 168, 34, C.hairline); pb.ell(170, 36, 150, 24, C.bar); pb.outline(() => C.panel); return pb; }), 100, 300);
  if (pr) blit(probeArt(7), 172, 120); else { text("The Probe is away", 270, 220, C.fog, 3, "center"); text("with the Companion", 270, 260, C.mist, 2, "center"); }
  const n = pr ? pr.smax : S.TIER[S.tierNow(G.st, G.sv)].shield, sh = pr ? pr.shield : -1;
  for (let i = 0; i < n; i++) { const px = 270 - n * 37 + i * 74; if (sh < 0) R(px, 392, 64, 36, C.bar); else if (i < sh) { R(px, 392, 64, 36, C.bone); R(px, 420, 64, 8, C.fog); } else { R(px, 392, 64, 36, C.slate); R(px + 3, 395, 58, 30, C.ink); } }
  text(pr ? "tier " + pr.tier + " · " + pr.shield + " of " + pr.smax + " plates" : "last seen tier " + S.tierNow(G.st, G.sv), 270, 448, C.fog, 2, "center");
  panel(520, 120, 420, 90, C.hairline, C.bar);
  R(548, 150, 70, 30, C.panel); R(G.st.mendFull ? 584 : 552, 152, 32, 26, G.st.mendFull ? C.leaf : C.stone);
  text("Mend fully on docking", 640, 140, C.bone, 2); text(G.st.mendFull ? "on · 1 ⚡ a plate · cheaper at the dock" : "off · only the free plates", 640, 166, C.mist, 2);
  const lit = S.tier2Ready(G.st, G.settings), has2 = pr && pr.tier >= 2, p2 = P2();
  panel(520, 260, 420, 160, lit ? C.focus : C.bar, C.hairline);
  if (has2) { text("Tier 2 installed", 730, 300, C.mist, 3, "center"); text("reaches 4 cells · 3 pods · 4 plates", 730, 344, C.mist, 2, "center"); }
  else { text("Tier 2 slot", 730, 286, lit ? C.panel : C.bevel, 3, "center"); text("reaches 4 cells · 3 pods · reads the deep", 730, 326, lit ? C.bar : C.bevel, 2, "center");
    text(S.priceText(p2.e, p2.d, 0) + (lit ? "" : pr ? " · " + S.shortText(G.st, p2.e, p2.d, 0) : " · dock first"), 730, 360, lit ? C.rust : C.bevel, 2, "center");
    if (b.arm) text("armed · ✓ again installs", 730, 392, C.rust, 2, "center"); }
  const t = benchTargets()[b.f]; if (t) focusRing(t.x - 3, t.y - 3, t.w + 6, t.h + 6);
}
function line() {
  const b = B(), pr = docked() ? G.st.probe : null, p2 = P2(), mend = S.price(S.PRICE.mend, G.settings);
  if (b.f === 0) { if (!pr) return { back: "Home", subject: "the Probe is away with the Companion" }; if (pr.shield >= pr.smax) return { back: "Home", subject: "Probe · tier " + pr.tier + " · whole" };
    return { ok: "Mend a plate", price: G.st.e >= mend ? (mend ? mend + " ⚡" : "free") : S.shortText(G.st, mend, 0, 0), dim: G.st.e < mend, back: "Home", subject: "cheaper at the dock than a field patch (3 ⚡)", need: S.plural(pr.smax - pr.shield, "plate") + " to mend" }; }
  if (b.f === 1) return { ok: "Switch " + (G.st.mendFull ? "off" : "on"), price: "free", back: "Home", subject: "mend fully on docking · " + (G.st.mendFull ? "on" : "off") };
  if (pr && pr.tier >= 2) return { back: "Home", subject: "tier 2 installed" };
  if (!S.tier2Ready(G.st, G.settings)) return { back: "Home", subject: "tier 2 · " + S.priceText(p2.e, p2.d, 0) + (pr ? "" : " · dock first") };
  return { ok: b.arm ? "Again: install tier 2" : "Arm tier 2", price: S.priceText(p2.e, p2.d, 0), back: "Home", subject: "the tier 2 slot is lit" };
}
function act(k) {
  const b = B(); if (k !== "confirm") b.arm = 0;
  if (k === "back") { goScreen("home"); return; }
  if (k in DIRS) { const ids = benchTargets().map((t) => t.id), c = ids[b.f]; b.f = ids.indexOf(navSpatial(benchTargets(), c, k)); return; }
  if (k !== "confirm") return;
  if (b.f === 0) { const r = S.mendPlate(G.st, G.settings); if (r.msg) msg(r.msg); if (r.ok) save(); }
  else if (b.f === 1) { G.st.mendFull = !G.st.mendFull; save(); }
  else if (S.tier2Ready(G.st, G.settings)) { if (!b.arm) { b.arm = 1; msg("Tier 2 · " + S.priceText(P2().e, P2().d, 0) + " · ✓ again to install"); } else { b.arm = 0; const r = S.installTier2(G.st, G.settings); if (r.ok) { msg(r.msg); save(); } } }
}
// The bench opens on what has an action: the plates when the Probe is docked and a plate is worn, else the mend switch.
function enter() { const b = B(), pr = docked() ? G.st.probe : null; b.arm = 0; b.f = pr && pr.shield < pr.smax ? 0 : 1; }
registerScreen("bench", { draw, line, act, enter });

// ---------- Idle: the vivarium plays alone ----------
export function drawIdle() {
  blit(vivArt(SW, SH - LINE_H), 0, 0);
  drawBed(SW - 220, SH - LINE_H - 76);
  drawResidents(0, 0, SW, SH - LINE_H, true);
  const w = mibiById(effWithId()), parts = [];
  if (w && !atHome().length) text(w.name + (docked() ? " is with you in the Companion" : " is out with you"), SW / 2, 160, C.fog, 3, "center");
  parts.push(docked() ? "Companion docked" : "Companion away"); if (w) parts.push("with " + w.name);
  if (docked() && bayCrates().length) parts.push(S.plural(bayCrates().length, "crate") + " in the bay");
  if (G.st.bud) parts.push(S.budReady(G.st, G.settings) ? "a bud is ready to open" : "a bud is growing");
  R(0, SH - LINE_H, SW, LINE_H, C.void); text(parts.join(" · "), SW / 2, SH - LINE_H + 12, C.fog, 2, "center");
}
