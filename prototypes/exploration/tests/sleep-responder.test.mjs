// The Companion's side of putting a realm to sleep (src/sleeper.mjs, wired in index.html): its key at the first boot, its pub, and the answers to the Station's
// lock, sign, clear and unlock. The page's own code, run in the sandbox; the key pairs live in a Map, the Station's request is built with the sleep file's own prepareSleep.
//   node --test prototypes/exploration/tests/sleep-responder.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";
import { memoryStore, verify } from "../../play/src/realm/keys.mjs";
import { prepareSleep } from "../../play/src/realm/sleepfile.mjs";
import { TOMB_PREFIX } from "../src/sleeper.mjs";

const SLEPT = 1800000000000;
const NEW = { newSeed: 424242, newWid: "wnewrealm1" };
const SHA = "ab".repeat(32);

// A page with a world and a key store; `boot` makes the key (the first boot's work). The cradle is seated unless said otherwise.
async function setup({ store, keys = memoryStore(), seated = true, boot = true } = {}) {
  const p = makePage({ store: store || {}, console: "silent" });
  if (!store) p.run("newWorld(7)");
  p.ctx.__keys = keys; p.run("KEY_STORE = __keys");
  const sl = p.run("SLEEP");
  await sl.pub();   // the boot's own start() ran before the key store was handed in, with no IndexedDB: let that attempt end
  if (boot) await sl.start();
  if (seated) await sl.seat(true);
  const wid = p.run("S.wid");
  const ask = async (m) => sl.handle({ nonce: 1, wid, ...m });
  const headerFor = async (over = {}) => {   // what the Station builds and asks to be signed
    const save = p.sv(); save.st = { schema: 4, wid: save.wid, e: 0, d: 0, s: 0, mibis: [] };
    const who = { id: p.run("COMPANION.id"), name: "Companion A", pub: await sl.pub(), ...(over.companion || {}) };
    return prepareSleep({ save: over.save || save, caddy: { dock: {}, jobs: [], prints: [] }, companion: who, recovery: null, slept: SLEPT });
  };
  const tomb = () => { const raw = p.store[TOMB_PREFIX + p.run("COMPANION.id")]; return raw ? JSON.parse(raw) : null; };
  return { p, sl, wid, ask, headerFor, tomb, keys };
}
const lockAndSign = async (t, over = {}) => {
  const l = await t.ask({ op: "lock" }); assert.equal(l.ok, true, JSON.stringify(l));
  const prep = await t.headerFor(over);
  return { l, prep, a: await t.ask({ op: "sign", signed: prep.signed, ...NEW }) };
};

test("1. the key at the first boot: made once, kept as a CryptoKey that cannot be exported, its pub in mb-companion and the same on the next boot", async () => {
  const keys = memoryStore(), t = await setup({ keys });
  const pub = await t.sl.pub();
  assert.match(pub, /^[A-Za-z0-9_-]{43}$/, "32 bytes in base64url");
  const rec = JSON.parse(t.p.store["mb-companion-A"]);
  assert.equal(rec.pub, pub, "in the Companion's own record"); assert.match(rec.id, /^c[0-9a-z]{12}$/);
  assert.equal(t.p.run("COMPANION.pub"), pub, "and in what the page tells the shell");
  const got = await keys.get(rec.id);
  assert.equal(got.pub, pub); assert.equal(got.privateKey.extractable, false, "the private half cannot leave its store");
  assert.equal(JSON.stringify(t.p.store).includes("privateKey"), false, "and is never in the save or the record");
  const t2 = await setup({ store: t.p.store, keys });   // a second boot, the same Companion
  assert.equal(await t2.sl.pub(), pub, "the same pair"); assert.equal(JSON.parse(t2.p.store["mb-companion-A"]).pub, pub);
});

test("2. a browser that cannot make a key (no store at all): no pub, and a sign is refused", async () => {
  const p = makePage({ console: "silent" }); p.run("newWorld(7)");   // the sandbox has no IndexedDB
  const sl = p.run("SLEEP"); assert.equal(await sl.start(), null); await sl.seat(true);
  assert.equal(p.run("COMPANION.pub"), undefined); assert.equal(JSON.parse(p.store["mb-companion-A"]).pub, undefined);
  const wid = p.run("S.wid"), l = await sl.handle({ op: "lock", wid, nonce: 1 });
  assert.equal(l.ok, true);
  const r = await sl.handle({ op: "sign", wid, nonce: 2, signed: "MBR1\n{}", ...NEW });
  assert.deepEqual([r.ok, r.why], [false, "no key"]);
});

