// rocketnia.com.js
//
// Copyright (c) 2011 Ross Angle

//"use strict";

(function () {

var root = window;
var my = (root.rocketnia || (root.rocketnia = {})).com = {};


var handle, unhandle;
if ( root.document.addEventListener ) {
    handle = function ( el, eventName, handler ) {
        el.addEventListener( eventName, handler, !"capture" );
    };
    unhandle = function ( el, eventName, handler ) {
        el.removeEventListener( eventName, handler, !"capture" );
    };
} else {  // IE
    handle = function ( el, eventName, handler ) {
        el.attachEvent( "on" + eventName, handler );
    };
    unhandle = function ( el, eventName, handler ) {
        el.detachEvent( "on" + eventName, handler );
    };
}


my.onceReady = function ( then ) {
    var pollsPerSecond = 10;
    
    handle( document, "readystatechange", poll );
    handle( root, "DOMContentLoaded", finish );
    handle( root, "load", finish );
    var interval = setInterval( poll, 1000 / pollsPerSecond );
    
    function poll() {
        if ( document.readyState === "complete" )
            finish();
    }
    var finished = false;
    function finish() {
        if ( finished )
            return;
        finished = true;
        
        unhandle( document, "readystatechange", poll );
        unhandle( root, "DOMContentLoaded", finish );
        unhandle( root, "load", finish );
        clearInterval( interval );
        
        then();
    }
};


})();
