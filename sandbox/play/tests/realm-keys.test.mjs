// The realm's shared crypto (src/realm/): canonical JSON, base64url, the Companion's Ed25519 key, the recovery key. The vectors in src/realm/vectors.json are the ones the device port is checked against.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { b64uEncode, b64uDecode, hexEncode, hexDecode, utf8 } from "../src/realm/b64.mjs";
import { canonical, canonicalBytes } from "../src/realm/canonical.mjs";
import { sha256, ed25519Supported, generateKeyPair, pairFromSeed, pubFromSeed, sign, verify, memoryStore, idbStore, companionKey } from "../src/realm/keys.mjs";
import { formatRecovery, recoveryLines, parseRecovery, recoveryPub, kid, base32 } from "../src/realm/recovery.mjs";

const V = JSON.parse(readFileSync(new URL("../src/realm/vectors.json", import.meta.url), "utf8"));
const seedOf = (f) => Uint8Array.from({ length: 32 }, (_, i) => f(i));

test("base64url: round trips at every length, and only one spelling per byte string", () => {
  for (let n = 0; n < 70; n++) {
    const b = Uint8Array.from({ length: n }, (_, i) => (i * 37 + n) & 255);
    const s = b64uEncode(b);
    assert.ok(!/[=+/]/.test(s));
    assert.deepEqual(b64uDecode(s), b);
  }
  assert.equal(b64uEncode(Uint8Array.of(0xfb, 0xff)), "-_8");
  assert.equal(b64uEncode(new Uint8Array(0)), "");
  for (const bad of ["A", "AAAAA", "AA==", "a+b/", "AB", "AAB", " AAA", "AA\n"]) assert.throws(() => b64uDecode(bad), /base64url/, bad);   // "AB" has stray bits
  assert.throws(() => b64uDecode(5));
  assert.deepEqual(hexDecode(hexEncode(Uint8Array.of(0, 15, 16, 255))), Uint8Array.of(0, 15, 16, 255));
  assert.throws(() => hexDecode("0G"));
  assert.throws(() => hexDecode("abc"));
  assert.throws(() => hexDecode("AB"));
});

test("canonical JSON: the vectors", () => {
  for (const c of V.canonical) assert.equal(canonical(JSON.parse(c.json)), c.out, c.json);
});

test("canonical JSON: edge cases", () => {
  assert.equal(canonical({ b: 1, a: 2 }), '{"a":2,"b":1}');
  assert.equal(canonical({ a: { d: 1, c: [{ y: 1, x: 2 }] } }), '{"a":{"c":[{"x":2,"y":1}],"d":1}}');
  assert.equal(canonical({ n: -0 }), '{"n":0}');
  assert.equal(canonical([-0, 0]), "[0,0]");
  assert.equal(canonical(-0), "0");
  assert.equal(canonical({ 10: 1, 9: 2, B: 3, a: 4 }), '{"10":1,"9":2,"B":3,"a":4}');   // default sort: UTF-16 code units, so "10" before "9" and capitals before lower case
  assert.equal(canonical({ "é": 1, z: 2 }), '{"z":2,"é":1}');
  assert.equal(canonical({ u: undefined, f() {}, k: 1 }), '{"k":1}');
  assert.equal(canonical([undefined, () => 1]), "[null,null]");   // as JSON itself does
  assert.equal(canonical({ d: new Date(0) }), '{"d":"1970-01-01T00:00:00.000Z"}');
  assert.equal(canonical(JSON.parse('{"__proto__":{"b":1,"a":2},"x":1}')), '{"__proto__":{"a":2,"b":1},"x":1}');
  assert.equal(canonical(null), "null");
  assert.equal(canonical(""), '""');
  assert.equal(canonical("\ud800"), '"\\ud800"');   // a lone surrogate is escaped, so the bytes are always valid UTF-8
  assert.equal(canonical({ "a b": 1, "": 2 }), '{"":2,"a b":1}');
  assert.equal(canonical(1e21), "1e+21");
  assert.equal(canonical(0.1 + 0.2), "0.30000000000000004");
  for (const bad of [NaN, Infinity, -Infinity, { a: [1, NaN] }, { a: { b: -Infinity } }, new Number(NaN)]) assert.throws(() => canonical(bad), /finite/);
  for (const bad of [undefined, () => 1, Symbol("x")]) assert.throws(() => canonical(bad), /no JSON form/);
  assert.throws(() => canonical(10n));
  const a = {}; a.self = a;
  assert.throws(() => canonical(a));
  const x = { z: 1, a: [3, { y: 1, b: 2 }] };
  assert.equal(canonical(JSON.parse(canonical(x))), canonical(x));   // idempotent
  assert.deepEqual(canonicalBytes({ é: 1 }), utf8('{"é":1}'));
});

