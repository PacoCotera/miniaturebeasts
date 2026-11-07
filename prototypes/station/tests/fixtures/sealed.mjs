// The frames of version 8 carry no sealed chapter (release 21a: the language writes none), but the rules for a sealed chapter stay in the Station (state.mjs, library.mjs, guide, cross). The tests that exercise them
// seal a chapter of a v8 frame here, as the earlier frames of those kinds did: S02 Character, S09 Movement, S11 and S15 Stamina, S16 Charge. A copy: the frame on disk is untouched.
export const SEALS = {
  S02: { character: ["a vybronic crystal, dug up where an Untuva partner sniffs out a buried pod", "crystal"] },
  S09: { movement: ["a tide pearl", "pearl"] },
  S11: { stamina: ["a storm-glass shard", "shard"] },
  S15: { stamina: ["a storm-glass shard", "shard"] },
  S16: { charge: ["a storm-glass shard", "shard"] },
};
export const sealedFrame = (frame, seals = SEALS[frame.species.id]) => {
  if (!seals) return frame;
  return {
    ...frame,
    sealed: { ...(frame.sealed ?? {}), ...Object.fromEntries(Object.entries(seals).map(([ch, [w]]) => [ch, w])) },
    chapters: frame.chapters.map((ch) => (seals[ch.id] ? { id: ch.id, name: ch.name, sealed: true, opensWith: seals[ch.id][0], findKind: seals[ch.id][1], traits: ch.traits } : ch)),
  };
};
export const withSeals = (frames) => frames.map((f) => sealedFrame(f));
