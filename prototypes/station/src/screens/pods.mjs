// Pods on the screen layer (the Research key), in three states (station-layouts.md, Pods): the collection of the rack's places with their progress rings,
// a pod's overview (the pod under the beam, the figure, who it is and where it came from, its kin, the hatch, the stamp, the rail with no tab open), a chapter's
// page (the pod's room shrunk, the rail with the open tab, the page of trait pictures); Identify, Read, Compare, Return. ← goes up one level.
// The numbers are the spec file's (prototypes/ui/specs/station/pods.json); what each region shows is the pure view's
// (views/pods.mjs); each region is drawn by its vocabulary component; the focus follows the spec's graph. This module is
// the glue: the region-to-component map, the intent table onto the rules in state.mjs (unchanged), and the events the
// timeline plays (the seal clearing, the wipe) with the input holds they carry.
import { G, UI, TL, SPECS, LAYER, READ_MS, ID_MS, msg, save, goScreen, registerScreen, docked, podById, need, bayCrates } from "../game.mjs";
import { motion } from "../gfx.mjs";
import { DIRS } from "../../../ui/focus.mjs";
import { layer } from "../../../ui/components/specimen.mjs";
import { list, kinHatch, specimen, stampLabel, slantRail, chapterPage, focusRing, circleRing } from "../../../ui/components/frame.mjs";
import { podsView } from "../views/pods.mjs";
import { registerPictures, iconRequests } from "../pictures.mjs";
import { frameOf } from "../genome.mjs";
import { isFilled } from "../../../ui/assets.mjs";
import { frameFor } from "./frame.mjs";
import { openCreate } from "./create.mjs";
import * as S from "../state.mjs";

const P = () => UI.pods;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const env = { podById: (id) => podById(id), frameOf };
const cur = () => podById(P().cur);
const chaptersOf = (p) => (p && p.idd ? frameOf(S.speciesOf(p)).chapters : []);
const placeOf = (id) => "place." + Math.max(0, G.st.tray.findIndex((q) => q.id === id));
const needsYou = () => G.st.tray.find((x) => !x.idd) || G.st.tray.find((x) => S.podGlints(G.st, x)) || G.st.tray[0];   // the pod that most needs the player: new, then glinting, then the first

// --- what the timeline is playing, as the view reads it ---
function present() {
  const out = {}, seal = TL.active("seal")[0], wipe = TL.active("wipe")[0];
  if (seal && motion()) out.idCut = { pod: seal.target, p: TL.progress("seal", seal.target) };
  if (wipe && motion()) out.read = { pod: wipe.target, chapter: wipe.chapter, p: TL.progress("wipe", wipe.target) };
  const rb = TL.active("ribbon")[0]; if (rb && TL.elapsed("ribbon", rb.target) >= rb.from) out.ribbon = rb.target;
  return out;
}
const model = () => ({ st: G.st, settings: G.settings, docked: docked(), crates: bayCrates().length, ui: P(), focus: P().focus.cur, present: present() });

