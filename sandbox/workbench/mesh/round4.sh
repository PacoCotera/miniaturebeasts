#!/bin/bash
# Round 4, the whole build into one work directory (scratch under the worktree's out/, never /tmp).  bash round4.sh WORKDIR      (from prototypes/workbench)
# Needs: the bpy venv and the cad venv under /home/mb/mb/tools-3d, node, and the Playwright in /home/mb/pw156.
set -e
W=${1:?workdir}; BPY=/home/mb/mb/tools-3d/bpyvenv/bin/python; CAD=/home/mb/mb/tools-3d/cadvenv/bin/python
mkdir -p "$W"
node mesh/tools/sdf-render.mjs S01 "$W/sdf" > /dev/null
/usr/bin/time -f "stop5 %e s" -o "$W/t-stop5.txt" $BPY mesh/stop5.py "$W/s5" > /dev/null
/usr/bin/time -f "stop6 %e s" -o "$W/t-stop6.txt" env GLB_LEVEL=3 $BPY mesh/stop6.py "$W/s6" > /dev/null
/usr/bin/time -f "blink %e s" -o "$W/t-blink.txt" $BPY mesh/blink4.py "$W/bl" > /dev/null
$CAD mesh/viewer_gen.py "$W/s6/loika.glb" "$W/s6/viewer.html" > /dev/null
DSF=2 node mesh/tools/viewer-shots.mjs "$W/s6/viewer.html" "$W/s6/tjs" > /dev/null
echo built "$W"
