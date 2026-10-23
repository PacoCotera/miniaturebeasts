// views/words.mjs and views/requests.mjs: the words and the request makers the props builders share.
//   node --test prototypes/station/tests/words-requests.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { fill, spell, plural, count } from "../src/views/words.mjs";
import { req, slot, ph, plateDevice } from "../src/views/requests.mjs";

test("spell: one table, 0 to 12, the digits beyond", () => {
  const words = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
  words.forEach((w, n) => assert.equal(spell(n), w));
  assert.equal(spell(13), "13");
  assert.equal(spell(40), "40");
  assert.equal(spell(-1), "-1");
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
  assert.equal(fill("{a|b}", { n: 1 }), "{a|b}");
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
