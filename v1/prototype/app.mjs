import { forecast } from './genetics.mjs';
import { createInitialState, developSample, createBreeding, hatch, serializeState, restoreState } from './store.mjs';
import { portrait, ART_VERSION } from './art.mjs';
import { createShareLifecycle } from './share-lifecycle.mjs';
import { getResearchFinding } from './research-view.mjs';
import { getAncestryView } from './ancestry-view.mjs';

const key = 'critter-lab-first-playable-v1';
const $ = (id) => document.getElementById(id);
const escape = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const traits = (x) => `${x.crown ? 'Crown' : 'Small'} frill · ${x.eyes ? 'Ringed' : 'Plain'} eyes · ${x.pale ? 'Pale' : 'Dark'} markings`;
const familyLabel = (s) => s.bodyPlanId === 'draft:frilled-quadruped:1' ? 'Frilled quadruped (working label)' : 'Unrecognized family';
function carriedTraits(s) {
  const carried = [];
  if (s.genome.crown.includes('C') && s.genome.crown.includes('c')) carried.push('small frill');
  if (s.genome.eyes.includes('R') && s.genome.eyes.includes('r')) carried.push('plain eyes');
  if (s.genome.pale.includes('P') && s.genome.pale.includes('p') && !s.expression.pale) carried.push('pale markings');
  if (s.genome.pale.includes('P') && s.expression.pale) carried.push('dark markings (suppressed by sample)');
  return carried.length ? carried.join(' · ') : 'None in the tested trait set';
}
let state;
let loadBlocked = false;
const shareLifecycle = createShareLifecycle();
let shareOpener = null;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
try {
  const saved = localStorage.getItem(key);
  state = saved ? restoreState(saved) : createInitialState();
} catch (error) {
  state = createInitialState();
  loadBlocked = true;
  $('notice').textContent = `Saved experiment could not be loaded: ${error.message}. Changes are paused to protect the stored data. Use “Reset this experiment” to explicitly start over.`;
}

function apply(action, message) {
  if (loadBlocked) return;
  try {
    const next = action(state);
    localStorage.setItem(key, serializeState(next));
    state = next;
    render();
    $('notice').textContent = message;
  } catch (error) {
    $('notice').textContent = `The change was not saved: ${error.message}`;
  }
}

function readySample() { return state.samples.find(s => s.status === 'ready'); }

function sampleOutcome(specimen) {
  const event = state.events.find(e => e.id === specimen.birthEventId);
  if (!event?.sampleId) return specimen.expression.pale ? 'No sample used. Pale markings expressed naturally.' : 'No sample used. Parent inheritance only.';
  if (specimen.expression.sampleInfluenced) return 'Mist Thread used: carried pale markings were activated.';
  return specimen.expression.pale ? 'Mist Thread used. Pale markings already expressed naturally.' : 'Mist Thread used. Pale markings did not activate.';
}

// Embed saved SVG as an image, never as executable markup from local storage.
function savedPortrait(specimen, mono = false) {
  const svg = specimen.art?.[mono ? 'mono' : 'color'];
  if (typeof svg !== 'string') return portrait(specimen.expression, mono);
  return `<img class="portrait" alt="Preserved placeholder portrait: ${escape(traits(specimen.expression))}" src="data:image/svg+xml,${encodeURIComponent(svg)}">`;
}

function hatchAndPreserve(previous, eventId) {
  const next = hatch(previous, eventId);
  if (next === previous) return next;
  const specimen = next.specimens.find(s => s.birthEventId === eventId);
  specimen.artVersion = ART_VERSION;
  specimen.art = { version: ART_VERSION, color: portrait(specimen.expression), mono: portrait(specimen.expression, true) };
  return next;
}

function renderForecast() {
  const useSample = $('use-sample').checked && Boolean(readySample());
  const chances = forecast(state.parents[0], state.parents[1], useSample);
  $('forecast').innerHTML = [['crown','Crown frill'],['eyes','Ringed eyes'],['pale','Pale markings']].map(([trait,label]) => {
    const percent = Math.round(chances[trait] * 100);
    return `<div class="forecast-row"><span>${label}</span><meter aria-label="${label} probability" min="0" max="100" value="${percent}">${percent}%</meter><strong>${percent}%</strong></div>`;
  }).join('');
}

