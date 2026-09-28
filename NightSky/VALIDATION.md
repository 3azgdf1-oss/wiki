# NightSky 1.1.0 validation

Environment: isolated MediaWiki 1.46.0, PHP 8.3.33, SQLite, Chromium. Development warnings and PHP E_ALL were enabled. The live test.pcshredder.wiki installation was inspected read-only and reports MediaWiki 1.46.0 / PHP 8.3.33 / MariaDB.

Passed:
- Manifest validation against MediaWiki 1.46 extension/skin schema (upstream comment-only metadata removed for the JSON Schema validator).
- Resource file existence, CSS syntax, JavaScript syntax, Mustache partials and unique IDs in a rendered fixture.
- Actual MediaWiki article, login, account-creation form, search, source-editor form, history, revision diff, Special:Version, RecentChanges and Arabic UI requests: expected content and no PHP warnings/deprecations/fatal errors in the response.
- Local test account login, two local test article revisions, and logged-in account tools.
- ResourceLoader compilation/delivery for both skin CSS and JavaScript.
- Browser inspection of the corrected editor warning: legible text and links; normal 14px source text.
- Browser interaction: expanding mobile navigation, submitting search and receiving the expected article result, keyboard skip-to-content focus.
- Browser inspection at 390px and 320px: no document horizontal overflow; the navigation collapses after script initialization.
- Correct page/discussion menu label and no browser warnings/errors in the final inspected page.

Scope and limits:
- All writes, account operations and test revisions took place only in the isolated local test wiki.
- The public live site has NOT been modified. Uploading the replacement skin requires server access.
- The uploaded screenshot's warning was reproduced by inspecting the old live skin and resolved in the local 1.46 installation by updating the actual skin APIs, without suppressing warnings.
- This does not certify every MediaWiki extension, browser or page template. No extensions are installed on the inspected public wiki. VisualEditor, third-party gadgets, email delivery, production authentication, MariaDB-specific behavior and image upload processing were not tested.
- The original paste was truncated; absent styles could not be recovered.
