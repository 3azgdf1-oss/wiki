( function () {
 'use strict';
 function init() {
  var button = document.getElementById( 'nightsky-menu-toggle' );
  var sidebar = document.getElementById( 'nightsky-sidebar' );
  if ( !button || !sidebar ) { return; }
  button.hidden = false;
  var query = window.matchMedia( '(max-width: 768px)' );
  function setExpanded( expanded ) {
   button.setAttribute( 'aria-expanded', expanded ? 'true' : 'false' );
   sidebar.classList.toggle( 'nightsky-nav-collapsed', !expanded );
  }
  function resize() { setExpanded( !query.matches ); }
  button.addEventListener( 'click', function () {
   setExpanded( button.getAttribute( 'aria-expanded' ) !== 'true' );
  } );
  query.addEventListener( 'change', resize );
  resize();
 }
 if ( document.readyState === 'loading' ) {
  document.addEventListener( 'DOMContentLoaded', init );
 } else { init(); }
}() );
