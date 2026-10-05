# Founder lab fixture

Run the existing local server (`npm start`) and open `/lab/`. This is an isolated, versioned experiment; it does not publish founders, migrate breeding records or implement real probe transfer. The host shell and transcript label fixtures outside the pixel image.

## Walkthrough

1. Choose Receive → Accept → Continue for simulated probe evidence, or Investigate for an authored console observation without field readings.
2. Select one of two questions with Previous/Next, then Study. Both use supplied content.
3. Use the external **Supply authored finding** control. Inspect the visual finding, Pursue a direction, then Review.
4. Preview explicitly uses one fixture sample and no supplies. The preview defaults to Back and requires the displayed revision to be ready before activation.
5. Ready remains until Open. Meet and Inspect always reopen the saved individual. Pale markings are carried, not expressed; no sample activation is applied.

Three physical-style buttons map to the screen strip. Arrows rotate focus, Enter selects, Escape backs out; 1–3 activate strip positions. The external shell offers monochrome/color, simulated refresh delay, missing portrait and storage interruption controls. These do not claim to model hardware timing. Idle entry waits for visible readiness. The first whole gesture while idle only wakes; a gesture begun during refresh or boot restoration stays disarmed until release. After focus interruption, returning keyboard auto-repeat remains blocked, while a fresh nonrepeat keydown proves a new press even if the external keyup was missed. Pointer gestures are cancelled separately on interruption; release never activates them.

## Boundaries and recovery

- `content.mjs` owns versioned authored scenarios and fixed outcome. `domain.mjs` validates pure state changes. `controller.mjs` owns navigation/gesture readiness and emits commands. `view.mjs` maps immutable facts to bounded copy; `render.mjs` composes pixels using the existing assets/font. `host.mjs` handles the browser and asynchronous orchestration.
- `repository.mjs` uses one envelope in a separate IndexedDB database. Read/write transactions serialize validation and updates; results resolve only after transaction completion. The old breeding store is never accessed. A new isolated run uses a new database name; old runs are preserved.
- Receipt identity binds exact cargo; duplicate transfer returns the existing receipt. Supplies stay separate and the fixture supplies none. Intent saves a stable operation ID and exact summary before resolution. Resolution atomically consumes one fixture sample, saves one fixed founder and marks the operation committed. Conflicting requests fail; retry/reload resolves the same operation.
- After an injected lost response or interrupted intent, Check reads the durable result before continuing. Reload opens a safe resume page. Unsupported saved versions are preserved and rejected. An unavailable database is not evidence that an operation failed. Back after submission changes navigation without cancelling the durable operation.
- The saved founder has explicit parentless ancestry and separate sample/research provenance. Identity/traits/portrait are preserved across reveal. This is not a production founder schema or proof of genome generation.
- Loaded records are validated against this narrow authored scenario: versions, IDs, receipt/sample links, source snapshots, finding/direction membership, operation/result links, consumption, fixed genome/expression/art and explicit ancestry. Corrupt or unsupported records abort without replacing the stored envelope. This catches consistency faults, not malicious edits to an authoritative shared service.

## Validation

Run `node --test prototype/tests/lab-*.test.mjs` for transitions, interrupted operations, record validation, rendering and input readiness. Transactional fakes are not proof of actual IndexedDB behavior; the separate browser harness checks persistence and interaction. See [builder setup](../../docs/builders/getting-started.md) for optional browser dependencies.

`node prototype/lab/export.mjs` produces native and 3× color/mono PNG keyframes under `artifacts/`. These are renderer outputs, not claims of an executed browser flow. A concise exact-record transcript supports screen-reader and full-ID review; the experimental bitmap face displays main copy in uppercase.

Remaining limitations: no firmware, actual sensing, real resource economy, animation, passive timed research, authenticated sharing or physical refresh measurements. Idle wake is simulated; automatic multi-scene idle rotation is outside this loop. Local user-edited IndexedDB is not protected authority. Final artwork and physical legibility remain unvalidated.

This isolated fixture excludes whole-haul offload and independent transfer readiness. The current connected return/research journey is in [the native game](../../native/selected-lab/README.md); this older authored founder experiment does not redefine it.