test("3. lock, sign: the answer carries the part's hash and a signature that verifies against the pub; the tombstone is pending", async () => {
  const t = await setup(), { l, prep, a } = await lockAndSign(t);
  assert.equal(l.parts.companion, prep.header.parts.companion, "the Companion's hash is the one the Station takes of the same save");
  assert.equal(a.ok, true, JSON.stringify(a));
  assert.equal(await verify(await t.sl.pub(), prep.signed, a.sig), true, "Ed25519 over the bytes the Station sent");
  assert.deepEqual(t.tomb(), { wid: t.wid, sha: null, newSeed: NEW.newSeed, newWid: NEW.newWid, state: "pending" });
  assert.equal(t.p.run("RT.sleepLock"), t.wid);
});

test("4. sign is refused for another wid", async () => {
  const t = await setup(); await t.ask({ op: "lock" });
  const prep = await t.headerFor();
  const other = await t.ask({ op: "sign", wid: "wsomeoneelse", signed: prep.signed, ...NEW });
  assert.deepEqual([other.ok, other.why], [false, "wid"]);
  const forged = await prepareSleep({ save: { ...t.p.sv(), wid: "wsomeoneelse", st: { schema: 4, wid: "wsomeoneelse" } }, caddy: { dock: {}, jobs: [], prints: [] }, companion: { id: t.p.run("COMPANION.id"), name: "x", pub: await t.sl.pub() }, slept: SLEPT });
  const r = await t.ask({ op: "sign", signed: forged.signed, ...NEW });
  assert.deepEqual([r.ok, r.why], [false, "wid"], "a header for another realm is refused though the request names this one");
  assert.equal(t.tomb(), null, "no tombstone, no signature");
  assert.equal((await t.ask({ op: "lock", wid: "wsomeoneelse" })).why, "wid");
});

test("5. sign is refused for a changed part, a header that is not this Companion's, and a bad shape", async () => {
  const t = await setup(); await t.ask({ op: "lock" });
  const good = await t.headerFor(), head = JSON.parse(good.headerLine);
  const signedOf = (h) => "MBR1\n" + JSON.stringify(h);
  // the part changed: the Station's copy differs from what the Companion holds
  const moved = p => ({ ...t.p.sv(), turn: 999 });
  const changed = await t.headerFor({ save: { ...moved(), st: { schema: 4, wid: t.wid } } });
  let r = await t.ask({ op: "sign", signed: changed.signed, ...NEW }); assert.deepEqual([r.ok, r.why], [false, "part"]);
  // the Companion's own save moved on after the lock (storage written behind its back): the part no longer matches
  const raw = t.p.store[t.p.KEY]; t.p.store[t.p.KEY] = JSON.stringify({ ...JSON.parse(raw), turn: 5 });
  r = await t.ask({ op: "sign", signed: good.signed, ...NEW }); assert.deepEqual([r.ok, r.why], [false, "part"]); t.p.store[t.p.KEY] = raw;
  // another Companion's pub, or id
  const other = await t.headerFor({ companion: { pub: "C".repeat(43) } }); r = await t.ask({ op: "sign", signed: other.signed, ...NEW }); assert.deepEqual([r.ok, r.why], [false, "pub"]);
  const otherId = await t.headerFor({ companion: { id: "czzzzzzzzzzzz" } }); r = await t.ask({ op: "sign", signed: otherId.signed, ...NEW }); assert.deepEqual([r.ok, r.why], [false, "pub"]);
  // a header that says something else, bytes that are not a header, and a non-canonical one
  for (const bad of ["MBR1\n" + JSON.stringify({ ...head, kind: "other" }), "MBR2\n" + good.headerLine, good.headerLine, "MBR1\nnot json", "MBR1\n" + JSON.stringify(head, null, 1), "MBR1\n{}", 7, null])
    assert.equal((await t.ask({ op: "sign", signed: bad, ...NEW })).ok, false, String(bad).slice(0, 30));
  // the new realm's seed and wid must be real, and not this realm's own
  for (const over of [{ newSeed: -1 }, { newSeed: 1.5 }, { newSeed: "7" }, { newWid: "x" }, { newWid: t.wid }, { newWid: undefined }]) assert.equal((await t.ask({ op: "sign", signed: good.signed, ...NEW, ...over })).why, "bad request", JSON.stringify(over));
  assert.equal(t.tomb(), null, "nothing was signed, so nothing is pending");
  assert.equal((await t.ask({ op: "sign", signed: good.signed, ...NEW })).ok, true, "and the good one still signs");
});

