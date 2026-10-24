// The Library's Level 2 sheet generator (station/src/library-sheet.mjs, library.json l2), in Node: the geometry of all 16 species (plates per the slot table, the tier, S_form, the form's ink inside formRoom,
// the leader routes and radii), the surfaces' pixels, the page heights, the met-only sheet, a shut plate, the Hiljan, the colour chips, the comma form and the wrap rule, the Loika's legacy "plain",
// the layout facts, the requests and the cache (exactly the sheet, one lit variant and one page). Each render's time is printed.
//   node --test prototypes/station/tests/library-sheet.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as L from "../src/library-sheet.mjs";
import { model, layout, drawForm } from "../src/specimen.mjs";
import { createCanvas } from "../src/paint2d.mjs";
import { RGB, C } from "../src/pixels.mjs";
import { sheet as sheetOf, disc as discReq, req as collector, sheetId as idOf } from "../src/views/requests.mjs";
const SPEC = { l2: L.L2 }, sheetReq = (rq) => (fr, input, lit) => sheetOf(rq)(SPEC, input, L.speciesFacts(fr), lit), sheetId = (fr, input) => idOf(input, L.speciesFacts(fr));

const here = path.dirname(fileURLToPath(import.meta.url)), frames = path.resolve(here, "../../workbench/frames");
const frameOf = (id) => JSON.parse(readFileSync(path.join(frames, `species-${id}.json`), "utf8"));
const IDS = Array.from({ length: 16 }, (_, i) => "S" + String(i + 1).padStart(2, "0")), F = Object.fromEntries(IDS.map((id) => [id, frameOf(id)]));
const mid = JSON.parse(readFileSync(path.join(here, "fixtures/specimen/states/mid.json"), "utf8"));
const tok = (n) => RGB[C[n]], [SX, SY] = L.L2.sheet.rect;
const at = (p, x, y) => { const o = (y * p.w + x) * 4; return [p.rgba[o], p.rgba[o + 1], p.rgba[o + 2]]; };
const all = (fr, k = 1) => { const s = {}; for (const ch of fr.chapters) for (const t of ch.traits) s[t.id] = t.looks.slice(0, Math.ceil(t.looks.length * k)); return s; };
const found = (id, f, extra = {}) => ({ species: id, mode: "found", found: f, shut: [], fresh: [], readOnce: [], sealedOpen: false, ...extra });
const met = (id) => ({ species: id, mode: "met", found: {}, shut: [], fresh: [], readOnce: [], sealedOpen: false });
const timed = (name, p) => { console.log(`# ${name}: rendered in ${p.ms.toFixed(0)} ms (${p.w} x ${p.h})`); return p; };

// ---- geometry, all 16 species ----
const SFORM = { S01: 0.94, S02: 0.94, S07: 0.94, S11: 0.94, S03: 0.871, S04: 0.878, S05: 0.884, S06: 0.876, S08: 0.887, S09: 0.879, S10: 0.803, S12: 0.799, S13: 0.807, S14: 0.789, S15: 0.851, S16: 0.851 };
const TIER = { S01: ["L", 1], S04: ["L", 1], S05: ["L", 2], S06: ["L", 2], S12: ["L", 2], S14: ["L", 2], S02: ["S", 2], S08: ["S", 2], S10: ["S", 2], S13: ["S", 2], S07: ["S", 3], S11: ["S", 3], S15: ["S", 3], S16: ["S", 3], S03: ["S", 4], S09: ["S", 4] };
const ROUTES = { 4: "LLLZ", 5: "ILLII", 6: "ILLIII", 7: "ILLIZZI", 8: "LLLIIIZZ" };

