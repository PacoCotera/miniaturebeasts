# Placed masters

Signed masters, placed over their stand-ins by id and size (technical-architecture.md §5.5). Two files list the placed masters. `index.json` is what the page fetches (at most 80 KB gzipped): per id its `group` (the folder), `w`, `h`, `bytes`, `sha` (the first 12 hex of the SHA-256, also the `?v=` of the file's URL) and, only when the file is not `<group>/<id>.png`, `file`; plus `slice`, `tile` and `status` where they apply. `provenance.json` holds what the page never fetches: the whole `sha256`, who signed it (`signed`) and where it came from (`from`). `place-masters.mjs` and the other placement tools write both (`tools/index-io.mjs`); tools and tests read them together with `readIndex(root)`. The page loads the index at boot (`station/src/masters.mjs`), checks every file against its entry, and registers it in the asset manifest with status `master`, replacing the stand-in of the same id; a master of another size than its stand-in, or a file that does not match its hash, is refused loudly. No code changes when a master lands: only files and the index.

```
node prototypes/ui/tools/place-masters.mjs --from art/station-masters/pods            # the slices under a "(signed)" README heading
node prototypes/ui/tools/place-masters.mjs --from art/station-masters/pods --ids pod-large-identified,room-shelf
node prototypes/ui/tools/place-masters.mjs --check                                    # CI: files against the index
```

The tool copies a slice only after its size and hash match the masters folder's own `slices/manifest.json`. A README heading marked "(signed)" is the tool's only automatic signal; a slice signed in the verdict text rather than under such a heading is placed with `--ids` once the art director's list names it.