// --- keeping the state, the cursor pod and the focus valid ---
let last = null;   // the latest view (the targets the keys move through)
const initialFocus = (view) => (view === "collection" ? placeOf(P().cur) : view === "chapter" ? "rail." + (P().ci || 0) : "pod");
function ensure() {
  const p = P(), F = p.focus; if (!SPECS.pods) return;
  p.view ??= SPECS.pods.initial;   // Pods opens on the spec's first state
  if (!podById(p.cur)) { const q = needsYou(); p.cur = q ? q.id : null; }
  if (!p.cur || !G.st.tray.length) p.view = "collection";
  const key = p.cmp ? "overview" : p.view; F.graph = SPECS.pods.focus[key];
  if (p.focusView !== key) { p.focusView = key; if (!F.cur || !F.cur.startsWith(key === "collection" ? "place." : key === "chapter" ? "rail." : "")) F.cur = null; }
  last = podsView(model(), SPECS.pods, LAYER.ctx);
  F.ensure(last.targets, initialFocus(key));
  if (p.cmp) F.cur = null;
  if (F.cur && F.cur.startsWith("rail.")) p.ci = +F.cur.slice(5);
  if (F.cur && F.cur.startsWith("place.")) { const q = G.st.tray[+F.cur.slice(6)]; if (q) p.cur = q.id; }
}
const resolve = (sel) => {
  const p = P();
  if (sel === "rail.last" || sel === "rail.open") { const n = chaptersOf(cur()).length; return n ? "rail." + clamp(p.ci || 0, 0, n - 1) : null; }
  if (sel === "kin.first") return last.kin?.length ? "kin.0" : "hatch";   // a pod with no kin has the hatch as its only way on
  return null;
};
// Going to a state puts the focus where the spec's graph says it starts, or on a named target.
function go(view, focus) { const p = P(); p.view = view; p.focusView = view; p.focus.set(focus ?? initialFocus(view)); ensure(); }

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
  place: (q, f, p, id) => { p.cur = G.st.tray[+id.slice(6)].id; go("overview", "pod"); },   // ✓ Open: the pod's overview
  pod: (q, f, p) => {
    if (!q.idd) return identify(q);
    if (q.read.length) return openCreate(q);
    const chs = chaptersOf(q), i = chs.findIndex((c) => !q.read.includes(c.id) && !(c.sealed && !G.settings.sealedOpen));   // ✓ Read its chapters: the ring to the first unread tab, no spend
    if (chs.length) f.set("rail." + (i >= 0 ? i : 0));
  },
  rail: (q, f, p, id) => {
    const ch = chaptersOf(q)[+id.slice(5)]; if (!ch) return;
    p.ci = +id.slice(5);
    if (p.view === "overview") return go("chapter", id);   // ✓ on a tab opens its page, free
    read(q, ch);   // on the page, ✓ reads an unread chapter (a read chapter has no ✓)
  },
  kin: (q, f, p, id) => { const k = last.kin[+id.slice(4)]; if (k) p.cmp = { a: q.id, b: k.id, ci: 0 }; },
  hatch: (q, f, p) => {   // ✓ ✓: the first arms, the second returns; any other key disarms
    if (!p.wildArm) { p.wildArm = 1; msg(SPECS.pods.strings.hatchArm.replace("{place}", SPECS.pods.strings.hatchPlace[q.g] || "wild")); return; }
    p.wildArm = 0; S.returnPod(G.st, q, G.settings, Date.now()); p.cur = null; go("collection"); save();
  },
};
function act(k) {
  const p = P(), F = p.focus; ensure();
  if (p.cmp) {   // Compare: ◀ ▶ step the chapters on both pages, ← closes; nothing else
    if (k === "back") p.cmp = null;
    else if (k === "left" || k === "right") { const n = chaptersOf(podById(p.cmp.a)).length; p.cmp.ci = clamp(p.cmp.ci + (k === "right" ? 1 : -1), 0, n - 1); }
    return;
  }
  if (k in DIRS) { p.wildArm = 0; F.move(last.targets, k, resolve); ensure(); return; }
  if (k !== "confirm") p.wildArm = 0;   // any other key disarms the hatch
  if (k === "back") {   // ← always goes up one level
    if (p.view === "collection") goScreen("home");
    else if (p.view === "overview") go("collection", placeOf(p.cur));
    else go("overview", "rail." + (p.ci || 0));
    return;
  }
  const q = cur(); if (k !== "confirm" || !q || !F.cur) return;
  const id = F.cur, group = id.split(".")[0];
  INTENTS[group]?.(q, F, p, id);
}

