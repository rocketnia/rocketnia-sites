// choppascript.js

// Copyright (c) 2011 Ross Angle
//
//   Permission is hereby granted, free of charge, to any person
//   obtaining a copy of this software and associated documentation
//   files (the "Software"), to deal in the Software without
//   restriction, including without limitation the rights to use,
//   copy, modify, merge, publish, distribute, sublicense, and/or sell
//   copies of the Software, and to permit persons to whom the
//   Software is furnished to do so, subject to the following
//   conditions:
//
//   The above copyright notice and this permission notice shall be
//   included in all copies or substantial portions of the Software.
//
//   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
//   EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
//   OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
//   NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
//   HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
//   WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
//   FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
//   OTHER DEALINGS IN THE SOFTWARE.
//
// Permission to use this software is also granted under the
// Perl Foundation's Artistic License 2.0. You may use either license,
// at your option.

// TODO: Document the purpose of choppascript.js.


/*

NOTE: Some of the syntaxes defined here have *vaguely* the
progression:

[>- foo( [<- bar ], [<- baz ] ) ]
==>
[>-> g1  bar
     g2  baz
         [just foo( g1, g2 ) ]]
==>
[> [just monadBind( bar, [fn g1 = [next] ] ) ]
   [just monadBind( baz, [fn g2 = [next] ] ) ]
   [just foo( g1, g2 ) ]]

Among other slight differences, ">-" and ">->" don't bind "next".

*/


"use strict";

