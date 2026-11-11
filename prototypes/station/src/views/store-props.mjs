// The store screen's props (store.json; the pods-reading scheme §2 and §3): pure selectors from the state and the screen's UI to the props of the face's store words (screens/store.c). Props name *what*, never where:
// the pod's words, the Data store's parts (one a chapter, with its state), the reading line, the Put-in panel's words, the teaser's words, the chapter page's rows, promises and key, and the focus targets by id.
// The output is plain JSON { props (state, regions, focus), line (the bottom line, for the frame), requests }; null when no identified pod is on the bench.
//   m: { st, settings, ui (UI.store: { view: bench | teaser | chapter, amount, f, i (the bar's chapter), chapter (the page's), show (chapter ids still to show), teaser: { chapters: [{ id, firsts }] } }), docked }
import * as S from "../state.mjs";
import { frameOf, traitState, traitKind } from "../genome.mjs";
import { fill, capLine } from "./words.mjs";
import { req as reqOf, slot as slotOf } from "./requests.mjs";
import { rollId } from "./create-props.mjs";

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const KIND_MARK = { only: "one", hides: "both", blend: "mix", asleep: "both" };
// A look that shows together with another is written as a pair of looks with a comma (genome.mjs LINE_LOOKS.pairSep): the other is the rest of the pair. null for any other look. Never "one" or "both".
const togetherOther = (s) => { const i = String(s.shows ?? "").indexOf(", "); return i > 0 ? String(s.shows).slice(i + 2) : null; };
// The signed chips (40 x 50) of the promise cards, by the hidden look they name.
const CHIPS = { "leaf crest": "chip-crown-leaf-crest-40x50", "pale patches": "chip-markings-pale-patches-40x50" };
const NAMES =(list, Sg) => list.length <= 1 ? list.join("") : list.slice(0, -1).join(Sg.or) + Sg.and + list[list.length - 1];

// What the Put-in panel can take now: never more than the pocket, never more than is left to read.
export const putMax = (st, p, settings) => Math.min(st.d | 0, S.storeLeft(st, p, settings));
// The chapters the store's bar shows: every chapter that is open (or read), in book order, each with its price (a read one: its traits).
export function storeParts(st, p, settings) {
  const fr = frameOf(S.speciesOf(p)), queue = new Map(S.readQueue(st, p, settings).map((c) => [c.id, c.cost]));
  return fr.chapters.filter((c) => p.read.includes(c.id) || queue.has(c.id)).map((c) => ({ id: c.id, name: c.name, read: p.read.includes(c.id), price: p.read.includes(c.id) ? c.traits.length : queue.get(c.id) }));
}

