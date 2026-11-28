// The lab's screen is drawn in the v4 pictures' units (318 x 356) and shown at 1.6667 of them, then, like the Station's (station/src/main.mjs setEmbedS), at floor(dpr) / dpr:
// the play page lays a frame out at max(1, floor(dpr)) device px per CSS px, so on a phone with a fractional ratio (2.625) the frame is narrower than 1024 CSS px and the screen must shrink with it.
export const LAB_BASE = 1.6667;
export const labScale = (dpr) => { const d = dpr || 1; return LAB_BASE * Math.max(1, Math.floor(d)) / d; };
