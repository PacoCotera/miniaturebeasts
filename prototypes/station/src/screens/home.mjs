// Home: the vivarium (the living window) and the bench's modules; Dock and arrival; the report card.
// As the stand-in v2 built it, drawing residents and pods from the frames now.
import { SW, SH, LINE_H, C, R, blit, text, textW, clipText, panel, focusRing, art, PB, clamp, clock, motion, bay } from "../gfx.mjs";
import { podSprite } from "../podsprites.mjs";
import { ICON, crateArt, cupArt, domeArt, budArt, leafArt, probeArt, lampArt, bedArt, vivArt, starArt } from "../art.mjs";
import { G, FX, UI, ARRIVE_MS, msg, lockInput, save, goScreen, registerScreen, need, docked, hasWorld, bayCrates, effWithId, atHome, mibiById, arriving } from "../game.mjs";
import { stageBg, lampPool, drawResidents, stepResidents, tgt, navSpatial, DIRS, stageWord } from "./frame.mjs";
import * as S from "../state.mjs";
import { frameOf } from "../genome.mjs";

const VIV = { x: 14, y: 50, w: 636, h: 500 }, BENCH = { bay: [664, 50, 346, 118], tray: [664, 178, 346, 92], inc: [664, 280, 168, 170], cradle: [842, 280, 168, 170], lamp: [956, 460, 54, 84] };
const POD_SHELL = { meadow: "lime", pond: "ice", rock: "sand", wood: "sprout", cave: "lavender" };
let homeBoxes = [];
function homeTargets() {
  const t = [];
  for (const b of homeBoxes) t.push(tgt("r:" + b.m.id, b.x, b.y, b.w, b.h));
  for (const k in BENCH) t.push(tgt(k, ...BENCH[k]));
  return t;
}
const bedSpot = () => ({ x: VIV.x + VIV.w - 170, y: VIV.y + VIV.h - 70 });
export function drawBed(bx, by) {
  const w = mibiById(effWithId());
  blit(bedArt(), bx, by);
  if (w) { blit(ICON.comp(), bx + 68, by + 4); text(clipText(w.name + (docked() ? " is with you" : " is out with you"), 240, 2), bx + 75, by - 20, C.fog, 2, "center"); }
}
export const podFrame = (p) => frameOf(S.speciesOf(p));
export const podState = (p) => (p.idd ? "identified" : "sealed");
// The pod's frame shows on its shell only once the species is known (a quiet grey pod before).
export const shellFrame = (p) => (G.st.knownIds.includes(S.speciesOf(p)) ? podFrame(p) : null);
function drawTray(x, y, w, hideIds) {   // six cups in a row (the bench)
  const rack = G.settings.rack || S.RACK, step = Math.floor(w / rack);
  for (let i = 0; i < rack; i++) { const cx = x + i * step + (step - 52) / 2, p = G.st.tray[i]; blit(cupArt(false), cx, y + 40);
    if (p && !(hideIds && hideIds.has(p.id))) { const a = podSprite(shellFrame(p)?.species.id ?? null, "well", podState(p)); blit(a, cx + 26 - a.w / 2, y + 50 - a.h); if (S.podGlints(G.st, p)) blit(starArt(false), cx + 36, y + 2); } }
}
function drawIncSmall(x, y) {
  const B = G.st.bud, ready = S.budReady(G.st, G.settings); blit(domeArt(120, 120, ready), x + 24, y + 22);
  if (B) { const p = S.budProgress(G.st, G.settings), stage = p < 0.5 ? 0 : 1, e = budArt(stage); blit(e, x + 84 - e.w / 2, y + 52);
    const n = Math.min(B.minutes, 20); for (let i = 0; i < n; i++) { const f = clamp(p * n - i, 0, 1); blit(leafArt(f, false), x + 14 + i * Math.floor(130 / Math.max(1, n)), y + 146); } }
}
function drawCradle(x, y) {
  const pr = docked() && G.st.probe ? G.st.probe : null, NOW = clock.now;
  blit(art("cradle", () => { const pb = new PB(140, 40); pb.ell(70, 22, 68, 16, C.hairline); pb.ell(70, 18, 60, 11, C.bar); pb.outline(() => C.panel); return pb; }), x + 14, y + 96);
  if (pr) blit(probeArt(3), x + 42, y + 18);
  else blit(art("probeghost", () => { const a = probeArt(3), pb = new PB(a.w, a.h); for (let i = 0; i < a.p.length; i++) if (a.p[i] >= 0 && bay(i % a.w, (i / a.w) | 0) < 5) pb.p[i] = C.hairline; return pb; }), x + 42, y + 18);
  const n = pr ? pr.smax : S.TIER[S.tierNow(G.st, G.sv)].shield, sh = pr ? pr.shield : -1, fl = FX.mend && NOW - FX.mend.at < 1600 && Math.floor((NOW - FX.mend.at) / 200) % 2 === 0;
  for (let i = 0; i < n; i++) { const px = x + 84 - n * 15 + i * 30; if (sh < 0) R(px, y + 140, 26, 12, C.bar); else if (i < sh) { R(px, y + 140, 26, 12, fl ? C.cream : C.bone); R(px, y + 149, 26, 3, C.fog); } else { R(px, y + 140, 26, 12, C.slate); R(px + 2, y + 142, 22, 8, C.ink); } }
}
function drawBay(x, y) {   // the bay door: closed, or open with one sealed crate per consignment
  const NOW = clock.now;
  blit(art("baydoor", () => { const pb = new PB(346, 118); pb.rect(0, 8, 346, 110, C.bar); pb.rect(4, 12, 338, 102, C.panel); for (let i = 0; i < 8; i++) pb.rect(4, 12 + i * 13, 338, 1, C.bar); pb.rect(0, 8, 346, 3, C.bevel); pb.outline(() => C.void); return pb; }), x, y);
  const cs = docked() ? bayCrates() : [], a = FX.arr && arriving() ? FX.arr : null;
  if (!cs.length && !a) { text(docked() ? "the bay is empty" : "closed · crates land here", x + 173, y + 58, C.bevel, 2, "center"); return; }
  const list = a ? a.plays.map((p) => p.c) : cs, i0 = a ? Math.floor((NOW - a.at) / ARRIVE_MS) : -1;
  list.slice(0, S.BAY).forEach((c, i) => {
    const slide = motion() ? clamp((NOW - FX.crateIn - i * 250) / 500, 0, 1) : 1, cx = x + 14 + i * 110, cy = y + 30 - Math.round((1 - slide) * 30);
    if (a && i < i0) { text("opened", cx + 48, cy + 32, C.bevel, 2, "center"); return; }
    const sh = (c.pods && c.pods[0] && POD_SHELL[c.pods[0].g]) || "sand"; blit(crateArt(sh, Math.min(3, (c.pods || []).length)), cx, cy + 6);
    if (a && i === i0) { const k = ((NOW - a.at) % ARRIVE_MS) / ARRIVE_MS; if (k > 0.25) R(cx + 72, cy + 12, 16, 16, C.bevel); if (k > 0.25 && k < 0.45) for (let j = 0; j < 6; j++) R(cx + 80 + Math.cos(j) * k * 60, cy + 20 + Math.sin(j) * k * 40, 3, 3, C.red); }
  });
}
function arrivalHidden() { const a = FX.arr; if (!a || !arriving()) return null; const i = Math.floor((clock.now - a.at) / ARRIVE_MS), k = ((clock.now - a.at) % ARRIVE_MS) / ARRIVE_MS, set = new Set();
  a.plays.forEach((p, j) => { if (j > i || (j === i && k < 0.9)) for (const id of p.ids) set.add(id); }); return set; }
