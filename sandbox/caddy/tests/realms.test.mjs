// The Caddy's card for realms put to sleep (realms.mjs and its routes): a file is written beside and renamed, a bad one is 400 and nothing is written, a committed sleep is never
// dropped, a clear needs a committed sha, a restart keeps everything, the index is rebuilt from the files, and a list reads no file.
//   node --test prototypes/caddy/tests/realms.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import nodeFs, { mkdtempSync, readdirSync, readFileSync, writeFileSync, existsSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "node:http";
import { createApp } from "../app.mjs";
import { b64uDecode, hexDecode } from "../../play/src/realm/b64.mjs";
import { pairFromSeed } from "../../play/src/realm/keys.mjs";
import { buildSleepFile, fileHash, MAX_BYTES } from "../../play/src/realm/sleepfile.mjs";
import { migrate8 } from "../../exploration/src/regions.mjs";

const V = JSON.parse(readFileSync(new URL("../../play/src/realm/vectors.json", import.meta.url), "utf8"));
const v8 = JSON.parse(readFileSync(new URL("../../station/tests/fixtures/save-v8-played-g2.json", import.meta.url), "utf8"));
const companion = await pairFromSeed(hexDecode(V.companion.seed));
const who = { id: "cA", name: "Companion A", pub: companion.pub };
const fresh = () => mkdtempSync(path.join(tmpdir(), "mb-caddy-realms-"));

// A sleep file for realm `wid` at time `slept`, signed by the test Companion.
async function sleepFile(wid, slept, id = who) {
  const save = { ...migrate8(v8, { now: 1793664000000 }), wid };
  const caddy = { dock: { world: wid }, jobs: [], prints: [] };
  const f = await buildSleepFile({ save, caddy, companion: id, recovery: null, slept }, companion.privateKey);
  return { bytes: Buffer.from(f.bytes), sha: f.sha, sha8: f.sha8, wid, header: f.header };
}
const rootOf = (dir) => path.join(dir, "realms");
const filesOf = (dir) => (existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? filesOf(path.join(dir, e.name)) : [path.join(dir, e.name)])) : []);
async function call(app, method, url, body, raw) {
  const server = createServer((req, res) => app.handle(req, res)); await new Promise((r) => server.listen(0, "127.0.0.1", r));
  try {
    const r = await fetch(`http://127.0.0.1:${server.address().port}/caddy-api/v1${url}`, { method, headers: { "content-type": raw ? "application/octet-stream" : "application/json" }, body: raw ? raw : body ? JSON.stringify(body) : undefined });
    return { status: r.status, body: await r.json() };
  } finally { server.close(); }
}
const put = (app, f) => call(app, "PUT", "/realms/asleep/" + f.wid, null, f.bytes);
const list = (app, q = "") => call(app, "GET", "/realms/asleep" + q);

