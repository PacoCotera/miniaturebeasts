function freezeTree(value) {
  for (const child of Object.values(value)) {
    if (child && typeof child === 'object') freezeTree(child);
  }
  return Object.freeze(value);
}

export const fixtures = freezeTree({
  specimen: {
    id: 'fixture:specimen:014',
    shortId: '#014',
    family: 'FAMILY A',
    traits: ['CROWN FRILL', 'RINGED EYES'],
    position: '2 / 8',
    asset: 'critter',
  },
  research: {
    title: 'MIST THREAD',
    state: 'GROWING',
    finding: 'PALE PATTERN',
    progress: 2 / 3,
    asset: 'vessel',
  },
  family: {
    name: 'FAMILY A',
    characteristics: ['CROWN FRILL', 'CURLED TAIL'],
    asset: 'family',
  },
});
