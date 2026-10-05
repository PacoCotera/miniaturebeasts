import { createSurface, palettes } from '../pixel/renderer.mjs';
import { assets } from '../pixel/assets.mjs';
import { findingAssets } from './finding-assets.mjs';

export function renderLab(view, profile = 'color') {
  const surface = createSurface(320, 240, palettes[profile]);
  const { rect, text } = surface;
  rect(8, 8, 304, 16, 1);
  text(view.title, 14, 12, 48, 0);
  if (view.asset) {
    const sprite = assets[view.asset] ?? findingAssets[view.asset];
    const scale = view.inspection ? 1 : 2;
    const left = view.inspection ? 16 : 24;
    const top = view.inspection ? 40 : 48;
    for (let index = 0; index < sprite.pixels.length; index++) {
      const value = sprite.pixels[index];
      if (value < 0) continue;
      const color = profile === 'mono' ? (value === 1 || value === 4 ? 1 : 0) : value;
      rect(left + index % 64 * scale, top + Math.floor(index / 64) * scale, scale, scale, color);
    }
  }
  if (view.inspection) text(view.shortId, 16, 112, 14);
  if (view.choices.length) {
    view.choices.forEach((label, index) => {
      const y = view.inspection ? 40 + index * 32 : 64 + index * 36;
      const x = view.inspection ? 104 : 16;
      const width = view.inspection ? 208 : 288;
      if (view.focus === index) {
        rect(x, y, width, 24, 1);
        rect(x + 2, y + 2, width - 4, 20, 0);
        rect(x + 6, y + 8, 2, 7, 1);
        rect(x + 8, y + 10, 2, 3, 1);
      }
      text(label, x + 18, y + 8, view.inspection ? 30 : 44);
    });
    if (view.lines[0]) text(view.lines[0], 16, 176, 46);
  } else if (view.detailLines.length) {
    view.detailLines.forEach((line, index) => text(line.toUpperCase(), 16, 40 + index * 12, 48));
  } else {
    view.lines.forEach((line, index) => text(line, 176, 40 + index * 24, 22));
  }
  if (view.pageNumber) text(view.pageNumber, 16, 192);
  view.actions.forEach((label, index) => {
    const x = 8 + index * 104;
    const selected = view.choices.length ? index === 1 : view.focus === index;
    rect(x, 216, 96, 16, selected ? 1 : 0);
    if (!selected) rect(x, 216, 96, 1, 1);
    text(label, x + Math.floor((96 - label.length * 6) / 2), 220, 16, selected ? 0 : 1);
  });
  return { width: 320, height: 240, pixels: surface.pixels, palette: surface.palette };
}
