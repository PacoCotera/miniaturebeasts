// The Cross splice (prototypes/ui/specs/station/cross.json): the geometry fits every frame, the routing comes from the forecast, and no copy of an unread chapter is ever drawn.
//   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, frameIds } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import * as L from "../src/library.mjs";
import { crossView, firstMissingWords } from "../src/views/cross.mjs";
import { overviewPlan, chapterPlan } from "../src/cross-layout.mjs";
import { traitLocusCount, chapterLocusCount } from "../src/splice.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), fdir = path.resolve(here, "../../workbench/frames");
setFrames(readdirSync(fdir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(fdir, f), "utf8"))));
const spec = JSON.parse(readFileSync(path.resolve(here, "../../ui/specs/station/cross.json"), "utf8"));
const ctx = { spec, measure: (t, px) => t.length * px * 0.5, cap: (px) => px * 0.7, line: (px) => Math.round(px * 1.25) };
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided" };
const world = (id = "S01", seed = 11) => { const st = S.freshSt("w1", 3, 1); S.normalize(st); const r = S.seedAdults(st, id, seed, 2, settings); return { st, a: r.mibis[0], b: r.mibis[1], fr: frameOf(id) }; };
const view = (w, state, extra = {}) => { const fc = S.forecastOf(w.st, w.a, w.b, settings); return { fc, v: crossView({ st: w.st, settings, a: w.a, b: w.b, fc, block: "", partners: [w.b], away: {}, state, wish: null, frame: w.fr, ...extra }, spec, ctx, null) }; };

test("the overview's rows fit the 440 on all sixteen frames with every locus at play: S03 is the worst at 436 (10 px, 4 px gaps), S09 fits 412 at 10 with 8", () => {
  const all = (fr) => fr.chapters.map((c) => ({ id: c.id, state: "open", loci: Array.from({ length: chapterLocusCount(fr, c.id) }, (_, i) => ({ id: c.id + i, play: true })) }));
  const plans = Object.fromEntries(frameIds().map((id) => [id, overviewPlan(all(frameOf(id)), spec)]));
  for (const [id, p] of Object.entries(plans)) { assert.ok(p.fits && p.height <= 440, id + " fits: " + p.height); assert.ok(p.pitch >= 10 && p.pitch <= 16, id); }
  assert.equal(frameIds().length, 16); assert.deepEqual([plans.S03.pitch, plans.S03.gap, plans.S03.height], [10, 4, 436], "S03 Tuikis, the worst case"); assert.deepEqual([plans.S09.pitch, plans.S09.gap, plans.S09.height], [10, 8, 412]);
  assert.equal(frameOf("S03").chapters.reduce((n, c) => n + chapterLocusCount(frameOf("S03"), c.id), 0), 40, "forty loci in eight chapters"); assert.equal(plans.S01.pitch, 16, "a small frame keeps the full 16");
});

test("the overview's folds: settled, unread and sealed loci are 4 px hairlines, a chapter is at least 24, and the rows start at y 112", () => {
  const p = overviewPlan([{ id: "x", state: "open", loci: [{ id: "a", play: true }, { id: "b", play: false }] }, { id: "y", state: "unread", loci: [{ id: "c", play: true }, { id: "d", play: true }] }, { id: "z", state: "sealed", loci: [{ id: "e", play: false }] }], spec);
  assert.deepEqual(p.chapters.map((c) => c.rows.map((r) => r.h)), [[16, 4], [4, 4], [4]], "an unread chapter's loci are never at play"); assert.deepEqual(p.chapters.map((c) => c.h), [20 < 24 ? 24 : 20, 24, 24]);
  assert.equal(p.chapters[0].y, 112); assert.equal(p.chapters[1].y, 112 + 24 + 8);
});

