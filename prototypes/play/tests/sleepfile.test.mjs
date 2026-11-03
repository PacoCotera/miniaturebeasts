// The sleep file (src/realm/sleepfile.mjs): build, parse, verify, the wake check. The golden file is built from fixed seeds and a fixed time, so it is the same bytes every run.
//   node --test prototypes/play/tests/sleepfile.test.mjs
// To renew the golden after a deliberate change:  MB_WRITE_GOLDEN=1 node --test prototypes/play/tests/sleepfile.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { b64uEncode, b64uDecode, hexDecode, utf8, unutf8 } from "../src/realm/b64.mjs";
import { canonical } from "../src/realm/canonical.mjs";
import { sha256, pairFromSeed, generateKeyPair, sign, verify } from "../src/realm/keys.mjs";
import { formatRecovery, recoveryPub, kid } from "../src/realm/recovery.mjs";
import { MAGIC, MAX_BYTES, fileHash, prepareSleep, assembleSleepFile, buildSleepFile, parseSleepFile, verifySleepFile, readBody, ledgerState, wakeCheck, wake } from "../src/realm/sleepfile.mjs";
import { migrate8 } from "../../exploration/src/regions.mjs";

const V = JSON.parse(readFileSync(new URL("../src/realm/vectors.json", import.meta.url), "utf8"));
const GOLDEN = new URL("./fixtures/sleep-v1-golden.mbr", import.meta.url);
const SLEPT = 1800000000000;                                                      // fixed
const v8 = JSON.parse(readFileSync(new URL("../../station/tests/fixtures/save-v8-played-g2.json", import.meta.url), "utf8"));
const save = migrate8(v8, { now: 1793664000000 });
const caddy = { dock: { v: 1, wid: v8.wid, crates: [], at: SLEPT - 1000 }, jobs: [{ id: "j1", kind: "tend", due: SLEPT + 5000 }], prints: [] };

const companion = await pairFromSeed(hexDecode(V.companion.seed));              // the test Companion
const recoverySeed = hexDecode(V.recovery.seed);
const recText = await formatRecovery(recoverySeed);
const recovery = { kid: await kid(await recoveryPub(recoverySeed)), pub: await recoveryPub(recoverySeed) };
const who = { id: "cA", name: "Companion A", pub: companion.pub };
const opts = { save, caddy, companion: who, recovery, slept: SLEPT };

const built = await buildSleepFile(opts, companion.privateKey);

// A file with a header and body of the test's choosing, signed by `key` (to forge what a bad actor, or a bug, would write).
async function forge({ header, body, key = companion.privateKey }) {
  const bodyLine = typeof body === "string" ? body : canonical(body);
  const h = { ...header, body: { sha256: Buffer.from(await sha256(utf8(bodyLine))).toString("hex"), bytes: utf8(bodyLine).length } };
  const headerLine = canonical(h);
  const sig = await sign(key, MAGIC + "\n" + headerLine);
  return utf8(MAGIC + "\n" + headerLine + "\n" + sig + "\n" + bodyLine + "\n");
}
const body0 = () => JSON.parse(parseSleepFile(built.bytes).bodyLine);
const flip = (bytes, i) => Uint8Array.from(bytes, (b, j) => (j === i ? b ^ 1 : b));
const lineStart = (bytes, n) => { let c = 0; for (let i = 0; i < bytes.length; i++) if (bytes[i] === 10 && ++c === n) return i + 1; throw new Error("no such line"); };

test("the file is four lines, LF only, and equals the golden bytes", () => {
  const lines = built.text.split("\n");
  assert.equal(lines.length, 5); assert.equal(lines[4], "");
  assert.equal(lines[0], "MBR1");
  assert.equal(lines[1], canonical(JSON.parse(lines[1])));
  assert.equal(b64uDecode(lines[2]).length, 64);
  assert.equal(lines[3], canonical(JSON.parse(lines[3])));
  assert.ok(!built.text.includes("\r"));
  if (process.env.MB_WRITE_GOLDEN) writeFileSync(GOLDEN, built.bytes);
  assert.deepEqual(new Uint8Array(readFileSync(GOLDEN)), built.bytes);
});