test("S_form, a fact of the species, is min(0.94, floor(1000 * 152 / N) / 1000) and comes out as the ruled values", () => {
  for (const id of IDS) assert.ok(Math.abs(L.formScale(F[id]) - SFORM[id]) <= 0.001, `${id}: S_form ${L.formScale(F[id])}, expected ${SFORM[id]}`);
});
test("the tier is a fact of the species (slot looks only): L for the Loika, Hiljan, Tepor, Pesko, Peplos and Usvel, S for the rest, in the ruled number of rows", () => {
  for (const id of IDS) { const t = L.tierOf(F[id]); assert.deepEqual([t.id, t.rowsUsed], TIER[id], id); }
});
test("plates follow the slot table in frame order; the Loika's Coat [16,50], Face [524,50], Movement [524,380], Stamina [16,380]", () => {
  const P = L.L2.sheet.plates;
  for (const id of IDS) { const f = L.speciesFacts(F[id]), slots = P.slots[String(F[id].chapters.length)];
    assert.deepEqual(f.plates.map((p) => p.chapter), F[id].chapters.map((c) => c.id), id);
    f.plates.forEach((p, i) => { assert.equal(p.slot, slots[i]); assert.equal(p.rect[0], P.x[p.slot[0]]); assert.deepEqual(p.rect.slice(2), P.size); });
    const rects = f.plates.map((p) => p.rect); for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) { const [a, b] = [rects[i], rects[j]]; assert.ok(a[0] + a[2] <= b[0] || b[0] + b[2] <= a[0] || a[1] + a[3] <= b[1] || b[1] + b[3] <= a[1], `${id}: plates ${i} and ${j} overlap`); } }
  assert.deepEqual(L.speciesFacts(F.S01).plates.map((p) => [p.chapter, p.rect.slice(0, 2)]), [["coat", [16, 50]], ["face", [524, 50]], ["movement", [524, 380]], ["stamina", [16, 380]]]);
});
test("leaders: the routes in slot-table order per chapter count; every pixel at least 164 from the centre (within the half pixel the dot is rounded by); 0 crossings and 0 leaders through another plate", () => {
  for (const id of IDS) { const fr = F[id], m = layout(model(fr, {})), ps = L.platesOf(m), lead = ps.map((p) => L.leaderOf(m, p));
    assert.equal(lead.map((r) => r.kind).join(""), ROUTES[fr.chapters.length], id);
    const owner = new Map();
    lead.forEach((r, k) => { const px = L.routePixels(r.pts), last = r.pts[r.pts.length - 1], p = ps[k];
      assert.deepEqual(last, [p.side === "L" ? 172 : 523, p.y + 35], `${id}: the last segment ends on the plate's anchor`);
      assert.equal(r.pts[r.pts.length - 2][1], last[1], `${id}: the last segment is horizontal`);
      for (let i = 0; i + 1 < r.pts.length; i++) assert.ok(r.pts[i][0] === r.pts[i + 1][0] || r.pts[i][1] === r.pts[i + 1][1], `${id}: orthogonal only`);
      for (const [x, y] of px) {
        assert.ok(Math.hypot(x - 348, y - 286) >= 164 - Math.SQRT1_2, `${id}: a leader pixel at ${x},${y} is inside 164`);
        const key = x + "," + y; assert.ok(!owner.has(key) || owner.get(key) === k, `${id}: leaders cross at ${key}`); owner.set(key, k);
        ps.forEach((q, j) => assert.ok(j === k || !(x >= q.x && x < q.x + q.w && y >= q.y && y < q.y + q.h), `${id}: leader ${k} runs through plate ${j}`)); } });
  }
  const m = layout(model(F.S01, {})); assert.deepEqual(L.platesOf(m).map((p) => L.leaderOf(m, p).dot), [[194, 231], [403, 132], [502, 341], [293, 440]], "the Loika's four dots");
});
test("every form's all-found ink (sealed chapters opened, legacy looks found) lies inside formRoom [176,44,344,414], 18 px or more clear on every side", () => {
  const [rx, ry, rw, rh] = L.L2.sheet.formRoom, ss = 2;
  for (const id of IDS) { const fr = { ...F[id], chapters: F[id].chapters.map((c) => ({ ...c, sealed: false })) }, m = layout(model(fr, { [id]: all(F[id]) })), S = L.formScale(F[id]);
    const c = createCanvas(1024 * ss, 600 * ss); drawForm(c.getContext("2d"), { cx: 348 * ss, cy: 286 * ss, s: S * ss, lw: 0.94 * ss }, m, { nodeR: 5.5 });
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1; const d = c.data;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 24 / 255) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const box = [Math.floor(x0 / ss), Math.floor(y0 / ss), Math.ceil(x1 / ss), Math.ceil(y1 / ss)];
    assert.ok(box[0] - rx >= 18 && box[1] - ry >= 18 && rx + rw - box[2] >= 18 && ry + rh - box[3] >= 18, `${id}: ink ${box} against formRoom ${L.L2.sheet.formRoom}`); }
});

