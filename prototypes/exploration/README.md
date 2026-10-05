# Companion Field Test (exploration rough playable)

Tests the combined exploration design: a fogged 16×20 world map (start on any glint, placing reveals the 3×3), living patches with three token species, the action clock, storm and fog bank, one partner gate, Cargo → Station → world turn.
Controls: arrows/WASD or the pad (tap = creep, hold = walk); Enter/Space or orange = Confirm (does what the bottom line says); Esc/Backspace or grey = Back (patch → map → mode list).
What to look for: whether signs drive where people go, whether they act on creatures unprompted, whether they notice what changed after the world turns. The Observer toggle shows expedition, world turn and action count.
Faked: the Station accepts once and identifies species instantly; Pip (a small digging partner) is simply handed over after the first expedition; no care, bonding, research or Probe tiers.
Faked: creature behaviour is a small per-species state machine (shed triggers: hopper shakes dry after rain, glowtail calm in its cave, puffcap after a full meal); creatures are shaped tokens, not art.
Not enforced: Probe range; a deep "?" only pins (tier 2 doesn't exist). The map is one fixed size and fully on screen.
Persistence: localStorage (works without it, in memory). New world is in the mode list. `?seed=N` makes the next new world reproducible.
Build stamp reads ../../build.json (CI); a local copy shows "local build". One self-contained file, no build step; Google Fonts (Fredoka) with system fallbacks.
