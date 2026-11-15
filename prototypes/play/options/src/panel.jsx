// The play page's Options panel: mounts the parts (parts.jsx: Radix Dialog, Switch, Select and AlertDialog) and the note dialogs. The settings are options.mjs's; the panel only shows and writes them.
// [copy] every string in parts.jsx is a placeholder for the copywriter.
import { createRoot } from "react-dom/client";
import cropCss from "react-image-crop/dist/ReactCrop.css";
import { createController } from "./controller.js";
import { NoteDialog, SectionDialog, T } from "./note-ui.jsx";
import { Panel } from "./parts.jsx";

// mountOptions(root, { trigger, read, about() (the release number line), names, places, onChange(patch), onClose(changed), onStartFresh(), host }): the page's own bar button opens the panel.
// host (the shell) is the note's: getCanvas(), context(), source(), say(key, vars), flash(). Returns the note controller (subscribe / getState / actions) for the page's bar and keys.
export function mountOptions(root, cfg) {
  const notes = createController(cfg.host), api = { ...cfg, notes, open: () => {} };
  const css = document.createElement("style"); css.textContent = cropCss; document.head.appendChild(css);
  createRoot(root).render(<><Panel api={api} /><NoteDialog c={notes} /><SectionDialog c={notes} /></>);
  cfg.trigger.addEventListener("click", () => { notes.hold(); api.open(); });   // the screen as it was when Options opened is held for the note
  return notes;
}
export { T };
export { mountKeyTray, mountDockKey } from "./keytray.jsx";
