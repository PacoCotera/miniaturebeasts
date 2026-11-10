// Where the prototypes' folders (ui/, face/dist/, workbench/frames/...) are served from, as a URL ending in "/".
// From the source modules (the headless harness, the goldens, the node tests, a server of the tree) it is the folder above ui/. In the Vite build (ops/sandbox/bundle-pages.sh) the modules are hashed chunks in
// assets/ and the pages sit in a folder beside ui/ (/sandbox/station/), so it is the folder above the page. Vite replaces import.meta.env.PROD; in Node import.meta.env is undefined.
const SELF = import.meta.url;   // (kept in a name so the bundler does not try to resolve "../" as a file at build time)
export const PROTOTYPES = import.meta.env?.PROD && typeof location !== "undefined" ? new URL("../", location.href) : new URL("../", SELF);
