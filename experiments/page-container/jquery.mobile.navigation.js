/*
* jQuery Mobile Framework : core utilities for auto ajax navigation, base tag mgmt,
* Copyright (c) jQuery Project
* Dual licensed under the MIT or GPL Version 2 licenses.
* http://jquery.org/license
*/
(function($, window, document, undefined) {

	//define vars for interal use
	var $window = $(window),
		$html = $('html'),
		$head = $('head'),
		origin = '',
		hashListener = false,

		//array of pages that are visited during a single page load
		//length will grow as pages are visited, and shrink as "back" link/button is clicked
		//each item has a url (string matches ID), and transition (saved for reuse when "back" link/button is clicked)
		urlStack = [ {
			url: location.hash.replace( /^#/, "" ),
			transition: undefined
		} ];


	// Issues to Solve:
	//
	//     - For live form submit need to know what path to prepend for relative urls. Or do we always assume document relative.
	//     - Navigation stack schemes. What happens when the user hits the back button in the browser?
	//
	// Sample hashes:
	//
	//    #<pageID>
	//    #<pagePath>
	//    #pageID&subPageUrlKey
	//    #<pagePath>&subPageUrlKey
	//    #<pageID>$$<containerID>=<pageID>
	//    #<pageID>$$<containerID>=<pagePath>
	//    #<containerID>=<pageID>
	//    #<containerID>=<pagePath>

	var defaultKeyStr = "__default__";

	function getLocationHash()
	{
		return location.hash;
	}

	function setLocationHash(hash, disableListener)
	{
		if(disableListening) { hashListener = false; }

		if ($.isArray(hash)) {
			var tokens = hash;
			hash = [];
			for (var i = 0; i < tokens.length; i++)
			{
				var t = tokens[i];
				if (t.value)
					hash.push((t.key != defaultKeyStr ? t.key + "=" : "") + t.valuel);
			}
			hash = hash.join($.mobile.locationHashSeparator);
		}

		location.hash = hash;
	}

	function getLocationHashKeyValue(key)
	{
		var t = findTokenForKey(tokenizeLocationHash(hash), key);
		return t ? t.value : "";
	}

	function setLocationHashKeyValue(key, value, disableListener)
	{
		key = key ? key : defaultKeyStr;
		var tokens = tokenizeLocationHash();
		var t = findTokenForKey(tokens, key);
		if (!t) {
			t = { key: key, value: value };
			tokens.push(t);
			tokens.dict[key ? key : defaultKeyStr] = t;
		}
		t.value = value;
		setLocationHash(tokens, disableListening);
	}

	function tokenizeLocationHash()
	{
		// Split the location.hash string into a series of key/value tokens.
		// To remain backwards compatible, we allow a value to be specified
		// without  a key. It is assumed that a value without a key is the
		// id or path to the page that should be loaded within the body page
		// container. All other paths must have a key.

		hash = getLocationHash();
		var tokens = [];
		tokens.dict = {};
		var cpaths = hash ? hash.split($.mobile.locationHashSeparator) : [];

		for (var i = 0; i < cpaths.length; i++)
		{
			var a = cpaths[i].split("=");
			var t = {
				key: (a.length < 2 ? defaultKeyStr : a[0]),
				value: (a.length > 1 ? a[1] : "")
			}
			tokens.push(t);
			tokens.dict[t.key] = t;
		}
		return tokens;
	}

	function findTokenForKey(tokens, key)
	{
		return tokens.dict[key ? key : defaultKeyStr];
	}
	
	function stripSubPageKey(newPath)
	{
		var splitkey = '&' + $.mobile.subPageUrlKey;
		return path && path.indexOf( splitkey ) > -1 ? path.split( splitkey )[0] : path;
	}

	$.mobile.locationHashSeparator = "$$";
	$.mobile.getLocationHash = getLocationHash;
	$.mobile.setLocationHash = setLocationHash;
	$.mobile.getLocationHashKeyValue = getLocationHashKeyValue;
	$.mobile.setLocationHashKeyValue = setLocationHashKeyValue;

	// XXX: Backwards compatibility. Either get rid of it, or rename setLocationHash().

	$.mobile.updateHash = getLocationHash;

	function getDirectoryFromPath(newPath)
	{
		if( newPath == undefined ){
			newPath = getLocationHash();
		}
		newPath = newPath.replace(/#/,'').split('/');
		if(newPath.length){
			var lastSegment = newPath[newPath.length-1];
			if( lastSegment.indexOf('.') > -1 || lastSegment == ''){
				newPath.pop();
			}
		}
		return newPath.join('/') + (newPath.length ? '/' : '');
	}

	origin = getDirectoryFromPath( location.protocol + '//' + location.host + location.pathname );

	$(document).bind("pagechanged", function(e,data) {
		setLocationHashValue(data.container, data.url, true);
	});


//***********************

		//base element management, defined depending on dynamic base tag support
		var base = $.support.dynamicBaseTag ? {

			//define base element, for use in routing asset urls that are referenced in Ajax-requested markup
			element: $("<base>", { href: path.origin }).prependTo( $head ),

			//set the generated BASE element's href attribute to a new page's base path
			set: function( href ){
				base.element.attr('href', path.origin + path.get( href ));
			},

			//set the generated BASE element's href attribute to a new page's base path
			reset: function(){
				base.element.attr('href', path.origin );
			}

		} : undefined,


		//define first selector to receive focus when a page is shown
		focusable = "[tabindex],a,button:visible,select:visible,input",

		//contains role for next page, if defined on clicked link via data-rel
		nextPageRole = null,

		//enable/disable hashchange event listener
		//toggled internally when location.hash is updated to match the url of a successful page load
		hashListener = true;


/*
	internal utility functions
--------------------------------------*/


/* exposed $.mobile methods	 */

	//update location.hash, with or without triggering hashchange event
	$.mobile.updateHash = path.set;

	//url stack, useful when plugins need to be aware of previous pages viewed
	$.mobile.urlStack = urlStack;

/* Event Bindings - hashchange, submit, and click */



	$window.bind( "hashchange", function(e, triggered) {
		if( !hashListener ){
			hashListener = true;
			return;
		}

		// XXX: Original code would bail if the active page was a dialog.
		//      we need to figure out if we need to do the same here.
		//
		// if( $(".ui-page-active").is("[data-role=" + $.mobile.nonHistorySelectors + "]") ){
		// 	return;
		// }


		var tkns = tokenizeLocationHash(),
			tcnt = tkns.length,
			transition = triggered ? false : undefined;

		if (triggered || tcnt == 0)
		{
			$(".ui-pagecontainer").each(function(){
				var $this = $(this);
				var t = findTokenForKey(tkns, $this.is("body") ? defaultKeyStr : this.id);
				$this.pagecontainer("changePage", t ? t.value : null, transition, false, false);
			});
		}
		else
		{
			// The hash changed, run through all of the items listed in the location.hash
			// and make sure the containers that are mentioned get updated.

			for (var i = 0; i < tcnt; i++)
			{
				var t = tkns[i];
				$(t.id == defaultKeyStr ? document.body : "#" + t.id).pagecontainer("changePage", t.value, transition, false, false);
			}
		}
	});

	//hashchange event handler
	$window.bind( "hashchange", function(e, triggered) {
		if( !hashListener ){
			hashListener = true;
			return;
		}

		if( $(".ui-page-active").is("[data-role=" + $.mobile.nonHistorySelectors + "]") ){
			return;
		}

		var to = location.hash,
			transition = triggered ? false : undefined;

		//if to is defined, use it
		if ( to ){
			$.mobile.changePage( to, transition, undefined, false);
		}
		//there's no hash, the active page is not the start page, and it's not manually triggered hashchange
		//we probably backed out to the first page visited
		else if( $.mobile.activePage.length && $.mobile.startPage[0] !== $.mobile.activePage[0] && !triggered ) {
			$.mobile.changePage( $.mobile.startPage, transition, true, false );
		}
		//probably the first page - show it
		else{
			$.mobile.startPage.trigger("pagebeforeshow", {prevPage: $('')});
			$.mobile.startPage.addClass( $.mobile.activePageClass );
			$.mobile.pageLoading( true );

			if( $.mobile.startPage.trigger("pageshow", {prevPage: $('')}) !== false ){
				reFocus($.mobile.startPage);
			}
		}
	});
})(jQuery, window, document);