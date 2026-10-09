// The frame every screen shares: the top bar (40 px), the bottom line (38 px), the message plate, the
// stage ground, the lamp pool, spatial focus, and the residents living in the vivarium.
import { SW, SH, TOP_H, LINE_H, STAGE_Y, STAGE_H, C, art, PB, ramp, clock, motion } from "../pixels.mjs";
import { R, blit, text, textW, clipText, wrapText, panel } from "../gfx.mjs";
import { ICON, mibiArt, paintedArt, waitLamp } from "../art.mjs";
import { landedSet, lampText } from "../caddy.mjs";
import { G, FX, UI, TL, LAYER, ARRIVE_MS, need, docked, hasWorld, bayCrates, effWithId, atHome, mibiById, arriving } from "../game.mjs";
import * as S from "../state.mjs";
import { frameOf } from "../genome.mjs";
import { frame as frameNodes } from "../../../ui/components/frame.mjs";
import { frameView } from "../views/frame.mjs";

// The frame's nodes for a screen: the title and room mark from the frame spec, the presenter's counters and flashes, who is out and whether a mibi is with the Companion,
// the screen's bottom line and the message plate while the timeline holds it.
export const plateText = () => (FX.msg && TL.progress("plate", "msg") != null && TL.progress("plate", "msg") < 1 ? FX.msg : "");
// The mibi with the Companion, by the key its face is painted under (the species' name in lower case), or null when none is with it.
const withMibiKey = () => { const id = hasWorld() ? S.withId(G.sv) : null, m = id == null ? null : mibiById(id); return m ? S.spName(m).toLowerCase() : null; };
export function frameFor(ctx, screen, line, { need: needText = need().text, focal = null } = {}) {
  return frameNodes(ctx, frameView({ screen, title: ctx.spec.strings.titles[screen], step: LAYER.presenter.step(clock.now, { e: G.st.e, d: G.st.d, s: G.st.s, turn: shownTurn() }, motion()), companion: { docked: docked(), withMibi: withMibiKey() }, line, need: needText, message: plateText(), focal }));
}
export const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
export const tgt = (id, x, y, w, h) => ({ id, x, y, w, h });
// Spatial focus: the pad moves the ring to the nearest thing that way.
export function navSpatial(targets, curId, dir) {
  const cur = targets.find((t) => t.id === curId); if (!cur) return targets.length ? targets[0].id : curId;
  const cx = cur.x + cur.w / 2, cy = cur.y + cur.h / 2, [dx, dy] = DIRS[dir]; let best = null, bd = 1e9;
  for (const t of targets) { if (t === cur || t.nofocus) continue; const vx = t.x + t.w / 2 - cx, vy = t.y + t.h / 2 - cy, along = vx * dx + vy * dy; if (along <= 6) continue;
    const d = along + Math.abs(vx * dy + vy * dx) * 2.2; if (d < bd) { bd = d; best = t; } }
  return best ? best.id : curId;
}
export const hm = (t) => { const d = new Date(t); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };
export function compState() {
  if (!hasWorld()) return "no Companion yet";
  const w = mibiById(S.withId(G.sv)), n = bayCrates().length;
  if (docked()) return "Companion docked" + (n ? " · " + S.plural(n, "crate") + " in the bay" : "") + (w && !n ? " · with " + w.name : "");
  return "Companion away · since " + hm(G.st.dock.at) + (w ? " · with " + w.name : "");
}
export function shownTurn() { const a = FX.arr; if (a && arriving()) { const i = Math.floor((clock.now - a.at) / ARRIVE_MS), p = a.plays[i]; return (clock.now - a.at) % ARRIVE_MS > ARRIVE_MS * 0.55 ? p.turnTo : p.turnFrom; } return G.st.turn; }
export function stageBg() {   // an evening room: deep moss, lit softly from above the middle
  blit(art("stagebg", () => { const pb = new PB(SW, STAGE_H);
    for (let y = 0; y < STAGE_H; y++) for (let x = 0; x < SW; x++) { const d = Math.hypot((x - SW * 0.5) / (SW * 0.62), (y - STAGE_H * 0.3) / (STAGE_H * 0.95)); pb.p[y * SW + x] = ramp(["ground", "panel"], 1.15 - d, x, y); }
    return pb; }), 0, STAGE_Y);
}
// The research bench's ground: a deep blue-teal pane (station-screens.md, the instrument).
export function benchArt() { return art("benchbg", () => { const pb = new PB(SW, STAGE_H);
    for (let y = 0; y < STAGE_H; y++) for (let x = 0; x < SW; x++) { const d = Math.hypot((x - SW * 0.45) / (SW * 0.7), (y - STAGE_H * 0.2) / (STAGE_H * 1.1)); pb.p[y * SW + x] = ramp(["deep", "tealD", "night"], 1.2 - d, x, y); }
    return pb; }); }
export function benchBg() { blit(benchArt(), 0, STAGE_Y); }
export function lampPool(cx, cy, rx, ry, cols = ["ground", "panel", "bar"]) { blit(art("pool" + rx + "x" + ry + cols.join(), () => { const pb = new PB(rx * 2, ry * 2);
  for (let y = 0; y < ry * 2; y++) for (let x = 0; x < rx * 2; x++) { const d = Math.hypot((x - rx) / rx, (y - ry) / ry); if (d > 1) continue; const c = ramp(cols, (1 - d) * 1.1, x, y); if (c !== C[cols[0]]) pb.set(x, y, c); }
  return pb; }), cx - rx, cy - ry); }
