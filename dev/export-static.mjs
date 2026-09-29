// Export self-contained static snapshots of the test wiki, one HTML file per page and skin.
//
//   NODE_PATH=$(npm root -g) node dev/export-static.mjs --out preview/site \
//       [--base http://localhost:8080] [--skins nightskyold,nightsky] [--user Admin --pass ...]
//
// Each snapshot is the DOM as the browser rendered it AFTER JavaScript ran (so Recent changes shows its
// filter UI), with every stylesheet inlined, every image inlined as a data: URI, scripts removed and
// internal links rewritten to the sibling snapshot files. The result opens from disk or any static host.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const { chromium } = createRequire( import.meta.url )( 'playwright' );

const argv = Object.fromEntries( process.argv.slice( 2 ).reduce( ( acc, cur, i, a ) => {
	if ( cur.startsWith( '--' ) ) { acc.push( [ cur.slice( 2 ), a[ i + 1 ] ] ); }
	return acc;
}, [] ) );
const base = argv.base || 'http://localhost:8080';
const out = argv.out || 'preview/site';
const skins = ( argv.skins || 'nightskyold,nightsky' ).split( ',' );
const user = argv.user || 'Admin';
const pass = argv.pass || 'PreviewPass!2026';

// id, title shown in the viewer, wiki path, needs login
const PAGES = JSON.parse( fs.readFileSync( new URL( './preview-pages.json', import.meta.url ), 'utf8' ) )
	.map( ( p ) => [ p.id, p.title, p.path, p.login ] );

