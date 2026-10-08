// The workbench page: the catalogue and the frame registry, a species frame edited at the level a
// designer thinks in (plan, clan, chapters, traits; loci on demand), the structural sketch re-rendered
// on every change, random individuals and crosses, side-by-side comparisons with a verdict per trait,
// and exports in the cache format. Everything is the framework's own modules; nothing is a parallel
// model.
import { CATALOGUE, LOCI, PART_SWITCHES, alleleIds } from "../framework/catalogue.mjs";
import { parsePlanKey, planKeyOf, planFacts } from "../framework/plans.mjs";
import { buildFrame, buildIndividual, sampleIndividual, typeSpecimen, crossIndividuals, checkGenome, specFromFrame, chapterFor, rng, RING, CHAPTER_NAMES, FINDS, genomeDigest } from "../framework/species.mjs";
import { CLANS, CLAN_NAMES, specOf, SPECIES } from "../framework/roster.mjs";
import { render, fitCamera, markingFields } from "../framework/raster.mjs";
import { sketchIndividual, manifest, speciesCameras, registryCameras, SKETCHER_VERSION } from "../sketch/sketch.mjs";
import { encodePNG, zip, sha256, download } from "./zip.mjs";

const $ = (id) => document.getElementById(id);
const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) { if (k === "class") node.className = v; else if (k.startsWith("on")) node.addEventListener(k.slice(2), v); else if (v !== null && v !== undefined) node.setAttribute(k, v); }
  for (const c of children.flat()) node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return node;
};
const VERDICTS = [["reads", "reads at 48 px"], ["station", "reads only on the Station"], ["invisible", "invisible: make it a doing"]];
const STORE_KEY = "mb-workbench/specs/1";
// Codes are the ids; the approved names ride beside them wherever a species or a clan is shown.
const labelOf = (spec, edited = false) => `${spec.id}${spec.name && spec.name !== spec.id ? " " + spec.name : ""}${edited ? " (edited)" : ""}`;
const clanLabel = (id) => `${id}${CLAN_NAMES[id] ? " " + CLAN_NAMES[id] : ""}`;

const state = {
  registry: [], specs: {}, edited: {}, frame: null, spec: null, cameras: null, registryCameras: null,
  individuals: [], current: 0, parents: [], pass: "shaded", selectedTrait: null, showLoci: {}, compare: null,
};
const log = (line, cls = "") => { const n = $("log"); n.prepend(el("div", { class: cls }, `${new Date().toLocaleTimeString()}  ${line}`)); while (n.children.length > 60) n.lastChild.remove(); };
const status = (s) => { $("status").textContent = s; };

// --- loading -----------------------------------------------------------------------------------------
async function load() {
  const index = await (await fetch("frames/index.json")).json();
  const frames = await Promise.all(index.species.map((s) => fetch(`frames/${s.file}`).then((r) => r.json())));
  state.registry = frames;
  for (const f of frames) state.specs[f.species.id] = specFromFrame(f);
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
    for (const [id, spec] of Object.entries(saved)) { state.specs[id] = spec; state.edited[id] = true; }
  } catch { /* storage unavailable: drafts are session-only */ }
  const sel = $("species");
  sel.replaceChildren(...Object.keys(state.specs).map((id) => el("option", { value: id }, labelOf(state.specs[id], state.edited[id]))));
  for (const [id, clan] of Object.entries(CLANS)) $("new-clan").append(el("option", { value: id }, `${clanLabel(id)}: ${clan.resembles} (${planFacts(clan.plan, clan.extras).code})`));
  state.registryCameras = registryCameras(frames);
  status(`catalogue ${CATALOGUE.id}@${CATALOGUE.version} · ${CATALOGUE.loci.length} loci · ${frames.length} frames`);
  selectSpecies(frames[0].species.id);
}

function selectSpecies(id) {
  state.spec = state.specs[id];
  rebuild({ quiet: true });
  $("species").value = id;
  state.individuals = [{ genome: typeSpecimen(state.frame), label: "type specimen" }];
  state.current = 0; state.parents = []; state.compare = null; state.selectedTrait = null;
  $("compare-panel").hidden = true;
  renderAll();
}

