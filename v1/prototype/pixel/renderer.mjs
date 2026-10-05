import { glyphFor } from './font.mjs';
import { assets } from './assets.mjs';

export const palettes = Object.freeze({
  color: Object.freeze(['#F3EBD5', '#252C32', '#63A79B', '#D2C980', '#D57843', '#ACC7B0', '#FFFFFF', '#677984']),
  mono: Object.freeze(['#FFFFFF', '#000000']),
});

export function createSurface(width = 320, height = 240, palette = palettes.color) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new RangeError('Invalid dimensions');
  }
  const pixels = new Uint8Array(width * height);

  function pixel(x, y, color) {
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= width || y >= height) {
      throw new RangeError('Pixel outside surface');
    }
    if (!Number.isInteger(color) || color < 0 || color >= palette.length) {
      throw new RangeError('Invalid palette index');
    }
    pixels[y * width + x] = color;
  }

  function rect(x, y, rectangleWidth, rectangleHeight, color) {
    for (let row = y; row < y + rectangleHeight; row++) {
      for (let column = x; column < x + rectangleWidth; column++) {
        pixel(column, row, color);
      }
    }
  }

  function text(value, x, y, maxCells = 22, color = 1) {
    if (value.length > maxCells) {
      throw new RangeError('Text exceeds region');
    }
    let characterIndex = 0;
    for (const character of value) {
      const glyph = glyphFor(character);
      for (let row = 0; row < glyph.length; row++) {
        for (let column = 0; column < glyph[row].length; column++) {
          if (glyph[row][column] === '1') {
            pixel(x + characterIndex * 6 + column, y + row, color);
          }
        }
      }
      characterIndex++;
    }
  }
  return { width, height, palette, pixels, pixel, rect, text };
}

export function renderScene(scene, view, profile = 'color') {
  const titles = { specimen: 'COLLECTION', research: 'RESEARCH', family: 'FAMILY GUIDE' };
  if (!Object.hasOwn(titles, scene)) throw new RangeError('Unknown scene');
  if (!Object.hasOwn(palettes, profile)) throw new RangeError('Unknown display profile');
  const rows = scene === 'specimen' ? view.traits : scene === 'family' ? view.characteristics : [];
  if (!Array.isArray(rows) || rows.length > 2) {
    throw new RangeError('Main scene allows at most two trait rows');
  }
  const surface = createSurface(320, 240, palettes[profile]);
  const { rect, text, pixel } = surface;
  const accent = profile === 'mono' ? 1 : 4;
  rect(8, 8, 304, 16, 1);
  text(titles[scene], 14, 12, 48, 0);

  const sprite = assets[view.asset];
  if (!sprite) throw new RangeError('Unknown asset');
  for (let index = 0; index < sprite.pixels.length; index++) {
    const value = sprite.pixels[index];
    if (value < 0) continue;
    // Monochrome keeps contours/markings black and body fills white.
    const color = profile === 'mono' ? (value === 1 || value === 4 ? 1 : 0) : value;
    rect(24 + (index % 64) * 2, 48 + Math.floor(index / 64) * 2, 2, 2, color);
  }

  if (scene === 'specimen') {
    text(`INDIVIDUAL ${view.shortId}`, 176, 40);
    text('FAMILY', 176, 64);
    text(view.family, 176, 76);
    text('EXPRESSED', 176, 92);
    view.traits.forEach((trait, index) => {
      rect(176, 113 + index * 24, 4, 4, accent);
      text(trait, 184, 112 + index * 24, 21);
    });
    text(view.position, 16, 192);
  } else if (scene === 'research') {
    text(view.title, 176, 40);
    text(view.state, 176, 64);
    text(view.finding, 176, 100);
    if (view.progress !== null) {
      if (!Number.isFinite(view.progress) || view.progress < 0 || view.progress > 1) {
        throw new RangeError('Invalid progress');
      }
      rect(24, 184, 128, 8, 1);
      rect(26, 186, 124, 4, 0);
      rect(26, 186, Math.floor(124 * view.progress), 4, accent);
    }
  } else {
    text('FAMILY', 176, 40);
    text(view.name, 176, 52);
    view.characteristics.forEach((trait, index) => text(trait, 176, 88 + index * 24));
    text('FAMILY ENTRY', 16, 192);
  }

  const actions = {
    specimen: ['BACK', 'INSPECT', 'NEXT'],
    research: ['BACK', 'EVIDENCE', 'FORECAST'],
    family: ['BACK', 'READ', 'NEXT'],
  }[scene];
  actions.forEach((label, index) => {
    const x = 8 + index * 104;
    rect(x, 216, 96, 16, index === 1 ? 1 : 0);
    if (index !== 1) {
      rect(x, 216, 96, 1, 1);
      rect(x, 231, 96, 1, 1);
      pixel(x, 223, 1);
      pixel(x + 95, 223, 1);
    }
    text(label, x + Math.floor((96 - (label.length * 6 - 1)) / 2), 220, 16, index === 1 ? 0 : 1);
  });
  return {
    width: surface.width,
    height: surface.height,
    palette: surface.palette,
    pixels: surface.pixels,
    damage: [{ x: 0, y: 0, width: 320, height: 240 }],
  };
}
