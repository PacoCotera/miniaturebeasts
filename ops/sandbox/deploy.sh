#!/usr/bin/env bash
# Pull-deploy: fetch the newest sandbox-* release from GitHub, verify its checksum, unpack it beside the current one,
# check its Caddyfile and switch the symlink. Keeps the last 5 releases. Public repo, so no token is needed.
# Safe to run repeatedly; does nothing if current.
#   pin      a file $MB_ROOT/pin holding a release tag (sandbox-<sha>) keeps that release current, newer ones are not installed.
#            Remove the file to follow the newest again. A release already on disk is switched to without the network.
#   Caddyfile  a release may carry ops/sandbox/Caddyfile. It is checked with `caddy validate` before anything changes; if Caddy refuses it
#            the current release and the installed Caddyfile stay as they are and the line "mb-sandbox-deploy: Caddyfile refused" is logged
#            (once per release). A release without one (every release before this feature) leaves the installed Caddyfile alone.
#            Caddy is reloaded only when the installed Caddyfile changed; if the reload fails the old file comes back.
# The MB_API, MB_CADDYFILE, MB_CADDY and MB_SYSTEMCTL variables exist for the tests; the unit never sets them.
set -euo pipefail
REPO="PacoCotera/miniaturebeasts"
ROOT="${MB_ROOT:?set by the operator}"
API="${MB_API:-https://api.github.com/repos/$REPO/releases}"
CADDYFILE="${MB_CADDYFILE:-/etc/caddy/Caddyfile}"
CADDY="${MB_CADDY:-caddy}"
SYSTEMCTL="${MB_SYSTEMCTL:-systemctl}"
say() { echo "mb-sandbox-deploy: $*" >&2; }
# MB_STUDIO must be host:port (a name, an IPv4 address or a [bracketed] IPv6 one; a port 1-65535). Caddy itself accepts an empty one.
STUDIO_RE='^([A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?|\[[0-9A-Fa-f:.]+\]):([0-9]{1,5})$'
studio_ok() { [[ "$1" =~ $STUDIO_RE ]] && (( 10#${BASH_REMATCH[3]} >= 1 && 10#${BASH_REMATCH[3]} <= 65535 )); }

install -d "$ROOT/releases"
exec 9>"$ROOT/.deploy.lock"
flock -n 9 || exit 0
rm -rf "$ROOT"/releases/*.part

pin=""
if [ -s "$ROOT/pin" ]; then
  pin=$(tr -d '[:space:]' < "$ROOT/pin")
  [[ "$pin" =~ ^sandbox-[0-9a-f]{7,40}$ ]] || { say "the pin file does not hold a release tag (sandbox-<sha>); nothing deployed"; exit 1; }
fi

work=$(mktemp -d); trap 'rm -rf "$work"' EXIT
rel=""
if [ -n "$pin" ]; then
  tag="$pin"
  [ -d "$ROOT/releases/$tag" ] || rel=$(curl -fsSL -H 'Accept: application/vnd.github+json' "$API/tags/$tag") || { say "pinned release $tag not found"; exit 1; }
else
  rel=$(curl -fsSL -H 'Accept: application/vnd.github+json' "$API?per_page=20" \
    | jq -r '[.[] | select(.tag_name|startswith("sandbox-")) | select(.draft==false)] | sort_by(.created_at) | last')
  [ "$rel" != "null" ] || { echo "no sandbox release yet"; exit 0; }
  tag=$(jq -r .tag_name <<<"$rel")
  [[ "$tag" =~ ^sandbox-[0-9a-f]{7,40}$ ]] || { say "the newest release's tag is not sandbox-<sha>; nothing deployed"; exit 1; }
fi
dir="$ROOT/releases/$tag"
old=$(readlink -f "$ROOT/current" 2>/dev/null || true)
if [ "$old" = "$dir" ]; then exit 0; fi
[ -z "$pin" ] && [ "$(cat "$ROOT/refused" 2>/dev/null)" = "$tag" ] && exit 0   # refused already, said so once

if [ ! -d "$dir" ]; then
  tar_url=$(jq -r '.assets[] | select(.name|endswith(".tar.gz")) | .browser_download_url' <<<"$rel")
  sum_url=$(jq -r '.assets[] | select(.name|endswith(".sha256")) | .browser_download_url' <<<"$rel")
  curl -fsSL "$tar_url" -o "$work/site.tar.gz"
  curl -fsSL "$sum_url" -o "$work/site.sha256"
  (cd "$work" && sed 's# .*# site.tar.gz#' site.sha256 | sha256sum -c --quiet)
  install -d "$dir.part"
  tar --no-same-owner -C "$dir.part" -xzf "$work/site.tar.gz"   # root owns every file: no account on this machine shares the build's uid
  chmod -R a+rX "$dir.part"
  mv -T "$dir.part" "$dir"
fi

new="$dir/ops/sandbox/Caddyfile"
changed=0
if [ -f "$new" ]; then
  if ! studio_ok "${MB_STUDIO:-}"; then   # this server's setting, not the release's fault: nothing is marked refused
    say "Caddyfile refused: MB_STUDIO is not host:port (it is '${MB_STUDIO:-}'); the current release and Caddyfile are unchanged"
    exit 1
  fi
  if ! "$CADDY" validate --config "$new" --adapter caddyfile >"$work/validate.log" 2>&1; then
    say "Caddyfile refused"
    say "release $tag stays off; the current release and Caddyfile are unchanged. Caddy said:"
    sed 's/^/    /' "$work/validate.log" >&2
    [ -n "$pin" ] || { echo "$tag" > "$ROOT/refused"; rm -rf "$dir"; }
    exit 1
  fi
  if ! cmp -s "$new" "$CADDYFILE"; then
    changed=1
    rm -f "$CADDYFILE.prev"
    [ ! -f "$CADDYFILE" ] || cp -p "$CADDYFILE" "$CADDYFILE.prev"
    install -m 644 "$new" "$CADDYFILE.new" && mv -f "$CADDYFILE.new" "$CADDYFILE"
    if ! "$SYSTEMCTL" reload caddy; then
      say "Caddyfile refused (reload failed); the old one is back"
      if [ -f "$CADDYFILE.prev" ]; then mv -f "$CADDYFILE.prev" "$CADDYFILE"; "$SYSTEMCTL" reload caddy || true; fi
      [ -n "$pin" ] || { echo "$tag" > "$ROOT/refused"; rm -rf "$dir"; }
      exit 1
    fi
  fi
fi
rm -f "$ROOT/refused"
login=ops/sandbox/login/mb_login.py
login_changed=1; [ -L "$ROOT/current" ] && cmp -s "$old/$login" "$dir/$login" && login_changed=0

ln -sfn "$dir" "$ROOT/current.new" && mv -T "$ROOT/current.new" "$ROOT/current"
# keep the current release and the four newest others; the pinned one is always the current one
ls -1dt "$ROOT"/releases/sandbox-* | { grep -vxF "$dir" || true; } | tail -n +5 | xargs -r rm -rf
"$SYSTEMCTL" restart mb-caddy 2>/dev/null || true   # the Caddy service runs from the release: it restarts on the new one (its queue is journaled in its data directory)
# so does the studio login, when its code changed (its sessions are on disk; its lockouts are in memory and would start again)
[ "$login_changed" = 0 ] || "$SYSTEMCTL" restart mb-login 2>/dev/null || true
echo "deployed $tag${pin:+ (pinned)}$([ "$changed" = 1 ] && echo ", Caddyfile updated and reloaded")"
