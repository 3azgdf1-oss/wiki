// Layout and behaviour checks for the NightSky skin, run against a live test wiki.
//
//   NODE_PATH=$(npm root -g) node dev/check-layout.mjs [--base http://localhost:8080] [--skin nightsky]
//                                                      [--prefix nightsky] [--user Admin --pass ...]
//
// Prints one PASS/FAIL line per check and exits with status 1 if anything failed. The pages are the
// fixtures created by dev/fixtures/seed.sh.
import { createRequire } from 'node:module';
const { chromium } = createRequire( import.meta.url )( 'playwright' );

const argv = Object.fromEntries( process.argv.slice( 2 ).reduce( ( acc, cur, i, a ) => {
	if ( cur.startsWith( '--' ) ) { acc.push( [ cur.slice( 2 ), a[ i + 1 ] ] ); }
	return acc;
}, [] ) );
const base = argv.base || 'http://localhost:8080';
const skin = argv.skin || 'nightsky';
// element-id prefix of the skin under test ("nightsky-menu-toggle", "nightsky-sidebar"); it only differs for a
// renamed copy of the skin, such as the "nightskyold" copy of 1.1.0 used for before/after runs
const prefix = argv.prefix || skin;
const toggleSel = `#${ prefix }-menu-toggle`;
const sidebarSel = `#${ prefix }-sidebar`;
const user = argv.user || 'Admin';
const pass = argv.pass || 'PreviewPass!2026';

const results = [];
const check = ( ok, name, detail = '' ) => {
	results.push( ok );
	console.log( `${ ok ? 'PASS' : 'FAIL' }  ${ name }${ detail ? '  (' + detail + ')' : '' }` );
};
const url = ( path, extra = '' ) => `${ base }${ path }${ path.includes( '?' ) ? '&' : '?' }useskin=${ skin }${ extra }`;

const browser = await chromium.launch();
const ctx = await browser.newContext( { viewport: { width: 1440, height: 900 } } );
const page = await ctx.newPage();
const pageErrors = [];
const failedRequests = [];
page.on( 'pageerror', ( e ) => pageErrors.push( e.message ) );
// a request that is cancelled because the test navigated away is not a failure
page.on( 'requestfailed', ( r ) => {
	if ( r.url().startsWith( base ) && !/ERR_ABORTED/.test( ( r.failure() || {} ).errorText || '' ) ) { failedRequests.push( r.url() ); }
} );

async function open( path, width = 1440, extra = '' ) {
	await page.setViewportSize( { width, height: 900 } );
	await page.goto( url( path, extra ), { waitUntil: 'networkidle' } );
}
const rect = ( sel ) => page.evaluate( ( s ) => {
	const e = document.querySelector( s );
	if ( !e ) { return null; }
	const r = e.getBoundingClientRect();
	return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
}, sel );

// ---------------------------------------------------------------- 1. no sideways scrolling anywhere
const PAGES = [ '/Main_Page', '/Goober', '/Syntax_test', '/Kitchen_sink', '/Stress_test', '/Special:Version', '/Special:RecentChanges' ];
const WIDTHS = [ 320, 390, 768, 1024, 1100, 1101, 1440, 1920 ];
for ( const p of PAGES ) {
	const bad = [];
	for ( const w of WIDTHS ) {
		await open( p, w );
		const over = await page.evaluate( () => document.documentElement.scrollWidth - window.innerWidth );
		if ( over > 0 ) { bad.push( `${ w }px: +${ over }` ); }
	}
	check( bad.length === 0, `no horizontal page scroll  ${ p }`, bad.join( ', ' ) || `${ WIDTHS.length } widths` );
}

