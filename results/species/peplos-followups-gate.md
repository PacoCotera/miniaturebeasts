**SIGNED** for `build/peplos-followups` at `d2791d438`.

- Full gate: 162 jobs. The one failure, `goldens:pods`, passed when run alone, so it was the machine under load.
- `frames:check` passes.
- The metrics vectors tool, run again in `--check`, gives no diff.
- The public guard exits 0.

Three deliberate breaks were run, then reverted. The short report does not say which check caught each one:
- The sail height set to 2.8.
- The Peplos frame 5 stamp entry removed.
- A sleep pose that keeps the sail up.

The reviewer reported no findings.
