// L2b: the settlers (Tuikis, Wickle, Peplos) and the new shedding moments (grab, warm, dig, air), through the page's own creatureTick.
//   node --test prototypes/exploration/tests/creature-moments.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture, plain } from "./walk-fixture.mjs";

const podsHow = f => f.pods().map(q => q.how);
const said = (f, re) => f.msgs().some(m => re.test(m));

test("a Wickle settles anywhere in a place: eight quiet actions, the pips, the act, then it may shed (how 'still', the verb 'settled')", () => {
  const f = fixture({ partner: null }), at = f.spot(4, 6), id = f.add(16, at.x, at.y);
  f.tick(); assert.equal(f.cr(id).calm, 1); assert.equal(f.run(`bubbleOf(curLive().cr[0], null)`), "…", "the settling bubble");
  f.ticks(6); assert.equal(f.cr(id).calm, 7); assert.equal(f.cr(id).st, "idle");
  f.tick(); assert.equal(f.cr(id).st, "glow", "the eighth quiet action");
  assert.equal(f.run(`S.exp.moments.length`), 0, "the act is paid when the settle is finished");
  f.tick();
  assert.equal(f.run(`S.exp.moments.map(m => m.sp + m.kind).join()`), "16settle", "a finished settle pays the settle act");
  assert.deepEqual(podsHow(f), ["still"]);
  assert.ok(said(f, /^The Wickle settled · a pod rolled loose/), f.msgs().join(" | "));
});

test("a Wickle that is walked up to, or called, stops settling", () => {
  const f = fixture({ partner: null }), at = f.spot(4, 6), id = f.add(16, at.x, at.y);
  f.ticks(4); assert.equal(f.cr(id).calm, 4);
  f.set(id, { x: f.P().x + 1, y: f.P().y }); f.tick(); assert.equal(f.cr(id).calm, 0, "too close");
  f.ticks(3); f.set(id, { calm: 3, x: at.x, y: at.y });
  f.clearMsgs(); f.tick({ noise: "act", pulse: true, reach: 11, call: true });
  assert.equal(f.cr(id).calm, 0); assert.ok(said(f, /Your call startled the Wickle · it stopped settling/), f.msgs().join(" | "));
});

test("a Peplos settles only while the place is in a fog bank, and the fog drifting off stops it", () => {
  const f = fixture({ partner: null }), at = f.spot(4, 5), id = f.add(11, at.x, at.y);
  f.ticks(10); assert.equal(f.cr(id).calm, 0, "no fog: no settle"); assert.deepEqual(f.pods(), []);
  f.set(id, { x: at.x, y: at.y });   // it wandered; back where it was
  f.fog(true); f.ticks(4); assert.equal(f.cr(id).calm, 4, "in the fog");
  assert.equal(f.run(`bubbleOf(curLive().cr[0], null)`), "…");
  f.fog(false); f.tick(); assert.equal(f.cr(id).calm, 0, "the fog drifted off");
  f.fog(true); f.ticks(9);
  assert.deepEqual(podsHow(f), ["fog"]); assert.ok(said(f, /^The Peplos settled · a pod rolled loose/), f.msgs().join(" | "));
  assert.equal(f.run(`S.exp.moments.map(m => m.sp + m.kind).join()`), "11settle");
});

test("the Tuikis settles only in the cave or by a hole, as before", () => {
  const f = fixture({ partner: null }), at = f.spot(4, 6), id = f.add(1, at.x, at.y);
  assert.equal(f.run(`nearestHole({ lay: curLay(), live: curLive() }, curLive().cr[0], 2)`), null, "no hole near");
  f.ticks(10); assert.equal(f.cr(id).calm, 0, "in the open it does not settle");
  f.run(`curLay().feats.push({ kind: 'n', id: 'hx', x: ${at.x}, y: ${at.y} })`);
  f.ticks(8); assert.equal(f.cr(id).st, "glow", "by a hole it does");
  f.tick(); assert.deepEqual(podsHow(f), ["calm"]); assert.ok(said(f, /^The Tuikis settled · a pod rolled loose/));
});