const norm = ( u ) => {
	const x = new URL( u, base );
	const t = x.searchParams.get( 'title' );
	const rest = [ ...x.searchParams ].filter( ( [ k ] ) => ![ 'title', 'useskin' ].includes( k ) ).map( ( [ k, v ] ) => `${ k }=${ v }` ).join( '&' );
	return decodeURIComponent( t ? t.replace( / /g, '_' ) : x.pathname.replace( /^\//, '' ) ) + ( rest ? '?' + rest : '' );
};
const linkMap = {};
for ( const [ id, , p ] of PAGES ) { linkMap[ norm( p ) ] = id; }

const browser = await chromium.launch();
const ctx = await browser.newContext( { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } );
const page = await ctx.newPage();
await page.goto( `${ base }/index.php?title=Special:UserLogin`, { waitUntil: 'networkidle' } );
await page.fill( '#wpName1', user );
await page.fill( '#wpPassword1', pass );
await Promise.all( [ page.waitForNavigation( { waitUntil: 'networkidle' } ), page.click( '#wpLoginAttempt' ) ] );

// Runs in the page: returns the finished HTML document as a string.
async function serialize( { linkMapIn, baseIn } ) {
	const cache = new Map();
	const toDataUri = async ( url ) => {
		if ( /^(data:|#|about:|blob:)/.test( url ) ) { return url; }
		const abs = new URL( url, baseIn ).href;
		if ( cache.has( abs ) ) { return cache.get( abs ); }
		const p = ( async () => {
			try {
				const r = await fetch( abs );
				if ( !r.ok ) { return url; }
				const b = await r.blob();
				if ( b.size > 400000 ) { return url; }
				return await new Promise( ( res ) => { const fr = new FileReader(); fr.onload = () => res( fr.result ); fr.readAsDataURL( b ); } );
			} catch ( e ) { return url; }
		} )();
		cache.set( abs, p );
		return p;
	};
	const inlineCssUrls = async ( css, cssBase ) => {
		const re = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g;
		const found = [ ...css.matchAll( re ) ];
		const repl = await Promise.all( found.map( ( m ) => toDataUri( new URL( m[ 2 ], cssBase ).href ) ) );
		let i = 0;
		return css.replace( re, () => `url("${ repl[ i++ ] }")` );
	};

	const doc = document.documentElement.cloneNode( true );
	// 1. stylesheets: <link> -> <style>
	for ( const link of [ ...document.querySelectorAll( 'link[rel~="stylesheet"]' ) ] ) {
		let css = '';
		try { css = await ( await fetch( link.href ) ).text(); } catch ( e ) { continue; }
		css = await inlineCssUrls( css, link.href );
		const style = document.createElement( 'style' );
		style.setAttribute( 'media', link.getAttribute( 'media' ) || 'all' );
		style.textContent = css;
		const twin = [ ...doc.querySelectorAll( 'link[rel~="stylesheet"]' ) ].find( ( l ) => l.getAttribute( 'href' ) === link.getAttribute( 'href' ) );
		if ( twin ) { twin.replaceWith( style ); }
	}
	for ( const s of doc.querySelectorAll( 'style' ) ) {
		if ( /url\(/.test( s.textContent ) ) { s.textContent = await inlineCssUrls( s.textContent, baseIn + '/' ); }
	}
	// 2. drop everything dynamic
	doc.querySelectorAll( 'script, noscript, link[rel="preload"], link[rel="modulepreload"], link[rel="alternate"], link[rel="search"], link[rel="EditURI"], meta[name="ResourceLoaderDynamicStyles"]' ).forEach( ( e ) => e.remove() );
	// 3. images
	for ( const img of doc.querySelectorAll( 'img, source, input[type="image"]' ) ) {
		// The skin hides MediaWiki's placeholder logo with img[src*="change-your-logo"], a selector a data:
		// URI would not match. Keep the marker in the URL (as a fragment) and point it at an empty SVG.
		if ( /change-your-logo/.test( img.getAttribute( 'src' ) || '' ) ) {
			img.setAttribute( 'src', 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%2F%3E#/resources/assets/change-your-logo-icon.svg' );
			continue;
		}
		for ( const attr of [ 'src', 'srcset' ] ) {
			const v = img.getAttribute( attr );
			if ( !v ) { continue; }
			if ( attr === 'srcset' ) {
				const parts = await Promise.all( v.split( ',' ).map( async ( p ) => { const [ u, d ] = p.trim().split( /\s+/ ); return ( await toDataUri( u ) ) + ( d ? ' ' + d : '' ); } ) );
				img.setAttribute( attr, parts.join( ', ' ) );
			} else {
				img.setAttribute( attr, await toDataUri( v ) );
			}
		}
		img.removeAttribute( 'loading' );
	}
	// 4. links: point to sibling snapshots, or neutralise
	const skinName = doc.querySelector( 'body' ).className.match( /skin-(\w+)/ )?.[ 1 ];
	for ( const a of doc.querySelectorAll( 'a[href]' ) ) {
		const href = a.getAttribute( 'href' );
		if ( href.startsWith( '#' ) || /^(mailto:|javascript:)/.test( href ) ) { continue; }
		let key;
		try {
			const x = new URL( href, baseIn );
			if ( x.origin !== new URL( baseIn ).origin ) { a.setAttribute( 'target', '_blank' ); a.setAttribute( 'rel', 'noopener' ); continue; }
			const t = x.searchParams.get( 'title' );
			const rest = [ ...x.searchParams ].filter( ( [ k ] ) => ![ 'title', 'useskin' ].includes( k ) ).map( ( [ k, v ] ) => `${ k }=${ v }` ).join( '&' );
			key = decodeURIComponent( t ? t.replace( / /g, '_' ) : x.pathname.replace( /^\//, '' ) ) + ( rest ? '?' + rest : '' );
		} catch ( e ) { continue; }
		if ( linkMapIn[ key ] ) { a.setAttribute( 'href', `${ linkMapIn[ key ] }.html` ); } else { a.setAttribute( 'data-preview-href', href ); a.setAttribute( 'href', '#' ); a.setAttribute( 'title', ( a.getAttribute( 'title' ) || '' ) + ' (not part of this static preview)' ); }
	}
	for ( const f of doc.querySelectorAll( 'form' ) ) { f.setAttribute( 'action', '#' ); f.setAttribute( 'onsubmit', 'return false' ); }
	// 5. the mobile nav toggle needs JavaScript, which snapshots do not have
	doc.querySelector( '#nightsky-menu-toggle, #nightskyold-menu-toggle' )?.setAttribute( 'hidden', '' );
	doc.querySelectorAll( '.nightsky-nav-collapsed, .nightskyold-nav-collapsed' ).forEach( ( e ) => e.classList.remove( 'nightsky-nav-collapsed', 'nightskyold-nav-collapsed' ) );
	const head = doc.querySelector( 'head' );
	head.insertAdjacentHTML( 'afterbegin', '<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">' );
	doc.querySelector( 'title' ).textContent = document.title + ' [' + skinName + ' snapshot]';
	return '<!DOCTYPE html>\n' + doc.outerHTML;
}

let total = 0;
for ( const skin of skins ) {
	const dir = path.join( out, skin );
	fs.mkdirSync( dir, { recursive: true } );
	for ( const [ id, , p ] of PAGES ) {
		const url = base + p + ( p.includes( '?' ) ? '&' : '?' ) + 'useskin=' + skin;
		// the login page must be captured logged out
		let pg = page;
		let tmp = null;
		if ( id === 'login' ) { tmp = await browser.newContext( { viewport: { width: 1440, height: 900 } } ); pg = await tmp.newPage(); }
		await pg.goto( url, { waitUntil: 'networkidle' } );
		if ( [ 'rc', 'prefs', 'edit' ].includes( id ) ) { await pg.waitForTimeout( 2500 ); }
		await pg.waitForTimeout( 300 );
		const html = await pg.evaluate( serialize, { linkMapIn: linkMap, baseIn: base } );
		fs.writeFileSync( path.join( dir, `${ id }.html` ), html );
		total++;
		console.log( `${ skin.padEnd( 12 ) } ${ id.padEnd( 12 ) } ${ ( html.length / 1024 ).toFixed( 0 ).padStart( 5 ) } KB` );
		if ( tmp ) { await tmp.close(); }
	}
}
fs.writeFileSync( path.join( out, 'pages.json' ), JSON.stringify( PAGES.map( ( [ id, title ] ) => ( { id, title } ) ), null, 1 ) );
await browser.close();
console.log( `\n${ total } snapshots written to ${ out }` );
