// The layout check (report mode): rules L0 to L11 over the face's node log, beside the clearance of text (clearance.mjs). Pure: the same numbers from every face (the WebAssembly face, the native
// build, the Pi). face/tools/layout-check.mjs runs it over every golden state; ui/tests/layout.test.mjs and layout-cases.test.mjs hold it to its rules and to the known findings.
//   findings(log, spec, frameSpec, screen, state, extra) -> [{ rule, node, other, measured, required, unit, container: { id, rect }, boxes: [{ role, rect }], ... }]
// log: the face's log (prim_log_json): `nodes`, every node shown with a size in draw order, [id, kind, layer, region, x, y, w, h, flags, inkx, inky, inkw, inkh, run, solidx, solidy, solidw, solidh]
//   (kind 1 rect, 2 text, 3 sprite, 4 nine-slice, 5 clip, 6 composed; flags 1 a focus ring, 2 inside a clip, 4 a hold mark, 8 a window of a larger picture, 16 that window cuts solid ink, 32 composed
//   content; the solid box: a sprite's solid ink (alpha >= 128, rows and columns with 3 or more such pixels, C9), a text's advance x cap top to baseline, any other node's box); `type`, the text entries;
//   `snapshot`, the snapshot's source nodes ({ region, from, at, nodes }) while a node shows it.
// spec: the screen's spec; its top-level `layout` block: { stage: "bezel" | "field" | "painting" | "exempt", opening: [x, y, w, h], margin?, gutter?, containers?: [{ id, region, padding, gutter }],
//   columns?: [{ id, regions, axis, align: "fill" | "centre" }], topLine?, floorLine?, groups?: [{ id, regions, within, align }], split?: [{ between: [a, b], gutter, reason }], bleed?: [regions],
//   slots?: [regions], painted?: [{ id, rect | region, fills, states?, picture }], facts?: [{ region, path }], given?: [props paths read as the frame's facts, not a picture's boxes], align?, clips?: [regions], movers?: [regions], props?: [regions],
//   anchors?: [{ region, x?: "left" | "right", y?: "top" | "bottom", inset?: [dx, dy] }] }, and its regions (`labels`, `under`, `partOf` merge one region into another).
//   A container has an alignment per axis (`align` on the stage, `containers[].align`: "left" | "right" | "centre" | "fill", or { x: left | right | centre | fill, y: top | bottom | middle | fill }; a string sets x);
//   undeclared, an axis is a centred block when the content sits off the margin on both sides, else fill. `containers[].padding` is a number or { left, top, right, bottom }. A region in `clips` is a window that
//   clips its content by design (L2 and L10a are off inside it); `movers` (creatures) and `props` (scene props) are placed by depth, not by the grid; an anchor is fixed UI pinned in a scene's corner.
// frameSpec: frame.json; `layout.thresholds` (every number the rules use, each { value, from }), `layout.exceptions` [{ screen, state?, rule, node, other? (a name or a list of names), reason, by, date }] and
//   `layout.enforced` { "<screen>": ["L1", ...] | "all" }. screen: the golden screen (the exceptions' and the enforcement's key); state: the golden state.
// extra: { facts: { "<props path>": value } }: the props facts the generated pictures carry (a spec's `layout.facts` names the path; each entry a rect, or an object with `rect`, in the picture's own
//   coordinates), read as the picture's inner boxes.
// The component model (C9): the frame's bars and zones are not measured; a node a later solid node covers is not seen (a rect, a nine-slice, a picture solid edge to edge; a focus ring never covers);
// a 1 or 2 px rule is a line, not a component; nodes with one rect are the layers of one picture (its box the union of their solid boxes); a picture painted over its whole rect with a text on it is a
// plate, measured by its rect; a container is a node at least 48 x 48 (not text) that holds two boxes, or one of another region, and is composed content (the snapshot, a generated
// picture), a region layout.containers names, or a pane drawn as one (a rect, a nine-slice, a picture painted over its whole rect), and a node covering
// 90 % of its container and reaching its four edges is its ground; a strip hanging from a container's top edge moves that edge to the strip's lower edge. In a container, the boxes of one region (a
// region whose spec says `labels`, `under` or `partOf` another belongs to that one) that meet or lie within `component` px of each other are one component, but two pictures of one region that overlap
// in part stay two; a component under `mark` px on its larger side is a mark. The focus ring counts for L2 and L4 only. Every number is frame.json layout.thresholds'.
import { FRAME_REGIONS } from "./clearance.mjs";

