// The rule interpreter: maps drawn by hand as rules (an input picture, an output picture) are applied to a working map. Only the 1.9+ rule style is read (no `regions` layers).
// Rule maps are open files (.tmj, JSON; tilesets as .tsj or inline), loaded as data. Pure and deterministic: every random pick (which output, whether a rule with a probability fires) is keyed by the WORLD tile the
// match sits on and the rule, never by a running generator, so the same spot gets the same answer in every place and on every device. Nothing here draws.
//
// Rule map: tile layers named input[not][index]_<target> and output[index]_<target>; every 8-connected group of non-empty cells across them is one rule. Special tiles by their MatchType property:
// Empty, Ignore, NonEmpty, Other, Negate. Map and rule properties: MatchInOrder, MatchOutsideMap, OverflowBorder, WrapBorder, and per rule (rectangles on an object layer `rule_options`, or on the map as defaults)
// ModX, ModY, OffsetX, OffsetY, Probability, Disabled, NoOverlappingOutput; layer properties AutoEmpty / StrictEmpty, Ignore{Horizontal,Vertical,Diagonal}Flip, Probability.
import { hash32 } from './dualgrid.mjs';

const FLAG_H = 0x80000000, FLAG_V = 0x40000000, FLAG_D = 0x20000000, FLAGS = 0xE0000000;
const SPECIAL = new Set(['Empty', 'Ignore', 'NonEmpty', 'Other', 'Negate']);

// ---- tiles: one registry per run; a tile is its tileset's name and its id there, so a rule map and a working map that use the same tileset agree on every tile whatever their own numbering
export class Tiles {
  constructor() { this.byKey = new Map(); this.info = [null]; this.byClass = new Map(); }
  add(set, localId, props = {}, cls = '') {
    const key = set + '#' + localId; let n = this.byKey.get(key);
    if (n === undefined) { n = this.info.length; this.byKey.set(key, n); this.info.push({ key, props: {}, cls: '', special: null }); }
    const inf = this.info[n]; Object.assign(inf.props, props); if (cls) { inf.cls = cls; this.byClass.set(set + ':' + cls, n); }
    if (props.MatchType && SPECIAL.has(props.MatchType)) inf.special = props.MatchType;
    return n;
  }
  // a tileset (the JSON form): its tiles' classes and properties are read once
  addSet(ts, name = ts.name) {
    for (let id = 0; id < (ts.tilecount || 0); id++) this.add(name, id);
    for (const t of ts.tiles || []) {
      const props = {}; for (const p of t.properties || []) props[p.name] = p.value;
      this.add(name, t.id, props, t.class || t.type || '');
    }
  }
  named(set, cls) { const n = this.byClass.get(set + ':' + cls); if (n === undefined) throw new Error(`automap: tileset ${set} has no tile of class ${cls}`); return n; }
  prop(canon, name) { const inf = this.info[canon & ~FLAGS]; return inf ? inf.props[name] : undefined; }
  clsOf(canon) { const inf = this.info[canon & ~FLAGS]; return inf ? inf.cls : ''; }
}

const propsOf = (list) => { const o = {}; for (const p of list || []) o[p.name] = p.value; return o; };
const truthy = (v) => v === true || v === 'true';

// A map file (the JSON form) bound to a registry: layers' gids become registry tiles (flip bits kept). io.json(path) reads a tileset file named by a map.
export function bindMap(map, tiles, io = {}) {
  if (map.infinite) throw new Error('automap: infinite maps are not supported');
  const sets = [];
  for (const e of map.tilesets || []) {
    const ts = e.source ? io.json(e.source) : e, name = ts.name || e.source;
    tiles.addSet(ts, name); sets.push({ first: e.firstgid, name });
  }
  sets.sort((a, b) => b.first - a.first);
  const canon = (gid) => {
    if (!gid) return 0; const flags = (gid & FLAGS) >>> 0, g = gid & ~FLAGS, s = sets.find((t) => t.first <= g);
    return ((tiles.add(s.name, g - s.first) | 0) | flags) >>> 0;
  };
  const layers = [], objects = [], walk = (list, prefix) => {
    for (const l of list) {
      if (l.type === 'group') walk(l.layers || [], prefix);
      else if (l.type === 'tilelayer') layers.push({ name: l.name, props: propsOf(l.properties), data: Uint32Array.from(l.data, canon), width: l.width, height: l.height });
      else if (l.type === 'objectgroup') objects.push({ name: l.name, objects: l.objects || [] });
    }
  };
  walk(map.layers || [], '');
  return { width: map.width, height: map.height, tw: map.tilewidth, th: map.tileheight, props: propsOf(map.properties), layers, objects, name: map.name || '' };
}

