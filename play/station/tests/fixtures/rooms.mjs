// The four rooms (ui/specs/station/rooms.json), registered for the props builders as the page registers them at boot (main.mjs bootAssets): import this for its effect.
import { readFileSync } from "node:fs";
import { setRooms } from "../../src/views/room-props.mjs";
setRooms(JSON.parse(readFileSync(new URL("../../../ui/specs/station/rooms.json", import.meta.url), "utf8")));
