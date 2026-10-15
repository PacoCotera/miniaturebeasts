# Placed masters

Signed masters, placed over their stand-ins by id and size (technical-architecture.md §5.5). `index.json` lists each placed master: file, size, SHA-256 and who signed it. The page loads it at boot (`station/src/masters.mjs`), checks every file against its entry, and registers it in the asset manifest with status `master`, replacing the stand-in of the same id; a master of another size than its stand-in, or a file that does not match its hash, is refused loudly. No code changes when a master lands: only files and the index.

```
node prototypes/ui/tools/place-masters.mjs --from art/station-masters/pods            # the slices under a "(signed)" README heading
node prototypes/ui/tools/place-masters.mjs --from art/station-masters/pods --ids pod-large-identified,room-shelf
node prototypes/ui/tools/place-masters.mjs --check                                    # CI: files against the index
```

The tool copies a slice only after its size and hash match the masters folder's own `slices/manifest.json`. A README heading marked "(signed)" is the tool's only automatic signal; a slice signed in the verdict text rather than under such a heading is placed with `--ids` once the art director's list names it.
