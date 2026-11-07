// The Caddy's card for realms put to sleep: the sleep files, the household ledger and the index of their headers.
//   <data>/realms/asleep/<wid>.<sha8>.mbr   one file for each sleep (a realm woken and put to sleep again keeps both); sha8 is the first 8 hex characters of the file's hash
//   <data>/realms/ledger.jsonl              one line { sha, state, wid, at } for each change: kept, committed, woken, dropped, and cleared (the realm's records were removed here)
//   <data>/realms/index.json                { schema, entries }, the headers of the files on the card, so a list reads no file; rebuilt from the files when it is missing or does not match them
// A file is written only after it verifies in memory, beside under a temporary name and renamed over, then read back and verified again. The Caddy never opens the body for a list.
// The files are the truth: the ledger and the index follow them, and a crash between two writes is mended at the next start (a file with no `kept` line gets one).
// Plain Node and the shared realm module; `fs` is a parameter so a test can count what is read.
import nodeFs from "node:fs";
import path from "node:path";
import { verifySleepFile, fileHash, ledgerState, MAX_BYTES } from "../play/src/realm/sleepfile.mjs";

export { MAX_BYTES };
export const WID_RE = /^[A-Za-z0-9_-]{1,64}$/;
export const SHA_RE = /^[0-9a-f]{64}$/;
const FILE_RE = /^([A-Za-z0-9_-]{1,64})\.([0-9a-f]{8})\.mbr$/;
const SCHEMA = "mb-caddy-realms/1";