// Rebuild the frame from the spec. No viability loop here (that is Check frame); a type specimen
// that does not build is reported in the log and the previous frame stays.
function rebuild({ quiet = false, samples = 0 } = {}) {
  try {
    const frame = buildFrame(state.spec, { samples });
    state.frame = frame;
    state.cameras = $("shared-scale").checked && state.registryCameras ? state.registryCameras : speciesCameras(frame);
    if (!quiet) log(`${frame.species.id}: frame rebuilt, ${frame.counts.carried} carried, ${frame.counts.open} open in ${frame.counts.traits} traits${samples ? `, ${frame.viability.constructed}/${samples} random individuals build` : ""}`);
    return true;
  } catch (e) {
    log(`${state.spec.id}: ${e.message}`, "warn");
    if (e.frame) { state.frame = e.frame; state.cameras = $("shared-scale").checked && state.registryCameras ? state.registryCameras : speciesCameras(e.frame); }
    return false;
  }
}
function commit() {
  const ok = rebuild();
  state.edited[state.spec.id] = true;
  try { const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); saved[state.spec.id] = state.spec; localStorage.setItem(STORE_KEY, JSON.stringify(saved)); } catch { /* fine */ }
  const opt = [...$("species").options].find((o) => o.value === state.spec.id);
  if (opt) opt.textContent = labelOf(state.spec, true);
  // Individuals must still fit the frame; re-validate and drop the ones that no longer do.
  state.individuals = state.individuals.filter((ind, i) => i === 0 || checkGenome(state.frame, ind.genome).length === 0);
  state.individuals[0] = { genome: typeSpecimen(state.frame), label: "type specimen" };
  if (state.current >= state.individuals.length) state.current = 0;
  renderAll();
  return ok;
}