// ---- the type ----
test("the comma form: a two-colour look prints 'a, b'; a look with 'and' as a word stays verbatim", () => {
  const m = layout(model(F.S01, { S01: all(F.S01) })), t = (id) => m.chapters.flatMap((c) => c.traits).find((x) => x.id === id);
  assert.equal(L.printed(t("colour"), "charcoal and russet"), "charcoal, russet");
  assert.equal(L.printed(t("colour"), "ash"), "ash");
  assert.equal(L.printed(t("markings"), "stripes and patches"), "stripes and patches");
});
test("the trait index: the trait names joined ' · ', breaking only at ' · ', at most 2 lines within 132, on every chapter of the 16 species; the Belatz's Coat in 2", () => {
  for (const id of IDS) for (const ch of F[id].chapters) { const names = ch.traits.map((t) => t.name), lines = L.wrapJoined("regular-12", names, 132);
    assert.ok(lines.length <= 2, `${id} ${ch.id}: ${lines.length} lines`); assert.equal(lines.join(" · "), names.join(" · ")); for (const l of lines) assert.ok(L.textWidth("regular-12", l) <= 132 || !l.includes(" · "), `${id} ${ch.id}: "${l}"`); }
  assert.deepEqual(L.wrapJoined("regular-12", ["Colour", "Fluff", "Sheen", "Feathers", "Tufts", "Trim"], 132), ["Colour · Fluff · Sheen", "Feathers · Tufts · Trim"]);
  for (const id of IDS) for (const ch of F[id].chapters) { assert.ok(L.textWidth("medium-14", ch.name) <= 94, `${id}: the plate name ${ch.name}`); }
});

