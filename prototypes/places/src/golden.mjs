// Golden pictures: compared by decoded pixels (PNG bytes depend on the zlib build), rewritten only on purpose.
//   MB_UPDATE_GOLDENS=1 node --test ...   rewrites the files a test compares.
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { decodePng, writePng } from './png.mjs';

export function compareGolden(file, img) {
  if (process.env.MB_UPDATE_GOLDENS === '1') {
    mkdirSync(path.dirname(file), { recursive: true });
    writePng(file, img);
    return { ok: true, updated: true };
  }
  if (!existsSync(file)) return { ok: false, message: `golden missing: ${file} (run with MB_UPDATE_GOLDENS=1, then look at it)` };
  const g = decodePng(readFileSync(file));
  if (g.w !== img.w || g.h !== img.h) return { ok: false, message: `golden ${file}: size ${g.w}x${g.h}, picture is ${img.w}x${img.h}` };
  for (let i = 0; i < g.data.length; i++) {
    if (g.data[i] !== img.data[i]) {
      const p = i >> 2;
      return { ok: false, message: `golden ${file}: first difference at x=${p % g.w}, y=${(p / g.w) | 0}` };
    }
  }
  return { ok: true };
}