test("Ed25519 against RFC 8032, test 1", async () => {
  const r = V.rfc8032;
  const p = await pairFromSeed(hexDecode(r.seed));
  assert.equal(hexEncode(b64uDecode(p.pub)), r.pubHex);
  const sig = await sign(p.privateKey, new Uint8Array(0));
  assert.equal(hexEncode(b64uDecode(sig)), r.sigHex);
  assert.ok(await verify(p.pub, new Uint8Array(0), sig));
});

test("the Companion vector: seed, pub, header line and signature", async () => {
  const c = V.companion;
  const p = await pairFromSeed(hexDecode(c.seed));
  assert.equal(p.pub, c.pub);
  assert.equal(await pubFromSeed(hexDecode(c.seed)), c.pub);
  assert.equal(c.headerLine, canonical(c.header));
  assert.equal(c.signed, "MBR1\n" + c.headerLine);
  assert.ok(!c.headerLine.includes("\n"));
  assert.equal(await sign(p.privateKey, c.signed), c.sig);                 // deterministic
  assert.equal(await sign(p.privateKey, utf8(c.signed)), c.sig);           // text or bytes
  assert.ok(await verify(c.pub, c.signed, c.sig));
  assert.equal(b64uDecode(c.pub).length, 32);
  assert.equal(b64uDecode(c.sig).length, 64);
});

test("verify says no, and does not throw, to anything wrong", async () => {
  const c = V.companion, other = await generateKeyPair();
  assert.equal(await verify(c.pub, c.signed + " ", c.sig), false);                       // a changed message
  assert.equal(await verify(c.pub, c.signed.replace("w-test", "w-tesu"), c.sig), false);   // one character
  assert.equal(await verify(other.pub, c.signed, c.sig), false);                           // another key
  const flipped = b64uEncode(Uint8Array.from(b64uDecode(c.sig), (b, i) => (i === 10 ? b ^ 1 : b)));
  assert.equal(await verify(c.pub, c.signed, flipped), false);
  for (const [pub, sig] of [["", c.sig], [c.pub, ""], ["not base64!", c.sig], [c.pub, "AAAA"], [c.pub.slice(1), c.sig], [c.pub, c.sig + "AAAA"], [null, c.sig], [c.pub, undefined]])
    assert.equal(await verify(pub, c.signed, sig), false);
});

test("a made key is non-extractable and signs", async () => {
  assert.ok(await ed25519Supported());
  const k = await generateKeyPair();
  assert.equal(k.privateKey.extractable, false);
  assert.equal(k.privateKey.type, "private");
  await assert.rejects(globalThis.crypto.subtle.exportKey("pkcs8", k.privateKey));
  assert.equal(b64uDecode(k.pub).length, 32);
  assert.ok(await verify(k.pub, "hello", await sign(k.privateKey, "hello")));
  assert.equal((await pairFromSeed(seedOf((i) => i))).privateKey.extractable, false);
  await assert.rejects(pairFromSeed(new Uint8Array(31)), /32 bytes/);
  assert.equal(b64uEncode(await sha256("abc")), "ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0");
});

