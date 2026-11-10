// The sandbox pages' build (.github/workflows/site.yml, "Bundle the pages"): station, play and exploration, bundled by Vite (Rollup) into content-hashed chunks with modulepreload.
//   npm ci --prefix prototypes && MB_BUNDLE_OUT=<dir> npx --prefix prototypes vite build --config prototypes/vite.config.mjs
// The output holds only what the build produced: <page>/index.html, and assets/<name>-<hash>.js|css|json|png. site.yml lays it over the assembled site (which keeps every source file where the pages and the
// tools expect it: masters, the face, the frames), so nothing but the deployed copy changes. The sources, the headless harness, the goldens and the node tests import the modules directly and never run this.
// Hashed files are immutable (ops/sandbox/Caddyfile, /sandbox/assets/*); the HTML stays no-cache.
import { defineConfig } from "vite";
import path from "node:path";

const here = import.meta.dirname, page = (name) => path.join(here, name, "index.html");
// the source pages map the bare package names to prototypes/node_modules for the browser that loads the tree unbundled (the goldens, the journeys); the bundle has the packages inside, so the map goes
const dropSourceImportMap = { name: "drop-source-importmap", transformIndexHtml: { order: "pre", handler: (html) => html.replace(/(<!--[^>]*?-->\s*)?<script type="importmap">[\s\S]*?<\/script>\s*/g, "") } };
export default defineConfig({
  root: here,
  plugins: [dropSourceImportMap],
  base: "./",           // each page's links are relative to the page, so the build works under /sandbox/ and anywhere else it is served
  publicDir: false,
  build: {
    outDir: process.env.MB_BUNDLE_OUT ? path.resolve(process.env.MB_BUNDLE_OUT) : path.resolve(here, "../_bundle"),
    emptyOutDir: true,
    target: "es2022",
    assetsInlineLimit: 0,                   // a picture or a JSON file is a file with a hashed name, never a data: URL
    modulePreload: { polyfill: false },     // modulepreload links for each page's chunks; the browsers that run the sandbox know them
    chunkSizeWarningLimit: 4096,
    rollupOptions: { input: { station: page("station"), play: page("play"), exploration: page("exploration") } },
  },
});