// ---- the pictures ----
const PIC = new Map(); const pic = (key, make) => { if (!PIC.has(key)) PIC.set(key, timed(key, make())); return PIC.get(key); };
const belatzHalf = () => { const sh = all(F.S09, 0.5); for (const t of F.S09.chapters.find((c) => c.id === "movement").traits) delete sh[t.id]; return found("S09", sh, { shut: ["movement"] }); };
const loikaMid = () => pic("Loika mid", () => L.renderSheet(F.S01, found("S01", mid.S01)));
test("plates are bezel pixels: exactly libPanel, libHead and libWell (b 25) where no type is printed, the ground outside the round corners", () => {
  const p = loikaMid(), [w, h] = L.L2.sheet.plates.size, allowed = new Set(["libPanel", "libHead", "libWell"].map((n) => tok(n).join(",")));
  for (const pl of L.speciesFacts(F.S01).plates) { const [x, y] = [pl.rect[0] - SX, pl.rect[1] - SY];
    for (let j = 0; j < h; j++) for (let i = 146; i < w; i++) { const inside = L.ringInRound(2 * i + 1, 2 * j + 1, 0, 0, w, h, 6); if (inside) assert.ok(allowed.has(at(p, x + i, y + j).join(",")), `${pl.chapter} ${i},${j}: ${at(p, x + i, y + j)}`); }
    for (let i = 6; i < w - 6; i++) { assert.deepEqual(at(p, x + i, y + 26), tok("libWell"), "the rule row"); assert.deepEqual(at(p, x + i, y), tok("libPanel"), "row 0 is the panel"); }
    assert.deepEqual(at(p, x + 150, y + 10), tok("libHead")); assert.deepEqual(at(p, x + 150, y + 40), tok("libPanel")); }
});
test("the Loika at mid: tier L, its 20 cells exactly at x 252-663, y 502-518; the colours band named; the layout facts in the picture's coordinates", () => {
  const p = loikaMid(), f = p.facts, cellsX = [];
  assert.deepEqual([f.tier, f.sForm, f.colours], ["L", 0.94, "named"]);
  assert.deepEqual(f.plates.coat, [0, 10, 156, 70]);
  const bg = at(p, 245 - SX, 510 - SY);
  for (let x = 248; x < 672; x++) if (at(p, x - SX, 510 - SY).join() !== bg.join()) cellsX.push(x);
  assert.equal(Math.min(...cellsX), 252); assert.equal(Math.max(...cellsX), 663);
  assert.notDeepEqual(at(p, 252 - SX, 502 - SY), bg); assert.notDeepEqual(at(p, 252 - SX, 518 - SY), bg); assert.deepEqual(at(p, 252 - SX, 519 - SY), bg); assert.deepEqual(at(p, 252 - SX, 522 - SY), bg, "nothing at (252,522) before the plain is found");
});
test("the Loika's legacy 'plain', once found, is its own trailing group at (252,522), 17 x 17; the 20 slot cells do not move; its glint centre (269,522) and the Coat's lit outline", () => {
  const f = { ...mid.S01, markings: [...(mid.S01.markings || []), "plain"] }, inp = found("S01", f, { fresh: ["markings|plain"] }), a = loikaMid(), b = pic("Loika plain", () => L.renderSheet(F.S01, inp, { lit: "coat" }));
  const bg = at(a, 245 - SX, 510 - SY);
  assert.notDeepEqual(at(b, 252 - SX, 522 - SY), bg); assert.notDeepEqual(at(b, 268 - SX, 538 - SY), bg); assert.deepEqual(at(b, 273 - SX, 530 - SY), bg); assert.deepEqual(at(b, 270 - SX, 530 - SY), tok("bone"));
  assert.deepEqual(at(b, 250 - SX, 530 - SY), tok("bone"), "the lit outline, 1 px out");
  assert.deepEqual(L.sheetFacts(F.S01, inp).glints, [[269 - SX, 522 - SY]]);
  assert.equal(L.tierOf(F.S01).id, "L");
});
test("the lit variant: the lit chapter's found cells outlined in bone 1 px out; the other plates' type at 30 % pre-mixed; the plates never dim", () => {
  const a = loikaMid(), b = pic("Loika Coat lit", () => L.renderSheet(F.S01, found("S01", mid.S01), { lit: "coat" }));
  assert.deepEqual(at(b, 250 - SX, 510 - SY), tok("bone"));
  const face = L.speciesFacts(F.S01).plates[1].rect, x = face[0] - SX, y = face[1] - SY; let darker = 0, same = 0;
  for (let j = 0; j < 26; j++) for (let i = 0; i < 130; i++) { const p = at(a, x + i, y + j).join(), q = at(b, x + i, y + j).join(); if (p !== q) darker++; else same++; }
  assert.ok(darker > 0, "the Face's head type dims");
  assert.deepEqual(at(b, x + 150, y + 10), tok("libHead")); assert.deepEqual(at(b, x + 150, y + 40), tok("libPanel"));
});
test("the page: the Loika's Coat at mid H 160; the Belatz's Coat with every look found H 453 (groups at 44, 136, 198, 260, 322, 384); a one-trait chapter H 98; disc boxes of the found looks only", () => {
  const lp = pic("Loika Coat page", () => L.renderPage(F.S01, found("S01", mid.S01), "coat"));
  assert.equal(lp.facts.height, 160); assert.deepEqual(lp.facts.discs["look.colour.charcoal"], [12, 53, 17, 17]);
  assert.ok(Object.keys(lp.facts.discs).every((k) => { const [, t, l] = k.split(/\.(.*?)\.(.*)/).filter(Boolean); return (mid.S01[t] || []).includes(l); }));
  assert.deepEqual(at(lp, 100, 26), tok("libWell")); assert.deepEqual(at(lp, 100, 159), tok("libPanel")); assert.deepEqual(at(lp, 100, 160), tok("libGround"), "the ground below the page");
  const bp = pic("Belatz Coat page, complete", () => L.renderPage(F.S09, found("S09", all(F.S09)), "coat"));
  assert.equal(bp.facts.height, 453);
  assert.deepEqual([...new Set(Object.entries(bp.facts.discs).map(([, r]) => r[1] - 9))], [44, 136, 198, 260, 322, 384]);
  assert.equal(L.sheetFacts(F.S01, found("S01", mid.S01), "movement").page.height, 98);
  for (const ch of F.S04.chapters) assert.equal(L.sheetFacts(F.S04, found("S04", all(F.S04)), ch.id).page.height, 98, `Hiljan ${ch.id}`);
});
test("met-only: no names, no colours band, the same tier and cells; one picture per species for every player; no lit variant and no page", () => {
  const m = pic("Untuva met-only", () => L.renderSheet(F.S02, met("S02"))), f = m.facts;
  assert.equal(f.colours, "none"); assert.equal(f.tier, L.tierOf(F.S02).id); assert.deepEqual(f.glints, []);
  const [x, y] = [L.speciesFacts(F.S02).plates[0].rect[0] - SX, L.speciesFacts(F.S02).plates[0].rect[1] - SY];
  for (let j = 2; j < 25; j++) for (let i = 36; i < 140; i++) assert.deepEqual(at(m, x + i, y + j), tok("libHead"), "no name on a met plate");
  for (let j = 28; j < 68; j++) for (let i = 8; i < 150; i++) assert.deepEqual(at(m, x + i, y + j), tok("libPanel"), "no index on a met plate");
  assert.notDeepEqual(at(m, 100 - SX, 500 - SY), tok("libPanel"), "no colours band");
  assert.equal(sheetId(F.S02, met("S02")), sheetId(F.S02, { ...met("S02"), readOnce: ["coat"], sig: ["another player"] }));
  assert.equal(L.canLight(met("S02"), "coat"), false); assert.throws(() => L.renderPage(F.S02, met("S02"), "coat")); assert.throws(() => L.sheetFacts(F.S02, met("S02"), "coat"));
});
test("a shut plate: 'sealed', no index, no page and no lit variant; on opening nothing moves", () => {
  const inp = belatzHalf(), b = pic("Belatz half found, Movement sealed", () => L.renderSheet(F.S09, inp)), pl = L.speciesFacts(F.S09).plates.find((p) => p.chapter === "movement").rect, x = pl[0] - SX, y = pl[1] - SY;
  let ink44 = 0, ink59 = 0; for (let i = 8; i < 150; i++) { if (at(b, x + i, y + 40).join() !== tok("libPanel").join()) ink44++; if (at(b, x + i, y + 56).join() !== tok("libPanel").join()) ink59++; }
  assert.ok(ink44 > 0 && ink59 === 0, "one line, 'sealed', where the index's first line is");
  assert.equal(L.textWidth("regular-12", "sealed") < 132, true);
  assert.equal(L.canLight(inp, "movement"), false); assert.throws(() => L.renderPage(F.S09, inp, "movement")); assert.throws(() => L.renderSheet(F.S09, inp, { lit: "movement" }));
  const open = { ...inp, shut: [] }; assert.deepEqual(L.sheetFacts(F.S09, open).plates, b.facts.plates, "opening moves no plate");
  assert.equal(b.facts.colours, "chips", "5 colours found are chips");
});
test("the Hiljan: no colours band (its Coat has no Colour trait), the mosaic at [240,462]", () => {
  const h = pic("Hiljan all found", () => L.renderSheet(F.S04, found("S04", all(F.S04))));
  assert.equal(h.facts.colours, "none"); assert.notDeepEqual(at(h, 100 - SX, 500 - SY), tok("libPanel"));
  assert.deepEqual(at(h, 600 - SX, 470 - SY), tok("libHead"), "the Every look band's head"); assert.deepEqual(at(h, 600 - SX, 484 - SY), tok("libWell"), "its rule at b + 1 = 22");
});
test("4 or more colours give chips (31 x 21 fills with the outline, 5 to a row, no names); 1 to 3 give named swatches", () => {
  const cols = F.S01.chapters[0].traits[0].looks, four = found("S01", { colour: cols.slice(0, 4) });
  assert.equal(L.sheetFacts(F.S01, four).colours, "chips"); assert.equal(L.sheetFacts(F.S01, found("S01", { colour: cols.slice(0, 3) })).colours, "named");
  const p = pic("Loika four colours", () => L.renderSheet(F.S01, four));
  assert.deepEqual(at(p, 40 - SX, 500 - SY), [0x46, 0x54, 0x59], "the first chip is charcoal");
  assert.deepEqual(at(p, 28 + 37 * 4 + 10 - SX, 500 - SY), tok("libPanel"), "no fifth chip");
  assert.deepEqual(at(p, 40 - SX, 530 - SY), tok("libPanel"), "no names under chips");
});
test("tier S: a found cell is a flat fill, a pair 6 + 6 whole columns, the first colour on the left", () => {
  const b = pic("Belatz half found, Movement sealed", () => L.renderSheet(F.S09, belatzHalf())), y = 489 - SY, x = 252 - SX;
  const fr = F.S09, colour = fr.chapters[0].traits[0], f = all(fr, 0.5).colour, pair = f.findIndex((l) => l.includes(" and "));
  if (pair >= 0) { const cx = x + 15 * pair; assert.notDeepEqual(at(b, cx + 5, y + 5), at(b, cx + 6, y + 5)); assert.deepEqual(at(b, cx, y + 5), at(b, cx + 5, y + 5)); assert.deepEqual(at(b, cx + 6, y + 5), at(b, cx + 11, y + 5)); }
  assert.ok(colour);
});
test("the 16 px disc of a found look: opaque inside, clear at the corners", () => {
  const d = L.renderDisc(F.S01, "colour", "charcoal and russet"); assert.deepEqual([d.w, d.h], [16, 16]); assert.equal(d.rgba[3], 0); assert.equal(d.rgba[(8 * 16 + 8) * 4 + 3], 255);
  assert.throws(() => L.renderDisc(F.S01, "colour", "violet"));
});

