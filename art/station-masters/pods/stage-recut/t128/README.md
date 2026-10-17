# T-20261016-128: the lab sweep's art (`specs/station-lab-sweep.md` §1 rows 4 and 6)

The Station is a lab, and paper belongs only in the Library (owner, 04:07).

- **The paper tag, cut** (`cut-tag.py`): `room-bench-stage-overview` (2,158 px in 204, 361, 86 × 56) and `room-bench-stage-chapter` (2,235 px in 164, 361, 87 × 56). The pod's name is on its device name plate, so the tag had no job.
  - **The mask:** the tag's paper and string by their brightness (far above the ground and the dish's rim), dilated for its edge and drop shadow, plus the string's faint run up to the rim and the shadow beyond.
  - **The fill:** a harmonic fill from the hole's border, plus the ground's own grain from beside it. Nothing else changes.
- **The title plate, re-cut as a device plate:** `label-plate-cream-216x32`, made by `../../cargo-report/recut/make-label-device.py 216 32`, keeping its id for the build.
  - **The plate:** a slab of the housing's sage polymer, matte, r 3, with its top and left arris lit and its bottom and right in shade.
  - **The field:** a recessed field inset 4, its inner walls shaded and lit, where the title is engraved.
  - **The title:** it stays ink #1a1725 and reads on the field at 5.5:1. No cream, no paper.
- **The slips:** `slip-208x288` and `slip-208x408` are marked "withdraw when T-126's display art lands" in the manifest and in the Incubator's and Create's READMEs. They are not deleted. T-20261016-130 has painted that display.

**Proofs** (`proof/`, labelled inside, each the station-gate golden with only the changed pixels replaced):
- `pods-overview-tag-cut-1x.png`;
- `pods-chapter-page-tag-cut-1x.png`;
- `cargo-report-device-plate-1x.png`, and the plate at 3×.