test("Hiljan: a shaken bush drops a fruit and a wild Hiljan within 4 tiles goes for it at once, ignoring the back-off; it eats it, then may shed", () => {
  const f = fixture({ partner: null }), b = f.spot(1, 1);
  f.run(`curLay().feats.push({ kind: 'b', id: 'bx', x: ${b.x}, y: ${b.y} }); window.F = curLay().feats.find(q => q.id === 'bx')`);
  const h = f.spot(3, 3, b), id = f.add(3, h.x, h.y);
  f.run("shakeBush(F)");
  assert.ok(f.run("curLive().fr.length") === 1, "the fruit dropped");
  const c = f.cr(id); assert.ok(["seek", "eat"].includes(c.st) && c.grab, "it goes for it: " + JSON.stringify(c));
  for (let i = 0; i < 8 && !f.pods().length; i++) f.tick();
  assert.ok(said(f, /^All at once, the Hiljan grabs the fruit$/), f.msgs().join(" | "));
  assert.deepEqual(podsHow(f), ["grab"]); assert.ok(said(f, /^The Hiljan grabbed a falling fruit · a pod rolled loose/), f.msgs().join(" | "));
});

test("Hiljan: a Hiljan out of reach, fleeing, hidden or eating does not grab; a fruit you put down is eaten as any eater does", () => {
  const f = fixture({ partner: null }), b = f.spot(1, 1);
  f.run(`curLay().feats.push({ kind: 'b', id: 'bx', x: ${b.x}, y: ${b.y} }); window.F = curLay().feats.find(q => q.id === 'bx')`);
  const far = f.spot(6, 8, b), a = f.add(3, far.x, far.y), n1 = f.spot(3, 3, b, 0), fl = f.add(3, n1.x, n1.y, { st: "flee", t: 2 });
  const n2 = f.spot(3, 3, b, 2), hd = f.add(3, n2.x, n2.y, { hide: 3 }), n3 = f.spot(3, 3, b, 4), ea = f.add(3, n3.x, n3.y, { st: "eat", eat: 5 });
  f.run("grabFruit(curLive(), { id: 99, x: F.x, y: F.y })");
  for (const [k, id] of Object.entries({ far: a, flee: fl, hide: hd, eat: ea })) assert.ok(!f.cr(id).grab, k + " did not grab");
  // a fruit put down, you three tiles off: the Hiljan seeks it as any eater, no grab, no shed
  const g = fixture({ partner: null }), fp = g.spot(4, 4), hp = g.spot(2, 2, fp);
  const id = g.add(3, hp.x, hp.y); g.run(`curLive().fr.push({ id: 5, x: ${fp.x}, y: ${fp.y}, put: 1 })`);
  g.tick(); assert.equal(g.cr(id).st, "seek"); assert.ok(!g.cr(id).grab);
  g.ticks(6); assert.ok(g.msgs().some(m => m === "The Hiljan is eating the fruit"), g.msgs().join(" | "));
  g.ticks(2); assert.deepEqual(g.pods(), [], "no grab, no shed from a fruit put down");
});

test("Tepor: within a tile of a warm stone for three quiet actions it settles there, then may shed (by a warm stone); once a place", () => {
  const f = fixture({ partner: null }), s = f.spot(4, 5);
  f.run(`curLay().feats.push({ kind: 'k', id: 'kx', x: ${s.x}, y: ${s.y} }); S.exp.warm.push(curLay().key + ':kx')`);
  const t = f.spot(1, 1, s), id = f.add(4, t.x, t.y);
  f.ticks(2); assert.equal(f.cr(id).warm, 2); assert.deepEqual([f.cr(id).x, f.cr(id).y], [t.x, t.y], "it stays on the stone");
  f.tick(); assert.equal(f.cr(id).st, "glow");
  f.tick(); assert.deepEqual(podsHow(f), ["warm"]); assert.ok(said(f, /^The Tepor settled by a warm stone · a pod rolled loose/), f.msgs().join(" | "));
  assert.equal(f.run(`momentTaken(curLive().cr[0], { live: curLive() })`), true, "taken for this place");
  assert.equal(f.run("S.exp.moments.length"), 0, "a warm settle pays no settle act (the Tepor eats)");
  // a second Tepor, the cap lifted: the place's moment is spent
  const u = f.spot(1, 1, s, 1), id2 = f.add(4, u.x, u.y); f.run("S.exp.stats.sheds = 0"); f.ticks(5);
  assert.equal(f.pods().length, 1, "once per place per walk");
  assert.ok(!f.cr(id2).warm || f.cr(id2).st !== "glow");
});

