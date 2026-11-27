// The satchel stacks: one slot holds one kind, up to 9; 8 slots (satchel-stack-build-1, owner 2026-11-25 "you fill up too fast your inventory").
//   node --test prototypes/exploration/tests/satchel-stack.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { stacks, stackRoom, capStacks, STACK, SATCHEL } from "../src/habits.mjs";

const mk = (item, n, from = 0) => Array.from({ length: n }, (_, i) => ({ id: item + (from + i), item }));

test("like kinds share one slot, in the order each kind first came", () => {
  const st = stacks([...mk("whisker", 2), ...mk("claw", 1), ...mk("whisker", 1, 2)]);
  assert.deepEqual(st.map(q => [q.item, q.list.length]), [["whisker", 3], ["claw", 1]]);
});

test("the 10th of a kind has no room; another kind still does", () => {
  const sm = mk("whisker", STACK);
  assert.equal(stackRoom(sm.slice(0, STACK - 1), "whisker"), true);
  assert.equal(stackRoom(sm, "whisker"), false);
  assert.equal(stackRoom(sm, "claw"), true);
});

test("a new kind needs a free slot", () => {
  const sm = Array.from({ length: SATCHEL }, (_, i) => ({ id: "k" + i, item: "kind" + i }));
  assert.equal(stackRoom(sm, "kind0"), true);
  assert.equal(stackRoom(sm, "other"), false);
});

test("an old save merges like kinds and keeps no stack over 9", () => {
  const old = [...mk("whisker", 4), ...mk("claw", 2), ...mk("whisker", 8, 4)];
  const out = capStacks(old), st = stacks(out);
  assert.deepEqual(st.map(q => [q.item, q.list.length]), [["whisker", 9], ["claw", 2]]);
});

test("the stack line: names, then and k more (editorial 11-26)", async () => {
  const { WORDS } = await import("../src/words.mjs"), f = WORDS.case.stackFrom;
  assert.equal(f(["Old", "Elm"]), "from Old and Elm"); assert.equal(f(["Old", "Elm", "Ash"]), "from Old, Elm and Ash");
  assert.equal(f(["Old", "Elm", "Ash", "Fen", "Oak", "Ivy", "Rue", "Bay", "Yew"]), "from Old, Elm and 7 more"); assert.equal(f(["Old"]), "from Old");
});
