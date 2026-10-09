// Library: the tome's spread of sixteen frames and a Book per species. M1 carries the spread with the
// registry's sixteen species (found plate, met study, empty unmet frame) and a Book stub: the species'
// face, its habit line, the frame's chapters and the looks found so far. M5 builds the Book whole.
import { C, R, blit, text, clipText, panel, focusRing, art, PB, clamp, clock } from "../gfx.mjs";
import { speciesArt, emblemArt, stampArt } from "../art.mjs";
import { G, UI, SPECS, LAYER, msg, save, goScreen, registerScreen } from "../game.mjs";
import { stageBg, frameFor } from "./frame.mjs";
import * as Guide from "../views/guide.mjs";
import { registerPictures } from "../pictures.mjs";
import { layer } from "../../../ui/components/specimen.mjs";
import { registerAsset } from "../../../ui/assets.mjs";
import * as S from "../state.mjs";
import * as Lib from "../library.mjs";
import { frameOf, frameIds, speciesIndex } from "../genome.mjs";

const L = () => UI.lib;
const DIRS_ = { up: 1, down: 1, left: 1, right: 1 };
// A spread holds sixteen frames: eight a page in two rows of four; more species turn the spread.
const FRAME = { w: 96, h: 112, y0: 70, gx: 120, gy: 160, left: 60, right: 560 };
const frameXY = (i) => ({ x: (i >= 8 ? FRAME.right : FRAME.left) + (i % 4) * FRAME.gx, y: FRAME.y0 + (((i % 8) >> 2) * FRAME.gy) });
const pageOf = () => frameIds().slice(L().page * 16, L().page * 16 + 16);
const known = (id) => G.st.knownIds.includes(id), met = (id) => G.st.metIds.includes(id);
function paperBg() { blit(art("paper", () => { const pb = new PB(1024, 522); for (let y = 0; y < 522; y++) for (let x = 0; x < 1024; x++) pb.p[y * 1024 + x] = ((x * 7 + y * 13) % 97 < 2) ? C.sand : C.paper; pb.rect(510, 0, 4, 522, C.clay); return pb; }), 0, 40); }
function drawSpread() {
  paperBg();   const ids = pageOf();
  ids.forEach((id, i) => { const fr = frameOf(id), { x, y } = frameXY(i);
    R(x - 2, y - 2, FRAME.w + 4, FRAME.h + 4, C.bark); R(x, y, FRAME.w, FRAME.h, C.bone);
    if (known(id)) { panel(x + 6, y + 6, FRAME.w - 12, FRAME.h - 28, C.bone, C.clay); const a = speciesArt(fr, 76, 76); blit(a, x + 10, y + 8); text(clipText(fr.species.name, FRAME.w - 4, 2), x + FRAME.w / 2, y + FRAME.h + 6, C.panel, 2, "center"); }
    else if (met(id)) { const a = speciesArt(fr, 76, 76); blit(art("study" + id, () => { const pb = new PB(a.w, a.h); for (let j = 0; j < a.p.length; j++) if (a.p[j] >= 0 && ((j % a.w) + ((j / a.w) | 0)) % 3 === 0) pb.p[j] = C.stone; return pb; }), x + 10, y + 8); text(clipText(fr.species.name, FRAME.w - 4, 2), x + FRAME.w / 2, y + FRAME.h + 6, C.mist, 2, "center"); }
    R(x, y + FRAME.h + 24, FRAME.w, 1, C.clay);   // the caption rule
    if (L().f === "spread" && L().i === i) focusRing(x - 5, y - 5, FRAME.w + 10, FRAME.h + 10);
  });
  const n = frameIds().length, pages = Math.ceil(n / 16);
  if (pages > 1) text("spread " + (L().page + 1) + " of " + pages + " · ◀ ▶ past the edge turns it", 512, 540, C.clay, 2, "center");
}
function drawBook() {
  paperBg();   const id = L().sp, fr = frameOf(id); if (!fr) { L().f = "spread"; return; }
  panel(30, 60, 300, 330, C.bone, C.bark); blit(speciesArt(fr, 260, 270), 50, 70);
  panel(40, 400, 280, 60, C.bone, C.clay); text(clipText(fr.species.name, 260, 3), 180, 410, C.panel, 3, "center"); text(fr.taxonomy?.clan ? "clan " + fr.taxonomy.clan + " · " + S.plural(fr.chapters.length, "chapter") : S.plural(fr.chapters.length, "chapter"), 180, 440, C.bark, 2, "center");
  // the clarity line: the species' type, not one of yours (the chapters and their looks are the guide spread, a page turn away)
  text(clipText(Lib.faceLine(G.st, id), 300, 2), 180, 468, C.bark, 2, "center");
  if (Lib.book(G.st, id).guide) text("▶", 980, 516, C.clay, 3, "center");   // the page-turn corner (968, 512, 24, 24): ▶ turns to the guide, until its master is placed
  const m = G.st.mibis.find((q) => S.speciesOf(q) === id);
  if (m) { const st = stampArt(fr, m.genome, m.read, 112); if (st) { panel(880, 400, 124, 124, C.bone, C.clay); blit(st, 886, 406); text(m.name, 942, 528, C.bark, 2, "center"); } }
  else text("no " + fr.species.name + " raised yet", 942, 500, C.clay, 2, "center");
}
function draw() { if (L().f === "book") drawBook(); else drawSpread(); }