export function storeBuild(m, spec) {
  const { st, settings } = m, ui = m.ui ?? {}, Sg = spec.strings, p = S.benchPod(st); if (!p || !p.idd) return null;
  const requests = [], req = reqOf(requests), slot = slotOf(req, "the pod's painting and its chapters' close-ups (the art director's crops)"), sid = S.speciesOf(p), fr = frameOf(sid);
  const view = ["bench", "teaser", "chapter"].includes(ui.view) ? ui.view : "bench", Species = S.cap(S.spName(p));
  const regions = { pod: { art: slot("store-pod-200x200", [200, 200]), name: capLine(fill(Sg.podNoun, { Species })), why: typeof p.why === "string" ? p.why : "", fresh: Sg.fresh } };
  let targets = [], cur = "", line = { ok: null, subject: "", back: Sg.back, need: null };
  if (view !== "chapter") {
    const parts = storeParts(st, p, settings), left = S.storeLeft(st, p, settings), max = putMax(st, p, settings), d = p.store ? p.store.d | 0 : 0;
    const amount = view === "bench" && left > 0 ? (max > 0 ? clamp(ui.amount ?? max, 1, max) : 0) : 0, next = parts.find((c) => !c.read) ?? null;
    let acc = 0; const list = parts.map((c, k) => {
      if (c.read) return { id: c.id, name: c.name, price: c.price, state: "read" };
      const before = acc; acc += c.price; const state = acc <= d ? "waiting" : amount > 0 && d + amount > before ? "adding" : "empty";
      return { id: c.id, name: c.name, price: c.price, state, _end: acc, _k: k };
    });
    const waiting = list.filter((c) => c.state === "waiting").map((c) => c.name);
    const head = waiting.length ? fill(Sg.head, { d, names: NAMES(waiting, Sg) }) : d > 0 ? fill(Sg.headNone, { d }) : next ? fill(Sg.headEmpty, { chapter: next.name, n: next.price }) : Sg.headDone;
    const cursor = clamp(ui.i ?? list.findIndex((c) => c.state !== "read"), 0, list.length - 1);
    regions.store = { label: Sg.label, head, parts: list.map(({ _end, _k, ...c }, k) => (view === "bench" && k === cursor ? { ...c, cur: true } : c)) };
    if (view === "bench") {
      const need = S.readNeedMs(settings), min = Math.max(1, Math.round((need - ((p.store && p.store.ms) || 0)) / 60000));
      regions.reading = { line: !next ? Sg.reading.done : d >= next.price ? fill(need < 60000 ? Sg.reading.nextShort : Sg.reading.next, { chapter: next.name, n: min }) : fill(Sg.reading.waits, { chapter: next.name, n: next.price - d }), sub: next ? Sg.reading.sub : "" };
      if (left > 0) {
        const reach = list.find((c) => c.state === "adding"), fills = reach ? fill(reach._end <= d + amount ? Sg.put.fills : Sg.put.reaches, { chapter: reach.name }) : "";
        regions.put = { head: fill(Sg.put.head, { have: st.d | 0 }), amount, fills, more: amount > 0 && left - amount > 0 ? fill(Sg.put.more, { n: left - amount }) : amount > 0 ? Sg.put.rest : "", cap: amount > 0 ? fill(Sg.put.cap, { max }) : Sg.put.none, less: amount > 1, greater: amount < max };
      }
      targets = [...(regions.put ? [{ id: "put", group: "put" }] : []), { id: "bar", group: "bar" }];
      cur = targets.some((t) => t.id === ui.f) ? ui.f : targets[0].id;
      const under = list[cursor];
      line = cur === "put" && amount > 0 ? { ok: Sg.putIn, price: "◆ " + amount, subject: Sg.moreLess, back: Sg.back, need: null }
        : cur === "bar" && under && under.state === "read" ? { ok: fill(Sg.open, { chapter: under.name }), subject: "", back: Sg.back, need: null } : { ok: null, subject: cur === "put" ? Sg.moreLess : "", back: Sg.back, need: null };
    } else {   // the teaser: what was read while the Companion was out, counted and not named
      const done = (ui.teaser?.chapters ?? []), names = done.map((c) => fr.chapters.find((x) => x.id === c.id)?.name).filter(Boolean), firsts = done.reduce((a, c) => a + (c.firsts | 0), 0);
      regions.teaser = { eyebrow: Sg.teaser.eyebrow, names: names.join(Sg.teaser.join), firsts: firsts === 0 ? Sg.teaser.none : firsts === 1 ? Sg.teaser.firstsOne : fill(Sg.teaser.firsts, { n: firsts }) };
      targets = [{ id: "go", group: "go" }]; cur = "go";
      line = { ok: fill(Sg.open, { chapter: names[0] ?? "" }), subject: "", back: Sg.skip, need: null };
    }
  } else {
    const ch = fr.chapters.find((c) => c.id === ui.chapter) ?? fr.chapters.find((c) => p.read.includes(c.id)), k = Math.max(0, fr.chapters.indexOf(ch));
    const rows = ch.traits.map((t) => { const s = traitState(fr, t, p.genome), doing = !!s.doing, other = doing ? null : togetherOther(s), mark = doing ? "" : other ? "together" : KIND_MARK[traitKind(fr, t)] ?? "both";
      return { trait: t.name, look: capLine(String(s.shows ?? "")), pic: slot(`store-${rollId(sid, t.name, doing ? null : s.shows)}`, [128, 72]), mark, line: doing ? Sg.chapter.doing : other ? fill(Sg.chapter.pass.together, { other }) : Sg.chapter.pass[mark], first: !!(p.first && p.first.includes(t.id)) }; });   // RARE waits for the game designer's cut: nothing here draws it
    const promises = ch.traits.map((t) => ({ s: traitState(fr, t, p.genome), kind: traitKind(fr, t) })).filter(({ s, kind }) => s.kind === "hides" && kind === "hides" && s.hides != null && !s.doing && !togetherOther(s)).slice(0, 4)   // only a hidden look makes a promise: a blend, and a look that shows together, make none (their marks say so)
      .map(({ s }) => ({ line: fill(Sg.chapter.hides, { look: s.hides }), strong: Sg.chapter.could, ...(CHIPS[s.hides] ? { pic: slot(CHIPS[s.hides], [40, 50]) } : {}) }));   // a chip only where a signed one names that look; every other card stays text
    const firstsHere = rows.filter((r) => r.first).length;
    regions.chapter = { first: Sg.chapter.first, closeup: slot(`read-closeup-${ch.id}`, [252, 252]), eyebrow: fill(Sg.chapter.eyebrow, { Species, i: k + 1, n: fr.chapters.length }), name: ch.name,
      sub: firstsHere ? fill(Sg.chapter.sub, { k: firstsHere, m: rows.length }) : Sg.chapter.subNone, rows, promises, key: ["one", "both", "mix", "together"].map((mark) => ({ mark, text: Sg.chapter.pass[mark === "together" ? "togetherKey" : mark] })) };
    const more = (ui.show ?? []).length > 0;
    line = { ok: more ? Sg.next : null, subject: "", back: Sg.skip, need: null };
  }
  return { props: { state: view, regions, focus: { cur, targets } }, line, requests };
}