test("a sleep file is written beside and renamed, read back, and kept; the list names it with its header", async () => {
  const dir = fresh(), ops = [], real = nodeFs;
  const realmsFs = { ...real, writeFileSync: (f, d, o) => { ops.push(["write", path.basename(f)]); return real.writeFileSync(f, d, o); }, renameSync: (a, b) => { ops.push(["rename", path.basename(a), path.basename(b)]); return real.renameSync(a, b); } };
  const app = createApp({ dataDir: dir, realmsFs });
  const f = await sleepFile("wA", 1800000000000);
  const r = await put(app, f);
  assert.equal(r.status, 200); assert.equal(r.body.sha, f.sha); assert.equal(r.body.state, "kept");
  const name = `wA.${f.sha8}.mbr`, file = path.join(rootOf(dir), "asleep", name);
  assert.deepEqual(readFileSync(file), f.bytes, "the file as sent");
  assert.deepEqual(ops.find((o) => o[1] === name + ".tmp"), ["write", name + ".tmp"], "written beside under another name");
  assert.ok(ops.some((o) => o[0] === "rename" && o[1] === name + ".tmp" && o[2] === name), "then renamed over");
  assert.ok(!filesOf(dir).some((x) => x.endsWith(".tmp")), "no temporary file is left");
  const lines = readFileSync(path.join(rootOf(dir), "ledger.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.deepEqual(lines.map((l) => [l.sha, l.state, l.wid]), [[f.sha, "kept", "wA"]]);
  const l = await list(app);
  assert.equal(l.body.realms.length, 1); assert.equal(l.body.realms[0].sha, f.sha); assert.equal(l.body.realms[0].state, "kept"); assert.deepEqual(l.body.realms[0].header, f.header);
  assert.equal(l.body.asleep, 0, "kept is not yet asleep");
  assert.equal((await put(app, f)).body.changed, false, "the same file again changes nothing");
  assert.equal(readFileSync(path.join(rootOf(dir), "ledger.jsonl"), "utf8").trim().split("\n").length, 1, "and adds no line");
});

test("a bad signature is 400 and nothing is written; so is a file for another realm, a cut file and a file that is not one", async () => {
  const dir = fresh(), app = createApp({ dataDir: dir }), f = await sleepFile("wA", 1800000000000);
  const text = f.bytes.toString("utf8").split("\n"), sig = text[2];
  text[2] = (sig[0] === "A" ? "B" : "A") + sig.slice(1);   // one character of the signature changed
  const bad = Buffer.from(text.join("\n"));
  const r = await put(app, { wid: "wA", bytes: bad });
  assert.equal(r.status, 400); assert.equal(r.body.why, "signature");
  assert.equal((await put(app, { wid: "wB", bytes: f.bytes })).status, 400, "a good file offered for another realm");
  assert.equal((await put(app, { wid: "wA", bytes: f.bytes.subarray(0, f.bytes.length - 40) })).status, 400, "a cut file");
  assert.equal((await put(app, { wid: "wA", bytes: Buffer.from("not a file\n") })).status, 400);
  assert.equal((await put(app, { wid: "wA", bytes: Buffer.alloc(0) })).status, 400);
  assert.equal((await call(app, "PUT", "/realms/asleep/a.b", null, f.bytes)).status, 400, "a realm id with a dot");
  assert.deepEqual(filesOf(dir).filter((x) => x.startsWith(rootOf(dir))), [], "nothing under realms/: no file, no ledger, no index");
  assert.equal((await list(app)).body.realms.length, 0);
  const big = await call(app, "PUT", "/realms/asleep/wA", null, Buffer.alloc(MAX_BYTES + 1, 65));
  assert.equal(big.status, 413, "a file over 8 MB");
  assert.deepEqual(filesOf(rootOf(dir)), []);
});

test("a write that fails leaves nothing and changes nothing: 503", async () => {
  const dir = fresh(), real = nodeFs;
  let fail = true;
  const realmsFs = { ...real, renameSync: (a, b) => { if (fail && String(b).endsWith(".mbr")) throw new Error("disk full"); return real.renameSync(a, b); } };
  const app = createApp({ dataDir: dir, realmsFs }), f = await sleepFile("wA", 1800000000000);
  const r = await put(app, f); assert.equal(r.status, 503);
  assert.deepEqual(filesOf(rootOf(dir)), [], "no file, no tmp, no ledger line");
  assert.equal((await list(app)).body.realms.length, 0);
  fail = false;
  assert.equal((await put(app, f)).status, 200, "and the next try works");
});

test("DELETE rolls back a kept file and is refused once it is committed; commit is idempotent", async () => {
  const dir = fresh(), app = createApp({ dataDir: dir }), a = await sleepFile("wA", 1800000000000), b = await sleepFile("wB", 1800000100000);
  await put(app, a); await put(app, b);
  const del = await call(app, "DELETE", `/realms/asleep/wA?sha=${a.sha}`);
  assert.equal(del.status, 200); assert.equal(del.body.state, "dropped");
  assert.ok(!existsSync(path.join(rootOf(dir), "asleep", `wA.${a.sha8}.mbr`)), "the file is gone");
  assert.equal((await call(app, "DELETE", `/realms/asleep/wA?sha=${a.sha}`)).body.changed, false, "a repeat answers again, changes nothing");
  assert.equal((await call(app, "DELETE", `/realms/asleep/wA?sha=${"0".repeat(64)}`)).status, 404, "a sha never heard of");
  assert.equal((await call(app, "DELETE", `/realms/asleep/wA?sha=nope`)).status, 400);
  assert.equal((await call(app, "DELETE", `/realms/asleep/wB?sha=${a.sha}`)).status, 404, "a sha under another realm");
  const c1 = await call(app, "POST", "/realms/commit", { wid: "wB", sha: b.sha });
  assert.deepEqual([c1.status, c1.body.changed, c1.body.state], [200, true, "committed"]);
  const c2 = await call(app, "POST", "/realms/commit", { wid: "wB", sha: b.sha });
  assert.deepEqual([c2.status, c2.body.changed], [200, false], "idempotent");
  assert.equal(readFileSync(path.join(rootOf(dir), "ledger.jsonl"), "utf8").trim().split("\n").filter((l) => JSON.parse(l).state === "committed").length, 1, "one committed line");
  const del2 = await call(app, "DELETE", `/realms/asleep/wB?sha=${b.sha}`);
  assert.equal(del2.status, 409, "refused once committed");
  assert.ok(existsSync(path.join(rootOf(dir), "asleep", `wB.${b.sha8}.mbr`)), "the file stays");
  assert.equal((await call(app, "POST", "/realms/commit", { wid: "wA", sha: a.sha })).status, 404, "a dropped file cannot be committed");
  assert.equal((await call(app, "POST", "/realms/commit", { wid: "wB" })).status, 400);
  assert.equal((await list(app)).body.asleep, 1);
});

test("clear is refused without a committed sha; with one it drops the dock record and the jobs, once, and the count and the face follow", async () => {
  const dir = fresh(), app = createApp({ dataDir: dir }), f = await sleepFile("wA", 1800000000000);
  assert.equal(app.dock.seat("wA", "station", true).ok, true); assert.equal(app.dock.seat("wB", "station", true).ok, true);
  app.state.jobs.push({ id: "j1", world: "wA", species: "S01", sha: "x".repeat(8), state: "queued", tries: 0, nextAt: 0, createdAt: 1 }, { id: "j2", world: "wB", species: "S01", sha: "y".repeat(8), state: "queued", tries: 0, nextAt: 0, createdAt: 1 });
  const rec = await call(app, "GET", "/realm?world=wA");
  assert.equal(rec.status, 200); assert.equal(rec.body.caddy.dock.world, "wA"); assert.deepEqual(rec.body.caddy.jobs.map((j) => j.id), ["j1"]); assert.deepEqual(rec.body.caddy.prints, []);
  assert.equal((await call(app, "GET", "/realm")).status, 400);
  assert.equal((await call(app, "GET", "/realm?world=nobody")).body.caddy.dock, null, "a world never seen");
  const dockFile = path.join(dir, "dock", "wA.json");
  assert.ok(existsSync(dockFile));
  assert.equal((await call(app, "POST", "/realm/clear", { wid: "wA", sha: f.sha })).status, 409, "a file nobody has heard of");
  await put(app, f);
  assert.equal((await call(app, "POST", "/realm/clear", { wid: "wA", sha: f.sha })).status, 409, "kept is not committed");
  assert.equal((await call(app, "POST", "/realm/clear", { wid: "wA" })).status, 400);
  await call(app, "POST", "/realms/commit", { wid: "wA", sha: f.sha });
  assert.equal((await call(app, "POST", "/realm/clear", { wid: "wB", sha: f.sha })).status, 409, "committed for another realm is not committed for this one");
  assert.ok(existsSync(dockFile) && app.state.jobs.length === 2, "nothing was cleared by the refusals");
  const ok = await call(app, "POST", "/realm/clear", { wid: "wA", sha: f.sha });
  assert.deepEqual([ok.status, ok.body.changed, ok.body.asleep], [200, true, 1]);
  assert.ok(!existsSync(dockFile), "the dock record is gone");
  assert.deepEqual(app.state.jobs.map((j) => j.id), ["j2"], "the world's jobs are cancelled, another world's are not");
  assert.deepEqual(JSON.parse(readFileSync(path.join(dir, "queue.json"), "utf8")).jobs.map((j) => j.id), ["j2"], "and the journal agrees");
  assert.ok(existsSync(path.join(dir, "dock", "wB.json")));
  const again = await call(app, "POST", "/realm/clear", { wid: "wA", sha: f.sha });
  assert.deepEqual([again.status, again.body.changed], [200, false], "idempotent");
  const l = await list(app); assert.equal(l.body.asleep, 1); assert.equal(l.body.face.wid, "wA"); assert.equal(l.body.face.sha, f.sha);
  assert.equal(app.status().realms.asleep, 1);
  assert.equal((await call(app, "GET", "/status")).body.realms.asleep, 1);
});

test("a restart keeps everything: the files, the ledger, the committed state, the count", async () => {
  const dir = fresh(), a = await sleepFile("wA", 1800000000000), b = await sleepFile("wA", 1800000500000), c = await sleepFile("wC", 1800000200000, { id: "cB", name: "B", pub: who.pub });
  let app = createApp({ dataDir: dir });
  for (const f of [a, b, c]) await put(app, f);
  await call(app, "POST", "/realms/commit", { wid: "wA", sha: b.sha });
  await call(app, "DELETE", `/realms/asleep/wA?sha=${a.sha}`);
  await call(app, "POST", "/realm/clear", { wid: "wA", sha: b.sha });
  const before = await list(app), ledgerBefore = app.realms.ledger();
  app.stop();
  app = createApp({ dataDir: dir });
  const after = await list(app);
  assert.deepEqual(after.body, before.body);
  assert.deepEqual(after.body.realms.map((r) => [r.sha, r.state]), [[b.sha, "committed"], [c.sha, "kept"]], "newest first");
  assert.deepEqual(app.realms.ledger(), ledgerBefore);
  assert.equal((await list(app, "?companion=cB")).body.realms.length, 1, "filtered to one Companion");
  assert.equal((await call(app, "DELETE", `/realms/asleep/wA?sha=${b.sha}`)).status, 409, "still committed");
  assert.equal((await call(app, "POST", "/realm/clear", { wid: "wA", sha: b.sha })).body.changed, false);
});

test("the index is rebuilt from the files when it is missing, damaged or out of step; a crashed write is mended", async () => {
  const dir = fresh(), a = await sleepFile("wA", 1800000000000), b = await sleepFile("wB", 1800000100000);
  let app = createApp({ dataDir: dir });
  await put(app, a); await put(app, b); await call(app, "POST", "/realms/commit", { wid: "wB", sha: b.sha });
  const want = (await list(app)).body, indexFile = path.join(rootOf(dir), "index.json");
  assert.ok(existsSync(indexFile)); assert.deepEqual(JSON.parse(readFileSync(indexFile, "utf8")).entries.map((e) => e.sha).sort(), [a.sha, b.sha].sort());
  rmSync(indexFile);
  app = createApp({ dataDir: dir });
  assert.deepEqual((await list(app)).body, want, "missing");
  assert.ok(existsSync(indexFile), "and written again");
  writeFileSync(indexFile, "{ not json");
  assert.deepEqual((await list(createApp({ dataDir: dir }))).body, want, "damaged");
  const idx = JSON.parse(readFileSync(indexFile, "utf8")); idx.entries.pop(); writeFileSync(indexFile, JSON.stringify(idx));
  assert.deepEqual((await list(createApp({ dataDir: dir }))).body, want, "out of step with the files");
  // a crash after the rename and before the ledger line, a torn ledger line, a leftover temporary file, a file that is not a sleep file
  const c = await sleepFile("wC", 1800000300000);
  writeFileSync(path.join(rootOf(dir), "asleep", `wC.${c.sha8}.mbr`), c.bytes);
  writeFileSync(path.join(rootOf(dir), "asleep", "wD.00000000.mbr.tmp"), "half");
  writeFileSync(path.join(rootOf(dir), "asleep", "wE.12345678.mbr"), "junk");
  nodeFs.appendFileSync(path.join(rootOf(dir), "ledger.jsonl"), '{"sha":"torn');
  app = createApp({ dataDir: dir });
  const got = (await list(app)).body;
  assert.deepEqual(got.realms.map((r) => [r.wid, r.state]), [["wC", "kept"], ["wB", "committed"], ["wA", "kept"]], "the written file is kept; the junk is not listed");
  assert.deepEqual(app.realms.bad(), ["wE.12345678.mbr"]); assert.ok(existsSync(path.join(rootOf(dir), "asleep", "wE.12345678.mbr")), "and is left where it is");
  assert.ok(!existsSync(path.join(rootOf(dir), "asleep", "wD.00000000.mbr.tmp")), "the leftover is removed");
  assert.equal((await list(createApp({ dataDir: dir }))).body.realms.length, 3, "the mended card reads the same again");
  assert.equal((await put(app, { wid: "wD", bytes: (await sleepFile("wD", 1800000400000)).bytes })).status, 200, "and takes the next write");
});

test("a list reads no file: not at the first look, not after a restart, not after a rebuild", async () => {
  const dir = fresh(), real = nodeFs, reads = [];
  const note = (f) => { if (String(f).endsWith(".mbr")) reads.push(path.basename(String(f))); };
  const realmsFs = { ...real,
    readFileSync: (f, o) => { note(f); return real.readFileSync(f, o); },
    openSync: (f, ...a) => { note(f); return real.openSync(f, ...a); },
    createReadStream: (f, ...a) => { note(f); return real.createReadStream(f, ...a); } };
  const files = [await sleepFile("wA", 1800000000000), await sleepFile("wB", 1800000100000), await sleepFile("wC", 1800000200000)];
  let app = createApp({ dataDir: dir, realmsFs });
  for (const f of files) await put(app, f);
  reads.length = 0;
  for (let i = 0; i < 3; i++) { const l = await list(app); assert.equal(l.body.realms.length, 3); }
  await list(app, "?companion=cA"); await call(app, "GET", "/status");
  assert.deepEqual(reads, [], "a list opens no sleep file");
  app = createApp({ dataDir: dir, realmsFs }); await list(app); reads.length = 0;   // a restart with the index in place
  await list(app); await list(app);
  assert.deepEqual(reads, [], "after a restart");
  rmSync(path.join(rootOf(dir), "index.json"));
  app = createApp({ dataDir: dir, realmsFs }); await list(app);
  assert.ok(reads.length >= 3, "a rebuild is what reads the files");
  reads.length = 0; await list(app); await list(app);
  assert.deepEqual(reads, [], "and the list after it reads none");
});

test("a file's own bytes are its name: the sha in the answer is the hash of the file, and a re-sleep of one realm keeps both files", async () => {
  const dir = fresh(), app = createApp({ dataDir: dir }), a = await sleepFile("wA", 1800000000000), b = await sleepFile("wA", 1800900000000);
  assert.notEqual(a.sha, b.sha);
  const r = await put(app, a); assert.equal(r.body.sha, await fileHash(a.bytes));
  await put(app, b);
  assert.deepEqual(readdirSync(path.join(rootOf(dir), "asleep")).sort(), [`wA.${a.sha8}.mbr`, `wA.${b.sha8}.mbr`].sort());
  assert.deepEqual((await list(app)).body.realms.map((x) => x.sha), [b.sha, a.sha], "newest first by the time it slept");
  assert.equal(b64uDecode(b.bytes.toString("utf8").split("\n")[2]).length, 64);
});
