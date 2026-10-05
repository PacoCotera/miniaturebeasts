import { questions, sources, questionById } from './content.mjs';
import { creationRequest, validateEnvelope } from './domain.mjs';

export function resumePage(envelope) {
  const operation = Object.values(envelope.operations)[0];
  if (operation) return operation.status === 'committed' ? 'ready' : 'checking';
  if (envelope.research) return 'research';
  return Object.keys(envelope.receipts).length ? 'received' : 'lab';
}

export function initialController(envelope) {
  validateEnvelope(envelope);
  return {
    envelope, page: resumePage(envelope), focus: resumePage(envelope) === 'lab' ? 2 : 1, detail: 'identity', detailPage: 0,
    sampleId: envelope.research?.sampleId ?? null, revision: 1, visibleRevision: 0,
    held: [], interrupted: [], suspended: false, idle: false, returnPage: 'lab', busy: false, error: null, portraitMissing: false,
  };
}

export function actions(state) {
  const committed = Object.values(state.envelope.operations).some(operation => operation.status === 'committed');
  switch (state.page) {
    case 'lab': return ['BACK', 'RECEIVE', state.error ? 'CHECK' : state.envelope.research || committed ? 'RESUME' : 'INVESTIGATE'];
    case 'receive': return ['BACK', state.busy ? 'WAIT' : 'ACCEPT', 'DETAILS'];
    case 'received': return ['BACK', 'CONTINUE', 'DETAILS'];
    case 'study': return ['BACK', 'STUDY', 'CLUES'];
    case 'research': return ['BACK', 'INSPECT', state.envelope.research?.finding ? 'REVIEW' : 'LOCKED'];
    case 'finding': return ['BACK', 'PURSUE', 'CLUES'];
    case 'direction': return ['BACK', 'REVIEW', 'CLUES'];
    case 'create': return ['BACK', 'PREVIEW', 'DETAILS'];
    case 'creating': return ['BACK', 'WAIT', 'DETAILS'];
    case 'checking': return ['BACK', 'CHECK', 'DETAILS'];
    case 'ready': return ['BACK', 'OPEN', 'DETAILS'];
    case 'meet': return ['BACK', state.portraitMissing ? 'RETRY ART' : 'INSPECT', 'COLLECTION'];
    case 'collection': return ['BACK', 'INSPECT', 'MEET'];
    case 'inspect': return ['BACK', 'OPEN', 'NEXT'];
    case 'detail': return ['BACK', 'NEXT', 'PREVIOUS'];
    case 'error': return ['BACK', 'CHECK', 'DETAILS'];
    default: return ['BACK', 'LAB', ''];
  }
}

function navigate(state, page) {
  state.page = page;
  state.focus = ['receive', 'create', 'study', 'direction', 'inspect'].includes(page) ? 0 : page === 'lab' ? 2 : 1;
  state.detailPage = 0;
}

function inspect(state, detail) {
  state.returnPage = state.page;
  state.returnFocus = state.focus;
  state.detail = detail;
  navigate(state, 'detail');
}

function back(state) {
  const restoringDetail = state.page === 'detail';
  const destinations = {
    receive: 'lab', received: 'lab', study: 'lab', research: 'lab', finding: 'research',
    direction: 'finding', create: 'finding', creating: 'lab', checking: 'lab', ready: 'lab',
    meet: 'ready', collection: 'meet', inspect: state.inspectReturn ?? 'meet', detail: state.returnPage, error: 'lab', lab: 'outside',
  };
  navigate(state, destinations[state.page] ?? 'lab');
  if (restoringDetail) state.focus = state.returnFocus;
}