test("6. sign needs the lock, and every op is refused while the cradle is lifted", async () => {
  const t = await setup(); const prep = await t.headerFor();
  let r = await t.ask({ op: "sign", signed: prep.signed, ...NEW }); assert.deepEqual([r.ok, r.why], [false, "not locked"], "never signs a part it has not stopped");
  await t.ask({ op: "lock" });
  await t.sl.seat(false);   // lifted
  for (const op of ["lock", "sign", "clear", "unlock"]) { r = await t.ask({ op, signed: prep.signed, sha: SHA, ...NEW }); assert.deepEqual([r.ok, r.why], [false, "lifted"], op); }
  assert.equal(t.tomb(), null);
  await t.sl.seat(true);
  assert.equal((await t.ask({ op: "lock" })).ok, true, "seated again: it answers");
  // read-only pages and junk requests
  assert.equal((await t.sl.handle(null)).why, "bad request"); assert.equal((await t.sl.handle({ op: "format", wid: t.wid })).why, "bad request"); assert.equal((await t.sl.handle({ op: "lock" })).why, "bad request");
  t.p.run("RT.readOnly = true"); assert.equal((await t.ask({ op: "lock" })).why, "read-only");
});

test("7. a tombstone that cannot be written means no signature", async () => {
  const t = await setup(); await t.ask({ op: "lock" });
  const realSet = t.p.ctx.localStorage.setItem;
  t.p.ctx.localStorage.setItem = (k, v) => { if (k.startsWith(TOMB_PREFIX)) throw new Error("full"); return realSet(k, v); };
  const prep = await t.headerFor(), r = await t.ask({ op: "sign", signed: prep.signed, ...NEW });
  assert.deepEqual([r.ok, r.why, r.sig], [false, "tombstone", undefined]);
});

test("8. a lock stops every write: the store's writes are counted, and nothing changes the save, through play, time, the Station's part and a storage event", async () => {
  const t = await setup(), { p } = t;
  p.pass(1000);
  const l = await t.ask({ op: "lock" }); assert.equal(l.ok, true);
  p.writeSt({ ...JSON.parse(p.store[p.KEY]).st, e: 9 });   // the Station's own write of its part (its page writes the store, not this one)
  const n = p.writes.length, bytes = p.store[p.KEY];
  p.run("save()"); p.run("save()");
  p.key("down", 2); p.key("confirm", 2); p.pass(60000);
  p.run("S.turn += 3; S.ui.sel = 1; S.totalActions += 5"); p.run("save()");
  p.run("transition(); onStateChanged && onStateChanged()"); p.run("save()");
  assert.equal(p.writes.length, n, "not one write to storage while locked: " + p.writes.slice(n).join(","));
  assert.equal(p.store[p.KEY], bytes, "the very bytes the lock was taken on");
  // unlock lets go
  assert.equal((await t.ask({ op: "unlock" })).ok, true); assert.equal(p.run("RT.sleepLock"), false);
  p.run("S.ui.sel = 2"); p.run("save()");
  assert.ok(p.writes.length > n, "unlocked: the page writes again");
});

test("9. lock writes the save one last time, and answers the same on a second lock", async () => {
  const t = await setup(), { p } = t;
  p.run("S.totalActions = 77");   // changed in memory only
  const a = await t.ask({ op: "lock" });
  assert.equal(JSON.parse(p.store[p.KEY]).totalActions, 77, "the last write took the change");
  const n = p.writes.length, b = await t.ask({ op: "lock" });
  assert.deepEqual(b, a, "asked again, the same answer"); assert.equal(p.writes.length, n, "and no second write");
});

test("10. unlock drops a pending tombstone and the lock; a committed one it will not drop", async () => {
  const t = await setup(); await lockAndSign(t);
  assert.ok(t.tomb()); assert.equal((await t.ask({ op: "unlock" })).ok, true);
  assert.equal(t.tomb(), null, "the rollback"); assert.equal(t.p.run("RT.sleepLock"), false);
  assert.equal((await t.ask({ op: "unlock" })).ok, true, "idempotent");
  await lockAndSign(t);   // signs again from the start
  t.p.store[TOMB_PREFIX + t.p.run("COMPANION.id")] = JSON.stringify({ ...t.tomb(), state: "committed", sha: SHA });
  const r = await t.ask({ op: "unlock" }); assert.deepEqual([r.ok, r.why], [false, "committed"]);
  assert.equal(t.p.run("RT.sleepLock"), t.wid, "still locked");
});