test("building twice gives the same bytes (Ed25519 is deterministic), and prepare + assemble is the same as build", async () => {
  const again = await buildSleepFile(opts, companion.privateKey);
  assert.deepEqual(again.bytes, built.bytes);
  const prep = await prepareSleep(opts);
  const sig = await sign(companion.privateKey, prep.signed);
  assert.equal(prep.signed, "MBR1\n" + prep.headerLine);
  assert.deepEqual((await assembleSleepFile(prep, sig)).bytes, built.bytes);
  assert.equal(built.sha, await fileHash(built.bytes));
  assert.equal(built.sha8, built.sha.slice(0, 8));
  assert.match(built.sha, /^[0-9a-f]{64}$/);
});

test("the header says what the design says", () => {
  const h = built.header;
  assert.equal(h.kind, "mb-realm-sleep"); assert.equal(h.v, 1);
  assert.equal(h.wid, v8.wid); assert.equal(h.began, save.began); assert.equal(h.slept, SLEPT);
  assert.deepEqual(h.companion, who);
  assert.deepEqual(h.recovery, recovery);
  assert.deepEqual(h.save, { v: 9, st: 4, gens: [2] });
  assert.deepEqual(Object.keys(h.parts).sort(), ["caddy", "companion", "station"]);
  assert.equal(h.body.bytes, utf8(parseSleepFile(built.bytes).bodyLine).length);
  assert.deepEqual(h.summary, { regions: 1, mibis: 2, pods: 72, crates: 2, d: 96, e: 24, s: 48, turn: 20, exp: null, names: ["Mibi1", save.st.mibis[1].name] });
  assert.deepEqual(parseSleepFile(built.bytes).header, h);
});

test("a header with no recovery key says null", async () => {
  const f = await buildSleepFile({ ...opts, recovery: null }, companion.privateKey);
  assert.equal(f.header.recovery, null);
  assert.ok((await verifySleepFile(f.bytes)).ok);
});

test("the golden file verifies, and its body equals the input", async () => {
  const bytes = new Uint8Array(readFileSync(GOLDEN));
  const r = await verifySleepFile(bytes);
  assert.deepEqual([r.ok, r.why], [true, ""]);
  assert.ok((await verifySleepFile(bytes, { pub: companion.pub })).ok);
  const body = await readBody(bytes);
  const { st, ...rest } = save;
  assert.deepEqual(body, { companion: rest, station: st, caddy });
  assert.deepEqual({ ...body.companion, st: body.station }, save);                   // the save comes back whole
});

test("the head reads three lines and never touches the body", () => {
  const bytes = built.bytes, cut = lineStart(bytes, 3);
  const p = parseSleepFile(bytes.slice(0, cut), { head: true });
  assert.ok(p.ok); assert.equal(p.header.wid, v8.wid); assert.equal(p.bodyLine, undefined);
  assert.equal(parseSleepFile(bytes.slice(0, cut)).ok, false);                       // a full parse needs the body
  const bad = new Uint8Array([...bytes.slice(0, cut), ...utf8("this is {not json")]);
  assert.ok(parseSleepFile(bad, { head: true }).ok);
});

// ---- verify: every way it says no ----------------------------------------------------------------------------------------------------------------------------------

test("verify 1: the magic line", async () => {
  assert.equal((await verifySleepFile(utf8(built.text.replace("MBR1", "MBR2")))).why, "magic");
  assert.equal((await verifySleepFile(utf8(" " + built.text))).why, "magic");
  assert.equal((await verifySleepFile(utf8(built.text.replace("MBR1\n", "MBR1\r\n")))).why, "magic");   // CRLF is not the magic line
});

