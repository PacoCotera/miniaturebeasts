// walk-look-carry-3: a wild Loika's token is the plain one until her coat is read (a mid note), then it shows her marking (the signed saddled frames) if she has it;
// the partner draws the marking the Station draws; her genome is one code on the walk and at the Station; the signed frames are byte-checked against the art ledger.
//   node --test prototypes/exploration/tests/walk-look-carry.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fixture } from "./walk-fixture.mjs";
import { decodePng } from "../src/pngdecode.mjs";
import { setFrames, wildGenome, wildGs, podGenome } from "../../station/src/genome.mjs";
import { marksShown, saddleShown, drawnLooks } from "../../station/src/looks.mjs";

const FR = JSON.parse(readFileSync(new URL("../../species/frames/language/species-S01.json", import.meta.url), "utf8"));
setFrames([FR]);
const DIR = new URL("../../../art/walk-token-saddle-2/frames/", import.meta.url);
// the signed ledger's sha256 of each frame (walk-token-saddle-3)
const LEDGER = {
  "loika-s01-idle-right-saddled.png": "44b4a1e4f6c9d6bfefb180d87bc631dc22226b15d18a3b1da4416c3de656fbbb",
  "loika-s01-step-a-right-saddled.png": "44b4a1e4f6c9d6bfefb180d87bc631dc22226b15d18a3b1da4416c3de656fbbb",
  "loika-s01-step-b-right-saddled.png": "53d05416014431e7d194af67e648e55a00f1d37e31c58f61b0fddd89ea1976d2",
  "loika-s01-idle-left-saddled.png": "22f0d38051183e7612e5876ec394d9e556c09d380af940f98ffcea1fa90e987a",
  "loika-s01-step-a-left-saddled.png": "22f0d38051183e7612e5876ec394d9e556c09d380af940f98ffcea1fa90e987a",
  "loika-s01-step-b-left-saddled.png": "051eca38a9363895d92944f4f190ed4b091f936a56856ce155454eeaa0890ca3",
};
const sha = b => createHash("sha256").update(b).digest("hex");

test("the signed saddled frames are the ledger's, byte for byte", () => {
  for (const [f, h] of Object.entries(LEDGER)) assert.equal(sha(readFileSync(new URL(f, DIR))), h, f);
});

test("the page's saddled token strings are those frames' pixels; left is the right one flipped", async () => {
  const f = fixture({ partner: 0 });
  const pal = f.run("PALETTE.map(q => q[1])"), hex = h => parseInt(h.slice(1), 16);
  const idx = new Map(pal.map((h, i) => [hex(h), i]));
  const pngPx = async name => { const d = await decodePng(new Uint8Array(readFileSync(new URL(name, DIR)))); const o = []; for (let i = 0; i < 1024; i++) { const a = d.data[i * 4 + 3]; o.push(a < 128 ? -1 : idx.get((d.data[i * 4] << 16) | (d.data[i * 4 + 1] << 8) | d.data[i * 4 + 2])); } return o; };
  const page = (pose, fr) => Array.from(f.run(`creatureArt(0, '${pose}', ${fr}, 1, false, true).p`));
  assert.deepEqual(page("idle", 0), await pngPx("loika-s01-idle-right-saddled.png"));
  assert.deepEqual(page("step", 0), await pngPx("loika-s01-step-a-right-saddled.png"));
  assert.deepEqual(page("step", 1), await pngPx("loika-s01-step-b-right-saddled.png"));
  const flip = a => { const o = []; for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) o.push(a[y * 32 + 31 - x]); return o; };   // the left frame, as blit flips it
  assert.deepEqual(flip(page("idle", 0)), await pngPx("loika-s01-idle-left-saddled.png"));
  assert.deepEqual(flip(page("step", 1)), await pngPx("loika-s01-step-b-left-saddled.png"));
  const plain = Array.from(f.run("creatureArt(0, 'idle', 0, 1, false, false).p"));
  assert.notDeepEqual(plain, page("idle", 0), "plain is not saddled");
});

test("her genome is one code: the same Loika, the same genome, on the walk and at the Station; the keep is only whether she shows", () => {
  const seed = 3, a = wildGenome(FR, seed, 9001), b = wildGenome(FR, seed, 9001);
  assert.deepEqual(a, b); assert.equal(wildGs(seed, 9001), wildGs(seed, 9001)); assert.notEqual(wildGs(seed, 9001), wildGs(seed, 9002));
  assert.deepEqual(a, podGenome(FR, wildGs(seed, 9001), 2), "the wild draw is the pod draw at version 2, from her own gs");
  let shown = 0; for (let i = 0; i < 400; i++) { const g = wildGenome(FR, seed, 1000 + i); if (marksShown(FR, { genome: g, read: ["coat"] })) { shown++; assert.deepEqual(g.loci["appearance.marking-switch"], ["on", "on"]); } }
  assert.ok(shown > 20 && shown < 90, "about 12% show it: " + shown);   // 0.35^2 = 12.25%
  const g = wildGenome(FR, seed, 1000 + [...Array(400).keys()].find(i => marksShown(FR, { genome: wildGenome(FR, seed, 1000 + i), read: ["coat"] })));
  assert.equal(marksShown(FR, { genome: g, read: [] }), false, "unread: the Station draws nothing");
  assert.notEqual(drawnLooks(FR, { genome: g, read: ["coat"] }).markings, "plain");
});

