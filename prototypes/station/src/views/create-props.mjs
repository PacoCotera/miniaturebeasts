// The Create props (lvgl-switch.md §2.1, §4 R; create.json; specs/station-create-bench-spec.md): pure selectors from the state, the screen's UI state and the presentation to the props of the face's Create words. Props name *what*, never *where*: states, counts,
// asset ids, strings, flags, which drum is turned to which face and which drums the bank shows; no rectangle, no measure, no layout rule, no colour (the words place everything from create.json). The output is plain JSON:
// { props (state, regions, focus), line (the bottom line, for the frame), requests (the pictures the host makes ready before the props) }.
// Runs in Node, tested there (tests/create-props.test.mjs); the shape is create.props.json.
//   m: { st, settings, ui: { create: { podId, choices, order, f, first, clash, grown } } }, spec create.json, pods pods.json
//   ui.create.grown is what ✓ Grow it made (intents/create.mjs): { code, cost }; it holds the screen in its grow state while the pod, no longer in the rack, travels.
//   ui.create.f is the focused drum (an index into the bank's drums, every trait of the frame in chapter order); ui.create.first the first drum the bank shows, which the host keeps from the props (host.mjs createBody).
import * as S from "../state.mjs";
import { plateReq, kPct } from "../stamplook.mjs";
import { warnWords } from "./goal-words.mjs";
import { frameOf, traitState, genomeDigest, stampSizing, codeText } from "../genome.mjs";
import { treatmentOf, drawnDigest, builtOf } from "../art.mjs";

const fill = (t, o) => t.replace(/\{([^}]+)\}/g, (_, k) => (k in o ? o[k] : "{" + k + "}"));
const ONES = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"], TENS = ["", "", "twenty", "thirty", "forty"];
// A count in words (no digits where a word does): "and three more"; a species carries at most 27 traits.
export const inWords = (n) => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : ""));
const slug = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const chapterWord = (c, pods) => (c.id === "legs-tail" ? pods.strings.legsTail.rail : c.name);
const listWords = (ws) => (ws.length > 1 ? ws.slice(0, -1).join(", ") + " and " + ws.at(-1) : ws[0] ?? "");

// The drums of the bank: every trait of the species in chapter order (the frame's trait order), each with its chapter's place.
export const drumsOf = (frame) => frame.chapters.flatMap((c, ci) => c.traits.map((t) => ({ c, ci, t })));
// The first drum the ring starts on: the first that is not capped (its chapter read); with nothing read, the first drum.
export const firstDrum = (p, frame) => { const i = drumsOf(frame).findIndex((d) => p.read.includes(d.c.id)); return i < 0 ? 0 : i; };
// The pod Create is on: held by id; while it grows, the one ✓ Grow it made (the rack no longer holds it), else the rack's.
export const createPod = (st, cr) => cr.grown?.pod ?? st.tray.find((q) => q.id === cr.podId) ?? null;
// The founder's picture id for the choices made (the picture the dither starts from and ends on): founder:<species>:<drawn digest>:<clear|ghost|veil-<groups>>:<w>x<h>. The drawn digest is the genome as drawn (Glow's emission and
// Charge's phase are not the mibi's own while unread); the treatment is art.mjs's treatmentOf on the chapters read: nothing read the ghost, an unread look a veil over its groups (body, coat, face, leg, tail), only doings unread clear.
export function founderPicture(p, choices, size) {
  const fr = frameOf(S.speciesOf(p)), g = S.founderGenome(p, choices), b = builtOf(fr, g, p.read), t = treatmentOf(fr, p.read, !b.error && b.validation.status === "valid" ? b.scene : null);
  return { id: `founder:${S.speciesOf(p)}:${drawnDigest(fr, g, p.read)}:${t.mode === "veil" ? "veil-" + t.groups.join("+") : t.mode}:${size.join("x")}`, read: [...p.read], mode: t.mode };
}

// ---- the bank's span (spec §3): which drums show, and where the tray slides ----
// B: create.json regions.bank. chapters: the chapter index of each drum. A drum at index i, with the first shown at `first`, stands at x = left + (i − first) · pitch + (chapters[i] − chapters[first]) · chapterGap, wholly inside the span
// minus a more mark on a side with hidden drums (the left mark exactly when first > 0). Returns { first, last, moreLeft, moreRight, left }; last is the last whole drum shown.
export function bankView(B, chapters, first) {
  const [w0, w1] = B.span, D = B.drum, mark = B.more.size[0], n = chapters.length, f = clamp(first, 0, Math.max(0, n - 1));
  const left = w0 + (f > 0 ? mark : 0), x = (i) => left + (i - f) * D.pitch + (chapters[i] - chapters[f]) * D.chapterGap;
  let right = w1, last = f;
  for (let pass = 0; pass < 2; pass++) { last = f; while (last + 1 < n && x(last + 1) + D.size[0] <= right) last++; if (last + 1 < n && right === w1) right = w1 - mark; else break; }
  return { first: f, last, moreLeft: f > 0, moreRight: last + 1 < n, left };
}
// The tray after the ring lands on drum `focus`: unchanged while the drum is wholly shown, else a cut that aligns the drum's chapter at the left of the drum area when its whole group fits, else makes the drum the last whole drum shown.
export function bankSlide(B, chapters, first, focus) {
  const n = chapters.length; if (!n) return bankView(B, chapters, 0);
  const v = bankView(B, chapters, first), f = clamp(focus, 0, n - 1);
  if (f >= v.first && f <= v.last) return v;
  const start = chapters.indexOf(chapters[f]), end = chapters.lastIndexOf(chapters[f]), D = B.drum, room = B.span[1] - B.span[0] - 2 * B.more.size[0];
  if ((end - start + 1) * D.pitch - (D.pitch - D.size[0]) <= room) return bankView(B, chapters, start);
  let g = f; while (g > 0 && bankView(B, chapters, g - 1).last >= f) g--;
  return bankView(B, chapters, g);
}

