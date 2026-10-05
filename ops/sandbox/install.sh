#!/usr/bin/env bash
# One-time setup of the sandbox web server on the project VM. Run as a sudoer:
#   curl -fsSL https://raw.githubusercontent.com/PacoCotera/miniaturebeasts/main/ops/sandbox/install.sh | sudo bash
# Installs Caddy (serves /srv/miniaturebeasts/current), the pull-deploy script and a
# timer that checks GitHub every 2 minutes for a newer tested sandbox-* release.
set -euo pipefail
REPO="PacoCotera/miniaturebeasts"
apt-get update -qq
apt-get install -y -qq --no-install-recommends curl ca-certificates caddy jq >/dev/null
install -d -o www-data -g www-data /srv/miniaturebeasts/releases
curl -fsSL "https://raw.githubusercontent.com/$REPO/main/ops/sandbox/deploy.sh" -o /usr/local/bin/mb-sandbox-deploy
chmod 755 /usr/local/bin/mb-sandbox-deploy
cat > /etc/caddy/Caddyfile <<'CADDY'
:80 {
    root * /srv/miniaturebeasts/current
    file_server
    encode gzip
    header /build.json Cache-Control "no-store"
    header /sandbox/* Cache-Control "no-cache"
}
CADDY
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
systemctl enable --now caddy mb-sandbox-deploy.timer
/usr/local/bin/mb-sandbox-deploy || true
echo "Sandbox installed. Serving on port 80 from /srv/miniaturebeasts/current."
