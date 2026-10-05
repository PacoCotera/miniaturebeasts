import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const FORMAT_VERSION = 1;
const TEMPLATE_VERSION = 'pip-portrait-text-v1';
const ART_VERSION = 'pip-playtest-art-v1';
const CONTEXT = 'pip:adult-rested-firm-ground-mild-v1';
const CONTEXT_CLAIM = 'reference:pip-adult-rested-firm-ground-mild-v1';
const CONTEXT_TEXT = 'Reference: a healthy/rested adult on firm ground in mild conditions.';
const CAPTURE_HASH = '3eaf15277ab516785ef5960b35ddd4fd35a3f9d9cd76b1846038f3d2539c5f3e';
const SOURCE_URL = 'https://gemini.google.com/app/e6be3fc8ab8d7ee5';
const EXTRACTION_METHOD = 'Visible generated-image screenshot capture, rectangular extraction only. Full-size export unavailable. No redrawing. Provisional playtest artwork.';
const PORTRAITS = {
  'pip-reference-carried': {
    name: 'pip-carried',
    path: 'design/v1-pip/pip-carried.png',
    hash: '38b0fa7fc24ffea47cb128fdcaf46f701a2396bd3bfcbb81e3d86f962f262534',
    crop: [318, 144, 579, 433],
    description: 'Plain coat. Pale variation is carried without visible pale markings.',
  },
  'pip-reference-marked': {
    name: 'pip-marked',
    path: 'design/v1-pip/pip-marked.png',
    hash: '39336d1bf4f9cf540d1d5a1ed47a42ccc72fff02376eb98e7b88cf51d3859190',
    crop: [695, 144, 956, 433],
    description: 'Pale body markings are visible in the declared adult reference.',
  },
};
const IDENTITY_FIELDS = [
  'id', 'source_sample_id', 'art_id', 'art_version', 'original_art_sha256',
  'appearance_descriptor', 'reference_context', 'mapping_version', 'original_art_version',
];

