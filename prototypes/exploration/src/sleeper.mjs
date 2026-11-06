// The Companion's side of putting a realm to sleep: its signing key and the responder for the Station's `mb-sleep` requests (lock, sign, clear, unlock).
// Only the Companion signs. The Station asks through the play page's shell, which relays a request only while the Companion is seated; the Companion answers with
// an `mb-sleep-ack` that carries the same nonce. Pure of the page: the page hands in its storage, its RT, its save and its new-realm call, so Node runs it as it is.
//
//   lock     the Companion writes its save one last time, stops writing (rt.sleepLock), and answers with the hash of its part of the save
//   sign     checks that the header it is asked to sign is this Companion's, for this realm, over the part it holds; writes the tombstone `pending` BEFORE it answers
//            with the signature; the file is the Station's to build and keep
//   clear    after the Station has committed: the tombstone `committed`, then the new realm (the seed and wid the tombstone holds), then the tombstone `done`
//   unlock   a rollback: drops a `pending` tombstone and the lock. A `committed` tombstone is never dropped
//
// The tombstone is `mb-sleep-pending@<companion id>` = { wid, sha, newSeed, newWid, state: "pending" | "committed" | "done" }. While it is pending or committed
// nothing writes the save (the lock is taken again at boot). A page that boots, or is lifted, with a committed tombstone finishes the clear on its own.
import { canonical } from "../../play/src/realm/canonical.mjs";
import { hexEncode, utf8 } from "../../play/src/realm/b64.mjs";
import { sha256, sign, companionKey, idbStore } from "../../play/src/realm/keys.mjs";

export const TOMB_PREFIX = "mb-sleep-pending@";
export const OPS = ["lock", "sign", "clear", "unlock"];
const MAGIC = "MBR1", KIND = "mb-realm-sleep";
const HEX64 = /^[0-9a-f]{64}$/, WID_RE = /^w[0-9a-z]{1,40}$/;
const sha256Hex = async (s) => hexEncode(await sha256(utf8(s)));

