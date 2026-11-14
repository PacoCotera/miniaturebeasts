// Play notes. A note is a multipart post from the play page: an optional line, the
// context the page sends along (build, world, place, light ...), a source ("owner" or a tester's persona), up to 8 shots
// (PNG/JPEG/WebP) and 2 clips (MP4/WebM). Stored append only on the service's card as notes/<date>/<id>/note.json,
// shot-N.<ext>, clip-N.<ext>; a note is written whole into a hidden folder and renamed into place, never changed after.
// The public route only accepts: nothing is read back from it. Reading (the studio page and its files) is served from
// /studio/notes only, never under the public prefix, and only with the studio login's X-Studio-User header (the web server
// strips it from the browser and sets it from the login check). No IP, user agent, file name or cookie is kept.
// The multipart body is parsed by the platform's own Request.formData(); no library to install on the web machine.
import { mkdirSync, writeFileSync, readdirSync, readFileSync, renameSync, existsSync, statSync, createReadStream, rmSync } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";

export const LIMITS = { bodyBytes: 20 * 1024 * 1024, shots: 8, clips: 2, textChars: 4000, contextBytes: 16 * 1024, perDayNotes: 200, perDayBytes: 600 * 1024 * 1024 };
const SHOT_TYPES = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const CLIP_TYPES = { "video/mp4": "mp4", "video/webm": "webm" };
const SOURCE_RE = /^[A-Za-z0-9][A-Za-z0-9 _-]{0,31}$/;
// the first bytes must agree with the declared type: a page cannot park something else under a picture's name
const MAGIC = {
  png: (b) => b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  jpg: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  webp: (b) => b.length > 12 && b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP",
  mp4: (b) => b.length > 12 && b.subarray(4, 8).toString("latin1") === "ftyp",
  webm: (b) => b.length > 4 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3,
};
const MIME = { png: "image/png", jpg: "image/jpeg", webp: "image/webp", mp4: "video/mp4", webm: "video/webm" };
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/, ID_RE = /^[0-9a-z]{6,24}$/, FILE_RE = /^(shot|clip)-\d{1,2}\.(png|jpg|webp|mp4|webm)$/;
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function readLimited(req, max) {
  return new Promise((resolve, reject) => {
    const parts = []; let n = 0;
    req.on("data", (b) => { n += b.length; if (n <= max) parts.push(b); });   // a body over the limit is read and thrown away, so the answer reaches the sender
    req.on("end", () => (n > max ? reject(Object.assign(new Error("too large"), { tooLarge: true })) : resolve(Buffer.concat(parts))));
    req.on("error", reject);
  });
}

