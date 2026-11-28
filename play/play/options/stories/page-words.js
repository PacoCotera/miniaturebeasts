// The Dock key's words as the play page says them: read out of src/shell.mjs itself (layoutDock and dockTitle), never copied, so a story can never drift from the page. shell.mjs is a page script (it touches the DOM), so it cannot be imported; its text is read, and this throws at once if the page's lines change shape.
import shell from "../../src/shell.mjs?raw";

const grab = (re, what) => { const m = shell.match(re); if (!m) throw new Error("page-words: shell.mjs no longer has " + what + "; update stories/page-words.js"); return m; };

const f = grab(/const full = d \? "([^"]+)" : crates \? "([^"]+)" : "([^"]+)", short = d \? "([^"]+)" : "([^"]+)"/, "the Dock key's full and short words");
const l = grab(/const label = d \? "([^"]+)" : crates \? "([^"]+)" : "([^"]+)", title = dockTitle\(\)/, "the Dock key's labels");
const t = grab(/return !c\.canDock \? "([^"]+)" : c\.docked \? "([^"]+)" : c\.crates > 0 \? "([^"]+)" : "([^"]+)"/, "dockTitle's words");

export const DOCK_WORDS = {
  docked: { full: f[1], short: f[4], label: l[1], title: t[2] },
  lit: { full: f[2], short: f[5], label: l[2], title: t[3] },
  quiet: { full: f[3], short: f[5], label: l[3], title: t[4] },
  noWorld: { title: t[1] },
};
