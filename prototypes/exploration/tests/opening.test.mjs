// The Companion's opening screen (designer's scheme T-20261108-companion-opening, B1 + B2): the front door between expeditions.
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decodePng } from "../../places/src/png.mjs";
import { compareGolden } from "../../places/src/golden.mjs";

const plain = x => JSON.parse(JSON.stringify(x));
const mib = (id, name, sp, o = {}) => Object.assign({ id, name, sp, born: 0, outings: 0, notches: 0, bonded: false, care: 0, tends: 0, tendDay: null, grownTurn: 0, mem: null, habitsDone: [] }, o);
// The page between expeditions with a canvas to read back; reduced motion, so every frame is the first.
function opening(seed = 14, { carried = [], known = [] } = {}) {
  const p = makePage({ console: "silent", els: true, raf: 1, canvas: true, gen: 6 });
  p.run(`newWorld(${seed}); RM.matches = true; S.known = ${JSON.stringify(known)};`);
  p.run(`S.mibis = ${JSON.stringify(carried)}; S.carried = ${JSON.stringify(carried.map(m => m.id))}; S.lead = ${carried.length ? carried[0].id : null}; S.phase = 'setup'; S.ui.sel = 0;`);
  return p;
}
const draw = p => { p.run("FX.msg = ''; scr.px().fill(-1); drawSetup(0);"); return p.run("scr").px(); };
// The three of the scheme's returning player: Pip (Loika, grown), Moss (Tuikis, grown) and Dot (an Untuva, young).
const THREE = [mib(1, "Pip", 0), mib(2, "Moss", 1), mib(3, "Dot", 2, { grownTurn: null, born: 4 })];
// The returning player: expedition 5, the Probe's last start, four places found and three been into, one crate sealed, last turn's line.
function returning(seed = 14) {
  const p = opening(seed, { carried: THREE, known: [0, 1, 2] });
  p.run(`S.turn = 5; S.expN = 5; S.bay = [{ id: 1, n: 1, pods: [], e: 0, d: 0, s: 0 }]; S.report = { lines: ['A storm charged stones in the wood.'], n: 4 };
    const s0 = G.spawns[0]; S.ui.lastPos = s0; const q = cxy(s0); let k = 0;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const x = q.x + dx, y = q.y + dy; if (x < 0 || y < 0 || x >= MW || y >= MH) continue; const c = y * MW + x; S.revealed[c] = 1; if (Math.abs(dx) > 2 || Math.abs(dy) > 2) continue; S.visited[c] = 1;
      if (passable(c) && G.land[c] !== L.WATER) { if (k < 4) S.called[c] = 1; else if (k < 7) S.veil[String(c)] = [1]; k++; } }`);
  return p;
}
const said = p => { p.run("globalThis.__t = []; if (!globalThis.__wrapped) { globalThis.__wrapped = 1; text = (o => function (s, ...a) { __t.push(String(s)); return o.call(this, s, ...a); })(text); } FX.msg = ''; drawSetup(0);"); return plain(p.run("__t")); };
// The pixels of a picture, as they must stand on the screen at (x, y).
const stands = (p, pb, x, y) => { const px = p.run("scr").px(), W = p.run("SCR_W"); let n = 0, bad = 0; for (let j = 0; j < pb.h; j++) for (let i = 0; i < pb.w; i++) { const v = pb.p[j * pb.w + i]; if (v < 0) continue; n++; if (px[(y + j) * W + x + i] !== v) bad++; } return { n, bad }; };

test("B1: a fresh world draws one tab and the pod, its three lines and the dark line; no strip, no counts, no world inset", () => {
  const p = opening(), t = said(p);
  assert.ok(t.includes("Weather") && !t.includes("Deep ground"), "Weather alone: " + t);
  assert.deepEqual(t.filter(s => /^(Your first walk|Find a pod and bring it home\.|The Station grows it\.)$/.test(s)), ["Your first walk", "Find a pod and bring it home.", "The Station grows it."]);
  assert.ok(t.includes("Tracks in the dark · start at one"), "the first-time line");
  assert.ok(t.includes("charge stones"), "the Weather tab's first-time line");
  for (const s of t) assert.ok(!/Probe tier|World ·|fog|of \d+ places|Seen|Your world|last start|hatch|egg|born|No partner/i.test(s), "no such line: " + s);
  assert.equal(p.run("OPEN_TEXT.firstGrows"), "The Station grows it.");
});

