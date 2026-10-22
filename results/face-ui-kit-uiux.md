# The face UI kit audit: UI/UX rulings

## F14: the breath loop (home.c `loop_cell` against habitat.c `loop_at`)

**Unify them into one behaviour: Home's, with the one-tick minimum.** Put it in the kit as one shared helper, and have both screens call it.

- **What differs:**
  - Home gives every cell of a loop at least one 80 ms tick (`t80`).
  - Habitat divides by 80 with no floor. A cell shorter than 80 ms gets 0 ticks and never shows, and a loop of only short cells falls back to its first cell.
- **Why Home's:** a cell listed in an animator's loop is meant to be seen. Dropping it silently changes the motion the animator drew, and the same loop would play differently on Home and up close. The one-tick floor keeps each cell, and lengthens a loop only by the ticks its sub-80 ms cells gain.
- **Effect:** none on loops whose cells are all 80 ms or longer. Any Habitat golden that changes is one where a short cell was being dropped; that change is the fix, and the builder lists those goldens.