const KIND = { rect: 1, text: 2, sprite: 3, nine: 4, clip: 5, composed: 6 }, FLAG = { ring: 1, clip: 2, hold: 4, window: 8, cut: 16, composed: 32 };
const BARS = new Set([...FRAME_REGIONS, "top", "line", "bar"]);
export const RULES = ["L0", "L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8", "L9", "L10", "L11"];   // a finding of L3, L5, L7, L8 or L10 names its part (a or b; L10 also c)
const STAGES = ["bezel", "field", "painting", "exempt"];
const SIDES = ["left", "top", "right", "bottom"], OPP = { left: "right", right: "left", top: "bottom", bottom: "top" };
const fnv = (s) => { let h = 2166136261; for (const ch of new TextEncoder().encode(String(s))) { h ^= ch; h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };   // the face's v_id

// ---- boxes [x, y, w, h] ----
const R = (b) => b[0] + b[2], B = (b) => b[1] + b[3], area = (b) => Math.max(0, b[2]) * Math.max(0, b[3]);
const empty = (b) => !b || b[2] <= 0 || b[3] <= 0;
const same = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
const encloses = (o, i) => o[0] <= i[0] && o[1] <= i[1] && R(o) >= R(i) && B(o) >= B(i);
const inter = (a, b) => { const x = Math.max(a[0], b[0]), y = Math.max(a[1], b[1]), w = Math.min(R(a), R(b)) - x, h = Math.min(B(a), B(b)) - y; return w > 0 && h > 0 ? [x, y, w, h] : null; };
const union = (a, b) => (empty(a) ? b : empty(b) ? a : (() => { const x = Math.min(a[0], b[0]), y = Math.min(a[1], b[1]); return [x, y, Math.max(R(a), R(b)) - x, Math.max(B(a), B(b)) - y]; })());
const gapX = (a, b) => Math.max(b[0] - R(a), a[0] - R(b)), gapY = (a, b) => Math.max(b[1] - B(a), a[1] - B(b));
const dist = (a, b) => Math.hypot(Math.max(0, gapX(a, b)), Math.max(0, gapY(a, b)));   // 0 when the boxes meet
const overlapShare = (a, b, axis) => { const lo = axis === "y" ? Math.max(a[1], b[1]) : Math.max(a[0], b[0]), hi = axis === "y" ? Math.min(B(a), B(b)) : Math.min(R(a), R(b)), n = axis === "y" ? Math.min(a[3], b[3]) : Math.min(a[2], b[2]); return n > 0 ? Math.max(0, hi - lo) / n : 0; };
const side = (b, c, s) => (s === "left" ? b[0] - c[0] : s === "top" ? b[1] - c[1] : s === "right" ? R(c) - R(b) : B(c) - B(b));   // the gap from a box to its container's edge on side s (negative: across it)
const cx = (b) => b[0] + b[2] / 2, cy = (b) => b[1] + b[3] / 2;
const rnd = (v, k = 2) => Math.round(v * 10 ** k) / 10 ** k;
// A container's declared alignment, per axis: x left | right | centre | fill, y top | bottom | middle | fill (a string sets x; "centre" on y is "middle"); null: not declared, inferred.
const ALIGN_X = ["left", "right", "centre", "fill"], ALIGN_Y = ["top", "bottom", "middle", "centre", "fill"];
const alignOf = (a) => { const v = !a ? {} : typeof a === "string" ? { x: a } : a; return { x: v.x ?? null, y: v.y === "centre" ? "middle" : v.y ?? null }; };
const START = new Set(["left", "top"]), END = new Set(["right", "bottom"]), PINNED = (al) => START.has(al) || END.has(al);

// ---- the spec and the thresholds ----
function regionOf(spec, id) { let at = spec?.regions; for (const k of String(id).split(".")) { if (!at || typeof at !== "object") return null; at = at[k]; } return at && typeof at === "object" ? at : null; }
const T = (frameSpec, rule) => { const t = frameSpec?.layout?.thresholds?.[rule]; if (!t || !("value" in t)) throw new Error(`frame.json layout.thresholds.${rule} is missing`); return t.value; };
// Every problem of a spec's `layout` block and of frame.json's `layout` (thresholds, exceptions, enforced): a malformed block fails the run, report mode or not.
export function malformed(spec, frameSpec, name = "spec") {
  const out = [], L = spec?.layout, F = frameSpec?.layout, rect = (r) => Array.isArray(r) && r.length === 4 && r.every(Number.isInteger) && r[2] > 0 && r[3] > 0;
  if (!F || typeof F !== "object") out.push("frame.json has no layout block");
  else {
    for (const k of [...RULES.filter((r) => r !== "L7"), "L7a", "L7b", "mark", "ground", "container", "component", "rule"]) { const t = F.thresholds?.[k]; if (!t || !("value" in t) || typeof t.from !== "string" || !t.from) out.push(`frame.json layout.thresholds.${k} is not { value, from }`); }
    const t = F.thresholds ?? {}, num = (v) => Number.isFinite(v);
    if (!num(t.L3?.value?.bezelItems)) out.push("frame.json layout.thresholds.L3.value.bezelItems is not a number");
    if (!num(t.L4?.value?.depth) || !num(t.L4?.value?.perch?.share) || !num(t.L4?.value?.perch?.min)) out.push("frame.json layout.thresholds.L4.value needs depth and perch { share, min }");
    if (!Array.isArray(F.exceptions)) out.push("frame.json layout.exceptions is not a list");
    else F.exceptions.forEach((e, i) => { if (!e || !RULES.includes(e.rule) || typeof e.screen !== "string" || typeof e.node !== "string" || !e.reason || !["UI/UX", "AD", "owner"].includes(e.by) || !/^\d{4}-\d\d-\d\d/.test(String(e.date ?? ""))) out.push(`frame.json layout.exceptions[${i}] needs screen, rule (L0 to L11), node, reason, by (UI/UX, AD or owner) and date`);
      if (e && e.when != null && (typeof e.when !== "object" || Array.isArray(e.when))) out.push(`frame.json layout.exceptions[${i}].when is { "<props fact>": value }`);
      if (e && e.unless != null && (typeof e.unless !== "object" || !RULES.includes(e.unless.rule))) out.push(`frame.json layout.exceptions[${i}].unless is { rule, part? }`);
      if (e && e.rule === "L10" && e.part === "c") out.push(`frame.json layout.exceptions[${i}]: L10c has no exception, the owner's or anyone's`); });
    if (!F.enforced || typeof F.enforced !== "object" || Array.isArray(F.enforced)) out.push("frame.json layout.enforced is not an object");
    else for (const [s, v] of Object.entries(F.enforced)) if (v !== "all" && !(Array.isArray(v) && v.every((r) => RULES.includes(r)))) out.push(`frame.json layout.enforced.${s} is "all" or a list of rules`);
  }
  if (!L || typeof L !== "object") { out.push(`${name} has no layout block`); return out; }
  if (!STAGES.includes(L.stage)) out.push(`${name} layout.stage is not one of ${STAGES.join(", ")}`);
  if (L.stage !== "exempt" && !rect(L.opening)) out.push(`${name} layout.opening is not [x, y, w, h]`);
  for (const k of ["containers", "columns", "groups", "split", "bleed", "slots", "painted", "facts", "given", "clips", "movers", "props", "anchors"]) if (k in L && !Array.isArray(L[k])) out.push(`${name} layout.${k} is not a list`);
  if (Array.isArray(L.given) && !L.given.every((q) => typeof q === "string" && q)) out.push(`${name} layout.given lists props paths`);
  for (const k of ["clips", "movers", "props"]) if (Array.isArray(L[k]) && !L[k].every((r) => typeof r === "string" && r)) out.push(`${name} layout.${k} lists region names`);
  for (const p of L.painted ?? []) if (!p?.id || !(rect(p.rect) || (typeof p.region === "string" && p.region)) || typeof p.fills !== "boolean") out.push(`${name} layout.painted: ${p?.id ?? "?"} needs id, rect or region, and fills`);
  for (const f of L.facts ?? []) if (!f?.region || !f?.path) out.push(`${name} layout.facts: an entry needs region and path`);
  const aligned = (a, where) => { if (a == null) return; const v = typeof a === "string" ? { x: a } : a;
    if (typeof v !== "object" || Array.isArray(v) || (v.x != null && !ALIGN_X.includes(v.x)) || (v.y != null && !ALIGN_Y.includes(v.y))) out.push(`${name} ${where} align is ${ALIGN_X.join(" | ")}, or { x: ${ALIGN_X.join(" | ")}, y: ${ALIGN_Y.join(" | ")} }`); };
  aligned(L.align, "layout");
  for (const c of L.containers ?? []) { if (!c?.region) { out.push(`${name} layout.containers: an entry needs region`); continue; } aligned(c.align, `layout.containers ${c.region}`);
    const p = c.padding; if (p != null && !(Number.isFinite(p) || (typeof p === "object" && !Array.isArray(p) && Object.entries(p).every(([k, v]) => SIDES.includes(k) && Number.isFinite(v))))) out.push(`${name} layout.containers ${c.region}: padding is a number or { left, top, right, bottom }`); }
  for (const a of Array.isArray(L.anchors) ? L.anchors : []) if (!a?.region || !(["left", "right"].includes(a.x) || ["top", "bottom"].includes(a.y)) || (a.x != null && !["left", "right"].includes(a.x)) || (a.y != null && !["top", "bottom"].includes(a.y)) || (a.inset != null && !(Array.isArray(a.inset) && a.inset.length === 2 && a.inset.every(Number.isFinite)))) out.push(`${name} layout.anchors: ${a?.region ?? "?"} needs region, x (left, right) or y (top, bottom), and inset [dx, dy]`);
  return out;
}

// ---- the log ----
const parse = (n, i, text) => {
  const rect = [n[4], n[5], n[6], n[7]], flags = n[8] ?? 0, ink = [n[9], n[10], n[11], n[12]];
  let solid = n.length >= 18 ? [n[14], n[15], n[16], n[17]] : n[1] === KIND.sprite ? ink : rect;
  if (n[1] === KIND.text && n.length < 18 && text) solid = [text.x, text.cap, text.w, text.base - text.cap];
  return { order: i, id: n[0], kind: n[1], layer: n[2], region: n[3], rect, flags, ink, run: n[13] ?? 0, solid, ring: !!(flags & (FLAG.ring | FLAG.hold)), cut: !!(flags & FLAG.cut), composed: !!(flags & FLAG.composed), text: text?.text ?? null, src: "screen" };
};
const solidCover = (r) => !r.ring && (r.kind === KIND.rect || (r.kind === KIND.nine && same(r.ink, r.rect)) || (r.kind === KIND.sprite && same(r.solid, r.rect)));   // a node that hides what it covers: a rect, a nine-slice (clearance.mjs), a picture solid edge to edge (not a glass front)

// The analysis of one state: its containers, each with its components, rings and marks, and what the rules need. Exported through components() and containers().
function analyse(log, spec, frameSpec, extra = {}) {
  const L = spec?.layout ?? {}, ruleMax = T(frameSpec, "rule"), markMax = T(frameSpec, "mark"), groundShare = T(frameSpec, "ground"), contMin = T(frameSpec, "container"), near = T(frameSpec, "component");
  const t1 = T(frameSpec, "L1"), t3 = T(frameSpec, "L3"), movers = new Set(L.movers ?? []), props = new Set(L.props ?? []);
  const textOf = new Map(); for (const t of log?.type ?? []) textOf.set(`${t.region}|${t.x}|${t.w}`, t);
  let nodes = (log?.nodes ?? []).map((n, i) => parse(n, i, n[1] === KIND.text ? textOf.get(`${n[3]}|${n[4]}|${n[6]}`) : null));
  // the snapshot's source nodes, moved to where the snapshot shows them, inside its node (log addition 3)
  const snapNode = nodes.find((n) => n.composed && n.kind === KIND.sprite);
  if (snapNode && log?.snapshot?.nodes) {
    const s = log.snapshot, dx = s.at[0] - s.from[0], dy = s.at[1] - s.from[1], mv = (b) => [b[0] + dx, b[1] + dy, b[2], b[3]];
    const inner = s.nodes.map((n, k) => { const p = parse(n, snapNode.order + (k + 1) / 1000, null); return { ...p, rect: mv(p.rect), ink: mv(p.ink), solid: mv(p.solid), src: "snapshot", parentNode: snapNode }; });
    nodes = [...nodes.filter((n) => n.order <= snapNode.order), ...inner, ...nodes.filter((n) => n.order > snapNode.order)];
  }
  // a generated picture's inner boxes, from the props facts its spec names (log addition 4)
  for (const f of L.facts ?? []) {
    const list = extra?.facts?.[f.path]; for (const pic of nodes.filter((n) => n.region === f.region && n.kind === KIND.sprite && n.src === "screen")) {
      pic.composed = true; if (!Array.isArray(list)) continue;
      list.forEach((e, k) => { const r = Array.isArray(e) ? e : e?.rect; if (!Array.isArray(r) || r.length !== 4) return; const b = [pic.rect[0] + r[0], pic.rect[1] + r[1], r[2], r[3]];
        nodes.push({ order: pic.order + (k + 1) / 1000, id: fnv(`${f.region}.fact.${k}`), kind: KIND.rect, layer: pic.layer, region: `${f.region}.${e?.id ?? k}`, rect: b, flags: 0, ink: b, run: 0, solid: b, ring: false, cut: false, composed: false, text: null, src: "facts", parentNode: pic }); });
    }
  }
  nodes.sort((a, b) => a.order - b.order);
  // what is not measured: the bars and their zones, clips, nodes a later solid node covers whole, rules (lines), nodes with nothing to show
  const covered = (n) => nodes.some((r) => r.order > n.order && (r.src === "screen" || (r.src === n.src && r.src !== "facts")) && solidCover(r) && encloses(r.rect, n.rect));   // the snapshot's nodes cover only their own; inner boxes cover nothing
  const seen = nodes.filter((n) => n.kind !== KIND.clip && !BARS.has(n.region) && !covered(n));
  const keep = seen.filter((n) => !((n.kind === KIND.rect || n.kind === KIND.composed) && Math.min(n.rect[2], n.rect[3]) <= ruleMax) && !(n.kind !== KIND.text && n.kind !== KIND.rect && empty(n.solid) && !n.composed));
  // a plate: a picture painted over its whole rect with a text on it is measured by its rect (C9: panel, plate), however faint its paint
  for (const n of keep) if (n.kind === KIND.sprite && same(n.ink, n.rect) && !same(n.solid, n.rect) && keep.some((t) => t.kind === KIND.text && t.src === n.src && encloses(n.rect, t.solid))) n.solid = [...n.rect];
  const rings = keep.filter((n) => n.ring), parts = keep.filter((n) => !n.ring);
  // the key a region is measured under: a region whose spec says labels, under or partOf another is that one's (a node id in `labels` names its node's region)
  const regionByNode = new Map(parts.map((n) => [n.id, n.region]));
  const keyOf = (region, src) => { let k = region; for (let i = 0; i < 8; i++) { const r = regionOf(spec, k); const to = r?.partOf ?? r?.under ?? r?.labels; if (!to) break; k = regionByNode.get(fnv(to)) ?? to; } return (src === "screen" ? "" : src + ":") + k; };
  // layers of one picture: nodes with one rect (and one source) are one group; its box is the union of their solid boxes
  const groups = []; for (const n of parts) { const g = n.kind !== KIND.text && groups.find((q) => q.kind !== KIND.text && q.src === n.src && same(q.rect, n.rect)); if (g) { g.members.push(n); g.box = union(g.box, n.solid); g.composed ||= n.composed; g.cut ||= n.cut; } else groups.push({ members: [n], rect: n.rect, box: empty(n.solid) ? [n.rect[0], n.rect[1], 0, 0] : n.solid, kind: n.kind, src: n.src, region: n.region, key: keyOf(n.region, n.src), composed: n.composed, cut: n.cut, parentNode: n.parentNode }); }
  for (const g of groups) if (empty(g.box) && g.composed) g.box = g.rect;
  const live = groups.filter((g) => !empty(g.box));
  // the containers: a group at least contMin x contMin (not text) whose rect encloses a group of another region, or the inner boxes of composed content; the stage's opening is the root
  const stage = { id: "opening", rect: L.opening ? [...L.opening] : [0, 0, 1024, 600], level: "stage", group: null, kids: [] };
  const childOf = (g, q) => q !== g && ((q.parentNode && g.members.includes(q.parentNode)) || (g.src === q.src && encloses(g.box, q.box) && area(g.box) > area(q.box)));   // inner boxes belong to their picture, or to a container of their own source inside it
  // only composed content (the snapshot, a layout.facts picture), a region layout.containers names, or a pane drawn as one (a rect, a nine-slice, a picture painted over its whole rect) holds
  // content: a composed line drawing or a picture with clear margins is not a pane
  const paneLike = (g) => g.composed || (L.containers ?? []).some((d) => g.members.some((n) => n.region === d.region)) || g.members.some((n) => n.kind === KIND.rect || n.kind === KIND.nine || (n.kind === KIND.sprite && same(n.ink, n.rect)));
  for (const g of live) { const inside = g.kind !== KIND.text && g.box[2] >= contMin && g.box[3] >= contMin ? live.filter((q) => childOf(g, q)) : []; g.container = (inside.length > 1 || inside.some((q) => q.key !== g.key || q.parentNode)) && paneLike(g); }   // one picture on its own plate is one component
  const cands = live.filter((g) => g.container);
  const parentOf = (g) => { let best = null; for (const c of cands) if (c !== g && childOf(c, g) && (!g.container || area(c.box) > area(g.box) || (g.parentNode && c.members.includes(g.parentNode))) && (!best || area(c.box) < area(best.box))) best = c; return best; };
  for (const g of live) g.parent = parentOf(g);
  // grounds: a group covering groundShare of its container (the stage's opening, or its container's rect) is not content; what it held belongs to its container
  for (let again = true; again;) { again = false;
    for (const g of live) { if (g.ground) continue; const c = g.parent ?? null, cr = c ? c.box : stage.rect, i = inter(g.box, cr);
      if (i && area(i) >= groundShare * area(cr) && SIDES.every((s) => side(g.box, cr, s) <= T(frameSpec, "L2"))) { g.ground = true; again = true; for (const q of live) if (q.parent === g) q.parent = c; } } }
  const content = live.filter((g) => !g.ground && (g.parent || inter(g.box, stage.rect)));
  const boxes = new Map([[null, stage]]);
  for (const g of content) if (g.container && content.some((q) => q.parent === g)) boxes.set(g, { id: null, rect: [...g.box], level: "pane", group: g, kids: [] });
  for (const g of content) { let p = g.parent; while (p && !boxes.has(p)) p = p.parent; (boxes.get(p ?? null)).kids.push(g); g.home = boxes.get(p ?? null); }
  // strips: a group hanging from its container's top edge (its top at or above it, its bottom inside), at most maxH high and ratio x as wide: the container's top becomes its lower edge
  const strip = t1.strip;
  for (const c of boxes.values()) {
    const top = c.rect[1], st = c.kids.filter((g) => g.box[1] <= top && B(g.box) > top && g.box[3] <= strip.maxH && g.box[2] >= strip.ratio * g.box[3] && g.kind !== KIND.text);
    if (st.length) { const y = Math.max(...st.map((g) => B(g.box))); c.strips = st; c.rect = [c.rect[0], y, c.rect[2], B(c.rect) - y]; c.kids = c.kids.filter((g) => !st.includes(g)); }
  }
  // each container's components: the groups of one key that meet or lie within `near` px; named by region (#2, #3 in reading order when a key has more than one in a container)
  const contDecl = (g) => (L.containers ?? []).find((d) => g && g.members.some((n) => n.region === d.region));
  const list = [...boxes.values()], idCount = {};
  const home = (r) => { let best = stage; for (const c of list) if (c.group && c.group.src === "screen" && encloses(c.rect, r.rect) && (best === stage || area(c.rect) < area(best.rect))) best = c; return best; };
  list.forEach((c) => {
    const decl = contDecl(c.group), m = L.margin;
    if (c.group) { const base = (c.group.src === "screen" ? "" : c.group.src + " ") + c.group.region; idCount[base] = (idCount[base] ?? 0) + 1; c.id = base + (idCount[base] > 1 ? "#" + idCount[base] : ""); } else c.id = "opening";
    c.align = alignOf(c.group ? decl?.align : L.align);
    c.margins = c.group ? Object.fromEntries(SIDES.map((s) => [s, (decl?.padding && typeof decl.padding === "object" ? decl.padding[s] : decl?.padding) ?? t1.pane])) : Object.fromEntries(SIDES.map((s) => [s, (typeof m === "number" ? m : m?.[s]) ?? t1[L.stage === "bezel" ? "bezel" : "field"][s]]));
    if (c.strips?.length) c.margins.top = t1.strip.gap;
    c.gutter = c.group ? decl?.gutter ?? t3.pane : L.gutter ?? t3[L.stage === "bezel" ? "bezel" : "field"];
    const ks = c.kids, up = ks.map((_, k) => k), find = (k) => (up[k] === k ? k : (up[k] = find(up[k])));
    const crossing = (p, q) => p.region === q.region && inter(p.box, q.box) && !encloses(p.box, q.box) && !encloses(q.box, p.box);   // two pictures of one region that overlap in part stay two (L4 sees them: residents stacked into a totem)
    for (let a = 0; a < ks.length; a++) for (let b = a + 1; b < ks.length; b++) if (ks[a].key === ks[b].key && dist(ks[a].box, ks[b].box) <= near && !crossing(ks[a], ks[b])) up[find(a)] = find(b);
    const by = new Map(); ks.forEach((g, k) => { const r = find(k); if (!by.has(r)) by.set(r, []); by.get(r).push(g); });
    const comps = [...by.values()].map((gs) => ({ key: gs[0].key, region: gs[0].key.replace(/^[a-z]+:/, ""), src: gs[0].src, groups: gs, box: gs.reduce((u, g) => union(u, g.box), null), text: gs.every((g) => g.kind === KIND.text), label: gs.flatMap((g) => g.members).find((n) => n.text)?.text ?? null, pane: gs.some((g) => boxes.has(g)) ? boxes.get(gs.find((g) => boxes.has(g))) : null }));
    comps.sort((a, b) => a.box[1] - b.box[1] || a.box[0] - b.box[0]);
    const seenKey = {}; for (const k of comps) { seenKey[k.key] = (seenKey[k.key] ?? 0) + 1; k.name = (k.src === "snapshot" ? "snapshot " : "") + k.region + (seenKey[k.key] > 1 ? "#" + seenKey[k.key] : ""); k.mark = Math.max(k.box[2], k.box[3]) < markMax; k.mover = movers.has(k.region); k.prop = props.has(k.region); k.anchor = (L.anchors ?? []).find((a) => a.region === k.region) ?? null; }
    const wordsOf = (g) => g.members.find((n) => n.text)?.text;
    for (const k of comps) k.title = k.text ? null : live.filter((g) => g.kind === KIND.text && g.src === k.src && encloses(k.box, g.box) && wordsOf(g)).sort((a, b) => a.box[1] - b.box[1] || a.box[0] - b.box[0]).map(wordsOf)[0] ?? null;   // a plate is named by the title text on it
    c.components = comps;
    c.rings = rings.filter((r) => home(r) === c);
    c.groups = ks;
  });
  // L0's question: composed content (the snapshot, a generated picture) with no inner boxes
  const blind = live.filter((g) => g.composed && !g.ground && !live.some((q) => q.parentNode && g.members.includes(q.parentNode)));
  return { containers: list, stage, blind, groups: live, rings, spec, layout: L };
}
export const components = (log, spec, frameSpec, extra) => analyse(log, spec, frameSpec, extra).containers.flatMap((c) => c.components.map((k) => ({ container: c.id, name: k.name, region: k.region, box: k.box, mark: k.mark, text: k.text, label: k.label })));
export const containers = (log, spec, frameSpec, extra) => analyse(log, spec, frameSpec, extra).containers.map((c) => ({ id: c.id, rect: c.rect, level: c.level, margins: c.margins, gutter: c.gutter, components: c.components.length }));

// The largest empty rectangle of a w x h grid (filled: a Uint8Array, 1 filled) with both sides at least minW and minH: { x, y, w, h } or null (each row's histogram, every maximal rectangle).
function largestEmpty(filled, w, h, minW, minH) {
  const hist = new Int32Array(w); let best = null, bestA = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) hist[x] = filled[y * w + x] ? 0 : hist[x] + 1;
    const st = [];
    for (let x = 0; x <= w; x++) { const hh = x < w ? hist[x] : 0; let start = x;
      while (st.length && st[st.length - 1][1] >= hh) { const [sx, sh] = st.pop(), ww = x - sx; if (sh >= minH && ww >= minW && sh * ww > bestA) { bestA = sh * ww; best = { x: sx, y: y - sh + 1, w: ww, h: sh }; } start = sx; }
      st.push([start, hh]); }
  }
  return best;
}

