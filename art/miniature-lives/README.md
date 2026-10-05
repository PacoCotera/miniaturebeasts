# Miniature Lives at device size

The creature should feel rounded, tactile and alive even when its image occupies only part of a small screen. This study is the accepted appearance reference for [Miniature Lives](../visual-directions/README.md#b-miniature-lives): a crisp HiBit treatment for Companion and a matched richer treatment for Station and larger image regions. Further artwork should preserve this relationship across display sizes.

Plain saved Pip and a separate hypothetical marked specimen share the same body plan, crown, pose and lighting. The comparison isolates the coat pattern; it does not change Pip's saved appearance or predict an offspring. Full portraits assume complete knowledge. Partial research still requires anatomy-free references.

## Companion

![Companion resident proposal](exports/companion-resident.png)

The 450×600 composition reserves 280×300 pixels for the creature. Identity and inherited meaning remain readable outside the artwork. The focus is on the existing visit action; this still image shows neither an executed action nor a resulting behavior.

<a id="lab"></a>

## Station

![Station known comparison proposal](exports/lab-known-comparison.png)

The 1024×600 composition uses equal 300×310 artwork areas for saved Pip and the hypothetical marked specimen. It is a free, fully-known comparison, not a breeding operation or a newly acquired resident. Richer shading must preserve the same trait boundaries.

[Tall comparison](exports/device-comparison.png) places the device screens and both HiBit specimens at their exported pixel sizes. A browser may scale the overall board to fit; open the individual images at 100% to judge their actual raster size.

The [richer source pair](assets/rich-pair-source.png) retains the material detail for larger image regions. The smaller treatment preserves rounded cheek and belly volumes, expressive eyes and the clear pale markings while simplifying texture. The two treatments remain visually related in this example; that does not establish consistency across a generated creature population.

## Sources and limits

The [art manifest](manifest.json) identifies original images, extracted derivatives and actual source-to-display transformations. [Exact prompts](prompts.json) retain the creative inputs. [Export manifest](exports/manifest.json) binds the screen images to those assets. Generated pixel-style concepts and their display derivatives are not hand-authored native pixel masters.

The rendered type uses an observed monospaced fallback; its exact resolved family is unverified. Typography and reusable pixel masters still need deliberate production work within the selected appearance.

[The disposable composer](compose.cjs) places retained artwork and separate text using the existing Node/Sharp environment. Run `node compose.cjs` with Sharp available through the environment; it does not execute gameplay. Acceptance covers the displayed appearance and the relationship between the two treatments. These static compositions do not establish a procedural renderer, animation or physical display performance. The [screen standard](../screen-design-standard.md) owns the adaptation requirements.
