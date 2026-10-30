// Create's props (lvgl-switch.md §2.1, §4 R; create.json): the view the face takes, views/create-props.mjs, in Node. Plain JSON that names what and never where: it validates against create.props.json in every state, holds no rectangle, no
// measure and no layout rule, fits the 32 KiB props budget with the frame beside it, spells the trait line, the context, the notice and the price from create.json's strings and the rules, puts the roll's pictures in the order of the spec
// (as the pod is, only the first copy, only the second), counts the leaves the bud will take, and follows the founder's picture through the rolls.
//   node --test prototypes/station/tests/
import { lineCased } from "./fixtures/line-case.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, podGenome, traitState } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { createBuild as createBuildUnchecked, reviewTraits, founderPicture, createPod } from "../src/views/create-props.mjs";
const createBuild = lineCased(createBuildUnchecked, "create");   // every body it builds goes through assertLineCase (report mode)

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames"), specs = path.resolve(here, "../../ui/specs/station");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const J = (f) => JSON.parse(readFileSync(path.join(specs, f), "utf8")), spec = J("create.json"), pods = J("pods.json"), schema = J("create.props.json");
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", rooms: 2 }, T0 = 1_000_000, SPECIES = readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => f.slice(8, 11));

function validate(v, sc, at = "$", out = []) {
  if (sc.$ref) return validate(v, schema.$defs[sc.$ref], at, out);
  if (sc.enum && !sc.enum.includes(v)) { out.push(`${at}: ${JSON.stringify(v)} is not one of ${JSON.stringify(sc.enum)}`); return out; }
  if (sc.type) {
    const ts = [].concat(sc.type), ty = v === null ? "null" : Array.isArray(v) ? "array" : Number.isInteger(v) ? "integer" : typeof v;
    if (!ts.includes(ty) && !(ty === "integer" && ts.includes("number"))) { out.push(`${at}: a ${ty}, wanted ${ts.join(" or ")}`); return out; }
  }
  if (Array.isArray(v) && sc.items) v.forEach((x, i) => validate(x, sc.items, `${at}[${i}]`, out));
  if (v && typeof v === "object" && !Array.isArray(v)) {
    for (const k of sc.required ?? []) if (!(k in v)) out.push(`${at}: ${k} is required`);
    for (const [k, x] of Object.entries(v)) { const p = sc.properties?.[k]; if (p) validate(x, p, `${at}.${k}`, out); else if (sc.additionalProperties === false) out.push(`${at}: ${k} is not a prop`); }
  }
  return out;
}
const world = () => { const st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = 99; st.d = 99; st.s = 99; st.firstMibi = false; return st; };
function make(species, gs, read, over = {}) {
  const st = world(); S.seedPodFromGenome(st, podGenome(frameOf(species), gs), settings, T0); const p = st.tray[0]; S.skipIdentify(st, p); frameOf(species).chapters.slice(0, read).forEach((c) => S.read(st, p, c.id, settings));
  const cr = { podId: p.id, choices: {}, f: 0, clash: [], grown: null, ...over }; return { st, p, cr, build: (x = cr) => createBuild({ st, settings, ui: { create: x } }, spec, pods) };
}

test("Create's props validate against create.props.json for every species in every state, name no rectangle, and fit the budget", () => {
  const all = [];
  for (const id of SPECIES) {
    const fr = frameOf(id);
    for (const read of [0, 1, fr.chapters.length]) {
      const m = make(id, 3, read); all.push([`${id}, ${read} read`, m.build()]);
      const list = reviewTraits(m.p, fr); for (const f of [0, Math.floor(list.length / 2), list.length - 1]) if (list.length) { m.cr.f = f; all.push([`${id}, ${read} read, trait ${f}`, m.build()]); }
      const roll = list.findIndex(({ t }) => S.rollOptions(m.p, t.id).length > 1); if (roll >= 0) { m.cr.f = roll; m.cr.choices = { [list[roll].t.id]: 1 }; all.push([`${id}, a rolled look`, m.build()]); m.cr.clash = [list[roll].t.id]; all.push([`${id}, a clash`, m.build()]); }
    }
  }
  { const m = make("S01", 3, 2); m.st.bud = { kind: "founder" }; all.push(["busy", m.build()]); }
  { const m = make("S01", 3, 2); const r = S.grow(m.st, m.p, {}, settings, T0); m.cr.grown = { code: r.bud.code, cost: r.cost, pod: m.p }; all.push(["grown", m.build()]); }
  for (const [name, b] of all) {
    const bad = validate(b.props, schema); assert.deepEqual(bad, [], `${name}: ${bad.slice(0, 3).join("; ")}`);
    const json = JSON.stringify(b.props); assert.ok(!/"(x|y|w|h|rect|size|box|pitch)"\s*:/.test(json.replace(/"size":\d+/, "")), `${name}: props name what, never where`);
    assert.ok(json.length + JSON.stringify(b.line).length < 8 * 1024, `${name}: ${json.length} bytes`);
    for (const r of b.requests) assert.ok(typeof r.id === "string" && r.id.length > 0 && r.id.length < 96, `${name}: ${r.id}`);
  }
});

