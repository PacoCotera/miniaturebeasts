// Cross: the splice (prototypes/ui/specs/station/cross.json; station-layouts.md "Cross: the splice"). Two adults of one species at the heads, the child to be between them, and below them
// the loci routed from both parents to the child: every chapter at once (the overview), or one chapter's traits under the shared chapter rail. The forecast, which shows only what the
// player has read, is the one source of every wire and gate; the pure view (views/cross.mjs) turns it into rects, text and 1 px lines and asks for the pictures; this file registers them,
// draws a master only where one is signed, and holds the keys. ◀ ▶ pick the partner (the wires re-route at once), ▲ ▼ walk the overview and the chapters, ✓ Cross them, ← Habitat.
import { G, FX, UI, SPECS, LAYER, msg, lockInput, save, goScreen, registerScreen, mibiById, effWithId } from "../game.mjs";
import { clock } from "../pixels.mjs";
import { blit } from "../gfx.mjs";
import { mibiArt, ghostArt, traitPic, paintedArt } from "../art.mjs";
import { benchBg, frameFor } from "./frame.mjs";
import { landedSet, flush } from "../caddy.mjs";
import * as S from "../state.mjs";
import * as Lib from "../library.mjs";
import { frameOf, codeText } from "../genome.mjs";
import { crossView } from "../views/cross.mjs";
import { registerPictures } from "../pictures.mjs";
import { layer } from "../../../ui/components/specimen.mjs";
import { slantRail } from "../../../ui/components/slantRail.mjs";
import { focusRing } from "../../../ui/components/focusRing.mjs";
import { registerAsset, isFilled } from "../../../ui/assets.mjs";

const X = () => UI.cross;
export function openCross(a) { UI.cross = { aId: a.id, bId: null, state: 0, fc: null, clash: [] }; const ps = S.crossPartners(G.st, G.sv, a, G.settings); if (ps.length) UI.cross.bId = ps[0].id; goScreen("cross"); }
const pair = () => { const x = X(); return x ? [mibiById(x.aId), mibiById(x.bId)] : [null, null]; };
function forecast() { const x = X(), [a, b] = pair(); if (!a || !b) return null; const key = a.id + ":" + b.id + ":" + a.read.length + ":" + b.read.length; if (x.fc && x.fcKey === key) return x.fc; x.fc = S.forecastOf(G.st, a, b, G.settings); x.fcKey = key; return x.fc; }

// --- the pictures: rendered at their size, never scaled (the portraits and ghost 48×48, the trait pictures 64×32); the masters by id, empty until signed ---
const put = (id, w, h, until, build) => { registerAsset({ id, w, h, policy: "painted", status: "placeholder", until, build: () => build() }); return id; };
const seedGenome = (a, b, t, copies) => { const g = structuredClone(a.genome); g.loci[t.locus] = [...copies]; for (const id of t.sleeping || []) g.loci[id] = [a.genome.loci[id][0], b.genome.loci[id][1]]; return g; };
const slotReq = (m) => ({ kind: "slot", id: m.id, master: m.master, size: [m.rect[2], m.rect[3]], until: m.until });
function pictureNodes(v, a, b, fc) {
  const out = [], fr = frameOf(S.speciesOf(a));
  for (const p of v.pictures) {
    const [x, y, w, h] = p.rect;
    if (p.kind === "portrait") { const m = mibiById(p.mibi), set = landedSet(m), id = `xp:${m.id}:${m.sha}:${set ? 1 : 0}:${w}`; put(id, w, h, "the parents' portraits", () => (set ? paintedArt(set, m.sha, w, h, { sprite: true }) : mibiArt(frameOf(S.speciesOf(m)), m.genome, w, h, "portrait"))); out.push({ id: "pic." + p.rect.join("."), kind: "sprite", rect: p.rect.slice(), asset: id }); }
    else if (p.kind === "ghost") { const m = mibiById(p.mibi), id = `xg:${m.id}:${m.sha}:${w}`; put(id, w, h, "the child's ghost", () => ghostArt(fr, m.genome, w, h)); out.push({ id: "pic." + p.rect.join("."), kind: "sprite", rect: p.rect.slice(), asset: id }); }
    else if (p.kind === "seed") {
      const t = fc.traits.find((q) => q.trait === p.trait), copies = p.copies ?? [p.blend, p.blend], id = `xs:${a.id}:${b.id}:${p.trait}:${copies.join("|")}:${w}x${h}`;
      put(id, w, h, "the trait pictures rendered at their size", () => traitPic(fr, seedGenome(a, b, t, copies), p.trait, w, h)); out.push({ id: "pic." + p.rect.join("."), kind: "sprite", rect: p.rect.slice(), asset: id });
    }
    void x; void y;
  }
  return out;
}
// The rail on the chapter view: a tab is read when both parents have read the chapter, unread when either has not, sealed when it is sealed; its pips are filled where the trait is drawn, hollow where missing.
function railOf(ctx, v, fc) {
  const reqs = [], env = { podById: () => null, frameOf }, star = `${"cross-wish-lit-12x12"}:12x12`;
  registerPictures([{ kind: "slot", id: star, master: "cross-wish-lit-12x12", size: [12, 12], until: "the Cross masters (station-layouts.md, Masters on Cross)" }], env);
  const tabs = v.chapters.map((c) => { const sealed = c.state === "sealed", state = sealed ? "sealed" : c.state === "open" ? "read" : "unread", n = c.traits.length, drawn = fc.traits.filter((t) => t.chapter === c.id && t.kind !== "missing" && t.kind !== "sealed").length;
    const id = `emblem:${c.id}:${state}:24`; reqs.push({ kind: "emblem", id, chapter: c.id, state });
    return { id: c.id, word: c.id === "legs-tail" ? (SPECS.pods?.strings?.legsTail?.rail ?? c.name) : c.name, state, pips: sealed ? 0 : n, filled: drawn, glint: v.glints.has(c.id) && isFilled(star), emblem: id }; });
  reqs.push({ kind: "star", id: "star:12" }); registerPictures(reqs, env);
  return slantRail(ctx, "rail", { tabs, focused: null, open: v.state - 1, where: "centred", star: "star:12", colours: {} }).nodes;
}

