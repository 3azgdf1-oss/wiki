import { createRequire } from 'node:module';
const { chromium } = createRequire( import.meta.url )( 'playwright' );
const [ , , url, ...exprs ] = process.argv;
const browser = await chromium.launch();
const page = await ( await browser.newContext( { viewport: { width: 1440, height: 900 } } ) ).newPage();
await page.goto( url, { waitUntil: 'networkidle' } );
for ( const e of exprs ) {
	const r = await page.evaluate( e ).catch( ( err ) => 'ERR ' + err.message );
	console.log( e.slice( 0, 90 ).padEnd( 92 ), '=>', JSON.stringify( r ) );
}
await browser.close();