test("a scripted day: a marked Loika plain until a mid note reads her coat, saddled after; an unmarked one plain throughout; the partner saddled if the Station draws it", () => {
  const seed = 3, f = fixture({ partner: 0, seed });
  const P = f.P(), at = f.spot(3, 5, P), at2 = f.spot(3, 5, P, 1);
  let markedId = 0, plainId = 0;
  for (let i = 9001; i < 9100 && !(markedId && plainId); i++) { const s = saddleShown(FR, { genome: wildGenome(FR, f.run("S.seed"), i), read: ["coat"] }); if (s && !markedId) markedId = i; if (!s && !plainId) plainId = i; }
  const table = {}; for (let i = 9001; i < 9100; i++) table[i] = saddleShown(FR, { genome: wildGenome(FR, f.run("S.seed"), i), read: ["coat"] }) ? 1 : 0;
  f.run(`WILD.ok = true; WILD.shows = (seed, id) => (${JSON.stringify(table)})[id] === 1; WILD.partner = id => false`);
  f.run("__nid = " + (markedId - 1)); const m = f.add(0, at.x, at.y, { ind: { hs: [] } });
  assert.equal(m, markedId); f.run(`__nid = ${plainId - 1}`); const u2 = f.add(0, at2.x, at2.y, { ind: { hs: [] } }); assert.equal(u2, plainId);
  const sad = id => f.run(`wildSaddled(curLive().cr.find(q => q.id === ${id}))`);
  assert.equal(sad(m), false, "marked, coat unread: the plain token");
  assert.equal(sad(u2), false);
  f.run(`habRecord(S.habits, ${m}, 'calm'); habNote(habRecord(S.habits, ${m}, 'calm'), 'mid', true, 'coat')`);   // a mid note gives her coat
  f.run(`habNote(habRecord(S.habits, ${u2}, 'calm'), 'mid', true, 'coat')`);
  assert.equal(sad(m), true, "marked, coat read by a mid note: saddled");
  assert.equal(sad(u2), false, "unmarked: plain after the read too");
  assert.deepEqual(f.run("JSON.parse(JSON.stringify(S.looks))")[m], 1, "the keep is 0 or 1 only");
  // a far note does not give her coat
  const far = f.run(`(() => { const r = habRecord(S.habits, 777, 'calm'); habNote(r, 'far', true, 'coat'); return coatRead(777); })()`);
  assert.equal(far, false);
  // the partner: the Station's drawn marking is handed onto ex.pt at set-out
  f.run("WILD.partner = id => true"); f.run("S.exp.pt.mk = WILD.partner(S.exp.pt.id) ? 1 : 0");
  assert.equal(f.run("S.exp.pt.mk"), 1);
  // a failed load: every token is plain, the walk goes on
  f.run("WILD.ok = false; S.looks = {}; S.habits = {}"); f.run(`habNote(habRecord(S.habits, ${m}, 'calm'), 'mid', true, 'coat')`);
  assert.equal(sad(m), false, "no shared code: plain");
});

test("the page loads the shared code (the one wildGenome and the Station's marksShown)", () => {
  const src = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(src, /g\.wildGenome\(fr, seed, id, g\.markedLoika\(/); assert.match(src, /L\.saddleShown\(fr, m\)/);
});

test("only the saddle draws saddled: a spotted or banded marking stays the plain token (walk-look-carry-4)", () => {
  let other = 0, saddle = 0;
  for (let i = 0; i < 600; i++) {
    const m = { genome: wildGenome(FR, 3, 1000 + i), read: ["coat"] }, k = drawnLooks(FR, m).markings;
    if (saddleShown(FR, m)) { saddle++; assert.equal(k, "saddle"); } else if (marksShown(FR, m)) { other++; assert.notEqual(k, "saddle"); }
  }
  assert.ok(saddle > 0 && other > 0, "both kinds occur: " + saddle + " saddle, " + other + " other");
});

test("shake, alert and eat have no 32px Loika frames: the fallback is HER idle, saddled when she is saddled (walk-look-carry-5)", () => {
  const f = fixture({ partner: 0 });
  const px = (pose, fr, sad) => Array.from(f.run(`creatureArt(0, '${pose}', ${fr}, 1, false, ${sad}).p`));
  const idleSad = px("idle", 0, true), idlePlain = px("idle", 0, false);
  assert.notDeepEqual(idleSad, idlePlain, "the saddled idle differs from the plain one");
  for (const [pose, fr] of [["shake", 0], ["shake", 1], ["approach", 0], ["eat", 0], ["eat", 1]]) {
    assert.deepEqual(px(pose, fr, true), idleSad, pose + fr + " keeps her saddle");
    assert.deepEqual(px(pose, fr, false), idlePlain, pose + fr + " plain stays plain");
  }
});