// ---- the rules ----
export function findings(log, spec, frameSpec, screen, state, extra = {}) {
  const L = spec?.layout; if (!L || L.stage === "exempt") return withUsed([], []);
  const A = analyse(log, spec, frameSpec, extra), out = [];
  const t1 = T(frameSpec, "L1"), t2 = T(frameSpec, "L2"), t3 = T(frameSpec, "L3"), t4 = T(frameSpec, "L4"), t5 = T(frameSpec, "L5"), t6 = T(frameSpec, "L6"), t7a = T(frameSpec, "L7a"), t7b = T(frameSpec, "L7b"), t8 = T(frameSpec, "L8"), t10 = T(frameSpec, "L10"), t11 = T(frameSpec, "L11"), t0 = T(frameSpec, "L0");
  const bleed = new Set(L.bleed ?? []), clips = new Set(L.clips ?? []), contMin = T(frameSpec, "container"), painted = (L.painted ?? []).filter((p) => !p.states || p.states.includes(state));
  const say = (rule, c, f) => out.push({ rule, ...f, container: { id: c.id, rect: [...c.rect] } });
  const bx = (role, rect) => ({ role, rect: [...rect] });
  const declared = new Set([...(L.groups ?? []).flatMap((g) => g.regions ?? []), ...(L.columns ?? []).flatMap((c) => c.regions ?? [])]);
  for (const c of A.containers) {
    const byDepth = (k) => k.mover || k.prop, R0 = c.rect, all = c.components, comps = all.filter((k) => !k.mark && !byDepth(k) && !k.anchor), G = c.gutter;   // creatures and scene props are placed by depth, and an anchor by its corner: not by the grid
    const clipsIn = !!c.group && c.group.members.some((n) => clips.has(n.region));   // a window that clips its content by design (layout.clips)
    const mod = (k) => !k.text && Math.max(k.box[2], k.box[3]) >= contMin;   // a module: a pane, plate, strip or picture container-sized on its larger side
    const inset = (k, s) => k.anchor.inset?.[s === "left" || s === "right" ? 0 : 1] ?? c.margins[s];
    for (const k of all.filter((q) => q.anchor)) for (const s of [k.anchor.x, k.anchor.y]) { if (!s) continue; const d = side(k.box, R0, s), want = inset(k, s);   // layout.anchors: held at its corner's insets
      if (Math.abs(d - want) > t1.side) say("L1", c, { node: k.name, other: s + " (anchored)", measured: d, required: want, unit: "px", what: d < want ? "tight" : "loose", boxes: [bx("component", k.box)], dim: dimTo(k.box, R0, s) }); }
    // L0: composed content of 20 % of its container or more, with no inner boxes: not measurable, never a silent pass
    for (const g of A.blind) if (c.groups.includes(g) && area(inter(g.box, R0) ?? [0, 0, 0, 0]) >= t0 * area(R0)) say("L0", c, { node: g.region, other: "", measured: rnd(area(inter(g.box, R0)) / area(R0)), required: t0, unit: "share", what: "composed content with no inner boxes: not measurable", boxes: [bx("component", g.box)] });
    // L2 then L1, side by side: a box 2 px or less from its container's edge, or across it, where a margin is required (not bleed); else the outermost component at the margin, or centred
    const l2sides = new Set();
    for (const s of SIDES) {
      const m = c.margins[s]; if (m <= t2 || clipsIn) continue;
      for (const k of [...all, ...c.rings.map((r) => ({ name: "focus ring", region: r.region, box: r.rect, ring: true }))]) { if (bleed.has(k.region) || byDepth(k)) continue; const d = side(k.box, R0, s); if (d <= t2 && inter(k.box, R0)) { l2sides.add(s); say("L2", c, { node: k.name, other: s, measured: d, required: m, unit: "px", what: d < 0 ? "across the edge" : "on the edge", says: `The ${Math.max(k.box[2], k.box[3]) < 24 ? Math.max(k.box[2], k.box[3]) + " px " : ""}${k.name} ${d < 0 ? "crosses" : "touches"} the ${c.id}'s ${s} edge (${d} px; ${m} asked).`, boxes: [bx("component", k.box)], dim: dimTo(k.box, R0, s) }); } }
    }
    // The alignment of each axis: declared (layout.align, containers[].align), else a centred block when the content (a bleed picture included) sits off the margin on both sides, else fill.
    // fill: both sides at the margin; left, top, right, bottom: the leading side at the margin, the trailing side at least the margin; centre: both sides at least the margin (equal sides are L7b's)
    const cs = comps.filter((k) => !bleed.has(k.region)), axisAlign = {}, declaredAxis = {};
    if (comps.length) for (const [a, b, ax] of [["left", "right", "x"], ["top", "bottom", "y"]]) { const wide = (z) => Math.min(...comps.map((k) => side(k.box, R0, z)));
      declaredAxis[ax] = c.align[ax] != null; axisAlign[ax] = c.align[ax] ?? (wide(a) > c.margins[a] + t1.side && wide(b) > c.margins[b] + t1.side ? "centre" : "fill"); if (axisAlign[ax] === "middle") axisAlign[ax] = "centre"; }
    c.axisAlign = axisAlign;
    const assumed = (ax) => `Aligned: ${axisAlign[ax]}${declaredAxis[ax] ? "" : " (inferred)"}`;
    if (cs.length) {
      const gap = Object.fromEntries(SIDES.map((s) => [s, Math.min(...cs.map((k) => side(k.box, R0, s)))])), outer = (s) => cs.reduce((a, k) => (side(k.box, R0, s) < side(a.box, R0, s) ? k : a));
      for (const [a, b, ax] of [["left", "right", "x"], ["top", "bottom", "y"]]) for (const s of [a, b]) {
        if (l2sides.has(s)) continue; const m = c.margins[s], o = OPP[s], al = axisAlign[ax], lead = al === "fill" || (START.has(al) && s === a) || (END.has(al) && s === b);
        if (lead ? Math.abs(gap[s] - m) <= t1.side : gap[s] >= m - t1.side) continue;   // the leading side at the margin; a trailing or centred side at least the margin: its slack is no finding here
        const k = outer(s), ko = outer(o), loose = gap[s] > m, says = loose && !declaredAxis[ax] && al === "fill" && Math.abs(gap[o] - c.margins[o]) <= t1.side ? `The ${k.name} component sits at the ${o} margin and leaves ${gap[s]} on the ${s}. If it is a ${o}-aligned list this is fine; if it is a row of buttons, the row should fill or centre.` : null;
        say("L1", c, { node: k.name, other: s + (s === "top" && c.strips?.length ? " (under the strip)" : ""), measured: gap[s], required: m, unit: "px", what: loose ? "loose" : "tight", align: al, assumed: assumed(ax), ...(says ? { says } : {}), opposite: gap[o], boxes: [bx("component", k.box)], dim: dimTo(k.box, R0, s), dim2: dimTo(ko.box, R0, o) });
      }
    }
    // L3: gutters between neighbours that overlap 30 % on the other axis: under the gutter (crowding), or unequal along one row or column (a declared split is 2 x G)
    const splitOf = (a, b) => (L.split ?? []).find((q) => q.between?.includes(a.region) && q.between?.includes(b.region));
    const next = (a, axis) => { let best = null, bg = Infinity; for (const b of comps) { if (b === a) continue; const g = axis === "x" ? b.box[0] - R(a.box) : b.box[1] - B(a.box); if (g < 0 || overlapShare(a.box, b.box, axis === "x" ? "y" : "x") < t3.overlap) continue; if (g < bg) { bg = g; best = b; } } return best ? { b: best, gap: bg } : null; };
    for (const axis of ["x", "y"]) {
      const link = new Map(comps.map((a) => [a, next(a, axis)]));
      const bezel = !c.group && L.stage === "bezel", Ga = axis === "y" && bezel ? t3.bezelRows : G;   // a bezel stage's rows take the field's gutter (32 is its column gutter)
      const need = (a, b) => (axis === "x" && bezel && !(mod(a) && mod(b)) ? t3.bezelItems : Ga);   // the column gutter is between two modules; other neighbours take the field's item gutter
      for (const [a, n] of link) { const want = n && need(a, n.b); if (n && n.gap < want && !splitOf(a, n.b) && !bleed.has(a.region) && !bleed.has(n.b.region)) say("L3", c, { part: "a", node: a.name, other: n.b.name, measured: n.gap, required: want, unit: "px", what: "crowding", says: a.title && n.b.title ? `The ${a.title} and ${n.b.title} plates are ${n.gap} apart; the gutter is ${want}.` : `The ${a.name} and ${n.b.name} components are ${n.gap} apart; the gutter is ${want}.`, boxes: [bx("component", a.box), bx("other", n.b.box)], dim: dimBetween(a.box, n.b.box, axis) }); }
      const heads = comps.filter((a) => link.get(a) && ![...link.values()].some((n) => n?.b === a));
      for (const h of heads) {
        const chain = []; for (let a = h, seenA = new Set(); link.get(a) && !seenA.has(a); a = link.get(a).b) { seenA.add(a); chain.push({ a, ...link.get(a) }); }
        const plain = chain.filter((q) => !splitOf(q.a, q.b) && (q.a.key === q.b.key || (mod(q.a) && mod(q.b)))); if (plain.length < 2) continue;   // like with like: a run of one kind, or modules; never a caption against a picture
        const gs = plain.map((q) => q.gap).sort((x, y) => x - y), med = gs[Math.floor((gs.length - 1) / 2)];
        if (gs[gs.length - 1] - gs[0] <= t3.tolerance) continue;
        const worst = plain.reduce((p, q) => (Math.abs(q.gap - med) > Math.abs(p.gap - med) ? q : p));
        say("L3", c, { part: "b", node: worst.a.name, other: worst.b.name, measured: worst.gap, required: med, unit: "px", what: `unequal gutters in a ${axis === "x" ? "row" : "column"}: ${plain.map((q) => q.gap).join(", ")}`, boxes: plain.flatMap((q) => [bx("component", q.a.box), bx("other", q.b.box)]), dim: dimBetween(worst.a.box, worst.b.box, axis) });
      }
      for (const q of (L.split ?? [])) { const a = comps.find((k) => k.region === q.between?.[0]), b = comps.find((k) => k.region === q.between?.[1]); if (!a || !b || !link.get(a) || link.get(a).b !== b) continue; const want = q.gutter ?? 2 * G; if (Math.abs(link.get(a).gap - want) > t3.tolerance) say("L3", c, { part: "b", node: a.name, other: b.name, measured: link.get(a).gap, required: want, unit: "px", what: "a declared split", boxes: [bx("component", a.box), bx("other", b.box)], dim: dimBetween(a.box, b.box, axis) }); }
    }
    // L4: overlap: sibling boxes that intersect, neither enclosing the other (the focus ring and marks count); a painted prop (one with a rect): any intersection, and text within 16 of it.
    // A creature or a scene prop is placed by depth: one behind another is the scene's order, so a pair with one is skipped, except two creatures at one depth (feet within `depth`) and a perch
    // (the back one's feet land `perch.min` px or more inside the front one's top `perch.share`: the totem)
    const perch = (back, front) => { const into = B(back) - front[1]; return B(back) < B(front) && into >= t4.perch.min && into <= front[3] * t4.perch.share; };
    const sib = [...all.map((k) => ({ name: k.name, box: k.box, text: k.text, mover: k.mover, prop: k.prop })), ...c.rings.map((r) => ({ name: "focus ring", box: r.rect }))];
    for (let i = 0; i < sib.length; i++) for (let j = i + 1; j < sib.length; j++) { const a = sib[i], b = sib[j], x = inter(a.box, b.box);
      if ((a.mover || a.prop || b.mover || b.prop) && !(a.mover && b.mover && (Math.abs(B(a.box) - B(b.box)) <= t4.depth || perch(a.box, b.box) || perch(b.box, a.box)))) continue;
      if (!x || x[2] < t4.intersection || x[3] < t4.intersection || encloses(a.box, b.box) || encloses(b.box, a.box)) continue; say("L4", c, { node: a.name, other: b.name, measured: Math.min(x[2], x[3]), required: 0, unit: "px", what: `they overlap ${x[2]} x ${x[3]}`, says: `The ${a.name} (${a.box[2]} x ${a.box[3]}) overlaps the ${b.name} (${b.box[2]} x ${b.box[3]}) by ${x[2]} x ${x[3]}. Is one on the other by design?`, boxes: [bx("component", a.box), bx("other", b.box), bx("overlap", x)] }); }
    for (const p of painted.filter((q) => q.rect)) for (const k of all) { const x = inter(k.box, p.rect); if (x) say("L4", c, { node: k.name, other: "painted " + p.id, measured: Math.min(x[2], x[3]), required: 0, unit: "px", what: "over a painted prop", boxes: [bx("component", k.box), bx("prop", p.rect), bx("overlap", x)] }); else if (k.text) { const d = dist(k.box, p.rect); if (d < t4.textToProp) say("L4", c, { node: k.name, other: "painted " + p.id, measured: rnd(d, 0), required: t4.textToProp, unit: "px", what: "text near a painted prop", boxes: [bx("component", k.box), bx("prop", p.rect)] }); } }
    // L5: alignment: (a) declared columns on their axis, group left edges, baselines in a group's row; (b) undeclared near-misses between neighbours and on the container's centre lines
    for (const col of L.columns ?? []) for (const k of comps.filter((q) => col.regions?.includes(q.region))) if (Number.isFinite(col.axis) && Math.abs(cx(k.box) - col.axis) > t5.axis) say("L5", c, { part: "a", node: k.name, other: "column " + col.id, measured: rnd(cx(k.box) - col.axis, 1), required: 0, unit: "px", what: "off its column's axis", boxes: [bx("component", k.box)] });
    for (const grp of L.groups ?? []) { const ks = comps.filter((q) => grp.regions?.includes(q.region)); if (ks.length < 2) continue;
      if ((grp.align ?? "left") === "left") { const x0 = Math.min(...ks.map((k) => k.box[0])); for (const k of ks) if (k.box[0] - x0 > t5.edges) say("L5", c, { part: "a", node: k.name, other: "group " + grp.id, measured: k.box[0] - x0, required: 0, unit: "px", what: "left edge off the group's", boxes: ks.map((q) => bx(q === k ? "component" : "other", q.box)) }); }
      const texts = ks.filter((k) => k.text); for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) { const a = texts[i], b = texts[j]; if (overlapShare(a.box, b.box, "y") > 0 && Math.abs(B(a.box) - B(b.box)) > t5.baselines) say("L5", c, { part: "a", node: a.name, other: b.name, measured: Math.abs(B(a.box) - B(b.box)), required: 0, unit: "px", what: "baselines in a row", boxes: [bx("component", a.box), bx("other", b.box)] }); } }
    const within = (d, [lo, hi]) => d >= lo && d <= hi, nearMiss = (a, b, what, va, vb, win) => { const d = Math.abs(va - vb); if (!within(d, win)) return;
      const ax = /\(y\)|baselines/.test(what) ? "y" : "x", guides = [{ [ax]: va }, { [ax]: vb }], dir = ax === "y" ? (va > vb ? "below" : "above") : (va > vb ? "right of" : "left of");   // both lines are drawn: the two edges, centres or baselines
      say("L5", c, { part: "b", node: a.name, other: b.name, measured: rnd(d, 1), required: 0, unit: "px", what: `almost aligned: ${what} ${rnd(va, 1)} and ${rnd(vb, 1)}`, ...(b.box ? {} : { says: `The ${a.name} sits ${rnd(d, 1)} px ${dir} the middle of the ${c.id} (${rnd(va, 1)} against ${rnd(vb, 1)}).` }), guides, boxes: [bx("component", a.box), ...(b.box ? [bx("other", b.box)] : [])] }); };
    for (let i = 0; i < comps.length; i++) for (let j = i + 1; j < comps.length; j++) {
      const a = comps[i], b = comps[j];
      if (overlapShare(a.box, b.box, "x") >= t3.overlap && gapY(a.box, b.box) >= 0) { nearMiss(a, b, "left edges", a.box[0], b.box[0], t5.nearEdges); nearMiss(a, b, "right edges", R(a.box), R(b.box), t5.nearEdges); if (!(a.box[3] < t5.line && b.box[3] < t5.line && (Math.abs(a.box[0] - b.box[0]) <= t5.edges || Math.abs(R(a.box) - R(b.box)) <= t5.edges))) nearMiss(a, b, "centres (x)", cx(a.box), cx(b.box), t5.nearCentres); }   // two lines, each under L5.line high, on one left or right edge are a stack of lines whose centres are ragged by nature
      if (overlapShare(a.box, b.box, "y") >= t3.overlap && gapX(a.box, b.box) >= 0) { nearMiss(a, b, "centres (y)", cy(a.box), cy(b.box), t5.nearCentres); if (a.text && b.text) nearMiss(a, b, "baselines", B(a.box), B(b.box), t5.nearCentres); }
    }
    for (const k of comps) { nearMiss(k, { name: c.id + " centre (x)" }, "the centre (x) and the container's", cx(k.box), cx(R0), t5.nearCentres); nearMiss(k, { name: c.id + " centre (y)" }, "the centre (y) and the container's", cy(k.box), cy(R0), t5.nearCentres); }
    // L6 and L7a: the filled area (components that are not marks, and painted props that fill), its largest empty rectangle and its centroid
    const W = R0[2], H = R0[3];
    if (W > 0 && H > 0) {
      const fill = new Uint8Array(W * H), put = (b) => { const x = inter(b, R0); if (!x) return; for (let y = x[1] - R0[1]; y < B(x) - R0[1]; y++) fill.fill(1, y * W + x[0] - R0[0], y * W + R(x) - R0[0]); };
      const weighed = comps.map((k) => ({ role: "weighed", rect: [...k.box] })), fills = [];   // what the area counts: the components that are not marks, and the painted pictures that fill
      for (const k of comps) put(k.box);
      for (const p of painted) if (p.fills && (p.region ? c.group?.members.some((n) => n.region === p.region) : p.rect)) { put(p.region ? R0 : p.rect); fills.push(p.id); weighed.push({ role: "weighed", rect: p.region ? [...R0] : [...p.rect] }); }   // a painted picture that fills (the genome, a painting) is content at every level, the container's own picture included
      const one = !fills.length && comps.length === 1;   // one component in its box, nothing painted: its place is L1's and L7b's question, not its emptiness
      let n = 0, sx = 0, sy = 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (fill[y * W + x]) { n++; sx += x; sy += y; }
      const minSide = t6.sides * G, e = largestEmpty(fill, W, H, minSide, minSide), share = e ? (e.w * e.h) / (W * H) : 0, want = c.group ? t6.pane : t6.stage;
      const counted = `${comps.length} component${comps.length === 1 ? "" : "s"}${fills.length ? ", painted: " + fills.join(", ") : ""}`;
      if (!one && e && share >= want) say("L6", c, { node: c.id, other: "", measured: rnd(share), required: want, unit: "share", what: `an empty ${e.w} x ${e.h}`, counted, boxes: [bx("empty", [R0[0] + e.x, R0[1] + e.y, e.w, e.h])] });
      if (n && !one) { const fx = R0[0] + sx / n + 0.5, fy = R0[1] + sy / n + 0.5, dx0 = (fx - cx(R0)) / (W / 2), dy0 = (fy - cy(R0)) / (H / 2);
        const dx = PINNED(axisAlign.x) ? 0 : dx0, dy = PINNED(axisAlign.y) ? 0 : dy0;   // an axis aligned to a side has its weight on that side by design
        if (Math.abs(dx) > t7a || Math.abs(dy) > t7a) say("L7", c, { part: "a", node: c.id, other: "", measured: rnd(Math.max(Math.abs(dx), Math.abs(dy))), required: t7a, unit: "share", what: `the filled area's centroid off the centre: x ${rnd(dx) >= 0 ? "+" : ""}${rnd(dx)}, y ${rnd(dy) >= 0 ? "+" : ""}${rnd(dy)}`, dx: rnd(dx), dy: rnd(dy), centroid: [rnd(fx, 1), rnd(fy, 1)], centre: [cx(R0), cy(R0)], counted, assumed: `Aligned: x ${axisAlign.x ?? "none"}, y ${axisAlign.y ?? "none"}`, boxes: weighed }); }
    }
    // L7b: slack symmetry: each declared column (centred: slack above = below; fill: on the top and floor lines), or the content as one block on a centred axis (above = below, left = right)
    const slack = (box) => ({ top: box[1] - R0[1], bottom: B(R0) - B(box), left: box[0] - R0[0], right: R(R0) - R(box) });
    const cols = (L.columns ?? []).map((col) => ({ col, ks: comps.filter((k) => col.regions?.includes(k.region)) })).filter((q) => q.ks.length);
    if (cols.length && !c.group) for (const { col, ks } of cols) { const box = ks.reduce((u, k) => union(u, k.box), null), s = slack(box);
      if (col.align === "fill") { if (Number.isFinite(L.topLine) && Math.abs(box[1] - L.topLine) > t7b) say("L7", c, { part: "b", node: "column " + col.id, other: "the top line", measured: box[1] - L.topLine, required: 0, unit: "px", what: "a fill column off the top line", boxes: [bx("component", box)] }); if (Number.isFinite(L.floorLine) && Math.abs(B(box) - L.floorLine) > t7b) say("L7", c, { part: "b", node: "column " + col.id, other: "the floor line", measured: B(box) - L.floorLine, required: 0, unit: "px", what: "a fill column off the floor line", boxes: [bx("component", box)] }); }
      else if (Math.abs(s.top - s.bottom) > t7b) say("L7", c, { part: "b", node: "column " + col.id, other: "above / below", measured: Math.abs(s.top - s.bottom), required: t7b, unit: "px", what: `slack ${s.top} above, ${s.bottom} below`, pair: [s.top, s.bottom], boxes: [bx("component", box)] }); }
    else if (comps.length) { const box = comps.reduce((u, k) => union(u, k.box), null), s = slack(box), mid = [Math.round(cx(box)), Math.round(cy(box))];   // only a centred axis wants equal sides: a filled or aligned axis is L1's
      if (axisAlign.y === "centre" && Math.abs(s.top - s.bottom) > t7b) say("L7", c, { part: "b", node: c.id, other: "above / below", measured: Math.abs(s.top - s.bottom), required: t7b, unit: "px", what: `A centred block: ${s.top} above, ${s.bottom} below; equal sides wanted (±${t7b})`, pair: [s.top, s.bottom], align: "centre", assumed: assumed("y"), boxes: [bx("component", box)], dim: [mid[0], R0[1], mid[0], box[1]], dim2: [mid[0], B(box), mid[0], B(R0)] });
      if (axisAlign.x === "centre" && Math.abs(s.left - s.right) > t7b) say("L7", c, { part: "b", node: c.id, other: "left / right", measured: Math.abs(s.left - s.right), required: t7b, unit: "px", what: `A centred block: ${s.left} left, ${s.right} right; equal sides wanted (±${t7b})`, pair: [s.left, s.right], align: "centre", assumed: assumed("x"), boxes: [bx("component", box)], dim: [R0[0], mid[1], box[0], mid[1]], dim2: [R(box), mid[1], R(R0), mid[1]] }); }
    // L8: groups: (a) a declared pair (a region that labels another, a group's members) more than `within` apart; (b) a component whose every neighbour is more than float x G away: it floats
    const groupsOfKey = (key) => c.groups.filter((g) => g.key === key);
    for (const g of c.groups) { const reg = regionOf(A.spec, g.region); const to = reg?.labels; if (!to) continue; const target = c.groups.filter((q) => q !== g && (q.region === to || q.members.some((n) => n.id === fnv(to)))); if (!target.length) continue;
      const tb = target.reduce((u, q) => union(u, q.box), null), d = rnd(dist(g.box, tb), 0); if (d > t8.label) say("L8", c, { part: "a", node: g.region, other: to, measured: d, required: t8.label, unit: "px", what: "a caption apart from what it labels", boxes: [bx("component", g.box), bx("other", tb)] }); }
    for (const grp of L.groups ?? []) { const ks = comps.filter((q) => grp.regions?.includes(q.region)); for (let i = 1; i < ks.length; i++) { const d = rnd(Math.min(...ks.slice(0, i).map((q) => dist(q.box, ks[i].box))), 0), w = grp.within ?? t8.label; if (d > w) say("L8", c, { part: "a", node: ks[i].name, other: "group " + grp.id, measured: d, required: w, unit: "px", what: "apart from its group", boxes: ks.map((q) => bx(q === ks[i] ? "component" : "other", q.box)) }); } }
    const at = (k, s) => Math.abs(side(k.box, R0, s) - c.margins[s]) <= t1.side, placed = (k) => ((at(k, "left") || at(k, "right")) && (at(k, "top") || at(k, "bottom"))) || (Math.abs(cx(k.box) - cx(R0)) <= t5.nearCentres[1] && Math.abs(cy(k.box) - cy(R0)) <= t5.nearCentres[1]);   // placed, not floating: in a corner at the margins, or centred on both axes
    if (comps.length > 1) for (const k of comps) { if (placed(k) || declared.has(k.region) || groupsOfKey(k.key).some((g) => regionOf(A.spec, g.region)?.labels)) continue; const d = Math.min(...comps.filter((q) => q !== k).map((q) => dist(k.box, q.box))); if (d > t8.float * G) say("L8", c, { part: "b", node: k.name, other: "every neighbour", measured: rnd(d, 0), required: t8.float * G, unit: "px", what: "it floats", boxes: [bx("component", k.box)] }); }
    // L10: a cut picture: (a) a window that cuts its picture's solid ink; (b) a subject picture whose solid ink touches its own box's edge; (c) a room window's edge that cuts a kept form: edgeCuts, below
    for (const g of c.groups) for (const n of g.members) {
      if (n.cut && !bleed.has(n.region) && !clips.has(n.region) && !clipsIn) say("L10", c, { part: "a", node: n.region, other: "its picture", measured: 0, required: t10.headroom + 1, unit: "px", what: "the window cuts the picture's solid ink", boxes: [bx("component", n.rect)] });
      const comp = regionOf(A.spec, n.region)?.component;
      if (n.kind === KIND.sprite && !n.cut && t10.subjects?.includes(comp) && !empty(n.solid)) for (const s of SIDES) { const d = side(n.solid, n.rect, s); if (d <= t10.headroom) say("L10", c, { part: "b", node: n.region, other: s, measured: d, required: t10.headroom + 1, unit: "px", what: "the subject's solid ink touches its picture's edge", boxes: [bx("component", n.rect), bx("other", n.solid)] }); }
    }
    // L11: a lone mark: a picture at most `size` on its larger side, with no text within `label` px on its rows and no region that labels it
    const labelled = (g) => c.groups.some((q) => { const r = regionOf(A.spec, q.region)?.labels; return r && (r === g.region || g.members.some((n) => n.id === fnv(r))); });
    for (const g of c.groups) { if (g.kind !== KIND.sprite && g.kind !== KIND.composed) continue; if (Math.max(g.box[2], g.box[3]) > t11.size || g.container) continue;
      const near = c.groups.some((q) => q.kind === KIND.text && overlapShare(q.box, g.box, "y") > 0 && gapX(q.box, g.box) <= t11.label);
      if (!near && !labelled(g)) say("L11", c, { node: g.region, other: "", measured: Math.max(g.box[2], g.box[3]), required: t11.size, unit: "px", what: "a lone mark: no text within " + t11.label + " px on its rows", says: `A small picture (${g.box[2]} x ${g.box[3]}) with no word beside it: what is it?`, boxes: [bx("component", g.box)] }); }
  }
  // L10c: a room window's edge cuts a kept form (the owner's rule of 2026-10-29 14:38 and 15:24, the collection v2 design §4): on a frame whose props say it is a room view (the fact `view` is "room", the spec's
  // layout.given), every form the window must hold whole is measured against the window's four edges. L10c has no exception, the owner's or anyone's: it is added after the exceptions are applied.
  const cuts = edgeCuts(log, spec, extra);
  // the exceptions: frame.json layout.exceptions; a finding one covers is dropped, and used names the ones in use. An exception with `when` holds only on a frame whose props fact equals it, and one with
  // `unless` only when this frame has no finding of that rule and part (the owner's L10a on a room window: cleared only through L10c's silence)
  const kept = excepted(frameSpec, screen, out.map((f) => ({ ...f, states: [state] })), true, { facts: extra?.facts ?? {}, frame: cuts }), all = [...kept, ...cuts];
  return withUsed(all, kept.used);
}
// L10c's forms on a room-view frame, in screen pixels: each resident node's solid ink box (regions `resident` and `bed.sleepers`), the bed's rect (region `bed`), each piece drawn in the view (region `room`),
// and from the props fact `regions.window.edge` ({ crop: [cx, cy], keep: [{ id, box, leaves? }], joins: [{ id, rect }], painting: [w, h] }, painting coordinates) every join and key prop, moved to the
// screen (painting − crop + the window's corner). A form whose box crosses an edge of the window (spec regions.window.rect) is a finding, measured in px beyond that edge; a key prop may cross on its
// `leaves` side only when its box reaches the painting's own edge there (the 15:24 ruling: a tree that already runs off the top of the room painting).
export function edgeCuts(log, spec, extra = {}) {
  const F = extra?.facts ?? {}, given = new Set(spec?.layout?.given ?? []); if (!given.has("view") || F.view !== "room") return [];
  const win = spec?.regions?.window?.rect; if (!Array.isArray(win) || win.length !== 4) return [];
  const E = F["regions.window.edge"] ?? {}, [cx, cy] = Array.isArray(E.crop) ? E.crop : [0, win[1]], [pw, ph] = Array.isArray(E.painting) ? E.painting : [1024, 568];
  const toScreen = (b) => [b[0] - cx + win[0], b[1] - cy + win[1], b[2], b[3]];
  const forms = [];
  for (const n of (log?.nodes ?? []).map((q, i) => parse(q, i, null))) {
    if (n.kind === KIND.sprite && (n.region === "resident" || n.region === "bed.sleepers") && !empty(n.solid)) forms.push({ id: n.region, box: n.solid });
    else if (n.kind === KIND.sprite && n.region === "bed") forms.push({ id: "bed", box: n.rect });
    else if (n.kind === KIND.sprite && n.region === "room") forms.push({ id: "room piece", box: n.rect });
  }
  const formOf = (q) => (Array.isArray(q?.form) ? q.form : Array.isArray(q?.rect) ? q.rect : Array.isArray(q?.box) ? q.box : null);   // the props name a form's painting box `form` (a fact, never drawn from)
  for (const j of E.joins ?? []) { const f = formOf(j); if (f) forms.push({ id: j.id, box: toScreen(f) }); }
  for (const k of E.keep ?? []) { const f = formOf(k); if (f) forms.push({ id: k.id, box: toScreen(f), painting: f, leaves: k.leaves ?? null }); }
  const reaches = (b, s) => (s === "left" ? b[0] <= 0 : s === "top" ? b[1] <= 0 : s === "right" ? b[0] + b[2] >= pw : b[1] + b[3] >= ph);
  const out = [];
  for (const f of forms) {
    const over = { left: win[0] - f.box[0], top: win[1] - f.box[1], right: R(f.box) - R(win), bottom: B(f.box) - B(win) };
    for (const s of SIDES) { if (over[s] <= 0 || !inter(f.box, win)) continue; if (f.leaves === s && f.painting && reaches(f.painting, s)) continue;
      out.push({ rule: "L10", part: "c", node: f.id, other: s, measured: over[s], required: 0, unit: "px", what: `the window edge cuts ${f.id}`, says: `The window's ${s} edge cuts ${f.id} by ${over[s]} px (the owner's rule: the window edge never cuts through a mibi, the nest or a key prop).`, container: { id: "window", rect: [...win] }, boxes: [{ role: "component", rect: [...f.box] }, { role: "other", rect: [...win] }] }); }
  }
  return out;
}
// The text fit (the check after L11, reported beside the rules): a text's ink box (its advance x cap top to baseline) against the box it is drawn in. The box is the plate under it: the last node drawn
// before the text that holds the text's centre and hides what it covers (a rect, a nine-slice, a picture painted edge to edge), at least 24 x 14 and under 40 % of the screen (the stage's ground is
// not a plate; a pane drawn over the plate under the text, a decision panel over its veiled screen, is the text's plate); a focus ring, a clip and composed content (a window that clips by design) are not. A text that is not drawn on a plate has no box and is not measured. One entry for each side the
// text crosses: { node: "<region> \"<text>\"", container: { id, rect }, side, measured, required: 0 } (measured: the px the text's ink lies outside the plate on that side, always above 0).
export function overruns(log) {
  const textOf = new Map(); for (const t of log?.type ?? []) if (t.text && t.role !== "shadow") textOf.set(`${t.region}|${t.x}|${t.w}`, t);
  const nodes = (log?.nodes ?? []).map((n, i) => parse(n, i, n[1] === KIND.text ? textOf.get(`${n[3]}|${n[4]}|${n[6]}`) : null)), out = [];
  for (const t of nodes) {
    if (t.kind !== KIND.text || !t.text) continue;
    const [x, y, w, h] = t.solid, cx = x + w / 2, cy = y + h / 2; let plate = null;
    for (const b of nodes) {
      if (b.order >= t.order || b.ring || !(b.kind === KIND.rect || b.kind === KIND.nine || (b.kind === KIND.sprite && same(b.solid, b.rect)))) continue;
      const [bx, by, bw, bh] = b.rect; if (bw < 24 || bh < 14) continue;
      const inside = cx >= bx && cx < bx + bw && cy >= by && cy < by + bh;
      // a pane over 40 % of the screen is a plate only when it is drawn over what was under the text (a panel over the screen it veils: the title is on the panel, not on the glass beneath); one as wide as the screen (the stage's ground, a veil) is none, and hides the plates it covers
      if (bw * bh >= 0.4 * 1024 * 600) { if (inside) plate = bw >= 1024 ? null : b; continue; }
      if (inside) plate = b;
    }
    if (!plate) continue;
    const [bx, by, bw, bh] = plate.rect, over = { left: bx - x, top: by - y, right: x + w - (bx + bw), bottom: y + h - (by + bh) };
    for (const side of SIDES) if (over[side] > 0) out.push({ rule: "text fit", node: `${t.region} "${t.text}"`, other: side, container: { id: plate.region, rect: plate.rect }, side, measured: over[side], required: 0, unit: "px" });
  }
  return out;
}
// The exceptions frame.json layout.exceptions lists, applied to findings of one screen (each with its states): a finding an exception covers (rule, screen, node, other when named, a state when named)
// is dropped, and the list's `used` names the exceptions in use. findings() and the slots of slotFindings() go through it.
export function excepted(frameSpec, screen, list, oneState = false, ctx = {}) {
  const ex = frameSpec?.layout?.exceptions ?? [], used = new Set();
  const holds = (x) => (!x.when || Object.entries(x.when).every(([k, v]) => ctx.facts?.[k] === v)) && (!x.unless || !(ctx.frame ?? []).some((f) => f.rule === x.unless.rule && (x.unless.part == null || f.part === x.unless.part)));   // `when` a props fact of this frame; `unless` a finding of this frame
  const kept = list.filter((f) => { const e = ex.findIndex((x) => x.rule === f.rule && x.screen === screen && (!x.state || (f.states ?? []).includes(x.state)) && x.node === f.node && (x.other == null || [x.other].flat().includes(f.other)) && (x.part == null || x.part === f.part) && holds(x)); if (e < 0) return true; used.add(e); return false; });
  return withUsed(oneState ? kept.map(({ states, ...f }) => f) : kept, [...used].map((i) => ex[i]));
}
const withUsed = (list, used) => { Object.defineProperty(list, "used", { value: used }); return list; };   // the exceptions in use (not enumerable: the result compares as the list of findings)
// the dimension line from a box to its container's edge on side s, and between two boxes along an axis: [x0, y0, x1, y1]
function dimTo(b, c, s) { const mx = Math.round(cx(b)), my = Math.round(cy(b)); return s === "left" ? [c[0], my, b[0], my] : s === "right" ? [R(b), my, R(c), my] : s === "top" ? [mx, c[1], mx, b[1]] : [mx, B(b), mx, B(c)]; }
function dimBetween(a, b, axis) { if (axis === "x") { const y = Math.round((Math.max(a[1], b[1]) + Math.min(B(a), B(b))) / 2); return [R(a), y, b[0], y]; } const x = Math.round((Math.max(a[0], b[0]) + Math.min(R(a), R(b))) / 2); return [x, B(a), x, b[1]]; }