// A working map for the code to fill: { width, height, origin: { x, y } (the world tile of cell 0,0), layers: Map(name -> Uint32Array of registry tiles) }
export const workMap = (width, height, origin = { x: 0, y: 0 }) => ({ width, height, origin, layers: new Map() });
export const workFrom = (bound, origin = { x: 0, y: 0 }) => { const w = workMap(bound.width, bound.height, origin); for (const l of bound.layers) if (!w.layers.has(l.name)) w.layers.set(l.name, l.data.slice()); return w; };

// ---- reading the rules out of a bound rule map
const INPUT = /^input(not)?([^_]*)_(.+)$/i, OUTPUT = /^output([^_]*)_(.+)$/i;
const OPTION_KEYS = ['ModX', 'ModY', 'OffsetX', 'OffsetY', 'Probability', 'Disabled', 'NoOverlappingOutput'];

export function parseRules(bound, tiles) {
  const inL = [], outL = [];
  for (const l of bound.layers) {
    let m;
    if ((m = INPUT.exec(l.name))) inL.push({ not: !!m[1], index: m[2], target: m[3], l });
    else if ((m = OUTPUT.exec(l.name))) outL.push({ index: m[1], target: m[2], l });
    else if (/^regions/i.test(l.name)) throw new Error('automap: regions layers (the old rule style) are not supported');
  }
  const W = bound.width, H = bound.height, seen = new Uint8Array(W * H), used = new Uint8Array(W * H);
  for (const { l } of [...inL, ...outL]) for (let i = 0; i < W * H; i++) if (l.data[i]) used[i] = 1;
  const defaults = {}; for (const k of OPTION_KEYS) if (bound.props[k] !== undefined) defaults[k] = bound.props[k];
  const rects = []; for (const g of bound.objects) if (g.name === 'rule_options') for (const o of g.objects) if (o.width && o.height) rects.push({ x: o.x / bound.tw, y: o.y / bound.th, w: o.width / bound.tw, h: o.height / bound.th, props: propsOf(o.properties) });
  const rules = [];
  for (let s = 0; s < W * H; s++) {   // top to bottom, left to right: the rules' own order
    if (!used[s] || seen[s]) continue;
    const cells = [], stack = [s]; seen[s] = 1;
    while (stack.length) {
      const c = stack.pop(); cells.push(c); const cx = c % W, cy = (c / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const n = ny * W + nx; if (used[n] && !seen[n]) { seen[n] = 1; stack.push(n); }
      }
    }
    rules.push(buildRule(rules.length, cells, W, inL, outL, rects, defaults, tiles));
  }
  return { rules, order: truthy(bound.props.MatchInOrder), outside: bound.props, name: bound.name };
}

