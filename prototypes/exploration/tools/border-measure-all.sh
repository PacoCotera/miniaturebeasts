#!/bin/bash
# Land shape B1: runs border-measure.mjs one seed per process (a page per seed is heavy) and sums the counts. Usage: border-measure-all.sh <firstSeed> <count>
dir="$(dirname "$0")"
first="${1:-1}"; count="${2:-50}"
for ((s = first; s < first + count; s++)); do
  node --max-old-space-size=3000 "$dir/border-measure.mjs" "$s" 1
done | node -e 'let t={cliffSides:0,cliffOpen:0,openSides:0,openBlocked:0,seeds:0};require("readline").createInterface({input:process.stdin}).on("line",l=>{try{const r=JSON.parse(l);for(const k of Object.keys(t))if(k!=="seeds")t[k]+=r[k];t.seeds++}catch{}}).on("close",()=>console.log(JSON.stringify(t)))'
