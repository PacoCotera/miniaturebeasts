import { createSurface, palettes } from '../../pixel/renderer.mjs';
import { drawText } from './font.mjs';

export function wrap(value, cells) {
  const lines = [];
  let line = '';
  for (const word of value.split(' ')) {
    let remainder = word;
    if (line && line.length + 1 + remainder.length > cells) {
      lines.push(line);
      line = '';
    }
    while (remainder.length > cells) {
      lines.push(remainder.slice(0, cells));
      remainder = remainder.slice(cells);
    }
    if (remainder) line += (line ? ' ' : '') + remainder;
  }
  if (line) lines.push(line);
  return lines;
}

export function slots(view, caller = false) {
  const ids = caller ? [null, 'reenter', null] : view.page === 'details' ? ['back', 'previous', 'next'] : ['back', 'reconcile', 'details'];
  return ids.map(id => caller && id === 'reenter' ? { id, label: 'Haul status', enabled: true } : view.actions.find(action => action.id === id) ?? null);
}

export function renderTransfer(view, profile = 'color', caller = false) {
  if (!Object.hasOwn(palettes, profile)) throw new Error('Unknown palette');
  const surface = createSurface(640, 480, palettes[profile]);
  const texts = [];
  const accent = profile === 'mono' ? 1 : 4;
  function counts(summary) {
    const samples = `${summary.samples} ${summary.samples === 1 ? 'sample' : 'samples'}`;
    const lots = `${summary.resourceLots} supply ${summary.resourceLots === 1 ? 'lot' : 'lots'}`;
    return samples + ' / ' + lots;
  }
  function text(value, x, y, cells = 49, color = 1) {
    texts.push({ value, x, y, cells });
    drawText(surface, value, x, y, cells, color);
  }
  function outline(x, y, width, height, thickness = 2, color = 1) {
    surface.rect(x, y, width, thickness, color);
    surface.rect(x, y + height - thickness, width, thickness, color);
    surface.rect(x, y, thickness, height, color);
    surface.rect(x + width - thickness, y, thickness, height, color);
  }
  function body(value, x, y, cells, limit) {
    const lines = wrap(value, cells);
    if (lines.length > limit) throw new Error('Transfer paragraph overflows region: ' + value);
    lines.forEach((line, index) => text(line, x, y + index * 22, cells));
  }
  function vessel() {
    outline(62, 132, 82, 100, 4);
    outline(54, 116, 98, 20, 4);
    outline(44, 234, 116, 20, 4);
    outline(122, 190, 54, 54, 2, accent);
    const status = view.status;
    if (status === 'confirmed') {
      for (let step = 0; step < 5; step++) surface.rect(130 + step * 4, 216 + step * 3, 4, 4, accent);
      for (let step = 0; step < 7; step++) surface.rect(146 + step * 3, 228 - step * 4, 4, 4, accent);
    } else if (status === 'pending' || status === 'unavailable') {
      outline(130, 204, 14, 20, 2, accent);
      outline(154, 212, 14, 20, 2, accent);
      if (status === 'pending') surface.rect(140, 214, 18, 4, accent);
    } else if (status === 'unreadable') {
      outline(134, 200, 28, 34, 2, accent);
      for (let step = 0; step < 8; step++) {
        surface.rect(132 + step * 4, 202 + step * 4, 2, 2, accent);
        surface.rect(160 - step * 4, 202 + step * 4, 2, 2, accent);
      }
    } else if (status.startsWith('preview')) {
      outline(130, 208, 34, 20, 2, accent);
      outline(134, 214, 6, 6, 2, accent);
    } else {
      outline(138, 208, 22, 20, 2, accent);
    }
  }
  text(caller ? 'LAB / COLLECTION' : view.page === 'details' ? 'LAB / HAUL DETAILS' : 'LAB / HAUL', 24, 20);
  surface.rect(24, 44, 592, 2, 1);
  if (caller) {
    text('Collection', 24, 58);
    body('Return to the selected haul to check its recorded status.', 216, 108, 32, 6);
    text('Selected haul', 24, 266);
    body(view.key.transferId, 24, 288, 49, 2);
  } else {
    text(view.heading, 24, 58);
    if (view.page === 'details') {
      if (!view.details.total || view.details.rows.length > 4) throw new Error('Invalid detail pagination');
      view.details.rows.forEach((row, index) => {
        const origin = 88 + index * 76;
        text(row.label, 24, origin);
        if (row.value.length > 98) throw new Error('Details value overflows two lines');
        for (let offset = 0; offset < row.value.length; offset += 49) text(row.value.slice(offset, offset + 49), 24, origin + 22 + (offset / 49) * 22);
      });
      text(`Page ${view.details.page} / ${view.details.total}`, 24, 400);
    } else {
      vessel();
      body(view.explanation, 216, 108, 32, 6);
      if (view.summary) {
        text(view.summary.label, 216, 266, 32);
        text(counts(view.summary), 216, 288, 32);
      }
      if (view.lastKnown) {
        surface.rect(24, 318, 592, 2, 1);
        text(view.lastKnown.label, 24, 326);
        const descriptions = { pending: 'Stored; clearance confirmation pending.', confirmed: 'This haul was stored and cleared.', absent: 'No confirmed result was recorded.', preview: 'A haul list was available.', 'preview-unavailable': 'The haul list was unavailable.' };
        text(descriptions[view.lastKnown.status], 24, 348);
        if (view.lastKnown.summary) text(counts(view.lastKnown.summary) + ' in this haul', 24, 370);
      }
    }
  }
  surface.rect(24, 422, 592, 2, 1);
  slots(view, caller).forEach((action, index) => {
    if (!action) return;
    const [x, width] = [[24, 144], [184, 224], [424, 192]][index];
    const focused = caller || action.id === view.focus;
    if (action.enabled) {
      outline(x, 432, width, 32, focused ? 2 : 1);
      if (focused) surface.rect(x + 4, 442, 4, 12, accent);
    } else {
      for (let offset = 0; offset < width; offset += 8) {
        surface.rect(x + offset, 432, Math.min(4, width - offset), 1, 1);
        surface.rect(x + offset, 463, Math.min(4, width - offset), 1, 1);
      }
    }
    text(action.label, x + 12, 440, Math.floor((width - 20) / 12));
  });
  return { ...surface, texts };
}
