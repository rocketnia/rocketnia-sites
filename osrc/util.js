"use strict";

var fs = require( "fs" );
var $path = require( "path" );

var _ = require( "../buildlib/lathe.js" );


var $util = exports;

// ===== General-use utils ===========================================

// This should work on most versions of Node.
$util.exists = function ( path, then ) {
    if ( fs.exists )
        fs.exists( path, then );
    else
        $path.exists( path, then );
};

$util.stat = function ( path, then ) {
    $util.exists( path, function ( exists ) {
        if ( !exists )
            return void then( null, null );
        fs.stat( path, function ( e, stats ) {
            if ( e ) return void then( e );
            then( null, stats );
        } );
    } );
};

$util.ensureDirOptimistic = function ( path, then ) {
    if ( path === "." || path === "/" )
        return void _.defer( function () {
            then();
        } );
    $util.stat( path, function ( e, stats ) {
        if ( e ) return void then( e );
        if ( stats === null )
            $util.ensureDirOptimistic( $path.dirname( path ),
                function ( e ) {
                
                if ( e ) return void then( e );
                // TODO: See what permissions to create it with.
                fs.mkdir( path, function ( e ) {
                    if ( e ) return void then( e );
                    then();
                } );
            } );
        else if ( stats.isDirectory() )
            then();
        else
            then(
                "ensureDirOptimistic: A non-directory already " +
                "exists at " + path );
    } );
};

var ensureDirMutex = _.makeMutex();
$util.ensureDir = function ( path, then ) {
    ensureDirMutex.lock( function ( then ) {
        $util.ensureDirOptimistic( path, function ( e ) {
            then( e );
        } );
    }, function ( e ) {
        if ( e ) return void then( e );
        then();
    } );
};

$util.rm = function ( path, then ) {
    $util.stat( path, function ( e, stats ) {
        if ( e ) return void then( e );
        if ( stats === null )
            then();
        else if ( stats.isFile() )
            fs.unlink( path, function ( e ) {
                if ( e ) return void then( e );
                then();
            } );
        else if ( stats.isDirectory() )
            fs.readdir( path, function ( e, children ) {
                if ( e ) return void then( e );
                _.arrEachConcurrentExn( children,
                    function ( i, child, thro, ret ) {
                    
                    $util.rm( path + "/" + child, function ( e ) {
                        if ( e ) return void thro( e );
                        ret();
                    } );
                }, function ( e ) {
                    then( e || true );
                }, function () {
                    fs.rmdir( path, function ( e ) {
                        if ( e ) return void then( e );
                        then();
                    } );
                } );
            } );
        else
            then( "rm: The item wasn't a file or directory." );
    } );
};

