// Authored magnified feature diagrams. They illustrate the fixed content, not
// sensor microscopy or a claim that measured humidity predicts these alleles.
function makeFeature(kind) {
  const pixels = Array(64 * 64).fill(-1);
  function rect(x, y, width, height, color) {
    for (let row = y; row < y + height; row++) {
      for (let column = x; column < x + width; column++) pixels[row * 64 + column] = color;
    }
  }
  if (kind === 'crown') {
    rect(8, 42, 48, 13, 1);
    rect(10, 44, 44, 9, 2);
    const stalks = [[10, 24, 7, 20], [22, 10, 8, 34], [35, 17, 8, 27], [48, 30, 7, 14]];
    for (const [x, y, width, height] of stalks) {
      rect(x, y, width, height, 1);
      rect(x + 2, y + 2, width - 4, height - 4, 4);
    }
    rect(18, 7, 3, 3, 1);
    rect(40, 8, 3, 3, 1);
    rect(4, 18, 3, 3, 1);
  } else {
    // Contrasting paired variant marks: filled versus outlined, readable in mono.
    rect(10, 12, 15, 40, 1);
    rect(39, 12, 15, 40, 1);
    rect(41, 14, 11, 36, 0);
    for (const y of [19, 29, 39]) {
      rect(13, y, 9, 3, 0);
      rect(44, y, 5, 3, 1);
    }
    rect(29, 29, 6, 2, 1);
    rect(29, 34, 6, 2, 1);
  }
  return Object.freeze({ width: 64, height: 64, pixels: Object.freeze(pixels) });
}

export const findingAssets = Object.freeze({
  'crown-detail': makeFeature('crown'),
  'pale-detail': makeFeature('pale'),
});
