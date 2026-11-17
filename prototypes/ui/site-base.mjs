// Where the prototypes' folders (ui/, face/dist/, workbench/frames/...) are served from, as a URL ending in "/".
// From the source modules (the headless harness, the goldens, the node tests, a server of the tree) it is the folder above ui/. In the Vite build (ops/sandbox/bundle-pages.sh) the modules are hashed chunks in
// assets/ and the game lives under /play/ (the pages /play/, /play/station/, /play/exploration/ beside /play/ui/, /play/face/ ...), so it is the build's base, /play/ (prototypes/vite.config.mjs). Vite replaces import.meta.env.PROD and BASE_URL; in Node import.meta.env is undefined.
const SELF = import.meta.url;   // (kept in a name so the bundler does not try to resolve "../" as a file at build time)
export const PROTOTYPES = import.meta.env?.PROD && typeof document !== "undefined" ? new URL(import.meta.env.BASE_URL, document.baseURI) : new URL("../", SELF);