test("11. clear: the tombstone committed, then the new realm with the seed and wid it holds, then done; asked again it answers the same", async () => {
  const t = await setup(), { p } = t; await lockAndSign(t);
  const oldSeed = p.run("S.seed"), keep = p.store[p.KEY];
  let r = await t.ask({ op: "clear", sha: SHA, newSeed: 1, newWid: NEW.newWid }); assert.equal(r.why, "bad request", "the Station cannot name another seed");
  r = await t.ask({ op: "clear", sha: "nothex", ...NEW }); assert.equal(r.why, "bad request");
  assert.equal(p.run("S.wid"), t.wid, "nothing happened yet"); assert.equal(p.store[p.KEY], keep);
  const steps = []; const orig = p.ctx.localStorage.setItem;
  p.ctx.localStorage.setItem = (k, v) => { steps.push(k.startsWith(TOMB_PREFIX) ? "tomb:" + JSON.parse(v).state : k.startsWith("mb-save") ? "save:" + JSON.parse(v).wid : k); return orig(k, v); };
  r = await t.ask({ op: "clear", sha: SHA, ...NEW });
  assert.deepEqual([r.ok, r.wid], [true, NEW.newWid]);
  assert.deepEqual(steps.filter(s => s.startsWith("tomb") || s.startsWith("save")), ["tomb:committed", `save:${NEW.newWid}`, "tomb:done"], "committed, the new realm, done");
  assert.equal(p.run("S.wid"), NEW.newWid); assert.equal(p.run("S.seed"), NEW.newSeed); assert.notEqual(NEW.newSeed, oldSeed);
  assert.equal(JSON.parse(p.store[p.KEY]).wid, NEW.newWid, "and it is what is stored");
  assert.deepEqual(t.tomb(), { wid: t.wid, sha: SHA, newSeed: NEW.newSeed, newWid: NEW.newWid, state: "done" });
  assert.equal(p.run("RT.sleepLock"), false);
  const again = await t.ask({ op: "clear", wid: t.wid, sha: SHA, ...NEW });
  assert.deepEqual([again.ok, again.wid], [true, NEW.newWid]); assert.equal(p.run("S.wid"), NEW.newWid, "a second clear makes no second realm");
  // a clear for a sleep that was never signed
  const t2 = await setup(); await t2.ask({ op: "lock" });
  assert.equal((await t2.ask({ op: "clear", sha: SHA, ...NEW })).why, "tombstone");
  assert.equal(t2.p.run("S.wid"), t2.wid);
});

test("12. a page that boots with a pending tombstone writes nothing, and unlock lets it go; one that boots committed finishes the clear on its own", async () => {
  const t = await setup(); await lockAndSign(t);
  const store = { ...t.p.store };
  const t2 = await setup({ store: { ...store }, boot: false, seated: false });
  assert.equal(t2.p.run("RT.sleepLock"), t.wid, "locked at the boot");
  assert.equal(t2.p.writes.filter(k => k.startsWith("mb-save")).length, 0, "the boot's own save was held");
  t2.p.run("save()"); assert.equal(t2.p.writes.filter(k => k.startsWith("mb-save")).length, 0);
  await t2.sl.seat(true); assert.equal((await t2.ask({ op: "unlock" })).ok, true);
  t2.p.run("save()"); assert.equal(t2.p.writes.filter(k => k.startsWith("mb-save")).length, 1, "after the rollback it writes");
  // committed: the Companion rolls forward by itself
  const st3 = { ...store }; st3[TOMB_PREFIX + t.p.run("COMPANION.id")] = JSON.stringify({ ...t.tomb(), state: "committed", sha: SHA });
  const p3 = makePage({ store: st3, console: "silent" });   // the boot itself: held at once, and finished on its own
  assert.equal(p3.run("RT.sleepLock"), t.wid, "locked at the boot, before the first write"); assert.equal(p3.writes.filter(k => k.startsWith("mb-save")).length, 0);
  const t3 = await setup({ store: st3, boot: false, seated: false });
  assert.equal(t3.p.run("S.wid"), NEW.newWid, "the new realm"); assert.equal(JSON.parse(t3.p.store[t3.p.KEY]).wid, NEW.newWid);
  assert.equal(t3.tomb().state, "done"); assert.equal(t3.p.run("RT.sleepLock"), false);
  // lifted with a committed tombstone: the same, without a reboot
  const t4 = await setup(); await lockAndSign(t4);
  t4.p.store[TOMB_PREFIX + t4.p.run("COMPANION.id")] = JSON.stringify({ ...t4.tomb(), state: "committed", sha: SHA });
  await t4.sl.seat(false);
  assert.equal(t4.p.run("S.wid"), NEW.newWid); assert.equal(t4.tomb().state, "done");
});

test("13. lifted after a lock but before a signature: the lock lets go; lifted after a signature, it stays until the Station rolls back or commits", async () => {
  const a = await setup(); await a.ask({ op: "lock" }); await a.sl.seat(false);
  assert.equal(a.p.run("RT.sleepLock"), false, "nothing was signed, nothing is at risk");
  const b = await setup(); await lockAndSign(b); await b.sl.seat(false);
  assert.equal(b.p.run("RT.sleepLock"), b.wid); assert.equal(b.tomb().state, "pending");
});
