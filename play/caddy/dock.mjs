// The Caddy service's dock: per world, both cradles (the Companion's and the Station's), each { state, seats, seq }, and the face state the service holds (whose
// Companion the cradle last held, since when, and whether a write was refused). A seat and a lift are states, never toggles: a repeat changes nothing. Every
// change is journaled before it is told, one small file per world (dock/<world>.json under the data directory), written beside and renamed over the old one; a
// write that fails changes nothing and marks the face's fault, so nothing is taken that was not stored. A world not seated for 30 days is removed by the service
// itself (the sweep), so nobody has to clear anything. Listeners hear their own world only.
// The play page's Dock control stands in for the cradle's hall sensor: it asks for a seat or a lift; the cradle lamps and the face follow this state.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, renameSync, rmSync } from "node:fs";
import path from "node:path";

export const CRADLES = ["companion", "station"], SWEEP_MS = 30 * 24 * 3600 * 1000, NAME_MAX = 12;   // NAME_MAX: what the face's stamp slot holds
export const WORLD_RE = /^[A-Za-z0-9_-]{1,64}$/;
const SCHEMA = "mb-caddy-dock/1";
export function writeAndRename(file, obj) { const tmp = file + ".tmp"; writeFileSync(tmp, JSON.stringify(obj, null, 1) + "\n"); renameSync(tmp, file); }
const copy = (o) => JSON.parse(JSON.stringify(o));
const blank = (world, t) => ({ schema: SCHEMA, world, seq: 0, created: t, seatedAt: t,
  cradles: Object.fromEntries(CRADLES.map((c) => [c, { state: "lifted", seats: 0, seq: 0, at: t }])), face: { who: null, since: t, fault: false } });

// The Companion that seats itself: { id, name }, both short strings; anything else is ignored.
const whoOf = (c) => (c && typeof c === "object" && typeof c.id === "string" && c.id.length <= 64 && /^[\w-]+$/.test(c.id) ? { id: c.id, name: typeof c.name === "string" ? c.name.slice(0, NAME_MAX) : null } : null);

// The baked package (baked-package-3). The record beside the cradles: `package: { held, takes, at }`, held = the summary of the package the Companion holds
// ({ id, seed, slot, v, realmRev, placeRev, tag, done, total, whole, sha }) or null. At a seat the Station offers its package's summary; the Companion takes it when it holds
// none, holds another region or another generator's (a rev or tile-set change is another id), or holds the same one with fewer cells done or not whole. The same one changes nothing.
// `cells` is what crosses: the offer's cells done when the id differs, else the cells added since. The record changes with the seat in the one write, so a failed write takes nothing.
const num = (n) => Number.isInteger(n) && n >= 0 && n < 1e7, str = (x, k = 200) => typeof x === "string" && x.length > 0 && x.length <= k;
export function offerOf(o) {   // a well-formed summary, or null (anything else is ignored: the seat stands without a package step)
  if (!o || typeof o !== "object" || !str(o.id) || !num(o.seed) || !Array.isArray(o.slot) || o.slot.length !== 2 || !o.slot.every(Number.isInteger) || !num(o.v)) return null;
  if (!num(o.realmRev) || !num(o.placeRev) || typeof o.tag !== "string" || o.tag.length > 64 || !num(o.done) || !num(o.total) || o.done > o.total || typeof o.whole !== "boolean" || !/^[0-9a-f]{64}$/.test(o.sha)) return null;
  return { id: o.id, seed: o.seed, slot: [o.slot[0], o.slot[1]], v: o.v, realmRev: o.realmRev, placeRev: o.placeRev, tag: o.tag, done: o.done, total: o.total, whole: o.whole, sha: o.sha };
}
export function decideTake(held, offer) {   // null: nothing to take; else { why, cells }
  if (!offer) return null;
  if (!held) return { why: "first", cells: offer.done };
  if (held.id !== offer.id) return { why: "newer", cells: offer.done };
  if (offer.done > held.done || (offer.whole && !held.whole)) return { why: "more", cells: Math.max(0, offer.done - held.done) };
  return null;
}

