import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'
// @ts-expect-error the build step is a plain script
import { generate } from '../../scripts/gen-zod.mjs'

// The committed zod schema is what the build step makes of the committed JSON Schema (run `npm run gen` after wb/schema_json.py changes the schema).
it('species.zod.ts is what scripts/gen-zod.mjs makes of the schema files', () => {
  expect(readFileSync(join(import.meta.dirname, 'species.zod.ts'), 'utf8')).toBe(generate())
})
