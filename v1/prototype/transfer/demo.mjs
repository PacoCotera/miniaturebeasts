import { mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { initialProbe } from './probe.mjs';
import { initialLab } from './lab.mjs';
import { firstCargo } from './fixtures.mjs';
import { simulator } from './simulator.mjs';

if (process.argv.length !== 3) throw new Error('Usage: node prototype/transfer/demo.mjs <new-snapshot-directory>');
const directory = resolve(process.argv[2]);
await mkdir(directory); // Refuse an existing directory; never reset an old save.
const paths = [join(directory, 'probe.json'), join(directory, 'lab.json')];
let session = simulator(...paths);
await session.probeStore.create(initialProbe('PROBE', firstCargo, ['TRIP_A']));
await session.labStore.create(initialLab('LAB'));

async function report(label) {
  const probe = await session.probeStore.read();
  const lab = await session.labStore.read();
  console.log(JSON.stringify({
    step: label,
    probePhase: probe.transfers[0]?.phase ?? 'gathering',
    probeCargoEmpty: probe.cargo.samples.length === 0 && probe.cargo.resources.length === 0,
    labReceiptConfirmed: lab.receipts[0]?.confirmed ?? false,
    labSamples: lab.inventory.samples.length,
    labResourceLots: lab.inventory.resources.length,
    queued: session.queued().map(item => item.type),
  }));
}

await session.act({ type: 'seal', transferId: 'HAUL_A', destination: 'LAB' });
await report('Probe sealed the whole haul');
await session.deliver();
await report('Lab durably received the haul');
await session.deliver();
await report('Probe durably cleared its cargo');
await session.deliver();
await report('Lab confirmed clearance of this haul');
session.drop();
session = simulator(...paths); // Discard every runtime object and the transport queue.
await session.resume();
await session.drain();
await report('Lost completion recovered from saved facts; probe can gather again');
console.log('Fixture snapshots: ' + directory);
