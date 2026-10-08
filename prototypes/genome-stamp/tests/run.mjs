// Robustness test for the stamp: random individuals of the Loika (frame id hopper), the
// Tuikis (frame id glowtail) and a synthetic 150-open-loci species, on screen at 300/200/120 px
// under every distortion, as Caddy prints (203 dpi) at 16/20/30 mm photographed
// at 9 and 6 px/mm, parent/child relatedness from printed stamps, and limit
// sweeps. Writes tests/results.md and tests/results.json.
//
//   node tests/run.mjs [--n 50] [--sweep-n 30] [--workers 4] [--quick]
import { Worker, isMainThread, parentPort } from "node:worker_threads";
import { writeFileSync } from "node:fs";
import { availableParallelism } from "node:os";

const STRESS = [
  ...[2.5, 3, 4].map((b) => ({ id: `blur${b}`, label: `Blur σ ${b} px at 200 px`, blur: b })),
  ...[25, 15].map((q) => ({ id: `jpeg${q}`, label: `JPEG quality ${q}`, jpeg: q })),
  ...[55, 65].map((t) => ({ id: `tilt${t}`, label: `Perspective ${t}°, close`, rot: true, tilt: t, rOverD: 0.25 })),
  { id: "noise", label: "Noise σ 25/255", noise: 0.1 },
  { id: "dim", label: "Lighting 100% → 15%", light: true, low: 0.15 },
];

