// The Library specimen generator (specimen3, v3 rules), ported to the Station's logic process (build spec 4.2; the architect's runtime ruling).
// The code is specimen3.js as the art director signed it, with its logic and parameters unchanged; the only edits are marked "port:" -- the canvas is paint2d.mjs (a pure-JS subset of Canvas 2D),
// the two canvases `finish` makes come from createCanvas, `drawForm` reports each bead's centre, and the harness at the foot (the art director's, build spec 4.2) makes the picture, its bead centres and its four breathing levels.
// Bump RECIPE whenever this file changes what it draws: it is in the picture's cache id.
import { createCanvas } from './paint2d.mjs';

// Library specimen generator, v3 rules (frame-driven body). Home's Library module is this render (build spec section 4.2).
// Library specimen generator. Pure function of (species frame, discovery state).
// Rule: locked loci = fixed urchin core (Fibonacci sphere, never changes);
// each trait = its own open-locus bundle from the core to an umbel point; each look slot =
// one ray of that trait's umbel; found looks fill slots in discovery order, grow longer the
// earlier they were found and seed (pappus); unknown slots stay dormant open rings.
// Every line obeys one twist: angle += K * radius.

const TAU = Math.PI * 2, GOLD = Math.PI * (3 - Math.sqrt(5));
// Station palette (prototypes/ui/palettes/station.json), used by role.
const PAL = { bone: '#f1ebdf', fog: '#c6c4d8', mist: '#8d8aa6', frost: '#eaeff6', frostD: '#cbd5e2', frostS: '#a9b5c8',
  gold: '#d89b14', yellow: '#ffd441', pine: '#173b2d', soil: '#4b3023', ink: '#1a1725' };
// ground: a deep moss night, mixed from pine, soil and ink, a module of its own
const BG = [24, 32, 28];
const ACCENT = PAL.gold;                   // new here: the four-point glint (gold, lit centre yellow)
const CH_HUE = { coat: '#bf9157', face: '#98d85c', movement: '#e6c98c', stamina: '#5bb9f3',
                 shape: '#c9b3d9', 'legs-tail': '#d9c38a', character: '#e59aa5', glow: '#e8e08a', charge: '#9fd6d0' };
// Look colours: the pigments are the catalogue's own; other traits use their chapter's ramp.
const PIGMENT = { charcoal: '#465459', russet: '#ae674d', ash: '#8e98a4', coral: '#e98268', raspberry: '#d95688', marigold: '#e8b83f',
  plum: '#a967b8', lagoon: '#269fa5', jade: '#38a878', periwinkle: '#8b7dd8', cobalt: '#4d7ed4', cream: '#dfd2ae', butter: '#fff0b8',
  ice: '#d9ecf5', 'milk-mint': '#d8f1d4', peach: '#ffd7c5', slate: '#718489' };   // catalogue pigment values
const RAMPS = {
  markings: ['#f5e6c4', '#e6c98c', '#bf9157', '#d9b27a'],      // paper, sand, clay
  crown: ['#ffd4bf', '#98d85c'],                                // blush, sprout
  'eye-rings': ['#a87bf3', '#bab6d4', '#dbc0ff'],               // lilac, rockL, lavender
  drive: ['#bf9157', '#e6c98c', '#ffa67c'],                     // clay, sand, peach
  efficiency: ['#3084d8', '#5bb9f3', '#a9e6ff'],                // river, sky, ice
};

