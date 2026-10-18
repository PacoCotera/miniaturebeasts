# The Probe held upright, and mibis tiny everywhere (the art director, on the owner's 21:36 rulings)

## 1. Probe audit

**The owner's rule:** the Probe is always drawn upright, with the antenna up, the screen at the top and the grip below.

I searched every Probe master, slice and placement on station-gate and masters-pods (masters, slices, specs, the face and station sources, goldens, and the T-201 build branch).

| Picture | Where it is placed | Orientation | Fix |
| --- | --- | --- | --- |
| `bench-probe-upright-t1-288x432`, `-t2-288x432` | the bench (bench spec, `pictures`), the style plates | upright | none |
| `bench-probe-t1-card-128x160`, `-t2-card-128x160` | the decision panel "Fit the upgrade?" (T-162 proof) | upright | none |
| `bench-cradle-upright-empty-288x432` | the bench, away | upright | none |
| **`bench-probe-t1-480x288`, `bench-probe-t2-480x288`** | registered in the masters index; **no spec or source places them** | **lying sideways** (antenna right, on a tray) | **Withdraw both.** A 90° rotation won't do: their light, shadow and tray are painted for the lying pose, so turned they would be lit from the wrong side, and the tray would stand on end. The upright masters above already cover every use |
| `bench-cradle-empty-480x288` | registered only | the lying tray | **Withdraw** with them |
| **`home-cradle-full-96x72`**, `home-cradle-empty-96x72` | Home's Probe module (the current goldens) | upright, but **the old net-and-hoop Probe**, not the current device | **Replace** with reductions of the upright masters: tier 1 or tier 2 at 48 × 72 (from 288 × 432, reduced, never enlarged), and the empty cradle the same way. No request needed. It applies wherever Home keeps a Probe picture in the deck layout |
| `probe-study` (art/companion-concept) | an early concept only | the old net Probe | none (a record; never placed) |
| The Companion's Probe screen ("the Probe drawn at about 160 px") | the Companion style spec | no master exists yet | When it is drawn, it is the upright master reduced to the Companion's palette |

**The stills judged:**
- The T-162 "Fit it | Not now" proof (work-queue `results/T-20261016-162/bench-panel-upgrade-1x.png`) and the bench golden both already show the Probe upright.
- The sideways pictures are only the two lying 480 × 288 masters, so any build that drew them took them from the masters index.

**The fix:**
- Withdraw those three ids from the index and the slices status, so no build can place them again.
- Replace the old Home cradle pair with the upright reductions.

**No studio request is needed.**

## 2. Mibi sizes per view: see the ticket

The size table (the owner's 17:15 and 21:36 rulings: mibis are tiny everywhere, an adult about 54 px tall in Home's window) is in T-20261016-211, the ticket for the asset rules on station-gate. UI/UX confirms the views before it is built.
