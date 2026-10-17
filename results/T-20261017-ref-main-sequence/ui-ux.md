# Main Sequence: structure and interaction (UI/UX)

The owner asked for this at 14:23. The art director covers the look in `results/T-20261017-ref-main-sequence/art-director.md`, with the sheet. This part covers how its screens show state, priority and the way into each system, and what maps onto our 1024 × 600 LVGL Station.

## What I could see

- All 13 Steam store screenshots, at 1920 × 1080.
- The Gameplay Trailer (75 s), sampled at one frame every 4 s.
- The Demo Trailer, sampled at one frame every 3 s.
- I did not play it, and I couldn't judge continuous motion, easing or sound. The motion notes come from frames.
- Source: the Steam store page and its public app details. No paid calls.

## How it is built

| | What it does |
| --- | --- |
| **State** | The factory hall is the dashboard. A working machine has lit orange windows; an idle or ready one shows a green strip. Ore rides the belts. You read production from the room without opening a panel |
| **Assets** | The Stations / Ships / Fleets overlay shows one card per asset: its own blueprint silhouette, its name, one plain status line ("Navigating to Industrial Dock 1", "Autopilot Disabled") and a gear. The world stays behind it |
| **Priority** | One mission tracker top left (a single current objective), a toast for finished research, and a rank badge. Red is used only for real harm: an ALERT banner, and "Scout is under attack!" |
| **Routes** | System icons bottom right, each showing its key letter on a chip. A 1–0 hotbar for build items. Confirm, Rotate and Cancel appear as key chips |
| **Instruments** | The cockpit's three screens are set into the console: power and fuel, speed, hull. Amber text on black, only what matters in flight |
| **Research** | A tree with locked nodes padlocked, and a queue with progress and an "unlocks" row |
| **Feedback (frames)** | Placement shows as a translucent ghost with direction chevrons before you commit. Beams, plumes and belts show work as motion on the thing itself. A "Press F to pet drone" beat |

## What maps onto our Station

1. **State as light on the machine.** This is the strongest structural lesson, and it agrees with the T-199 research (agreement 2). Each Home system carries its true state as its own light or window: the bud's glow, a pod's ring, the pursuit's pieces lit. The moving 3D camera doesn't transfer; the principle does.
2. **A picture and one line per thing.** It maps directly to our pods and mibis: a shell or stand, plus one origin or state line. Their blueprint silhouette is our frosted, unread look. In LVGL this is an image and a label.
3. **Show the key on the control.** Our hardware room keys could appear on Home as small key-colour chips, so routes live on the hardware and are visible. One chip per key, never a legend of shortcuts.
4. **One standing objective, one alert.** This confirms our single ✓ need and one standing thread (the pursuit's next step). Red stays for true harm only.
5. **The outcome before the commit.** It is the same idea as our decision windows. A ghosted founder change on Create is possible in LVGL as reduced opacity over a static ground. Not over the living window: fill rate, and our no-translucency rule.
6. **Hand-offs the player watches** (the art director's lesson). This agrees with our four-beat hand-off grammar (`results/T-20261016-197/ui-ux.md`): the destination answers first, the object travels whole, and the arrival answers.

7. **Trees for complex structured data** (the owner, 14:49: "the trees are valuables for certain screens, a genome for example… the intellectual player appreciates the structure that trees give to complex data").
   - **Where:** the genome (chapters and their loci), lineage, and the research progression.
   - **How:**
     - The nodes are pictures (emblems, look tiles, faces) more than named boxes.
     - Locks and gaps are drawn as shapes: a padlock, an empty frame, a frosted node.
     - Edges show the real dependency.
     - It sits in the slate kit.
     - On our keys: ◀ ▶ walk the siblings, ▲ ▼ go up and down a level, and ✓ opens a node. The focused node's name goes in the bottom line rather than on every box. This keeps the tree readable at 1024 × 600 and close to the genome screen's earlier tree layout (`specs/station-genome-screen-spec.md`).
   - **Not on** Home or the decision panels, where a single picture serves better.

## What not to take

- **Text density:** key legends, cost lists and stats strips everywhere, against "pictures over words".
- **Management as lists of cards with gears:** the menu the owner rejected for Home.

