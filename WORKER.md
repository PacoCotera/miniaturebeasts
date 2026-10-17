# Worker protocol (read this, then the ticket; nothing else)

You are a worker on Miniature Beasts. You do not need to know who writes tickets or who else is working. The ticket is your whole instruction.

## Loop
1. `git pull` this branch (`work-queue` of this repository).
2. Pick the oldest file in `tickets/ready/` whose front matter `role` is your role and whose `class` you are allowed to take (see Classes). Skip tickets whose `needs` lists a ticket not yet in `tickets/done/`.
3. Claim it: `git mv tickets/ready/T.md tickets/claimed/T.md`, add `claimed_by: <your worker name>` and `claimed_at: <TZ=America/Mexico_City date>` to its front matter, commit "claim T", push. If the push is rejected because someone else moved it first, `git pull`, pick another ticket. Never work on a ticket you did not claim.
4. Do exactly what the ticket says, in this repository, on the branch it names. Nothing outside its scope.
5. Write `results/T.md` (template below), move the ticket to `tickets/review/`, commit "result T", push.
6. If a step is refused by a permission check, or the ticket is wrong or impossible: do not retry, reword, split or route it. Finish what you can, write the result with `status: parked` and the exact command and refusal, move the ticket to `tickets/parked/`, push. Then take the next ticket.
7. Go to 1. If `tickets/ready/` has nothing for you, stop.

- **Keep looping:** after you finish or park a ticket, `git pull` and take the next ready ticket for your role whose needs are all in tickets/done. Stop only when none is left; then say so in one line.

## Rules every ticket inherits
- Commits: author `Paco Cotera <paco@cotera.org>`, no trailers, no model, tool or session names anywhere in the public repository.
- Push only the branch the ticket names. Never force-push, never delete branches or tags, never push to `main`.
- No paid API calls (image generation etc.) unless the ticket says so with a cap.
- Never read, print or copy credentials.
- Times come from `TZ=America/Mexico_City date`, never guessed.
- Purpose first (owner, 2026-10-16): on any screen or art ticket, if the ticket does not say what the player does there and what each object is for, park it and ask for the purpose. Reviews judge purpose before polish: an object that serves no player purpose is a fail, however well painted.
- One style, no drift (owner, 2026-10-16 10:57: "you have a very clear style defined for the station and miniature lives. don't let the art designers drift."): the style is `design/art-direction.md` (Miniature Lives) and `design/style-guide/README.md` (the Station: rugged, matte field gear, the Companion's sibling), on station-gate. Every art, design and review ticket cites them and is judged against them. No ticket, ruling or direction file may introduce another style (no retro mid-century industrial, no new motif family). A wanted departure is the owner's call: park and ask.
- New tickets: `git pull` first, take the next free id (highest in tickets/*/ plus one), commit and push the ticket alone at once. If the push is rejected, pull and check the id is still free; renumber if not (two tickets once shared T-20261016-49).
- Live things live on the machine (owner, 2026-10-17): anything that changes with the player's input or with time is shown on the device's own display, never as paper, print or a tag. Paper is only for things that never change.
- Do not design: rects, colours, words and art are given by the ticket. If the ticket and the code disagree, park and report; do not choose.
- Never write money figures (costs, spend, prices, budgets in any currency) in any file, commit message or result. Spending is private.
- Stage only the paths you changed (never `git add -A`); run `git status` before every commit.
- Run the public guard before every push to the public repository: `node .github/public-guard/guard.mjs --base <base>; echo exit=$?` (never behind a pipe that hides its exit code).

## Batches
A ticket's `batch` names the package it ships in. Build tickets of one batch commit to the same branch, `batch/<batch id>` in the public repository, one after another (pull before you start, push when done). Do not open pull requests; the lead opens one per batch when every ticket in it is done.

## Classes
- `mechanical`: placements, renames, retakes, applying a given patch, test updates with given numbers. Any worker.
- `build`: code to a written spec with tests. Workers rated for code.
- `design`: art, UI/UX, game design, review verdicts. Only workers named in the ticket's `role` and rated for design.

## Result template (`results/T.md`)
```
---
ticket: T
status: done | parked
branch: <repo>:<branch>
head: <sha>
ci: <run id or "not run">
---
## What changed
## Proof (commands run and their result lines)
## Goldens / captures moved
## Parked (exact command, exact refusal) — if any
```

## Everything is here
Tickets, the specs they cite (`specs/`), and results live on this branch. Code lives on the branches tickets name in this same repository. You never need another repository.
