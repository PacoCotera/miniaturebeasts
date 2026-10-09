// The Caddy service (station-build.md §2.4): brokers paintings for the Station page on the sandbox. A
// genome in, validated whole against its frame and built; its set stored by the genome's SHA-256; a
// queue journaled so a job survives a restart; a mock painter or the real one behind the service's own
// mode; a hard daily limit that no page can raise; a per-world daily grow cap; status.
// Plain Node, no dependencies; createApp() returns the request handler and the worker so the tests and
// the journey run it in-process, server.mjs runs it as a service.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, renameSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, genomeSha, genomeProblems } from "../station/src/genome.mjs";
import { mockPaint, realPaint, SET_FILES, PROMPT_VERSION } from "./painter.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
export const RETRY_S = [60, 300, 1800];   // a failed call retries at one, five and thirty minutes
export const DEFAULTS = { painter: "mock", mockDelay: 20, ceilingUSD: null, growCap: 10, tickMs: 1000, prefix: "/caddy-api/v1" };
export const today = (now = Date.now()) => new Date(now).toISOString().slice(0, 10);
const tomorrow = (now = Date.now()) => { const d = new Date(now); d.setUTCHours(24, 0, 0, 0); return d.getTime(); };
const json = (res, code, body) => { res.writeHead(code, { "content-type": "application/json", "cache-control": "no-store", "access-control-allow-origin": "*" }); res.end(JSON.stringify(body)); };
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
  const setDir = (species, sha) => path.join(dataDir, "sets", species, sha.slice(0, 16));
  const stored = (species, sha) => existsSync(path.join(setDir(species, sha), "manifest.json"));
  const day = () => (state.ledger[today(state.now())] ||= { calls: 0, spendUSD: 0, worlds: {} });
  const spentToday = () => day().spendUSD;
  const worldToday = (world) => day().worlds[world] || 0;
  // real painting needs the key and the daily limit; without either the real painter falls back to the mock
  const painterMode = () => (cfg.painter === "real" && (!process.env.GEMINI_API_KEY || cfg.ceilingUSD == null) ? "mock" : cfg.painter);
  const limitReached = () => cfg.ceilingUSD != null && spentToday() >= cfg.ceilingUSD;

  // --- the API ---
  async function handle(req, res) {
    const url = new URL(req.url, "http://x"), p = url.pathname.startsWith(cfg.prefix) ? url.pathname.slice(cfg.prefix.length) : url.pathname;
    try {
      if (req.method === "OPTIONS") { res.writeHead(204, { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, POST", "access-control-allow-headers": "content-type" }); res.end(); return; }
      if (req.method === "GET" && p === "/status") return json(res, 200, status());
      if (req.method === "GET" && p === "/jobs") { const world = url.searchParams.get("world"); return json(res, 200, { jobs: state.jobs.filter((j) => !world || j.world === world).map(publicJob) }); }
      if (req.method === "POST" && p === "/grow") {
        let body; try { body = JSON.parse(await readBody(req) || "{}"); } catch { return json(res, 400, { ok: false, error: "the body is not JSON" }); }
        return json(res, ...grow(body));
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
    return { ok: true, service: "mb-caddy", painter: painterMode(), configured: cfg.painter, queue: counts, today: { date: today(state.now()), calls: day().calls }, limitReached: limitReached(), growCap: cfg.growCap, promptVersion: PROMPT_VERSION, mockDelay: cfg.mockDelay, uptimeS: Math.round((Date.now() - state.started) / 1000) };
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
      if (job.tries >= RETRY_S.length) job.state = "failed"; else { job.state = "queued"; job.nextAt = state.now() + RETRY_S[job.tries - 1] * 1000; }
    }
    state.painting = null; journal();
    return job;
  }
  let timer = null;
  const start = () => { if (!timer) timer = setInterval(() => { tick().catch(() => {}); }, cfg.tickMs); return timer; };
  const stop = () => { if (timer) clearInterval(timer); timer = null; };
  return { handle, tick, start, stop, status, state, cfg, dataDir, grow, setDir };
}
