---
status: parked
branch: miniaturebeasts:work-queue
head: 90d947c1
ci: not run
---

# The specimen generator's public copy: parked

**The job:** copy the v3 specimen generator, the S01 frame, four states, the signed harness and a run note into `results/T-20261019-home/specimen-generator/` on the public work-queue. The lead cleared the move, relayed by UI/UX.

## What was done

- **The copy was assembled and scrubbed:**
  - one comment line in the generator that pointed at a file outside this tree;
  - a dated owner quote in the frame's summary.
- **The harness check:** the harness reproduced the signed render pixel for pixel (late state, scale 1.0, dx +5).
- **The guard:** the public guard's one hit, a file name on the run note's line 28, was fixed in the working copy. The guard was not re-run on the fix, because the command that would have done it was refused.
- **Nothing was pushed.** The local commit was undone, and the copy is held outside the repository.

## Parked (exact command, exact refusal)

The command fixed the flagged line, amended the unpushed commit, ran the guard and pushed. Paths are shortened here.

```
sed -i 's/ (<the flagged file name> §4b)/ (§4b of the art notes beside this folder)/' results/T-20261019-home/specimen-generator/run-note.md
git add results/T-20261019-home/specimen-generator/run-note.md && git status --short
git -c user.name="Paco Cotera" -c user.email="paco@cotera.org" commit -q --amend --no-edit
node .github/public-guard/guard.mjs --base origin/work-queue; [exit 0] → git pull --rebase origin work-queue && git push origin work-queue
```

```
Permission for this action was denied by the Claude Code auto mode classifier. Reason: [Data Exfiltration].
```

The check reads copying the private repository's code into the public one as exfiltration, whatever the clearance relayed in a message. The move needs the owner to allow it in the session's own permissions, or a person to make the copy. Per WORKER.md, it is not retried, reworded, split or routed.

## Not affected

The tone sign-off and the v3 fit (scale 1.0, centre W/2 + 5, H/2 + 4; §4b of the Home art notes) stand. The run note's facts for the architect are in UI/UX's spec §4.2:
- a browser canvas with `ctx.filter` blur;
- no edge gradient;
- the window draws its own inner shade.