(function ( topThis, topArgs, body ) { body( topThis, topArgs ); })(
    this, typeof arguments === "undefined" ? void 0 : arguments,
    function ( topThis, topArgs ) {

// In Node.js, this whole file is semantically in a local context, and
// certain plain variables exist that aren't on the global object.
// Here, we get the global object in Node.js by taking advantage of
// the fact that it doesn't implement ECMAScript 5's strict mode.
var root = (function () { return this; })() || topThis;
// Actually, newer versions of Node don't expose the global object
// that way either, and they probably don't put the whole file in a
// local context.
if ( !((root && typeof root === "object" && root[ "Object" ])
    || typeof GLOBAL === "undefined") )
    root = GLOBAL;

var _, $c, my;
if ( topArgs === void 0 && typeof exports === "undefined" ) {
    _ = root.rocketnia.lathe;
    $c = root.rocketnia.chops;
    my = root.rocketnia.choppascript = {};
} else {
    // We assume Node.js and a flat directory.
    _ = require( "./lathe" );
    $c = require( "./chops" );
    my = exports;
}


function Splice( what ) { this.what = what; }

function splice( var_args ) {
    return new Splice( _.arrMappend( arguments, function ( it ) {
        return _.isString( it ) ? [ it ] : it;
    } ) );
}

function unsplice( elems ) {
    if ( elems instanceof Splice )
        return unsplice( [ elems ] );
    return _.arrMappend( elems, function ( it ) {
        return it instanceof Splice ? it.what : [ it ];
    } );
}

function resplice( elems ) {
    return splice.apply( null, unsplice( elems ) );
};


my.env = $c.env( {
    // These first few are actually useful.
    " block": function ( chops ) {
        return unsplice( chops ).join( "" );
    },
    "": function ( chops, env ) {
        return splice(
            "[", unsplice( $c.parseInlineChops( env, chops ) ), "]" );
    },
    "pct": function ( chops, env ) { return "%"; },
    "<": function ( chops, env ) { return "["; },
    ">": function ( chops, env ) { return "]"; },
    "just": function ( chops, env ) {
        return resplice( $c.parseInlineChops( env, chops ) );
    },
    "str": function ( chops, env ) {
        chops = $c.letChopLtrimRegex(
            chops, /^(?:(?!\n)\s)*[\n|]?/ ).rest;
        return "(" + _.arrMap( $c.unchops( chops ).split( /\n/g ),
            function ( line ) {
                return JSON.stringify( line );
            } ).join( " + \"\\n\" + " ) + ")";
    },
    // The rest of these are more experimental than useful at this
    // point.
    "'": function ( chops, env ) {
        return "(" + _.arrMap(
            unsplice( $c.parseInlineChops( env,
                $c.letChopLtrimRegex(
                    chops, /^(?:(?!\n)\s)*[\n|]?/ ).rest
            ) ).join( "" ).split( /\n/g ),
            function ( line ) {
                return JSON.stringify( line );
            } ).join( " + \"\\n\" + " ) + ")";
    },
    ">-": function ( chops, env ) {
        var bindings = [];
        var locals = $c.envShadow( env, {
            "<-": function ( chops2, env2 ) {
                var param = _.gensym();
                bindings.push( { param: param, val: chops2 } );
                return param;
            }
        } );
        return _.arrFoldr(
            bindings, $c.parseInlineChops( locals, chops ),
            function ( binding, body ) {
                var val = $c.parseInlineChops( env, binding.val );
                return splice(
                    "(monadBind( (", unsplice( val ), "), ",
                        "function ( ", binding.param, " ) { ",
                            "return (", unsplice( body ), "); ",
                        "} ))" );
            } );
    },
    ">->": function ( chops, env ) {
        var words = $c.chopTrimTokens( chops, /\s+/g );
        var body = $c.parseInlineChops( env, words.pop() );
        return _.arrFoldr( _.arrPair( words ), body,
            function ( binding, body ) {
                var param = binding[ 0 ];
                var val = $c.parseInlineChops( env, binding[ 1 ] );
                return splice(
                    "(monadBind( (", unsplice( val ), "), ",
                        "function ( ", param, " ) { ",
                            "return (", unsplice( body ), "); ",
                        "} ))" );
            } );
    },
    ">>": function ( chops, env ) {
        var words = $c.chopTrimTokens( chops, /\s+/g );
        return _.arrFoldr(
            words, $c.parseInlineChops( env, words.pop() ),
            function ( template, next ) {
                var locals = $c.envShadow( env, {
                    "next": function () { return resplice( next ); }
                } );
                return resplice(
                    $c.parseInlineChops( locals, template ) );
            } );
    },
    "fn": function ( chops, env ) {
        var apart =
            $c.letChopLtrimRegex( chops, /^([\s_$a-z01-9]*)(:|=)/ );
        if ( !apart )
            throw new SyntaxError(
                "Chops can't parse this fn form." );
        var parms = _.arrKeep( apart.match[ 1 ].split( /\s+/g ),
            function ( it ) { return it !== ""; } ).join( ", " );
        if ( parms !== "" )
            parms = " " + parms + " ";
        var body = $c.parseInlineChops( env, apart.rest );
        if ( apart.match[ 2 ] === "=" )
            body = splice( "return (", unsplice( body ), ");" );
        return splice( "(function (", parms, ") { ", unsplice( body ),
            " })" );
    },
    "a": function ( chops, env ) {
        if ( $c.letChopWords( chops, 1 ) )
            return splice( "(lathe.arrCut( arguments, (",
                unsplice( $c.parseInlineChops( env, chops ) ),
            ") ))" );
        else
            return "(lathe.arrCut( arguments ))";
    },
    "foo": _.idfn
} );

my.parse = function ( source ) {
    return $c.parseChopcode( my.env, source );
};

my.run = function ( source ) {
    return _.almostGlobeval( my.parse( source ) );
};


// ===== An extension module system ==================================
// TODO: Figure out whether this system really belongs here with the
// rest of ChoppaScript.

function eachNonArr( x, func ) {
    // TODO: Stop taking up nonconstant stack space.
    function process( item ) {
        if ( _.likeArray( item ) )
            _.arrEach( item, process );
        else
            func( item )
    }
    process( x );
}

function Lead() {}

function LeadSplit() {}
LeadSplit.prototype = new Lead();
LeadSplit.prototype.init = function ( leads ) {
    this.leads_ = leads;
    return this;
};

function LeadExtendOtherThan() {}
LeadExtendOtherThan.prototype = new Lead();
LeadExtendOtherThan.prototype.init = function ( keys, next ) {
    this.keys_ = keys;
    this.next_ = next;
    return this;
};

function LeadExtendOnly() {}
LeadExtendOnly.prototype = new Lead();
LeadExtendOnly.prototype.init = function ( keys, next ) {
    this.keys_ = keys;
    this.next_ = next;
    return this;
};

function LeadGetAll() {}
LeadGetAll.prototype = new Lead();
LeadGetAll.prototype.init = function ( groups, then ) {
    this.groups_ = groups;
    this.then_ = then;
    return this;
};

function LeadExtend() {}
LeadExtend.prototype = new Lead();
LeadExtend.prototype.init = function ( group, extension ) {
    this.group_ = group;
    this.extension_ = extension;
    return this;
};

function toLead( x ) {
    // TODO: Make this use constant stack space.
    if ( x instanceof Lead )
        return x;
    else if ( _.likeArray( x ) )
        return new LeadSplit().init( _.arrMap( x, toLead ) );
    else
        throw new Error();
}

my.runExtensions = function ( extensions ) {
    var groups = {};
    var states = [];
    var visitedStates = [ { otherThan: {}, only: null,
        lead: toLead( extensions ) } ];
    function stateCanExtend( state, groupName ) {
        var safeKey = "|" + groupName;
        return !(_.hasOwn( state.otherThan || {}, safeKey )
            || (state.only !== null
                && !_.hasOwn( state.only, safeKey )));
    }
    while ( visitedStates.length !== 0 ) {
        states = visitedStates;
        visitedStates = [];
        var anythingHappened = false;
        while ( states.length !== 0 ) {
            
            var anythingHappenedThisTime = true;
            
            var state = states.shift();
            var lead = state.lead;
            if ( lead instanceof LeadSplit ) {
                _.arrEach( lead.leads_, function ( lead ) {
                    visitedStates.push( { otherThan: state.otherThan,
                        only: state.only, lead: toLead( lead ) } );
                } );
            } else if ( lead instanceof LeadExtendOtherThan ) {
                visitedStates.push( state.otherThan !== null ? {
                    otherThan: _.objOwnKeySetOr(
                        state.otherThan, lead.keys_ ),
                    only: null,
                    lead: toLead( lead.next_ )
                } : {
                    otherThan: null,
                    only:
                        _.objOwnKeySetMinus( state.only, lead.keys_ ),
                    lead: toLead( lead.next_ )
                } );
            } else if ( lead instanceof LeadExtendOnly ) {
                visitedStates.push( { otherThan: null,
                    only: state.otherThan !== null ?
                        _.objOwnKeySetMinus(
                            lead.keys_, state.otherThan ) :
                        _.objOwnKeySetMask( state.only, lead.keys_ ),
                    lead: toLead( lead.next_ ) } );
            } else if ( lead instanceof LeadGetAll ) {
                var allStates = states.concat( visitedStates );
                // TODO: See if this needs to be more efficient.
                if ( _.arrAny( allStates, function ( state ) {
                        return _.arrAny( lead.groups_,
                            function ( group ) {
                            
                            return stateCanExtend( state, group );
                        } );
                    } ) ) {
                    anythingHappenedThisTime = false;
                    visitedStates.push( state );
                } else {
                    visitedStates.push( { otherThan: state.otherThan,
                        only: state.only,
                        lead: toLead( lead.then_(
                            _.arrMap( lead.groups_, function ( g ) {
                                return groups[ "|" + g ] || [];
                            } ) ) ) } );
                }
            } else if ( lead instanceof LeadExtend ) {
                var safeKey = "|" + lead.group_;
                if ( !stateCanExtend( state, lead.group_ ) )
                    throw new Error();
                // TODO: See if this needs to be more efficient.
                groups[ safeKey ] = (groups[ safeKey ] || []).concat(
                    [ lead.extension_ ] );
            } else {
                throw new Error();
            }
            if ( anythingHappenedThisTime )
                anythingHappened = true;
        }
        if ( !anythingHappened )
            throw new Error( "Deadlock!" );
    }
    return groups;
};

my.extendOtherThan = function ( var_args, then ) {
    var args = _.arrCut( arguments );
    var then = args.pop();
    var keys = {};
    eachNonArr( args, function ( elem ) {
        if ( !_.isString( elem ) )
            throw new Error(
                "extendOtherThan: Not a string: " +
                JSON.stringify( elem ) );
        keys[ "|" + elem ] = 1;
    } );
    return new LeadExtendOtherThan().init( keys, then );
};
my.extendOnly = function ( var_args, then ) {
    var args = _.arrCut( arguments );
    var then = args.pop();
    var keys = {};
    eachNonArr( args, function ( elem ) {
        if ( !_.isString( elem ) )
            throw new Error();
        keys[ "|" + elem ] = 1;
    } );
    return new LeadExtendOnly().init( keys, then );
};
my.getAll = function ( var_args, then ) {
    // Accepts any number of strings and looks them up.
    var args = _.arrCut( arguments );
    var then = args.pop();
    return my.extendOtherThan( args,
        new LeadGetAll().init( args, function ( groups ) {
            return then.apply( null, groups );
        } ) );
};
my.extend = function ( group, extension ) {
    return new LeadExtend().init( group, extension );
};

my.getOne = function ( var_args ) {
    // Accepts any number of strings and looks them up. If a string's
    // group has exactly one extension, that extension is the result.
    // Otherwise, an exception is thrown.
    //
    // TODO: This should be able to get something even if more
    // extensions haven't been ruled out yet. (If an extension does
    // come up, the error will happen then.) Make it so.
    
    var args = _.arrCut( arguments );
    var then = args.pop();
    return my.getAll.apply( null, args.concat( [
        function ( var_args ) {
        
        return then.apply( null, _.arrMap( arguments,
            function ( extensions, i ) {
            
            var n = extensions.length;
            if ( n === 1 )
                return extensions[ 0 ];
            else
                throw new Error(
                    "getOne: Must have 1 extension. Found " +
                    n + ". Group: " + args[ i ] );
        } ) );
    } ] ) );
};

my.getOptional = function ( var_args, then ) {
    // Accepts any number of strings and looks them up. If a string's
    // group has zero extensions, the result is null. If it has one
    // extension, that extension is the result. If it has more than
    // one extension, an exception is thrown.
    //
    // TODO: This should be able to get something even if more
    // extensions haven't been ruled out yet. (If an extension does
    // come up, the error will happen then.) Make it so.
    
    var args = _.arrCut( arguments );
    var then = args.pop();
    return my.getAll.apply( null, args.concat( [
        function ( var_args ) {
        
        return _.funcApply( null, then, _.arrMap( arguments,
            function ( extensions, i ) {
            
            var n = extensions.length;
            if ( n === 0 )
                return null;
            else if ( n === 1 )
                return extensions[ 0 ];
            else
                throw new Error(
                    "getOptional: Must have 0 or 1 extensions. " +
                    "Found " + n + ". Group: " + args[ i ] );
        } ) );
    } ] ) );
};



} );
