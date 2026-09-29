# Upgrade to NightSky 1.1.0 (MediaWiki 1.46)

1. Back up your existing `skins/NightSky` folder, especially any manual CSS/template edits.
2. Copy the entire `NightSky` folder from this ZIP into your wiki's `skins` directory, replacing the matching skin files. Do not place it inside the old NightSky folder.
3. Keep the existing `wfLoadSkin( 'NightSky' );` and `$wgDefaultSkin = 'nightsky';` settings. No database migration is needed.
4. Open `Special:Version` and confirm **NightSky 1.1.0**. The namespace/personal-menu deprecation warning should disappear.
5. If the old version still appears, restart your PHP-FPM service/container to clear its opcode cache, then hard-refresh your browser. The exact restart command depends on your hosting setup.

This release explicitly declares supported menus, replaces `namespaces` with `associated-pages` in both the manifest and template, uses the namespaced SkinMustache class, and removes a deprecated ResourceLoader message-box feature. It fixes the warning at its source; it does not suppress PHP errors.

Other fixes: readable warning/error/success links, search results and diff colors; source editor font size; narrow-screen table scrolling; accessible mobile navigation toggle; and hiding only MediaWiki's default change-your-logo image. Your own configured logo remains supported; until one is configured, the wiki name serves as the brand.

Deploying the ZIP requires server filesystem access. Changing a wiki page or Common.css cannot fix this PHP deprecation. This package has not been uploaded to your server by Codex.
