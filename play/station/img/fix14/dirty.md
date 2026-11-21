# Fix 14: the dirty areas, before (station-gate 4e522a3e) and after

Printed by the existing habitat, bench and home face tests (`node --test --test-reporter=tap`). Only Habitat's namer figures move (+484 px, the footprint ring's largest case beside the feet ring's), inside the architect's new ceilings (CEIL 237,722, WITH_MOMENT 333,786); every other printed figure is identical. The Probe's key-frame ceilings are asserted, not printed, and hold.

| Figure | Before | After |
| --- | --- | --- |
| the opening ✓ | 208360 px dirty (ceiling 237238), 220 objects | 208844 px dirty (ceiling 237722), 220 objects |
| the closing | 194324 px dirty (ceiling 237238) | 194808 px dirty (ceiling 237722) |
| the opening ✓ cutting a moment | 304424 px dirty (ceiling 333302) | 304908 px dirty (ceiling 333786) |
| meet → rest | 15926 px dirty | 15926 px dirty |
| Home's walk, twelve adults, frames every 40 ms | worst refresh 141464 px (23.0% of the screen) dirty, worst 6 steps | worst refresh 141464 px (23.0% of the screen) dirty, worst 6 steps |
| Home's walk, twelve adults, frames every 16 ms | worst refresh 141464 px (23.0% of the screen) dirty, worst 6 steps | worst refresh 141464 px (23.0% of the screen) dirty, worst 6 steps |
| Home's walk, twelve adults, frames every 16 ms | worst refresh 141464 px (23.0% of the screen) dirty, worst 6 steps | worst refresh 141464 px (23.0% of the screen) dirty, worst 6 steps |
| Home's walk, six adults and six juveniles, frames every 40 ms | worst refresh 92733 px (15.1% of the screen) dirty, worst 6 steps | worst refresh 92733 px (15.1% of the screen) dirty, worst 6 steps |
| Home's walk, six adults and six juveniles, frames every 16 ms | worst refresh 92733 px (15.1% of the screen) dirty, worst 6 steps | worst refresh 92733 px (15.1% of the screen) dirty, worst 6 steps |
| Home's walk, six adults and six juveniles, frames every 16 ms | worst refresh 92733 px (15.1% of the screen) dirty, worst 6 steps | worst refresh 92733 px (15.1% of the screen) dirty, worst 6 steps |
| Home's walk, twelve, one focused, frames every 40 ms | worst refresh 119288 px (19.4% of the screen) dirty, worst 6 steps | worst refresh 119288 px (19.4% of the screen) dirty, worst 6 steps |
| Home's walk, twelve, one focused, frames every 16 ms | worst refresh 119288 px (19.4% of the screen) dirty, worst 6 steps | worst refresh 119288 px (19.4% of the screen) dirty, worst 6 steps |
| Home's walk, twelve, one focused, frames every 16 ms | worst refresh 119288 px (19.4% of the screen) dirty, worst 6 steps | worst refresh 119288 px (19.4% of the screen) dirty, worst 6 steps |
| Home's walk, twelve, three waiting, frames every 40 ms | worst refresh 141464 px (23.0% of the screen) dirty, worst 6 steps | worst refresh 141464 px (23.0% of the screen) dirty, worst 6 steps |
| Home's walk, twelve, three waiting, frames every 16 ms | worst refresh 141464 px (23.0% of the screen) dirty, worst 6 steps | worst refresh 141464 px (23.0% of the screen) dirty, worst 6 steps |
| Home's walk, twelve, three waiting, frames every 16 ms | worst refresh 141464 px (23.0% of the screen) dirty, worst 6 steps | worst refresh 141464 px (23.0% of the screen) dirty, worst 6 steps |
