// The developer panel (station-build.md §2.5): under the device, opened by ?dev or the page button, never
// a device key. Timers, economy, limits, seeds, skip-to and inspect. Its settings live under their own
// key (never in the shared save); its seeds go through the same rules as play.
import { G, UI, save, saveSettings, loadSettings, resetSave, podById, goScreen } from "./game.mjs";
import * as S from "./state.mjs";
import { frameOf, frameIds } from "./genome.mjs";
import { PLACEHOLDERS } from "./art.mjs";
import { status as caddyStatus, state as caddy, flush as caddyFlush } from "./caddy.mjs";
import { binFor, LOCI } from "../../workbench/framework/catalogue.mjs";

const h = (tag, attrs = {}, ...kids) => { const el = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === "class") el.className = v; else if (k.startsWith("on")) el.addEventListener(k.slice(2), v); else if (k === "html") el.innerHTML = v; else el.setAttribute(k, v); } for (const kid of kids) el.append(kid); return el; };
const opt = (v, label, sel) => h("option", { value: v, ...(sel ? { selected: "" } : {}) }, label ?? v);
let root = null, out = null;
export function devOpen() { return !!root && !root.hidden; }
function note(t) { if (out) out.textContent = t; }
function select(key, options, fmt = (v) => String(v)) {
  const s = h("select", { onchange: () => { const v = options.find((o) => String(o) === s.value); const patch = { [key]: v }; if (key === "instantGrowPreset") patch.instantGrow = { "1e2s": { e: 1, d: 0, s: 2 }, free: { e: 0, d: 0, s: 0 }, "2e4s": { e: 2, d: 0, s: 4 } }[v]; saveSettings(patch); redraw(); } });
  for (const o of options) s.append(opt(String(o), fmt(o), String(G.settings[key]) === String(o)));
  return s;
}
function toggle(key, label) { const c = h("input", { type: "checkbox", onchange: () => { saveSettings({ [key]: c.checked }); redraw(); } }); c.checked = !!G.settings[key]; return h("label", { class: "dev-row" }, c, " " + label); }
let redraw = () => {};
export function buildDevPanel(container, hooks) {
  loadSettings(); root = container; root.innerHTML = "";
  const groups = [];
  const group = (title, ...kids) => { const d = h("details", { class: "dev-group", open: "" }, h("summary", {}, title), ...kids); groups.push(d); return d; };
  // Timers
  group("Timers", h("div", { class: "dev-row" }, "Bud scale ", select("budScale", [1, 10, 60, "instant"], (v) => (v === 1 ? "real" : v === "instant" ? "instant" : "×" + v))), toggle("firstBud", "the first bud ever grows in five minutes"),
    h("div", { class: "dev-row" }, "Sitting wait ", select("sittingWait", ["hours", "minute", "now"])), h("div", { class: "dev-row" }, "Juvenile to adult ", select("adultTurns", [2, 1, 0], (v) => (v === 0 ? "now" : v + " world turns"))),
    h("div", { class: "dev-row" }, "Mock painter delay ", select("mockDelay", [20, 5, 60], (v) => v + " s")), h("p", { class: "dev-note" }, "The timers apply from M2 (the bud) and M3 (the painting); stored now so a tester's toggles are ready."));
  // Economy
  const mats = h("div", { class: "dev-row" }, h("button", { class: "btn", type: "button", onclick: () => { S.addMaterials(G.st, 5, 5, 5); save(); note("+5 of each material"); } }, "+5 of each"),
    h("button", { class: "btn", type: "button", onclick: () => { S.addMaterials(G.st, 0, 10, 0); save(); note("+10 Data"); } }, "+10 Data"),
    h("button", { class: "btn", type: "button", onclick: () => { S.addMaterials(G.st, 10, 0, 10); save(); note("+10 Energy +10 Essence"); } }, "+10 ⚡ +10 ❀"));
  group("Economy", h("div", { class: "dev-row" }, "Prices ", select("economy", ["loose", "decided", "free"], (v) => ({ loose: "loose (decided + a top-up per crate, the default)", decided: "decided prices", free: "free" })[v])),
    h("div", { class: "dev-row" }, "Instant grow ", select("instantGrowPreset", ["1e2s", "free", "2e4s"], (v) => ({ "1e2s": "1 ⚡ 2 ❀ (placeholder price)", free: "free", "2e4s": "2 ⚡ 4 ❀" })[v])),
    h("p", { class: "dev-note" }, "Decided: Identify 1 ⚡ (first free) · a chapter 1 ◆ a trait, half rounded up once read on an earlier pod of the species, the first read ever free · return a pod +1 ❀. Loose adds +2 ⚡ +3 ◆ +2 ❀ to every crate opened."), mats);
  // Limits
  group("Limits", h("div", { class: "dev-row" }, "Bays ", select("bays", [6, 8, 10])), h("div", { class: "dev-row" }, "Rack ", select("rack", [6, 4, 8])),
    h("div", { class: "dev-row" }, "Daily grow cap ", select("growCap", [10, 2, 20])), h("div", { class: "dev-row" }, "Painter ", select("painter", ["mock", "real", "off"])), toggle("sealedOpen", "sealed chapters open (the find is in hand)"));
  // Seeds
  const spSel = h("select", {}); for (const id of frameIds()) spSel.append(opt(id, id + " " + frameOf(id).species.name, id === "S01"));
  const cnt = h("input", { type: "number", min: "1", max: "6", value: "1" }), seed = h("input", { type: "number", min: "1", value: String(Math.floor(Math.random() * 9000) + 1) });
  const genomeBox = h("textarea", { rows: "4", placeholder: "paste a genome (mb-genome/2 JSON) …" });
  group("Seeds", h("div", { class: "dev-row" }, "A crate of pods: ", spSel, " × ", cnt, " seed ", seed,
      h("button", { class: "btn", type: "button", onclick: () => { const r = S.seedCrate(G.st, spSel.value, +cnt.value, +seed.value, Date.now()); save(); note(r.ok ? "Crate " + r.crate.n + " waits in the bay · dock (D) and open it at Home" : r.msg); seed.value = String(+seed.value + 1); } }, "Seed the crate")),
    h("div", { class: "dev-row" }, genomeBox, h("button", { class: "btn", type: "button", onclick: () => { let g2; try { g2 = JSON.parse(genomeBox.value); } catch { note("not JSON"); return; } const r = S.seedPodFromGenome(G.st, g2, G.settings, Date.now()); save(); note(r.ok ? "A pod from the genome is in the rack" : r.msg); } }, "A pod from this genome")),
    h("div", { class: "dev-row" }, h("button", { class: "btn", type: "button", onclick: () => { const r = S.seedAdults(G.st, spSel.value, +seed.value, 2, G.settings); save(); note(r.msg); seed.value = String(+seed.value + 1); } }, "Two unrelated adults"), h("span", { class: "dev-note" }, " of the species above, in free bays (siblings and a held sitting come with M4 and M6)")));
  // Skip to
  const focused = () => podById(UI.pods.cur) || G.st.tray[0] || null;
  group("Skip to", h("div", { class: "dev-row" },
    h("button", { class: "btn", type: "button", onclick: () => { const p = focused(); if (!p) { note("no pod in the rack"); return; } S.skipIdentify(G.st, p); save(); note(p.id + " identified"); } }, "Identified"),
    h("button", { class: "btn", type: "button", onclick: () => { const p = focused(); if (!p) { note("no pod in the rack"); return; } S.skipRead(G.st, p, G.settings); save(); note(p.id + " read whole"); } }, "Read whole"),
    h("button", { class: "btn", type: "button", onclick: () => { for (const p of G.st.tray) S.skipRead(G.st, p, G.settings); save(); note("every pod read whole"); } }, "Every pod read"),
    h("button", { class: "btn", type: "button", onclick: () => { if (!G.st.bud) { note("no bud growing"); return; } S.skipBud(G.st, G.settings, "mid"); save(); note("the bud is half grown"); } }, "Mid-bud"),
    h("button", { class: "btn", type: "button", onclick: () => { if (!G.st.bud) { note("no bud growing"); return; } S.skipBud(G.st, G.settings, "ready"); save(); note("the bud is ready to open"); } }, "Ready to open")),
    h("p", { class: "dev-note" }, "The pod under the beam on Pods is the one skipped. Shaped, mid-bud, ready, adults, a full guide and a sitting's crate come with their milestones."));
  // Inspect
  out = h("pre", { class: "dev-out" });
  const show = (t) => { out.textContent = t; };
  group("Inspect",
    h("div", { class: "dev-row" },
      h("button", { class: "btn", type: "button", onclick: () => { const p = focused(); if (!p || !p.genome) { show("no pod under the beam"); return; } const fr = frameOf(S.speciesOf(p)); show(inspectText(fr, p)); } }, "Both copies of every locus (this pod)"),
      h("button", { class: "btn", type: "button", onclick: () => show(genomesText()) }, "The Station's record"),
      h("button", { class: "btn", type: "button", onclick: () => show(PLACEHOLDERS.map((p) => "• " + p.id + ": " + p.what + "\n    until " + p.until).join("\n")) }, "The placeholder register"),
      h("button", { class: "btn", type: "button", onclick: async () => { await caddyStatus(); await caddyFlush(); show((caddy.online ? "The Caddy service answers:\n" + JSON.stringify(caddy.lastStatus, null, 1) : "The Caddy service is offline · " + (caddy.error || "")) + "\noutbox " + G.st.outbox.length + " · landed " + caddy.landed.size + " · pending " + caddy.pending.size + "\n" + G.st.mibis.map((m) => "  " + m.name + " " + m.sha.slice(0, 8) + " " + (m.paint ? m.paint.state : "not sent")).join("\n")); } }, "Caddy status")),
    h("div", { class: "dev-row" },
      h("button", { class: "btn", type: "button", onclick: () => { const blob = new Blob([JSON.stringify(G.sv, null, 1)], { type: "application/json" }); const a = h("a", { href: URL.createObjectURL(blob), download: "mb-save-v8.json" }); a.click(); } }, "Export the save"),
      h("button", { class: "btn", type: "button", onclick: () => { const f = h("input", { type: "file", accept: "application/json" }); f.onchange = async () => { try { const o = JSON.parse(await f.files[0].text()); const st = o.st || o; if (!st || st.wid !== G.st.wid) { show("that Station part belongs to another world (" + (st && st.wid) + " vs " + G.st.wid + ") · only this world's st is imported; the Companion's part is never written"); return; } G.st = S.normalize(S.migrate(st)); G.sv.st = G.st; save(); show("Station part imported"); } catch (e) { show("import failed: " + e.message); } }; f.click(); } }, "Import a Station part"),
      h("button", { class: "btn btn-danger", type: "button", onclick: () => { if (confirm("Erase the shared save (both pages)?")) { resetSave(); location.reload(); } } }, "Reset game")),
    out);
  root.append(...groups);
  redraw = () => { for (const g2 of groups) for (const s of g2.querySelectorAll("select")) { /* values follow settings */ } hooks?.changed?.(); };
  return root;
}
function inspectText(fr, p) {
  const L = ["# " + fr.species.name + " · " + p.id + " · read " + (p.read.join(", ") || "nothing") + " · stamp " + S.stampCodeOf(p)];
  for (const row of S.inspectGenome(fr, p.genome)) { const locus = LOCI.get(row.id), c = row.copies || [];
    const val = c.map((x) => (typeof x === "number" ? x + " (" + binFor(locus, x) + ")" : x)).join(" / ");
    L.push((row.kind === "locked" ? "  locked   " : "  " + (row.chapter || "-").padEnd(9) + " ") + row.id.padEnd(44) + val + (row.trait ? "   ← " + row.trait : "")); }
  return L.join("\n");
}
export function genomesText() {
  const st = G.st, L = [];
  L.push("Station T" + (st.turn + 1) + " · " + st.e + " Energy, " + st.d + " Data, " + st.s + " Essence · " + (st.dock.docked ? "docked" : "lifted") + " · accepted " + st.accepted.length + " · schema " + st.schema + " · economy " + G.settings.economy);
  L.push("known " + st.knownIds.join(", ") + " · met " + st.metIds.join(", ") + " · readOnce " + JSON.stringify(st.readOnce));
  L.push(""); L.push("Rack:"); for (const p of st.tray) L.push("  " + p.id + " " + S.spName(p) + (p.idd ? "" : " (unidentified)") + " · read " + (p.read.join(", ") || "-") + " · " + (p.genome ? S.stampCodeOf(p) : "no genome"));
  if (st.waiting.length) L.push("  sealed, waiting for a well: " + st.waiting.length);
  L.push(""); L.push("Mibis:"); for (const m of st.mibis) L.push("  " + m.id + " " + m.name + " · " + S.spName(m) + " · " + S.mibiStage(st, m) + " · " + m.code + " · bay " + m.bay + (m.bonded ? " · bonded" : ""));
  L.push(""); L.push("Guide:"); for (const [sp, g2] of Object.entries(st.guide)) L.push("  " + sp + ": " + Object.entries(g2).map(([t, ls]) => t + " " + ls.join("/")).join(" · "));
  L.push(""); L.push("Recent:"); for (const s of st.log.slice(-12)) L.push("  " + s);
  return L.join("\n");
}
