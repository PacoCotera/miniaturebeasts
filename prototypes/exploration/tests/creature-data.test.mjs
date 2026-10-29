// Creature Data: every built act on a creature pays 1 Data for
// certain, once per creature per act per expedition, under a trip ceiling, with nothing left to chance. The real functions are
// read out of index.html and run in a sandbox with the rest of the page stubbed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const PAGE = readFileSync(new URL("../index.html", import.meta.url), "utf8");
function source(name) {
  const fn = PAGE.match(new RegExp("^function " + name + "\\(", "m"));
  if (fn) {
    let i = PAGE.indexOf("{", fn.index), depth = 0, q = null;
    for (; i < PAGE.length; i++) {
      const c = PAGE[i];
      if (q) { if (c === "\\") i++; else if (c === q) q = null; continue; }
      if (c === "'" || c === '"' || c === "`") q = c;
      else if (c === "/" && PAGE[i + 1] === "/") i = PAGE.indexOf("\n", i);
      else if (c === "{") depth++;
      else if (c === "}" && --depth === 0) return PAGE.slice(fn.index, i + 1);
    }
  }
  const k = PAGE.match(new RegExp("^const " + name + " = .*$", "m"));
  if (k) return k[0];
  throw new Error("not found in index.html: " + name);
}
const plain = x => JSON.parse(JSON.stringify(x));

// a trip: Data lands in the hold as addMat would (capped at 20); the notes and the log are kept
function trip(extra = {}) {
  const notes = [], log = [];
  const ctx = vm.createContext(Object.assign({
    console, notes, log, Math,
    S: { exp: { cargo: { e: 0, d: 0, s: 0, pods: [] }, moments: [], momented: {} } },
    CAP: 20, MAT: { d: "Data" },
    addMat(k, n) { const ex = ctx.S.exp, got = Math.max(0, Math.min(n, 20 - ex.cargo[k])); ex.cargo[k] += got; return got; },
    fxMsg: t => notes.push(t), logEv: t => log.push(t), spName: sp => ["Loika", "Tuikis", "Untuva"][sp], cap: s => s[0].toUpperCase() + s.slice(1),
  }, extra));
  const names = ["ACT_DATA", "CREATURE_CEIL", "actDone", "creatureRoom", "actOpen", "awardMoment"];
  const out = vm.runInContext(names.map(source).join("\n") + "\n;({ " + names.join(", ") + " })", ctx);
  return { ctx, notes, log, ...out };
}
const cr = (id, sp = 0) => ({ id, sp, x: 1, y: 1 });

test("an act pays 1 Data for certain, with the Data shown in the message; no first-time bonus", () => {
  const t = trip();
  t.awardMoment(cr(1, 0), "eat"); t.awardMoment(cr(2, 1), "settle");
  assert.equal(t.ctx.S.exp.cargo.d, 2);
  assert.deepEqual(plain(t.notes), ["+1 Data · the Loika ate your fruit", "+1 Data · the Tuikis settled"]);
  assert.ok(!/first time/.test(source("awardMoment")), "the +2 first-time rule is gone");
});

test("once per creature per act per expedition: a repeat pays nothing, a different act or creature pays", () => {
  const t = trip();
  t.awardMoment(cr(1), "eat"); t.awardMoment(cr(1), "eat");
  assert.equal(t.ctx.S.exp.cargo.d, 1, "the same creature, the same act");
  t.awardMoment(cr(1), "settle"); assert.equal(t.ctx.S.exp.cargo.d, 2, "another act on it");
  t.awardMoment(cr(2), "eat"); assert.equal(t.ctx.S.exp.cargo.d, 3, "another creature");
  assert.equal(t.ctx.S.exp.moments.length, 3);
});

test("the trip ceiling: creature Data stops at the ceiling and the line says so", () => {
  const t = trip();
  for (let i = 1; i <= t.CREATURE_CEIL; i++) t.awardMoment(cr(i), "eat");
  assert.equal(t.ctx.S.exp.dAct, t.CREATURE_CEIL);
  assert.match(t.notes.at(-1), /Data for this trip: full$/);
  assert.equal(t.actOpen(t.ctx.S.exp, cr(99), "eat"), false, "no act is open past the ceiling");
  t.awardMoment(cr(99), "eat");
  assert.equal(t.ctx.S.exp.cargo.d, t.CREATURE_CEIL, "nothing paid past the ceiling");
  assert.equal(t.notes.at(-1), "The Loika ate your fruit · Data for this trip: full");
});

test("nothing is left to chance: the act code reads no random source", () => {
  assert.doesNotMatch(source("awardMoment"), /rnd\(|random|chance\(|hash\(/);
});

test("the Data is shown in advance on the creature's line: open, full, paid, and nothing for an unknown creature", () => {
  const t = trip({ S: { known: [0, 1], exp: { cargo: { e: 0, d: 0, s: 0, pods: [] }, moments: [], momented: {} } }, spOf: sp => ({ eats: sp === 0 }) });
  const names = ["actTag"], tag = vm.runInContext(source("actTag") + ";actTag", t.ctx);
  assert.equal(tag(cr(1, 0)), " · +1 Data", "an eater: the feed is open");
  assert.equal(tag(cr(2, 1)), " · +1 Data", "a Tuikis: the settle is open");
  assert.equal(tag(cr(3, 2)), "", "an unidentified species leaks nothing");
  t.awardMoment(cr(1, 0), "eat"); assert.equal(tag(cr(1, 0)), "", "paid: nothing more is promised");
  t.ctx.S.exp.dAct = 8; assert.equal(tag(cr(4, 0)), " · Data for this trip: full");
  assert.match(PAGE, /ctx = \[dietLine\(o\.c\.sp, true\) \+ actTag\(o\.c\)/, "the facing line carries it");
});