// L9, across the states of one screen: a region the spec lists as a slot keeps one box in every golden state (C8). records: [{ state, log, spec, frameSpec, extra }]; the findings name the states that differ.
export function slotFindings(records, screen) {
  const out = [], boxesOf = new Map();
  for (const r of records) for (const s of r.spec?.layout?.slots ?? []) { const ks = analyse(r.log, r.spec, r.frameSpec, r.extra).containers.flatMap((c) => c.components.filter((k) => k.region === s)); const box = ks.reduce((u, k) => union(u, k.box), null); if (!boxesOf.has(s)) boxesOf.set(s, []); boxesOf.get(s).push({ state: r.state, box }); }
  for (const [s, list] of boxesOf) { const first = list.find((q) => q.box); if (!first) continue; const off = list.filter((q) => !q.box || !same(q.box, first.box)); if (off.length) out.push({ rule: "L9", node: s, other: "its box in " + first.state, measured: off.length, required: 0, unit: "states", what: "a slot that moves or empties: " + off.map((q) => q.state).join(", "), states: off.map((q) => q.state), container: { id: "opening", rect: records[0]?.spec?.layout?.opening ?? [0, 0, 1024, 600] }, boxes: [{ role: "component", rect: first.box }, ...off.filter((q) => q.box).map((q) => ({ role: "other", rect: q.box }))] }); }
  return out;
}

// Identical findings across states (rule, node, other, measured) are one, with the states listed.
export function group(perState) {
  const by = new Map();
  for (const { state, findings: fs } of perState) for (const f of fs) { const k = [f.rule, f.part ?? "", f.node, f.other, JSON.stringify(f.measured), f.container?.id].join("|"); if (!by.has(k)) by.set(k, { ...f, states: [] }); const g = by.get(k); if (!g.states.includes(state)) g.states.push(state); }
  return [...by.values()];
}
// The exceptions frame.json lists that no finding used across a whole run (each must be in use, so the list cannot rot): pass every result of findings().
export function unusedExceptions(frameSpec, results) { const ex = frameSpec?.layout?.exceptions ?? [], used = new Set(results.flatMap((r) => r.used ?? [])); return ex.filter((e) => !used.has(e)); }
// Report or fail: a finding of a rule frame.json layout.enforced lists for its screen ("all": every rule) fails the run.
export function enforcedFinding(frameSpec, screen, f) { const e = frameSpec?.layout?.enforced?.[screen]; return e === "all" || (Array.isArray(e) && e.includes(f.rule)); }
