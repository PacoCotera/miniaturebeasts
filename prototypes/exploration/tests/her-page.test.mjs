// her-page-ui-1: her page in the Log and the ways to it from the wild (design: her-page-design-1 sections 2 and 3). Seeds 7 and 13, a scripted play.
//   node --test prototypes/exploration/tests/her-page.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

// seed 13's first meadow holds six named Loikas; seed 7's first place holds none
const start = (seed = 13) => {
  const p = makePage({ gen: 7, store: {}, console: "collect", els: true, canvas: true, raf: "count" });
  p.run(`newWorld(${seed}); TEST.calm = true; startExpedition('weather', G.spawns[0]); HUD.ok = true; enterPatch(String(S.exp.pos)); S.phase = 'patch'; S.known = [0];
    globalThis.DRAWN = []; { const t0 = text; text = (s, x, y, col, sc, al) => { DRAWN.push({ s: String(s), x, y, sc: sc || 2, al }); return t0(s, x, y, col, sc, al); }; }`);
  // since #591 a wild one in sight is named at once: these tests start with none named or in sight (every wild one hidden, as in a place with none), then meet() brings one back
  p.run("{ for (const c of curLive().cr) c.hide = 1; S.named = {}; S.metIds = []; S.book = []; S.pages = {}; }");
  return p;
};
// her at the front of the explorer, met (named)
const meet = (p, who = 36, name = "Cinder") => {
  p.run(`{ const P = S.exp.patch, c = curLive().cr.find(q => q.id === ${who}); P.dir = 'up'; c.x = P.x; c.y = P.y - 1; c.st = 'idle'; c.ease = 0; c.hide = 0;
    (S.named || (S.named = {}))[${who}] = ${JSON.stringify(name)}; (S.metIds || (S.metIds = [])).push('${who}'); S.seenAt = { '${who}': { k: P.key, x: c.x, y: c.y, sp: 0, t: S.turn } };
    S.pages = { '${who}': { met: { d: 1, part: 'morning', place: 'meadow', from: 'at the flag', t: 1 } } }; }`);
};
const snap = p => p.run("JSON.stringify({ s: S.day && S.day.spent, turn: S.turn, cr: curLive().cr.map(c => [c.id, c.x, c.y, c.st, c.ease]), log: S.log, book: S.book, hold: S.exp && S.exp.hold })");
const draw = p => { p.run("DRAWN.length = 0; render(0)"); return p.run("DRAWN.map(d => ({ ...d, w: textW(d.s, d.sc) }))"); };
const say = p => draw(p).map(d => d.s);
const haveRow = (p, re) => say(p).some(s => re.test(s));
const key = (p, k) => p.key(k);

test("a named Loika in sight: the bottom line names her, her name stands under her on the bone tag, ← says her page, the menu's first row is hers", () => {
  const p = start(13); meet(p);
  assert.equal(p.run("herInSight()"), "36");
  const backs = new Set(); for (const sp of [0, 400, 800, 1200, 1600]) { p.run(`S.day.spent = ${sp}`); const o = p.run("lineFor()"); backs.add(o.back);
    assert.ok([].concat(o.ctx).some(c => c.includes("Cinder")), "the line names her: " + JSON.stringify(o.ctx));
    if (o.back === "her page") assert.ok(p.run("lineCtx(lineFor()).r").includes("Cinder"), "← says her page only while her name stands on the line, at light spent " + sp);
    else assert.equal(o.back, "Leave", "her name off the line: ← reads what it read before"); }
  p.run("S.day.spent = 0"); assert.ok(backs.has("her page") || backs.has("Leave"), [...backs].join());
  assert.equal(p.run("menuItems = menuItems, (S.ui.from = 'patch', menuItems()[0].id)"), "her", "the first row while she is named");
  assert.equal(p.run("menuItems()[0].label"), "Cinder · her page");
  assert.equal(p.errors.length, 0, String(p.errors));
});

test("not in sight and no top-line target: no row, ← says Leave", () => {
  const p = start(13);
  assert.equal(p.run("herNamed()"), null);
  assert.equal(p.run("(S.ui.from = 'patch', menuItems()[0].id)"), "leave");
  assert.equal(p.run("lineFor().back"), "Leave");
});

