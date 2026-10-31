// The Pods props (lvgl-switch.md §2.1): pure selectors from the state, the focus and the presentation progress to the props of the face's words. Props name *what*, never *where*: strings, states,
// counts, asset ids, flags, and the focus targets by id; no rectangle, no measure, no layout rule (the words place everything from the spec, the face wraps and fits the type), no canvas, no keys.
// The output is plain JSON: { props (the part sent to the face: state, regions, focus), line (the bottom line, for the frame), requests (the pictures the host makes ready before the props: plain requests the
// asset manifest registers), mode, cur, empty }. Runs in Node, tested there. It is the only view of Pods.
// Pods is the pod inventory (the pod inventory's design: the cabinet of every pod, sorted, filtered and found, the panel of the focused pod; its states inventory, filter and find), the reading room
// (the read's design: one pod on the bench, read page by page; its states room and trait) and Compare (the pods design, the two pages side by side).
import * as S from "../state.mjs";
import { keyToken } from "../looks.mjs";
import { frameOf, traitState, traitKind, chapterLooks } from "../genome.mjs";
import { founderPicture } from "./create-props.mjs";
import { fill, spell } from "./words.mjs";
import { req as reqOf, slotAt as slot } from "./requests.mjs";
import { readView, miniRailProps } from "./reading-props.mjs";

const PLACE_KEYS = ["meadow", "pond", "rock", "wood", "cave"];
const podFrame = (p) => frameOf(S.speciesOf(p));
// An unidentified pod is the unknown pod: its own pictures, never a species' shell, even when the species is known.
const shellFrame = (st, p) => (p.idd && st.knownIds.includes(S.speciesOf(p)) ? podFrame(p) : null);
// The species a pod's shell shows (an unidentified pod, and a species not yet known, show the unknown shell): the inventory, the reading room and Cargo's rack draw the same pod.
export const shellSpecies = (st, p) => (shellFrame(st, p) ? S.speciesOf(p) : null);
const railWord = (c, spec) => (c.id === "legs-tail" ? spec.strings.legsTail.rail : c.name);
const headingWord = (c, spec) => (c.id === "legs-tail" ? spec.strings.legsTail.heading : c.name);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
// No digits where a picture or a word does: a count in a sentence is said in words; an amount beside a material icon is a price or a shortfall and stays in figures.
export const inWords = (text) => (text || "").replace(/\d+(?! [⚡◆❀])/g, (n) => spell(+n, "many"));
const podPic = (req, st, p, size, state = p.idd ? "identified" : "sealed") => { const sp = shellSpecies(st, p); return req({ kind: "pod", id: `pod:${sp ?? "-"}:${state === "identified" ? "i" : "s"}:${size.join("x")}`, species: sp, state, size }); };

// ---- what a pod is worth (the pods design): the tags in their order, at most two -------------------------------------------------------------------------------------------------
const living = (st) => st.mibis.filter((m) => !m.released);
// a species whose best pair at home is close kin (a quarter or more): a wild pod of it is new blood
function closeKinSpecies(st) {
  const out = new Set(), by = new Map();
  for (const m of living(st)) { const sp = S.speciesOf(m); if (!by.has(sp)) by.set(sp, []); by.get(sp).push(m); }
  for (const [sp, ms] of by) {
    if (ms.length < 2) continue;
    let best = Infinity; for (let i = 0; i < ms.length; i++) for (let j = i + 1; j < ms.length; j++) { const k = S.kinshipOf(st, ms[i], ms[j]); if (k < best) best = k; }
    if (best >= 0.25) out.add(sp);
  }
  return out;
}
// The tags of a pod, most useful first: [{ key, text }]. `ctx` holds what every pod shares (the close-kin species).
export function worthTags(st, p, spec, ctx = { closeKin: closeKinSpecies(st) }, settings = S.DEFAULT_SETTINGS) {
  const W = spec.strings.inv.worth, out = [], fr = p.idd ? podFrame(p) : null;
  if (!p.idd) return [{ key: "sealed", text: fill(W.sealed, { n: S.identifyCost(st, settings) }) }];
  const goal = S.podGoalTraits(st, p);
  if (goal.length) { const want = st.wish[S.speciesOf(p)] || {}; out.push({ key: "goal", text: fill(W.goal, { look: want[goal[0]] }) }); }
  if (!living(st).some((m) => S.speciesOf(m) === S.speciesOf(p))) out.push({ key: "newSpecies", text: W.newSpecies });
  if (p.shed != null) out.push({ key: "line", text: fill(W.line, { name: p.of || "a returned mibi" }) });   // of a home mibi's line: it wins over new blood, and the two never share a card ()
  else if (ctx.closeKin.has(S.speciesOf(p))) out.push({ key: "newBlood", text: W.newBlood });
  const glints = fr ? fr.chapters.filter((c) => S.glint(st, p, c.id)).length : 0;
  if (glints) out.push({ key: "glints", text: glints === 1 ? W.glintsOne : fill(W.glints, { n: glints }) });
  if (S.fullyRead(p, settings)) out.push({ key: "full", text: W.full });
  if (!out.length) out.push({ key: "nothing", text: W.nothing });
  return out.slice(0, 2);
}
const USE_RANK = { goal: 0, newSpecies: 1, newBlood: 2, line: 2, glints: 3, sealed: 4, full: 5, nothing: 6 };
const useRank = (tags) => Math.min(...tags.map((t) => USE_RANK[t.key] ?? 4));