const hex2 = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => { const A = hex2(a), B = hex2(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const rgba = (h, a) => { const [r, g, b] = hex2(h); return `rgba(${r},${g},${b},${a})`; };
const smooth = (t) => t * t * (3 - 2 * t);

export function lookColours(trait, look, idx) {
  const parts = look.split(' and ');
  if (look === 'two side by side' && trait.pod) return trait.pod;              // the species' own pair
  if (parts.every((p) => PIGMENT[p])) return parts.map((p) => PIGMENT[p]);
  const hue = CH_HUE[trait.chapterId] || '#cccccc';
  const ramp = (trait.sid === 'S01' || !trait.sid) && RAMPS[trait.id] ? RAMPS[trait.id] : [mix(hue, '#000000', 0.12), mix(hue, PAL.bone, 0.3), mix(hue, PAL.bone, 0.6)];
  return [ramp[idx % ramp.length]];
}

// ---- model: the frame's skeleton + the player's growth -------------------------------------
export function model(frame, state) {
  const sid = frame.species.id;
  const found = (state[sid]) || {};
  const fresh = (state.newSince && state.newSince[sid]) || {};
  const legacy = sid === 'S01' ? { markings: ['plain'] } : {};   // legacy looks (engineer's ruling): shown once found, never a slot
  const chapters = frame.chapters.map((ch) => ({
    id: ch.id, name: ch.name, sealed: ch.sealed,
    traits: ch.traits.map((t) => {
      const got = (found[t.id] || []).filter((l) => t.looks.includes(l) && !ch.sealed);
      const slotsLooks = t.looks.filter((l) => !(legacy[t.id] || []).includes(l));
      const extra = got.filter((l) => !slotsLooks.includes(l));      // a found legacy look
      const nSlots = slotsLooks.length + extra.length;
      // Slots fill in discovery order, so an unknown slot's position never names its look.
      const slots = [];
      got.forEach((l, rank) => slots.push({ found: true, look: l, rank, idx: t.looks.indexOf(l),
        fresh: (fresh[t.id] || []).includes(l) }));
      while (slots.length < nSlots) slots.push({ found: false });
      return { id: t.id, name: t.name, loci: t.loci, nature: t.nature, slots, nFound: got.length, chapterId: ch.id, sid, pod: (frame.pod?.colourPair || []).map((c) => c.hex) };
    }),
  }));
  const locked = frame.loci.filter((l) => l.kind === 'locked');
  // body from the frame's plan key: regions | arrangement | symmetry | ... | covering
  const pk = (frame.plan?.key || 'one|serial|bilateral').split('|');
  const regions = { one: 1, two: 2, three: 3 }[pk[0]] || 1;
  const share = frame.counts.locked / (frame.counts.locked + frame.counts.open);
  const body = { regions, fan: pk[1] === 'fan', radial: pk[2] === 'radial', covering: pk[pk.length - 1] || 'skin',
    // twist from the frame: the locked share winds the form (Loika 43/50 -> the approved 0.0036)
    twist: 0.0036 * (2 * share - 0.72), share };
  return { sid, name: frame.species.name, chapters, locked, body };
}

// ---- layout: angles and radii in "panel units" (form radius ~150) ---------------------------
let K = 0.0036;              // twist, radians per unit radius (set per species, per side)
let UMB = 94;                // umbel radius of the trait being drawn
const R = { core: 15, open0: 12, ball: 74, umbel: 94, dormant: 113, grownMin: 129, grownMax: 149, potential: 151 };

export function layout(m, rot = null) {
  // chapters: equal sectors in ring order, so n chapters read n-fold; the first is centred on the left
  const n = m.chapters.length, gapCh = 0.20, gapTr = 0.07, sector = TAU / n;
  if (rot === null) rot = Math.PI - sector / 2;
  const b = m.body, Ls = b.radial || b.fan ? 0 : (b.regions - 1) * 20;    // spine half-length
  m.extent = 158 + Ls + (b.fan ? 24 : 0);
  m.chapters.forEach((ch, ci) => {
    const a0 = rot + ci * sector + gapCh / 2, span = sector - gapCh;
    const nS = ch.traits.reduce((q, t) => q + t.slots.length, 0);
    const per = (span - gapTr * (ch.traits.length - 1)) / nS;             // looks per trait set the fan width
    ch.a0 = a0; ch.a1 = a0 + span; ch.mid = a0 + span / 2;
    // root: bilateral bodies root each chapter on the spine at the height it faces; fans on the disc rim
    const c = Math.cos(ch.mid), sn = Math.sin(ch.mid);
    ch.root = b.fan ? [24 * c, 24 * sn] : [0, Ls * sn];
    ch.side = b.radial || b.fan ? 1 : (c < -1e-6 ? -1 : 1);                 // bilateral: mirrored twist
    let a = a0;
    ch.traits.forEach((t, ti) => {
      if (ti) a += gapTr;
      t.a0 = a; t.a1 = a + per * t.slots.length; t.axis = (t.a0 + t.a1) / 2;
      t.umbel = 94 * (1 - 0.13 * (ti % 2));                                // traits cluster: staggered umbels
      const k = t.slots.length, order = [];
      for (let q = 0; q < k; q++) order.push(q);
      order.sort((p, q) => Math.abs(p - (k - 1) / 2) - Math.abs(q - (k - 1) / 2) || p - q);
      t.slots.forEach((s, q) => { s.ang = t.a0 + per * (order[q] + 0.5); s.pitch = per; });
      t.slots.forEach((s) => { s.r = s.found ? R.grownMin + (R.grownMax - R.grownMin) * (1 - s.rank / Math.max(1, k - 1)) : R.dormant; });
      a = t.a1;
    });
  });
  return m;
}

// ---- drawing --------------------------------------------------------------------------------
function P(g, r, ang) { const t = ang + K * r; return [g.cx + g.s * r * Math.cos(t), g.cy + g.s * r * Math.sin(t)]; }

function polarPath(ctx, g, r0, a0, r1, a1, off = 0, steps = 28) {
  // leaves and arrives radially; angle eased; perpendicular spindle offset 'off' (units) * sin(pi t)
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, r = r0 + (r1 - r0) * t, ang = a0 + (a1 - a0) * smooth(t);
    let [x, y] = P(g, r, ang);
    if (off) { const n = ang + K * r + Math.PI / 2, w = off * Math.sin(Math.PI * t) * g.s; x += w * Math.cos(n); y += w * Math.sin(n); }
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.stroke();
}

function strand(ctx, g, root, axis, slot, rEnd, off, steps = 60) {
  // r rises steadily; below the umbel the angle eases root -> axis with the bundle offset;
  // above it the angle eases axis -> slot while the offset hands over to the divergence.
  ctx.beginPath(); const pts = [];   // port: the ray's points, for the Station
  for (let i = 0; i <= steps; i++) {
    const r = R.open0 + (rEnd - R.open0) * i / steps;
    let ang, o;
    if (r <= UMB) { const u = (r - R.open0) / (UMB - R.open0); ang = root + (axis - root) * smooth(u); o = off * (0.3 + 0.7 * smooth(Math.min(1, u * 1.6))); }
    else { const u = (r - UMB) / Math.max(1, rEnd - UMB); ang = axis + (slot - axis) * smooth(u); o = off * (1 - smooth(u)); }
    let [x, y] = P(g, r, ang);
    const nrm = ang + K * r + Math.PI / 2; x += o * g.s * Math.cos(nrm); y += o * g.s * Math.sin(nrm);
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); pts.push(x, y);
  }
  ctx.stroke(); if (g.onRay) g.onRay(pts);
}

function drawCore(ctx, g0, m) {
  const b = m.body, Ls = b.radial || b.fan ? 0 : (b.regions - 1) * 20;
  const knots = Array.from({ length: b.regions }, (_, k) => b.fan ? [20 * Math.cos(-Math.PI / 2 + k * TAU / b.regions), 20 * Math.sin(-Math.PI / 2 + k * TAU / b.regions)] : [0, b.regions === 1 ? 0 : -Ls + 2 * Ls * k / (b.regions - 1)]);
  const cov = { skin: { h: 9, da: 0.06, len: 1 }, fur: { h: 15, da: 0.075, len: 1.12 }, scales: { h: 5, da: 0.05, len: 0.7 } }[b.covering] || { h: 9, da: 0.06, len: 1 };
  K = m.body.twist;
  if (b.regions > 1) { ctx.strokeStyle = rgba(PAL.bone, 0.22); ctx.lineWidth = 0.6 * (g0.lw || g0.s); ctx.beginPath(); knots.forEach(([kx, ky], k) => { const X = g0.cx + g0.s * kx, Y = g0.cy + g0.s * ky; k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); if (b.fan) { ctx.stroke(); ctx.beginPath(); ctx.arc(g0.cx, g0.cy, 20 * g0.s, 0, TAU); ctx.strokeStyle = rgba(PAL.bone, 0.16); } ctx.stroke(); }
  knots.forEach(([kx, ky], kn) => {
  const g = { ...g0, cx: g0.cx + g0.s * kx, cy: g0.cy + g0.s * ky };
  const mine = m.locked.filter((_, i) => i % b.regions === kn);
  // identity: the locked loci as a fixed urchin of spines (Fibonacci sphere, frame order).
  // Same for every player; never lit, grown or changed by discovery.
  const fam = { structure: 1.0, growth: 0.9, anatomy: 0.8, appearance: 0.74, movement: 0.68, energy: 0.62, cognition: 0.56 };
  const n = mine.length, RB = R.ball * Math.min(1.1, Math.max(0.42, Math.sqrt(n / 43))) / (b.regions > 1 ? 1.25 : 1);
  const glow = ctx.createRadialGradient(g.cx, g.cy, 0, g.cx, g.cy, RB * 0.9 * g.s);
  glow.addColorStop(0, rgba(PAL.bone, 0.03)); glow.addColorStop(1, rgba(PAL.bone, 0));
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(g.cx, g.cy, RB * 0.9 * g.s, 0, TAU); ctx.fill();
  mine.forEach((l, i) => {
    const z = 1 - (2 * (i + 0.5)) / n, rr = Math.sqrt(1 - z * z), th = i * GOLD;
    const x = rr * Math.cos(th), y = rr * Math.sin(th), base = Math.atan2(y, x);
    const L = RB * cov.len * (fam[l.id.split('.')[0]] || 0.6);
    const r0 = 7, r1 = r0 + L * (0.25 + 0.75 * rr);     // projected: spines toward the viewer read short
    const depth = 0.4 + 0.6 * (z + 1) / 2;              // far spines dimmer
    const sw = l.lockReason === 'switch';
    const H = cov.h, hm = (H - 1) / 2;
    for (let h = 0; h < H; h++) {                        // each locked locus: a fan of hairs; count and reach from the covering
      const da = (h - hm) * cov.da, f = 0.78 + 0.22 * Math.cos((h - hm) / hm * 1.3);
      const rt = r0 + (r1 - r0) * f, at = base + da + K * rt;
      const tx = g.cx + g.s * rt * Math.cos(at), ty = g.cy + g.s * rt * Math.sin(at);
      // a root hair: full ink near the root, fading toward a soft end
      const al = (h === hm ? 0.24 : 0.09 * 9 / H) * depth, sx = g.cx + g.s * r0 * Math.cos(base + K * r0), sy = g.cy + g.s * r0 * Math.sin(base + K * r0);
      const hg = ctx.createLinearGradient(sx, sy, tx, ty); hg.addColorStop(0, rgba(PAL.bone, al)); hg.addColorStop(0.7, rgba(PAL.bone, al * 0.8)); hg.addColorStop(1, rgba(PAL.bone, 0));
      ctx.strokeStyle = hg; ctx.lineWidth = 0.4 * (g.lw || g.s);
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(tx, ty); ctx.stroke();
      if (h === hm || b.covering === 'scales') { ctx.fillStyle = rgba(PAL.bone, (sw ? 0.5 : 0.28) * depth);       // the spine's bud; scales bead every hair
        const bx = g.cx + g.s * (rt * 0.92) * Math.cos(at), by = g.cy + g.s * (rt * 0.92) * Math.sin(at);
        ctx.beginPath(); ctx.arc(bx, by, (sw ? 1.1 : 0.6) * g.s, 0, TAU); ctx.fill(); }
    }
    ctx.fillStyle = rgba(PAL.bone, 0.3 * depth);   // its root on the core
    ctx.beginPath(); ctx.arc(g.cx + g.s * r0 * Math.cos(base), g.cy + g.s * r0 * Math.sin(base), 0.5 * g.s, 0, TAU); ctx.fill();
  });
  ctx.fillStyle = rgba(PAL.bone, 0.42); ctx.beginPath(); ctx.arc(g.cx, g.cy, 2.2 * g.s, 0, TAU); ctx.fill();   // the nucleus
  ctx.strokeStyle = rgba(PAL.bone, 0.2); ctx.lineWidth = 0.4 * (g.lw || g.s); ctx.beginPath(); ctx.arc(g.cx, g.cy, 4.4 * g.s, 0, TAU); ctx.stroke();
  });
}

export function pictogram(ctx, trait, look, x, y, s, col, lw) {
  ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round';
  const L = (x0, y0, x1, y1) => { ctx.beginPath(); ctx.moveTo(x + x0 * s, y + y0 * s); ctx.lineTo(x + x1 * s, y + y1 * s); ctx.stroke(); };
  const C = (cx, cy, r, fill) => { ctx.beginPath(); ctx.arc(x + cx * s, y + cy * s, r * s, 0, TAU); fill ? ctx.fill() : ctx.stroke(); };
  const wave = (amp, freq, spiky) => { ctx.beginPath(); for (let i = 0; i <= 24; i++) { const u = i / 24 * 2 - 1; const v = spiky ? amp * (((i % 4) < 2 ? 1 : -1) * ((i % 2) ? 1 : 0.2)) : amp * Math.sin(u * Math.PI * freq); i ? ctx.lineTo(x + u * 0.8 * s, y + v * s) : ctx.moveTo(x + u * 0.8 * s, y + v * s); } ctx.stroke(); };
  switch (trait.id) {
    case 'colour': C(0, 0, 0.55); if (look.includes(' and ')) L(0, -0.55, 0, 0.55); break;
    case 'markings':
      if (look === 'stripes') { L(-0.4, -0.55, -0.4, 0.55); L(0, -0.55, 0, 0.55); L(0.4, -0.55, 0.4, 0.55); }
      else if (look === 'patches') { C(-0.3, -0.2, 0.2, 1); C(0.3, 0.25, 0.24, 1); }
      else if (look === 'stripes and patches') { L(-0.45, -0.55, -0.45, 0.55); L(-0.1, -0.55, -0.1, 0.55); C(0.38, 0.1, 0.22, 1); }
      else C(0, 0, 0.5); break;
    case 'crown':
      ctx.beginPath(); ctx.arc(x, y + 0.45 * s, 0.6 * s, Math.PI, TAU); ctx.stroke();
      if (look === 'leaf crest') { L(0, -0.15, 0, -0.7); L(0, -0.15, -0.35, -0.6); L(0, -0.15, 0.35, -0.6); } break;
    case 'eye-rings': { const k = trait.slotsIdx ?? 0; const r = [0.25, 0.42, 0.6][['thin rings', 'between', 'wide pale rings'].indexOf(look)] ?? 0.4; C(0, 0, r); if (look === 'wide pale rings') C(0, 0, r * 0.55); break; }
    case 'drive':
      if (look === 'steady') wave(0.18, 1.0); else if (look === 'between') wave(0.32, 2.0); else wave(0.55, 3, true); break;
    case 'efficiency': { const nb = ['thrifty', 'between', 'ordinary'].indexOf(look) + 1; for (let b = 0; b < 3; b++) { if (b < nb) L(-0.45 + b * 0.45, 0.55, -0.45 + b * 0.45, 0.55 - 0.35 - b * 0.3); else C(-0.45 + b * 0.45, 0.5, 0.06, 1); } break; }
    default: C(0, 0, 0.4);
  }
  ctx.restore();
}

function drawNode(ctx, g, trait, s, [x, y], opts) {
  const r = Math.min(opts.nodeR || 4.3, 0.48 * s.pitch * s.r) * g.s;
  const cols = lookColours(trait, s.look, s.idx);
  if (cols.length === 2) {
    const a = Math.atan2(y - g.cy, x - g.cx);
    ctx.fillStyle = cols[0]; ctx.beginPath(); ctx.arc(x, y, r, a, a + Math.PI); ctx.fill();
    ctx.fillStyle = cols[1]; ctx.beginPath(); ctx.arc(x, y, r, a + Math.PI, a + TAU); ctx.fill();
  } else { ctx.fillStyle = cols[0]; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
  ctx.strokeStyle = rgba(mix(cols[0], PAL.bone, 0.3), 0.55); ctx.lineWidth = 0.5 * (g.lw || g.s);
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
  const pc = cols.length === 1 && hex2(cols[0]).reduce((p, q) => p + q) < 330 ? rgba(PAL.bone, 0.9) : rgba(PAL.ink, 0.85);
  ctx.globalCompositeOperation = 'source-over';
  pictogram(ctx, trait, s.look, x, y, r * 0.95, pc, Math.max(0.5, 0.5 * g.s));
  ctx.globalCompositeOperation = 'lighter';
}

export function glint(ctx, x, y, r) {   // the palette's four-point glint: gold, lit centre yellow
  ctx.save(); ctx.globalCompositeOperation = 'source-over';
  const star = (rr, w) => { ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, q = i % 2 ? rr * w : rr; i ? ctx.lineTo(x + q * Math.cos(a), y + q * Math.sin(a)) : ctx.moveTo(x + q * Math.cos(a), y + q * Math.sin(a)); } ctx.closePath(); ctx.fill(); };
  ctx.fillStyle = PAL.gold; star(r, 0.3); ctx.fillStyle = PAL.yellow; star(r * 0.5, 0.35);
  ctx.restore();
}

export function drawForm(ctx, g, m, opts = {}) {   // g is re-bound per chapter to its root
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  const mono = !!opts.pencil;
  const lit = opts.lit || null;                       // a chapter lit in place: the rest dims
  ctx.globalAlpha = lit ? 0.45 : 1;
  drawCore(ctx, g, m);
  ctx.globalAlpha = 1;
  const acc = [];
  const g0 = g;
  for (const ch of m.chapters) {
    const hue = CH_HUE[ch.id] || '#cccccc';
    K = m.body.twist * ch.side;
    ctx.globalAlpha = lit && ch.id !== lit ? 0.22 : 1;
    g = { ...g0, cx: g0.cx + g0.s * ch.root[0], cy: g0.cy + g0.s * ch.root[1] };
    for (const t of ch.traits) {
      UMB = t.umbel;
      const frac = t.nFound / t.slots.length;
      // open loci: one bundle per locus, each rooted on its own on the core. A bundle has one
      // strand per look slot; the strand runs on as that slot's ray past the umbel.
      const n = t.slots.length, GAP = 1.15;
      const byAng = t.slots.map((s, k) => k).sort((p, q) => t.slots[p].ang - t.slots[q].ang);
      const offOf = new Map(byAng.map((k, j) => [k, (j - (n - 1) / 2) * GAP]));
      const pass = (want) => t.loci.forEach((_, li) => {
        const root = t.axis + (li - (t.loci.length - 1) / 2) * 0.22;
        t.slots.forEach((s, k) => {
          if (s.found !== want) return;
          const off = offOf.get(k);
          if (s.found) {
            const lc = mix(lookColours(t, s.look, s.idx)[0], PAL.bone, 0.35);
            ctx.strokeStyle = rgba(lc, 0.6); ctx.lineWidth = 0.6 * (g.lw || g.s); strand(ctx, g, root, t.axis, s.ang, s.r - 4.6, off);
          } else {
            ctx.strokeStyle = mono ? rgba(PAL.bone, 0.2) : rgba(mix(hue, PAL.frostS, 0.55), 0.2); ctx.lineWidth = 0.45 * (g.lw || g.s); strand(ctx, g, root, t.axis, s.ang, s.r - 3.4, off);
          }
        });
      });
      pass(false); pass(true);
      for (const s of t.slots) {
        if (s.found) {
          const lc = mix(lookColours(t, s.look, s.idx)[0], PAL.bone, 0.35);
          // pappus: the found look seeds, a ring of fine hairs, longer outward
          const [nx, ny] = P(g, s.r, s.ang), out = s.ang + K * s.r;
          for (let h = 0; h < 32; h++) {                       // pappus: half-length, fading to a soft tip
            const da = h / 32 * TAU, len = 2.5 + 4.5 * Math.max(0, Math.cos(da)) ** 1.5;
            const b = out + da, x0 = nx + g.s * 5.2 * Math.cos(b), y0 = ny + g.s * 5.2 * Math.sin(b), x1 = nx + g.s * (5.2 + len) * Math.cos(b), y1 = ny + g.s * (5.2 + len) * Math.sin(b);
            const pg = ctx.createLinearGradient(x0, y0, x1, y1); pg.addColorStop(0, rgba(lc, 0.2)); pg.addColorStop(1, rgba(lc, 0));
            ctx.strokeStyle = pg; ctx.lineWidth = 0.4 * (g.lw || g.s);
            ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
          }
        } else {
          // potential growth: a dotted hairline out to where a found look would grow
          const [px0, py0] = P(g, s.r + 5, s.ang), [px1, py1] = P(g, R.potential, s.ang);
          const qg = ctx.createLinearGradient(px0, py0, px1, py1); qg.addColorStop(0, rgba(mono ? PAL.bone : PAL.frostS, 0.14)); qg.addColorStop(1, rgba(PAL.frostS, 0));
          ctx.strokeStyle = qg; ctx.lineWidth = 0.4 * (g.lw || g.s); ctx.setLineDash([2 * g.s, 2 * g.s]);
          ctx.beginPath(); for (let r = s.r + 5; r <= R.potential; r += 2) { const [x, y] = P(g, r, s.ang); r === s.r + 5 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); ctx.setLineDash([]);
        }
      }
      // umbel point
      const [ux, uy] = P(g, UMB, t.axis);
      ctx.fillStyle = mono ? rgba(PAL.bone, 0.3) : rgba(mix(hue, PAL.bone, 0.3), 0.25 + 0.4 * frac); ctx.beginPath(); ctx.arc(ux, uy, 1.1 * g.s, 0, TAU); ctx.fill();
      // nodes
      for (const s of t.slots) {
        const p = P(g, s.r, s.ang);
        if (s.found) { drawNode(ctx, g, t, s, p, opts); if (s.fresh) acc.push(p); if (opts.onBead) opts.onBead(p, t, s); }   // port: the bead's centre, for the Station
        else { ctx.strokeStyle = rgba(mono ? PAL.bone : PAL.frostD, 0.42); ctx.lineWidth = 0.6 * (g.lw || g.s); ctx.beginPath(); ctx.arc(p[0], p[1], Math.min(3.0, 0.36 * s.pitch * s.r) * g.s, 0, TAU); ctx.stroke(); }
      }
    }
  }
  for (const [x, y] of acc) glint(ctx, x + 6.5 * g.s, y - 6.5 * g.s, 7 * g.s);   // new here
  ctx.restore();
}

// ---- finish: bloom, print tone, grain -------------------------------------------------------
export function finish(out, light, { bloom = 1, grain = 4, seed = 7, bg = BG, vignette = 0.35, flat = null, under = null, probe = null } = {}) {
  const W = out.width, H = out.height, o = out.getContext('2d');
  o.fillStyle = `rgb(${bg})`; o.fillRect(0, 0, W, H);
  if (under) o.drawImage(under, 0, 0, W, H);        // surfaces (panels, cards, wells) share the paper grain
  o.globalCompositeOperation = 'lighter';
  o.drawImage(light, 0, 0, W, H);
  for (const [px, a] of [[1.2, 0.3], [4, 0.2], [12, 0.12]]) {
    o.filter = `blur(${px * W / 1024 * 2}px)`; o.globalAlpha = a * bloom; o.drawImage(light, 0, 0, W, H);
  }
  // halation: the wide, warm fringe a film emulsion gives bright points
  o.filter = `blur(${10 * W / 1024 * 2}px) sepia(1) saturate(3) hue-rotate(-25deg)`; o.globalAlpha = 0.1 * bloom; o.drawImage(light, 0, 0, W, H);
  o.filter = 'none'; o.globalAlpha = 1;
  if (flat) o.drawImage(flat, 0, 0, W, H);          // pencil studies: line only, no bloom
  o.globalCompositeOperation = 'source-over';
  // paper: a low-frequency fibre mottle (noise blurred twice) plus a fine, soft tooth
  const tex = createCanvas(W >> 2, H >> 2);   // port: no document
  const tc = tex.getContext('2d'), ti = tc.createImageData(tex.width, tex.height);
  let s = seed >>> 0; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < ti.data.length; i += 4) { const v = 128 + (rnd() - 0.5) * 120; ti.data[i] = ti.data[i + 1] = ti.data[i + 2] = v; ti.data[i + 3] = 255; }
  tc.putImageData(ti, 0, 0);
  const mot = createCanvas(W, H); const mc = mot.getContext('2d');   // port: no document
  mc.filter = 'blur(3px)'; mc.drawImage(tex, 0, 0, W, H);
  const md = mc.getImageData(0, 0, W, H).data;
  if (probe) probe({ light: o.canvas.data, md, seed: s, bg });   // port: what the breathing levels re-use (the light's blur and the paper), read before the print tone
  const img = o.getImageData(0, 0, W, H), d = img.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const dx = x / W - 0.5, dy = y / H - 0.5, v = 1 - vignette * (dx * dx + dy * dy) * 2;
    const n = (rnd() + rnd() - 1) * grain + (md[i] - 128) * 0.09;      // tooth + fibre, no speckle
    for (let c = 0; c < 3; c++) {
      let val = d[i + c] / 255;
      val = val / (1 + 0.25 * val) * 1.18;
      val = val * v;
      d[i + c] = Math.max(0, Math.min(255, val * 255 + n * (c === 2 ? 0.9 : 1)));
    }
  }
  o.putImageData(img, 0, 0);
}