function buildRule(id, cellsRaw, W, inL, outL, rects, defaults, tiles) {
  const xs = cellsRaw.map((c) => c % W), ys = cellsRaw.map((c) => (c / W) | 0);
  const x0 = Math.min(...xs), y0 = Math.min(...ys), x1 = Math.max(...xs), y1 = Math.max(...ys);
  const rel = (c) => [(c % W) - x0, ((c / W) | 0) - y0];
  const opts = { ...defaults };
  for (const r of rects) if (x0 >= r.x && y0 >= r.y && x1 + 1 <= r.x + r.w && y1 + 1 <= r.y + r.h) Object.assign(opts, r.props);
  // the explicit tiles the rule uses on each target ("Other" is every tile that is none of them), and whether Empty is asked for anywhere in it
  const usedBy = new Map(); const usesEmpty = new Set(); let ix0 = 1e9, iy0 = 1e9, ix1 = -1e9, iy1 = -1e9;
  const sets = new Map();   // index -> Map(cell -> Map(target -> { yes: [], no: [], negate }))
  for (const { not, index, target, l } of inL) {
    const mask = ~((truthy(l.props.IgnoreHorizontalFlip) ? FLAG_H : 0) | (truthy(l.props.IgnoreVerticalFlip) ? FLAG_V : 0) | (truthy(l.props.IgnoreDiagonalFlip) ? FLAG_D : 0)) >>> 0;
    if (truthy(l.props.AutoEmpty) || truthy(l.props.StrictEmpty)) throw new Error('automap: AutoEmpty / StrictEmpty is not supported; ask for an empty cell with the Empty tile');
    for (const c of cellsRaw) {
      const t = l.data[c], inf = t ? tiles.info[t & ~FLAGS] : null, sp = inf && inf.special;
      if (!t) continue;
      { const [rx, ry] = rel(c); ix0 = Math.min(ix0, rx); iy0 = Math.min(iy0, ry); ix1 = Math.max(ix1, rx); iy1 = Math.max(iy1, ry); }
      if (sp === 'Ignore') continue;
      if (!sets.has(index)) sets.set(index, new Map());
      const cellMap = sets.get(index), k = rel(c).join(','); if (!cellMap.has(k)) cellMap.set(k, new Map());
      const byT = cellMap.get(k); if (!byT.has(target)) byT.set(target, { yes: [], no: [], negate: false });
      const e = byT.get(target);
      if (sp === 'Negate') { e.negate = true; continue; }
      const item = sp ? { sp } : { v: t, mask };
      if (item.sp === 'Empty') usesEmpty.add(target);   // only on the layer the Other tile reads
      // Other is none of the tiles the rule asks for; the tiles of an inputnot layer are not among them
      if (item.v !== undefined && !not) { if (!usedBy.has(target)) usedBy.set(target, []); usedBy.get(target).push(item); }
      (not ? e.no : e.yes).push(item);
    }
  }
  const outs = new Map(), always = [];
  for (const { index, target, l } of outL) {
    const cells = []; for (const c of cellsRaw) if (l.data[c]) { const t = l.data[c], sp = tiles.info[t & ~FLAGS].special; if (sp !== 'Ignore') cells.push([...rel(c), sp === 'Empty' ? 0 : t]); }
    const rec = { target, cells, prob: l.props.Probability === undefined ? 1 : Number(l.props.Probability), any: cellsRaw.some((c) => l.data[c]), extra: l.props };
    if (index === '') always.push(rec); else { if (!outs.has(index)) outs.set(index, []); outs.get(index).push(rec); }
  }
  // an output index with nothing in it for this rule is never chosen (the Ignore tile counts as something); the weight is the top-most layer's Probability
  const choices = []; for (const [index, recs] of outs) if (recs.some((r) => r.any)) choices.push({ index, recs, weight: recs[recs.length - 1].prob });
  if (ix0 > ix1) { ix0 = 0; iy0 = 0; ix1 = x1 - x0; iy1 = y1 - y0; }
  return { id, w: x1 - x0 + 1, h: y1 - y0 + 1, ix0, iy0, ix1, iy1, sets, usedBy, usesEmpty, choices, always, opts, cells: cellsRaw.map(rel) };
}

// ---- matching
function cellOk(cond, tile, rule, target) {
  let yes = cond.yes, no = cond.no; if (cond.negate) [yes, no] = [no, yes];
  const hit = (it) => {
    if (it.sp === 'Empty') return tile === 0;
    if (it.sp === 'NonEmpty') return tile !== 0;
    if (it.sp === 'Other') { if (tile === 0) return !rule.usesEmpty.has(target); for (const u of rule.usedBy.get(target) || []) if (((u.v ^ tile) & u.mask) === 0) return false; return true; }
    return tile !== 0 && ((it.v ^ tile) & it.mask) === 0;
  };
  return (yes.length === 0 || yes.some(hit)) && !no.some(hit);
}

// one rule at one place: does any of its index sets hold?
function matchAt(rule, at, ox, oy) {
  if (rule.sets.size === 0) return true;
  for (const set of rule.sets.values()) {
    let ok = true;
    for (const [k, byT] of set) {
      const [dx, dy] = k.split(',').map(Number);
      for (const [target, cond] of byT) if (!cellOk(cond, at(target, ox + dx, oy + dy), rule, target)) { ok = false; break; }
      if (!ok) break;
    }
    if (ok) return true;
  }
  return false;
}

