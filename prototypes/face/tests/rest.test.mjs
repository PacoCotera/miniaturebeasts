// R4b on the face (vivarium.json rules.show; the game designer's rest rules): a resident the room does not show (props shown false) is a rester. It finishes its trip, then rests where the props say: on the bed (its sleeper draws), curled in a nice spot, or
// out of sight off main's left end; a shown one comes back; a new rester starts at rest; the shown are the only ones counted for the raised cap and the travelling ceiling. Moving sets and stills, the whole, Idle and Home, on the WebAssembly build.
//   node --test prototypes/face/tests/rest.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { movingScene, bootScene, resend, runFrames, SPEC, BUILT, STATE } from "./moving-scene.mjs";

const skip = !BUILT && "face not built (prototypes/face/build.sh)";
const RS = { shown: 0, finish: 1, going: 2, rest: 3 }, RK = { none: 0, bed: 1, curl: 2, out: 3 };
const hook = (f, i, k) => f.M._face_test_rest(i, k);
const rec = (f, n) => Array.from({ length: n }, (_, i) => ({ rs: hook(f, i, 0), rk: hook(f, i, 1), sh: hook(f, i, 2), hidden: hook(f, i, 3), x: hook(f, i, 4), feet: hook(f, i, 5), walking: hook(f, i, 6), lv: hook(f, i, 7), fx: hook(f, i, 8), cw: hook(f, i, 9) }));
const resters = (sc) => sc.props.regions.residents.map((p, i) => [p, i]).filter(([p]) => p.shown === false).map(([, i]) => i);

for (const [name, o, where] of [["moving sets", { adults: 4, juveniles: 3, s05: 1 }, "bed"], ["stills (no curl picture: out)", { adults: 4, juveniles: 3, s05: 1, motionSets: false }, "out"]]) {
  test(`Roots, ${name}: three resters finish their trips and then rest (on the bed, their walkers hiding where they stand and their sleepers drawn; with no curl picture, off the left edge); never hidden mid-trip; at most two travel; five shown`, { skip }, async () => {
    const sc = movingScene("vivarium", { ...o, focus: "room" }), n = sc.props.regions.residents.length, R = resters(sc); assert.equal(n, 8); assert.equal(R.length, 3); assert.ok(R.every((i) => sc.props.regions.residents[i].restAt === where));
    const f = await bootScene(sc), prev = {}; let hidden = false, maxTravel = 0;
    runFrames(f, 90000, { each: () => { const r = rec(f, n); maxTravel = Math.max(maxTravel, r.filter((q) => q.walking).length);
      r.forEach((q, i) => { if (q.hidden) { assert.equal(q.walking, 0, `${i}: hidden mid-trip`); hidden = true; } const p = prev[i]; if (p && (q.rs === RS.finish || q.rs === RS.going) && p.rs !== RS.shown) assert.ok(Math.abs(q.x - p.x) <= 8 && Math.abs(q.feet - p.feet) <= 8, `${i}: a rester leaps (${p.x},${p.feet}) -> (${q.x},${q.feet})`); prev[i] = q; }); } });
    const r = rec(f, n); assert.equal(r.filter((q) => q.sh).length, 5, "five shown"); for (const i of R) assert.deepEqual([r[i].rs, r[i].rk, r[i].hidden], [RS.rest, RK[where], 1], `${i} rests ${where}`);
    assert.ok(hidden); assert.ok(maxTravel <= SPEC("vivarium").rules.travel.max, `at most ${SPEC("vivarium").rules.travel.max} travel (${maxTravel})`);
    const nodes = f.nodeNames?.() ?? null; if (nodes) assert.equal(nodes.filter((x) => x === "bed.sleepers").length, 3);
    assert.deepEqual(f.errors(), []);
  });
}

