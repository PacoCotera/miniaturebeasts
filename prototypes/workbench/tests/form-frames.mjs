// The form frames the older tests read: every file in frames/, with the four that became language frames (version 8:
// S01, S17, S18, S19) read from their version-6 files in frames/v6, byte for byte as they were. A frame is append-only:
// the old file moved aside when the new one took its place, and the stamp registry keeps both versions.
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const framesDir = path.resolve(here, "../frames");
export const legacyDir = path.join(framesDir, "v6");
const read = (p) => JSON.parse(readFileSync(p, "utf8"));
export const frameFiles = () => readdirSync(framesDir).filter((f) => f.startsWith("species-")).sort();
// the file a form test reads for each species: the legacy version-6 file where the frame is now a language frame
export function formFramePath(file) {
  const current = path.join(framesDir, file);
  return (read(current).frameVersion ?? 4) >= 8 ? path.join(legacyDir, file) : current;
}
export const loadFormFrames = () => frameFiles().map((f) => read(formFramePath(f)));
export const loadLanguageFrames = () => frameFiles().map((f) => read(path.join(framesDir, f))).filter((f) => (f.frameVersion ?? 4) >= 8);
