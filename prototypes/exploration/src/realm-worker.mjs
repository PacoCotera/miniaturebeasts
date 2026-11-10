// Generator 7's realm, made off the page's thread (src/realm-store.mjs starts this as a module worker): a seed in, the realm and the Hollow Tree sites out (the two things the first cell would
// otherwise make on the page). They are plain data (typed arrays, sets, numbers), so they cross as they are. This file imports the generator and nothing of the page.
import { realm7 } from './gen7/region.mjs';
import { decorOf } from './gen7/place.mjs';

self.onmessage = e => {
  const seed = e.data && e.data.seed;
  try { const realm = realm7(seed); self.postMessage({ seed, realm, sites: decorOf(seed).hollowSites() }); } catch (err) { self.postMessage({ seed, error: String((err && err.message) || err) }); }
};
