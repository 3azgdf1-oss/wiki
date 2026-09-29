<?php
/**
 * NightSky skin class.
 *
 * The skin is still rendered by the Mustache templates in /templates. This class only does
 * three small things that a template cannot do by itself:
 *
 *  1. Removes the stock "Help about MediaWiki" link from the sidebar.
 *  2. Lifts the "Tools" portlet out of the sidebar so the template can place it in its own
 *     column on the opposite side of the page.
 *  3. Marks the <html> element as a night-mode skin so extensions that ship dark styles
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
	 * Id of the portlet that holds the "Tools" links (What links here, Special pages ...).
	 * Core always maps the TOOLBOX sidebar section to this id.
	 */
	private const TOOLS_PORTLET_ID = 'p-tb';

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
	public function getTemplateData() {
		$data = parent::getTemplateData();

		$portlets = $data['data-portlets-sidebar'] ?? [];
		$first = $portlets['data-portlets-first'] ?? null;
		$all = array_merge( $first ? [ $first ] : [], $portlets['array-portlets-rest'] ?? [] );

		$tools = null;
		$rest = [];
		foreach ( $all as $portlet ) {
			if ( ( $portlet['id'] ?? '' ) === self::TOOLS_PORTLET_ID ) {
				$tools = $portlet;
			} else {
				$rest[] = $portlet;
			}
		}

		$data['data-portlets-sidebar'] = [
			'data-portlets-first' => $rest[0] ?? null,
			'array-portlets-rest' => array_slice( $rest, 1 ),
		];
		// Rendered by skin.mustache in the tools column; null when a wiki has no tools at all.
		$data['data-portlet-tools'] = $tools;

		return $data;
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