// --- the editor ----------------------------------------------------------------------------------------
function renderEditor() {
  const f = state.frame, spec = state.spec;
  const p = parsePlanKey(spec.plan.key);
  const planSelect = (field, options) => el("select", { onchange: (e) => { const q = { ...p, [field]: e.target.value }; if (q.limbs !== "contact") q.pairs = "two"; if (q.limbs !== "free") { q.groups = "zero"; q.links = "one"; } spec.plan.key = planKeyOf(q); dropInapplicable(); commit(); } }, options.map((o) => el("option", { value: o, selected: p[field] === o ? "" : null }, o)));
  const extra = (key, labelText) => el("label", {}, el("input", { type: "checkbox", checked: spec.plan.extras[key] ? "" : null, onchange: (e) => { spec.plan.extras[key] = e.target.checked; if (key === "join") spec.plan.extras.join = e.target.checked ? "narrow" : "broad"; commit(); } }), ` ${labelText}`);
  $("frame-head").replaceChildren(
    el("div", {}, el("b", {}, labelOf(spec)), ` · ${f.taxonomy.resembles ?? ""} · clan ${clanLabel(spec.clan)} · ${f.plan.code} (rig ${f.plan.rig}, ${f.plan.limbSet ?? "no limbs"}${f.plan.posture ? ", " + f.plan.posture : ""}, ${f.plan.head} head) · ${f.taxonomy.tier}`),
    el("div", { class: "row" }, "Plan: ", planSelect("segments", ["one", "two", "three"]), planSelect("layout", ["serial", "fan"]), planSelect("symmetry", ["bilateral", "radial"]), planSelect("limbs", ["none", "contact", "free"]), p.limbs === "contact" ? planSelect("pairs", ["one", "two", "three"]) : "", planSelect("flaps", ["off", "on"]), planSelect("covering", ["skin", "scales", "fur"])),
    el("div", { class: "row" }, el("label", {}, el("input", { type: "checkbox", checked: spec.plan.extras.join === "narrow" ? "" : null, onchange: (e) => { spec.plan.extras.join = e.target.checked ? "narrow" : "broad"; commit(); } }), " neck (narrow join)"), extra("wave", "body wave"), extra("fins", "flaps as fins"), extra("float", "afloat")),
    el("div", {}, `Signature: ${spec.feature ?? ""} · anchor `, el("select", { onchange: (e) => { spec.anchor = e.target.value; spec.fixed["appearance.body-palette"] = e.target.value; commit(); } }, alleleIds("appearance.body-palette").map((a) => el("option", { value: a, selected: spec.anchor === a ? "" : null }, a))), spec.second ? [" · second ", el("select", { onchange: (e) => { spec.second = e.target.value; spec.fixed["appearance.underside-palette"] = e.target.value; commit(); } }, alleleIds("appearance.underside-palette").map((a) => el("option", { value: a, selected: spec.second === a ? "" : null }, a)))] : ""),
    el("div", {}, `Carried ${f.counts.carried} (trunk ${f.counts.trunk}, branch ${f.counts.branch}) · open ${f.counts.open} in ${f.counts.traits} traits · sleeping ${f.counts.sleeping} · sealed ${f.counts.sealed} · absent ${f.counts.absent} · stamp ${f.counts.stampBitsPerCopy} bits a copy`, state.edited[spec.id] ? [" · ", el("button", { class: "small", onclick: () => { const orig = state.registry.find((r) => r.species.id === spec.id); if (!orig) return; delete state.edited[spec.id]; try { const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); delete saved[spec.id]; localStorage.setItem(STORE_KEY, JSON.stringify(saved)); } catch { /* fine */ } state.specs[spec.id] = specFromFrame(orig); [...$("species").options].find((o) => o.value === spec.id).textContent = labelOf(state.specs[spec.id]); selectSpecies(spec.id); log(`${spec.id}: edits discarded`); } }, "Discard edits")] : ""),
  );
  const chaptersNode = $("chapters");
  chaptersNode.replaceChildren();
  const lociOf = Object.fromEntries(f.loci.map((l) => [l.id, l]));
  for (const ch of RING) {
    const traits = spec.open.filter((t) => t.chapter === ch);
    const sealed = ch in spec.sealed;
    if (!traits.length && !sealed) continue;
    const head = el("div", { class: "chead" }, CHAPTER_NAMES[ch], el("span", { class: "muted" }, `${traits.length} trait${traits.length === 1 ? "" : "s"}`), sealed ? el("span", { class: "sealed" }, `sealed: ${spec.sealed[ch]}`) : "",
      el("button", { class: "small", style: "margin-left:auto", onclick: (e) => { e.stopPropagation(); if (sealed) delete spec.sealed[ch]; else spec.sealed[ch] = prompt("What find opens this chapter?", FINDS[ch] ?? "a find") || FINDS[ch] || "a find"; commit(); } }, sealed ? "Unseal" : "Seal"));
    const box = el("div", { class: "chapter" }, head);
    for (const t of traits) {
      const rows = t.loci.map((id) => lociOf[id]).filter(Boolean);
      const kinds = [...new Set(rows.map((r) => r.kind))];
      const stateWord = kinds.includes("sealed") ? "sealed" : kinds.includes("sleeping") ? "open · sleeping" : "open";
      const selected = state.selectedTrait === t.id;
      const node = el("div", { class: `trait${selected ? " selected" : ""}`, tabindex: "0", "data-trait": t.id, onclick: () => { state.selectedTrait = t.id; renderEditor(); }, onkeydown: (e) => { if (e.key === "Enter") { state.showLoci[t.id] = !state.showLoci[t.id]; renderEditor(); } } },
        el("div", {}, el("span", { class: "tname" }, t.name), " ", el("span", { class: "tmeta" }, `${rows[0]?.nature ?? ""} · ${t.shapeable ? "shapeable" : "breeding only"} · ${t.looks.join(" / ")}`)),
        el("div", { class: "row" }, el("span", { class: `state ${stateWord.split(" ")[0]}` }, stateWord), el("button", { class: "small", title: "Lock this trait: its loci become fixed at the current individual's first copy", onclick: (e) => { e.stopPropagation(); lockTrait(t); } }, "Lock"), el("button", { class: "small", onclick: (e) => { e.stopPropagation(); state.showLoci[t.id] = !state.showLoci[t.id]; renderEditor(); } }, state.showLoci[t.id] ? "Hide loci" : "Loci")),
      );
      if (t.verdict || selected) node.append(el("div", { class: "verdict" }, "Verdict: ", ...VERDICTS.map(([v, word]) => el("button", { class: `small${t.verdict?.at48 === v ? " on" : ""}`, onclick: (e) => { e.stopPropagation(); setVerdict(t, v); } }, word)), t.verdict ? el("span", {}, ` recorded ${t.verdict.date}${t.verdict.note ? ": " + t.verdict.note : ""}`) : ""));
      if (state.showLoci[t.id]) {
        const lociBox = el("div", { class: "loci" });
        for (const id of t.loci) {
          const row = lociOf[id], locus = LOCI.get(id);
          const pool = t.pool?.[id] ?? alleleIds(id);
          const copies = state.individuals[state.current]?.genome.loci[id] ?? [pool[0], pool[0]];
          lociBox.append(el("div", { class: "locus" }, el("code", {}, id), el("span", { class: "muted" }, `${locus.operator} · ${row?.kind ?? ""} · ${row?.guard ?? ""}`),
            el("span", {}, "pool: ", ...alleleIds(id).map((a) => el("label", { class: pool.includes(a) ? "" : "off" }, el("input", { type: "checkbox", checked: pool.includes(a) ? "" : null, onchange: (e) => { const next = e.target.checked ? [...pool, a] : pool.filter((x) => x !== a); if (!next.length) { e.target.checked = true; return; } t.pool = { ...(t.pool ?? {}), [id]: alleleIds(id).filter((x) => next.includes(x)) }; commit(); } }), a))),
            el("span", {}, "copies: ", ...[0, 1].map((k) => el("select", { onchange: (e) => { const ind = state.individuals[state.current]; ind.genome = structuredClone(ind.genome); ind.genome.loci[id][k] = e.target.value; ind.built = null; renderAll(); } }, pool.map((a) => el("option", { value: a, selected: copies[k] === a ? "" : null }, a)))))));
        }
        node.append(lociBox);
      }
      box.append(node);
    }
    chaptersNode.append(box);
  }
  // Locked parts, by family, with "open" and a fixed-value select.
  const lockedNode = $("locked");
  lockedNode.replaceChildren();
  const locked = f.loci.filter((l) => l.kind === "locked");
  for (const l of locked) {
    const options = alleleIds(l.id);
    lockedNode.append(el("div", { class: "locus" }, el("code", {}, l.id), el("select", { onchange: (e) => { spec.fixed[l.id] = e.target.value; if (PART_SWITCHES.has(l.id)) spec.features[l.id] = e.target.value; commit(); } }, options.map((a) => el("option", { value: a, selected: l.copies[0] === a ? "" : null }, a))),
      el("button", { class: "small", onclick: () => openLocus(l.id) }, "Open")));
  }
  const absentNode = $("absent");
  absentNode.replaceChildren(...f.absent.map((a) => el("div", { class: "locus" }, el("code", {}, a.id), el("span", {}, a.why), PART_SWITCHES.has(a.id) && a.why.includes("never") ? el("button", { class: "small", onclick: () => { spec.features[a.id] = "on"; spec.fixed[a.id] = "on"; commit(); log(`${a.id}: added to the clan's parts`); } }, "Add part") : "")));
}
function dropInapplicable() { /* buildFrame rejects open traits the plan cannot carry; drop them first */
  const probe = { ...state.spec, open: [] };
  try {
    const frame = buildFrame(probe, { samples: 0 });
    const carried = new Set(frame.loci.map((l) => l.id).concat(frame.absent.filter((a) => PART_SWITCHES.has(a.id)).map((a) => a.id)));
    const keep = state.spec.open.filter((t) => t.loci.every((id) => carried.has(id)));
    for (const t of state.spec.open) if (!keep.includes(t)) log(`${t.name}: dropped, the new plan cannot show it`);
    state.spec.open = keep;
    state.spec.openSwitches = (state.spec.openSwitches ?? []).filter((id) => carried.has(id));
    for (const id of Object.keys(state.spec.fixed)) if (!carried.has(id)) delete state.spec.fixed[id];
  } catch (e) { log(e.message, "warn"); }
}
function lockTrait(t) {
  const ind = state.individuals[state.current]?.genome;
  for (const id of t.loci) { const copy = ind?.loci[id]?.[0] ?? (t.pool?.[id] ?? alleleIds(id))[0]; state.spec.fixed[id] = copy; if (PART_SWITCHES.has(id)) state.spec.features[id] = copy; }
  state.spec.open = state.spec.open.filter((x) => x !== t);
  state.spec.openSwitches = (state.spec.openSwitches ?? []).filter((id) => !t.loci.includes(id));
  if (state.selectedTrait === t.id) state.selectedTrait = null;
  log(`${t.name}: locked at ${t.loci.map((id) => state.spec.fixed[id]).join(", ")}`);
  commit();
}
function openLocus(id) {
  const locus = LOCI.get(id);
  const chapter = chapterFor(id);
  const trait = { chapter, id: id.split(".").pop(), name: locus.label ?? id, loci: [id], looks: alleleIds(id), pool: { [id]: alleleIds(id) }, shapeable: locus.nature === "look", override: null, verdict: null };
  if (state.spec.open.some((t) => t.id === trait.id)) trait.id += "-2";
  delete state.spec.fixed[id];
  if (PART_SWITCHES.has(id)) { state.spec.openSwitches = [...(state.spec.openSwitches ?? []), id]; delete state.spec.features[id]; }
  state.spec.open.push(trait);
  state.selectedTrait = trait.id;
  log(`${id}: opened as the trait "${trait.name}" in ${CHAPTER_NAMES[chapter]}`);
  if (!commit()) { state.spec.open = state.spec.open.filter((t) => t !== trait); state.spec.fixed[id] = alleleIds(id)[0]; commit(); }
}
function setVerdict(t, v) {
  const note = prompt(`Verdict for ${t.name}: ${VERDICTS.find(([k]) => k === v)[1]}. A note?`, t.verdict?.note ?? "") ?? "";
  t.verdict = { at48: v, note, date: new Date().toISOString().slice(0, 10), by: "workbench" };
  if (v === "invisible" && t.shapeable) { t.shapeable = false; t.override = "the workbench found this trait invisible, so it changes only by breeding"; }
  log(`${t.name}: ${VERDICTS.find(([k]) => k === v)[1]}`);
  commit();
}