test("a long ✓ label squeezes her name out: ← falls back to menu, never her name", () => {
  const p = start(13); meet(p);
  const long = p.run("(() => { const o = { ok: 'Keep still · until midday', ctx: ['Cinder · a wild Loika · grazing', 'Cinder'], back: 'Leave', dim: false }; return herBack(o); })()");
  assert.ok(long === "her page" || long === null);
  const squeezed = p.run("(() => { const o = { ok: 'Offer fruit · Loika fruit eater more', ctx: ['Cinder · a wild Loika · grazing', 'Cinder'], back: 'Leave', dim: false }; return herBack(o); })()");
  assert.equal(squeezed, null, "her name is not on the line: ← keeps what it read before (#156 QA)");
});

test("her page from the field, with ✓ in the menu: no light, no beat, nothing moves; ← comes back", () => {
  const p = start(13); meet(p);
  const before = snap(p);
  key(p, "back"); assert.equal(p.run("S.phase"), "menu"); key(p, "confirm"); assert.equal(p.run("S.phase"), "her");
  assert.ok(haveRow(p, /^Cinder$/) && haveRow(p, /a wild Loika/) && haveRow(p, /Met day 1 · T1 · morning/) && haveRow(p, /Last seen today/) && !haveRow(p, /ways/i));
  key(p, "back"); assert.equal(p.run("S.phase"), "patch");
  assert.equal(snap(p), before, "light, turn, wild ones, log and hold unchanged");
  assert.equal(p.errors.length, 0, String(p.errors));
});

test("✓ facing her in the field is still keep still, never her page", () => {
  const p = start(13); meet(p);
  const s0 = p.run("S.day.spent"); key(p, "confirm");
  assert.equal(p.run("S.phase"), "patch"); assert.ok(p.run("S.day.spent") > s0, "keep still spends its light as on main");
});

test("just met: her name, kind, where and when, last seen, and nothing else (no count of ways)", () => {
  const p = start(13); meet(p); p.run("openHer('36', 'patch')");
  const rows = say(p).filter(s => s !== "Log" && s !== "Case" && s !== "Riding");
  for (const bad of [/Where she keeps/, /Her young/, /shake|glow|full|curl|calm/i, /tuft|whisker|claw/]) assert.ok(!rows.some(s => bad.test(s)), String(bad) + " in " + rows.join(" | "));
  assert.ok(rows.includes("Cinder") && rows.includes("a wild Loika"));
  assert.ok(!rows.some(s => /of \d+$/.test(s) && /^\d+ of/.test(s)), "no n of m with one met");
});

test("a way appears once it has a note, her marking once her coat is read, her pod once left, a haunt line for a part noted after she was met", () => {
  const p = start(13); meet(p);
  p.run("openHer('36', 'patch')");
  const plain0 = p.run("coatRead('36')"); assert.equal(plain0, false);
  p.run("{ const r = habRecord(S.habits || (S.habits = {}), '36', 'shake'); r.ranges.mid = 1; r.got.place = 1; r.got.coat = 1; }");
  let rows = say(p); assert.ok(rows.includes("shaking dry") && !rows.some(s => /ways/i.test(s)), rows.join(" | "));
  assert.ok(p.run("coatRead('36')"), "her coat is read from a mid note");
  p.run("S.own = { '36': 'ownpod' }; S.pods.push({ id: 'ownpod', k: S.exp.patch.key, x: 3, y: 3, h: 0, how: 'own', g: 0 })"); rows = say(p);
  assert.ok(rows.some(s => /Her young · a pod at her bed/.test(s)), rows.join(" | "));
  p.run("S.pages['36'].morning = { x: 2, y: 2, k: 'reed', bed: 0 }"); rows = say(p);
  assert.ok(rows.some(s => /morning · at the reeds/.test(s)) && rows.includes("Where she keeps"), rows.join(" | "));
  assert.ok(!rows.some(s => /dusk/.test(s)), "a part not noted is not named");
  assert.equal(p.errors.length, 0, String(p.errors));
});

test("prints read before she is met are not written to her page; read after, with the haunt's kind", () => {
  const p = start(13);
  p.run("{ const c = curLive().cr.find(q => q.id === 36); S.exp.carry = null; globalThis.__pr = { c, h: c.ind.hs.haunts ? c.ind.hs.haunts[0] : { x: 1, y: 1, k: 'reed' }, part: 'morning', yday: 0, gone: 0, stand: { x: 1, y: 1 }, mark: null }; if (!__pr.h) __pr.h = { x: 1, y: 1, k: 'reed' }; }");
  p.run("readPrints(__pr)");
  assert.ok(!p.run("S.pages && S.pages['36'] && S.pages['36'].morning"), "unnamed: nothing written");
  meet(p); p.run("S.pages['36'].met.d = 1; delete S.habDay; readPrints(__pr)");
  assert.ok(p.run("!!(S.pages['36'].morning && S.pages['36'].morning.k)"), "named: the part and the kind are kept");
});