// One physical down is one gesture. Repeats/release can never activate after refresh.
export function transition(previous, event) {
  const state = structuredClone(previous);
  const commands = [];
  if (event.type === 'restore') {
    const restored = initialController(event.envelope);
    restored.held = state.held;
    restored.interrupted = state.interrupted;
    restored.suspended = state.suspended;
    restored.revision = state.revision + 1;
    return { state: restored, commands };
  }
  if (event.type === 'visible') {
    if (event.revision === state.revision) state.visibleRevision = event.revision;
    return { state, commands };
  }
  if (event.type === 'up') {
    const token = `${event.source ?? 'semantic'}:${event.key}`;
    state.held = state.held.filter(key => key !== token);
    state.interrupted = state.interrupted.filter(key => key !== token);
    return { state, commands };
  }
  if (event.type === 'suspend') {
    state.suspended = true;
    state.interrupted = [...new Set([...state.interrupted, ...state.held])];
    return { state, commands };
  }
  if (event.type === 'resume') {
    state.suspended = false;
    // A pointer gesture interrupted by focus loss is cancelled, not replayed.
    // A later pointerdown starts a new gesture; pointerup never activates.
    state.held = state.held.filter(key => !key.startsWith('pointer:'));
    state.interrupted = state.interrupted.filter(key => !key.startsWith('pointer:'));
    return { state, commands };
  }
  if (event.type === 'idle') {
    if (state.visibleRevision !== state.revision || state.busy || state.suspended) return { state, commands };
    state.idle = true;
    state.revision++;
    return { state, commands };
  }
  if (event.type === 'data') {
    validateEnvelope(event.envelope);
    state.envelope = event.envelope;
    state.busy = false;
    state.error = null;
    if (event.command === 'receive' && state.page === 'receive') navigate(state, 'received');
    if (event.command === 'console' && state.page === 'lab') {
      state.sampleId = sources.console.id;
      navigate(state, 'study');
    }
    if (event.command === 'start' && state.page === 'study') navigate(state, 'research');
    if (event.command === 'direction' && state.page === 'direction') navigate(state, 'create');
    if (['resolve', 'check'].includes(event.command) && ['creating', 'checking', 'error'].includes(state.page)) {
      navigate(state, resumePage(state.envelope));
    }
    state.revision++;
    return { state, commands };
  }
  if (event.type === 'error') {
    state.busy = false;
    state.error = event.message;
    if (!(previous.busy && ['lab', 'outside'].includes(state.page))) state.page = 'error';
    state.revision++;
    return { state, commands };
  }
  if (event.type === 'art') {
    state.portraitMissing = event.missing;
    state.revision++;
    return { state, commands };
  }
  if (event.type !== 'down') return { state, commands };
  const token = `${event.source ?? 'semantic'}:${event.key}`;
  if (state.suspended || event.repeat) {
    if (!state.held.includes(token)) state.held.push(token);
    if (state.suspended && !state.interrupted.includes(token)) state.interrupted.push(token);
    return { state, commands };
  }
  // Browser repeat:false proves a fresh keyboard press after a missed external
  // keyup. Only focus-interrupted keys qualify; boot/refresh holds stay gated.
  if (event.source === 'keyboard' && event.repeat === false && state.interrupted.includes(token)) {
    state.held = state.held.filter(key => key !== token);
    state.interrupted = state.interrupted.filter(key => key !== token);
  }
  if (state.held.includes(token)) return { state, commands };
  state.held.push(token);
  if (state.idle) {
    state.idle = false;
    state.revision++;
    return { state, commands };
  }
  if (event.key === 'back') {
    back(state);
    state.revision++;
    return { state, commands };
  }
  if (state.visibleRevision !== state.revision || state.busy) return { state, commands };
  if (['next', 'previous'].includes(event.key)) {
    const count = state.page === 'inspect' ? 4 : ['study', 'direction'].includes(state.page) ? 2 : actions(state).length;
    state.focus = (state.focus + (event.key === 'next' ? 1 : count - 1)) % count;
    state.revision++;
    return { state, commands };
  }
  let action;
  if (event.key === 'select') {
    action = ['study', 'direction', 'inspect'].includes(state.page)
      ? actions(state)[1]
      : actions(state)[state.focus];
  } else if (event.key.startsWith('action')) action = actions(state)[Number(event.key.slice(-1))];
  if (!action) return { state, commands };
  if (action === 'BACK') back(state);
  else if (action === 'RECEIVE') navigate(state, 'receive');
  else if (action === 'INVESTIGATE') commands.push({ type: 'console' });
  else if (action === 'RESUME') navigate(state, resumePage(state.envelope));
  else if (action === 'ACCEPT') commands.push({ type: 'receive' });
  else if (action === 'CONTINUE') {
    state.sampleId = sources.probe.id;
    navigate(state, 'study');
  } else if (action === 'STUDY') commands.push({ type: 'start', sampleId: state.sampleId, question: questions[state.focus].id });
  else if (action === 'CLUES') inspect(state, 'evidence');
  else if (action === 'DETAILS') inspect(state, ['receive', 'received'].includes(state.page) ? 'cargo' : 'creation');
  else if (action === 'INSPECT') {
    if (state.page === 'research') {
      if (state.envelope.research.finding) navigate(state, 'finding');
      else inspect(state, 'observation');
    } else {
      state.inspectReturn = state.page;
      navigate(state, 'inspect');
    }
  } else if (action === 'REVIEW') {
    if (state.page === 'research') navigate(state, 'finding');
    else commands.push({ type: 'direction', direction: questionById(state.envelope.research.question).directions[state.focus].id });
  } else if (action === 'PURSUE') navigate(state, 'direction');
  else if (action === 'PREVIEW') {
    commands.push({ type: 'preview', request: creationRequest(state.envelope) });
    navigate(state, 'creating');
  } else if (action === 'CHECK') {
    commands.push({ type: 'check' });
    navigate(state, 'checking');
  } else if (action === 'OPEN') {
    if (state.page === 'inspect') inspect(state, ['identity', 'expressed', 'carried', 'origin'][state.focus]);
    else navigate(state, 'meet');
  } else if (action === 'COLLECTION') navigate(state, 'collection');
  else if (action === 'MEET') navigate(state, 'meet');
  else if (action === 'RETRY ART') state.portraitMissing = false;
  else if (action === 'NEXT') {
    if (state.page === 'inspect') state.focus = (state.focus + 1) % 4;
    else state.detailPage++;
  } else if (action === 'PREVIOUS') state.detailPage = Math.max(0, state.detailPage - 1);
  else if (action === 'LAB') navigate(state, 'lab');
  state.busy = commands.length > 0;
  state.revision++;
  return { state, commands };
}
