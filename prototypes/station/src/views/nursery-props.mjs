// The nursery and a pod's page as props (station step 5; the accepted walk-4 pictures 9a, 9b and 10). Pure selectors from the save and the Pods UI to the props of the face's `page` state (pods.json regions.page.nursery and
// regions.page.podpage): the stage as ONE picture (nursery-pictures.mjs) and the words over it (`page.scale.texts`, the list her chapters use), placed from the spec. Props name what is drawn, never where the face draws it.
//   ui.pods: view "nursery" | "pod"; ring { z: "caps" | "shelf", i }; order ("newest" | "parents"); first (the first row on screen); podKey (the row a pod's page is opened on); act ("grow" | "letgo"); askGo; from (the screen the nursery was entered from)
import * as S from "../state.mjs";
import * as N from "../nursery.mjs";
import { frameOf } from "../genome.mjs";
import { faceOf } from "./page-props.mjs";
import { fill } from "./words.mjs";

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(16).padStart(8, "0"); };
const podId = (req, sp) => req({ kind: "pod", id: `pod:${sp}:s:144x176`, species: sp, state: "sealed", size: [144, 176] });
const placeOf = (g) => S.PLACE_WORD[g] ?? "wild";
export const words = (ws) => ws.map((w) => w.word).join(", ");

// where the ring stands: on the shelf's first row when there is a shelf, else on the first capsule; kept inside what exists
export function ringOf(st, ui, rows) {
  const r = ui.ring ?? { z: rows.length ? "shelf" : "caps", i: 0 };
  if (r.z === "shelf" && !rows.length) return { z: "caps", i: 0 };
  return r.z === "shelf" ? { z: "shelf", i: clamp(r.i, 0, rows.length - 1) } : { z: "caps", i: clamp(r.i, 0, S.CAPSULES - 1) };
}
// the first row on screen, moved only as far as keeps the ring's row in view
export const firstFor = (ring, first, visible, n) => (ring.z !== "shelf" ? clamp(first ?? 0, 0, Math.max(0, n - visible)) : clamp(first ?? 0, Math.max(0, ring.i - visible + 1), Math.min(ring.i, Math.max(0, n - visible))));
// what ✓ does under the ring: "look" (a shelf row opens its pod), "hatch" (a ready capsule), "" (nothing)
export function okOf(st, ring, caps) { return ring.z === "shelf" ? "look" : caps[ring.i]?.state === "ready" ? "hatch" : ""; }

function rowGeometry(req, spec, Z, row, k, first, ring, fr) {
  const Sh = Z.shelf, y = Sh.top + (k - first) * Sh.pitch, P = Sh.pods, n = Math.min(P.max, row.count), pods = [];
  for (let j = 0; j < n; j++) pods.push({ id: podId(req, row.species), x: P.x + j * P.pitch, w: P.w, foot: y + P.foot });
  const faces = row.parents.map((q, j) => { const m = S.mibiById(fr.st, q.id); return m ? { id: faceOf(S.speciesOf(m), m, frameOf(S.speciesOf(m))), x: Sh.faces.x + j * (Sh.faces.d + Sh.faces.gap), y: y + 4, d: Sh.faces.d } : null; }).filter(Boolean);
  return { x: Sh.x, y, w: Sh.w, h: Sh.h, radius: Sh.radius, ringBorder: Sh.ring.border, ring: ring.z === "shelf" && ring.i === k, wood: [Sh.wood.x, y + Sh.wood.y, Sh.wood.w], pods, faces, tag: row.isNew ? [Sh.tag.right - Sh.tag.w, y + Sh.tag.dy, Sh.tag.w, Sh.tag.h] : null };
}