test("a chapter view's trait rows are 64 plus 8 a further locus and every chapter of every frame fits the 392 (S09's Coat fills it)", () => {
  let tallest = 0, who = "";
  for (const id of frameIds()) { const fr = frameOf(id); for (const c of fr.chapters) { const p = chapterPlan(c.traits.map((t) => ({ id: t.id, loci: traitLocusCount(fr, t.id) })), spec); assert.ok(p.fits, `${id} ${c.id} ${p.height}`); if (p.height > tallest) { tallest = p.height; who = id + " " + c.id; } assert.equal(p.rows[0].y, 160); } }
  assert.equal(tallest, 392, "the tallest is S09's Coat (" + who + ")");
  assert.deepEqual(chapterPlan([{ id: "t", loci: 1 }, { id: "u", loci: 3 }], spec).rows.map((r) => [r.y, r.h]), [[160, 64], [224, 80]]);
});

test("the routing comes from the forecast: every locus at play has its gate, its wires in the kind's colour and a hidden copy dashed; a switch ends in four seeds, a blend in a track", () => {
  const w = world("S01", 11), { fc, v } = view(w, 0), loci = fc.traits.flatMap((t) => (t.splice ? t.splice.loci : [])), play = loci.filter((l) => l.play);
  assert.ok(play.length > 0 && loci.length >= play.length);
  const gates = v.masters.filter((m) => /^cross-gate-(switch|blend)-8x8:/.test(m.id)); assert.equal(gates.length, play.length * 2, "a gate each side of every row at play");
  assert.ok(gates.every((g) => g.rect[2] === 8 && g.rect[3] === 8) && gates.some((g) => g.rect[0] === 340) && gates.some((g) => g.rect[0] === 676), "the gates at x 340 and 676");
  for (const l of play) {
    const rows = v.nodes.filter((n) => n.id.includes("." + l.id + "."));
    const colour = l.kind === "switch" ? spec.colours.wire.switch : spec.colours.wire.blend; assert.ok(rows.some((n) => n.colour === colour && n.rect[3] === 2), l.id + " has its 2 px wires in " + colour);
    if (l.kind === "switch") assert.equal(rows.filter((n) => /\.seed\.\d$/.test(n.id) || /\.seed\.\d\.l$/.test(n.id)).length, 4, "four seeds"); else assert.ok(rows.some((n) => n.id.endsWith(".track")), "a track");
  }
  const hidden = loci.filter((l) => l.play && (l.hides.a.includes(true) || l.hides.b.includes(true))); assert.ok(hidden.length > 0, "this pair hides a copy somewhere at play");
  for (const l of hidden) { const side = l.hides.a.includes(true) ? "a" : "b", i = l.hides[side].indexOf(true), pieces = v.nodes.filter((n) => n.id.startsWith(`ov.`) && n.id.includes(`.${l.id}.${side}${i}.`)); assert.ok(pieces.length > 1, "the hidden copy's wire is dashed"); }
  assert.ok(v.masters.every((m) => m.id.endsWith(`:${m.rect[2]}x${m.rect[3]}`) && m.until), "every master is asked for by id at its size");
});

