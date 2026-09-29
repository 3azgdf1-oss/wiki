# Upgrade to NightSky 1.2.0 (MediaWiki 1.46)

1. Back up your existing `skins/NightSky` folder, especially any manual CSS or template edits.
2. Delete the old `skins/NightSky` folder and copy the `NightSky` folder from this ZIP into your wiki's `skins` directory. Replacing files one by one leaves stale files behind: 1.2.0 adds `includes/`, `resources/tokens.css`, `resources/content.css` and `resources/contrast.js`. Do not place the new folder inside the old one, and do not copy the `dev` folder to the server; it holds test tooling only.
3. Keep the existing `wfLoadSkin( 'NightSky' );` and `$wgDefaultSkin = 'nightsky';` settings. No database migration is needed.
4. Open `Special:Version` and confirm **NightSky 1.2.0**.
5. If the old version or old styling still appears, restart your PHP-FPM service or container to clear its opcode and APCu caches (1.2.0 registers a new PHP class), then hard-refresh your browser. The exact restart command depends on your hosting setup.

## What you will notice

- The **Tools** box is now a column on the right of the page, and the article uses all the width between the two columns.
- **"Help about MediaWiki"** is gone from Navigation. It is hidden by its item id (`n-help-mediawiki`). A help link you add to `MediaWiki:Sidebar` under another label, for example `** Help:Contents|Help`, is not affected.
- If `MediaWiki:Sidebar` has no `TOOLBOX` entry, there is no Tools box and the page uses two columns.
- Recent changes, Special:Version, forms, buttons, message boxes, the source editor and imported Wikipedia templates are readable on the dark background. Syntax-highlighted code uses the extension's night palette.

## Review your wiki-side CSS

`MediaWiki:NightSky.css` and `MediaWiki:Common.css` load after the skin. Workarounds written for 1.1.0 (forcing infobox colours, re-colouring Recent changes, fixing `pre` colours, hiding the Help link) are no longer needed and may fight the new rules. Remove them one at a time and check the page.

The colours now come from CSS custom properties. To change the palette, edit the variables at the top of `resources/design.css`, or override the same variables in `MediaWiki:NightSky.css`. `resources/tokens.css` is written in terms of them, so core, OOUI, Codex and imported templates follow:

```css
:root {
	--bg-content: #0b0b10;   /* article surface */
	--text-main: #dcdce2;    /* body text */
	--layout-max: 1600px;    /* cap the page width again (default: none) */
}
```

Text that sets only a light background (a pasted table cell, for example) is corrected by `resources/contrast.js`. Give a block the class `notheme` to leave it alone.

## Roll back

Put the backed-up 1.1.0 folder back in `skins/NightSky`, restart PHP-FPM, hard-refresh. Nothing is stored in the database.

Deploying the ZIP requires server filesystem access. Changing a wiki page or Common.css cannot install a skin.
