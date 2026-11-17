// The build footer's text (src/footer.mjs): build.json's UTC time in Mexico City time, the "local" case, the parts left out.
import { test } from "node:test";
import assert from "node:assert/strict";
import { footerText, footerParts, noticeText, mountNotice } from "../src/footer.mjs";

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

// lock-playtest-world: the notice line. The slots are empty until the copywriter writes them; a broken page still shows the build number.
test("the notice line: empty slots say nothing, a page break still shows the build number; a slot may use the build as a function or as {build}", () => {
  const empty = { saveFailed: "", landChanged: "", pageBroke: () => "" };
  assert.equal(noticeText(empty, "saveFailed", B), "");
  assert.equal(noticeText(empty, "landChanged", B), "");
  assert.equal(noticeText(empty, "pageBroke", B), "a9d087f", "the build number alone");
  assert.equal(noticeText(empty, "pageBroke", null), "local");
  assert.equal(noticeText({ pageBroke: (b) => "x " + b }, "pageBroke", B), "x a9d087f");
  assert.equal(noticeText({ pageBroke: "x {build}" }, "pageBroke", B), "x a9d087f");
  assert.equal(noticeText({}, "saveFailed", B), "", "a words file without the slot");
});

test("the notice line is hidden until a kind holds, shows the page break before the rest, and goes when the cause does", () => {
  const el = { hidden: true, dataset: {}, textContent: "" }, n = mountNotice(el, { saveFailed: "S", landChanged: "L", pageBroke: (b) => "B" + b }, {});
  assert.equal(el.hidden, true);
  n.set("saveFailed"); assert.deepEqual([el.hidden, el.dataset.slot, el.textContent], [false, "saveFailed", "S"]);
  n.set("landChanged"); assert.equal(el.dataset.slot, "saveFailed", "a save that cannot be written outranks a changed land");
  n.set("pageBroke"); assert.deepEqual([el.dataset.slot, el.textContent], ["pageBroke", "Blocal"]);
  n.set("pageBroke", false); n.set("saveFailed", false); assert.equal(el.dataset.slot, "landChanged");
  n.set("landChanged", false); assert.deepEqual([el.hidden, el.textContent], [true, ""]);
});
