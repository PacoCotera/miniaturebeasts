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

export function createDock({ dataDir, now = Date.now, write = writeAndRename } = {}) {
  const dir = path.join(dataDir, "dock"); mkdirSync(dir, { recursive: true });
  const worlds = new Map(), listeners = new Map();
  for (const f of readdirSync(dir)) {   // a file that does not read is left as it is and not served
    if (!f.endsWith(".json")) continue;
    try { const o = JSON.parse(readFileSync(path.join(dir, f), "utf8")); if (o && o.schema === SCHEMA && WORLD_RE.test(o.world) && f === o.world + ".json") worlds.set(o.world, o); } catch { /* kept untouched */ }
  }
  const fileOf = (world) => path.join(dir, world + ".json");
  const snap = (rec) => ({ world: rec.world, seq: rec.seq, cradles: copy(rec.cradles), face: copy(rec.face) });
  function emit(world, type, data) { for (const fn of listeners.get(world) ?? []) { try { fn(type, data); } catch { /* a listener never breaks a seat */ } } }
  function snapshot(world) { return snap(worlds.get(world) ?? blank(world, now())); }
  // seat(world, cradle, seated, companion?) → { ok, changed, snapshot } or { ok: false, status, error, fault? }
  function seat(world, cradle, seated, companion) {
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
    try { write(fileOf(world), next); }
    catch (e) {   // nothing stored, nothing changed: the face says so
      if (!rec.face.fault) { rec.face.fault = true; if (!had) worlds.set(world, rec); emit(world, "face", copy(rec.face)); }
      return { ok: false, status: 503, fault: true, error: "the Caddy could not store it: " + e.message };
    }
    worlds.set(world, next);
    if (moved) emit(world, "dock", { cradle, ...copy(c), cradleSeq: c.seq, seq: next.seq });   // seq is the world's
    if (JSON.stringify(next.face) !== JSON.stringify(rec.face)) emit(world, "face", copy(next.face));
    return { ok: true, changed: moved, snapshot: snap(next) };
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
  const list = () => [...worlds.values()].map((r) => ({ world: r.world, seq: r.seq, companion: r.cradles.companion.state, seats: r.cradles.companion.seats, fault: r.face.fault }));
  const counts = () => ({ worlds: worlds.size, seated: [...worlds.values()].filter((r) => r.cradles.companion.state === "seated").length, faults: [...worlds.values()].filter((r) => r.face.fault).length });
  return { seat, snapshot, subscribe, sweep, list, counts, dir };
}