// ---------------------------------------------------------------- 2. columns: navigation | content
// The sidebar (search, navigation, Tools, account) is one column on the left; the article fills the rest.
await open( '/Main_Page', 1440 );
{
	const nav = await rect( '#mw-navigation' );
	const content = await rect( '#content' );
	check( nav && content && nav.right <= content.left, 'navigation is left of the article' );
	check( !( await rect( '#mw-tools' ) ), 'there is no separate right-hand column' );
	const order = await page.evaluate( ( sel ) => [ ...document.querySelectorAll( sel + ' > *' ) ].map( ( e ) => e.id ), sidebarSel );
	const at = ( id ) => order.indexOf( id );
	check( at( 'p-tb' ) > at( 'p-navigation' ) && at( 'p-navigation' ) > at( 'p-search' ), 'Tools is in the left sidebar, below Navigation', order.join( ' > ' ) );
	check( nav && nav.width <= 200.5, 'sidebar is at most 200px wide', nav && `${ nav.width }px` );
	check( content && content.width / 1440 >= 0.8, 'article uses at least 80% of a 1440px window', content && `${ Math.round( content.width ) }px` );
	// The search bar must not get smaller than it was in 1.2.0 (190px wide, input 34px and button 31px tall)
	const input = await rect( '#searchInput' );
	const button = await rect( '#searchButton' );
	check( input && input.width >= 189.8 && input.height >= 34, 'search input is not smaller than before', input && `${ input.width.toFixed( 1 ) } x ${ input.height.toFixed( 1 ) }px` );
	check( button && button.width >= 189.8 && button.height >= 31, 'search button is not smaller than before', button && `${ button.width.toFixed( 1 ) } x ${ button.height.toFixed( 1 ) }px` );
	// Slimmer rows than 1.2.0 (34px links, 30.2px headings)
	const rows = await page.evaluate( () => ( {
		link: Math.max( ...[ ...document.querySelectorAll( '#p-navigation li a, #p-tb li a' ) ].map( ( a ) => a.getBoundingClientRect().height ) ),
		head: Math.max( ...[ ...document.querySelectorAll( '#p-navigation .wiki-sidebar-head, #p-tb .wiki-sidebar-head' ) ].map( ( h ) => h.getBoundingClientRect().height ) )
	} ) );
	check( rows.link <= 31.5 && rows.head <= 28, 'sidebar rows and headings are slimmer than 1.2.0', `links ${ rows.link.toFixed( 1 ) }px, headings ${ rows.head.toFixed( 1 ) }px` );
}
await open( '/Main_Page', 1920 );
{
	const content = await rect( '#content' );
	check( content && content.width / 1920 >= 0.85, 'article uses at least 85% of a 1920px window', content && `${ Math.round( content.width ) }px` );
}
await open( '/Main_Page', 1024 );
{
	const nav = await rect( '#mw-navigation' );
	const content = await rect( '#content' );
	check( nav && content && nav.right <= content.left, 'tablet (1024px): sidebar stays on the left' );
}
await open( '/Main_Page', 390 );
{
	const nav = await rect( '#mw-navigation' );
	const content = await rect( '#content' );
	check( nav && content && nav.bottom <= content.top + 1, 'phone: one column, navigation above the article' );
}
await open( '/Main_Page', 1440, '&uselang=ar' );
{
	const nav = await rect( '#mw-navigation' );
	const content = await rect( '#content' );
	check( nav && content && nav.left >= content.right, 'right-to-left (Arabic): the sidebar moves to the right' );
}

// ---------------------------------------------------------------- 3. Help about MediaWiki is gone
await open( '/Main_Page', 1440 );
check( await page.evaluate( () => !document.querySelector( '#n-help-mediawiki' ) ), 'no #n-help-mediawiki element in the page' );
check( await page.evaluate( () => !/Help about MediaWiki/i.test( document.querySelector( '#mw-navigation' ).innerText ) ), '"Help about MediaWiki" is not shown' );
check( await page.evaluate( () => document.querySelectorAll( '#mw-navigation #p-tb li' ).length >= 5 ), 'Tools still has its links' );
check( await page.evaluate( () => !document.body.innerText.includes( '⧼' ) ), 'no unresolved message placeholders (⧼…⧽)' );

// ---------------------------------------------------------------- 4. skin plumbing
check( await page.evaluate( () => document.documentElement.classList.contains( 'skin-theme-clientpref-night' ) ), 'night-mode class is set on <html>' );
check( await page.evaluate( () => !!getComputedStyle( document.documentElement ).getPropertyValue( '--background-color-base' ).trim() ), 'Codex colour tokens are defined' );
check( await page.evaluate( () => getComputedStyle( document.querySelector( '.mw-parser-output' ) ).color !== 'rgb(0, 0, 0)' ), 'article text is not black' );