export function createNotes({ dataDir, now = Date.now, limits = {} }) {
  const L = { ...LIMITS, ...limits }, root = path.join(dataDir, "notes");
  mkdirSync(root, { recursive: true });
  const day = (t = now()) => new Date(t).toISOString().slice(0, 10);
  const noteDirs = (date) => { const d = path.join(root, date); return existsSync(d) ? readdirSync(d).filter((n) => ID_RE.test(n)) : []; };
  const dayUse = (date) => { let bytes = 0; const ids = noteDirs(date); for (const id of ids) for (const f of readdirSync(path.join(root, date, id))) bytes += statSync(path.join(root, date, id, f)).size; return { count: ids.length, bytes }; };

  // POST: [status, body]. Nothing is written unless the whole note is good.
  async function post(req) {
    const type = String(req.headers["content-type"] || "");
    if (!/^multipart\/form-data;\s*boundary=/i.test(type)) return [415, { ok: false, error: "a note is multipart form data" }];
    const declared = +req.headers["content-length"];
    if (declared > L.bodyBytes) { req.resume(); return [413, { ok: false, error: "the note is over 20 MB" }]; }
    let bytes; try { bytes = await readLimited(req, L.bodyBytes); } catch (e) { return e.tooLarge ? [413, { ok: false, error: "the note is over 20 MB" }] : [400, { ok: false, error: "the note could not be read" }]; }
    let form; try { form = await new Request("http://x/", { method: "POST", headers: { "content-type": type }, body: bytes }).formData(); } catch { return [400, { ok: false, error: "the note is not well-formed" }]; }
    const text = form.get("text") ?? "", source = form.get("source") ?? "owner", ctxRaw = form.get("context") ?? "{}";
    if (typeof text !== "string" || text.length > L.textChars) return [400, { ok: false, error: "the line is over 4000 characters" }];
    if (typeof source !== "string" || !SOURCE_RE.test(source)) return [400, { ok: false, error: "the source is a short plain name" }];
    if (typeof ctxRaw !== "string" || Buffer.byteLength(ctxRaw) > L.contextBytes) return [400, { ok: false, error: "the context is over 16 KB" }];
    let context; try { context = JSON.parse(ctxRaw); } catch { return [400, { ok: false, error: "the context is not JSON" }]; }
    if (!context || typeof context !== "object" || Array.isArray(context)) return [400, { ok: false, error: "the context is an object" }];
    const files = []; let shots = 0, clips = 0;
    for (const [name, v] of form.entries()) {
      if (typeof v === "string") { if (!["text", "source", "context"].includes(name)) return [400, { ok: false, error: "an unknown field: " + name.slice(0, 20) }]; continue; }
      const buf = Buffer.from(await v.arrayBuffer());
      if (name === "shot") { const ext = SHOT_TYPES[v.type]; if (!ext) return [415, { ok: false, error: "a shot is a PNG, JPEG or WebP picture" }]; if (!MAGIC[ext](buf)) return [415, { ok: false, error: "a shot is not the picture it says" }]; if (++shots > L.shots) return [413, { ok: false, error: "at most 8 pictures" }]; files.push({ name: `shot-${shots}.${ext}`, buf }); }
      else if (name === "clip") { const ext = CLIP_TYPES[v.type]; if (!ext) return [415, { ok: false, error: "a clip is an MP4 or WebM video" }]; if (!MAGIC[ext](buf)) return [415, { ok: false, error: "a clip is not the video it says" }]; if (++clips > L.clips) return [413, { ok: false, error: "at most 2 clips" }]; files.push({ name: `clip-${clips}.${ext}`, buf }); }
      else return [400, { ok: false, error: "an unknown part: " + name.slice(0, 20) }];
    }
    if (!text.trim() && !files.length) return [400, { ok: false, error: "an empty note" }];
    const t = now(), date = day(t), use = dayUse(date), add = files.reduce((n, f) => n + f.buf.length, 0);
    if (use.count >= L.perDayNotes || use.bytes + add > L.perDayBytes) return [429, { ok: false, error: "the day's limit for notes is reached" }];
    const id = t.toString(36) + randomBytes(3).toString("hex"), dayDir = path.join(root, date), tmp = path.join(dayDir, "." + id);
    mkdirSync(tmp, { recursive: true });
    try {
      for (const f of files) writeFileSync(path.join(tmp, f.name), f.buf, { flag: "wx" });
      writeFileSync(path.join(tmp, "note.json"), JSON.stringify({ schema: "mb-note/1", id, receivedAt: t, source, text, context, files: files.map((f) => f.name) }, null, 1) + "\n", { flag: "wx" });
      renameSync(tmp, path.join(dayDir, id));
    } catch (e) { rmSync(tmp, { recursive: true, force: true }); return [503, { ok: false, error: "the note could not be stored" }]; }
    return [201, { ok: true, id }];
  }

  // reading: newest first, optionally one source
  function list(from) {
    const out = [];
    for (const date of existsSync(root) ? readdirSync(root).filter((d) => DATE_RE.test(d)).sort().reverse() : []) {
      for (const id of noteDirs(date).sort().reverse()) {
        try { const n = JSON.parse(readFileSync(path.join(root, date, id, "note.json"), "utf8")); if (!from || n.source === from) out.push({ ...n, date }); } catch { /* a damaged note is skipped */ }
      }
    }
    return out.sort((a, b) => b.receivedAt - a.receivedAt);
  }
  const sources = () => [...new Set(list().map((n) => n.source))].sort();
  const fileOf = (date, id, name) => (DATE_RE.test(date) && ID_RE.test(id) && FILE_RE.test(name) ? path.join(root, date, id, name) : null);

  const when = (t) => new Date(t).toLocaleString("sv-SE", { timeZone: "America/Mexico_City" }).slice(0, 16);
  function page(from) {
    const notes = list(from), srcs = sources();
    const ctxLine = (c) => ["build", "place", "world", "turn", "light"].map((k) => (c[k] != null ? `${k} ${typeof c[k] === "object" ? JSON.stringify(c[k]) : c[k]}` : "")).filter(Boolean).join(" · ");
    const card = (n) => `<article><h2>From: ${esc(n.source)} · ${esc(when(n.receivedAt))}</h2>${n.text ? `<p class="line">${esc(n.text)}</p>` : ""}<p class="ctx">${esc(ctxLine(n.context || {}))}</p>`
      + `<div class="media">${(n.files || []).filter((f) => FILE_RE.test(f)).map((f) => { const u = `/studio/notes/f/${n.date}/${n.id}/${f}`; return f.startsWith("clip") ? `<video controls preload="metadata" src="${u}"></video>` : `<a href="${u}"><img loading="lazy" src="${u}" alt=""></a>`; }).join("")}</div>`
      + `<details><summary>Sent with it</summary><pre>${esc(JSON.stringify(n.context || {}, null, 1))}</pre></details></article>`;
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Play notes</title>`
      + `<style>body{font:16px/1.4 system-ui,sans-serif;margin:0;padding:16px;max-width:900px;margin:auto;background:#fafafa;color:#222}form{margin:0 0 16px}select,button{font:inherit;padding:6px}article{background:#fff;border:1px solid #ddd;border-radius:8px;padding:12px 16px;margin:0 0 14px}h2{font-size:1rem;margin:0 0 6px}.line{white-space:pre-wrap;margin:6px 0}.ctx{color:#666;font-size:.85rem;margin:4px 0}.media{display:flex;flex-wrap:wrap;gap:8px}.media img,.media video{max-width:260px;max-height:200px;border:1px solid #ccc;image-rendering:pixelated}pre{overflow:auto;font-size:.8rem}</style></head><body>`
      + `<h1>Play notes</h1><form method="get" action="/studio/notes"><label>Source <select name="from"><option value="">All</option>${srcs.map((s) => `<option${s === from ? " selected" : ""}>${esc(s)}</option>`).join("")}</select></label> <button>Show</button> <span>${notes.length} notes</span></form>`
      + (notes.map(card).join("") || "<p>No notes yet.</p>") + `</body></html>`;
  }
  return { post, list, sources, page, fileOf, limits: L };
}

// serve one stored file with Range (a phone's video player asks for ranges)
export function sendFile(req, res, file) {
  if (!file || !existsSync(file)) { res.writeHead(404, { "content-type": "text/plain" }); res.end("no such file"); return; }
  const size = statSync(file).size, mime = MIME[path.extname(file).slice(1)] || "application/octet-stream";
  const h = { "content-type": mime, "cache-control": "private, no-store", "x-content-type-options": "nosniff", "accept-ranges": "bytes" };
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
  if (m && (m[1] || m[2])) {
    let a = m[1] === "" ? Math.max(0, size - +m[2]) : +m[1], b = m[1] === "" || m[2] === "" ? size - 1 : Math.min(+m[2], size - 1);
    if (a > b || a >= size) { res.writeHead(416, { "content-range": `bytes */${size}` }); res.end(); return; }
    res.writeHead(206, { ...h, "content-range": `bytes ${a}-${b}/${size}`, "content-length": b - a + 1 }); createReadStream(file, { start: a, end: b }).pipe(res); return;
  }
  res.writeHead(200, { ...h, "content-length": size }); createReadStream(file).pipe(res);
}