function renderResearchFinding() {
  const finding = getResearchFinding(state);
  const panel = $('research-finding');
  panel.hidden = !finding;
  if (!finding) {
    panel.replaceChildren();
    return;
  }

  const comparison = finding.comparison;
  const context = comparison?.context === 'saved-breeding'
    ? 'Historical comparison for the saved parent snapshots used in this incubation. It remains available after the sample is spent.'
    : 'Comparison for the current starter pair. These are conditional probabilities, not a promised outcome.';
  const rows = comparison
    ? [['crown', 'Crown frill'], ['eyes', 'Ringed eyes'], ['pale', 'Pale markings']].map(([trait, label]) => `
        <tr>
          <th scope="row">${label}</th>
          <td>${Math.round(comparison.before[trait] * 100)}%</td>
          <td>${Math.round(comparison.after[trait] * 100)}%</td>
        </tr>`).join('')
    : '';

  panel.innerHTML = `
    <h3>Saved finding: ${escape(finding.name)}</h3>
    <p class="eyebrow">DEVELOPER RESEARCH FIXTURE / NO REAL OBSERVATIONS</p>
    <p><strong>Saved evidence</strong><br>${escape(finding.evidence)}</p>
    <p class="fine">Origin: ${escape(finding.origin)}<br>Sample ID: ${escape(finding.id)}</p>
    <p><strong>Status:</strong> ${finding.status === 'consumed' ? 'Consumed by incubation' : 'Ready to use'}${finding.consumedBy ? `<br><span class="fine">Event: ${escape(finding.consumedBy)}</span>` : ''}</p>
    ${comparison ? `
      <p>This draft sample can make carried pale markings appear. It does not rewrite inherited alleles or guarantee pale offspring.</p>
      <p class="fine">${context}<br>Parents: ${comparison.parentIds.map(escape).join(' + ')}</p>
      <table>
        <caption>Chance of expression for this parent pair</caption>
        <thead><tr><th scope="col">Trait</th><th scope="col">No sample</th><th scope="col">With sample</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="fine">Rules: ${escape(comparison.rulesetVersion)}. Effect: ${escape(finding.effectVersion)}. Traits can occur together.</p>
    ` : `<p>${escape(finding.comparisonUnavailable)}</p>`}
  `;
}

function render() {
  $('parents').innerHTML = state.parents.map((parent, i) => `<article class="parent">${portrait(parent.expression)}<div><p class="eyebrow">STARTER INDIVIDUAL ${i + 1}</p><h3>${escape(parent.name || (i ? 'Reed' : 'Moss'))}</h3><p class="gene">Individual ID: ${escape(parent.id)}</p><p><strong>Family</strong> · ${familyLabel(parent)}</p><p><strong>Expressed traits</strong><br>${traits(parent.expression)}</p><p><strong>Carried, unexpressed traits</strong><br>${carriedTraits(parent)}</p><p class="gene">Genotype (frill / eyes / markings): ${['crown','eyes','pale'].map(trait => escape(parent.genome[trait])).join(' / ')}</p></div></article>`).join('');
  const sample = readySample();
  $('research-status').textContent = sample ? '01 SAMPLE READY / RESEARCH ORIGIN' : state.samples.length ? 'SAMPLE USED / THIS FIXTURE IS COMPLETE' : 'QUESTION: CAN PALE MARKINGS EMERGE?';
  renderResearchFinding();
  $('research').disabled = loadBlocked || state.samples.length > 0;
  $('use-sample').disabled = loadBlocked || !sample;
  if (!sample) $('use-sample').checked = false;
  $('breed').disabled = loadBlocked;
  renderForecast();
  const eggs = state.events.filter(e => e.status === 'incubating');
  $('eggs').innerHTML = eggs.length ? eggs.map((egg,i) => `<article class="egg"><div><strong>Egg ${i + 1} / Ready for a simulated hatch</strong><p>${egg.sampleId ? 'Research sample applied' : 'Parent inheritance only'} · No real timer is running.</p></div><button type="button" data-hatch="${escape(egg.id)}" ${loadBlocked ? 'disabled' : ''}>Developer: advance to hatch</button></article>`).join('') : '<p class="empty">Your next generation begins with a prediction. No eggs incubating yet.</p>';
  $('collection-count').textContent = `${state.specimens.length} individual${state.specimens.length === 1 ? '' : 's'}`;
  $('collection').innerHTML = state.specimens.length ? state.specimens.map(s => `<article class="specimen">${savedPortrait(s)}<p class="eyebrow">INDIVIDUAL / GENERATION 01</p><h3>${escape(s.name)}</h3><p>Individual ID: ${escape(s.id)}</p><p><strong>Family</strong> · ${familyLabel(s)}</p><p><strong>Expressed traits</strong><br>${traits(s.expression)}</p><p><strong>Carried, unexpressed traits</strong><br>${carriedTraits(s)}</p><p>Parents: ${s.parentIds.map(escape).join(' + ')}</p><p>${sampleOutcome(s)}</p><button type="button" class="secondary" data-print="${escape(s.id)}">Share / print individual card</button></article>`).join('') : '<p class="empty">Your first individual will appear here, with its ancestry preserved.</p>';
}

