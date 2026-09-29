#!/bin/bash
# Static checks for the skin. No wiki or browser needed.
#
#   MW=/path/to/mediawiki dev/check.sh        # MW is only needed for the manifest schema check
#
# Needs: php, python3 (+ jsonschema), node with stylelint and eslint available (npm i -g stylelint eslint).
set -u
cd "$(dirname "$0")/.."
fail=0
step() { echo; echo "== $1"; }
run() { "$@" || fail=1; }

step "PHP syntax"
run php -l NightSky/includes/SkinNightSky.php

step "JSON files parse"
for f in NightSky/skin.json NightSky/i18n/*.json dev/preview-pages.json; do
	python3 -c "import json,sys; json.load(open(sys.argv[1]))" "$f" && echo "ok  $f" || fail=1
done

step "i18n: every message key in en.json is documented in qqq.json"
python3 - <<'EOF' || fail=1
import json, sys
en = json.load(open("NightSky/i18n/en.json")); qqq = json.load(open("NightSky/i18n/qqq.json"))
missing = sorted(k for k in en if k != "@metadata" and k not in qqq)
extra = sorted(k for k in qqq if k != "@metadata" and k not in en)
for k in missing: print("FAIL undocumented:", k)
for k in extra: print("FAIL documented but unused:", k)
print(f"{len(missing) + len(extra)} problem(s)")
sys.exit(1 if missing or extra else 0)
EOF

step "Manifest against MediaWiki's schema"
if [ -n "${MW:-}" ]; then run python3 dev/validate-manifest.py; else echo "skipped (set MW=/path/to/mediawiki)"; fi

step "stylelint"
run stylelint --config dev/lint/.stylelintrc.json "NightSky/resources/*.css"

step "eslint"
run eslint -c dev/lint/eslint.config.mjs NightSky/resources/navigation.js NightSky/resources/contrast.js

step "Colour tokens: WCAG contrast of every text/surface pair"
run python3 dev/contrast-tokens.py --failures

echo
if [ "$fail" = 0 ]; then echo "ALL STATIC CHECKS PASSED"; else echo "SOME CHECKS FAILED"; fi
exit $fail
