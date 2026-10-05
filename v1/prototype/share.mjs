// Public local-review records. Consistency is not authentication or progression proof.
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, link, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import QRCode from 'qrcode';
import { inherit, validateParent, BODY_PLAN_ID, RULESET_VERSION } from './genetics.mjs';
export class ShareError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
const check = (condition, message) => { if (!condition) throw new ShareError(message); };
export const validId = value => typeof value === 'string' && /^[A-Za-z0-9:_-]{1,160}$/.test(value);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const genome = v => ({ crown: v?.crown, eyes: v?.eyes, pale: v?.pale });
const expression = v => {
  check(v && ['crown', 'eyes', 'pale', 'sampleInfluenced'].every(k => typeof v[k] === 'boolean'), 'Invalid expression');
  return { crown: v.crown, eyes: v.eyes, pale: v.pale, sampleInfluenced: v.sampleInfluenced };
};
const parent = v => {
  check(validId(v?.id), 'Invalid parent identity');
  const output = { id: v.id, bodyPlanId: v.bodyPlanId, genome: genome(v.genome) };
  try { validateParent(output); } catch { throw new ShareError('Invalid parent genome'); }
  return output;
};
/** Select public fields; no owner, reward, permission, original art, or sensor payloads. */
export function publicSnapshot(input) {
  const child = input?.specimen, event = input?.birthEvent, req = event?.request;
  check(child && event && req && validId(child.id) && validId(event.id), 'Missing specimen or birth event');
  check(typeof child.name === 'string' && child.name.length > 0 && child.name.length <= 80 && !/[<>\x00-\x1f]/.test(child.name), 'Invalid specimen name');
  check(event.status === 'hatched' && event.offspringId === child.id && child.id === `specimen:${event.id}` && child.birthEventId === event.id, 'Inconsistent birth identity');
  check(child.bodyPlanId === BODY_PLAN_ID && child.rulesetVersion === RULESET_VERSION && ['draft-svg-1', 'draft-svg-2'].includes(child.artVersion) && child.lifeStage === 'hatchling', 'Unsupported specimen version');
  check(Array.isArray(req.parentSnapshots) && req.parentSnapshots.length === 2, 'Two parent snapshots required');
  const parents = req.parentSnapshots.map(parent);
  check(same(child.parentIds, parents.map(p => p.id)) && same(event.parentIds, child.parentIds), 'Inconsistent lineage');
  check(typeof req.seed === 'string' && req.seed.length > 0 && req.seed.length <= 160 && event.seed === req.seed && event.sampleId === req.sampleId, 'Invalid birth inputs');
  check(req.sampleId === null || validId(req.sampleId), 'Invalid sample reference');
  let resolved;
  try { resolved = inherit(...parents, { seed: req.seed, withSample: req.sampleId !== null, rulesetVersion: req.rulesetVersion, randomVersion: req.randomVersion }); } catch { throw new ShareError('Unsupported birth rules'); }
  check(same(genome(child.genome), resolved.genome) && same(expression(child.expression), resolved.expression) && same(genome(event.resolved?.genome), resolved.genome) && same(expression(event.resolved?.expression), resolved.expression) && event.resolved.activation === resolved.activation, 'Birth result does not match its inputs');
  const effect = req.sampleId === null ? null : 'draft:mist-expression:1';
  if (effect) check(event.sampleSnapshot?.id === req.sampleId && event.sampleSnapshot?.effectVersion === effect, 'Unsupported sample effect');
  return { schemaVersion: 1,
    specimen: { id: child.id, name: child.name, bodyPlanId: BODY_PLAN_ID, parentIds: parents.map(p => p.id), birthEventId: event.id, genome: resolved.genome, expression: resolved.expression, lifeStage: child.lifeStage, rulesetVersion: req.rulesetVersion, artVersion: child.artVersion },
    birth: { id: event.id, parentSnapshots: parents, seed: req.seed, rulesetVersion: req.rulesetVersion, randomVersion: req.randomVersion, sampleEffectVersion: effect, resolved },
  };
}
const recordPath = (directory, id) => join(directory, `${createHash('sha256').update(id).digest('hex')}.json`);
export async function readPublicRecord(directory, id) {
  check(validId(id), 'Invalid specimen ID');
  try { return JSON.parse(await readFile(recordPath(directory, id), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') throw new ShareError('Specimen not found', 404); throw error; }
}
/** Atomic no-overwrite publication: link a completed temporary file into place. */
export async function publishRecord(directory, input) {
  const record = publicSnapshot(input);
  await mkdir(directory, { recursive: true });
  const path = recordPath(directory, record.specimen.id), temp = join(directory, `.pending-${randomUUID()}.json`);
  await writeFile(temp, JSON.stringify(record), { flag: 'wx', flush: true });
  try {
    try { await link(temp, path); return { record, created: true }; }
    catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const existing = await readPublicRecord(directory, record.specimen.id);
      if (!same(existing, record)) throw new ShareError('Specimen ID already has a different public snapshot', 409);
      return { record: existing, created: false };
    }
  } finally { await unlink(temp); }
}
export function publicLinks(record, origin) {
  const url = new URL('/', origin); url.searchParams.set('specimen', record.specimen.id);
  return { record, url: url.href, qrUrl: `/api/specimens/${encodeURIComponent(record.specimen.id)}/qr.svg` };
}
export function qrSvg(url) { return QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'M', margin: 4 }); }