test("Tepor: you walking within 3 tiles, a Call reaching it, or no warm stone: it does not settle", () => {
  const f = fixture({ partner: null }), P = f.P(), s = f.spot(2, 2, P);
  f.run(`curLay().feats.push({ kind: 'k', id: 'kx', x: ${s.x}, y: ${s.y} }); S.exp.warm.push(curLay().key + ':kx')`);
  const t = f.spot(1, 1, s), id = f.add(4, t.x, t.y);
  assert.ok(Math.max(Math.abs(t.x - P.x), Math.abs(t.y - P.y)) <= 3, "you are within 3 tiles");
  f.ticks(3, { noise: "walk", moved: true }); assert.equal(f.cr(id).warm || 0, 0); assert.notEqual(f.cr(id).st, "glow");
  f.tick({ noise: "act", pulse: true, reach: 11, call: true }); assert.equal(f.cr(id).warm || 0, 0, "a Call reaching it");
  const g = fixture({ partner: null }), far = g.spot(6, 8), id2 = g.add(4, far.x, far.y); g.ticks(6); assert.equal(g.cr(id2).warm || 0, 0, "no stone"); assert.deepEqual(g.pods(), []);
  // a charged stone is not the warm stone: it is not warm
  const h = fixture({ partner: null }), hs = h.spot(6, 8);
  h.run(`curLay().feats.push({ kind: 'k', id: 'kx', x: ${hs.x}, y: ${hs.y} }); S.exp.warm.push(curLay().key + ':kx'); setFS(curLay().key, 'kx', { ch: 2 })`);
  const ht = h.spot(1, 1, hs), id3 = h.add(4, ht.x, ht.y); h.ticks(4); assert.equal(h.cr(id3).warm || 0, 0, "a storm-charged stone");
});

test("Rupar: after a meal it goes full as the Untuva does and may shed in a fresh hole; the Untuva keeps its meal; a Loika's meal sheds nothing", () => {
  for (const [sp, how, re] of [[7, "dig", /^The Rupar dug a fresh hole · a pod rolled loose/], [2, "meal", /^The Untuva finished its meal · a pod rolled loose/]]) {
    const f = fixture({ partner: null }), at = f.spot(4, 6), id = f.add(sp, at.x, at.y, { st: "eat", eat: 1 });
    f.tick(); assert.equal(f.cr(id).st, "full", "sp " + sp); f.tick();
    assert.deepEqual(podsHow(f), [how]); assert.ok(said(f, re), f.msgs().join(" | "));
  }
  const f = fixture({ partner: null }), at = f.spot(4, 6), id = f.add(0, at.x, at.y, { st: "eat", eat: 1 });
  f.ticks(3); assert.deepEqual(f.pods(), []); assert.equal(f.cr(id).st, "idle");
});

