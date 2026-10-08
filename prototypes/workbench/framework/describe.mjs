// A genome in the player's own words: the looks per chapter as the frame names them ("pale
// patches", "wide pale rings", "leaf crest") and the proportions in plain words from the rig's
// ratios ("a short muzzle, a long tail"), never a locus id. The Grow painting service puts this
// text in every call as its own logged field (grow/service.py); the field guide can say the same.
import { LOCI, resolveCopies } from "./catalogue.mjs";
import { brief } from "./species.mjs";

// The trait's look for a genome, aligned with the frame's trait looks as catalogue.looksFor orders
// them (one label per distinct pair of the pool, or per distinct resolved value when the trait names
// fewer looks than pairs, as a switch does).
export function lookOf(frame, trait, genome) {
  const id = trait.loci[0], locus = LOCI.get(id);
  if (!locus) return null;
  const pool = frame.pools?.[id] ?? locus.alleles.map((a) => a.id);
  const copies = genome.loci[id];
  if (!copies) return null;
  const labelOf = ([a, b]) => {
    const v = resolveCopies(locus, [a, b]);
    if (locus.operator === "copy-mean") return a === b ? a : `between ${a} and ${b}`;
    if (locus.operator === "partition-map") return a === b ? a : `${a} and ${b}`;
    if (locus.operator === "pair-map") return typeof v === "boolean" ? (v ? "on" : "off") : String(v);
    return a === b ? a : [a, b].sort().join("/");
  };
  const labels = [], values = [];
  for (let i = 0; i < pool.length; i++) for (let j = i; j < pool.length; j++) {
    const l = labelOf([pool[i], pool[j]]); if (!labels.includes(l)) labels.push(l);
    const v = JSON.stringify(resolveCopies(locus, [pool[i], pool[j]])); if (!values.includes(v)) values.push(v);
  }
  const sorted = [...copies].sort((a, b) => pool.indexOf(a) - pool.indexOf(b));
  const label = labelOf(sorted), value = JSON.stringify(resolveCopies(locus, copies));
  if (trait.looks?.length === labels.length && labels.includes(label)) return trait.looks[labels.indexOf(label)];
  if (trait.looks?.length === values.length && values.includes(value)) return trait.looks[values.indexOf(value)];
  return label;
}

// Proportions in plain words: the rig's ratio loci whose two copies agree on an end of their range.
const PROPORTION_WORDS = {
  "growth.core-half-length": { small: "a small body", large: "a large body" },
  "growth.head-length-ratio": { tiny: "a tiny head", small: "a small head", large: "a big head" },
  "growth.head-lift-ratio": { high: "the head carried high", low: "the head carried low" },
  "growth.muzzle-projection-ratio": { short: "a short muzzle", long: "a long muzzle" },
  "growth.beak-length-ratio": { short: "a short beak", long: "a long beak" },
  "growth.exterior-eye-size-ratio": { small: "small eyes", large: "big eyes" },
  "growth.auricular-length-ratio": { short: "short ears", long: "long ears", tall: "tall ears" },
  "growth.antenna-length-ratio": { short: "short antennae", long: "long antennae" },
  "growth.crown-height-ratio": { low: "a low crest", high: "a tall crest" },
  "growth.feather-crest": { low: "a low feather crest", tall: "a tall feather crest" },
  "growth.support-drop-ratio": { short: "short legs", long: "long legs" },
  "growth.support-radius-ratio": { fine: "fine legs", slender: "slender legs", stout: "stout legs" },
  "growth.terminal-length-ratio": { broad: "broad feet", narrow: "narrow feet" },
  "growth.join-throat-ratio": { thin: "a thin waist", broad: "a thick waist", thick: "a thick waist" },
  "growth.region-bend": { up: "an arched back", down: "a dipping back" },
  "growth.axial-tail-length-ratio": { short: "a short tail", long: "a long tail" },
  "growth.axial-tail-bend": { up: "the tail curled up", down: "the tail hanging" },
  "growth.wing-span-ratio": { short: "short flaps", long: "wide flaps" },
  "growth.shell-dome-ratio": { low: "a low shell", high: "a high-domed shell" },
};
export function proportionWords(genome) {
  const words = [];
  for (const [id, table] of Object.entries(PROPORTION_WORDS)) {
    const c = genome.loci[id]; if (!c || c[0] !== c[1]) continue;
    if (table[c[0]]) words.push(table[c[0]]);
  }
  const w = genome.loci["growth.core-width-ratio"], d = genome.loci["growth.core-depth-ratio"];
  if (w && d && w[0] === w[1] && d[0] === d[1] && w[0] === d[0]) words.push(w[0] === "high" ? "a stout build" : w[0] === "low" ? "a slim build" : null);
  return words.filter(Boolean);
}

const LOOK_CHAPTERS = ["coat", "face", "shape", "legs-tail"];
// { chapters: [{ id, name, looks: [{ trait, name, look }] }], proportions, caption, text }
export function describeGenome(frame, genome, scene, { typeSpecimen = false } = {}) {
  const chapters = [];
  for (const ch of frame.chapters ?? []) {
    if (!LOOK_CHAPTERS.includes(ch.id)) continue;
    const looks = ch.traits.map((t) => ({ trait: t.id, name: t.name, look: lookOf(frame, t, genome) })).filter((l) => l.look);
    if (looks.length) chapters.push({ id: ch.id, name: ch.name, looks });
  }
  const proportions = proportionWords(genome);
  const name = frame.species.name;
  const caption = brief(scene, frame).replace(new RegExp(`^${name}: `), "");
  let text = `A juvenile ${name}: ${caption}`;
  if (typeSpecimen) text += ` It is the type of its kind, ${frame.taxonomy.resembles}: ${frame.signature.feature}.`;
  for (const ch of chapters) text += ` ${ch.name}: ${ch.looks.map((l) => `${l.name.toLowerCase()} ${l.look.startsWith("between ") ? "between" : l.look}`).join("; ")}.`;
  if (proportions.length) text += ` Proportions: ${proportions.join(", ")}.`;
  return { chapters, proportions, caption, text };
}