test("verify: not a file at all, cut short, or with more lines", async () => {
  for (const bad of ["", "MBR1", "MBR1\n", "MBR1\n{}\n", "MBR1\n{}\nsig\n", "hello"]) assert.equal((await verifySleepFile(utf8(bad))).ok, false, bad);
  assert.equal((await verifySleepFile(built.bytes.slice(0, built.bytes.length - 1))).why, "format");   // no ending LF
  assert.equal((await verifySleepFile(utf8(built.text + "\n"))).why, "format");                         // a fifth line
  assert.equal((await verifySleepFile(utf8(built.text + "x"))).why, "format");
  assert.equal((await verifySleepFile(built.bytes.slice(0, built.bytes.length - 50))).why, "format");
  assert.equal((await verifySleepFile(Uint8Array.of(0xff, 0xfe, 10, 10, 10, 10))).ok, false);           // not UTF-8
  assert.equal((await verifySleepFile(null)).ok, false);
});

test("verify 2: the header parses, and kind and v are known", async () => {
  const lines = built.text.split("\n");
  assert.equal((await verifySleepFile(utf8([lines[0], "{not json", lines[2], lines[3], ""].join("\n")))).why, "header");
  assert.equal((await verifySleepFile(utf8([lines[0], "[1]", lines[2], lines[3], ""].join("\n")))).why, "header");
  const h = built.header, b = body0();
  assert.equal((await verifySleepFile(await forge({ header: { ...h, kind: "mb-something" }, body: b }))).why, "kind");
  assert.equal((await verifySleepFile(await forge({ header: { ...h, v: 2 }, body: b }))).why, "version");
  assert.equal((await verifySleepFile(await forge({ header: { ...h, companion: null }, body: b }))).why, "header");
  assert.ok((await verifySleepFile(await forge({ header: h, body: b }))).ok);                            // the forge itself is sound
});

test("verify 3: the signature (one character of the header, another key, the pub given)", async () => {
  const at = utf8(MAGIC + "\n").length + built.text.split("\n")[1].indexOf('"wid":"') + 10;
  const changed = flip(built.bytes, at);
  assert.equal(unutf8(changed).split("\n")[1] !== built.text.split("\n")[1], true);
  assert.equal((await verifySleepFile(changed)).why, "signature");
  const other = await generateKeyPair();
  assert.equal((await verifySleepFile(await forge({ header: built.header, body: body0(), key: other.privateKey }))).why, "signature");   // signed by a key the header does not name
  assert.equal((await verifySleepFile(built.bytes, { pub: other.pub })).why, "signature");                                                  // the Station knows another pub
  assert.ok((await verifySleepFile(built.bytes, { pub: companion.pub })).ok);
  const sigAt = lineStart(built.bytes, 2) + 5;
  assert.equal((await verifySleepFile(flip(built.bytes, sigAt))).why, "signature");                                                          // a flipped signature
  const lines = built.text.split("\n");
  for (const s of ["", "AAAA", lines[2].slice(1), lines[2] + "AA"]) assert.equal((await verifySleepFile(utf8([lines[0], lines[1], s, lines[3], ""].join("\n")))).why, "signature");
  const bad = { ...built.header, companion: { ...who, pub: "not-a-key" } };
  assert.equal((await verifySleepFile(await forge({ header: bad, body: body0() }))).why, "signature");
});

