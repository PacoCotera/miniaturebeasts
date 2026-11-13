// Play notes on the Caddy service: accepts a note whole and stores it append only; refuses a wrong type, a picture that is
// not one, too many parts and an over-size body; keeps no address; and nothing can be read from the public route.
//   node --test prototypes/caddy/tests/notes.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "node:http";
import { createApp } from "../app.mjs";

const fresh = () => mkdtempSync(path.join(tmpdir(), "mb-notes-"));
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(40)]);
const MP4 = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from("ftypisom"), Buffer.alloc(30)]);
async function withServer(app, fn) {
  const server = createServer((req, res) => app.handle(req, res)); await new Promise((r) => server.listen(0, "127.0.0.1", r));
  try { return await fn(`http://127.0.0.1:${server.address().port}`); } finally { server.close(); }
}
function form({ text = "the fox ran through the wall", source, context = { build: "abc123", place: "cell 4,5" }, shots = [], clips = [], extra = {} } = {}) {
  const f = new FormData();
  if (text != null) f.set("text", text); if (source != null) f.set("source", source);
  f.set("context", typeof context === "string" ? context : JSON.stringify(context));
  for (const s of shots) f.append("shot", new Blob([s.buf ?? PNG], { type: s.type ?? "image/png" }), "whatever-name.png");
  for (const c of clips) f.append("clip", new Blob([c.buf ?? MP4], { type: c.type ?? "video/mp4" }), "c.mp4");
  for (const [k, v] of Object.entries(extra)) f.set(k, v);
  return f;
}
const post = (base, f, headers = {}) => fetch(base + "/caddy-api/v1/notes", { method: "POST", body: f, headers });
const noteDirs = (dir) => { const root = path.join(dir, "notes"); return readdirSync(root).flatMap((d) => readdirSync(path.join(root, d)).filter((n) => !n.startsWith(".")).map((id) => path.join(root, d, id))); };

test("accepts a note with shots and a clip and stores it append only, with the source and no address", async () => {
  const dir = fresh(), app = createApp({ dataDir: dir });
  await withServer(app, async (base) => {
    const r = await post(base, form({ source: "owner", shots: [{}, {}], clips: [{}] }), { "x-forwarded-for": "203.0.113.9", "user-agent": "SecretBrowser/1" });
    assert.equal(r.status, 201); const b = await r.json(); assert.equal(b.ok, true);
    const [d] = noteDirs(dir); assert.ok(d.endsWith(b.id));
    assert.deepEqual(readdirSync(d).sort(), ["clip-1.mp4", "note.json", "shot-1.png", "shot-2.png"]);
    const raw = readFileSync(path.join(d, "note.json"), "utf8"), n = JSON.parse(raw);
    assert.equal(n.source, "owner"); assert.equal(n.text, "the fox ran through the wall"); assert.equal(n.context.build, "abc123");
    assert.ok(!/203\.0\.113|SecretBrowser|whatever-name/.test(raw), "no address, user agent or file name is kept");
    const r2 = await post(base, form({ source: "tester-ana", text: "again" })); assert.equal(r2.status, 201);
    assert.equal(noteDirs(dir).length, 2, "a second note is a second folder; the first is untouched");
    assert.equal(JSON.parse(readFileSync(path.join(d, "note.json"), "utf8")).text, "the fox ran through the wall");
  });
});

test("the source defaults to owner and must be a short plain name", async () => {
  const dir = fresh(), app = createApp({ dataDir: dir });
  await withServer(app, async (base) => {
    assert.equal((await post(base, form())).status, 201);
    assert.equal(JSON.parse(readFileSync(path.join(noteDirs(dir)[0], "note.json"), "utf8")).source, "owner");
    assert.equal((await post(base, form({ source: "Ana <b>@home" }))).status, 400);
    assert.equal((await post(base, form({ source: "x".repeat(40) }))).status, 400);
  });
});

test("refuses the wrong types, a picture that is not one, too many parts, an empty note and a bad context", async () => {
  const dir = fresh(), app = createApp({ dataDir: dir });
  await withServer(app, async (base) => {
    assert.equal((await post(base, form({ shots: [{ type: "image/svg+xml" }] }))).status, 415);
    assert.equal((await post(base, form({ shots: [{ type: "application/pdf" }] }))).status, 415);
    assert.equal((await post(base, form({ shots: [{ buf: Buffer.from("<script>alert(1)</script>") }] }))).status, 415, "bytes must match the type");
    assert.equal((await post(base, form({ clips: [{ type: "video/quicktime" }] }))).status, 415);
    assert.equal((await post(base, form({ clips: [{ buf: PNG }] }))).status, 415);
    assert.equal((await post(base, form({ shots: Array(9).fill({}) }))).status, 413);
    assert.equal((await post(base, form({ clips: [{}, {}, {}] }))).status, 413);
    assert.equal((await post(base, form({ text: "", shots: [] }))).status, 400);
    assert.equal((await post(base, form({ text: "x".repeat(4001) }))).status, 400);
    assert.equal((await post(base, form({ context: "not json" }))).status, 400);
    assert.equal((await post(base, form({ context: [1] }))).status, 400);
    assert.equal((await post(base, form({ extra: { email: "a@b.c" } }))).status, 400, "no unknown fields, so no personal data fields");
    assert.equal((await post(base, new Blob(["{}"]), { "content-type": "application/json" })).status, 415);
    assert.equal(existsSync(path.join(dir, "notes")) && noteDirs(dir).length, 0, "nothing was stored by any refused note");
  });
});