test("the state: nothing read with no chapter read (no roll, the ring on the room), shape with one read, grow once ✓ has paid", () => {
  const a = make("S01", 3, 0).build(); assert.equal(a.props.state, "nothingRead"); assert.equal(a.props.regions.roll, undefined); assert.deepEqual(a.props.focus, { cur: "room", targets: [] }); assert.equal(a.props.regions.rail.open, -1);
  const b = make("S01", 3, 1).build(); assert.equal(b.props.state, "shape"); assert.deepEqual(b.props.focus, { cur: "roll", targets: [{ id: "roll", group: "roll" }] });
  const m = make("S01", 3, 1), r = S.grow(m.st, m.p, {}, settings, T0); m.cr.grown = { code: r.bud.code, cost: r.cost, pod: m.p, minutes: r.bud.minutes }; const g = m.build(); assert.equal(g.props.state, "grow"); assert.equal(g.props.regions.code, `${r.bud.code.slice(0, 3)} ${r.bud.code.slice(3, 6)} ${r.bud.code.slice(6, 9)}`);
  assert.equal(g.props.regions.dome.state, "grow", "the bud that just grew: the chamber plays the incubate moment, not 'another bud'");
  assert.ok(g.line.ok === null && g.line.back === null && g.line.price == null && g.line.need === "", "grow: the line is Growing, no action, price or way back, an empty right slot (fix 5 C6)"); assert.equal(g.line.subject, spec.strings.growing); assert.deepEqual([g.line.dim, g.line.blocked, g.line.short], [undefined, undefined, undefined]);
  assert.equal(g.props.regions.roll.shown, false, "grow: the roll keeps its nodes with no size"); assert.equal(g.props.regions.roll.pictures.length, 3, "the roll pictures stay requested in grow"); assert.deepEqual(g.props.focus, { cur: "room", targets: [] }, "grow: no ring"); assert.equal(g.props.regions.rail.open, -1); assert.ok(g.props.regions.rail.tabs.every((t) => !("lift" in t)), "no tab open and no lift (fix 11: the lift is retired)"); assert.deepEqual([g.props.regions.traitLine.text, g.props.regions.traitLine.changed], ["", false], "no trait line in grow, the tag included");
  assert.equal(b.props.regions.roll.shown, true); assert.equal(a.props.regions.traitLine.text, "", "nothingRead: no trait line"); assert.equal(a.line.subject, "it grows as the pod is", "nothingRead: the sentence moves to the context");
  assert.equal(createPod(m.st, m.cr).id, m.p.id, "the pod is the screen's own once it has left the rack");
});

test("the chamber mirrors the Incubator: empty, a bud growing, a bud ready, after Incubate", () => {
  const e = make("S01", 3, 2).build().props.regions.dome; assert.equal(e.state, "empty"); assert.equal(e.pod, undefined, "empty: no pod");
  const g = make("S01", 3, 2); g.st.bud = { kind: "founder", species: "S03", start: Date.now() + 1e9, minutes: 5 }; const gd = g.build().props.regions.dome; assert.equal(gd.state, "growing"); assert.ok(gd.pod && gd.bar && gd.glass, "growing: that bud's pod, the bar, the glass");
  const r = make("S01", 3, 2); r.st.bud = { kind: "founder", species: "S03", start: Date.now() - 1e9, minutes: 5 }; const rd = r.build().props.regions.dome; assert.equal(rd.state, "ready"); assert.ok(rd.pod && rd.bar, "ready: that bud's pod and the bar");
});

