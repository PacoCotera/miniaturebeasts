The look view's marks: you are here (still and two pulse frames), the three heart marks, and the takeables (two frames and a still each).
Signed by the art desk: mibi-art commit 07cd89ed6, art-jobs/2026-11-09-you-are-here/out/ (manifest.json there names every anchor, size and timing). Copied byte for byte; never edit here, re-sign at the desk.
PLACEHOLDERS until the owner picks a stone look (out/sheet-stone-picks.png): look-heart-stone, look-take-charge-*, look-take-warm-*. The page slots (LOOK_FILES in exploration/index.html) are named already, so a swap is files only.
The page loads every file at boot into a palette-index buffer; SHA256.json records each file as placed; tests/look-art.test.mjs checks each equals the desk's file byte for byte.
