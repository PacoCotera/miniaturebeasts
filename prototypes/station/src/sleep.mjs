// Putting a realm to sleep, the Station's side: the steps, the journal, rollback, roll forward, the copies the Station keeps and its ledger. No DOM and no game module:
// it is run by a host `h`, as the intents are, so Node runs it as it is and the crash tests can break any write.
//
//   hold, keep, commit, clear. Building and signing happen during the hold, in memory; the Companion signs, nothing is written to the Caddy until the hold completes.
//   Every write is followed by a journal step (mb-sleep-journal); a journal still open at boot runs rollback if it stops before `commit`, and roll forward if it is at or after.
//     open         the hold began: newSeed and newWid are drawn, the Companion is locked
//     signed       the Companion signed (it wrote its tombstone first); the file is whole in memory and its hash is in the journal
//     keptStation  the Station's copy is written, read back and verified
//     keptCaddy    the Caddy has the file and lists it
//     commit       the decision, one atomic journal write; from here the sleep is finished, never undone
//     companion    the Companion has cleared (its tombstone is done, its wid is newWid)
//     station      the Station's part is fresh for the new realm
//     caddy        the Caddy has cleared the realm's records; then the copies rotate and the journal is removed
//   Every step is idempotent and keyed by newWid and sha, so running it again changes nothing.
//
// The host `h`:
//   store          localStorage-like: getItem, setItem, removeItem, key(i), length
//   caddy          the sleep calls of the Caddy's client (caddy.mjs sleepClient)
//   companion      { ask(op, fields) -> Promise<ack> } the shell's relay to the Companion (makeShellAsk), ops lock, sign, clear, unlock
//   settings()     the developer settings (realmSleep)
//   docked()       whether the Companion is seated now
//   who()          { id, name, pub } the docked Companion, with the key the Station trusts for it (null pub: none seen, or refused)
//   saveKey()      the key of the shared save
//   freshStation(newWid)   makes the Station's part fresh for the new realm and stores it
//   now(), rand()  the time in ms and a number in [0, 1)
//   quota          optional: bytes the store may hold (5 MB when absent)
import { prepareSleep, assembleSleepFile, verifySleepFile, parseSleepFile, fileHash, MAX_BYTES } from "../../play/src/realm/sleepfile.mjs";
import { utf8, hexEncode } from "../../play/src/realm/b64.mjs";
import { canonical } from "../../play/src/realm/canonical.mjs";
import { sha256 } from "../../play/src/realm/keys.mjs";

export const JOURNAL_KEY = "mb-sleep-journal", INDEX_KEY = "mb-sleep-index", LEDGER_KEY = "mb-sleep-ledger", COPY_PREFIX = "mb-sleep@";
export const KEEP = 2;   // the Station keeps the newest 2 copies
export const STATES = ["open", "signed", "keptStation", "keptCaddy", "commit", "companion", "station", "caddy"];
const at = (s) => STATES.indexOf(s), COMMIT = at("commit");
export const copyKey = (wid, sha8) => COPY_PREFIX + wid + "." + sha8;
const COPY_RE = /^mb-sleep@([A-Za-z0-9_-]{1,64})\.([0-9a-f]{8})$/;
const WID_RE = /^w[0-9a-z]{1,40}$/;

// A step that went wrong, with a short reason for the failure plate's log.
class Abort extends Error { constructor(why) { super(why); this.why = why; } }

