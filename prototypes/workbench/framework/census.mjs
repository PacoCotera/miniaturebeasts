#!/usr/bin/env node
// The silhouette census (art-pipeline.md §2): every plan's default body, rendered as a 48 px
// silhouette, must differ from every other plan's by a measured margin, or the plan is merged or
// redesigned. For each of the 16 roster plans it builds 200 random individuals of the species on
// it, reports that they build (resolver, rig and contract validation), and measures the shape
// distance (1 − IoU of the fitted 48 px masks) between the plans' type specimens and between every
// individual and every type specimen.
//
// The roster's own check, `roster.read48`, lives here too: the twenty kinds' stands at 48 px (framework/stands48.json) must each differ
// from every other kind's (shape IoU below READ48_LIMIT). It replaces the old kind check, which scored each species against a
// hand-drawn silhouette of the animal it resembled; a kind's target is now its own stand and every other kind's stand is a wrong one.
//
//   node prototypes/workbench/framework/census.mjs            # writes census.json and census.md
//   CENSUS_N=50 node ... for a quicker run
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildIndividual, sampleIndividual, typeSpecimen, rng } from "./species.mjs";
import { silhouetteMask, maskDistance } from "./raster.mjs";
import { encodePNG } from "./png.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const N = Number(process.env.CENSUS_N ?? 200);
export const MARGIN = 0.22; // the gate: two plans closer than this collapse into one silhouette family
const VIEWS = ["three-quarter", "side"];

// ---- roster.read48: the stands against each other ----
export const READ48_LIMIT = 0.85; // two kinds whose 48 px silhouettes overlap by this much or more read as one (IoU)
export const STANDS48_FILE = path.resolve(here, "stands48.json");
// { id: { file, mask } } from the stands file written by tools/stands48.mjs
export function loadStands(file = STANDS48_FILE) {
  const d = JSON.parse(readFileSync(file, "utf8"));
  if (d.schema !== "mb-stands-48/1" || d.size !== 48) throw new Error(`${file}: schema ${d.schema}`);
  return Object.fromEntries(Object.entries(d.kinds).map(([id, k]) => [id, { file: k.file, mask: Uint8Array.from(k.rows.join("").split(""), (c) => (c === "#" ? 1 : 0)) }]));
}
export const iou = (a, b) => { let i = 0, u = 0; for (let k = 0; k < a.length; k++) { if (a[k] && b[k]) i++; if (a[k] || b[k]) u++; } return u ? i / u : 0; };
// The check: { id, level, pass, messages, pairs } with every pair's IoU, the closest first. Red when any pair reaches the limit.
export function read48(stands = loadStands(), limit = READ48_LIMIT) {
  const ids = Object.keys(stands).sort(), pairs = [];
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) pairs.push({ a: ids[i], b: ids[j], iou: Number(iou(stands[ids[i]].mask, stands[ids[j]].mask).toFixed(3)) });
  pairs.sort((p, q) => q.iou - p.iou);
  const messages = pairs.filter((p) => p.iou >= limit).map((p) => `${p.a} and ${p.b} overlap ${p.iou.toFixed(2)} at 48 px; under ${limit} needed`);
  return { id: "roster.read48", level: "red", pass: messages.length === 0, messages, limit, pairs };
}

