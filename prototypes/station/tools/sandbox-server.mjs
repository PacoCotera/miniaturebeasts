// A static server for the Station's probes (load-budget.mjs, lazy-walk.mjs): prototypes/ as /sandbox/, the response headers of ops/sandbox/Caddyfile (its `header` lines are read from it, so the two cannot drift),
// gzip for text types when the Caddyfile encodes, ETag and 304. No Caddy service behind /caddy-api/ (the page copes). startSandbox() -> { server, url, close }.
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".css": "text/css", ".md": "text/markdown", ".wasm": "application/wasm" };
const GZ = new Set([".html", ".mjs", ".js", ".json", ".wasm", ".css"]);
const caddyfile = readFileSync(path.resolve(root, "../ops/sandbox/Caddyfile"), "utf8");
// `header <matcher> Field "value"` lines inside the file server's handle: <matcher> is a path (a trailing * is a prefix), or the name of a `@name { path ...; query k=v }` block; the last matching line wins, as in Caddy.
const matchers = {};
for (const m of caddyfile.matchAll(/^\s*@(\w+)\s*\{([^}]*)\}/gm)) matchers[m[1]] = { paths: [...m[2].matchAll(/^\s*path\s+(\S+)/gm)].map((x) => x[1]), queries: [...m[2].matchAll(/^\s*query\s+(\S+)/gm)].map((x) => x[1]) };
const inPath = (pat, p) => (pat.endsWith("*") ? p.startsWith(pat.slice(0, -1)) : p === pat);
const rules = [...caddyfile.matchAll(/^\s*header\s+(\S+)\s+\??([A-Za-z-]+)\s+"([^"]*)"/gm)].map((m) => ({ matcher: m[1], field: m[2].toLowerCase(), value: m[3] }));
const matches = (r, p, q) => {
  if (r.matcher.startsWith("/")) return inPath(r.matcher, p);
  const mm = matchers[r.matcher.replace(/^@/, "")]; if (!mm) return false;
  return mm.paths.some((x) => inPath(x, p)) && mm.queries.every((k) => { const [name, val] = k.split("="); return val === "*" ? new URLSearchParams(q).has(name) : new URLSearchParams(q).get(name) === val; });
};
const encodes = /^\s*encode\s+(.*)$/m.exec(caddyfile)?.[1].split(/\s+/) ?? [];

export async function startSandbox() {
  const gzCache = new Map();
  const server = createServer((req, res) => {
    const [rawPath, q = ""] = req.url.split("?"), urlPath = decodeURIComponent(rawPath);
    if (req.url.startsWith("/caddy-api/")) { res.writeHead(502); res.end(); return; }
    let p = path.join(root, urlPath.replace(/^\/sandbox\//, "/"));
    if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
    if (!existsSync(p)) { res.writeHead(404); res.end("not found"); return; }
    const ext = path.extname(p), st = statSync(p), etag = `"${st.size.toString(16)}-${Math.floor(st.mtimeMs).toString(16)}"`;
    const headers = { "content-type": types[ext] ?? "application/octet-stream", etag, vary: "Accept-Encoding" };
    for (const r of rules) if (matches(r, urlPath, q)) headers[r.field] = r.value;
    if (req.headers["if-none-match"] === etag) { res.writeHead(304, headers); res.end(); return; }
    let body = readFileSync(p);
    if (encodes.length && GZ.has(ext) && /gzip/.test(req.headers["accept-encoding"] ?? "")) { if (!gzCache.has(p + etag)) gzCache.set(p + etag, gzipSync(body)); body = gzCache.get(p + etag); headers["content-encoding"] = "gzip"; }
    res.writeHead(200, headers); res.end(body);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { server, url: `http://127.0.0.1:${server.address().port}/sandbox/station/`, close: () => server.close() };
}
