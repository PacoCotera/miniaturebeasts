# The crash table for putting a realm to sleep

Each row is one write in the sequence, in the order they happen. Every column is a run of the whole household (the Station, the Companion on its real responder, the Caddy app, one shared store), with that one write broken, then the reboot and recovery. The cell is where the household ended up: **back** (the realm is exactly as it was, byte for byte, the card holds no trace) or **asleep** (committed on both ledgers, both copies verify, the old realm cleared everywhere, the new one live). Every run also passed: one live realm, every committed copy verifies, no realm half-cleared, and at no instant after the commit could the old realm be played. A cell that failed would stop the test.

- **Station dies before**: the Station stops just before the write; the Companion and the Caddy go on. The journal column is what the journal said at that moment.
- **Reply lost**: the call to the Caddy or the Companion was carried out, then the Station died before hearing the reply.
- **Fails once**: the write or call throws once (a full store, a quiet Caddy) and the Station lives on: the sequence rolls back before the commit and goes on after it.
- **Power cut**: everything dies just before the write (for the Companion's and the Caddy's own writes too) and all three start again from their disks.
- **Lifted**: the Companion is taken off the cradle just before the write; the dock afterwards finishes or rolls back.

| # | Write | By | Journal then | Station dies before | Reply lost | Fails once | Power cut | Lifted |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | journal open | station | - | back | - | back | back | back |
| 2 | Companion lock | station | open | back | back / back | back | back | back |
| 3 | save rewritten | companion | open | - | - | - | back | back |
| 4 | Companion sign | station | open | back | back / back | back | back | back |
| 5 | tombstone pending | companion | open | - | - | - | back | back |
| 6 | journal signed | station | open | back | - | back | back | back |
| 7 | Station copy | station | signed | back | - | back | back | back |
| 8 | journal keptStation | station | signed | back | - | back | back | back |
| 9 | PUT /realms/asleep/<wid> | station | keptStation | back | back / back | back | back | back |
| 10 | Caddy writes <wid>.<sha8>.mbr.tmp | caddy | keptStation | - | - | - | back | back |
| 11 | Caddy renames to <wid>.<sha8>.mbr | caddy | keptStation | - | - | - | back | back |
| 12 | Caddy writes ledger line kept | caddy | keptStation | - | - | - | back | back |
| 13 | Caddy writes index.json.tmp | caddy | keptStation | - | - | - | back | back |
| 14 | Caddy renames to index.json | caddy | keptStation | - | - | - | back | back |
| 15 | journal keptCaddy | station | keptStation | back | - | back | back | back |
| 16 | journal commit | station | keptCaddy | back | - | back | back | asleep |
| 17 | POST /realms/commit | station | commit | asleep | asleep / asleep | asleep | asleep | asleep |
| 18 | Caddy writes ledger line committed | caddy | commit | - | - | - | asleep | asleep |
| 19 | Station ledger | station | commit | asleep | - | asleep | asleep | asleep |
| 20 | Companion clear | station | commit | asleep | asleep / asleep | asleep | asleep | asleep |
| 21 | tombstone committed | companion | commit | - | - | - | asleep | asleep |
| 22 | Companion's new realm | companion | commit | - | - | - | asleep | asleep |
| 23 | tombstone done | companion | commit | - | - | - | asleep | asleep |
| 24 | journal companion | station | commit | asleep | - | asleep | asleep | asleep |
| 25 | Station part fresh | station | companion | asleep | - | asleep | asleep | asleep |
| 26 | journal station | station | companion | asleep | - | asleep | asleep | asleep |
| 27 | POST /realm/clear | station | station | asleep | asleep / asleep | asleep | asleep | asleep |
| 28 | Caddy writes ledger line cleared | caddy | station | - | - | - | asleep | asleep |
| 29 | journal caddy | station | station | asleep | - | asleep | asleep | asleep |
| 30 | Station index | station | caddy | asleep | - | asleep | asleep | asleep |
| 31 | journal closed | station | caddy | asleep | - | asleep | asleep | asleep |

Reads that fail once (they write nothing, so there is no crash to inject): GET /identity -> back; GET /realm -> back; GET /identity -> back; GET /realms/asleep -> back.

Reply lost shows two runs: the Station dies / the Station lives on. A second crash in the middle of recovery was injected at each of the 83 writes recovery makes after a first crash, and every one settled.
