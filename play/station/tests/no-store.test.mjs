// The page's fetches follow the server's cache headers: no fetch in station/src passes `no-store` but the Caddy service's (caddy.mjs: live state). Plan T-20261107-station-load, T2.
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const src = path.join(path.dirname(fileURLToPath(import.meta.url)), "../src");
const files = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(path.join(d, e.name)) : e.name.endsWith(".mjs") ? [path.join(d, e.name)] : []));

test("no page fetch in station/src passes no-store except caddy.mjs", () => {
  const bad = files(src).filter((f) => path.basename(f) !== "caddy.mjs" && /no-store/.test(readFileSync(f, "utf8")));
  assert.deepEqual(bad.map((f) => path.relative(src, f)), []);
});

test("the Caddy service's calls stay no-store", () => {
  assert.match(readFileSync(path.join(src, "caddy.mjs"), "utf8"), /cache: "no-store"/);
});