test("a wild one met four days ago with no Log entry is reached by ◀ ▶, in the order met", () => {
  const p = start(13); meet(p);
  p.run("S.named['35'] = 'Maple'; S.metIds.push('35'); S.book = []; S.pages['35'] = { met: { d: 1, part: 'dusk', place: 'grove', from: 'at the flag', t: 2 } }");
  p.run("openHer('36', 'patch')"); assert.ok(haveRow(p, /^1 of 2$/));
  key(p, "right"); assert.equal(p.run("S.ui.her.id"), "35"); assert.ok(haveRow(p, /^Maple$/) && haveRow(p, /^2 of 2$/) && haveRow(p, /Met day 1 · T2 · dusk/));
  key(p, "right"); assert.equal(p.run("S.ui.her.id"), "36"); key(p, "left"); assert.equal(p.run("S.ui.her.id"), "35");
  key(p, "back"); assert.equal(p.run("S.phase"), "patch");
});

test("an old save opens: a missing pages, met or seenAt shows nothing and throws nothing", () => {
  const p = start(13); meet(p);
  p.run("delete S.pages; delete S.seenAt; S.book = []; openHer('36', 'patch')");
  const rows = say(p); assert.ok(rows.includes("Cinder") && !rows.some(s => /ways/i.test(s)), rows.join(" | "));
  assert.ok(!rows.some(s => /Met day|Last seen/.test(s)), "no empty rows");
  p.run("S.pages = { '36': { morning: { x: 1, y: 1 } } }"); assert.ok(!say(p).includes("Where she keeps"), "a part with no haunt kind shows nothing");
  assert.equal(p.errors.length, 0, String(p.errors));
});

test("the Log: ✓ Her page on an entry about a wild one met, none on one about one not met; ← comes back to that entry", () => {
  const p = start(13); meet(p);
  p.run("S.book = [{ d: 1, part: 'morning', place: 'meadow', from: 'at the flag', t: 1, id: 35, who: 'a Loika', kind: 'prints', text: 'Prints in the grass. a Loika was here this morning.', at: 1 }, { d: 1, part: 'morning', place: 'meadow', from: 'at the flag', t: 1, id: 36, who: 'Cinder', kind: 'met', text: 'Met her. She is Cinder now.', at: 2 }]; openLog(); S.ui.logTop = 0;");
  assert.equal(p.run("logMarked()"), null); assert.equal(p.run("lineFor().ok"), "");
  p.run("S.ui.logTop = 1"); assert.equal(p.run("logMarked()"), "36"); assert.equal(p.run("lineFor().ok"), "Her page");
  const before = snap(p); key(p, "confirm"); assert.equal(p.run("S.phase"), "her"); key(p, "back"); assert.equal(p.run("S.phase"), "log"); assert.equal(p.run("S.ui.logTop"), 1);
  assert.equal(snap(p), before);
});

test("the end-of-walk Case: its bottom line names the Log and her pages, so he knows where a named one's details are", () => {
  const p = start(13);
  p.run("S.ui.caseEnd = 1; S.phase = 'cargo'");
  const ctx = p.run("lineFor().ctx"); assert.ok(String(ctx).includes("Log, her pages"), String(ctx));
  assert.equal(p.errors.length, 0, String(p.errors));
});

test("the watch view: ▶ opens her page with no light and no beat; ← comes back to the view", () => {
  const p = start(13); meet(p);
  p.run("{ const c = curLive().cr.find(q => q.id === 36); const P = S.exp.patch; c.x = P.x; c.y = P.y - 3; c.st = 'hab'; c.hb = { k: 'shake', n: 4, tell: 3, notes: {} }; }");
  assert.ok(p.run("(() => { S.ui.watch = { id: 36 }; return !!watchHer(); })()"), "the view opens on her");
  p.run("S.phase = 'watch'"); const before = snap(p); key(p, "right"); assert.equal(p.run("S.phase"), "her");
  key(p, "back"); assert.equal(p.run("S.phase"), "watch"); assert.equal(snap(p), before);
  assert.deepEqual(p.run("lineFor().ctx"), ["▲▼ closer · ▶ her page", "▶ her page"]);
});

