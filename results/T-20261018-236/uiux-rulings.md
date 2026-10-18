# T-236: two release rulings (UI/UX, 2026-10-18 15:54)

These rulings apply to `build/t-236-release-ready` at 8b86712e. The builder implements them as written.

## 1. The Pods stamp label against the v4 pod: (c), the rule changes

**What I measured** (`pods-overview-identified-pod-focused`; linear luminance; the label rect is [804, 400, 120, 120] and the main rect [184, 216, 144, 176]):

| Golden | Label mean / p95 | Pod mean / p95 |
| --- | --- | --- |
| before v4 (5112503c) | 0.174 / 0.223 | 0.193 / 0.804 |
| v4 (3e230411, = work-queue 5c68e4fc) | 0.174 / 0.223 | 0.131 / 0.285 |

- **The label did not change; the pod did.** The old pod's cream cap carried the pod's mean, and the v4 pod is terracotta and blue all over. Counting only the pod's own pixels (an ellipse inside the ring) gives 0.128, so masking the rect, as Create does, would not help.
- **(a) A new label dimming can't pass the test's own floor.** The cells read at 4.14 against the 4.11 floor. Dimming the label in linear light to bring its mean under the pod's (× 0.7 gives 0.122) drops the cells to 3.37, because of the 0.05 flare term. Legibility is the hard floor, so (a) is out.
- **(b) A different seed hides a real state.** Every v4 Loika pod looks like this one on the device. A golden that dodges it tests nothing, so (b) is out.
- **(c) The rule.** The mean comparison penalises a specimen for its pigment, not its prominence. What pulls the eye is the highlights, and the place and size: the pod is 144 × 176 at the left with the focus ring, while the label is 120 × 120 in a dim case in the corner. In the v4 golden the pod leads.
  - **Kept:**
    - label p95 under the specimen's p95 (0.223 against 0.285: passes);
    - the cell contrast of at least 4.11;
    - the sRGB caps (111, and Create 115);
    - Habitat's absolute 0.079 / 0.192.
  - **Dropped:** label mean under the specimen's mean, on all four screens, so they stay one rule.
  - The test's name and message say "the label's highlights stay under the specimen's", and they cite this file.

The art director owns the stamp formula and gates the 9 retaken Pods goldens (the v4 pod is an art change). If they would rather change the stamp itself, so that a dark specimen still out-measures the label at 4.11, their ruling replaces this one.

## 2. Docking from the play page: the arrival plays on Cargo, then Later lands on Home

The Station journey (`home-dock-arrival`) is right, and the play journey's B2 and C assertions are wrong. The spec says both things, in order (`prototypes/ui/specs/station/frame.json` `navigation.dock`):

1. **The landing:** from Pods, the Incubator, the Vivarium, one mibi up close, the Library or the Probe bench, the Station lands on Home with the ring on the room.
2. **`navigation.dock.arrival`:** "the Companion's dock plays the arrival … over the screen the player is on". The arrival is Cargo's show, so the screen is `cargo` and the state is `arrival` (`cargo.json` `regions.arrival`). It holds input for crates × 3000 + 200 ms, then shows the choice strip (Open the bay | Later).
3. **Later** (▶ then ✓) is Home with the ring on the room, and the crates sit in the Cargo module, its lamp `needsYou`.

Every play-journey context seeds a crate, so every dock there plays the arrival first.

**Changes to `prototypes/play/tools/journey.mjs`** (the code doesn't change):

- **B2:**
  - Within 600 ms of Shift+D, expect `[UI.screen, state] = ["cargo", "arrival"]`, docked, the keys on the Station and the live region "Companion docked".
  - Wait out the show (one crate: 3200 ms, plus a margin), expect the strip with the ring on Open the bay, then press ▶ and ✓.
  - Then expect `["home", "room"]` ("the landing rule: after the arrival, Later is Home with the ring on the room").
  - The `play-wide-docked.png` clip is taken after Later.
- **C (narrow):** expect `["cargo", true]` ("Dock shows the Station: the arrival on Cargo"), then do the same Later steps and expect `["home", "room"]` before the Lift.
- **B3 onward** is unchanged, because it starts from Home after Later.

This matches the play layout ruling's §4 (`results/T-20261018-play-layout/ruling.md`): the Station takes the keys at the contact beat and scrolls into view, so the arrival is seen.

## 2a. Follow-up (16:12): Later returns to where the player was, (b)

At head 96316446 the code plays the arrival over Pods, and Later returns to Pods. `frame.json` `navigation.dock` still sends a dock from Pods to Home. **The code is right, and the spec is corrected.** This replaces §2's B2 expectation.

- **Why:**
  - The play page's redirect to Home existed so that a dock made while another device has the keys lands somewhere it can be seen. Since the arrival plays over any screen and takes the keys, the arrival itself is the thing seen, so the redirect has no job left.
  - On the device, a dock with the Station's keys never navigates (`navigation.dock.rule`, "each screen's own cut"). (b) makes the play page behave like the device, rather than a separate play-page rule.
  - Returning the player to what they were doing is the expected default. Home's Cargo module still lights `needsYou`, so the crates are not lost.
- **B2:** after the arrival and Later, expect `UI.screen === "pods"`, with Pods' ring where it was before the dock. Don't assert `UI.home.f`, because it is Home's memory and says nothing about Pods.
- **C (narrow):** C docks from Home, so it keeps the §2 expectation, `["home", "room"]`, after Later.
- **The spec fixes** (in the T-236 branch, as text only):
  - `frame.json` `navigation.dock.rule`: the play-page clause becomes: "Pressed while another device has the keys (the play page): the Station takes the keys and behaves as if it had them: the arrival plays over the screen it is on (`arrival`), and Later returns there".
  - `station-layouts.md` line 60: the landing list goes, and the line says the same thing.
  - `idle.keys.dock` (from Idle: wake, then Home) is unchanged.
  - The waits for Create, Cross, the namer and the Sitting are unchanged.
