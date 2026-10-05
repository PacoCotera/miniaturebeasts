// A card belongs to one generation. Closing, resetting, or replacing it invalidates
// all pending work without changing any record already published on the server.
export function createShareLifecycle() {
  let generation = 0;
  let active = null;

  return {
    invalidate() {
      generation += 1;
      active = null;
      return generation;
    },

    isCurrent(token) {
      return token === generation;
    },

    activate(token, value) {
      if (token !== generation) return false;
      active = { generation: token, value };
      return true;
    },

    getActive() {
      return active;
    },

    isActive(handle) {
      return handle !== null && active === handle && handle.generation === generation;
    },
  };
}
