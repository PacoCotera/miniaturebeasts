// The painters the Caddy service drives (station-build.md §2.4, §4). Each takes a job ({ id, species,
// sha, genome }) and the service's config and resolves with { files: { name: Buffer }, manifest, costUSD }
// or throws. "mock": the plain placeholder set rendered here from the genome, tinted so a tester can tell
// it landed, after a set delay, no call. "real": grow/service.py paint on the genome under the service's
// own output root (one directory per job), its key from the service's environment, the served set copied
// in; the job's spend (for the private daily ledger) from the --cost-out file in that job's directory.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { buildIndividual } from "../workbench/framework/species.mjs";
import { plainSet } from "../workbench/framework/plain.mjs";
import { encodePNG } from "../workbench/framework/png.mjs";
import { growCameras } from "../workbench/grow/controls.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
export const SET_FILES = ["station-portrait-300x310.png", "station-side-300x310.png", "companion-280x300.png", "token-48.png"];
export const PROMPT_VERSION = 5;   // pinned: the Grow service's prompt version (v8 set) written into every manifest; a new version never repaints a stored set
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The mock: the placeholder set, warmed, after the delay.
export async function mockPaint(job, frame, { mockDelay = 20, signal } = {}) {
  await sleep(Math.max(0, mockDelay) * 1000);
  if (signal?.aborted) throw new Error("aborted");
  const built = buildIndividual(frame, job.genome);
  if (built.validation.status !== "valid") throw new Error("the body does not build: " + built.validation.problems.join("; "));
  const set = plainSet(built.scene, growCameras(frame, built.scene), null), files = {};
  const warm = (img) => { const d = img.data; for (let i = 0; i < d.length; i += 4) { d[i] = Math.min(255, Math.round(d[i] * 1.02 + 6)); d[i + 1] = Math.round(d[i + 1] * 0.94); d[i + 2] = Math.round(d[i + 2] * 0.82); } return img; };
  files["station-portrait-300x310.png"] = encodePNG(warm(set["plain-portrait-300x310"]));
  files["station-side-300x310.png"] = encodePNG(warm(set["plain-side-300x310"]));
  files["companion-280x300.png"] = encodePNG(warm(set["plain-companion-280x300"]));
  files["token-48.png"] = encodePNG(warm(set["plain-token-48"]));
  return { files, costUSD: 0, manifest: { painter: "mock", promptVersion: "mock", note: "the plain placeholder, warmed: no call was made" } };
}

// The real painter: grow/service.py, its key from the service's environment.
export async function realPaint(job, frame, { growService = path.resolve(here, "../workbench/grow/service.py"), python = "python3", outRoot, signal } = {}) {
  const dir = path.join(outRoot, job.id); mkdirSync(dir, { recursive: true });
  const genomeFile = path.join(dir, "genome.json"); writeFileSync(genomeFile, JSON.stringify(job.genome, null, 1) + "\n");
  const costFile = path.join(dir, "cost.json");   // inside the service's data directory, never in the release
  const args = [growService, "paint", "--species", job.species, "--genome", genomeFile, "--control", "twostep", "--views", "portrait", "--out", dir, "--workers", "1", "--cost-out", costFile];
  const log = await new Promise((resolve, reject) => {
    const p = spawn(python, args, { cwd: path.dirname(growService), env: process.env, signal });
    let out = "", err = ""; p.stdout.on("data", (b) => { out += b; }); p.stderr.on("data", (b) => { err += b; });
    p.on("error", reject); p.on("close", (code) => (code === 0 ? resolve(out) : reject(new Error(`grow/service.py exited ${code}: ${(err || out).slice(-800)}`))));
  });
  const speciesDir = path.join(dir, job.species); if (!existsSync(speciesDir)) throw new Error("the painter wrote no set: " + log.slice(-400));
  const sub = readdirSync(speciesDir).find((d) => existsSync(path.join(speciesDir, d, "manifest.json"))); if (!sub) throw new Error("no manifest from the painter");
  const setDir = path.join(speciesDir, sub), manifest = JSON.parse(readFileSync(path.join(setDir, "manifest.json"), "utf8"));
  const view = manifest.views?.portrait; if (!view || view.status !== "painted") throw new Error("served plain: the painting failed its checks (" + (view?.status ?? "no view") + ")");
  const files = {};
  for (const f of SET_FILES) if (existsSync(path.join(setDir, f))) files[f] = readFileSync(path.join(setDir, f));
  let costUSD = 0; try { costUSD = JSON.parse(readFileSync(costFile, "utf8")).costUSD || 0; } catch { costUSD = 0; }
  return { files, costUSD, manifest: { painter: "real", promptVersion: manifest.promptVersion, model: manifest.model, calls: manifest.calls, genomeDigest: manifest.genomeDigest, seconds: manifest.seconds } };
}
