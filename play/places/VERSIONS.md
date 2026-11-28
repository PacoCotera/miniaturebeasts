# Pins for the place foundation

One version of each tool, for everyone. Upgrading any of them is a deliberate chunk: new pin, rebake, goldens unchanged.

| Tool | Pin | Where it is pinned |
| --- | --- | --- |
| LDtk | **1.5.3** (newest stable on 2026-11-07; the bake refuses any other `jsonVersion`) | the vendored schema below |
| LDtk JSON schema | `vendor/ldtk-1.5.3.schema.json`, from https://ldtk.io/files/JSON_SCHEMA.json, fetched 2026-11-07 | sha256 below |
| flatc (FlatBuffers compiler) | **25.9.23** | `flatc-version` below; CI downloads the release zip and checks its sha256 |
| flatbuffers (npm runtime) | 25.9.23 | `package.json`, `package-lock.json` |
| pngjs | 7.0.0 | `package.json`, `package-lock.json` |
| ajv | 8.20.0 | `package.json`, `package-lock.json` |
| esbuild | 0.28.2 | `package.json`, `package-lock.json` |
| pngquant | **not used**: the test kit measured 39 colours, far inside the 208 (see `art/places/sets/ninja-test/SOURCE.md`). A kit over 208 stops `prepare-set.mjs`; pin pngquant here when one needs it. | |

```
ldtk-version: 1.5.3
ldtk-schema-sha256: 2aa84b0db6e5ef1b530b1f557c5802da1aa8bc62d10184d358c346734fb84893
flatc-version: 25.9.23
flatc-linux-zip-url: https://github.com/google/flatbuffers/releases/download/v25.9.23/Linux.flatc.binary.g++-13.zip
flatc-linux-zip-sha256: de0c6ad114a5a686ecf64322528c602c7d4512446a93f290f54f00ee5abea487
```

## How CI gets flatc

`site.yml` downloads the Linux zip named above into `$RUNNER_TEMP`, checks its sha256 against this file, unzips it and puts `flatc` on `PATH`; the reader regeneration test (`format.test.mjs`) runs `flatc --version` and fails if it is not 25.9.23. Locally the same: `tools/get-flatc.sh <dir>` does the download and the check, and the tests find `flatc` on `PATH` or in `$MB_FLATC`.

## How CI installs the JavaScript dependencies

`npm ci --prefix prototypes/places` (lockfile only; no version ranges anywhere).
