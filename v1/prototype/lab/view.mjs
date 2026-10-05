import { actions } from './controller.mjs';
import { cargo, questions, questionById } from './content.mjs';
import { validateEnvelope } from './domain.mjs';

function wrapped(lines) {
  const result = [];
  for (const line of lines) {
    for (let offset = 0; offset < line.length; offset += 46) result.push(line.slice(offset, offset + 46));
    if (!line.length) result.push('');
  }
  return result;
}

// Player copy for the bounded authored content; technical provenance stays in
// the host transcript. This changes labels only, never saved facts or rules.
function playerClue(line) {
  const labels = {
    'SIMULATED HUMIDITY 78 PERCENT': 'HUMIDITY 78 PERCENT',
    'AUTHORED LAB OBSERVATION': 'LAB OBSERVATION',
    'AUTHORED OUTCOME HAS A CROWN': 'CROWN FRILL',
    'WHY IT FORMS IS UNMODELED': 'WHY IT FORMS IS UNKNOWN',
    'OTHER DIMENSIONS UNMODELED': 'OTHER TRAITS UNKNOWN',
  };
  return labels[line] ?? line;
}

export function mapView(state) {
  const envelope = validateEnvelope(state.envelope);
  const study = envelope.research;
  const specimen = Object.values(envelope.collection)[0];
  const source = envelope.samples[study?.sampleId ?? state.sampleId];
  const view = {
    title: state.page.toUpperCase(), actions: actions(state), focus: state.focus,
    lines: [], choices: [], asset: null, detailLines: [], pageNumber: null,
    portraitMissing: state.portraitMissing,
  };
  switch (state.page) {
    case 'lab':
      view.asset = 'vessel';
      view.lines = [state.error ? 'CHECK RESULT' : study ? 'SAVED STUDY' : Object.keys(envelope.samples).length ? 'SAMPLE AVAILABLE' : 'NO SAMPLES', 'LAB'];
      break;
    case 'receive':
    case 'received':
      view.title = state.page === 'received' ? 'RECEIVED' : state.busy ? 'RECEIVING' : 'RECEIVE';
      view.detailLines = ['PROBE CARGO', '', `SAMPLES ${cargo.samples.length}`, `RESOURCES ${cargo.resources.length}`, '', 'SAMPLES AND SUPPLIES ARE SEPARATE'];
      break;
    case 'study':
      view.title = 'CHOOSE QUESTION';
      view.choices = questions.map(question => question.label);
      view.lines = [source?.label ?? 'NO USABLE SAMPLE'];
      break;
    case 'research':
      view.asset = 'vessel';
      view.lines = [study?.finding ? 'FINDING READY' : 'OBSERVING', study?.finding?.label ?? 'AWAITING OBSERVATION'];
      break;
    case 'finding':
      view.asset = study?.question === 'structure' ? 'crown-detail' : 'pale-detail';
      view.lines = [study.finding.label, 'KNOWN', study.question === 'structure' ? 'CROWN FRILL' : 'PALE IS CARRIED', 'UNRESOLVED', 'OTHER TRAITS'];
      break;
    case 'direction':
      view.title = 'PURSUE A DIRECTION';
      view.choices = questionById(study.question).directions.map(direction => direction.label);
      break;
    case 'create':
      view.title = 'CREATION PREVIEW';
      view.detailLines = ['LAB FOUNDER', source.label, study.finding.label, '', 'USES ONE SAMPLE', 'NO SUPPLIES WILL BE SPENT', 'OUTCOME ALREADY SET', 'RESEARCH FOCUS DOES NOT CHANGE GENES'];
      break;
    case 'creating':
    case 'checking':
      view.asset = 'vessel';
      view.lines = [state.page === 'creating' ? 'CREATING' : 'CHECKING RESULT', 'RECOVERING RESULT'];
      break;
    case 'ready':
      view.asset = 'vessel';
      view.lines = ['READY', 'OPEN TO MEET'];
      break;
    case 'meet':
    case 'collection':
      view.title = state.page === 'meet' ? 'MEET' : 'COLLECTION 1 / 1';
      view.asset = state.portraitMissing ? null : specimen?.portrait.asset;
      view.lines = [`INDIVIDUAL ${specimen.shortId}`, 'FAMILY', specimen.family, 'EXPRESSED', ...specimen.expression.expressed];
      if (state.portraitMissing) view.detailLines = ['PORTRAIT PENDING', specimen.id, 'RETRY LOADS THE SAME INDIVIDUAL'];
      break;
    case 'inspect':
      view.title = 'INSPECT ' + specimen.shortId;
      view.asset = state.portraitMissing ? null : specimen.portrait.asset;
      view.inspection = true;
      view.shortId = specimen.shortId;
      view.choices = ['IDENTITY', 'EXPRESSED', 'CARRIED', 'ORIGIN'];
      break;
    case 'detail': {
      view.title = state.detail === 'evidence' ? 'CLUES' : state.detail.toUpperCase();
      const detail = {
        identity: specimen ? ['INDIVIDUAL', specimen.id, 'FAMILY', specimen.family, 'ORIGIN LAB CREATED', 'PARENTS NONE'] : ['NO INDIVIDUAL'],
        expressed: specimen ? ['EXPRESSED', ...specimen.expression.expressed, '', 'GENOME', 'CROWN CAPITAL C / LOWERCASE C', 'EYES CAPITAL R / LOWERCASE R', 'PALE CAPITAL P / LOWERCASE P'] : [],
        carried: specimen ? ['CARRIED NOT EXPRESSED', ...specimen.expression.carried, '', 'PALE MARKINGS ARE NOT SHOWN', 'OTHER TRAITS UNKNOWN'] : [],
        origin: specimen ? ['LAB CREATED', 'PARENTS NONE', source?.label ?? specimen.origin.source.label, 'SAMPLE / ' + specimen.origin.sampleId, 'STUDY / ' + specimen.origin.studyId] : [],
        evidence: source ? [source.label, ...source.observations.map(playerClue), '', 'CONDITIONS DO NOT PROVE GENES', ...(study?.finding?.known ?? []).map(playerClue), 'UNRESOLVED', ...(study?.finding?.unresolved ?? []).map(playerClue)] : ['NO CLUES'],
        observation: ['NO FINDING YET', 'LOOK AGAIN WHEN A FINDING IS READY'],
        cargo: ['PROBE CARGO', 'SAMPLES 1', 'RESOURCES 0'],
        creation: ['USES ONE SAMPLE', 'NO SUPPLIES SPENT', 'OUTCOME ALREADY SET', 'RESEARCH FOCUS DOES NOT CHANGE GENES', 'OPEN REVEALS THE SAME INDIVIDUAL'],
      };
      view.detailLines = detail[state.detail] ?? ['UNKNOWN'];
      break;
    }
    case 'error':
      view.title = /RESPONSE LOST|INTENT SAVED|UNAVAILABLE/.test(state.error ?? '') ? 'CHECK RESULT' : 'NOT SAVED';
      if (/UNSUPPORTED SAVED/.test(state.error ?? '')) view.title = 'UNSUPPORTED SAVE';
      view.detailLines = ['COULD NOT CONFIRM SAVING', '', 'CHECK THE SAVED RESULT', 'YOUR SAVED DATA IS KEPT'];
      if (/UNSUPPORTED SAVED|INVALID SAVED DATA/.test(state.error ?? '')) {
        view.title = 'CANNOT READ SAVE';
        view.detailLines = ['THIS RECORD CANNOT BE OPENED', 'YOUR SAVED DATA IS KEPT'];
      }
      break;
    default:
      view.title = 'LAB DEMO';
      view.detailLines = ['OUTSIDE LAB', 'RETURN TO CONTINUE'];
  }
  if (view.detailLines.length) {
    const lines = wrapped(view.detailLines);
    const count = Math.max(1, Math.ceil(lines.length / 12));
    const page = state.detailPage % count;
    view.detailLines = lines.slice(page * 12, (page + 1) * 12);
    view.pageNumber = `${page + 1} / ${count}`;
  }
  return view;
}
