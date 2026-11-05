"""HTML sheets with real text (DejaVu Sans, >= 14 px), screenshotted with the pinned playwright. Pictures are <img> files beside the html."""
import os, subprocess, html

CSS = """body{font-family:'DejaVu Sans',sans-serif;font-size:15px;background:#f2efe8;color:#222;margin:14px}
h1{font-size:22px;margin:4px 0 8px}h2{font-size:17px;margin:14px 0 4px}p,li{font-size:15px;line-height:1.35;max-width:1500px}
.grid{display:grid;gap:6px}.cell{background:#fff;border:1px solid #bbb;padding:3px;text-align:center}.cell img{display:block;margin:0 auto}
.cap{font-size:14px;color:#333}.pass{color:#0a6b2c;font-weight:bold}.fail{color:#b00020;font-weight:bold}
table{border-collapse:collapse;font-size:14px;background:#fff}td,th{border:1px solid #bbb;padding:3px 7px;text-align:left}th{background:#e8e4da}
.row{display:flex;gap:10px;align-items:flex-start}.mono{font-family:'DejaVu Sans Mono',monospace;font-size:14px}"""


def page(title, body):
    return f"<!doctype html><html><head><meta charset='utf-8'><title>{html.escape(title)}</title><style>{CSS}</style></head><body>{body}</body></html>"


def shoot(html_path, png_path, width=1600, height=900):
    """`height` is the browser window's: a page shorter than it is padded to it, so a small one (the gate's sheets use 100) gives a picture exactly as tall as the page."""
    here = os.path.dirname(os.path.abspath(__file__))
    env = dict(os.environ, PLAYWRIGHT_BROWSERS_PATH="/home/mb/pw156/browsers")
    subprocess.run(["node", os.path.join(here, "shot.cjs"), os.path.abspath(html_path), os.path.abspath(png_path), str(width), str(height)], check=True, env=env)


def table(rows, header=None):
    h = "<tr>" + "".join(f"<th>{c}</th>" for c in header) + "</tr>" if header else ""
    return "<table>" + h + "".join("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>" for r in rows) + "</table>"


def status(ok, text=""):
    return f"<span class='{'pass' if ok else 'fail'}'>{'PASS' if ok else 'FAIL'}</span> {text}"
