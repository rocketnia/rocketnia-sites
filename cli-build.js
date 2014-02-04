#! /usr/bin/env node
"use strict";

var fs = require( "fs" );
var $path = require( "path" );
var argparse = require( "argparse" );

var _ = require( "./buildlib/lathe.js" );
var $cg = require( "./buildlib/chopsgen.js" );
var $cs = require( "./buildlib/choppascript.js" );

var $util = require( "./osrc/util.js" );


// ===== Build process ===============================================

$util.nodeRunExtensionsWith( "osrc/ext", "csrc/ext", [
    $cs.extend( "fs", fs ),
    $cs.extend( "$path", $path ),
    $cs.extend( "argparse", argparse ),
    
    $cs.extend( "lathe", _ ),
    $cs.extend( "$cg", $cg ),
    $cs.extend( "$cs", $cs ),
    
    $cs.extend( "$util", $util ),
    
    $cs.extend( "process", process )
], function ( extensions ) {
    var cliBuildCandidates = extensions[ "|" + "cliBuild" ] || [];
    if ( cliBuildCandidates.length !== 1 )
        throw "Couldn't even build cliBuild()!";
    
    cliBuildCandidates[ 0 ]( function ( e ) {
        if ( e ) throw e;
    } );
} );
