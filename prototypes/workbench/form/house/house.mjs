// The house: bands, rules and clamp limits, as data (the genome foundation plan, section 1.6). Plain JavaScript, no node: imports, so it runs in a
// browser; reading the file from disk is house-file.mjs. Nothing in this module names a band, a rule number or a limit: they are all in house-N.json.

export const MAPS = ["geo", "lin"];

// ---- the bands ---------------------------------------------------------------------------------------------------------------
// bands.<plan> may say "extends": "<plan>" and "override": { gene: band | null }. A null band means the gene does not exist in that plan.
export function resolveBands(house) {
  const out = {}, seen = new Set();
  const resolve = (plan) => {
    if (out[plan]) return out[plan];
    if (seen.has(plan)) throw new Error(`house: bands of plan ${plan} extend each other in a loop`);
    seen.add(plan);
    const def = house.bands[plan];
    if (!def) throw new Error(`house: no bands for plan ${plan}`);
    let b = {};
    if (def.extends) b = { ...resolve(def.extends) };
    const own = def.override ?? (def.extends ? {} : def);
    for (const [g, v] of Object.entries(own)) b[g] = v;
    seen.delete(plan);
    return (out[plan] = b);
  };
  for (const p of Object.keys(house.bands)) resolve(p);
  return out;
}

export function loadHouse(obj) {
  const house = JSON.parse(JSON.stringify(obj));
  house.resolved = resolveBands(house);
  const problems = validateHouse(house);
  if (problems.length) throw new Error("house: " + problems.join("; "));
  return house;
}

// the band of a gene in a plan, or null when the plan has no such gene; an unknown gene is a bug and throws
export function bandOf(house, plan, gene) {
  const pb = house.resolved[plan];
  if (!pb) throw new Error(`house: unknown plan ${plan}`);
  if (!(gene in pb)) throw new Error(`house: unknown gene ${gene} in plan ${plan}`);
  return pb[gene];
}

// t -> value: geometric for sizes (equal steps look equal), linear for positions and angles
export function valueAt(band, t) {
  if (!band) throw new Error("valueAt: no band (the gene does not exist in this plan)");
  return band.map === "geo" ? band.lo * Math.pow(band.hi / band.lo, t) : band.lo + (band.hi - band.lo) * t;
}
// value -> t (not clamped: a value outside the band gives t outside [0, 1], which is how the calibration finds a master outside the house)
export function tAt(band, v) {
  return band.map === "geo" ? Math.log(v / band.lo) / Math.log(band.hi / band.lo) : (v - band.lo) / (band.hi - band.lo);
}

// ---- the soft clamp (plan 2.1 step 3) -------------------------------------------------------------------------------------------
// A strictly monotone compression, never a hard stop: identity below hi - w, then x' = hi - w e^(-(x - hi + w)/w), which is continuous, has slope 1 at
// the joint, rises forever and stays under hi. The same on the low side. Two different inputs never collapse into the same output.
export function softClamp(x, lo, hi, w) {
  if (hi !== null && hi !== undefined && x > hi - w) return hi - w * Math.exp(-(x - hi + w) / w);
  if (lo !== null && lo !== undefined && x < lo + w) return lo + w * Math.exp(-(lo + w - x) / w);
  return x;
}
// the soft width of a band: a share of its span, so a clamp bends the same fraction of every band
export const softWidth = (house, lo, hi) => (house.softclamp?.["width-share"] ?? 0.15) * (hi - lo);

// ---- validation -------------------------------------------------------------------------------------------------------------
export function validateHouse(house, { measures = null } = {}) {
  const p = [];
  if (house.schema !== "mb-house/1") p.push(`schema ${house.schema}`);
  for (const [plan, genes] of Object.entries(house.resolved ?? {})) {
    for (const [g, b] of Object.entries(genes)) {
      if (b === null) continue;
      if (!(b.lo < b.hi)) p.push(`${plan} ${g}: lo ${b.lo} is not under hi ${b.hi}`);
      if (!MAPS.includes(b.map)) p.push(`${plan} ${g}: map ${b.map}`);
      if (b.map === "geo" && !(b.lo > 0)) p.push(`${plan} ${g}: a geometric band needs lo > 0`);
      if (typeof b.measure !== "string") p.push(`${plan} ${g}: no measure`);
    }
  }
  const ids = new Set();
  for (const r of house.rules ?? []) {
    if (ids.has(r.id)) p.push(`rule ${r.id} twice`); ids.add(r.id);
    if (typeof r.on !== "boolean") p.push(`rule ${r.id}: on is not true or false`);
    if (measures && !(r.measure in measures)) p.push(`rule ${r.id}: no measure ${r.measure} in the registry`);
    for (const [plan, range] of Object.entries(r.plans ?? {})) {
      if (plan !== "*" && !(plan in house.plans)) p.push(`rule ${r.id}: unknown plan ${plan}`);
      if (!Array.isArray(range) || range.length !== 2) p.push(`rule ${r.id} ${plan}: range`);
      else if (range[0] !== null && range[1] !== null && !(range[0] <= range[1])) p.push(`rule ${r.id} ${plan}: range ${range} is reversed`);
    }
  }
  const orders = new Set();
  for (const c of house.clamps ?? []) { if (orders.has(c.order)) p.push(`clamp ${c.id}: order ${c.order} twice`); orders.add(c.order); }
  return p;
}