test("a store gives the Companion one pair, made once", async () => {
  const store = memoryStore();
  const [a, b] = await Promise.all([companionKey(store, "cA"), companionKey(store, "cA")]);   // a first boot that asks twice
  assert.equal(a.pub, b.pub);
  assert.equal((await companionKey(store, "cA")).pub, a.pub);
  assert.notEqual((await companionKey(store, "cB")).pub, a.pub);
  assert.equal((await store.putIfAbsent("cA", { pub: "other" })).pub, a.pub);
  await store.delete("cA");
  assert.equal(await store.get("cA"), null);
});

// A hand-made IndexedDB, just enough for the adapter: one database, one store, add / get / delete, transactions that finish on the next tick.
function fakeIDB() {
  const dbs = new Map();
  return {
    dbs,
    open(name, ver) {
      const req = {};
      queueMicrotask(() => {
        let rec = dbs.get(name);
        const fresh = !rec;
        if (fresh) dbs.set(name, rec = { stores: new Map(), ver });
        const db = {
          objectStoreNames: { contains: (n) => rec.stores.has(n) },
          createObjectStore: (n) => rec.stores.set(n, new Map()),
          transaction(n) {
            const tx = {}; let pending = 0;
            const settle = () => setTimeout(() => { if (!pending) tx.oncomplete && tx.oncomplete(); }, 0);
            const act = (fn) => { const r = {}; pending++; queueMicrotask(() => { fn(r); pending--; settle(); }); return r; };
            const m = rec.stores.get(n);
            tx.objectStore = () => ({
              get: (k) => act((r) => { r.result = m.get(k); r.onsuccess && r.onsuccess(); }),
              add: (v, k) => act((r) => {
                if (m.has(k)) { r.error = new Error("ConstraintError"); r.onerror && r.onerror({ preventDefault() {}, stopPropagation() {} }); }
                else { m.set(k, v); r.onsuccess && r.onsuccess(); }
              }),
              delete: (k) => act((r) => { m.delete(k); r.onsuccess && r.onsuccess(); }),
            });
            return tx;
          },
        };
        req.result = db;
        if (fresh) req.onupgradeneeded && req.onupgradeneeded();
        req.onsuccess && req.onsuccess();
      });
      return req;
    },
  };
}

test("the IndexedDB adapter: db mb-keys, store pairs, the id as key, one pair", async () => {
  const idb = fakeIDB();
  const store = idbStore({ idb });
  const a = await companionKey(store, "cA");
  assert.ok([...idb.dbs.keys()].includes("mb-keys"));
  assert.ok(idb.dbs.get("mb-keys").stores.has("pairs"));
  assert.equal(idb.dbs.get("mb-keys").stores.get("pairs").get("cA").pub, a.pub);
  const again = await companionKey(idbStore({ idb }), "cA");   // another tab, same database
  assert.equal(again.pub, a.pub);
  assert.equal((await store.putIfAbsent("cA", { pub: "x" })).pub, a.pub);
  await store.delete("cA");
  assert.equal(await store.get("cA"), null);
});

test("the recovery vector: seed, text, lines, public key and kid", async () => {
  const r = V.recovery, seed = hexDecode(r.seed);
  assert.equal(await formatRecovery(seed), r.text);
  assert.deepEqual(await recoveryLines(seed), r.lines);
  assert.equal(r.lines.length, 7);
  assert.ok(r.lines[0].startsWith("MBRK "));
  assert.match(r.text, /^MBRK ([0-9A-HJKMNP-TV-Z]{4}-){13}[0-9A-HJKMNP-TV-Z]{4}$/);
  assert.equal(await recoveryPub(seed), r.pub);
  assert.equal(await kid(r.pub), r.kid);
  assert.equal(r.kid.length, 4);
  assert.equal(V.companion.header.recovery.kid, r.kid);
  assert.equal(V.companion.header.recovery.pub, r.pub);
});

