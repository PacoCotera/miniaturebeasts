# T-197: what a crate holds and where each thing goes (the game designer's part)

Sources: design/world-and-exploration.md (Materials), design/research-and-breeding.md (Sealed chapters and finds; Data), design/architecture.md (the crate rules), specs/station-return-signals.md and specs/dock-moments.md.

## What one crate holds

A crate is one expedition's hold, sealed when the expedition ends. The Companion's bay carries at most three. Each crate holds:

| Content | How much | What it is, in the player's eyes |
| --- | --- | --- |
| **Pods** | 0 to 2 at Probe tier 1, 0 to 3 at tier 2 | each its species' own shell |
| **Energy** | 0 to 20 | the stones struck or warmed on the walk |
| **Essence** | 0 to 20 | dew, pressed fruit, shed tufts |
| **Data** | 0 to 20 | the creature moments the player caused |
| **Finds** | 0 or more | a crystal, a pearl or a shard of storm glass, each its own object |

A portrait arrives in the bay too, as its own crate when a sitting's painting comes (return signals key 4).

An expedition that ended with nothing in the hold sends no crate (dock-moments.md, "An empty trip").

## Where each thing goes (the destination answers the object; no drawn line)

| Content | Goes to | What answers it |
| --- | --- | --- |
| **Pods** | the Pods case, a free well each | The well it lands in lights as it arrives. This is the pod carry (flow change 1), the same shell all the way |
| **A pod with no free well** | it **waits in the bay**, still sealed, and lands when a well frees, oldest first (architecture.md) | It stays in view on the bay floor. It is "waiting for a well", plainly, and not lost |
| **Energy, Essence, Data** | the top bar's counters; there are no store tanks (station experience review) | each counter ticks up as its material arrives (+n), in the material's own icon |
| **Finds** | the Station keeps each one until it is used to open a sealed chapter, for the whole species | **Not designed: where a kept find is drawn.** My proposal is the Pods room, beside the sealed pages it opens, because the find is used there. Until the owner or the creative director rules, it can only land in the bay and stay |
| **A portrait** | its mibi: the Portrait plate up close | the plate fills (return signals key 4, "Fig's portrait has come") |

**For the motion without lines:** each object travels toward its destination at the screen's edge where that destination lives (the top bar, Pods' side). The destination answers on arrival: the well lights, or the counter ticks. The object carries the eye, so no path is drawn.

## Nothing reads as a loss

- **Every content is a gain.** Opening a crate costs nothing, and nothing in it can be refused or wasted. Gathering was the choice.
- **A pod waiting for a well** is a plain wait, never a warning. No coral, no ✕, no "full" plate. The bottom line can name it: "a pod waits for a well" (cargo.json today).
- **The crate emptied** is the end of an arrival, not a loss. It closes or slides away; it is not shown as a bare box.
- **The only true loss on a trip,** a Probe break, never reaches Cargo. Nothing comes home from that walk, and the dock tells it (T-196's "yes" row). Cargo shows only what arrived.

## What I own in the gate

Check 5 (true to the rules) on this screen:
- the counts and contents match the hold;
- each thing goes where the rules send it;
- a waiting pod waits;
- no find is shown going somewhere that isn't designed.
