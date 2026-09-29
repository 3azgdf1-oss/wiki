// Check that the static snapshots made by export-static.mjs are self-contained: opened from disk with the
// network blocked they must not request anything, run no script and show no broken image.
//
//   NODE_PATH=$(npm root -g) node dev/verify-snapshots.mjs build/site
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const { chromium } = createRequire( import.meta.url )( 'playwright' );

const root = path.resolve( process.argv[ 2 ] || 'build/site' );
const files = [];
for ( const skin of fs.readdirSync( root, { withFileTypes: true } ).filter( ( d ) => d.isDirectory() ) ) {
	for ( const f of fs.readdirSync( path.join( root, skin.name ) ).filter( ( n ) => n.endsWith( '.html' ) ) ) {
		files.push( path.join( root, skin.name, f ) );
	}
}
const browser = await chromium.launch();
const ctx = await browser.newContext( { viewport: { width: 1440, height: 900 } } );
let bad = 0;
for ( const file of files ) {
	const page = await ctx.newPage();
	const requested = [];
	await page.route( '**/*', ( route ) => {
		const u = route.request().url();
		if ( u.startsWith( 'file:' ) || u.startsWith( 'data:' ) ) { return route.continue(); }
		requested.push( u.slice( 0, 90 ) );
		return route.abort();
	} );
	await page.goto( 'file://' + file, { waitUntil: 'load' } );
	const info = await page.evaluate( () => ( {
		scripts: document.querySelectorAll( 'script' ).length,
		stylesheets: document.querySelectorAll( 'link[rel~="stylesheet"]' ).length,
		brokenImages: [ ...document.images ].filter( ( i ) => getComputedStyle( i ).display !== 'none' && ( !i.complete || i.naturalWidth === 0 ) ).length,
		bytes: document.documentElement.outerHTML.length
	} ) );
	const ok = requested.length === 0 && info.scripts === 0 && info.stylesheets === 0 && info.brokenImages === 0;
	if ( !ok ) { bad++; }
	console.log( `${ ok ? 'ok  ' : 'FAIL' } ${ path.relative( root, file ).padEnd( 26 ) } requests ${ requested.length }, scripts ${ info.scripts }, external stylesheets ${ info.stylesheets }, broken images ${ info.brokenImages }` );
	await page.close();
}
await browser.close();
console.log( `\n${ files.length - bad } of ${ files.length } snapshots are self-contained` );
process.exit( bad ? 1 : 0 );