test("verify 4: the body's hash and length", async () => {
  const at = lineStart(built.bytes, 3) + 100;
  assert.equal((await verifySleepFile(flip(built.bytes, at))).why, "body-hash");                                    // one byte of the body
  const lines = built.text.split("\n");
  assert.equal((await verifySleepFile(utf8([lines[0], lines[1], lines[2], lines[3].replace("{", "{ "), ""].join("\n")))).why, "body-hash");
  const h = { ...built.header }, bodyLine = lines[3];                                                                // header signed, length wrong
  const hl = canonical({ ...h, body: { sha256: h.body.sha256, bytes: h.body.bytes + 1 } });
  const wrong = utf8(["MBR1", hl, await sign(companion.privateKey, "MBR1\n" + hl), bodyLine, ""].join("\n"));
  assert.equal((await verifySleepFile(wrong)).why, "body-length");
  assert.equal((await verifySleepFile(await forge({ header: h, body: "{not json" }))).why, "body");
  assert.equal((await verifySleepFile(await forge({ header: h, body: "[1]" }))).why, "body");
  assert.equal((await verifySleepFile(await forge({ header: h, body: { ...body0(), extra: 1 } }))).why, "body");
});

test("verify 5: each part's hash", async () => {
  for (const part of ["companion", "station", "caddy"]) {
    const b = body0(); b[part] = { ...b[part], tampered: 1 };
    const r = await verifySleepFile(await forge({ header: built.header, body: b }));      // a signed, well-formed file whose body part is not what the header hashed
    assert.deepEqual([r.ok, r.why], [false, "part-" + part]);
  }
  const h = { ...built.header, parts: { ...built.header.parts, station: "0".repeat(64) } };
  assert.equal((await verifySleepFile(await forge({ header: h, body: body0() }))).why, "part-station");
});

test("a file over 8 MB is refused", async () => {
  assert.equal(MAX_BYTES, 8 * 1024 * 1024);
  assert.equal((await verifySleepFile(new Uint8Array(MAX_BYTES + 1))).why, "size");
  await assert.rejects(prepareSleep({ ...opts, caddy: { dock: "x".repeat(MAX_BYTES), jobs: [], prints: [] } }), /8 MB/);
});

test("building refuses what is not a v9 realm", async () => {
  await assert.rejects(prepareSleep({ ...opts, save: v8 }), /v9/);
  const { st, ...nost } = save;
  await assert.rejects(prepareSleep({ ...opts, save: nost }), /Station part/);
  await assert.rejects(prepareSleep({ ...opts, save: { ...save, wid: "" } }), /wid/);
  await assert.rejects(prepareSleep({ ...opts, caddy: null }), /Caddy/);
  await assert.rejects(prepareSleep({ ...opts, companion: { id: "cA" } }), /pub/);
  await assert.rejects(prepareSleep({ ...opts, slept: NaN }), /slept/);
  await assert.rejects(assembleSleepFile(await prepareSleep(opts), "short"), /signature/);
  await assert.rejects(prepareSleep({ ...opts, caddy: { dock: NaN, jobs: [], prints: [] } }), /finite/);
});

// ---- the wake check ------------------------------------------------------------------------------------------------------------------------------------------------

const challenge = "wake challenge 0001 for " + built.sha8;
const proof = async (key = companion.privateKey, c = challenge) => ({ challenge: c, companionSig: await sign(key, c) });
const committed = [[{ sha: built.sha, state: "kept" }, { sha: built.sha, state: "committed" }]];

test("wakeCheck passes with a fresh challenge signed by the Companion, and with the recovery text", async () => {
  assert.deepEqual(await wakeCheck(built.bytes, { ...(await proof()), ledgers: committed }), { ok: true, why: "" });
  assert.deepEqual(await wakeCheck(built.bytes, { recoveryText: recText, ledgers: committed }), { ok: true, why: "" });
  assert.deepEqual(await wakeCheck(built.bytes, { recoveryText: recText.toLowerCase().replace(/-/g, " "), ledgers: committed }), { ok: true, why: "" });
  const golden = new Uint8Array(readFileSync(GOLDEN));
  assert.ok((await wakeCheck(golden, { ...(await proof()), ledgers: committed })).ok);
});

test("wakeCheck: a flipped body byte (hash) and a changed header character (signature) fail", async () => {
  const p = await proof();
  assert.equal((await wakeCheck(flip(built.bytes, lineStart(built.bytes, 3) + 100), { ...p, ledgers: committed })).why, "body-hash");
  const at = utf8(MAGIC + "\n").length + built.text.split("\n")[1].indexOf('"wid":"') + 10;
  assert.equal((await wakeCheck(flip(built.bytes, at), { ...p, ledgers: committed })).why, "signature");
});

