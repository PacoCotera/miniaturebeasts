# The type pass: art rulings (art director, 2026-10-24 17:08 Mexico City)

Scope: art only, read-only, 0 MXN. I answer UI/UX's type-spec.md §5 "For the art director" (items 1–6, plus §3's AD marks) and sign or hold the specimen's roles. Geometry, words and rules belong to UI/UX, the copywriter and the game designer. Where an art answer needs one of their lines, I say so.

**What I read.** type-spec.md; cw-case.md; gd-rulings.md; the style guide README (§2 colour, §4 type: "Text that does sit on art gets a 1 px dark shadow", "never 13 px or smaller"); palettes/station.json; and my own rulings (ad-kit-ruling.md G9/G10/C10, sheet-art.md).

**What I measured at 1x.**
- **type-specimen.png.** Read at 1x, with 2x and 3x crops.
- **The painted grounds under every AD-marked string.** For each string in UI/UX's type/checked.json, I took the ink box from the station-gate goldens (ffb1fd37) and measured a 4 px ring of ground around it: luminance p50 and p90. Each pair below is the contrast against that ground, at p50 and p90. Tool: scratchpad/ad4t/ground.py.
- **A 1x preview of each proposed colour on its real painting.** I erased the string, then re-set it with PIL in the repo's Inter, with and without the shadow (scratchpad/ad4t/preview-1x.png and -2x.png). The same caveat as the specimen applies: these are not face glyphs.

| String (now) | Ground | now | `fog` | `bone` |
|---|---|---|---|---|
| Habitat module eyebrows (`metal`) | painted plate, L 0.030 | 4.1/4.0 | 7.7/7.5 | 11.0/10.7 |
| Bench "Mend" / "Upgrade" (`metal`) | painted plate, L 0.030 | 4.1/4.0 | 7.6/7.5 | 11.0/10.7 |
| Habitat card story (`mist`) | painted card, L 0.030 | 3.9/3.8 | 7.7/7.5 | — |
| Decision-panel card line (`mist`) | painted card, L 0.046 | 3.3/3.2 | 6.4/6.2 | — |
| Pods "this pod" and "every Loika" (`mist`) | painted bench, L 0.047–0.055 | 3.2/3.0 | 6.3/5.8 | 9.1/8.4 |
| Home "away" (`frost`) | painted window, L 0.025–0.049 | 12.1/9.2 | 8.2/6.2 | — |
| Home Library-window caption (`mist`) | painted window, L 0.009–0.012 | 5.3/5.1 | 10.3/9.9 | — |
| Create origin (`sand`) | painted bench, L 0.075–0.081 | 5.3/5.0 | 4.9/4.7 | 7.1/6.8 |
| Create code (`mist`) | L 0.027–0.030 | 4.1/4.0 | — | 11.4/11.1 |
| Cargo arrival band (`mist`) | painted bay wall, L 0.069–0.112 | **2.7/2.0** | **5.2/3.8** | 7.5/5.5 |
| Pods and Create unread tab words (`mist`) | tab ground, L 0.027 | 4.1/4.1 | 7.9 | 11.4 |

## Rulings, item by item

**1. Quiet text on the bars: `fog`. The bar stays `bar`.**
- **Ruled.** The bottom line's subject, the top bar's readout ("All species") and the date are `fog`, 16 Regular, on `bar` (8.6:1).
- **Not ruled.** I do not darken `bar`. It is the signed frame colour of every screen, and a darker bar pulls toward the "cabinet" look the station brief forbids.
- **The ← word** stays `fog`, so the bar now has bone, fog and the orange verb. That is three steps, and they read in the specimen's bottom line at 1x.

**2. `metal`, `sand` and `frost` carry no words. Each becomes as follows:**
- **The Habitat's module eyebrows** ("Companion", "Portrait", "Cross", "Wild") and **the bench's "Mend" and "Upgrade"**: `fog`, 16 Medium, **with no shadow**. These painted device plates measure L 0.030, which is as dark as `libPanel`, so they are panes, not paintings (7.5:1). On my preview, `metal` read as dust on the sage rims, and `fog` Medium reads as the plate's own label without competing with the bone lines.
- **Create's origin**: `bone` 16 Regular, **with the shadow** (painted bench, 6.8:1 at p90). It matches Pods' origin. The style guide keeps `sand` as the housing's engraving colour (§2), never type.
- **Create's code**: `bone`, as on the Habitat (11.1:1). It takes the shadow only where it sits on the painted bench.
- **Home's away caption**: `fog` **with the shadow** (6.2:1 at p90). `frost` means "unknown" in this game (§2 state), and a caption is not unknown.

