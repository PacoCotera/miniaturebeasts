// The Caddy service (station-build.md §2.4): brokers paintings for the Station page on the sandbox. A
// genome in, validated whole against its frame and built; its set stored by the genome's SHA-256; a
// queue journaled so a job survives a restart; a mock painter or the real one behind the service's own
// mode; a hard daily limit that no page can raise; a per-world daily grow cap; status. Beside the portraits, the dock (dock.mjs): both cradles of each
// world as states, the seat asked by the play page's Dock control, and a stream of the dock's events for the Caddy's face.
// The Caddy's own identity: at its first start (no identity.json on the card) it draws a recovery seed, holds it in memory only and queues one print of it; when the print is taken
// (POST /print/taken) it writes identity.json with the public key and key id and drops the seed. A restart before then forgets the seed and starts again, so no card ever names a key that was never printed.
// The card for realms put to sleep (realms.mjs): the sleep files, the household ledger, the headers' index, the realm's records and its clear.
// Plain Node, no dependencies; createApp() returns the request handler and the worker so the tests and
// the journey run it in-process, server.mjs runs it as a service.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, renameSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, genomeSha, genomeProblems } from "../station/src/genome.mjs";
import { mockPaint, realPaint, SET_FILES, PROMPT_VERSION } from "./painter.mjs";
import { createDock, WORLD_RE } from "./dock.mjs";
import { randomBytes } from "node:crypto";
import { recoveryPrint } from "./recovery-print.mjs";
import { createRealms, MAX_BYTES } from "./realms.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
export const RETRY_S = [60, 300, 1800];   // a failed call retries at one, five and thirty minutes
export const DEFAULTS = { painter: "mock", mockDelay: 20, ceilingUSD: null, growCap: 10, tickMs: 1000, prefix: "/caddy-api/v1", heartbeatMs: 5000, sweepMs: 3600000 };
export const today = (now = Date.now()) => new Date(now).toISOString().slice(0, 10);
const tomorrow = (now = Date.now()) => { const d = new Date(now); d.setUTCHours(24, 0, 0, 0); return d.getTime(); };
const json = (res, code, body) => { res.writeHead(code, { "content-type": "application/json", "cache-control": "no-store", "access-control-allow-origin": "*" }); res.end(JSON.stringify(body)); };
const readRaw = (req, max) => new Promise((resolve, reject) => { const parts = []; let n = 0; req.on("data", (b) => { n += b.length; if (n <= max) parts.push(b); }); req.on("end", () => (n > max ? reject(Object.assign(new Error("too large"), { tooLarge: true })) : resolve(Buffer.concat(parts)))); req.on("error", reject); });   // a body over the limit is read and thrown away, so the answer reaches the sender
const readBody = (req) => new Promise((resolve, reject) => { let s = ""; req.on("data", (b) => { s += b; if (s.length > 4e6) reject(new Error("too large")); }); req.on("end", () => resolve(s)); req.on("error", reject); });
function writeJSON(file, obj) { const tmp = file + ".tmp"; writeFileSync(tmp, JSON.stringify(obj, null, 1) + "\n"); renameSync(tmp, file); }
export function loadFrames(dir = path.resolve(here, "../workbench/frames")) { setFrames(readdirSync(dir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(dir, f), "utf8")))); }

