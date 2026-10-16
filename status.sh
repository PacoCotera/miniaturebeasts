#!/bin/sh
# Queue status: one line per ticket, with state, role, age of its last move, and what it waits on.
cd "$(dirname "$0")"
now=$(date +%s)
for st in claimed review parked ready done; do
  for f in tickets/$st/T-*.md; do
    [ -e "$f" ] || continue
    id=$(basename "$f" .md)
    role=$(sed -n 's/^role: *//p' "$f" | head -1)
    title=$(sed -n 's/^title: *//p' "$f" | head -1 | cut -c1-48)
    needs=$(sed -n 's/^needs: *//p' "$f" | head -1)
    t=$(git log -1 --format=%ct -- "$f" 2>/dev/null); [ -n "$t" ] || t=$now
    age=$(( (now - t) / 60 ))
    flag=""; [ "$st" = claimed ] && [ $age -gt 120 ] && flag="STALLED"
    [ "$st" = review ] && [ $age -gt 60 ] && flag="WAITING-ON-LEAD"
    printf "%-8s %-15s %-7s %5sm %-16s %s %s\n" "$st" "$id" "$role" "$age" "$flag" "$title" "${needs:+needs $needs}"
  done
done
