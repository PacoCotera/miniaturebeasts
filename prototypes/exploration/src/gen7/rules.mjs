// The map rules: every number and neighbourhood size behind the map's dressing (props, meadow decor, shrubs, reeds, tone) lives in art/places/map-rules.json, which the art desk owns.
// This module only loads it; decor.mjs, reeds.mjs and place.mjs read their numbers from RULES (or from a copy handed to them, which is how the test and the stills try a change).
import RULES from '../../../../art/places/map-rules.json' with { type: 'json' };
export { RULES };
export default RULES;