// The nursery. view: the pods view being built; m: { st, settings, ui, now, frameSpec }; spec: pods.json; req: the request collector.
export function nurseryView(view, m, spec, req) {
  const { st, settings, ui } = m, now = m.now || Date.now(), Z = spec.regions.page.nursery, Sg = spec.strings.nursery, texts = [], order = ui.order ?? "newest";
  const rows = N.shelfRows(st, order), caps = N.capsulesOf(st, settings, now), sum = N.summary(st, settings, now), ring = ringOf(st, ui, rows), first = firstFor(ring, ui.first, Z.shelf.visible, rows.length);
  const text = (tx, x, base, role, align, w) => { if (tx) texts.push({ text: tx, x: Math.round(x), ...(w ? { w } : {}), base: Math.round(base), role, align }); };
  const from = ui.from && m.frameSpec?.strings?.titles?.[ui.from === "home" ? "vivarium" : ui.from] ? m.frameSpec.strings.titles[ui.from === "home" ? "vivarium" : ui.from] : Sg.crumbHome;
  text(Sg.title, Z.title.x, Z.title.baseline, Z.title.role, "l");
  text(fill(Sg.sub, { from }), Z.crumb.x, Z.crumb.baseline, Z.crumb.role, "l");   // where she is and how she came: ← goes back the way she came
  // the pill: what is on the shelf and what grows
  const parts = [st.tray.length === 1 ? Sg.podsOne : st.tray.length ? fill(Sg.pods, { n: st.tray.length }) : Sg.podsNone]; if (sum.growing) parts.push(fill(Sg.growing, { n: sum.growing })); if (sum.ready) parts.push(fill(Sg.ready, { n: sum.ready }));
  const pillText = parts.join(" · "), pw = Math.round(pillText.length * Z.chars.M18) + 2 * Z.chars.padX, pill = [Z.pill.rect[0] + Z.pill.rect[2] - pw, Z.pill.rect[1], pw, Z.pill.rect[3], Z.pill.radius];
  text(pillText, pill[0], Z.pill.baseline, Z.pill.role, "c", pw);
  // the capsules and their three states: ready to hatch, growing with its time left, a young waiting
  const C = Z.capsules, capPics = caps.map((c, i) => {
    const x = C.xs[i], on = ring.z === "caps" && ring.i === i, spPod = c.species ? podId(req, c.species) : null;
    const word = c.state === "ready" ? Sg.readyToHatch : c.state === "growing" ? fill(Sg.minLeft, { n: Math.max(1, c.left) }) : c.state === "young" ? S.cap(S.mibiById(st, c.mibi)?.name ?? "") + " " + Sg.waits : Sg.free;
    const bw = Math.max(C.badge.minW, Math.round(word.length * (c.state === "ready" ? Z.chars.M18 : Z.chars.R15)) + 2 * C.badge.padX), bx = x + Math.round((C.w - bw) / 2), by = C.y + C.badge.dy;
    text(word, bx, by + C.badge.baseline, c.state === "ready" ? C.badge.readyRole : C.badge.role, "c", bw);
    return { x, y: C.y, w: C.w, h: C.h, layers: C.layers, state: c.state, progress: Math.round(c.progress * 1000) / 1000, bar: [C.bar.x0, C.bar.x1], pod: spPod && c.state !== "young" ? { id: spPod, w: C.pod.w, cx: C.pod.cx, foot: C.pod.foot } : null,
      ring: on ? [x - C.ring.pad, C.y - C.ring.pad, C.w + 2 * C.ring.pad, C.h + 2 * C.ring.pad, C.ring.radius] : null, badge: [bx, by, bw, C.badge.h, c.state === "ready" ? "ready" : ""] };
  });
  // the shelf: a head line (or the one line that says three young wait), then the rows in view
  const Sh = Z.shelf;
  if (sum.allYoung) text(Sg.allYoung, Sh.line.x, Sh.line.baseline, Sh.line.role, "l");
  else { text(Sg.onShelf, Sh.head.x, Sh.head.baseline, Sh.head.role, "l"); text(Sg.keep, Sh.head.noteX, Sh.head.baseline, Sh.head.noteRole, "l"); }
  if (!rows.length) text(Sg.empty, Sh.empty.x, Sh.empty.baseline, Sh.empty.role, "l");
  const shown = rows.slice(first, first + Sh.visible), rowPics = shown.map((row, j) => {
    const k = first + j, g = rowGeometry(req, spec, Z, row, k, first, ring, { st }), y = g.y, kind = frameOf(row.species)?.species.name ?? "", fx = g.faces.length ? Sh.faces.x + g.faces.length * (Sh.faces.d + Sh.faces.gap) + 2 : Sh.title.x;
    const title = row.kind === "pair" ? row.parents.map((q) => S.cap(q.name)).join(" + ") : row.kind === "line" ? fill(Sg.lineOf, { name: S.cap(row.of ?? "a returned mibi") }) : fill(Sg.fromWild, { Kind: S.cap(kind), place: placeOf(row.place) });
    text(title, fx, y + Sh.title.baseline, Sh.title.role, "l");
    const fit = (list) => { let l = list; while (l.length > 1 && row.kind === "pair" && fill(Sg.canLand, { words: words(l) }).length * 7.6 > Sh.pods.x - fx - 6) l = l.slice(0, -1); return l; }, ws = words(fit(row.words));   // the green words end before the pod picture (station step 8-5)
    text(row.kind === "pair" ? fill(Sg.canLand, { words: ws }) : ws ? fill(Sg.seen, { words: ws }) : Sg.seenNone, g.faces.length ? fx : Sh.known.x, y + Sh.known.baseline, row.kind === "pair" ? Sh.known.greenRole : Sh.known.role, "l");
    text(row.count === 1 ? Sg.pod1 : fill(Sg.podN, { n: row.count }), Sh.count.right, y + Sh.count.baseline, Sh.count.role, "r");
    if (g.tag) text(Sg.newToYou, g.tag[0], y + Sh.tag.baseline + Sh.tag.dy, Sh.tag.role, "c", g.tag[2]);
    return g;
  });
  // the foot: the pad's word (the order, with more than one row) and ✓'s word
  const ok = okOf(st, ring, caps), F = Z.foot;
  if (ring.z === "shelf" && rows.length > 1) text(fill("{o}: {w}", { o: Sg.order, w: order === "parents" ? Sg.orderParents : Sg.orderNewest }), F.pad.x, F.pad.baseline, F.pad.role, "l");
  if (ok) text(ok === "hatch" ? Sg.hatch : Sg.lookCloser, F.ok.right, F.ok.baseline, F.ok.role, "r");
  const pic = { size: [spec.regions.page.rect[2], spec.regions.page.rect[3]], shelfTop: Sh.top - 14, head: { pill }, caps: capPics, rows: rowPics, keys: { pad: ring.z === "shelf" && rows.length > 1 ? F.keys.pad : null, ok: ok ? F.keys.ok : null }, ringBorder: C.ring.border };
  const stage = req({ kind: "nursery", id: `nursery:${hash(JSON.stringify(pic))}`, ...pic });
  view.page = { name: "", origin: "", tag: "", stage, hints: { chapters: "", look: "" }, rail: { cells: [] }, scale: { texts } };
  view.line = { ok: ok === "hatch" ? Sg.hatch : ok ? Sg.lookCloser : null, back: from, subject: "", need: "" };
  view.targets = [{ id: "rail.0", group: "rail", index: 0 }]; view.cur = "rail.0"; view.resolve = {}; view.first = first;
  view.nursery = { rows, caps, ring, first, ok };
  return view;
}

