// The goal's words (station-x10-economy.md ruling 4; frame.json strings.goal): goalKey's facts as a line of words for Home's notice zone and the Cargo report's last row. Props name what, never where: `text` is the filled
// words with no icons, `icons` the materials a short step lacks (space-separated), `plain` the nameless sibling of a key with {name} ("" where it has none): the face measures text and icons against its room and draws `plain` when they pass it.
import * as S from "../state.mjs";
import { frameOf } from "../genome.mjs";

const fill = (t, o) => t.replace(/\{(\w+)\}/g, (_, k) => (k in o ? o[k] : "{" + k + "}"));
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
  if (st.key === "read" && goal.key === "guide") { const fr = frameOf(st.species), ch = fr && fr.chapters.find((c) => c.id === st.chapter); return out(fill(G.step.readPod, { chapter: ch ? ch.name : st.chapter, species: speciesWord(st.species) })); }
  if (st.key === "read") return out(fill(G.step.read, vals), G.step.readNoName);
  if (st.key === "findPod" && !vals.species) return out(G.step.goOut);
  if (st.key === "identify" && !(st.species ?? goal.species)) return out(G.step.identifyAny);   // no species known yet: "identify a pod"
  const t = G.step[st.key]; if (typeof t !== "string") return null;
  return out(fill(t, { ...vals, species: speciesWord(st.species ?? goal.species), a: article(speciesWord(st.species ?? goal.species)) }));
}
// The pre-spend warning's words (frame.json strings.goalWarn): goalSpendWarn's { step, species | name, icons } for the notice zone; null when the spend warns of nothing.
export function warnWords(st, sv, settings, frame, price, act) {
  const w = S.goalSpendWarn(st, sv, settings, price, act); if (!w) return null;
  return fill(frame.strings.goalWarn[w.step], { species: speciesWord(w.species), name: w.name, icons: w.icons });
}
// The read the report suggests while the step is a wait: { text, price }, from goalKey's meanwhile ({ pod, chapter, glint, cost }) and cargo.json strings.report.goal.
export function meanwhileWords(meanwhile, cargoSpec) {
  if (!meanwhile) return null;
  const T = cargoSpec.strings.report.goal, fr = frameOf(S.speciesOf(meanwhile.pod)), ch = fr.chapters.find((c) => c.id === meanwhile.chapter);
  return { text: fill(meanwhile.glint ? T.meanwhileGlint : T.meanwhile, { chapter: ch ? ch.name : meanwhile.chapter, species: fr.species.name }), price: String(meanwhile.cost) };
}
