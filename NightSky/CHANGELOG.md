# Changelog

## 1.2.1

Layout adjustments requested after 1.2.0 was installed. The install steps are the same as for 1.2.0 (see `UPGRADE.md`).

- **Tools is back in the left sidebar**, between Navigation and Your account, as it was in 1.1.0. The separate right-hand Tools column that 1.2.0 added is removed: the `getTemplateData()` override in `includes/SkinNightSky.php`, the `data-portlet-tools` block in `templates/skin.mustache`, the `.wiki-tools-column` styles and the `toolbox` message.
- **Slimmer sidebar.** The column is 200px wide instead of 210px (`--sidebar-width` in `resources/design.css`), link rows are 31px instead of 34px, and section headings are about 3px shorter. The search input and button are not smaller: they are still 190px wide (input 34px, button 31px tall), because the search block's side padding shrank by the same 10px.
- The article uses all the width to the right of the sidebar (about 83% of a 1440px window).
- `UPGRADE.md` now explains the `filemtime(): stat failed for .../skins/NightSky/skin.json` error, which means the skin folder is in the wrong place or unreadable by the web server.
- The checks in `dev/check-layout.mjs` follow the new layout and now also assert that the search bar is not smaller than before.

## 1.2.0

Requires MediaWiki 1.46 or newer, like 1.1.0. See `UPGRADE.md` before replacing 1.1.0.

### Requested changes

- **"Help about MediaWiki" is removed** from the Navigation menu. It is filtered out in PHP (`SkinNightSky::buildSidebar`, sidebar item id `n-help-mediawiki`), with a CSS fallback in `resources/mediawiki.css`. A link you add yourself under a different label is not affected.
- **Tools moved to the other side.** The "Tools" portlet was lifted out of the left sidebar into its own right-hand column. Reverted in 1.2.1: Tools is in the left sidebar again.
- **The article fills the page width.** The 1320px cap on the whole page is gone (`--layout-max: none`); the article column is `minmax(0, 1fr)` between the two side columns.
- **Infobox person (the Goober page).** Wikipedia's infobox renders `table.infobox` with `infobox-label` / `infobox-data` cells. The skin only styled a different, hand-made `div.infobox`, so the real table was squeezed into a fixed 265px box, its own light TemplateStyles colours showed through under light text, and the label column shrank to a letter per line. `resources/content.css` now styles the real markup (both the table and the old div form), and long words and addresses wrap inside their own cell.
- **Syntax highlighter unreadable.** SyntaxHighlight ships a night palette that only applies under `html.skin-theme-clientpref-night`. The skin never set that class, so colours made for a white page were drawn on black. The class is now set (`SkinNightSky::getHtmlElementAttributes`) and code blocks have explicit text and surface colours.
- **Recent changes and other white-box / black-on-black pages.** See finding 5 below: the skin defined none of the Wikimedia design tokens that core, OOUI, Codex and extensions use for their colours.

### Findings from the audit of 1.1.0 (all fixed)

Layout and width

1. "Help about MediaWiki" sat in the Navigation menu (see above).
2. Tools lived in the left sidebar (moved to its own column in 1.2.0, back in the sidebar in 1.2.1).
3. The whole page was capped at 1320px, leaving empty margins on wide screens.
4. Wide tables, code blocks and images only scrolled sideways on phones. `#bodyContent` now scrolls horizontally at every width, so a wide table can no longer stretch the page.

Unreadable colours

