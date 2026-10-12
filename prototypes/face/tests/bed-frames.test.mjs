// The away bed (station-vivarium-polish, option D; the architect's plates, 85c9c0b) on the face, on the Vivarium's whole, Home and Idle: eight stable nodes (three frames, three minis, the glyph's plate, the glyph) at
// the signed table's rects for 1, 2 and 3 carried and with no size otherwise; the plates on the painted layer (passes 1 and 2 read 0 off the palette, the full pass reads 0 because they are painted); the three frames share one
// source picture (a carried mibi adds its mini only); the bed's mark is retired; no carried mibi walks while away; the dock cut stays within the computed 50,688 px.
//   node --test prototypes/face/tests/bed-frames.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { movingScene, bootScene, SPEC, BUILT } from "./moving-scene.mjs";
import { dirty } from "./dirty.mjs";

const skip = BUILT ? false : "the WebAssembly build (prototypes/face/build.sh wasm)";
const bedOf = (screen) => (screen === "idle" ? SPEC("frame").idle.regions.bed : SPEC(screen === "vivarium" ? "vivarium" : "home").regions.bed);
// the rects the signed table gives frame i of n, its mini, the glyph's plate and the glyph
const table = (B, n) => { const F = B.frames, xs = F.places[n], x0 = xs[0]; return { frames: xs.map((x) => [x, F.y, ...F.size]), minis: xs.map((x) => [x + F.thumb[0], F.y + F.thumb[1], F.thumb[2], F.thumb[3]]), plate: [x0 + F.glyph.plate.at[0], F.y + F.glyph.plate.at[1], ...F.glyph.plate.size], glyph: [x0 + F.glyph.at[0], F.y + F.glyph.at[1], ...F.glyph.size] }; };
const away = async (screen, n) => { const sc = movingScene(screen, { adults: 4, docked: false, carry: [...Array(n).keys()], motionSets: false }), f = await bootScene(sc, { motion: false, node: true }); return { sc, f }; };
const logOf = (f) => { let lg = null; for (let m; (m = f.poll("log"));) lg = m; return lg; };

