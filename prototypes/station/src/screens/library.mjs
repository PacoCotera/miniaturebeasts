// Library: the tome's spread of sixteen frames and a Book per species. M1 carries the spread with the
// registry's sixteen species (found plate, met study, empty unmet frame) and a Book stub: the species'
// face, its habit line, the frame's chapters and the looks found so far. M5 builds the Book whole.
import { C, R, blit, text, clipText, panel, focusRing, art, PB, clamp, clock } from "../gfx.mjs";
import { speciesArt, emblemArt, stampArt } from "../art.mjs";
import { G, UI, msg, goScreen, registerScreen } from "../game.mjs";
import { stageBg, drawTop } from "./frame.mjs";
import * as S from "../state.mjs";
import { frameOf, frameIds, speciesIndex } from "../genome.mjs";

const L = () => UI.lib;
// A spread holds sixteen frames: eight a page in two rows of four; more species turn the spread.
const FRAME = { w: 96, h: 112, y0: 70, gx: 120, gy: 160, left: 60, right: 560 };
const frameXY = (i) => ({ x: (i >= 8 ? FRAME.right : FRAME.left) + (i % 4) * FRAME.gx, y: FRAME.y0 + (((i % 8) >> 2) * FRAME.gy) });
const pageOf = () => frameIds().slice(L().page * 16, L().page * 16 + 16);
const known = (id) => G.st.knownIds.includes(id), met = (id) => G.st.metIds.includes(id);
function paperBg() { blit(art("paper", () => { const pb = new PB(1024, 522); for (let y = 0; y < 522; y++) for (let x = 0; x < 1024; x++) pb.p[y * 1024 + x] = ((x * 7 + y * 13) % 97 < 2) ? C.sand : C.paper; pb.rect(510, 0, 4, 522, C.clay); return pb; }), 0, 40); }
function drawSpread() {
  paperBg(); drawTop("Library");
  const ids = pageOf();
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
  paperBg(); drawTop("Library");
  const id = L().sp, fr = frameOf(id); if (!fr) { L().f = "spread"; return; }
  panel(30, 60, 300, 330, C.bone, C.bark); blit(speciesArt(fr, 260, 270), 50, 70);
  panel(40, 400, 280, 60, C.bone, C.clay); text(clipText(fr.species.name, 260, 3), 180, 410, C.panel, 3, "center"); text(fr.taxonomy?.clan ? "clan " + fr.taxonomy.clan + " · " + S.plural(fr.chapters.length, "chapter") : S.plural(fr.chapters.length, "chapter"), 180, 440, C.bark, 2, "center");
  // the chapters as tabs and the looks found so far
  text("the field guide · looks found so far", 360, 62, C.panel, 2);
  let y = 90;
  fr.chapters.forEach((ch) => { blit(emblemArt(ch.id), 360, y); text(ch.name + (ch.sealed ? " · sealed" : ""), 384, y + 1, C.panel, 2);
    const seen = ch.traits.map((t) => [t, S.guideLooks(G.st, id, t.id)]);
    const line = seen.map(([t, ls]) => t.name + ": " + (ls.length ? ls.join(", ") : "?") + (ls.length < (t.looks?.length || 1) ? " · more?" : "")).join("  ·  ");
    text(clipText(line, 620, 2), 384, y + 22, ls_col(seen), 2); y += 50; if (y > 500) return; });
  const m = G.st.mibis.find((q) => S.speciesOf(q) === id);
  if (m) { const st = stampArt(fr, m.genome, m.read, 112); if (st) { panel(880, 400, 124, 124, C.bone, C.clay); blit(st, 886, 406); text(m.name, 942, 528, C.bark, 2, "center"); } }
  else text("no " + fr.species.name + " raised yet", 942, 500, C.clay, 2, "center");
}
const ls_col = (seen) => (seen.some(([, ls]) => ls.length) ? C.bark : C.clay);
function draw() { if (L().f === "book") drawBook(); else drawSpread(); }
function line() {
  if (L().f === "book") { const fr = frameOf(L().sp); return { back: "Spread", subject: fr ? fr.species.name + " · " + S.plural(G.st.mibis.filter((m) => S.speciesOf(m) === L().sp).length, "mibi") : "" }; }
  const id = pageOf()[L().i], fr = id && frameOf(id);
  if (!fr) return { back: "Home", subject: "an empty frame" };
  if (known(id)) return { ok: "Open", back: "Home", subject: fr.species.name + " · found" };
  if (met(id)) return { ok: "Open", back: "Home", subject: "a species met, not identified" };
  return { back: "Home", subject: "an empty frame" };
}
function act(k) {
  const l = L();
  if (l.f === "book") { if (k === "back") l.f = "spread"; return; }
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
// Open a species' book (a new species at Identify opens its page).
export function openBook(id) { const l = L(); enter(); const i = frameIds().indexOf(id); if (i >= 0) { l.page = Math.floor(i / 16); l.i = i % 16; } l.sp = id; l.f = "book"; }
registerScreen("library", { draw, line, act, enter });