test("the recovery key round trips, and the seed signs for its public key", async () => {
  for (const f of [(i) => i, (i) => 255 - i, () => 0, () => 255, (i) => (i * 97 + 13) & 255]) {
    const seed = seedOf(f), text = await formatRecovery(seed);
    const got = await parseRecovery(text);
    assert.equal(got.ok, true);
    assert.deepEqual(got.seed, seed);
    assert.equal(await recoveryPub(got.seed), await recoveryPub(seed));
  }
  const seed = seedOf((i) => i + 5), p = await pairFromSeed(seed);
  assert.ok(await verify(await recoveryPub(seed), "x", await sign(p.privateKey, "x")));
  await assert.rejects(formatRecovery(new Uint8Array(31)), /32 bytes/);
  assert.equal(base32(Uint8Array.of(0xff, 0xff, 0xff, 0xff, 0xff)), "ZZZZZZZZ");
  assert.equal(base32(new Uint8Array(5)), "00000000");
});

test("Crockford: case, hyphens, spaces and the word MBRK do not matter; I and L are 1, O is 0", async () => {
  const seed = seedOf((i) => i), text = await formatRecovery(seed);
  const body = text.slice(5).replace(/-/g, "");
  const same = async (t) => { const g = await parseRecovery(t); assert.equal(g.ok, true, t); assert.deepEqual(g.seed, seed, t); };
  await same(text);
  await same(text.toLowerCase());
  await same(body);
  await same(body.toLowerCase());
  await same("  " + text.replace(/-/g, " ") + "\n");
  await same(text.replace("MBRK ", "mbrk-"));
  await same((await recoveryLines(seed)).join("\n"));
  // this key has 0s and 1s in it; write them as O, o, I, i, L, l in turn
  assert.ok(/0/.test(body) && /1/.test(body));
  await same(body.replace(/0/g, "O"));
  await same(body.replace(/0/g, "o"));
  await same(body.replace(/1/g, "I"));
  await same(body.replace(/1/g, "i"));
  await same(body.replace(/1/g, "L"));
  await same(body.replace(/1/g, "l").replace(/0/g, "o"));
  // a text with no 1 or 0 in it is not what this test needs, so spell the equivalence out directly
  const a = await parseRecovery("MBRK " + body.replace(/[01]/g, (c) => (c === "0" ? "O" : "I")));
  assert.equal(a.ok, true);
});

test("the recovery reader names what is wrong", async () => {
  const seed = seedOf((i) => i), text = await formatRecovery(seed), body = text.slice(5).replace(/-/g, "");
  assert.equal((await parseRecovery("")).why, "length");
  assert.equal((await parseRecovery(body.slice(1))).why, "length");
  assert.equal((await parseRecovery(body + "0")).why, "length");
  assert.equal((await parseRecovery("U" + body.slice(1))).why, "chars");   // U is not in the alphabet
  assert.equal((await parseRecovery("!" + body.slice(1))).why, "chars");
  assert.equal((await parseRecovery("é" + body.slice(1))).why, "chars");
  const v2 = base32(Uint8Array.of(2, ...seed, 0, 0));
  assert.equal((await parseRecovery(v2)).why, "version");
  assert.equal((await parseRecovery(body.slice(0, 54) + (body[54] === "0" ? "1" : "0") + body[55])).ok, false);
});

test("1,000 random single-character typos are all caught", async () => {
  // A fixed generator, so the run is the same every time. The check is 2 bytes of a hash: a typo slips through with chance 1 in 65,536, so this run is a set, not a promise of every one.
  let st = 0x2f6e2b1;
  const rnd = (n) => { st = (st + 0x6d2b79f5) | 0; let t = Math.imul(st ^ (st >>> 15), 1 | st); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return (((t ^ (t >>> 14)) >>> 0) / 4294967296 * n) | 0; };
  const ALPHA = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  let caught = 0;
  for (let n = 0; n < 1000; n++) {
    const seed = seedOf(() => rnd(256)), body = (await formatRecovery(seed)).slice(5).replace(/-/g, "");
    const at = rnd(56);
    let c; do c = ALPHA[rnd(32)]; while (c === body[at]);
    const typed = body.slice(0, at) + c + body.slice(at + 1);
    const got = await parseRecovery(typed);
    if (!got.ok) caught++; else assert.fail("a typo got through: " + typed + " for " + body);
  }
  assert.equal(caught, 1000);
});
