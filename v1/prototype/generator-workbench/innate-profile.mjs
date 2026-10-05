import { INNATE_TARGETS } from "./innate-profile-package.mjs";

// This pure consumer receives resolved facts, not raw cues or a live creature.
// Its boundary describes a fictional decoded cue; it grants no behavior.
export function innateResponseProfile(values, facts) {
  const witnesses = Object.keys(INNATE_TARGETS).map((id) => {
    const fact = facts.find((entry) => entry.locusId === id);
    if (!fact || fact.copyResolution !== "resolved") throw new Error(`Missing innate witness ${id}`);
    return structuredClone(fact);
  });
  const enabled = values["innate.enabled"];
  const exploration = values["innate.explorationClass"];
  const threshold = values["innate.arousalThreshold"];
  if (typeof enabled !== "boolean" || !["reserved", "intermediate", "seeking"].includes(exploration) ||
      !Number.isFinite(threshold) || threshold < 0.25 || threshold > 0.75) {
    throw new Error("Innate profile leaves its declared provisional domain");
  }
  return {
    profileVersion: "innate-response-profile/1", status: enabled ? "enabled" : "disabled", enabled,
    witnesses,
    response: enabled ? {
      explorationClass: exploration, arousalThreshold: threshold,
      unit: "dimensionless decoded-reference-cue/1 magnitude",
      boundary: {
        context: "decoded-reference-cue/1", cueDomain: [0, 1],
        below: { operator: "less-than", threshold, state: "below-boundary" },
        reached: { operator: "greater-than-or-equal", threshold, state: "boundary-reached" },
      },
    } : null,
    reason: enabled ? "Provisional static inherited data, not a live response or sensory capability." :
      "Optional profile is OFF; exploration and threshold copies remain resolved but inactive. This is not biological absence of cognition.",
  };
}
