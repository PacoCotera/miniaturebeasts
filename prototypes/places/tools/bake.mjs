// The place bake (arch.md A1.4). Until the LDtk project lands (C5) this is a no-op, so the CI step `bake.mjs --check` is wired from C1 on.
const args = process.argv.slice(2);
console.log(`bake: no LDtk project yet (C5); nothing to ${args.includes('--check') ? 'check' : 'bake'}`);