test("B1: a world that knows a Tuikis draws two tabs; Deep ground appears once a digger is met, the burrow seen or a grown digger is with you", () => {
  assert.deepEqual(plain(said(opening(14, { known: [1] })).filter(s => s === "Weather" || s === "Deep ground")), ["Weather", "Deep ground"]);
  assert.ok(said(opening(14, { known: [1] })).includes("needs a Tuikis"), "known, none with you: dimmed");
  assert.ok(said(opening(14, { known: [0] })).every(s => s !== "Deep ground"), "a Loika is no digger");
  const burrow = opening(); burrow.run("S.revealed[G.gate] = 1;"); assert.ok(said(burrow).includes("Deep ground"), "the burrow seen");
  const along = opening(14, { carried: [THREE[1]] }); assert.ok(said(along).includes("Moss digs"), "a grown Tuikis along: the line names it");
});

test("B1: Pip, Moss and Dot carried: the 3x Loika stands at (8, 458) and two 1x tokens at the top right, on their rings", () => {
  const p = returning(); draw(p);
  const pip = p.run("creatureArt(0, 'idle', 0, 3, false)"), r = stands(p, pip, 8, 458); assert.ok(r.n > 500 && r.bad === 0, "the 3x Loika at (8, 458): " + JSON.stringify(r));
  const moss = p.run("creatureArt(1, 'idle', 0, 1, false)"), dot = p.run("creatureArt(2, 'idle', 1, 1, true)");
  const a = stands(p, moss, 398, 452), b = stands(p, dot, 354, 452); assert.ok(a.n > 50 && a.bad === 0, "Moss at 1x top right " + JSON.stringify(a)); assert.ok(b.n > 50, "Dot's token is there");
  const t = said(p); assert.ok(t.includes("Pip") && t.includes("adult") && t.includes("leads"), "name, stage, leads: " + t);
  assert.ok(t.includes("A storm charged stones in the wood."), "last turn's first line");
  assert.ok(t.includes("storm east") || t.includes("storm west"), "the Weather tab's line");
  assert.ok(t.includes("needs a Tuikis"), "Deep ground still needs the Tuikis to lead until B3 (digger() along): the tab says so");
  assert.ok(!t.some(s => /crate/.test(s)), "the crate panel is gone from the screen (the bottom line says it)");
});

test("B1: the rider, no one with you, and the first-time place", () => {
  const rider = opening(14, { carried: [THREE[2]], known: [2] }), t = said(rider);
  assert.ok(t.includes("Dot") && t.includes("young"), "the juvenile's own place: " + t);
  const nobody = opening(14, { carried: [] }); nobody.run("S.mibis = [" + JSON.stringify(THREE[0]) + "]; S.carried = [];");
  assert.ok(said(nobody).includes("No one with you"), "mibis, none with you");
});

test("B1: Up and Down skip Deep ground while it is not shown", () => {
  const p = opening(); p.key("down"); assert.equal(p.run("S.ui.sel"), 2); p.key("up"); assert.equal(p.run("S.ui.sel"), 0);
  const q = opening(14, { known: [1] }); q.key("down"); assert.equal(q.run("S.ui.sel"), 1); q.key("down"); assert.equal(q.run("S.ui.sel"), 2);
});

test("B1: the two named art slots are registered, and the built stand-ins play until their files are in", () => {
  const p = opening(), reg = plain(p.run("CARE_ASSETS.filter(a => /^c-open-/.test(a.id))"));
  assert.deepEqual(reg.map(a => [a.id, a.w, a.h, a.status]), [["c-open-night", 48, 48, "stand-in"], ["c-open-pod-96", 96, 96, "stand-in"]]);
  assert.equal(p.run("openArt('c-open-pod-96')"), null, "no file yet: the built pod");
  draw(p); const pod = p.run("podArt('bone', 3)"), r = stands(p, pod, 32, 488); assert.ok(r.n > 300 && r.bad === 0, "the field pod at 3x: " + JSON.stringify(r));
});

