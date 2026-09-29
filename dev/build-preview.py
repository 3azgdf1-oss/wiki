#!/usr/bin/env python3
"""Assemble the before/after preview as a static folder you can open or host anywhere.

    node dev/export-static.mjs --out build/site
    node dev/screenshots.mjs   --out build/shots --only main,goober,goober-bare,syntax,kitchen,rc,edit,prefs
    python3 dev/build-preview.py build/site build/shots build/preview
    python3 -m http.server -d build/preview 8000        # then open http://localhost:8000

The page selector, Before / After / Side by side switch and the Desktop / Tablet / Phone widths are in
dev/preview-viewer.html. It expects the snapshots in nightsky/ and nightskyold/ and the screenshots in
shots/, which is the layout this script writes. The snapshots are self-contained (inline CSS and images,
no scripts), so the result also works from a plain file server; it only needs to be served over http
because the viewer fetches the snapshots.
"""
import shutil
import sys
from pathlib import Path

if len(sys.argv) != 4:
    sys.exit(__doc__)
site, shots, out = (Path(a) for a in sys.argv[1:])
viewer = Path(__file__).resolve().parent / "preview-viewer.html"

out.mkdir(parents=True, exist_ok=True)
for skin in ("nightsky", "nightskyold"):
    shutil.copytree(site / skin, out / skin, dirs_exist_ok=True)
    if (shots / skin).is_dir():
        shutil.copytree(shots / skin, out / "shots" / skin, dirs_exist_ok=True)

skeleton = (
    '<!doctype html><html lang="en"><head><meta charset="utf-8">'
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
    "<style>:root{color-scheme:light}body{margin:0;font:14px system-ui,sans-serif;background:#f8f8f8;color:#111}"
    "img{max-width:100%}[hidden]{display:none!important}</style></head><body>"
)
(out / "index.html").write_text(skeleton + viewer.read_text() + "</body></html>")
print(f"preview written to {out} ({sum(1 for _ in out.rglob('*') if _.is_file())} files)")
