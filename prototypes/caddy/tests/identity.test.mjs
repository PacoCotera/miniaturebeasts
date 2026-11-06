// The Caddy's identity and the recovery print: the first start queues one print; a restart before it is taken makes a new key; once it is taken identity.json holds only the public
// key and the key id, and no file in the data directory holds the seed in any spelling; the print is a 384-dot 1-bit picture that equals its golden.
// To renew the golden after a deliberate change:  MB_WRITE_GOLDEN=1 node --test prototypes/caddy/tests/identity.test.mjs
//   node --test prototypes/caddy/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "node:http";
import { createApp } from "../app.mjs";
import { recoveryPrint, drawPrint, WIDTH } from "../recovery-print.mjs";
import { decodePNG, parsePNG } from "../../ui/png.mjs";
import { formatRecovery, recoveryLines, parseRecovery, kid as kidOf, recoveryPub } from "../../play/src/realm/recovery.mjs";
import { b64uEncode } from "../../play/src/realm/b64.mjs";

const GOLDEN = new URL("../golden/recovery-print.png", import.meta.url);
const SEED = Uint8Array.from({ length: 32 }, (_, i) => (i * 7 + 3) & 255);   // a fixed test seed
const fresh = () => mkdtempSync(path.join(tmpdir(), "mb-caddy-id-"));
async function call(app, method, url, body) {
  const server = createServer((req, res) => app.handle(req, res)); await new Promise((r) => server.listen(0, "127.0.0.1", r));
  try {
    const r = await fetch(`http://127.0.0.1:${server.address().port}/caddy-api/v1${url}`, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const ct = r.headers.get("content-type") || "";
    return { status: r.status, headers: r.headers, body: ct.includes("json") ? await r.json() : Buffer.from(await r.arrayBuffer()) };
  } finally { server.close(); }
}
const filesOf = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? filesOf(path.join(dir, e.name)) : [path.join(dir, e.name)]));

test("the first start queues one print; the identity is not named until it is taken", async () => {
  const dir = fresh(), app = createApp({ dataDir: dir, recoverySeed: SEED });
  assert.ok(!existsSync(path.join(dir, "identity.json")), "nothing is written at start");
  const id0 = await call(app, "GET", "/identity");
  assert.equal(id0.status, 200); assert.equal(id0.body.recovery, null); assert.match(id0.body.caddy, /^k[0-9a-f]{16}$/);
  const pr = await call(app, "GET", "/print/pending");
  assert.equal(pr.status, 200); assert.equal(pr.headers.get("content-type"), "image/png"); assert.equal(pr.headers.get("x-print"), id0.body.caddy);
  const again = await call(app, "GET", "/print/pending");
  assert.deepEqual(again.body, pr.body, "the same print every time it is asked for: one print, not one for each look");
  assert.equal(app.status().identity, "print waiting");
  // the print carries the seed as the recovery text: what the owner would type reads back
  const px = decodePNG(pr.body); assert.equal(px.width, WIDTH);
  const ink = (x, y) => px.data[(y * px.width + x) * 4] === 0;
  assert.ok([...Array(px.height).keys()].some((y) => ink(30, y) || ink(60, y)), "it has ink");
  assert.ok(!existsSync(path.join(dir, "identity.json")), "looking at the print writes nothing");
  assert.equal((await call(app, "GET", "/print/pending")).status, 200, "still waiting after a look");
});

test("Taken writes the public key and the key id, then the print is gone and a second Taken changes nothing", async () => {
  const dir = fresh(), app = createApp({ dataDir: dir, recoverySeed: SEED, now: () => 1_700_000_000_000 });
  const caddy = (await call(app, "GET", "/identity")).body.caddy;
  assert.equal((await call(app, "POST", "/print/taken", { print: "k0000000000000000" })).status, 409, "a print that is not the one waiting is not taken");
  assert.ok(app.state.print, "and the print still waits");
  const t = await call(app, "POST", "/print/taken", { print: caddy });
  assert.equal(t.status, 200); assert.equal(t.body.changed, true);
  const pub = await recoveryPub(SEED), kid = await kidOf(pub);
  assert.deepEqual(t.body.recovery, { kid, pub });
  const file = JSON.parse(readFileSync(path.join(dir, "identity.json"), "utf8"));
  assert.deepEqual(Object.keys(file).sort(), ["caddy", "printedAt", "recovery", "v"]);
  assert.deepEqual(file, { v: 1, caddy, recovery: { kid, pub }, printedAt: 1_700_000_000_000 });
  assert.deepEqual(Object.keys(file.recovery).sort(), ["kid", "pub"], "only the public key and the key id");
  assert.equal((await call(app, "GET", "/print/pending")).status, 404, "the print is gone");
  assert.deepEqual((await call(app, "GET", "/identity")).body, { ok: true, caddy, recovery: { kid, pub } });
  const t2 = await call(app, "POST", "/print/taken", {}); assert.equal(t2.status, 200); assert.equal(t2.body.changed, false);
  assert.equal(app.status().identity, "printed");
  // a restart after Taken keeps the identity and queues no print
  const app2 = createApp({ dataDir: dir });
  assert.deepEqual((await call(app2, "GET", "/identity")).body, { ok: true, caddy, recovery: { kid, pub } });
  assert.equal((await call(app2, "GET", "/print/pending")).status, 404);
  assert.equal(app2.state.print, null);
});

