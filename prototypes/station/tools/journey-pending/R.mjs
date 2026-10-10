// The journey steps of slot R that are still pending: the Incubator's (R2). Create's two (create-walk, create-grow) are on the face since R1 (journey.mjs, golden/journey-create.json). They ran on the JavaScript face until B4a-2 (see tools/journey.mjs in git before that PR, steps named below);
// until then the rules behind them are driven through the screens' intents in journey.mjs, and the screens say that they are not built yet. Each is a step to re-point at the face by keys and intents when its screen lands.
export const milestone = "R2 (the Incubator)";
export const steps = [
  { id: "incubator-states", what: `growing: "Grow now" offered; ready: "Open"; ✓ opens the bud: the juvenile steps out fully read into a bay, the hatch holds input` },
  { id: "incubator-empty", what: "the empty incubator says to shape a founder from a read pod at Research" },
]