$('research').addEventListener('click', () => apply(developSample, 'Research fixture complete. One Mist Thread sample is ready. Compare the forecast with and without it.'));
$('use-sample').addEventListener('change', renderForecast);
$('breed').addEventListener('click', () => {
  const sampleId = $('use-sample').checked ? readySample()?.id ?? null : null;
  apply(s => createBreeding(s, { eventId: crypto.randomUUID(), seed: crypto.randomUUID(), sampleId }), 'One incubation saved. Use the labeled developer control to hatch without waiting.');
});
$('eggs').addEventListener('click', event => {
  const button = event.target.closest('[data-hatch]');
  if (button) apply(s => hatchAndPreserve(s, button.dataset.hatch), 'A new individual and its portraits are saved. Matching siblings still have different individual IDs; their family can remain the same.');
});
$('collection').addEventListener('click', async event => {
  const button = event.target.closest('[data-print]');
  if (!button) return;
  const specimen = state.specimens.find(s => s.id === button.dataset.print);
  if (!specimen) return;
  await prepareShare(specimen, button);
});
$('reset').addEventListener('click', () => {
  if (!window.confirm('Delete the saved specimens and progress for this local prototype?')) return;
  try {
    const next = createInitialState();
    localStorage.setItem(key, serializeState(next));
    state = next;
    loadBlocked = false;
    clearShare();
    render();
    $('notice').textContent = 'Experiment reset. Your starters are ready.';
  } catch (error) { $('notice').textContent = `Reset failed: ${error.message}`; }
});
render();

async function apiRequest(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(path, { ...options, signal: controller.signal });
    if (!response.ok) {
      if (response.status === 404) throw new Error('This individual is not available on this server. It may not have been shared here, or this server has lost its saved record.');
      if (response.status === 409) throw new Error('A different record already uses this specimen ID. The server did not replace it.');
      throw new Error(`The specimen service could not complete this request (${response.status}).`);
    }
    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The specimen service did not respond in time. Local play is still available.');
    if (error instanceof TypeError || error instanceof SyntaxError) throw new Error('The specimen service is unavailable or returned an invalid response. Local play is still available.');
    throw error;
  } finally { clearTimeout(timer); }
}

function shareLocations(result, id) {
  const url = new URL(result.url, location.origin);
  const qr = new URL(result.qrUrl, location.origin);
  if (!['http:', 'https:'].includes(url.protocol) || url.searchParams.get('specimen') !== id || qr.origin !== location.origin || qr.pathname !== `/api/specimens/${encodeURIComponent(id)}/qr.svg`) throw new Error('The server returned an invalid specimen link.');
  return { url: url.href, qr: qr.href };
}