test("the roll: three pictures in the order as the pod is, only the first copy, only the second (the look each shows); one picture for a doing, a trait with one look or a trait that cannot be shaped", () => {
  const m = make("S01", 3, 4), fr = frameOf("S01"), list = reviewTraits(m.p, fr);
  list.forEach(({ t }, f) => {
    m.cr.f = f; const r = m.build().props.regions.roll, opts = S.rollOptions(m.p, t.id);
    if (opts.length > 1) { assert.equal(r.form, "roll"); assert.equal(r.pictures.length, 3); assert.deepEqual(r.pictures, opts.map((o) => `roll-S01-${t.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${o.look.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-128x72:128x72`)); }
    else { assert.equal(r.form, "single"); assert.equal(r.pictures.length, 1); assert.equal(r.chosen, 0); if (t.nature === "doing") assert.deepEqual(r.pictures, [`roll-S01-${t.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-128x72:128x72`], "a doing: one plate a trait, the same for every value (Pods P7)"); }
    assert.equal(r.notches, opts.length > 1, "the notches only while the trait rolls");
  });
});

test("the trait line: as the pod is, only <look> with the tag, one look, doing with the breed mark, a clash with the ✕ and no tag, an asleep trait; none when nothing is read; at most six words and no digits", () => {
  const T = spec.strings.traitLine;
  for (const id of SPECIES) {
    const fr = frameOf(id), m = make(id, 3, fr.chapters.length), list = reviewTraits(m.p, fr);
    list.forEach(({ t }, f) => {
      m.cr.f = f; m.cr.choices = {}; m.cr.clash = []; const opts = S.rollOptions(m.p, t.id), own = traitState(fr, t, m.p.genome); let L = m.build().props.regions.traitLine;
      const words = (s) => s.replace(/^✕ /, "").split(/\s+/).length;
      if (t.nature === "doing") { assert.equal(L.text, `${t.name}: breed to change`); assert.equal(L.doing, true); assert.equal(L.changed, false); }
      else if (opts.length <= 1) assert.equal(L.text, `${t.name}: one look in this pod`);
      else if (own.kind === "asleep") assert.equal(L.text, `${t.name}: ${own.shows}, ${own.asleep} asleep`);
      else assert.equal(L.text, `${t.name}: as the pod is`);
      assert.ok(!/\d/.test(L.text), `${id} ${t.name}: no digits in "${L.text}"`); assert.ok(words(L.text) <= spec.regions.traitLine.words, `${id} ${t.name}: "${L.text}" is ${words(L.text)} words`);
      if (opts.length > 1) { m.cr.choices = { [t.id]: 1 }; L = m.build().props.regions.traitLine; assert.equal(L.changed, true); assert.ok(words(L.text) <= spec.regions.traitLine.words && !/\d/.test(L.text), `${id} ${t.name} changed: "${L.text}"`); const fo = traitState(fr, t, S.founderGenome(m.p, m.cr.choices)), same = own.kind === "hides" && 1 !== own.hiddenChoice && fo.kind !== "asleep"; assert.equal(L.text, fo.kind === "asleep" ? `${t.name}: ${fo.shows}, ${fo.asleep} asleep` : same ? `${t.name}: ${fo.shows}, hides nothing` : `${t.name}: ${fo.shows}`, `${id} ${t.name}`); assert.ok(!("tag" in L), "no tag in the props: the face picks the plate (C9)"); m.cr.clash = [t.id]; L = m.build().props.regions.traitLine; assert.deepEqual([L.clash, L.changed, L.text], [true, false, `✕ ${t.name}: won't grow like this`]); }
    });
  }
  assert.equal(make("S01", 3, 0).build().props.regions.traitLine.text, "", "nothingRead: no size, the sentence is the context's"); assert.equal(T.none, "it grows as the pod is");
});

