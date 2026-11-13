// Builds the Options panel to ../vendor/options.js (one unminified ES module (identifiers and whitespace kept, so the public guard reads it plainly); committed, as the workbench commits its static bundle). Run: npm run build, in this folder.
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
await build({
  entryPoints: [here + "src/panel.jsx"], outfile: here + "../vendor/options.js",
  bundle: true, minify: false, treeShaking: true, format: "esm", target: "es2022", jsx: "automatic", legalComments: "none",
  loader: { ".css": "text" }, nodePaths: [here + "node_modules"],   // play/src/clip.mjs imports Mediabunny: resolved from this folder
  define: { "process.env.NODE_ENV": '"production"' },
});