export function createDock({ dataDir, now = Date.now, write = writeAndRename } = {}) {
  const dir = path.join(dataDir, "dock"); mkdirSync(dir, { recursive: true });
  const worlds = new Map(), listeners = new Map();
  for (const f of readdirSync(dir)) {   // a file that does not read is left as it is and not served
    if (!f.endsWith(".json")) continue;
    try { const o = JSON.parse(readFileSync(path.join(dir, f), "utf8")); if (o && o.schema === SCHEMA && WORLD_RE.test(o.world) && f === o.world + ".json") worlds.set(o.world, o); } catch { /* kept untouched */ }
  }
  const fileOf = (world) => path.join(dir, world + ".json");
  const snap = (rec) => ({ world: rec.world, seq: rec.seq, cradles: copy(rec.cradles), face: copy(rec.face), package: rec.package ? copy(rec.package) : null });
  function emit(world, type, data) { for (const fn of listeners.get(world) ?? []) { try { fn(type, data); } catch { /* a listener never breaks a seat */ } } }
  function snapshot(world) { return snap(worlds.get(world) ?? blank(world, now())); }
  // seat(world, cradle, seated, companion?) → { ok, changed, snapshot } or { ok: false, status, error, fault? }
  function seat(world, cradle, seated, companion, offer) {
    if (typeof world !== "string" || !WORLD_RE.test(world)) return { ok: false, status: 400, error: "a world id is required (letters, digits, - and _)" };
    if (!CRADLES.includes(cradle)) return { ok: false, status: 400, error: "the cradle is companion or station" };
    if (typeof seated !== "boolean") return { ok: false, status: 400, error: "seated is true or false" };
    const t = now(), had = worlds.get(world), rec = had ?? blank(world, t), want = seated ? "seated" : "lifted", who = cradle === "companion" && seated ? whoOf(companion) : null;
    if (rec.cradles[cradle].state === want && !rec.face.fault) return { ok: true, changed: false, snapshot: snap(rec) };   // a state, not a toggle
    const next = copy(rec), c = next.cradles[cradle], moved = c.state !== want;
    if (moved) { c.state = want; c.seq++; c.at = t; if (seated) c.seats++; next.seq++; }
    if (seated && cradle === "companion") next.seatedAt = t;   // the sweep counts the Companion's seats only
    if (moved && cradle === "companion") { next.face.since = t; if (who) next.face.who = who; }
    next.face.fault = false;
    let took = null;
    if (moved && seated && cradle === "companion") {   // the package step of a seat: the Companion takes the Station's package when it is newer or more whole
      const o = offerOf(offer), held = rec.package ? rec.package.held : null; took = decideTake(held, o);
      if (took) next.package = { held: o, takes: (rec.package ? rec.package.takes : 0) + 1, at: t };
    }
    try { write(fileOf(world), next); }
    catch (e) {   // nothing stored, nothing changed: the face says so
      if (!rec.face.fault) { rec.face.fault = true; if (!had) worlds.set(world, rec); emit(world, "face", copy(rec.face)); }
      return { ok: false, status: 503, fault: true, error: "the Caddy could not store it: " + e.message };
    }
    worlds.set(world, next);
    if (moved) emit(world, "dock", { cradle, ...copy(c), cradleSeq: c.seq, seq: next.seq });   // seq is the world's
    if (JSON.stringify(next.face) !== JSON.stringify(rec.face)) emit(world, "face", copy(next.face));
    return { ok: true, changed: moved, snapshot: snap(next), ...(took ? { took } : {}) };
  }
  function subscribe(world, fn) {
    const set = listeners.get(world) ?? new Set(); set.add(fn); listeners.set(world, set);
    return () => { set.delete(fn); if (!set.size) listeners.delete(world); };
  }
  // The sweep: a world whose Companion is not seated and has not been for 30 days goes, its file with it (the Station cradle stays seated for good, so it does not count).
  function sweep(t = now()) {
    const gone = [];
    for (const [world, rec] of worlds) if (rec.cradles.companion.state !== "seated" && t - rec.seatedAt >= SWEEP_MS) { worlds.delete(world); rmSync(fileOf(world), { force: true }); gone.push(world); }
    return gone;
  }
  // The world's whole record as it is stored (a copy), or null for a world the Caddy has not seen: the Caddy's part of a sleep file.
  const record = (world) => (worlds.has(world) ? copy(worlds.get(world)) : null);
  // A realm that has gone to sleep: its record and its file go (a world never seen changes nothing; a repeat changes nothing). { ok: true, changed } or { ok: false, error } when the file could not be removed.
  function clear(world) {
    if (typeof world !== "string" || !WORLD_RE.test(world)) return { ok: false, error: "a world id is required (letters, digits, - and _)" };
    try { rmSync(fileOf(world), { force: true }); } catch (e) { return { ok: false, error: "the Caddy could not remove it: " + e.message }; }
    const had = worlds.delete(world);
    if (had) emit(world, "cleared", { world });
    return { ok: true, changed: had };
  }
  const list = () => [...worlds.values()].map((r) => ({ world: r.world, seq: r.seq, companion: r.cradles.companion.state, seats: r.cradles.companion.seats, fault: r.face.fault }));
  const counts = () => ({ worlds: worlds.size, seated: [...worlds.values()].filter((r) => r.cradles.companion.state === "seated").length, faults: [...worlds.values()].filter((r) => r.face.fault).length });
  return { seat, snapshot, subscribe, sweep, list, counts, record, clear, dir };
}