// ---- B2: the land in the frame ----
test("B2: a fresh world: the frame is night, each light's own cell is land in the dark table, and drawing reveals nothing", () => {
  const p = opening(); p.run("ensureMap();");
  const before = JSON.stringify(p.run("[S.revealed, S.visited, S.veil, S.called]"));
  const px = draw(p), W = p.run("SCR_W"), night = p.run("C.night"), ink = p.run("C.ink");
  assert.ok([night, ink].includes(px[198 * W + 225]), "the frame's centre pixel is night");
  const q = plain(p.run("(() => { const o = openFrame(); return { cs: o.cs, first: o.first, spawns: G.spawns.map(c => o.at(c)), g: o.glimpse }; })()"));
  assert.equal(q.first, true); assert.equal(q.g.length, 5, "the five lights"); assert.equal(q.cs, 22, "22 px cells on seed 14");
  const cv = p.run("landImage({ X0: openFrame().X0, Y0: openFrame().Y0, w: 430 + 22, h: 316 + 22, cs: 22, glimpse: G.spawns })").px(), ox = p.run("openFrame().ox"), oy = p.run("openFrame().oy"), CW = 430 + 22;
  for (const s of q.spawns) { let land = 0; for (let y = 7; y < 15; y++) for (let x = 7; x < 15; x++) { const v = cv[(s.y - oy + y) * CW + (s.x - ox + x)]; if (v !== night && v !== ink) land++; } assert.ok(land >= 25, "a land colour at the light's cell: " + land + " of 64"); }
  const edge = p.run("C.void"); let all = 0; for (let i = 0; i < cv.length; i++) if (cv[i] !== night && cv[i] !== ink && cv[i] !== edge) all++; assert.ok(all < 5 * 22 * 22 * 3, "land only round the five lights (" + all + " pixels)");
  assert.equal(JSON.stringify(p.run("[S.revealed, S.visited, S.veil, S.called]")), before, "S.revealed and the rest are unchanged by drawing");
  assert.ok(p.run("S.revealed.every(v => !v)"), "still a first placement");
});

test("B2: the reach fits the frame: cell 52 at tier 1, 31 at tier 2; the start flag is on the land", () => {
  const p = returning(); assert.equal(p.run("openFrame().cs"), 52); assert.equal(p.run("tierOf().range"), 2);
  const s = p.run("openFrame().at(S.ui.lastPos)"); draw(p);
  const f = p.run("up2('flag', ICON.flag())"), r = stands(p, f, Math.round(s.x + 26 - f.w / 2 + 2), Math.round(s.y + 26 - f.h + 4)); assert.ok(r.n > 50 && r.bad === 0, "the flag at 2x: " + JSON.stringify(r));
  p.run("S.tier = 2;"); assert.equal(p.run("tierOf().range"), 4); assert.equal(p.run("openFrame().cs"), 31); draw(p);
  const o = plain(p.run("(() => { const o = openFrame(); return [o.WX, o.WY, o.WW, o.WH]; })()")); assert.deepEqual(o, [10, 40, 430, 316]);
});

test("B2: the painting is cached: two frames, one paint", () => {
  const p = returning(); p.run("drawSetup(0);"); const a = p.run("LAND_CACHE.cv"); p.run("drawSetup(0.5);"); assert.equal(p.run("LAND_CACHE.cv"), a, "the same canvas");
  p.run("S.revealed[S.ui.lastPos] = 0;"); p.run("drawSetup(0.5);"); assert.notEqual(p.run("LAND_CACHE.cv"), a, "a changed cell paints again");
});

test("B2: the lost-plates chip only when a plate is lost; the docked band when docked", () => {
  const p = returning(); p.run("globalThis.__s = 0; shieldBars = (o => function (...a) { __s++; return o.apply(this, a); })(shieldBars);");
  p.run("S.shield = null; drawSetup(0);"); assert.equal(p.run("__s"), 0, "whole: no plates on this screen");
  p.run("S.shield = 1; drawSetup(0);"); assert.equal(p.run("__s"), 1, "one lost: the chip");
  p.run("S.shield = null; isDocked = () => true;"); assert.ok(said(p).includes("Docked · lift to explore"), "docked: the band");
});

// ---- The stills and the marks, in real Chromium (PW_DIR; skipped without it): the marks need the baked places' views, which only a browser has ----
const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright")); } catch { chromium = null; }
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png" };
const skip = !chromium && "playwright is not installed (set PW_DIR)";