test("wakeCheck: another key does not wake (the challenge signed by the wrong Companion)", async () => {
  const other = await generateKeyPair();
  assert.deepEqual(await wakeCheck(built.bytes, { ...(await proof(other.privateKey)), ledgers: committed }), { ok: false, why: "proof-signature" });
  const p = await proof();
  assert.equal((await wakeCheck(built.bytes, { challenge: challenge + "!", companionSig: p.companionSig, ledgers: committed })).why, "proof-signature");   // a stale answer to another challenge
});

test("wakeCheck: companion.pub swapped and the file re-signed by another key is a good file that no ledger knows", async () => {
  const thief = await generateKeyPair();
  const swapped = await forge({ header: { ...built.header, companion: { ...who, pub: thief.pub } }, body: body0(), key: thief.privateKey });
  assert.ok((await verifySleepFile(swapped)).ok);                                                                    // it verifies: signed is not encrypted
  assert.equal((await verifySleepFile(swapped, { pub: companion.pub })).why, "signature");                           // the Station that knows the real pub says no
  const r = await wakeCheck(swapped, { ...(await proof(thief.privateKey)), ledgers: committed });                   // the real file's hash is in the ledger, the copy's is not
  assert.deepEqual(r, { ok: false, why: "ledger-unknown" });
  assert.equal((await wakeCheck(swapped, { recoveryText: recText, ledgers: [] })).ok, true);                         // ...but the owner's recovery key, whose pub the copy still names, may
  const noRec = await forge({ header: { ...built.header, companion: { ...who, pub: thief.pub }, recovery: recovery && { ...recovery, pub: thief.pub } }, body: body0(), key: thief.privateKey });
  assert.equal((await wakeCheck(noRec, { recoveryText: recText, ledgers: [] })).why, "recovery-pub");                // a copy that puts its own recovery pub in does not take the owner's key
});

test("wakeCheck: kept but not committed, already woken, not in the ledger", async () => {
  const p = await proof();
  const kept = [[{ sha: built.sha, state: "kept" }]];
  assert.deepEqual(await wakeCheck(built.bytes, { ...p, ledgers: kept }), { ok: false, why: "ledger-kept" });
  assert.deepEqual(await wakeCheck(built.bytes, { recoveryText: recText, ledgers: kept }), { ok: false, why: "ledger-kept" });
  assert.deepEqual(await wakeCheck(built.bytes, { ...p, ledgers: [] }), { ok: false, why: "ledger-unknown" });
  assert.deepEqual(await wakeCheck(built.bytes, { ...p, ledgers: [[{ sha: "ab".repeat(32), state: "committed" }]] }), { ok: false, why: "ledger-unknown" });
  const woken = [[{ sha: built.sha, state: "committed" }, { sha: built.sha, state: "woken" }]];
  assert.deepEqual(await wakeCheck(built.bytes, { ...p, ledgers: woken }), { ok: false, why: "ledger-woken" });
  assert.deepEqual(await wakeCheck(built.bytes, { recoveryText: recText, ledgers: woken }), { ok: false, why: "ledger-woken" });
  assert.equal((await wakeCheck(built.bytes, { ...p, ledgers: [committed[0], [{ sha: built.sha, state: "woken" }]] })).why, "ledger-woken");   // woken in the other ledger
  assert.equal((await wakeCheck(built.bytes, { ...p, ledgers: [[{ sha: built.sha, state: "kept" }], committed[0]] })).ok, true);                 // committed in either one
});

