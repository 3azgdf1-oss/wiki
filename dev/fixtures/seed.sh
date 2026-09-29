#!/bin/bash
# Seed a local test wiki with the fixture pages and some recent-changes activity (edits by several users,
# a bot edit, a move, a delete, a protection).
#
#   MW=/path/to/mediawiki dev/fixtures/seed.sh
#
# Creates the users Alice, Bob, Carol, PlatformBot (bot) and Admin (sysop) with the password below. Only run
# this against a throw-away test wiki.
set -u
MW=${MW:?set MW to the path of a throw-away MediaWiki 1.46 install}
FX=${FX:-$(cd "$(dirname "$0")" && pwd)}
cd "$MW"
run() { php -d memory_limit=1G maintenance/run.php "$@" ; }
edit() { # edit <user> <title> <file> <summary> [flags...]
  local user="$1" title="$2" file="$3" summary="$4"; shift 4
  run edit --quiet --user "$user" --summary "$summary" "$@" "$title" < "$file"
}
PASS='PreviewPass!2026'
for u in Alice Bob Carol; do run createAndPromote --force "$u" "$PASS" >/dev/null 2>&1; done
run createAndPromote --force --bot PlatformBot "$PASS" >/dev/null 2>&1
run createAndPromote --force --sysop --bureaucrat Admin "$PASS" >/dev/null 2>&1

T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT

# images
mkdir "$T/img" && cp "$FX"/Goober.png "$FX"/Hub_screenshot.png "$T/img/"
run importImages --user=Admin --comment="Initial upload" --overwrite "$T/img" png >/dev/null 2>&1

# templates & modules (Admin)
edit Admin "Module:Infobox" "$FX/Module_Infobox.lua" "Add Infobox module"
edit Admin "Module:Infobox/styles.css" "$FX/Module_Infobox_styles.css" "Add infobox styles"
edit Admin "Module:Infobox/styles-tokens.css" "$FX/Module_Infobox_styles-tokens.css" "Add token-based infobox styles"
edit Admin "Template:Infobox" "$FX/Template_Infobox.wiki" "Add Infobox"
edit Admin "Template:Infobox person" "$FX/Template_Infobox_person.wiki" "Add Infobox person"
edit Admin "Template:Plainlist" "$FX/Template_Plainlist.wiki" "Add Plainlist"
edit Admin "Template:Plainlist/styles.css" "$FX/Template_Plainlist_styles.css" "Add Plainlist styles"
edit Admin "Template:Nowrap" "$FX/Template_Nowrap.wiki" "Add Nowrap"
edit Admin "Template:URL" "$FX/Template_URL.wiki" "Add URL"
edit Admin "Template:MONTHNAME" "$FX/Template_MONTHNAME.wiki" "Add MONTHNAME"
edit Admin "Template:Birth date and age" "$FX/Template_Birth_date_and_age.wiki" "Add Birth date and age"
edit Admin "Template:Hatnote fixture" "$FX/Template_Hatnote_fixture.wiki" "Add hatnote"
edit Admin "Template:Ambox fixture" "$FX/Template_Ambox_fixture.wiki" "Add ambox"
edit Admin "Template:Navbox fixture" "$FX/Template_Navbox_fixture.wiki" "Add navbox"
edit Admin "Template:Ambox fixture/styles.css" "$FX/Template_Ambox_styles.css" "Add ambox/navbox styles"

# articles by different authors
edit Alice "Main Page" "$FX/Main_Page.wiki" "Build a real main page"
edit Alice "PC Shredder" "$FX/PC_Shredder.wiki" "Create article"
edit Bob "Armor Info" "$FX/Armor_Info.wiki" "Add armour table"
edit Carol "Shredder Hub Invitational" "$FX/Shredder_Hub_Invitational.wiki" "Create article"
edit Carol "Portland, Oregon" "$FX/Portland_Oregon.wiki" "Stub"
edit Alice "Goober" "$FX/Goober.wiki" "Create Goober article with infobox"
edit Alice "Goober (tokens variant)" "$FX/Goober_tokens.wiki" "Token infobox variant"
edit Alice "Goober (no TemplateStyles)" "$FX/Goober_bare.wiki" "Bare infobox variant"
edit Bob "Syntax test" "$FX/Syntax_test.wiki" "Add syntax highlight samples"
edit Admin "Kitchen sink" "$FX/Kitchen_sink.wiki" "Add kitchen sink test"
edit Admin "Stress test" "$FX/Stress_test.wiki" "Add stress test (very wide content)"

# follow-up edits for RC variety: minors, bots, big shrink, small growth
printf '%s\n\n== Added ==\nA new paragraph appended by a bot.\n' "$(cat $FX/PC_Shredder.wiki)" > $T/pcs_bot.txt
edit PlatformBot "PC Shredder" $T/pcs_bot.txt "Bot: append section" --bot
printf '%s\n' "$(cat $FX/Armor_Info.wiki | head -8)" > $T/armor_short.txt
edit Carol "Armor Info" $T/armor_short.txt "Trim the table (large removal)"
printf '%s\nTypo fix.\n' "$(cat $FX/Shredder_Hub_Invitational.wiki)" > $T/hub_minor.txt
edit Bob "Shredder Hub Invitational" $T/hub_minor.txt "Fix typo" --minor
printf 'x' > $T/one.txt
edit Bob "Sandbox" $T/one.txt "Test page"
edit Alice "Sandbox" "$FX/Portland_Oregon.wiki" "Fill sandbox"
edit Carol "Old draft" "$FX/Portland_Oregon.wiki" "Draft to be deleted"
edit Bob "Talk:Goober" "$FX/Portland_Oregon.wiki" "Start talk page"

# moves / deletes / protect / block
printf 'Sandbox|Project sandbox\n' > $T/move.txt
run moveBatch --u=Admin --r="Better title" $T/move.txt >/dev/null 2>&1
printf 'Old draft\n' > $T/del.txt
run deleteBatch -u Admin -r "Abandoned draft" $T/del.txt >/dev/null 2>&1
run protect --user=Admin --reason="Frequent vandalism" --protection=sysop "Main Page" >/dev/null 2>&1
echo seeded
