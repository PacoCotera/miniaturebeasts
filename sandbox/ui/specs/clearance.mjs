// The clearance of text (the spacing rules for text, Station column: T1 to T7, T10 and T11): pure, measured from the face's node log, not from ink, so the same numbers come from the
// WebAssembly face, the native build and the Pi. checks.mjs runs it on every journey point (rule 6) and face/tools/layer-check.mjs on every golden state.
//   departures(log, spec, frameSpec, inkOf, screen) -> [{ rule, node, other, measured, required }]
// log: the face's log (prim_log_json): `type`, each text with its region, role, ground, x, w, cap (its cap top row) and base (its baseline row); `nodes`, every node shown with a size in draw
//   order, [id, kind, layer, region, x, y, w, h, flags, inkx, inky, inkw, inkh, run] (run: the v_run or v_price call the node was sent in, 0 for none; kind: 1 rect, 2 text, 3 sprite, 4 nine-slice, 5 clip, 6 composed; flags: 1 a focus ring, 2 inside a clip).
// spec: the screen's spec; a region (by its id under `regions`, a dotted id through nested regions) may mark "band": "chip" or "key" (T4's 8 from the ends), "labels": "<node id>" (the picture
//   its text labels, T5's 8) and "ellipsis": true (a slot whose name may end in "…", T11). frameSpec: frame.json (the bars, type.clearance.exceptions).
// inkOf(node): a picture node's visible box [x, y, w, h] on the screen (default: the ink the log carries for it, the box of its pixels with alpha above 0).
// Each departure names its rule; `node` is the text ("<region> \"<text>\""), `other` what it is measured against, `measured` and `required` in px. Exceptions are spec data, never code:
// frame.json type.clearance.exceptions [{ screen?, node, rule, reason, by }] (node: the text's region, or "<region> \"<text>\""; screen: when named, the exception covers that screen only, the `screen` argument): a departure an exception covers is dropped, and used() names the ones in use.
const KIND = { rect: 1, text: 2, sprite: 3, nine: 4, clip: 5, composed: 6 }, RING = 1;
const TOP = { y0: 0, y1: 40, centre: 20 }, LINE = { y0: 562, y1: 600, cap: 576, centre: 582 };   // the bars' rows (frame.json regions.top, regions.line) and their middles (T2)
const CAP = { 16: 12, 20: 14, 28: 21 }, pxOf = (code) => (code > 1000 ? code % 1000 : code), capOf = (code) => CAP[pxOf(code)] ?? Math.floor((pxOf(code) * 3) / 4);
const node = (n) => ({ id: n[0], kind: n[1], layer: n[2], region: n[3], x: n[4], y: n[5], w: n[6], h: n[7], ring: !!(n[8] & RING), inClip: !!(n[8] & 2), ink: [n[9], n[10], n[11], n[12]], run: n[13] ?? 0 });
const fnv = (s) => { let h = 2166136261; for (const ch of new TextEncoder().encode(String(s))) { h ^= ch; h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };   // the face's v_id
const rowsMeet = (t, b) => t.cap < b[1] + b[3] && b[1] < t.base;
const colsMeet = (t, b) => t.x < b[0] + b[2] && b[0] < t.x + t.w;
const hgap = (t, b) => Math.max(b[0] - (t.x + t.w), t.x - (b[0] + b[2])), vgap = (t, b) => Math.max(b[1] - t.base, t.cap - (b[1] + b[3]));
const encloses = (b, t) => b[0] <= t.x && b[1] <= t.cap && b[0] + b[2] >= t.x + t.w && b[1] + b[3] >= t.base;
const inside = (t, b) => t.x >= b[0] && t.cap >= b[1] && t.x + t.w <= b[0] + b[2] && t.base <= b[1] + b[3];
const gap = (t, b) => (rowsMeet(t, b) ? hgap(t, b) : colsMeet(t, b) ? vgap(t, b) : null);   // the clearance along the axis on which the two face each other (null: diagonal, nothing faces)
function regionOf(spec, id) { let at = spec?.regions; for (const k of String(id).split(".")) { if (!at || typeof at !== "object") return null; at = at[k]; } return at && typeof at === "object" ? at : null; }
const nameOf = (t) => `${t.region} "${t.text}"`;

export function departures(log, spec, frameSpec, inkOf, screen) {
  const nodes = (log?.nodes ?? []).map(node).map((n, i) => ({ ...n, order: i })), ink = inkOf ?? ((n) => n.ink), out = [];
  // a node that a later rectangle, or a later picture whose pixels fill its box, covers whole is not seen (an overlay's veil and panel over the screen under it): it is not measured, nor measured against
  const solid = (r) => r.kind === KIND.rect || ((r.kind === KIND.sprite || r.kind === KIND.nine) && r.ink[0] === r.x && r.ink[1] === r.y && r.ink[2] === r.w && r.ink[3] === r.h);
  const covered = (box, order) => nodes.some((r) => r.order > order && solid(r) && r.x <= box[0] && r.y <= box[1] && r.x + r.w >= box[0] + box[2] && r.y + r.h >= box[1] + box[3]);
  const seenNodes = nodes.filter((n) => !covered([n.x, n.y, n.w, n.h], n.order));
  const textNodes = nodes.filter((n) => n.kind === KIND.text);
  const texts = (log?.type ?? []).filter((t) => t.text && t.role !== "shadow" && Number.isInteger(t.cap)).map((t) => ({ ...t, h: t.base - t.cap, order: textNodes.find((n) => n.region === t.region && n.x === t.x && n.w === t.w)?.order ?? -1 }))
    .filter((t) => t.order < 0 || !covered([t.x, t.cap, t.w, t.h], t.order));   // a text the node list does not show whole (cut by a clip) is measured
  const say = (rule, t, other, measured, required) => out.push({ rule, node: nameOf(t), other, measured, required });
  const hasTop = nodes.some((n) => (n.region === "top" || n.region === "bar") && n.y === TOP.y0 && n.h === TOP.y1), hasLine = nodes.some((n) => n.region === "line" && n.y === LINE.y0);   // the bars the screen draws (Idle has neither, Home only its own top bar)
  const inBar = (b) => (b.y >= TOP.y0 && b.y + b.h <= TOP.y1) || (b.y >= LINE.y0 && b.y + b.h <= LINE.y1);   // a bar's text is held by T2, not by its band
  const boxes = seenNodes.filter((n) => n.kind !== KIND.text && n.kind !== KIND.clip && !n.ring && n.w > 1 && n.h > 1 && !inBar(n));
  const pictures = seenNodes.filter((n) => n.kind === KIND.sprite || (n.kind === KIND.nine && n.layer !== 0));   // every sprite, and the nine-slices off the chrome layer
  const rules = seenNodes.filter((n) => (n.kind === KIND.rect || n.kind === KIND.composed) && (n.w === 1 || n.h === 1));
  // T2, the bars' icons: a picture of an icon's size (at most 24 px tall) in a bar is centred on its middle row
  for (const p of pictures) for (const [bar, what] of [...(hasTop ? [[TOP, "the top bar's middle"]] : []), ...(hasLine ? [[LINE, "the bottom line's middle"]] : [])]) {
    if (p.h > 24 || p.y < bar.y0 || p.y + p.h > bar.y1) continue; const mid = p.y + p.h / 2;
    if (Math.abs(mid - bar.centre) > 1) out.push({ rule: "T2", node: `${p.region} [${p.x}, ${p.y}, ${p.w}, ${p.h}]`, other: what, measured: mid, required: bar.centre });
  }
  for (const t of texts) {
    const R = regionOf(spec, t.region) ?? regionOf(frameSpec, t.region) ?? {};
    // T1, the safe margin: x 16 to 1008, no text on rows 0 to 8 or 592 to 599
    if (t.x < 16) say("T1", t, "the left edge", t.x, 16);
    if (t.x + t.w > 1008) say("T1", t, "the right edge", 1024 - (t.x + t.w), 16);
    if (t.cap < 9) say("T1", t, "the top edge", t.cap, 9);
    if (t.base > 592) say("T1", t, "the bottom edge", 600 - t.base, 8);
    // T2, the bars: the cap centred on the bar's middle row
    if (hasTop && t.cap >= TOP.y0 && t.base <= TOP.y1) { const want = TOP.y0 + Math.floor((TOP.y1 - TOP.y0 - capOf(t.px)) / 2); if (Math.abs(t.cap - want) > 1) say("T2", t, "the top bar's middle", t.cap, want); }
    else if (hasLine && t.cap >= LINE.y0 && t.base <= LINE.y1 && Math.abs(t.cap - LINE.cap) > 1) say("T2", t, "the bottom line's middle", t.cap, LINE.cap);
    // T3 and T4: the smallest panel, bezel or plate in the same region (or its parent region) that holds the text
    const mine = boxes.filter((b) => (b.region === t.region || t.region.startsWith(b.region + ".")) && encloses([b.x, b.y, b.w, b.h], t)).sort((a, b) => a.w * a.h - b.w * b.h)[0];
    if (mine) {
      const box = `${mine.region} [${mine.x}, ${mine.y}, ${mine.w}, ${mine.h}]`;
      if (mine.h >= 48) {
        if (t.cap - mine.y < 12) say("T3", t, box + " top", t.cap - mine.y, 12);
        if (mine.y + mine.h - t.base < 12) say("T3", t, box + " bottom", mine.y + mine.h - t.base, 12);
        if (t.x - mine.x < 12) say("T3", t, box + " left", t.x - mine.x, 12);
        if (mine.x + mine.w - (t.x + t.w) < 12) say("T3", t, box + " right", mine.x + mine.w - (t.x + t.w), 12);
      } else {
        const want = mine.y + Math.floor((mine.h - capOf(t.px)) / 2), end = R.band === "chip" || R.band === "key" ? 8 : 12;
        if (Math.abs(t.cap - want) > 1) say("T4", t, box + " middle", t.cap, want);
        if (t.x - mine.x < end) say("T4", t, box + " start", t.x - mine.x, end);
        if (mine.x + mine.w - (t.x + t.w) < end) say("T4", t, box + " end", mine.x + mine.w - (t.x + t.w), end);
      }
    }
    // T5, a neighbour picture: 8 from the one the spec says the text labels, 16 from any other on the same rows (a picture under the text is its ground, as is one that encloses any logged text, a tab's or a plate's; a picture of its own run is inline, T8: the node and the text carry the run they were sent in)
    for (const p of pictures) {
      const b = ink(p); if (!b || b[2] <= 0 || b[3] <= 0 || encloses(b, t) || (t.run && p.run === t.run) || texts.some((o) => encloses(b, o))) continue;
      const labels = R.labels != null && fnv(R.labels) === p.id, want = labels ? 8 : 16, g = labels ? gap(t, b) : rowsMeet(t, b) ? hgap(t, b) : null;
      if (g != null && g < want) say("T5", t, `${labels ? "the picture it labels" : "a picture"} ${p.region} [${b.join(", ")}]`, g, want);
    }
    // T8, an inline group: a picture and a text of the same run on the same rows are 4 apart
    if (t.run) for (const p of pictures) { if (p.run !== t.run) continue; const b = ink(p); if (!b || b[2] <= 0 || b[3] <= 0 || !rowsMeet(t, b)) continue; const g = hgap(t, b); if (g < 4) say("T8", t, `its own run's picture ${p.region} [${b.join(", ")}]`, g, 4); }
    // T6, the focus ring: 4 from its outer edge (a text inside the ring's box is the ringed thing's own)
    for (const r of seenNodes.filter((n) => n.ring)) { const b = [r.x, r.y, r.w, r.h]; if (inside(t, b)) continue; const g = gap(t, b); if (g != null && g < 4) say("T6", t, `the focus ring [${b.join(", ")}]`, g, 4); }
    // T7, a 1 px rule: 8 from it
    for (const r of rules) { const b = [r.x, r.y, r.w, r.h]; const g = gap(t, b); if (g != null && g < 8) say("T7", t, `a rule ${r.region} [${b.join(", ")}]`, g, 8); }
    // T10, another text on the same rows: 16 (the pieces of one run, one v_run or v_price call, are one text)
    for (const o of texts) { if (o === t || (t.run && o.run === t.run) || !rowsMeet(t, [o.x, o.cap, o.w, o.h]) || o.x < t.x) continue; const g = hgap(t, [o.x, o.cap, o.w, o.h]); if (g < 16) say("T10", t, nameOf(o), g, 16); }
    // T11, clipping and the ellipsis: no text crosses a clip's box; "…" only on a name in a slot the spec marks
    for (const c of nodes.filter((n) => n.kind === KIND.clip)) { const b = [c.x, c.y, c.w, c.h]; if (colsMeet(t, b) && rowsMeet(t, b) && !inside(t, b)) say("T11", t, `the clip ${c.region} [${b.join(", ")}]`, Math.min(t.x - b[0], b[0] + b[2] - (t.x + t.w), t.cap - b[1], b[1] + b[3] - t.base), 0); }
    if (t.text.includes("…") && R.ellipsis !== true) say("T11", t, "an ellipsis outside a name's marked slot", 0, 0);
  }
  const ex = frameSpec?.type?.clearance?.exceptions ?? [], used = new Set();
  const kept = out.filter((d) => { const e = ex.findIndex((x) => x.rule === d.rule && (!x.screen || x.screen === screen) && (x.node === d.node || d.node.startsWith(x.node + " \""))); if (e < 0) return true; used.add(e); return false; });
  Object.defineProperty(kept, "used", { value: [...used].map((i) => ex[i]) });   // the exceptions in use (not enumerable: the result compares as the list of departures)
  return kept;
}
// The exceptions frame.json lists that no departure used across a whole run (each must be in use, so the list cannot rot): pass every result of departures().
export function unusedExceptions(frameSpec, results) { const ex = frameSpec?.type?.clearance?.exceptions ?? [], used = new Set(results.flatMap((r) => r.used ?? [])); return ex.filter((e) => !used.has(e)); }
// Report or fail: a screen listed in frame.json type.clearance.enforced fails on a departure; any other is reported.
export const enforced = (frameSpec, screen) => (frameSpec?.type?.clearance?.enforced ?? []).includes(screen);
// The frame's own text, on every screen that draws it: the regions its words draw text in (the top bar's zones, the bottom line's, the message plate), the decision panel's
// (its question, its cards' words) and the chapter rail's tabs. "frame" in type.clearance.enforced fails a departure of any of them on any screen; the screen's own text stays as its entry says.
export const FRAME_REGIONS = new Set(["title", "materials", "time", "action", "subject", "need", "back", "plate", "panelTitle", "cardText", "rail.tab"]);
const regionOfDeparture = (d) => String(d.node).match(/^[^ ]+/)?.[0] ?? "";
export const enforcedDeparture = (frameSpec, screen, d) => enforced(frameSpec, screen) || (enforced(frameSpec, "frame") && FRAME_REGIONS.has(regionOfDeparture(d)));
