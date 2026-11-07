// The stuck detector (the playtest plan): a run is stuck when the screen shows the same hash 6 presses running, or 30 presses pass with no new screen (a hash the run has not seen)
// and no new event. Stuck is a finding, not an error: the runner ends the run with a "stuck" record.
export const SAME_HASH = 6, NO_NEW = 30;

export function createStuck({ same = SAME_HASH, noNew = NO_NEW } = {}) {
  const seen = new Set(); let last = null, run = 0, quiet = 0, presses = 0;
  return {
    // one press's outcome: the hash after it and the events it brought ([] for none). Returns null, or { stuck: reason, presses }.
    note(hash, events = []) {
      presses++;
      run = hash === last ? run + 1 : 1; last = hash;
      const fresh = !seen.has(hash); seen.add(hash);
      quiet = fresh || events.length ? 0 : quiet + 1;
      if (run >= same) return { stuck: `the same screen ${same} presses running (${hash})`, kind: "same-hash", presses };
      if (quiet >= noNew) return { stuck: `${noNew} presses with no new screen or event`, kind: "no-new", presses };
      return null;
    },
    // the first hash of a run (the screen at boot): seen, not a press
    start(hash) { seen.add(hash); last = hash; run = 1; },
    get seen() { return seen.size; },
  };
}