// --- the guide spread (library.json): the layered view, from the field guide and nothing else ---
const slotReq = (m) => ({ kind: "slot", id: m.id, master: m.master, size: [m.rect[2], m.rect[3]], until: m.until });
let gcache = { key: "", view: null };
function guideBuild(ctx) {
  const l = L(), id = l.sp, fr = frameOf(id), model = Guide.guideModel(G.st, id, G.settings); if (!model) return null;
  l.g = Guide.guideKeep(model, l.g ?? Guide.guideInit(model));
  const key = JSON.stringify([id, l.g, G.st.guide[id], G.st.wish[id], G.st.mibis.map((m) => [m.id, m.read.length, m.released]), G.st.pods?.length, G.st.tray.map((p) => p.read?.length)]);
  if (gcache.key === key && gcache.view) return gcache.view;
  const v = Guide.guideView({ st: G.st, settings: G.settings, id, frame: fr, model, g: l.g, chips: SPECS.cross.colours.pigmentChips, podCarries: Lib.wishCarriers(G.st, id).pods.length > 0 }, SPECS.library, ctx);
  gcache = { key, view: v }; v.model = model; return v;
}
function guideNodes(ctx) {
  const v = guideBuild(ctx); if (!v) { L().f = "spread"; return []; }
  const out = [{ id: "guide.ground", kind: "rect", rect: [0, 40, 1024, 522], colour: "paper" }];   // one sheet across the gutter: no gutter, no cloth marker
  for (const t of v.tints) registerAsset({ id: t.id, w: t.w, h: t.h, status: "master", until: null, build: (e, env) => env.mask(t.w, t.h, Guide.tintMask(t.w, t.h), t.colour) });
  registerPictures(v.masters.map(slotReq), { podById: () => null, frameOf });
  const mk = (m) => layer("m." + m.id + "." + m.rect.slice(0, 2).join("."), m.rect, m.id), fold = v.masters.filter((m) => m.master === "library-foldout-1008x504").flatMap(mk), masters = v.masters.filter((m) => m.master !== "library-foldout-1008x504").flatMap(mk);
  // the nodes in draw order: the ground and the foldout master, the text and rects, then the masters over them (the panels' masters sit over the tint, the plates over their slots)
  out.push(...fold, ...v.nodes.filter((n) => n.kind !== "text"), ...masters, ...v.nodes.filter((n) => n.kind === "text"));
  if (v.ring) out.push(...focusRingNodes(v.ring));
  out.push(...frameFor(ctx, "library", v.line, { need: "" }));
  return out;
}
import { focusRing as focusRingNode } from "../../../ui/components/focusRing.mjs";
const focusRingNodes = (r) => focusRingNode("focus", r, SPECS.frame, { shape: "round" });
function nodes(ctx) {
  if (L().f === "guide") return guideNodes(ctx);
  return [{ id: "legacy", kind: "legacy", rect: [0, 0, 1024, 600], always: true, draw }, ...frameFor(ctx, "library", line())];
}
function line() {
  if (L().f === "guide") { const v = LAYER.ctx ? guideBuild(LAYER.ctx) : null; return v ? v.line : { back: "Library" }; }
  if (L().f === "book") { const fr = frameOf(L().sp), visit = Lib.visitTarget(G.st, L().sp); return { ok: visit ? "Visit " + visit.name : "", back: "Library", subject: fr ? fr.species.name + " · " + S.plural(G.st.mibis.filter((m) => S.speciesOf(m) === L().sp).length, "mibi") : "" }; }
  const id = pageOf()[L().i], fr = id && frameOf(id);
  if (!fr) return { back: "Home", subject: "an empty frame" };
  if (known(id)) return { ok: "Open", back: "Home", subject: fr.species.name + " · found" };
  if (met(id)) return { ok: "Open", back: "Home", subject: "a species met, not identified" };
  return { back: "Home", subject: "an empty frame" };
}
function act(k) {
  const l = L();
  if (l.f === "guide") {
    const v = LAYER.ctx ? guideBuild(LAYER.ctx) : null; if (!v) { l.f = "spread"; return; }
    if (k === "back") { l.f = "spread"; return; }
    if (k in DIRS_) { const r = Guide.guideMove(v.model, G.st, l.g, k); if (r === "turn") l.f = "book"; else l.g = r; return; }
    if (k !== "confirm") return;
    const cur = v.targets.find((t) => t.id === v.focus); if (!cur) return;
    if (cur.kind === "plate") { const ot = v.model.cols[l.g.open.col].traits[l.g.open.row], r = ot.pinned === cur.look ? Lib.wishUnpin(G.st, l.sp, ot.id) : Lib.wishPin(G.st, l.sp, ot.id, cur.look, G.settings); if (r.msg) msg(r.msg); if (r.ok) save(); }
    else if (cur.kind === "carrier") { UI.hab.id = cur.mibi.id; UI.hab.f = "stage"; goScreen("habitat"); }   // Visit: a jump to Habitat; ← there goes Home
    return;
  }
  if (l.f === "book") {
    if (k === "right" && Lib.book(G.st, l.sp).guide) { l.f = "guide"; l.g = null; return; }   // the page turn
    if (k === "back") l.f = "spread";
    else if (k === "confirm") { const m = Lib.visitTarget(G.st, l.sp); if (m) { UI.hab.id = m.id; UI.hab.f = "stage"; goScreen("habitat"); } }   // Visit: a jump to Habitat; ← there goes Home
    return;
  }
  const n = pageOf().length, pages = Math.ceil(frameIds().length / 16), row = (l.i % 8) >> 2, col = l.i % 4, pg = l.i >> 3;
  // ◀ ▶ walk a row across both pages of the spread; past the edge turns the spread
  if (k === "left") { if (l.i === 0 || (pg === 0 && col === 0)) { if (l.page > 0) { l.page--; l.i = 8 + row * 4 + 3; } } else if (col === 0) l.i = row * 4 + 3; else l.i--; }
  else if (k === "right") { if (pg === 1 && col === 3 || l.i === n - 1) { if (l.page < pages - 1) { l.page++; l.i = row * 4; } } else if (col === 3) l.i = Math.min(n - 1, 8 + row * 4); else l.i = Math.min(n - 1, l.i + 1); }
  else if (k === "up") l.i = row ? l.i - 4 : l.i;
  else if (k === "down") l.i = !row && l.i + 4 < n ? l.i + 4 : l.i;
  else if (k === "back") goScreen("home");
  else if (k === "confirm") { const id = pageOf()[l.i]; if (id && (known(id) || met(id))) { l.sp = id; l.f = "book"; } else msg("Nothing is known of this frame yet"); }
}
function enter() { const l = L(); if (l.page == null) { l.page = 0; l.i = 0; } if (l.sp && !known(l.sp) && !met(l.sp)) l.sp = null; }
// The Library key: the spread (the current frame stays), never spends.
export function openTop() { enter(); L().f = "spread"; }
// The guide spread of a species (the figure on Pods' overview and the species word on Habitat's card): a jump; ← reads Library.
export function openGuide(id) { const l = L(); enter(); const i = frameIds().indexOf(id); if (i >= 0) { l.page = Math.floor(i / 16); l.i = i % 16; } l.sp = id; l.f = "guide"; l.g = null; goScreen("library"); }
// Open a species' book (a new species at Identify opens its page).
export function openBook(id) { const l = L(); enter(); const i = frameIds().indexOf(id); if (i >= 0) { l.page = Math.floor(i / 16); l.i = i % 16; } l.sp = id; l.f = "book"; }
registerScreen("library", { nodes, line, act, enter });
