#!/bin/sh
# Bakes the face's Inter fonts as LVGL C sources with lv_font_conv (the converter the type atlases use), from the same frozen
# TrueType files and the same ranges as prototypes/ui/tools/bake-type.mjs: Regular 16, Medium 20, SemiBold 28, 4 bpp, kerning on, uncompressed.
#   npm install --prefix /tmp/lvfc lv_font_conv@1.5.3
#   sh prototypes/face/tools/bake-fonts.sh [/tmp/lvfc/node_modules/.bin/lv_font_conv]
set -e
here=$(cd "$(dirname "$0")" && pwd)
conv=${1:-/tmp/lvfc/node_modules/.bin/lv_font_conv}
ttf="$here/../../ui/fonts/inter/src"
out="$here/../src/fonts"
ranges="0x20-0x7e,0xa0-0x17f,0x2010-0x2027,0x2212,0x2190-0x2193,0x2605,0x25b2,0x25b6,0x25bc,0x25c0,0x2713"
mkdir -p "$out"
for f in "Regular 16" "Medium 20" "SemiBold 28"; do
  set -- $f
  "$conv" --font "$ttf/Inter-$1-tnum.ttf" --size "$2" --bpp 4 --no-compress --range "$ranges" --format lvgl --lv-include lvgl.h \
    --lv-font-name "face_inter_$2" -o "$out/face_inter_$2.c"
done
# the converter writes its command line (with absolute paths) into a comment; replace it with the file it came from
for f in "Regular 16" "Medium 20" "SemiBold 28"; do
  set -- $f
  sed -i "s#^ \* Opts: .*# * Opts: lv_font_conv, Inter-$1-tnum.ttf, see tools/bake-fonts.sh#" "$out/face_inter_$2.c"
done