test("Reeds, no bed: a rester curls in a nice spot (at most two, a valid stand, 48 px apart ink to ink) or walks out past the window's left edge and hides; the rest is the same on every run", { skip }, async () => {
  const run = async () => { const sc = movingScene("vivarium", { adults: 4, juveniles: 3, s05: 1, room: 1, focus: "room" }), n = sc.props.regions.residents.length, f = await bootScene(sc); runFrames(f, 90000); return { sc, n, f, r: rec(f, n), h: f.hash() }; };
  const a = await run(), b = await run(); assert.equal(a.h, b.h, "determinism: the same clock, the same hash"); assert.deepEqual(a.r, b.r);
  const R = resters(a.sc); assert.equal(R.length, 3); assert.ok(!("bed" in a.sc.props.regions));
  const curls = R.filter((i) => a.r[i].rk === RK.curl), outs = R.filter((i) => a.r[i].rk === RK.out); console.log("reeds rest:", R.map((i) => [a.sc.props.regions.residents[i].stage, a.sc.props.regions.residents[i].restAt, a.r[i].rk, a.r[i].x, a.r[i].feet].join("/")).join(" ; ")); assert.equal(curls.length + outs.length, 3); assert.ok(curls.length <= 2, "at most two curled");
  for (const i of R) assert.equal(a.r[i].rs, RS.rest, `${i} is at rest`);
  for (const i of outs) assert.deepEqual([a.r[i].hidden, a.r[i].walking], [1, 0], "out of sight");
  for (const i of curls) assert.equal(a.r[i].hidden, 0, "a curl is drawn");
  for (const i of curls) for (const j of curls) if (i < j) assert.ok(Math.abs(a.r[i].fx - a.r[j].fx) >= Math.ceil(a.r[i].cw / 2) + Math.ceil(a.r[j].cw / 2) + SPEC("vivarium").rules.show.curl.gap, `curls ink to ink at least ${SPEC("vivarium").rules.show.curl.gap} px apart (R4b-1b: |xA - xB| >= ceil(inkA.w/2) + ceil(inkB.w/2) + gap)`);
  assert.deepEqual(a.f.errors(), []);
});

test("a still that curls (it has a curl picture) walks to its nice spot and is drawn curled there: a resting figure of the curl's own box, held, not hidden", { skip }, async () => {
  const sc = movingScene("vivarium", { adults: 4, juveniles: 3, s05: 1, room: 1, focus: "room", motionSets: false }), n = sc.props.regions.residents.length, R = resters(sc);
  for (const i of R) { const p = sc.props.regions.residents[i]; p.restAt = "curl"; p.curl = "mibi:curl-test:" + i; p.curlFigure = [20, 30, 56, 50]; sc.requests.push({ kind: "curl", id: p.curl, size: [96, 88] }); }
  const f = await bootScene(sc); runFrames(f, 90000); const r = rec(f, n);
  for (const i of R) { assert.equal(r[i].rs, RS.rest, `${i} at rest`); if (r[i].rk === RK.curl) assert.equal(r[i].hidden, 0, "a curl is drawn"); else assert.equal(r[i].hidden, 1); }
  assert.ok(R.some((i) => r[i].rk === RK.curl), "at least one found a nice spot"); assert.deepEqual(f.errors(), []);
  const curls = R.filter((i) => r[i].rk === RK.curl), gap = SPEC("vivarium").rules.show.curl.gap;   // R4b-1b: the measured ink (56 here), ink to ink
  for (const i of curls) assert.equal(r[i].cw, 56, "the curl's measured ink width is the props' curlFigure width");
  for (const i of curls) for (const j of curls) if (i < j) assert.ok(Math.abs(r[i].fx - r[j].fx) >= 28 + 28 + gap, `curls of 56 px ink: at least ${28 + 28 + gap} between foot points`);
});
test("the curl gap is ink to ink: a spot beside a curl of ink 96 needs 144 between foot points, and a narrower curl less; the bed's rect the same (R4b-1b)", { skip }, async () => {
  const gap = SPEC("vivarium").rules.show.curl.gap; assert.equal(144, 48 + 48 + gap, "two 96 px curls: 144 between feet"); assert.equal(Math.ceil(95 / 2) + Math.ceil(95 / 2) + gap, 144, "ceil: 95 wide counts 48 a side");
  const sc = movingScene("vivarium", { adults: 4, juveniles: 3, s05: 1, room: 1, focus: "room", motionSets: false }), n = sc.props.regions.residents.length, R = resters(sc);
  for (const i of R) { const p = sc.props.regions.residents[i]; p.restAt = "curl"; p.curl = "mibi:curl-test:" + i; p.curlFigure = [0, 0, 96, 88]; sc.requests.push({ kind: "curl", id: p.curl, size: [96, 88] }); }
  const f = await bootScene(sc); runFrames(f, 90000); const r = rec(f, n), curls = R.filter((i) => r[i].rk === RK.curl);
  for (const i of curls) assert.equal(r[i].cw, 96); for (const i of curls) for (const j of curls) if (i < j) assert.ok(Math.abs(r[i].fx - r[j].fx) >= 144, `two 96 px curls: ${Math.abs(r[i].fx - r[j].fx)} between foot points, 144 at least`);
  assert.deepEqual(f.errors(), []);
});

