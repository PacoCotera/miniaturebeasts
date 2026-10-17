# T-20261016-41: Create, the gene bench (AD, 10-16, by hand in code)

The purpose (`specs/station-create-bench-spec.md` §0, on work-queue): the player changes their new mibi by turning drums on a bench, and watches the founder change. Every object sits on the bench and has a job.

The style is `design/art-direction.md` and `design/style-guide/README.md`, with the concept's mood note. It is a workbench in warm daylight: the Pods housing and ground, moulded sage polymer drums worn where a thumb turns them, real paper with a matte steel clip, the vivarium's moss, and one key light from the top left. No paid call.

## The masters (`make-create.py`, `make-looks-64.py`)

| Id | Size, place | Job |
| --- | --- | --- |
| `create-bench` | 1024×522 at (0, 40) | One matte work surface: everything sits on it or in it. The well's seat, the dish's cut-out and the tray are moulded in. Its ground is `incubator-b/make-stage.py --ground` (kept here as `ground-1024x522.png`) |
| `create-well` | 192×192 at (96, 96) | The pod's seat, as on Pods: cut from the Pods room sheet as the 176 was |
| `create-gene-line` | 24×216 at (288, 192) | The braided line: the drums are fed by this pod |
| `create-dish` | 400×28 at (312, 372) | The moss pad the founder stands on (the vivarium's moss, mirrored, in a sage rim) |
| `create-drum-rest`, `-pinned`, `-capped`, `-clash` | 80×80 | The genes as things you turn. The window (64×64 at (8, 8)) is clear |
| `create-drum-notch`, `create-drum-turn-up`, `-down` | 12×8; 16×8 | Changed; turn up or down |
| `create-bank-more-left`, `-right` | 16×80 at (104 / 904, 440) | More drums past the edge |
| `slip-208x296` | 208×296 at (728, 96) | The slip: made by `incubator-b/make-slip.py`, the same paper as the Incubator's (T-20261016-27) |
| `look-…-64x64` | 64×64 | The drum's window: each look as a flank close-up (the signed look-plate recipe at 64) |
| `founder-S01-base-304x312`, `founder-S01-crown-leaf-crest-304x312` | 304×312 at (360, 80) | The founder's body with a bare head, and the leaf crest (the part only, over it). Status `new`: they come from the S01 floor set, which its README marks "not signed yet" |

## Close-ups made (25)
- `look-S01-markings-plain-64x64`
- `look-S01-markings-pale-patches-64x64`
- `look-S01-crown-bare-head-64x64`
- `look-S01-crown-leaf-crest-64x64`
- `look-S01-eyes-thin-rings-64x64`
- `look-S01-eyes-between-64x64`
- `look-S01-eyes-wide-pale-rings-64x64`
- `look-S01-drive-64x64`
- `look-S01-efficiency-64x64`
- `look-S03-markings-plain-64x64`
- `look-S03-markings-stripes-64x64`
- `look-S03-markings-spots-64x64`
- `look-S03-markings-stripes-and-spots-64x64`
- `look-S03-scales-few-fine-64x64`
- `look-S03-scales-between-64x64`
- `look-S03-scales-many-coarse-64x64`
- `look-S03-crest-low-crest-64x64`
- `look-S03-crest-between-64x64`
- `look-S03-crest-tall-crest-64x64`
- `look-S03-tail-short-thin-64x64`
- `look-S03-tail-between-64x64`
- `look-S03-tail-long-thick-64x64`
- `look-S03-carriage-hangs-64x64`
- `look-S03-carriage-straight-64x64`
- `look-S03-carriage-curls-up-64x64`

## Owed (39): no signed painting to cut from; an empty slot draws nothing
- `look-S03-colour-lagoon-64x64`
- `look-S03-colour-jade-64x64`
- `look-S03-colour-marigold-64x64`
- `look-S03-colour-periwinkle-64x64`
- `look-S03-colour-two-side-by-side-64x64`
- `look-S03-trim-milk-mint-64x64`
- `look-S03-trim-cream-64x64`
- `look-S03-trim-ice-64x64`
- `look-S03-trim-slate-64x64`
- `look-S03-trim-two-side-by-side-64x64`
- `look-S03-eyes-small-close-64x64`
- `look-S03-eyes-between-64x64`
- `look-S03-eyes-big-wide-64x64`
- `look-S03-snout-short-narrow-64x64`
- `look-S03-snout-between-64x64`
- `look-S03-snout-long-broad-64x64`
- `look-S03-build-slim-64x64`
- `look-S03-build-between-64x64`
- `look-S03-build-stout-64x64`
- `look-S03-haunch-small-64x64`
- `look-S03-haunch-between-64x64`
- `look-S03-haunch-full-64x64`
- `look-S03-topline-dipping-64x64`
- `look-S03-topline-level-64x64`
- `look-S03-topline-arched-64x64`
- `look-S03-legs-short-fine-64x64`
- `look-S03-legs-between-64x64`
- `look-S03-legs-long-stout-64x64`
- `look-S03-pace-64x64`
- `look-S03-stride-64x64`
- `look-S03-weave-64x64`
- `look-S03-turning-64x64`
- `look-S03-strength-64x64`
- `look-S03-reserve-64x64`
- `look-S03-thrift-64x64`
- `look-S03-curiosity-64x64`
- `look-S03-nerve-64x64`
- `look-S03-glow-64x64`
- `look-S03-duration-64x64`

## The founder's per-look layers: which traits can be isolated as a part
- **S01 Crown:** yes. The floor set's bare key plus the crest overlay ("base + overlay equals the base outside mask and band, 0 differing pixels").
- **S01 Eyes and Markings:** not as parts yet. The floor set's ring steps "are not cut yet" (its README), and no per-look markings layer exists. Both need the floor set's next pass.
- **S03, every trait:** no. There is one full-body painting and no keys or overlays. Isolating any trait needs a keyed set like S01's.
- **Doings** (Drive, Efficiency and S03's eleven): none are a part; a doing is pinned.

## Not painted here
The pod opened and closed at 112×136 per species (spec §7). It comes from Pods' renderer, which is the build's.

## Proof
- `proof/create-shape-S01-1x.png`: S01's shape state at 1×, with the bank of five drums, the Crown turned and focused.
- `proof/comparison-create-S01.png`: the same beside Pods (focused and collection), the vivarium and the kit.
- **Stand-ins (the build's):** the pod in the well (S01's shell from the signed pod-large layers, reduced), all live text, the focus ring and the founder's contact shadow.

## T-20261016-69: drums you turn, the gene line as a feed, a re-proof with stand-ins
The review (`results/review-art-2026-10-16b.md` §3) found three problems: the drums read as flat tiles, the gene line as a post, and the slip was blank.

**The drums** (`create-drum-rest`, `-pinned`, `-capped`, `-clash`, 80 × 80; the window 64 × 64 at (8, 8) where the spec puts it):

*How each reads as a drum:* a sage drum on a horizontal axle, sitting in a slot of the tray, with one face showing in its window.
- **The round:** the 8 px above and below the window are the drum's surface turning away. They are bright above (toward the key) and fall into shade below.
- **The grip:** ribs run across the round, parallel to the axle. They sit closer together as the surface turns away, and their crowns are worn pale at the centre, where a thumb turns them.
- **The next faces:** their window edges show as thin dark slivers at the top and bottom of the round, so more faces wait above and below.
- **The face:** the round's fall-off is carried over the window's top and bottom quarters at partial alpha (the middle half stays clear), so the picture sits on the drum, not in a frame. This is the drum master's only change inside the window; it was already drawn over the picture, with a partial-alpha inner shade.
- **The axle:** the slot's dark cheeks at both ends, each with the axle's round boss, so the drum turns about a line across.
- **Pinned:** the rings are engraved on the round below the window, foreshortened.
- **Capped and clash:** as before, on the new drum.
- **The notch and turn marks** (`create-drum-notch`, `-turn-up`, `-down`) are unchanged: they sit on the round, at the spec's offsets, and still read there.

*The limit, reported:* at 80 × 80 with a 64 × 64 window, the drum keeps only 8 px of round above and below. At 1× it reads as a ribbed drum face in a slot, but the picture still takes 64 percent of the drum. A taller drum would show the round, and the next faces' pictures foreshortened in it, much more strongly: for example 80 × 96 with the window at (8, 16). The tray's 122 px holds that only if the chapter words move. Those are UI/UX's rects, so they are not changed here.

**The gene line** (`create-gene-line`, 24 × 216 at (288, 192)): a braided hose, with two strands crossing.
- It leaves the well's side through a sand ferrule at (288, 200), where the rect's corner touches the well's rim.
- It bends down (radius 10) and runs to the tray with a little slack.
- It goes into the tray's top wall through a dark rubber boot (rows 198 to 216).
- Its soft shadow falls right and down on the bench.

The 24 × 216 rect holds this route, so no new rect is needed.

**The re-proof** (`proof/create-shape-S01-1x.png`; the sheet `proof/comparison-create-S01.png`; `proof/drums-and-line-before-after-2x.png`). Stand-ins (the build's):
- **The chapter words:** Coat, Face, Movement, Stamina, 16 px `mist` at lineTop 414.
- **The slip at the spec's longest case:** the heading, 4 changes and "and two more", the clash line with a drawn cross for `icon:cross:16`, then "Still a surprise" and 2 lines. The last line ends at y 360, within 376. S01 itself can change at most three traits, so the words are stand-ins for the fit.
- **The founder's contact shadow** under its feet.
- **The pod in the well, closed:** Pods' renderer has no open state, so the opened pod is not shown.

**Reported, not the art's:**
- **The clash line:** "✕ Crown and Eyes clash" is 180 px, over the 176 limit (copy).
- **`mist` on the slip's paper** (the "Still a surprise" list) is hard to read at 1×. That is the spec's colour (UI/UX).
- **The founder:** the S01 base painting's feet end at row 304 (screen 384), not at foot line 392, and its rear feet stand above the dish's top edge (372). The founder's placement is the spec's and the build's.

## T-20261016-96: the drums at 80 × 96
The spec as amended by T-20261016-95 (the drum 80 × 96, the window at (8, 16), the face bands at (8, 8) and (8, 80), the notch 8 × 16 at (72, 40), the turn marks at (32, 0) and (32, 88)).

**Repainted:**
- **`create-drum-rest`, `-pinned`, `-capped`, `-clash`:** the drum seen side-on on its axle in a slot.
  - **The round:** rows 0–8 and 88–96 turn away, lit above and falling into shade below, with grip ribs closing up and worn pale at the centre.
  - **The face bands:** painted as its plain round, with a dark seam at each face's edge. The build draws the previous face's last 8 rows and the next face's first 8 there; a one-face drum shows the plain round.
  - **The window:** clear in its middle.
  - **The sides:** the slot's cheeks with the axle boss.
  - **The states:** capped frosts the window and both bands, pinned's rings sit on the bottom round, and clash keeps its red rim.
- **`create-drum-notch`:** an 8 × 16 cream wedge on the right rim.

**New:** `create-drum-shade-80x96`, drawn over the bands after the faces.
- The bands darken toward their outer edges, the lower one more.
- A dark seam sits where each band meets the window.
- The window's top lip is lit.
- So the neighbouring faces read as turning away.

**The order per drum:**
1. the close-up in the window;
2. the drum;
3. the neighbouring faces' rows in the bands;
4. the shade;
5. the notch and turn marks.

**Unchanged:** the turn marks (16 × 8; only their offsets moved, which is the build's).

**Owed, not painted here (reported):** the amendment also changes masters this ticket says stay:
- the bench slice's tray (88, 360, 848 × 130) and dish cut-out (312, 324);
- `create-gene-line` at 24 × 208;
- `create-bank-more-left` and `-right` at 16 × 96;
- `slip-208x288`.

The re-proof draws the amended rects with T-69's bench, gene line and slip, so the dish sits 8 px above its cut-out and the chapter words straddle the old tray's edge.

**Proofs** (`proof/`):
- `create-shape-S01-1x.png`, **the owner's proof**, at the amended rects with T-69's stand-ins;
- `drums-80x96-before-after-2x.png`;
- `comparison-create-S01.png`.

## T-20261016-110: the bench re-cut to T-95's layout (the drums stay)
Re-cut only, with the same materials, grain and light as T-41 and T-69.

**Re-cut:**
- **`create-bench`:** the tray recess is at (88, 360, 848 × 130) in the slice (screen 400–530), and the dish's cut-out at (312, 324) (screen 364).
- **`create-gene-line`, 24 × 208:** the boot moves up 8 px, so it ends at the tray's top edge, y 400.
- **`create-bank-more-left` and `-right`, 16 × 96:** the chevron is centred at mid-height.

**New:** `slip-208x288`, from `incubator-b/make-slip.py` (the same paper and clip, cut at 288). `slip-208x296` is withdrawn for Create; `slip-208x408` (Incubator) is unchanged.

**Unchanged:** T-96's drums, the notch, the shade and the turn marks, which rebuild byte for byte. Also unchanged: the well, the dish and the close-ups.

**Checked in the re-proof** (`proof/create-shape-S01-1x.png`, **the owner's proof**; `proof/bench-recut-before-after-1x.png`; `proof/comparison-create-S01.png`), at 1× and 3×:
- the chapter words (lineTop 400) sit inside the tray, on its back rim;
- the dish sits in its cut-out, with the founder's contact shadow on it;
- the gene line's boot ends at the tray's top edge.

**Not done (optional step 3):** re-cutting the 64 × 64 close-ups with content nearer their edges. The close-ups are the signed look-plate recipe at 64, and changing their framing changes every drum's picture. That would be a restyle, beyond a re-cut, so I left it for a ticket that asks for it.

**Lab sweep (T-20261016-128):** `slip-208x288`: withdraw when T-126's display art lands (T-20261016-130 has painted it). Not deleted.
