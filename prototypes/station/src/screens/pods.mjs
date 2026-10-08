// Pods (the Research key): the pod list with progress rings, the pod under the beam, the chapter rail,
// the open page of trait pictures, the stamp on its label; Identify, Read, Compare, Return.
// A fixed focus order (playtest r7): wells top to bottom, then the hatch; → from a well to the pod,
// ← back; ↑ from the pod to the chapters, which step ◀ ▶; ↓ from a chapter back to the pod.
import { SW, C, R, g, blit, text, textW, clipText, wrapText, panel, focusRing, art, PB, clamp, clock, motion } from "../gfx.mjs";
import { podArt, ringArt, emblemArt, traitPic, seedPic, frostPic, sealedPic, famArt, baseArt, asleepMark, stampArt, starArt, wellArt, hatchArt } from "../art.mjs";
import { G, FX, UI, READ_MS, ID_MS, msg, lockInput, save, goScreen, registerScreen, docked, podById } from "../game.mjs";
import { benchBg, drawTop, beam, DIRS } from "./frame.mjs";
import { podFrame, shellFrame } from "./home.mjs";
import { openCreate } from "./create.mjs";
import * as S from "../state.mjs";
import { traitState, chapterSeal } from "../genome.mjs";

const LIST = { x: 0, w: 160, y0: 56, step: 72, r: 31 }, HATCH = { x: 20, y: 492, w: 120, h: 56 };
const POD = { cx: 508, top: 290 }, LABEL = { x: 172, y: 316, side: 196 }, PAGE = { x: 612, y: 124, w: 398, h: 426 };
const RAIL = { x: 190, y: 56, w: 820, h: 54 };
const P = () => UI.pods;
const isWell = (f) => /^c\d/.test(f);
const cur = () => podById(P().cur);
const chaptersOf = (p) => (p && p.idd ? podFrame(p).chapters : []);
function chapterFlags(p) { const fr = podFrame(p); return fr ? fr.chapters.map((c) => ({ traits: c.traits.length, read: p.read.includes(c.id) ? 1 : 0, glint: S.glint(G.st, p, c.id), sealed: c.sealed && !G.settings.sealedOpen })) : []; }
function ensure() {   // keep the cradle and the focus valid
  const p = P();
  if (!podById(p.cur)) { const q = G.st.tray.find((x) => !x.idd) || G.st.tray.find((x) => S.podGlints(G.st, x)) || G.st.tray[0]; p.cur = q ? q.id : null; }
  const ids = targets().map((t) => t.id); if (!ids.includes(p.f)) p.f = p.cur ? "pod" : ids[0] || "pod";
  const q = cur(); if (q && p.f.startsWith("ch")) { const n = chaptersOf(q).length; if (+p.f.slice(2) >= n) p.f = n ? "ch0" : "pod"; }
}
function railTabs(p) { const chs = chaptersOf(p), n = chs.length; if (!n) return []; const w = Math.min(150, Math.floor((RAIL.w - (n - 1) * 8) / n)); return chs.map((c, i) => ({ c, i, x: RAIL.x + Math.round((RAIL.w - (n * w + (n - 1) * 8)) / 2) + i * (w + 8), y: RAIL.y, w, h: RAIL.h })); }
function targets() {
  const t = [], p = cur();
  if (P().cmp) return [{ id: "cmp", x: 0, y: 0, w: 1, h: 1 }];
  railTabs(p).forEach((tb) => t.push({ id: "ch" + tb.i, x: tb.x, y: tb.y, w: tb.w, h: tb.h }));
  if (p) t.push({ id: "pod", x: POD.cx - 70, y: POD.top - 10, w: 140, h: 190 });
  G.st.tray.forEach((q, i) => t.push({ id: "c" + i, x: LIST.x + 12, y: LIST.y0 + i * LIST.step - 4, w: 136, h: 70 }));
  if (p) t.push({ id: "gate", x: HATCH.x, y: HATCH.y, w: HATCH.w, h: HATCH.h });
  return t;
}
function nav(k) {
  const p = P(), q = cur(), f = p.f, order = G.st.tray.map((_, i) => "c" + i).concat(q ? ["gate"] : []), n = chaptersOf(q).length;
  if (isWell(f) || f === "gate") { const i = order.indexOf(f);
    if (k === "up" || k === "down") return order[clamp(i + (k === "down" ? 1 : -1), 0, order.length - 1)] || f;
    return k === "right" && q ? "pod" : f; }
  if (f === "pod") { if (k === "left") { const i = G.st.tray.indexOf(q); return i >= 0 ? "c" + i : order[0] || f; } if (k === "up" && n) return "ch" + clamp(p.ci || 0, 0, n - 1); return f; }
  if (f.startsWith("ch")) { const i = +f.slice(2); if (k === "left") return "ch" + Math.max(0, i - 1); if (k === "right") return "ch" + Math.min(n - 1, i + 1); if (k === "down") { p.ci = i; return "pod"; } return f; }
  return f;
}
const PLACE_COL = { meadow: "lime", pond: "ice", rock: "sand", wood: "sprout", cave: "lavender" };
// --- drawing ---
function drawList() {
  panel(LIST.x + 4, 46, LIST.w - 8, 506, C.night, C.slate);
  const rack = G.settings.rack || S.RACK;
  for (let i = 0; i < rack; i++) { const y = LIST.y0 + i * LIST.step, q = G.st.tray[i], cx = LIST.x + 56, cy = y + 32;
    blit(wellArt(q && q.id === P().cur, 30), cx - 32, cy - 32);
    if (!q) continue;
    const a = podArt(shellFrame(q), q.g, 2, q.idd ? "identified" : "sealed"); blit(a, cx - a.w / 2, cy - a.h / 2 + 4);
    blit(ringArt(podFrame(q), q, chapterFlags(q), LIST.r), cx - LIST.r - 1, cy - LIST.r - 1);
    if (PLACE_COL[q.g]) { R(cx + 38, cy - 30, 14, 14, C[PLACE_COL[q.g]]); R(cx + 40, cy - 28, 10, 10, C.ink); R(cx + 42, cy - 26, 6, 6, C[PLACE_COL[q.g]]); }   // the place stamp
    if (!q.idd) R(cx + 44, cy + 20, 6, 6, C.amber);
    if (q.id === P().cur) R(LIST.x + 6, cy - 20, 3, 40, C.aqua);
  }
  if (G.st.waiting.length) text(G.st.waiting.length + " sealed", LIST.x + 80, LIST.y0 + rack * LIST.step - 4, C.lampD, 2, "center");
  blit(hatchArt(), HATCH.x, HATCH.y);
}
function drawPodBig(p) {   // the pod under the beam; identification clears the seal top-down
  const NOW = clock.now, a = FX.id && FX.id.id === p.id ? NOW - FX.id.at : 1e9, dur = FX.id && FX.id.newSp ? ID_MS : 700;
  const s = 6, sealed = podArt(shellFrame(p), p.g, s, "sealed"), idd = podArt(podFrame(p), p.g, s, "identified"), x = POD.cx - sealed.w / 2, y = POD.top;
  beam(POD.cx, 44, 260, 300);
  blit(art("podcradle", () => { const pb = new PB(200, 50); pb.ell(100, 28, 98, 20, C.slate); pb.ell(100, 24, 88, 15, C.stone, { sh: [C.mist, C.night] }); pb.outline(() => C.ink); return pb; }), POD.cx - 100, POD.top + sealed.h - 30);
  if (p.idd && a < dur && motion()) { blit(sealed, x, y); const cut = Math.round(sealed.h * a / dur); g.save(); g.beginPath(); g.rect(x - 2, y - 2, sealed.w + 4, cut + 2); g.clip(); blit(idd, x, y); g.restore(); R(x + 4, y + cut, sealed.w - 8, 2, C.white); }
  else blit(p.idd ? idd : sealed, x, y);
  const idA = FX.id && FX.id.id === p.id ? NOW - FX.id.at : 1e9;
  if (p.idd && p.newSp && idA < 6000 && idA > (motion() ? ID_MS * 0.7 : 0)) { panel(POD.cx - 93, POD.top - 40, 186, 40, C.lamp, C.rust); text("New species", POD.cx, POD.top - 34, C.rust, 3, "center"); }
  const name = p.idd ? S.cap(S.spName(p)) : "Unknown pod", ns = textW(name, 4) <= 200 ? 4 : 3;
  text(name, POD.cx, 458, C.creamT, ns, "center");
  wrapText(S.podOrigin(p), 190, 2).slice(0, 2).forEach((l, i) => text(l, POD.cx, 500 + i * 20, C.mist, 2, "center"));
}
function drawRail(p) {
  const tabs = railTabs(p);
  for (const tb of tabs) { const read = p.read.includes(tb.c.id), sealed = tb.c.sealed && !G.settings.sealedOpen, focused = P().f === "ch" + tb.i, cost = S.readCost(G.st, p, tb.c.id, G.settings);
    panel(tb.x, tb.y, tb.w, tb.h, focused ? C.slate : read ? C.tealD : C.night, read ? C.aqua : C.slate);
    blit(emblemArt(tb.c.id), tb.x + 8, tb.y + 6);
    text(clipText(tb.c.name, tb.w - 36, 2), tb.x + 30, tb.y + 7, read ? C.mint : C.fog, 2);
    const sub = sealed ? "sealed" : read ? "read" : cost === 0 ? "free" : cost + " ◆";
    text(sub, tb.x + 30, tb.y + 31, sealed ? C.stone : read ? C.aqua : cost === 0 ? C.lamp : C.fog, 2);
    if (S.glint(G.st, p, tb.c.id)) { const tw = motion() ? Math.floor(clock.now / 300) % 3 : 0; blit(starArt(tw !== 1), tb.x + tb.w - (tw !== 1 ? 22 : 16), tb.y + (tw !== 1 ? 2 : 6)); }
  }
}
// The open page: the focused chapter's traits as pictures on a deep pane.
function drawPage(p, chapter, px = PAGE.x, py = PAGE.y, pw = PAGE.w, ph = PAGE.h, compact = false) {
  const fr = podFrame(p), read = p.read.includes(chapter.id), sealed = chapter.sealed && !G.settings.sealedOpen;
  panel(px, py, pw, ph, C.night, C.slate);
  if (!compact) { blit(emblemArt(chapter.id), px + 14, py + 10); text(chapter.name, px + 38, py + 11, C.creamT, 3);
    const cost = S.readCost(G.st, p, chapter.id, G.settings), right = sealed ? "sealed · " + chapterSeal(fr, chapter) : read ? S.plural(chapter.traits.length, "trait") + " read" : cost === 0 ? "the first read is free" : S.plural(chapter.traits.length, "trait") + " · " + cost + " ◆" + ((G.st.readOnce[fr.species.id] || []).includes(chapter.id) ? " · half" : "");
    text(clipText(right, pw - 40 - textW(chapter.name, 3) - 20, 2), px + pw - 14, py + 18, read ? C.aqua : C.fog, 2, "right"); }
  const n = chapter.traits.length, cols = 2, big = n <= 4 && !compact, W = big ? 150 : 120, H = big ? 110 : 88, rowH = big ? 182 : 132, top = py + (compact ? 12 : 48), gapX = Math.floor((pw - cols * W) / 3);
  const wipe = FX.read && FX.read.id === p.id && FX.read.chapter === chapter.id && motion() ? clamp((clock.now - FX.read.at) / READ_MS, 0, 1) : 1;
  chapter.traits.slice(0, 6).forEach((t, i) => {
    const x = px + gapX + (i % cols) * (W + gapX), y = top + Math.floor(i / cols) * rowH;
    if (y + H > py + ph - 8) return;
    const state = read ? traitState(fr, t, p.genome) : null;
    if (sealed) blit(sealedPic(W, H), x, y);
    else if (!read) blit(frostPic(W, H), x, y);
    else { blit(traitPic(fr, p.genome, t.id, W, H), x, y);
      if (wipe < 1) { const cut = Math.round(wipe * H); g.save(); g.beginPath(); g.rect(x, y + cut, W, H - cut); g.clip(); blit(frostPic(W, H), x, y); g.restore(); R(x + 6, y + cut, W - 12, 2, C.white); }
      if (state.kind === "hides") blit(seedPic(fr, p.genome, t.id, state.hiddenChoice), x + W - 44, y + H - 56);
      if (state.kind === "blend") { blit(seedPic(fr, p.genome, t.id, 1), x + 2, y + H - 56); blit(seedPic(fr, p.genome, t.id, 2), x + W - 44, y + H - 56); }
      if (state.kind === "only") blit(baseArt(), x + W / 2 - 35, y + H - 12);
      if (state.kind === "asleep") blit(asleepMark(), x + W - 28, y + 6);
      if (state.doing) blit(famArt(), x + 4, y + 4); }
    R(x - 2, y - 2, W + 4, 2, C.slate); R(x - 2, y + H, W + 4, 2, C.slate); R(x - 2, y, 2, H, C.slate); R(x + W, y, 2, H, C.slate);
    text(clipText(t.name, W + gapX - 10, 2), x, y + H + 8, C.creamT, 2);
    const line = sealed ? "sealed" : !read ? "unread" : state.line, sub = read && !sealed ? state.sub : null;
    (big ? wrapText(line, W + gapX - 10, 2).slice(0, 2) : [clipText(line, W + gapX - 10, 2)]).forEach((l, j) => text(l, x, y + H + 30 + j * 20, read ? C.fog : C.stone, 2));
    if (sub && big) text(clipText(sub, W + gapX - 10, 2), x, y + H + 52, C.lampD, 2);
  });
  if (n > 6) text("and " + (n - 6) + " more", px + pw / 2, py + ph - 24, C.mist, 2, "center");
}
function drawCompare() {
  const c = P().cmp, A = podById(c.a), B = podById(c.b); if (!A || !B) { P().cmp = null; return; }
  const fr = podFrame(A), chs = fr.chapters, ci = clamp(c.ci, 0, chs.length - 1), ch = chs[ci], diff = S.compareDiff(G.st, A, B) || [];
  text("Side by side · " + ch.name + " · ◀ ▶ chapters · ← closes", 512, 52, C.fog, 2, "center");
  [[A, 180], [B, 600]].forEach(([p, x]) => { const a = podArt(podFrame(p), p.g, 3, "identified"); blit(a, x + 4, 100); text(clipText(S.PLACE_WORD[p.g] || "", 100, 2), x + 40, 180, C.mist, 2, "center");
    drawPage(p, ch, x + 90, 84, 330, 460, true); });
  const pul = motion() ? Math.floor(clock.now / 400) % 2 : 1;
  if (pul) ch.traits.slice(0, 6).forEach((t, i) => { if (!diff.includes(t.id) || !A.read.includes(ch.id) || !B.read.includes(ch.id)) return; const W = 120, gapX = Math.floor((330 - 2 * W) / 3);
    for (const x0 of [270, 690]) { const x = x0 + gapX + (i % 2) * (W + gapX), y = 96 + Math.floor(i / 2) * 132; focusRing(x - 4, y - 4, W + 8, 88 + 8); } });
}
function draw() {
  benchBg(); drawTop("Pods"); ensure();
  const p = cur();
  if (P().cmp) { drawCompare(); return; }
  drawList();
  if (!p) { text("The rack is empty", 580, 250, C.fog, 3, "center"); text(docked() ? "Open the bay at Home to bring pods in" : "Dock the Companion to bring its crates home", 580, 296, C.mist, 2, "center"); drawFocus(); return; }
  drawPodBig(p);
  if (p.idd) {
    drawRail(p);
    const chs = chaptersOf(p), f = P().f, ci = f.startsWith("ch") ? +f.slice(2) : clamp(P().ci || 0, 0, chs.length - 1);
    if (chs[ci]) drawPage(p, chs[ci]);
    const st = stampArt(podFrame(p), p.genome, p.read, LABEL.side);
    if (st) { panel(LABEL.x - 6, LABEL.y - 6, st.w + 12, st.h + 12, C.bone, C.slate); blit(st, LABEL.x, LABEL.y); }
  } else { text("identify it to learn its species", POD.cx, 150, C.mist, 2, "center"); text("and see its chapters", POD.cx, 174, C.mist, 2, "center"); }
  drawFocus();
}
function drawFocus() { const t = targets().find((q) => q.id === P().f); if (t) focusRing(t.x - 3, t.y - 3, t.w + 6, t.h + 6); }
// --- the bottom line ---
function line() {
  const p = cur(), f = P().f;
  if (P().cmp) { const A = podById(P().cmp.a), B = podById(P().cmp.b), d = S.compareDiff(G.st, A, B) || []; return { back: "Pods", subject: "two " + (A ? S.spName(A) : "") + " pods", need: d.length ? S.plural(d.length, "trait") + " differ" : "no read trait differs" }; }
  if (!p) return { back: "Home", subject: "the rack is empty" };
  const subj = S.podName(p) + " · " + (S.PLACE_WORD[p.g] || "");
  if (f === "pod") { if (!p.idd) { const cost = S.identifyCost(G.st, G.settings); return { ok: "Identify", price: cost ? cost + " ⚡" : "free", dim: G.st.e < cost, back: "Home", subject: subj }; }
    if (!p.read.length) return { ok: chaptersOf(p).length ? "Read its chapters" : "", back: "Home", subject: subj, need: S.podGlints(G.st, p) ? "★ something new here" : null };
    const b = S.growBlock(G.st, p, {}, G.settings, []); return { ok: "Shape a founder", price: b && !/needs/.test(b) ? b : "", dim: !!b && !/needs/.test(b), back: "Home", subject: subj, need: S.podGlints(G.st, p) ? "★ something new here" : null }; }
  if (f.startsWith("ch")) { const ch = chaptersOf(p)[+f.slice(2)]; if (!ch) return { back: "Home" };
    const b = S.readBlock(G.st, p, ch.id, G.settings);
    if (b === null) return { back: "Home", subject: ch.name + " · read · free to look at again", need: S.podGlints(G.st, p) ? "★ something new here" : null };
    if (b.startsWith("sealed")) return { back: "Home", subject: ch.name + " · " + b };
    const cost = S.readCost(G.st, p, ch.id, G.settings);
    return { ok: "Read " + ch.name, price: b ? b : cost === 0 ? "free" : cost + " ◆", dim: !!b, back: "Home", subject: subj, need: S.glint(G.st, p, ch.id) ? "★ something new here" : null }; }
  if (isWell(f)) { const q = G.st.tray[+f.slice(1)]; if (!q) return { back: "Home" }; const A = podById(P().anchor);
    if (A && A !== q && S.canCompare(G.st, A, q)) return { ok: "Compare", price: "free", back: "Home", subject: "well " + (+f.slice(1) + 1) + " · " + S.podName(q) + " · " + (S.PLACE_WORD[q.g] || "") };
    return { ok: "Look at this pod", back: "Home", subject: "well " + (+f.slice(1) + 1) + " · " + S.podName(q) + " · " + S.podOrigin(q) }; }
  if (f === "gate") return { ok: P().wildArm ? "Again: return it" : "Return to the wild", price: "+1 ❀", back: "Home", subject: "the hatch · " + S.podName(p) + " back to the " + (S.PLACE_WORD[p.g] || "wild") };
  return { back: "Home" };
}
// --- presses ---
function identify(p) {
  const r = S.identify(G.st, p, G.settings); if (!r.ok) { if (r.msg) msg(r.msg); return; }
  FX.id = { id: p.id, at: clock.now, newSp: r.newSp, free: r.free }; lockInput(r.newSp ? ID_MS : 700);
  if (r.newSp) { msg("New species · " + S.spName(p) + " · its frame is learned and its Library page opens"); G.openBook?.(r.species); }
  save();
}
function read(p, ch) {
  const r = S.read(G.st, p, ch.id, G.settings); if (!r.ok) { if (r.msg) msg(r.msg); return; }
  FX.read = { id: p.id, chapter: ch.id, at: clock.now }; lockInput(READ_MS);
  if (r.newLooks.length) msg("New for the " + S.spName(p) + ": " + r.newLooks.slice(0, 3).join(", ") + (r.newLooks.length > 3 ? "…" : ""));
  else if (r.first) msg("The first read is free · " + ch.name + " read");
  save();
}
function act(k) {
  const p = P(); ensure(); const q = cur();
  if (p.cmp) { if (k === "back") p.cmp = null; else if (k === "left" || k === "right") { const n = chaptersOf(podById(p.cmp.a)).length; p.cmp.ci = clamp(p.cmp.ci + (k === "right" ? 1 : -1), 0, n - 1); } return; }
  if (k in DIRS) { const was = p.f; p.f = nav(k); p.wildArm = 0;
    if (isWell(p.f)) { if (!isWell(was)) p.anchor = p.cur; p.cur = G.st.tray[+p.f.slice(1)].id; }   // looking is free: the well's pod comes under the beam
    else if (isWell(was)) p.anchor = null;
    return; }
  if (k === "back") { goScreen("home"); return; }
  if (k !== "confirm" || !q) return;
  const f = p.f;
  if (f === "pod") { if (!q.idd) identify(q); else if (q.read.length) openCreate(q); else if (chaptersOf(q).length) { p.f = "ch" + clamp(p.ci || 0, 0, chaptersOf(q).length - 1); } }
  else if (f.startsWith("ch")) { const ch = chaptersOf(q)[+f.slice(2)]; if (ch) { p.ci = +f.slice(2); read(q, ch); } }
  else if (isWell(f)) { const w = G.st.tray[+f.slice(1)], A = podById(p.anchor);
    if (A && w && A !== w && S.canCompare(G.st, A, w)) { p.cmp = { a: A.id, b: w.id, ci: 0 }; p.cur = A.id; }
    else { p.cur = w.id; p.anchor = null; p.f = "pod"; } }
  else if (f === "gate") { if (!p.wildArm) { p.wildArm = 1; msg("Return the " + S.podName(q) + " to the " + (S.PLACE_WORD[q.g] || "wild") + "? ✓ again"); } else { p.wildArm = 0; const r = S.returnPod(G.st, q, G.settings, Date.now()); if (r.ok) msg(r.msg); p.cur = null; p.f = "pod"; ensure(); save(); } }
}
registerScreen("pods", { draw, line, act, enter: ensure });