async function waitForImage(image) {
  if (image.complete) {
    if (image.naturalWidth > 0) return;
    throw new Error('The QR image could not be loaded.');
  }
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { cleanup(); reject(new Error('The QR image did not load in time.')); }, 10000);
    const cleanup = () => { clearTimeout(timeout); image.onload = null; image.onerror = null; };
    image.onload = () => { cleanup(); resolve(); };
    image.onerror = () => { cleanup(); reject(new Error('The QR image could not be loaded.')); };
  });
}

function clearShare() {
  const token = shareLifecycle.invalidate();
  shareOpener = null;
  $('share-card').hidden = true;
  $('share-content').replaceChildren();
  $('share-status').textContent = '';
  $('print-card').classList.remove('preview');
  $('print-card').replaceChildren();
  for (const id of ['preview-card', 'print-shared', 'copy-link']) $(id).disabled = true;
  return token;
}

function scrollToPanel(panel) {
  panel.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start' });
}

async function prepareShare(specimen, opener) {
  const request = clearShare();
  shareOpener = { element: opener, specimenId: specimen.id };
  $('share-card').hidden = false;
  $('share-content').textContent = 'Saving the public specimen snapshot and preparing its QR…';
  $('share-status').textContent = '';
  $('print-shared').disabled = true;
  $('copy-link').disabled = true;
  $('share-title').focus({ preventScroll: true });
  scrollToPanel($('share-card'));
  try {
    const allowed = ['id','name','bodyPlanId','parentIds','birthEventId','genome','expression','lifeStage','rulesetVersion','artVersion'];
    const snapshot = Object.fromEntries(allowed.map(field => [field, specimen[field]]));
    const birthEvent = state.events.find(e => e.id === specimen.birthEventId);
    const response = await apiRequest('/api/specimens', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ specimen: snapshot, birthEvent }) });
    const links = shareLocations(response, specimen.id);
    if (!shareLifecycle.isCurrent(request)) return;
    $('share-content').innerHTML = `<div class="share-layout"><div><h3>Individual · ${escape(specimen.name)}</h3>${savedPortrait(specimen)}<p><strong>Family</strong> · ${familyLabel(specimen)}</p><p><strong>Expressed traits</strong><br>${escape(traits(specimen.expression))}</p><p><strong>Carried, unexpressed traits</strong><br>${carriedTraits(specimen)}</p></div><div><img id="share-qr" class="qr" src="${escape(links.qr)}" alt="QR link to this individual's read-only dossier"><p class="print-id">Individual ID: ${escape(specimen.id)}</p><p><a href="${escape(links.url)}" target="_blank" rel="noopener">Open this individual’s dossier</a></p></div></div>`;
    await waitForImage($('share-qr'));
    if (!shareLifecycle.isCurrent(request)) return;
    shareLifecycle.activate(request, { specimen, ...links });
    $('print-shared').disabled = false;
    $('preview-card').disabled = false;
    $('copy-link').disabled = false;
    $('share-status').textContent = 'QR loaded. This card identifies one individual. Even siblings with matching traits have different individual IDs.';
  } catch (error) {
    if (shareLifecycle.isCurrent(request)) $('share-status').textContent = `${error.message} Your local specimen is unchanged. Close this card and try again when the service is available.`;
  }
}

