/*
* jQuery Mobile Framework : "pagecontainer" plugin
* Copyright (c) jQuery Project
* Dual licensed under the MIT or GPL Version 2 licenses.
* http://jquery.org/license
*/
(function($, undefined ) {

	//define first selector to receive focus when a page is shown
var focusable = "[tabindex],a,button:visible,select:visible,input";

	//contains role for next page, if defined on clicked link via data-rel
	nextPageRole = null;


// Framework Navigation
//     - Location Hash Management
//     - Ajax Loading
//     - Base Tag Management
//
//     - Observes
//         - Page Containers
//             - beforepagecontainerpageload
//                 - Cancels default pagecontainer click handling
//
// Page Container
//     - Link Hijacking
//         - Notifications
//             - pagecontainerlinkclick
//             - beforepagecontainerpageload
//;            - pagecontainerpageload
//     - Form Submit Hijacking
//         - Notifications
//             - pagecontainerforumsubmit
//     - Page Loading Message
//     - Page Error Loading Message
//     - Stack Management
//         - Notifications
//             - pagecontainerpush
//             - pagecontainerpop
//         - Primitives
//             - pushStack()
//             - popStack()
//     - Back Button Injection
//     - Page Transitions

$.widget( "mobile.pagecontainer", $.mobile.widget, {
	options: {
		loadingPageDelegate: "self" // "self" or "parent"
	},

	_create: function() {
		var $container = this.element
			self = this;

		this._$activeLinkClicked = null;
		this._$loader = null;
		this._urlStack = [ {
			url: $.mobile.getLocationHashKeyValue($container[0].id),
			transition: undefined
		} ];

		if (this.options.loadingPageDelegate == "self")
		{
			this._$loader = $('<div class="ui-loader ui-body-a ui-corner-all">'+
						'<span class="ui-icon ui-icon-loading spin"></span>'+
						'<h1>'+ $.mobile.loadingMessage +'</h1>'+
						'</div>').appendTo($container);
		}

		$container.addClass("ui-mobile-viewport ui-pagecontainer");

		var $pages = $container.find("[data-role='page']");

		$pages.each(function(){
			$(this).attr('data-url', $(this).attr('id'));
		});

		this._$startPage = this._$activePage = $pages.first();
		
		//cue page loading message
		this.showPageLoading();
		
		//initialize all pages present
		$pages.page();

		$container
			.delegate("a", "click", function(e){ return self._handleClick(e); })
			.delegate("form", "submit", function(e){ return self._handleFormSubmit(e); });
	},

	showPageLoading: function()
	{
		this.element.addClass("ui-loading");
	},

	hidePageLoading: function()
	{
		this.element.removeClass("ui-loading");
	},

	_removeActiveLinkClass: function( forceRemoval ) {
		var $acl = this._$activeClickedLink;
		if( !!$acl && (!$acl.closest( '.ui-page-active' ).length || forceRemoval )){
			$acl.removeClass( $.mobile.activeBtnClass );
		}
		this._$activeClickedLink = null;
	},

	_handleLinkClick: function(e)
	{
		if( !$.mobile.ajaxLinksEnabled ){ return; }
		var $link = $(e.target),
			//get href, remove same-domain protocol and host
			href = $link.attr( "href" ).replace( location.protocol + "//" + location.host, ""),
			//if target attr is specified, it's external, and we mimic _blank... for now
			target = $link.is( "[target]" ),
			//if it still starts with a protocol, it's external, or could be :mailto, etc
			external = target || /^(:?\w+:)/.test( href ) || $link.is( "[rel=external]" );

		if( href === '#' ){
			//for links created purely for interaction - ignore
			return false;
		}

		this._$activeClickedLink = $link.closest( ".ui-btn" ).addClass( $.mobile.activeBtnClass );

		if( external || !$.mobile.ajaxLinksEnabled ){
			//remove active link class if external
			this._removeActiveLinkClass(true);

			//deliberately redirect, in case click was triggered
			if( target ){
				window.open(href);
			}
			else{
				location.href = href;
			}
		}
		else {
			//use ajax
			var transition = $link.data( "transition" ),
				back = $link.data( "back" );

			nextPageRole = $link.attr( "data-rel" );

			//if it's a relative href, prefix href with base url
			if( href.indexOf('/') && href.indexOf('#') !== 0 ){
				href = $.mobile.getLocationHashPathForContainer(this.element[0].id) + href;
			}

			href.replace(/^#/,'');

			this.changePage(href, transition, back);
		}
		event.preventDefault();
	},

	_handleFormSubmit: function(e)
	{
		if( !$.mobile.ajaxFormsEnabled ){ return; }

		var type = $(this).attr("method"),
			url = $(this).attr( "action" ).replace( location.protocol + "//" + location.host, "");

		//external submits use regular HTTP
		if( /^(:?\w+:)/.test( url ) ){
			return;
		}

		//if it's a relative href, prefix href with base url
		if( url.indexOf('/') && url.indexOf('#') !== 0 ){
			url = path.get() + url;
		}

		this.changePage({
				url: url,
				type: type,
				data: $(this).serialize()
			},
			undefined,
			undefined,
			true
		);
		event.preventDefault();
	},

	pushStack: function(to, transition)
	{
		this.trigger("pagecontainerpush");
	},

	popStack: function()
	{
		this.trigger("pagecontainerpop");
	},

	_reFocus: function(page)
	{
		var pageTitle = page.find(".ui-title:eq(0)");
		if( pageTitle.length ){
			pageTitle.focus();
		}
		else{
			page.find( focusable ).eq(0).focus();
		}
	},

	changePage: function(to, transition, back, changeHash)
	{
		//from is always the currently viewed page
		var toIsArray = $.type(to) === "array",
			from = toIsArray ? to[0] : this._$activePage,
			to = toIsArray ? to[1] : to,
			url = fileUrl = $.type(to) === "string" ? to.replace( /^#/, "" ) : null,
			data = undefined,
			type = 'get',
			isFormRequest = false,
			duplicateCachedPage = null,
			back = (back !== undefined) ? back : ( urlStack.length > 1 && urlStack[ urlStack.length - 2 ].url === url );

		//If we are trying to transition to the same page that we are currently on ignore the request.
		if(urlStack.length > 1 && url === urlStack[urlStack.length -1].url && !toIsArray ) {
			return;
		}

		if( $.type(to) === "object" && to.url ){
			url = to.url,
			data = to.data,
			type = to.type,
			isFormRequest = true;
			//make get requests bookmarkable
			if( data && type == 'get' ){
				url += "?" + data;
				data = undefined;
			}
		}

		//reset base to pathname for new request
		if(base){ base.reset(); }

		//kill the keyboard
		$( window.document.activeElement ).add(':focus').blur();

		function defaultTransition(){
			if(transition === undefined){
				transition = $.mobile.defaultTransition;
			}
		}

		// if the new href is the same as the previous one
		if ( back ) {
			var pop = urlStack.pop();

			// prefer the explicitly set transition
			if( pop && !transition ){
				transition = pop.transition;
			}

			// ensure a transition has been set where pop is undefined
			defaultTransition();
		} else {
			// If no transition has been passed
			defaultTransition();

			// push the url and transition onto the stack
			urlStack.push({ url: url, transition: transition });
		}

		//function for transitioning between two existing pages
		function transitionPages() {

			//get current scroll distance
			var currScroll = $window.scrollTop(),
					perspectiveTransitions = ["flip"],
          pageContainerClasses = [];

			//set as data for returning to that spot
			from.data('lastScroll', currScroll);

			//trigger before show/hide events
			from.data("page")._trigger("beforehide", {nextPage: to});
			to.data("page")._trigger("beforeshow", {prevPage: from});

			function loadComplete(){
				$.mobile.pageLoading( true );

				reFocus( to );

				if( changeHash !== false && url ){
					path.set(url, (back !== true));
				}
				removeActiveLinkClass();

				//if there's a duplicateCachedPage, remove it from the DOM now that it's hidden
				if( duplicateCachedPage != null ){
					duplicateCachedPage.remove();
				}

				//jump to top or prev scroll, if set
				$.mobile.silentScroll( to.data( 'lastScroll' ) );

				//trigger show/hide events, allow preventing focus change through return false
				from.data("page")._trigger("hide", null, {nextPage: to});
				if( to.data("page")._trigger("show", null, {prevPage: from}) !== false ){
					$.mobile.activePage = to;
				}
			};

			function addContainerClass(className){
				$.mobile.pageContainer.addClass(className);
				pageContainerClasses.push(className);
			};

			function removeContainerClasses(){
				$.mobile
					.pageContainer
					.removeClass(pageContainerClasses.join(" "));

				pageContainerClasses = [];
			};

			if(transition && (transition !== 'none')){
				if( perspectiveTransitions.indexOf(transition) >= 0 ){
					addContainerClass('ui-mobile-viewport-perspective');
				}

				addContainerClass('ui-mobile-viewport-transitioning');

				// animate in / out
				from.addClass( transition + " out " + ( back ? "reverse" : "" ) );
				to.addClass( $.mobile.activePageClass + " " + transition +
					" in " + ( back ? "reverse" : "" ) );

				// callback - remove classes, etc
				to.animationComplete(function() {
					from.add( to ).removeClass("out in reverse " + transition );
					from.removeClass( $.mobile.activePageClass );
					loadComplete();
					removeContainerClasses();
				});
			}
			else{
				from.removeClass( $.mobile.activePageClass );
				to.addClass( $.mobile.activePageClass );
				loadComplete();
			}
		};

		//shared page enhancements
		function enhancePage(){

			//set next page role, if defined
			if ( nextPageRole || to.data('role') == 'dialog' ) {
				changeHash = false;
				if(nextPageRole){
					to.attr( "data-role", nextPageRole );
					nextPageRole = null;
				}
			}

			//run page plugin
			to.page();
		};

		//if url is a string
		if( url ){
			to = $( "[data-url='" + url + "']" );
			fileUrl = path.getFilePath(url);
		}
		else{ //find base url of element, if avail
			var toID = to.attr('data-url'),
				toIDfileurl = path.getFilePath(toID);

			if(toID != toIDfileurl){
				fileUrl = toIDfileurl;
			}
		}

		// find the "to" page, either locally existing in the dom or by creating it through ajax
		if ( to.length && !isFormRequest ) {
			if( fileUrl && base ){
				base.set( fileUrl );
			}
			enhancePage();
			transitionPages();
		} else {

			//if to exists in DOM, save a reference to it in duplicateCachedPage for removal after page change
			if( to.length ){
				duplicateCachedPage = to;
			}

			$.mobile.pageLoading();

			$.ajax({
				url: fileUrl,
				type: type,
				data: data,
				success: function( html ) {
					if(base){ base.set(fileUrl); }

					var all = $("<div></div>");
					//workaround to allow scripts to execute when included in page divs
					all.get(0).innerHTML = html;
					to = all.find('[data-role="page"], [data-role="dialog"]').first();

					//rewrite src and href attrs to use a base url
					if( !$.support.dynamicBaseTag ){
						var newPath = path.get( fileUrl );
						to.find('[src],link[href]').each(function(){
							var thisAttr = $(this).is('[href]') ? 'href' : 'src',
								thisUrl = $(this).attr(thisAttr);

							//if full path exists and is same, chop it - helps IE out
							thisUrl.replace( location.protocol + '//' + location.host + location.pathname, '' );

							if( !/^(\w+:|#|\/)/.test(thisUrl) ){
								$(this).attr(thisAttr, newPath + thisUrl);
							}
						});
					}

					to
						.attr( "data-url", fileUrl )
						.appendTo( $.mobile.pageContainer );

					enhancePage();
					transitionPages();
				},
				error: function() {
					$.mobile.pageLoading( true );
					removeActiveLinkClass(true);
					base.set(path.get());
					$("<div class='ui-loader ui-overlay-shadow ui-body-e ui-corner-all'><h1>Error Loading Page</h1></div>")
						.css({ "display": "block", "opacity": 0.96, "top": $(window).scrollTop() + 100 })
						.appendTo( $.mobile.pageContainer )
						.delay( 800 )
						.fadeOut( 400, function(){
							$(this).remove();
						});
				}
			});
		}
	}
});

//animation complete callback
$.fn.animationComplete = function( callback ){
	if($.support.cssTransitions){
		return $(this).one('webkitAnimationEnd', callback);
	}
	else{
		callback();
	}
};

})( jQuery );
