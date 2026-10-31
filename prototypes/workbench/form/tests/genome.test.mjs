import { test } from "node:test";
import assert from "node:assert/strict";
import { SPECIES, ROUND3, ORDER } from "../species-trial.mjs";
import { TUNING, getPath, withinAllowance } from "../tuning.mjs";
import { LEVERS, KINDS, atRegionJoin, touchedKnots, formOf, typeCopies, corner, cornerForm, cornerCopies, cornerCount, valueOf, typeT, single } from "../genome.mjs";
import { buildChains } from "../spine.mjs";
import { guardsOf, transMetrics } from "../checks.mjs";

// every number that differs between two forms, as a path
const diff = (a, b, path = "", out = []) => {
  if (a && typeof a === "object") { for (const k of new Set([...Object.keys(a), ...Object.keys(b ?? {})])) diff(a[k], b?.[k], path ? `${path}.${k}` : k, out); }
  else if (a !== b) out.push(path);
  return out;
};

test("the type specimen equals the base form", () => {
  for (const k of ORDER) assert.deepEqual(formOf(k, typeCopies(k)), SPECIES[k], k);
});
test("every tuning change is within +-15 % (the camera 10 degrees) of the ROUND3 number, and nothing else differs from ROUND3", () => {
  for (const t of TUNING) { const before = getPath(ROUND3[t.species], t.path); assert.ok(withinAllowance(t.path, before, t.after) || t.owner, `${t.species} ${t.path}: ${before} -> ${t.after}`); }
  for (const k of ORDER) {
    const changed = diff(ROUND3[k], SPECIES[k]), listed = TUNING.filter((t) => t.species === k && t.after !== getPath(ROUND3[k], t.path)).map((t) => t.path);
    assert.deepEqual(changed.sort(), [...new Set(listed)].sort(), k);
  }
});
test("a multiplier is geometric and an offset linear, and the type sits at m = 1, o = 0", () => {
  for (const k of ORDER) for (const l of LEVERS[k]) {
    const [lo, hi] = l.range; assert.ok(lo <= (l.kind === "mult" ? 1 : 0) && hi >= (l.kind === "mult" ? 1 : 0), `${k}.${l.id}`);
    assert.ok(Math.abs(valueOf(l, 0) - lo) < 1e-12 && Math.abs(valueOf(l, 1) - hi) < 1e-12);
    const mid = valueOf(l, 0.5); assert.ok(l.kind === "mult" ? Math.abs(mid - Math.sqrt(lo * hi)) < 1e-9 : Math.abs(mid - (lo + hi) / 2) < 1e-9);
    assert.equal(valueOf(l, typeT(l)), l.kind === "mult" ? 1 : 0);
  }
});
test("the shown value of a pair of copies is their mean", () => {
  const l = LEVERS.curlop.find((x) => x.id === "girth");
  const a = formOf("curlop", { ...typeCopies("curlop"), girth: [0, 1] }), b = formOf("curlop", { ...typeCopies("curlop"), girth: [0.5, 0.5] });
  assert.deepEqual(a, b); assert.ok(Math.abs(a.levers.girth - valueOf(l, 0.5)) < 1e-12);
});
test("each lever moves only its own knots", () => {
  for (const k of ORDER) for (const l of LEVERS[k]) for (const t of [0, 1]) {
    const f = single(k, l.id, t), changed = diff(SPECIES[k], f).filter((p) => !p.startsWith("levers"));
    const own = (p) => l.touches.some((tt) => { const [chain, name] = tt.split("."); if (chain === "face") return p.startsWith("face."); if (chain === "look") return p.startsWith("look."); if (chain === "hair") return p.startsWith("hair."); if (name === "coil") return /\.coil(\.|$)/.test(p) && (p.startsWith(chain === "front" ? "front." : chain === "tail" ? "tail." : "branches.")); const list = chain === "front" ? "front.knots" : chain === "tail" ? "tail.knots" : null; if (list) { const i = f[list.split(".")[0]].knots.findIndex((x) => x.name === name); return p.startsWith(`${list}.${i}.`); } const bi = f.branches.findIndex((b) => b.id === chain); if (bi < 0) return false; if (name === undefined || name === "coil") return p.startsWith(`branches.${bi}.coil`); const ki = f.branches[bi].knots.findIndex((x) => x.name === name); return p.startsWith(`branches.${bi}.knots.${ki}.`); });
    for (const p of changed) assert.ok(own(p), `${k}.${l.id}@${t} changed ${p} (touches ${l.touches})`);
    assert.ok(changed.length > 0 || Math.abs(valueOf(l, t) - (l.kind === "mult" ? 1 : 0)) < 1e-12, `${k}.${l.id}@${t} changed nothing`);
  }
});
test("the open sets are as design 7 (11, 10, 10, 1, 11 levers) less the locked ones (Drapet's fringe-gap), and the corners are 2^k for k <= 10, else 512 Latin-hypercube points", () => {
  assert.deepEqual(ORDER.map((k) => LEVERS[k].length), [11, 10, 9, 1, 11]);
  assert.deepEqual(ORDER.map((k) => cornerCount(k)), [512, 1024, 512, 2, 512]);
  const n = 512, strata = LEVERS.curlop.map((l) => new Set(Array.from({ length: n }, (_, i) => Math.floor(cornerCopies("curlop", i)[l.id][0] * n))));
  for (const s of strata) assert.equal(s.size, n); // one point per stratum and lever
});
// Round 3: every guard, the join guards (trans.slope <= .6 with no exemption, trans.c1 <= .05) and face.surface included, holds on every corner.
const BUILD_ONLY = (problems) => problems;
test("every corner builds and passes every guard (a deterministic sample of 64 per species here; the CLI sweeps them all)", () => {
  for (const k of ORDER) {
    const n = cornerCount(k), step = Math.max(1, Math.floor(n / 64));
    for (const i of [...Array.from({ length: Math.ceil(n / step) }, (_, j) => j * step), n - 1]) { const g = guardsOf(cornerForm(k, i)); assert.deepEqual(BUILD_ONLY(g.problems), [], `${k} corner ${i}`); }
  }
});
test("the type of every species passes the join guards (Loika included: no exemption)", () => {
  for (const k of ORDER) { const p = guardsOf(SPECIES[k]).problems.filter((x) => /^trans\./.test(x)); assert.deepEqual(p, [], k); }
});
test("the type's outer slope is at most .50 at every join an open lever touches, and its c1 jump at most .04", () => {
  for (const k of ORDER) { const t = transMetrics(SPECIES[k], buildChains(SPECIES[k]), touchedKnots(k)); assert.ok(t.slopeTouched <= 0.5 + 1e-9, `${k} ${t.slopeTouched}`); assert.ok(t.jump <= 0.04 + 1e-9, `${k} c1 ${t.jump}`); }
});
test("lever.join: a size lever scales a knot by sqrt(m) where its neighbour outside the set has another part, and not where the part is the same (synthetic chain)", () => {
  const knot = (name, part) => ({ name, part, ds: 0.3, k: 0, psi: 0, w: 1, u: 1, d: 1 });
  const form = { front: { knots: [knot("a", "body"), knot("b", "body"), knot("c", "body"), knot("d", "neck"), knot("e", "neck"), knot("f", "neck"), knot("g", "head")] }, tail: null, branches: [], look: {}, nape: 0 };
  assert.equal(atRegionJoin(form, ["a", "b", "c"], "c"), true); // d is outside the set and has another part
  assert.equal(atRegionJoin(form, ["a", "b", "c"], "b"), false); // both neighbours are in the set
  assert.equal(atRegionJoin(form, ["a", "b"], "b"), false); // c is outside the set but of the same part
  assert.equal(atRegionJoin(form, ["d", "e"], "d"), true); assert.equal(atRegionJoin(form, ["d", "e"], "e"), false); // e's neighbour f is the same part
  assert.equal(atRegionJoin(form, ["e", "f"], "f"), true); // g is a head
  const m = 1.2, f = structuredClone(form); KINDS.girth(f, { knots: ["a", "b", "c"] }, m);
  assert.ok(Math.abs(f.front.knots[1].w - m) < 1e-12); assert.ok(Math.abs(f.front.knots[2].w - Math.sqrt(m)) < 1e-12); assert.equal(f.front.knots[3].w, 1); // only its own knots move
  const f2 = structuredClone(form); KINDS.mass(f2, { pelvis: ["a", "b"], chest: ["c"] }, m);
  assert.ok(Math.abs(f2.front.knots[2].w - Math.sqrt(1 / m)) < 1e-12 && Math.abs(f2.front.knots[0].w - m) < 1e-12);
});