$('close-share').addEventListener('click', () => {
  const opener = shareOpener;
  clearShare();
  if (!opener) return;
  // Local play can rerender this nonmodal card's original collection button.
  // Resolve by its saved identity without putting an ID into a CSS selector.
  const currentButton = opener.element?.isConnected ? opener.element
    : [...$('collection').querySelectorAll('[data-print]')].find(button => button.dataset.print === opener.specimenId);
  (currentButton || $('collection-title')).focus();
});
$('copy-link').addEventListener('click', async () => {
  const handle = shareLifecycle.getActive();
  if (!handle) return;
  const share = handle.value;
  try {
    await navigator.clipboard.writeText(share.url);
    if (!shareLifecycle.isActive(handle)) return;
    $('share-status').textContent = 'Specimen link copied. The recipient must be able to reach this server.';
  } catch {
    if (!shareLifecycle.isActive(handle)) return;
    $('share-status').textContent = `Clipboard access was unavailable. Copy this link manually: ${share.url}`;
  }
});
async function preparePrint(preview = false) {
  const handle = shareLifecycle.getActive();
  if (!handle) return;
  const current = handle.value;
  $('print-shared').disabled = true;
  const specimen = current.specimen;
  $('print-card').innerHTML = `<h2>CRITTER LAB</h2><p>INDIVIDUAL · ${escape(specimen.name)}</p>${savedPortrait(specimen, true)}<p class="print-id">Individual ID: ${escape(specimen.id)}</p><p>Family · ${familyLabel(specimen)}</p><p>Expressed traits: ${traits(specimen.expression)}</p><p>Carried, unexpressed: ${carriedTraits(specimen)}</p><p>Parents: ${specimen.parentIds.map(escape).join(' + ')}</p><img class="qr" src="${escape(current.qr)}" alt="QR link to individual dossier"><p>READ-ONLY INDIVIDUAL LINK</p><p>by Dirty Pawz Press</p>`;
  try {
    await Promise.all([...$('print-card').querySelectorAll('img')].map(waitForImage));
    if (shareLifecycle.isActive(handle)) {
      if (preview) {
        $('print-card').classList.add('preview');
        scrollToPanel($('print-card'));
        $('share-status').textContent = 'Card preview ready: 72 mm layout with a 38 mm QR. Screen size depends on zoom and display scaling; physical print is unverified.';
      } else window.print();
    }
  } catch (error) {
    if (shareLifecycle.isActive(handle)) $('share-status').textContent = `Print paused: ${error.message}`;
  } finally {
    if (shareLifecycle.isActive(handle)) $('print-shared').disabled = false;
  }
}
$('print-shared').addEventListener('click', () => preparePrint());
$('preview-card').addEventListener('click', () => preparePrint(true));

function validateDossier(record, id) {
  const s = record?.specimen;
  if (record?.schemaVersion !== 1 || !s || s.id !== id || typeof s.bodyPlanId !== 'string' || !Array.isArray(s.parentIds) || s.parentIds.length !== 2 || !s.parentIds.every(x => typeof x === 'string') || !s.genome || !s.expression) throw new Error('The server returned an unsupported specimen record.');
  for (const [trait, pattern] of [['crown', /^[Cc]{2}$/], ['eyes', /^[Rr]{2}$/], ['pale', /^[Pp]{2}$/]]) {
    if (!pattern.test(s.genome[trait]) || typeof s.expression[trait] !== 'boolean') throw new Error('The specimen contains invalid genetics or expression data.');
  }
  if (typeof s.expression.sampleInfluenced !== 'boolean') throw new Error('The specimen contains invalid sample expression data.');
  return s;
}

function ancestryMarkup(record) {
  const ancestry = getAncestryView(record);
  if (!ancestry.available) {
    return `<section class="ancestry-panel"><h3>Saved ancestry unavailable</h3><p>${escape(ancestry.reason)}</p><p class="fine">The individual dossier remains viewable. Current starters are not substituted for missing history.</p></section>`;
  }
  const paleExplanation = ancestry.paleSource === 'sample-activation'
    ? 'This individual carries Pp: the sample activated its carried pale markings. Its inherited alleles were not rewritten.'
    : ancestry.paleSource === 'inherited'
      ? 'This individual inherited pp, so pale markings appear naturally. Pale appearance here is not a sample activation.'
      : 'Pale markings are not expressed in this individual. A sample does not guarantee that they appear.';
  return `
    <section class="ancestry-panel" aria-label="Saved ancestry comparison">
      <h3>How this individual inherited its traits</h3>
      <p>In these draft rules, each trait pair contains one inherited variant from each parent. This comparison uses the saved birth snapshots, not the current starters.</p>
      <table>
        <caption>Inherited variants / saved parent pair and offspring</caption>
        <thead><tr><th scope="col">Trait</th><th scope="col">Parent 1</th><th scope="col">Parent 2</th><th scope="col">This individual</th></tr></thead>
        <tbody>${ancestry.rows.map(row => `
          <tr><th scope="row">${escape(row.label)}</th><td>${escape(row.parentAAlleles)}</td><td>${escape(row.parentBAlleles)}</td><td>${escape(row.childAlleles)}</td></tr>
        `).join('')}</tbody>
      </table>
      <p class="fine">Draft variant key: C/c = crown/small frill; R/r = ringed/plain eyes; P/p = dark/pale markings. These codes describe inherited variants, not observed parental appearance.</p>
      <p><strong>Sample used:</strong> ${ancestry.sampleApplied ? 'Yes, the draft Mist Thread effect.' : 'No.'} ${paleExplanation}</p>
      <p>Alleles are stored in sorted pairs. Where either parent could supply a variant, the table does not establish its exact donor. Parent portraits, actual expression, and previous sample history are not shared.</p>
      <p class="fine">Parent 1: ${escape(ancestry.parents[0].id)}<br>Parent 2: ${escape(ancestry.parents[1].id)}<br>Saved family: ${familyLabel(ancestry.parents[0])}. Shared family does not mean the same individual.<br>Rules: ${escape(ancestry.rulesetVersion)}. This is a consistency check, not proof of ownership or provenance.</p>
    </section>
  `;
}