export function createBuild(m, spec, pods) {
  const { st, settings } = m, cr = m.ui.create, requests = [], req = (r) => { requests.push(r); return r.id; };
  const p = createPod(st, cr), fr = frameOf(S.speciesOf(p)), sp = S.speciesOf(p), R = spec.regions, SL = R.slip, Sg = spec.strings, ST = Sg.slip, drums = drumsOf(fr), changed = S.changedTraits(cr.choices), grown = !!cr.grown;
  const nRead = fr.chapters.filter((c) => p.read.includes(c.id)).length, state = grown ? "grow" : nRead ? "shape" : "nothingRead";
  // the gene bench's art (T-20261016-41) is a PH plate (stone, mist edge) until each master is placed
  const art = (id, size) => req({ kind: "ph", id, size, hollow: false, until: "the gene bench art (T-20261016-41)" });
  const f = clamp(cr.f ?? firstDrum(p, fr), 0, Math.max(0, drums.length - 1)), cur = drums[f] ?? null, genome = S.founderGenome(p, cr.choices);
  const regions = {}, traitName = (id) => drums.find((d) => d.t.id === id)?.t.name ?? id;

  // the bench, the well, the line and the dish
  regions.bench = { room: [art("create-bench", R.bench.rect.slice(2))] };
  regions.well = { picture: art("create-well", R.well.rect.slice(2)) };
  regions.geneLine = { picture: art("create-gene-line", R.geneLine.rect.slice(2)) };
  regions.dish = { picture: art("create-dish", R.dish.rect.slice(2)) };

  // the pod in its well: open in shape, closed from Grow 300 (the closed shell is the art's)
  const box = R.pod.rect.slice(2);
  regions.pod = { picture: req({ kind: "pod", id: `pod:${sp}:i:${box.join("x")}`, species: sp, state: "identified", size: box }), closed: art(`create-pod-closed-${sp}-${box.join("x")}`, box) };
  regions.name = S.cap(S.spName(p));
  regions.found = S.podOriginLines(p);

  // the founder: the whole-picture dither as it was (the per-look layers are the art's, T-20261016-41)
  const fp = founderPicture(p, cr.choices, R.founder.rect.slice(2));
  regions.founder = { picture: req({ kind: "founder", id: fp.id, pod: p.id, choices: cr.choices, species: sp, read: fp.read, size: R.founder.rect.slice(2) }) };

  // the bank: a drum a trait, in chapter order, grouped by chapter; the bank shows a window of them (bankView)
  const view = bankSlide(R.bank, drums.map((d) => d.ci), cr.first ?? 0, f);
  const stateOf = (d) => {
    if (!p.read.includes(d.c.id)) return { state: "capped", faces: 1, face: 0 };
    if (d.t.nature === "doing") return { state: "pinned", faces: 1, face: 0 };
    const opts = S.rollOptions(p, d.t.id), face = cr.choices[d.t.id] || 0;
    if (cr.clash.includes(d.t.id)) return { state: "clash", faces: Math.max(1, opts.length), face };
    if (opts.length <= 1) return { state: "oneFace", faces: 1, face: 0 };
    return { state: face ? "changed" : "rest", faces: opts.length, face };
  };
  const lookOf = (d) => traitState(fr, d.t, genome), W = R.bank.drum.glass.slice(2);
  regions.bank = {
    first: view.first, last: view.last, moreLeft: view.moreLeft, moreRight: view.moreRight, locked: grown, cross: "icon:cross:16",
    more: { left: art("create-bank-more-left", R.bank.more.size), right: art("create-bank-more-right", R.bank.more.size) },
    pictures: { rest: art("create-drum-rest", R.bank.drum.size), pinned: art("create-drum-pinned", R.bank.drum.size), capped: art("create-drum-capped", R.bank.drum.size), clash: art("create-drum-clash", R.bank.drum.size), notch: art("create-drum-notch", R.bank.drum.notch.size), up: art("create-drum-turn-up", R.bank.drum.turn.up.size), down: art("create-drum-turn-down", R.bank.drum.turn.down.size) },
    drums: drums.map((d, i) => {
      const s = stateOf(d), shown = i >= view.first && i <= view.last;
      const closeUp = shown && s.state !== "capped" ? art(d.t.nature === "doing" ? `look-${sp}-${slug(d.t.name)}-${W.join("x")}` : `look-${sp}-${slug(d.t.name)}-${slug(lookOf(d).shows)}-${W.join("x")}`, W) : "";
      return { chapter: d.c.id, group: d.ci, trait: d.t.id, name: d.t.name, ...s, closeUp, word: chapterWord(d.c, pods), lead: i === 0 || drums[i - 1].ci !== d.ci };
    }),
  };

  // the slip: Your changes (newest first, at most four, then "and n more"), a clash line, Still a surprise
  const newest = (cr.order ?? Object.keys(cr.choices)).filter((id) => changed.includes(id)).reverse();
  const lines = newest.slice(0, SL.maxChanges).map((id) => fill(ST.trait, { Trait: traitName(id), look: lookOf(drums.find((x) => x.t.id === id)).shows }));
  const clashNames = cr.clash.map(traitName), unread = fr.chapters.filter((c) => !p.read.includes(c.id));
  regions.slip = {
    picture: art("slip-208x296", SL.rect.slice(2)), heading: ST.changes, lines, more: newest.length > SL.maxChanges ? fill(ST.more, { "n in words": inWords(newest.length - SL.maxChanges) }) : "",
    none: lines.length ? "" : nRead ? ST.none : ST.noneUnread, clash: clashNames.length ? fill(clashNames.length > 1 ? ST.clash : ST.clashOne, { names: listWords(clashNames) }) : "",
    surprise: unread.length ? { heading: ST.surprise, words: unread.map((c) => chapterWord(c, pods)).join(", ") } : null, printed: grown,
  };

  // the stamp of the read and changed chapters, and the code (printed at Grow on the slip)
  const readIds = [...new Set([...p.read, ...fr.chapters.filter((c) => c.traits.some((t) => changed.includes(t.id))).map((c) => c.id)])], sz = stampSizing(fr, genome), k = spec.colours.stampLabel.k;
  regions.stamp = { size: sz.size, N: sz.N, cell: sz.cell, plate: plateReq(req, k), asset: req({ kind: "stamp", id: `stamp:${genomeDigest(genome)}:${[...readIds].sort().join(",")}:${sz.size}:k${kPct(k)}`, pod: p.id, species: sp, read: readIds, size: sz.size, choices: cr.choices, k }) };
  regions.code = grown ? codeText(cr.grown.code) : "";
  regions.toIncubator = Sg.toIncubator;

  // the bottom line: ✓ Grow it and the price (no ⧗ n, owner ruling 3), the focused drum's line, the first block (the rules' order, growBlockKey) with its notice; ← the pod
  const cost = grown ? cr.grown.cost : S.growCost(st, cr.choices, settings), key = grown ? null : S.growBlockKey(st, p, cr.choices, settings, cr.clash), name = S.spName(p);
  const subject = !cur ? Sg.drum.none : state === "nothingRead" ? Sg.drum.none : drumLine(cur, stateOf(cur), lookOf(cur), Sg.drum, clashNames);
  const bottom = grown ? { ok: null, price: null, back: null, subject: Sg.growing, need: "" } : { ok: Sg.action, price: S.priceText(cost.e, cost.d, cost.s), back: S.cap(name), subject, need: "" };
  if (!grown && key && key.key === "short") { bottom.dim = true; bottom.short = key.short; bottom.need = fill(Sg.notices.shortFrom[key.from], { icons: key.short }); }   // short: the dimmed ✓, the short figures amber
  else if (!grown && key) { bottom.blocked = true; bottom.need = key.key === "busy" ? Sg.notices.busy : key.key === "noBay" ? Sg.notices.noBay : key.key === "clash" ? Sg.notices.clash : ""; }   // busy, no bay, clash: no ✓ cap, the verb and the price in mist
  if (!key && !grown && m.frame) bottom.need = warnWords(st, m.sv, settings, m.frame, cost, { key: "grow", pod: p }) || "";   // ✓ would leave the goal's next price short: one amber line, nothing asked
  const props = { state, regions, focus: { cur: grown || !drums.length ? "room" : `drum.${f}`, targets: grown ? [] : drums.map((_, i) => ({ id: `drum.${i}`, group: "drum" })) } };
  return { props, line: bottom, requests };
}

// The context line for a focused drum (spec §4): "{Trait}: {look}", or as the drum's state says.
function drumLine(d, s, ls, D, clashNames) {
  const Trait = d.t.name;
  if (s.state === "capped") return fill(D.capped, { Trait });
  if (s.state === "pinned") return fill(D.doing, { Trait });
  if (s.state === "clash") return fill(clashNames.length > 1 ? D.clash : D.clashOne, { names: listWords(clashNames) });
  if (s.state === "oneFace") return fill(D.oneLook, { Trait });
  if (ls.kind === "asleep") return fill(D.asleep, { Trait, shows: ls.shows, sleeping: ls.asleep });
  return fill(D.only, { Trait, look: ls.shows });
}