export function createApp(opts = {}) {
  const cfg = { ...DEFAULTS, ...opts }, dataDir = path.resolve(cfg.dataDir || path.join(here, "data"));
  mkdirSync(path.join(dataDir, "sets"), { recursive: true }); mkdirSync(path.join(dataDir, "grow"), { recursive: true });
  const queueFile = path.join(dataDir, "queue.json"), ledgerFile = path.join(dataDir, "ledger.json");
  const state = { jobs: [], ledger: {}, painting: null, started: Date.now(), now: cfg.now || Date.now };
  if (existsSync(queueFile)) { try { state.jobs = JSON.parse(readFileSync(queueFile, "utf8")).jobs || []; } catch { state.jobs = []; } }
  if (existsSync(ledgerFile)) { try { state.ledger = JSON.parse(readFileSync(ledgerFile, "utf8")); } catch { state.ledger = {}; } }
  for (const j of state.jobs) if (j.state === "painting") { j.state = "queued"; j.note = "restarted mid-painting"; }   // a restart: the job goes again
  const journal = () => writeJSON(queueFile, { schema: "mb-caddy-queue/1", jobs: state.jobs });
  const ledgerWrite = () => writeJSON(ledgerFile, state.ledger);
  journal();
  const dock = createDock({ dataDir, now: state.now }); dock.sweep();
  const realms = createRealms({ dataDir, now: state.now, fs: cfg.realmsFs });
  // --- the identity and the recovery print ---
  // state.identity: what identity.json holds. state.print: the print waiting (the seed, in memory only). A file that is there but unreadable is left alone: nothing is queued over it.
  const identityFile = path.join(dataDir, "identity.json");
  const validIdentity = (o) => !!o && o.v === 1 && typeof o.caddy === "string" && typeof o.recovery?.kid === "string" && typeof o.recovery?.pub === "string";
  state.identity = null; state.print = null; state.identityFault = false;
  if (existsSync(identityFile)) { try { const o = JSON.parse(readFileSync(identityFile, "utf8")); if (validIdentity(o)) state.identity = o; else state.identityFault = true; } catch { state.identityFault = true; } }
  else state.print = { caddy: cfg.caddyId || "k" + randomBytes(8).toString("hex"), seed: cfg.recoverySeed ? Uint8Array.from(cfg.recoverySeed) : new Uint8Array(randomBytes(32)), queuedAt: state.now(), built: null, taking: null };
  const builtPrint = () => state.print.built ||= recoveryPrint(state.print.seed);
  const identityBody = () => ({ ok: true, caddy: state.identity ? state.identity.caddy : state.print ? state.print.caddy : null, recovery: state.identity ? { kid: state.identity.recovery.kid, pub: state.identity.recovery.pub } : null });
  async function printTaken(body) {
    const pr = state.print;
    if (!pr) return state.identity ? [200, { ...identityBody(), changed: false }] : [409, { ok: false, error: "no print is waiting" }];
    if (body.print != null && body.print !== pr.caddy) return [409, { ok: false, error: "that is not the print waiting" }];
    if (!pr.taking) pr.taking = (async () => {
      const { kid, pub } = await builtPrint(), record = { v: 1, caddy: pr.caddy, recovery: { kid, pub }, printedAt: state.now() };
      writeJSON(identityFile, record);
      state.identity = record; state.print = null; pr.seed.fill(0);
    })();
    try { await pr.taking; } catch (e) { pr.taking = null; return [503, { ok: false, error: "the identity could not be stored: " + e.message }]; }
    return [200, { ...identityBody(), changed: true }];
  }
  const setDir = (species, sha) => path.join(dataDir, "sets", species, sha.slice(0, 16));
  const stored = (species, sha) => existsSync(path.join(setDir(species, sha), "manifest.json"));
  const day = () => (state.ledger[today(state.now())] ||= { calls: 0, spendUSD: 0, worlds: {} });
  const spentToday = () => day().spendUSD;
  const worldToday = (world) => day().worlds[world] || 0;
  // real painting needs the key, the daily limit and the ledger (MB_LEDGER); without any of them the real painter falls back to the mock
  const painterMode = () => (cfg.painter === "real" && (!process.env.GEMINI_API_KEY || cfg.ceilingUSD == null || !process.env.MB_LEDGER) ? "mock" : cfg.painter);
  const limitReached = () => cfg.ceilingUSD != null && spentToday() >= cfg.ceilingUSD;

  // --- the API ---
  async function handle(req, res) {
    const url = new URL(req.url, "http://x"), p = url.pathname.startsWith(cfg.prefix) ? url.pathname.slice(cfg.prefix.length) : url.pathname;
    try {
      if (req.method === "OPTIONS") { res.writeHead(204, { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, POST, PUT, DELETE", "access-control-allow-headers": "content-type" }); res.end(); return; }
      if (req.method === "GET" && p === "/status") return json(res, 200, status());
      if (req.method === "GET" && p === "/jobs") { const world = url.searchParams.get("world"); return json(res, 200, { jobs: state.jobs.filter((j) => !world || j.world === world).map(publicJob) }); }
      if (req.method === "POST" && p === "/grow") {
        let body; try { body = JSON.parse(await readBody(req) || "{}"); } catch { return json(res, 400, { ok: false, error: "the body is not JSON" }); }
        return json(res, ...grow(body));
      }
      // the identity and the recovery print: the print is the seed itself, so it is served only while it waits and is gone once taken
      if (req.method === "GET" && p === "/identity") return json(res, 200, { ...identityBody(), ...(state.identityFault ? { fault: true } : {}) });
      if (req.method === "GET" && p === "/print/pending") {
        if (!state.print) return json(res, 404, { ok: false, error: "no print is waiting" });
        const pr = state.print, { png } = await builtPrint();
        res.writeHead(200, { "content-type": "image/png", "cache-control": "no-store", "x-print": pr.caddy, "access-control-allow-origin": "*", "access-control-expose-headers": "x-print" }); res.end(png); return;
      }
      if (req.method === "POST" && p === "/print/taken") {
        let body; try { body = JSON.parse(await readBody(req) || "{}"); } catch { return json(res, 400, { ok: false, error: "the body is not JSON" }); }
        return json(res, ...await printTaken(body && typeof body === "object" ? body : {}));
      }
      // realms put to sleep (realms.mjs): the sleep files and the household ledger. A list reads no file; a bad file is 400 and nothing is written; a committed sleep is never dropped
      if (req.method === "GET" && p === "/realms/asleep") return json(res, ...await realms.list(url.searchParams.get("companion") || null));
      const rf = p.match(/^\/realms\/asleep\/([^/]+)$/);
      if (req.method === "PUT" && rf) {
        let bytes; try { bytes = await readRaw(req, MAX_BYTES); } catch (e) { return e.tooLarge ? json(res, 413, { ok: false, error: "the file is over 8 MB" }) : json(res, 400, { ok: false, error: "the file could not be read" }); }
        return json(res, ...await realms.put(decodeURIComponent(rf[1]), bytes));
      }
      if (req.method === "DELETE" && rf) return json(res, ...await realms.drop(decodeURIComponent(rf[1]), url.searchParams.get("sha")));
      if (req.method === "POST" && (p === "/realms/commit" || p === "/realm/clear")) {
        let body; try { body = JSON.parse(await readBody(req) || "{}"); } catch { return json(res, 400, { ok: false, error: "the body is not JSON" }); }
        if (!body || typeof body !== "object") body = {};
        return json(res, ...(p === "/realms/commit" ? await realms.commit(body.wid, body.sha) : await clearRealm(body.wid, body.sha)));
      }
      // the realm's records here, as the Station puts them in a sleep file's Caddy part
      if (req.method === "GET" && p === "/realm") {
        const w = url.searchParams.get("world"); if (!w || !WORLD_RE.test(w)) return json(res, 400, { ok: false, error: "a world id is required" });
        return json(res, 200, { ok: true, world: w, caddy: { dock: dock.record(w), jobs: state.jobs.filter((j) => j.world === w).map((j) => JSON.parse(JSON.stringify(j))), prints: [] } });
      }
      // the dock: a seat is a state (a repeat changes nothing); 400 on a wrong world, cradle or seated; 503 when it cannot be stored (nothing changed)
      if (req.method === "POST" && p === "/dock/seat") {
        let body; try { body = JSON.parse(await readBody(req) || "{}"); } catch { return json(res, 400, { ok: false, error: "the body is not JSON" }); }
        const r = dock.seat(body.world, body.cradle, body.seated, body.companion);
        return r.ok ? json(res, 200, r) : json(res, r.status, { ok: false, error: r.error, fault: !!r.fault });
      }
      if (req.method === "GET" && p === "/dock") {
        const w = url.searchParams.get("world"); if (w == null) return json(res, 200, { ok: true, worlds: dock.list() });
        return WORLD_RE.test(w) ? json(res, 200, dock.snapshot(w)) : json(res, 400, { ok: false, error: "no such world id" });
      }
      // the stream: the snapshot first, then dock and face events as they happen, and a heartbeat every 5 s
      if (req.method === "GET" && p === "/dock/events") {
        const w = url.searchParams.get("world"); if (!w || !WORLD_RE.test(w)) return json(res, 400, { ok: false, error: "the stream needs a world" });
        res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive", "access-control-allow-origin": "*", "x-accel-buffering": "no" });
        const send = (ev, data) => { res.write(`event: ${ev}\ndata: ${JSON.stringify(data)}\n\n`); };
        send("snapshot", dock.snapshot(w));
        const off = dock.subscribe(w, send), hb = setInterval(() => send("heartbeat", { at: state.now() }), cfg.heartbeatMs);
        req.on("close", () => { off(); clearInterval(hb); }); res.on("close", () => { off(); clearInterval(hb); });
        return;
      }
      const m = p.match(/^\/sets\/(S\d{2})\/([0-9a-f]{16,64})\/([a-z0-9.-]+)$/);
      if (req.method === "GET" && m) {
        const [, species, sha, file] = m; if (!SET_FILES.includes(file) && file !== "manifest.json") return json(res, 404, { ok: false, error: "no such file in a set" });
        const f = path.join(setDir(species, sha), file); if (!existsSync(f)) return json(res, 404, { ok: false, error: "no such set" });
        res.writeHead(200, { "content-type": file.endsWith(".png") ? "image/png" : "application/json", "cache-control": "public, max-age=31536000, immutable", "access-control-allow-origin": "*" }); res.end(readFileSync(f)); return;
      }
      return json(res, 404, { ok: false, error: "no such call" });
    } catch (e) { return json(res, 500, { ok: false, error: e.message }); }
  }
  // POST /realm/clear: only for a sleep this card holds as committed. The world's dock record goes, its jobs are cancelled, and the card notes the clear (the face reads it as asleep). Every step is safe to repeat.
  function clearRealm(wid, sha) {
    return realms.serial(async () => {
      await realms.ready;
      if (typeof wid !== "string" || !WORLD_RE.test(wid) || typeof sha !== "string" || !/^[0-9a-f]{64}$/.test(sha)) return [400, { ok: false, error: "wid and sha are required" }];
      if (!realms.canClear(wid, sha)) return [409, { ok: false, error: "that sleep is not committed here" }];
      const d = dock.clear(wid); if (!d.ok) return [503, { ok: false, error: d.error }];
      const before = state.jobs.length; state.jobs = state.jobs.filter((j) => j.world !== wid);
      if (state.jobs.length !== before) journal();
      let noted; try { noted = realms.markCleared(wid, sha); } catch (e) { return [503, { ok: false, error: "the Caddy could not store it: " + e.message }]; }
      return [200, { ok: true, changed: d.changed || state.jobs.length !== before || noted, asleep: realms.count() }];
    });
  }
  const publicJob = (j) => ({ id: j.id, world: j.world, species: j.species, sha: j.sha, state: j.state, tries: j.tries, nextAt: j.nextAt, createdAt: j.createdAt, doneAt: j.doneAt, error: j.error, painter: j.painter, set: j.state === "done" ? `${cfg.prefix}/sets/${j.species}/${j.sha.slice(0, 16)}/` : null });
  // POST /grow: nothing but a genome (and the world, and the page's cap beneath the server's) is accepted.
  function grow(body) {
    const { world, genome } = body; if (typeof world !== "string" || !world || !genome || typeof genome !== "object") return [400, { ok: false, error: "world and genome are required" }];
    const frame = frameOf(genome.species); if (!frame) return [400, { ok: false, error: "no frame for species " + genome.species }];
    const problems = genomeProblems(frame, genome); if (problems.length) return [400, { ok: false, error: "the genome does not build: " + problems.slice(0, 3).join("; ") }];
    const sha = genomeSha(genome);
    if (stored(genome.species, sha)) { const j = state.jobs.find((x) => x.sha === sha && x.world === world); return [200, { ok: true, sha, state: "done", set: `${cfg.prefix}/sets/${genome.species}/${sha.slice(0, 16)}/`, job: j ? publicJob(j) : null }]; }
    let job = state.jobs.find((x) => x.sha === sha && x.world === world && x.state !== "failed");
    if (!job) { job = { id: "j" + state.now().toString(36) + Math.random().toString(36).slice(2, 6), world, species: genome.species, sha, genome, state: "queued", tries: 0, nextAt: 0, createdAt: state.now(), painter: null, costUSD: 0 }; state.jobs.push(job); if (state.jobs.length > 500) state.jobs.splice(0, state.jobs.length - 500); journal(); }
    return [202, { ok: true, sha, state: job.state, job: publicJob(job) }];
  }
  function status() {
    const counts = {}; for (const j of state.jobs) counts[j.state] = (counts[j.state] || 0) + 1;
    return { ok: true, service: "mb-caddy", painter: painterMode(), configured: cfg.painter, queue: counts, today: { date: today(state.now()), calls: day().calls }, limitReached: limitReached(), growCap: cfg.growCap, promptVersion: PROMPT_VERSION, mockDelay: cfg.mockDelay, dock: dock.counts(), realms: { asleep: realms.count(), files: realms.entries().length }, identity: state.identity ? "printed" : state.print ? "print waiting" : "unreadable", uptimeS: Math.round((Date.now() - state.started) / 1000) };
  }
  // --- the worker: one job at a time, the daily limit and the caps honoured, failures retried ---
  async function tick() {
    if (state.painting) return null;
    const now = state.now();
    const job = state.jobs.find((j) => j.state === "queued" && j.nextAt <= now) || state.jobs.find((j) => j.state === "capped" && j.nextAt <= now);
    if (!job) return null;
    const mode = painterMode();
    if (mode === "off") { job.state = "queued"; job.nextAt = now + 60000; journal(); return job; }
    if (mode === "real" && limitReached()) { job.state = "capped"; job.error = "the day's limit is reached"; job.nextAt = tomorrow(now); journal(); return job; }
    if (worldToday(job.world) >= (job.cap ?? cfg.growCap)) { job.state = "capped"; job.error = "the world's daily grow cap is reached"; job.nextAt = tomorrow(now); journal(); return job; }
    job.state = "painting"; job.painter = mode; job.startedAt = now; state.painting = job; journal();
    try {
      const frame = frameOf(job.species);
      const r = mode === "mock" ? await mockPaint(job, frame, { mockDelay: cfg.mockDelay }) : await realPaint(job, frame, { growService: cfg.growService, python: cfg.python, outRoot: path.join(dataDir, "grow") });
      const dir = setDir(job.species, job.sha); mkdirSync(dir, { recursive: true });
      for (const [name, buf] of Object.entries(r.files)) writeFileSync(path.join(dir, name), buf);
      writeJSON(path.join(dir, "manifest.json"), { schema: "mb-caddy-set/1", species: job.species, sha: job.sha, world: job.world, ...r.manifest, files: Object.keys(r.files), paintedAt: state.now() });
      job.state = "done"; job.doneAt = state.now(); job.costUSD = r.costUSD; delete job.error;
      const d = day(); d.calls += r.manifest.calls || (mode === "real" ? 1 : 0); d.spendUSD += r.costUSD; d.worlds[job.world] = (d.worlds[job.world] || 0) + 1; ledgerWrite();
    } catch (e) {
      job.tries++; job.error = e.message;
      // a failed run's spend still counts toward the day (the painter attaches it to the error)
      if (e.costUSD || e.calls) { const d = day(); d.calls += e.calls || 0; d.spendUSD += e.costUSD || 0; ledgerWrite(); }
      if (job.tries >= RETRY_S.length) job.state = "failed"; else { job.state = "queued"; job.nextAt = state.now() + RETRY_S[job.tries - 1] * 1000; }
    }
    state.painting = null; journal();
    return job;
  }
  let timer = null, sweeper = null;
  const start = () => { if (!timer) timer = setInterval(() => { tick().catch(() => {}); }, cfg.tickMs); if (!sweeper) sweeper = setInterval(() => dock.sweep(), cfg.sweepMs); return timer; };
  const stop = () => { if (timer) clearInterval(timer); if (sweeper) clearInterval(sweeper); timer = sweeper = null; };
  return { handle, tick, start, stop, status, state, cfg, dataDir, grow, setDir, dock, realms };
}
