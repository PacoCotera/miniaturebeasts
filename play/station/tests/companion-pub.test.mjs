// The Companion's public key at the dock (companions.mjs): the Station keeps the first one it sees for a Companion (trust on first use); a different one for a known id is
// refused and logged, the stored key stays, and docking itself goes on. Through the Station's own game module too, as the dock message reaches it.
//   node --test prototypes/station/tests/companion-pub.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import * as C from "../src/companions.mjs";

const memStore = (init = {}) => { const m = new Map(Object.entries(init)); return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); } }; };
const PUB1 = "A".repeat(43), PUB2 = "B".repeat(43);
const who = (id, pub) => ({ id, name: "Companion A", pub });
const A = "caaaaaaaaaaaa", B = "cbbbbbbbbbbbb";

test("trust on first use: the first key seen is kept; the same key again changes nothing", () => {
  const st = memStore();
  assert.equal(C.trustedPub(st, A), null, "nothing is trusted before a dock");
  assert.equal(C.companionDocked(st, who(A, PUB1)).pub, "new");
  assert.equal(C.knownCompanion(st, A).pub, PUB1); assert.equal(C.trustedPub(st, A), PUB1);
  const before = st.getItem(C.MAP_KEY);
  assert.equal(C.companionDocked(st, who(A, PUB1)).pub, "same");
  assert.equal(st.getItem(C.MAP_KEY), before, "the same key again writes the same map");
});

test("a different key for a known id is refused and logged; the stored key stays; the dock itself goes on", () => {
  const st = memStore(); let now = 1000;
  C.companionDocked(st, who(A, PUB1), { now: () => now });
  C.companionDocked(st, who(B, PUB2), { now: () => now });   // another Companion docked last
  const warn = console.warn; const said = []; console.warn = (m) => said.push(m);
  let r; try { r = C.companionDocked(st, who(A, PUB2), { now: () => ++now }); } finally { console.warn = warn; }
  assert.equal(r.pub, "mismatch"); assert.equal(r.switched, true, "the Companion still docks and its world shows");
  assert.equal(C.activeId(st), A);
  const k = C.knownCompanion(st, A);
  assert.equal(k.pub, PUB1, "the first key stays"); assert.equal(k.pubMismatch, true);
  assert.equal(C.trustedPub(st, A), null, "a sleep stays dimmed: nothing is trusted while the last dock offered another key");
  assert.deepEqual(C.stationMap(st).pubLog, [{ id: A, pub: PUB2, at: 1001 }], "logged in the map");
  assert.equal(said.length, 1, "and said once");
  assert.equal(C.companionDocked(st, who(A, PUB1)).pub, "same"); assert.equal(C.trustedPub(st, A), PUB1, "the first key docks again: trusted again");
  assert.equal(C.knownCompanion(st, A).pubMismatch, undefined);
});

test("a dock with no key, or a malformed one, records nothing and refuses nothing; another Companion has its own key", () => {
  const st = memStore();
  assert.equal(C.companionDocked(st, who(A, undefined)).pub, "none"); assert.equal(C.knownCompanion(st, A).pub, undefined);
  for (const bad of [null, "", "short", "A".repeat(44), "A".repeat(42) + "+", 7, {}]) assert.equal(C.companionDocked(st, who(A, bad)).pub, "none", String(bad));
  assert.equal(C.knownCompanion(st, A).pub, undefined, "nothing malformed is kept");
  C.companionDocked(st, who(A, PUB1)); C.companionDocked(st, who(A, undefined));
  assert.equal(C.knownCompanion(st, A).pub, PUB1, "a dock without a key leaves the kept one");
  assert.equal(C.knownCompanion(st, A).pubMismatch, undefined);
  assert.equal(C.companionDocked(st, who(B, PUB1)).pub, "new", "the same key under another id is that Companion's first sight");
  assert.equal(C.companionDocked(st, { id: "nope", pub: PUB1 }).pub, "none", "a malformed id is ignored");
});

test("the Station's game module passes the key through the dock: first seen, then refused", async () => {
  const st = memStore(); globalThis.localStorage = st;
  const game = await import("../src/game.mjs");
  game.load();
  const b = C.companionOf(st, "B", { rand: Math.random });
  st.setItem(C.saveKeyOf(b.id), JSON.stringify({ v: 8, seed: 99, wid: "wB99", turn: 2, bay: [], mibis: [], cr: [], carried: [] }));
  assert.equal(game.switchCompanion({ id: b.id, name: b.name, pub: PUB1 }), true);
  assert.equal(C.trustedPub(st, b.id), PUB1);
  const warn = console.warn; console.warn = () => {};
  try { game.switchCompanion({ id: b.id, name: b.name, pub: PUB2 }); } finally { console.warn = warn; }
  assert.equal(C.knownCompanion(st, b.id).pub, PUB1); assert.equal(C.trustedPub(st, b.id), null);
});
