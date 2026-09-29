// Full-page JPEG screenshots of every preview page, per skin and viewport width.
//   NODE_PATH=$(npm root -g) node dev/screenshots.mjs --out preview/screenshots \
//       [--base http://localhost:8080] [--skins nightskyold,nightsky] [--widths 1440,390] [--only main,goober]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const { chromium } = createRequire( import.meta.url )( 'playwright' );

const argv = Object.fromEntries( process.argv.slice( 2 ).reduce( ( acc, cur, i, a ) => {
	if ( cur.startsWith( '--' ) ) { acc.push( [ cur.slice( 2 ), a[ i + 1 ] ] ); }
	return acc;
}, [] ) );
const base = argv.base || 'http://localhost:8080';
const out = argv.out || 'preview/screenshots';
const skins = ( argv.skins || 'nightskyold,nightsky' ).split( ',' );
const widths = ( argv.widths || '1440,390' ).split( ',' ).map( Number );
const only = argv.only ? argv.only.split( ',' ) : null;
const pages = JSON.parse( fs.readFileSync( new URL( './preview-pages.json', import.meta.url ), 'utf8' ) ).filter( ( p ) => !only || only.includes( p.id ) );

const browser = await chromium.launch();
const ctx = await browser.newContext( { viewport: { width: 1440, height: 900 } } );
const page = await ctx.newPage();
await page.goto( `${ base }/index.php?title=Special:UserLogin`, { waitUntil: 'networkidle' } );
await page.fill( '#wpName1', argv.user || 'Admin' );
await page.fill( '#wpPassword1', argv.pass || 'PreviewPass!2026' );
await Promise.all( [ page.waitForNavigation( { waitUntil: 'networkidle' } ), page.click( '#wpLoginAttempt' ) ] );

for ( const skin of skins ) {
	for ( const p of pages ) {
		for ( const w of widths ) {
			const dir = path.join( out, skin );
			fs.mkdirSync( dir, { recursive: true } );
			let pg = page, tmp = null;
			if ( p.id === 'login' ) { tmp = await browser.newContext(); pg = await tmp.newPage(); }
			await pg.setViewportSize( { width: w, height: 900 } );
			await pg.goto( base + p.path + ( p.path.includes( '?' ) ? '&' : '?' ) + 'useskin=' + skin, { waitUntil: 'networkidle' } );
			if ( [ 'rc', 'prefs', 'edit' ].includes( p.id ) ) { await pg.waitForTimeout( 2500 ); }
			await pg.waitForTimeout( 300 );
			// The skin paints its page background with background-attachment: fixed, which a fullPage
				// capture only draws for the first viewport height (a visible seam). Capture through a
				// window as tall as the page instead, so the screenshot matches what a visitor sees.
				const height = await pg.evaluate( () => Math.ceil( document.documentElement.scrollHeight ) );
				await pg.setViewportSize( { width: w, height: Math.min( Math.max( height, 900 ), 16000 ) } );
				await pg.waitForTimeout( 200 );
				const file = path.join( dir, `${ p.id }-${ w }.jpg` );
			await pg.screenshot( { path: file, type: 'jpeg', quality: 78 } );
			console.log( `${ skin.padEnd( 12 ) } ${ p.id.padEnd( 12 ) } ${ String( w ).padStart( 4 ) }px  ${ ( fs.statSync( file ).size / 1024 ).toFixed( 0 ).padStart( 5 ) } KB` );
			if ( tmp ) { await tmp.close(); }
		}
	}
}
await browser.close();
