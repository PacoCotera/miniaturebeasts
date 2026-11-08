// The cache headers of a deployed site (station-load plan T3). usage: node .github/smoke-headers.mjs [https://miniaturebeasts.com]
//   a hashed master (<file>?v=<sha12>) answers immutable with a year's max-age; the HTML answers no-cache;
//   JSON, mjs and wasm answer content-encoding zstd or gzip.
const base = (process.argv[2] ?? process.env.SMOKE_BASE ?? "http://127.0.0.1:8000").replace(/\/$/, "");
const problems = [];
const get = (p, enc = "zstd, gzip") => fetch(base + p, { headers: { "accept-encoding": enc } });
const masters = "/sandbox/ui/assets/masters/";
const index = await (await get(masters + "index.json")).json();
const [id, e] = Object.entries(index.masters).find(([, m]) => m.file.startsWith("pods/")) ?? Object.entries(index.masters)[0];
const hashed = await get(`${masters}${e.file}?v=${e.sha256.slice(0, 12)}`);
const cc = hashed.headers.get("cache-control") ?? "";
if (!/immutable/.test(cc) || !/max-age=31536000/.test(cc)) problems.push(`hashed master ${id}: Cache-Control is "${cc}", want public, max-age=31536000, immutable`);
const html = (await get("/sandbox/station/")).headers.get("cache-control") ?? "";
if (!/no-cache/.test(html)) problems.push(`station HTML: Cache-Control is "${html}", want no-cache`);
for (const p of [masters + "index.json", "/sandbox/station/src/core.mjs", "/sandbox/face/dist/face.wasm", "/sandbox/ui/specs/station/home.json"]) {
  const enc = (await get(p)).headers.get("content-encoding") ?? "";
  if (!/^(zstd|gzip|br)$/.test(enc)) problems.push(`${p}: content-encoding is "${enc}", want zstd or gzip`);
}
console.log(problems.length ? "header check FAILED:\n  " + problems.join("\n  ") : `header check ok (${base})`);
process.exit(problems.length ? 1 : 0);
