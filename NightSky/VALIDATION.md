# NightSky 1.2.1 validation

Run on 2026-09-29 against a local test wiki. The results below are for 1.2.1; the 1.1.0 figures were measured on the same wiki the same day. Everything below was run; nothing here is assumed. The scripts and fixture pages are in the `dev` folder of the source repository (`dev/README.md` explains how to repeat any of it).

## Environment

- MediaWiki 1.46.0 (source tree of the official `mediawiki:1.46.0` container image), PHP 8.4.19 built-in server, SQLite.
- Extensions loaded: SyntaxHighlight_GeSHi, Scribunto (standalone Lua), TemplateStyles, ParserFunctions, Cite, WikiEditor, CodeEditor. Skins loaded: NightSky 1.2.1 and a renamed copy of 1.1.0 for comparison (`dev/make-before-copy.sh`; reversing the rename gives back the uploaded files byte for byte).
- Chromium 141.0.7390.37, headless, through Playwright 1.56.1.
- Content: fixture pages that reproduce the reported problems (a Goober article using Wikipedia's Infobox person template with a Lua `Module:Infobox` and TemplateStyles, a bare-infobox variant, syntax highlighting samples (PHP, JavaScript, Lua, CSS, HTML, Python, JSON, Bash, SQL, C++, wikitext, diff, plain text and inline code), a kitchen-sink page, a very wide stress page, a main page with cards) plus edits, a bot edit, a move, a deletion and a protection, so that Recent changes has realistic rows.
- The production wiki, pcshredder.wiki, could not be reached from the build environment, so none of this ran against your real pages.

## Static checks (`dev/check.sh`)

| Check | Result |
| --- | --- |
| `php -l` on `includes/SkinNightSky.php` | no syntax errors |
| `skin.json`, `en.json`, `qqq.json` parse; every message key in `en.json` is documented in `qqq.json` | pass |
| `skin.json` against MediaWiki's `docs/extension.schema.v2.json`, and every file it names exists | 0 problems, 9 paths |
| stylelint (`dev/lint/.stylelintrc.json`) on the four stylesheets | 0 problems |
| eslint (`dev/lint/eslint.config.mjs`) on `navigation.js` and `contrast.js` | 0 problems |
| WCAG contrast of every text token against every surface it is used on (`dev/contrast-tokens.py`, 142 tokens) | 0 failing pairs |

## Contrast of the rendered pages (`dev/scan-all.sh`)

For every visible text node the scanner works out the real text colour and the real background (walking up the ancestors and compositing translucent layers) and reports it when the ratio is below 4.5:1 (3:1 for large text). 43 pages were scanned for each skin: 28 as a visitor and 15 logged in as an administrator (edit, diff, delete, protect and move forms, Preferences, Watchlist, Block, file list, Recent changes with its filter UI, the Lua module in CodeEditor).

| | pages with text below the threshold | text runs below the threshold |
| --- | --- | --- |
| NightSky 1.1.0 | 31 of 43 | 1,799 |
| NightSky 1.2.1 | 0 of 43 | 0 |

The worst pages in 1.1.0: syntax highlighting (985), Special:Version (227), the kitchen-sink page (72), Recent changes when logged in (65), a revision diff (55) and the Goober article (55).

## Layout and behaviour (`dev/check-layout.mjs`)

47 checks, all passing on 1.2.1. The same checks fail 12 times on 1.1.0, which shows they measure the problems that were reported: "Help about MediaWiki" is present, the sidebar is 210px wide with 34px rows, the page stops at 1320px (1061px of article on 1440px and 1920px screens), the infobox background is `rgb(248, 249, 250)`, syntax tokens are at 1.81:1, the night-mode class and the design tokens are missing, Enter in the search box runs a text search, and the wide stress page widens the whole document by 2,024 to 2,620px at 1024px and wider.

What the 47 checks cover:

- No sideways scrolling of the page at 320, 390, 768, 1024, 1100, 1101, 1440 and 1920px on seven pages, and at 390, 768 and 1440px on three logged-in pages (Recent changes, edit, Preferences).
- Columns: the sidebar is left of the article and there is no separate right-hand column. Tools is in the sidebar, below Navigation. The sidebar is at most 200px wide, the article uses at least 80% of a 1440px window (1,198px) and 85% of a 1920px window (1,678px). The sidebar stays on the left at 1024px, the phone layout is one column, and the sidebar moves to the right in a right-to-left language (Arabic interface).
- The search bar is not smaller than in 1.2.0: the input is 190.2 by 34px and the button 190.2 by 31px (both were 189.8px wide). Sidebar links are 31px tall (34px in 1.2.0) and headings 27.4px (30.2px).
- No `#n-help-mediawiki` element, no "Help about MediaWiki" text, no unresolved `⧼message⧽` placeholders, and the Tools links are all there.
- The night-mode class is on `<html>`, the Codex tokens are defined, article text is not black.
- The Goober infobox: 12 labelled rows recognised, at most 22em wide, floated right, narrowest label column 91px, no cell overflows (the long address wraps), dark background, stays inside the article.
- Syntax samples: 14 blocks and 1,288 tokens, every token at least 4.5:1 against its block (worst 6.11:1).
- Enter in the sidebar search opens an exact title; the Search button runs a full-text search.
- Phone: the menu button appears and toggles the sidebar; with JavaScript disabled the navigation stays visible.
- Print: white page, black text, no sidebar.
- The Recent changes filter bar is not a white box. No JavaScript errors and no failed requests on any page visited.

## Preview snapshots (`dev/verify-snapshots.mjs`)

The 26 static snapshots used for the before/after preview of 1.2.0 (13 pages, 2 skins) were opened from disk with the network blocked: no requests, no scripts, no external stylesheets and no broken images in any of them. They were not regenerated for 1.2.1, whose only visual change is the sidebar.

## Found and fixed while testing

The first test rounds of 1.2.0 found problems in that release's own changes and in rules it had to override, and they were fixed before the runs above: the Tools labels showing `⧼0⧽` (a re-indexed sidebar array, in `buildSidebar()`), sort arrows tiling in sortable table headers (a `background` shorthand), light navbox and ambox templates winning over the dark rules (selector specificity), unreadable text in cells with an inline light background (now handled by `contrast.js`), a white unchecked checkbox, low-contrast disabled buttons, a light search-suggestion drop-down, wide content stretching the page, and the level-1 heading double rule. The ACE code editor's comment, keyword and gutter colours were lifted last (37 low-contrast runs on the Lua module edit page in 1.1.0, 87 before this fix, 0 now).

## Not tested

- VisualEditor, Echo, DiscussionTools, MobileFrontend and any other extension that is not in the list above. The skin turns on their dark styles by setting the night-mode class, but they were not run.
- Firefox, Safari and real phones or tablets. Only Chromium was used; the phone results are Chromium at 320 to 390px.
- Your live wiki: its pages, `MediaWiki:Sidebar`, `MediaWiki:Common.css` and `MediaWiki:NightSky.css`, MariaDB, PHP 8.3, opcode or APCu caching and any CDN in front of it.
- Hover, focus and active colours (the scanner reads the resting state), and text drawn over images. Gradients are approximated by their first colour.
- Screen readers. The landmark structure was corrected by reading the markup, not by listening to it.
- All writes and accounts were in the throw-away test wiki. Nothing was changed on pcshredder.wiki.
