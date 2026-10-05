// Small authored placeholder artwork; not production creature assets.
export const ART_VERSION = 'draft-svg-2';
export function portrait(expression = {}, mono = false) {
  const ink = '#303a36';
  const body = mono ? '#fff' : expression.pale ? '#d9e9d8' : '#79a69a';
  const frill = mono ? '#aaa' : '#d8895d';
  const markingOutline = mono && expression.pale ? ` stroke="${ink}" stroke-width="1.5"` : '';
  const crown = expression.crown
    ? `<path d="M83 83 58 39 83 52 95 25 105 60 121 38 123 82M153 83 179 39 153 52 143 25 134 60 118 38" fill="${frill}" stroke="${ink}" stroke-width="5" stroke-linejoin="round"/>`
    : `<path d="m78 85-23-21 5 29 25 12m67-20 23-21-5 29-25 12" fill="${frill}" stroke="${ink}" stroke-width="5" stroke-linejoin="round"/>`;
  return `<svg viewBox="0 0 240 210" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Placeholder critter: ${expression.crown ? 'crown frill' : 'small frill'}, ${expression.eyes ? 'ringed' : 'plain'} eyes, ${expression.pale ? 'pale' : 'dark'} markings"><ellipse cx="120" cy="184" rx="83" ry="10" fill="${mono ? '#ddd' : '#d9d4bd'}"/>${crown}<path d="M142 143q60 28 58-35 31 65-42 71" fill="${body}" stroke="${ink}" stroke-width="5"/><path d="M91 118q-21 22-13 47l-12 16q8 10 30 0l10-16h21l13 17q22 6 25-4l-17-22q1-36-22-43" fill="${body}" stroke="${ink}" stroke-width="5" stroke-linejoin="round"/><path d="M67 103q-5-39 45-40 56-4 62 35 0 32-55 33-45 0-52-28Z" fill="${body}" stroke="${ink}" stroke-width="5"/>${expression.eyes ? `<circle cx="89" cy="99" r="13" fill="white" stroke="${ink}" stroke-width="3"/><circle cx="150" cy="97" r="11" fill="white" stroke="${ink}" stroke-width="3"/>` : ''}<circle cx="90" cy="99" r="7" fill="${ink}"/><circle cx="150" cy="97" r="6" fill="${ink}"/><circle cx="92" cy="96" r="2" fill="white"/><path d="m110 113 8 3 8-4" fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round"/><path d="m107 142 7-6 8 8-8 7Zm-10 14 5-3 4 5-5 4Z" fill="${expression.pale ? '#fff' : ink}"${markingOutline}/><path d="m184 164 5-6 4 4-4 5Z" fill="${expression.pale ? '#fff' : ink}"${markingOutline}/></svg>`;
}