// --- the sketch --------------------------------------------------------------------------------------
function blit(canvas, image, scale = 1) {
  canvas.width = image.width * scale; canvas.height = image.height * scale;
  const ctx = canvas.getContext("2d");
  const data = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
  if (scale === 1) { ctx.putImageData(data, 0, 0); return; }
  const off = document.createElement("canvas"); off.width = image.width; off.height = image.height; off.getContext("2d").putImageData(data, 0, 0);
  ctx.imageSmoothingEnabled = false; ctx.drawImage(off, 0, 0, canvas.width, canvas.height);
}
function built(ind) {
  if (!ind.built) {
    try { ind.built = buildIndividual(state.frame, ind.genome); }
    catch (e) { ind.built = { error: e.message }; }
  }
  return ind.built;
}
function renderSketch() {
  const ind = state.individuals[state.current];
  const b = built(ind);
  const hint = $("sketch-hint");
  if (b.error || b.validation.status !== "valid") {
    hint.textContent = `rejected: ${b.error ?? b.validation.problems.join("; ")}`; hint.className = "hint warn";
    $("caption").textContent = "This genome does not build; nothing is repaired.";
    return;
  }
  hint.textContent = `${ind.label} · ${genomeDigest(ind.genome)} · ${b.validation.counts.nodes} parts`; hint.className = "hint";
  const scene = b.scene;
  const passes = ["shaded", "slots", "index", "silhouette", ...markingFields(scene).map((f) => `markings:${f}`)];
  $("passes").replaceChildren(...passes.map((p) => el("button", { class: `small${state.pass === p ? " on" : ""}`, onclick: () => { state.pass = p; renderSketch(); } }, p)));
  const [pass, field] = state.pass.split(":");
  const cam = (view, size) => state.cameras[view][size];
  blit($("main-view"), render(scene, cam("three-quarter", "station"), pass, { field }));
  const views = $("views");
  views.replaceChildren();
  for (const [view, size, scale, label] of [["front", "companion", 0.5, "front · 280×300 at ½"], ["side", "companion", 0.5, "side"], ["top", "companion", 0.5, "top"], ["three-quarter", "tile", 3, "48 px tile at 3×"]]) {
    const c = el("canvas");
    const image = render(scene, cam(view, size), pass, { field });
    if (scale === 0.5) { const half = { width: image.width / 2, height: image.height / 2, data: new Uint8ClampedArray(image.width * image.height) }; for (let y = 0; y < half.height; y++) for (let x = 0; x < half.width; x++) for (let k = 0; k < 4; k++) half.data[(y * half.width + x) * 4 + k] = image.data[((2 * y) * image.width + 2 * x) * 4 + k]; blit(c, half); }
    else blit(c, image, scale);
    views.append(el("figure", {}, c, el("figcaption", {}, label)));
  }
  $("caption").textContent = `${b.scene.plan.code} · ${scene.covering.kind}${scene.markings ? ", " + scene.markings.layout : ""} · slots: ${Object.keys(scene.slots).filter((k) => scene.slots[k]).join(", ")} · fields: ${markingFields(scene).join(", ") || "none"} · states: ${scene.plan.states.join(", ")}`;
}
function renderStrip() {
  const strip = $("strip");
  strip.replaceChildren();
  state.individuals.forEach((ind, i) => {
    const b = built(ind);
    const c = el("canvas");
    const cell = el("div", { class: `cell${i === state.current ? " selected" : ""}${state.parents.includes(i) ? " parent" : ""}${b.error || b.validation?.status !== "valid" ? " rejected" : ""}`, tabindex: "0",
      onclick: (e) => { if (e.shiftKey) { state.parents = [...state.parents.filter((p) => p !== i), i].slice(-2); $("cross").disabled = state.parents.length !== 2; } else state.current = i; renderAll(); },
      onkeydown: (e) => { if (e.key === "Enter") { state.current = i; renderAll(); } } }, c, el("div", {}, ind.label));
    if (!b.error && b.validation.status === "valid") blit(c, render(b.scene, fitCamera(b.scene, "three-quarter", [96, 96], 0.06), "shaded"));
    else { c.width = 96; c.height = 96; cell.title = b.error ?? b.validation.problems.join("; "); }
    strip.append(cell);
  });
}
function renderAll() { renderEditor(); renderSketch(); renderStrip(); if (state.compare) renderCompare(); }