test("the bottom line: ✓ Incubate and the price with ◆ a change (the first founder no Essence), what stays a surprise, the first block in the rules' order with its notice; ← the pod", () => {
  const Sg = spec.strings, m = make("S01", 3, 2), fr = frameOf("S01"), list = reviewTraits(m.p, fr);
  let L = m.build().line; assert.deepEqual([L.ok, L.price, L.back, L.subject, L.need], ["Incubate", "⚡ 2 ❀ 4 ⧗ 20", "Loika", "two chapters unread", ""]);
  const roll = list.findIndex(({ t }) => S.rollOptions(m.p, t.id).length > 1); m.cr.f = roll; m.cr.choices = { [list[roll].t.id]: 1 }; assert.equal(m.build().line.price, "⚡ 2 ❀ 4 ◆ 1 ⧗ 21", "the wait last: 20 and one a change");
  m.st.firstMibi = true; assert.match(m.build().line.price, / ⧗ 5$/, "the first founder: the wait is 5 whatever is shaped"); m.st.firstMibi = false; assert.ok(!("leaves" in m.build().props.regions), "no leaf grid on Create (fix 6 N1)");
  assert.equal(make("S01", 3, 0).build().line.subject, Sg.traitLine.none); assert.equal(make("S01", 3, 3).build().line.subject, "Stamina unread"); assert.equal(make("S01", 3, 4).build().line.subject, "A Loika, fully known");
  { const k = make("S01", 3, 2); L = k.build().line; assert.deepEqual([L.dim, L.short, L.blocked], [undefined, undefined, undefined], "nothing blocks"); }
  { const k = make("S01", 3, 2); k.st.bud = { kind: "founder" }; L = k.build().line; assert.deepEqual([L.blocked, L.dim, L.short, L.need], [true, undefined, undefined, Sg.notices.busy]); assert.ok(["growing", "ready"].includes(k.build().props.regions.dome.state), "the capsule shows the bud (glass and bar while it grows, door open when ready)"); }
  { const k = make("S01", 3, 2); for (let i = 0; i < 16; i++) k.st.mibis.push({ id: 100 + i, room: i >> 3, slot: i & 7, bay: i, released: false }); L = k.build().line; assert.deepEqual([L.blocked, L.dim, L.short, L.need], [true, undefined, undefined, Sg.notices.full]); assert.equal(Sg.notices.full, "the Vivarium is full", "the rooms words C17: Create's notice, lower case like its others (R6; the keys are renamed from noBay)"); }
  { const k = make("S01", 3, 2); k.st.s = 1; L = k.build().line; assert.deepEqual([L.dim, L.short, L.blocked, L.need], [true, "❀", undefined, "needs ❀: go out or return pods"]); }
  { const k = make("S01", 3, 2); k.st.e = 0; k.st.s = 0; L = k.build().line; assert.deepEqual([L.dim, L.short, L.need], [true, "⚡ ❀", "needs more ⚡ ❀: go out"]); }
  { const k = make("S01", 3, 2); k.cr.f = roll; k.cr.choices = { [list[roll].t.id]: 1 }; k.cr.clash = [list[roll].t.id]; L = k.build().line; assert.deepEqual([L.blocked, L.dim, L.short, L.need], [true, undefined, undefined, Sg.notices.clash]); }
  { const k = make("S01", 3, 2); k.st.bud = { kind: "founder" }; k.st.s = 0; assert.equal(k.build().line.need, Sg.notices.busy, "busy before short"); assert.equal(k.build().line.short, undefined, "blocked is never beside short"); }
});

test("the rail: a tab a chapter, the open tab the focused trait's chapter, one mark a tab (a clash cross over a changed diamond, else none; fix 11), no pips and no lift; nothing read opens none", () => {
  const m = make("S01", 3, 2), fr = frameOf("S01"), list = reviewTraits(m.p, fr); m.cr.f = 1; let rail = m.build().props.regions.rail;
  assert.deepEqual(rail.tabs.map((t) => t.state), ["read", "read", "unread", "unread"]); assert.equal(rail.open, fr.chapters.findIndex((c) => c === list[1].c));
  assert.ok(rail.tabs.every((t) => t.glint === false && t.mark === "" && !("pips" in t) && !("marks" in t) && !("lift" in t))); assert.equal(rail.focused, null);
  const roll = list.findIndex(({ t }) => S.rollOptions(m.p, t.id).length > 1); m.cr.f = roll; m.cr.choices = { [list[roll].t.id]: 2 }; rail = m.build().props.regions.rail; const ci = fr.chapters.findIndex((c) => c === list[roll].c);
  assert.equal(rail.tabs[ci].mark, "changed"); m.cr.clash = [list[roll].t.id]; assert.equal(m.build().props.regions.rail.tabs[ci].mark, "clash", "clash over changed");
});

