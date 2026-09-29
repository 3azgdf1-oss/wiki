# NightSky

A standalone MediaWiki skin adapted from your pasted CSS: matte black panels, violet accents, monospaced navigation and a left sidebar. Version 1.1.0 targets MediaWiki 1.46 using the namespaced SkinMustache API and ResourceLoader. See UPGRADE.md when replacing version 1.0.0.

## Install

1. Extract this archive so the manifest is at `YOUR_WIKI/skins/NightSky/skin.json` (avoid a second nested NightSky directory).
2. Add to `LocalSettings.php`:

```php
wfLoadSkin( 'NightSky' );
```

3. Preview on an existing article by adding `?useskin=nightsky` to its URL, or `&useskin=nightsky` if it already contains a query string. You can also choose NightSky in Special:Preferences → Appearance.
4. To make it the default, add:

```php
$wgDefaultSkin = 'nightsky';
```

Requires access to your server's skins directory and LocalSettings.php. This package is not intended to be pasted into MediaWiki:Common.css. Hosted wiki services that prohibit custom skin installation need a CSS adaptation for their existing skin instead.

## Configure

- Site name: your existing `$wgSitename` configuration; the displayed brand uses the standard `sitetitle` message.
- Logo: your existing `$wgLogos['icon']`, falling back to `$wgLogos['1x']`. The skin renders the wiki name beneath it. Example: `$wgLogos['icon'] = "$wgScriptPath/images/my-logo.png";` with an existing image URL.
- Sidebar links and groups: edit `MediaWiki:Sidebar` using normal MediaWiki sidebar syntax.
- Colors, spacing and fonts: edit the variables at the beginning of `resources/design.css`. Native MediaWiki adaptations are in `resources/mediawiki.css`.
- Custom per-wiki overrides: `MediaWiki:NightSky.css`.
- Fonts: system fonts work without third-party requests. The supplied Google Fonts import was intentionally omitted from ResourceLoader CSS. To opt in, place the following at the very top of `MediaWiki:NightSky.css` (subject to your wiki's CSP), or self-host those fonts and declare `@font-face` there:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
```

## Content

Normal wikitext works without rewriting articles. Search, article/discussion tabs, edit/history/actions, user tools, sidebar, languages, indicators, notices, category links and footer data come from MediaWiki. Native tables, thumbnails, TOC and source editing have matching styles. Templates preserve the core page hooks and content IDs. Desktop navigation works without JavaScript. Mobile navigation collapses when JavaScript is available and remains expanded otherwise; extension behavior still depends on each installed extension.

The original `.card-grid`, `.card`, `.wiki-block`, `.wiki-lead`, `.callout`, `.infobox`, `.wiki-gallery`, `.wiki-table`, `.hub-category` and other complete component styles are retained. Optional markup example in `examples/MainPage.wikitext`. These styles do not create templates, pages or video-loading behavior by themselves.

## What changed from the pasted CSS

- Removed the final truncated `.hub-category:hover::before` rule (the supplied file literally ends with `tr... (27 KB left)`). Unprovided content could not be recovered.
- Scoped styles to this skin and replaced the universal margin/padding reset with MediaWiki normalization.
- Wired the shell to MediaWiki-generated data and search markup.
- Added native wiki styling, visible focus, mobile layout, print output and comprehensive reduced-motion support. The logo is static by default.
- Omitted external font loading by default.

## Validation and limitations

The package is structurally checked against MediaWiki 1.46's extension/skin schema, CSS parsed for syntax errors, and Mustache templates rendered with representative fixture data for browser layout checks. `../NightSky-preview.html` is a static visual preview with illustrative content; its links and search are not connected to a wiki.

See VALIDATION.md for checks performed against an isolated MediaWiki 1.46.0 installation with PHP 8.3.33. The production wiki uses MariaDB; the local test wiki uses SQLite. VisualEditor and extension-specific dialogs have not been integration-tested (the inspected live wiki has no extensions installed).

References: https://www.mediawiki.org/wiki/Manual:How_to_make_a_MediaWiki_skin and MediaWiki 1.46 source (https://github.com/wikimedia/mediawiki/tree/REL1_46/includes/Skin).
