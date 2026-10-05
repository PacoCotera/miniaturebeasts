# C18 source extraction kit

This kit provides exact source-pixel comparisons for [C18](../35-vault-composition/18-c-refined.png). It is a static reference extraction, rather than functional UI or production sprite masters. The1280×720 source contains JPEG encoding despite its `.png` filename; the measured screen rectangle is x264,y78,752×421.

The [1× sheet](contact-sheet-1x.png), [2× sheet](contact-sheet-2x.png) and [screen crop](screen-reference.png) preserve original pixels, backgrounds, edges and compression. The2× sheet uses nearest-neighbor enlargement. Inspection labels sit outside the artwork.

[manifest.json](manifest.json) records the immutable source hash, crop rectangles, output hashes and decoded-pixel comparisons. [extract.cjs](extract.cjs) uses the existing Node/Sharp runtime and writes only this directory:

```sh
node extract.cjs
```

`NODE_PATH` may point to an existing shared dependency directory. The recipe compares each crop's decoded pixels against its source rectangle; recorded regeneration preserved the nine crop hashes. This verifies exact extraction, rather than suitability as a new asset family.

Data, Energy and Essence identify supplies. Crown and Eye-ring are topic references, rather than a resolved specimen. Frame fragments contain neighboring pixels and are not seamless nine-slice components. The action crop contains baked START text and is not editable typography. No transparency, native sprite craft, font license, navigation, comprehension or physical-performance claim follows from the kit.
