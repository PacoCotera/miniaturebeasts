// Pictures made in the page for the manifest's builders: an alpha mask (0 or 255) in a palette colour, a palette-indexed
// buffer to a canvas. Browser only (a canvas); the scene and the components never import this.
export function maskPicture(w, h, mask, rgb) {
  let cv = null;
  const make = () => { cv = document.createElement("canvas"); cv.width = w; cv.height = h; const g = cv.getContext("2d"), id = g.createImageData(w, h); for (let i = 0; i < w * h; i++) if (mask[i]) { id.data[i * 4] = rgb[0]; id.data[i * 4 + 1] = rgb[1]; id.data[i * 4 + 2] = rgb[2]; id.data[i * 4 + 3] = 255; } g.putImageData(id, 0, 0); return cv; };
  return { w, h, canvas: () => cv || make() };
}
