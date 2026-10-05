# Run Miniature Beasts locally

The [native simulator](../../native/selected-lab/README.md) presents Station, combined Companion and Caddy from one saved world in a C17 process. The browser relays device-control events and displays native frames. The [build guide](../../BUILD.md) explains what has been compiled and what remains unverified on hardware.

## Build and run the simulator

Use Git, GCC, CMake 3.28 or later, Ninja and Python 3.12 on Linux. The [native guide](../../native/README.md) owns detailed toolchain and validation instructions.

```sh
git clone https://github.com/PacoCotera/critter-lab.git
cd critter-lab
cmake -S native/lab -B native/build/lab -G Ninja \
  -DCRITTER_BUILD_SELECTED_LAB=ON -DCMAKE_BUILD_TYPE=Release
cmake --build native/build/lab
```

Choose an absolute writable save path outside release bundles. The save and its `.kit` and `.kit.required` sidecars form one world: preserve and back them up together. [State and recovery](../../native/selected-lab/README.md#state-and-recovery) explains their relationship.

```sh
export CRITTER_DEMO_BINARY="$PWD/native/build/lab/selected-lab/selected_lab"
export BEECHO_V1_SAVE="$HOME/beecho-saves/play-world"
mkdir -p "$(dirname "$BEECHO_V1_SAVE")"
python3 native/presenter/server.py
```

Open `http://127.0.0.1:4180`. Stop with Ctrl+C. Follow the [play guide](../../native/selected-lab/V1.md). Companion starts expeditions; Station accepts returns and researches or creates. External link switches and Reset sandbox administer the simulator. Reset creates a uniquely named backup; there is no browser restore endpoint.

The presenter uses `CRITTER_DEMO_BIND` and `CRITTER_DEMO_PORT`, defaulting to loopback and port 4180. `CRITTER_DEMO_PASSWORD` enables HTTP Basic access with username `lab`. Use HTTPS when exposing it beyond local inspection. Visitors share one simulator world. [Release bundles](../../native/UPDATER.md) identify source and build provenance.

## Separate experiments

The [generator workbench](../../prototype/generator-workbench/README.md) has its own authoring setup and persistence. It does not create accepted residents in the simulator.

Older browser studies run separately with Node.js 22 or later:

```sh
npm ci
npm start
```

Open `http://127.0.0.1:4173`. The [prototype index](../../prototype/README.md) explains the breeding/share study, authored Station fixture, transfer views and display studies. Each has its own limitations and storage. Browser breeding uses local storage; the Station study uses IndexedDB. Changing browser or origin can show a different collection. Do not delete unfamiliar saves to repair an error.

The Node server uses `CRITTER_HOST` and `CRITTER_PORT`, defaulting to loopback and 4173. `CRITTER_PUBLIC_ORIGIN` configures a trusted-LAN share origin. Those study share endpoints have no player authentication and are unsuitable as a public game service.

Use the relevant component guide for meaningful checks when changing its behavior. Documentation edits need inspection of links, commands and claims; they do not require another gameplay run.
