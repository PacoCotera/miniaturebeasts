#!/usr/bin/env node
// The layout check (ui/specs/layout.mjs, rules L0 to L11) over every golden state, offline: the logs `goldens.mjs --logs <dir>` writes (the face's log and the props facts of the frame each
// golden's hash is taken of) and the committed goldens. Writes <out>/index.json, <out>/index.md (a rule x screen count table, then per screen: state(s) · rule · what · measured → required · overlay)
// and one overlay a finding, <out>/<screen>/<state>--<rule>-<n>.png (tools/layout-overlay.mjs). Identical findings across a screen's states (rule, node, other, measured) are one, with its states.
// Report mode: exits 0, and 1 only on a finding of a rule frame.json layout.enforced lists for its screen, an unused exception (frame.json layout.exceptions), a malformed layout block, or L0 on an
// enforced screen; 2 when the logs are not the goldens' (a hash that differs) or are missing.
// A finding may carry `says` (the card's plain sentence: plates named by their title, an overlap or a lone mark asked in words), `assumed` (the alignment the rule took: "Aligned: fill (inferred)") and `counted`
// (what a balance weighed or an empty box counted); the overlay draws a margin's opposite side beside it, a near-miss's two lines, the boxes a balance weighed and a small box magnified.
// The review set: <out>/review.md and review.json, one card per screen and rule (with its part): its worst instance (the largest |measured − required|; instances are findings grouped
// ignoring the measure), how many of that kind and the other ids; the nine Station screens first, the Library last under "parked". <out>/index.json and <out>/index.md stay complete.
//   node prototypes/face/tools/layout-check.mjs <logs dir> --out <dir> [--overlays all | review | none]   (all: an overlay a finding, the default; review: the cards' only; --no-overlays: none)
//   node prototypes/face/tools/layout-check.mjs <logs dir> --refresh-cases   (copies the case corpus's states, ui/tests/layout-cases.json, from the logs into ui/tests/layout-cases/: after a retake)
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { findings, slotFindings, group, unusedExceptions, enforcedFinding, malformed, excepted, RULES } from "../../ui/specs/layout.mjs";
import { overlay, label, dimmed } from "./layout-overlay.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "../.."), specsDir = path.join(root, "ui/specs/station"), goldenDir = path.join(here, "../golden");
const J = (f) => JSON.parse(readFileSync(f, "utf8")), SPECS = {};
for (const f of readdirSync(specsDir).filter((f) => f.endsWith(".json"))) { try { const j = J(path.join(specsDir, f)); SPECS[f.replace(/\.json$/, "")] = j; } catch { /* not a spec */ } }
const frame = SPECS.frame;
// The spec a state is measured by: Idle's is frame.json idle; else the screen its props name (library.species is library.json's); an open decision panel stands on panel.json's layout.
export function specFor(rec) {
  if (rec.screen === "idle" || rec.idle) return { spec: frame.idle, name: "frame.json idle" };
  const base = String(rec.spec ?? rec.screen).split(".")[0], s = SPECS[base] ?? SPECS[rec.screen];
  if (rec.overlay === "panel" && SPECS.panel?.layout) return { spec: { ...s, layout: SPECS.panel.layout }, name: "panel.json" };
  return { spec: s, name: (SPECS[base] ? base : rec.screen) + ".json" };
}
const slug = (n) => n.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
export function readLogs(dir) {
  const out = []; if (!existsSync(dir)) return out;
  for (const s of readdirSync(dir).sort()) { const d = path.join(dir, s); if (!existsSync(d) || !readdirSync(d).length) continue; for (const f of readdirSync(d).filter((f) => f.endsWith(".json")).sort()) out.push(J(path.join(d, f))); }
  return out;
}
// Every finding of a run: { results (per state, for the exceptions), grouped (per screen, with ids), malformed, blind, stale }
export function run(records) {
  const results = [], perScreen = new Map(), bad = new Set(), blind = [];
  for (const rec of records) {
    const { spec, name } = specFor(rec);
    for (const m of malformed(spec, frame, name)) bad.add(m);
    if (!spec?.layout) continue;
    const fs = findings(rec.log, spec, frame, rec.screen, rec.state, { facts: rec.facts ?? {} });
    results.push(fs); if (!perScreen.has(rec.screen)) perScreen.set(rec.screen, { states: [], records: [] });
    perScreen.get(rec.screen).states.push({ state: rec.state, findings: fs }); perScreen.get(rec.screen).records.push({ ...rec, spec, frameSpec: frame, extra: { facts: rec.facts ?? {} } });
  }
  const grouped = [];
  for (const [screen, p] of perScreen) {
    const slots = excepted(frame, screen, slotFindings(p.records, screen)); results.push(slots);   // the slots go through the exceptions as every other finding
    const list = [...group(p.states), ...slots], n = {};
    for (const f of list) { n[f.rule] = (n[f.rule] ?? 0) + 1; const first = f.states[0], rec = p.records.find((r) => r.state === first);
      grouped.push({ id: `${screen}/${f.rule}/${n[f.rule]}`, screen, ...f, enforced: enforcedFinding(frame, screen, f), golden: rec ? `prototypes/face/golden/${screen}/${rec.png}` : null, overlay: `${screen}/${slug(first)}--${f.rule}${f.part ?? ""}-${n[f.rule]}.png` });
      if (f.rule === "L0") blind.push(`${screen}/${f.node} (${f.states.join(", ")})`); }
  }
  return { results, grouped, malformed: [...bad], blind };
}