// host: { store (localStorage-like), rt (the page's RT: readOnly, sleepLock), companion() -> { id, slot }, wid() -> the live realm's wid, saveKey() -> string,
//         save(), newRealm(seed, wid), keyStore() (a store of key pairs; none gives IndexedDB), onPub(pub) }
export function makeSleeper(host) {
  const { rt } = host;
  const store = host.store;
  let seated = false, chain = Promise.resolve(), keyFor = null, keyId = null;
  const id = () => host.companion().id;
  const tombKey = () => TOMB_PREFIX + id();

  // ---- the tombstone ----
  function readTomb() {
    try {
      const raw = store.getItem(tombKey()); if (raw == null) return null;
      const t = JSON.parse(raw);
      return t && typeof t === "object" && typeof t.wid === "string" && ["pending", "committed", "done"].includes(t.state) ? t : null;
    } catch { return null; }
  }
  function writeTomb(t) {   // true only if it reads back as written: the signature is never given on a tombstone that is not there
    try { const raw = JSON.stringify(t); store.setItem(tombKey(), raw); return store.getItem(tombKey()) === raw; } catch { return false; }
  }
  function dropTomb() { try { store.removeItem(tombKey()); } catch { /* storage gone */ } }
  const holding = (t) => !!t && (t.state === "pending" || t.state === "committed");

  // ---- the key ----
  // Made once, the first time it is asked for; the private half stays in IndexedDB as a CryptoKey that cannot be exported. A browser that cannot make one gives null.
  function ownKey() {
    if (keyFor && keyId === id()) return keyFor;
    keyId = id();
    keyFor = (async () => {
      try { return await companionKey((host.keyStore && host.keyStore()) || idbStore(), keyId); } catch { return null; }
    })().then((k) => { if (!k) { keyFor = null; } return k; });
    return keyFor;
  }
  // The public key goes where the Station can learn it: beside the Companion's id, in `mb-companion-<slot>`.
  async function publish() {
    const k = await ownKey(); if (!k) return null;
    try {
      const key = "mb-companion-" + host.companion().slot, had = JSON.parse(store.getItem(key) || "null");
      if (had && typeof had.id === "string" && had.pub !== k.pub) store.setItem(key, JSON.stringify({ ...had, pub: k.pub }));
    } catch { /* storage unavailable: the pub travels in the message anyway */ }
    if (host.onPub) host.onPub(k.pub);
    return k.pub;
  }

  // The hash of the Companion's part of the stored save: the save without the Station's `st`, in canonical form. The Station takes the same hash of the same bytes.
  async function storedPart(wid) {
    let o = null; try { o = JSON.parse(store.getItem(host.saveKey())); } catch { /* none */ }
    if (!o || typeof o !== "object" || o.wid !== wid) return null;
    const { st, ...rest } = o; return sha256Hex(canonical(rest));
  }

  const no = (why) => ({ ok: false, why });

  // ---- the four ops ----
  async function lock(m) {
    const wid = host.wid(), t = readTomb();
    if (holding(t)) return no("pending");   // a sleep already under way: only unlock (a rollback) or clear (after the commit) moves it
    if (rt.sleepLock && rt.sleepLock !== wid) return no("locked");
    if (!rt.sleepLock) { host.save(); rt.sleepLock = wid; }   // the last write, then no more
    const part = await storedPart(wid);
    if (!part) { rt.sleepLock = false; return no("no save"); }
    return { ok: true, parts: { companion: part } };
  }

  async function signOp(m) {
    const wid = host.wid(), t = readTomb();
    if (rt.sleepLock !== wid) return no("not locked");
    if (typeof m.signed !== "string" || !Number.isInteger(m.newSeed) || m.newSeed < 0 || m.newSeed > 4294967295 || typeof m.newWid !== "string" || !WID_RE.test(m.newWid) || m.newWid === wid) return no("bad request");
    if (holding(t) && (t.wid !== wid || t.newSeed !== m.newSeed || t.newWid !== m.newWid || t.state !== "pending")) return no("tombstone");
    const k = await ownKey(); if (!k) return no("no key");
    // the bytes to sign are "MBR1\n" + the header line, and the header has to be this Companion's own, for this realm, over the part the Companion holds
    if (!m.signed.startsWith(MAGIC + "\n")) return no("not a header");
    const line = m.signed.slice(MAGIC.length + 1);
    let h; try { h = JSON.parse(line); } catch { return no("not a header"); }
    if (!h || typeof h !== "object" || canonical(h) !== line) return no("not a header");
    if (h.kind !== KIND || h.v !== 1) return no("not a header");
    if (h.wid !== wid) return no("wid");
    if (!h.companion || h.companion.id !== id() || h.companion.pub !== k.pub) return no("pub");
    const part = await storedPart(wid);
    if (!part || !h.parts || h.parts.companion !== part) return no("part");
    if (rt.sleepLock !== wid) return no("not locked");   // let go while the part was read
    if (!writeTomb({ wid, sha: null, newSeed: m.newSeed, newWid: m.newWid, state: "pending" })) return no("tombstone");
    return { ok: true, sig: await sign(k.privateKey, m.signed) };
  }

  // The clear, from the pending tombstone. Used for the Station's request, and by a page that finds a committed tombstone at boot or when lifted.
  async function runClear(t, sha) {
    if (!writeTomb({ ...t, sha: sha ?? t.sha ?? null, state: "committed" })) return no("tombstone");
    rt.sleepLock = false;   // the new realm is the one thing that writes now
    try { host.newRealm(t.newSeed, t.newWid); } catch { rt.sleepLock = t.wid; return no("new realm"); }
    if (host.wid() !== t.newWid) { rt.sleepLock = t.wid; return no("new realm"); }
    if (!writeTomb({ ...t, sha: sha ?? t.sha ?? null, state: "done" })) return no("tombstone");
    return { ok: true, wid: t.newWid };
  }
  async function clear(m) {
    const t = readTomb();
    if (!t || t.wid !== m.wid) return no("tombstone");
    if (m.newSeed !== t.newSeed || m.newWid !== t.newWid || typeof m.sha !== "string" || !HEX64.test(m.sha)) return no("bad request");
    if (host.wid() === t.newWid) { if (t.state !== "done") writeTomb({ ...t, sha: m.sha, state: "done" }); return { ok: true, wid: t.newWid }; }   // asked again: it is done
    if (host.wid() !== t.wid) return no("wid");
    if (t.state === "done") return no("tombstone");
    return runClear(t, m.sha);
  }

  async function unlock(m) {
    const wid = host.wid(), t = readTomb();
    if (t && t.state === "committed") return no("committed");
    if (holding(t) && t.wid !== wid) return no("tombstone");
    if (holding(t)) dropTomb();   // pending: the Station rolled the sleep back
    if (rt.sleepLock === wid) rt.sleepLock = false;
    return { ok: true };
  }

  const ops = { lock, sign: signOp, clear, unlock };

  return {
    // The request from the Station (through the shell). Requests run one at a time. Always answers { ok, why? ... }.
    handle(m) {
      const run = async () => {
        try {
          if (!m || typeof m !== "object" || !OPS.includes(m.op)) return no("bad request");
          if (rt.readOnly) return no("read-only");
          if (!seated) return no("lifted");
          if (typeof m.wid !== "string") return no("bad request");
          if (m.op !== "clear" && m.wid !== host.wid()) return no("wid");
          return await ops[m.op](m);
        } catch { return no("error"); }
      };
      const p = chain.then(run, run); chain = p.catch(() => {}); return p;
    },
    // The Caddy's cradle: seated, or lifted. Lifted before anything was signed lets go of the lock (nothing is at risk and there is no screen for it); with a committed
    // tombstone the Companion finishes the clear on its own; a pending one keeps the lock until the Station rolls back or commits.
    seat(on) {
      seated = !!on; if (seated) return Promise.resolve();
      const run = async () => {
        const t = readTomb();
        if (!holding(t) && rt.sleepLock) rt.sleepLock = false;
        else if (t && t.state === "committed") await rollForward(t);
      };
      const p = chain.then(run, run); chain = p.catch(() => {}); return p;
    },
    // Boot, before the first write: a sleep still pending or committed keeps the page from writing.
    holdAtBoot() { const t = readTomb(); if (holding(t)) rt.sleepLock = t.wid; return !!rt.sleepLock; },
    // Boot, after the first write: the key (made once), its pub, and a committed tombstone rolled forward.
    async start() {
      const t = readTomb();
      if (t && t.state === "committed") await chain.then(() => rollForward(t));
      return publish();
    },
    publish,
    pub: async () => { const k = await ownKey(); return k ? k.pub : null; },
    tomb: readTomb,
    get seated() { return seated; },
  };

  async function rollForward(t) {
    if (host.wid() === t.newWid) { writeTomb({ ...t, state: "done" }); if (rt.sleepLock === t.wid) rt.sleepLock = false; return; }
    await runClear(t, t.sha);
  }
}
