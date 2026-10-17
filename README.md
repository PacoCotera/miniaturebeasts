# Work queue

Tickets are self-contained work orders. Any worker that can run git (this pool, another pool, a local agent on a local model) can take them by following WORKER.md. State is the folder a ticket sits in: ready → claimed → review → done, or parked. The programme lead writes tickets, reviews results, merges by PR and moves tickets to done. Reviews (art sign-off, creative gate) are tickets too.

**The device sheet** (every Station screen and its key states at 1x, in flow order, one labelled PNG, so a screen is reviewed among its neighbours): `python3 tools/device-sheet.py OUT.png [--fetch] [--only Cargo] [--proof cargo-report=proposed.png]`. It reads the committed goldens from the code repository's two batch heads with `git show` (which head each row reads is in `tools/device-sheet.json`); `--proof CELL=PNG` puts a proposed proof beside the screen it replaces. Needs Python 3 and Pillow.
