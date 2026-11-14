// The goal's words (station-x10-economy.md ruling 4; frame.json strings.goal): goalKey's facts as a line of words for Home's notice zone and the Cargo report's last row. Props name what, never where: `text` is the filled
// words with no icons, `icons` the materials a short step lacks (space-separated), `plain` the nameless sibling of a key with {name} ("" where it has none): the face measures text and icons against its room and draws `plain` when they pass it.
import * as S from "../state.mjs";
import { frameOf } from "../genome.mjs";
import { fill } from "./words.mjs";

const speciesWord = (id) => (id && frameOf(id)?.species.name) || "";
const article = (w) => S.aAn(w).split(" ")[0];
// goal: goalKey's result (not null); docked: whether the Companion is docked; frame: frame.json.
export function goalWords(goal, docked, frame) {
  const G = frame.strings.goal, st = goal.step, name = goal.names ? goal.names[0] : goal.name ?? st.name, vals = { name, species: speciesWord(goal.species ?? st.species), a: article(speciesWord(goal.species ?? st.species)) };
  const out = (text, plain = "", icons = "") => ({ text, icons, plain });
  // away, a goOut step reads the aim: what the Companion is out for
  if (!docked && st.key === "goOut" && G.aim[goal.key]) {
    const nameless = { growUp: G.aim.growUpNoName, readChild: G.aim.readChildNoName }[goal.key];
    return out(fill(G.aim[goal.key], vals), nameless ? fill(nameless, vals) : "");
  }
  if (st.key === "goOut" && goal.key === "growUp") {
    if (goal.bondedWaits) return out(fill(G.step.growUp.care, vals), G.step.growUp.careNoName);
    return out(goal.walks <= 1 ? G.step.growUp.one : G.step.growUp.more);
  }
  if (st.key === "short") return out(fill(G.step.short[st.from] ?? G.step.short.field, { icons: "" }).trim(), "", st.icons);
  if (st.key === "put") return out(fill(G.step.put, { species: speciesWord(st.species) }));   // the guide's step: Data into that kind's pod
  if (st.key === "read") return out(fill(G.step.read, vals), G.step.readNoName);
  if (st.key === "findPod" && !vals.species) return out(G.step.goOut);
  if (st.key === "identify" && !(st.species ?? goal.species)) return out(G.step.identifyAny);   // no species known yet: "identify a pod"
  if (st.key === "bud") return budWords(st, G.step.bud);
  const t = G.step[st.key]; if (typeof t !== "string") return null;
  return out(fill(t, { ...vals, species: speciesWord(st.species ?? goal.species), a: article(speciesWord(st.species ?? goal.species)) }));
}
// The growing pod's line (note 9): the kind (or the two parents of a cross), what is happening and when it ends. `plain` is the nameless sibling.
function budWords(st, B) {
  const state = st.ready ? "ready" : st.minutes < 1 ? "soon" : "growing", cap = (w) => (w ? w[0].toUpperCase() + w.slice(1) : w);
  const cross = st.cross && st.parents?.length === 2 && st.parents[0] && st.parents[1];
  const plain = fill(B[{ growing: "plain", soon: "plainSoon", ready: "plainReady" }[state]], { n: st.minutes });
  if (cross) { const key = { growing: "cross", soon: "crossSoon", ready: "crossReady" }[state]; return { text: fill(B[key], { name: cap(st.parents[0]), name2: cap(st.parents[1]), n: st.minutes }), icons: "", plain }; }
  const sp = speciesWord(st.species);
  if (!sp) return { text: plain, icons: "", plain: "" };
  return { text: fill(B[state], { species: cap(sp), n: st.minutes }), icons: "", plain };
}
// The Companion's line (note 10): only the steps the Companion acts on, away; every Station step gives null, and the Companion then shows no line and no band.
// goal: goalKey's result; frame: frame.json. Returns { text, icons } or null.
export function companionWords(goal, frame) {
  if (!goal) return null;
  const G = frame.strings.goal, st = goal.step, name = goal.names ? goal.names[0] : goal.name ?? st.name, vals = { name, species: speciesWord(goal.species ?? st.species), a: article(speciesWord(goal.species ?? st.species)) };
  if (st.key === "goOut") {
    if (G.aim[goal.key]) {
      const nameless = { growUp: G.aim.growUpNoName, readChild: G.aim.readChildNoName, pair: G.aim.pairNoName }[goal.key];
      return { text: fill(!name && nameless ? nameless : G.aim[goal.key], vals), icons: "" };
    }
    if (goal.key === "growUp") { if (goal.bondedWaits) return { text: fill(G.step.growUp.care, vals), icons: "" }; return { text: goal.walks <= 1 ? G.step.growUp.one : G.step.growUp.more, icons: "" }; }
    return null;
  }
  if (st.key === "findPod") { const sp = speciesWord(st.species ?? goal.species); return { text: sp ? fill(G.step.findPod, { ...vals, species: sp, a: article(sp) }) : G.step.goOut, icons: "" }; }
  if (st.key === "short" && ["field", "fieldOrPod", "fieldAndBench"].includes(st.from)) {   // the Companion has no material icons at hand: the supplies by their player names
    const names = (st.icons || "").split(" ").map((i) => ({ "⚡": "Energy", "◆": "Data", "❀": "Essence" })[i]).filter(Boolean);
    return { text: fill(G.companion.shortWords, { words: names.length > 1 ? names.slice(0, -1).join(", ") + " and " + names.at(-1) : names[0] ?? "" }).trim(), icons: "" };
  }
  return null;
}
// The pre-spend warning's words (frame.json strings.goalWarn): goalSpendWarn's { step, species | name, icons } for the notice zone; null when the spend warns of nothing.
export function warnWords(st, sv, settings, frame, price, act) {
  const w = S.goalSpendWarn(st, sv, settings, price, act); if (!w) return null;
  if ((w.step === "identify" || w.step === "grow") && !w.species) return null;   // GB1 C3: the species warnings name a known species only; with none, no warning and the right slot stays empty
  return fill(frame.strings.goalWarn[w.step], { species: speciesWord(w.species), name: w.name, name2: w.name2, left: w.left, need: w.need, icons: w.icons });
}
// The read the report suggests while the step is a wait: { chapter, glint, price }, from goalKey's meanwhile ({ pod, chapter, glint, cost }); the card draws the chapter's emblem and the price, never a sentence.
export function meanwhileOf(meanwhile) {
  if (!meanwhile) return null;
  return { chapter: meanwhile.chapter, glint: !!meanwhile.glint, price: String(meanwhile.cost) };
}
