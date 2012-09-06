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

function runExtensions( then ) {
    _.objOwnMapConcurrentExn( {
        extOpenSource: "osrc/ext",
        extClosedSource: "csrc/ext"
    }, function ( k, v, thro, ret ) {
        $util.dirDeepList( v, function ( e, paths ) {
            if ( e ) return void thro( e );
            ret( paths.filter( function ( path ) {
                return /\.x\.d\.html$/.test( path );
            } ) );
        } );
    }, function ( e ) {
        then( e || true );
    }, function ( lists ) {
        $util.arrFetchDataHtml(
            [].concat( lists.extOpenSource, lists.extClosedSource ),
            function ( extensionData ) {
            
            then( $cs.runExtensions(
                _.arrMap( extensionData, function ( extension ) {
                    // TODO: These expressions being executed do not
                    // have *any* free variables. See if we can
                    // execute them in their own contexts in order to
                    // enforce that kind of thing.
                    return $cs.run(
                        "(function ( $cs ) { return (" +
                            extension[ "text" ] + "); })"
                    )( $cs );
                } ).concat( [
                    $cs.extend( "fs", fs ),
                    $cs.extend( "$path", $path ),
                    $cs.extend( "argparse", argparse ),
                    
                    $cs.extend( "lathe", _ ),
                    $cs.extend( "$cg", $cg ),
                    $cs.extend( "$cs", $cs ),
                    
                    $cs.extend( "$util", $util ),
                    
                    $cs.extend( "process", process )
                ] )
            ) );
        } );
    } );
}

runExtensions( function ( extensions ) {
    var cliBuildCandidates = extensions[ "|" + "cliBuild" ] || [];
    if ( cliBuildCandidates.length !== 1 )
        throw "Couldn't even build cliBuild()!";
    
    cliBuildCandidates[ 0 ]( function ( e ) {
        if ( e ) throw e;
    } );
} );
