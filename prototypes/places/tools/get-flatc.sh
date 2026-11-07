#!/bin/sh
# Download the pinned flatc into <dir> and check it against prototypes/places/VERSIONS.md.
# usage: get-flatc.sh <dir>     (then put <dir> on PATH, or set MB_FLATC=<dir>/flatc)
set -eu
dir=${1:?usage: get-flatc.sh <dir>}
here=$(dirname "$0")
versions="$here/../VERSIONS.md"
url=$(sed -n 's/^flatc-linux-zip-url: //p' "$versions")
want=$(sed -n 's/^flatc-linux-zip-sha256: //p' "$versions")
mkdir -p "$dir"
curl -fsSL -o "$dir/flatc.zip" "$url"
got=$(sha256sum "$dir/flatc.zip" | cut -d' ' -f1)
if [ "$got" != "$want" ]; then echo "flatc zip sha256 mismatch: $got (VERSIONS.md says $want)" >&2; exit 1; fi
unzip -o -q "$dir/flatc.zip" -d "$dir"
chmod +x "$dir/flatc"
"$dir/flatc" --version