**3. Unread tab words: `mist` stays, as the state colour.**
- **Measured.** 4.1:1 on the tab ground. The read tab words are bone (11.4).
- **Why `mist`.** bone against mist is the clear two-step that says read or unread, now that Pods draws no pips. `fog` (7.9) would sit too close to bone for a state that has no other sign.
- **Allowed** under UI/UX's rule 3, the one exception to 4.5:1. Create keeps its marks under the words.
- **Not allowed.** The state is never carried by `frost`, `stone` or any dimmer value.

**4. The text shadow on paintings.**
- **The exact form:**
  - one copy of the string in `void` #0c0a12, offset (+1,+1), drawn under the string;
  - the same glyph coverage (AA), opaque;
  - no blur, no spread, no outline on the other sides and no halo. A glow is forbidden, and this is a 1 px cast, not a glow.
- **Where it applies.** It applies only to light type (`bone`, `fog` and `gold`) whose ground is a painting:
  - Pods' origin, "this pod", "every Loika" and the place name;
  - Create's origin, and its code where it sits on the bench;
  - Home's Library-window caption, including its "20 new" in `gold`, and the away caption;
  - Cargo's arrival-band words.
- **Where it does not apply:**
  - Type on a device plate or card whose painted fill is in libPanel's range (L ≤ 0.05): the Habitat card and modules, the bench plates, the decision-panel cards. Those are panes.
  - Dark type: `ink` on the Incubator's light wall never takes a dark shadow.
- **The colour it carries.** On a painting, quiet text is `fog` with the shadow, **except Cargo's arrival band**. The bay wall is the lightest painted ground under type (L up to 0.112, where `fog` is 3.8:1 at p90), so there the words are **`bone` with the shadow** (5.5:1 at p90, 7.5 at p50). On my preview, `fog` with the shadow read there, but under the floor. UI/UX: the role table's "painted" column gains this one cell.

**5. The Medium weights: the specimen's roles are SIGNED.** I sign the weights, and the colours per ground, as the specimen sets them:
- **Display name:** 28 SemiBold bone.
- **Heading:** 20 Medium bone.
- **Eyebrow:** 16 Medium fog.
- **Label and body:** 16 Regular bone.
- **Quiet:** `mist` on the field, `fog` on a pane and on the bar.
- **Figure:** 16 Medium bone.
- **✓ verb:** 16 Medium orange.
- **Subject and ← word:** fog.
- **Notice:** amber. **Loss:** coral.

Medium at 16 makes the eyebrows, figures and the verb read apart at arm's length without becoming bold. It stays in Inter's own voice and is never childish. On the painted plates (my preview of "Cross" and "Mend") it reads as the plate's label. The decision panel's question at 20 Medium (from 28 SemiBold) is right: a question is not a name.

**What I am not signing (fix the specimen if it is reused as a reference).** These are not part of the roles:
- The Unlocked bezel is drawn with a cool `hairline` edge (61,67,75). Library bezels have no edge (C10).
- The open wish disc is an AA ring of about 14 px. The build places look-disc-open-16 (frostS, diameter 11, 1-bit).
- The top bar's mark is a green placeholder square and the supply icons are stand-ins.

**6. Library Level 2: the printed sheet text moves into the face. Accepted, on these art conditions:**
- **(a) Surfaces stay in the picture, and only type moves.**
  - The generator still draws the plates, the two bottom bands and the page as flat bezel pixels, now at 160×72. The band is 28: row 0 libPanel, rows 1–28 libHead, the libWell rule on row 29, then the body.
  - The face sets only the words over them, at the prop rects.
  - Face bezels drawn over the picture would cover the mosaic cells and swatches, so the surfaces cannot move to the face.
  - No type is printed into any library picture after this. The 12 px and 14 px glyph tables retire.