// --- individuals ---------------------------------------------------------------------------------------
function roll() {
  const n = Math.max(1, Math.min(48, Number($("roll-n").value) || 8));
  const r = rng(`${state.frame.species.id}:roll:${Date.now()}`);
  const start = state.individuals.length;
  for (let i = 0; i < n; i++) state.individuals.push({ genome: sampleIndividual(state.frame, r, { kind: "random" }), label: `#${start + i}` });
  state.current = start;
  log(`${state.frame.species.id}: rolled ${n} individuals`);
  renderAll();
}
function cross() {
  if (state.parents.length !== 2) return;
  const [a, b] = state.parents.map((i) => state.individuals[i]);
  const r = rng(`${state.frame.species.id}:cross:${Date.now()}`);
  const n = Math.max(1, Math.min(48, Number($("roll-n").value) || 8));
  const start = state.individuals.length;
  for (let i = 0; i < n; i++) state.individuals.push({ genome: crossIndividuals(state.frame, a.genome, b.genome, r), label: `${a.label} × ${b.label} #${i + 1}` });
  state.current = start;
  log(`cross ${a.label} × ${b.label}: ${n} children`);
  renderAll();
}

// --- compare expressions -------------------------------------------------------------------------------
function startCompare() {
  const t = state.spec.open.find((x) => x.id === state.selectedTrait) ?? state.spec.open[0];
  if (!t) { log("no open trait to compare", "warn"); return; }
  const n = Math.max(1, Math.min(12, Number($("roll-n").value) || 6));
  const r = rng(`${state.frame.species.id}:compare:${t.id}`);
  const rows = Array.from({ length: n }, () => sampleIndividual(state.frame, r));
  // Looks: for one locus, every pair from its pool; for several, the first, the mixed extremes and the last.
  const pools = t.loci.map((id) => t.pool?.[id] ?? alleleIds(id));
  let looks;
  if (t.loci.length === 1) { looks = []; for (let i = 0; i < pools[0].length; i++) for (let j = i; j < pools[0].length; j++) looks.push({ label: i === j ? pools[0][i] : `${pools[0][i]} / ${pools[0][j]}`, copies: { [t.loci[0]]: [pools[0][i], pools[0][j]] } }); }
  else looks = [["first", (p) => [p[0], p[0]]], ["mixed", (p) => [p[0], p.at(-1)]], ["last", (p) => [p.at(-1), p.at(-1)]]].map(([label, pick]) => ({ label, copies: Object.fromEntries(t.loci.map((id, k) => [id, pick(pools[k])])) }));
  state.compare = { trait: t, rows, looks };
  $("compare-panel").hidden = false;
  renderCompare();
  $("compare-panel").scrollIntoView({ behavior: "smooth" });
}
function renderCompare() {
  const { trait: t, rows, looks } = state.compare;
  $("compare-hint").textContent = `${t.name} (${CHAPTER_NAMES[t.chapter]}): ${looks.length} looks × ${rows.length} individuals, same frame, only this trait changed; 48 px tile at 2× beside the Station view at ⅓`;
  const grid = $("compare-grid");
  grid.style.gridTemplateColumns = `repeat(${looks.length}, max-content)`;
  grid.replaceChildren();
  const verdict = el("div", { class: "verdict", style: `grid-column: 1 / -1` }, "Verdict for this trait: ", ...VERDICTS.map(([v, word]) => el("button", { class: `small${t.verdict?.at48 === v ? " on" : ""}`, onclick: () => setVerdict(t, v) }, word)), el("button", { class: "small", onclick: () => { state.compare = null; $("compare-panel").hidden = true; } }, "Close"));
  grid.append(verdict);
  for (const look of looks) {
    const col = el("div", { class: "col" }, el("div", { class: "look" }, look.label));
    for (const base of rows) {
      const genome = structuredClone(base);
      for (const [id, copies] of Object.entries(look.copies)) genome.loci[id] = copies;
      let b;
      try { b = buildIndividual(state.frame, genome); } catch (e) { col.append(el("div", { class: "warn" }, e.message)); continue; }
      if (b.validation.status !== "valid") { col.append(el("div", { class: "warn" }, b.validation.problems[0])); continue; }
      const tile = el("canvas"), station = el("canvas");
      blit(tile, render(b.scene, state.cameras["three-quarter"].tile, "shaded"), 2);
      const img = render(b.scene, state.cameras["three-quarter"].station, "shaded");
      const third = { width: 100, height: 103, data: new Uint8ClampedArray(100 * 103 * 4) };
      for (let y = 0; y < 103; y++) for (let x = 0; x < 100; x++) for (let k = 0; k < 4; k++) third.data[(y * 100 + x) * 4 + k] = img.data[((3 * y) * 300 + 3 * x) * 4 + k];
      blit(station, third);
      col.append(el("div", { class: "pair" }, tile, station));
    }
    grid.append(col);
  }
}

