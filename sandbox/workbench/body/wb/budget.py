"""The studio app's first-load weight. First load = the page and every asset a species open loads (the studio route's chunks, not the play and pods pages), counted as the browser receives them: gzip for text, as is for fonts.
Used by tests/test_wb_budget.py and, with a path, as a script that prints the numbers (python budget.py [static/app dir])."""
import os
import sys
import zlib

APP = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "app")
LAZY_PAGES = ("PlayPage-", "PodsPage-")        # routes a species open does not load
TEXT = (".js", ".css", ".html", ".svg", ".json")


def wire(path):
    """Bytes on the wire for one file: the committed .gz sibling when there is one, else gzip level 9; fonts and images as they are."""
    if path.endswith(TEXT):
        if os.path.exists(path + ".gz"):
            return os.path.getsize(path + ".gz")
        with open(path, "rb") as fh:
            return len(zlib.compress(fh.read(), 9)) + 18
    return os.path.getsize(path)


def first_load(app=APP):
    """-> list of (name, raw bytes, wire bytes) for index.html and everything under assets/ a species open loads, largest first."""
    names = ["index.html"]
    for n in sorted(os.listdir(os.path.join(app, "assets"))):
        if n.endswith((".br", ".gz")) or n.startswith(LAZY_PAGES):
            continue
        names.append("assets/" + n)
    rows = [(n, os.path.getsize(os.path.join(app, n)), wire(os.path.join(app, n))) for n in names]
    return sorted(rows, key=lambda r: -r[2])


if __name__ == "__main__":
    app = sys.argv[1] if len(sys.argv) > 1 else APP
    rows = first_load(app)
    for n, raw, w in rows:
        print(f"{w:9d} {raw:9d}  {n}")
    print(f"first load: {sum(r[2] for r in rows)} bytes on the wire ({sum(r[1] for r in rows)} raw, {len(rows)} files)")
