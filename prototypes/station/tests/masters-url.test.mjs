// A master is fetched as <file>?v=<first 12 of its sha256>, and the Caddyfile keeps exactly those answers immutable (station-load plan T3).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { masterUrl } from "../src/masters.mjs";

test("masterUrl names the file and the start of its sha256", () => {
  const sha = "0944e0e5c4ce9a6a674522bdae67aee6347d9396fa9e5f246b4537cb1dc19d55";
  assert.equal(masterUrl(new URL("http://x/m/"), { file: "pods/a.png", sha256: sha }).href, "http://x/m/pods/a.png?v=0944e0e5c4ce");
  assert.equal(masterUrl(new URL("http://x/m/"), { file: "pods/a.png" }).href, "http://x/m/pods/a.png");
});

test("the Caddyfile serves a hashed master immutable and compresses with zstd", () => {
  const f = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../ops/sandbox/Caddyfile"), "utf8");
  assert.match(f, /@hashed \{[^}]*path \/sandbox\/ui\/assets\/masters\/\*[^}]*query v=\*[^}]*\}/);
  assert.match(f, /header @hashed Cache-Control "public, max-age=31536000, immutable"/);
  assert.match(f, /encode zstd gzip/);
});

test("the Caddyfile keeps the pages' hashed build files immutable and the pages themselves no-cache", () => {
  const f = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../ops/sandbox/Caddyfile"), "utf8");
  assert.match(f, /@bundled \{[^}]*path \/sandbox\/assets\/\*[^}]*\}/);
  assert.match(f, /header @bundled Cache-Control "public, max-age=31536000, immutable"/);
  assert.ok(f.indexOf(`header /sandbox/* Cache-Control "no-cache"`) < f.indexOf("header @bundled"), "the generic no-cache line comes first, the hashed one overrides it");
});