// --- exports -------------------------------------------------------------------------------------------
function currentFrameJSON() {
  const frame = state.frame;
  return JSON.stringify(frame, null, 1) + "\n";
}
async function exportSketches(individuals, { setName = null } = {}) {
  status("rendering the export…");
  const entries = [];
  const index = { schema: "mb-reference-set/1", species: state.frame.species.id, frameVersion: 1, catalogue: state.frame.catalogue, sketcher: SKETCHER_VERSION, members: [] };
  for (const ind of individuals) {
    const sketch = sketchIndividual(state.frame, ind.genome, { cameras: state.cameras, which: setName && ind.genome.origin?.kind !== "type-specimen" ? ({ size }) => size !== "large" : ({ size }) => size !== "large" });
    if (sketch.status !== "sketched") { log(`${ind.label}: not sketched (${sketch.problems.join("; ")})`, "warn"); continue; }
    const dir = ind.genome.origin?.kind === "type-specimen" ? "type-specimen" : sketch.genomeDigest;
    const hashes = {};
    for (const im of sketch.images) { const bytes = encodePNG(im.image); hashes[im.key] = await sha256(bytes); entries.push({ name: `${state.frame.species.id}/${dir}/${im.key}.png`, bytes }); }
    hashes.sketch = await sha256(new TextEncoder().encode(Object.keys(hashes).sort().map((k) => `${k}:${hashes[k]}`).join("\n")));
    const m = manifest(state.frame, ind.genome, sketch, hashes, { encoder: "browser stored-deflate PNG; pixels identical to the Node export" });
    entries.push({ name: `${state.frame.species.id}/${dir}/manifest.json`, bytes: new TextEncoder().encode(JSON.stringify(m, null, 1) + "\n") });
    entries.push({ name: `${state.frame.species.id}/${dir}/genome.json`, bytes: new TextEncoder().encode(JSON.stringify(ind.genome, null, 1) + "\n") });
    index.members.push({ id: m.id, level: m.level, dir, sketch: hashes.sketch, outputs: m.outputs.length });
  }
  if (setName) entries.push({ name: `${state.frame.species.id}/index.json`, bytes: new TextEncoder().encode(JSON.stringify(index, null, 1) + "\n") });
  entries.push({ name: `${state.frame.species.id}/species-${state.frame.species.id}.json`, bytes: new TextEncoder().encode(currentFrameJSON()) });
  download(`${setName ?? "sketch"}-${state.frame.species.id}.zip`, zip(entries), "application/zip");
  status(`exported ${entries.length} files`);
  log(`exported ${entries.length} files (${setName ?? "sketch set"}); the Node CLI writes the same pixels under out/`);
}

