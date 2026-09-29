-- Faithful-structure reimplementation of the class/element layout emitted by
-- Wikipedia's Module:Infobox (table.infobox > tr > th.infobox-above / td.infobox-image /
-- th.infobox-label + td.infobox-data / th.infobox-header / td.infobox-full-data / td.infobox-below).
local p = {}

local function nonEmpty( s )
	return s ~= nil and mw.text.trim( s ) ~= ''
end

function p.infobox( frame )
	local args = frame:getParent().args
	local root = mw.html.create( 'table' ):addClass( 'infobox' )
	if nonEmpty( args.bodyclass ) then root:addClass( args.bodyclass ) end
	if nonEmpty( args.bodystyle ) then root:cssText( args.bodystyle ) end

	if nonEmpty( args.title ) then
		root:tag( 'caption' ):addClass( 'infobox-title' ):wikitext( args.title )
	end
	if nonEmpty( args.above ) then
		root:tag( 'tr' ):tag( 'th' ):attr( 'colspan', 2 ):addClass( 'infobox-above' ):wikitext( args.above )
	end
	if nonEmpty( args.subheader ) then
		root:tag( 'tr' ):tag( 'td' ):attr( 'colspan', 2 ):addClass( 'infobox-subheader' ):wikitext( args.subheader )
	end
	if nonEmpty( args.image ) then
		local td = root:tag( 'tr' ):tag( 'td' ):attr( 'colspan', 2 ):addClass( 'infobox-image' ):wikitext( args.image )
		if nonEmpty( args.caption ) then
			td:tag( 'div' ):addClass( 'infobox-caption' ):wikitext( args.caption )
		end
	end
	for i = 1, 60 do
		local h, l, d = args[ 'header' .. i ], args[ 'label' .. i ], args[ 'data' .. i ]
		if nonEmpty( h ) then
			root:tag( 'tr' ):tag( 'th' ):attr( 'colspan', 2 ):addClass( 'infobox-header' ):wikitext( h )
		elseif nonEmpty( d ) then
			local tr = root:tag( 'tr' )
			if nonEmpty( l ) then
				tr:tag( 'th' ):attr( 'scope', 'row' ):addClass( 'infobox-label' ):wikitext( l )
				tr:tag( 'td' ):addClass( 'infobox-data' ):wikitext( d )
			else
				tr:tag( 'td' ):attr( 'colspan', 2 ):addClass( 'infobox-full-data' ):wikitext( d )
			end
		end
	end
	if nonEmpty( args.below ) then
		root:tag( 'tr' ):tag( 'td' ):attr( 'colspan', 2 ):addClass( 'infobox-below' ):wikitext( args.below )
	end

	local styles = ''
	local mode = args.styles or 'classic'
	if mode == 'classic' then
		styles = frame:extensionTag( 'templatestyles', '', { src = 'Module:Infobox/styles.css' } )
	elseif mode == 'tokens' then
		styles = frame:extensionTag( 'templatestyles', '', { src = 'Module:Infobox/styles-tokens.css' } )
	end
	return styles .. tostring( root )
end

return p