// ---------------------------------------------------------------- 5. the Goober infobox
await open( '/Goober', 1440 );
{
	const box = await rect( 'table.infobox' );
	const content = await rect( '#bodyContent' );
	const info = await page.evaluate( () => {
		const t = document.querySelector( 'table.infobox' );
		const fs = parseFloat( getComputedStyle( t ).fontSize );
		const labels = [ ...t.querySelectorAll( 'th.infobox-label' ) ].map( ( e ) => e.getBoundingClientRect().width );
		const cells = [ ...t.querySelectorAll( 'td.infobox-data' ) ];
		return {
			em: t.getBoundingClientRect().width / fs,
			floatSide: getComputedStyle( t ).float,
			minLabel: Math.min( ...labels ),
			labelCount: labels.length,
			overflowing: cells.filter( ( c ) => c.scrollWidth > c.clientWidth + 1 ).length,
			labelLines: Math.max( ...[ ...t.querySelectorAll( 'th.infobox-label' ) ].map( ( e ) => Math.round( e.getBoundingClientRect().height / parseFloat( getComputedStyle( e ).lineHeight || fs * 1.4 ) ) ) )
		};
	} );
	check( info.labelCount >= 8, 'infobox rows are recognised', `${ info.labelCount } labels` );
	check( info.em <= 22.5, 'infobox is at most 22em wide', `${ info.em.toFixed( 1 ) }em` );
	check( info.floatSide === 'right', 'infobox floats to the right' );
	check( info.minLabel >= 60, 'label column keeps a usable width', `narrowest ${ Math.round( info.minLabel ) }px` );
	check( info.overflowing === 0, 'no infobox cell overflows (long address wraps inside its cell)' );
	check( box && content && box.right <= content.right + 1, 'infobox stays inside the article' );
	const bg = await page.evaluate( () => getComputedStyle( document.querySelector( 'table.infobox' ) ).backgroundColor );
	check( /^rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\)$/.test( bg ) && bg.match( /\d+/g ).slice( 0, 3 ).every( ( n ) => +n < 60 ), 'infobox background is dark', bg );
}

// ---------------------------------------------------------------- 6. syntax highlighting
await open( '/Syntax_test', 1440 );
{
	const s = await page.evaluate( () => {
		const lum = ( c ) => {
			const [ r, g, b ] = c.match( /[\d.]+/g ).slice( 0, 3 ).map( ( v ) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ( ( v + 0.055 ) / 1.055 ) ** 2.4; } );
			return 0.2126 * r + 0.7152 * g + 0.0722 * b;
		};
		const pre = document.querySelector( '.mw-highlight pre' );
		const bg = getComputedStyle( pre.closest( '.mw-highlight' ) ).backgroundColor;
		const tokens = [ ...document.querySelectorAll( '.mw-highlight pre span' ) ];
		const worst = Math.min( ...tokens.map( ( t ) => {
			const a = lum( getComputedStyle( t ).color ), b = lum( bg );
			return ( Math.max( a, b ) + 0.05 ) / ( Math.min( a, b ) + 0.05 );
		} ) );
		return { blocks: document.querySelectorAll( '.mw-highlight' ).length, tokens: tokens.length, worst, bg };
	} );
	check( s.blocks >= 10 && s.tokens > 100, 'syntax samples are highlighted', `${ s.blocks } blocks, ${ s.tokens } tokens` );
	check( s.worst >= 4.5, 'every syntax token is at least 4.5:1 against its block', `worst ${ s.worst.toFixed( 2 ) }:1 on ${ s.bg }` );
}

// ---------------------------------------------------------------- 7. sidebar search: Enter opens an exact title
await open( '/Main_Page', 1440 );
await page.fill( '#searchInput', 'Goober' );
await Promise.all( [ page.waitForNavigation( { waitUntil: 'networkidle' } ), page.press( '#searchInput', 'Enter' ) ] );
check( /\/Goober(\?|$)/.test( page.url() ) && !/Special(:|%3A)Search/i.test( page.url() ), 'Enter in the search box jumps to an exact title', page.url().replace( base, '' ) );
await open( '/Main_Page', 1440 );
await page.fill( '#searchInput', 'armor' );
await Promise.all( [ page.waitForNavigation( { waitUntil: 'networkidle' } ), page.click( '#searchButton' ) ] );
check( /Special(:|%3A)Search/i.test( page.url() ) && /fulltext=1/.test( page.url() ), 'the Search button runs a full-text search', page.url().replace( base, '' ) );

