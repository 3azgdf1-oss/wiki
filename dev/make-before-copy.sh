#!/bin/bash
# Build the "before" skin for side-by-side comparisons: a copy of the 1.1.0 release under another name, so
# both versions can be loaded in the same test wiki (?useskin=nightskyold and ?useskin=nightsky).
#
#   dev/make-before-copy.sh /path/to/unzipped/NightSky-1.1.0/NightSky  /path/to/mediawiki/skins/NightSkyOld
#
# The only change is a mechanical rename (nightsky -> nightskyold, NightSky -> NightSkyOld) in the skin's
# own files, so the CSS selectors (.skin-nightskyold ...), element ids, message keys and the skin name
# all follow the new name and nothing collides with the skin under test. Reverse the rename and the files
# are byte for byte the 1.1.0 upload.
set -eu
src=${1:?path to the 1.1.0 NightSky folder}
dst=${2:?destination, e.g. mediawiki/skins/NightSkyOld}
[ -f "$src/skin.json" ] || { echo "no skin.json in $src" >&2; exit 1; }
rm -rf "$dst"
cp -r "$src" "$dst"
# drop the stale second copy that the 1.1.0 zip carried in NightSky/NightSky
rm -rf "$dst/NightSky"
find "$dst" -type f \( -name '*.json' -o -name '*.css' -o -name '*.js' -o -name '*.less' -o -name '*.mustache' -o -name '*.wikitext' -o -name '*.md' \) \
	-exec sed -i 's/nightsky/nightskyold/g; s/NightSky/NightSkyOld/g' {} +
echo "1.1.0 copy written to $dst"
