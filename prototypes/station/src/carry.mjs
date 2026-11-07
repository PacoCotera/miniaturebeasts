// Carrying keys (keymap option 1, owner ruling 2026-11-07): a colour key goes to its room carrying what the ring is on. Pure: `carryPlan(m, key)` says what a key would carry from the screen as it is
// (m = { st, sv, settings, ui, specs }: the host's `h`, or the page's own parts), `cuesOf(m)` is the bottom line's cues (the key's room icon and a word, one a live carry), and `snapshot` / `restore`
// keep and bring back where a carry started (← after a carry, the lead's ruling). Nothing here draws or spends. The yellow key (Home) never carries.
//   ring on                  green (Vivarium)                    blue (Pods)                           purple (Library)
//   a pod                    Grow it: Create on this pod         Read it: its reading room (Pods only) its species page
//   a mibi                   up close (not from Habitat)         Pods filtered to its kind             its family (Level 3)
//   a chapter (Create)       -                                   the reading room on that chapter      the species page lit on that chapter
//   a species (Library)      Visit: its mibi up close            its pods                              -
import * as S from "./state.mjs";
import * as Lib from "./library.mjs";
import { frameOf, frameIds } from "./genome.mjs";
import { listOf } from "./views/pods-props.mjs";
import { idOf } from "./views/vivarium-props.mjs";
import { reviewTraits, createPod } from "./views/create-props.mjs";

export const KEYS = ["research", "habitat", "library"];   // blue, green, purple: the order the keys stand in on the device (yellow, blue, green, purple: Home, Pods, Vivarium, Library) and the cues after them
export const ROOM_MARK = { habitat: "vivarium", research: "research", library: "library" };   // the frame's room mark of each key (frame.json regions.marks.room)
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const words = (m) => m.specs?.frame?.strings?.carry ?? {};
const fill = (t, o) => String(t).replace(/\{(\w+)\}/g, (_, k) => (k in o ? o[k] : "{" + k + "}"));
const livingMibi = (st, id) => { const x = id != null ? S.mibiById(st, id) : null; return x && !x.released ? x : null; };

// What the ring is on: { kind: "pod", pod, reading? } | { kind: "mibi", mibi } | { kind: "chapter", pod, chapter } | { kind: "species", species } | null.
export function subjectOf(m) {
  const { st, ui, settings } = m, sc = ui.screen;
  if (sc === "pods") {
    const p = ui.pods; if (p.cmp || p.choosing) return null;
    if (p.view === "inventory" || !p.view) {
      const k = /^card\.(\d+)$/.exec(p.focus?.cur ?? ""), e = k ? listOf(st, m.specs.pods, p, settings)[+k[1]] : null; return e ? { kind: "pod", pod: e.p } : null;
    }
    if (p.view === "room" || p.view === "trait") { const q = S.benchPod(st); return q ? { kind: "pod", pod: q, reading: true } : null; }
    return null;
  }
  if (sc === "habitat") { const x = livingMibi(st, ui.hab.id); return x ? { kind: "mibi", mibi: x } : null; }
  if (sc === "vivarium") { const f = ui.viv.f ?? "", id = idOf(f) ?? (/^(?:cell|plate)\./.test(f) ? ui.viv.last : null), x = livingMibi(st, id); return x && !/^room\./.test(f) ? { kind: "mibi", mibi: x } : null; }
  if (sc === "create") {
    const cr = ui.create, pod = cr && createPod(st, cr); if (!pod || cr.grown) return null;
    const list = reviewTraits(pod, frameOf(S.speciesOf(pod))), cur = list[clamp(cr.f ?? 0, 0, Math.max(0, list.length - 1))]; return cur ? { kind: "chapter", pod, chapter: cur.c } : null;
  }
  if (sc === "library") { const id = ui.lib.l1; return id && frameIds().includes(id) && Lib.speciesStatus(st, id) !== "unmet" ? { kind: "species", species: id } : null; }
  if (sc === "library.species") { const id = ui.lib.species; return id && frameIds().includes(id) ? { kind: "species", species: id } : null; }
  if (sc === "library.family") { const id = ui.lib.species, n = ui.lib.l3?.[id]?.node, x = /^node\.(\d+)$/.test(n ?? "") ? livingMibi(st, +n.slice(5)) : null; return x ? { kind: "mibi", mibi: x } : null; }
  return null;
}
const spWord = (x) => S.cap(S.spName(x));
const speciesPods = (st, sid) => st.tray.some((p) => p.idd && S.speciesOf(p) === sid);
const homeMibiOf = (st, sid) => st.mibis.find((x) => !x.released && S.speciesOf(x) === sid) ?? null;

