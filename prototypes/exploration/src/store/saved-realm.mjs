// The stored save's realm, read without loading the save (persistence): boot asks for it so the realm can be made off the page while the page starts.

// The seed of the realm a stored save plays (generator 7). `read(key)` gives the stored bytes; `keys` are tried in order and the first that holds a save answers.
// null for no save, another generator, or bytes that cannot be read: load() is the one that says what is wrong with a save.
export function savedRealmSeed(read, keys) {
  try {
    let raw = null; for (const k of keys) { raw = read(k); if (raw != null) break; }
    const s = raw && JSON.parse(raw), r = s && Array.isArray(s.regions) && s.regions[0];
    return r && r.gen === 7 && typeof r.seed === 'number' ? r.seed : null;
  } catch (e) { return null; }
}
