// Pods on the screen layer (the Research key): the pod list with progress rings, the pod under the beam, the chapter rail,
// the open page of trait pictures, the stamp on its label; Identify, Read, Compare, Return.
// The numbers are the spec file's (prototypes/ui/specs/station/pods.json); what each region shows is the pure view's
// (views/pods.mjs); each region is drawn by its vocabulary component; the focus follows the spec's graph. This module is
// the glue: the region-to-component map, the intent table onto the rules in state.mjs (unchanged), and the events the
// timeline plays (the seal clearing, the wipe) with the input holds they carry.
import { G, FX, UI, TL, SPECS, LAYER, READ_MS, ID_MS, msg, save, goScreen, registerScreen, docked, podById, need, bayCrates } from "../game.mjs";
import { clock, motion } from "../gfx.mjs";
import { DIRS } from "../../../ui/focus.mjs";
import { layer } from "../../../ui/components/specimen.mjs";
import { list, specimen, stampLabel, chapterRail, slantRail, chapterPage, focusRing, circleRing } from "../../../ui/components/frame.mjs";
import { podsView } from "../views/pods.mjs";
import { registerPictures, iconRequests } from "../pictures.mjs";
import { frameOf } from "../genome.mjs";
import { frameFor } from "./frame.mjs";
import { openCreate } from "./create.mjs";
import * as S from "../state.mjs";

const P = () => UI.pods;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const isWell = (f) => /^list\.\d+$/.test(f);
const env = { podById: (id) => podById(id), frameOf };
const cur = () => podById(P().cur);
const chaptersOf = (p) => (p && p.idd ? frameOf(S.speciesOf(p)).chapters : []);

// --- what the timeline is playing, as the view reads it ---
function present() {
  const out = {}, seal = TL.active("seal")[0], wipe = TL.active("wipe")[0];
  if (seal && motion()) out.idCut = { pod: seal.target, p: TL.progress("seal", seal.target) };
  if (wipe && motion()) out.read = { pod: wipe.target, chapter: wipe.chapter, p: TL.progress("wipe", wipe.target) };
  const rb = TL.active("ribbon")[0]; if (rb && TL.elapsed("ribbon", rb.target) >= rb.from) out.ribbon = rb.target;
  return out;
}
const model = () => ({ st: G.st, settings: G.settings, docked: docked(), crates: bayCrates().length, ui: P(), focus: P().focus.cur, present: present() });

// --- keeping the cradle and the focus valid ---
let last = null;   // the latest view (the targets the keys move through)
function ensure() {
  const p = P(), F = p.focus; if (!SPECS.pods) return;
  F.graph = SPECS.pods.focus;
  if (!podById(p.cur)) { const q = G.st.tray.find((x) => !x.idd) || G.st.tray.find((x) => S.podGlints(G.st, x)) || G.st.tray[0]; p.cur = q ? q.id : null; }
  last = podsView(model(), SPECS.pods, LAYER.ctx);
  F.ensure(last.targets, p.cur ? "pod" : null);
  if (p.cmp) F.cur = null;
  if (F.cur && F.cur.startsWith("rail.")) p.ci = +F.cur.slice(5);
}
const resolve = (sel) => {
  const p = P();
  if (sel === "list.current") { const i = G.st.tray.findIndex((q) => q.id === p.cur); return i >= 0 ? "list." + i : null; }
  if (sel === "rail.last") { const n = chaptersOf(cur()).length; return n ? "rail." + clamp(p.ci || 0, 0, n - 1) : null; }
  return null;
};

// --- the intents: a key on a focused target is one rule call; the rule's result becomes events ---
function identify(p) {
  const r = S.identify(G.st, p, G.settings); if (!r.ok) { if (r.msg) msg(r.msg); return; }
  const ms = ID_MS;   // the seal clears over 2 s, whether or not the species is new
  TL.play({ kind: "seal", target: p.id, ms, hold: true });
  if (r.newSp) { TL.play({ kind: "ribbon", target: p.id, ms: 6000 + Math.round(ms * 0.7), from: Math.round(ms * 0.7) }); G.openBook?.(r.species); }   // the ribbon says it; no plate
  save();
}
function read(p, ch) {
  const r = S.read(G.st, p, ch.id, G.settings); if (!r.ok) { if (r.msg) msg(r.msg); return; }
  TL.play({ kind: "wipe", target: p.id, chapter: ch.id, ms: READ_MS, hold: true });
  save();
}
const INTENTS = {
  pod: (q, f, p) => {
    if (!q.idd) return identify(q);
    if (q.read.length) return openCreate(q);
    const chs = chaptersOf(q), i = chs.findIndex((c) => !q.read.includes(c.id) && !(c.sealed && !G.settings.sealedOpen));   // ✓ Read its chapters: the ring to the first unread tab, no spend
    if (chs.length) f.set("rail." + (i >= 0 ? i : 0));
  },
  rail: (q, f, p, id) => { const ch = chaptersOf(q)[+id.slice(5)]; if (ch) { p.ci = +id.slice(5); read(q, ch); } },
  list: (q, f, p, id) => {
    if (id === "list.hatch") {   // ✓ ✓: the first arms, the second returns; any other key disarms
      if (!p.wildArm) { p.wildArm = 1; msg(SPECS.pods.strings.hatchArm.replace("{place}", SPECS.pods.strings.hatchPlace[q.g] || "wild")); return; }
      p.wildArm = 0; S.returnPod(G.st, q, G.settings, Date.now()); p.cur = null; f.set("pod"); ensure(); save(); return;
    }
    const w = G.st.tray[+id.slice(5)], A = podById(p.anchor);
    if (A && w && A !== w && S.canCompare(G.st, A, w)) { p.cmp = { a: A.id, b: w.id, ci: 0 }; p.cur = A.id; }
    else { p.cur = w.id; p.anchor = null; f.set("pod"); }
  },
};
function act(k) {
  const p = P(), F = p.focus; ensure();
  if (p.cmp) {   // Compare: ◀ ▶ step the chapters on both pages, ← closes; nothing else
    if (k === "back") p.cmp = null;
    else if (k === "left" || k === "right") { const n = chaptersOf(podById(p.cmp.a)).length; p.cmp.ci = clamp(p.cmp.ci + (k === "right" ? 1 : -1), 0, n - 1); }
    return;
  }
  if (k in DIRS) {
    const was = F.cur; p.wildArm = 0; F.move(last.targets, k, resolve);
    if (isWell(F.cur)) { if (!isWell(was)) p.anchor = p.cur; p.cur = G.st.tray[+F.cur.slice(5)].id; }   // looking is free: the well's pod comes under the beam at once
    else if (isWell(was)) p.anchor = null;
    ensure(); return;
  }
  if (k !== "confirm") p.wildArm = 0;   // any other key disarms the hatch
  if (k === "back") { goScreen("home"); return; }
  const q = cur(); if (k !== "confirm" || !q) return;
  const id = F.cur, group = id === "pod" ? "pod" : id.split(".")[0];
  INTENTS[group]?.(q, F, p, id);
}

