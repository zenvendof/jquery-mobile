/*
* jQuery Mobile Framework : "pagecontainer" plugin
* Copyright (c) jQuery Project
* Dual licensed under the MIT or GPL Version 2 licenses.
* http://jquery.org/license
*/
(function($, undefined ) {

$.widget( "mobile.pagecontainer", $.mobile.widget, {
	options: {
		loadingPageDelegate: "self" // "self" or "parent"
	},

	_create: function() {
		var $container = this.element
			self = this;

		this._$activeLinkClicked = null;
		this._$loader = null;
		this._urlStack = [];

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

	_handleLinkClick: function(e)
	{
		if( !$.mobile.ajaxLinksEnabled ){ return; }
		var $this = this.element,
			//get href, remove same-domain protocol and host
			href = $this.attr( "href" ).replace( location.protocol + "//" + location.host, ""),
			//if target attr is specified, it's external, and we mimic _blank... for now
			target = $this.is( "[target]" ),
			//if it still starts with a protocol, it's external, or could be :mailto, etc
			external = target || /^(:?\w+:)/.test( href ) || $this.is( "[rel=external]" );

		if( href === '#' ){
			//for links created purely for interaction - ignore
			return false;
		}

		$activeClickedLink = $this.closest( ".ui-btn" ).addClass( $.mobile.activeBtnClass );

		if( external || !$.mobile.ajaxLinksEnabled ){
			//remove active link class if external
			removeActiveLinkClass(true);

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
			var transition = $this.data( "transition" ),
				back = $this.data( "back" );

			nextPageRole = $this.attr( "data-rel" );

			// XXX_KIN: Need to fix this code here so that it gets the
			// hash path for the current container.

			//if it's a relative href, prefix href with base url
			if( href.indexOf('/') && href.indexOf('#') !== 0 ){
				href = path.get() + href;
			}

			href.replace(/^#/,'');

			$.mobile.changePage(href, transition, back);
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

		$.mobile.changePage({
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
});

})( jQuery );
