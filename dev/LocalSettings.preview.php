<?php
/**
 * Settings appended to the LocalSettings.php of a throw-away MediaWiki 1.46 test install, to reproduce the
 * before/after comparison. Not part of the skin, and not for a production wiki.
 *
 * Assumes the wiki is served at http://localhost:8080 with `php -S 0.0.0.0:8080 -t . router.php` from the
 * MediaWiki directory, and that skins/NightSky is a copy or symlink of this repository's NightSky folder
 * (see dev/README.md).
 */

// Pretty URLs like https://pcshredder.wiki/Main_Page
$wgArticlePath = "/$1";
$wgUsePathInfo = true;

// The skin under test, and the untouched 1.1.0 copy for comparison (dev/make-before-copy.sh)
wfLoadSkin( 'NightSky' );
wfLoadSkin( 'NightSkyOld' );
$wgDefaultSkin = 'nightsky';
$wgAllowUserSkin = true;

// The extensions the fixture pages need. All of them ship in the MediaWiki tarball.
wfLoadExtension( 'SyntaxHighlight_GeSHi' );
wfLoadExtension( 'Scribunto' );
wfLoadExtension( 'TemplateStyles' );
wfLoadExtension( 'ParserFunctions' );
wfLoadExtension( 'Cite' );
wfLoadExtension( 'WikiEditor' );
wfLoadExtension( 'CodeEditor' );
$wgScribuntoDefaultEngine = 'luastandalone';
$wgPFEnableStringFunctions = true;
$wgTemplateStylesNamespaces = [ NS_TEMPLATE => true, 828 => true ]; // Template: and Module:
$wgDefaultUserOptions['usebetatoolbar'] = 1;

// Uploads and thumbnails, so figures render like they do on a real wiki
$wgEnableUploads = true;
$wgUseImageMagick = false;
$wgGenerateThumbnailOnParse = true;

// Diagnostics: surface skin PHP problems instead of hiding them
$wgShowExceptionDetails = true;
$wgShowDBErrorBacktrace = true;
$wgDevelopmentWarnings = true;
error_reporting( E_ALL & ~E_DEPRECATED );
ini_set( 'display_errors', '1' );

// Always serve fresh assets and pages while iterating on the skin
$wgResourceLoaderMaxage = [ 'versioned' => 1, 'unversioned' => 1 ];
$wgCachePages = false;
$wgParserCacheType = CACHE_NONE;
$wgMainCacheType = CACHE_NONE;
$wgRCMaxAge = 90 * 86400;
$wgGroupPermissions['*']['createaccount'] = true;