test("a restart before Taken forgets the key and makes a new one; nothing was named on the card", async () => {
  const dir = fresh();
  const a = createApp({ dataDir: dir }), pa = await call(a, "GET", "/print/pending"), ia = (await call(a, "GET", "/identity")).body;
  const b = createApp({ dataDir: dir }), pb = await call(b, "GET", "/print/pending"), ib = (await call(b, "GET", "/identity")).body;
  assert.notDeepEqual(pa.body, pb.body, "another print");
  assert.notEqual(ia.caddy, ib.caddy, "another identity");
  assert.ok(!existsSync(path.join(dir, "identity.json")));
  // Taken for the first print's id does not take the second
  assert.equal((await call(b, "POST", "/print/taken", { print: ia.caddy })).status, 409);
  assert.equal((await call(b, "POST", "/print/taken", { print: ib.caddy })).status, 200);
  const c = createApp({ dataDir: dir });
  assert.equal(c.state.identity.recovery.pub, (await call(b, "GET", "/identity")).body.recovery.pub, "the key that was taken is the one the card names");
});

test("no file in the data directory holds the seed, before or after Taken, in any of its spellings", async () => {
  const dir = fresh(), app = createApp({ dataDir: dir, recoverySeed: SEED, painter: "mock", mockDelay: 0 });
  const text = await formatRecovery(SEED);
  const seed = Buffer.from(SEED), forms = [seed, Buffer.from(seed.toString("hex")), Buffer.from(seed.toString("base64")), Buffer.from(b64uEncode(SEED)), Buffer.from(text.slice(5).replaceAll("-", "")), Buffer.from(text), Buffer.from(seed.toString("hex").toUpperCase())];
  for (const l of await recoveryLines(SEED)) forms.push(Buffer.from(l.replace("MBRK ", "")));
  // other writes happen in the data directory meanwhile: a dock and a grown queue
  mkdirSync(path.join(dir, "dock"), { recursive: true });
  const scan = (when) => { const files = filesOf(dir); assert.ok(files.length > 0, when); for (const f of files) { const b = readFileSync(f); for (const [i, form] of forms.entries()) assert.ok(!b.includes(form), `${when}: ${path.relative(dir, f)} holds the seed (form ${i})`); } return files.map((f) => path.relative(dir, f)); };
  scan("before Taken");
  await call(app, "GET", "/print/pending");
  scan("after the print was drawn");
  const caddy = (await call(app, "GET", "/identity")).body.caddy;
  assert.equal((await call(app, "POST", "/print/taken", { print: caddy })).status, 200);
  const files = scan("after Taken");
  assert.ok(files.includes("identity.json"));
  assert.ok(!files.some((f) => f.endsWith(".tmp")), "no temporary copy is left");
  assert.ok(app.state.print === null, "the seed is dropped from memory's state");
  assert.ok(!Buffer.from(JSON.stringify(app.state, (k, v) => (v instanceof Uint8Array ? Array.from(v) : v))).includes(JSON.stringify(Array.from(SEED))), "and from the service's state");
  assert.ok(forms.length > 8);
});

test("an identity.json that cannot be read is left alone and nothing is queued over it", async () => {
  const dir = fresh(); writeFileSync(path.join(dir, "identity.json"), "{not json");
  const app = createApp({ dataDir: dir });
  assert.equal(app.state.print, null);
  const id = await call(app, "GET", "/identity"); assert.equal(id.body.recovery, null); assert.equal(id.body.fault, true);
  assert.equal((await call(app, "GET", "/print/pending")).status, 404);
  assert.equal((await call(app, "POST", "/print/taken", {})).status, 409);
  assert.equal(readFileSync(path.join(dir, "identity.json"), "utf8"), "{not json");
});

test("a write that fails leaves the print waiting", async () => {
  const dir = fresh(), app = createApp({ dataDir: dir, recoverySeed: SEED });
  mkdirSync(path.join(dir, "identity.json.tmp"));   // the temporary name is taken by a directory: the write cannot happen
  const t = await call(app, "POST", "/print/taken", {});
  assert.equal(t.status, 503); assert.ok(app.state.print, "the print waits"); assert.ok(!app.state.identity);
  assert.equal((await call(app, "GET", "/print/pending")).status, 200);
});

test("the print: 384 dots wide, 1 bit, the key's seven lines and the key id inside the margins, equal to the golden", async () => {
  const { png, kid, lines } = await recoveryPrint(SEED);
  const p = parsePNG(png);
  assert.deepEqual([p.width, p.depth, p.type], [384, 1, 3], "384 dots wide, a one-bit indexed picture");
  assert.ok(p.height >= 340 && p.height <= 400, "about 360 dots tall, here " + p.height);
  assert.deepEqual([...p.plte], [255, 255, 255, 0, 0, 0], "paper and ink only");
  assert.equal(lines.length, 7);
  assert.equal((await parseRecovery(lines.join(" "))).ok, true, "the lines read back as the key");
  const px = decodePNG(png);
  for (let i = 0; i < px.data.length; i += 4) assert.ok(px.data[i] === 0 || px.data[i] === 255, "ink or paper");
  for (let y = 0; y < px.height; y++) for (const x of [...Array(24).keys(), ...Array(24).keys()].map((v, i) => (i < 24 ? v : 360 + v))) assert.equal(px.data[(y * 384 + x) * 4], 255, `margin at ${x},${y}`);
  assert.throws(() => drawPrint({ lines: lines.slice(1), kid }), /seven lines/);
  assert.throws(() => drawPrint({ lines: [...lines.slice(1), "X".repeat(30)], kid }), /past its/);
  if (process.env.MB_WRITE_GOLDEN) { mkdirSync(path.dirname(GOLDEN.pathname), { recursive: true }); writeFileSync(GOLDEN, png); }
  assert.ok(Buffer.from(png).equals(readFileSync(GOLDEN)), "the print equals caddy/golden/recovery-print.png");
  assert.ok(statSync(GOLDEN).size < 6000);
  const again = await recoveryPrint(SEED); assert.ok(Buffer.from(again.png).equals(Buffer.from(png)), "the same seed draws the same bytes");
});
