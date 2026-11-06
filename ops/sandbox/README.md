# Sandbox hosting

The sandbox (website + every prototype) is served from the sandbox server. Nothing is
hand-copied: every push to `main` is tested by CI and, if it passes, published as
a `sandbox-<sha>` release. The sandbox server checks GitHub every two minutes and installs the
newest one. The page footer shows the build it is serving. CI keeps only the five
newest `sandbox-*` releases on GitHub; older ones (and their tags) are deleted.

- `install.sh`: sandbox server setup, safe to run again (Caddy from Caddy's own apt repository, deploy script and timer, the Caddy service,
  the studio login); the operator gives it `MB_ROOT`, `MB_ENV_FILE` and `MB_STUDIO`, and it writes them into the units.
- `deploy.sh`: the pull-deploy the timer runs; verifies the checksum, checks the release's Caddyfile, switches a
  symlink, keeps the last five releases.
- `Caddyfile`: the web server's whole configuration. It ships in every release.
- `login/`: the studio login (`mb_login.py`) and `mb-studio-passwd`. `tests/`: their tests and deploy.sh's
  (`python3 -m unittest discover -s ops/sandbox/tests -v`; with Caddy installed they also validate the real Caddyfile).

The sandbox server is reached through a reverse proxy that is not part of this repository. Operator details are in the project's internal operations doc.

The Station's paintings go through **the Caddy service** (`prototypes/caddy/`, unit `mb-caddy`),
which runs from the current release with its data in a data directory outside the releases and its
mode, daily limit and key in a root-only environment file (path in the internal operations doc). The web server proxies
`/caddy-api/*` to it; `deploy.sh` restarts it after switching the release. It starts in mock mode;
set `CADDY_PAINTER=real`, `CADDY_CEILING_USD` and `GEMINI_API_KEY` there to enable real painting, within the daily limit.

## The studio login

`/studio` is the species studio, served from another machine on the private bridge (`MB_STUDIO`, host and port). The web server asks
the login before it passes any `/studio` request on, so a request without a session never reaches the studio.

- `/studio/login` and `/studio/logout` are answered by `mb-login` (unit `mb-login`, 127.0.0.1:8791, its own system user, run from the release;
  while no release carries it, from the copy install.sh keeps in `/usr/local/lib/mb-login`).
  Every other `/studio` path goes through the login's `/check`: a session gives `X-Studio-User` to the studio (the web server drops any such
  header the client sends); no session gives a redirect to `/studio/login?next=` for pages and a 401 JSON answer for `/studio/api`,
  `/studio/events` and `/studio/cas`. The studio never sees the browser's cookies and cannot set one; every studio answer is marked
  `private`, so no shared cache keeps it.
- Cookie `mb_studio`: random, `Path=/studio`, `HttpOnly`, `Secure`, `SameSite=Strict`, 30 days from the last use. Sessions are kept on disk
  (`/var/lib/mb-login`, mode 600, only a hash of each cookie), so they survive a restart. Login and logout posts must carry
  `Origin: https://miniaturebeasts.com`. `next=` only takes a path under `/studio` on this site.
- Passwords are scrypt hashes (n=2^15, r=8, p=1) in a users file beside the environment file (mode 640, root and group `mb-login`).
- Guessing: five failures from one address (`Cf-Connecting-IP`; an IPv6 address counts as its /64) in 15 minutes lock that address for 15 minutes,
  doubling each time. More than 30 failures in an hour from all addresses slows everyone to one try a minute. A try counts from the moment it is
  let in, so tries sent all at once get no more. Both rest on port 80 being reached only through the tunnel. The counts are kept in memory: a
  restart of the login (a release that changes its code) starts them again.

### Install

On the sandbox server, as a sudoer, with the operator's values (the same line sets up or repairs everything; it never touches the Caddy service's data directory).
From a copy of this directory (nothing of the repository is fetched):

```
sudo MB_ROOT=... MB_ENV_FILE=... MB_STUDIO=host:port bash <copy>/install.sh
```

or from main:

```
curl -fsSL https://raw.githubusercontent.com/PacoCotera/miniaturebeasts/main/ops/sandbox/install.sh | sudo MB_ROOT=... MB_ENV_FILE=... MB_STUDIO=host:port bash
```

It installs Caddy from Caddy's own apt repository (Ubuntu's package is too old; the run prints the version before and after), the `mb-login` user and unit, the
users file, `/usr/local/sbin/mb-studio-passwd`, and the Caddyfile: the current release's, or its own while no release carries one (checked first, installed only if
it differs; if Caddy does not start on it the previous one comes back). After that `deploy.sh` keeps the Caddyfile and the login current with every release that carries them.

### Set the password

```
sudo mb-studio-passwd <user>              # types it twice, 12 characters or more
sudo mb-studio-passwd <user> --generate   # shows one five-word passphrase, once
```

Changing a password ends every session of that user; forgetting it is the same command. The password goes nowhere else.

### Roll back

- The site, the login and the Caddyfile roll back together, as a release. Revert on `main`, or pin one: `echo sandbox-<sha> | sudo tee $MB_ROOT/pin`, then
  `sudo systemctl start mb-sandbox-deploy`. While the pin file exists no newer release is installed; `sudo rm $MB_ROOT/pin` follows the newest again. A release that is
  still on disk (five are kept) is switched to without the network, with its own Caddyfile. A release from before the Caddyfile shipped leaves the installed one alone.
- A release whose Caddyfile Caddy refuses is not installed; the current release and Caddyfile stay. The previous Caddyfile is also kept beside the installed one as `Caddyfile.prev`.
- With the login down `/studio` answers 502 and stays closed.

### Logs

```
journalctl -u mb-login          # one line per login, failure, lockout and brake change: user and address, never a password
journalctl -u mb-sandbox-deploy # "mb-sandbox-deploy: Caddyfile refused" and the reason; "deployed <tag>"
journalctl -u caddy
```
