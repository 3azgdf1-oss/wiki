// WCAG contrast scanner for the NightSky test wiki.
// usage: NODE_PATH=/opt/node22/lib/node_modules node contrast.mjs [--user Admin] [--width 1440] [--min 4.5] [--json out.json]
//          [--pages "Main_Page,Goober"] [--base http://localhost:8080] [--verbose 1]
// For every visible text node it computes the foreground colour and the *effective* background
// (walking up the ancestors, compositing translucent layers) and reports pairs below the threshold.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const { chromium } = createRequire( import.meta.url )( 'playwright' );

const argv = Object.fromEntries( process.argv.slice( 2 ).reduce( ( acc, cur, i, a ) => {
	if ( cur.startsWith( '--' ) ) { acc.push( [ cur.slice( 2 ), a[ i + 1 ] ] ); }
	return acc;
}, [] ) );
const base = argv.base || 'http://localhost:8080';
const width = parseInt( argv.width || '1440', 10 );
const minRatio = parseFloat( argv.min || '4.5' );
const pages = ( argv.pages || 'Main_Page' ).split( ',' ).map( ( s ) => s.trim() ).filter( Boolean );
const verbose = !!argv.verbose;

const browser = await chromium.launch();
const ctx = await browser.newContext( { viewport: { width, height: 900 } } );
const page = await ctx.newPage();

if ( argv.user ) {
	await page.goto( `${ base }/index.php?title=Special:UserLogin`, { waitUntil: 'networkidle' } );
	await page.fill( '#wpName1', argv.user );
	await page.fill( '#wpPassword1', argv.pass || 'PreviewPass!2026' );
	await Promise.all( [ page.waitForNavigation( { waitUntil: 'networkidle' } ), page.click( '#wpLoginAttempt' ) ] );
}

