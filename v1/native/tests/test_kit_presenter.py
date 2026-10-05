"""Actual three-device HTTP/native journey; no parallel browser game rules."""
import importlib.util
import json
import os
from pathlib import Path
import struct
import sys
import tempfile
import threading
import time
from collections import deque
from urllib.error import HTTPError
from urllib.request import Request, urlopen

spec = importlib.util.spec_from_file_location("presenter", Path(__file__).parents[1] / "presenter/server.py")
presenter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(presenter)


def run(binary, proof=None):
    with tempfile.TemporaryDirectory(prefix="beecho-kit-http-") as directory:
        os.environ["BEECHO_V1_SAVE"] = str(Path(directory) / "world")
        server = presenter.ThreadingHTTPServer(("127.0.0.1", 0), presenter.Handler)
        server.password = ""
        server.release = {"commit": None}
        server.native = presenter.NativeProcess(binary, kit=True)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        origin = f"http://127.0.0.1:{server.server_port}"

        def request(path, data=None, same_origin=True):
            headers = {"Content-Type": "application/json", "X-Requested-With": "CritterLab"}
            if same_origin:
                headers["Origin"] = origin
            body = None if data is None else json.dumps(data).encode()
            try:
                response = urlopen(Request(origin + path, data=body, headers=headers), timeout=10)
            except HTTPError as error:
                response = error
            with response:
                return response.status, response.read()

        def state(device):
            code, body = request(f"/api/devices/{device}/status")
            assert code == 200, (code, body)
            return json.loads(body)

        def frame(device, name=None):
            for _ in range(5):
                current = state(device)
                code, pixels = request(f"/api/devices/{device}/frame?revision={current['revision']}")
                if code == 409:
                    continue
                assert code == 200 and pixels[:2] == b"BM"
                assert struct.unpack_from("<ii", pixels, 18) == (current["width"], current["height"])
                if proof and name:
                    Path(proof).mkdir(parents=True, exist_ok=True)
                    (Path(proof) / f"{name}-{device}.bmp").write_bytes(pixels)
                return current
            raise AssertionError("Frame never became ready")

        def event(device, name, revision):
            code, body = request("/api/device-input", {"device": device, "event": name, "revision": revision})
            assert code == 200, (code, body)
            return json.loads(body)

        def press(device, button):
            current = frame(device)
            revision = current["revision"]
            event(device, "ready", revision)
            event(device, button + "-down", revision)
            return event(device, button + "-up", revision)

        def link(device, online):
            assert request("/api/link", {"device": device, "online": online})[0] == 200

        def walk_to(site):
            current = state("companion")["field"]
            target = next(place["tile"] for place in current["sites"] if place["id"] == site)
            start = tuple(current["position"])
            target = tuple(target)
            paths = set(current["paths"])
            queue = deque([start])
            previous = {start: None}
            directions = ((0, -1, "up"), (0, 1, "down"), (-1, 0, "left"), (1, 0, "right"))
            while queue and target not in previous:
                x, y = queue.popleft()
                for dx, dy, button in directions:
                    tile = (x + dx, y + dy)
                    if 0 <= tile[0] < 20 and 0 <= tile[1] < 11 and tile[1] * 20 + tile[0] in paths and tile not in previous:
                        previous[tile] = ((x, y), button)
                        queue.append(tile)
            assert target in previous, (start, target, current)
            buttons = []
            tile = target
            while previous[tile] is not None:
                tile, button = previous[tile]
                buttons.append(button)
            for button in reversed(buttons):
                press("companion", button)
            assert state("companion")["field"]["site"] == site

        try:
            for device in ("lab", "companion", "dock"):
                frame(device, "initial")
            initial = state("companion")
            assert initial["page"] == "modes" and initial["mode"] == 0
            selected = press("companion", "down")
            assert selected["page"] == "modes" and selected["mode"] == 1
            assert selected["cargo"] == initial["cargo"] and selected["stock"] == initial["stock"]
            assert "field" not in selected and selected["phase"] == 0
            assert press("companion", "up")["mode"] == 0
            assert press("companion", "right")["mode"] == 1
            frame("companion", "mode-cargo")
            assert press("companion", "right")["mode"] == 2
            frame("companion", "mode-companions")
            press("companion", "left")
            press("companion", "left")
            assert request("/api/link", {"device": "companion", "online": False}, False)[0] == 403
            assert request("/api/device-input", {"device": "companion", "event": "research-down", "revision": 1})[0] == 400
            assert request("/api/devices/probe/status")[0] == 400
            assert request("/api/input", {"event": "confirm-down", "revision": 1})[0] == 400
            assert press("companion", "confirm")["page"] == "probe"
            assert state("companion")["cargo"] == [0, 0, 0]
            frame("companion", "expedition-chooser")
            press("companion", "confirm")
            assert state("companion")["field"]["active_source"] == 255
            press("companion", "confirm")  # Inspect Camp, no automatic award/start.
            assert state("companion")["page"] == "field-site"
            before = state("companion")["cargo"]
            press("companion", "back")  # Cancel chooser without taking supplies.
            assert state("companion")["cargo"] == before
            walk_to(2)
            press("companion", "confirm")  # One direct Take12 Data.
            assert state("companion")["cargo"] == [1200, 0, 0]
            walk_to(3)
            press("companion", "confirm")  # One direct Take14 Energy.
            walk_to(1)
            press("companion", "confirm")  # Supplies and trace are real alternatives.
            press("companion", "confirm")  # Take12 Essence, immediate saved result.
            press("companion", "back")
            assert sum(state("companion")["cargo"]) == 3800
            walk_to(0)
            press("companion", "confirm")
            press("companion", "confirm")  # CampData2 fills the remaining two slots.
            assert sum(state("companion")["cargo"]) == 4000
            assert state("companion")["field"]["remaining"][1:3] == [2, 1]
            press("companion", "back")
            frame("companion", "finite-full-cargo")
            assert state("lab")["stock"] == [0, 0, 0]
            assert state("lab")["cargo"] == [0, 0, 0]
            assert "field" not in state("lab")
            code, generic_bytes = request("/api/status")
            assert code == 200
            generic = json.loads(generic_bytes)
            assert generic["cargo"] == [0, 0, 0]
            assert generic["gather_progress_ms"] == [0, 0, 0]
            assert "field" not in generic
            current_lab = frame("lab")
            code, generic_frame = request(f"/api/frame?revision={current_lab['revision']}")
            assert code == 200
            code, explicit_frame = request(f"/api/devices/lab/frame?revision={current_lab['revision']}")
            assert code == 200 and generic_frame == explicit_frame
            walk_to(1)
            press("companion", "confirm")  # The remaining trace reads directly.
            assert state("companion")["field"]["trace"]
            assert state("companion")["field"]["capsules"] == 0
            walk_to(4)
            press("companion", "confirm")  # Deliberately collect a sealed sample at full supply capacity.
            assert state("companion")["field"]["capsules"] == 1
            press("companion", "back")  # Modes.
            press("companion", "right")
            press("companion", "confirm")  # Cargo.
            frame("companion", "cargo")
            sending = state("companion")
            assert sending["page"] == "cargo" and sending["focus"] == "Send to Station"
            assert sending["phase"] == 0
            before_send = sending["cargo"]
            preparation = state("companion")["gather_progress_ms"]
            time.sleep(2.1)
            assert state("companion")["cargo"] == before_send
            assert state("companion")["gather_progress_ms"] == preparation
            link("companion", False)
            # One deliberate Send seals the manifest; there is no second review.
            sealed = press("companion", "confirm")
            assert sealed["phase"] == 1 and sealed["page"] != "send-review"
            frame("companion", "sending-offline")
            repeated = press("companion", "confirm")
            assert repeated["phase"] == 1 and repeated["haul"] == sealed["haul"]
            assert repeated["cargo"] == sealed["cargo"] and repeated["stock"] == [0, 0, 0]
            reopened = press("companion", "confirm")
            assert reopened["page"] == "cargo" and reopened["phase"] == 1
            assert reopened["haul"] == sealed["haul"]
            time.sleep(2.1)
            assert state("companion")["phase"] == 1
            cargo = sealed["cargo"]
            request("/api/status")  # Legacy health must not bypass sealed-cargo ownership.
            assert state("companion")["cargo"] == cargo
            link("companion", True)
            time.sleep(2.1)
            assert state("companion")["phase"] == 2
            assert state("lab")["page"] == "cargo"  # Immediate reception.
            frame("lab", "incoming")
            home = press("lab", "critters")  # Legacy yellow-key wire name now means Home.
            assert home["page"] == "home" and home["focus"] == "Overview"
            assert home["phase"] == 2 and home["stock"] == [0, 0, 0]
            frame("lab", "pending-home")
            press("lab", "down")
            pending = press("lab", "confirm")
            assert pending["page"] == "expedition" and pending["phase"] == 2
            link("dock", False)
            link("companion", False)
            accepted = press("lab", "confirm")
            credited = [amount // 100 * 100 for amount in cargo]
            retained = [amount % 100 for amount in cargo]
            assert accepted["phase"] == 4 and accepted["stock"] == credited
            assert accepted["expedition_seconds"] == 0 and accepted["samples"] == 1
            assert accepted["received_count"] == 1
            assert state("companion")["cargo"] == [0, 0, 0]
            assert state("lab")["cargo"] == [0, 0, 0]
            assert state("companion")["cargo_capsules"] == 0
            assert state("companion")["delivery_record"] == {
                "accepted": True, "supplies": [amount // 100 for amount in cargo], "capsules": 1}
            for device in ("lab", "companion", "dock"):
                frame(device, "accepted-offline")
            assert state("dock")["dock_stock"] == [0, 0, 0]
            assert press("lab", "confirm")["stock"] == credited
            before_home = state("lab")
            assert press("lab", "critters")["page"] == "home"
            assert press("lab", "down")["focus"] == "Explore"
            accepted_home = frame("lab", "accepted-home")
            assert accepted_home["cargo"] == [0, 0, 0] and accepted_home["stock"] == credited
            returned = press("lab", "confirm")
            for key in ("page", "received_selected", "received_detail", "phase", "stock",
                        "samples", "received_count", "cargo", "haul"):
                assert returned[key] == before_home[key], (key, returned, before_home)
            link("companion", True)
            link("dock", True)
            time.sleep(2.1)
            assert state("companion")["phase"] == 5
            assert state("companion")["cargo"] == retained
            assert state("lab")["cargo"] == [0, 0, 0]
            assert state("companion")["gather_progress_ms"] == preparation
            frame("companion", "receipt")
            assert state("companion")["focus"] == "Choose a new expedition"
            assert state("dock")["dock_stock"] == credited
            press("lab", "back")
            for device in ("lab", "companion", "dock"):
                frame(device, "complete")
            assert press("companion", "confirm")["page"] == "probe"
            assert state("companion")["focus"] == "Field survey"
            started = press("companion", "confirm")
            assert started["expedition_seconds"] == 0
            frame("companion", "new-expedition")
            print("Three-device HTTP/native frame, handoff, link recovery and endpoint guards passed", flush=True)
        finally:
            server.shutdown()
            server.server_close()
            server.native.close()


if __name__ == "__main__":
    run(str(Path(sys.argv[1]).resolve()), sys.argv[2] if len(sys.argv) > 2 else None)
