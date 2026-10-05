import { GRAPH_COVERING_CATALOGUE } from "./graph-covering-catalogue.mjs";

export const PIGMENT_LOCUS_IDS = Object.freeze({
  body: "appearance.body-palette",
  secondary: "appearance.underside-palette",
});

// Declared order determines low/high local-u fields; inherited copy order does not.
export const BODY_PIGMENTS = Object.freeze(
  [
    ["charcoal", "#465459"],
    ["russet", "#ae674d"],
    ["jade", "#38a878"],
    ["lagoon", "#269fa5"],
    ["cobalt", "#4d7ed4"],
    ["periwinkle", "#8b7dd8"],
    ["plum", "#a967b8"],
    ["raspberry", "#d95688"],
    ["coral", "#e98268"],
    ["marigold", "#e8b83f"],
  ].map(Object.freeze),
);

export const SECONDARY_PIGMENTS = Object.freeze(
  [
    ["cream", "#dfd2ae"],
    ["slate", "#718489"],
    ["milk-mint", "#d8f1d4"],
    ["ice", "#d9ecf5"],
    ["butter", "#fff0b8"],
    ["peach", "#ffd7c5"],
  ].map(Object.freeze),
);

export const PIGMENT_REVIEW_PAIRINGS = Object.freeze(
  [
    ["legacy-charcoal", "charcoal", "cream"],
    ["legacy-russet", "russet", "cream"],
    ["jade-mint", "jade", "milk-mint"],
    ["lagoon-cream", "lagoon", "cream"],
    ["cobalt-ice", "cobalt", "ice"],
    ["periwinkle-butter", "periwinkle", "butter"],
    ["plum-peach", "plum", "peach"],
    ["raspberry-cream", "raspberry", "cream"],
    ["coral-mint", "coral", "milk-mint"],
    ["marigold-ice", "marigold", "ice"],
  ].map(Object.freeze),
);

function expandPigmentRecord(record, pigments) {
  record.version = 2;
  const existingIds = new Set(record.alleles.map((allele) => allele.id));
  for (const [id, value] of pigments) {
    if (!existingIds.has(id)) {
      record.alleles.push({ id, label: id.replaceAll("-", " "), value });
    }
  }
  for (let first = 0; first < pigments.length; first++) {
    for (let second = first; second < pigments.length; second++) {
      const [firstId, firstValue] = pigments[first];
      const [secondId, secondValue] = pigments[second];
      const key = [firstId, secondId].sort().join("|");
      // The six old map entries remain verbatim in the cloned foundation.
      if (!Object.hasOwn(record.pairMap, key)) {
        record.pairMap[key] =
          first === second ? [firstValue] : [firstValue, secondValue];
      }
    }
  }
}

export function pigmentCandidateCatalogue() {
  const catalogue = structuredClone(GRAPH_COVERING_CATALOGUE);
  catalogue.id = "genomic-covering-pigment-candidate";
  catalogue.version = 2;
  expandPigmentRecord(
    catalogue.loci.find((record) => record.id === PIGMENT_LOCUS_IDS.body),
    BODY_PIGMENTS,
  );
  expandPigmentRecord(
    catalogue.loci.find((record) => record.id === PIGMENT_LOCUS_IDS.secondary),
    SECONDARY_PIGMENTS,
  );
  return catalogue;
}

export const PIGMENT_CANDIDATE_CATALOGUE = pigmentCandidateCatalogue();