// --- the scene: each region of the spec drawn by its vocabulary component, the state's own ---
function nodes(ctx) {
  ensure(); const spec = SPECS.pods, R = spec.regions, C = spec.colours, v = last, out = [], F = P().focus;
  registerPictures([...v.requests, ...iconRequests()], env);
  out.push({ id: "bench", kind: "rect", rect: R.bench.rect.slice(), colour: C.ground });   // the bench: a flat ground under the room master
  const focusRail = F.cur && F.cur.startsWith("rail.") ? +F.cur.slice(5) : null;
  if (v.mode === "compare") {
    out.push(...slantRail(ctx, "rail", { ...v.rail, focused: v.rail.current, where: "pods", tabRegion: "rail.tab" }).nodes);
    v.pages.forEach((pg, i) => out.push(...chapterPage(ctx, i ? "pageB" : "pageA", { ...R.compareA, rect: R[i ? "compareB" : "compareA"].rect }, { ...pg, region: i ? "compareB" : "compareA", cellRegion: "page.cell" }).nodes));
  } else if (v.mode === "collection") {
    out.push(...layer("bench.room", R.bench.rect, v.bench.find(isFilled) ?? null));   // the room master under the places
    out.push(...list(ctx, "list", spec, v.list));
  } else {
    const S_ = R[v.mode], focusOn = (id) => F.cur === id;
    const room = { ...v.specimen.room, bench: [v.specimen.room.bench, v.specimen.room.benchAny].find(isFilled) ?? null };   // the state's own room master, the signed bench until it is cut
    out.push(...layer("bench.room", R.bench.rect, room.bench));
    out.push(...specimen(ctx, "specimen", spec, { ...v.specimen, room, pod: v.specimen.pod && focusOn("pod") ? { ...v.specimen.pod, lift: SPECS.frame.focus.lift.creature } : v.specimen.pod }));
    if (v.mode === "overview") {
      out.push(...kinHatch(ctx, "kin", spec, { kin: v.kin, hatch: v.hatch }, S_));
      if (v.stamp) out.push(...layer("stamp.case", S_.stampCase.rect, v.stampCase.back), ...stampLabel(ctx, "stamp", S_.stamp.rect, { stamp: v.stamp.asset, size: v.stamp.size, region: "stamp" }, v.stamp.colours), ...layer("stamp.front", S_.stampCaseFront.rect, v.stampCase.front));
    }
    if (v.rail) out.push(...slantRail(ctx, "rail", { ...v.rail, focused: focusRail, where: "pods", tabRegion: "rail.tab" }).nodes);
    if (v.page) out.push(...chapterPage(ctx, "page", S_.page, { ...v.page, region: "page", cellRegion: "page.cell" }).nodes);
  }
  out.push(...ringNodes());
  out.push(...sharedFrame(ctx));
  return out;
}
// The focus ring: one ring per screen, on the focused target; the rail's tabs carry their own. A place wears the circle round its ring, a kin the circle round its own; the pod and the hatch the rounded rectangle (the art director: the ring follows its target and is never drawn on the dish).
function ringNodes() {
  const v = last, F = P().focus, t = v.mode === "compare" ? null : v.targets.find((x) => x.id === F.cur);
  if (!t || t.group === "rail") return [];
  const ring = SPECS.frame.focus.ring;
  if (t.group === "place") { const K = SPECS.pods.regions.collection.ring.focus, c = SPECS.pods.regions.collection.ring.centre; return circleRing("focus", [t.rect[0] + c[0], t.rect[1] + c[1]], K.radius, K.width, K.colour); }   // a place: the circle 4 px outside its ring
  if (t.group === "kin") return circleRing("focus", [t.rect[0] + t.rect[2] / 2, t.rect[1] + t.rect[3] / 2], t.rect[2] / 2 + ring.outside, ring.width, "focus");
  return focusRing("focus", t.rect, SPECS.frame, { shape: "round" });
}
// The frame: top bar, bottom line, message plate.
const sharedFrame = (ctx) => frameFor(ctx, "pods", last.line, { need: "", focal: last.box });
// What the LVGL face draws of this screen: the whole stage, from the same nodes the canvas renderer takes.
function faceNodes(ctx) { return nodes(ctx); }

registerScreen("pods", { nodes, faceNodes, targets: () => { ensure(); return last.targets; }, line: () => { ensure(); return last.line; }, act, enter: ensure });