if (!isMainThread) {
  const C = await import("./cases.mjs");
  parentPort.on("message", (t) => {
    if (t === null) return process.exit(0);
    let res;
    try {
    if (t.kind === "screen") {
      const all = [...C.SCREEN, ...STRESS];
      res = C.runScreen(t.sp, t.i, t.D, t.seed, t.conds ? all.filter((c) => t.conds.includes(c.id)) : C.SCREEN);
      for (const v of Object.values(res)) delete v.decoded;
    } else if (t.kind === "print") { res = { print: C.runPrint(t.sp, t.i, t) }; delete res.print.decoded; }
    else res = { trio: C.runTrio(t.sp, t.i) };
    } catch (e) { // a decoder exception counts as a failed read, never a crash
      const fail = { ok: false, error: `exception: ${e.message}` };
      res = t.kind === "screen" ? Object.fromEntries((t.conds ?? C.SCREEN.map((c) => c.id)).map((id) => [id, fail])) : t.kind === "print" ? { print: fail } : { trio: fail };
    }
    parentPort.postMessage({ t, res });
  });
  parentPort.postMessage(null);
} else {
  const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? Number(process.argv[i + 1]) : d; };
  const quick = process.argv.includes("--quick");
  const N = arg("n", quick ? 4 : 50), NS = arg("sweep-n", quick ? 3 : 30);
  const workers = arg("workers", Math.max(1, Math.min(8, availableParallelism())));
  const { SCREEN, SPECIES, frameOf } = await import("./cases.mjs");
  const { sizeFor } = await import("../src/codec.mjs");
  const tasks = [];
  for (const sp of SPECIES) {
    for (const D of [300, 200, 120]) for (let i = 0; i < N; i++) tasks.push({ kind: "screen", group: "screen", sp, i, D, seed: 1 });
    for (const mm of [16, 20, 30]) for (const pxPerMm of [9, 6]) for (let i = 0; i < N; i++) tasks.push({ kind: "print", group: "print", sp, i, mm, dpi: 203, pxPerMm, seed: 2 });
    for (let i = 0; i < Math.ceil(N / 2); i++) tasks.push({ kind: "trio", group: "trio", sp, i });
    for (const D of [100, 80, 64]) for (let i = 0; i < NS; i++) tasks.push({ kind: "screen", group: "sweepD", sp, i, D, seed: 3, conds: ["clean", "all"] });
    for (const mm of [10, 12, 14]) for (const pxPerMm of [9, 6]) for (let i = 0; i < NS; i++) tasks.push({ kind: "print", group: "sweepMM", sp, i, mm, dpi: 203, pxPerMm, seed: 4 });
    for (let i = 0; i < NS; i++) tasks.push({ kind: "screen", group: "stress", sp, i, D: 200, seed: 6, conds: STRESS.map((c) => c.id) });
  }
  const results = [];
  const t0 = Date.now();
  let next = 0, done = 0;
  await new Promise((resolve) => {
    let alive = workers;
    for (let w = 0; w < workers; w++) {
      const wk = new Worker(new URL(import.meta.url));
      const feed = () => wk.postMessage(next < tasks.length ? tasks[next++] : null);
      wk.on("message", (m) => { if (m) { results.push(m); if (++done % 100 === 0) process.stderr.write(`  ${done}/${tasks.length} (${((Date.now() - t0) / 1000).toFixed(0)} s)\n`); } feed(); });
      wk.on("exit", () => { if (--alive === 0) resolve(); });
    }
  });

  const cell = () => ({ n: 0, ok: 0, fa: 0, errors: {}, ms: 0 });
  const table = {};
  const get = (k) => (table[k] ??= cell());
  const add = (c, r) => { c.n++; c.ok += r.ok ? 1 : 0; c.fa += r.falseAccept ? 1 : 0; c.ms += r.ms ?? 0; if (!r.ok) { const e = (r.error || "?").replace(/\d+/g, "#"); c.errors[e] = (c.errors[e] || 0) + 1; } };
  for (const { t, res } of results) {
    if (t.kind === "screen") for (const [cid, r] of Object.entries(res)) add(get(`${t.group}|${t.sp}|${cid}|${t.D}`), r);
    else if (t.kind === "print") add(get(`${t.group}|${t.sp}|${t.mm}|${t.pxPerMm}`), res.print);
    else add(get(`trio|${t.sp}`), res.trio);
  }
  const pct = (c) => (c.n ? `${((100 * c.ok) / c.n).toFixed(c.ok === c.n || c.ok === 0 ? 0 : 1)}%` : "–");
  const fa = Object.values(table).reduce((s, c) => s + c.fa, 0), total = Object.values(table).reduce((s, c) => s + c.n, 0);
  const topErr = (c) => Object.entries(c.errors).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([e, k]) => `${e} (${k})`).join("; ");
  const names = Object.fromEntries(SPECIES.map((sp) => { const f = frameOf(sp), pm = sp.endsWith("-pm"), L = sizeFor(f, { postmark: pm }); return [sp, `${f.name}${pm ? " with a postmark" : ""} (${f.heritable.length} open loci, ${L.N}×${L.N})`]; }));
  const short = { hopper: "Loika 17", glowtail: "Tuikis 25", "glowtail-pm": "Tuikis + postmark 29", future150: "150 loci 37" };   // keys are frame ids (the earlier working words); labels are the species names
  const md = [];
  md.push(`Generated by \`node tests/run.mjs --n ${N} --sweep-n ${NS}\` (${new Date().toISOString().slice(0, 10)}). ${total} decodes, **${fa} false accepts** (a verified read of a wrong genome). Species: ${SPECIES.map((s) => names[s]).join("; ")}.`, "");
  md.push(`### Screen, ${N} individuals per cell (300 / 200 / 120 px)`, "");
  md.push(`| Condition | ${SPECIES.map((s) => short[s]).join(" | ")} |`, `| --- | ${SPECIES.map(() => "---").join(" | ")} |`);
  for (const c of SCREEN) md.push(`| ${c.label} | ${SPECIES.map((sp) => [300, 200, 120].map((D) => pct(get(`screen|${sp}|${c.id}|${D}`))).join(" / ")).join(" | ")} |`);
  const ms = SPECIES.map((sp) => { const cs = SCREEN.flatMap((c) => [300, 200, 120].map((D) => get(`screen|${sp}|${c.id}|${D}`))); return (cs.reduce((s, c) => s + c.ms, 0) / cs.reduce((s, c) => s + c.n, 0)).toFixed(0); });
  md.push("", `Mean decode time in Node: ${SPECIES.map((s, i) => `${short[s]} ${ms[i]} ms`).join(", ")}.`, "");
  md.push(`### Caddy print, 203 dpi, photographed (${N} per cell; 9 px/mm / 6 px/mm)`, "");
  md.push(`| Print | ${SPECIES.map((s) => short[s]).join(" | ")} |`, `| --- | ${SPECIES.map(() => "---").join(" | ")} |`);
  for (const mm of [30, 20, 16]) md.push(`| ${mm} mm | ${SPECIES.map((sp) => `${pct(get(`print|${sp}|${mm}|9`))} / ${pct(get(`print|${sp}|${mm}|6`))}`).join(" | ")} |`);
  md.push("", `### Parent/child relatedness from 20 mm prints (${Math.ceil(N / 2)} trios per species)`, "");
  md.push(`| | ${SPECIES.map((s) => short[s]).join(" | ")} |`, `| --- | ${SPECIES.map(() => "---").join(" | ")} |`);
  md.push(`| Child holds one of the mother's and one of the father's copies at every locus, read from the three photos | ${SPECIES.map((sp) => pct(get(`trio|${sp}`))).join(" | ")} |`);
  md.push("", `### Limits (${NS} per cell)`, "");
  md.push(`| Screen side | ${SPECIES.map((s) => `${short[s]}: clean / all`).join(" | ")} |`, `| --- | ${SPECIES.map(() => "---").join(" | ")} |`);
  for (const D of [120, 100, 80, 64]) md.push(`| ${D} px | ${SPECIES.map((sp) => D === 120 ? `${pct(get(`screen|${sp}|clean|120`))} / ${pct(get(`screen|${sp}|all|120`))}` : `${pct(get(`sweepD|${sp}|clean|${D}`))} / ${pct(get(`sweepD|${sp}|all|${D}`))}`).join(" | ")} |`);
  md.push("", `| Caddy print, 9 / 6 px/mm | ${SPECIES.map((s) => short[s]).join(" | ")} |`, `| --- | ${SPECIES.map(() => "---").join(" | ")} |`);
  for (const mm of [16, 14, 12, 10]) md.push(`| ${mm} mm | ${SPECIES.map((sp) => mm === 16 ? `${pct(get(`print|${sp}|16|9`))} / ${pct(get(`print|${sp}|16|6`))}` : `${pct(get(`sweepMM|${sp}|${mm}|9`))} / ${pct(get(`sweepMM|${sp}|${mm}|6`))}`).join(" | ")} |`);
  md.push("", `| Beyond the targets, at 200 px | ${SPECIES.map((s) => short[s]).join(" | ")} |`, `| --- | ${SPECIES.map(() => "---").join(" | ")} |`);
  for (const c of STRESS) md.push(`| ${c.label} | ${SPECIES.map((sp) => pct(get(`stress|${sp}|${c.id}|200`))).join(" | ")} |`);
  md.push("", "Failure modes:", "");
  for (const [k, c] of Object.entries(table).sort()) { const e = topErr(c); if (e) md.push(`- ${k.replaceAll("|", " · ")}: ${e}`); }
  const text = md.join("\n") + "\n";
  writeFileSync(new URL("./results.md", import.meta.url), text);
  writeFileSync(new URL("./results.json", import.meta.url), JSON.stringify({ N, NS, table }, null, 1));
  console.log(text);
  console.error(`done in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
