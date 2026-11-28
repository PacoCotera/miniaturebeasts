// Audit A5: two pages on one save must not rewrite it without end. Each page's storage event used to write its own state back, which woke the other page.
// Two pages share one storage; one step in the first; the events are delivered in turn as a browser does (after the write, never inside it).
//   node --test prototypes/exploration/tests/two-tabs.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

test("two tabs on one save: after one step the writes stop (no write answers a storage event)", () => {
  const store = {}, queue = [], pages = [];
  const mk = (i) => makePage({ gen: 7, store, console: "collect", els: true, canvas: true, raf: "count", onSet: (k) => { for (let j = 0; j < pages.length; j++) if (j !== i) queue.push([j, k]); } });
  pages.push(mk(0)); pages[0].run("newWorld(7); save();");
  pages.push(mk(1));
  const drain = () => { let n = 0; while (queue.length && n < 2000) { const [j, k] = queue.shift(); pages[j].storageEvent(k); n++; } return n; };
  drain();
  const before = pages.map((p) => p.writes.length);
  pages[0].key("right");
  const delivered = drain();
  const after = pages.map((p, i) => p.writes.length - before[i]);
  assert.ok(delivered < 50, "the events die out (delivered " + delivered + ")");
  assert.ok(after[0] + after[1] < 20, "writes after one step: " + after.join(" and "));
});