async function loadDossier(id) {
  $('dossier').hidden = false;
  $('local-lab').hidden = true;
  document.title = 'Shared individual — Critter Lab';
  $('dossier-status').textContent = 'Loading the shared individual…';
  $('dossier-content').setAttribute('aria-busy', 'true');
  $('notice').textContent = 'You are viewing a shared individual. Your own collection is unchanged; this view grants no ownership, rewards, or breeding permission.';
  try {
    if (!id || id.length > 200) throw new Error('This specimen link has an invalid identifier.');
    const response = await apiRequest(`/api/specimens/${encodeURIComponent(id)}`);
    const specimen = validateDossier(response.record, id);
    const labels = { crown: 'Frill', eyes: 'Eyes', pale: 'Markings' };
    $('dossier-content').innerHTML = `<div class="dossier-layout"><div>${portrait(specimen.expression)}<p class="fine">Reconstructed prototype art from the saved expression; the original portrait is not transferred.</p></div><div><h3>Individual · ${escape(specimen.name || 'Shared individual')}</h3><p class="print-id">Individual ID: ${escape(specimen.id)}</p><dl><dt>Family</dt><dd>${familyLabel(specimen)}</dd><dt>Parents</dt><dd>${specimen.parentIds.map(escape).join(' + ')}</dd><dt>Life stage</dt><dd>${escape(specimen.lifeStage)}</dd><dt>Expressed traits</dt><dd>${escape(traits(specimen.expression))}</dd><dt>Carried, unexpressed traits</dt><dd>${carriedTraits(specimen)}</dd></dl><table><caption>Saved genome / provisional allele notation</caption><thead><tr><th>Trait</th><th>Alleles</th></tr></thead><tbody>${Object.entries(labels).map(([key,label]) => `<tr><th scope="row">${label}</th><td>${escape(specimen.genome[key])}</td></tr>`).join('')}</tbody></table><p>Two siblings can share a family and matching traits while remaining different individuals with different IDs.</p><p class="fine">Rules: ${escape(specimen.rulesetVersion)}. Family ID: ${escape(specimen.bodyPlanId)}. This is a read-only snapshot, not a live care state.</p></div></div>`;
    $('dossier-content').insertAdjacentHTML('beforeend', ancestryMarkup(response.record));
    document.title = `${specimen.name || 'Shared individual'} — Shared dossier — Critter Lab`;
    $('dossier-status').textContent = 'Shared individual ready. This dossier is read-only.';
  } catch (error) {
    document.title = 'Shared individual unavailable — Critter Lab';
    $('dossier-status').textContent = 'The shared individual could not be loaded.';
    $('dossier-content').textContent = error.message;
  } finally {
    $('dossier-content').setAttribute('aria-busy', 'false');
  }
}

const incomingSpecimen = new URLSearchParams(location.search).get('specimen');
if (incomingSpecimen !== null) loadDossier(incomingSpecimen);