- **(b) The plates grow outward, never into the leader gutter.**
  - Left plates are x 12–172 and right plates x 524–684, which leaves 16 px clear of the shelf at 700.
  - **Why.** UI/UX's L 16–176 / R 520–680 narrows the gutter between the plate column and the dots' circle from 12 px to 8 on each side. My measured tight leader legs would then fall to 4 px (the 7-chapter 05), 5 px (the 8-chapter 08) and 10 px (the 8-chapter 01).
  - **The requirement.** Every vertical leader leg stays at least 8 px from any plate edge.
  - The leader now ends at plate y + 36. The generator re-runs fit-and-leaders for all 16 species and reports, and I re-sign.
  - If UI/UX cannot place 12/684, the art requirement stands and the plate width is the thing that gives.
- **(c) The lit state's dimmed words are `mist`.**
  - In `lit`, every non-lit plate's number, name, index and "Sealed" turn `mist` (the state colour; 3.8:1 on libHead, 4.1 on libPanel). The lit plate stays as found.
  - The pre-mixed 30 % values (for example (113,105,98)) are off-palette, and the face never sets them.
  - The picture still dims the leaders, form sectors and mosaic cells as before (G8a), and the surfaces never dim.
- **(d) The read-once mark** keeps its pixels: fog, 1-bit, the half-filled 10×10 ring. It sits at plate (138, 9), right-aligned 12 px in the 28 band and centred on the cap row.
  - It stays generator-drawn on the plate, and on the page at (286, 9).
  - The game designer's legend question from sheet-art.md is still open.
- **(e) The two bottom bands: the colours band is chips at every count.**
  - Swatch names leave the band, because "Periwinkle," is 81 px against a 57 px swatch at 16 px.
  - My 4th-colour chip rule (31×21 fill, 32×22 ink, pitch 37, 5 a row, pairs split 16/16) now applies from the first colour.
  - The names live on the Coat page, as chips already require.
  - "Coat colours found" and "Every look" are face eyebrows on their 28 band.
  - I do not want the focused-swatch subject: swatches are not focus targets, and the page already names every colour.
  - **Owner, what to see:** the approved Loika at mid now shows three chips where v5 had three named swatches. That is the only change to v5's look, and the 13 px floor forces it.
- **(f) The chapter page's text moves too.** The labels and look names go to 16 px face type. It stays inside the 308×500 page, with the Belatz Coat-complete page (453 at 12 px) as the test case. This belongs in UI/UX's follow-up spec for the bottom bands, and I sign it at 1x then.
- **(g) The wish rows: accepted, as the game designer's call on dropping "Your wish".**
  - Each row is: the star (wish-mark-12) at 712 on the cap row, the disc at 728, then "{Trait}: {look}" at 752, clipped at 244. The star leading each row stands for "a piece of your wish".
  - "{Trait}: {look}" also fixes the bare-word problem I raised at the review shot ("between").
  - This replaces my v5 star-on-the-disc corner placement for the shelf only. Level 1's star placement does not change.
- **(h) "01" in fog and the name in bone, both 16 Regular, cap centred in the 28 band: accepted.**

**Companion (§4), not asked, no objection.** Captions in 2× `fog`, the verb in `orange`, the dimmed verb in `mist`, and 3× pitch 33 keep the 48 colours and the HiBit rules.

## Summary
- **Signed:** the specimen's roles (weights and colours per ground); `fog` on the bars; `fog` replacing `metal` and `frost`; `bone` replacing `sand` and Create's `mist` code; `mist` as the unread-tab state colour.
- **Exact rules:**
  - the shadow: `void`, (+1,+1), glyph coverage, opaque, light type on paintings only, never on panes or dark type;
  - Cargo's band words in `bone` with the shadow.
- **Library Level 2:**
  - (a) surfaces stay in the picture and only the type moves;
  - (b) plates at 12–172 and 524–684, leader legs ≥ 8 px, leaders re-run;
  - (c) lit-state dimmed words in `mist`;
  - (d) read-once mark at (138, 9);
  - (e) chips at every count, names on the page;
  - (f) the page's text in the follow-up spec;
  - (g) the wish rows as proposed, with the game designer's word.
- **Owed to me:** the re-run leaders and every L2 golden at 1x after the build, and the bottom-band and page follow-up spec.
