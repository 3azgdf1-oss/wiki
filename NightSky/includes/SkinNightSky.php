<?php
/**
 * NightSky skin class.
 *
 * The skin is still rendered by the Mustache templates in /templates. This class only does two
 * small things that a template cannot do by itself:
 *
 *  1. Removes the stock "Help about MediaWiki" link from the sidebar.
 *  2. Marks the <html> element as a night-mode skin so extensions that ship dark styles
 *     (SyntaxHighlight, TemplateStyles pages from Wikipedia, RCFilters, Echo, VisualEditor,
 *     DiscussionTools ...) switch them on. NightSky is dark-only, so this is unconditional.
 *
 * @file
 */

namespace MediaWiki\Skins\NightSky;

use MediaWiki\Skin\SkinMustache;

class SkinNightSky extends SkinMustache {

	/**
	 * Sidebar item ids that are never shown. "n-help-mediawiki" is the default
	 * "Help about MediaWiki" entry that a fresh MediaWiki puts in MediaWiki:Sidebar.
	 */
	private const HIDDEN_SIDEBAR_ITEMS = [ 'n-help-mediawiki' ];

	/**
	 * @inheritDoc
	 */
	public function buildSidebar() {
		$sidebar = parent::buildSidebar();
		foreach ( $sidebar as $section => $items ) {
			// Only the plain link sections of MediaWiki:Sidebar are filtered. SEARCH, TOOLBOX and
			// LANGUAGES have their own shape, and TOOLBOX is keyed by message name, so it must not
			// be touched (re-indexing it turns every label into "⧼0⧽").
			if ( !is_array( $items ) || in_array( $section, [ 'SEARCH', 'TOOLBOX', 'LANGUAGES' ], true ) ) {
				continue;
			}
			// array_filter() keeps the keys, which is what we want.
			$sidebar[$section] = array_filter(
				$items,
				static function ( $item ) {
					return !is_array( $item ) || !in_array( $item['id'] ?? '', self::HIDDEN_SIDEBAR_ITEMS, true );
				}
			);
		}
		return $sidebar;
	}

	/**
	 * @inheritDoc
	 */
	public function getHtmlElementAttributes() {
		$attributes = parent::getHtmlElementAttributes();
		$attributes['class'] = trim( ( $attributes['class'] ?? '' ) . ' skin-theme-clientpref-night' );
		return $attributes;
	}
}