let cache = { key: "", view: null };
function build(ctx) {
  const x = X(), [a, b] = pair(); if (!a) return null;
  const fc = b ? forecast() : null, partners = S.crossPartners(G.st, G.sv, a, G.settings), block = b ? S.crossBlock(G.st, G.sv, a, b, G.settings) : "";
  const wish = fc && b ? Lib.wishForecast(G.st, a, b, G.settings) : null, away = { a: a.id === effWithId(), b: !!b && b.id === effWithId() };
  const key = [a.id, b?.id, a.read.length, b?.read.length, x.state, block, G.st.e, G.st.d, G.st.s, partners.length, away.a, away.b, wish ? JSON.stringify(wish.lit) : "", x.fcKey].join("|");
  if (cache.key === key && cache.view) return cache.view;
  const v = crossView({ st: G.st, settings: G.settings, a, b, fc, block, partners, away, state: x.state, wish, frame: frameOf(S.speciesOf(a)) }, SPECS.cross, ctx, SPECS.frame);
  x.state = v.state; cache = { key, view: v }; return v;
}
function nodes(ctx) {
  const x = X(), [a, b] = pair(); if (!a) { goScreen("habitat"); return []; }
  const v = build(ctx), fc = b ? forecast() : null, out = [{ id: "bench.ground", kind: "legacy", rect: [0, 40, 1024, 522], draw: () => benchBg() }];
  out.push(...v.nodes);
  registerPictures(v.masters.map(slotReq), { podById: () => null, frameOf });
  out.push(...v.masters.flatMap((m) => layer("m." + m.id + "." + m.rect.slice(0, 2).join("."), m.rect, m.id)));
  if (b) out.push(...pictureNodes(v, a, b, fc));
  if (fc && v.state > 0) out.push(...railOf(ctx, v, fc));
  const r = v.ring; out.push(...focusRing("focus", [r[0] + 4, r[1] + 4, r[2] - 8, r[3] - 8], SPECS.frame, { shape: "round" }));
  out.push(...frameFor(ctx, "cross", v.line, { need: "" }));
  void x; void clock; void blit; return out;
}
function line() { const v = LAYER.ctx ? build(LAYER.ctx) : cache.view; return v ? v.line : {}; }
function act(k) {
  const x = X(), [a, b] = pair(); if (!a) return;
  const partners = S.crossPartners(G.st, G.sv, a, G.settings), fc = b ? forecast() : null, last = fc ? fc.chapters.length : 0;
  if (k === "left" || k === "right") { if (!partners.length) return; const i = Math.max(0, partners.findIndex((m) => m.id === x.bId)); x.bId = partners[(i + (k === "right" ? 1 : partners.length - 1)) % partners.length].id; x.clash = []; }   // the wires re-route at once, the state is kept
  else if (k === "down") x.state = Math.min(last, x.state + 1);
  else if (k === "up") x.state = Math.max(0, x.state - 1);
  else if (k === "back") { UI.cross = null; UI.hab.id = a.id; goScreen("habitat"); }
  else if (k === "confirm") {
    if (!b) return;
    const r = S.doCross(G.st, G.sv, a, b, G.settings, Date.now()); if (!r.ok) { x.clash = r.clash || []; msg(r.msg); return; }
    FX.stamp = { at: clock.now, code: r.bud.code }; lockInput(900); UI.cross = null; save(); goScreen("incubator"); flush().catch(() => {});
    msg("Crossed · " + codeText(r.bud.code) + " · the child grows in the bud");
  }
}
registerScreen("cross", { nodes, line, act, enter: () => { cache = { key: "", view: null }; } });