// The review set: one card per screen and rule (with its part). The instances of a kind are its findings grouped ignoring the measure (rule, part, node, other, container); the card shows the
// worst finding (the largest |measured − required|), the count of instances and of findings, and the other ids. The nine Station screens first, in this order; the Library last, parked.
export const STATION = ["bench", "cargo", "create", "habitat", "home", "incubator", "pods", "sitting", "vivarium"], PARKED = ["library"];
const off = (f) => (typeof f.measured === "number" && typeof f.required === "number" ? Math.abs(f.measured - f.required) : 0);
export function review(grouped) {
  const order = (s) => (STATION.includes(s) ? STATION.indexOf(s) : PARKED.includes(s) ? 1000 + PARKED.indexOf(s) : 500), kinds = new Map();
  for (const f of grouped) { const k = `${f.screen}|${f.rule}${f.part ?? ""}`; if (!kinds.has(k)) kinds.set(k, []); kinds.get(k).push(f); }
  const cards = [...kinds.values()].map((fs) => { const worst = fs.reduce((a, f) => (off(f) > off(a) ? f : a)), inst = new Set(fs.map((f) => [f.rule, f.part ?? "", f.node, f.other, f.container.id].join("|")));
    return { screen: worst.screen, kind: worst.rule + (worst.part ?? ""), parked: PARKED.includes(worst.screen), instances: inst.size, findings: fs.length,
      worst: { id: worst.id, node: worst.node, other: worst.other, container: worst.container, measured: worst.measured, required: worst.required, unit: worst.unit, what: worst.what ?? "", ...(worst.says ? { says: worst.says } : {}), ...(worst.assumed ? { assumed: worst.assumed } : {}), ...(worst.counted ? { counted: worst.counted } : {}), states: worst.states, overlay: worst.overlay },
      others: fs.filter((f) => f !== worst).map((f) => f.id) }; });
  const ruleN = (k) => { const m = k.match(/^L(\d+)([ab]?)$/); return m ? +m[1] * 10 + (m[2] === "b" ? 1 : 0) : 999; };
  return cards.sort((a, b) => order(a.screen) - order(b.screen) || a.screen.localeCompare(b.screen) || ruleN(a.kind) - ruleN(b.kind));
}
function reviewMd(cards, { commit, taken, total, overlays }) {
  const screens = [...new Set(cards.map((c) => c.screen))], live = screens.filter((s) => !PARKED.includes(s)), parked = screens.filter((s) => PARKED.includes(s));
  const md = [`# Layout check: the review set`, ``, `${cards.length} cards, one per screen and rule (with its part), of ${total} findings: each the worst instance of its kind, with how many of that kind and the other ids (index.md lists every finding). Commit ${commit ?? "?"}, taken ${taken}; overlays: ${overlays}.`, ``,
    `| Screen | Cards |`, `| --- | ---: |`, ...screens.map((s) => `| ${s}${PARKED.includes(s) ? " (parked)" : ""} | ${cards.filter((c) => c.screen === s).length} |`), ``];
  const section = (s) => { md.push(`### ${s}`, ``); for (const c of cards.filter((q) => q.screen === s)) { const w = c.worst;
    md.push(`- **${c.kind}** · ${w.node}${w.other ? " / " + w.other : ""} in ${w.container.id}: ${w.what}${w.says ? " · " + w.says : ""}${w.assumed ? " · " + w.assumed : ""}${w.counted ? " · Counted: " + w.counted : ""} · ${typeof w.measured === "number" ? w.measured : JSON.stringify(w.measured)} → ${w.required} · ${w.states.length > 3 ? `${w.states.slice(0, 3).join(", ")} and ${w.states.length - 3} more` : w.states.join(", ")} · [overlay](${w.overlay}) · ${w.id}; ${c.instances} instance${c.instances === 1 ? "" : "s"} of this kind (${c.findings} finding${c.findings === 1 ? "" : "s"})${c.others.length ? ": also " + c.others.join(", ") : ""}`); }
    md.push(``); };
  md.push(`## The Station screens`, ``); live.forEach(section);
  if (parked.length) { md.push(`## Parked`, ``, `The Library waits for its workstream: its cards are listed, not reviewed now.`, ``); parked.forEach(section); }
  return md.join("\n");
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const t0 = performance.now(), args = process.argv.slice(2), dir = args.find((a, i) => !a.startsWith("--") && !["--out", "--overlays"].includes(args[i - 1])), outAt = args.indexOf("--out"), out = outAt >= 0 ? path.resolve(args[outAt + 1] ?? "") : null;
  if (!dir || (!out && !args.includes("--refresh-cases"))) { console.error("usage: layout-check.mjs <logs dir> --out <dir> [--overlays all | review | none] | <logs dir> --refresh-cases"); process.exit(2); }
  const ovAt = args.indexOf("--overlays"), overlays = args.includes("--no-overlays") ? "none" : ovAt >= 0 ? args[ovAt + 1] : "all";
  if (!["all", "review", "none"].includes(overlays)) { console.error("--overlays is all, review or none"); process.exit(2); }
  const records = readLogs(path.resolve(dir)); if (!records.length) { console.error("no logs in " + dir + " (goldens.mjs --check --logs <dir>)"); process.exit(2); }
  // the logs must be the goldens': each state's hash is its golden's
  const stale = []; for (const r of records) { const g = existsSync(path.join(goldenDir, r.screen, r.screen + ".json")) ? J(path.join(goldenDir, r.screen, r.screen + ".json")).states?.[r.state] : null; if (!g || g.hash !== r.hash) stale.push(`${r.screen}/${r.state}`); }
  if (stale.length) { console.error(`the logs are not the goldens' (${stale.length} states differ or have no golden: ${stale.slice(0, 4).join(", ")}${stale.length > 4 ? ", …" : ""}): take them with goldens.mjs --check --logs`); process.exit(2); }
  if (args.includes("--refresh-cases")) {
    const casesFile = path.join(root, "ui/tests/layout-cases.json"), fixDir = path.join(root, "ui/tests/layout-cases"), cases = J(casesFile); let n = 0;
    for (const c of cases.cases) { const [screen, ...rest] = c.state.split("/"), state = rest.join("/"), r = records.find((q) => q.screen === screen && q.state === state); if (!r) { console.error("FAIL the case corpus names " + c.state + ", which the logs do not hold"); process.exit(1); }
      mkdirSync(path.join(fixDir, screen), { recursive: true }); writeFileSync(path.join(fixDir, screen, slug(state) + ".json"), JSON.stringify(r) + "\n"); n++; }
    console.log(`refreshed ${n} fixture logs in ${path.relative(process.cwd(), fixDir) || fixDir}`); process.exit(0);
  }
  const R = run(records), unused = unusedExceptions(frame, R.results), enforcedHits = R.grouped.filter((f) => f.enforced), blindEnforced = R.grouped.filter((f) => f.rule === "L0" && frame.layout?.enforced?.[f.screen]);
  rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
  const cards = review(R.grouped), drawn = overlays === "review" ? new Set(cards.map((c) => c.worst.id)) : null;
  if (overlays !== "none") { const base = new Map();   // each golden decoded and dimmed once
    for (const f of R.grouped) { if (drawn && !drawn.has(f.id)) continue; if (!f.golden) continue; if (!base.has(f.golden)) base.set(f.golden, dimmed(readFileSync(path.join(root, "..", f.golden)))); mkdirSync(path.join(out, f.screen), { recursive: true }); writeFileSync(path.join(out, f.overlay), overlay(base.get(f.golden), f)); } }
  // the counts: by rule, by screen, by rule and screen (grouped findings)
  const screens = [...new Set(records.map((r) => r.screen))].sort(), byRule = Object.fromEntries(RULES.map((r) => [r, 0])), byScreen = Object.fromEntries(screens.map((s) => [s, 0])), byRuleScreen = {};
  for (const f of R.grouped) { byRule[f.rule]++; byScreen[f.screen]++; (byRuleScreen[f.rule] ??= {})[f.screen] = (byRuleScreen[f.rule][f.screen] ?? 0) + 1; }
  let commit = process.env.GITHUB_SHA ?? null; try { commit = execFileSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { /* not a checkout */ }
  const taken = new Date().toISOString(), thresholds = frame.layout.thresholds, ms = Math.round(performance.now() - t0);
  const index = { commit, taken, states: records.length, runtimeMs: ms, thresholds, totals: { byRule, byScreen, byRuleScreen }, exceptionsUsed: [...new Set(R.results.flatMap((r) => r.used ?? []))], exceptionsUnused: unused, blind: R.blind, malformed: R.malformed, findings: R.grouped };
  writeFileSync(path.join(out, "index.json"), JSON.stringify(index, null, 1) + "\n");
  const md = [`# Layout check`, ``, `${records.length} golden states, ${R.grouped.length} findings (identical findings across a screen's states are one). Report mode: ${Object.keys(frame.layout.enforced ?? {}).length} screens enforced. Commit ${commit ?? "?"}, taken ${taken}, ${(ms / 1000).toFixed(1)} s.`, ``,
    `| Rule | ${screens.join(" | ")} | All |`, `| --- | ${screens.map(() => "---:").join(" | ")} | ---: |`, ...RULES.map((r) => `| ${r} | ${screens.map((s) => byRuleScreen[r]?.[s] ?? 0).join(" | ")} | ${byRule[r]} |`), `| All | ${screens.map((s) => byScreen[s]).join(" | ")} | ${R.grouped.length} |`, ``];
  if (R.blind.length) md.push(`Not measurable (L0): ${R.blind.join("; ")}`, ``);
  if (unused.length) md.push(`Unused exceptions: ${unused.map((e) => `${e.screen} ${e.rule} ${e.node}`).join("; ")}`, ``);
  for (const s of screens) { const fs = R.grouped.filter((f) => f.screen === s); if (!fs.length) continue; md.push(`## ${s}`, ``);
    for (const f of fs) md.push(`- ${f.states.length > 3 ? `${f.states.slice(0, 3).join(", ")} and ${f.states.length - 3} more` : f.states.join(", ")} · ${f.rule}${f.part ?? ""}${f.enforced ? " (enforced)" : ""} · ${f.node}${f.other ? " / " + f.other : ""} in ${f.container.id}: ${f.what ?? ""}${f.says ? " · " + f.says : ""}${f.assumed ? " · " + f.assumed : ""}${f.counted ? " · Counted: " + f.counted : ""} · ${label(f).replace(/^\S+ /, "")} · [overlay](${f.overlay})`);
    md.push(``); }
  writeFileSync(path.join(out, "index.md"), md.join("\n"));
  writeFileSync(path.join(out, "review.json"), JSON.stringify({ commit, taken, overlays, cards }, null, 1) + "\n");
  writeFileSync(path.join(out, "review.md"), reviewMd(cards, { commit, taken, total: R.grouped.length, overlays }));
  console.log(`review set: ${cards.length} cards (${[...new Set(cards.map((c) => c.screen))].map((s) => `${s} ${cards.filter((c) => c.screen === s).length}`).join(", ")}) · ${path.join(out, "review.md")}`);
  console.log(`layout check: ${records.length} states, ${R.grouped.length} findings (${RULES.map((r) => `${r} ${byRule[r]}`).join(", ")}), ${(ms / 1000).toFixed(1)} s`);
  for (const s of screens) console.log(`  ${s.padEnd(10)} ${String(byScreen[s]).padStart(4)}  ${RULES.filter((r) => byRuleScreen[r]?.[s]).map((r) => `${r} ${byRuleScreen[r][s]}`).join(", ")}${frame.layout.enforced?.[s] ? " · enforced " + JSON.stringify(frame.layout.enforced[s]) : ""}`);
  let failed = 0;
  for (const m of R.malformed) { failed++; console.error("FAIL malformed: " + m); }
  for (const e of unused) { failed++; console.error(`FAIL frame.json layout.exceptions: ${e.screen} ${e.rule} ${e.node} is used by no finding`); }
  for (const f of enforcedHits) { failed++; console.error(`FAIL enforced ${f.id}: ${f.node}${f.other ? " / " + f.other : ""} ${label(f)} (${f.states.join(", ")})`); }
  for (const f of blindEnforced) if (!f.enforced) { failed++; console.error(`FAIL ${f.id}: not measurable on an enforced screen`); }
  console.log(failed ? `layout check: ${failed} failure(s)` : `layout check ok (report mode: ${Object.keys(frame.layout.enforced ?? {}).length} screens enforced) · ${path.join(out, "index.md")}`);
  process.exit(failed ? 1 : 0);
}