$util.dirDeepList = function ( path, then ) {
    var result = [];
    function accumDirDeepList( path, then ) {
        $util.stat( path, function ( e, stats ) {
            if ( e ) return void then( e );
            if ( stats === null ) {
                then();
            } else if ( stats.isFile() ) {
                result.push(
                    $path.normalize( path ).replace( /\\/g, "/" ) );
                then();
            } else if ( stats.isDirectory() ) {
                fs.readdir( path, function ( e, children ) {
                    if ( e ) return void then( e );
                    _.arrEachConcurrentExn( children,
                        function ( i, child, thro, ret ) {
                        
                        accumDirDeepList( path + "/" + child,
                            function ( e ) {
                            
                            if ( e ) return void thro( e );
                            ret();
                        } );
                    }, function ( e ) {
                        then( e || true );
                    }, function () {
                        then();
                    } );
                } );
            } else {
                then(
                    "dirDeepList: A non-file, non-directory was " +
                    "found." );
            }
        } );
    }
    accumDirDeepList( path, function ( e ) {
        if ( e ) return void then( e );
        then( null, result.sort( function ( a, b ) {
            // Sort subdirectories before files, but otherwise sort
            // directory elements alphabetically (using JavaScript's
            // a < b on strings).
            var as = a.split( /\//g ), an = as.length, aLast = an - 1;
            var bs = b.split( /\//g ), bn = bs.length, bLast = bn - 1;
            var i = 0;
            for ( ; i < aLast && i < bLast; i++ ) {
                var aItem = as[ i ];
                var bItem = bs[ i ];
                if ( aItem !== bItem )
                    return aItem < bItem ? -1 : 1;
            }
            if ( an !== bn )
                return bn - an;
            var aItem = as[ i ];
            var bItem = bs[ i ];
            return aItem === bItem ? 0 : aItem < bItem ? -1 : 1;
        } ) );
    } );
};

$util.cp = function ( fromPath, toPath, then ) {
    _.objOwnMapConcurrentExn( { from: fromPath, to: toPath },
        function ( i, path, thro, ret ) {
        
        $util.stat( path, function ( e, stats ) {
            if ( e ) return void thro( e );
            ret( stats );
        } );
    }, function ( e ) {
        then( e || true );
    }, function ( stats ) {
        if ( stats.from === null ) {
            return void then();
        } else if ( stats.from.isDirectory() ) {
            if ( stats.to === null ) {
                $util.ensureDir( toPath, function ( e ) {
                    if ( e ) return void then( e );
                    dirToDir();
                } );
            } else if ( stats.to.isDirectory() ) {
                dirToDir();
            } else {
                return void then(
                    "cp: Can't copy a directory over the top of a " +
                    "non-directory." );
            }
        } else if ( stats.from.isFile() ) {
            if ( stats.to === null ) {
                $util.ensureDir( $path.dirname( toPath ),
                    function ( e ) {
                    
                    if ( e ) return void then( e );
                    fileToNothing();
                } );
            } else if ( stats.to.isFile() ) {
                fs.unlink( toPath, function ( e ) {
                    if ( e ) return void then( e );
                    fileToNothing();
                } );
            } else {
                return void then(
                    "cp: Can't copy a file over the top of a " +
                    "non-file." );
            }
        } else {
            return void then(
                "cp: Can't copy a non-directory, non-file." );
        }
        function dirToDir() {
            fs.readdir( fromPath, function ( e, children ) {
                if ( e ) return void then( e );
                _.arrEachConcurrentExn( children,
                    function ( i, child, thro, ret ) {
                    
                    $util.cp( fromPath + "/" + child,
                        toPath + "/" + child, function ( e ) {
                        
                        if ( e ) return void thro( e );
                        ret();
                    } );
                }, function ( e ) {
                    then( e || true );
                }, function () {
                    then();
                } );
            } );
        }
        function fileToNothing() {
            // TODO: Make sure the mode transfers correctly.
            // TODO: Capture any errors.
            var fromStream = fs.createReadStream( fromPath );
            fromStream.on( "end", onEnd );
            fromStream.pipe( fs.createWriteStream(
                toPath, { mode: stats.from.mode } ) );
            function onEnd() {
                fs.utimes( toPath, stats.from.atime, stats.from.mtime,
                    function () {
                    // NOTE: Apparently fs.utimes() never reports any
                    // errors.
                    then();
                } );
            }
        }
    } );
};

$util.mv = function ( fromPath, toPath, then ) {
    $util.ensureDir( $path.dirname( toPath ), function ( e ) {
        if ( e ) return void then( e );
    fs.rename( fromPath, toPath, function ( e ) {
        if ( e ) return void then( e );
    then();
    } );
    } );
};

$util.writeTextFile = function ( path, encoding, string, then ) {
    $util.ensureDir( $path.dirname( path ), function ( e ) {
        if ( e ) return void then( e );
        fs.writeFile( path, string, encoding, function ( e ) {
            if ( e ) return void then( e );
            then();
        } );
    } );
};


// ===== Lathe-specific utils ========================================

// TODO: Check for characters that can't be represented in HTML, such
// such as carriage return.
$util.renderDataHtml = function ( type, text ) {
    if ( /\n/.test( type ) )
        return null;
    function escape( data ) {
        return data.replace( /(@+)/g, "@$1" ).
            replace( /<(\/|!)/g, "<@$1" );
    }
    return (
"<" + "!DOCTYPE html>\n" +
"<meta charset=\"utf-8\">\n" +
"<title><" + "/title>\n" +
"<script type=\"text/plain\" id=\"datahtml\">\n" +
escape( type ) + "\n" +
escape( text ) + "\n" +
"<" + "/script>\n" +
"<textarea style=\"width: 100%; height: 300px\" id=\"t\"" +
    "><" + "/textarea>\n" +
"<script>\n" +
"var m = /^\\n([^\\n]+)\\n((?:[^\\n]|\\n)*)\\n$/.exec(\n" +
"    document.getElementById( \"datahtml\" ).textContent.replace(\n" +
"        /@(@*)/g, \"$1\" ) );\n" +
"parent.postMessage( { hash: location.hash,\n" +
"    val: { type: m[ 1 ], text: m[ 2 ] } }, \"*\" );\n" +
"document.getElementById( \"t\" ).value = m[ 2 ];\n" +
"<" + "/script>\n" +
"<" + "/html>\n");
};


$util.arrFetchDataHtml = function ( paths, then ) {
    _.arrMapConcurrent( paths, function ( i, path, then ) {
        $util.exists( path, function ( exists ) {
            if ( !exists )
                return void then( null );
            fs.readFile( path, "utf-8", function ( e, dataHtml ) {
                if ( e ) throw e;
                then( _.parseDataHtml( dataHtml ) );
            } );
        } );
    }, function ( fetched ) {
        then( fetched );
    } );
};
$util.fetchDataHtml = function ( var_args ) {
    var paths = _.arrCut( arguments );
    var then = paths.pop();
    $util.arrFetchDataHtml( paths, function ( results ) {
        _.funcApply( null, then, results );
    } );
};
