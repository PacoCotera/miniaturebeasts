// A test frame for the Tuliko (S20) as the genome-string proposal's table A.3 lays it out, with the game designer's rulings of 3 Nov 2026 (the hue shift dropped, the whisker switch added,
// the rosette renamed marking-rosette): the 54 records of catalogue pin 11 in ring order (Coat, Face, Shape, Legs & tail,
// Movement), built from the catalogue as tools/extract-frames.mjs reads a frame (the alleles a frame of version 7 sees; a continuous record also carries its values). It is
// not in the registry: S20 joins it with ticket G3, once the workbench writes the frame. Used by string.test.mjs to reproduce the proposal's worked examples (B.4).
import { LOCI } from "../../workbench/framework/catalogue.mjs";
import { stepValue } from "../src/codec.mjs";

export const CHAPTERS = [
  ["Coat", ["appearance.body-hue", "appearance.body-value", "appearance.countershade", "appearance.surface-grain", "appearance.sheen", "appearance.fleck", "appearance.cream-extent",
    "appearance.marking-switch", "appearance.marking-layout", "appearance.pattern-kind", "appearance.pattern-scale", "appearance.pattern-contrast", "appearance.marking-rosette", "appearance.band-count",
    "appearance.emblem", "appearance.emblem-place", "appearance.emblem-size", "appearance.freckle-density", "appearance.freckle-glow", "appearance.emission-brightness", "appearance.emission-hue",
    "appearance.lantern-bleed", "appearance.glow-pattern"]],
  ["Face", ["form.eye-size", "form.eye-height", "form.eye-spacing", "form.mouth-width", "form.mouth-height", "appearance.mouth-rest", "appearance.blush", "anatomy.fang-presence", "anatomy.whisker-presence", "form.whisker-count",
    "form.whisker-length", "form.whisker-droop", "form.whisker-curl", "appearance.whisker-glow", "anatomy.brow-tuft-presence", "form.ear-kind", "form.ear-length", "form.ear-width", "form.ear-splay", "form.ear-droop"]],
  ["Shape", ["form.head", "form.torso-girth"]],
  ["Legs & tail", ["form.leg-length", "form.leg-girth", "form.tail-length", "form.tail-girth", "form.tail-curl", "form.tail-carry", "anatomy.tail-tip-form", "form.tail-tip-size"]],
  ["Movement", ["movement.cycle-rate"]],
];
const VERSION = 7;   // the catalogue's frame version that sees the pin 11 records

export function tulikoFrame({ species = 20, version = 1 } = {}) {
  const chapters = CHAPTERS.map(([name, ids]) => ({
    name, sealed: false,
    loci: ids.map((id) => {
      const cat = LOCI.get(id), known = cat.alleles.filter((a) => !(a.sinceFrame > VERSION));
      const numeric = cat.operator === "copy-mean" && known.every((a) => typeof a.value === "number");
      const alleles = known.map((a) => a.id);
      return { id, trait: id, alleles, ...(numeric ? { values: known.map((a) => a.value) } : {}), pool: alleles, copies: 2 };
    }),
  }));
  chapters.forEach((ch, ci) => ch.loci.forEach((l) => { l.chapter = ci; l.bits = Math.max(1, l.alleles.length <= 1 ? 0 : Math.ceil(Math.log2(l.alleles.length))); }));
  const heritable = chapters.flatMap((c) => c.loci);
  return { species, version, id: "S20", name: "Tuliko", glyph: [".....", ".....", ".....", ".....", "....."], chapters, heritable, locked: [], borderSeed: 0, payloadBits: heritable.reduce((s, l) => s + l.bits * l.copies, 0) };
}

// The Tuliko's type, as table A.3 and B.4 describe it: every shape and face blend at `between` (t 0.5); the coat blends at the type's t moved onto the step (the hue 270 of 0..360 is
// t 0.75, step 44; the sheen 0.3 is step 18 of 0..1; the glow 0.92 of 0.4..1 is step 51; the freckle glow 0.9 of 0.5..1 is t 0.8, step 47); a t that is a bin exactly (0, 0.5, 1) is that
// bin (a rosette of 0 is `low`, 5 bands of 3..7 is `between`); prick ears, a lantern tip, blush on, no marks (the switch off, so no layout shows: bands), no pattern, no emblem, cycle low/high.
export function tulikoType(f) {
  const c = {};
  for (const l of f.heritable) c[l.id] = l.values ? ["between", "between"] : [l.alleles[0], l.alleles[0]];
  Object.assign(c, {
    "appearance.body-hue": [stepValue(f.heritable.find((l) => l.id === "appearance.body-hue"), 44), stepValue(f.heritable.find((l) => l.id === "appearance.body-hue"), 44)],
    "appearance.sheen": [stepValue(f.heritable.find((l) => l.id === "appearance.sheen"), 18), stepValue(f.heritable.find((l) => l.id === "appearance.sheen"), 18)],
    "appearance.emission-brightness": [stepValue(f.heritable.find((l) => l.id === "appearance.emission-brightness"), 51), stepValue(f.heritable.find((l) => l.id === "appearance.emission-brightness"), 51)],
    "appearance.freckle-glow": [stepValue(f.heritable.find((l) => l.id === "appearance.freckle-glow"), 47), stepValue(f.heritable.find((l) => l.id === "appearance.freckle-glow"), 47)],
    "appearance.marking-rosette": ["low", "low"], "anatomy.whisker-presence": ["off", "off"],
    "appearance.marking-switch": ["off", "off"], "appearance.marking-layout": ["bands", "bands"], "appearance.pattern-kind": ["none", "none"], "appearance.emblem": ["none", "none"],
    "appearance.emblem-place": ["forehead", "forehead"], "appearance.glow-pattern": ["none", "none"], "appearance.mouth-rest": ["content", "content"], "appearance.blush": ["on", "on"],
    "anatomy.fang-presence": ["off", "off"], "appearance.whisker-glow": ["off", "off"], "anatomy.brow-tuft-presence": ["off", "off"], "form.ear-kind": ["prick", "prick"],
    "anatomy.tail-tip-form": ["lantern", "lantern"], "movement.cycle-rate": ["low", "high"],
  });
  return { copies: c };
}
