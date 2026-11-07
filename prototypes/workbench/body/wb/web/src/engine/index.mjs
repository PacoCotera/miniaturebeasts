// The studio's gene engine: what the Genes panel and the Variety sheet's numbers need, computed in the page from the species file. The catalogue is the game's own (framework/catalogue.mjs, through the `@framework` alias);
// the sampler is the server's Python sampler ported with its own random streams, so a draw here is the draw the server makes (tests/test_wb_studio_parity.py, src/engine/parity.test.ts).
import { CATALOGUE } from '@framework/catalogue.mjs'
import { freq } from './expressions.mjs'
import { sheet, meshCopies } from './variety.mjs'
import { draw, genomeOf, specimen } from './genes.mjs'

export { sheet, freq, meshCopies, draw, genomeOf, specimen }
export const catalogue = { id: CATALOGUE.id, version: CATALOGUE.version, digest: CATALOGUE.digest }

// How often each look shows (spec 4.2), from the file alone; null for a file with no genome block.
export function freqOf(doc, n = 1000) {
  const g = doc?.genome
  if (!g || typeof g !== 'object' || !Array.isArray(g.loci)) return null
  const m = Math.max(10, Math.min(Math.trunc(n), 5000))
  return { species: doc.id, ...freq(g, doc.expressions ?? [], m, 20, doc.id) }
}
