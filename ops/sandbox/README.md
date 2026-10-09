# Sandbox hosting

The sandbox (website + every prototype) is served from the sandbox server. Nothing is
hand-copied: every push to `main` is tested by CI and, if it passes, published as
a `sandbox-<sha>` release. The sandbox server checks GitHub every two minutes and installs the
newest one. The page footer shows the build it is serving. CI keeps only the five
newest `sandbox-*` releases on GitHub; older ones (and their tags) are deleted.

- `install.sh`: one-time sandbox server setup (Caddy on port 80, deploy script, timer); the operator gives it
  `MB_ROOT` and `MB_ENV_FILE`, and it writes both into the deploy unit.
- `deploy.sh`: the pull-deploy the timer runs; verifies the checksum, switches a
  symlink, keeps the last five releases.

The sandbox server is reached through a reverse proxy that is not part of this repository. Operator details are in the project's internal operations doc.

The Station's paintings go through **the Caddy service** (`prototypes/caddy/`, unit `mb-caddy`),
which runs from the current release with its data in a data directory outside the releases and its
mode, daily limit and key in a root-only environment file (path in the internal operations doc). The web server proxies
`/caddy-api/*` to it; `deploy.sh` restarts it after switching the release. It starts in mock mode;
set `CADDY_PAINTER=real`, `CADDY_CEILING_USD` and `GEMINI_API_KEY` there to enable real painting, within the daily limit.