5. **No design tokens.** Core, OOUI, Codex and extensions colour themselves with `var( --background-color-base, #fff )`: a custom property with a light fallback. 1.1.0 defined none of those properties, so each such box fell back to white while the skin forced light text on it (the white-box, grey-text look on Recent changes, forms, buttons and message boxes). `resources/tokens.css` now defines all 142 colour tokens from the Codex vocabulary; `dev/contrast-tokens.py` checks every text/surface pair (0 failing pairs).
6. **Dead LESS file.** `resources/mediawiki.less/mediawiki.skin.variables.less` shipped but was never registered, so MediaWiki ignored it. `skin.json` now registers it with `SkinLessImportPaths`, and the file imports the Codex theme before overriding link colours.
7. **No night-mode flag.** SyntaxHighlight, RCFilters, CodeEditor, Echo, VisualEditor and DiscussionTools switch to dark styles under `html.skin-theme-clientpref-night`. The class is now added to `<html>`.
8. **Syntax highlighter** (see above).
9. **Widgets forced to a light theme.** `.oo-ui-window`, `.oo-ui-menuSelectWidget` and `.suggestions` were pinned to `color-scheme: light` with dark text. They now follow the dark surfaces, including the search suggestion drop-down.
10. **Invisible icons.** OOUI draws its icons as dark SVG background images that no token can recolour. They are inverted for dark surfaces (except a checkbox's tick, which shares its element with the box).
11. **Controls.** Disabled buttons were 1.2:1, unchecked checkboxes and radios were bright white, and the sign-up page's benefit headings are hard-coded `color: #000`. All three are overridden.
12. **Imported Wikipedia templates** (navbox, ambox, hatnote, sortable tables, infobox) hard-code light backgrounds. The dark rules in `content.css` are prefixed with `body.skin-nightsky` so they win over TemplateStyles, and `resources/contrast.js` gives the text of any remaining light cell a readable colour (skip a block with the class `notheme`).
13. **Special-page tables.** Version, Statistics, group rights and similar pages use the `wikitable` class outside the article body. 1.1.0 only styled it inside `.mw-parser-output`, so those tables kept core's light background under light text. The rule is global now.

Content markup

14. **Infobox** (see above).
15. **Word wrapping.** Long words and web addresses wrap inside their own cell without collapsing a label column, and Recent changes no longer splits ordinary words mid-letter (core sets `word-break: break-all` on those cells, T331086).
16. **Headings.** Level-1 headings inside articles were underlined twice (once by the `.mw-heading` wrapper, once by `h1`). Now once.
17. **Main Page.** MediaWiki generated a table of contents inside the first card, and `.card a` turned every link in a card into an arrow call-to-action. The contents box is hidden on the Main Page and inside cards (add `__NOTOC__` elsewhere), and only a card's closing link, or a link with the class `card-link`, gets the arrow.
18. **Article links.** Underlines apply to real links, not red links or images, and red links keep their colour once visited.

Templates, PHP and manifest

19. **Extension content dropped.** None of the six portlet templates printed `html-before-portal`, where extensions insert their own markup.
20. **Footer.** The template skipped the footer's "info" list, where extensions add their own lines, and dropped every list's class name (including `noprint` on the badges). It now renders info, places and icons.
21. **Search.** The only submit button was named `fulltext`, so pressing Enter always ran a text search and never jumped to an exact title. A hidden `go` button now comes first.
22. **Landmarks.** `role="banner"` inside an `<aside>` and `role="navigation"` around nested `<nav>` elements created extra, nested regions for screen readers.
23. **Manifest.** The plain `SkinMustache` class became `MediaWiki\Skins\NightSky\SkinNightSky` (autoloaded from `includes/`), the obsolete `targets` key was removed, and the core style features the CSS relies on are enabled (`accessibility`, `interface-core`, `interface-indicators`, `interface-edit-section-links`, `interface-user-message`, `i18n-ordered-lists`, `i18n-headings`).

CSS hygiene

24. **Repeated rules.** The page shell, content box, footer and background layers were each defined two or three times with different values, so the last copy silently overrode the first. They are merged, and stylelint reports no problems.
25. **Element selectors.** `footer { ... }` restyled any `<footer>` inside an article or extension output. It is `#footer` now.

Packaging and docs

26. **Duplicate folder.** The 1.1.0 zip contained a second, older copy of the skin in `NightSky/NightSky/`. 1.2.0 ships one folder.
27. **README** pointed to a preview file (`../NightSky-preview.html`) that is not in the package. Removed.
28. **Test coverage.** 1.1.0 was validated against a wiki with no extensions installed, so the styling of SyntaxHighlight, TemplateStyles and the Recent changes filters was never exercised. See `VALIDATION.md` for what 1.2.0 was tested with.

### Added

- `includes/SkinNightSky.php`: the skin class (sidebar filter, night-mode flag).
- `resources/tokens.css`: the Codex colour tokens mapped onto the NightSky palette.
- `resources/content.css`: Wikipedia-compatible infobox, navbox, ambox, hatnote, hlist/plainlist, code and syntax-highlight styles.
- `resources/contrast.js`: the contrast guard described in finding 12.
- `dev/`: the scripts and fixtures used to test this release (see `dev/README.md`). They are not part of the installable skin.

### Changed

- The palette still lives in the variables at the top of `resources/design.css`; `tokens.css` follows them.
- Article links: red links stay red once visited; external links use the link colour.
- Print output is still plain black on white.

## 1.1.0

The version uploaded for this work. See `UPGRADE.md` in that release for its changes over 1.0.0.
