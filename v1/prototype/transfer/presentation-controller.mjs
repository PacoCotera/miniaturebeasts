import { validateKey, sameKey, validateObservation } from './presentation-data.mjs';
import { mapPresentation } from './presentation-view.mjs';

function validateContext(context, caller) {
  if (!['preview', 'requested', 'neutral'].includes(context) || typeof caller !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(caller)) throw new Error('Invalid presentation context');
}

export function createPresentation({ instanceId, key, context = 'neutral', caller }) {
  validateKey(key);
  validateContext(context, caller);
  if (typeof instanceId !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(instanceId)) throw new Error('Supply a unique presentation instance ID');
  return {
    instanceId, key: structuredClone(key), context, caller,
    generation: 0, requestToken: null, revision: 1, visible: true,
    page: 'status', detailPage: 0, focus: 'back', returnFocus: 'back',
    loading: false, observation: null, lastKnown: null, knownManifestCargo: null, firstObservation: true,
  };
}

function request(state, type) {
  state.generation++;
  state.requestToken = `${state.instanceId}:${state.generation}`;
  state.loading = true;
  return { type, key: structuredClone(state.key), context: state.context, requestToken: state.requestToken };
}

function unreadable(key) {
  return { schema: 1, key: structuredClone(key), kind: 'unreadable', facts: null, canReconcile: false, reason: 'conflicting-record' };
}

function receiptStatus(facts) {
  return ['pending', 'confirmed'].includes(facts.status) ? facts.status : 'absent';
}

function contradicts(previous, incoming, knownManifestCargo) {
  // Availability may change without a lab revision changing. Retain immutable
  // same-key cargo evidence separately; never use it to invent current availability.
  if (knownManifestCargo && incoming.cargo && JSON.stringify(knownManifestCargo) !== JSON.stringify(incoming.cargo)) return true;
  if (!previous) return false;
  const oldStatus = receiptStatus(previous);
  const newStatus = receiptStatus(incoming);
  if (oldStatus === 'confirmed' && newStatus !== 'confirmed') return true;
  if (oldStatus === 'pending' && newStatus === 'absent') return true;
  if (incoming.labRevision === previous.labRevision && oldStatus !== newStatus) return true;
  return false;
}

function settleFocus(state, initial = false) {
  const view = mapPresentation(state);
  if (state.page === 'details' && state.detailPage >= view.detailPageCount) state.detailPage = Math.max(0, view.detailPageCount - 1);
  const enabled = mapPresentation(state).actions.filter(action => action.enabled).map(action => action.id);
  if (initial && state.page === 'status') {
    state.focus = enabled.includes('reconcile') ? 'reconcile' : view.status === 'confirmed' && enabled.includes('details') ? 'details' : 'back';
  } else if (!enabled.includes(state.focus)) {
    state.focus = 'back';
  }
}

// Host events are select/refresh/observe; action/focus carry the displayed revision.
// This guards semantic commands only. Physical readiness/gesture handling is deferred.
export function updatePresentation(saved, event) {
  const state = structuredClone(saved);
  const effects = [];
  if (event.type === 'select') {
    validateKey(event.key);
    validateContext(event.context, event.caller);
    const sameSelection = sameKey(state.key, event.key);
    const retained = sameSelection ? state.lastKnown : null;
    const retainedCargo = sameSelection ? state.knownManifestCargo : null;
    state.key = structuredClone(event.key);
    state.context = event.context;
    state.caller = event.caller;
    state.observation = null;
    state.lastKnown = retained;
    state.knownManifestCargo = retainedCargo;
    state.visible = true;
    state.page = 'status';
    state.detailPage = 0;
    state.focus = 'back';
    state.returnFocus = 'back';
    state.firstObservation = true;
    effects.push(request(state, 'read'));
  } else if (event.type === 'refresh') {
    if (!state.visible) return { state: saved, effects };
    effects.push(request(state, 'read'));
  } else if (event.type === 'observe') {
    if (!state.visible || state.requestToken === null || event.requestToken !== state.requestToken || !sameKey(event.key, state.key)) return { state: saved, effects };
    let observation;
    try {
      validateObservation(event.observation);
      if (!sameKey(event.observation.key, state.key)) return { state: saved, effects };
      observation = structuredClone(event.observation);
    } catch {
      observation = unreadable(state.key);
    }
    state.loading = false;
    state.requestToken = null;
    if (observation.kind === 'valid') {
      const incoming = observation.facts;
      if (state.lastKnown && incoming.labRevision < state.lastKnown.labRevision) {
        // An older snapshot cannot replace current facts or erase current errors.
      } else if (contradicts(state.lastKnown, incoming, state.knownManifestCargo)) {
        state.observation = unreadable(state.key);
      } else {
        state.observation = observation;
        state.lastKnown = structuredClone(incoming);
        if (incoming.cargo) state.knownManifestCargo = structuredClone(incoming.cargo);
      }
    } else {
      state.observation = observation;
    }
    settleFocus(state, state.firstObservation);
    state.firstObservation = false;
  } else if (event.type === 'action' || event.type === 'focus') {
    if (!state.visible || event.revision !== state.revision || !sameKey(event.key, state.key)) return { state: saved, effects };
    const view = mapPresentation(state);
    const action = view.actions.find(item => item.id === event.action && item.enabled);
    if (!action) return { state: saved, effects };
    if (event.type === 'focus') {
      state.focus = action.id;
    } else if (action.id === 'back') {
      if (state.page === 'details') {
        state.page = 'status';
        state.focus = state.returnFocus;
      } else {
        state.visible = false;
        state.loading = false;
        state.requestToken = null;
        state.generation++;
        effects.push({ type: 'navigate-back', caller: state.caller, key: structuredClone(state.key) });
      }
    } else if (action.id === 'details') {
      state.returnFocus = state.focus;
      state.page = 'details';
      state.detailPage = 0;
      state.focus = 'back';
    } else if (action.id === 'reconcile') {
      effects.push(request(state, 'reconcile'));
    } else if (action.id === 'next') {
      state.detailPage++;
    } else if (action.id === 'previous') {
      state.detailPage--;
    }
  } else {
    return { state: saved, effects };
  }
  settleFocus(state);
  if (JSON.stringify(state) !== JSON.stringify(saved)) state.revision++;
  return { state, effects };
}
