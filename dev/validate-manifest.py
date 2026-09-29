#!/usr/bin/env python3
"""Validate NightSky/skin.json against MediaWiki's own extension manifest schema.

    MW=/path/to/mediawiki python3 dev/validate-manifest.py
    python3 dev/validate-manifest.py /path/to/mediawiki

Needs `pip install jsonschema` and a MediaWiki 1.46 source tree (for docs/extension.schema.v2.json).
Also checks that every file the manifest names exists. Exits with status 1 on any problem.
"""
import json
import os
import sys
import warnings
from pathlib import Path

try:
    import jsonschema
except ImportError:
    sys.exit("jsonschema is missing: pip install jsonschema")

warnings.filterwarnings("ignore", category=DeprecationWarning)  # MediaWiki's $schema URL is not a registered metaschema

skin = Path(__file__).resolve().parent.parent / "NightSky"
mw = Path(sys.argv[1] if len(sys.argv) > 1 else os.environ.get("MW", ""))
schema_file = mw / "docs" / "extension.schema.v2.json"
if not schema_file.is_file():
    sys.exit(f"cannot find {schema_file}; pass the MediaWiki directory as the argument or set MW")

schema = json.loads(schema_file.read_text())
manifest = json.loads((skin / "skin.json").read_text())

problems = []
validator = jsonschema.validators.validator_for(schema)(schema)
for err in sorted(validator.iter_errors(manifest), key=lambda e: list(map(str, e.path))):
    problems.append(f"schema: /{'/'.join(map(str, err.path))}: {err.message[:160]}")

# every file the manifest points at
paths = []
for module in manifest.get("ResourceModules", {}).values():
    for key in ("styles", "scripts"):
        entries = module.get(key, [])
        paths += entries if isinstance(entries, list) else list(entries.values())
for name, directory in manifest.get("SkinLessImportPaths", {}).items():
    paths.append(directory + "/mediawiki.skin.variables.less")
for directories in manifest.get("MessagesDirs", {}).values():
    paths += [d + "/en.json" for d in directories]
for directory in manifest.get("AutoloadNamespaces", {}).values():
    paths.append(directory.rstrip("/"))
for p in sorted(set(paths)):
    if not (skin / p).exists():
        problems.append(f"missing file: {p}")

for p in problems:
    print("FAIL", p)
print(f"{len(problems)} problem(s); manifest {manifest['name']} {manifest['version']}, {len(set(paths))} referenced paths checked")
sys.exit(1 if problems else 0)