for (const screen of ["vivarium", "home", "idle"]) {
  test(`${screen}: away with 1, 2 and 3 carried, the bed's eight nodes stand at the signed table's rects (a free place no size); nobody carried, all eight with no size; no g.bed.mark`, { skip }, async () => {
    const B = bedOf(screen);
    for (const n of [0, 1, 2, 3]) {
      const { sc, f } = await away(screen, n), clip = f.nodeBox("glass.clip").box, box = (id) => { const b = f.nodeBox(id); return b && { ...b, box: b.box[2] ? [b.box[0] + clip[0], b.box[1] + clip[1], b.box[2], b.box[3]] : b.box }; };   // a node's box is its clip's child's: back to the screen
      assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0); assert.equal(sc.props.regions.bed.carried.length, n);
      for (const id of ["bed.frame.0", "bed.frame.1", "bed.frame.2", "bed.mini.0", "bed.mini.1", "bed.mini.2", "bed.glyphPlate", "bed.glyph"]) assert.ok(box(id), `${screen} ${n}: the node ${id} is present`);
      assert.equal(box("g.bed.mark"), null, "the bed's mark is retired");
      const T = n ? table(B, n) : null;
      for (let i = 0; i < 3; i++) {
        const fb = box(`bed.frame.${i}`).box, mb = box(`bed.mini.${i}`).box;
        if (i < n) { assert.deepEqual(fb, T.frames[i], `${screen} ${n}: frame ${i}`); assert.deepEqual(mb, T.minis[i], `${screen} ${n}: mini ${i}`); }
        else { assert.deepEqual([fb[2], fb[3], mb[2], mb[3]], [0, 0, 0, 0], `${screen} ${n}: place ${i} has no size`); }
      }
      if (n) { assert.deepEqual(box("bed.glyphPlate").box, T.plate, `${screen} ${n}: the glyph's plate`); assert.deepEqual(box("bed.glyph").box, T.glyph, `${screen} ${n}: the glyph`); }
      else assert.deepEqual([...box("bed.glyphPlate").box.slice(2), ...box("bed.glyph").box.slice(2)], [0, 0, 0, 0], `${screen}: nobody carried, no glyph and no plate`);
      const ids = sc.props.regions.bed.carried.map((c) => c.id); assert.ok(!sc.props.regions.residents.some((r) => ids.includes(r.id)), `${screen} ${n}: no carried mibi walks`);
    }
  });
  test(`${screen}: the plates are on the painted layer (passes 1 and 2 draw none of their pixels; the full pass shows them), and the three frames share one source picture`, { skip }, async () => {
    const B = bedOf(screen), at = {}, probe = (n) => table(B, 3).frames.map((r) => [r[0] + 2, r[1] + 28]).concat([[table(B, 3).plate[0] + 10, table(B, 3).plate[1] + 2]]);   // inside each frame's fill margin (left of its mini) and inside the glyph's plate
    for (const n of [0, 3]) {
      const { f } = await away(screen, n); f.frame((f.t += 16));
      at[n] = {}; for (const pass of [1, 2, 3]) { f.pass(pass); at[n][pass] = probe(n).map(([x, y]) => f.pixel(x, y).join()); }
    }
    for (const pass of [1, 2]) assert.deepEqual(at[3][pass], at[0][pass], `${screen}: pass ${pass} draws no plate pixel`);
    at[3][3].forEach((p, i) => assert.notEqual(p, at[0][3][i], `${screen}: the full pass shows plate ${i}`));
    { const { sc, f } = await away(screen, 3), send = (props) => { assert.equal(f.props({ ...props, motion: false }), 0, f.errors().join()); f.frame((f.t += 16)); return logOf(f).pictures; };   // the same scene with the frames and without: only the bed differs
      const withFrames = send(sc.props), none = send({ ...sc.props, regions: { ...sc.props.regions, bed: { ...sc.props.regions.bed, carried: [], glyph: "" } } }), again = send(sc.props);
      assert.ok(withFrames - none <= 3 && again === withFrames, `${screen}: three frames add their minis at most (${withFrames} with, ${none} without): the plates' sources are shared, one a size`); }
    { const { f } = await away(screen, 2); f.frame((f.t += 16)); const T = table(B, 2), p = logOf(f).regions.find((r) => r.id === "bed.frames" && r.layer === "painted")?.rect, inside = (r) => r[0] >= p[0] && r[1] >= p[1] && r[0] + r[2] <= p[0] + p[2] && r[1] + r[3] <= p[1] + p[3];
      assert.ok(p && [...T.frames, T.plate].every(inside), `${screen}: the frames and the glyph's plate are on the painted layer of the bed's frames region (${p})`); }
  });
  test(`${screen}: the dock cut with 1, 2 and 3 carried redraws at most the computed 50,688 px (lvgl-switch §2.9), undocking and docking`, { skip }, async () => {
    for (const n of [1, 2, 3]) {
      const carry = [...Array(n).keys()], A = movingScene(screen, { adults: 4, docked: false, carry, motionSets: false }), D = movingScene(screen, { adults: 4, docked: true, carry, motionSets: false }), f = await bootScene(A, { motion: false, node: true });
      const cut = (props) => { assert.equal(f.props({ ...props, motion: false }), 0, f.errors().join()); f.frame((f.t += 16)); return dirty(f); };
      cut(D.props); f.frame((f.t += 16)); dirty(f);
      const undock = cut(A.props), dock = cut(D.props);
      assert.ok(undock > 0 && undock <= 50688 && dock > 0 && dock <= 50688, `${screen} ${n}: the cut redrew ${undock} px undocking, ${dock} px docking`);
      console.log(`# ${screen}, ${n} carried: the dock cut ${undock} px undocking, ${dock} px docking`);
    }
  });
}
