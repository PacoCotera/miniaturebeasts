// The play page's own rules for the parts that live in play/index.html (the dock's screen button and sheet, the lamps, the bar's controls): read from the page itself, never copied, so a story always shows what the page shows.
// pageCss(prefixes) -> the page's one-line rules whose selector starts with a prefix (and the :root colour names).
import html from "../../index.html?raw";

const lines = html.split("\n");
export function pageCss(prefixes) {
  const keep = lines.filter((l) => l.startsWith(":root{") || l.startsWith("*{box-sizing") || prefixes.some((p) => l.startsWith(p)));
  return keep.join("\n");
}
export const DOCK_PREFIXES = [".ctl", ".swdot", ".hidden", ".dsmini", "#dockScreenBtn", ".ds-", ".dsbig", ".dslamp", ".op-lede"];