test("no copy of an unread chapter is drawn: its loci fold, its child's column is frost with 'read {parent}'s {chapter}', and its pictures, seeds and plates are not asked for", () => {
  const w = world("S01", 11), ch = w.fr.chapters[0]; w.b.read = w.b.read.filter((c) => c !== ch.id);   // the partner has not read the first chapter
  const { fc, v } = view(w, 0), texts = v.nodes.filter((n) => n.kind === "text").map((n) => n.text);
  assert.ok(texts.includes(`read ${w.b.name}'s ${ch.name}`), "the frost says whose chapter to read: " + texts.join(" | "));
  assert.ok(!v.nodes.some((n) => n.id.startsWith("ov." + ch.id + ".") && /seed|band|track|\.o[ab]$/.test(n.id)), "no seed, range or out wire for the unread chapter");
  assert.ok(v.nodes.some((n) => n.id === `ov.${ch.id}.col` && n.colour === spec.colours.missing.fill), "the child's column is one frost rect");
  assert.equal(firstMissingWords(fc), `read ${w.b.name}'s ${ch.name}`); assert.equal(v.line.need, `read ${w.b.name}'s ${ch.name}`, "the notice names the first missing read");
  // the chapter view of it: the read parent's plates, the unread parent's wires as frost, no plate, no seed picture, four frost slots
  const c1 = view(w, 1), p = c1.v.nodes.filter((n) => n.id.includes(".plate"));
  assert.ok(p.every((n) => !/\.b[01]\.plate/.test(n.id)), "no plate on the unread parent's side"); assert.ok(p.some((n) => /\.a[01]\.plate/.test(n.id)), "the read parent's own copies are shown");
  assert.equal(c1.v.pictures.filter((q) => q.kind === "seed").length, 0, "no seed picture of a missing trait"); assert.ok(c1.v.nodes.some((n) => n.colour === "frostS" && n.rect[2] === 64 && n.rect[3] === 32), "four frost slots");
  assert.ok(c1.v.nodes.some((n) => n.kind === "text" && n.text === `read ${w.b.name}'s ${ch.name}`));
  // read it: the splice is drawn
  w.b.read.push(ch.id); const back = view(w, 1); assert.ok(back.v.pictures.some((q) => q.kind === "seed") && back.v.nodes.some((n) => n.id.includes(".b0.plate")), "read: the pairing appears"); assert.equal(back.v.line.need, null);
  // both parents unread
  w.a.read = w.a.read.filter((c) => c !== ch.id); w.b.read = w.b.read.filter((c) => c !== ch.id); assert.equal(firstMissingWords(S.forecastOf(w.st, w.a, w.b, settings)), `read both parents' ${ch.name}`);
});

test("a sealed chapter shows only its find: dotted hairlines, slats, 'sealed · {what opens it}', and the find master; the chapter view says 'opens with'", () => {
  const w = world("S02", 5), fc0 = S.forecastOf(w.st, w.a, w.b, settings), sealed = fc0.chapters.find((c) => c.state === "sealed"); assert.ok(sealed && sealed.opensWith && sealed.findKind);
  const { v } = view(w, 0), mine = v.nodes.filter((n) => n.id.startsWith("ov." + sealed.id + "."));
  assert.ok(mine.some((n) => n.kind === "text" && n.text === `sealed · ${sealed.opensWith}`)); assert.ok(mine.filter((n) => n.colour === spec.colours.wire.sealed).length > 0, "dotted hairlines"); assert.ok(mine.every((n) => !/seed|band|track/.test(n.id)), "nothing of its loci");
  assert.ok(v.masters.some((m) => m.master === `find-${sealed.findKind}-16x16` && m.rect[2] === 16), "the find, 16×16");
  const idx = fc0.chapters.findIndex((c) => c.id === sealed.id) + 1, c = view(w, idx);
  assert.ok(c.v.nodes.some((n) => n.kind === "text" && n.text === `opens with ${sealed.opensWith}`) && c.v.masters.some((m) => m.master === `find-${sealed.findKind}-112x112`), "the chapter view's find and its words"); assert.equal(c.v.pictures.filter((q) => q.kind === "seed").length, 0);
});

test("the heads, the kinship pill and the bottom line: the pill at every kinship (0 included), the context per state, a refusal takes the notice and the ✓", () => {
  const w = world(), { v: o } = view(w, 0), c = view(w, 1).v;
  assert.ok(o.nodes.some((n) => n.id === "head.kin" && n.colour === "amber") && o.nodes.some((n) => n.text === "wild founders · kinship 0"), "kinship 0 is shown"); assert.ok(o.nodes.some((n) => n.text === "the child to be"));
  assert.equal(o.line.subject, `${w.a.name} × ${w.b.name} · ${S.cap(S.spName(w.a))}`); assert.equal(c.line.subject, `${w.fr.chapters[0].name} · ${w.a.name} × ${w.b.name}`); assert.equal(o.line.back, "Habitat");
  assert.deepEqual(o.ring, [748, 44, 264, 56]); assert.deepEqual(c.ring, [748, 100, 264, 56], "the focus ring stays on the partner's head");
  const refused = view(w, 0, { block: "close kin" }).v.line; assert.ok(!refused.ok && refused.need === "close kin", "no ✓ cap and the reason is the notice");
  const away = view(w, 0, { away: { a: true, b: false } }).v; assert.ok(away.nodes.some((n) => n.text === "away with you") && away.nodes.some((n) => n.id.startsWith("head.a.veil")), "an away parent is veiled and says so");
  const alone = crossView({ st: w.st, settings, a: w.a, b: null, fc: null, block: "", partners: [], away: {}, state: 0, wish: null, frame: w.fr }, spec, ctx, null); assert.equal(alone.line.need, "no adult of its kind to pair");
});

