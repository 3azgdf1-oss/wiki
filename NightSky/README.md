# NightSky

A standalone MediaWiki skin adapted from your pasted CSS: matte black panels, violet accents, monospaced navigation, a left sidebar and a right-hand Tools column. Version 1.2.0 targets MediaWiki 1.46 using the namespaced SkinMustache API and ResourceLoader. See `UPGRADE.md` when replacing 1.1.0 and `CHANGELOG.md` for everything that changed.

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

## Layout

- **Left column:** logo and wiki name, search, and the groups from `MediaWiki:Sidebar` (Navigation and so on), then your account and personal tools.
- **Centre:** page tabs, then the article, which uses all the width between the two side columns.
- **Right column:** the Tools box (What links here, Special pages, Printable version ...). It stays in view while you scroll on wide screens, moves under the article below 1100px, and stacks everything in one column on phones.
- The stock "Help about MediaWiki" sidebar link is not shown. Remove it for good by deleting that line from `MediaWiki:Sidebar`.
- The small "Help" links that core adds at the top right of some special pages and forms (Recent changes, for example) are still shown, because they are part of those pages. To hide them as well, add `.mw-helplink { display: none; }` to `MediaWiki:NightSky.css`.

## Configure

- Site name: your existing `$wgSitename` configuration; the displayed brand uses the standard `sitetitle` message.
- Logo: your existing `$wgLogos['icon']`, falling back to `$wgLogos['1x']`. The skin renders the wiki name beneath it. Example: `$wgLogos['icon'] = "$wgScriptPath/images/my-logo.png";` with an existing image URL.
- Sidebar links and groups: edit `MediaWiki:Sidebar` using normal MediaWiki sidebar syntax. A `TOOLBOX` entry produces the right-hand Tools column.
- Colours, spacing, page width and fonts: edit the variables at the beginning of `resources/design.css`. `resources/tokens.css` maps them onto the Wikimedia design tokens that core, OOUI, Codex and extensions use, so a palette change reaches all of them. Native MediaWiki adaptations are in `resources/mediawiki.css`; styles for content that comes from templates (infobox, navbox, code) are in `resources/content.css`.
- Custom per-wiki overrides: `MediaWiki:NightSky.css`, for example `:root { --layout-max: 1600px; }` to cap the page width.
- Fonts: system fonts work without third-party requests. The supplied Google Fonts import was intentionally omitted from ResourceLoader CSS. To opt in, place the following at the very top of `MediaWiki:NightSky.css` (subject to your wiki's CSP), or self-host those fonts and declare `@font-face` there:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
```

## Content

Normal wikitext works without rewriting articles. Search, article/discussion tabs, edit/history/actions, user tools, sidebar, languages, indicators, notices, category links and footer data come from MediaWiki. Native tables, thumbnails, TOC and source editing have matching styles. Templates preserve the core page hooks and content IDs. Desktop navigation works without JavaScript. Mobile navigation collapses when JavaScript is available and remains expanded otherwise; extension behavior still depends on each installed extension.

Wikipedia templates copied to your wiki work as they are. `resources/content.css` styles Infobox (`table.infobox` with `infobox-label` and `infobox-data`, including Infobox person), navbox, ambox, hatnote, hlist and plainlist markup so the template's own light colours do not show through. SyntaxHighlight and the other extensions that ship a dark palette switch to it because the skin marks the page as a night-mode skin. If some pasted content sets only a light background (a table cell with `style="background:#ffdead"`, say), `resources/contrast.js` gives that text a readable colour; put the class `notheme` on a block to leave it untouched.

The original `.card-grid`, `.card`, `.wiki-block`, `.wiki-lead`, `.callout`, `.wiki-gallery`, `.wiki-table`, `.hub-category` and other complete component styles are retained, and `.infobox` now styles both the hand-made `div` form and Wikipedia's table. Optional markup example in `examples/MainPage.wikitext`. These styles do not create templates, pages or video-loading behavior by themselves. A card's closing link gets the arrow call-to-action; give any other link inside a card the class `card-link` to get it too. MediaWiki builds a table of contents inside the first card when a Main Page uses headings, so the contents box is hidden there; add `__NOTOC__` to other pages that do not want one.

## What changed from the pasted CSS

- Removed the final truncated `.hub-category:hover::before` rule (the supplied file literally ends with `tr... (27 KB left)`). Unprovided content could not be recovered.
- Scoped styles to this skin and replaced the universal margin/padding reset with MediaWiki normalization.
- Wired the shell to MediaWiki-generated data and search markup.
- Added native wiki styling, visible focus, mobile layout, print output and comprehensive reduced-motion support. The logo is static by default.
- Omitted external font loading by default.

## Validation and limitations

See `VALIDATION.md` for the checks that were run against a real MediaWiki 1.46.0 installation with SyntaxHighlight, TemplateStyles, Scribunto, ParserFunctions, Cite, WikiEditor and CodeEditor, and for what was not tested. The test wiki uses SQLite; the production wiki uses MariaDB. VisualEditor, Echo and DiscussionTools were not integration-tested.

The `dev` folder in the source repository holds the scripts and fixtures used for testing. It is not part of the installable skin.

References: https://www.mediawiki.org/wiki/Manual:How_to_make_a_MediaWiki_skin and MediaWiki 1.46 source (https://github.com/wikimedia/mediawiki/tree/REL1_46/includes/Skin).
