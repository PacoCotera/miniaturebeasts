// The status a composed picture carries comes from its layers: the least final one, never a flat "master".
import { test } from "node:test";
import assert from "node:assert/strict";
import { placeMaster, dropAsset } from "../../ui/assets.mjs";
import { leastFinal, podStatus, figureStatus } from "../src/podmasters.mjs";

const put = (id, status) => placeMaster({ id, w: 2, h: 2, file: "pods/" + id + ".png", hash: "ab", status }, { w: 2, h: 2, canvas: () => null });
test("leastFinal: placeholder before held before new before master; an unplaced id counts for nothing", () => {
  for (const [id, st] of [["t1", "master"], ["t2", "new"], ["t3", "held"], ["t4", "placeholder"]]) put(id, st);
  assert.equal(leastFinal(["t1"]), "master"); assert.equal(leastFinal(["t1", "t2"]), "new"); assert.equal(leastFinal(["t1", "t2", "t3"]), "held"); assert.equal(leastFinal(["t4", "t3", "t2", "t1"]), "placeholder");
  assert.equal(leastFinal(["t1", "nowhere"]), "master"); assert.equal(leastFinal([]), "master");
  for (const id of ["t1", "t2", "t3", "t4"]) dropAsset(id);
});
test("a composed pod takes the least final status of its three layers; a figure of its two slices, a placeholder until both are placed", () => {
  for (const l of ["shade", "mask-body"]) put("pod-tc-" + l, "master"); put("pod-tc-mask-accent", "new");
  assert.equal(podStatus("tc"), "new", "one layer still new: the pod is new");
  put("mibi-halo-T-128x160-mist", "master"); assert.equal(figureStatus("mibi-halo-T-128x160-mist", "mibi-halo-T-128x160-clear"), "placeholder", "the clear slice is not placed");
  put("mibi-halo-T-128x160-clear", "held"); assert.equal(figureStatus("mibi-halo-T-128x160-mist", "mibi-halo-T-128x160-clear"), "held");
  for (const id of ["pod-tc-shade", "pod-tc-mask-body", "pod-tc-mask-accent", "mibi-halo-T-128x160-mist", "mibi-halo-T-128x160-clear"]) dropAsset(id);
});

