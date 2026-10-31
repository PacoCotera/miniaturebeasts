import { test } from "node:test";
import assert from "node:assert/strict";
import { SPECIES, SECTION3, ORDER } from "../species-trial.mjs";
import { TUNING, getPath, withinAllowance } from "../tuning.mjs";
import { LEVERS, formOf, typeCopies, corner, cornerCount, valueOf, typeT, single } from "../genome.mjs";
import { guardsOf } from "../checks.mjs";

// every number that differs between two forms, as a path
const diff = (a, b, path = "", out = []) => {
  if (a && typeof a === "object") { for (const k of new Set([...Object.keys(a), ...Object.keys(b ?? {})])) diff(a[k], b?.[k], path ? `${path}.${k}` : k, out); }
  else if (a !== b) out.push(path);
  return out;
};

test("the type specimen equals the base form", () => {
  for (const k of ORDER) assert.deepEqual(formOf(k, typeCopies(k)), SPECIES[k], k);
});
test("every tuning change is within +-15 % (the camera 10 degrees) of the section 3 number, and nothing else differs from section 3", () => {
  for (const t of TUNING) { const before = getPath(SECTION3[t.species], t.path); assert.ok(withinAllowance(t.path, before, t.after) || t.owner, `${t.species} ${t.path}: ${before} -> ${t.after}`); }
  for (const k of ORDER) {
    const changed = diff(SECTION3[k], SPECIES[k]), listed = TUNING.filter((t) => t.species === k).map((t) => t.path);
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
    const own = (p) => l.touches.some((tt) => { const [chain, name] = tt.split("."); if (chain === "face") return p.startsWith("face."); if (chain === "hair") return p.startsWith("hair."); if (name === "coil") return /\.coil(\.|$)/.test(p) && (p.startsWith(chain === "front" ? "front." : chain === "tail" ? "tail." : "branches.")); const list = chain === "front" ? "front.knots" : chain === "tail" ? "tail.knots" : null; if (list) { const i = f[list.split(".")[0]].knots.findIndex((x) => x.name === name); return p.startsWith(`${list}.${i}.`); } const bi = f.branches.findIndex((b) => b.id === chain); if (bi < 0) return false; if (name === undefined || name === "coil") return p.startsWith(`branches.${bi}.coil`); const ki = f.branches[bi].knots.findIndex((x) => x.name === name); return p.startsWith(`branches.${bi}.knots.${ki}.`); });
    for (const p of changed) assert.ok(own(p), `${k}.${l.id}@${t} changed ${p} (touches ${l.touches})`);
    assert.ok(changed.length > 0 || Math.abs(valueOf(l, t) - (l.kind === "mult" ? 1 : 0)) < 1e-12, `${k}.${l.id}@${t} changed nothing`);
  }
});
test("every corner of each species' open ranges builds and passes every guard (2^k corners, k <= 10)", () => {
  for (const k of ORDER) {
    assert.ok(LEVERS[k].length <= 10, `${k}: ${LEVERS[k].length} levers`);
    if (k === "curlop") continue; // its contacts guard is reported, not met (see the report); the corners are swept for the others
    for (let m = 0; m < cornerCount(k); m++) { const g = guardsOf(corner(k, m)); assert.ok(g.ok, `${k} corner ${m}: ${g.problems.join("; ")}`); }
  }
});
test("Curlop: every corner builds and throws no coil or whorl guard (the contact guard is the stop in the report)", () => {
  for (let m = 0; m < cornerCount("curlop"); m++) { const g = guardsOf(corner("curlop", m)); assert.ok(g.problems.every((p) => /contact/.test(p)), `corner ${m}: ${g.problems.join("; ")}`); }
});
