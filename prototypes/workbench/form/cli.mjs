#!/usr/bin/env node
// node prototypes/workbench/form/cli.mjs [species ...] [--no-visibility] [--no-corners]
// Writes, in prototypes/workbench/out/form/ (ignored) and copied to the results folder's trial/:
// the 15 renders, the 15 four-panel sheets, the contact sheet, report.json and report.md.
import * as T from "./trial.mjs";
import { copyFileSync, readdirSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2), flags = new Set(args.filter((a) => a.startsWith("--"))), keys = args.filter((a) => !a.startsWith("--"));
const species = keys.length ? keys : T.ORDER;
T.mkdirSync(T.OUT, { recursive: true });
const ms = (t) => +(performance.now() - t).toFixed(0);
const record = {}, images = {};

for (const key of species) {
  const form = T.SPECIES[key], t0 = performance.now(), timing = {};
  const stands = T.loadStands(key), ref = T.standRef(stands[304]);
  const standMask = T.maskOfAlpha(stands[304]);
  // the new model: 1/220 at 304, 1/120 at 96 and 48
  let t = performance.now(); const sc304 = T.buildScene(form, { extentDiv: 220 }); timing.mesh304 = ms(t);
  t = performance.now(); const sc120 = T.buildScene(form, { extentDiv: 120 }); timing.mesh120 = ms(t);
  const r = {}; t = performance.now(); r[304] = T.renderForm(sc304, form.camera, 304, { ref }); timing.render304 = ms(t);
  t = performance.now(); r[96] = T.renderForm(sc120, form.camera, 96, { ref }); timing.render96 = ms(t);
  t = performance.now(); r[48] = T.renderForm(sc120, form.camera, 48, { ref }); timing.render48 = ms(t);
  timing.total = ms(t0);
  for (const s of [304, 96, 48]) T.writeFileSync(path.join(T.OUT, `${key}-${T.SIZE_NAMES[s]}.png`), T.encodeRGBA(r[s]));
  // the current rig
  t = performance.now(); const rig = T.currentRig(key, stands, ref); timing.rig = ms(t);
  // overlaps: the stand's mask against each
  const ovNew = T.overlaps(standMask, T.maskOfCoverage(r[304]));
  const rigMask = { width: 304, height: 312, bits: Uint8Array.from(rig.images[304].coverage, (c) => (c >= 0.5 ? 1 : 0)) }, ovRig = T.overlaps(standMask, rigMask);
  // checks, guards
  const checks = T.featureChecks({ key, form, scene: sc304, r, stand: standMask, art: T.LOIKA_ART });
  checks.push(...T.round2Checks({ key, form, scene: sc304, r, ref, targets: T.FACE_TARGETS, stand: standMask }));
  const guardType = T.guardsOf(form);
  checks.unshift({ id: "guards.type", label: "every guard holds on the type", pass: guardType.ok, value: guardType.ok ? "ok" : guardType.problems, threshold: "no problem" });
  let sweep = null;
  if (!flags.has("--no-corners")) { t = performance.now(); sweep = T.cornerSweep(key); timing.corners = ms(t); checks.splice(1, 0, { id: "guards.corners", label: `every guard holds on all ${sweep.corners} corners of the open ranges`, pass: sweep.failed.length === 0, value: sweep.failed.length ? `${sweep.failed.length} of ${sweep.corners} corners fail` : `${sweep.corners} corners ok`, threshold: "none fail", detail: sweep.failed.slice(0, 3).map((f) => f.problems.join("; ")).join(" | ") }); }
  // the frame: the creature fits the canvas
  const bx = T.boxOf(T.maskOfCoverage(r[304]));
  checks.push({ id: "frame", label: "the creature fits the 304 canvas, feet on row 305, height within 1 px of the stand's", pass: bx.x0 >= 0 && bx.x1 <= 304 && Math.abs(bx.y1 - 1 - 305) <= 1 && Math.abs((bx.y1 - bx.y0) - ref.height) <= 1, value: { box: [bx.x0, bx.y0, bx.x1, bx.y1], standHeight: ref.height }, threshold: "inside; feet 305; +-1 px" });
  let vis = null;
  if (!flags.has("--no-visibility")) { t = performance.now(); vis = T.visibility(key, ref); timing.visibility = ms(t); }
  // the sheets: stand | current rig | new model | the stand's outline over the new model
  const zoomOf = { 304: 1, 96: 3, 48: 4 };
  for (const s of [304, 96, 48]) {
    const panels = [{ label: "stand", img: stands[s] }, { label: `current rig (${rig.view}${rig.mirror ? ", mirrored" : ""})`, img: rig.images[s] }, { label: "new model", img: r[s] }, { label: "stand outline in magenta", img: T.outlined(r[s], stands[s], s, T.standMaskAt(stands, 304)) }];
    T.writeFileSync(path.join(T.OUT, `sheet-${key}-${T.SIZE_NAMES[s]}.png`), T.encodeRGBA(T.sheet(`${form.name} ${form.id} ${s} px  overlap at 48 px: new ${ovNew.o48.toFixed(2)}, current rig ${ovRig.o48.toFixed(2)}`, panels, zoomOf[s])));
  }
  images[key] = { stands, r, rig };
  const B = sc304.built, fmod = sc304.field.faceM;
  const faceTable = [304, 96, 48].map((sk) => { const rr = r[sk], f = rr.features; let nosePx = 0, mouthPx = 0, platePx = 0; for (let i = 0; i < rr.ink.length; i++) { if (rr.ink[i] === 6) nosePx++; if (rr.ink[i] === 8) mouthPx++; if (rr.plate[i] > 0 && rr.coverage[i] >= 0.5) platePx++; }
    const cores = f ? f.eyes.filter((e) => e.visible).map((e) => e.core) : rr.meta.eyes.map((e) => Math.round(2 * e.r * 0.835 * 0.5)); const bx = f ? f.eyes.filter((e) => e.visible).map((e) => e.box).sort((p, q) => p[0] - q[0]) : [];
    return { size: sk, cores, gap: bx.length === 2 ? bx[1][0] - bx[0][2] - 1 : "-", nosePx, mouthPx, platePx, dropped: f?.dropped ?? [] }; });
  record[key] = { name: form.name, id: form.id, overlap: { new: ovNew, rig: { ...ovRig, view: rig.view, mirror: rig.mirror }, target: T.OVERLAP_TARGET[key] }, checks, corners: sweep ? { n: sweep.corners, failed: sweep.failed.length } : null, visibility: vis, timing, faceTable, limbs: { contacts: B.contacts.map((c) => ({ id: c.id, off: +(c.z - B.floor).toFixed(4) })), solves: B.solves ?? [], reaches: B.reaches ?? [], toes: B.branches.filter((x) => x.toe).length }, joins: T.transMetrics(form, B), texture: { 304: T.textureEnergy(r[304]), 96: T.textureEnergy(r[96]) }, voxel: { v304: sc304.mesh.voxel, v120: sc120.mesh.voxel }, vertices: sc304.mesh.vertices.length / 3, repairs: sc304.mesh.repairs };
  console.log(`${form.name}: overlap new ${ovNew.o48.toFixed(3)} (target ${T.OVERLAP_TARGET[key]}) current rig ${ovRig.o48.toFixed(3)}; ${checks.filter((c) => !c.pass).length} checks fail; ${timing.total} ms for the three sizes`);
}
T.writeContact(images, species);
const report = T.makeReport(record, species);
T.writeFileSync(path.join(T.OUT, "report.json"), JSON.stringify(report.json, null, 1));
T.writeFileSync(path.join(T.OUT, "report.md"), report.md);
if (!keys.length) { // a full run is copied to the results folder
  T.mkdirSync(T.RESULTS, { recursive: true });
  for (const f of readdirSync(T.OUT)) copyFileSync(path.join(T.OUT, f), path.join(T.RESULTS, f));
  console.log(`copied ${readdirSync(T.OUT).length} files to ${T.RESULTS}`);
}