export function makeSleep(h) {
  const store = h.store;
  let chain = Promise.resolve(), live = null;   // live: the hold under way in this page (its journal is not for recovery to touch until it has settled)
  const exclusive = (fn) => { const run = chain.then(fn); chain = run.then(() => {}, () => {}); return run; };

  // ---- the store: every write is read back ----
  function put(key, text) { store.setItem(key, text); if (store.getItem(key) !== text) throw new Abort("store: " + key + " did not read back"); }
  function drop(key) { store.removeItem(key); }
  const getJSON = (key) => { const raw = store.getItem(key); if (raw == null) return { absent: true }; try { return { value: JSON.parse(raw) }; } catch { return { bad: true }; } };

  // ---- the journal ----
  function readJournal() {
    const r = getJSON(JOURNAL_KEY);
    if (r.absent) return null;
    const j = r.value;
    if (r.bad || !j || typeof j !== "object" || j.v !== 1 || !STATES.includes(j.state) || typeof j.wid !== "string" || typeof j.newWid !== "string") return { damaged: true };
    return j;
  }
  const setJournal = (j) => put(JOURNAL_KEY, JSON.stringify(j));
  const step = (j, state, more = {}) => { const n = { ...j, ...more, state }; setJournal(n); return n; };
  const closeJournal = () => drop(JOURNAL_KEY);

  // ---- the Station's ledger of every sleep it committed ----
  function readLedger() {
    const r = getJSON(LEDGER_KEY);
    if (r.absent) return [];
    if (r.bad || !Array.isArray(r.value)) throw new Abort("the Station's ledger is unreadable");   // never written over
    return r.value;
  }
  function ledgerAdd(j) {
    const l = readLedger();
    if (l.some((x) => x.sha === j.sha && x.state === "committed")) return;
    put(LEDGER_KEY, JSON.stringify([...l, { sha: j.sha, state: "committed", wid: j.wid, at: h.now() }]));
  }
  const ledger = () => { try { return readLedger(); } catch { return []; } };

  // ---- the copies ----
  const copyNames = () => { const out = []; for (let i = 0; i < (store.length ?? 0); i++) { const k = store.key(i); if (k && COPY_RE.test(k)) out.push(k); } return out.sort(); };
  // Every copy the Station holds, newest first: { key, wid, sha8, slept, text }. A copy whose lines cannot be read is listed with slept 0.
  function copies() {
    return copyNames().map((key) => {
      const [, wid, sha8] = key.match(COPY_RE), text = store.getItem(key) ?? "", p = parseSleepFile(text, { head: true });
      return { key, wid, sha8, slept: p.ok && Number.isFinite(p.header.slept) ? p.header.slept : 0, text, headerLine: p.ok ? p.headerLine : "" };
    }).sort((a, b) => (b.slept - a.slept) || (a.key < b.key ? -1 : 1));
  }
  async function writeIndex(list) {
    const entries = [];
    for (const c of list.slice(0, KEEP)) entries.push({ wid: c.wid, sha: await fileHash(c.text), slept: c.slept, header: c.headerLine });
    const text = JSON.stringify(entries), had = store.getItem(INDEX_KEY);
    if (had === text || (had == null && !entries.length)) return;   // nothing changed: nothing written
    put(INDEX_KEY, text);
  }
  const index = () => { const r = getJSON(INDEX_KEY); return r.value && Array.isArray(r.value) ? r.value : []; };

  // The Station keeps the newest 2. A copy older than that goes only once the Caddy lists its sha as committed; while the Caddy does not list it (or does not answer), it stays.
  async function rotate() {
    let list = copies();
    if (list.length > KEEP) {
      let listed = null;
      try { const r = await h.caddy.list(); if (r.status === 200 && Array.isArray(r.body.realms)) listed = new Map(r.body.realms.map((x) => [x.sha, x.state])); } catch { /* the Caddy is quiet: every copy stays */ }
      if (listed) for (const c of list.slice(KEEP)) if (listed.get(await fileHash(c.text)) === "committed") drop(c.key);
      list = copies();
    }
    await writeIndex(list);
  }

  // ---- the asks of the Companion and the Caddy ----
  async function ask(op, fields) {
    let a; try { a = await h.companion.ask(op, fields); } catch (e) { return { ok: false, why: "error: " + (e && e.message) }; }
    return a && typeof a === "object" ? a : { ok: false, why: "no answer" };
  }
  const need = (a, what) => { if (!a || a.ok !== true) throw new Abort(what + ": " + (a && a.why ? a.why : "no")); return a; };
  const reach = async (fn) => { try { return await fn(); } catch (e) { throw new Abort("the Caddy: " + (e && e.message)); } };

  // ---- step 0: the preflight ----
  // { ok: true, who } or { ok: false, why } with why one of off, busy, damaged, not docked, no key, no save, no caddy, no room.
  async function preflight() {
    if (!h.settings().realmSleep) return { ok: false, why: "off" };
    const j = readJournal();
    if (j) return { ok: false, why: j.damaged ? "damaged" : "busy" };
    if (!h.docked()) return { ok: false, why: "not docked" };
    const who = h.who();
    if (!who || !who.id || typeof who.pub !== "string" || !who.pub) return { ok: false, why: "no key" };
    const raw = store.getItem(h.saveKey());
    let save = null; try { save = raw == null ? null : JSON.parse(raw); } catch { /* none */ }
    if (!save || save.v !== 9 || typeof save.wid !== "string" || !save.wid || !save.st || typeof save.st !== "object" || !Array.isArray(save.regions)) return { ok: false, why: "no save" };
    try { const r = await h.caddy.identity(); if (r.status !== 200 || r.body.fault) return { ok: false, why: "no caddy" }; } catch { return { ok: false, why: "no caddy" }; }
    if (!roomFor(raw.length)) return { ok: false, why: "no room" };
    return { ok: true, who };
  }
  // Room for the copy: what the store holds now, plus the copy (the save and its Station part, as text) and the journal, at two bytes a character.
  function roomFor(saveChars) {
    if (typeof store.key !== "function" || store.length == null) return true;
    let used = 0;
    for (let i = 0; i < store.length; i++) { const k = store.key(i); used += ((k ?? "").length + (store.getItem(k) ?? "").length) * 2; }
    return used + (saveChars + 4096) * 2 <= (h.quota ?? 5 * 1024 * 1024);
  }

  // ---- rollback: the old realm is whole and live, and any copy written is dropped ----
  // Each part is safe to repeat. The journal goes only when every part is done; the Companion's unlock waits for the next dock, and the Caddy's drop for the Caddy.
  // Returns { done, pending: [...] }.
  async function rollback(j) {
    const pending = [];
    try {
      if (j.sha) { const k = copyKey(j.wid, j.sha.slice(0, 8)); if (store.getItem(k) != null) drop(k); }
    } catch { pending.push("copy"); }
    const u = await ask("unlock", { wid: j.wid });
    if (!u.ok) pending.push("companion");
    if (j.sha && at(j.state) >= at("keptStation")) {   // the file can have reached the Caddy only from the step after the Station's copy; before that the Caddy was never touched
      try {
        const r = await h.caddy.drop(j.wid, j.sha);
        if (r.status === 409) pending.push("caddy-refused");   // a committed sleep is never dropped: not for a rollback to settle
        else if (r.status >= 300 && r.status !== 404) pending.push("caddy");
      } catch { pending.push("caddy"); }
    }
    if (!pending.length) { try { closeJournal(); } catch { pending.push("journal"); } }
    return { done: !pending.length, pending };
  }

  // ---- steps 1 to 3, during the hold, in memory ----
  const drawWid = (wid) => { for (;;) { const w = "w" + Array.from({ length: 10 }, () => "0123456789abcdefghijklmnopqrstuvwxyz"[Math.floor(h.rand() * 36)]).join(""); if (w !== wid && WID_RE.test(w)) return w; } };
  const gate = () => { if (!h.docked()) throw new Abort("lifted"); };
  const checkpoint = (c) => { if (c.cancelled) throw new Abort("let go"); gate(); };

  async function prepare(c) {
    let j = c.j; const wid = j.wid;
    const lock = c.lock = need(await ask("lock", { wid }), "lock"); checkpoint(c);
    const raw = store.getItem(h.saveKey()); let save = null; try { save = JSON.parse(raw); } catch { /* none */ }
    if (!save || save.v !== 9 || save.wid !== wid || !save.st) throw new Abort("the stored save is not this realm");
    const realm = await reach(() => h.caddy.realm(wid));
    if (realm.status !== 200 || !realm.body.caddy) throw new Abort("the Caddy has no records");
    const ident = await reach(() => h.caddy.identity());
    if (ident.status !== 200 || ident.body.fault) throw new Abort("the Caddy has no identity");
    checkpoint(c);
    const who = c.who, prep = await prepareSleep({ save, caddy: realm.body.caddy, companion: { id: who.id, name: who.name ?? "", pub: who.pub }, recovery: ident.body.recovery ?? null, slept: h.now() });
    if (prep.header.parts.companion !== lock.parts?.companion) throw new Abort("the Companion's part moved");
    c.prep = prep; c.stationPart = prep.header.parts.station;
    const sig = need(await ask("sign", { wid, signed: prep.signed, newSeed: j.newSeed, newWid: j.newWid }), "sign");
    const file = await assembleSleepFile(prep, sig.sig);
    const v = await verifySleepFile(file.bytes, { pub: who.pub });
    if (!v.ok || v.header.wid !== wid) throw new Abort("the signed file does not verify: " + v.why);
    c.file = file;
    c.j = j = step(j, "signed", { sha: file.sha, slept: prep.header.slept });
    checkpoint(c);
    return { ok: true };
  }

  // The hold. Returns { ok: false, why } with nothing written, or { ok: true, ready, complete(), cancel() }.
  function begin() {
    return exclusive(async () => {
      const pf = await preflight();
      if (!pf.ok) return { ok: false, why: pf.why };
      const wid = JSON.parse(store.getItem(h.saveKey())).wid;
      const j = { v: 1, id: Math.floor(h.rand() * 4294967296).toString(36), state: "open", wid, newSeed: Math.floor(h.rand() * 4294967296) >>> 0, newWid: drawWid(wid), companion: pf.who.id, startedAt: h.now(), sha: null };
      try { setJournal(j); } catch (e) { try { closeJournal(); } catch { /* nothing more to do */ } return { ok: false, why: "store" }; }
      const c = live = { j, who: pf.who, cancelled: false, failed: false, completing: false, settled: false, file: null, prep: null, lock: null, outcome: null };
      c.ready = prepare(c).catch(async (e) => {
        c.failed = true;
        const why = e instanceof Abort ? e.why : "error: " + (e && e.message);
        if (!c.cancelled) c.outcome = await settle(c);
        return { ok: false, why };
      });
      return { ok: true, ready: c.ready, complete: () => complete(c), cancel: () => cancel(c) };
    });
  }
  async function settle(c) {   // a failed or abandoned hold: back to the realm as it was; what cannot be undone now (a lifted Companion, a quiet Caddy) is left to recover()
    try { const j = readJournal(); return await rollback(j && !j.damaged ? j : c.j); } finally { c.settled = true; }
  }

  // Let go mid-hold: nothing lasts. The Companion is unlocked, its tombstone dropped, the journal removed; the Caddy was never touched.
  function cancel(c) {
    c.cancelled = true;
    return exclusive(async () => {
      if (c.completing || c.settled) return { ok: true, undone: false };
      await c.ready;
      if (c.failed && c.outcome) return { ok: true, undone: true, ...c.outcome };   // it failed by itself and has been put back already
      const r = await settle(c);
      return { ok: true, undone: true, ...r };
    });
  }

  // ---- steps 4 to 6, when the hold completes ----
  function complete(c) {
    return exclusive(async () => {
      if (c.cancelled || c.completing) return { ok: false, why: "let go" };
      c.completing = true;
      const r = await c.ready;
      if (!r.ok) { const o = c.outcome || { done: true, pending: [] }; return { ok: false, rolledBack: true, why: r.why, pending: o.pending }; }
      let j = readJournal() || c.j;
      try {
        // step 4: the Station's copy, read back and verified
        const pub = c.who.pub, key = copyKey(j.wid, c.file.sha8);
        gate();
        put(key, c.file.text);
        const back = store.getItem(key), v = await verifySleepFile(utf8(back ?? ""), { pub });
        if (!v.ok || (await fileHash(utf8(back))) !== c.file.sha) throw new Abort("the Station's copy did not verify");
        j = step(j, "keptStation");
        // step 5: the Caddy keeps the file and lists it
        const put5 = await reach(() => h.caddy.put(j.wid, c.file.bytes));
        if (put5.status !== 200 || put5.body.sha !== c.file.sha) throw new Abort("the Caddy refused the file: " + put5.status);
        const l = await reach(() => h.caddy.list());
        if (l.status !== 200 || !l.body.realms.some((x) => x.sha === c.file.sha && x.wid === j.wid)) throw new Abort("the Caddy does not list the file");
        j = step(j, "keptCaddy");
        // the gate: the Companion is still seated and the realm has not moved under the file
        gate();
        const cur = JSON.parse(store.getItem(h.saveKey()) ?? "null");
        if (!cur || cur.wid !== j.wid || !cur.st || !(await sameParts(cur, c.prep.header.parts))) throw new Abort("the realm changed while it was being kept");
      } catch (e) {
        const why = e instanceof Abort ? e.why : "error: " + (e && e.message), o = await settle(c);
        return { ok: false, rolledBack: true, why, pending: o.pending };
      }
      // step 6: the commit, one atomic journal write
      let committed = false;
      try { j = step(j, "commit"); committed = true; } catch (e) { const now = readJournal(); committed = !!now && !now.damaged && at(now.state) >= COMMIT; if (!committed) { const o = await settle(c); return { ok: false, rolledBack: true, why: "store", pending: o.pending }; } }
      c.settled = true;   // from the commit on the journal is recover()'s as much as ours
      return finish(readJournal() || j);
    });
  }
  async function sameParts(save, parts) {
    const { st, ...rest } = save;
    const hex = async (x) => hexEncode(await sha256(utf8(canonical(x))));
    return (await hex(rest)) === parts.companion && (await hex(st)) === parts.station;
  }

  // ---- steps 6 to 10: roll forward from the journal's state. Returns { ok: true, done: true } or { ok: true, done: false, waiting, why } ----
  const waiting = (what, why) => ({ ok: true, done: false, waiting: what, why });
  async function finish(j) {
    try {
      if (j.state === "commit") {
        // the Caddy's commit (if its file is gone, the Station's copy goes up again), the Station's ledger line, then the Companion clears
        const k = copyKey(j.wid, j.sha.slice(0, 8));
        let r; try { r = await h.caddy.commit(j.wid, j.sha); } catch (e) { return waiting("caddy", e.message); }
        if (r.status === 404) {
          const text = store.getItem(k);
          if (text == null) return waiting("caddy", "the copy is gone");
          try { const p = await h.caddy.put(j.wid, utf8(text)); if (p.status !== 200) return waiting("caddy", "put " + p.status); r = await h.caddy.commit(j.wid, j.sha); } catch (e) { return waiting("caddy", e.message); }
        }
        if (r.status !== 200) return waiting("caddy", "commit " + r.status);
        ledgerAdd(j);
        const a = await ask("clear", { wid: j.wid, sha: j.sha, newSeed: j.newSeed, newWid: j.newWid });
        if (!a.ok) return waiting("companion", a.why);
        j = step(j, "companion");
      }
      if (j.state === "companion") {
        const cur = JSON.parse(store.getItem(h.saveKey()) ?? "null");
        if (!cur || cur.wid !== j.newWid) return waiting("companion", "the Companion has not cleared");
        if (!cur.st || cur.st.wid !== j.newWid) await h.freshStation(j.newWid);
        const after = JSON.parse(store.getItem(h.saveKey()) ?? "null");
        if (!after || after.wid !== j.newWid || !after.st || after.st.wid !== j.newWid) return waiting("station", "the Station's part is not fresh");
        j = step(j, "station");
      }
      if (j.state === "station") {
        let r; try { r = await h.caddy.clear(j.wid, j.sha); } catch (e) { return waiting("caddy", e.message); }
        if (r.status !== 200) return waiting("caddy", "clear " + r.status);
        j = step(j, "caddy");
      }
      if (j.state === "caddy") {
        try { await rotate(); } catch { /* the copies rotate at the next boot */ }
        closeJournal();
      }
      return { ok: true, done: true };
    } catch (e) {
      return waiting("store", e && e.message);   // a write that failed after the commit: the journal stays where it is and the step runs again
    }
  }

  // ---- boot, the next dock, the Caddy back: finish what a crash or a lift left ----
  // { phase } one of none, running, rolledBack, damaged, done; or waiting (with what it waits on).
  function recover() {
    return exclusive(async () => {
      const j = readJournal();
      if (!j) { try { await rotate(); } catch { /* at the next boot */ } return { phase: "none" }; }
      if (j.damaged) return { phase: "damaged" };
      if (live && live.j.id === j.id && !live.settled) return { phase: "running" };
      if (at(j.state) < COMMIT) {
        const r = await rollback(j);
        return r.done ? { phase: "rolledBack" } : { phase: "waiting", waiting: r.pending, rolledBack: true };
      }
      const r = await finish(j);
      return r.done ? { phase: "done" } : { phase: "waiting", waiting: r.waiting, why: r.why };
    });
  }

  return {
    preflight: () => exclusive(preflight), begin, recover, resume: recover,
    journal: () => readJournal(), copies, index, ledger, rotate: () => exclusive(rotate), keys: { JOURNAL_KEY, INDEX_KEY, LEDGER_KEY },
    get holding() { return !!live && !live.settled; },
  };
}

