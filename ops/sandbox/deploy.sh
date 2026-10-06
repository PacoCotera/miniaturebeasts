#!/usr/bin/env bash
# Pull-deploy: fetch the newest sandbox-* release from GitHub, verify its checksum,
# unpack it beside the current one and switch the symlink. Keeps the last 5 releases.
# Public repo, so no token is needed. Safe to run repeatedly; does nothing if current.
set -euo pipefail
REPO="PacoCotera/miniaturebeasts"
ROOT=/srv/miniaturebeasts
API="https://api.github.com/repos/$REPO/releases?per_page=20"
rel=$(curl -fsSL -H 'Accept: application/vnd.github+json' "$API" \
  | jq -r '[.[] | select(.tag_name|startswith("sandbox-")) | select(.draft==false)] | sort_by(.created_at) | last')
[ "$rel" != "null" ] || { echo "no sandbox release yet"; exit 0; }
tag=$(jq -r .tag_name <<<"$rel")
if [ "$(readlink -f $ROOT/current 2>/dev/null)" = "$ROOT/releases/$tag" ]; then exit 0; fi
tar_url=$(jq -r '.assets[] | select(.name|endswith(".tar.gz")) | .browser_download_url' <<<"$rel")
sum_url=$(jq -r '.assets[] | select(.name|endswith(".sha256")) | .browser_download_url' <<<"$rel")
work=$(mktemp -d); trap 'rm -rf "$work"' EXIT
curl -fsSL "$tar_url" -o "$work/site.tar.gz"
curl -fsSL "$sum_url" -o "$work/site.sha256"
(cd "$work" && sed 's# .*# site.tar.gz#' site.sha256 | sha256sum -c --quiet)
install -d "$ROOT/releases/$tag"
tar -C "$ROOT/releases/$tag" -xzf "$work/site.tar.gz"
chmod -R a+rX "$ROOT/releases/$tag"
ln -sfn "$ROOT/releases/$tag" "$ROOT/current.new" && mv -T "$ROOT/current.new" "$ROOT/current"
ls -1dt "$ROOT"/releases/sandbox-* | tail -n +6 | xargs -r rm -rf
systemctl reload caddy 2>/dev/null || true
echo "deployed $tag"
