#!/bin/sh
# Is a pull request documents only? Reads `git diff --name-status --no-renames` on stdin (a rename arrives as a delete and an add)
# and prints docs=true or docs=false. Every changed path must meet all three conditions, or the build runs in full:
#   1. it ends in .md;
#   2. it is not under website/, prototypes/, .github/, ops/ or v1/native/vendor/;
#   3. the build does not read it: it is neither listed in build-reads.txt nor under a listed folder (a line ending in /),
#      and, when it is deleted, website/roadmap.json does not link to it (or to a folder that holds it).
# An empty list is not documents only.
set -eu
here=$(cd "$(dirname "$0")" && pwd)
reads="$here/build-reads.txt"
roadmap="$here/../website/roadmap.json"
tab=$(printf '\t')
input=$(cat)

read_by_build() {   # $1 is a path: is it listed in build-reads.txt, or under a listed folder?
  while IFS= read -r entry; do
    case $entry in ''|'#'*) continue ;; esac
    case $entry in
      */) case $1 in "$entry"*) return 0 ;; esac ;;
      *) [ "$1" = "$entry" ] && return 0 ;;
    esac
  done < "$reads"
  return 1
}

linked_by_roadmap() {   # $1 is a path: does roadmap.json link to it, or to a folder above it (a link may carry a #fragment)?
  p=$1
  grep -qF "\"$p\"" "$roadmap" && return 0
  grep -qF "\"$p#" "$roadmap" && return 0
  while :; do
    case $p in */*) p=${p%/*} ;; *) break ;; esac
    grep -qF "\"$p/\"" "$roadmap" && return 0
  done
  return 1
}

docs=false
if [ -n "$input" ]; then
  docs=true
  while IFS="$tab" read -r status path; do
    case $path in
      *.md) ;;
      *) docs=false; break ;;
    esac
    case $path in
      website/*|prototypes/*|.github/*|ops/*|v1/native/vendor/*) docs=false; break ;;
    esac
    if read_by_build "$path"; then docs=false; break; fi
    if [ "$status" = D ] && linked_by_roadmap "$path"; then docs=false; break; fi
  done <<EOF2
$input
EOF2
fi
echo "docs=$docs"