test("refuses an over-size body and the day's ceiling", async () => {
  const dir = fresh(), app = createApp({ dataDir: dir, noteLimits: { bodyBytes: 1000, perDayNotes: 2 } });
  await withServer(app, async (base) => {
    const big = await post(base, form({ shots: [{ buf: Buffer.concat([PNG, Buffer.alloc(5000)]) }] })); assert.equal(big.status, 413);
    assert.equal((await post(base, form())).status, 201); assert.equal((await post(base, form())).status, 201);
    assert.equal((await post(base, form())).status, 429);
    assert.equal(noteDirs(dir).length, 2);
  });
});

test("never public: nothing is read from the public route, and the studio path needs the login's header", async () => {
  const dir = fresh(), app = createApp({ dataDir: dir });
  await withServer(app, async (base) => {
    const id = (await (await post(base, form({ shots: [{}], source: "owner" }))).json()).id;
    const date = readdirSync(path.join(dir, "notes"))[0];
    for (const p of ["/caddy-api/v1/notes", "/caddy-api/v1/notes/" + id, "/caddy-api/v1/studio/notes", `/caddy-api/v1/studio/notes/f/${date}/${id}/shot-1.png`, "/caddy-api/v1/notes?from=owner"]) {
      const r = await fetch(base + p); assert.ok([404, 405].includes(r.status), p + " gave " + r.status); const t = await r.text(); assert.ok(!t.includes("the fox") && !t.includes(id), p + " leaked");
    }
    assert.equal((await fetch(base + "/studio/notes")).status, 403, "no login header, no page");
    assert.equal((await fetch(base + `/studio/notes/f/${date}/${id}/shot-1.png`)).status, 403);
    assert.equal((await fetch(base + "/studio/notes", { method: "POST", headers: { "x-studio-user": "paco" } })).status, 405);
    const ok = await fetch(base + "/studio/notes", { headers: { "x-studio-user": "paco" } }); assert.equal(ok.status, 200);
    assert.match(ok.headers.get("cache-control"), /no-store/); assert.match(await ok.text(), /From: owner/);
  });
});

test("the studio page lists newest first, filters by source, escapes the line, and serves files (with ranges)", async () => {
  const dir = fresh(); let t = Date.UTC(2026, 10, 12, 20, 0, 0);
  const app = createApp({ dataDir: dir, now: () => (t += 60000) });
  await withServer(app, async (base) => {
    await post(base, form({ text: "first from the owner", source: "owner", shots: [{}] }));
    await post(base, form({ text: "<img src=x onerror=alert(1)>", source: "tester-ana", clips: [{}] }));
    const H = { "x-studio-user": "paco" }, all = await (await fetch(base + "/studio/notes", { headers: H })).text();
    assert.ok(all.indexOf("tester-ana") < all.indexOf("first from the owner"), "newest first");
    assert.ok(!all.includes("<img src=x onerror") && all.includes("&lt;img src=x"), "the line is escaped");
    assert.match(all, /<option>owner<\/option>/); assert.match(all, /2 notes/);
    const only = await (await fetch(base + "/studio/notes?from=owner", { headers: H })).text();
    assert.match(only, /first from the owner/); assert.ok(!only.includes("tester-ana</h2>")); assert.match(only, /1 notes/);
    const date = readdirSync(path.join(dir, "notes"))[0], clipDir = noteDirs(dir).find((d) => existsSync(path.join(d, "clip-1.mp4"))), id = path.basename(clipDir);
    const full = await fetch(base + `/studio/notes/f/${date}/${id}/clip-1.mp4`, { headers: H }); assert.equal(full.status, 200); assert.equal(full.headers.get("content-type"), "video/mp4"); assert.equal((await full.arrayBuffer()).byteLength, MP4.length);
    const part = await fetch(base + `/studio/notes/f/${date}/${id}/clip-1.mp4`, { headers: { ...H, range: "bytes=0-9" } }); assert.equal(part.status, 206); assert.equal((await part.arrayBuffer()).byteLength, 10);
    assert.equal((await fetch(base + `/studio/notes/f/${date}/${id}/note.json`, { headers: H })).status, 404, "only shots and clips are served");
    assert.equal((await fetch(base + `/studio/notes/f/${date}/..%2F${id}/clip-1.mp4`, { headers: H })).status, 404);
  });
});