test("wakeCheck: the recovery text with one mistyped character, a wrong key, or nothing at all", async () => {
  const at = 10, c = recText[at], typo = recText.slice(0, at) + (c === "7" ? "8" : "7") + recText.slice(at + 1);
  assert.deepEqual(await wakeCheck(built.bytes, { recoveryText: typo, ledgers: committed }), { ok: false, why: "recovery-check" });
  assert.equal((await wakeCheck(built.bytes, { recoveryText: recText.slice(0, -1), ledgers: committed })).why, "recovery-length");
  assert.equal((await wakeCheck(built.bytes, { recoveryText: "hello there", ledgers: committed })).ok, false);
  const otherText = await formatRecovery(Uint8Array.from({ length: 32 }, (_, i) => 255 - i));
  assert.deepEqual(await wakeCheck(built.bytes, { recoveryText: otherText, ledgers: committed }), { ok: false, why: "recovery-pub" });
  const none = await buildSleepFile({ ...opts, recovery: null }, companion.privateKey);
  assert.equal((await wakeCheck(none.bytes, { recoveryText: recText, ledgers: [[{ sha: none.sha, state: "committed" }]] })).why, "recovery-pub");
  assert.deepEqual(await wakeCheck(built.bytes, { ledgers: committed }), { ok: false, why: "no-proof" });
});

test("wakeCheck: a challenge that looks like a header is refused, and a proof must be whole", async () => {
  const bad = "MBR1\n" + parseSleepFile(built.bytes).headerLine;
  assert.equal((await wakeCheck(built.bytes, { ...(await proof(companion.privateKey, bad)), ledgers: committed })).why, "challenge");
  assert.equal((await wakeCheck(built.bytes, { companionSig: (await proof()).companionSig, ledgers: committed })).why, "challenge");
  assert.equal((await wakeCheck(built.bytes, { challenge, ledgers: committed })).why, "proof-signature");
  assert.equal((await wakeCheck(built.bytes, { challenge: utf8(challenge), companionSig: (await proof()).companionSig, ledgers: committed })).ok, true);
});

test("wakeCheck: a good proof does not rescue a bad file", async () => {
  const p = await proof(), lines = built.text.split("\n");
  const r = await wakeCheck(utf8([lines[0], lines[1], lines[2], lines[3] + " ", ""].join("\n")), { ...p, recoveryText: recText, ledgers: committed });
  assert.equal(r.ok, false);
});

test("ledgerState: committed sticks until woken, woken is final", () => {
  const L = (...s) => s.map((state) => ({ sha: "x", state }));
  assert.equal(ledgerState([L()], "x"), "unknown");
  assert.equal(ledgerState([], "x"), "unknown");
  assert.equal(ledgerState(undefined, "x"), "unknown");
  assert.equal(ledgerState([L("kept")], "x"), "kept");
  assert.equal(ledgerState([L("kept", "dropped")], "x"), "dropped");
  assert.equal(ledgerState([L("kept", "committed", "dropped")], "x"), "committed");
  assert.equal(ledgerState([L("kept", "committed", "woken", "committed")], "x"), "woken");
  assert.equal(ledgerState([[{ sha: "y", state: "woken" }]], "x"), "unknown");
  assert.equal(ledgerState([[null, { sha: "x", state: "kept" }]], "x"), "kept");
});

test("wake() is a hook that says so", () => {
  assert.throws(() => wake(), /waking is not built yet/);
});

test("the signature in the vectors still verifies the way the file signs", async () => {
  assert.ok(await verify(V.companion.pub, V.companion.signed, V.companion.sig));
  assert.equal(built.header.companion.pub, V.companion.pub);
  assert.equal(recovery.kid, V.recovery.kid); assert.equal(recovery.pub, V.recovery.pub); assert.equal(recText, V.recovery.text);
  assert.ok(await verify(companion.pub, "MBR1\n" + parseSleepFile(built.bytes).headerLine, parseSleepFile(built.bytes).sig));
  assert.equal(b64uEncode(b64uDecode(parseSleepFile(built.bytes).sig)), parseSleepFile(built.bytes).sig);
});
