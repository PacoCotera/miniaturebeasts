// Home on the screen layer: the vivarium (the living window) with its residents and the with-you bed, the rest knob, the
// four modules (Bay, Rack, Incubator, Probe), the arrival's ribbon and report card. The numbers are the spec file's
// (prototypes/ui/specs/station/home.json); what each region shows is the pure view's (views/home.mjs); each region is
// drawn by its vocabulary component; the focus is the spec's (the nearest drawn thing that way). This module is the
// glue: the presentation's inputs (the walk, the arrival), the region-to-component map and the intent table onto the
// rules in state.mjs (unchanged).
import { G, FX, UI, SPECS, LAYER, TL, msg, lockInput, save, goScreen, registerScreen, need, docked, bayCrates, effWithId, atHome, mibiById, arriving, ARRIVE_MS } from "../game.mjs";
import { clock, motion } from "../gfx.mjs";
import { DIRS, nearest } from "../../../ui/focus.mjs";
import { frame as frameNodes, module as moduleNodes, livingWindow, card, ribbon, focusRing } from "../../../ui/components/frame.mjs";
import { homeView } from "../views/home.mjs";
import { frameView } from "../views/frame.mjs";
import { registerPictures, iconRequests } from "../pictures.mjs";
import { residentWalk } from "./frame.mjs";
import { landedSet, lampText } from "../caddy.mjs";
import { paintedArt, mibiArt } from "../art.mjs";
import { compState, shownTurn } from "./frame.mjs";
import * as S from "../state.mjs";
import { frameOf } from "../genome.mjs";

export const podFrame = (p) => frameOf(S.speciesOf(p));
const H = () => UI.home;

// The resident's picture: the landed painting at its size, else the rig's placeholder (the painting faces the other way from the rig's).
const env = {
  podById: (id) => S.podById(G.st, id), frameOf,
  resident(r) {
    const m = mibiById(r.mibi); if (!m) return null;
    if (r.painted) { const set = landedSet(m), p = set && paintedArt(set, m.sha, r.w, r.h, { sprite: true, flip: !r.flip }); if (p) return p; }
    const fr = frameOf(S.speciesOf(m)); return fr && m.genome ? mibiArt(fr, m.genome, r.w, r.h, "three-quarter", r.flip) : null;
  },
};

// --- what the presentation holds, as the view reads it ---
function residents() {
  return atHome().map((m) => { const w = residentWalk(m), walking = w.st === "walk" && motion(), bob = walking ? -Math.round(Math.abs(Math.sin(clock.now / 160)) * 5) : 0;
    return { id: m.id, name: m.name, species: S.spName(m), stage: S.mibiStage(G.st, m), u: w.u, v: w.v, face: w.face, dy: bob + (w.st === "nap" && motion() ? 6 : 0), painted: !!landedSet(m), sha: m.sha, lamp: !!lampText(m) };
  });
}
function reportOf() {
  const r = UI.report; if (!r || arriving() || clock.now <= r.at) return null;
  const tot = { e: 0, d: 0, s: 0 }; for (const p of r.plays) { tot.e += (p.c.e | 0) + p.top.e; tot.d += (p.c.d | 0) + p.top.d; tot.s += (p.c.s | 0) + p.top.s; }
  const lines = r.plays.map((p) => (p.c.dev ? "Developer crate " : "Expedition ") + p.c.n + " home · " + S.plural((p.c.pods || []).length, "pod") + (p.c.of ? " · explored " + p.c.explored + " of " + p.c.of : ""));
  const paid = r.plays.reduce((a, p) => a + p.paid, 0) + (r.mend ? r.mend.paid : 0), free = r.mend ? r.mend.free : 0, pr = G.st.probe;
  const mend = pr ? (r.mend && r.mend.broke ? "The Probe is mended free" : free || paid ? "Shield back to " + S.plural(pr.shield, "plate") + (free ? " · " + free + " free" : "") + (paid ? " · " + paid + " ⚡" : "") : "Shield " + pr.shield + " of " + pr.smax) : "";
  return { lines, tot, top: r.plays.some((p) => p.top.e || p.top.d || p.top.s), mend, world: (r.plays[r.plays.length - 1].c.lines || []).slice(0, 3), turn: G.st.turn + 1 };
}
function arrivalOf() {
  const a = FX.arr; if (!a || !arriving()) return null;
  const i = Math.floor((clock.now - a.at) / ARRIVE_MS); return { i, k: ((clock.now - a.at) % ARRIVE_MS) / ARRIVE_MS, plays: a.plays.map((p) => ({ c: p.c, ids: p.ids })) };
}
const model = () => ({ st: G.st, sv: G.sv, ui: UI, settings: G.settings, docked: docked(), crates: bayCrates(), residents: residents(), withName: (mibiById(effWithId()) || {}).name ?? null, focus: H().focus.cur, present: { arrival: arrivalOf(), report: reportOf(), mendFlash: !!(FX.mend && clock.now - FX.mend.at < 1600 && Math.floor((clock.now - FX.mend.at) / 200) % 2 === 0) } });