// Runs inside the page.
function scan( minRatio ) {
	const parse = ( s ) => {
		const m = s && s.match( /rgba?\(([^)]+)\)/ );
		if ( !m ) { return null; }
		const p = m[ 1 ].split( /[ ,\/]+/ ).filter( Boolean ).map( parseFloat );
		return { r: p[ 0 ], g: p[ 1 ], b: p[ 2 ], a: p.length > 3 ? p[ 3 ] : 1 };
	};
	const over = ( top, bottom ) => {
		const a = top.a + bottom.a * ( 1 - top.a );
		if ( a === 0 ) { return { r: 0, g: 0, b: 0, a: 0 }; }
		const mix = ( t, b ) => ( t * top.a + b * bottom.a * ( 1 - top.a ) ) / a;
		return { r: mix( top.r, bottom.r ), g: mix( top.g, bottom.g ), b: mix( top.b, bottom.b ), a };
	};
	const lum = ( c ) => {
		const f = ( v ) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow( ( v + 0.055 ) / 1.055, 2.4 ); };
		return 0.2126 * f( c.r ) + 0.7152 * f( c.g ) + 0.0722 * f( c.b );
	};
	const ratio = ( a, b ) => {
		const l1 = lum( a ), l2 = lum( b );
		return ( Math.max( l1, l2 ) + 0.05 ) / ( Math.min( l1, l2 ) + 0.05 );
	};
	const canvas = parse( getComputedStyle( document.body ).backgroundColor );
	const root = parse( getComputedStyle( document.documentElement ).backgroundColor );
	const canvasBase = ( canvas && canvas.a > 0 ) ? canvas : ( root && root.a > 0 ? root : { r: 255, g: 255, b: 255, a: 1 } );

	const effectiveBg = ( el ) => {
		const layers = [];
		let hasImage = false;
		for ( let n = el; n && n.nodeType === 1; n = n.parentElement ) {
			const cs = getComputedStyle( n );
			const bg = parse( cs.backgroundColor );
			if ( cs.backgroundImage && cs.backgroundImage !== 'none' && !/url\(/.test( cs.backgroundImage ) ) {
				// gradient: approximate by first colour stop
				const m = cs.backgroundImage.match( /rgba?\([^)]+\)/ );
				if ( m ) { layers.push( parse( m[ 0 ] ) ); hasImage = true; }
			}
			if ( bg && bg.a > 0 ) { layers.push( bg ); if ( bg.a >= 1 ) { break; } }
		}
		let acc = canvasBase;
		for ( let i = layers.length - 1; i >= 0; i-- ) { acc = over( layers[ i ], acc ); }
		return { c: acc, hasImage };
	};
	const opacityOf = ( el ) => {
		let o = 1;
		for ( let n = el; n && n.nodeType === 1; n = n.parentElement ) { o *= parseFloat( getComputedStyle( n ).opacity ); }
		return o;
	};
	const visible = ( el ) => {
		for ( let n = el; n && n.nodeType === 1; n = n.parentElement ) {
			const cs = getComputedStyle( n );
			if ( cs.display === 'none' || cs.visibility === 'hidden' ) { return false; }
		}
		const r = el.getBoundingClientRect();
		return r.width > 0 && r.height > 0;
	};
	const sig = ( el ) => {
		const parts = [];
		for ( let n = el, d = 0; n && n.nodeType === 1 && d < 3; n = n.parentElement, d++ ) {
			let s = n.tagName.toLowerCase();
			if ( n.id ) { s += '#' + n.id.replace( /\d+/g, 'N' ); }
			const cls = ( n.getAttribute( 'class' ) || '' ).split( /\s+/ ).filter( Boolean ).slice( 0, 3 ).join( '.' );
			if ( cls ) { s += '.' + cls; }
			parts.unshift( s );
		}
		return parts.join( ' > ' );
	};
	const hex = ( c ) => '#' + [ c.r, c.g, c.b ].map( ( v ) => Math.round( v ).toString( 16 ).padStart( 2, '0' ) ).join( '' );

	const out = new Map();
	const walker = document.createTreeWalker( document.body, NodeFilter.SHOW_TEXT );
	let node;
	while ( ( node = walker.nextNode() ) ) {
		const text = node.nodeValue.replace( /\s+/g, ' ' ).trim();
		if ( !text ) { continue; }
		const el = node.parentElement;
		if ( !el || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test( el.tagName ) ) { continue; }
		if ( !visible( el ) ) { continue; }
		const cs = getComputedStyle( el );
		if ( cs.webkitTextFillColor === 'rgba(0, 0, 0, 0)' || cs.webkitBackgroundClip === 'text' || cs.backgroundClip === 'text' ) { continue; }
		let fg = parse( cs.webkitTextFillColor && cs.webkitTextFillColor !== 'rgba(0, 0, 0, 0)' ? cs.webkitTextFillColor : cs.color );
		if ( !fg ) { continue; }
		const { c: bg, hasImage } = effectiveBg( el );
		const op = opacityOf( el );
		fg = over( { ...fg, a: fg.a * op }, bg );
		const cr = ratio( fg, bg );
		const size = parseFloat( cs.fontSize );
		const bold = parseInt( cs.fontWeight, 10 ) >= 700;
		const large = size >= 24 || ( bold && size >= 18.66 );
		const need = large ? Math.min( 3, minRatio ) : minRatio;
		if ( cr < need ) {
			const key = sig( el ) + ' | ' + hex( fg ) + ' on ' + hex( bg );
			const e = out.get( key ) || { sig: sig( el ), fg: hex( fg ), bg: hex( bg ), ratio: cr, count: 0, sample: text.slice( 0, 50 ), image: hasImage };
			e.count++;
			out.set( key, e );
		}
	}
	// form controls: value/placeholder text is not a text node
	for ( const el of document.querySelectorAll( 'input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=submit]):not([type=button]):not([type=image]), textarea, select' ) ) {
		if ( !visible( el ) ) { continue; }
		const cs = getComputedStyle( el );
		const { c: bg } = effectiveBg( el );
		const fg = over( parse( cs.color ), bg );
		const cr = ratio( fg, bg );
		if ( cr < minRatio ) {
			const key = sig( el ) + ' | value ' + hex( fg ) + ' on ' + hex( bg );
			out.set( key, { sig: sig( el ) + ' [value]', fg: hex( fg ), bg: hex( bg ), ratio: cr, count: 1, sample: ( el.value || '' ).slice( 0, 30 ) } );
		}
		if ( el.placeholder ) {
			const ph = parse( getComputedStyle( el, '::placeholder' ).color );
			if ( ph ) {
				const pf = over( ph, bg );
				const pr = ratio( pf, bg );
				if ( pr < 3 ) {
					const key = sig( el ) + ' | placeholder ' + hex( pf ) + ' on ' + hex( bg );
					out.set( key, { sig: sig( el ) + ' [placeholder]', fg: hex( pf ), bg: hex( bg ), ratio: pr, count: 1, sample: el.placeholder.slice( 0, 30 ) } );
				}
			}
		}
	}
	return [ ...out.values() ].sort( ( a, b ) => a.ratio - b.ratio );
}

const report = {};
for ( const p of pages ) {
	const url = p.startsWith( 'http' ) ? p : `${ base }/${ p.replace( /^\//, '' ) }`;
	await page.goto( url, { waitUntil: 'networkidle' } ).catch( () => {} );
	if ( /RecentChanges|Watchlist|Preferences|Special:Log|Special:Search|action=edit|Special:Contributions/.test( p ) ) { await page.waitForTimeout( 2500 ); }
	await page.waitForTimeout( 300 );
	const res = await page.evaluate( scan, minRatio );
	report[ p ] = res;
	const total = res.reduce( ( n, r ) => n + r.count, 0 );
	console.log( `\n### ${ p }  — ${ res.length } low-contrast groups (${ total } text nodes) below ${ minRatio }:1` );
	for ( const r of res.slice( 0, verbose ? 60 : 14 ) ) {
		console.log( `  ${ r.ratio.toFixed( 2).padStart( 5 ) }:1  ${ r.fg } on ${ r.bg }  x${ r.count }  ${ r.sig.slice( 0, 90 ) }  “${ r.sample }”${ r.image ? '  (gradient)' : '' }` );
	}
}
if ( argv.json ) { fs.writeFileSync( argv.json, JSON.stringify( report, null, 1 ) ); }
await browser.close();