// Minutes as the page says them: "a minute", "15 minutes", "about an hour".
const whenWords = (Sg, mins) => (mins >= 60 ? Sg.hour : mins <= 1 ? Sg.minOne : fill(Sg.min, { n: mins }));
// A pod's page: the pod, whose it is, what is known of it, one act (Grow it). Never read: no sample, no price, nothing revealed.
export function podView(view, m, spec, req) {
  const { st, settings, ui } = m, Z = spec.regions.page.podpage, Sg = spec.strings.podpage, texts = [], rows = N.shelfRows(st, ui.order ?? "newest"), row = rows.find((r) => r.key === ui.podKey) ?? null;
  if (!row) return nurseryView(view, { ...m, ui: { ...ui, view: "nursery" } }, spec, req);   // the row is gone (its pods grew or went): back to the shelf
  const text = (tx, x, base, role, align, w) => { if (tx) texts.push({ text: tx, x: Math.round(x), ...(w ? { w } : {}), base: Math.round(base), role, align }); };
  const fr = frameOf(row.species), kind = S.cap(fr?.species.name ?? ""), free = S.capsuleFree(st) >= 0, mins = S.budMinutes(st, 0, settings), when = whenWords(Sg, mins);
  text(Sg.title, Z.title.x, Z.title.baseline, Z.title.role, "l");
  text(row.kind === "pair" ? fill(Sg.ofPair, { kind }) : row.kind === "line" ? fill(Sg.ofLine, { kind, name: S.cap(row.of ?? "a returned mibi") }) : fill(Sg.ofWild, { kind, where: "at the " + placeOf(row.place) }), Z.origin.x, Z.origin.baseline, Z.origin.role, "l");
  text(fill(spec.strings.nursery.sub, { from: spec.strings.nursery.crumb }), Z.crumb.x, Z.crumb.baseline, Z.crumb.role, "l");   // how she came: ← goes back to the shelf
  const faces = [], pr = Z.pill.rect; let pill = null;
  if (row.kind === "pair") { const label = fill(Sg.pill, { a: S.cap(row.parents[0]?.name ?? ""), b: S.cap(row.parents[1]?.name ?? "") }), fd = 26, pw = Math.round(label.length * 9.2) + 2 * fd + 40; pill = [pr[0] + pr[2] - pw, pr[1], pw, pr[3], Z.pill.radius];
    row.parents.forEach((q, j) => { const mb = S.mibiById(st, q.id); if (mb) faces.push({ id: faceOf(S.speciesOf(mb), mb, frameOf(S.speciesOf(mb))), x: j ? pill[0] + pw - fd - 10 : pill[0] + 8, y: pill[1] + 2, d: fd }); });
    text(label, pill[0] + 8 + fd, Z.pill.baseline, Z.pill.role, "c", pw - 2 * fd - 16); }
  const alike = row.count > 1 ? Z.alike.rect : null; if (alike) text(fill(Sg.alike, { n: row.count }), alike[0], alike[1] + Z.alike.baseline, Z.alike.role, "c", alike[2]);
  // what is known: a pod says what its parents say (the pairing's green for a pod of your own pair, the Companion's sight for a found one)
  const ws = row.words, tName = (id) => fr?.chapters.flatMap((c) => c.traits).find((t) => t.id === id)?.name ?? "";
  if (row.kind === "pair") { text(Sg.landHead, Z.head.x, Z.head.baseline, Z.head.greenRole, "l"); ws.slice(0, Z.lines.max).forEach((w, i) => text(`${tName(w.trait)}: ${w.word}`, Z.lines.x, Z.lines.top + i * Z.lines.pitch, Z.lines.greenRole, "l")); }
  else { text(Sg.knownHead, Z.head.x, Z.head.baseline, Z.head.quietRole, "l"); text(ws.length ? fill(Sg.seen, { words: words(ws) }) : Sg.seenNone, Z.lines.x, Z.lines.top, Z.lines.role, "l"); text(Sg.hidden, Z.lines.x, Z.lines.top + Z.lines.pitch, Z.head.quietRole, "l"); }
  // the one act, and what it costs: a capsule and time, nothing else
  text(free ? Sg.capsule : Sg.noCapsule, Z.say.x, Z.say.baseline, Z.say.role, "l"); if (free) text(fill(Sg.ready, { when }), Z.say.x, Z.say.baseline + Z.say.pitch, Z.say.role, "l");
  const act = ui.act === "letgo" ? "letgo" : "grow";
  if (free) text(Sg.grow, Z.ok.right, Z.ok.baseline, Z.ok.role, "r");
  text(Sg.letGo, Z.letgo.x + 8, Z.letgo.baseline, Z.letgo.role, "l");
  const pic = { size: [spec.regions.page.rect[2], spec.regions.page.rect[3]], shelfTop: Z.shelfTop, pod: { id: podId(req, row.species), w: Z.pod.w, cx: Z.pod.cx, foot: Z.pod.foot }, alike: alike ? [...alike, Z.alike.radius] : null, pill: pill ?? [0, 0, 0, 0, 0], faces, ring: null, ok: free ? Z.ok.key : null,
    letgo: [...Z.letgo.rect, Z.letgo.radius], letgoRing: act === "letgo", back: null };
  if (!pill) pic.pill = [0, 0, 0, 0, 0];
  const stage = req({ kind: "podpage", id: `podpage:${hash(JSON.stringify(pic))}`, ...pic });
  view.page = { name: "", origin: "", tag: "", stage, hints: { chapters: "", look: "" }, rail: { cells: [] }, scale: { texts } };
  view.line = { ok: free ? Sg.grow : null, back: spec.strings.nursery.crumb, subject: "", need: "" };
  view.targets = [{ id: "rail.0", group: "rail", index: 0 }]; view.cur = "rail.0"; view.resolve = {}; view.first = ui.first ?? 0;
  view.nursery = { row, free, act, when };
  return view;
}
