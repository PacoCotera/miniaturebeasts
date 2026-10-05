const byId = (id) => document.getElementById(id);
const element = (tag, text, className) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
};
let catalogue;
let result;
let pinned;
let evaluating = false;
const selects = new Map();

function status(message, error = false) {
  byId("status").textContent = message;
  byId("status").classList.toggle("error", error);
}

function invalidate() {
  result = undefined;
  byId("pin").disabled = true;
  byId("export").disabled = true;
  byId("output").replaceChildren(element("p", "Inputs changed. Resolve to inspect this candidate."));
  byId("fingerprint").textContent = "";
  status("Draft inputs; previous output cleared.");
  renderComparison();
}

function readInput() {
  const input = structuredClone(catalogue.defaultInput);
  for (const [id, pair] of selects) input.genome.genotypes[id] = pair.map((select) => select.value);
  if (byId("context").value !== "reference") input.context.maturity = "juvenile";
  return input;
}

function loadControls(input) {
  for (const [id, pair] of selects) pair.forEach((select, index) => { select.value = input.genome.genotypes[id][index]; });
  byId("context").value = "reference";
}

function draw(container, svg) {
  // SVG comes only from this server's fixed diagnostic grammar, never imported JSON or model output.
  const parsed = new DOMParser().parseFromString(svg, "image/svg+xml");
  container.replaceChildren(document.importNode(parsed.documentElement, true));
}

function render(current) {
  const output = current.output;
  const creature = element("div", undefined, "creature");
  const drawing = element("div", undefined, "drawing");
  draw(drawing, output.schematic);
  creature.append(drawing);
  const traits = element("div");
  for (const id of ["crown", "eye-rings", "body-markings", "movement", "movement-energy"]) {
    const fact = output.facts.find((item) => item.id === id);
    const row = element("div", undefined, "trait");
    row.append(element("p", fact.value), element("small", fact.sources.join(" + ")));
    traits.append(row);
  }
  creature.append(traits);
  byId("output").replaceChildren(creature);
  for (const relation of output.relationships) {
    const section = element("div", undefined, "relationship");
    section.append(element("h3", relation.title));
    for (const fact of relation.outputs) section.append(element("p", fact.value), element("code", `Contributors & prerequisites: ${fact.dependencyClosure.join(" + ")}`));
    byId("output").append(section);
  }
  const facts = element("details", undefined, "facts");
  facts.append(element("summary", "Fact-derived encyclopedia & full causal traces"));
  const list = element("ul");
  for (const fact of output.encyclopedia.facts) {
    const item = element("li", `${fact.id}: ${fact.value}`);
    item.append(element("code", fact.dependencyClosure.join(" + ")));
    list.append(item);
  }
  facts.append(list);
  byId("output").append(facts);
  byId("layers").replaceChildren(...output.layers.map((layer, index) => {
    const item = element("div", undefined, "layer");
    item.append(element("strong", `${index + 1}. ${layer.name}`), element("p", layer.status));
    return item;
  }));
  const table = element("table");
  const head = element("thead");
  const headings = element("tr");
  for (const name of ["Dimension", "Pinned inherited baseline", "Variable contributors", "Model boundary"]) headings.append(element("th", name));
  head.append(headings);
  const body = element("tbody");
  for (const family of output.coverage) {
    const row = element("tr");
    const name = element("th", family.family.replaceAll("-", " / "));
    name.scope = "row";
    const baseline = [...family.baseline, ...family.fixedLoci].map((item) => `${item.id}: ${item.value}`).join("\n");
    const contributors = [family.variableLoci.length ? `Direct: ${family.variableLoci.join(", ")}` : "No direct variable locus"];
    if (family.indirectLoci.length) contributors.push(`Indirect: ${family.indirectLoci.join(", ")}`);
    row.append(name, element("td", baseline || "Constrained by the shared body plan"), element("td", contributors.join("\n")), element("td", family.boundary));
    body.append(row);
  }
  table.append(head, body);
  byId("families").replaceChildren(table);
  byId("fingerprint").textContent = current.inputDigest.slice(0, 12);
  byId("pin").disabled = false;
  byId("export").disabled = false;
  status(output.sampleSupported ? "Resolved. Matches one reference sample candidate; this tool creates no individual." : "Resolved laboratory draft. Not supported by the reference sample; this tool creates no individual.");
  renderComparison();
}

