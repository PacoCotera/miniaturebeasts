# The rooms for the mibi collection v2 (0 MXN)

The collection v2 art job on the four rooms: code and hand work on the signed room masters, no painting call and no paid image call. `tools/rooms_v2.py` makes everything here from the rooms folder of this branch at b7bc7c9e (the commit the Station places its rooms from); this folder holds the files it changes or cuts and the manifest of the copy it writes. Laid over the rooms folder at b7bc7c9e, they are the copy the Station places (`place-masters.mjs --rooms`).

```
git archive b7bc7c9e art/station-masters/pods/rooms | tar -x -C /tmp/mp-b7bc7c9e
python3 tools/rooms_v2.py /tmp/mp-b7bc7c9e/art/station-masters/pods/rooms /tmp/mp-v2/art/station-masters/pods/rooms
```

The script is deterministic: run again, it writes these files byte for byte (their SHA-256 are in `rooms-manifest.json` `hashes`; every one is listed under `unsigned`, for the art director's check at 1x).

| Files | What |
| --- | --- |
| `rooms-manifest.json` | the copy's manifest: each room's window for the room view (`view`: crop, keep boxes, eight drop spots), its chip and its house tile, and the pieces moved for the windows (their keep-outs moved with them) |
| `seated-idle-boulders-{dawn,day,dusk,night}.png` | Boulders' rear stone (x 842 to 915) painted out of the four bases, the moss mound closed behind it, the tall stone carried down |
| `pieces/roots/roots-bed-{light}.png` | Roots' bed re-lit for its new ground [248, 496, 192, 56] (the ground's light matched part way, a contact shadow of the path's soil) |
| `chips/room-{room}-chip-{light}-128x32.png` | the room chips: 128 x 32 cuts, 1:1, from inside each window |
| `tiles/room-{room}-tile-{light}-344x236.png` | the house view's tiles: each room's window [cx, 96, 688, 472] as the room view draws it with no mibi (the base, its back pieces, the bed, its occluders by their foot), reduced to exactly 1/2 by 2 x 2 box averages; 16 cuts |

## The pieces moved

- Roots: the bed [248, 496, 192, 56]; roots-stone-2 [592, 499, 68, 41], roots-mister [610, 323, 50, 34] and roots-mist-2 [540, 324, 80, 18], on main's back edge, so Home's window (its right edge at painting x 668) holds them whole with 8 px clear. Drop 7 stays at (560, 536): moved left it would come nearer than 88 px to drop 4 at the same depth.
- Reeds: the rain cup [818, 303], its drop from the lip at x 844.
- Boulders: stone-2, the shishi, the arm and its pivot (+32 px, the trickle with them), cushion-1, and the lantern on the mound's crest.
- Ferns: the copper lines and crozier-1.

## The crops

Roots [0, 96], Reeds [176, 96], Boulders [178, 96], Ferns [152, 96]: the room view's 688 x 472 window on the 1024 x 568 painting. A tile pixel is (painting − (cx, 96)) / 2.