function drawArrivingPods() {
  const a = FX.arr; if (!a || !arriving()) return; const NOW = clock.now, i = Math.floor((NOW - a.at) / ARRIVE_MS), k = ((NOW - a.at) % ARRIVE_MS) / ARRIVE_MS, p = a.plays[i]; if (!p || k < 0.4 || k >= 0.9) return;
  const rack = G.settings.rack || S.RACK, step = Math.floor(346 / rack);
  p.ids.forEach((id, j) => { const pod = G.st.tray.find((q) => q.id === id); if (!pod) return; const ci = G.st.tray.indexOf(pod), f = clamp((k - 0.4 - j * 0.08) / 0.35, 0, 1);
    const sx = BENCH.bay[0] + 60 + i * 110, sy = BENCH.bay[1] + 50, ex = BENCH.tray[0] + ci * step + (step - 52) / 2 + 10, ey = BENCH.tray[1] + 4;
    blit(podSprite(shellFrame(pod)?.species.id ?? null, "well", "sealed"), sx + (ex - sx) * f, sy + (ey - sy) * f - Math.sin(f * Math.PI) * 30); });
}
function drawArrivalRibbon() {
  const a = FX.arr; if (!a || !arriving()) return; const i = Math.floor((clock.now - a.at) / ARRIVE_MS), c = a.plays[i].c;
  const t = (c.dev ? "Developer crate " : "Expedition ") + c.n + " home · " + S.plural((c.pods || []).length, "pod") + (c.of ? " · explored " + c.explored + " of " + c.of : "");
  const w = textW(t, 2) + 48, x = VIV.x + (VIV.w - w) / 2, y = VIV.y + 26;
  panel(x, y + 3, w, 36, C.void); panel(x, y, w, 36, C.focus, C.hairline); text(t, x + w / 2, y + 11, C.panel, 2, "center");
}
function drawReport() {   // after the arrivals: what came, the mend, and the world-turn lines; it stays until the next press
  const r = UI.report, tot = { e: 0, d: 0, s: 0 }; for (const p of r.plays) { tot.e += (p.c.e | 0) + p.top.e; tot.d += (p.c.d | 0) + p.top.d; tot.s += (p.c.s | 0) + p.top.s; }
  const lines = r.plays.map((p) => (p.c.dev ? "Developer crate " : "Expedition ") + p.c.n + " home · " + S.plural((p.c.pods || []).length, "pod") + (p.c.of ? " · explored " + p.c.explored + " of " + p.c.of : ""));
  const paid = r.plays.reduce((a, p) => a + p.paid, 0) + (r.mend ? r.mend.paid : 0), free = r.mend ? r.mend.free : 0, pr = G.st.probe;
  const mend = pr ? (r.mend && r.mend.broke ? "The Probe is mended free" : free || paid ? "Shield back to " + S.plural(pr.shield, "plate") + (free ? " · " + free + " free" : "") + (paid ? " · " + paid + " ⚡" : "") : "Shield " + pr.shield + " of " + pr.smax) : "";
  const world = (r.plays[r.plays.length - 1].c.lines || []).slice(0, 3), top = r.plays.some((p) => p.top.e || p.top.d || p.top.s);
  const x = VIV.x + 40, w = VIV.w - 80, h = 64 + lines.length * 24 + (mend ? 26 : 0) + (top ? 22 : 0) + (world.length ? 30 + world.length * 22 : 0), y = VIV.y + 20;
  panel(x, y + 4, w, h, C.void); panel(x, y, w, h, C.paper, C.hairline);
  let yy = y + 14; for (const l of lines) { text(clipText(l, w - 40, 2), x + 20, yy, C.panel); yy += 24; }
  let xx = x + 20; for (const [ic, v] of [["energy", tot.e], ["data", tot.d], ["essence", tot.s]]) { blit(ICON[ic](), xx, yy + 2); xx += 18 + text("+" + v, xx + 18, yy, C.hairline, 2) + 18; }
  yy += 28; if (top) { text("with the loose economy's top-up (developer tools)", x + 20, yy, C.clay); yy += 22; }
  if (mend) { text(mend, x + 20, yy, C.hairline); yy += 26; }
  if (world.length) { text("Meanwhile, the world turned · T" + (G.st.turn + 1), x + 20, yy, C.bark); yy += 26; for (const l of world) { R(x + 24, yy + 6, 4, 4, C.orange); text(clipText(l, w - 60, 2), x + 36, yy, C.panel); yy += 22; } }
}
function drawStatusStrip(x, y) {
  const rows = [], w = mibiById(effWithId()); rows.push([w ? "comp" : null, w ? w.name + " is with you" : "no mibi with you"]);
  rows.push([null, G.st.tray.length ? S.plural(G.st.tray.length, "pod") + " in the rack" + (G.st.waiting.length ? " · " + G.st.waiting.length + " sealed" : "") : "the rack is empty"]);
  rows.push([null, G.st.bud ? (S.budReady(G.st, G.settings) ? "the bud is ready" : "a bud is growing") : atHome().length + " of " + (G.settings.bays || S.BAYS) + " bays taken"]);
  rows.forEach(([ic, t], i) => { if (ic) blit(ICON[ic](), x + 4, y + i * 28); else R(x + 8, y + 7 + i * 28, 6, 6, C.hairline); text(clipText(t, 262, 2), x + 26, y + 3 + i * 28, C.fog); });
}
function drawHome() {
  stageBg();   blit(vivArt(VIV.w, VIV.h), VIV.x, VIV.y);
  const bed = bedSpot(); drawBed(bed.x, bed.y);
  homeBoxes = drawResidents(VIV.x, VIV.y, VIV.w, VIV.h, false);
  if (!G.st.mibis.length) text("The vivarium waits for its first mibi", VIV.x + VIV.w / 2, VIV.y + 150, C.mist, 2, "center");
  else if (!atHome().length) { const w = mibiById(effWithId()); if (w) text(w.name + (docked() ? " is with you in the Companion" : " is out with you"), VIV.x + VIV.w / 2, VIV.y + 150, C.fog, 2, "center"); }
  lampPool(836, 300, 190, 260);
  const [bx, by] = BENCH.bay; drawBay(bx, by);
  const [tx, ty] = BENCH.tray; blit(art("panel", () => { const pb = new PB(346, 20); pb.rect(0, 4, 346, 14, C.ground); pb.rect(0, 4, 346, 3, C.panel); return pb; }), tx, ty + 66);
  drawTray(tx, ty, 346, arrivalHidden());
  drawArrivingPods();
  const [ix, iy] = BENCH.inc; drawIncSmall(ix, iy);
  const [cx, cy] = BENCH.cradle; drawCradle(cx, cy);
  drawStatusStrip(664, 462); blit(lampArt(), 963, 466); text("rest", 983, 538, C.mist, 2, "center");
  drawArrivalRibbon();
  if (!arriving() && UI.report && clock.now > UI.report.at) drawReport();
  const f = UI.home.f;
  if (f !== "room") { const t = homeTargets().find((q) => q.id === f); if (t) focusRing(t.x - 4, t.y - 4, t.w + 8, t.h + 8); else UI.home.f = "room"; }
}
function homeLine() {
  const f = UI.home.f, nd = need();
  if (arriving()) return { subject: "the bay opens · one crate at a time", need: "" };
  if (f === "room") return { ok: nd.act ? nd.label : "", back: "", subject: "the room", need: nd.text };
  if (f === "focus") return { ok: "Rest", back: "room", subject: "the lamp · the vivarium plays alone", need: nd.text };
  if (f.startsWith("r:")) { const m = mibiById(+f.slice(2)); return m ? { ok: "Look at " + m.name, back: "room", subject: m.name + " · " + S.spName(m) + " · " + stageWord(m), need: nd.text } : { back: "room" }; }
  if (f === "bay") { const n = bayCrates().length; if (docked() && n) return { ok: "Open the bay", price: S.plural(n, "crate"), back: "room", subject: S.plural(n, "sealed crate") };
    return { back: "room", subject: docked() ? "the bay is empty" : "the bay door · closed while the Companion is away", need: nd.text }; }
  if (f === "tray") return { ok: "Look at the pods", back: "room", subject: G.st.tray.length ? S.plural(G.st.tray.length, "pod") + " in the rack" : "the rack is empty", need: nd.text };
  if (f === "inc") return { ok: S.budReady(G.st, G.settings) ? "Open the incubator" : "Look at the incubator", back: "room", subject: G.st.bud ? S.spName(G.st.bud) + " bud · " + (S.budReady(G.st, G.settings) ? "ready" : "growing") : "the incubator is empty", need: nd.text };
  if (f === "cradle") { const pr = docked() && G.st.probe; return { ok: "Open the Probe bench", back: "room", subject: pr ? "Probe · " + pr.shield + " of " + pr.smax + " plates" : "the Probe is away", need: nd.text }; }
  return { back: "room" };
}
export function openBay() {
  const r = S.openBay(G.st, G.sv, G.settings, Date.now()); if (!r.ok) return;
  FX.arr = { plays: r.plays, at: clock.now }; lockInput(r.plays.length * ARRIVE_MS + 200);
  UI.report = { plays: r.plays, at: clock.now + r.plays.length * ARRIVE_MS, mend: FX.mend };
  save();
}
export function dockKey() {
  const r = S.dockKey(G.st, G.sv, G.settings, Date.now());
  if (!r.ok) { msg(r.msg); return; }
  if (r.docked) { FX.mend = { ...r.mend, at: clock.now }; FX.crateIn = clock.now; }
  msg(r.msg); save();
}
function doNeed(nd) {
  if (nd.act === "bay") openBay();
  else if (nd.act === "inc") goScreen("incubator");
  else if (nd.act === "meet") { UI.hab.id = UI.meet; UI.hab.f = "stage"; UI.meet = null; goScreen("habitat"); }
  else if (nd.act === "pods") { const p = G.st.tray.find((q) => !q.idd) || G.st.tray.find((q) => S.podGlints(G.st, q)) || G.st.tray[0]; if (p) { UI.pods.cur = p.id; UI.pods.ci = G.st.tray.indexOf(p); } UI.pods.f = "pod"; goScreen("pods"); }
  else if (nd.act === "hab") { UI.hab.id = nd.id; UI.hab.f = "heart"; goScreen("habitat"); }
}
function homeAct(k) {
  const H = UI.home;
  if (k in DIRS) { const t = homeTargets(); if (H.f === "room") { const c = tgt("room", 480, 280, 64, 40); H.f = navSpatial(t.concat([c]), "room", k); if (H.f === "room") H.f = t[0] ? t[0].id : "room"; } else H.f = navSpatial(t, H.f, k); return; }
  if (k === "back") { if (H.f !== "room") H.f = "room"; else msg("Home is the top view · the lamp on the bench rests the screen"); return; }
  if (k !== "confirm") return;
  const f = H.f;
  if (f === "room") doNeed(need());
  else if (f.startsWith("r:")) { UI.hab.id = +f.slice(2); UI.hab.f = "stage"; if (UI.meet === UI.hab.id) UI.meet = null; goScreen("habitat"); }
  else if (f === "bay") { if (docked() && bayCrates().length) openBay(); else msg(docked() ? "The bay is empty" : "Dock the Companion to open its crates"); }
  else if (f === "tray") { UI.pods.f = "pod"; goScreen("pods"); }
  else if (f === "inc") goScreen("incubator");
  else if (f === "cradle") { UI.bench.f = 0; goScreen("bench"); }
  else if (f === "focus") { UI.idle = true; FX.restAt = clock.now; H.f = "room"; }
}
registerScreen("home", { draw: drawHome, line: homeLine, act: homeAct });
export { VIV, drawTray };