function renderComparison() {
  const container = byId("comparison");
  container.hidden = !pinned;
  if (!pinned) return;
  container.replaceChildren(element("h3", `Pinned candidate · ${pinned.inputDigest.slice(0, 12)}`));
  const drawing = element("div", undefined, "compare-drawing");
  draw(drawing, pinned.output.schematic);
  container.append(drawing);
  if (!result) { container.append(element("p", "Resolve the current draft to compare.")); return; }
  const changes = result.output.facts.filter((fact) => fact.value !== pinned.output.facts.find((item) => item.id === fact.id)?.value);
  const list = element("ul");
  for (const fact of changes) list.append(element("li", `${fact.id}: ${pinned.output.facts.find((item) => item.id === fact.id)?.value} → ${fact.value}`));
  container.append(changes.length ? list : element("p", "Same expressed attributes. Allele copies can still differ: carried variation need not alter the visible creature."));
}

async function resolveInput(input) {
  if (evaluating) return;
  evaluating = true;
  const controls = [...document.querySelectorAll("button, select, textarea")];
  const previousDisabled = controls.map((control) => control.disabled);
  controls.forEach((control) => { control.disabled = true; });
  try {
    const response = await fetch(new URL("api/evaluate", import.meta.url), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
    const evaluated = await response.json();
    if (!response.ok || evaluated.status !== "resolved") {
      invalidate();
      status(evaluated.errors?.map((issue) => `${issue.path}: ${issue.message}`).join("; ") ?? evaluated.error ?? "Evaluation failed", true);
      return;
    }
    result = evaluated;
    loadControls(result.input);
    render(result);
  } catch {
    invalidate();
    status("Cannot reach the local evaluator. No new result produced.", true);
  } finally {
    controls.forEach((control, index) => { control.disabled = previousDisabled[index]; });
    byId("pin").disabled = !result;
    byId("export").disabled = !result;
    evaluating = false;
  }
}

byId("genome-form").addEventListener("submit", (event) => { event.preventDefault(); resolveInput(readInput()); });
byId("context").addEventListener("change", invalidate);
byId("reset").addEventListener("click", () => resolveInput(catalogue.defaultInput));
byId("pin").addEventListener("click", () => { pinned = structuredClone(result); renderComparison(); });
byId("export").addEventListener("click", () => {
  byId("import-json").value = JSON.stringify(result, null, 2);
  byId("experiment-json").open = true;
  status("Experiment JSON ready below. Copy it to retain, or validate it again to verify replay.");
});
byId("import").addEventListener("click", () => {
  try {
    const text = byId("import-json").value;
    if (new TextEncoder().encode(text).length > 65536) throw new Error("Import exceeds 64 KiB");
    const imported = JSON.parse(text);
    // Imported outputs are untrusted: rerun only the input through the engine.
    resolveInput(imported.input ?? imported);
  } catch (error) {
    invalidate();
    status(`Import rejected: ${error.message}`, true);
  }
});

try {
  const response = await fetch(new URL("api/catalogue", import.meta.url));
  if (!response.ok) throw new Error("Catalogue unavailable");
  catalogue = await response.json();
  for (const locus of catalogue.variableLoci) {
    const row = element("div", undefined, "locus");
    row.append(element("label", locus.output));
    const copies = element("div", undefined, "copies");
    const pair = [0, 1].map((index) => {
      const label = element("label", undefined, "copy");
      label.append(element("span", `Copy ${index + 1}`));
      const select = element("select");
      select.setAttribute("aria-label", `${locus.id} copy ${index + 1}`);
      for (const allele of locus.alleles) { const option = element("option", allele); option.value = allele; select.append(option); }
      select.addEventListener("change", invalidate);
      label.append(select);
      copies.append(label);
      return select;
    });
    selects.set(locus.id, pair);
    row.append(copies);
    byId("loci").append(row);
  }
  await resolveInput(catalogue.defaultInput);
} catch {
  status("Start the local workbench server to load the genome catalogue.", true);
}
