// The Options defaults (src/options.mjs): a fresh store reads place: "", so the "One place everywhere" select shows its named empty value instead of a blank.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readOptions, writeOptions, OPTION_DEFAULTS, OPTIONS_KEY } from "../src/options.mjs";

const store = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };

test("a fresh store reads place: the empty string", () => {
  assert.equal(readOptions(store()).place, "");
  assert.equal(OPTION_DEFAULTS.place, "");
});

test("a store written before the default existed still reads it; a chosen place is kept", () => {
  const s = store(); s.setItem(OPTIONS_KEY, JSON.stringify({ playtest: true }));
  assert.equal(readOptions(s).place, ""); assert.equal(readOptions(s).playtest, true);
  assert.equal(writeOptions({ place: "Reedpool" }, s).place, "Reedpool"); assert.equal(readOptions(s).place, "Reedpool");
});