test("seed 7: nothing named in sight, no row, no tag, the menu as before", () => {
  const p = start(7);
  assert.equal(p.run("herNamed()"), null); assert.equal(p.run("(S.ui.from = 'patch', menuItems()[0].id)"), "leave");
  assert.equal(p.errors.length, 0, String(p.errors));
});

test("the worst case fits 450 x 600: three ways, her pod, four haunt lines, no cut line", () => {
  const p = start(13); meet(p);
  p.run(`{ const H = (S.habits = S.habits || {}); for (const k of ['shake', 'calm', 'sleep']) { const r = habRecord(H, '36', k); r.ranges.near = 1; r.got.place = 1; r.got.coat = 1; r.got.face = 1; r.sample = 's' + k; }
    S.own = { '36': 'ownpod' }; S.pods.push({ id: 'ownpod', k: S.exp.patch.key, x: 3, y: 3, h: 0, how: 'own', g: 0 });
    S.pages['36'].dawn = { x: 1, y: 1, k: 'reed', bed: 0 }; S.pages['36'].morning = { x: 1, y: 1, k: 'shore', bed: 0 }; S.pages['36'].midday = { x: 1, y: 1, k: 'sweep', bed: 0 }; S.pages['36'].afternoon = { x: 1, y: 1, k: 'grove', bed: 0 };
    S.pages['36'].dusk = { x: 1, y: 1, k: 'outcrop', bed: 0 }; S.pages['36'].bed = { x: 1, y: 1 }; S.named['35'] = 'Maple'; S.metIds.push('35'); openHer('36', 'patch'); }`);
  const rows = draw(p), bottom = 62 + 496;
  for (const d of rows) assert.ok(d.x + (d.al === "right" ? 0 : d.w) <= 450 || d.al === "right", d.s);
  const keeps = rows.filter(d => /reeds|water|tall grass|shade|lookout|her bed/.test(d.s));
  assert.ok(keeps.length >= 4, "the haunt lines are drawn: " + keeps.map(d => d.s).join(" | "));
  for (const d of rows.filter(r => r.y < 558)) assert.ok(d.y + 14 <= bottom - 2, `"${d.s}" at y ${d.y} runs past the page (${bottom})`);
  assert.equal(p.errors.length, 0, String(p.errors));
});

test("named on arrival has a met record: a wild one named at once on entering the place has S.pages[id].met with the turn", () => {
  const p = makePage({ gen: 7, store: {}, console: "collect", els: true, canvas: true, raf: "count" });
  p.run("newWorld(13); TEST.calm = true; startExpedition('weather', G.spawns[0]); HUD.ok = true; enterPatch(String(S.exp.pos)); S.phase = 'patch'; S.known = [0];");
  const ids = p.run("Object.keys(S.named || {})");
  assert.ok(ids.length > 0, "someone is named on arrival");
  for (const id of ids) { const m = p.run(`S.pages && S.pages[${JSON.stringify(id)}] && S.pages[${JSON.stringify(id)}].met`); assert.ok(m && m.d != null && m.place && m.t != null, "met record for " + id + ": " + JSON.stringify(m)); }
  assert.equal(p.errors.length, 0, String(p.errors));
});

test("a Loika named on arrival has a met record (the one naming path, nameSeen)", () => {
  const p = start(13);
  p.run("{ const P = S.exp.patch, c = curLive().cr.find(q => q.id === 36); c.x = P.x; c.y = P.y - 1; c.hide = 0; S.named = {}; S.metIds = []; S.book = []; S.pages = {}; nameInSight(); }");
  assert.ok(p.run("S.named[36]"), "she is named at once");
  assert.equal(p.run("S.book.filter(r => r.kind === \"met\" && String(r.id) === \"36\").length"), 1, "one met entry");
  assert.ok(p.run("S.pages[36] && S.pages[36].met && S.pages[36].met.part"), "her page holds the met record");
  p.run("nameInSight()"); assert.equal(p.run("S.book.filter(r => r.kind === \"met\").length"), 1, "naming again writes nothing more");
  assert.equal(p.errors.length, 0, String(p.errors));
});