export function createRealms({ dataDir, fs = nodeFs, now = Date.now } = {}) {
  const root = path.join(dataDir, "realms"), asleepDir = path.join(root, "asleep");
  const ledgerFile = path.join(root, "ledger.jsonl"), indexFile = path.join(root, "index.json");
  let ledger = [], entries = [], bad = [];
  const fileOf = (e) => path.join(asleepDir, e.file);
  const stateOf = (sha) => ledgerState([ledger], sha);
  const publicEntry = (e) => ({ wid: e.wid, sha: e.sha, sha8: e.sha.slice(0, 8), bytes: e.bytes, state: stateOf(e.sha), header: e.header });
  const sort = () => entries.sort((a, b) => (b.header.slept - a.header.slept) || (a.sha < b.sha ? -1 : a.sha > b.sha ? 1 : 0));

  function writeAndRename(file, data) {
    const tmp = file + ".tmp";
    try { fs.writeFileSync(tmp, data); fs.renameSync(tmp, file); } catch (e) { try { fs.rmSync(tmp, { force: true }); } catch { /* left for the next start */ } throw e; }
  }
  function appendLedger(sha, state, wid) {
    const line = { sha, state, wid, at: now() };
    fs.mkdirSync(root, { recursive: true });
    fs.appendFileSync(ledgerFile, JSON.stringify(line) + "\n");
    ledger.push(line);
  }
  function writeIndex() { fs.mkdirSync(root, { recursive: true }); writeAndRename(indexFile, JSON.stringify({ schema: SCHEMA, entries }, null, 1) + "\n"); }

  // ---- start: the ledger, then the index (read, or rebuilt from the files) ----
  async function init() {
    if (fs.existsSync(ledgerFile)) {
      const text = fs.readFileSync(ledgerFile, "utf8");
      for (const line of text.split("\n")) { if (!line) continue; try { const o = JSON.parse(line); if (o && typeof o.sha === "string" && typeof o.state === "string") ledger.push(o); } catch { /* a torn last line */ } }
      if (text && !text.endsWith("\n")) fs.appendFileSync(ledgerFile, "\n");
    }
    const names = fs.existsSync(asleepDir) ? fs.readdirSync(asleepDir) : [];
    for (const n of names) if (n.endsWith(".tmp")) { try { fs.rmSync(path.join(asleepDir, n), { force: true }); } catch { /* left */ } }
    const files = names.filter((n) => FILE_RE.test(n)).sort();
    let idx = null;
    if (fs.existsSync(indexFile)) { try { const o = JSON.parse(fs.readFileSync(indexFile, "utf8")); if (o && o.schema === SCHEMA && Array.isArray(o.entries)) idx = o.entries; } catch { idx = null; } }
    const same = idx && idx.length === files.length && idx.every((e) => e && typeof e.file === "string" && typeof e.sha === "string" && SHA_RE.test(e.sha) && e.header && typeof e.header === "object" && files.includes(e.file) && e.file === e.wid + "." + e.sha.slice(0, 8) + ".mbr") && new Set(idx.map((e) => e.file)).size === files.length;
    if (same) { entries = idx; sort(); return; }
    // rebuilt from the files: each one is read, verified and hashed; a file that does not verify is left where it is and not listed
    const rebuilt = [];
    for (const f of files) {
      const [, wid, sha8] = f.match(FILE_RE);
      try {
        const bytes = fs.readFileSync(path.join(asleepDir, f)), v = await verifySleepFile(bytes), sha = await fileHash(bytes);
        if (!v.ok || v.header.wid !== wid || sha.slice(0, 8) !== sha8) throw new Error("does not verify");
        rebuilt.push({ wid, sha, file: f, bytes: bytes.length, header: v.header });
      } catch { bad.push(f); }
    }
    entries = rebuilt; sort();
    for (const e of entries) if (stateOf(e.sha) === "unknown") appendLedger(e.sha, "kept", e.wid);   // written, then the crash before its line
    if (entries.length || idx) writeIndex();
  }
  const ready = init();

  // one write at a time: a verify is async, and two PUTs of one file must not interleave
  let chain = Promise.resolve();
  const serial = (fn) => { const run = chain.then(fn, fn); chain = run.then(() => {}, () => {}); return run; };

  // ---- the calls: each answers [status, body] ----
  // put(wid, bytes): 400 for a file that does not verify or is for another realm, 409 for a file already woken, 503 when it cannot be stored (nothing is left behind)
  const put = (wid, bytes) => serial(async () => {
    await ready;
    if (!WID_RE.test(wid || "")) return [400, { ok: false, error: "a realm id is required (letters, digits, - and _)" }];
    if (!bytes || !bytes.length) return [400, { ok: false, error: "the file is empty" }];
    if (bytes.length > MAX_BYTES) return [413, { ok: false, error: "the file is over 8 MB" }];
    const v = await verifySleepFile(bytes);
    if (!v.ok) return [400, { ok: false, error: "the file does not verify", why: v.why }];
    if (v.header.wid !== wid) return [400, { ok: false, error: "the file is for another realm", why: "wid" }];
    const sha = await fileHash(bytes), name = wid + "." + sha.slice(0, 8) + ".mbr", file = path.join(asleepDir, name);
    if (stateOf(sha) === "woken") return [409, { ok: false, error: "that file was woken already" }];
    const had = entries.find((e) => e.sha === sha);
    try {
      if (!had) {
        fs.mkdirSync(asleepDir, { recursive: true });
        const existed = fs.existsSync(file);
        writeAndRename(file, bytes);
        let back; try { back = await verifySleepFile(fs.readFileSync(file)); } catch { back = { ok: false }; }
        if (!back.ok || (await fileHash(fs.readFileSync(file))) !== sha) { if (!existed) fs.rmSync(file, { force: true }); throw new Error("it did not read back"); }
        entries.push({ wid, sha, file: name, bytes: bytes.length, header: v.header }); sort();
      }
      if (stateOf(sha) === "unknown" || stateOf(sha) === "dropped") appendLedger(sha, "kept", wid);
      if (!had) writeIndex();
    } catch (e) {
      if (!had) { entries = entries.filter((x) => x.sha !== sha); }
      return [503, { ok: false, error: "the Caddy could not store it: " + e.message }];
    }
    return [200, { ok: true, sha, changed: !had, state: stateOf(sha) }];
  });

  // The headers on the card, newest first; `companion` keeps one Companion's. Reads no file.
  const list = async (companion) => {
    await ready;
    const rows = entries.filter((e) => !companion || (e.header.companion && e.header.companion.id === companion)).map(publicEntry);
    return [200, { ok: true, asleep: count(), face: faceAsleep(), realms: rows }];
  };

  // commit(wid, sha): the sleep is committed, once its file is kept here. Idempotent.
  const commit = (wid, sha) => serial(async () => {
    await ready;
    if (!WID_RE.test(wid || "") || !SHA_RE.test(sha || "")) return [400, { ok: false, error: "wid and sha are required" }];
    const e = entries.find((x) => x.sha === sha && x.wid === wid);
    if (!e) return [404, { ok: false, error: "no such file is kept here" }];
    const st = stateOf(sha);
    if (st === "woken") return [409, { ok: false, error: "that file was woken already" }];
    if (st === "committed") return [200, { ok: true, state: "committed", changed: false }];
    try { appendLedger(sha, "committed", wid); } catch (err) { return [503, { ok: false, error: "the Caddy could not store it: " + err.message }]; }
    return [200, { ok: true, state: "committed", changed: true }];
  });

  // drop(wid, sha): a rollback. Only a file that is kept and not committed; a file already dropped answers again without change.
  const drop = (wid, sha) => serial(async () => {
    await ready;
    if (!WID_RE.test(wid || "") || !SHA_RE.test(sha || "")) return [400, { ok: false, error: "wid and sha are required" }];
    const st = stateOf(sha);
    if (st === "committed") return [409, { ok: false, error: "a committed sleep is never dropped" }];
    if (st === "woken") return [409, { ok: false, error: "that file was woken already" }];
    const e = entries.find((x) => x.sha === sha && x.wid === wid);
    if (!e) return st === "dropped" && ledger.some((l) => l.sha === sha && l.wid === wid) ? [200, { ok: true, state: "dropped", changed: false }] : [404, { ok: false, error: "no such file is kept here" }];
    try {
      fs.rmSync(fileOf(e), { force: true });
      entries = entries.filter((x) => x !== e); writeIndex();
      appendLedger(sha, "dropped", wid);
    } catch (err) {
      if (fs.existsSync(fileOf(e)) && !entries.includes(e)) { entries.push(e); sort(); }
      return [503, { ok: false, error: "the Caddy could not remove it: " + err.message }];
    }
    return [200, { ok: true, state: "dropped", changed: true }];
  });

  // The realm may be cleared here only when this sha is committed for this wid (the ledger says so, not the caller).
  const canClear = (wid, sha) => WID_RE.test(wid || "") && SHA_RE.test(sha || "") && stateOf(sha) === "committed" && ledger.some((l) => l.sha === sha && l.wid === wid && l.state === "committed");
  // markCleared: the line that says this card has cleared the realm's records. Written once for a sha.
  const markCleared = (wid, sha) => { if (ledger.some((l) => l.sha === sha && l.state === "cleared")) return false; appendLedger(sha, "cleared", wid); return true; };

  // The realms asleep on this card: committed files, not woken. The face's count.
  const count = () => entries.filter((e) => stateOf(e.sha) === "committed").length;
  // The last clear, { wid, sha, at }, while it is the newest thing that happened to the card's realms; null before any. The face ends it at the first crate of the new realm.
  const faceAsleep = () => { for (let i = ledger.length - 1; i >= 0; i--) if (ledger[i].state === "cleared") return { wid: ledger[i].wid, sha: ledger[i].sha, at: ledger[i].at }; return null; };

  return { ready, put, list, commit, drop, canClear, markCleared, count, faceAsleep, state: stateOf, entries: () => entries.map(publicEntry), ledger: () => ledger.map((l) => ({ ...l })), bad: () => bad.slice(), dir: root, serial };
}
