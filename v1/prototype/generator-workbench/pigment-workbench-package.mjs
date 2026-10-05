import { pigmentProofCases } from "./pigment-proof.mjs";

// Package loading adapts retained controlled inputs; it does not run a search.
export function pigmentWorkbenchPackage() {
  const examples = pigmentProofCases().filter((item) =>
    ["lagoon-cream", "mixed-fields"].includes(item.name),
  );
  const initial = examples[0].input;
  return {
    catalogue: structuredClone(initial.catalogue),
    defaultGeneration: {
      genome: structuredClone(initial.genome),
      context: structuredClone(initial.context),
      expressionSeed: initial.expressionSeed,
    },
    referenceContext: structuredClone(initial.context),
    sceneExamples: examples.map(({ name, input, relationship }) => ({
      name,
      genome: structuredClone(input.genome),
      context: structuredClone(input.context),
      expressionSeed: input.expressionSeed,
      relationship: structuredClone(relationship),
    })),
  };
}
