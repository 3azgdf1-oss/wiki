#!/bin/bash
# Contrast scan of 43 pages, for the skin under test and (optionally) the 1.1.0 copy, with a summary.
#
#   dev/scan-all.sh                       # nightskyold (1.1.0 copy) and nightsky (this repository)
#   SKINS="nightsky" dev/scan-all.sh      # only the skin under test
#   OUT=/tmp/scan BASE=http://localhost:8080 dev/scan-all.sh
#
# Every visible text node is measured against its real background (see dev/scan-contrast.mjs) and reported
# when it is below 4.5:1 (3:1 for large text). The pages are the fixtures made by dev/fixtures/seed.sh; the
# second list is fetched logged in as Admin.
set -u
cd "$(dirname "$0")"
export NODE_PATH=${NODE_PATH:-$(npm root -g)}
BASE=${BASE:-http://localhost:8080}
OUT=${OUT:-./scan-out}
SKINS=${SKINS:-"nightskyold nightsky"}
mkdir -p "$OUT"

ANON="Main_Page,Goober,Goober_(no_TemplateStyles),Goober_(tokens_variant),PC_Shredder,Armor_Info,Syntax_test,Kitchen_sink,Stress_test,Category:Shredders,File:Goober.png,Talk:Goober,Special:RecentChanges,Special:Version,Special:SpecialPages,Special:AllPages,Special:Statistics,Special:Log,Special:ListUsers,Special:NewPages,Special:UserLogin,Special:CreateAccount,Special:Search?search=armor&fulltext=1,Special:WhatLinksHere/Goober,Special:Contributions/Alice,Special:ListGroupRights,index.php?title=Goober&action=history,index.php?title=Goober&action=info"
ADMIN="index.php?title=Goober&action=edit,index.php?title=Goober&diff=prev&oldid=cur,index.php?title=Goober&action=delete,index.php?title=Goober&action=protect,index.php?title=Module:Infobox&action=edit,Special:Preferences,Special:Watchlist,Special:Upload,Special:MovePage/Goober,Special:Block,Special:UserRights/Alice,Special:BlockList,Special:ListFiles,Special:Contributions/Admin,Special:RecentChanges"

with_skin() { # with_skin "<comma list>" <skin>: append useskin=<skin> to every page
	python3 -c '
import sys
skin = sys.argv[2]
print(",".join(p + ("&" if "?" in p else "?") + "useskin=" + skin for p in sys.argv[1].split(",")))' "$1" "$2"
}

for skin in $SKINS; do
	node scan-contrast.mjs --base "$BASE" --json "$OUT/${skin}_anon.json" --pages "$(with_skin "$ANON" "$skin")" > "$OUT/${skin}_anon.log" 2>&1
	node scan-contrast.mjs --base "$BASE" --user Admin --json "$OUT/${skin}_admin.json" --pages "$(with_skin "$ADMIN" "$skin")" > "$OUT/${skin}_admin.log" 2>&1
	echo "scanned $skin"
done

SKINS="$SKINS" OUT="$OUT" python3 - <<'EOF'
import json, os
out = os.environ["OUT"]
for skin in os.environ["SKINS"].split():
    rows = {}
    for kind in ("anon", "admin"):
        for page, found in json.load(open(f"{out}/{skin}_{kind}.json")).items():
            rows[page.split("&useskin=")[0].split("?useskin=")[0] + ("  (logged in)" if kind == "admin" else "")] = found
    runs = sum(x["count"] for r in rows.values() for x in r)
    bad = {p: sum(x["count"] for x in r) for p, r in rows.items() if r}
    print(f"\n{skin}: {len(rows)} pages, {len(bad)} with text below the threshold, {runs} text runs in total")
    for p, n in sorted(bad.items(), key=lambda kv: -kv[1])[:10]:
        print(f"  {n:5d}  {p}")
EOF
