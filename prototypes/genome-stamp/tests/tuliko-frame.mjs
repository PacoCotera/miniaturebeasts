// A test frame for the Tuliko (S20) as the genome-string proposal's table A.3 lays it out: the 54 records of catalogue pin 11 in ring order (Coat, Face, Shape, Legs & tail,
// Movement), built from the catalogue as tools/extract-frames.mjs reads a frame (the alleles a frame of version 7 sees; a continuous record also carries its values). It is
// not in the registry: S20 joins it with ticket G3, once the workbench writes the frame. Used by string.test.mjs to reproduce the proposal's worked examples (B.4).
import { LOCI } from "../../workbench/framework/catalogue.mjs";

export const CHAPTERS = [
  ["Coat", ["appearance.body-hue", "appearance.body-hue-shift", "appearance.body-value", "appearance.countershade", "appearance.surface-grain", "appearance.sheen", "appearance.fleck", "appearance.cream-extent",
    "appearance.marking-switch", "appearance.marking-layout", "appearance.pattern-kind", "appearance.pattern-scale", "appearance.pattern-contrast", "appearance.pattern-rosette", "appearance.band-count",
    "appearance.emblem", "appearance.emblem-place", "appearance.emblem-size", "appearance.freckle-density", "appearance.freckle-glow", "appearance.emission-brightness", "appearance.emission-hue",
    "appearance.lantern-bleed", "appearance.glow-pattern"]],
  ["Face", ["form.eye-size", "form.eye-height", "form.eye-spacing", "form.mouth-width", "form.mouth-height", "appearance.mouth-rest", "appearance.blush", "anatomy.fang-presence", "form.whisker-count",
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
