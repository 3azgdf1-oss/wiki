# dev: test tooling for the NightSky skin

Everything here is for developing and checking the skin. None of it is installed on a wiki, and none of it is in the skin ZIP.

| File | What it does |
| --- | --- |
| `check.sh` | Static checks: PHP syntax, JSON, i18n docs, manifest schema, stylelint, eslint, colour-token contrast. No wiki needed. |
| `contrast-tokens.py` | WCAG contrast of every colour token in `tokens.css` against the surfaces it is drawn on. |
| `validate-manifest.py` | Validates `skin.json` against MediaWiki's `extension.schema.v2.json` and checks the files it names exist. |
| `scan-contrast.mjs` | Measures the real contrast of every visible text node on the given pages. |
| `scan-all.sh` | Runs the scanner over 43 pages for the skin under test and the 1.1.0 copy, and prints a summary. |
| `check-layout.mjs` | 47 layout and behaviour checks: columns, widths, search-bar size, no sideways scroll, infobox, syntax colours, search, mobile menu, print, right-to-left. |
| `export-static.mjs` | Saves every preview page as one self-contained HTML file (inline CSS and images, no scripts). |
| `verify-snapshots.mjs` | Confirms the snapshots load from disk with the network blocked. |
| `screenshots.mjs` | Full-page JPEG screenshots at 1440px and 390px. |
| `preview-viewer.html`, `build-preview.py` | The before/after viewer and a script that assembles it with the snapshots into a folder you can host. |
| `probe.mjs` | Evaluates JavaScript expressions in a page: `node probe.mjs URL "getComputedStyle(document.body).color"`. |
| `preview-pages.json` | The pages used by the export and screenshot scripts. |
| `fixtures/` | The wikitext, Lua module, TemplateStyles CSS and images for the sample pages, and `seed.sh` to load them. |
| `LocalSettings.preview.php` | The settings the test wiki uses. |
| `make-before-copy.sh` | Turns an unzipped 1.1.0 into a renamed `NightSkyOld` skin so both versions can run side by side. |
| `lint/` | The stylelint and eslint configuration used by `check.sh`. |

## Static checks

```bash
npm i -g stylelint eslint          # once
pip install jsonschema             # once
MW=/path/to/mediawiki dev/check.sh
```

`MW` is only used to find MediaWiki's manifest schema; without it that step is skipped.

## A test wiki

Use a throw-away install. Nothing here should be pointed at a production wiki.

1. Get a MediaWiki 1.46 source tree with its bundled extensions, install it with SQLite (`php maintenance/run.php install ...`), and start it:

   ```bash
   cd /path/to/mediawiki
   php -d memory_limit=512M -S 0.0.0.0:8080 -t . router.php
   ```

   `router.php` is MediaWiki's development router. Set `PHP_CLI_SERVER_WORKERS=6` to let it serve requests in parallel.
2. Link the skin and the 1.1.0 copy into `skins/`:

   ```bash
   ln -s /path/to/repo/NightSky /path/to/mediawiki/skins/NightSky
   dev/make-before-copy.sh /path/to/unzipped/NightSky-1.1.0/NightSky /path/to/mediawiki/skins/NightSkyOld
   ```
3. Append `dev/LocalSettings.preview.php` (without its opening `<?php` line) to the wiki's `LocalSettings.php`, and set `$wgServer` to `http://localhost:8080`.
4. Load the fixtures: `MW=/path/to/mediawiki dev/fixtures/seed.sh`. It creates the users Alice, Bob, Carol, PlatformBot and Admin with the password `PreviewPass!2026`, which the scripts below use by default.

Compare any page under both skins with `?useskin=nightskyold` and `?useskin=nightsky`.

## Running the checks

The browser scripts use Playwright and Chromium, and read `NODE_PATH` to find the `playwright` package:

```bash
export NODE_PATH=$(npm root -g)                         # after `npm i -g playwright && npx playwright install chromium`
node dev/check-layout.mjs                               # exit status 1 if any check fails
node dev/check-layout.mjs --skin nightskyold            # the same suite on 1.1.0: 12 failures expected
dev/scan-all.sh                                         # contrast of 43 pages, both skins
node dev/scan-contrast.mjs --pages "Goober,Special:Version" --verbose 1   # a few pages, with detail
```

`scan-contrast.mjs` takes `--user Admin` to log in first, `--width 1440`, `--min 4.5` and `--json out.json`. It reads the resting state of each element, so hover and focus colours are not covered, and a gradient background is approximated by its first colour stop.

## The before/after preview

```bash
node dev/export-static.mjs --out build/site             # one HTML file per page and skin
node dev/verify-snapshots.mjs build/site                # check they are self-contained
node dev/screenshots.mjs --out build/shots --only main,goober,goober-bare,syntax,kitchen,rc,edit,prefs
python3 dev/build-preview.py build/site build/shots build/preview
python3 -m http.server -d build/preview 8000
```

The snapshots are the DOM after JavaScript ran (so Recent changes shows its filter bar), with every stylesheet inlined, every image inlined as a `data:` URI, scripts removed and internal links rewritten to the sibling snapshots. `screenshots.mjs` captures through a window as tall as the page, because the skin paints its background with `background-attachment: fixed`, which a plain full-page capture only draws for the first screen.

## Changing the colours

Edit the palette at the top of `NightSky/resources/design.css`, then run `python3 dev/contrast-tokens.py`. It exits with status 1 if any text token drops below its minimum against a surface it is used on.
