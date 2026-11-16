import { html } from "./preact-htm.js";

export const dur = (s) => {
  if (s == null) return "?";
  const m = Math.round(s / 60);
  if (m < 1) return "under 1 min";
  if (m < 60) return m + " min";
  const h = Math.floor(m / 60);
  return h + " h " + String(m % 60).padStart(2, "0") + " min";
};
export const ago = (s) => (s == null ? "" : s < 90 ? "just now" : dur(s) + " ago");
export const pct = (n) => (n == null ? "?" : Math.round(n) + "%");
export const clamp = (n) => Math.max(0, Math.min(100, n));

export const Bar = ({ value, mark, kind }) => html`
  <div class="bar" role="img" aria-label=${"bar at " + Math.round(value) + " percent"}>
    <i class=${kind || ""} style=${"width:" + clamp(value) + "%"}></i>
    ${mark != null && html`<u style=${"left:calc(" + clamp(mark) + "% - 1px)"}></u>`}
  </div>`;
