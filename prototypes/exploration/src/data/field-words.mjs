// The field's short words (data): the lands, the place tiers, the outpost, why a pod was shed, the pins and the map signs.
export const LAND_NAME = ['meadow', 'pond edge', 'rock field', 'wood', 'ford', 'cliff'];   // [copy] a place is named by its ground, never "rock" alone; [4] is a walkable water cell: a ford (a wade is "muddy water" where it is named)
export const TIER_NAME = ['', 'starter', 'early', 'mid', 'late'];
export const DEPOT_NAME = 'outpost';   // the one place to rename it
// Why a shed pod is special, as the Companion's line says it (the pod carries the key as `why`; a plain pod carries none).
// A bond pod names its act: fed, or settled with you (a Tuikis does not eat).
export const WHY_WORD = { new: 'a new species', bond: 'you fed it' }, WHY_SETTLE = 'it settled with you';
export const PIN_TEXT = { burrow: 'too narrow', water: 'needs a swimmer', soft: 'needs a rambler', bank: 'needs a digger', deep: 'needs Probe tier 2', own: 'your pin' };
// The map signs, as the map's line names them (an outpost and a beacon say their own state there).
export const SIGN_NAME = { pod: 'pod found', t: 'tracks', b: 'slow beat', k: 'bolt', kw: 'warm stone', beacon: 'lit beacon', skull: 'the Probe broke here', depot: DEPOT_NAME, pin: 'pin', burrow: 'too narrow', water: 'fast water', soft: 'needs a rambler', bank: 'needs a digger', deep: 'deep ?' };
