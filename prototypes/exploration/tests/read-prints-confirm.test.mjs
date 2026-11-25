// ui-read-prints-1 (QA verify-live-134 item 6): ✓ on "Read her prints" marks them read, adds the Log entry and shows its line,
// whether the pawn faces open ground or a blocked tile (the bottom line names the prints either way)
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

const page = () => makePage({ gen: 7, console: "collect", els: true, canvas: true, raf: "count" });
const find = `(() => { for (const c of [...new Set(S.cr.filter(q => q.sp === 0).map(q => q.c))]) { if (!G.comp[c] || G.land[c] === L.WATER) continue; const key = String(c), lay = layout(key), live = ensureLive(key);
  for (const q of live.cr) if (q.sp === 0 && q.ind) return JSON.stringify({ key, id: q.id }); delete S.exp.live[key]; } return 'null'; })()`;

for (const blocked of [false, true]) test("✓ on Read her prints runs it (facing " + (blocked ? "a blocked tile" : "open ground") + "): read, in the Log, its line shows", () => {
  const p = page(); p.run("newWorld(7); TEST.calm = true; startExpedition('weather', G.spawns[0]);");
  const pick = JSON.parse(p.run(find)); assert.ok(pick);
  const out = JSON.parse(p.run(`(() => {
    const key = ${JSON.stringify(pick.key)}; S.exp.pos = key; enterPatch(key); const live = curLive(), c = live.cr.find(q => q.id === ${pick.id}), P = S.exp.patch;
    S.known = [0, ...S.known.filter(k => k !== 0)]; live.strike = null; S.exp.stray = null; S.exp.fog = null; S.phase = 'patch'; RT.view = null; S.ui.swap = null;
    let pr = null;
    for (const spent of [60, 120, 200, 260, 330]) { S.day.spent = spent; const l = printsHere().find(q => q.mark); if (l) { pr = l; break; } }
    if (!pr) return JSON.stringify({ none: 1 });
    c.gone = 1; const m = pr.mark || pr.stand; P.x = m.x; P.y = m.y; FX.notes = []; FX.msg = ''; FX.lockUntil = 0;
    let hit = 0; for (const d of ['down', 'up', 'left', 'right']) { P.dir = d; const f = frontOf(P), o = occupant(P.key, f.x, f.y, 'player'); if (${blocked} ? o && o.type === 'tile' : !o) { hit = 1; break; } }
    if (!hit) return JSON.stringify({ none: 1 });
    const act = patchAction(), before = { read: !!habDay()[readKey(c.id, pr.h)], teach: loikaTeach() };
    press('confirm');
    return JSON.stringify({ label: act.label, before, read: !!habDay()[readKey(c.id, pr.h)], book: (S.book || []).filter(b => b.kind === 'prints').length, msg: FX.msg });
  })()`));
  if (out.none) return;   // this seed has no such spot
  assert.match(out.before.teach, /Read her prints/, "the bottom line names the prints");
  assert.equal(out.before.read, false);
  assert.equal(out.label, "Read her prints", "✓ is the read: " + JSON.stringify(out));
  assert.equal(out.read, true, "the prints are marked read");
  assert.equal(out.book, 1, "the Log has its entry");
  assert.match(out.msg, /Prints in the grass|here|bolted|left/i, "the line shows: " + JSON.stringify(out));
  assert.deepEqual(p.errors, []);
});
