#!/usr/bin/env node
// The silhouette census (art-pipeline.md §2): every plan's default body, rendered as a 48 px
// silhouette, must differ from every other plan's by a measured margin, or the plan is merged or
// redesigned. For each of the 16 roster plans it builds 200 random individuals of the species on
// it, reports that they build (resolver, rig and contract validation), and measures the shape
// distance (1 − IoU of the fitted 48 px masks) between the plans' type specimens and between every
// individual and every type specimen.
//
//   node prototypes/workbench/framework/census.mjs            # writes census.json and census.md
//   CENSUS_N=50 node ... for a quicker run
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildIndividual, sampleIndividual, typeSpecimen, rng } from "./species.mjs";
import { silhouetteMask, maskDistance } from "./raster.mjs";
import { encodePNG } from "./png.mjs";
import { loadTargets, targetScores, TARGET_MARGIN } from "./targets.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const N = Number(process.env.CENSUS_N ?? 200);
export const MARGIN = 0.22; // the gate: two plans closer than this collapse into one silhouette family
const VIEWS = ["three-quarter", "side"];

export function runCensus(frames, { n = N, log = () => {}, targets = null } = {}) {
  const rows = [];
  for (const frame of frames) {
    const t0 = Date.now();
    const specimen = buildIndividual(frame, typeSpecimen(frame));
    const specMasks = Object.fromEntries(VIEWS.map((v) => [v, silhouetteMask(specimen.scene, v, 48)]));
    const r = rng(`census:${frame.species.id}`);
    const individuals = [];
    let built = 0; const failures = {};
    for (let i = 0; i < n; i++) {
      const genome = sampleIndividual(frame, r);
      try {
        const b = buildIndividual(frame, genome);
        if (b.validation.status === "valid") { built++; individuals.push(Object.fromEntries(VIEWS.map((v) => [v, silhouetteMask(b.scene, v, 48)]))); }
        else failures[b.validation.problems[0]] = (failures[b.validation.problems[0]] ?? 0) + 1;
      } catch (e) { failures[e.message] = (failures[e.message] ?? 0) + 1; }
    }
    rows.push({ id: frame.species.id, name: frame.species.name, plan: frame.plan.code, planKey: frame.plan.key, rig: frame.plan.rig, sampled: n, built, failures, specMasks, individuals });
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
  // The kind check: each species' side silhouette against the hand-drawn targets (targets.mjs).
  const kinds = targets ? targetScores(rows, targets) : null;
  if (kinds) verdict.kinds = { margin: TARGET_MARGIN, pass: kinds.filter((k) => k.pass).length, of: kinds.length, failing: kinds.filter((k) => !k.pass).map((k) => k.id) };
  return { rows, table, family, pairs, verdict, kinds, targets };
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
  if (result.kinds) {
    lines.push("", `Reads as its kind: the type specimen's side silhouette against the hand-drawn 48 px targets (frames/targets/), IoU against its own target and the best wrong one; a species passes when its own target is nearest by ${TARGET_MARGIN}. "Individuals own" is the share of its random individuals nearest their own target.`, "");
    lines.push(`| Species | Own target | Best wrong target | Margin | Individuals own | Verdict |`, `| --- | ---: | ---: | ---: | ---: | --- |`);
    for (const k of result.kinds) {
      const r = rows.find((x) => x.id === k.id);
      lines.push(`| ${k.id}${r && r.name !== r.id ? " " + r.name : ""} | ${k.own === null ? "—" : k.own.toFixed(2)} | ${k.bestWrong ? `${k.bestWrong.id} ${k.bestWrong.iou.toFixed(2)}` : "—"} | ${k.margin === null ? "—" : (k.margin >= 0 ? "+" : "") + k.margin.toFixed(2)} | ${k.individualsOwn === null ? "—" : (k.individualsOwn * 100).toFixed(0) + "%"} | ${k.pass ? "reads" : "**does not read**"} |`);
    }
    lines.push("", `${verdict.kinds.pass} of ${verdict.kinds.of} read as their kind${verdict.kinds.failing.length ? `; not yet: ${verdict.kinds.failing.join(", ")}` : ""}.`);
  }
  return lines.join("\n") + "\n";
}

// A sheet of the kind check at 2×: per species the target, the type specimen's side silhouette and
// their overlay (dark where both, red where only the body, blue where only the target).
export function targetSheet(result, zoom = 2) {
  const cell = 48, gap = 4, cols = 3;
  const W = result.rows.length * (cols * cell + gap * (cols + 1)), H = cell + 2 * gap;
  const img = { width: W * zoom, height: H * zoom, data: new Uint8ClampedArray(W * H * zoom * zoom * 4).fill(255) };
  const put = (x, y, rgb) => { for (let dy = 0; dy < zoom; dy++) for (let dx = 0; dx < zoom; dx++) { const d = ((y * zoom + dy) * img.width + x * zoom + dx) * 4; img.data[d] = rgb[0]; img.data[d + 1] = rgb[1]; img.data[d + 2] = rgb[2]; } };
  result.rows.forEach((r, i) => {
    const target = result.targets[r.id]?.mask, body = r.specMasks.side;
    const x0 = i * (cols * cell + gap * (cols + 1)) + gap;
    for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) {
      const t = target ? target[y * cell + x] : 0, b = body[y * cell + x];
      if (t) put(x0 + x, gap + y, [20, 20, 20]);
      if (b) put(x0 + cell + gap + x, gap + y, [20, 20, 20]);
      if (t && b) put(x0 + 2 * (cell + gap) + x, gap + y, [40, 40, 40]); else if (b) put(x0 + 2 * (cell + gap) + x, gap + y, [220, 70, 60]); else if (t) put(x0 + 2 * (cell + gap) + x, gap + y, [70, 120, 220]);
    }
  });
  return img;
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
  const targets = loadTargets(path.resolve(here, "../frames/targets"));
  const result = runCensus(frames, { log: console.log, targets });
  const out = { schema: "mb-silhouette-census/2", sampled: N, margin: MARGIN, views: VIEWS, species: result.rows.map((r, i) => ({ id: r.id, name: r.name, plan: r.plan, planKey: r.planKey, rig: r.rig, built: r.built, sampled: r.sampled, failures: r.failures, ...result.family[i], kind: result.kinds[i] })), distances: result.table, pairs: result.pairs, verdict: result.verdict };
  writeFileSync(path.join(here, "census.json"), JSON.stringify(out, null, 1) + "\n");
  writeFileSync(path.join(here, "census.md"), censusMarkdown(result));
  writeFileSync(path.resolve(here, "../img/silhouettes-48.png"), encodePNG(silhouetteSheet(result)));
  writeFileSync(path.resolve(here, "../img/silhouettes-48-2x.png"), encodePNG(zoomed(silhouetteSheet(result), 2)));
  writeFileSync(path.resolve(here, "../img/targets-48.png"), encodePNG(targetSheet(result)));
  console.log(censusMarkdown(result));
  if (!result.verdict.allBuilt || result.verdict.belowMargin.length) { console.error("census gate failed"); process.exit(1); }
  if (result.verdict.kinds.failing.length) console.error(`kind check: ${result.verdict.kinds.failing.join(", ")} not yet reading as their kind`);
}