test("Tuliko: after rain it airs its scales through the Loika's shake path, no tuft; once a place per storm; the Loika still leaves its tuft", () => {
  const f = fixture({ partner: null }), at = f.spot(4, 6), id = f.add(19, at.x, at.y, { wet: 1 });
  f.tick(); assert.equal(f.cr(id).st, "shake");
  f.tick(); assert.deepEqual(podsHow(f), ["air"]); assert.ok(said(f, /^The Tuliko aired its scales · a pod rolled loose/), f.msgs().join(" | "));
  assert.equal(f.run("curLive().tf.length"), 0, "no tuft");
  const u = f.spot(4, 6, null, 3), id2 = f.add(19, u.x, u.y, { wet: 1 }); f.run("S.exp.stats.sheds = 0"); f.ticks(3);
  assert.equal(f.pods().length, 1, "the storm's moment for the Tuliko is spent in this place"); assert.equal(f.cr(id2).st, "idle");
  const g = fixture({ partner: null }), lp = g.spot(4, 6), lid = g.add(0, lp.x, lp.y, { wet: 1 });
  g.tick(); assert.equal(g.cr(lid).st, "shake"); g.tick(); assert.deepEqual(podsHow(g), ["shake"]); assert.equal(g.run("curLive().tf.length"), 1, "the Loika's tuft");
});

test("Tuliko: still wet under the rain it stays in the shelter's path, and only the rain ending sends it to shake", () => {
  const f = fixture({ partner: null }), at = f.spot(4, 6), id = f.add(19, at.x, at.y);
  f.run(`globalThis.__X = r => ({ lay: curLay(), live: curLive(), key: S.exp.patch.key, P: S.exp.patch, raining: r, fog: false, strike: null, ring: null, pulse: false, reach: 7, moved: false, noise: 'act', carry: null, ptName: null, away: () => false, pt: null, ptAb: null, ptSp: -1, ptElder: false })`);
  f.run(`creatureTick(curLive().cr[0], __X(true))`); assert.equal(f.cr(id).wet, 1); assert.equal(f.cr(id).st, "shelter");
  f.run(`creatureTick(curLive().cr[0], __X(false))`); assert.equal(f.cr(id).st, "shake", "after the rain");
});

test("the diet line says dew for a drinker, with the settle tail of its kind; an eater and the settle act", () => {
  const f = fixture({ partner: null }), line = (sp, long) => f.run(`dietLine(${sp}, ${long})`);
  assert.equal(line(0, true), "Loika · eats fruit");
  assert.equal(line(1, true), "Tuikis · drinks dew · settles when you keep still");
  assert.equal(line(1, false), "Tuikis · drinks dew");
  assert.equal(line(11, true), "Peplos · drinks dew · settles in fog when you keep still");
  assert.equal(line(11, false), "Peplos · drinks dew");
  assert.equal(line(16, true), "Wickle · drinks dew · settles when you keep still");
  assert.equal(line(3, true), "Hiljan · eats fruit"); assert.equal(line(19, true), "Tuliko · eats fruit");
  assert.equal(f.run(`dietLine(5, true)`), "Unknown creature · watch what it does", "an unknown kind");
  // actTag for every settler: the settle act's Data, once; the eaters' eat act
  for (const sp of [1, 11, 16]) { const at = f.spot(4, 6), id = f.add(sp, at.x, at.y);
    assert.equal(f.run(`actTag(curLive().cr.find(q => q.id === ${id}))`), " · +1 Data", "sp " + sp + " settle act");
    f.run(`S.exp.momented[${id} + ':settle'] = 1`); assert.equal(f.run(`actTag(curLive().cr.find(q => q.id === ${id}))`), "", "paid"); }
  const at = f.spot(4, 6), id = f.add(4, at.x, at.y); assert.equal(f.run(`actTag(curLive().cr.find(q => q.id === ${id}))`), " · +1 Data", "Tepor: the eat act");
  assert.equal(f.run(`SPECIES.map((s, i) => [i, s.settle]).filter(a => a[1]).map(a => a.join(':')).join()`), "1:burrow,11:fog,16:any");
});

test("a fog bank lowers a kind's notice: a Peplos walked at in the fog does not notice you at 5 tiles, out of it it does", () => {
  for (const [fog, alert] of [[false, true], [true, false]]) {
    const f = fixture({ partner: null }), P = f.P(), at = f.spot(5, 5);
    const id = f.add(11, at.x, at.y); f.fog(fog); f.tick({ noise: "walk", moved: true });
    assert.equal(f.cr(id).st === "alert" || f.cr(id).st === "flee", alert, "fog " + fog + ": " + f.cr(id).st);
  }
});
