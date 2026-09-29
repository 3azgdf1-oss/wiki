/**
 * NightSky contrast guard.
 *
 * Article text inherits a light colour from the skin. Wikitext pasted from elsewhere often sets
 * only a BACKGROUND, e.g. <td style="background:#ffdead"> or a template that paints #f8f9fa, and
 * then that light text sits on a light cell. Only the browser knows the colour a cell really ends
 * up with, so CSS cannot fix it; this script can.
 *
 * For every element inside the parsed article it works out the surface behind the text and, if the
 * text colour has less than 3:1 contrast against it, gives that one element a readable colour.
 * Nothing that is already legible is touched, and nothing runs without JavaScript (the known
 * template classes are covered by content.css).
 *
 * Opt out for a whole block by giving it the class "notheme" (Wikipedia's convention).
 */
( function () {
	'use strict';

	var MIN_CONTRAST = 3;
	var MAX_ELEMENTS = 20000;
	var PAGE_SURFACE = { r: 9, g: 9, b: 11, a: 1 };
	var SKIP = /^(script|style|noscript|template|svg|img|video|audio|canvas|iframe|object|input|textarea|select|button)$/i;
	var WHITE = { r: 255, g: 255, b: 255, a: 1 };
	var BLACK = { r: 0, g: 0, b: 0, a: 1 };

	function parseColor( value ) {
		var m = /^rgba?\(([^)]+)\)$/.exec( value );
		var scale = 1;
		if ( !m ) {
			m = /^color\(srgb ([^)]+)\)$/.exec( value );
			scale = 255;
		}
		if ( !m ) {
			return null; // lab(), oklch() ... leave those alone
		}
		var p = m[ 1 ].split( /[\s,/]+/ ).filter( Boolean ).map( parseFloat );
		if ( p.length < 3 || p.some( isNaN ) ) {
			return null;
		}
		return { r: p[ 0 ] * scale, g: p[ 1 ] * scale, b: p[ 2 ] * scale, a: p.length > 3 ? p[ 3 ] : 1 };
	}

	function over( top, bottom ) {
		var a = top.a + bottom.a * ( 1 - top.a );
		if ( a === 0 ) {
			return { r: 0, g: 0, b: 0, a: 0 };
		}
		function mix( t, b ) {
			return ( t * top.a + b * bottom.a * ( 1 - top.a ) ) / a;
		}
		return { r: mix( top.r, bottom.r ), g: mix( top.g, bottom.g ), b: mix( top.b, bottom.b ), a: a };
	}

	function luminance( c ) {
		function channel( v ) {
			v /= 255;
			return v <= 0.03928 ? v / 12.92 : Math.pow( ( v + 0.055 ) / 1.055, 2.4 );
		}
		return 0.2126 * channel( c.r ) + 0.7152 * channel( c.g ) + 0.0722 * channel( c.b );
	}

	function contrast( a, b ) {
		var l1 = luminance( a );
		var l2 = luminance( b );
		return ( Math.max( l1, l2 ) + 0.05 ) / ( Math.min( l1, l2 ) + 0.05 );
	}

	function hasOwnText( el ) {
		for ( var n = el.firstChild; n; n = n.nextSibling ) {
			if ( n.nodeType === 3 && /\S/.test( n.nodeValue ) ) {
				return true;
			}
		}
		return false;
	}

	/** A readable colour for text on `surface`: dark on light surfaces, light on dark ones. */
	function readableOn( surface, isLink ) {
		var lightSurface = contrast( surface, BLACK ) > contrast( surface, WHITE );
		if ( lightSurface ) {
			return isLink ? 'rgb(28, 44, 160)' : 'rgb(20, 20, 28)';
		}
		return isLink ? 'rgb(176, 176, 244)' : 'rgb(232, 232, 240)';
	}

	function guard( root ) {
		if ( !root || root.nodeType !== 1 ) {
			return 0;
		}
		// state per element: { c: effective surface colour, unknown: surface is an image/gradient }
		var states = typeof WeakMap === 'function' ? new WeakMap() : null;
		if ( !states ) {
			return 0;
		}
		states.set( root, { c: PAGE_SURFACE, unknown: false } );

		var walker = document.createTreeWalker( root, NodeFilter.SHOW_ELEMENT, {
			acceptNode: function ( el ) {
				if ( SKIP.test( el.tagName ) || el.classList.contains( 'notheme' ) ) {
					return NodeFilter.FILTER_REJECT;
				}
				return NodeFilter.FILTER_ACCEPT;
			}
		} );

		var fixed = 0;
		var seen = 0;
		var el;
		while ( ( el = walker.nextNode() ) ) {
			if ( ++seen > MAX_ELEMENTS ) {
				break;
			}
			var cs = getComputedStyle( el );
			var parent = states.get( el.parentElement ) || { c: PAGE_SURFACE, unknown: false };
			var own = parseColor( cs.backgroundColor );
			var state = parent;

			if ( own && own.a > 0 ) {
				state = { c: own.a >= 1 ? own : over( own, parent.c ), unknown: false };
			} else if ( cs.backgroundImage && cs.backgroundImage !== 'none' ) {
				// a picture or gradient: the real surface is unknowable, so leave this subtree alone
				state = { c: parent.c, unknown: true };
			}
			states.set( el, state );

			if ( state.unknown || !hasOwnText( el ) ) {
				continue;
			}
			if ( cs.webkitTextFillColor === 'rgba(0, 0, 0, 0)' || cs.backgroundClip === 'text' ) {
				continue; // gradient-filled text
			}
			var fg = parseColor( cs.color );
			if ( !fg ) {
				continue;
			}
			fg = over( fg, state.c );
			if ( contrast( fg, state.c ) < MIN_CONTRAST ) {
				el.style.setProperty( 'color', readableOn( state.c, el.tagName === 'A' ), 'important' );
				fixed++;
			}
		}
		return fixed;
	}

	function init() {
		if ( typeof mw === 'undefined' || !mw.hook ) {
			return;
		}
		// Fires for the initial page and again whenever content is replaced (live preview, VisualEditor ...)
		mw.hook( 'wikipage.content' ).add( function ( $content ) {
			var container = $content && $content[ 0 ];
			if ( !container || !container.querySelectorAll ) {
				return;
			}
			if ( container.classList.contains( 'mw-parser-output' ) ) {
				guard( container );
				return;
			}
			var parsed = container.querySelectorAll( '.mw-parser-output' );
			for ( var i = 0; i < parsed.length; i++ ) {
				guard( parsed[ i ] );
			}
		} );
	}

	init();
}() );