test("the founder's picture follows the choices (the roll's dither runs from the old id to the new); the stamp and the cells follow what is read and changed; nothing read is one picture whatever the looks", () => {
  const m = make("S01", 3, 2), fr = frameOf("S01"), list = reviewTraits(m.p, fr), roll = list.findIndex(({ t }) => S.rollOptions(m.p, t.id).length > 1), size = spec.regions.founder.rect.slice(2);
  const was = m.build().props.regions.founder.picture; assert.equal(was, founderPicture(m.p, {}, size).id); m.cr.f = roll; m.cr.choices = { [list[roll].t.id]: 1 };
  const now = m.build().props.regions.founder.picture; assert.notEqual(now, was); assert.match(now, /^founder:S01:/); assert.ok(now.length < 96);
  const a = m.build().props.regions.stamp.asset; m.cr.choices = {}; assert.notEqual(m.build().props.regions.stamp.asset, a, "a changed look redraws the stamp");
  const n = make("S01", 3, 0); assert.match(n.build().props.regions.founder.picture, /^founder:S01:[^:]+:ghost:304x312$/, "nothing read: the ghost"); assert.match(m.build().props.regions.founder.picture, /^founder:S01:[^:]+:clear:304x312$/, "only the doings unread: clear");
});

// the pod's contact shadow (create.json regions.podShadow; Pods' rule): a slot of the class's shadow master at the class's width + 16, named in every state
test("regions.podShadow.picture is the class's contact shadow slot: pod-large-shadow:160x14, pod-medium-shadow:136x14 and pod-small-shadow:120x14", () => {
  for (const [id, cls, want] of [["S02", "large", "pod-large-shadow:160x14"], ["S01", "medium", "pod-medium-shadow:136x14"], ["S03", "small", "pod-small-shadow:120x14"]]) {
    const b = make(id, 3, 0).build(), w = pods.classes.pod[cls][0] + pods.shadow.widen;
    assert.equal(b.props.regions.pod.sizeClass, cls); assert.equal(b.props.regions.podShadow.picture, want); assert.ok(want.endsWith(`:${w}x${pods.shadow.h}`), "the width is the class's + 16");
    const r = b.requests.find((x) => x.id === want); assert.ok(r && r.kind === "slot" && r.master === `pod-${cls}-shadow` && r.size.join("x") === `${w}x14`, "the request is the class's shadow master slot");
  }
  const all = make("S01", 3, 2).build(); assert.deepEqual(validate(all.props, schema), []);
});

// the pod at rest in the capsule (create.json regions.dome, regions.travel.rest; build spec section 5): the relit pod, 72 tall, whatever the species' own class
test("regions.pod.dome is the relit pod of the capsule: relit:<species>:pod:day:<w>x<h>:v<recipe>, 72 tall at the moss line y 268 (scale 72 / 160), its blades from the capsule's interior", () => {
  for (const [id, cls] of [["S02", "large"], ["S01", "medium"], ["S03", "small"]]) {
    const b = make(id, 3, 0).build(), pod = b.props.regions.pod;
    assert.equal(pod.sizeClass, cls); assert.match(pod.dome, new RegExp(`^relit:${id}:pod:day:${pod.domeSize.join("x")}:v\\d+$`)); assert.notEqual(pod.dome, pod.picture);
    const r = b.requests.find((x) => x.id === pod.dome); assert.ok(r && r.kind === "relit" && r.scale === 72 / 160, "the request is the relit pod at 72 tall"); assert.equal(r.bg.id, b.props.regions.dome.back, "the blades come from the interior master");
    assert.deepEqual([r.area, r.anchor], [pod.domeSize, pod.domeAnchor]); assert.deepEqual(spec.regions.travel.foot.to, [864, 268], "the travel ends on the moss line");
    assert.deepEqual([b.props.regions.dome.back.split(":")[0], b.props.regions.domeFront.picture.split(":")[0]], ["capsule-interior-day-145x224", "capsule-shell-145x224"]); assert.equal(b.props.regions.dome.glass.split(":")[0], "capsule-glass-closed-145x224");
  }
});

