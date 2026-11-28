// The dusk, night and dawn cards: each is the art director's signed painting, 450 x 600 (the Companion's whole frame, drawn 1:1 and never redrawn),
// with a loop of four frames made from its own pixels (card-motion.mjs).
import { cardFrames, rgbaOf } from "./card-motion.mjs";

export const NIGHT_CARDS = { dusk: { file: 'art/cards/dusk-card-450x600.png' }, night: { file: 'art/cards/night-card-450x600.png' }, dawn: { file: 'art/cards/dawn-card-450x600.png' } };
export const CARD_ART = {};   // kind -> the file's canvas, as loaded
export const CARD_LOOP = {};   // kind -> the loop's 4 frames (canvases), beside the still

// pixels(url): the page's reader of a picture file ({ width, height, data }). All three cards load or none shows: without its picture a card's line stays in the message box.
export async function loadCardArt(pixels) {
  try {
    if (typeof Image === 'undefined') return;   // no pictures off the browser
    for (const [k, c] of Object.entries(NIGHT_CARDS)) {
      const px = await pixels(new URL(c.file, location.href).href);
      if (px.width !== 450 || px.height !== 600) throw new Error('card art ' + k);
      const cv = document.createElement('canvas'); cv.width = 450; cv.height = 600;
      cv.getContext('2d').drawImage(await createImageBitmap(new ImageData(px.data, 450, 600), { premultiplyAlpha: 'none', colorSpaceConversion: 'none' }), 0, 0);
      CARD_ART[k] = cv;
      try { CARD_LOOP[k] = cardFrames(k, px.data).map(a => { const f = document.createElement('canvas'); f.width = 450; f.height = 600; f.getContext('2d').putImageData(new ImageData(rgbaOf(a), 450, 600), 0, 0); return f; }); } catch (e) { console.warn('card motion off for ' + k, e); }
    }
  } catch (e) { for (const k in CARD_ART) delete CARD_ART[k]; console.warn('a card did not load; the message-box line stays', e); }
}
