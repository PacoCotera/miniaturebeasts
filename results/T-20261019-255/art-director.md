# T-255 (Home H3, the console's pictures): art director

**Pass, for the pictures and their placement**, on the 15 stills in `stills/` from build/t-255-home-console-pictures, f271ea88.

## Placement

Every picture was found pixel-exact (1:1, no resampling, no tint) in every still:

| Picture | At | Against the spec's placement table |
| --- | --- | --- |
| Companion, docked or away | (718, 503) | right edge 8 in from the station's (754), centred in the 98 |
| Bay, three berths | x 902, 930, 958, top y 509 | 2 apart, in line 1's row (top at 32), right edge 8 in (992) |
| Bay, with the portrait | crates or shut berths at x 882, 910, 938; the portrait at 966 | the row is 102 wide; the 5 px gap before the portrait waits for T-198, as the spec says |

The pictures read at 1×:
- docked against away;
- the amber underline as the Bay's only signal, beside its lamp;
- the gilt berth, apart from the walk berths.

## Not art, for UI/UX

1. **`berths-portrait`: line 1 is set smaller** ("2 crates in" at about 16, against 20 in the other stills) to clear the 102-wide row. The faces use 16, 20 and 28, and line 1 is 20. At 20 the line would end about 4 px short of the first berth. Choose either 20 with that clearance or the smaller size, and say so in the spec.
2. **`companion-docked`, `berths-*` and the `focus-*` stills: line 1 reads "at home" with no name.** In `home-at-rest-two-needs` it reads "Dot at home", so a fixture is probably missing the Companion's name.
3. **§4.3 says the picture is "right-aligned 12 in".** The later placement table says 8, and the build follows the table. Update §4.3 to 8.