test("a shown one comes back: an out rester walks in from the left edge to the walk and rests no more; a new rester at a fresh show starts at rest", { skip }, async () => {
  const sc = movingScene("vivarium", { adults: 4, juveniles: 3, s05: 1, room: 1, focus: "room" }), n = sc.props.regions.residents.length, R = resters(sc), f = await bootScene(sc);
  assert.ok(R.every((i) => hook(f, i, 0) === RS.rest), "a fresh show: the resters start at rest (no walking off)");
  const outs = R.filter((i) => hook(f, i, 1) === RK.out); if (!outs.length) return;
  const i = outs[0]; sc.props.regions.residents[i].shown = true; delete sc.props.regions.residents[i].restAt; resend(f);
  const xs = []; runFrames(f, 60000, { each: () => xs.push(hook(f, i, 4)) });
  assert.equal(hook(f, i, 0), RS.shown); assert.ok(xs[0] < 0 || xs[1] < 0 || xs.some((x) => x < 16), "it entered from outside the window's left edge"); assert.ok(xs.at(-1) >= 16, "and is in the walk");
});

for (const screen of ["idle", "home"]) test(`${screen}: the same rest rules (a room of eight shows five)`, { skip }, async () => {
  const sc = movingScene(screen, { adults: 4, juveniles: 3, s05: 1 }), n = sc.props.regions.residents.length, f = await bootScene(sc); runFrames(f, 60000);
  const r = rec(f, n); assert.equal(r.filter((q) => q.sh).length, 5); assert.ok(r.filter((q) => !q.sh).every((q) => q.rs === RS.rest), "the others rest"); assert.deepEqual(f.errors(), []);
});

test("a traveller home walks in: a resident new to a running walk with enter: edge starts outside the window's left edge and walks in to main; on a fresh show (the walk starts from the seeds) enter is ignored; with motion off it is a cut", { skip }, async () => {
  const mk = () => movingScene("vivarium", { adults: 3, juveniles: 1, room: 1, focus: "room", motionSets: false }), go = async (motion, run) => {
    const sc = mk(), f = await bootScene(sc, { motion }), n0 = sc.props.regions.residents.length; runFrames(f, 2000);
    const p = { ...sc.props.regions.residents[0], id: "9999", name: "Traveller", seed: 4242, shown: true, enter: "edge" }; sc.props.regions.residents.push(p); resend(f);
    f.frame((f.t += 16)); return { f, n0, i: n0, x0: hook(f, n0, 4), xs: [] };
  };
  { const { f, i, x0 } = await go(true); const xs = [x0]; runFrames(f, 30000, { each: () => xs.push(hook(f, i, 4)) });
    assert.ok(x0 < 0, `it starts outside the left edge (x ${x0})`); assert.ok(xs.at(-1) >= 16, "and has walked in"); assert.equal(hook(f, i, 0), RS.shown); assert.deepEqual(f.errors(), []); }
  { const { f, i, x0 } = await go(false); assert.ok(x0 >= 16, `with motion off a cut to its walk start (x ${x0})`); void f; void i; }
  { const sc = mk(), p = sc.props.regions.residents[0]; p.enter = "edge"; const f = await bootScene(sc); assert.ok(hook(f, 0, 4) >= 16, "a fresh show: enter is ignored, the walk starts from the seed"); }
});