// --- the scene: each region of the spec drawn by its component ---
function nodes(ctx) {
  ensure(); const spec = SPECS.pods, R = spec.regions, C = spec.colours, v = last, out = [], F = P().focus;
  registerPictures([...v.requests, ...iconRequests()], env);
  out.push({ id: "bench", kind: "rect", rect: R.bench.rect.slice(), colour: C.ground });   // the bench: a flat ground under the room master
  if (v.mode !== "compare") out.push(...layer("bench.room", R.bench.rect, v.specimen.room.bench));
  const focusOn = (id) => F.cur === id;
  if (v.mode === "compare") {
    out.push(...slantRail(ctx, "rail", { ...v.rail, focused: v.rail.current, where: "pods", tabRegion: "rail.tab" }).nodes);
    v.pages.forEach((pg, i) => out.push(...chapterPage(ctx, i ? "pageB" : "pageA", { ...R.compareA, rect: R[i ? "compareB" : "compareA"].rect }, { ...pg, region: i ? "compareB" : "compareA", cellRegion: "page.cell" }).nodes));
  } else {
    out.push(...list(ctx, "list", spec, v.list));
    out.push(...specimen(ctx, "specimen", spec, { ...v.specimen, pod: v.specimen.pod && focusOn("pod") ? { ...v.specimen.pod, lift: SPECS.frame.focus.lift.creature } : v.specimen.pod }));
    if (v.rail) out.push(...slantRail(ctx, "rail", { ...v.rail, focused: F.cur && F.cur.startsWith("rail.") ? +F.cur.slice(5) : null, where: "pods", tabRegion: "rail.tab" }).nodes);
    if (v.page) out.push(...chapterPage(ctx, "page", R.page, { ...v.page, region: "page", cellRegion: "page.cell" }).nodes);
    if (v.stamp) out.push(...stampLabel(ctx, "stamp", R.stamp.rect, { stamp: v.stamp.asset, size: v.stamp.size, region: "stamp" }, v.stamp.colours));
    out.push(...ringNodes());
  }
  out.push(...sharedFrame(ctx));
  return out;
}
// The focus ring: one ring per screen, on the focused target; the rail's tabs carry their own (they lift with it).
function ringNodes() {
  const v = last, F = P().focus, t = v.mode === "compare" ? null : v.targets.find((x) => x.id === F.cur);
  if (!t || t.group === "rail") return [];
  const Wf = SPECS.pods.regions.well, isWell = /^list\.\d+$/.test(t.id);   // a well wears a circle round its centre; the hatch, the page's cells and the rest a rounded rectangle, the pod an ellipse on the ground
  return isWell ? circleRing("focus", [t.rect[0] + Wf.ring.centre[0], t.rect[1] + Wf.ring.centre[1]], Wf.focus.radius, Wf.focus.width, Wf.focus.colour) : focusRing("focus", t.rect, SPECS.frame, { shape: t.group === "pod" ? "ellipse" : "round" });
}
// The frame: top bar, bottom line, message plate.
const sharedFrame = (ctx) => frameFor(ctx, "pods", last.line, { need: "", focal: last.box });
// What the LVGL face draws of this screen until its stage comes over: the pictures the frame and the ring name, the ring, the frame.
function faceNodes(ctx) { return nodes(ctx); }   // the whole stage on the face, from the same nodes the canvas renderer takes
// The slanted rail (the face draws this one; the canvas renderer keeps the older rail until it is retired).
function railNodes(ctx) {
  const v = last, F = P().focus; if (v.mode === "compare" || !v.rail) return [];
  return slantRail(ctx, "rail", { ...v.rail, focused: F.cur && F.cur.startsWith("rail.") ? +F.cur.slice(5) : null, where: "pods", tabRegion: "rail.tab" }).nodes;
}

registerScreen("pods", { nodes, faceNodes, targets: () => { ensure(); return last.targets; }, line: () => { ensure(); return last.line; }, act, enter: ensure });
