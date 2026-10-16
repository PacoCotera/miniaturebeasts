// Create's props (lvgl-switch.md §2.1, §4 R; create.json; specs/station-create-bench-spec.md): the view the face takes, views/create-props.mjs, in Node. Plain JSON that names what and never where: it validates against create.props.json in every state,
// holds no rectangle, no measure and no layout rule, fits the props budget with the frame beside it, spells the drums, the slip, the context, the notice and the price from create.json's strings and the rules, and puts the bank's span where the
// slide rule says for every species (no drum outside the span, the more mark exactly when drums are hidden).
//   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, podGenome, traitState } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { createBuild, drumsOf, firstDrum, founderPicture, createPod, bankView, bankSlide, inWords } from "../src/views/create-props.mjs";
import { createMeasure } from "../../ui/specs/measure.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames"), specs = path.resolve(here, "../../ui/specs/station"), mfile = path.resolve(here, "../../face/dist/metrics.json");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const J = (f) => JSON.parse(readFileSync(path.join(specs, f), "utf8")), spec = J("create.json"), pods = J("pods.json"), schema = J("create.props.json"), B = spec.regions.bank, SG = spec.strings;
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 12 }, T0 = 1_000_000, SPECIES = readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => f.slice(8, 11));
const measure = existsSync(mfile) ? createMeasure(JSON.parse(readFileSync(mfile, "utf8"))) : null, skipMeasure = !measure && "the face's metrics are not built (prototypes/face/build.sh)";

function validate(v, sc, at = "$", out = []) {
  if (sc.$ref) return validate(v, schema.$defs[sc.$ref], at, out);
  if (sc.anyOf) { if (!sc.anyOf.some((a) => validate(v, a, at, []).length === 0)) out.push(`${at}: none of the forms`); return out; }
  if (sc.enum && !sc.enum.includes(v)) { out.push(`${at}: ${JSON.stringify(v)} is not one of ${JSON.stringify(sc.enum)}`); return out; }
  if (sc.type) {
    const ts = [].concat(sc.type), ty = v === null ? "null" : Array.isArray(v) ? "array" : Number.isInteger(v) ? "integer" : typeof v;
    if (!ts.includes(ty) && !(ty === "integer" && ts.includes("number"))) { out.push(`${at}: a ${ty}, wanted ${ts.join(" or ")}`); return out; }
  }
  if (sc.pattern && typeof v === "string" && !new RegExp(sc.pattern).test(v)) out.push(`${at}: ${v} does not match ${sc.pattern}`);
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
  const cr = { podId: p.id, choices: {}, order: [], f: firstDrum(p, frameOf(species)), first: 0, clash: [], grown: null, ...over }; return { st, p, cr, drums: drumsOf(frameOf(species)), build: (x = cr) => createBuild({ st, settings, ui: { create: x } }, spec, pods) };
}
const rolls = (m) => m.drums.findIndex(({ c, t }) => m.p.read.includes(c.id) && S.rollOptions(m.p, t.id).length > 1);