// The plan of one key: { act, word, ...what } or null where the key has nothing to carry (it does what it does today).
export function carryPlan(m, key) {
  const { st, settings, ui } = m; if (ui.idle || ui.panel || ui.hab?.namer) return null;   // an open panel or namer: a room key closes it and acts as everywhere
  const sub = subjectOf(m), W = words(m); if (!sub || !KEYS.includes(key)) return null;
  if (sub.kind === "pod") {
    const p = sub.pod, idd = !!p.idd, sid = idd ? S.speciesOf(p) : null;
    if (key === "habitat") return idd && !S.growBlock(st, p, {}, settings, []) ? { act: "grow", word: W.grow ?? "Grow", pod: p.id } : null;   // a pod that cannot grow now (sealed, the incubator busy, short) carries nothing: the key is the room's top
    if (key === "research") return sub.reading ? null : { act: "read", word: W.read ?? "Read", pod: p.id };
    return idd && Lib.speciesStatus(st, sid) !== "unmet" ? { act: "page", word: fill(W.page ?? "{Name} page", { Name: spWord(p) }), species: sid } : null;
  }
  if (sub.kind === "mibi") {
    const x = sub.mibi, sid = S.speciesOf(x);
    if (key === "habitat") return ui.screen === "habitat" ? null : { act: "close", word: W.look ?? "Look", mibi: x.id };
    if (key === "research") return speciesPods(st, sid) ? { act: "pods", word: fill(W.pods ?? "{Species} pods", { Species: spWord(x) }), species: sid } : null;
    return ui.screen === "library.family" ? null : Lib.speciesStatus(st, sid) === "found" ? { act: "family", word: W.family ?? "Family", mibi: x.id } : null;
  }
  if (sub.kind === "chapter") {
    const p = sub.pod, c = sub.chapter, sid = S.speciesOf(p);
    if (key === "research") return { act: "readChapter", word: W.readingRoom ?? "Reading room", pod: p.id, chapter: c.id };
    if (key === "library") return Lib.speciesStatus(st, sid) === "found" ? { act: "pageChapter", word: fill(W.chapterPage ?? "{Chapter} page", { Chapter: c.id === "legs-tail" ? "Legs" : c.name }), species: sid, chapter: c.id } : null;
    return null;
  }
  if (sub.kind === "species") {
    const sid = sub.species;
    if (key === "habitat") { const x = homeMibiOf(st, sid); return x ? { act: "close", word: W.visit ?? "Visit", mibi: x.id } : null; }
    if (key === "research") return speciesPods(st, sid) ? { act: "pods", word: fill(W.pods ?? "{Species} pods", { Species: S.cap(frameOf(sid).species.name) }), species: sid } : null;
    return null;
  }
  return null;
}
// A carry that does what ✓ already says needs no cue (the controls scheme): blue on a pod in the collection under Read (✓ is "Take to the reading room"), green on a mibi in the Vivarium (✓ goes up close). The key still carries.
export function sameAsConfirm(m, plan) {
  if (plan.act === "read") return m.ui.screen === "pods" && (m.ui.pods.verb ?? "read") === "read" && !m.ui.pods.fixed;
  if (plan.act === "close") return m.ui.screen === "vivarium";
  return false;
}
// The bottom line's cues: [{ key, room, word }] in key order, one for each live carry that is not what ✓ says. A carry that was just made shows none for its own key (a second tap is the room's top).
export function cuesOf(m) {
  if (m.ui.idle || m.ui.panel || m.ui.hab?.namer) return [];
  const out = []; for (const key of KEYS) { if (m.ui.carry?.key === key) continue; const c = carryPlan(m, key); if (c && !sameAsConfirm(m, c)) out.push({ key, room: ROOM_MARK[key], word: c.word }); }
  return out;
}

// The way back's word while a carry is live (← goes back to where the carry started, not up): the place's own name, its title, or the mibi's or pod's label where the place is one thing (up close, Create).
export function originWord(m) {
  const c = m.ui.carry; if (!c || m.ui.screen !== c.to) return null;
  const from = c.from.screen, T = m.specs?.frame?.strings?.titles ?? {};
  if (from === "habitat") return S.mibiById(m.st, c.from.hab?.id)?.name ?? T.habitat ?? null;
  if (from === "create") { const p = m.ui.create && createPod(m.st, m.ui.create); return p ? S.cap(S.spName(p)) : T.create ?? null; }
  return T[from] ?? null;
}
// ---- where a carry started ----
const plain = (o) => { const r = {}; for (const k of Object.keys(o ?? {})) if (k !== "focus" && k !== "f" && typeof o[k] !== "function") r[k] = structuredClone(o[k]); return r; };
export function snapshot(h) {
  const ui = h.ui, p = ui.pods;
  return { screen: ui.screen, pods: plain(p), podsFocus: p.focus.cur ?? null, hab: plain(ui.hab), viv: plain(ui.viv), lib: plain(ui.lib), createFrom: ui.createFrom ?? null, homeF: ui.home?.f ?? null };
}
export function restore(h, from) {
  const ui = h.ui; Object.assign(ui.pods, structuredClone(from.pods)); ui.pods.focus.set(from.podsFocus);
  Object.assign(ui.hab, structuredClone(from.hab)); Object.assign(ui.viv, structuredClone(from.viv)); Object.assign(ui.lib, structuredClone(from.lib)); ui.createFrom = from.createFrom;
  h.goto(from.screen);   // the screen's own state (Create's unpaid choices among it) was kept: a carry is a peek
}