// ---------------------------------------------------------------- 8. mobile menu: collapses with JS, stays open without
await open( '/Main_Page', 390 );
{
	const toggle = await page.evaluate( ( sel ) => { const b = document.querySelector( sel ); return !!b && !b.hidden && getComputedStyle( b ).display !== 'none'; }, toggleSel );
	check( toggle, 'phone: menu button is available when JavaScript runs' );
	const display = () => page.evaluate( ( sel ) => { const e = document.querySelector( sel ); return e ? getComputedStyle( e ).display : 'missing'; }, sidebarSel );
	const before = await display();
	if ( toggle ) { await page.click( toggleSel ); }
	const after = await display();
	check( before !== after, 'phone: the menu button toggles the sidebar', `${ before } -> ${ after }` );
}
{
	const noJs = await browser.newContext( { viewport: { width: 390, height: 844 }, javaScriptEnabled: false } );
	const p = await noJs.newPage();
	await p.goto( url( '/Main_Page' ), { waitUntil: 'load' } );
	const shown = await p.evaluate( ( sel ) => { const e = document.querySelector( sel ); return !!e && getComputedStyle( e ).display !== 'none'; }, sidebarSel );
	check( shown, 'phone without JavaScript: navigation stays visible' );
	await noJs.close();
}

// ---------------------------------------------------------------- 9. print is plain black on white
await open( '/Goober', 1440 );
await page.emulateMedia( { media: 'print' } );
{
	const pr = await page.evaluate( () => ( {
		bg: getComputedStyle( document.body ).backgroundColor,
		nav: getComputedStyle( document.querySelector( '#mw-navigation' ) ).display,
		text: getComputedStyle( document.querySelector( '#content .mw-parser-output p' ) ).color
	} ) );
	check( pr.bg === 'rgb(255, 255, 255)' && pr.nav === 'none' && pr.text === 'rgb(0, 0, 0)', 'print: white page, black text, no sidebar', JSON.stringify( pr ) );
}
await page.emulateMedia( { media: 'screen' } );

// ---------------------------------------------------------------- 10. logged-in pages
await page.goto( `${ base }/index.php?title=Special:UserLogin`, { waitUntil: 'networkidle' } );
await page.fill( '#wpName1', user );
await page.fill( '#wpPassword1', pass );
await Promise.all( [ page.waitForNavigation( { waitUntil: 'networkidle' } ), page.click( '#wpLoginAttempt' ) ] );
for ( const p of [ '/Special:RecentChanges', '/index.php?title=Goober&action=edit', '/Special:Preferences' ] ) {
	const bad = [];
	for ( const w of [ 390, 768, 1440 ] ) {
		await open( p, w );
		await page.waitForTimeout( 1500 );
		const over = await page.evaluate( () => document.documentElement.scrollWidth - window.innerWidth );
		if ( over > 0 ) { bad.push( `${ w }px: +${ over }` ); }
	}
	check( bad.length === 0, `no horizontal page scroll (logged in)  ${ p }`, bad.join( ', ' ) || '3 widths' );
}
await open( '/Special:RecentChanges', 1440 );
await page.waitForTimeout( 1500 );
{
	const rc = await page.evaluate( () => {
		const e = document.querySelector( '.mw-rcfilters-ui-filterWrapperWidget, .mw-rcfilters-ui-filtersViewWidget, .mw-rcfilters-ui-filterTagMultiselectWidget' );
		return e ? getComputedStyle( e ).backgroundColor : null;
	} );
	const dark = rc && rc.match( /\d+/g ).slice( 0, 3 ).every( ( n ) => +n < 90 );
	check( rc === null || dark, 'Recent changes filter bar is not a white box', String( rc ) );
}

// ---------------------------------------------------------------- 11. no script errors or failed requests
check( pageErrors.length === 0, 'no JavaScript errors on any page', pageErrors.slice( 0, 2 ).join( ' | ' ) );
check( failedRequests.length === 0, 'no failed requests to the wiki', failedRequests.slice( 0, 2 ).join( ' | ' ) );

await browser.close();
const failed = results.filter( ( r ) => !r ).length;
console.log( `\n${ results.length - failed } passed, ${ failed } failed` );
process.exit( failed ? 1 : 0 );
