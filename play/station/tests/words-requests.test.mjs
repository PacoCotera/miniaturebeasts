// views/words.mjs and views/requests.mjs: the words and the request makers the props builders share.
//   node --test prototypes/station/tests/words-requests.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { fill, spell, plural, count } from "../src/views/words.mjs";
import { req, slot, ph, plateDevice, slotAt } from "../src/views/requests.mjs";

test("spell: one table, 0 to 12, the digits beyond", () => {
  const words = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
  words.forEach((w, n) => assert.equal(spell(n), w));
  assert.equal(spell(13), "13");
  assert.equal(spell(40), "40");
  assert.equal(spell(-1), "-1");
});

test("spell: beyond the table the caller's word, else the digits", () => {
  assert.equal(spell(7, "many"), "seven");
  assert.equal(spell(12, "many"), "twelve");
  assert.equal(spell(13, "many"), "many");
  assert.equal(spell(13), "13");
  assert.equal(spell(13, undefined), "13");
});

test("count: a for one, the spelled number otherwise", () => {
  assert.equal(count(1), "a");
  assert.equal(count(2), "two");
  assert.equal(count(6), "six");
  assert.equal(count(0), "no");
  assert.equal(count(13), "13");
});

test("plural: the first word for exactly one, the second for anything else", () => {
  assert.equal(plural(1, "a crate", "crates"), "a crate");
  assert.equal(plural(0, "a crate", "crates"), "crates");
  assert.equal(plural(2, "a crate", "crates"), "crates");
});

test("fill: {name} and {n in words}, one regex form", () => {
  assert.equal(fill("{name} is {state}", { name: "Pip", state: "awake" }), "Pip is awake");
  assert.equal(fill("{n in words} crates to the case", { "n in words": spell(3) }), "three crates to the case");
  assert.equal(fill("{a/an} {Species}", { "a/an": "an", Species: "Ember" }), "an Ember");
  assert.equal(fill("{x} and {x}", { x: 1 }), "1 and 1");
  assert.equal(fill("{count} pods", { count: "" }), " pods");
});

test("fill: a name the values do not hold stays as written", () => {
  assert.equal(fill("{a} {b}", { a: "x" }), "x {b}");
  assert.equal(fill("{n in words} left", {}), "{n in words} left");
  assert.equal(fill("no braces", { a: 1 }), "no braces");
});

test("fill: {one|many} reads plural(values.n, one, many) when the values hold no such name", () => {
  assert.equal(fill("{a|b}", { n: 1 }), "a");
  assert.equal(fill("{a|b}", { n: 2 }), "b");
  assert.equal(fill("{a|b}", {}), "b");
  assert.equal(fill("{plate|plates} left", { n: 1 }), "plate left");
  assert.equal(fill("{a|b}", { n: 1, "a|b": "own" }), "own", "a name the values hold is filled from them");
});

test("fill: a name with two bars, an empty side or a prototype key stays as written", () => {
  assert.equal(fill("{a|b|c}", { n: 1 }), "{a|b|c}");
  assert.equal(fill("{|b}", { n: 1 }), "{|b}");
  assert.equal(fill("{a|}", { n: 1 }), "{a|}");
  assert.equal(fill("{constructor}", {}), "{constructor}");
  assert.equal(fill("{toString}", { n: 1 }), "{toString}");
});

test("req: pushes the request and returns its id", () => {
  const requests = [], r = req(requests);
  assert.equal(r({ kind: "star", id: "star:12" }), "star:12");
  assert.deepEqual(requests, [{ kind: "star", id: "star:12" }]);
});

test("slot: a signed-master request, the builder's until unless the call gives one", () => {
  const requests = [], s = slot(req(requests), "its master");
  assert.equal(s("a-10x20", [10, 20]), "a-10x20");
  s("b-4x4", [4, 4], "its cut");
  assert.deepEqual(requests, [
    { kind: "slot", id: "a-10x20", master: "a-10x20", size: [10, 20], until: "its master" },
    { kind: "slot", id: "b-4x4", master: "b-4x4", size: [4, 4], until: "its cut" },
  ]);
  assert.deepEqual(Object.keys(requests[0]), ["kind", "id", "master", "size", "until"]);
});

test("ph: a placeholder request, hollow false unless the call says so", () => {
  const requests = [], p = ph(req(requests), "its master");
  assert.equal(p("a", [1, 2]), "a");
  p("b", [3, 4], true);
  assert.deepEqual(requests, [
    { kind: "ph", id: "a", size: [1, 2], hollow: false, until: "its master" },
    { kind: "ph", id: "b", size: [3, 4], hollow: true, until: "its master" },
  ]);
  assert.deepEqual(Object.keys(requests[0]), ["kind", "id", "size", "hollow", "until"]);
});

test("plateDevice: the device plate request of w x h, for the caller's req", () => {
  const requests = [], id = req(requests)(plateDevice(416, 424));
  assert.equal(id, "plate-device-416x424");
  assert.deepEqual(requests, [{ kind: "slot", id: "plate-device-416x424", master: "plate-device-416x424", size: [416, 424], until: "the device plate (fix 2: placed 1:1)" }]);
  assert.deepEqual(Object.keys(requests[0]), ["kind", "id", "master", "size", "until"]);
});

test("req once: a request whose id is already collected is not pushed again, the id is returned either way", () => {
  const requests = [], r = req(requests, true);
  assert.equal(r({ kind: "slot", id: "a", size: [1, 1] }), "a");
  assert.equal(r({ kind: "slot", id: "a", size: [2, 2] }), "a");
  assert.equal(r({ kind: "slot", id: "b", size: [3, 3] }), "b");
  assert.deepEqual(requests, [{ kind: "slot", id: "a", size: [1, 1] }, { kind: "slot", id: "b", size: [3, 3] }]);
  const all = [], r2 = req(all);
  r2({ id: "a" }); r2({ id: "a" });
  assert.equal(all.length, 2, "without once every request is pushed");
});

test("plateDevice: the caller's until when it gives one", () => {
  const requests = [], id = req(requests)(plateDevice(136, 96, "its own words"));
  assert.equal(id, "plate-device-136x96");
  assert.deepEqual(requests, [{ kind: "slot", id: "plate-device-136x96", master: "plate-device-136x96", size: [136, 96], until: "its own words" }]);
});

test("slotAt: a master placed at a rect, its id the master and the size drawn, in the one key order", () => {
  const requests = [], id = slotAt(req(requests), "gate-wild-shut-48x48", [0, 0, 48, 48], "the gate master");
  assert.equal(id, "gate-wild-shut-48x48:48x48");
  slotAt(req(requests), "frame", [4, 6, 48, 40], "its master");
  assert.deepEqual(requests, [
    { kind: "slot", id: "gate-wild-shut-48x48:48x48", master: "gate-wild-shut-48x48", size: [48, 48], until: "the gate master" },
    { kind: "slot", id: "frame:48x40", master: "frame", size: [48, 40], until: "its master" },
  ]);
  assert.deepEqual(Object.keys(requests[0]), ["kind", "id", "master", "size", "until"]);
});
