#!/usr/bin/env bash
# One-time setup of the sandbox web server on the project VM. Run as a sudoer:
#   curl -fsSL https://raw.githubusercontent.com/PacoCotera/miniaturebeasts/main/ops/sandbox/install.sh | sudo bash
# Installs Caddy (serves /srv/miniaturebeasts/current), the pull-deploy script and a
# timer that checks GitHub every 2 minutes for a newer tested sandbox-* release; and the
# Caddy service (unit mb-caddy, prototypes/caddy/README.md), which brokers the Station's
# paintings: Node 22, Python 3 with Pillow, a data directory outside the releases, a
# root-only environment file for its mode, ceiling and key, and the /caddy-api/ proxy route.
set -euo pipefail
REPO="PacoCotera/miniaturebeasts"
apt-get update -qq
apt-get install -y -qq --no-install-recommends curl ca-certificates caddy jq python3 python3-pil >/dev/null
if ! command -v node >/dev/null || [ "$(node -e 'console.log(process.versions.node.split(".")[0])')" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null && apt-get install -y -qq nodejs >/dev/null
fi
install -d -m 755 /srv/miniaturebeasts/releases
install -d -m 750 -o www-data -g www-data /srv/miniaturebeasts/caddy-data
install -d -m 750 /etc/miniaturebeasts
if [ ! -f /etc/miniaturebeasts/caddy.env ]; then   # the painter's mode, ceiling and key; root-only, never in the repository
  cat > /etc/miniaturebeasts/caddy.env <<'ENV'
CADDY_PORT=8787
CADDY_DATA=/srv/miniaturebeasts/caddy-data
CADDY_PAINTER=mock
CADDY_CEILING_USD=5
CADDY_GROW_CAP=10
CADDY_MOCK_DELAY=20
# GEMINI_API_KEY=   (set it here, then CADDY_PAINTER=real, to paint for money)
ENV
  chmod 600 /etc/miniaturebeasts/caddy.env
fi
curl -fsSL "https://raw.githubusercontent.com/$REPO/main/ops/sandbox/deploy.sh" -o /usr/local/bin/mb-sandbox-deploy
chmod 755 /usr/local/bin/mb-sandbox-deploy
cat > /etc/caddy/Caddyfile <<'CADDY'
:80 {
    root * /srv/miniaturebeasts/current
    file_server
    encode gzip
    header /build.json Cache-Control "no-store"
    header /sandbox/* Cache-Control "no-cache"
    reverse_proxy /caddy-api/* localhost:8787
}
CADDY
cat > /etc/systemd/system/mb-caddy.service <<'UNIT'
[Unit]
Description=Miniature Beasts Caddy service (the Station's painting broker)
After=network-online.target
[Service]
User=www-data
Group=www-data
EnvironmentFile=/etc/miniaturebeasts/caddy.env
WorkingDirectory=/srv/miniaturebeasts/current/sandbox/caddy
ExecStart=/usr/bin/node /srv/miniaturebeasts/current/sandbox/caddy/server.mjs
Restart=on-failure
RestartSec=5
[Install]
WantedBy=multi-user.target
UNIT
cat > /etc/systemd/system/mb-sandbox-deploy.service <<'UNIT'
[Unit]
Description=Install the newest tested Miniature Beasts sandbox release
After=network-online.target
[Service]
Type=oneshot
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
/usr/local/bin/mb-sandbox-deploy || true
systemctl enable mb-caddy
systemctl restart mb-caddy || true
systemctl enable caddy
systemctl restart caddy
sleep 1
curl -fsS http://localhost/build.json || { echo 'build.json not served; see: journalctl -u caddy -n 30'; exit 1; }
curl -fsS http://localhost/caddy-api/v1/status >/dev/null || echo 'the Caddy service is not answering yet; see: journalctl -u mb-caddy -n 30'
echo "Sandbox installed. Serving on port 80 from /srv/miniaturebeasts/current; the Caddy service on /caddy-api/."
