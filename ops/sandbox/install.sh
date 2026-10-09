#!/usr/bin/env bash
# One-time setup of the sandbox web server on the sandbox server. Run as a sudoer, with the root and the
# environment file's path the operator keeps (in the internal operations doc):
#   curl -fsSL https://raw.githubusercontent.com/PacoCotera/miniaturebeasts/main/ops/sandbox/install.sh | sudo MB_ROOT=... MB_ENV_FILE=... bash
# Installs Caddy (serves $MB_ROOT/current), the pull-deploy script and a
# timer that checks GitHub every 2 minutes for a newer tested sandbox-* release; and the
# Caddy service (unit mb-caddy, prototypes/caddy/README.md), which brokers the Station's
# paintings: Node 22, Python 3 with Pillow, a data directory outside the releases, a
# root-only environment file for its mode, daily limit and key, and the /caddy-api/ proxy route.
set -euo pipefail
REPO="PacoCotera/miniaturebeasts"
ROOT="${MB_ROOT:?set by the operator}"
ENV_FILE="${MB_ENV_FILE:?set by the operator}"
apt-get update -qq
apt-get install -y -qq --no-install-recommends curl ca-certificates caddy jq python3 python3-pil >/dev/null
if ! command -v node >/dev/null || [ "$(node -e 'console.log(process.versions.node.split(".")[0])')" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null && apt-get install -y -qq nodejs >/dev/null
fi
install -d -m 755 "$ROOT/releases"
install -d -m 750 -o www-data -g www-data "$ROOT/caddy-data"
install -d -m 750 "$(dirname "$ENV_FILE")"
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
curl -fsSL "https://raw.githubusercontent.com/$REPO/main/ops/sandbox/deploy.sh" -o /usr/local/bin/mb-sandbox-deploy
chmod 755 /usr/local/bin/mb-sandbox-deploy
cat > /etc/caddy/Caddyfile <<CADDY
:80 {
    root * $ROOT/current
    file_server
    encode gzip
    header /build.json Cache-Control "no-store"
    header /sandbox/* Cache-Control "no-cache"
    reverse_proxy /caddy-api/* localhost:8787
}
CADDY
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
cat > /etc/systemd/system/mb-sandbox-deploy.service <<UNIT
[Unit]
Description=Install the newest tested Miniature Beasts sandbox release
After=network-online.target
[Service]
Type=oneshot
Environment=MB_ROOT=$ROOT
Environment=MB_ENV_FILE=$ENV_FILE
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
MB_ROOT="$ROOT" MB_ENV_FILE="$ENV_FILE" /usr/local/bin/mb-sandbox-deploy || true
systemctl enable mb-caddy
systemctl restart mb-caddy || true
systemctl enable caddy
systemctl restart caddy
sleep 1
curl -fsS http://localhost/build.json || { echo 'build.json not served; see: journalctl -u caddy -n 30'; exit 1; }
curl -fsS http://localhost/caddy-api/v1/status >/dev/null || echo 'the Caddy service is not answering yet; see: journalctl -u mb-caddy -n 30'
echo "Sandbox installed. Serving on port 80 from $ROOT/current; the Caddy service on /caddy-api/."