// ---- the Station's end of the shell's relay ----
// post(msg) sends a message to the play page; listen(fn) hears the messages it sends back and returns the way to stop. Each request carries a nonce and waits for the ack
// that carries it; an answer that does not come within the time is `{ ok: false, why: "timeout" }` (the Station never waits on a Companion that is not there).
export function makeShellAsk({ post, listen, timeoutMs = 15000, setTimer = setTimeout, clearTimer = clearTimeout }) {
  let n = 0; const waiting = new Map();
  listen((m) => {
    if (!m || m.t !== "mb-sleep-ack" || !waiting.has(m.nonce)) return;
    const w = waiting.get(m.nonce); waiting.delete(m.nonce); clearTimer(w.timer);
    const { t, nonce, op, ...ack } = m; w.resolve({ ...ack, ok: m.ok === true });
  });
  return {
    ask(op, fields = {}) {
      const nonce = ++n;
      return new Promise((resolve) => {
        const timer = setTimer(() => { if (waiting.delete(nonce)) resolve({ ok: false, why: "timeout" }); }, timeoutMs);
        waiting.set(nonce, { resolve, timer });
        try { post({ t: "mb-sleep", nonce, op, ...fields }); } catch { if (waiting.delete(nonce)) { clearTimer(timer); resolve({ ok: false, why: "no link" }); } }
      });
    },
  };
}
export { MAX_BYTES };
