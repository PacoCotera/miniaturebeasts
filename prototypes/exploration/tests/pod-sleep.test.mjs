// pod-sleep-build-1: a named wild Loika fed from the hand sleeps in her pod for the night; take her up; she comes home with the walk (owner 11-24 18:5x; GD notes 11-25, 11-26)
//   node --test prototypes/exploration/tests/pod-sleep.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";
import { DAY } from "../src/words.mjs";

const nightStart = DAY.parts.slice(0, -1).reduce((a, q) => a + q[1], 0);   // the light at which the night begins

for (const seed of [7, 13, 42]) {
  const page = () => makePage({ gen: 7, console: "collect", els: true, canvas: true, raf: "count" });
  const find = `(() => { for (const c of [...new Set(S.cr.filter(q => q.sp === 0).map(q => q.c))]) { if (!G.comp[c] || G.land[c] === L.WATER) continue; const key = String(c), lay = layout(key), live = ensureLive(key);
    for (const q of live.cr) if (q.sp === 0 && q.ind) return JSON.stringify({ key, id: q.id }); delete S.exp.live[key]; } return 'null'; })()`;
  // her at her bed in the last light of dusk, her bedding-down over, named; fed (or not); the explorer stands 3 tiles off facing her bed
  const setup = (p, pick, fed) => p.run(`(() => { const key = ${JSON.stringify(pick.key)}; S.exp.pos = key; enterPatch(key); S.exp.storm = null; S.exp.fog = null; const lay = curLay(), live = curLive(), c = live.cr.find(q => q.id === ${pick.id});
    S.known = [0, ...S.known.filter(k => k !== 0)]; S.day.spent = ${nightStart - 3}; live.strike = null; S.exp.stray = null; lay.easeG = { cov: new Set(), blk: new Set() }; c.ind.doings.late = 0;
    c.ease = 0; c.quiet = 0; c.crowd = 0; c.st = 'idle'; c.gone = null; c.hide = 0; c.hb = null; delete c.wary;
    S.named = S.named || {}; S.named[c.id] = 'Elm'; S.metIds = [String(c.id)];
    const bed = hauntStand(hauntAt(c.ind.hs, c.ind.doings, 'dusk2'), hauntFree(lay, key, null)); c.x = bed.x; c.y = bed.y; c.ind.go = { part: 'night', t: { x: c.x, y: c.y } };
    habDay()[habKey(c, 'sleep')] = 'played'; ${fed ? `habDay()['fed:' + c.id] = 1;` : ''} return 1; })()`);
  const start = p => { p.run(`newWorld(${seed}); TEST.calm = true; startExpedition('weather', G.spawns[0]);`); const pick = JSON.parse(p.run(find)); assert.ok(pick, "a Loika in a mounted place"); return pick; };
  // the clock turns to night: one action across the line (the explorer waits somewhere clear)
  const night = p => p.run(`(() => { const P = S.exp.patch; P.x = 1; P.y = 1; FX.notes = []; S.day.spent = ${nightStart - 1}; advance('patch', { noise: 'act' }); const pod = S.pods.find(q => q.how === 'night'); if (pod) unveil(pod.k, pod.x, pod.y, 6); return JSON.stringify({ part: dayPart(), notes: FX.notes.map(n => n.text) }); })()`);

  test("seed " + seed + ": fed and asleep at her bed, she closes into her pod at nightfall; unfed or woken she does not", () => {
    const p = page(), pick = start(p); setup(p, pick, true);
    const dusk = p.run(`(() => { FX.notes = []; S.day.spent = ${nightStart - 40}; const part0 = dayPart(); S.day.spent = ${nightStart - 3}; return 1; })()`);
    const r = JSON.parse(night(p));
    const st = JSON.parse(p.run(`(() => { const c = curLive().cr.find(q => q.id === ${pick.id}); const pod = S.pods.find(q => q.how === 'night'); return JSON.stringify({ part: dayPart(), c: !!c, pod: pod && { loika: pod.loika, nm: pod.nm, atBed: pod.x === pod.bx && pod.y === pod.by }, slept: !!S.cr.find(q => q.id === ${pick.id}).slept }); })()`));
    assert.equal(st.part, "night");
    assert.ok(st.pod && st.pod.loika === String(pick.id) && st.pod.nm === "Elm", "her pod lies on the map: " + JSON.stringify(st));
    assert.ok(!st.c && st.slept, "she is off the place's creatures while she is a pod");
    assert.ok(r.notes.some(t => /Elm sleeps in her pod/.test(t)) && !r.notes.some(t => /dawn in/i.test(t)), "the night line says she sleeps in her pod and has no clock: " + JSON.stringify(r.notes));
    // unfed
    const q = page(), pk = start(q); setup(q, pk, false); const r2 = JSON.parse(night(q));
    assert.equal(JSON.parse(q.run(`JSON.stringify(S.pods.filter(x => x.how === 'night').length)`)), 0, "unfed: no pod");
    assert.ok(!r2.notes.some(t => /pod/.test(t)), "unfed: no pod line, the built night line stands: " + JSON.stringify(r2.notes));
    // woken
    const w = page(), pw = start(w); setup(w, pw, true); w.run(`(() => { curLive().cr.find(q => q.id === ${pw.id}).ease = 2; return 1; })()`); const r3 = JSON.parse(night(w));
    assert.equal(JSON.parse(w.run(`JSON.stringify(S.pods.filter(x => x.how === 'night').length)`)), 0, "woken: no pod");
    assert.ok(r3.notes.some(t => /Elm was woken · no pod tonight/.test(t)), "woken: the line says so: " + JSON.stringify(r3.notes));
    assert.deepEqual(p.errors, []);
  });

  test("seed " + seed + ": the feed's message, ✓ at a fed Loika with fruit keeps still, her page says fed today, the dusk line names her", () => {
    const p = page(), pick = start(p); setup(p, pick, false);
    const out = JSON.parse(p.run(`(() => { const c = curLive().cr.find(q => q.id === ${pick.id}); S.day.spent = 10; FX.notes = []; awardMoment(c, 'eat', {}); const msg = FX.notes.map(n => n.text);
      S.exp.carry = 'fruit'; c.x = S.exp.patch.x; c.y = S.exp.patch.y - 1; const a = herFruitAction(c); S.exp.carry = null;
      return JSON.stringify({ msg, label: a.label, page: herState(c.id), names: fedNames(), dusk: DAY_TEXT.duskFed(['Elm', 'Fern']), dusk3: DAY_TEXT.duskFed(['Elm', 'Fern', 'Ash']) }); })()`));
    assert.ok(out.msg.some(t => t === "Elm takes the fruit from your hand. Tonight she sleeps in her pod, if she is left in peace."), JSON.stringify(out.msg));
    assert.match(out.label, /Keep still/, "fed today with fruit in hand: nothing to offer, ✓ keeps still");
    assert.equal(out.page, "Fed today"); assert.deepEqual(out.names, ["Elm"]);
    assert.equal(out.dusk, "Dusk. Elm and 1 other Loika ate from your hand today. They will sleep in their pods if you do not wake them.");
    assert.match(out.dusk3, /Elm and 2 other Loikas ate/);
    assert.deepEqual(p.errors, []);
  });

  test("seed " + seed + ": ✓ at her pod opens the confirm and spends nothing; ← leaves her; ✓ takes her up in one action; a second pod is refused", () => {
    const p = page(), pick = start(p); setup(p, pick, true); night(p);
    const out = JSON.parse(p.run(`(() => { const ex = S.exp, P = ex.patch, pod = S.pods.find(q => q.how === 'night'); P.x = pod.x; P.y = pod.y + 1; P.dir = 'up';
      let a = patchAction(); const label = a.label; const spent0 = S.day.spent, acts0 = ex.actions; a.run(); const open = !!S.ui.swap && swapState().night; const afterOpen = { spent: S.day.spent - spent0, acts: ex.actions - acts0, pods: ex.cargo.pods.length };
      press('back'); const closed = !S.ui.swap, afterBack = { spent: S.day.spent - spent0, acts: ex.actions - acts0, pods: ex.cargo.pods.length, still: !!S.pods.find(q => q.how === 'night') };
      patchAction().run(); press('confirm'); const held = ex.cargo.pods.find(q => q.how === 'night');
      return JSON.stringify({ label, open, afterOpen, closed, afterBack, held: held && { loika: held.loika, nm: held.nm, id: held.id }, acts: ex.actions - acts0, ground: S.pods.some(q => q.how === 'night') }); })()`));
    assert.equal(out.label, "Take her up"); assert.ok(out.open, "the confirm opens");
    assert.deepEqual(out.afterOpen, { spent: 0, acts: 0, pods: 0 }, "nothing spent until its ✓");
    assert.ok(out.closed && out.afterBack.spent === 0 && out.afterBack.pods === 0 && out.afterBack.still, "← leaves her asleep and spends nothing");
    assert.ok(out.held && out.held.loika === String(pick.id) && out.held.nm === "Elm", "her pod is in the Case with her id and name"); assert.equal(out.acts, 1, "one action"); assert.ok(!out.ground);
    // a second pod: the label is dimmed, pressing it says why and spends nothing
    const two = JSON.parse(p.run(`(() => { const ex = S.exp, P = ex.patch; for (const q of curLive().cr) q.hide = 1; S.pods.push({ id: 'n999', k: P.key, x: P.x, y: P.y - 1, sp: 0, h: 0, g: 'grass', how: 'night', loika: '999', nm: 'Fern', bx: P.x, by: P.y - 1 }); unveil(P.key, P.x, P.y - 1, 3); P.dir = 'up';
      const a = patchAction(), spent0 = S.day.spent, acts0 = ex.actions, pods0 = ex.cargo.pods.length; if (a.run) a.run(); return JSON.stringify({ label: a.label, dim: !!a.dim, msg: FX.notes.map(n => n.text), spent: S.day.spent - spent0, acts: ex.actions - acts0, pods: ex.cargo.pods.length - pods0 }); })()`));
    assert.equal(two.label, "One sleeper only"); assert.ok(two.dim); assert.deepEqual([two.spent, two.acts, two.pods], [0, 0, 0]);
    assert.ok(two.msg.some(t => /The Case holds one sleeper · Elm is in it/.test(t)), JSON.stringify(two.msg));
    assert.deepEqual(p.errors, []);
  });

  test("seed " + seed + ": at first light a pod left on the ground opens: she wakes on that tile and the realm lists her again", () => {
    const p = page(), pick = start(p); setup(p, pick, true); night(p);
    const out = JSON.parse(p.run(`(() => { const pod = S.pods.find(q => q.how === 'night'); const at = { x: pod.x, y: pod.y }; pod.x = pod.bx === pod.x ? pod.x : pod.x;
      S.day.spent = ${DAY.light}; const ex = S.exp; nightPasses(); const c = curLive().cr.find(q => q.id === ${pick.id}), w = S.cr.find(q => q.id === ${pick.id});
      return JSON.stringify({ c: !!c, at: c && c.x === at.x && c.y === at.y, slept: !!w.slept, pods: S.pods.filter(q => q.how === 'night').length, msgs: FX.notes.map(n => n.text) }); })()`));
    assert.ok(out.c && out.at && !out.slept && out.pods === 0, "she is up on her pod's tile: " + JSON.stringify(out));
    assert.ok(!out.msgs.some(t => /woke where her pod lay/.test(t)), "at her bed there is no message");
    // set elsewhere (left by a swap or dropped by a break): she wakes there and the message says so
    const q = page(), pk = start(q); setup(q, pk, true); night(q);
    const o2 = JSON.parse(q.run(`(() => { const pod = S.pods.find(z => z.how === 'night'); const f = freeAround(S.exp.patch.key, pod.x, pod.y, null); pod.x = f.x; pod.y = f.y; S.day.spent = ${DAY.light}; nightPasses();
      const c = curLive().cr.find(z => z.id === ${pk.id}); return JSON.stringify({ c: !!c && c.x === f.x && c.y === f.y, msgs: FX.notes.map(n => n.text) }); })()`));
    assert.ok(o2.c, "she woke on the tile where her pod lay"); assert.ok(o2.msgs.some(t => /Elm woke where her pod lay/.test(t)), JSON.stringify(o2.msgs));
    assert.deepEqual(p.errors, []);
  });

  test("seed " + seed + ": in the Case at first light she sleeps on; End expedition seals her with her id; the realm never spawns her again; the goal moves on", () => {
    const p = page(), pick = start(p); setup(p, pick, true); night(p);
    const out = JSON.parse(p.run(`(() => { const ex = S.exp, P = ex.patch, pod = S.pods.find(q => q.how === 'night'); P.x = pod.x; P.y = pod.y + 1; P.dir = 'up'; patchAction().run(); press('confirm');
      S.day.spent = ${DAY.light}; nightPasses(); const stays = ex.cargo.pods.some(q => q.how === 'night') && !curLive().cr.some(q => q.id === ${pick.id});
      const prev = sealPreview().join(' | '); endExpedition('flag'); const crate = S.bay[S.bay.length - 1], k = pod.k; const w = S.cr.find(q => q.id === ${pick.id});
      delete S.exp; S.exp = null; return JSON.stringify({ stays, prev, crate: crate && crate.pods.map(q => ({ loika: q.loika, nm: q.nm, how: q.how })), home: !!w.home, slept: !!w.slept, homeIds: S.homeIds, best: metBest(), state: herState(${pick.id}) }); })()`));
    assert.ok(out.stays, "unsealed at first light she is still in the Case, asleep"); assert.match(out.prev, /Seals Elm, asleep \+ supplies · crate 1 of 3 \| She wakes at the Station/);
    assert.deepEqual(out.crate, [{ loika: String(pick.id), nm: "Elm", how: "night" }], "the crate holds her with her id");
    assert.ok(out.home && !out.slept && out.homeIds[String(pick.id)], "gone home: the save keeps her id"); assert.ok(!out.best || out.best.id !== String(pick.id), "the goal line moves to the next Loika met, never her");
    assert.match(out.state, /^Gone home · day \d+$/);
    // the realm never spawns her again: a place built anew lists no such creature
    const again = JSON.parse(p.run(`(() => { delete S.exp; startExpedition('weather', G.spawns[0]); const key = ${JSON.stringify(pick.key)}; const live = ensureLive(key); return JSON.stringify(live.cr.some(q => q.id === ${pick.id})); })()`));
    assert.equal(again, false);
    assert.deepEqual(p.errors, []);
  });

  test("seed " + seed + ": the bay full seals nothing: the preview says she wakes here; names: the next free name in her seeded order", () => {
    const p = page(), pick = start(p); setup(p, pick, true); night(p);
    const out = JSON.parse(p.run(`(() => { const ex = S.exp, P = ex.patch, pod = S.pods.find(q => q.how === 'night'); P.x = pod.x; P.y = pod.y + 1; P.dir = 'up'; patchAction().run(); press('confirm');
      while (S.bay.length < BAY) S.bay.push({ id: 'z' + S.bay.length, pods: [], e: 0, d: 0, s: 0 }); const prev = sealPreview().join(' | '); const n0 = S.bay.length; endExpedition('flag');
      return JSON.stringify({ prev, bay: S.bay.length === n0, ground: S.pods.some(q => q.how === 'night' && q.loika === String(${pick.id})), home: !!S.cr.find(q => q.id === ${pick.id}).home }); })()`));
    assert.match(out.prev, /Bay full · Elm wakes here at first light · dock to empty the bay/); assert.ok(out.bay && out.ground && !out.home, "nothing sealed: she lies asleep on the ground");
    const nm = JSON.parse(p.run(`(() => { const c = { id: ${pick.id}, sp: 0, ind: { name: loikaName(S.seed, S.cr.filter(q => q.sp === 0 && q.id < ${pick.id}).length) } }; S.named = {};
      const seeded = freeName(c); S.named = { 'x': seeded }; const second = freeName(c); return JSON.stringify({ seeded, second, same: seeded === c.ind.name, differ: second !== seeded }); })()`));
    assert.ok(nm.same && nm.differ, "she takes her seeded name unless a living Loika has it, then the next free one: " + JSON.stringify(nm));
    assert.deepEqual(p.errors, []);
  });

  test("seed " + seed + ": a player who never feeds sees the built lines to the letter", () => {
    const p = page(), pick = start(p); setup(p, pick, false);
    const out = JSON.parse(p.run(`(() => { S.day.spent = ${nightStart - 40}; FX.notes = []; const fed = fedNames(); const r = closeSleepers(); return JSON.stringify({ fed, r, built: DAY_TEXT.nightNews(5) }); })()`));
    assert.deepEqual(out.fed, []); assert.deepEqual(out.r, { closed: [], woken: [], fed: 0 }); assert.equal(out.built, "Night. Dawn in 5.");
    assert.deepEqual(p.errors, []);
  });
}