// --- wiring -------------------------------------------------------------------------------------------
$("species").addEventListener("change", (e) => selectSpecies(e.target.value));
$("shared-scale").addEventListener("change", () => { state.cameras = $("shared-scale").checked ? state.registryCameras : speciesCameras(state.frame); renderAll(); });
$("roll").addEventListener("click", roll);
$("cross").addEventListener("click", cross);
$("compare").addEventListener("click", startCompare);
$("check").addEventListener("click", () => { status("checking 200 random individuals…"); setTimeout(() => { const ok = rebuild({ samples: 200 }); status(ok ? `${state.frame.species.id}: ${state.frame.viability.constructed}/200 build` : "check failed, see the log"); renderAll(); }, 10); });
$("export-frame").addEventListener("click", () => { download(`species-${state.frame.species.id}.json`, new TextEncoder().encode(currentFrameJSON()), "application/json"); log(`exported species-${state.frame.species.id}.json`); });
$("export-sketch").addEventListener("click", () => exportSketches([state.individuals[state.current]]));
$("export-set").addEventListener("click", () => exportSketches(state.individuals, { setName: "reference-set" }));
$("new-species").addEventListener("click", () => $("new-dialog").showModal());
$("new-dialog").addEventListener("close", () => {
  if ($("new-dialog").returnValue !== "ok") return;
  const clan = $("new-clan").value, tier = $("new-tier").value, seed = Number($("new-seed").value) || 1, sealed = $("new-sealed").value;
  const id = `${clan.replace("C", "S")}-${tier}-${seed}`;
  const base = SPECIES.find((s) => s.clan === clan);
  const species = { ...base, id, name: id, plural: id, order: 99, tier, seed, sealed: sealed ? { [sealed]: FINDS[sealed] } : {}, open: undefined, fixed: undefined, openSwitches: undefined, alwaysOpen: base.alwaysOpen ?? [], summary: `generated in the workbench: clan ${clan}, ${tier}, seed ${seed}` };
  try {
    const spec = specOf(species);
    const frame = buildFrame(spec, { samples: 0 });
    state.specs[id] = specFromFrame(frame);
    $("species").append(el("option", { value: id }, id));
    log(`${id}: generated by rule from clan ${clan}, tier ${tier}, seed ${seed}: ${frame.counts.open} open loci in ${frame.counts.traits} traits`);
    selectSpecies(id);
  } catch (e) { log(`new species: ${e.message}`, "warn"); }
});
document.addEventListener("keydown", (e) => {
  if (e.target.matches("input, select, textarea") || e.metaKey || e.ctrlKey) return;
  const traits = state.spec?.open ?? [];
  const idx = traits.findIndex((t) => t.id === state.selectedTrait);
  const key = e.key.toLowerCase();
  if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); const next = traits[Math.max(0, Math.min(traits.length - 1, idx + (e.key === "ArrowDown" ? 1 : -1)))]; if (next) { state.selectedTrait = next.id; renderEditor(); document.querySelector(`[data-trait="${next.id}"]`)?.focus(); } }
  else if (key === "l" && idx >= 0) lockTrait(traits[idx]);
  else if (key === "o" && idx >= 0) { state.showLoci[traits[idx].id] = !state.showLoci[traits[idx].id]; renderEditor(); }
  else if (key === "r") roll();
  else if (key === "c") cross();
  else if (key === "x") startCompare();
  else if (["1", "2", "3"].includes(key) && idx >= 0) setVerdict(traits[idx], VERDICTS[Number(key) - 1][0]);
  else if (key === "[" || key === "]") { state.current = (state.current + (key === "]" ? 1 : state.individuals.length - 1)) % state.individuals.length; renderAll(); }
  else if (key === "e") $("export-frame").click();
});
load().catch((e) => { status(`failed to load: ${e.message}`); console.error(e); });