// ---- frames against the house (plan 1.6: a frame holds no geometry) ------------------------------------------------------------------
// A frame is { id, species, plan, kinds: { slot: kind }, t: { gene: t }, pool: { gene: [t_lo, t_hi] }, notes }. A number that is not a t is refused.
const FRAME_KEYS = new Set(["id", "species", "name", "plan", "kinds", "t", "pool", "notes", "seeds"]);
export function checkFrame(frame, house) {
  const p = [];
  for (const k of Object.keys(frame)) if (!FRAME_KEYS.has(k)) p.push(`frame key ${k} is not part of the schema (a frame holds kinds and sub-bands of t, nothing else)`);
  if (frame.seeds !== undefined && typeof frame.seeds !== "string") p.push("seeds must be a string");
  const plan = frame.plan;
  if (!house.resolved[plan]) { p.push(`unknown plan ${plan}`); return p; }
  for (const [slot, kind] of Object.entries(frame.kinds ?? {})) {
    if (typeof kind !== "string") { p.push(`kind of ${slot} is not a name`); continue; }
    if (!house.kinds[slot]) p.push(`unknown kind slot ${slot}`);
    else if (!(kind in house.kinds[slot])) p.push(`kind ${kind} of ${slot} is not in the house`);
  }
  const geneOk = (g) => {
    const b = house.resolved[plan][g];
    if (b === undefined) { p.push(`gene ${g} is unknown`); return false; }
    if (b === null) { p.push(`gene ${g} does not exist in plan ${plan}`); return false; }
    return true;
  };
  for (const [g, t] of Object.entries(frame.t ?? {})) {
    if (!geneOk(g)) continue;
    if (typeof t !== "number" || !(t >= 0 && t <= 1)) p.push(`gene ${g}: ${t} is not a t in [0, 1]`);
  }
  for (const [g, r] of Object.entries(frame.pool ?? {})) {
    if (!geneOk(g)) continue;
    if (!Array.isArray(r) || r.length !== 2 || !(r[0] >= 0 && r[1] <= 1 && r[0] <= r[1])) { p.push(`gene ${g}: pool ${JSON.stringify(r)} is not a sub-band of [0, 1]`); continue; }
    const t = frame.t?.[g]; if (typeof t === "number" && (t < r[0] || t > r[1])) p.push(`gene ${g}: the specimen t ${t} is outside its pool ${JSON.stringify(r)}`);
  }
  return p;
}

// ---- the rules ---------------------------------------------------------------------------------------------------------------
// measured: { measureName: number | undefined }. A rule whose measure is absent is "not measured", never a pass.
export function checkRules(house, plan, measured, { only = null } = {}) {
  const rows = [];
  for (const r of house.rules) {
    const range = r.plans?.[plan] ?? r.plans?.["*"];
    if (!range || (only && !only.includes(r.id))) continue;
    const v = measured[r.measure];
    const lo = range[0], hi = range[1];
    let status = "not measured", margin = null;
    if (typeof v === "number" && Number.isFinite(v)) {
      const mlo = lo === null ? Infinity : v - lo, mhi = hi === null ? Infinity : hi - v;
      margin = Math.min(mlo, mhi);
      status = margin >= 0 ? "pass" : "FAIL";
    }
    rows.push({ id: r.id, measure: r.measure, plan, value: v ?? null, range, on: r.on, status: r.on ? status : status === "FAIL" ? "off (would fail)" : status === "pass" ? "off (would pass)" : status, margin, enforce: r.enforce });
  }
  return rows;
}
export const failures = (rows) => rows.filter((r) => r.on && r.status === "FAIL");

// the clamp record of the house, by id; on/off and limits are data
export function clampOf(house, id) {
  const c = house.clamps.find((x) => x.id === id);
  if (!c) throw new Error(`house: no clamp ${id}`);
  return c;
}
export const clampsInOrder = (house) => [...house.clamps].sort((a, b) => a.order - b.order);
