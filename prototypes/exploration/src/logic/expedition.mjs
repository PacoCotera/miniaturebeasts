// The expedition's end: the rules that read only what they are handed. ex is the expedition, h a hold (its cargo).

export const holdEmpty = h => !h || (!h.e && !h.d && !h.s && !(h.pods && h.pods.length) && !(h.samples && h.samples.length));
// The walk went into at least one place.
export const exploredAny = ex => (ex.entered || []).length > 0;

// The trips the Station reads at the dock (top-level `trips` in the save): one record per expedition that explored or dug,
// oldest first, the last 40 kept. The expedition gathers its kinds of place (ex.tripPlaces) and whether a storm was over
// the Probe (ex.tripStorm) as it goes; both are optional, so an expedition saved before them still ends cleanly. `carried` is
// a copy of the carried list at the expedition's end (`[]` allowed); a reader of an older record takes [partner].
export const TRIP_KINDS = ['meadow', 'pond', 'rock', 'wood', 'cave'];
const TRIPS_KEPT = 40;
export function tripPlace(ex, kind) { if (!TRIP_KINDS.includes(kind)) return; if (!Array.isArray(ex.tripPlaces)) ex.tripPlaces = []; if (!ex.tripPlaces.includes(kind)) ex.tripPlaces.push(kind); }
export function tripRecord(ex, carried) { const places = Array.isArray(ex.tripPlaces) ? [...new Set(ex.tripPlaces.filter(k => TRIP_KINDS.includes(k)))] : [];
  return { v: 1, n: ex.n, partner: ex.pt ? ex.pt.id : null, places, storm: !!ex.tripStorm, carried: Array.isArray(carried) ? carried.slice() : [] }; }
export function tripsWith(trips, rec) { return (Array.isArray(trips) ? trips : []).concat([rec]).slice(-TRIPS_KEPT); }
