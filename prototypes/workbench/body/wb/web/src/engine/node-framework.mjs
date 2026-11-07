// For node scripts outside Vite (the parity dump the Python test runs): resolves the `@framework/...` alias to the game's framework folder. Use: node --import ./node-framework.mjs script.mjs
import { registerHooks } from 'node:module'

const FRAMEWORK = new URL('../../../../../framework/', import.meta.url)
registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(specifier.startsWith('@framework/') ? new URL(specifier.slice('@framework/'.length), FRAMEWORK).href : specifier, context)
  },
})