// Apply one bound-and-parsed rule map ({ rules, order, outside }) to a working map in place. opts: { seed (string; the random picks' key), tiles }
export function applyRules(parsed, work, opts = {}) {
  const { width: W, height: H } = work, o = work.origin || { x: 0, y: 0 }, seed = opts.seed === undefined ? '' : String(opts.seed), P = parsed.outside;
  const wrap = truthy(P.WrapBorder), overflow = truthy(P.OverflowBorder) && !wrap, outsideOk = truthy(P.MatchOutsideMap) || wrap || overflow;
  const at = (target, x, y) => {
    const layer = work.layers.get(target); if (!layer) return 0;
    if (x < 0 || y < 0 || x >= W || y >= H) {
      if (wrap) { x = ((x % W) + W) % W; y = ((y % H) + H) % H; } else if (overflow) { x = Math.max(0, Math.min(W - 1, x)); y = Math.max(0, Math.min(H - 1, y)); } else return 0;
    }
    return layer[y * W + x];
  };
  const rnd = (rule, wx, wy, salt) => hash32(`${seed}/${parsed.name}/${rule.id}/${salt}`, wx, wy) / 4294967296;
  const written = new Map();   // rule id -> Set of "target:cell" it has output (NoOverlappingOutput)
  const matchesOf = (rule) => {
    const res = [], mx = Number(rule.opts.ModX || 1), my = Number(rule.opts.ModY || 1), ofx = Number(rule.opts.OffsetX || 0), ofy = Number(rule.opts.OffsetY || 0);
    if (truthy(rule.opts.Disabled) || Number(rule.opts.Probability === undefined ? 1 : rule.opts.Probability) <= 0) return res;
    const { ix0, iy0, ix1, iy1 } = rule;   // the input region's box inside the rule's own: the match is placed so that it lies in the map (or, outside-matching, meets it)
    const xa = outsideOk ? -ix1 : -ix0, xb = outsideOk ? W - 1 - ix0 : W - 1 - ix1, ya = outsideOk ? -iy1 : -iy0, yb = outsideOk ? H - 1 - iy0 : H - 1 - iy1;
    for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) {
      const wx = o.x + x, wy = o.y + y;
      if (mx > 1 && (((wx - ofx) % mx) + mx) % mx !== 0) continue;
      if (my > 1 && (((wy - ofy) % my) + my) % my !== 0) continue;
      res.push({ rule, x, y });
    }
    return res;
  };
  const place = (m) => {
    const { rule, x, y } = m, wx = o.x + x, wy = o.y + y;
    const p = rule.opts.Probability === undefined ? 1 : Number(rule.opts.Probability);
    if (p < 1 && rnd(rule, wx, wy, 'p') >= p) return;
    let chosen = null;
    if (rule.choices.length) {
      const total = rule.choices.reduce((a, c) => a + Math.max(0, c.weight), 0); if (total <= 0) return;
      let r = rnd(rule, wx, wy, 'o') * total; chosen = rule.choices[rule.choices.length - 1];
      for (const c of rule.choices) { const w = Math.max(0, c.weight); if (r < w) { chosen = c; break; } r -= w; }
    }
    const recs = [...rule.always, ...(chosen ? chosen.recs : [])], cells = [];
    for (const rec of recs) for (const [dx, dy, t] of rec.cells) { let cx = x + dx, cy = y + dy; if (wrap) { cx = ((cx % W) + W) % W; cy = ((cy % H) + H) % H; } if (t >= 0 && cx >= 0 && cy >= 0 && cx < W && cy < H) cells.push([rec.target, cy * W + cx, t]); }
    if (truthy(rule.opts.NoOverlappingOutput)) {
      const set = written.get(rule.id) || new Set(); written.set(rule.id, set);
      if (cells.some(([tg, i]) => set.has(tg + ':' + i))) return;
      for (const [tg, i] of cells) set.add(tg + ':' + i);
    }
    for (const [tg, i, t] of cells) { let layer = work.layers.get(tg); if (!layer) { layer = new Uint32Array(W * H); work.layers.set(tg, layer); } layer[i] = t; }
  };
  const find = (rule, m) => matchAt(rule, at, m.x, m.y);
  if (parsed.order) {
    for (const rule of parsed.rules) for (const m of matchesOf(rule)) if (find(rule, m)) place(m);
  } else {
    const hits = [];
    for (const rule of parsed.rules) for (const m of matchesOf(rule)) if (find(rule, m)) hits.push(m);
    hits.sort((a, b) => a.rule.id - b.rule.id || a.y - b.y || a.x - b.x);
    for (const m of hits) place(m);
  }
  return work;
}

// A rules list: lines naming rule maps or other lists, `[filter]` lines (`*` wildcard) restricting what follows to maps of matching names, `#` and `//` comments. io.text(path), io.json(path), io.resolve(from, rel).
// Returns the rule maps in order, parsed: [{ rules, order, outside, name }]
export function loadRuleList(path, io, tiles, mapName = '') {
  const out = [];
  const walk = (file) => {
    let filter = null;
    for (const raw of io.text(file).split(/\r?\n/)) {
      const line = raw.trim(); if (!line || line.startsWith('#') || line.startsWith('//')) continue;
      if (line.startsWith('[') && line.endsWith(']')) { const pat = line.slice(1, -1); filter = pat === '*' ? null : new RegExp('^' + pat.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$'); continue; }
      if (filter && !filter.test(mapName)) continue;
      const target = io.resolve(file, line);
      if (/\.txt$/i.test(target)) walk(target); else out.push(loadRuleMap(target, io, tiles));
    }
  };
  walk(path);
  return out;
}
export const loadRuleMap = (path, io, tiles) => {
  const raw = io.json(path), bound = bindMap(raw, tiles, { json: (s) => io.json(io.resolve(path, s)) });
  bound.name = bound.name || path.split('/').pop();
  return parseRules(bound, tiles);
};

// Run a whole list in order over a working map
export const automap = (list, work, opts) => { for (const parsed of list) applyRules(parsed, work, opts); return work; };