test("Create's props validate against create.props.json for every species in every state, name no rectangle, and fit the budget", () => {
  const all = [];
  for (const id of SPECIES) {
    const fr = frameOf(id);
    for (const read of [0, 1, fr.chapters.length]) {
      const m = make(id, 3, read); all.push([`${id}, ${read} read`, m.build()]);
      for (const f of [0, Math.floor(m.drums.length / 2), m.drums.length - 1]) { m.cr.f = f; all.push([`${id}, ${read} read, drum ${f}`, m.build()]); }
      const r = rolls(m); if (r >= 0) { m.cr.f = r; m.cr.choices = { [m.drums[r].t.id]: 1 }; m.cr.order = [m.drums[r].t.id]; all.push([`${id}, a rolled look`, m.build()]); m.cr.clash = [m.drums[r].t.id]; all.push([`${id}, a clash`, m.build()]); }
    }
  }
  { const m = make("S01", 3, 2); m.st.bud = { kind: "founder" }; all.push(["busy", m.build()]); }
  { const m = make("S01", 3, 2); const r = S.grow(m.st, m.p, {}, settings, T0); m.cr.grown = { code: r.bud.code, cost: r.cost, pod: m.p }; all.push(["grown", m.build()]); }
  for (const [name, b] of all) {
    const bad = validate(b.props, schema); assert.deepEqual(bad, [], `${name}: ${bad.slice(0, 3).join("; ")}`);
    const json = JSON.stringify(b.props); assert.ok(!/"(x|y|w|h|rect|box|pitch)"\s*:/.test(json), `${name}: props name what, never where`);
    assert.ok(json.length + JSON.stringify(b.line).length < 32 * 1024, `${name}: ${json.length} bytes`);
    for (const r of b.requests) assert.ok(typeof r.id === "string" && r.id.length > 0 && r.id.length < 96, `${name}: ${r.id}`);
  }
});

test("the state: nothing read (every drum capped, the ring on the first drum), shape with chapters read (the ring on the first read drum), grow once ✓ has paid (no ring, the drums locked)", () => {
  const a = make("S01", 3, 0).build(); assert.equal(a.props.state, "nothingRead"); assert.equal(a.props.focus.cur, "drum.0"); assert.ok(a.props.regions.bank.drums.every((d) => d.state === "capped"));
  const m1 = make("S03", 3, 2), b = m1.build(); assert.equal(b.props.state, "shape"); assert.equal(b.props.focus.cur, "drum.0"); assert.equal(b.props.focus.targets.length, m1.drums.length); assert.ok(b.props.focus.targets.every((t, i) => t.id === `drum.${i}` && t.group === "drum"));
  const m = make("S01", 3, 1), r = S.grow(m.st, m.p, {}, settings, T0); m.cr.grown = { code: r.bud.code, cost: r.cost, pod: m.p, minutes: r.bud.minutes }; const g = m.build();
  assert.equal(g.props.state, "grow"); assert.equal(g.props.regions.code, `${r.bud.code.slice(0, 3)} ${r.bud.code.slice(3, 6)} ${r.bud.code.slice(6, 9)}`); assert.equal(g.props.regions.toIncubator, "to the Incubator");
  assert.ok(g.line.ok === null && g.line.back === null && g.line.price == null && g.line.need === "", "grow: the line is Growing, no action, price or way back, an empty right slot"); assert.equal(g.line.subject, spec.strings.growing);
  assert.deepEqual(g.props.focus, { cur: "room", targets: [] }, "grow: no ring"); assert.equal(g.props.regions.bank.locked, true); assert.equal(g.props.regions.slip.printed, true);
  assert.equal(createPod(m.st, m.cr).id, m.p.id, "the pod is the screen's own once it has left the rack");
});