export function runCensus(frames, { n = N, log = () => {} } = {}) {
  const rows = [];
  for (const frame of frames) {
    const t0 = Date.now();
    const specimen = buildIndividual(frame, typeSpecimen(frame));
    const specMasks = { "three-quarter": silhouetteMask(specimen.scene, "three-quarter", 48), side: silhouetteMask(specimen.scene, "side", 48) };
    const r = rng(`census:${frame.species.id}`);
    const individuals = [];
    let built = 0; const failures = {};
    for (let i = 0; i < n; i++) {
      const genome = sampleIndividual(frame, r);
      try {
        const b = buildIndividual(frame, genome);
        if (b.validation.status === "valid") { built++; individuals.push({ "three-quarter": silhouetteMask(b.scene, "three-quarter", 48), side: silhouetteMask(b.scene, "side", 48) }); }
        else failures[b.validation.problems[0]] = (failures[b.validation.problems[0]] ?? 0) + 1;
      } catch (e) { failures[e.message] = (failures[e.message] ?? 0) + 1; }
    }
    rows.push({ id: frame.species.id, name: frame.species.name, clan: frame.taxonomy.clan, plan: frame.plan.code, planKey: frame.plan.key, rig: frame.plan.rig, sampled: n, built, failures, specMasks, individuals });
    log(`${frame.species.name.padEnd(9)} ${frame.plan.code.padEnd(14)} built ${built}/${n} in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  }
  // Distances between type specimens, per view.
  const table = {};
  for (const view of VIEWS) table[view] = rows.map((a) => rows.map((b) => Number(maskDistance(a.specMasks[view], b.specMasks[view]).toFixed(3))));
  // Each individual: distance to its own specimen and nearest other specimen (three-quarter view).
  const family = rows.map((row, i) => {
    let own = 0, nearestOwn = 0, confusions = {};
    for (const ind of row.individuals) {
      const d = rows.map((other) => Math.min(...VIEWS.map((v) => maskDistance(ind[v], other.specMasks[v]))));
      own += d[i];
      const best = d.indexOf(Math.min(...d));
      if (best === i) nearestOwn++; else confusions[rows[best].name] = (confusions[rows[best].name] ?? 0) + 1;
    }
    const k = row.individuals.length || 1;
    return { id: row.id, meanToOwn: Number((own / k).toFixed(3)), nearestOwnShare: Number((nearestOwn / k).toFixed(3)), confusions };
  });
  const pairs = [];
  for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) pairs.push({ a: rows[i].id, b: rows[j].id, samePlan: rows[i].planKey === rows[j].planKey, distance: Math.max(table["three-quarter"][i][j], table.side[i][j]) });
  pairs.sort((p, q) => p.distance - q.distance);
  // The gate is between plans. Species on one plan (the four B2·L4·fur mammals) differ by clan parts, size
  // and finish, not by silhouette family; their distances are reported, not gated.
  const planPairs = pairs.filter((p) => !p.samePlan);
  const verdict = { margin: MARGIN, plans: new Set(rows.map((r) => r.planKey)).size, closestPair: planPairs[0], closestSamePlan: pairs.find((p) => p.samePlan) ?? null, belowMargin: planPairs.filter((p) => p.distance < MARGIN), allBuilt: rows.every((r) => r.built === r.sampled) };
  return { rows, table, family, pairs, verdict };
}

export function censusMarkdown(result) {
  const { rows, table, family, verdict } = result;
  const short = (s) => s.slice(0, 6);
  // * marks a pair on the same plan (not gated)
  const lines = [];
  lines.push(`| Species | Plan | Rig | Built | Own-plan nearest | Mean distance to own specimen |`, `| --- | --- | --- | ---: | ---: | ---: |`);
  rows.forEach((r, i) => lines.push(`| ${r.id}${r.name !== r.id ? " " + r.name : ""} | ${r.plan} | ${r.rig} | ${r.built}/${r.sampled} | ${(family[i].nearestOwnShare * 100).toFixed(0)}% | ${family[i].meanToOwn.toFixed(2)} |`));
  lines.push("", `Shape distance between type specimens (1 − IoU of the fitted 48 px masks; the larger of the three-quarter and side views). Gate: every pair ≥ ${MARGIN}.`, "");
  lines.push(`| | ${rows.map((r) => short(r.id)).join(" | ")} |`, `| --- | ${rows.map(() => "---:").join(" | ")} |`);
  rows.forEach((r, i) => lines.push(`| **${short(r.id)}** | ${rows.map((o, j) => (i === j ? "·" : (o.planKey === r.planKey ? "*" : "") + Math.max(table["three-quarter"][i][j], table.side[i][j]).toFixed(2))).join(" | ")} |`));
  lines.push("", `${verdict.plans} distinct plans. Closest pair of plans: ${verdict.closestPair.a} and ${verdict.closestPair.b} at ${verdict.closestPair.distance.toFixed(2)}. ${verdict.belowMargin.length ? `**${verdict.belowMargin.length} pair(s) below the margin.**` : "No pair of plans below the margin."}${verdict.closestSamePlan ? ` Species sharing a plan are not gated; the closest are ${verdict.closestSamePlan.a} and ${verdict.closestSamePlan.b} at ${verdict.closestSamePlan.distance.toFixed(2)}.` : ""}`);
  return lines.join("\n") + "\n";
}

// Any sheet at an integer zoom, for the README.
export function zoomed(img, zoom) {
  const out = { width: img.width * zoom, height: img.height * zoom, data: new Uint8ClampedArray(img.width * img.height * zoom * zoom * 4) };
  for (let y = 0; y < out.height; y++) for (let x = 0; x < out.width; x++) { const s = (Math.floor(y / zoom) * img.width + Math.floor(x / zoom)) * 4, d = (y * out.width + x) * 4; out.data[d] = img.data[s]; out.data[d + 1] = img.data[s + 1]; out.data[d + 2] = img.data[s + 2]; out.data[d + 3] = 255; }
  return out;
}

// A sheet of the 16 type-specimen silhouettes at 48 px (three-quarter over side), 2× for the README.
export function silhouetteSheet(result) {
  const cell = 48, rows = result.rows.length;
  const W = rows * (cell + 4), H = 2 * (cell + 4);
  const img = { width: W, height: H, data: new Uint8ClampedArray(W * H * 4).fill(255) };
  result.rows.forEach((r, i) => VIEWS.forEach((v, k) => {
    const m = r.specMasks[v];
    for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) if (m[y * cell + x]) { const d = ((k * (cell + 4) + y) * W + i * (cell + 4) + x) * 4; img.data[d] = img.data[d + 1] = img.data[d + 2] = 20; }
  }));
  return img;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = path.resolve(here, "../frames");
  const frames = readdirSync(dir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(dir, f), "utf8"))).sort((a, b) => a.species.order - b.species.order);
  const result = runCensus(frames, { log: console.log });
  const out = { schema: "mb-silhouette-census/2", sampled: N, margin: MARGIN, views: VIEWS, species: result.rows.map((r, i) => ({ id: r.id, name: r.name, plan: r.plan, planKey: r.planKey, rig: r.rig, built: r.built, sampled: r.sampled, failures: r.failures, ...result.family[i] })), distances: result.table, pairs: result.pairs, verdict: result.verdict };
  writeFileSync(path.join(here, "census.json"), JSON.stringify(out, null, 1) + "\n");
  writeFileSync(path.join(here, "census.md"), censusMarkdown(result));
  writeFileSync(path.resolve(here, "../img/silhouettes-48.png"), encodePNG(silhouetteSheet(result)));
  writeFileSync(path.resolve(here, "../img/silhouettes-48-2x.png"), encodePNG(zoomed(silhouetteSheet(result), 2)));
  console.log(censusMarkdown(result));
  if (!result.verdict.allBuilt || result.verdict.belowMargin.length) { console.error("census gate failed"); process.exit(1); }
}