export class RetainedJobError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'RetainedJobError';
    this.code = code;
  }
}
function requireCondition(condition, code, message) {
  if (!condition) throw new RetainedJobError(code, message);
}
function object(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function allowedKeys(value, keys, label) {
  requireCondition(object(value) && Object.keys(value).every(key => keys.includes(key)),
    'INVALID_REQUEST', `${label} contains unsupported fields.`);
}
function boundedText(value, maximum) {
  return typeof value === 'string' && value.length > 0 && value.length <= maximum &&
    !/[\u0000-\u001f\u007f]/u.test(value);
}
function hash(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (object(value)) return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
function fingerprint(value) { return hash(JSON.stringify(canonical(value))); }

/* Only this native projection is accepted. Mutable visit/freshness fields are
 * recognized, but never made part of a portrait or description identity. */
function immutableInput(request) {
  allowedKeys(request, ['request_id', 'resident_snapshot', 'claim_ids'], 'Request');
  requireCondition(boundedText(request.request_id, 128), 'INVALID_REQUEST', 'A stable request_id is required.');
  allowedKeys(request.resident_snapshot,
    ['count', 'current', 'visit_available', 'world_revision', 'updated_at', 'selected'], 'Resident snapshot');
  for (const field of ['count', 'world_revision', 'updated_at']) {
    const value = request.resident_snapshot[field];
    if (value !== undefined)
      requireCondition(Number.isSafeInteger(value) && value >= 0,
        'INVALID_REQUEST', `Invalid mutable snapshot ${field}.`);
  }
  for (const field of ['current', 'visit_available']) {
    const value = request.resident_snapshot[field];
    if (value !== undefined)
      requireCondition(typeof value === 'boolean', 'INVALID_REQUEST', `Invalid mutable snapshot ${field}.`);
  }
  const selected = request.resident_snapshot.selected;
  allowedKeys(selected, [...IDENTITY_FIELDS, 'visits'], 'Selected resident');
  for (const field of IDENTITY_FIELDS)
    requireCondition(boundedText(selected[field], field === 'original_art_sha256' ? 64 : 128),
      'INVALID_REQUEST', `Selected resident needs ${field}.`);
  if (selected.visits !== undefined)
    requireCondition(Number.isInteger(selected.visits) && selected.visits >= 0 && selected.visits <= 255,
      'INVALID_REQUEST', 'Invalid mutable visit count.');
  const portrait = Object.hasOwn(PORTRAITS, selected.appearance_descriptor)
    ? PORTRAITS[selected.appearance_descriptor] : undefined;
  requireCondition(portrait && selected.art_id === portrait.path &&
    selected.original_art_sha256 === portrait.hash && selected.art_version === ART_VERSION &&
    selected.original_art_version === ART_VERSION && selected.reference_context === CONTEXT &&
    ['pip-proof-map-v1', 'pip-discovery-map-v1'].includes(selected.mapping_version),
  'UNSUPPORTED_PORTRAIT', 'Descriptor, original path/hash, versions or reference context do not agree.');
  const expectedClaims = [`appearance:${selected.appearance_descriptor}`, CONTEXT_CLAIM].sort();
  requireCondition(Array.isArray(request.claim_ids) && request.claim_ids.length === 2 &&
    request.claim_ids.every(claim => typeof claim === 'string') &&
    JSON.stringify([...request.claim_ids].sort()) === JSON.stringify(expectedClaims),
  'UNSUPPORTED_CLAIM', 'Only this portrait descriptor and its declared reference claim are supported.');
  return {
    request_id: request.request_id,
    resident_snapshot: { selected: Object.fromEntries(IDENTITY_FIELDS.map(field => [field, selected[field]])) },
    claim_ids: expectedClaims,
  };
}
function descriptionFor(input) {
  return `${PORTRAITS[input.resident_snapshot.selected.appearance_descriptor].description}\n${CONTEXT_TEXT}`;
}
async function regularBytes(filename, code, limit) {
  try {
    const stat = await fs.lstat(filename);
    requireCondition(stat.isFile() && !stat.isSymbolicLink() && stat.size <= limit,
      code, 'Expected a bounded regular artifact file.');
    return await fs.readFile(filename);
  } catch (error) {
    if (error instanceof RetainedJobError) throw error;
    throw new RetainedJobError(code, 'Required artifact is missing or unavailable.');
  }
}
async function sourcePortrait(input) {
  const portrait = PORTRAITS[input.resident_snapshot.selected.appearance_descriptor];
  const manifestBytes = await regularBytes(path.join(PROJECT_ROOT, 'design/v1-pip/manifest.json'),
    'SOURCE_UNAVAILABLE', 64 * 1024);
  let manifest;
  try { manifest = JSON.parse(manifestBytes.toString('utf8')); }
  catch { throw new RetainedJobError('SOURCE_UNAVAILABLE', 'Original provenance manifest is unreadable.'); }
  const asset = manifest.assets?.find(entry => entry.name === portrait.name);
  requireCondition(manifest.source === SOURCE_URL && manifest.sourceSha256 === CAPTURE_HASH &&
    manifest.method === EXTRACTION_METHOD && asset?.sha256 === portrait.hash &&
    JSON.stringify(asset.crop) === JSON.stringify(portrait.crop),
  'SOURCE_UNAVAILABLE', 'Original manifest no longer matches the pinned reference.');
  const bytes = await regularBytes(path.join(PROJECT_ROOT, portrait.path), 'SOURCE_UNAVAILABLE', 2 * 1024 * 1024);
  requireCondition(hash(bytes) === portrait.hash, 'SOURCE_UNAVAILABLE', 'Original portrait hash does not match.');
  return { bytes, provenance: {
    provider: 'Gemini', source_url: manifest.source, source_capture_sha256: manifest.sourceSha256,
    extraction_method: manifest.method, crop: portrait.crop,
    original_path: portrait.path, original_sha256: portrait.hash,
    resolver: 'approved-original-copy-v1', description_mode: 'controlled-claims-v1', model_call: false,
  } };
}

/* Replay has no source/manifest access and performs no writes. An accepted job
 * remains usable offline; missing/corrupt outputs are reported, not replaced. */
export async function replayRetainedJob(jobDirectory) {
  const jobDir = path.resolve(jobDirectory);
  let directory;
  try { directory = await fs.lstat(jobDir); }
  catch { throw new RetainedJobError('MISSING_ARTIFACT', 'Saved job directory is unavailable.'); }
  requireCondition(directory.isDirectory() && !directory.isSymbolicLink(),
    'CORRUPT_JOB', 'Saved job must be a regular directory.');
  const manifestBytes = await regularBytes(path.join(jobDir, 'result.json'), 'MISSING_ARTIFACT', 64 * 1024);
  let result;
  try { result = JSON.parse(manifestBytes.toString('utf8')); }
  catch { throw new RetainedJobError('CORRUPT_JOB', 'Saved result metadata is unreadable.'); }
  requireCondition(object(result) && result.format_version === FORMAT_VERSION &&
    result.template_version === TEMPLATE_VERSION && result.purpose === 'retained-individual-portrait',
  'CORRUPT_JOB', 'Unsupported saved result format.');
  const { integrity_sha256: integrity, ...payload } = result;
  requireCondition(fingerprint(payload) === integrity, 'CORRUPT_JOB', 'Saved metadata integrity check failed.');
  let input;
  try { input = immutableInput(result.input); }
  catch { throw new RetainedJobError('CORRUPT_JOB', 'Saved input is not a permitted resident projection.'); }
  const portrait = PORTRAITS[input.resident_snapshot.selected.appearance_descriptor];
  requireCondition(path.basename(jobDir) === hash(input.request_id) &&
    fingerprint(input) === result.input_sha256 && fingerprint(input) === fingerprint(result.input) &&
    result.description === descriptionFor(input) &&
    result.provenance?.source_url === SOURCE_URL && result.provenance.source_capture_sha256 === CAPTURE_HASH &&
    result.provenance.original_path === portrait.path && result.provenance.original_sha256 === portrait.hash &&
    result.provenance.provider === 'Gemini' && result.provenance.extraction_method === EXTRACTION_METHOD &&
    JSON.stringify(result.provenance.crop) === JSON.stringify(portrait.crop) &&
    result.provenance.resolver === 'approved-original-copy-v1' &&
    result.provenance.description_mode === 'controlled-claims-v1' &&
    result.provenance.model_call === false,
  'CORRUPT_JOB', 'Saved identity, controlled text or original provenance no longer agrees.');
  for (const [name, filename] of [['portrait', 'portrait.png'], ['description', 'description.txt']]) {
    const artifact = result.artifacts?.[name];
    requireCondition(artifact?.file === filename && Number.isInteger(artifact.bytes) && artifact.bytes > 0,
      'CORRUPT_JOB', 'Unsupported artifact record.');
    const bytes = await regularBytes(path.join(jobDir, filename), 'MISSING_ARTIFACT', 2 * 1024 * 1024);
    requireCondition(bytes.length === artifact.bytes && hash(bytes) === artifact.sha256,
      'CORRUPT_JOB', `Retained ${name} integrity check failed.`);
    if (name === 'portrait')
      requireCondition(artifact.sha256 === portrait.hash, 'CORRUPT_JOB', 'Retained portrait is not the approved original.');
    else
      requireCondition(bytes.equals(Buffer.from(`${result.description}\n`)),
        'CORRUPT_JOB', 'Retained description does not match its accepted text.');
  }
  return result;
}

export async function resolveRetainedJob(request, outputDirectory) {
  const input = immutableInput(request);
  const root = path.resolve(outputDirectory);
  const folder = hash(input.request_id);
  const jobDir = path.join(root, folder);
  async function existing() {
    const result = await replayRetainedJob(jobDir);
    requireCondition(result.input_sha256 === fingerprint(input),
      'INPUT_CONFLICT', 'This request_id already has different immutable inputs.');
    return { job_dir: jobDir, reused: true, result };
  }
  try {
    await fs.lstat(jobDir);
    return await existing();
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const { bytes: portrait, provenance } = await sourcePortrait(input);
  const description = descriptionFor(input);
  const text = Buffer.from(`${description}\n`);
  const payload = {
    format_version: FORMAT_VERSION, purpose: 'retained-individual-portrait', template_version: TEMPLATE_VERSION,
    input, input_sha256: fingerprint(input), description, provenance,
    artifacts: {
      portrait: { file: 'portrait.png', bytes: portrait.length, sha256: hash(portrait) },
      description: { file: 'description.txt', bytes: text.length, sha256: hash(text) },
    },
  };
  const result = { ...payload, integrity_sha256: fingerprint(payload) };
  await fs.mkdir(root, { recursive: true });
  const temporary = path.join(root, `.pending-${folder}-${randomUUID()}`);
  await fs.mkdir(temporary);
  try {
    await fs.writeFile(path.join(temporary, 'portrait.png'), portrait, { flag: 'wx' });
    await fs.writeFile(path.join(temporary, 'description.txt'), text, { flag: 'wx' });
    await fs.writeFile(path.join(temporary, 'result.json'), `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
    try { await fs.rename(temporary, jobDir); }
    catch (error) {
      if (!['EEXIST', 'ENOTEMPTY'].includes(error.code)) throw error;
      return await existing();
    }
    return { job_dir: jobDir, reused: false, result: await replayRetainedJob(jobDir) };
  } finally {
    // Remove only this generated sibling. Caller input never supplies its name.
    requireCondition(path.dirname(temporary) === root && path.basename(temporary).startsWith(`.pending-${folder}-`),
      'INVALID_REQUEST', 'Temporary job path escaped the requested output directory.');
    await fs.rm(temporary, { recursive: true, force: true });
  }
}

async function cli() {
  const [command, first, second, ...extra] = process.argv.slice(2);
  requireCondition(!extra.length && ((command === 'resolve' && first && second) ||
    (command === 'replay' && first && !second)), 'USAGE',
  'Usage: node retained-job.mjs resolve REQUEST_JSON OUTPUT_DIR | replay JOB_DIR');
  if (command === 'resolve') {
    let request;
    try { request = JSON.parse((await regularBytes(path.resolve(first), 'INVALID_REQUEST', 64 * 1024)).toString('utf8')); }
    catch (error) {
      if (error instanceof RetainedJobError) throw error;
      throw new RetainedJobError('INVALID_REQUEST', 'Request JSON is unreadable.');
    }
    return resolveRetainedJob(request, second);
  }
  return { job_dir: path.resolve(first), reused: true, result: await replayRetainedJob(first) };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  cli().then(result => console.log(JSON.stringify(result))).catch(error => {
    console.error(JSON.stringify({ error: error.message, code: error.code ?? 'JOB_UNAVAILABLE' }));
    process.exitCode = 1;
  });
}