test("the drums: one a trait in chapter order, grouped by chapter; the state of each by the spec (capped for an unread chapter, pinned for a doing, one face, rest, changed, clash); faces and the face turned to", () => {
  for (const id of SPECIES) {
    const fr = frameOf(id), m = make(id, 3, Math.max(1, fr.chapters.length - 1)), b = m.build(), D = b.props.regions.bank.drums;
    assert.equal(D.length, fr.chapters.reduce((n, c) => n + c.traits.length, 0), `${id}: a drum a trait`);
    D.forEach((d, i) => {
      const dr = m.drums[i]; assert.equal(d.trait, dr.t.id); assert.equal(d.group, dr.ci); assert.equal(d.chapter, dr.c.id);
      assert.equal(d.lead, i === 0 || m.drums[i - 1].ci !== dr.ci, `${id} ${d.name}: a group's first drum leads`); assert.ok(d.word.length > 0, "every drum names its chapter");
      if (!m.p.read.includes(dr.c.id)) assert.deepEqual([d.state, d.faces, d.face], ["capped", 1, 0]);
      else if (dr.t.nature === "doing") assert.deepEqual([d.state, d.faces], ["pinned", 1]);
      else { const n = S.rollOptions(m.p, dr.t.id).length; assert.equal(d.faces, Math.max(1, n)); assert.equal(d.state, n > 1 ? "rest" : "oneFace"); assert.ok(d.faces <= 3); }
      assert.equal(d.closeUp !== "", d.state !== "capped" && i >= b.props.regions.bank.first && i <= b.props.regions.bank.last, `${id} ${d.name}: a close-up for a shown, uncapped drum`);
    });
  }
  const m = make("S01", 3, 4), r = rolls(m); assert.ok(r >= 0); const t = m.drums[r].t;
  for (const face of [1, 2]) { m.cr.choices = { [t.id]: face }; const d = m.build().props.regions.bank.drums[r]; assert.deepEqual([d.state, d.face], ["changed", face]); }
  m.cr.clash = [t.id]; assert.equal(m.build().props.regions.bank.drums[r].state, "clash");
});

test("the bank's span: for every species, with the ring walked through every drum and back, the focused drum is shown, every drum shown lies wholly inside the span, the left mark shows exactly when the first drum is not drum 0 and the right mark exactly when drums are hidden after", () => {
  const [w0, w1] = B.span, D = B.drum, mark = B.more.size[0]; let slid = 0, fits = 0;
  for (const id of SPECIES) {
    const fr = frameOf(id), ch = drumsOf(fr).map((d) => d.ci), n = ch.length, total = n * D.pitch - (D.pitch - D.size[0]) + (fr.chapters.length - 1) * D.chapterGap;
    for (const order of [Array.from({ length: n }, (_, i) => i), Array.from({ length: n }, (_, i) => n - 1 - i)]) {
      let first = order[0] === 0 ? 0 : n - 1;
      for (const f of order) {
        const v = bankSlide(B, ch, first, f); first = v.first;
        assert.ok(f >= v.first && f <= v.last, `${id}: drum ${f} shown in ${v.first}..${v.last}`);
        const x = (i) => v.left + (i - v.first) * D.pitch + (ch[i] - ch[v.first]) * D.chapterGap, hiddenAfter = v.last < n - 1;
        for (let i = v.first; i <= v.last; i++) assert.ok(x(i) >= v.left && x(i) + D.size[0] <= (hiddenAfter ? w1 - mark : w1), `${id}: drum ${i} wholly inside the span`);
        assert.equal(v.moreLeft, v.first > 0); assert.equal(v.moreRight, hiddenAfter); assert.equal(v.left, w0 + (v.first > 0 ? mark : 0));
        if (hiddenAfter) assert.ok(x(v.last + 1) + D.size[0] > w1 - mark, `${id}: the drum after the last shown does not fit`);
      }
    }
    if (total <= w1 - w0) { fits++; const v = bankSlide(B, ch, 0, n - 1); assert.deepEqual([v.first, v.last, v.moreLeft, v.moreRight], [0, n - 1, false, false], `${id}: ${total} px fits the span: no slide, no mark`); } else slid++;
  }
  assert.ok(fits >= 1 && slid >= 1, `species that fit (${fits}) and that slide (${slid})`);
  { const v = bankSlide(B, drumsOf(frameOf("S05")).map((d) => d.ci), 0, 0); assert.ok(v.moreRight && !v.moreLeft && v.last < 8, "S05 (nine drums in six chapters) shows fewer than nine and the right mark"); }
  { const ch = drumsOf(frameOf("S03")).map((d) => d.ci), v = bankSlide(B, ch, 0, 11); assert.ok(v.first > 0 && v.first === ch.indexOf(ch[11]), "S03, the 12th drum: the slide aligns its chapter at the left"); assert.deepEqual(bankView(B, ch, v.first), v); }
});

