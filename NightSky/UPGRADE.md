# Upgrade to NightSky 1.2.1 (MediaWiki 1.46)

This works the same from 1.1.0 or from 1.2.0.

1. Back up your existing `skins/NightSky` folder, especially any manual CSS or template edits.
2. Delete the old `skins/NightSky` folder and copy the `NightSky` folder from this ZIP into your wiki's `skins` directory. Replacing files one by one leaves stale files behind: 1.2.x adds `includes/`, `resources/tokens.css`, `resources/content.css` and `resources/contrast.js`. Do not place the new folder inside the old one.
3. Check that the manifest is exactly at `skins/NightSky/skin.json` (for example `ls -l /var/www/html/skins/NightSky/skin.json`).
4. Keep the existing `wfLoadSkin( 'NightSky' );` and `$wgDefaultSkin = 'nightsky';` settings. No database migration is needed.
5. Open `Special:Version` and confirm **NightSky 1.2.1**.
6. If the old version or old styling still appears, restart your PHP-FPM service or container to clear its opcode and APCu caches (1.2.x registers a PHP class), then hard-refresh your browser. The exact restart command depends on your hosting setup.

## What you will notice

- The **Tools** box is in the left sidebar, between Navigation and Your account, as in 1.1.0. (1.2.0 had it in a column on the right.)
- The sidebar is slightly slimmer: 200px wide instead of 210px, with shorter rows. The search box is not smaller.
- The article uses all the width to the right of the sidebar.
- **"Help about MediaWiki"** is gone from Navigation. It is hidden by its item id (`n-help-mediawiki`). A help link you add to `MediaWiki:Sidebar` under another label, for example `** Help:Contents|Help`, is not affected.
- Recent changes, Special:Version, forms, buttons, message boxes, the source editor and imported Wikipedia templates are readable on the dark background. Syntax-highlighted code uses the extension's night palette.

## If MediaWiki says it cannot load the skin

An error such as

```
MediaWiki is unable to load the skin NightSky ...
Error reading `/var/www/html/skins/NightSky/skin.json`. filemtime(): stat failed for /var/www/html/skins/NightSky/skin.json.
```

means MediaWiki cannot see that exact file. It is not a problem inside the skin. Run these on the server (in a container, inside it):

```bash
ls -l /var/www/html/skins/NightSky/skin.json
ls /var/www/html/skins
```

- **"No such file or directory".** The folder is in the wrong place or has the wrong name. Usual causes: the ZIP was extracted into `skins/NightSky/`, which leaves `skins/NightSky/NightSky/skin.json`; the folder is called `NightSky-1.2.1`; or the name is spelled differently (Linux is case-sensitive, and it must match `wfLoadSkin( 'NightSky' )`). Move things so that `skin.json` sits directly in `skins/NightSky/`.
- **"Permission denied", or the file is listed but the error stays.** The web server user must be able to read the folder and its files. On the official Docker image:

  ```bash
  chown -R www-data:www-data /var/www/html/skins/NightSky
  chmod -R u=rwX,go=rX /var/www/html/skins/NightSky
  ```
- **The skin is not there at all.** Copy the `NightSky` folder into `skins/` (step 2 above), or remove `wfLoadSkin( 'NightSky' );` from `LocalSettings.php` until you have.

## Review your wiki-side CSS

`MediaWiki:NightSky.css` and `MediaWiki:Common.css` load after the skin. Workarounds written for 1.1.0 (forcing infobox colours, re-colouring Recent changes, fixing `pre` colours, hiding the Help link) are no longer needed and may fight the new rules. Remove them one at a time and check the page.

The colours now come from CSS custom properties. To change the palette, edit the variables at the top of `resources/design.css`, or override the same variables in `MediaWiki:NightSky.css`. `resources/tokens.css` is written in terms of them, so core, OOUI, Codex and imported templates follow:

```css
:root {
	--bg-content: #0b0b10;   /* article surface */
	--text-main: #dcdce2;    /* body text */
	--layout-max: 1600px;    /* cap the page width again (default: none) */
	--sidebar-width: 200px;  /* sidebar width; the search box is about 10px narrower than this */
}
```

Text that sets only a light background (a pasted table cell, for example) is corrected by `resources/contrast.js`. Give a block the class `notheme` to leave it alone.

## Roll back

Put the backed-up folder back in `skins/NightSky`, restart PHP-FPM, hard-refresh. Nothing is stored in the database.

Deploying the ZIP requires server filesystem access. Changing a wiki page or Common.css cannot install a skin.
