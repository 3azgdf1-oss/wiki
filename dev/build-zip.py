#!/usr/bin/env python3
"""Build the installable ZIP of the skin from a git revision.

    python3 dev/build-zip.py                 # HEAD, written to the current directory
    python3 dev/build-zip.py v1.2.1 /tmp     # another revision and output directory

The ZIP holds exactly the committed files of the NightSky/ folder, with NightSky/ as its only top-level
entry, so extracting it into the wiki's skins/ directory gives skins/NightSky/skin.json. Files are stored
with LF line endings, Unix mode 0644 (folders 0755) and the commit's timestamp, so extracting it on Linux
never leaves files the web server cannot read, and building it twice gives the same archive.

The script checks its own output: one top-level folder, skin.json in the right place, no nested NightSky/
folder, no CR characters, and the version in skin.json is the one in the file name.
"""
import json
import subprocess
import sys
import time
import zipfile
from pathlib import Path

repo = Path(__file__).resolve().parent.parent
rev = sys.argv[1] if len(sys.argv) > 1 else "HEAD"
out_dir = Path(sys.argv[2]) if len(sys.argv) > 2 else Path.cwd()


def git(*args):
    return subprocess.check_output(["git", "-C", str(repo), *args])


names = git("ls-tree", "-r", "--name-only", rev, "--", "NightSky").decode().splitlines()
if not names:
    sys.exit(f"no NightSky/ folder in {rev}")
version = json.loads(git("show", f"{rev}:NightSky/skin.json"))["version"]
stamp = time.gmtime(int(git("log", "-1", "--format=%ct", rev).decode().strip()))[:6]

folders = set()
for name in names:
    parts = name.split("/")[:-1]
    for i in range(1, len(parts) + 1):
        folders.add("/".join(parts[:i]) + "/")

zip_path = out_dir / f"NightSky-{version}.zip"
zip_path.unlink(missing_ok=True)
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for folder in sorted(folders):
        info = zipfile.ZipInfo(folder, stamp)
        info.create_system = 3  # Unix, so the mode below is honoured
        info.external_attr = (0o040755 << 16) | 0x10
        z.writestr(info, b"")
    for name in sorted(names):
        info = zipfile.ZipInfo(name, stamp)
        info.create_system = 3
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        z.writestr(info, git("show", f"{rev}:{name}"))

# ---- verify what was written
problems = []
with zipfile.ZipFile(zip_path) as z:
    if z.testzip() is not None:
        problems.append("corrupt entry: " + z.testzip())
    entries = z.namelist()
    if {e.split("/")[0] for e in entries} != {"NightSky"}:
        problems.append("more than one top-level entry")
    if "NightSky/skin.json" not in entries:
        problems.append("NightSky/skin.json is missing")
    if any(e.startswith("NightSky/NightSky/") for e in entries):
        problems.append("nested NightSky/NightSky/ folder")
    if any(e.split("/")[1] in ("dev", ".git", ".gitattributes") for e in entries if e.count("/") >= 1 and e != "NightSky/"):
        problems.append("development files in the archive")
    for e in entries:
        if not e.endswith("/") and b"\r" in z.read(e):
            problems.append(f"CR character in {e}")
    manifest = json.loads(z.read("NightSky/skin.json"))
    if manifest["version"] != version:
        problems.append("version mismatch")
    for e in z.infolist():
        mode = (e.external_attr >> 16) & 0o777
        if mode != (0o755 if e.is_dir() else 0o644):
            problems.append(f"unexpected mode {mode:o} on {e.filename}")

for p in problems:
    print("FAIL", p)
size = zip_path.stat().st_size
print(f"{zip_path}  {size} bytes, {len(names)} files, NightSky {version}, from {rev}" + ("" if not problems else "  WITH PROBLEMS"))
sys.exit(1 if problems else 0)
