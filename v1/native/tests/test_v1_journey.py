"""Play the actual native protocol, including real timers and restart recovery."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time


class Player:
    def __init__(self, binary, save, frames):
        self.binary, self.save, self.frames = binary, save, frames
        self.process = subprocess.Popen(
            [binary, "serve"], stdin=subprocess.PIPE, stdout=subprocess.PIPE,
            env={**os.environ, "BEECHO_V1_SAVE": str(save)},
        )
        self.state = self.command("status")

    def command(self, text):
        self.process.stdin.write((text + "\n").encode())
        self.process.stdin.flush()
        self.state = json.loads(self.process.stdout.readline())
        assert "error" not in self.state, self.state
        return self.state

    def press(self, button="confirm"):
        for attempt in range(3):
            revision = self.command("status")["revision"]
            state = self.command(f"ready {revision}")
            if state["revision"] == revision:
                self.command(f"{button}-down {revision}")
                return self.command(f"{button}-up {revision}")
        raise AssertionError("Could not get a stable frame")

    def choose(self, label):
        for _ in range(10):
            if self.state["focus"] == label:
                return self.press()
            self.press("down")
        raise AssertionError((label, self.state))

    def capture(self, name):
        for attempt in range(4):
            revision = self.command("status")["revision"]
            self.process.stdin.write(f"frame {revision}\n".encode())
            self.process.stdin.flush()
            header = json.loads(self.process.stdout.readline())
            if header.get("error") == "Stale frame request":
                continue
            assert "error" not in header, header
            content = self.process.stdout.read(header["bytes"])
            assert len(content) == header["bytes"] and content[:2] == b"BM"
            (self.frames / (name + ".bmp")).write_bytes(content)
            self.command("status")
            return content
        raise AssertionError("Could not capture a stable native frame")

    def reject_frame(self):
        # Retired fixture pages keep their command/domain behavior but no graphics.
        for attempt in range(4):
            state = self.command("status")
            revision, page = state["revision"], state["page"]
            self.process.stdin.write(f"frame {revision}\n".encode())
            self.process.stdin.flush()
            header = json.loads(self.process.stdout.readline())
            if header.get("error") == "Stale frame request":
                continue
            assert header == {"error": "Unsupported frame page"}, header
            assert self.process.poll() is None
            # This response would fail to parse if BMP bytes followed the error.
            assert self.command("status")["page"] == page
            return
        raise AssertionError("Could not reject a stable retired frame")

    def first_sample(self):
        assert self.state["page"] == "samples", self.state
        self.choose("Overview")
        self.press("down")
        return self.press()

    def home_views(self, label):
        assert self.state["page"] == "home", self.state
        for attempt in range(5):
            if self.state["focus"] == "Overview":
                break
            self.press("down")
        assert self.state["focus"] == "Overview", self.state
        for index, focus in enumerate(("Overview", "Explore", "Research", "Incubator", "Habitat")):
            assert self.state["focus"] == focus, self.state
            self.capture(f"{label}-home-{index}-{focus.lower()}")
            self.press("down")
        assert self.state["page"] == "home" and self.state["focus"] == "Overview"

    def wait_until(self, predicate, timeout):
        deadline = time.monotonic() + timeout
        while not predicate(self.command("status")):
            assert time.monotonic() < deadline, self.state
            time.sleep(0.25)

    def close(self):
        self.process.stdin.close()
        assert self.process.wait(timeout=5) == 0


def journey(binary, frames):
    frames.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as directory:
        save = Path(directory) / "world.save"
        player = Player(binary, save, frames)
        player.home_views("empty")
        player.choose("Explore")
        player.choose("Field survey")
        player.press("back")
        player.home_views("active-expedition")
        player.choose("Explore")
        player.command(f"suspend {player.state['revision']}")
        before = player.state["expedition_seconds"]
        time.sleep(2.2)
        player.command(f"resume {player.state['revision']}")
        assert player.state["expedition_seconds"] == before
        player.wait_until(lambda state: state["expedition_seconds"] >= 60, 65)
        player.reject_frame()
        player.choose("Cargo")
        player.choose("Discard 10 Data")
        player.reject_frame()
        player.choose("Keep these items")
        carried = player.state["cargo"]
        before_stock = player.state["stock"]
        player.reject_frame()
        player.press("research")
        assert player.state["page"] == "samples" and player.state["focus"] == "Overview"
        before_frame = player.capture("before-saved-haul-samples")
        player.press("back")
        player.choose("Explore")
        player.choose("Cargo")
        assert player.state["cargo"] == carried and player.state["stock"] == before_stock
        player.choose("Return + store haul")
        assert player.state["stock"] == [before_stock[index] + carried[index] // 100 * 100
                                          for index in range(3)]
        assert player.state["cargo"] == [amount % 100 for amount in carried]
        assert player.state["message"].startswith("Haul saved. Station stock")
        assert player.state["page"] == "samples" and player.state["focus"] == "Overview"
        after_frame = player.capture("after-saved-haul-samples")
        width, height = 1024, 600
        stride = width * 3
        header_rows = range(60, 96)
        assert any(before_frame[54 + (height - 1 - y) * stride + 30 * 3:
                                54 + (height - 1 - y) * stride + 970 * 3] !=
                   after_frame[54 + (height - 1 - y) * stride + 30 * 3:
                               54 + (height - 1 - y) * stride + 970 * 3]
                   for y in header_rows), "Stock header did not redraw after offload"
        assert player.state["samples"] == 1
        player.close()
        player = Player(binary, save, frames)
        assert player.state["stock"] == [before_stock[index] + carried[index] // 100 * 100
                                          for index in range(3)]
        player.choose("Research")
        assert player.state["focus"] == "Overview"
        player.capture("collection-overview")
        player.first_sample()
        costs = {"Read the pattern": [400, 0, 0],
                 "Trace movement": [0, 400, 0],
                 "Compare the coat": [0, 0, 400]}
        for label, required in costs.items():
            before_preview = player.state["stock"]
            player.choose(label)
            assert player.state["stock"] == before_preview
            if any(player.state["stock"][i] < required[i] for i in range(3)):
                # A miss is real: return to the same research after gathering,
                # rather than assuming a fixed first-expedition reward.
                for _ in range(3):
                    player.press("back")
                player.choose("Explore")
                player.choose("Garden forage")
                player.wait_until(lambda state: all(state["stock"][i] + state["cargo"][i] >= required[i]
                                                     for i in range(3)), 65)
                player.choose("Cargo")
                player.choose("Return + store haul")
                player.first_sample()
                player.choose(label)
            player.capture("review-" + label.replace(" ", "-"))
            before_research = player.state["stock"]
            player.choose("Start research")
            assert player.state["page"] == "finding", player.state
            assert player.state["stock"] == [before_research[i] - required[i]
                                              for i in range(3)]
            player.capture("03-" + label.replace(" ", "-"))
            player.press()
            before_inspection = player.state["stock"]
            player.choose(label)
            assert player.state["page"] == "finding"
            assert player.state["stock"] == before_inspection
            player.press()
        player.choose("Prepare incubation")
        assert player.state["page"] == "creation"
        player.press("back")
        player.press("back")
        player.press("back")
        player.home_views("researched")
        player.choose("Explore")
        player.choose("Garden forage")
        for outing in range(3):
            player.wait_until(lambda state: state["expedition_seconds"] >= 60 or
                              state["gather_capacity_blocked"], 65)
            if player.state["expedition_seconds"] >= 60:
                break
            player.choose("Cargo")
            player.choose("Return + store haul")
            assert player.state["samples"] == 1
            player.press("back")
            player.choose("Explore")
            player.choose("Garden forage")
        else:
            raise AssertionError(("No completed outing within three fresh routes", player.state))
        player.choose("Cargo")
        player.choose("Return + store haul")
        player.first_sample()
        player.choose("Prepare incubation")
        player.capture("candidate-selection")
        before_creation = player.state["stock"]
        before_individuals = player.state["individuals"]
        player.choose("Pale markings")
        assert player.state["page"] == "creation-review"
        assert player.state["stock"] == before_creation
        assert player.state["individuals"] == before_individuals
        player.capture("creation-review")
        player.press("back")
        assert player.state["page"] == "creation" and player.state["focus"] == "Pale markings"
        assert player.state["stock"] == before_creation
        player.press()
        player.press("home")  # Native alias for the existing yellow-key input.
        assert player.state["page"] == "home" and player.state["focus"] == "Overview"
        assert player.state["stock"] == before_creation
        player.press("research")
        assert player.state["page"] == "creation-review"
        player.choose("Start incubation")
        assert player.state["page"] == "incubation"
        assert player.state["stock"] == [amount - 500 for amount in before_creation]
        assert player.state["individuals"] == before_individuals + 1
        player.capture("04-incubation")
        player.press("back")
        player.home_views("incubation-active")
        player.choose("Incubator")
        player.close()
        player = Player(binary, save, frames)
        player.choose("Incubator")
        player.wait_until(lambda state: state["incubation_ready"], 25)
        player.press("back")
        player.home_views("incubation-ready")
        player.choose("Incubator")
        player.choose("Open incubation")
        assert player.state["page"] == "reveal"
        player.capture("05-reveal")
        player.press()
        assert player.state["page"] == "habitat" and player.state["focus"] == "Population"
        before_care = save.read_bytes()
        resident_stock = player.state["stock"]
        player.press("right")
        assert player.state["focus"] == "Spend time together"
        player.press("up")
        player.press("down")
        assert player.state["focus"] == "Spend time together"
        assert save.read_bytes() == before_care and player.state["stock"] == resident_stock
        player.press()
        assert player.state["message"] == "Pip perks up and settles beside you."
        assert save.read_bytes() != before_care and player.state["stock"] == resident_stock
        player.capture("06-habitat")
        player.press("left")
        assert player.state["focus"] == "Population"
        player.press()
        assert player.state["page"] == "residents"
        player.capture("resident-list")
        player.press()
        assert player.state["page"] == "habitat" and player.state["stock"] == resident_stock
        player.press("back")
        assert player.state["page"] == "residents"
        player.press("back")
        player.home_views("revealed-resident")
        stock = player.state["stock"]
        player.close()
        player = Player(binary, save, frames)
        assert player.state["individuals"] == 1 and player.state["stock"] == stock
        player.choose("Habitat")
        assert player.state["page"] == "residents"
        player.press()
        assert player.state["page"] == "habitat" and player.state["focus"] == "Population"
        player.choose("Explore again")
        player.choose("Weather watch")
        player.wait_until(lambda state: sum(state["cargo"]) > 0, 10)
        player.choose("Cargo")
        player.choose("Return + store haul")
        assert player.state["samples"] == 2, "Early return must not mint a sample"
        player.close()
        print("Complete native journey, real timers, repeat expedition and restart passed", flush=True)


if __name__ == "__main__":
    journey(str(Path(sys.argv[1]).resolve()), Path(sys.argv[2]))