// A cool beam from above on the specimen stage: a flat cone of one colour, no grain (chrome is crisp).
export function beamArt(w, h) { return art("beam" + w + "x" + h, () => { const pb = new PB(w, h);
  for (let y = 0; y < h; y++) { const hw = w * 0.12 + (w * 0.38 * y) / h, x0 = Math.ceil(w / 2 - hw), x1 = Math.floor(w / 2 + hw); pb.rect(x0, y, x1 - x0, 1, C.tealD); }
  return pb; }); }
export function beam(cx, topY, w, h) { blit(beamArt(w, h), cx - w / 2, topY); }

// ---------- Residents living in the vivarium (presentation only; positions are not saved) ----------
const RES = new Map();
export const clearResidents = () => RES.clear();
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function resOf(m) { let r = RES.get(m.id); if (!r) { const R2 = mulberry32(m.id * 7919 + (Date.now() & 0xffff)); r = { u: 0.1 + R2() * 0.8, v: 0.15 + R2() * 0.7, tu: 0, tv: 0, face: R2() < 0.5 ? 1 : -1, st: "idle", until: 0, R2, alertUntil: 0 }; r.tu = r.u; r.tv = r.v; RES.set(m.id, r); } return r; }
let lastStep = 0;
export function stepResidents() {
  const NOW = clock.now, dt = Math.min(0.1, (NOW - lastStep) / 1000); lastStep = NOW; if (!motion()) return;
  const list = atHome();
  for (const m of list) { const r = resOf(m);
    if (NOW > r.until) { const x = r.R2();
      if (x < 0.5) { r.st = "walk"; r.tu = 0.06 + r.R2() * 0.88; r.tv = 0.1 + r.R2() * 0.8; r.until = NOW + 6000; }
      else if (x < 0.7) { r.st = "nap"; r.until = NOW + 5000 + r.R2() * 5000; }
      else { r.st = "idle"; r.until = NOW + 2000 + r.R2() * 3000; } }
    if (r.st === "walk") { const sp2 = 0.06 * dt, du = r.tu - r.u, dv = r.tv - r.v, d = Math.hypot(du, dv);
      if (d < 0.01) { r.st = "idle"; r.until = NOW + 1500 + r.R2() * 2500; } else { r.u += (du / d) * Math.min(d, sp2); r.v += (dv / d) * Math.min(d, sp2) * 0.7; if (Math.abs(du) > 0.005) r.face = du > 0 ? 1 : -1; } }
    for (const o of list) if (o !== m) { const q = resOf(o); if (Math.hypot(q.u - r.u, (q.v - r.v) * 0.6) < 0.09 && r.st !== "nap" && NOW > r.alertUntil + 4000) { r.alertUntil = NOW + 900; r.face = q.u > r.u ? 1 : -1; } }
  }
}
// A resident's placeholder sprite at a size: the mibi from its genome; the three-quarter view faces viewer-right, so facing left flips it.
export function residentArt(m, size, faceLeft) { const set = landedSet(m); if (set) { const p = paintedArt(set, m.sha, size, size, { sprite: true, flip: !faceLeft }); if (p) return p; } const fr = frameOf(S.speciesOf(m)); if (!fr || !m.genome) return null; return mibiArt(fr, m.genome, size, size, "three-quarter", !!faceLeft); }
// Draw the residents inside a vivarium placed at (vx, vy) of size w×h. Returns their boxes (for focus).
export function drawResidents(vx, vy, w, h, big) {
  const NOW = clock.now, gy = Math.round(h * 0.62), boxes = [], list = atHome().map((m) => ({ m, r: resOf(m) })).sort((a, b) => a.r.v - b.r.v);
  for (const { m, r } of list) {
    const st = S.mibiStage(G.st, m), size = (st === "juvenile" ? 64 : 96) + (big ? 32 : 0);
    const x = Math.round(vx + 20 + r.u * (w - 40 - size)), y = Math.round(vy + gy - size * 0.75 + r.v * (h - gy - size * 0.3 - 10));
    const walking = r.st === "walk" && motion(), bob = walking ? -Math.round(Math.abs(Math.sin(NOW / 160)) * 5) : 0;
    blit(art("shadow" + size, () => { const pb = new PB(size, 10); pb.ell(size / 2, 5, size * 0.36, 4, C.void, { chk: 1 }); return pb; }), x, y + size * 0.86);
    const spr = residentArt(m, size, r.face < 0); if (spr) blit(spr, x, y + bob + (r.st === "nap" ? 6 : 0));
    if (lampText(m)) blit(waitLamp(), x + size - 12, y + 2);   // the cool waiting lamp: its painting is not here yet
    if (m.bonded) blit(art("minih", () => { const pb = new PB(9, 8); pb.ell(2.5, 2.5, 2.3, 2.3, C.coral); pb.ell(6.5, 2.5, 2.3, 2.3, C.coral); pb.poly([[0, 3], [9, 3], [4.5, 8]], C.coral); return pb; }), x + size / 2 - 4, y - 10 + bob);
    if (r.st === "nap" && motion()) { const z = Math.floor(NOW / 600) % 3; text("z", x + size * 0.7 + z * 4, y + size * 0.2 - z * 8, C.fog, 2); }
    boxes.push({ m, x, y, w: size, h: size });
  }
  return boxes;
}
export const stageWord = (m) => S.mibiStage(G.st, m);
export { effWithId, mibiById, atHome };
