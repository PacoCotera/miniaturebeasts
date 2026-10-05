// Authored pixel masks; no vectors, browser fonts or runtime image dependencies.
// Transparent = -1; the same outline/marking masks are retained in both treatments.
function makeSprite(kind) {
  const pixels = Array(64 * 64).fill(-1);
  function rect(x, y, width, height, color) {
    for (let row = y; row < y + height; row++) {
      for (let column = x; column < x + width; column++) {
        pixels[row * 64 + column] = color;
      }
    }
  }
  if (kind === 'vessel') {
    rect(20, 4, 24, 6, 1);
    rect(18, 10, 28, 3, 1);
    rect(20, 13, 24, 3, 1);
    rect(14, 16, 36, 41, 1);
    rect(16, 18, 32, 37, 0);
    rect(18, 39, 28, 14, 3);
    rect(12, 57, 40, 4, 1);
    rect(16, 59, 32, 3, 4);
    rect(30, 26, 2, 25, 1);
    rect(24, 30, 6, 2, 1);
    rect(22, 27, 2, 5, 1);
    rect(32, 35, 7, 2, 1);
    rect(38, 30, 2, 7, 1);
    rect(25, 43, 5, 2, 1);
    rect(20, 22, 2, 2, 4);
    rect(41, 27, 2, 2, 4);
    rect(23, 47, 2, 2, 0);
  } else {
    // Upright friendly body, asymmetric frill, curled tail and ringed eye.
    rect(23, 29, 24, 22, 1);
    rect(25, 30, 20, 19, 2);
    rect(27, 35, 12, 14, 3);
    rect(21, 47, 10, 8, 1);
    rect(36, 47, 12, 8, 1);
    rect(23, 48, 6, 5, 2);
    rect(38, 48, 8, 5, 2);
    rect(46, 36, 10, 13, 1);
    rect(53, 28, 6, 16, 1);
    rect(49, 25, 8, 5, 1);
    rect(47, 38, 7, 8, 2);
    rect(54, 30, 3, 10, 2);
    rect(50, 27, 5, 2, 2);
    rect(15, 15, 27, 22, 1);
    rect(11, 20, 33, 12, 1);
    rect(13, 21, 29, 9, 2);
    rect(17, 17, 23, 17, 2);
    for (const [x, y, width, height] of [[15, 9, 4, 9], [10, 7, 4, 5], [23, 4, 4, 12], [28, 7, 4, 9], [37, 7, 4, 11], [42, 11, 5, 5], [44, 18, 7, 4]]) {
      rect(x, y, width, height, 1);
      rect(x + 1, y + 1, Math.max(1, width - 2), Math.max(1, height - 2), 4);
    }
    rect(18, 20, 11, 11, 1);
    rect(19, 21, 9, 9, 0);
    rect(21, 23, 5, 5, 1);
    rect(22, 24, 1, 1, 0);
    rect(14, 28, 2, 2, 1);
    rect(28, 31, 9, 1, 1);
    rect(39, 35, 3, 3, 1);
    rect(42, 41, 2, 2, 1);
    rect(32, 38, 3, 2, 0);
    if (kind === 'family') { // Deliberate catalog silhouette, not the individual's portrait.
      for (let index = 0; index < pixels.length; index++) {
        if (pixels[index] >= 0) pixels[index] = 1;
      }
    }
  }
  return Object.freeze({ width: 64, height: 64, pixels: Object.freeze(pixels) });
}
export const assets = Object.freeze({
  critter: makeSprite('critter'),
  vessel: makeSprite('vessel'),
  family: makeSprite('family'),
});