test("the wish shows on the splice: a glint master lit or hollow on the pinned trait, a yellow edge on the seed that shows the pinned look", () => {
  const w = world("S01", 11); w.st.knownIds.push("S01"); const fr = w.fr, t = fr.chapters.flatMap((c) => c.traits).find((q) => q.id === "markings") ?? fr.chapters[0].traits[0], look = L.possibleLooks(fr, t)[0];
  w.st.guide.S01 = w.st.guide.S01 || {}; w.st.guide.S01[t.id] = L.possibleLooks(fr, t); L.wishPin(w.st, "S01", t.id, look, settings);
  const wish = L.wishForecast(w.st, w.a, w.b, settings), o = view(w, 0, { wish }).v;
  assert.ok(wish.pinned.length === 1); assert.ok(o.masters.some((m) => /^cross-wish-(lit|hollow)-8x8:/.test(m.id)), "the overview's wish glint is requested");
  const c = view(w, 1 + fr.chapters.findIndex((q) => q.traits.some((x) => x.id === t.id)), { wish }).v; assert.ok(c.masters.some((m) => /^cross-wish-(lit|hollow)-12x12:/.test(m.id)), "the chapter view's glint");
});

test("a blend's ends are the trait's own looks (describe.lookOf), never the locus's bins: S09's Fluff reads 'short, straight to long, swept'", () => {
  const w = world("S09", 11), fr = w.fr, { fc, v } = view(w, 1 + fr.chapters.findIndex((c) => c.traits.some((t) => t.id === "fluff")));
  const t = fc.traits.find((q) => q.trait === "fluff"); assert.ok(t && t.kind === "blend" && t.splice.ends, "Fluff is a blend with its ends worded");
  const trait = fr.chapters.flatMap((c) => c.traits).find((q) => q.id === "fluff"); assert.ok(trait.looks.includes(t.splice.ends[0]) || trait.looks.includes(t.splice.ends[1]), "the ends are among the trait's looks");
  const words = v.nodes.filter((n) => n.kind === "text" && n.id === "ch.fluff.words")[0]; assert.ok(words && /^(.+) to (.+)$/.test(words.text) && !/^short to long$/.test(words.text), "the words under the name: " + words?.text);
  assert.equal(words.text, `${t.splice.ends[0]} to ${t.splice.ends[1]}`);
});

test("a sealed chapter's view draws the dotted hairline wires from both sides into the find, one a locus on the 4 px pitch, centred on it", () => {
  const w = world("S02", 5), fc = S.forecastOf(w.st, w.a, w.b, settings), idx = fc.chapters.findIndex((c) => c.state === "sealed") + 1, n = chapterLocusCount(w.fr, fc.chapters[idx - 1].id);
  const { v } = view(w, idx), a = v.nodes.filter((x) => /^ch\.sa\.\d+\.0$/.test(x.id)), b = v.nodes.filter((x) => /^ch\.sb\.\d+\.0$/.test(x.id));
  assert.equal(a.length, n); assert.equal(b.length, n); assert.ok(a.every((x) => x.colour === spec.colours.wire.sealed && x.rect[3] === 1));
  const ys = a.map((x) => x.rect[1]); assert.ok(ys.every((y, i) => i === 0 || y - ys[i - 1] === 4), "the 4 px pitch"); assert.ok(Math.abs((ys[0] + ys.at(-1)) / 2 - 304) <= 4, "centred on the find (y 248 to 360)");
  assert.ok(v.nodes.some((x) => x.id.startsWith("ch.sa.") && x.rect[0] + x.rect[2] <= 456) && v.nodes.some((x) => x.id.startsWith("ch.sb.") && x.rect[0] >= 568), "into the find from both sides");
});