// ---- fix 5, Create (the gate): the same look, the sealed contexts, the right slot, the case ----
test("fix 5: the trait line names the same look only when all four hold (S01 Crown: the pod's leaf crest hides bare head, the crest chosen); a hidden look chosen, a blend and any trait the pod does not hide never take it", () => {
  const fr = frameOf("S01"), crown = fr.chapters.flatMap((c) => c.traits).find((t) => t.name === "Crown");
  for (const gs of [13, 4]) {   // the Loika at frame version 4 (T-20261016-200): gs 13: the hidden copy is choice 1; gs 4: choice 2
    const m = make("S01", gs, fr.chapters.length), list = reviewTraits(m.p, fr), f = list.findIndex(({ t }) => t === crown), own = traitState(fr, crown, m.p.genome); assert.equal(own.kind, "hides"); m.cr.f = f;
    const keep = own.hiddenChoice === 1 ? 2 : 1; m.cr.choices = { [crown.id]: keep }; let L = m.build().props.regions.traitLine; assert.equal(L.text, "Crown: leaf crest, hides nothing"); assert.equal(L.changed, true);
    m.cr.choices = { [crown.id]: own.hiddenChoice }; L = m.build().props.regions.traitLine; assert.equal(L.text, "Crown: bare head", "the hidden look chosen: the plain form"); assert.equal(L.changed, true);
  }
  for (const id of SPECIES) { const fr2 = frameOf(id), m = make(id, 3, fr2.chapters.length); reviewTraits(m.p, fr2).forEach(({ t }, f) => { const own = traitState(fr2, t, m.p.genome); if (own.kind === "hides" || S.rollOptions(m.p, t.id).length <= 1 || t.nature === "doing") return; m.cr.f = f; m.cr.choices = { [t.id]: 1 }; const L = m.build().props.regions.traitLine; assert.ok(!/hides nothing/.test(L.text), `${id} ${t.name} (${own.kind}): "${L.text}"`); assert.equal(L.changed, true); }); }
});
test("fix 5: the context of a sealed chapter still shut: all else read names it (strings.sealedShut), unread ones show the count alone, never the shut one; fully known only with none unread or shut; sealedOpen counts it unread", () => {
  const Sg = spec.strings, fr = frameOf("S02"), sealed = fr.chapters.find((c) => c.sealed); assert.ok(sealed, "S02 has a sealed chapter");
  const nSealed = fr.chapters.indexOf(sealed), all = fr.chapters.length;
  assert.equal(make("S02", 3, all).build().line.subject, `all read, ${sealed.name} sealed`, "every readable chapter read, the sealed one shut"); assert.equal(Sg.sealedShut, "all read, {Chapter} sealed");
  const k = make("S02", 3, nSealed - 1).build().line.subject; assert.match(k, /unread$/); assert.ok(!k.includes(sealed.name), "the unread count leaves the shut chapter out"); assert.equal(k, `${fr.chapters[nSealed - 1].name} unread`, "unread and a shut one: the count alone, no combined form");
  const m = make("S02", 3, all); const open = createBuild({ st: m.st, settings: { ...settings, sealedOpen: true }, ui: { create: m.cr } }, spec, pods).line.subject; assert.equal(open, `${sealed.name} unread`, "sealedOpen: the sealed chapter counts as unread");
  assert.equal(make("S01", 3, frameOf("S01").chapters.length).build().line.subject, "A Loika, fully known");
});
test("fix 5: the right slot is Create's own and never the frame's notice (empty when nothing blocks, short or warns); busy ranks before the shortfall; the stamp's case ids are Pods'; the cradle front is Create's; no tag plate is requested", () => {
  const m = make("S01", 3, 2), b = m.build(); assert.equal(b.line.need, "", "nothing to say: empty, never null"); const ids = b.requests.map((r) => r.id);
  assert.deepEqual([b.props.regions.stamp.case.back, b.props.regions.stamp.case.front], ["room-stamp-case-152x152:152x152", "room-stamp-case-152x152-front:152x152"]);
  assert.ok(ids.includes("room-stamp-case-152x152:152x152") && ids.includes("room-cradle-front-create-224x96:224x96") && !ids.some((i) => /^plate-name/.test(i)), "the case and the cradle front requested; no plate-name");
  assert.equal(b.props.regions.cradle.front, "room-cradle-front-create-224x96:224x96");
  const k = make("S01", 3, 2); k.st.bud = { kind: "founder" }; k.st.s = 0; assert.equal(k.build().line.need, spec.strings.notices.busy, "busy before the shortfall");
  const n = make("S01", 3, 0).build(); assert.equal(n.props.regions.stamp.case.back, "room-stamp-case-152x152:152x152", "the case in nothingRead too");
});
