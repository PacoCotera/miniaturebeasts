// #156 QA verify-live-649: a wild Loika's name tag is drawn after the tree crowns, so a crown never covers it.
//   node --test prototypes/exploration/tests/tag-over-crown-649.test.mjs
// (1) the place view draws the tags after the crowns (bk.drawCanopy, the trunk crowns loop) and the above-crown items, before the pods;
// (2) in the real place view her tag is still drawn once, in the same place (the spot is unchanged).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { makePage } from "./page-harness.mjs";
import { syntheticPieces, SYNTH_TONE, fnv as fnvStr } from "../tools/world-vectors.mjs";

const SYN = syntheticPieces().map(q => ({ ...q, fill: parseInt(fnvStr(q.name), 16) % 40 + 4 }));

test("the place view draws the name tags after the crowns and the above-crown items, before the pods", () => {
  const src = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const at = (s) => { const i = src.indexOf(s); assert.ok(i > 0, "found: " + s); assert.equal(src.indexOf(s, i + 1), -1, "once: " + s); return i; };
  const tag = at("if (RT.tag) drawTag(tagSpot(RT.tag, { W, H, o, ts, inS, see, PX, PY }));"), tagW = at("if (RT.tagW) drawTag(tagSpot(RT.tagW, { W, H, o, ts, inS, see, PX, PY }));");
  const canopy = at("if (bk) bk.drawCanopy(g, bOrg, bclk"), trunks = at("const crown = ts === 48 && treeCanopy(lay, i, under ? 1 : 0, !lightAt"), above = at("aboveCrowns.sort((a, b) => a.y - b.y).forEach"), pods = at("for (const p of S.pods) if (p.k === P.key && !p.h && p.x >= 0)");
  for (const t of [tag, tagW]) assert.ok(t > canopy && t > trunks && t > above && t < pods, "a tag is drawn after every crown, before the pods");
});

test("her tag is still drawn once, under her", () => {
  const p = makePage({ gen: 7, store: {}, console: "collect", els: true, canvas: true, raf: "count" });
  p.run(`atlasInstall(${JSON.stringify(SYN)}.map(q => { const px = new Int16Array(q.w * q.h).fill(q.fill);
    for (let y = 0; y < q.h; y++) for (let x = 0; x < q.w; x++) if (!x || !y || x === q.w - 1 || y === q.h - 1) px[y * q.w + x] = C.ink; return Object.assign(q, { px }); }), null, ${JSON.stringify(SYNTH_TONE)})`);
  p.run("newWorld(13); TEST.calm = true; startExpedition('weather', G.spawns[0]); HUD.ok = true; enterPatch(String(S.exp.pos)); S.phase = 'patch'; S.known = [0];");
  p.run("{ for (const c of curLive().cr) c.hide = 1; S.named = {}; S.metIds = []; S.book = []; S.pages = {}; }");
  p.run(`{ const P = S.exp.patch, c = curLive().cr.find(q => q.id === 36); P.dir = 'up'; c.x = P.x; c.y = P.y - 3; c.st = 'idle'; c.ease = 0; c.hide = 0;
    S.named[36] = 'Cinder'; S.metIds.push('36'); S.veil[P.key] = new Array(PH).fill(0x0fffffff); RT.pl = null; RT.key = null; NOW = 5000; FX.msg = ''; }`);
  p.run("var SPOTS = []; { const d0 = drawTag; drawTag = s => { SPOTS.push(s); d0(s); }; }");
  p.run("scr.px().fill(-1); render(5)");
  const s = JSON.parse(p.run("JSON.stringify(SPOTS)"));
  assert.equal(s.length, 1, "one tag drawn");
  assert.ok(s[0] && s[0].wild, "her tag");
  assert.equal(p.errors.length, 0, String(p.errors));
});
