export const COMPOSITIONAL_DRAFT_SCHEMA = "compositional-authoring-delta/1";
export const COMPOSITIONAL_DRAFT_ID = "genomic-compositional-source-draft";
export const COMPOSITIONAL_DRAFT_PACKET = "compositional-authored-record/1";

export function isCompositionalDraft(catalogue) {
  const recipe = catalogue?.authoredRecipe;
  const pin = catalogue?.foundationPin;
  const recipePin = recipe?.definitionPin;
  if (!catalogue || !recipe || !pin || !recipePin) return false;
  return Boolean(catalogue.id === `${COMPOSITIONAL_DRAFT_ID}-${recipe.forkId}` &&
    recipe.schemaVersion === COMPOSITIONAL_DRAFT_SCHEMA &&
    pin.profile === "compositional-authored-foundation/1" &&
    pin.id === catalogue.id && pin.version === catalogue.version &&
    recipePin.profile === pin.profile && recipePin.id === catalogue.id &&
    recipePin.version === catalogue.version && recipePin.digest === pin.digest);
}

// Use the exact published parent supplied by the catalogue endpoint. Never
// replace missing inherited copies when constructing an authoring recipe.
export function compositionalDraftRecipe(catalogue, parent, startingCopies, baselineMetadata = {}) {
  const previous = catalogue.authoredRecipe;
  return {
    schemaVersion: COMPOSITIONAL_DRAFT_SCHEMA,
    parent: parent.foundationPin,
    forkId: previous?.forkId ?? crypto.randomUUID().replaceAll("-", "").slice(0, 16),
    revision: (previous?.revision ?? 0) + 1,
    records: catalogue.loci.filter((record) => {
      const original = parent.loci.find((locus) => locus.id === record.id);
      return JSON.stringify(record) !== JSON.stringify(original);
    }),
    startingCopies,
    baselineMetadata
  };
}
