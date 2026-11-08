// The play page's options: ONE place, one localStorage key, written by the Options panel on the play page (play/options) and read by every device in its frames and by the pages
// opened alone (the devices share the play page's origin, so they read the same key; nothing goes through a URL). Tests set the same key (a test hook: see optionsInitScript).
//   playtest   the playtest preset's short waits (playtest.mjs)
//   dev        Developer tools: the play bar's button, the Station's panel, the Companion's Observer, the compare page's build stamp
//   companion  the Companion in the frame: "A", or the second Companion "B"
//   names      the name list births draw from: "" (the current one) or a list key of names.mjs (en-short-1 shows the archived English names)
//   place      a baked place (prototypes/places/baked) played in every land cell of the Companion's world: "" for none
export const OPTIONS_KEY = "mb-options";
export const OPTION_DEFAULTS = Object.freeze({ playtest: false, dev: false, companion: "A", names: "", place: "" });
export function readOptions(storage = globalThis.localStorage) {
  try { const o = JSON.parse(storage.getItem(OPTIONS_KEY) || "{}"); return { ...OPTION_DEFAULTS, ...(o && typeof o === "object" ? o : {}) }; } catch { return { ...OPTION_DEFAULTS }; }
}
export function writeOptions(patch, storage = globalThis.localStorage) {
  const next = { ...readOptions(storage), ...patch };
  try { storage.setItem(OPTIONS_KEY, JSON.stringify(next)); } catch { /* no storage: the option holds for this page only */ }
  return next;
}
// The test hook: a script for Playwright's addInitScript that stores the options before any page script runs (`page.addInitScript(optionsInitScript({ playtest: true }))`).
export const optionsInitScript = (patch) => `try { localStorage.setItem(${JSON.stringify(OPTIONS_KEY)}, ${JSON.stringify(JSON.stringify({ ...OPTION_DEFAULTS, ...patch }))}); } catch (e) {}`;
