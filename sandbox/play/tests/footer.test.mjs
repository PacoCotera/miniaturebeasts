// The build footer's text (src/footer.mjs): build.json's UTC time in Mexico City time, the "local" case, the parts left out.
import { test } from "node:test";
import assert from "node:assert/strict";
import { footerText, footerParts } from "../src/footer.mjs";

const B = { commit: "a9d087f9aa", short: "a9d087f", built: "2026-10-24T23:59:00Z" };

test("the full line: hash, Mexico City time as dd/mm HH:MM, save version, Caddy", () => {
  assert.equal(footerText({ build: B, schema: 3, caddy: true }), "© 2026 Dirty Pawz Press · a9d087f · 24/10 17:59 · save v3 · Caddy online");
  assert.equal(footerText({ build: B, schema: 8, caddy: false }), "© 2026 Dirty Pawz Press · a9d087f · 24/10 17:59 · save v8 · Caddy offline");
});

test("UTC to Mexico City: across midnight, the year and a 24-hour clock, whatever the viewer's zone", () => {
  assert.equal(footerText({ build: { short: "abc1234", built: "2026-07-15T03:05:00Z" } }), "© 2026 Dirty Pawz Press · abc1234 · 14/07 21:05");
  assert.equal(footerText({ build: { short: "abc1234", built: "2027-01-01T05:30:00Z" } }), "© 2026 Dirty Pawz Press · abc1234 · 31/12 23:30");
  assert.equal(footerText({ build: { short: "abc1234", built: "2026-12-01T06:00:00Z" } }), "© 2026 Dirty Pawz Press · abc1234 · 01/12 00:00");
});

test("the short hash comes from the commit when build.json has none", () => {
  assert.equal(footerText({ build: { commit: "a9d087f9aa1234", built: "2026-10-24T23:59:00Z" } }), "© 2026 Dirty Pawz Press · a9d087f · 24/10 17:59");
});

test("local when there is no build.json; a build with no readable time keeps the hash only", () => {
  assert.equal(footerText({}), "© 2026 Dirty Pawz Press · local");
  assert.equal(footerText({ build: null, schema: 3, caddy: true }), "© 2026 Dirty Pawz Press · local · save v3 · Caddy online");
  assert.equal(footerText({ build: {} }), "© 2026 Dirty Pawz Press · local");
  assert.equal(footerText({ build: { short: "a9d087f" } }), "© 2026 Dirty Pawz Press · a9d087f");
  assert.equal(footerText({ build: { short: "a9d087f", built: "not a time" } }), "© 2026 Dirty Pawz Press · a9d087f");
});

test("parts left out: no save version on the website, no Caddy while it is not known", () => {
  assert.equal(footerText({ build: B }), "© 2026 Dirty Pawz Press · a9d087f · 24/10 17:59");
  assert.equal(footerText({ build: B, schema: 3, caddy: null }), "© 2026 Dirty Pawz Press · a9d087f · 24/10 17:59 · save v3");
  assert.equal(footerText({ build: B, caddy: true }), "© 2026 Dirty Pawz Press · a9d087f · 24/10 17:59 · Caddy online");
});

test("the compact form (phones): hash, time, Caddy; no copyright and no save version; the parts one by one", () => {
  assert.equal(footerText({ build: B, schema: 3, caddy: true, compact: true }), "a9d087f · 24/10 17:59 · Caddy online");
  assert.deepEqual(footerParts({ build: B, schema: 8, caddy: false, compact: true }), ["a9d087f", "24/10 17:59", "Caddy offline"]);
  assert.equal(footerText({ compact: true }), "local");
});
