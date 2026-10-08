# Sandbox hosting

The sandbox (website + every prototype) is served from the project VM. Nothing is
hand-copied: every push to `main` is tested by CI and, if it passes, published as
a `sandbox-<sha>` release. The VM checks GitHub every two minutes and installs the
newest one. The page footer shows the build it is serving. CI keeps only the five
newest `sandbox-*` releases on GitHub; older ones (and their tags) are deleted.

- `install.sh`: one-time VM setup (Caddy on port 80, deploy script, timer).
- `deploy.sh`: the pull-deploy the timer runs; verifies the checksum, switches a
  symlink, keeps the last five releases.

Public reach is a Cloudflare tunnel on the VM pointing at `http://localhost:80`.