test("a turn changes the drum, the slip's line, the price and the founder's picture, and nothing the spec does not name", () => {
  const m = make("S01", 3, 4), r = rolls(m), t = m.drums[r].t, was = m.build(); m.cr.f = r; m.cr.choices = { [t.id]: 1 }; m.cr.order = [t.id]; const now = m.build();
  assert.notDeepEqual(now.props.regions.bank.drums[r], was.props.regions.bank.drums[r]); assert.equal(now.props.regions.slip.lines.length, 1); assert.ok(now.props.regions.slip.lines[0].startsWith(`${t.name}: `));
  assert.notEqual(now.line.price, was.line.price); assert.notEqual(now.props.regions.founder.picture, was.props.regions.founder.picture);
  const a = JSON.parse(JSON.stringify(now.props.regions)), b = JSON.parse(JSON.stringify(was.props.regions));
  for (const k of ["bank", "slip", "founder", "stamp"]) { delete a[k]; delete b[k]; } assert.deepEqual(a, b, "the other regions do not move");
  assert.deepEqual(was.props.regions.bank.drums.filter((_, i) => i !== r), now.props.regions.bank.drums.filter((_, i) => i !== r), "the other drums do not move");
});

test("the slip: Your changes newest first, at most four then 'and n in words more'; none yet / none: read a chapter first; a clash line; Still a surprise names the unread chapters; no digits", () => {
  const m = make("S03", 3, 8), ST = SG.slip, shapeable = m.drums.filter(({ c, t }) => m.p.read.includes(c.id) && S.rollOptions(m.p, t.id).length > 1).map((d) => d.t.id);
  assert.ok(shapeable.length >= 6, "S03 has traits to turn"); let s = m.build().props.regions.slip; assert.deepEqual([s.lines, s.more, s.none, s.surprise, s.heading], [[], "", ST.none, null, ST.changes], "nothing changed, nothing unread");
  m.cr.choices = {}; m.cr.order = []; for (const id of shapeable.slice(0, 6)) { m.cr.choices[id] = 1; m.cr.order.push(id); }
  s = m.build().props.regions.slip; assert.equal(s.lines.length, 4); assert.equal(s.more, "and two more"); assert.ok(s.lines[0].startsWith(m.drums.find((d) => d.t.id === shapeable[5]).t.name + ":"), "the newest first"); assert.equal(s.none, "");
  assert.ok(s.lines.every((l) => !/\d/.test(l)) && !/\d/.test(s.more));
  const n = make("S02", 3, 0).build().props.regions.slip; assert.equal(n.none, ST.noneUnread); assert.equal(n.surprise.heading, ST.surprise); assert.equal(n.surprise.words, frameOf("S02").chapters.map((c) => (c.id === "legs-tail" ? "Legs & Tail" : c.name)).join(", "));
  const k = make("S01", 3, 2), r = rolls(k); k.cr.choices = { [k.drums[r].t.id]: 1 }; k.cr.order = [k.drums[r].t.id]; k.cr.clash = [k.drums[r].t.id]; assert.equal(k.build().props.regions.slip.clash, `✕ ${k.drums[r].t.name} clashes`);
  k.cr.clash = [k.drums[r].t.id, "x-other"]; assert.match(k.build().props.regions.slip.clash, /^✕ .+ and .+ clash$/);
  for (let i = 0; i < 28; i++) assert.ok(!/\d/.test(inWords(i)), `${i} in words`); assert.equal(inWords(23), "twenty three");
});