// ---- the mini rail and the freshness strip, as the card draws them ----
// The mini rail under a card (the reading screen spec §4): one block a chapter in frame order, as wide as its traits are many (the face shares 88 px by the largest remainder, 2 px apart, 4 px at least; miniWidths is
// that rule for the tests); a read block is lit in its chapter's colour, an unread one an inlay with a 1 px line in it, a sealed one the inlay alone, the lock after the bar while one is shut. An unidentified pod has
// no chapters to show: one bare inlay.
export const miniWidths = (ns, total = 88, gap = 2, min = 4) => {
  const n = ns.length, avail = total - gap * (n - 1), tot = ns.reduce((a, b) => a + b, 0), w = ns.map((c) => Math.max(min, Math.floor((avail * c) / tot))); let left = avail - w.reduce((a, b) => a + b, 0);
  const rem = ns.map((c, i) => [((avail * c) / tot) % 1, i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (let k = 0; left > 0; k = (k + 1) % n, left--) w[rem[k][1]]++; for (let k = 0; left < 0; k = (k + 1) % n) if (w[rem[k][1]] > min) { w[rem[k][1]]--; left++; } return w;
};
export const miniRail = (p, settings) => {
  const fr = p && p.idd ? podFrame(p) : null; if (!fr) return { lanes: [{ ch: "", n: 1, state: "unread" }], lock: false };
  let lock = false;
  const lanes = fr.chapters.map((c) => { const read = p.read.includes(c.id), sealed = !!c.sealed && !settings.sealedOpen && !read; if (sealed) lock = true; return { ch: c.id, n: c.traits.length, state: read ? "read" : sealed ? "sealed" : "unread" }; });
  return { lanes, lock };
};
function freshOf(st, p, spec) {
  const f = S.podFreshness(st, p), F = spec.strings.inv.fresh;
  return { left: f.left, life: f.life, amber: f.amber, bench: f.bench, words: f.bench ? F.bench : f.left <= 1 ? F.next : f.amber ? fill(F.drying, { n: f.left }) : fill(F.left, { n: f.left }) };
}
const SHORT_HOW = { shake: "shaken loose", calm: "a calm creature", curl: "a curled creature", meal: "after a meal", slab: "under a slab", ground: "dug up", deep: "deep below", cave: "dug up", shed: "of {name}'s line" };
function shortOrigin(p, spec) {
  const place = spec.strings.inv.places[p.g] ?? "the wild", how = SHORT_HOW[p.how];
  return how ? place + " · " + how.replace("{name}", p.of || "a returned mibi") : place;
}

// ---- the inventory's list: every pod, filtered, found and sorted (the pod inventory's design) ------------------------------------------------------------------------------------------------
// The chips of the filter tray, by row: [{ id, word, row }]: the reading state, the marks, one a species held (identified), in the field guide's order.
export const READING = ["sealed", "unread", "partly", "full"], MARKS = ["goal", "glints", "drying", "line"];
function readingOf(p, settings) { if (!p.idd) return "sealed"; const fr = podFrame(p), open = fr.chapters.filter((c) => !c.sealed || settings.sealedOpen), n = open.filter((c) => p.read.includes(c.id)).length; return n === 0 ? "unread" : n < open.length ? "partly" : "full"; }
function marksOf(st, p) { const out = []; if (S.podGoal(st, p)) out.push("goal"); if (S.podGlints(st, p)) out.push("glints"); if (S.dryingSoon(st, p)) out.push("drying"); if (p.shed != null) out.push("line"); return out; }
// Find's words: the closed set the save holds: species, looks found, places and the lines' mibi names, each with the pods it matches.
export function findWords(st, spec) {
  const out = new Map(), K = spec.strings.inv.kinds, add = (word, kind, p) => { const key = kind + "|" + word; if (!out.has(key)) out.set(key, { word, kind, kindWord: K[kind], ids: new Set() }); out.get(key).ids.add(p.id); };
  for (const p of st.tray) {
    if (p.idd) { add(S.cap(S.spName(p)), "species", p); const fr = podFrame(p);
      for (const ch of fr.chapters) { if (p.read.includes(ch.id)) for (const [, ls] of chapterLooks(fr, ch, p.genome)) for (const l of ls) add(l, "look", p);
        else if (S.glint(st, p, ch.id)) for (const t of ch.traits) for (const l of S.guideLooks(st, S.speciesOf(p), t.id)) add(l, "look", p); } }
    if (spec.strings.inv.places[p.g]) add(spec.strings.inv.places[p.g], "place", p);
    if (p.shed != null && p.of) add(p.of, "mibi", p);
  }
  return [...out.values()].map((w) => ({ word: w.word, kind: w.kind, kindWord: w.kindWord, ids: [...w.ids] })).sort((a, b) => a.word.localeCompare(b.word) || a.kind.localeCompare(b.kind));
}
export const findLetter = (w) => w.word[0].toUpperCase();
// The pods the inventory shows, in order. ui: { sort, chips: [chip ids], word: { word, kind } | null }.
export function listOf(st, spec, ui, settings = S.DEFAULT_SETTINGS) {
  const ctx = { closeKin: closeKinSpecies(st) }, chips = ui.chips ?? [], rows = { reading: chips.filter((c) => READING.includes(c)), marks: chips.filter((c) => MARKS.includes(c)), species: chips.filter((c) => /^S\d\d$/.test(c)) };
  const found = ui.word ? new Set(findWords(st, spec).find((w) => w.word === ui.word.word && w.kind === ui.word.kind)?.ids ?? []) : null;
  let pods = st.tray.map((p, i) => ({ p, i, tags: worthTags(st, p, spec, ctx, settings) }));
  pods = pods.filter(({ p }) => (!rows.reading.length || rows.reading.includes(readingOf(p, settings))) && (!rows.marks.length || marksOf(st, p).some((m) => rows.marks.includes(m))) && (!rows.species.length || (p.idd && rows.species.includes(S.speciesOf(p)))) && (!found || found.has(p.id)));
  const sort = ui.sort ?? "use", order = frameIdsOrder();
  const by = {
    use: (a, b) => useRank(a.tags) - useRank(b.tags) || a.i - b.i,
    species: (a, b) => (a.p.idd ? 0 : 1) - (b.p.idd ? 0 : 1) || (order.get(S.speciesOf(a.p)) ?? 99) - (order.get(S.speciesOf(b.p)) ?? 99) || a.i - b.i,
    arrival: (a, b) => b.i - a.i,
    drying: (a, b) => (S.onBench(st, a.p) ? 1 : 0) - (S.onBench(st, b.p) ? 1 : 0) || S.turnsLeft(st, a.p) - S.turnsLeft(st, b.p) || a.i - b.i,
  }[sort] ?? ((a, b) => a.i - b.i);
  return pods.sort(by);
}
import { frameIds } from "../genome.mjs";
const frameIdsOrder = () => new Map(frameIds().map((id, i) => [id, i]));
// The rows of the cabinet: three cards a row; sorted by species, each species starts a row, and every row stands under its species' label.
export function rowsOf(list, spec, sort) {
  const across = spec.regions.inventory.cabinet.card.across, rows = [];
  if (sort === "species") {
    let last = undefined;
    for (const e of list) { const sp = e.p.idd ? S.speciesOf(e.p) : null; const r = rows.at(-1);
      if (sp !== last || !r || r.items.length >= across) { rows.push({ label: sp ?? "-", items: [] }); last = sp; }   // every row of a species carries its label, carved into its plank (review round 2)
      rows.at(-1).items.push(e); }
  } else for (let i = 0; i < list.length; i += across) rows.push({ label: null, items: list.slice(i, i + across) });
  return rows;
}

// m: { st, sv, settings, docked, crates, ui: the Pods UI (see intents/pods.mjs), focus: id | null }
export function podsBuild(m, spec) {
  const { st, ui } = m, requests = [], req = reqOf(requests);
  const mode = ui.cmp ? "compare" : ui.view ?? "inventory";
  const view = { mode, requests, empty: !st.tray.length };
  if (mode === "compare") return compareView(view, m, spec, req);
  if (mode === "room" || mode === "trait") return readView(view, m, spec, req);   // the reading screen v2 (views/reading-props.mjs): the reading room, its bench, index, band and overlay retire
  return inventoryView(view, m, spec, req);
}

// the top `h` rows of a placed master, 1:1 (never scaled): the cabinet's cut foot
const crop = (req, master, of, h) => req({ kind: "crop", id: `${master}:top:${h}`, master, of, at: [0, 0], size: [of[0], h], until: "the master's top rows" });

// ---- the inventory ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
function inventoryView(view, m, spec, req) {
  const { st, settings, ui } = m, Sg = spec.strings.inv, R = spec.regions.inventory, focus = m.focus ?? null;
  const list = listOf(st, spec, ui, settings), husks = S.unshownHusks(st).slice(0, 3), rows = rowsOf(list, spec, ui.sort);
  if (husks.length) rows.unshift({ label: null, items: [], husks });   // a dried pod shows once as the painted husk in its niche, a row at the head of the list
  const cards = []; let k = 0;
  rows.forEach((r, ri) => r.items.forEach((e, ci) => { cards.push({ k: k++, row: ri, col: ci, e }); }));
  const target = (id) => cards.find((c) => "card." + c.k === id) ?? null;
  // the ring's card (or the panel's: the card the ring last left); the first row on screen keeps one row of context above the ring where it can, and the last row ends on a bare plank
  const curCard = target(focus) ?? (ui.panelPod ? cards.find((c) => c.e.p.id === ui.panelPod) : null) ?? cards[0] ?? null;
  const maxFirst = Math.max(0, rows.length - 2);
  let first = clamp(ui.first ?? 0, 0, maxFirst);
  if (focus && focus.startsWith("card.") && curCard) { if (curCard.row < first || curCard.row > first + 1) first = clamp(curCard.row - 1, 0, maxFirst); }
  view.first = first; view.panelPod = curCard ? curCard.e.p.id : null;
  const shown = cards.filter((c) => c.row >= first - 1 && c.row <= first + 2);
  const card = (c) => {
    const p = c.e.p, tag = c.e.tags[0], fresh = freshOf(st, p, spec), bar = miniRail(p, settings);
    return { k: c.k, row: c.row - first, col: c.col, niche: req({ kind: "slot", id: "pod-niche-88x88", master: "pod-niche-88x88", size: [88, 88], until: "the niche master (pass 142)" }),
      shadow: req({ kind: "slot", id: "pod-niche-shadow-88x88", master: "pod-niche-shadow-88x88", size: [88, 88], until: "the niche's pod shadow (pass 142)" }), pod: podPic(req, st, p, R.cabinet.card.pod.slice(2)),
      star: S.podGoal(st, p), isNew: !p.seen, rail: bar.lanes, lock: bar.lock, fresh: { left: fresh.left, life: fresh.life, amber: fresh.amber, bench: fresh.bench },
      name: p.idd ? S.cap(S.spName(p)) : "", worth: tag.text, line: fresh.amber ? fresh.words : shortOrigin(p, spec), amber: fresh.amber };
  };
  const husk = (r, i, row) => ({ k: -1 - i, row: row - first, col: i, niche: req({ kind: "slot", id: "pod-niche-husk-88x88", master: "pod-niche-husk-88x88", size: [88, 88], until: "the husk niche (pass 142)" }), husk: true,
    shadow: "", pod: "", star: false, isNew: false, rail: [], lock: false, fresh: { left: 0, life: S.POD_LIFE, amber: true, bench: false }, name: r.idd ? S.cap(frameOf(r.species)?.species.name ?? "") : "", worth: Sg.driedLabel, line: "", amber: false });
  const cab = {
    strip: req({ kind: "slot", id: R.cabinet.strip.id, master: R.cabinet.strip.id, size: R.cabinet.strip.size, until: "the cabinet strip (pass 142)" }),
    lantern: req({ kind: "slot", id: R.cabinet.lantern.id, master: R.cabinet.lantern.id, size: R.cabinet.lantern.rect.slice(2), until: "the lantern (pass 143)" }),
    fern: req({ kind: "slot", id: R.cabinet.fern.id, master: R.cabinet.fern.id, size: R.cabinet.fern.rect.slice(2), until: "the fern (pass 143)" }),
    leafOn: true,
    rows: rows.slice(Math.max(0, first - 1), first + 3).map((r, i) => ({ row: Math.max(0, first - 1) + i - first, label: r.label ? fill(Sg.speciesLabel, { Species: r.label === "-" ? Sg.sealedPod : S.cap(frameOf(r.label)?.species.name ?? ""), n: list.filter((e) => (e.p.idd ? S.speciesOf(e.p) : "-") === r.label).length }) : "" })),
    cards: [...(husks.length && first <= 1 ? husks.map((r, i) => husk(r, i, 0)) : []), ...shown.map(card)],
    stripPeek: "", nichePeek: "", empty: "", bare: !st.tray.length && !husks.length ? req({ kind: "slot", id: "pod-niche-88x88", master: "pod-niche-88x88", size: [88, 88], until: "the niche master (pass 142)" }) : "",
  };
  // the cabinet's foot: the band of the strip cut by the cabinet's bottom edge and, on a row that peeks, its niches' rims, each the top rows of its master (a crop, 1:1)
  { const C = R.cabinet, T = C.strip.size[1], LAB = C.speciesLabel.h, VIEW = C.rect[3], ny = C.card.niche[1], nh = C.card.niche[3]; let y = 0, r = first;
    while (y < VIEW) { const lab = rows[r]?.label ? LAB : 0; y += lab; if (y >= VIEW) break; const rem = VIEW - y; if (rem < T) { cab.stripPeek = crop(req, C.strip.id, C.strip.size, rem); const v = rem - ny; if (rows[r] && v > 0 && v < nh) cab.nichePeek = crop(req, "pod-niche-88x88", [88, 88], v); break; } y += T; r++; } }
  if (!st.tray.length && !husks.length) cab.empty = Sg.none;
  else if (!list.length && st.tray.length) cab.empty = Sg.noMatch;
  // the scroll rail: the share shown and where, in thousandths, only when the cabinet scrolls
  const total = rows.length, seen = 2;
  view.rail = total > seen ? { share: Math.round((1000 * seen) / total), from: Math.round((1000 * first) / total) } : null;
  // the tool row
  const drying = st.tray.filter((p) => S.dryingSoon(st, p)).length, none = !st.tray.length;
  const chipWord = (c) => (READING.includes(c) ? spec.strings.inv.tray[c] : MARKS.includes(c) ? spec.strings.inv.tray[c] : S.cap(frameOf(c)?.species.name ?? c));
  const chips = (ui.chips ?? []).map((c) => ({ id: c, word: chipWord(c) })).concat(ui.word ? [{ id: "word", word: ui.word.word }] : []);
  const speciesN = new Set(st.tray.filter((p) => p.idd).map((p) => S.speciesOf(p))).size;
  const countAll = st.tray.length === 1 ? Sg.countOne : speciesN === 1 ? fill(Sg.countOneSpecies, { n: st.tray.length }) : fill(Sg.count, { n: st.tray.length, s: speciesN });
  const filtered = chips.length ? fill(Sg.filtered, { k: list.length, n: st.tray.length, what: chips.map((c) => c.word).join(", ") }) : null;
  const flash = ui.flash && ui.flash.until > (m.now ?? 0) ? ui.flash.text : husks.length ? (husks.length === 1 ? fill(Sg.dried, { n: 1 }) : fill(Sg.driedMany, { n: husks.length })) : "";
  view.tools = {
    sort: none ? Sg.nothingToSort : fill(Sg.sort, { how: Sg.sorts[ui.sort ?? "use"] }), filter: none ? Sg.nothingToFilter : drying ? fill(Sg.filterDrying, { n: drying }) : Sg.filter, filterAmber: !none && drying > 0,
    find: none ? Sg.nothingToFind : Sg.find, dim: none, chips: chips.map((c) => c.word), count: flash || filtered || (none ? "" : countAll),
  };
  view.cabinet = cab; view.list = list; view.cards = cards;
  // the panel: the focused card in full, and its actions
  view.panel = panelOf(m, spec, req, curCard?.e.p ?? null, focus);
  if (!curCard) view.panel.message = !st.tray.length && !husks.length ? Sg.panelNone : !list.length && st.tray.length ? Sg.panelNoMatch : [];   // the bare panel says why it is bare, centred (review round 2)
  view.line = lineOf(m, spec, view, focus, curCard);
  view.targets = inventoryTargets(view, shown, st, ui);
  view.resolve = inventoryResolve(view, cards, shown, focus, curCard, first);
  return view;
}
// the price of what is short, icon and figure ("❀ 2", "⚡ 3 ❀ 2"): a held Grow it says how much on its face
const shortPrice = (st, c) => [c.e > st.e ? "⚡ " + c.e : "", c.s > st.s ? "❀ " + c.s : ""].filter(Boolean).join(" ");
// The panel's five buttons, in their order, with their words and prices; a held one keeps its place and says why on its face.
export function panelActs(m, spec, p) {
  const { st, settings, ui } = m, B = spec.strings.inv.buttons, choosing = !!ui.choosing, guard = ui.ask === p?.id ? S.letGoGuard(st, p) : null;
  if (!p) return [];
  const bench = S.onBench(st, p), take = choosing ? B.bring : bench ? B.open : B.take;
  const gb = S.growBlock(st, p, {}, settings, []), grow = !gb ? { word: B.grow, dim: false } : /full/.test(gb) ? { word: B.growFull, dim: true } : /busy|incubator/.test(gb) ? { word: B.growBusy, dim: true } : /^needs/.test(gb) ? { word: fill(B.growShort, { icons: shortPrice(st, S.growCost(st, {}, settings)) }), dim: true } : { word: B.grow + " · " + gb, dim: true };
  const fc = S.freshenCost(st, p, settings), fb = S.freshenBlock(st, p, settings);
  const fresh = bench ? { word: B.freshenBench, dim: true } : !fc ? { word: B.freshenFull, dim: true } : fb ? { word: fill(B.freshenShortFace, { n: fc, have: st.s }), foot: fill(B.freshenShort, { n: fc, have: st.s }), dim: true } : { word: fill(B.freshen, { n: fc }), dim: false };   // a held Freshen ends "· you have ❀ n" on its face too (review round 2); the foot says it whole
  const kin = p.idd ? st.tray.find((q) => q !== p && S.canCompare(st, p, q)) : null;
  const cmp = !p.idd ? { word: B.compareSealed, dim: true } : kin ? { word: B.compare, dim: false } : { word: fill(B.compareOnly, { Species: S.cap(S.spName(p)) }), dim: true };
  const letGo = guard ? { word: guard === "goal" ? B.letGoGoal : fill(B.letGoOnly, { Species: S.cap(S.spName(p)) }), dim: false, ask: true } : { word: B.letGo, dim: false };
  return [{ id: "take", word: take, dim: false }, { id: "grow", ...grow }, { id: "freshen", ...fresh }, { id: "compare", ...cmp }, { id: "letGo", ...letGo }];
}
function panelOf(m, spec, req, p, focus) {
  const { st, settings } = m, Sg = spec.strings.inv;
  if (!p) return { name: "", worth: [], rail: null, originPicture: "", origin: [], fresh: { words: "", amber: false, bench: false }, acts: [], message: [] };
  const tags = worthTags(st, p, spec, undefined, settings), fresh = freshOf(st, p, spec);
  const out = { name: p.idd ? S.cap(S.spName(p)) : Sg.sealedPod, worth: tags.map((t) => t.text), rail: miniRailProps(req, st, p, settings),   // a sealed pod says "sealed" once, in its worth tag (review round 2)
    originPicture: PLACE_KEYS.includes(p.g) ? req({ kind: "place", id: `place:${p.g}:48`, place: p.g, size: 48 }) : "", origin: [S.podOrigin(p)],
    fresh: { words: fresh.words, amber: fresh.amber, bench: fresh.bench }, acts: panelActs(m, spec, p).map((a) => ({ word: a.word, dim: a.dim, ask: !!a.ask })), message: [] };
  Object.defineProperty(out, "feet", { value: panelActs(m, spec, p).map((a) => a.foot ?? a.word), enumerable: false });   // the foot's words of each button (not sent to the face)
  return out;
}
function inventoryTargets(view, shown, st, ui) {
  const t = [];
  if (!st.tray.length) { t.push({ id: "sort", group: "sort", enabled: false }, { id: "filter", group: "filter", enabled: false }, { id: "find", group: "find", enabled: false }); return t; }
  t.push({ id: "sort", group: "sort" }, { id: "filter", group: "filter" }, { id: "find", group: "find" });
  view.tools.chips.forEach((_, i) => t.push({ id: "chip." + i, group: "chip", index: i }));
  for (const c of shown) t.push({ id: "card." + c.k, group: "card", index: c.k });
  view.panel.acts.forEach((a, i) => t.push({ id: "act." + i, group: "act", index: i, enabled: !a.dim }));
  return t;
}
// The host's answers to the graph's selectors for the ring where it is (pods.json focus.inventory.selectors).
function inventoryResolve(view, cards, shown, focus, curCard, first) {
  const r = { "card.back": curCard ? "card." + curCard.k : null, "chip.first": view.tools.chips.length ? "chip.0" : null };
  const topRow = shown.filter((c) => c.row === first), under = (col) => { const c = topRow.find((x) => x.col === col) ?? topRow.at(-1); return c ? "card." + c.k : null; };
  r["sort.down"] = under(0) ?? "sort"; r["filter.down"] = under(1) ?? "filter"; r["find.down"] = under(2) ?? "find";
  const c = cards.find((x) => "card." + x.k === focus);
  if (c) {
    const at = (row, col) => cards.find((x) => x.row === row && x.col === col);
    const left = at(c.row, c.col - 1), right = at(c.row, c.col + 1), up = at(c.row - 1, c.col) ?? (c.row > 0 ? cards.filter((x) => x.row === c.row - 1).at(-1) : null), down = at(c.row + 1, c.col) ?? cards.filter((x) => x.row === c.row + 1).at(-1);
    r["card.left"] = left ? "card." + left.k : focus;
    r["card.right"] = right ? "card." + right.k : c.col === 2 ? "act.0" : focus;   // ▶ from the right-hand column goes to the panel's first button
    r["card.up"] = up ? "card." + up.k : ["sort", "filter", "find"][c.col] ?? "find";   // ▲ from the top row: the tool above it
    r["card.down"] = down ? "card." + down.k : focus;
  } else { r["card.left"] = r["card.right"] = r["card.up"] = r["card.down"] = curCard ? "card." + curCard.k : null; }
  return r;
}

// ---- the filter tray and Find (the pod inventory's design) -------------------------------------------------------------------------------------------------------------------------------------
export function trayOf(m, spec) {
  const { st, settings, ui } = m, T = spec.strings.inv.tray, chips = ui.chips ?? [];
  const count = (pred) => st.tray.filter(pred).length;
  const order = frameIdsOrder(), species = [...new Set(st.tray.filter((p) => p.idd).map((p) => S.speciesOf(p)))].sort((a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99));
  const chip = (id, word, n) => ({ id, word: word + " " + n, lit: chips.includes(id), dim: n === 0 });
  const shown = listOf(st, spec, ui, settings).map((e) => e.p), plan = S.freshenPlan(st, shown.filter((p) => !S.onBench(st, p)), settings);
  const group = shown.filter((p) => !S.onBench(st, p)), carries = group.some((p) => S.podGoal(st, p));
  const fresh = !plan.of ? T.freshenNone : plan.n === plan.of ? fill(T.freshenThese, { n: plan.cost }) : fill(T.freshenSome, { k: plan.n, n: plan.cost });
  return [
    { head: T.reading, chips: READING.map((r) => chip(r, T[r], count((p) => readingOf(p, settings) === r))) },
    { head: T.marks, chips: MARKS.map((k) => chip(k, T[k], count((p) => marksOf(st, p).includes(k)))) },
    { head: T.species, chips: species.map((sp) => chip(sp, S.cap(frameOf(sp).species.name), count((p) => p.idd && S.speciesOf(p) === sp))) },
    { head: "", chips: [{ id: "clear", word: T.clear, lit: false, dim: !chips.length && !ui.word }, { id: "freshenThese", word: fresh, lit: false, dim: !plan.n }, { id: "letThese", word: ui.ask === "letThese" ? (carries ? fill(T.letTheseAsk, { n: group.length }) : fill(T.letTheseAskPlain, { n: group.length })) : fill(T.letThese, { n: group.length }), lit: false, dim: !group.length }] },
  ];
}
export function findOf(m, spec) {
  const { st, ui } = m, words = findWords(st, spec), letters = [...new Set(words.map(findLetter))], f = ui.find ?? {};
  const recent = (ui.recent ?? []).filter((r) => words.some((w) => w.word === r.word && w.kind === r.kind)).slice(0, 4);
  const lit = f.letter && letters.includes(f.letter) ? f.letter : recent[0] ? findLetter(recent[0]) : letters[0] ?? null;
  const Sg = spec.strings.inv;
  return { recent: recent.map((r) => r.word), letters: letters.map((l) => ({ ch: l, lit: l === lit })), letter: lit,
    words: words.filter((w) => findLetter(w) === lit).map((w) => ({ word: w.word, kind: w.kind, row: fill(w.ids.length === 1 ? Sg.findRowOne : Sg.findRow, { word: w.word, kind: w.kindWord, n: w.ids.length }) })),
    first: ui.findSeen ? "" : Sg.findFirst, head: Sg.findHead, recentKeys: recent };
}

// ---- the reading room (the pod inventory's design, the read's design) ------------------------------------------------------------------------------------------------------------------
// The recommended index row: a goal glint, a glint, a seed, the first unread; never the sprout row while another is unread (the read's design focus.initial).
export function recommendedRow(st, p, settings = S.DEFAULT_SETTINGS) {
  if (!p || !p.idd) return -1;
  const fr = podFrame(p), chs = fr.chapters, goal = new Set(S.podGoalTraits(st, p)), unread = chs.map((c, i) => [c, i]).filter(([c]) => !p.read.includes(c.id) && (!c.sealed || settings.sealedOpen));
  const pick = unread.find(([c]) => S.glint(st, p, c.id) && c.traits.some((t) => goal.has(t.id))) ?? unread.find(([c]) => S.glint(st, p, c.id)) ?? unread[0];
  return pick ? pick[1] : 0;
}

// ---- the bottom line (frame.json bottomLine): left the verb of what has the ring (or its reason when held), middle the one need line, right where ← goes ---------------------------------------------
const back = (m, spec) => { const u = m.ui; if (u.choosing) return spec.strings.inv.foot.backRoom; return u.from === "create" ? spec.strings.inv.foot.backCreate : spec.strings.inv.foot.back; };
function lineOf(m, spec, view, focus, curCard) {
  const B = back(m, spec), Sg = spec.strings.inv;
  if (!m.st.tray.length) return { ok: null, back: B, subject: Sg.none.split(" · ")[0], need: "" };   // not a need: the quiet middle slot, fog with no dot (review round 2, G6)
  if (focus && focus.startsWith("act.")) { const i = +focus.slice(4), a = view.panel.acts[i], w = view.panel.feet?.[i] ?? a?.word; return a ? (a.dim ? { ok: null, back: B, subject: "", need: w } : { ok: w, back: B, subject: "", need: "" }) : { back: B }; }
  if (focus === "sort") return { ok: view.tools.sort, back: B, subject: "", need: "" };
  if (focus === "filter") return { ok: view.tools.filter, back: B, subject: "", need: "" };
  if (focus === "find") return { ok: view.tools.find, back: B, subject: "", need: "" };
  if (focus && focus.startsWith("chip.")) return { ok: "Remove " + (view.tools.chips[+focus.slice(5)] ?? ""), back: B, subject: "", need: "" };
  const take = m.ui.choosing ? Sg.buttons.bring : curCard && S.onBench(m.st, curCard.e.p) ? Sg.buttons.open : Sg.foot.take;
  return { ok: curCard ? take : null, back: B, subject: "", need: curCard && S.dryingSoon(m.st, curCard.e.p) ? freshOf(m.st, curCard.e.p, spec).words : "" };
}
// the rail of a pod: one tab a chapter (Create's, with its pips; Compare's is its own); `open` is the open tab (-1 for none)
export function railOf(m, spec, cur, chapters, req, open, focused, withPips = false) {
  if (!cur.idd || !chapters.length) return null;
  const { st, settings } = m;
  return { focused, open, star: req({ kind: "star", id: "star:12" }), tabs: chapters.map((c) => {
    const read = cur.read.includes(c.id), sealed = !!c.sealed && !settings.sealedOpen, n = Math.min(c.traits.length, maxTraits(spec.regions.chapter.page));
    return { id: c.id, word: railWord(c, spec), state: read ? "read" : sealed ? "sealed" : "unread", ...(withPips ? { pips: n, filled: read ? n : 0 } : {}), glint: S.glint(st, cur, c.id), emblem: req({ kind: "emblem", id: `emblem:${c.id}:${read ? "read" : sealed ? "sealed" : "unread"}:24`, chapter: c.id, state: read ? "read" : sealed ? "sealed" : "unread" }) };
  }) };
}
// ---- Compare (the pods design): two pods of one species side by side -------------------------------------------------------------------------------------
export const maxTraits = (page) => Math.max(...Object.keys(page.grid).map((k) => Number(k.split("-").at(-1))));
// Compare in the reading room's look (direction 2): the reading bench behind, two cream papers side by side (this pod on the left, its kin on the right), the open chapter's traits in rows on each,
// a trait read on both whose looks differ raised on a bone band with the word "differs"; each paper ends with "Take to the reading room". ▲▼ step the chapter on both; ▶ on the right-hand paper swaps its kin.
// Compare's one line (UI/UX 2026-10-30, four cases): A a trait of the open chapter differs; B something differs, but not here (the nearest chapter with a differs mark, the one after on a tie); C nothing read on both differs; D nothing read on both
export function compareLine(Ss, chs, ci, diffIn, A, B, spec) {
  if (diffIn.has(chs[ci].id)) return Ss.compareHere;
  if (diffIn.size) { let best = -1; chs.forEach((x, j) => { if (!diffIn.has(x.id)) return; const d = Math.abs(j - ci); if (best < 0 || d < Math.abs(best - ci) || (d === Math.abs(best - ci) && j > best)) best = j; }); return fill(Ss.compareIn, { chapter: headingWord(chs[best], spec) }); }
  return chs.some((x) => A.read.includes(x.id) && B.read.includes(x.id)) ? Ss.compareSame : Ss.compareNone;
}
export const compareKin = (st, a) => st.tray.filter((q) => q !== a && S.canCompare(st, a, q));
function compareView(view, m, spec, req) {
  const { st, ui, settings } = m, R = spec.regions.compare, Sg = spec.strings.compare, c = ui.cmp, A = S.podById(st, c.a), B = S.podById(st, c.b);
  const fr = A && podFrame(A); if (!A || !B || !fr) return { ...view, mode: "inventory", broken: true };
  const chs = fr.chapters, ci = clamp(c.ci, 0, chs.length - 1), ch = chs[ci], diff = S.compareDiff(st, A, B) || [], kin = compareKin(st, A), sid = S.speciesOf(A), want = st.wish[sid] || {};
  const diffIn = new Set(chs.filter((x) => x.traits.some((t) => diff.includes(t.id))).map((x) => x.id));   // the chapters that hold a trait read on both whose looks differ
  const tile = (t, look) => (t.id === "colour" || t.id === "markings") && look ? req({ kind: "traittile", id: `mibi:${sid}~${keyToken(`tile:${t.id}=${look}`)}:adult:36x36`, species: sid, trait: t.id, look, size: [36, 36], until: "the trait's crop" }) : "";
  const goalOf = (p) => {   // against the goal: "might give pale patches", "cannot give pale patches", or the chapter that would say
    for (const x of chs) for (const t of x.traits) { const look = want[t.id]; if (!look) continue;
      if (!p.read.includes(x.id)) return fill(Sg.goalUnread, { chapter: headingWord(x, spec), look });
      return traitState(fr, t, p.genome).carried.includes(look) ? fill(Sg.goal, { look }) : fill(Sg.goalNot, { look }); }
    return "";
  };
  const side = (p, left) => {
    const other = left ? B : A, read = p.read.includes(ch.id), sealed = !!ch.sealed && !settings.sealedOpen && !read, both = read && other.read.includes(ch.id);
    const rows = sealed ? [] : ch.traits.slice(0, R.rows.max).map((t) => { if (!read) return { name: t.name, look: Sg.notRead, picture: "", differs: false };
      const s = traitState(fr, t, p.genome); return { name: t.name, look: s.line ?? s.shows ?? "", picture: s.doing ? "" : tile(t, s.shows), differs: both && diff.includes(t.id) }; });
    return { pod: podPic(req, st, p, [40, 48]), title: S.cap(S.spName(p)), which: left ? (c.from === "room" ? Sg.onBench : Sg.thisPod) : kin.length > 1 ? Sg.kinMore : Sg.kin,
      rail: miniRailProps(req, st, p, settings, { hand: ci, diffIn, nudge: c.nudge ? c.nudge.dir : 0 }), goal: goalOf(p), chapter: headingWord(ch, spec), count: fill(Sg.chapter, { n: ci + 1, of: chs.length }),   // the rail replaces the worth line (UI/UX 2026-10-30)
      rows, sealed: sealed ? Sg.sealed : "", differs: Sg.differs, take: Sg.take };
  };
  view.compare = { bench: req({ kind: "slot", id: spec.regions.compare.bench.id, master: spec.regions.compare.bench.id, size: spec.regions.compare.bench.rect.slice(2), until: "the reading bench (pass 142)" }), sides: [side(A, true), side(B, false)] };
  const focus = m.focus === "takeB" ? "takeB" : "takeA";
  view.line = { ok: fill(Sg.takeOk, { Species: S.cap(S.spName(focus === "takeB" ? B : A)) }), back: c.from === "room" ? spec.strings.room.foot.backBench : spec.strings.room.foot.backPods,   // ← goes back to what opened it: the bench's kin or the inventory's card
    subject: compareLine(spec.strings, chs, ci, diffIn, A, B, spec), need: "" };   // the foot's subject slot, not a need (UI/UX 2026-10-30)
  view.targets = [{ id: "takeA", group: "takeA" }, { id: "takeB", group: "takeB" }];
  view.cur = A.id;
  return view;
}

// ---- the props message body ----
// The view as the face takes it: { mode, cur, empty, props: { state, regions, focus }, line, requests }. The shape is documented in pods.props.json.
export function podsProps(m, spec, frame) {
  const v = podsBuild({ ...m, frameSpec: frame }, spec), regions = {};
  if (v.mode === "compare") regions.compare = v.compare;
  else if (v.mode === "read") regions.read = v.read;
  else {
    regions.inv = { tools: v.tools, cabinet: v.cabinet, rail: v.rail, panel: v.panel };
    if (m.ui.view === "filter") regions.tray = { rows: trayOf(m, spec) };
    if (m.ui.view === "find") regions.find = findOf(m, spec);
  }
  const state = v.mode === "inventory" ? (m.ui.view === "filter" || m.ui.view === "find" ? m.ui.view : "inventory") : v.mode;
  let targets = v.targets, resolve = v.resolve ?? {};
  if (state === "filter") { const rows = regions.tray.rows; targets = rows.flatMap((r, ri) => r.chips.map((c, ci) => ({ id: `tchip.${ri}.${ci}`, group: "tchip", index: ri * 10 + ci, enabled: !c.dim }))); resolve = trayResolve(rows, m.focus); }
  if (state === "find") { const f = regions.find; targets = [...f.recent.map((_, i) => ({ id: "recent." + i, group: "recent", index: i })), ...f.letters.map((_, i) => ({ id: "letter." + i, group: "letter", index: i })), ...f.words.slice(0, 16).map((_, i) => ({ id: "word." + i, group: "word", index: i }))]; resolve = findResolve(f, m.focus); }
  if (state === "find") { const f = regions.find, w = /^word\.(\d+)$/.exec(m.focus ?? ""), r = /^recent\.(\d+)$/.exec(m.focus ?? ""), word = w ? f.words[+w[1]]?.word : r ? f.recent[+r[1]] : null; v.line = { ...v.line, ok: word ? fill(spec.strings.inv.filterBy, { word }) : null, need: "", subject: "" }; }   // Find's foot: what ✓ does on the word (review round 2)
  const cur = v.mode === "compare" ? (m.focus === "takeB" ? "takeB" : "takeA") : m.focus ?? null;
  return { mode: state, cur: v.cur ?? null, empty: v.empty, broken: !!v.broken, first: v.first ?? 0, panelPod: v.panelPod ?? null, props: { state, regions, focus: { cur, targets, resolve } }, line: v.line, requests: v.requests, list: v.list ? v.list.map((e) => e.p.id) : null, cards: v.cards ? v.cards.map((c) => c.e.p.id) : null };
}
function trayResolve(rows, focus) {
  const at = /^tchip\.(\d+)\.(\d+)$/.exec(focus ?? ""), r = {}; if (!at) return r; const ri = +at[1], ci = +at[2];
  const id = (a, b) => (rows[a] && rows[a].chips.length ? `tchip.${a}.${clamp(b, 0, rows[a].chips.length - 1)}` : null);
  const upRow = (() => { for (let a = ri - 1; a >= 0; a--) if (rows[a].chips.length) return a; return null; })(), downRow = (() => { for (let a = ri + 1; a < rows.length; a++) if (rows[a].chips.length) return a; return null; })();
  r["tchip.left"] = ci > 0 ? `tchip.${ri}.${ci - 1}` : focus; r["tchip.right"] = ci < rows[ri].chips.length - 1 ? `tchip.${ri}.${ci + 1}` : focus;
  r["tchip.up"] = upRow != null ? id(upRow, ci) : focus; r["tchip.down"] = downRow != null ? id(downRow, ci) : focus;
  return r;
}
function findResolve(f, focus) {
  const li = Math.max(0, f.letters.findIndex((l) => l.lit)), r = { "letter.cur": f.letters.length ? "letter." + li : null, "recent.first": f.recent.length ? "recent.0" : null, "word.first": f.words.length ? "word.0" : null };
  const w = /^word\.(\d+)$/.exec(focus ?? ""), n = Math.min(16, f.words.length);
  if (w) { const i = +w[1], rows = 8; const col = Math.floor(i / rows), row = i % rows;
    r["word.up"] = row > 0 ? "word." + (i - 1) : "letter." + li; r["word.down"] = row < rows - 1 && i + 1 < n ? "word." + (i + 1) : focus;
    r["word.left"] = col > 0 ? "word." + (i - rows) : focus; r["word.right"] = col === 0 && i + rows < n ? "word." + (i + rows) : focus; }
  return r;
}