// ---- requests and the cache ----
test("the requests: library-sheet-{SNN}-{digest}, its -lit-{chapter} variant and library-page-{SNN}-{chapter}-{digest}; none lit for a shut chapter or a met sheet; a new look is a new digest", () => {
  const rq = [], r = sheetReq(collector(rq))(F.S01, found("S01", mid.S01), "coat");
  assert.match(r.sheet, /^library-sheet-S01-[0-9a-f]{8}$/); assert.equal(r.lit, r.sheet + "-lit-coat"); assert.match(r.page, /^library-page-S01-coat-[0-9a-f]{8}$/);
  assert.deepEqual(rq.map((x) => [x.kind, x.size]), [["librarysheet", [664, 522]], ["librarylit", [664, 522]], ["librarypage", [308, 500]]]);
  const r2 = sheetReq(collector([]))(F.S02, met("S02"), "coat"); assert.deepEqual([r2.lit, r2.page], [null, null]);
  assert.notEqual(sheetId(F.S01, found("S01", { ...mid.S01, colour: [...mid.S01.colour, "ash"] })), r.sheet);
  assert.notEqual(sheetId(F.S01, found("S01", mid.S01, { readOnce: ["coat"] })), r.sheet);
  assert.equal(discReq(collector([]))("S01", "colour", "ash"), "look-disc-S01-colour-ash-16");
});
test("the cache keeps exactly the current sheet, one lit variant and one page; a newer request supersedes the older one of its kind; its bytes at RGB565", () => {
  L.clearSheets(); const said = [], print = (s) => said.push(s), rq = [], A = found("S01", mid.S01), B = found("S01", { ...mid.S01, colour: [...mid.S01.colour, "ash"] });
  const ids = sheetReq(collector(rq))(F.S01, A, "coat"), n0 = L.sheetRenders();
  for (const r of rq) L.sheetPicture(F.S01, r, { print });
  for (const r of rq) L.sheetPicture(F.S01, r, { print });
  assert.equal(L.sheetRenders() - n0, 3, "each made once while kept");
  assert.deepEqual(L.keptPictures(), { sheet: ids.sheet, lit: ids.lit, page: ids.page });
  assert.equal(L.keptBytes(), (664 * 522 * 2 + 308 * 500) * 2);
  const rq2 = []; const ids2 = sheetReq(collector(rq2))(F.S01, B, null); L.sheetPicture(F.S01, rq2[0], { print });
  assert.deepEqual(L.keptPictures(), { sheet: ids2.sheet, lit: ids.lit, page: ids.page }, "the newer sheet supersedes the older; the lit variant and the page stay until superseded");
  for (const s of said) console.log(s);
  assert.ok(said.every((s) => /rendered in \d+ ms/.test(s)));
});
