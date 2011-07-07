/*!
 * jQuery Mobile v@VERSION
 * http://jquerymobile.com/
 *
 * Copyright 2010, jQuery Project
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 */

(function( $, window, undefined ) {

/**
 * Runs a transition on the element specified by the animation classes passed as first argument
 * (cp. jquery.mobile.transitions.css) and calls a callback once they're done.
 *
 * If the callback event has not been triggered after <timeout> milliseconds, the callback is
 * called "manually". The optional third argument allows you to define a custom timeout or
 * disable it completely (by passing 0 or false).
 */
$.fn.jqmTransition = function( classes, callback, timeout ) {
	if ( typeof timeout == "undefined" ) {
		timeout = 1000;
	}
	if ( $.support.cssTransitions ) {
		var $this = $( this );
		var fallbackTimeout = null;
		var handler = function() {
			if ( fallbackTimeout ) {
				clearTimeout( fallbackTimeout );
			}
			var result = callback ? callback.apply( this, arguments ) : undefined;
			$this.removeClass( "animate " + classes );
			return result;
		};
		$this.one( "transitionend webkitTransitionEnd OTransitionEnd", handler );
		if ( timeout ) {
			fallbackTimeout = setTimeout( handler, timeout );
		}
		// add animate class to start animation
		$this.addClass( classes );
		setTimeout(function() {
			$this.addClass( "animate" );
		}, 25 );
		return $this;
	} else {
		// defer execution for consistency between webkit/non webkit
		setTimeout( callback, 25 );
		return $( this );
	}
};

function css3TransitionHandler(name, reverse, $to, $from) {
	var deferred = new $.Deferred(),
		reverseClass = reverse ? " reverse" : "",
		viewportClass = "ui-mobile-viewport-transitioning viewport-" + name,
		doneFunc = function() {
			$to.add( $from ).removeClass( "out in reverse " + name );
			if ( $from ) {
				$from.removeClass( $.mobile.activePageClass );
			}
			$to.parent().removeClass( viewportClass );

			deferred.resolve( name, reverse, $to, $from );
		};

	$to.parent().addClass( viewportClass );
	if ( $from ) {
		$from.jqmTransition( name + " out" + reverseClass );
	}
	$to.addClass( $.mobile.activePageClass ).jqmTransition( name + " in" + reverseClass, doneFunc );

	return deferred.promise();
}

// Make our transition handler public.
$.mobile.css3TransitionHandler = css3TransitionHandler;

// If the default transition handler is the 'none' handler, replace it with our handler.
if ( $.mobile.defaultTransitionHandler === $.mobile.noneTransitionHandler ) {
	$.mobile.defaultTransitionHandler = css3TransitionHandler;
}

})( jQuery, this );
