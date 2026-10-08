// Pods on the screen layer (the Research key): the pod list with progress rings, the pod under the beam, the chapter rail,
// the open page of trait pictures, the stamp on its label; Identify, Read, Compare, Return.
// The numbers are the spec file's (prototypes/ui/specs/station/pods.json); what each region shows is the pure view's
// (views/pods.mjs); each region is drawn by its vocabulary component; the focus follows the spec's graph. This module is
// the glue: the region-to-component map, the intent table onto the rules in state.mjs (unchanged), and the events the
// timeline plays (the seal clearing, the wipe) with the input holds they carry.
import { G, FX, UI, TL, SPECS, LAYER, READ_MS, ID_MS, msg, save, goScreen, registerScreen, docked, podById, need } from "../game.mjs";
import { clock, motion } from "../gfx.mjs";
import { DIRS } from "../../../ui/focus.mjs";
import { frame as frameNodes, list, specimen, stampLabel, chapterRail, chapterPage, focusRing } from "../../../ui/components/frame.mjs";
import { podsView } from "../views/pods.mjs";
import { frameView } from "../views/frame.mjs";
import { registerPictures, iconRequests } from "../pictures.mjs";
import { frameOf } from "../genome.mjs";
import { compState, shownTurn } from "./frame.mjs";
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
const model = () => ({ st: G.st, settings: G.settings, docked: docked(), ui: P(), focus: P().focus.cur, present: present() });

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
  if (r.newSp) { TL.play({ kind: "ribbon", target: p.id, ms: 6000 + Math.round(ms * 0.7), from: Math.round(ms * 0.7) }); msg("New species · " + S.spName(p) + " · its frame is learned and its Library page opens"); G.openBook?.(r.species); }
  save();
}
function read(p, ch) {
  const r = S.read(G.st, p, ch.id, G.settings); if (!r.ok) { if (r.msg) msg(r.msg); return; }
  TL.play({ kind: "wipe", target: p.id, chapter: ch.id, ms: READ_MS, hold: true });
  if (r.newLooks.length) msg("New for the " + S.spName(p) + ": " + r.newLooks.slice(0, 3).join(", ") + (r.newLooks.length > 3 ? "…" : ""));
  else if (r.first) msg("The first read is free · " + ch.name + " read");
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
      if (!p.wildArm) { p.wildArm = 1; msg("Return the " + S.podName(q) + " to the " + (S.PLACE_WORD[q.g] || "wild") + "? ✓ again"); return; }
      p.wildArm = 0; const r = S.returnPod(G.st, q, G.settings, Date.now()); if (r.ok) msg(r.msg); p.cur = null; f.set("pod"); ensure(); save(); return;
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
  const bench = R.bench.rect, benchId = `bench:${bench[2]}x${bench[3]}`;
  registerPictures([...v.requests, ...iconRequests(), { kind: "bench", id: benchId, w: bench[2], h: bench[3] }], env);
  out.push({ id: "bench", kind: "sprite", rect: bench.slice(), asset: benchId });
  const focusOn = (id) => F.cur === id;
  if (v.mode === "compare") {
    const rail = chapterRail(ctx, "rail", R.rail, { ...v.rail, fillGround: false, focused: v.rail.current, region: "rail", tabRegion: "rail.tab" });
    out.push(...rail.nodes);
    v.pages.forEach((pg, i) => out.push(...chapterPage(ctx, i ? "pageB" : "pageA", { ...R.compareA, rect: R[i ? "compareB" : "compareA"].rect }, { ...pg, region: i ? "compareB" : "compareA", cellRegion: "page.cell" }).nodes));
  } else {
    out.push(...list(ctx, "list", spec, v.list));
    out.push(...specimen(ctx, "specimen", spec, { ...v.specimen, pod: v.specimen.pod && focusOn("pod") ? { ...v.specimen.pod, lift: SPECS.frame.focus.lift.creature } : v.specimen.pod }));
    if (v.rail) out.push(...chapterRail(ctx, "rail", R.rail, { ...v.rail, fillGround: false, focused: F.cur && F.cur.startsWith("rail.") ? +F.cur.slice(5) : null, region: "rail", tabRegion: "rail.tab" }).nodes);
    if (v.page) out.push(...chapterPage(ctx, "page", R.page, { ...v.page, region: "page", cellRegion: "page.cell" }).nodes);
    if (v.stamp) out.push(...stampLabel(ctx, "stamp", R.stamp.rect, { stamp: v.stamp.asset, size: v.stamp.size, region: "stamp" }, v.stamp.colours));
    // the focus ring: one ring per screen, on the focused target; the rail's tabs carry their own (they lift with it)
    const t = v.targets.find((x) => x.id === F.cur);
    if (t && t.group !== "rail") out.push(...focusRing("focus", t.rect, SPECS.frame, { shape: t.group === "pod" ? "ellipse" : "round" }));
  }
  // the frame: top bar, bottom line, message plate
  const fp = frameView({ title: "Pods", step: LAYER.presenter.step(clock.now, { e: G.st.e, d: G.st.d, s: G.st.s, turn: shownTurn() }, motion()), companion: { text: compState(), docked: docked() }, line: v.line, need: need().text, message: msgText(), focal: v.box });
  out.push(...frameNodes(ctx, fp));
  return out;
}
const msgText = () => (FX.msg && TL.progress("plate", "msg") != null && TL.progress("plate", "msg") < 1 ? FX.msg : "");

registerScreen("pods", { nodes, line: () => { ensure(); return last.line; }, act, enter: ensure });