test("the slip's lines, measured: every line at 16 px against the 176 the slip holds, and the longest stack fits the slip", { skip: skipMeasure }, () => {
  const SL = spec.regions.slip, ST = SG.slip, room = SL.rect[2] - 2 * SL.pad, lines = [];
  for (const id of SPECIES) {
    const fr = frameOf(id), m = make(id, 3, fr.chapters.length), ids = m.drums.filter(({ t }) => S.rollOptions(m.p, t.id).length > 1).map((d) => d.t.id);
    m.cr.choices = {}; m.cr.order = []; for (const t of ids.slice(0, 6)) { m.cr.choices[t] = 1; m.cr.order.push(t); }
    const s = m.build().props.regions.slip; for (const l of [...s.lines, s.more].filter(Boolean)) lines.push([id, l, measure(l, 16)]);
  }
  for (const w of [ST.changes, ST.none, ST.noneUnread, ST.surprise, "and twenty three more"]) lines.push(["strings", w, measure(w, 16)]);
  const over = lines.filter(([, , w]) => w > room), widest = Math.max(...lines.map((x) => x[2]));
  console.log(`# the slip's lines: ${lines.length} measured, the widest ${widest} px, ${over.length} over ${room} px (cut at a word with … by the face)`);
  assert.ok(over.length <= lines.length / 4, `${over.length} lines over ${room}: ${JSON.stringify(over.slice(0, 4))}`);
  assert.ok(SL.pitch * (1 + 5 + 1) + SL.gap + SL.pitch * (1 + 2) <= SL.rect[3] - 2 * SL.pad, "the longest stack (heading, four changes and 'and n more', the clash, heading, two lines of chapter words) fits the slip");
});

test("the context line: the focused drum's '{Trait}: {look}', or as its state says (still a surprise, breed to change, one look); nothing read the pod's sentence; no ⧗ anywhere on the line", () => {
  const m = make("S03", 3, 3), fr = frameOf("S03");
  m.drums.forEach((d, i) => {
    m.cr.f = i; const b = m.build(), s = b.props.regions.bank.drums[i], line = b.line.subject, own = traitState(fr, d.t, m.p.genome);
    if (s.state === "capped") assert.equal(line, `${d.t.name} is still a surprise`);
    else if (s.state === "pinned") assert.equal(line, `${d.t.name}: breed to change`);
    else if (s.state === "oneFace") assert.equal(line, `${d.t.name}: one look in this pod`);
    else if (own.kind === "asleep") assert.match(line, /asleep$/);
    else assert.equal(line, `${d.t.name}: ${own.shows}`);
    assert.ok(!/⧗/.test(JSON.stringify(b.line)), "owner ruling 3: no ⧗ n on Create");
  });
  assert.equal(make("S01", 3, 0).build().line.subject, SG.drum.none);
});

test("the bottom line: ✓ Grow it and the price with ◆ a change (the first founder no Essence), no ⧗ n; the first block in the rules' order with its notice; ← the pod", () => {
  const m = make("S01", 3, 2); let L = m.build().line; assert.deepEqual([L.ok, L.price, L.back, L.need], ["Grow it", "⚡ 2 ❀ 4", "Loika", ""]);
  const r = rolls(m); m.cr.f = r; m.cr.choices = { [m.drums[r].t.id]: 1 }; assert.equal(m.build().line.price, "⚡ 2 ❀ 4 ◆ 1", "a change costs ◆ 1; the wait is not said here");
  m.st.firstMibi = true; assert.equal(m.build().line.price, "⚡ 2 ◆ 1", "the first founder no Essence"); m.st.firstMibi = false;
  { const k = make("S01", 3, 2); L = k.build().line; assert.deepEqual([L.dim, L.short, L.blocked], [undefined, undefined, undefined], "nothing blocks"); }
  { const k = make("S01", 3, 2); k.st.bud = { kind: "founder" }; L = k.build().line; assert.deepEqual([L.blocked, L.dim, L.short, L.need], [true, undefined, undefined, SG.notices.busy]); }
  { const k = make("S01", 3, 2); for (let i = 0; i < 12; i++) k.st.mibis.push({ id: 100 + i, bay: i, released: false }); L = k.build().line; assert.deepEqual([L.blocked, L.dim, L.short, L.need], [true, undefined, undefined, SG.notices.noBay]); }
  { const k = make("S01", 3, 2); k.st.s = 1; L = k.build().line; assert.deepEqual([L.dim, L.short, L.blocked, L.need], [true, "❀", undefined, "needs ❀: go out or return pods"]); }
  { const k = make("S01", 3, 2); k.st.e = 0; k.st.s = 0; L = k.build().line; assert.deepEqual([L.dim, L.short, L.need], [true, "⚡ ❀", "needs more ⚡ ❀: go out"]); }
  { const k = make("S01", 3, 2), q = rolls(k); k.cr.f = q; k.cr.choices = { [k.drums[q].t.id]: 1 }; k.cr.clash = [k.drums[q].t.id]; L = k.build().line; assert.deepEqual([L.blocked, L.dim, L.short, L.need], [true, undefined, undefined, SG.notices.clash]); assert.equal(L.subject, `${k.drums[q].t.name} clashes`); }
  { const k = make("S01", 3, 2); k.st.bud = { kind: "founder" }; k.st.s = 0; assert.equal(k.build().line.need, SG.notices.busy, "busy before short"); assert.equal(k.build().line.short, undefined, "blocked is never beside short"); }
});