// --- keeping the focus valid ---
let last = null;
function ensure() {
  const F = H().focus; if (!SPECS.home) return;
  F.graph = SPECS.home.focus;
  last = homeView(model(), SPECS.home, LAYER.ctx);
  if (F.cur && !last.targets.some((t) => t.id === F.cur)) F.set(null);
}

// --- the intents: a key on the focused target is one rule call ---
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
function act(k) {
  const F = H().focus; ensure(); if (!last) return;
  if (k in DIRS) {   // the pad moves the ring to the nearest drawn thing that way; from the room the first press picks the nearest
    if (F.cur == null) { const room = { id: "room", rect: SPECS.home.focus.roomAt, group: "room" }, n = nearest(last.targets, room, k); F.set(n ? n.id : last.targets[0]?.id ?? null); }
    else F.move(last.targets, k);
    return;
  }
  if (k === "back") { if (F.cur != null) F.set(null); else msg(SPECS.home.strings.homeTop); return; }
  if (k !== "confirm") return;
  const f = F.cur;
  if (f == null) doNeed(need());
  else if (f.startsWith("r:")) { UI.hab.id = +f.slice(2); UI.hab.f = "stage"; if (UI.meet === UI.hab.id) UI.meet = null; goScreen("habitat"); }
  else if (f === "bay") { if (docked() && bayCrates().length) openBay(); else msg(docked() ? "The bay is empty" : "Dock the Companion to open its crates"); }
  else if (f === "rack") { UI.pods.f = "pod"; goScreen("pods"); }
  else if (f === "incubator") goScreen("incubator");
  else if (f === "probe") { UI.bench.f = 0; goScreen("bench"); }
  else if (f === "knob") { UI.idle = true; FX.restAt = clock.now; F.set(null); }
}

// --- the scene: each region of the spec drawn by its component ---
function nodes(ctx) {
  ensure(); const spec = SPECS.home, R = spec.regions, v = last, out = [], F = H().focus;
  registerPictures([...v.requests, ...iconRequests()], env);
  out.push({ id: "stage", kind: "rect", rect: SPECS.frame.regions.stage.rect.slice(), colour: SPECS.frame.colours.stageGround });
  out.push(...livingWindow(ctx, "window", spec, v.window));
  for (const key of ["bay", "rack", "incubator", "probe"]) {
    const md = v.modules[key]; out.push(...moduleNodes(ctx, "mod." + key, R[key], { colours: v.moduleColours, word: md.word, lit: md.lit, lampAssets: md.lampAssets, lift: md.lift, items: md.items, region: "module" }));
  }
  if (v.ribbon) out.push(...ribbon(ctx, "ribbon", spec, v.ribbon.text, v.ribbon.colours));
  if (v.report) out.push(...card(ctx, "report", R.report.rect, v.report));
  const t = v.targets.find((x) => x.id === F.cur);
  if (t) out.push(...focusRing("focus", t.id === "bay" && v.arriving ? [t.rect[0], t.rect[1] - R.bay.lift, t.rect[2], t.rect[3]] : t.rect, SPECS.frame, { shape: t.shape === "ellipse" ? "ellipse" : "round" }));
  const fp = frameView({ title: "Home", step: LAYER.presenter.step(clock.now, { e: G.st.e, d: G.st.d, s: G.st.s, turn: shownTurn() }, motion()), companion: { text: compState(), docked: docked() }, line: v.line, need: need().text, message: msgText(), focal: null });
  out.push(...frameNodes(ctx, fp));
  return out;
}
const msgText = () => (FX.msg && TL.progress("plate", "msg") != null && TL.progress("plate", "msg") < 1 ? FX.msg : "");

registerScreen("home", { nodes, line: () => { ensure(); return last.line; }, act, enter: ensure });
