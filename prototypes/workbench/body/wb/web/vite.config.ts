import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const here = import.meta.dirname

// The source hash that build.json carries and the framework test recomputes (tests/test_wb_web.py): sha256 over
// "<posix path>\0<bytes>\0" for src/**, index.html, vite.config.ts, tsconfig.json, package.json and package-lock.json, in sorted path order.
function sourceFiles(): string[] {
  const out: string[] = []
  const walk = (d: string) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n)
      statSync(p).isDirectory() ? walk(p) : out.push(p)
    }
  }
  walk(join(here, 'src'))
  for (const f of ['index.html', 'vite.config.ts', 'tsconfig.json', 'package.json', 'package-lock.json']) out.push(join(here, f))
  return out.map((p) => relative(here, p).split(sep).join('/')).sort()
}
export function sourceHash(): string {
  const h = createHash('sha256')
  for (const f of sourceFiles()) {
    h.update(f + '\0')
    h.update(readFileSync(join(here, f)))
    h.update('\0')
  }
  return h.digest('hex')
}

const buildJson = () => ({
  name: 'build-json',
  closeBundle() {
    writeFileSync(join(here, '../static/app/build.json'), JSON.stringify({ source_hash: sourceHash(), files: sourceFiles().length }, null, 1) + '\n')
  },
})

export default defineConfig({
  base: '/studio/',
  plugins: [react(), buildJson()],
  build: { outDir: '../static/app', emptyOutDir: true, sourcemap: false, target: 'es2022' },
  server: { port: 5173, proxy: { '/studio/api': 'http://127.0.0.1:8765', '/studio/events': 'http://127.0.0.1:8765', '/studio/cas': 'http://127.0.0.1:8765' } },
  test: { environment: 'jsdom', include: ['src/**/*.test.ts', 'src/**/*.test.tsx'] },
})