export const THEME = { CH_HUE, ACCENT, BG, PAL, mix, rgba, hex2, R, K };

// ---- the harness (build spec 4.2, the art director's): supersampling 2, 344 x 362, the form's centre (W/2 + 5, H/2 + 4) at scale 1.0, then the finish with grain 4 and vignette 0.45 and no edge gradient
// (the window's inner shade replaces it). The harness code itself is not in the public copy of the generator (its run note names the numbers); this is those numbers put together: the form is drawn on a
// 2x canvas, finished at 2x, and reduced by 2 x 2 averaging. Each value is one easily changed number.
export const RECIPE = 2;   // 2: the breathing levels gain the light before the finish
export const HARNESS = { ss: 2, w: 344, h: 362, scale: 1.0, dx: 5, dy: 4, grain: 4, vignette: 0.45 };
export const MARGIN = 12;   // the drawn extent keeps this far from each edge of the window (the test)
// The breathing (build spec 4.2, the art director): four levels of the form's light, the main one first: the light times its gain before the finish, so the bloom breathes with the form and the ground, the grain and the vignette are the same pixels at every level.
export const BREATH_GAIN = [1, 1.04, 1.08, 1.12];

// The ss x ss average of a finished picture, as bytes.
function reduce(big, H, ss) {
  const W = H.w * ss, rgba = new Uint8ClampedArray(H.w * H.h * 4);
  for (let y = 0; y < H.h; y++) for (let x = 0; x < H.w; x++) {
    const o = (y * H.w + x) * 4;
    for (let c = 0; c < 3; c++) { let t = 0; for (let j = 0; j < ss; j++) for (let i = 0; i < ss; i++) t += big[((y * ss + j) * W + x * ss + i) * 4 + c]; rgba[o + c] = Math.round(t / (ss * ss)); }
    rgba[o + 3] = 255;
  }
  return rgba;
}
// The picture, its bead centres and its four levels, for a frame and a state { <species id>: { <trait>: [looks, in the order found] }, newSince?: ... }. Pure: the same frame and state give the same bytes.
//   returns { w, h, rgba: Uint8ClampedArray (RGB painted, alpha 255), beads: [{ x, y, trait, look, fresh }] (output pixels), levels: [rgba x 4] (levels[0] is rgba), lit (1 where the form's light reaches a pixel), extent: { x0, y0, x1, y1 }, ms }
export function renderSpecimen(frame, state, opts = {}) {
  const t0 = performance.now(), H = { ...HARNESS, ...opts }, ss = H.ss, W = H.w * ss, Ht = H.h * ss;
  const m = layout(model(frame, state));
  const light = createCanvas(W, Ht), ctx = light.getContext('2d'), beads = [];
  const rays = [], g = { cx: (H.w / 2 + H.dx) * ss, cy: (H.h / 2 + H.dy) * ss, s: H.scale * ss, onRay: (pts) => rays.push(pts.map((v) => Math.round(v / ss * 10) / 10)) };
  drawForm(ctx, g, m, { onBead: (p, t, s) => beads.push({ x: Math.round(p[0] / ss * 100) / 100, y: Math.round(p[1] / ss * 100) / 100, trait: t.id, look: s.look, fresh: !!s.fresh, r: Math.round(Math.min(4.3, 0.48 * s.pitch * s.r) * H.scale * 100) / 100 }) });   // r: the bead's radius in output pixels });
  // the drawn extent: where the form's light is at least a tenth opaque, in output pixels
  let x0 = W, y0 = Ht, x1 = -1, y1 = -1; const form = new Uint8Array(H.w * H.h);   // form: the pixels the form's light is drawn on at all
  for (let y = 0; y < Ht; y++) for (let x = 0; x < W; x++) if (light.data[(y * W + x) * 4 + 3] >= 1 / 255) form[((y / ss) | 0) * H.w + ((x / ss) | 0)] = 1;
  for (let y = 0; y < Ht; y++) for (let x = 0; x < W; x++) if (light.data[(y * W + x) * 4 + 3] >= 0.1) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const out = createCanvas(W, Ht); let probe = null; finish(out, light, { grain: H.grain, vignette: H.vignette, probe: (p) => { probe = { ...p, base: Float32Array.from(p.light) }; } });
  const rgba = reduce(out.getContext('2d').getImageData(0, 0, W, Ht).data, H, ss);
  // the other levels: the finish is linear in the light up to its print tone, so a level adds its gain times the light's own part (its blur and bloom, taken from the first finish) to the same ground, then takes the same print tone and the same grain
  const bgc = probe.bg.map((v) => v / 255), lit = new Uint8Array(H.w * H.h), t = 0.5 / 255 / BREATH_GAIN[BREATH_GAIN.length - 1];   // lit: the light adds a whole level to the ground at some gain (the canvas keeps whole levels), so the ground is the pixels it does not reach
  for (let i = 0; i < Ht * W; i++) if (probe.base[i * 4] > bgc[0] + t || probe.base[i * 4 + 1] > bgc[1] + t || probe.base[i * 4 + 2] > bgc[2] + t) lit[(((i / W) | 0) / ss | 0) * H.w + ((i % W) / ss | 0)] = 1;
  let sd = probe.seed; const rnd = () => ((sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296), NZ = new Float32Array(W * Ht), VG = new Float32Array(W * Ht);   // the grain and the vignette, the same at every level
  for (let y = 0; y < Ht; y++) for (let x = 0; x < W; x++) { const j = y * W + x, dx = x / W - 0.5, dy = y / Ht - 0.5; VG[j] = 1 - H.vignette * (dx * dx + dy * dy) * 2; NZ[j] = (rnd() + rnd() - 1) * H.grain + (probe.md[j * 4] - 128) * 0.09; }
  const levels = BREATH_GAIN.map((gain, n) => {
    if (!n) return rgba;
    const bytes = new Uint8ClampedArray(W * Ht * 4);
    for (let j = 0, i = 0; j < W * Ht; j++, i += 4) {
      for (let c = 0; c < 3; c++) { let val = Math.round(Math.min(1, bgc[c] + gain * (probe.base[i + c] - bgc[c])) * 255) / 255; val = val / (1 + 0.25 * val) * 1.18; bytes[i + c] = Math.max(0, Math.min(255, val * VG[j] * 255 + NZ[j] * (c === 2 ? 0.9 : 1))); }
      bytes[i + 3] = 255;
    }
    return reduce(bytes, H, ss);
  });
  return { w: H.w, h: H.h, rgba, beads, rays, levels, lit, form, extent: { x0: x0 / ss, y0: y0 / ss, x1: (x1 + 1) / ss, y1: (y1 + 1) / ss }, ms: performance.now() - t0 };
}
