// The Library module on Home (build spec 4.2): which species the window shows, the specimen picture of its found looks (specimen.mjs through the cache), the bead centres of the looks found since the Library was last opened full screen,
// and the module's words. Pure selectors over the save and the frames; the picture is made here in the logic process, off the face's frame, and named by its id (specimen:{species}:{digest of the found looks}:v{recipe}).
import * as S from "../state.mjs";
import { frameOf, frameIds } from "../genome.mjs";
import { fieldGuide, wishOf, possibleLooks, speciesStatus } from "../library.mjs";
import { specimenFor, specimenId, peekSpecimen } from "../specimen-cache.mjs";
import { HARNESS, MARGIN } from "../specimen.mjs";
import { fill } from "./words.mjs";

// Where a shut sealed chapter is (library.mjs fieldGuide): sealed in the frame, not opened by a setting or by a read.
const shutOf = (st, id, ch, settings) => !!ch.sealed && !settings.sealedOpen && !(st.readOnce[id] || []).includes(ch.id);
// The order of the species the window may show (the game designer's, build spec 15.1): a wished species with a bud in the Incubator; then the species of the newest mibi, by the highest mibi id; then species with no mibi, in the order they were learnt.
// The same order is the "most recently active" of the no-wish rule.
const newest = (st, id) => Math.max(-1, ...st.mibis.filter((m) => S.speciesOf(m) === id).map((m) => +m.id));
const order = (st, ids) => ids.slice().sort((a, b) => { const A = newest(st, a), B = newest(st, b); return A >= 0 && B >= 0 ? B - A : A >= 0 ? -1 : B >= 0 ? 1 : st.knownIds.indexOf(a) - st.knownIds.indexOf(b); });
// The species the window shows: the pinned wish's species (the one with a bud first); with no wish, the one with the fewest looks still unfound, ties in that order; never a species with nothing found. null when nothing is found anywhere.
export function specimenSpecies(st, settings) {
  const G = new Map(); for (const id of frameIds()) if (Object.keys(st.guide[id] ?? {}).length) { const g = fieldGuide(st, id, settings); if (g && g.found > 0) G.set(id, g); }   // a species with no guide entry has nothing found: it is not read
  const found = [...G.keys()]; if (!found.length) return null;
  const wished = found.filter((id) => Object.keys(wishOf(st, id)).length);
  if (wished.length) return (st.bud && wished.find((id) => S.speciesOf(st.bud) === id)) || order(st, wished)[0];
  const least = Math.min(...found.map((id) => G.get(id).unseen));
  return order(st, found.filter((id) => G.get(id).unseen === least))[0];
}
// The starter's species (Loika): what the window shows, in its empty state, while nothing is found anywhere (the art director: the core with every look a dormant open ring).
export const STARTER = "S01";
// The species' found looks in the traits of the chapters that are open, and the sealed chapters that are still shut (veiled: drawn with no beads).
export function specimenInput(st, id, settings) {
  const frame = frameOf(id); if (!frame) return null;
  const shut = frame.chapters.filter((ch) => shutOf(st, id, ch, settings)).map((ch) => ch.id), found = {};
  for (const ch of frame.chapters) if (!shut.includes(ch.id)) for (const t of ch.traits) { const ls = S.guideLooks(st, id, t.id); if (ls.length) found[t.id] = ls.slice(); }
  return { frame, found, shut };
}
// What the Level 2 sheet of a species is made from (library-sheet.mjs): its mode ("found", or "met": the pencil study with no words, the same for every player), the found looks and the chapters still shut
// (specimenInput), the looks new this visit (newLooksOf, as "<trait>|<look>"), the chapters read once, sealedOpen, and the species' share of the rest of the window's signature (its seen looks and its wish). null for an unmet species.
export function sheetInput(st, id, settings) {
  const status = speciesStatus(st, id); if (status === "unmet" || !frameOf(id)) return null;
  if (status !== "found") return { species: id, mode: "met", found: {}, shut: [], fresh: [], readOnce: [], sealedOpen: false, sig: null };
  const { found, shut } = specimenInput(st, id, settings);
  return { species: id, mode: "found", found, shut, fresh: [...newLooksOf(st, id, settings)], readOnce: (st.readOnce[id] || []).slice(), sealedOpen: !!settings.sealedOpen, sig: [st.libSeen?.[id] ?? {}, st.wish?.[id] ?? null] };
}
// The new looks of a species: its current looks (a legacy look, the Loika's plain, never counts) found since the Library was last opened full screen, as "<trait>|<look>".
export function newLooksOf(st, id, settings) {
  const frame = frameOf(id), out = new Set(); if (!frame) return out;
  for (const ch of frame.chapters) if (!shutOf(st, id, ch, settings)) for (const t of ch.traits) { const cur = possibleLooks(frame, t); for (const l of S.libNewLooks(st, id, t.id)) if (cur.includes(l)) out.add(`${t.id}|${l}`); }
  return out;
}
const LEVEL = (id, k) => (k ? `${id}:b${k + 1}` : id);
// A glint stands beside its bead, not on it (the art director, exact): its centre 8 px from the bead's centre, along the ray from the form's hub outward, kept inside the window's margin. Clearance is measured from the star's arm tips (radius 6)
// to any other bead's edge (its radius + 1) and to any other ray's centreline, and must be at least 3; the bead's own ray is left out. The search turns the offset about its own bead through 0, +-30, +-60, +-90, +-120 and +-150 degrees at 8 px,
// then the same at 10, then at 12, and takes the first clear spot. If nothing clears, the spot with the largest clearance is taken, never the outward spot by default.
export const GLINT_R = 6, GLINT_CLEAR = 3, GLINT_DISTANCES = [8, 10, 12], GLINT_TURNS = [0, 30, -30, 60, -60, 90, -90, 120, -120, 150, -150];
const segDist = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy, t = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0; return Math.hypot(px - ax - t * dx, py - ay - t * dy); };
// { x, y, clearance, fallback } for a bead among the beads ({ x, y, r }) and the rays (flat point lists)
export function glintSpot(b, beads = [], rays = [], half = GLINT_R) {
  const hx = HARNESS.w / 2 + HARNESS.dx, hy = HARNESS.h / 2 + HARNESS.dy, dx = b.x - hx, dy = b.y - hy, l = Math.hypot(dx, dy) || 1, lo = MARGIN + half, base = Math.atan2(dy / l, dx / l);
  const own = (r) => Math.hypot(r[r.length - 2] - b.x, r[r.length - 1] - b.y) < 6;
  const clearance = (x, y) => { let c = Infinity;
    for (const o of beads) if (o !== b) c = Math.min(c, Math.hypot(x - o.x, y - o.y) - half - ((o.r ?? 4.3) + 1));
    for (const r of rays) if (!own(r)) for (let i = 0; i + 3 < r.length; i += 2) c = Math.min(c, segDist(x, y, r[i], r[i + 1], r[i + 2], r[i + 3]) - half);
    return c; };
  let best = null;
  for (const d of GLINT_DISTANCES) for (const turn of GLINT_TURNS) {
    const a = base + turn * Math.PI / 180, x = Math.round(Math.min(HARNESS.w - lo, Math.max(lo, b.x + d * Math.cos(a)))), y = Math.round(Math.min(HARNESS.h - lo, Math.max(lo, b.y + d * Math.sin(a)))), c = clearance(x, y);
    if (c >= GLINT_CLEAR) return { x, y, clearance: c, fallback: false };
    if (!best || c > best.clearance) best = { x, y, clearance: c, fallback: true };
  }
  return best;
}
export const glintAt = (b, beads, rays, half) => { const g = glintSpot(b, beads, rays, half); return [g.x, g.y]; };
// What the window wants: the species, what its picture is made from and the new looks; the empty state of the starter when nothing is found. Memoised on what it reads: Home's props are built on every frame, and choosing a species reads every species' guide.
let wantMemo = null;
function wanted(st, settings) {
  const sig = JSON.stringify([st.guide, st.libSeen, st.wish, st.readOnce, st.knownIds, !!settings.sealedOpen, st.mibis.map((m) => [S.speciesOf(m), m.id]), st.bud ? S.speciesOf(st.bud) : null]);
  if (wantMemo && wantMemo.sig === sig) return wantMemo.w;
  const id = specimenSpecies(st, settings);
  const w = id == null ? { species: STARTER, found: {}, shut: [], fresh: new Set(), empty: true } : { species: id, ...(({ found, shut }) => ({ found, shut }))(specimenInput(st, id, settings)), fresh: newLooksOf(st, id, settings), empty: false };
  wantMemo = { sig, w }; return w;
}
const regionOf = (w, pic, spec) => {
  const L = spec.regions.library, S_ = spec.strings.library, name = frameOf(w.species).species.name, key = pic.id;
  const isNew = pic.beads.filter((b) => w.fresh.has(`${b.trait}|${b.look}`)), levels = [0, 1, 2, 3].map((k) => LEVEL(key, k));
  return { region: { species: w.species, picture: levels[0], levels, glints: isNew.slice(0, L.specimen.glint.max).map((b) => glintAt(b, pic.beads, pic.rays)), star: "star:12", ...(isNew.length ? { new: fill(S_.new, { n: isNew.length }) } : {}), genome: fill(S_.genome, { Species: name }) },
    request: { kind: "specimen", id: levels[0], levels, species: w.species, found: w.found, shut: w.shut, size: [HARNESS.w, HARNESS.h] } };
};
let shown = null;   // the last answer that had its picture: what a miss shows
// The Library region of Home's props, and the request that makes its four levels. It reads the cache only and never renders (a render is about a second and the logic thread answers nothing during it): on a miss it shows the last specimen it showed,
// else the starter's empty form if that is made, else nothing (the placeholder) until warmLibrary has made it. spec: home.json.
export function libraryOf(st, settings, spec) {
  const w = wanted(st, settings), pic = peekSpecimen(w.species, w.found);
  if (pic) { if (!w.out || w.outId !== pic.id) { w.out = regionOf(w, pic, spec); w.outId = pic.id; } shown = w.out; return w.out; }
  if (shown) return shown;
  const empty = peekSpecimen(STARTER, {});
  return empty ? regionOf({ species: STARTER, found: {}, shut: [], fresh: new Set() }, empty, spec) : { region: {}, request: null };
}
// Makes what the window wants if it is not made: the render. Called when a look is found (after the opening's last step is sent) and once at boot, never on a sync. Returns the picture's id, or null when it was already there.
export function warmLibrary(st, settings) {
  const w = wanted(st, settings); if (peekSpecimen(w.species, w.found)) return null;
  return specimenFor(frameOf(w.species), w.found, w.species, w.shut).id;
}
