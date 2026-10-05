import { repository } from './repository.mjs';
import { validateProbe, transitionProbe, resumeProbe } from './probe.mjs';
import { validateLab, transitionLab, resumeLab } from './lab.mjs';
import { validateMessage } from './manifest.mjs';

export function simulator(probeFile, labFile, { probe = {}, lab = {}, transportFault = async () => {} } = {}) {
  const probeStore = repository(probeFile, validateProbe, probe);
  const labStore = repository(labFile, validateLab, lab);
  const queue = [];
  async function send(messages) {
    for (const outgoing of messages) {
      await transportFault('before-send', outgoing);
      queue.push(structuredClone(outgoing));
      await transportFault('after-send', outgoing);
    }
  }
  async function act(event) {
    const result = await probeStore.transact(state => transitionProbe(state, event));
    await send(result.messages);
    return result.state;
  }
  async function deliver(index = 0) {
    if (!queue[index]) throw new Error('No queued message');
    const incoming = queue.splice(index, 1)[0];
    await transportFault('before-delivery', incoming);
    const store = ['offer', 'cleared'].includes(incoming.type) ? labStore : probeStore;
    const transition = store === labStore ? transitionLab : transitionProbe;
    const result = await store.transact(state => transition(state, { type: 'receive', message: incoming }));
    await transportFault('after-delivery', incoming);
    await send(result.messages);
    return incoming;
  }
  async function resume() {
    await send(resumeProbe(await probeStore.read()));
    await send(resumeLab(await labStore.read()));
  }
  async function drain(limit = 100) {
    for (let count = 0; queue.length; count++) {
      if (count >= limit) throw new Error('Transport did not settle within bounded delivery');
      await deliver();
    }
  }
  return {
    probeStore, labStore, act, deliver, resume, drain,
    queued: () => structuredClone(queue),
    drop(index = 0) { queue.splice(index, 1); },
    duplicate(index = 0) {
      if (!queue[index]) throw new Error('No queued message');
      queue.push(structuredClone(queue[index]));
    },
    enqueue(incoming) { validateMessage(incoming); queue.push(structuredClone(incoming)); },
  };
}