test("B1/B2 in Chromium: the first-time and the returning screens (goldens opening-first.png, opening-returning.png at 1x); a found place has its colour mark, a been-into place the slate one", { skip }, async (t) => {
  let browser; try { browser = await chromium.launch(); } catch (e) { t.skip("no Chromium: " + String(e.message).split("\n")[0]); return; }
  const server = createServer((req, res) => {
    let p = path.join(root, decodeURIComponent(req.url.split("?")[0]));
    if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
    if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
    let body = readFileSync(p);
    if (p.endsWith("exploration/index.html")) body = Buffer.from(body.toString().replace("window.__mb = { ", "window.__mb = { openFrame, tierOf, "));   // the frame's geometry, for the test only
    res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(body);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${server.address().port}/prototypes/exploration/index.html`;
  try {
    const page = await (await browser.newContext({ viewport: { width: 450, height: 600 }, reducedMotion: "reduce" })).newPage();
    const errors = []; page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${url}?seed=14`); await page.waitForTimeout(1500);
    const golden = (name, img) => { const r = compareGolden(path.join(path.dirname(fileURLToPath(import.meta.url)), "golden", name), img); assert.ok(r.ok, r.message); };
    const shot = async () => { await page.waitForTimeout(700); return decodePng(Buffer.from((await page.evaluate(() => window.__mb.capture())).split(",")[1], "base64")); };
    assert.equal(await page.evaluate(() => window.__mb.S.phase), "setup");
    await page.evaluate(() => { const m = window.__mb; m.S.revealed.fill(0); m.S.visited.fill(0); m.S.mibis = []; m.S.carried = []; m.S.report = null; m.S.known = []; m.S.bay = []; m.S.ui.lastPos = null; m.S.ui.sel = 0; m.FX.msg = ""; });
    const first = await shot(); golden("opening-first.png", first);
    const rev = await page.evaluate(() => window.__mb.S.revealed.some(v => v)); assert.equal(rev, false, "the glimpse revealed nothing");
    // the returning player: Pip (Loika), Moss (Tuikis), Dot (a young Untuva); expedition 5; four places found and three been into; one crate; last turn's line
    await page.evaluate(() => { const m = window.__mb, S = m.S, mk = (id, name, sp, o) => Object.assign({ id, name, sp, born: 0, outings: 0, notches: 0, bonded: false, care: 0, tends: 0, tendDay: null, grownTurn: 0, mem: null, habitsDone: [] }, o);
      S.turn = 5; S.expN = 5; S.known = [0, 1, 2]; S.mibis = [mk(1, "Pip", 0), mk(2, "Moss", 1), mk(3, "Dot", 2, { grownTurn: null, born: 4 })]; S.carried = [1, 2, 3]; S.lead = 1;
      S.bay = [{ id: 1, n: 1, pods: [], e: 0, d: 0, s: 0 }]; S.report = { lines: ["A storm charged stones in the wood."], n: 4 };
      const s0 = m.G.spawns[0]; S.ui.lastPos = s0; const qx = s0 % m.MW, qy = Math.floor(s0 / m.MW); let k = 0;
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const x = qx + dx, y = qy + dy; if (x < 0 || y < 0 || x >= m.MW || y >= m.MH) continue; const c = y * m.MW + x; S.revealed[c] = 1; if (Math.abs(dx) > 2 || Math.abs(dy) > 2) continue; S.visited[c] = 1;
        if (m.passable(c) && m.G.land[c] !== m.L.WATER) { if (k < 4) S.called[c] = 1; else if (k < 7) S.veil[String(c)] = [1]; k++; } } });
    const ret = await shot(); golden("opening-returning.png", ret);
    const cs = await page.evaluate(() => window.__mb.openFrame().cs); assert.equal(cs, 52, "tier 1: the reach fits at 52");
    // the marks: the mark's own pixels stand on the land (a sign may cover a few); found in colour, been the slate silhouette
    const marks = await page.evaluate(() => { const m = window.__mb, o = m.openFrame(), out = {};
      for (let c = 0; c < m.MW * m.MH; c++) { if (!m.S.revealed[c]) continue; const a = o.at(c), mk = m.cellMark(c, a.x, a.y, o.cs, 18, true); if (!mk) continue;
        const kind = m.S.called[c] ? "found" : m.S.veil[String(c)] ? "been" : null; if (!kind || out[kind]) continue;
        const px = []; for (let j = 0; j < mk.mk.h; j++) for (let i = 0; i < mk.mk.w; i++) { const v = mk.mk.p[j * mk.mk.w + i]; if (v >= 0) px.push([mk.x + i, mk.y + j, m.RGB[v]]); }
        out[kind] = { same: mk.mk === m.placeMark(m.G.land[c], kind, 18), px, slate: px.filter(([, , rgb]) => rgb.join() === m.RGB[m.C.slate].join()).length }; }
      return out; });
    for (const kind of ["found", "been"]) { const r = marks[kind]; assert.ok(r, "a " + kind + " cell with a mark"); assert.ok(r.same, "the " + kind + " mark");
      let bad = 0; for (const [x, y, rgb] of r.px) { const o = (y * ret.w + x) * 4; if (ret.data[o] !== rgb[0] || ret.data[o + 1] !== rgb[1] || ret.data[o + 2] !== rgb[2]) bad++; }
      assert.ok(r.px.length > 20 && bad <= r.px.length * 0.15, kind + " mark drawn on the land: " + bad + " of " + r.px.length + " differ"); }
    assert.ok(marks.been.slate > marks.been.px.length * 0.5, "been: the slate silhouette"); assert.ok(marks.found.slate < marks.found.px.length * 0.5, "found: in colour");
    assert.deepEqual(errors, []);
  } finally { await browser.close(); server.close(); }
});