test("the founder's picture follows the choices (the dither runs from the old id to the new); the stamp follows what is read and changed; nothing read is one picture whatever the looks", () => {
  const m = make("S01", 3, 2), r = rolls(m), size = spec.regions.founder.rect.slice(2);
  const was = m.build().props.regions.founder.picture; assert.equal(was, founderPicture(m.p, {}, size).id); m.cr.f = r; m.cr.choices = { [m.drums[r].t.id]: 1 };
  const now = m.build().props.regions.founder.picture; assert.notEqual(now, was); assert.match(now, /^founder:S01:/); assert.ok(now.length < 96);
  const a = m.build().props.regions.stamp.asset; m.cr.choices = {}; assert.notEqual(m.build().props.regions.stamp.asset, a, "a changed look redraws the stamp");
  const n = make("S01", 3, 0); assert.match(n.build().props.regions.founder.picture, /^founder:S01:[^:]+:ghost:304x312$/, "nothing read: the ghost");
});

test("the bench's art is named by PH plates at the sizes of the spec, the pod by Pods' renderer at 112×136, the found sentence from Pods' rule", () => {
  const b = make("S03", 3, 2).build(), by = Object.fromEntries(b.requests.map((r) => [r.id, r])), R = spec.regions;
  for (const [id, k] of [["create-bench", "bench"], ["create-well", "well"], ["create-gene-line", "geneLine"], ["create-dish", "dish"], ["slip-208x296", "slip"]]) { const r = by[id]; assert.ok(r && r.kind === "ph" && r.size.join("x") === R[k].rect.slice(2).join("x"), `${id} is a ${R[k].rect.slice(2).join("x")} PH plate`); }
  for (const id of ["create-drum-rest", "create-drum-pinned", "create-drum-capped", "create-drum-clash"]) assert.deepEqual(by[id].size, [80, 80]);
  assert.deepEqual([by["create-drum-notch"].size, by["create-drum-turn-up"].size, by["create-drum-turn-down"].size, by["create-bank-more-left"].size], [[12, 8], [16, 8], [16, 8], [16, 80]]);
  assert.ok(Object.values(by).some((r) => r.kind === "pod" && r.id === "pod:S03:i:112x136" && r.size.join("x") === "112x136"), "the pod at 112×136");
  assert.ok(b.props.regions.name.length > 0); assert.ok(b.props.regions.found.length >= 1 && b.props.regions.found.length <= 2 && b.props.regions.found[0].startsWith("Found "));
  assert.ok(Object.values(by).filter((r) => /^look-S03-/.test(r.id)).every((r) => r.size.join("x") === "64x64"), "the close-ups are 64×64");
});
