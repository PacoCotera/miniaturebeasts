#!/usr/bin/env bash
# One-time setup of the sandbox web server on the sandbox server. Run as a sudoer, with the root and the
# environment file's path the operator keeps (in the internal operations doc), either from a copy of this directory
# (nothing of the repository is fetched; every file below comes from beside this script):
#   sudo MB_ROOT=... MB_ENV_FILE=... MB_STUDIO=host:port bash <copy>/install.sh
# or from main:
#   curl -fsSL https://raw.githubusercontent.com/PacoCotera/miniaturebeasts/main/ops/sandbox/install.sh | sudo MB_ROOT=... MB_ENV_FILE=... MB_STUDIO=host:port bash
# MB_STUDIO is the studio's address on the private bridge; it is kept in /etc/caddy/mb.env, so a later run may leave it out.
# Safe to run again: every step checks before it changes anything, and the Caddy service's data directory is never touched.
# Installs Caddy from Caddy's own apt repository (serves $MB_ROOT/current), the pull-deploy script and a
# timer that checks GitHub every 2 minutes for a newer tested sandbox-* release; and the
# Caddy service (unit mb-caddy, prototypes/caddy/README.md), which brokers the Station's
# paintings: Node 22, Python 3 with Pillow, a data directory outside the releases, a
# root-only environment file for its mode, daily limit and key, and the /caddy-api/ proxy route. And the studio login
# (unit mb-login, its own system user, run from the release; users file beside the environment file) with the
# mb-studio-passwd tool, and the release's Caddyfile (the /studio routes), installed once and after that by deploy.sh.
set -euo pipefail
REPO="PacoCotera/miniaturebeasts"
RAW="https://raw.githubusercontent.com/$REPO/main/ops/sandbox"
ROOT="${MB_ROOT:?set by the operator}"
ENV_FILE="${MB_ENV_FILE:?set by the operator}"
ENV_DIR="$(dirname "$ENV_FILE")"
WEB_ENV=/etc/caddy/mb.env                        # MB_ROOT and MB_STUDIO for Caddy's unit and for deploy.sh
USERS_FILE="$ENV_DIR/studio-users"               # beside the environment file
LIB=/usr/local/lib/mb-login                      # the login's start and the copy it runs while no release carries the login
FILES="deploy.sh Caddyfile login/mb_login.py login/mb-studio-passwd login/mb-login-run"
export DEBIAN_FRONTEND=noninteractive
aptq() { apt-get -o Dpkg::Options::=--force-confold -y -qq "$@" >/dev/null; }
# MB_STUDIO must be host:port (a name, an IPv4 address or a [bracketed] IPv6 one; a port 1-65535). Caddy itself accepts an empty one.
STUDIO_RE='^([A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?|\[[0-9A-Fa-f:.]+\]):([0-9]{1,5})$'
studio_ok() { [[ "$1" =~ $STUDIO_RE ]] && (( 10#${BASH_REMATCH[3]} >= 1 && 10#${BASH_REMATCH[3]} <= 65535 )); }
case "$ENV_DIR" in   # the directory becomes root:mb-login 710: it must be one of its own
  /|/etc|/usr|/usr/*|/var|/srv|/root|/home|/tmp|"$ROOT") echo "install.sh: MB_ENV_FILE must sit in a directory of its own, not $ENV_DIR"; exit 1 ;;
esac

# this script's own files: from beside it, or (piped from curl) main's
SRC=""
if [ -n "${BASH_SOURCE[0]:-}" ] && [ -f "${BASH_SOURCE[0]}" ]; then SRC=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd); fi
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
if [ -z "$SRC" ]; then
  SRC="$tmp/src"; mkdir -p "$SRC/login"
  for f in $FILES; do curl -fsSL "$RAW/$f" -o "$SRC/$f"; done
fi
for f in $FILES; do [ -s "$SRC/$f" ] || { echo "install.sh: $SRC/$f is missing; run it from a whole copy of ops/sandbox"; exit 1; }; done
echo "install.sh: files from $SRC"

# the studio's address, kept for Caddy's unit and for deploy.sh; checked before anything changes
[ -z "${MB_STUDIO:-}" ] && [ -f "$WEB_ENV" ] && MB_STUDIO=$(sed -n 's/^MB_STUDIO=//p' "$WEB_ENV")
STUDIO="${MB_STUDIO:-}"
studio_ok "$STUDIO" || { echo "install.sh: set MB_STUDIO to the studio's host:port on the private bridge (it is '$STUDIO')"; exit 1; }

aptq update
aptq install --no-install-recommends curl ca-certificates gpg jq python3 python3-pil
# Caddy from Caddy's own apt repository: Ubuntu's package is 2.6, too old for the studio's routes. Safe to repeat; an existing install is only upgraded.
echo "caddy before: $(caddy version 2>/dev/null || echo none)"
if [ ! -f /etc/apt/sources.list.d/caddy-stable.list ]; then
  curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt -o /etc/apt/sources.list.d/caddy-stable.list
  chmod 644 /usr/share/keyrings/caddy-stable-archive-keyring.gpg /etc/apt/sources.list.d/caddy-stable.list
  aptq update
fi
aptq install --no-install-recommends caddy
aptq install --only-upgrade caddy
echo "caddy now: $(caddy version)"
if ! command -v node >/dev/null || [ "$(node -e 'console.log(process.versions.node.split(".")[0])')" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null && aptq install nodejs
fi

restart=0   # Caddy is restarted (not only reloaded) when its Caddyfile, its environment or its unit's drop-in changed
printf 'MB_ROOT=%s\nMB_STUDIO=%s\n' "$ROOT" "$STUDIO" > "$WEB_ENV.new" && chmod 644 "$WEB_ENV.new"
if cmp -s "$WEB_ENV.new" "$WEB_ENV" 2>/dev/null; then rm "$WEB_ENV.new"; else mv "$WEB_ENV.new" "$WEB_ENV"; restart=1; fi

# the studio login's user, its users file (empty until mb-studio-passwd sets a password) and the directory it sits in
getent passwd mb-login >/dev/null || useradd --system --user-group --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin mb-login
install -d -m 755 "$ROOT/releases"
chown -R root:root "$ROOT/releases"   # releases unpacked before deploy.sh dropped the build's owner
[ -d "$ROOT/caddy-data" ] || install -d -m 750 -o www-data -g www-data "$ROOT/caddy-data"   # the Caddy service's data: made once, never touched again
install -d -m 710 -o root -g mb-login "$ENV_DIR"
[ -f "$USERS_FILE" ] || install -m 640 -o root -g mb-login /dev/null "$USERS_FILE"
chgrp mb-login "$USERS_FILE"; chmod 640 "$USERS_FILE"
if [ ! -f "$ENV_FILE" ]; then   # the painter's mode, daily limit and key; root-only, never in the repository
  cat > "$ENV_FILE" <<ENV
CADDY_PORT=8787
CADDY_DATA=$ROOT/caddy-data
CADDY_PAINTER=mock
# CADDY_CEILING_USD: set by the operator; the value is in the internal operations doc
CADDY_CEILING_USD=
CADDY_GROW_CAP=10
CADDY_MOCK_DELAY=20
# GEMINI_API_KEY=   (operator only; then CADDY_PAINTER=real)
ENV
  chmod 600 "$ENV_FILE"
fi

install -m 755 "$SRC/deploy.sh" /usr/local/bin/mb-sandbox-deploy.new && mv -f /usr/local/bin/mb-sandbox-deploy.new /usr/local/bin/mb-sandbox-deploy
install -d -m 755 "$LIB"
install -m 644 "$SRC/login/mb_login.py" "$LIB/mb_login.py"
install -m 755 "$SRC/login/mb-login-run" "$LIB/run"
install -d /etc/systemd/system/caddy.service.d
DROPIN=/etc/systemd/system/caddy.service.d/mb.conf
printf '[Service]\nEnvironmentFile=%s\n' "$WEB_ENV" > "$DROPIN.new"
if cmp -s "$DROPIN.new" "$DROPIN" 2>/dev/null; then rm "$DROPIN.new"; else mv "$DROPIN.new" "$DROPIN"; restart=1; fi
cat > /etc/systemd/system/mb-caddy.service <<UNIT
[Unit]
Description=Miniature Beasts Caddy service (the Station's painting broker)
After=network-online.target
[Service]
User=www-data
Group=www-data
EnvironmentFile=$ENV_FILE
WorkingDirectory=$ROOT/current/sandbox/caddy
ExecStart=/usr/bin/node $ROOT/current/sandbox/caddy/server.mjs
Restart=on-failure
RestartSec=5
[Install]
WantedBy=multi-user.target
UNIT
# the login: localhost only, no privileges, a read-only system; it writes only its state directory
cat > /etc/systemd/system/mb-login.service <<UNIT
[Unit]
Description=Miniature Beasts studio login
After=network.target
[Service]
User=mb-login
Group=mb-login
Environment=MB_ROOT=$ROOT
Environment=MB_LOGIN_USERS=$USERS_FILE
Environment=MB_LOGIN_STATE=/var/lib/mb-login
StateDirectory=mb-login
StateDirectoryMode=0700
UMask=0077
ExecStart=$LIB/run
Restart=on-failure
RestartSec=3
MemoryMax=256M
TasksMax=256
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes
PrivateDevices=yes
PrivateIPC=yes
ProtectKernelTunables=yes
ProtectKernelModules=yes
ProtectKernelLogs=yes
ProtectControlGroups=yes
ProtectClock=yes
ProtectHostname=yes
ProtectProc=invisible
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
RestrictNamespaces=yes
RestrictRealtime=yes
RestrictSUIDSGID=yes
LockPersonality=yes
MemoryDenyWriteExecute=yes
SystemCallArchitectures=native
SystemCallFilter=@system-service
SystemCallErrorNumber=EPERM
CapabilityBoundingSet=
AmbientCapabilities=
IPAddressDeny=any
IPAddressAllow=localhost
[Install]
WantedBy=multi-user.target
UNIT
cat > /etc/systemd/system/mb-sandbox-deploy.service <<UNIT
[Unit]
Description=Install the newest tested Miniature Beasts sandbox release
After=network-online.target
[Service]
Type=oneshot
Environment=MB_ROOT=$ROOT
Environment=MB_ENV_FILE=$ENV_FILE
EnvironmentFile=$WEB_ENV
ExecStart=/usr/local/bin/mb-sandbox-deploy
UNIT
cat > /etc/systemd/system/mb-sandbox-deploy.timer <<'UNIT'
[Unit]
Description=Check GitHub for a newer sandbox release
[Timer]
OnBootSec=1min
OnUnitActiveSec=2min
[Install]
WantedBy=timers.target
UNIT
systemctl daemon-reload
systemctl enable --now mb-sandbox-deploy.timer
MB_ROOT="$ROOT" MB_ENV_FILE="$ENV_FILE" MB_STUDIO="$STUDIO" /usr/local/bin/mb-sandbox-deploy || echo "the first deploy did not finish; see: journalctl -u mb-sandbox-deploy -n 30"

# mb-studio-passwd, with the users file's path written into the installed copy
sed "s#@USERS_FILE@#$USERS_FILE#" "$SRC/login/mb-studio-passwd" > /usr/local/sbin/mb-studio-passwd.new
chmod 755 /usr/local/sbin/mb-studio-passwd.new && mv -f /usr/local/sbin/mb-studio-passwd.new /usr/local/sbin/mb-studio-passwd

systemctl enable mb-caddy mb-login
systemctl restart mb-caddy || true
systemctl restart mb-login || echo "the login did not start; see: journalctl -u mb-login -n 30"
# the web server's Caddyfile: the current release's own, or this script's until a release carries one. Checked first; installed only if it differs.
want="$ROOT/current/ops/sandbox/Caddyfile"
[ -f "$want" ] || want="$SRC/Caddyfile"
if ! (set -a; . "$WEB_ENV"; caddy validate --config "$want" --adapter caddyfile >/dev/null); then
  echo "Caddy refused the Caddyfile; the web server is unchanged. Check MB_STUDIO and: caddy validate --config $want"; exit 1
fi
if ! cmp -s "$want" /etc/caddy/Caddyfile; then
  rm -f /etc/caddy/Caddyfile.prev
  [ ! -f /etc/caddy/Caddyfile ] || cp -p /etc/caddy/Caddyfile /etc/caddy/Caddyfile.prev
  install -m 644 "$want" /etc/caddy/Caddyfile.new && mv -f /etc/caddy/Caddyfile.new /etc/caddy/Caddyfile
  restart=1
fi
systemctl daemon-reload
systemctl enable caddy
if [ "$restart" = 1 ] || ! systemctl is-active --quiet caddy; then
  if ! systemctl restart caddy && [ -f /etc/caddy/Caddyfile.prev ]; then
    echo "Caddy did not start on the new Caddyfile; the previous one is back"
    mv -f /etc/caddy/Caddyfile.prev /etc/caddy/Caddyfile; systemctl restart caddy; exit 1
  fi
fi
sleep 1
curl -fsS http://localhost/build.json || { echo 'build.json not served; see: journalctl -u caddy -n 30'; exit 1; }
curl -fsS http://localhost/caddy-api/v1/status >/dev/null || echo 'the Caddy service is not answering yet; see: journalctl -u mb-caddy -n 30'
code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost/studio || true)
echo "/studio answers $code (302: the login is in front of it; 502: the login is not running, see: journalctl -u mb-login -n 30)"
echo "Sandbox installed. Serving on port 80 from $ROOT/current; the Caddy service on /caddy-api/; the studio login on /studio."
echo "Set the studio password:  sudo mb-studio-passwd <user>"