// the rack pod from the placed hand layers (home.json regions.rackPod.layers): S01 to S16 and the unknown pod, each pixel by its layer's rule, every opaque pixel on the palette
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decodePNG } from "../../ui/png.mjs";
import { rackPodFromLayers, rackBase, rackPatternId, podFromLayers } from "../src/podmasters.mjs";
import { rampOf, RGB, C } from "../src/pixels.mjs";
import { patternLayer } from "../../ui/podlayers.mjs";
const here = path.dirname(fileURLToPath(import.meta.url)), specsDir = path.resolve(here, "../../ui/specs/station"), J = (f) => JSON.parse(readFileSync(path.join(specsDir, f), "utf8"));
const P = J("home.json").regions.rackPod, chips = J("cross.json").colours.pigmentChips, patterns = J("pods.json").podLayers.patterns, L = P.layers, [W, H] = P.size;
const masterDir = path.resolve(here, "../../ui/assets/masters/pods"), loaded = [];
const place = (id, status = "master") => { const p = decodePNG(readFileSync(path.join(masterDir, id + ".png"))); placeMaster({ id, w: p.width, h: p.height, file: "pods/" + id + ".png", hash: "ab", status }, { w: p.width, h: p.height, rgba: () => new Uint8ClampedArray(p.data) }); loaded.push(id); return p; };
const frames = readdirSync(path.resolve(here, "../../workbench/frames")).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.resolve(here, "../../workbench/frames", f), "utf8")));
test("the rack pod: 24×32, each pixel the fill of the last layer on, transparent off the body, on the palette, for S01 to S16 and the unknown pod", () => {
  const masks = {}; for (const l of ["body", "light", "shade", "accent", "outline"]) masks[l] = place(`home-rack-pod-${l}-24x32`).data;
  for (const n of ["dots", "ribs", "segments", "plates", "bands", "stripes"]) masks["pattern-" + n] = place(`home-rack-pod-pattern-${n}-24x32`).data;
  const crownNames = ["", "-light", "-shade", "-outline", "-glow"], crownMasks = {};   // every placed crown layer of the twenty clans, by its id
  for (const f of readdirSync(masterDir)) { const m = f.match(/^(home-rack-pod-crown-C\d\d(?:-light|-shade|-outline|-glow)?)-24x32\.png$/); if (m) crownMasks[m[1]] = place(m[1] + "-24x32").data; }
  assert.ok(Object.keys(crownMasks).length >= 20 * 3, "the crown layers of the twenty clans are placed");
  const palette = new Set(RGB.map((c) => c.join())), rgb = (n) => RGB[C[n]];
  const cases = [...frames.map((f) => ({ name: f.species ?? f.id, frame: f })), { name: "unknown", frame: null }]; assert.ok(cases.length >= 17, "S01 to S16 and the unknown pod");
  for (const { name, frame } of cases) {
    const pig = (c) => (c && chips[c.pigment]) || "mist", A = frame ? pig(frame.pod.colourPair[0]) : "stone", B = frame ? pig(frame.pod.colourPair[1]) : "fog", ramp = rampOf(A), rampB = rampOf(B), clan = frame?.taxonomy?.clan, glowChip = { C03: "mint", C20: "lime" }[clan];
    const fill = { body: rgb(A), light: rgb(ramp.light), shade: rgb(ramp.shade), accent: rgb(B), pattern: rgb(B), outline: rgb(ramp.outline), crown: rgb(B), "crown-light": rgb(rampB.light), "crown-shade": rgb(rampB.shade), "crown-outline": rgb(ramp.outline), ...(glowChip ? { "crown-glow": rgb(glowChip) } : {}) };
    const crown = (suffix) => (clan ? crownMasks[`home-rack-pod-crown-${clan}${suffix}`] : null), crownOn = [];
    const patName = frame ? patternLayer(frame.pod.shellPattern || "", patterns) : null, pat = patName ? masks["pattern-" + patName] : null;
    const pic = rackPodFromLayers(frame, L, chips, patterns, P.size), px = pic.rgba();
    assert.deepEqual([pic.w, pic.h], [24, 32], name);
    for (let i = 0; i < W * H; i++) {
      const o = i * 4, on = (m) => m && m[o + 3] > 0; let want = null;
      if (on(masks.body)) { want = fill.body; for (const l of L.order) { if (l.startsWith("crown")) continue; const m = l === "pattern" ? pat : masks[l]; if (on(m)) want = fill[l]; } }
      for (const l of L.order) if (l.startsWith("crown") && on(crown(l.slice(5)))) { want = fill[l]; crownOn.push(i); }   // the crown stands above the body: not clipped to it
      assert.deepEqual([...px.slice(o, o + 4)], want ? [...want, 255] : [0, 0, 0, 0], `${name} pixel ${i}`);
      if (px[o + 3]) assert.ok(palette.has([px[o], px[o + 1], px[o + 2]].join()), `${name} pixel ${i} is on the palette`);
    }
    if (!frame) { assert.equal(patName, null, "the unknown pod has no pattern"); assert.equal(crownOn.length, 0, "the unknown pod has no crown"); }
    else assert.ok(crownOn.length > 0 && crownOn.some((i) => !on1(masks.body, i)), name + ": the crown is drawn, and stands above the body");
    if (glowChip) assert.ok(crownOn.some((i) => px.slice(i * 4, i * 4 + 3).join() === fill["crown-glow"].join()), name + ": the lit part is " + glowChip);
    const outlines = new Set(); for (let i = 0; i < W * H; i++) if (on1(masks.outline, i) && !crownOn.includes(i)) outlines.add(px.slice(i * 4, i * 4 + 3).join()); assert.ok(outlines.size <= 1 || patName, name + ": the outline is one colour (a pattern may be drawn under it only)");
  }
  for (const id of loaded.splice(0)) dropAsset(id);
});
const on1 = (m, i) => m[i * 4 + 3] > 0;
test("the rack pod's status is the least final of the five base layers and the pattern used", () => {
  for (const l of ["body", "light", "shade", "accent", "outline"]) place(`home-rack-pod-${l}-24x32`, l === "accent" ? "new" : "master");
  place("home-rack-pod-pattern-dots-24x32", "held");
  const frame = frames.find((f) => /dots/.test(f.pod.shellPattern || "")), pid = rackPatternId(frame, L, patterns);
  assert.equal(pid, "home-rack-pod-pattern-dots-24x32"); assert.equal(leastFinal([...rackBase(L), pid]), "held"); assert.equal(leastFinal(rackBase(L)), "new");
  for (const id of loaded.splice(0)) dropAsset(id);
});
test("the pod's crown: the clan's crown stands over the pod in the second colour, the lit seed and lantern keep their own colour, the unknown pod has none", () => {
  const classes = ["large", "medium", "small", "collection", "well", "opened-cap"], dir = path.resolve(here, "../../ui/assets/masters"), put2 = (sub, id) => { const p = decodePNG(readFileSync(path.join(dir, sub, id + ".png"))); placeMaster({ id, w: p.width, h: p.height, file: sub + "/" + id + ".png", hash: "ab", status: "master" }, { w: p.width, h: p.height, rgba: () => new Uint8ClampedArray(p.data) }); loaded.push(id); return p; };
  const ids = []; for (const cls of classes) { const sub = cls === "opened-cap" ? "capsule" : "pods"; for (const l of ["shade", "mask-body", "mask-accent"]) put2(sub, `pod-${cls}-${l}`); for (const clan of ["C01", "C03", "C20"]) for (const l of ["shade", "mask", "glow"]) { const id = `pod-${cls}-crown-${clan}-${l}`; if (existsSync(path.join(dir, sub, id + ".png"))) { put2(sub, id); ids.push(id); } } }
  const pair = ["#465459", "#fff0b8"];   // charcoal, butter
  for (const cls of classes) {
    const bare = podFromLayers(cls, pair, "", {}, false), none = podFromLayers(cls, pair, "", {}, false, null).rgba(), b = bare.rgba();
    assert.deepEqual([...none], [...b], cls + ": no clan, no crown");
    for (const clan of ["C01", "C03", "C20"]) {
      const crowned = podFromLayers(cls, pair, "", {}, false, clan), c = crowned.rgba(); let changed = 0, above = 0;
      for (let i = 0; i < c.length; i += 4) if (c[i] !== b[i] || c[i + 1] !== b[i + 1] || c[i + 2] !== b[i + 2] || c[i + 3] !== b[i + 3]) { changed++; if (b[i + 3] === 0) above++; }
      assert.ok(changed > 0 && above > 0, `${cls} ${clan}: the crown is drawn, partly where the pod is clear`);
      assert.deepEqual([crowned.w, crowned.h], [bare.w, bare.h], cls + ": the crown keeps the pod's box");
      assert.equal(ids.includes(`pod-${cls}-crown-${clan}-glow`), clan !== "C01", `${cls} ${clan}: only the lit clans carry a glow layer`);
    }
  }
  for (const id of loaded.splice(0)) dropAsset(id);
});
