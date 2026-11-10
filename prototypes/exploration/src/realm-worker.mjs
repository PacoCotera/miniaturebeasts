// Generator 7's realm, made off the page's thread (src/realm-store.mjs starts this as a module worker): a seed in, the realm out. The realm is plain data (typed arrays, sets, numbers), so it
// crosses as it is. This file imports the generator and nothing of the page.
import { realm7 } from './gen7/region.mjs';

self.onmessage = e => {
  const seed = e.data && e.data.seed;
  try { self.postMessage({ seed, realm: realm7(seed) }); } catch (err) { self.postMessage({ seed, error: String((err && err.message) || err) }); }
};
