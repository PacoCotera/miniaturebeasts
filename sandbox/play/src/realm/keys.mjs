// The Companion's key pair and the shared signing code (WebCrypto only: the browser and Node both provide it). Ed25519; the private key is a CryptoKey that is made
// non-extractable and never leaves its store; the public key travels as 32 raw bytes in base64url. A store adapter holds the pairs: IndexedDB on the page, a Map in Node.
import { b64uEncode, b64uDecode, utf8 } from "./b64.mjs";

const subtle = () => globalThis.crypto.subtle;
const ED = { name: "Ed25519" };
const PKCS8_ED25519 = Uint8Array.of(0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20);   // the PKCS#8 header of a 32-byte Ed25519 seed

const asBytes = (m) => (typeof m === "string" ? utf8(m) : m);

export async function sha256(bytes) {
  return new Uint8Array(await subtle().digest("SHA-256", asBytes(bytes)));
}

// Whether this browser can make and use an Ed25519 key (Settings says "This Companion cannot sign" when not).
export async function ed25519Supported() {
  try {
    const k = await subtle().generateKey(ED, false, ["sign", "verify"]);
    return !!k.privateKey && !!k.publicKey;
  } catch { return false; }
}

async function rawPub(publicKey) {
  return b64uEncode(new Uint8Array(await subtle().exportKey("raw", publicKey)));
}

// A fresh pair: { privateKey (non-extractable CryptoKey), pub (base64url of 32 bytes) }.
export async function generateKeyPair() {
  const k = await subtle().generateKey(ED, false, ["sign", "verify"]);
  return { privateKey: k.privateKey, pub: await rawPub(k.publicKey) };
}

// The pair a 32-byte seed makes. The seed is imported as PKCS#8 and the public key is the JWK's `x`. `extractable` is false for a key that is kept.
export async function pairFromSeed(seed, extractable = false) {
  if (!(seed instanceof Uint8Array) || seed.length !== 32) throw new Error("keys: a seed is 32 bytes");
  const der = new Uint8Array(48); der.set(PKCS8_ED25519); der.set(seed, 16);
  const jwk = await subtle().exportKey("jwk", await subtle().importKey("pkcs8", der, ED, true, ["sign"]));
  const privateKey = await subtle().importKey("pkcs8", der, ED, extractable, ["sign"]);
  return { privateKey, pub: jwk.x };
}

export async function pubFromSeed(seed) {
  return (await pairFromSeed(seed)).pub;
}

// Signs bytes (or text, as UTF-8). Returns the 64-byte signature as base64url. Ed25519 is deterministic: the same key and bytes give the same signature.
export async function sign(privateKey, message) {
  return b64uEncode(new Uint8Array(await subtle().sign(ED, privateKey, asBytes(message))));
}

// true or false, never a throw: a malformed pub or signature is simply not a match.
export async function verify(pub, message, sig) {
  try {
    const pk = b64uDecode(pub), sg = b64uDecode(sig);
    if (pk.length !== 32 || sg.length !== 64) return false;
    const key = await subtle().importKey("raw", pk, ED, false, ["verify"]);
    return await subtle().verify(ED, key, sg, asBytes(message));
  } catch { return false; }
}

// ---- store adapters -------------------------------------------------------------------------------------------------------------------------------------------
// A store keeps records { privateKey, pub } by the Companion's id. The adapter is { get(id), putIfAbsent(id, rec), delete(id) }, all async. putIfAbsent returns the record
// that is stored afterwards (the one already there, if there was one), so two callers racing at a first boot end up with one pair.

export function memoryStore(map = new Map()) {
  return {
    async get(id) { return map.get(id) || null; },
    async putIfAbsent(id, rec) { if (!map.has(id)) map.set(id, rec); return map.get(id); },
    async delete(id) { map.delete(id); },
  };
}

// IndexedDB: db `mb-keys`, store `pairs`, key = the companion id. `idb` is the IDBFactory (the page's indexedDB).
export function idbStore({ idb = globalThis.indexedDB, name = "mb-keys", table = "pairs" } = {}) {
  let opened = null;
  const open = () => opened || (opened = new Promise((res, rej) => {
    const r = idb.open(name, 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(table)) r.result.createObjectStore(table); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => { opened = null; rej(r.error); };
  }));
  const run = async (mode, fn) => {
    const db = await open();
    return new Promise((res, rej) => {
      const tx = db.transaction(table, mode);
      const os = tx.objectStore(table);
      let out;
      fn(os, (v) => { out = v; }, rej);
      tx.oncomplete = () => res(out);
      tx.onerror = tx.onabort = () => rej(tx.error);
    });
  };
  const get = (id) => run("readonly", (os, set) => { const r = os.get(id); r.onsuccess = () => set(r.result || null); });
  return {
    get,
    async putIfAbsent(id, rec) {
      await run("readwrite", (os) => {
        const r = os.add(rec, id);
        r.onerror = (e) => { e.preventDefault && e.preventDefault(); e.stopPropagation && e.stopPropagation(); };   // a key already there is not a failure
      });
      return get(id);
    },
    async delete(id) { await run("readwrite", (os) => { os.delete(id); }); },
  };
}

// The Companion's pair: made once, the first time it is asked for, and the same ever after. Returns { privateKey, pub }.
// An id's pair survives a realm reset: callers never delete it.
const making = new WeakMap();
export async function companionKey(store, id) {
  const have = await store.get(id);
  if (have) return have;
  let m = making.get(store); if (!m) making.set(store, m = new Map());
  if (!m.has(id)) m.set(id, generateKeyPair().then((p) => store.putIfAbsent(id, p)).finally(() => m.delete(id)));
  return m.get(id);
}
