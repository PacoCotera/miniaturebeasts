// Tuning of the wild ones in a place: how long a daytime bolt lasts, and the idle beat's pace and pictures.

// A daytime bolt ends once he is more than GONE_SAFE tiles off for GONE_REST actions.
export const GONE_SAFE = 4, GONE_REST = 6;

// The idle beat: the picture holds BEAT_HOLD_MS and BEAT_HOLD_ACTS of his actions (BEAT_HOLD_CAP_MS whatever he did), she rests BEAT_REST actions before the next,
// her plant is within BEAT_NEAR tiles, and she is drawn going there one tile every BEAT_STEP_MS.
export const BEAT_HOLD_MS = 2500, BEAT_HOLD_ACTS = 3, BEAT_HOLD_CAP_MS = 8000, BEAT_REST = 5, BEAT_NEAR = 3, BEAT_STEP_MS = 360;
// the scatter decals that count as plants: flowers, tufts, clumps, shrubs and bushes
export const PLANT_DECAL = /^sc-(flowers|tufts|clump|shrub|bush)/;
// look up: nine frames idle to idle; groom: idle, half-turn, groom held, half-turn, idle (saddled: idle, groom held, idle); both looped for the whole hold
export const BEAT_LOOK_MS = 140, BEAT_GROOM = [250, 200, 1200, 200], BEAT_GROOM_SAD = [250, 1200, 200];
// Sniff and graze have no picture: her signed idle sinks BEAT_DIP px (the nose to the plant) and holds still, for the whole hold. 0 turns it off.
export const BEAT_DIP = 2;
