// The household for the sleep tests: one shared store (the sandbox's localStorage), the Companion (playtest/companion-stub.mjs, on the real responder), the Caddy app in process
// (caddy/app.mjs on a temporary data directory) and the Station's host for sleep.mjs. Every write any of them makes passes a numbered point that a test can arm:
//   before   the Station dies just before the write (nothing it does after happens)
//   lost     the Station dies just after a call to the Caddy or the Companion was carried out, before it hears the reply
//   lostAlive the same, but the Station lives on and sees an error
//   fail     the write or call throws once and the Station lives on (a full store, a Caddy that does not answer)
//   power    everything dies just before the write: the Station, the Companion and the Caddy
//   lift     the Companion is lifted from the cradle just before the write; nothing dies
import nodeFs, { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import { createApp } from "../../caddy/app.mjs";
import { sleepingCompanion, mulberry32 } from "../../playtest/companion-stub.mjs";
import { makeSleep, makeShellAsk, JOURNAL_KEY, INDEX_KEY, LEDGER_KEY, COPY_PREFIX } from "../src/sleep.mjs";
import { sleepClient } from "../src/caddy.mjs";
import * as C from "../src/companions.mjs";
import * as S from "../src/state.mjs";
import { migrate8 } from "../../exploration/src/regions.mjs";
import { pairFromSeed, memoryStore } from "../../play/src/realm/keys.mjs";
import { hexDecode } from "../../play/src/realm/b64.mjs";
import { kid } from "../../play/src/realm/recovery.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
export const SCRATCH = path.join(here, ".sleep-scratch");
export const V = JSON.parse(readFileSync(new URL("../../play/src/realm/vectors.json", import.meta.url), "utf8"));
export const V8 = JSON.parse(readFileSync(new URL("./fixtures/save-v8-played-g2.json", import.meta.url), "utf8"));
export const COMPANION_ID = "cstubcompani1", OLD = V8.wid;
export const T0 = 1800000000000;

export class Crash extends Error { constructor(m) { super(m); this.crash = true; } }

// ---- a life: one run of the household between two reboots, and the point that may be armed in it ----
// plan: { mode, i, scope } with i the index among the points the mode counts; null: nothing armed.
const WRITE_MODES = new Set(["before", "lost", "lostAlive", "power", "lift"]);
export function newLife() {
  const L = { plan: null, dead: new Set(), points: [], counted: [], n: 0, fired: null, liftFn: null };
  L.arm = (plan) => { L.plan = plan; L.n = 0; L.points = []; L.counted = []; L.fired = null; return L; };
  const counts = (rec) => {
    const plan = L.plan;
    if (!plan) return false;
    if (plan.mode === "fail") return rec.owner === "station";
    if (rec.read) return false;
    if (plan.mode === "before") return rec.owner === "station";
    if (plan.mode === "lost" || plan.mode === "lostAlive") return rec.owner === "station" && rec.remote;
    return true;   // power and lift: every write of the three
  };
  // owner: station | companion | caddy. Throws Crash when the owner is dead.
  L.point = (owner, kind, label, extra = {}) => {
    if (L.dead.has(owner)) throw new Crash("dead: " + owner);
    const rec = { i: L.points.length, owner, kind, label, remote: !!extra.remote, read: !!extra.read, state: extra.state ?? null };
    L.points.push(rec);
    if (!counts(rec)) return rec;
    L.counted.push(rec);
    if (L.n++ !== L.plan.i) return rec;
    const plan = L.plan; L.fired = rec; rec.armed = plan.mode; rec.journal = extra.journal ? extra.journal() : null;
    if (plan.mode === "before") { L.dead.add("station"); throw new Crash("crash before " + label); }
    if (plan.mode === "power") { for (const o of ["station", "companion", "caddy"]) L.dead.add(o); throw new Crash("power cut before " + label); }
    if (plan.mode === "fail") throw new Error("injected failure: " + label);
    if (plan.mode === "lift") (plan.run || L.liftFn)();
    return rec;   // lost and lostAlive act after the call
  };
  L.after = (rec) => {
    if (rec.armed === "lost") { L.dead.add("station"); throw new Crash("crash after " + rec.label); }
    if (rec.armed === "lostAlive") { if (L.plan.then) L.plan.then(); throw new Error("the reply was lost: " + rec.label); }
  };
  return L;
}

// ---- the store ----
// The shared localStorage over a Map that outlives every life. Each user of it sees it through its own wrapper, which passes its writes to the point function of the life it was made in.
function storeFor(w, owner, life) {
  const disk = w.disk;
  const keys = () => [...disk.keys()];
  const label = (op, k, v) => {
    if (k === JOURNAL_KEY) return op === "remove" ? "journal closed" : "journal " + JSON.parse(v).state;
    if (k.startsWith(COPY_PREFIX)) return op === "remove" ? "Station copy dropped" : "Station copy";
    if (k === LEDGER_KEY) return "Station ledger";
    if (k === INDEX_KEY) return "Station index";
    if (k.startsWith("mb-sleep-pending@")) return op === "remove" ? "tombstone dropped" : "tombstone " + JSON.parse(v).state;
    if (k === w.saveKey) { if (op === "remove") return "save removed"; const o = JSON.parse(v); return o.wid !== OLD && o.wid === w.newWidSeen && !o.st ? "Companion's new realm" : o.wid !== OLD && o.st ? "Station part fresh" : "save rewritten"; }
    return "store " + k;
  };
  return {
    get length() { return disk.size; }, key: (i) => keys()[i] ?? null,
    getItem: (k) => { const v = disk.has(k) ? disk.get(k) : null; return w.tamper && w.tamper.get && v != null ? w.tamper.get(k, v) : v; },
    setItem(k, v) { v = String(v); life.point(owner, "set", label("set", k, v), { journal: () => w.journalState(), state: k === JOURNAL_KEY ? JSON.parse(v).state : null }); disk.set(k, v); if (k === JOURNAL_KEY && JSON.parse(v).state === "commit") w.atCommit(JSON.parse(v)); },
    removeItem(k) { if (!disk.has(k)) return; life.point(owner, "remove", label("remove", k), { journal: () => w.journalState() }); disk.delete(k); },
  };
}

// ---- the Caddy ----
function hookedFs(w, life) {
  const name = (f) => path.basename(String(f)).replace(/^[A-Za-z0-9_-]+\.[0-9a-f]{8}\.mbr/, "<wid>.<sha8>.mbr");
  const tag = (f, d) => { const n = name(f); if (n === "ledger.jsonl") { try { return "ledger line " + JSON.parse(String(d)).state; } catch { return "ledger line"; } } return n; };
  return { ...nodeFs,
    writeFileSync: (f, d, o) => { life.point("caddy", "fs", "Caddy writes " + tag(f, d), { journal: () => w.journalState() }); return nodeFs.writeFileSync(f, d, o); },
    renameSync: (a, b) => { life.point("caddy", "fs", "Caddy renames to " + name(b), { journal: () => w.journalState() }); return nodeFs.renameSync(a, b); },
    appendFileSync: (f, d, o) => { life.point("caddy", "fs", "Caddy writes " + tag(f, d), { journal: () => w.journalState() }); return nodeFs.appendFileSync(f, d, o); },
    rmSync: (f, o) => { if (!nodeFs.existsSync(f)) return; life.point("caddy", "fs", "Caddy removes " + name(f), { journal: () => w.journalState() }); return nodeFs.rmSync(f, o); },
  };
}
async function viaApp(app, url, init = {}) {
  const u = new URL(url, "http://x");
  const chunks = init.body == null ? [] : [Buffer.from(init.body)];
  const req = Readable.from(chunks); Object.assign(req, { method: init.method || "GET", url: u.pathname + u.search, headers: {} });
  let code = 200, text = "";
  await new Promise((resolve) => {
    const res = { writeHead(c) { code = c; }, write(t) { text += t; }, end(t) { if (t) text += String(t); resolve(); }, on() {}, once() {} };
    app.handle(req, res).catch(resolve);
  });
  return { status: code, ok: code < 300, json: async () => JSON.parse(text || "{}") };
}

// ---- the world ----
export async function makeWorld({ realmSleep = true } = {}) {
  mkdirSync(SCRATCH, { recursive: true });
  const dir = mkdtempSync(path.join(SCRATCH, "w-"));
  const w = { dir, disk: new Map(), keys: memoryStore(), docked: true, settings: { realmSleep }, offline: false, fetchLog: [], saveKey: "mb-save-v8@" + COMPANION_ID, newWidSeen: null, companion: null, caddy: null, life: null, quota: undefined, pub: null, clock: T0 + 1000 };
  // The rule that must hold the instant the journal says commit: the Caddy holds the file (and its ledger says kept), the Station holds its copy, and they are the same bytes. Misses are kept for the tests.
  w.commitMisses = [];
  w.atCommit = (j) => {
    const name = `${j.wid}.${j.sha.slice(0, 8)}.mbr`, f = path.join(dir, "realms", "asleep", name), copy = w.disk.get(COPY_PREFIX + `${j.wid}.${j.sha.slice(0, 8)}`);
    const onCard = existsSync(f) ? readFileSync(f, "utf8") : null, ledger = path.join(dir, "realms", "ledger.jsonl");
    const kept = existsSync(ledger) && readFileSync(ledger, "utf8").split("\n").filter(Boolean).some((l) => { const o = JSON.parse(l); return o.sha === j.sha && o.state === "kept"; });
    if (onCard == null) w.commitMisses.push("the card has no file at the commit");
    if (!kept) w.commitMisses.push("the card's ledger has no kept line at the commit");
    if (copy == null) w.commitMisses.push("the Station has no copy at the commit");
    if (onCard != null && copy != null && onCard !== copy) w.commitMisses.push("the two copies differ at the commit");
  };
  w.journalState = () => { try { const j = JSON.parse(w.disk.get(JOURNAL_KEY)); return j.state; } catch { return null; } };
  w.close = () => { try { rmSync(dir, { recursive: true, force: true }); } catch { /* left for the sweep */ } };
  const pair = await pairFromSeed(hexDecode(V.companion.seed)); w.pub = pair.pub;
  await w.keys.putIfAbsent(COMPANION_ID, pair);
  // the Caddy's card: its identity (printed), a job and the dock record of the realm that will sleep
  writeFileSync(path.join(dir, "identity.json"), JSON.stringify({ v: 1, caddy: "ktestcaddy", recovery: { kid: await kid(V.recovery.pub), pub: V.recovery.pub }, printedAt: T0 }));
  writeFileSync(path.join(dir, "queue.json"), JSON.stringify({ schema: "mb-caddy-queue/1", jobs: [{ id: "j1", world: OLD, species: "S01", sha: "ab".repeat(8), state: "queued", tries: 0, nextAt: 0, createdAt: T0 }, { id: "j2", world: "wother", species: "S01", sha: "cd".repeat(8), state: "queued", tries: 0, nextAt: 0, createdAt: T0 }] }));
  // the shared save: the played v8 save, migrated, with its Station part
  const save = { ...migrate8(V8, { now: T0 }), companionId: COMPANION_ID };
  w.disk.set(w.saveKey, JSON.stringify(save));
  w.initialRaw = w.disk.get(w.saveKey);
  w.newLife = () => { const L = newLife(); L.liftFn = () => lift(w); return L; };
  w.setupLife = w.newLife();
  startCaddy(w, w.setupLife); w.caddy.dock.seat(OLD, "station", true); w.caddy.dock.seat(OLD, "companion", true, { id: COMPANION_ID, name: "Companion A" });
  w.initialDock = w.caddy.dock.record(OLD);
  w.initialJobs = JSON.parse(JSON.stringify(w.caddy.state.jobs.filter((j) => j.world === OLD)));
  const first = w.setupLife;
  await startCompanion(w, first, { seated: true });
  C.companionDocked(storeFor(w, "plain", newLife()), { id: COMPANION_ID, name: "Companion A", pub: w.pub });   // the dock: the Station trusts this key
  w.mapRaw = w.disk.get(C.MAP_KEY);
  w.life = first;
  w.stationFor = (life) => stationFor(w, life);
  return w;
}

function startCaddy(w, life) {
  w.caddy = createApp({ dataDir: w.dir, now: () => T0, realmsFs: hookedFs(w, life), caddyId: "ktestcaddy" });
  w.caddyLife = life;
}
async function startCompanion(w, life, { seated }) {
  const store = storeFor(w, "companion", life);
  w.companion = sleepingCompanion({ store, keys: w.keys, id: COMPANION_ID, now: () => T0, hooks: (w.companionHooks ||= {}) });
  await w.companion.boot();
  await w.companion.seat(seated);
  w.companion.life = life;
}
// The household powers up again after a cut: the Caddy and the Companion start from what is on their disks.
export async function powerUp(w, life, { seated = true } = {}) {
  startCaddy(w, life);
  await startCompanion(w, life, { seated });
  w.docked = seated;
}
export function lift(w) { w.docked = false; w.companion.seat(false); }
export async function dock(w) { w.docked = true; await w.companion.seat(true); }

// ---- the Station ----
function stationFor(w, life) {
  const store = storeFor(w, "station", life);
  const plain = storeFor(w, "plain", newLife());   // reads only: companions.mjs may look, never write
  const rand = mulberry32(1234);   // the same dice in every run, so newSeed and newWid are the same
  const call = async (label, init, run) => {
    const write = (init.method || "GET") !== "GET";
    const rec = life.point("station", "fetch", label, { remote: true, read: !write, journal: () => w.journalState() });
    if (w.offline) throw new Error("the Caddy does not answer");
    w.fetchLog.push(label);
    const r = await run();
    life.after(rec);
    return w.tamper && w.tamper.fetch ? w.tamper.fetch(label, r) : r;
  };
  const fetch = (url, init = {}) => {
    const route = new URL(url, "http://x").pathname.replace(/^\/caddy-api\/v1/, "");
    const label = (init.method || "GET") + " " + route.replace(/\/asleep\/[^/]+$/, "/asleep/<wid>") + (init.method === "DELETE" ? " (drop)" : "");
    return call(label, init, () => viaApp(w.caddy, url, init));
  };
  const shell = { listeners: [] };
  const post = (m) => {
    const rec = life.point("station", "ask", "Companion " + m.op, { remote: true, journal: () => w.journalState() });
    if (m.op === "sign" || m.op === "clear") w.newWidSeen = m.newWid;
    const { t, nonce, op, ...rest } = m;
    Promise.resolve(w.companion.ask(op, rest))
      .then((ack0) => { let ack = ack0; try { life.after(rec); } catch { return; } if (w.tamper && w.tamper.ask) ack = w.tamper.ask(op, ack); for (const fn of shell.listeners) fn({ t: "mb-sleep-ack", nonce: m.nonce, op: m.op, ...ack }); });
  };
  const askShell = makeShellAsk({ post, listen: (fn) => { shell.listeners.push(fn); }, timeoutMs: 400 });
  const h = {
    store, caddy: sleepClient({ fetch, base: "/caddy-api/v1" }), companion: askShell,
    settings: () => w.settings, docked: () => w.docked,
    who: () => { const k = C.knownCompanion(plain, COMPANION_ID); return { id: COMPANION_ID, name: k ? k.name : "Companion A", pub: C.trustedPub(plain, COMPANION_ID) }; },
    saveKey: () => w.saveKey,
    freshStation(newWid) { const o = JSON.parse(store.getItem(w.saveKey)); o.st = S.freshSt(newWid, o.turn || 0, T0); store.setItem(w.saveKey, JSON.stringify(o)); },
    now: () => (w.clock += 1000), rand, quota: w.quota,
  };
  const sleep = makeSleep(h);
  return { sleep, h, store, life };
}

// ---- what is on the disks ----
export const readJSON = (f) => JSON.parse(readFileSync(f, "utf8"));
export const caddyLedger = (w) => { const f = path.join(w.dir, "realms", "ledger.jsonl"); return existsSync(f) ? readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []; };
export const caddyFiles = (w) => { const d = path.join(w.dir, "realms", "asleep"); return existsSync(d) ? readdirSync(d).sort() : []; };
export const dockFile = (w, wid) => path.join(w.dir, "dock", wid + ".json");
export const queueJobs = (w) => readJSON(path.join(w.dir, "queue.json")).jobs;
export const stationLedger = (w) => JSON.parse(w.disk.get(LEDGER_KEY) ?? "[]");
export const copyKeys = (w) => [...w.disk.keys()].filter((k) => k.startsWith(COPY_PREFIX)).sort();
export const savedNow = (w) => JSON.parse(w.disk.get(w.saveKey));
export const tombstone = (w) => { const raw = w.disk.get("mb-sleep-pending@" + COMPANION_ID); return raw ? JSON.parse(raw) : null; };
// Every byte the household holds that a sleep could touch, for "nothing was written".
export function snapshot(w) {
  const files = [];
  const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) walk(f); else files.push([path.relative(w.dir, f), readFileSync(f, "utf8")]); } };
  walk(w.dir);
  return { disk: [...w.disk.entries()].sort(), files: files.sort() };
}
export { WRITE_MODES };
