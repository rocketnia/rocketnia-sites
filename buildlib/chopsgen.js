// chopsgen.js

// Copyright (c) 2011-2013, 2016, 2022 Rocketnia
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


// Chopsgen depends on chops.js and lathe.js, which are both available
// at <https://github.com/lathe/lathe-comforts-for-js>.
//
// Chopsgen is a static site generator framework which runs on
// JavaScript-in-the-browser. I'm using it together with JSZip
// (<http://jszip.stuartk.co.uk/>) and choppascript.js (part of Lathe)
// to maintain my website at <https://www.rocketnia.com/>.
//
// == Why Chopsgen? ==
//
// I'm mainly designing Chopsgen for my own purposes. I'm addicted to
// high-powered abstractions and clean modularity. In my free time, I
// don't want to work on copying and pasting HTML snippets, escaping
// special characters, manually resolving naming conflicts, and
// organizing my code in a strict directory structure... but I do have
// fun writing code like Chopsgen to do these steps for me. :)
//
// And I don't like the prospect of upgrading a website to the newest
// flavor of HTML. With Chopsgen, if I ever need to do that, I'll
// probably be most of the way done once I modify/extend Chopsgen
// itself.
//
// I favor static site generation because I have little to no need for
// any server-side logic, and it's very nice to be able to test on the
// local filesystem without running a server, or to toss it up onto
// some cheap or free static file hosting service. And I favor
// JavaScript-in-the-browser as a platform because it's frickin'
// everywhere. With Chopsgen, finally I don't have to go home and boot
// up my desktop to compile my site.
//
// == The Tech ==
//
// For maintaining site content, Chopsgen provides a Chops vocabulary
// for constructing hierarchies of "snippets". Some snippets render
// rather straightforwardly to HTML tags. Some just render to text.
// At least one (not shown here) renders to nothing at all but causes
// JavaScript and CSS dependencies to be added to the page.
//
// Here's a taste of what it looks like:
//
//   [h2 Example markup]
//   
//   This is a paragraph.
//   
//   So is this. It's automatically placed in a [code <p>] element.
//   You might like to visit these sites:
//   
//   [ul [li [out https://github.com/lathe Lathe].]
//       [li [out https://www.rocketnia.com/ My website,
//           Rocketnia.com].]]
//   
//   [em No way] is Markdown better than this, right? Personally, I
//   much prefer languages with regular structure and few special
//   characters. Such as, say, this markup language:
//   
//   [cpre indented [nochops
//   [h2 Example markup]
//   
//   Ceci n'est pas une balise [code <p>].]]
//   
//   As you can't see, thanks to this [code [nochops [nochops ...]]]
//   form, the square brackets are rendered as square brackets, with
//   no need for escaping. And we can easily use < and > without
//   escaping them either.
//
// Chopsgen is tailor-made for a site composed of a hierarchy of pages
// with URLs that end in the pattern "/dir1/dir2/dir3/.../", with "/"
// as the base case. By not hardcoding the "index.html" part, I hope
// to avoid a bunch of redirects to "index.php" or "index.jsp" or
// whatever in the future. At the same time, this allows people to
// interact with the address bar as though it's a breadcrumbs
// interface. (Am I the only one who does that? :-p )
//
// To further facilitate breadcrumbs and navigation, each Chopsgen
// page has a "name" snippet that other pages can import when they
// refer to that page in a hyperlink.
//
// In practice, I've never made a site big enough to need more than a
// single layer of hierarchy, so breadcrumb stuff hasn't really paid
// off for me yet.
//
// == Some History ==
//
// Before Chopsgen, Rocketnia.com was built with "pengen," an
// unreleased Arc program, which used Penknife
// (<https://github.com/rocketnia/penknife>, a programming language
// with syntax similar to Chops) as a markup language.
//
// Before that, Rocketnia.com was statically generated by a Groovy
// program with another Chops-like markup syntax. Before that, it was
// dynamically generated (wastefully!) as a PLT Scheme stateless
// servlet, using xexprs. Before that, it was just maintained as
// static files using ye olde copy and paste. :)


// TODO: In an ideal world, each page's (or even snippet's?) copyright
// and update dates would automatically prompt me to update them. Move
// in that direction.


// TODO: Deal with the following aspects of this library that might be
// a bit too coupled to rocketnia.com:
//
// Miscellaneous:
//  - The implicit assumption that /gs[01-9]+gs/ never appears on the
//    page except as generated via a NiceSnippet. This should be
//    strongly documented somewhere (not just hidden in a TODO here).
//  - The fact that [nav ...] links have no class attribute, while
//    [out ...] links do have the hardcoded "external-link" class.
//  - The fact that the "data-navlink" attribute and a certain
//    postMessage protocol is automatically inserted for previewing.
//
// Naming conflicts:
//  - Renderer state. It's monadic, but that's fine. Don't change
//    that. The issue is that when things take advantage of this
//    state, they look for particular strings as keys. It would be
//    nice to have a more modular approach to this.
//  - The page metadata for use on other pages. The only example of
//    this so far is the page name, which is used by NavLinks, but if
//    there are any more of these in the future, we might want to take
//    a more modular approach.
//
// Comprehensiveness:
//  - The lack of comprehensiveness in the snippetEnv vocabulary...
//    such as the lack of an [applet ...] op. :-p
//  - The lack of comprehensiveness in the CSS dependency support,
//    such as the inability to do once-only includes.
//  - The lack of comprehensiveness in the JS dependency support. It
//    would be nice to position certain JS code at the end of the
//    <body> or in a <script defer>.
//  - The lack of comprehensiveness in the NiceSnippet interface. The
//    "unstructured" code support is a good baseline, but there should
//    definitely be a way to use a snippet rather than unstructured
//    HTML.
//
// TODO: See if the unstructuredSnippetEnv vocabulary is comprehensive
// enough.


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
//
// The newest versions use a variable called "global". We were using
// "GLOBAL" for a while, but that's been deprecated. (I'm not sure
// whether "global" existed at the time.)
if ( !(root && typeof root === "object" && root[ "Object" ]) ) {
    if ( typeof global !== "undefined" )
        root = global;
    else if ( typeof GLOBAL !== "undefined" )
        root = GLOBAL;
}

var _, $c, my;
if ( topArgs === void 0 && typeof exports === "undefined" ) {
    _ = root.rocketnia.lathe;
    $c = root.rocketnia.chops;
    my = root.rocketnia.chopsgen = {};
} else {
    // We assume Node.js and a flat directory.
    _ = require( "./lathe" );
    $c = require( "./chops" );
    my = exports;
}


var nbsp = "\u00A0";
var copyright = "\u00A9";
var enDash = "\u2013";
var emDash = "\u2014";

// TODO: See if this is sufficient.
my.htmlEscape = function ( content ) {
    return content.
        replace( /&/g, "&amp;" ).  // must come first
        replace( /</g, "&lt;" ).
        replace( />/g, "&gt;" ).
        // TODO: See if the following can be removed.
        replace( /\u2013/g, "&ndash;" ).
        replace( /\u2014/g, "&mdash;" ).
        replace( /\u00A9/g, "&copy;" );
};

// TODO: See if this is sufficient.
function attrEscape( content ) {
    return my.htmlEscape( content ).  // must come first
        replace( "\"", "&quot;" ).
        replace( "'", "&#39;" );
}


function Snippet() {}
Snippet.prototype.toHtml = function ( path, state, opts ) {
    throw new Error( "Unimplemented." );
};
Snippet.prototype.toTitle = function () {
    throw new Error( "Unimplemented." );
};
Snippet.prototype.toUnstructuredPage = function ( path, state ) {
    throw new Error( "Unimplemented." );
};

function SnippetString() {}
SnippetString.prototype = new Snippet();
SnippetString.prototype.init_ = function ( string ) {
    this.string_ = string;
    return this;
};
SnippetString.prototype.toHtml = function ( path, state, opts ) {
    return { state: state, html: my.htmlEscape( this.string_ ) };
};
SnippetString.prototype.toTitle = function () {
    return my.htmlEscape( this.string_ );
};
SnippetString.prototype.toUnstructuredPage =
    function ( path, state ) {
    
    return { state: state, text: this.string_ };
};

function SnippetArray() {}
SnippetArray.prototype = new Snippet();
SnippetArray.prototype.init_ = function ( array ) {
    this.array_ = array;
    return this;
};
SnippetArray.prototype.toHtml = function ( path, state, opts ) {
    var snippetData = _.arrMap( this.array_, function ( it ) {
        var result = my.snippetToHtml( it, path, state, opts );
        state = result.state;
        return result;
    } );
    return {
        state: state,
        js: _.arrMappend( snippetData,
            function ( it ) { return it.js || []; } ),
        css: _.arrMappend( snippetData,
            function ( it ) { return it.css || []; } ),
        html: _.arrMap( snippetData, _.pluckfn( "html" ) ).join( "" )
    };
};
SnippetArray.prototype.toTitle = function () {
    return _.arrMap( this.array_, function ( it ) {
        return my.snippetToTitle( it );
    } ).join( "" );
};
SnippetArray.prototype.toUnstructuredPage = function ( path, state ) {
    var snippetText = _.arrMap( this.array_, function ( it ) {
        var result = my.snippetToUnstructuredPage( it, path, state );
        state = result.state;
        return result.text;
    } );
    return { state: state, text: snippetText.join( "" ) };
};

my.toSnippet = function ( x ) {
    if ( x instanceof Snippet )
        return x;
    else if ( _.isString( x ) )
        return new SnippetString().init_( "" + x );
    else if ( _.likeArray( x ) )
        return new SnippetArray().init_( _.arrCut( x ) );
    else
        throw new Error( "Not a snippet." );
};
my.snippetToHtml = function ( snippet, path, state, opts ) {
    return my.toSnippet( snippet ).toHtml( path, state, opts );
};
my.snippetToTitle = function ( snippet ) {
    return my.toSnippet( snippet ).toTitle();
};
my.snippetToUnstructuredPage = function ( snippet, path, state ) {
    return my.toSnippet( snippet ).toUnstructuredPage( path, state );
};

function relDirs( from, to ) {
    if ( to.length === 0 )
        return _.arrMap( from, _.kfn( "../" ) ).join( "" );
    else if ( from.length === 0 )
        return _.arrCut( to ).join( "/" ) + "/";
    else if ( from[ 0 ] === to[ 0 ] )
        return relDirs( _.arrCut( from, 1 ), _.arrCut( to, 1 ) );
    else
        return relDirs( from, [] ) + relDirs( [], to );
}

// This is used as an abstraction for paths in the directory structure
// of the static site, which also serve as URLs.
function Path( dirs, file ) {
    if ( !_.isString( file ) || _.arrAny( dirs, function ( it ) {
            return !_.isString( it ) || /^\.?\.?$|\?|#|^$/.test( it );
        } ) )
        throw new Error( "Invalid path." );
    this.dirs_ = dirs;
    this.file_ = file;
}

// When rendering a page that can be accessed from multiple places
// (particularly an error page), page-relative URLs ("foo.txt",
// "../foo.txt") don't work out so well. The next best thing is a
// host-relative URL ("/bar/foo.txt", "/foo.txt"), which we can only
// get if we know exactly what path the static site will be copied to
// on the host. That path is basePath.
//
// It's still marginally useful for consistent breadcrumb-rendering to
// know what the path is. That's realPath.
//
// TODO: See if there's a way to render breadcrumbs that avoids this
// mixing of concerns.
//
function MaskedPath( realPath, basePath ) {
    this.realPath_ = realPath;
    this.basePath_ = basePath;
}

my.toPath = function ( x, opt_base ) {
    if ( x instanceof Path || x instanceof MaskedPath ) {
        return x;
    } else if ( _.isString( x ) ) {
        var m = /^\/([^\/#?]*(?:[#?].*)?)$/.exec( x );
        if ( m ) return new Path( [], m[ 1 ] );
        m = /^\/((?:[^\/?#]+\/)*[^\/?#]+)\/([^\/#?]*(?:[#?].*)?)$/.
            exec( x );
        if ( m ) return new Path( m[ 1 ].split( "/" ), m[ 2 ] );
        if ( opt_base === void 0 ) return null;
        var base = my.toPath( opt_base );
        if ( !(base instanceof Path) )
            return null;
        var newDirs = base.dirs_.slice();
        while ( m = /^\.\.\/(.*)$/.exec( x ) ) {
            if ( newDirs.length === 0 )
                throw new Error(
                    "Can't toPath a relative path that uses ../ " +
                    "too many times." );
            newDirs.pop();
            x = m[ 1 ];
        }
        m = /^[^\/#?]*(?:[#?].*)?$/.exec( x );
        if ( m ) return new Path( newDirs, m[ 0 ] );
        m = /^((?:[^\/?#]+\/)*[^\/?#]+)\/([^\/#?]*(?:[#?].*)?)$/.
            exec( x );
        if ( m )
            return new Path(
                newDirs.concat( m[ 1 ].split( "/" ) ), m[ 2 ] );
        return null;
    }
    return null;
};

my.maskPath = function ( realPath, basePath ) {
    return new MaskedPath(
        my.toPath( realPath ), my.toPath( basePath ) );
};

Path.prototype.linkWouldBeRedundant = function ( base ) {
    return (base instanceof Path && _.jsonIso(
            [ this.dirs_, this.file_ ], [ base.dirs_, base.file_ ] ))
        || (base instanceof MaskedPath
            && this.linkWouldBeRedundant( base.realPath_ ));
};

MaskedPath.prototype.linkWouldBeRedundant = function ( base ) {
    throw new Error( "A MaskedPath is being linked to." );
};

Path.prototype.abs = function () {
    return _.arrMap( this.dirs_, function ( dir ) {
        return "/" + dir;
    } ).join( "" ) + "/" + this.file_;
};

MaskedPath.prototype.abs = function () {
    throw new Error( "A MaskedPath is being linked to." );
};

Path.prototype.toBaseTagSuffix = function () {
    return this.from( my.toPath( "/" ) );
};

MaskedPath.prototype.toBaseTagSuffix = function () {
    return this.basePath_.toBaseTagSuffix();
};

Path.prototype.plus = function ( child ) {
    if ( this.file_ !== "" )
        throw new Error( "Can't add a non-dir path to anything." );
    child = my.toPath( child );
    if ( !(child instanceof Path) )
        throw new Error( "Can't add a path to a non-Path." );
    return new Path( this.dirs_.concat( child.dirs_ ), child.file_ );
};

MaskedPath.prototype.plus = function ( child ) {
    throw new Error( "Can't add a MaskedPath to anything." );
};

Path.prototype.from = function ( base ) {
    if ( base instanceof MaskedPath )
        return base.basePath_.plus( this ).abs();
    return relDirs( base.dirs_, this.dirs_ ) + this.file_;
};

MaskedPath.prototype.from = function ( base ) {
    throw new Error( "A MaskedPath is being linked to." );
};

// This returns all the /-terminated paths contained in this one (even
// this one, if it's /-terminated). A / after a ? or # doesn't count.
Path.prototype.familyDirs = function () {
    var result = [];
    for ( var i = this.dirs_.length; 0 <= i; i-- )
        result.unshift( new Path( this.dirs_.slice( 0, i ), "" ) );
    return result;
};

MaskedPath.prototype.familyDirs = function () {
    throw new Error( "A MaskedPath is being linked to." );
};

function HtmlTag( name, attrs, body ) {
    if ( !/^[-:a-z][-:a-z01-9]*$/.test( name ) )
        throw new Error( "An HTML tag name was too weird to let " +
            "fly: " + JSON.stringify( name ) );
    var len = attrs.length;
    for ( var i = 0; i < len; i++ ) {
        var attr = attrs[ i ][ 0 ];
        if ( !/^[-:a-z]*$/.test( attr ) )
            throw new Error( "An attribute name was too weird to " +
                "let fly: " + JSON.stringify( attr ) );
        for ( var j = i + 1; j < len; j++ )
            if ( attrs[ j ][ 0 ] === attr )
                throw new Error( "At least two attribute names in " +
                    + "an HtmlTag were the same." );
    }
    
    this.name_ = name;
    this.attrs_ = attrs;
    this.body_ = body;
}
HtmlTag.prototype = new Snippet();
HtmlTag.prototype.toHtml = function ( path, state, opts ) {
    var name = this.name_;
    var openTag = "<" + name + _.arrMap( this.attrs_, function (
        kv ) {
        
        var v = kv[ 1 ];
        // TODO: Make Path a snippet with toUnstructuredPage.
        if ( v instanceof Path )
            v = v.from( path );
        var rendered = my.snippetToUnstructuredPage( v, path, state );
        state = rendered.state;
        return " " +
            kv[ 0 ] + "=" + "\"" + attrEscape( rendered.text ) + "\"";
    } ).join( "" ) + ">";
    var body = my.snippetToHtml( this.body_, path, state, opts );
    return { state: body.state, js: body.js, css: body.css,
        html: openTag + body.html + "</" + name + ">" };
};
HtmlTag.prototype.toTitle = function () {
    throw new Error( "Can't toTitle an HtmlTag." );
};
HtmlTag.prototype.toUnstructuredPage = function ( path, state ) {
    throw new Error( "Can't toUnstructuredPage an HtmlTag." );
};

my.tag = function ( name, var_args ) {
    var attrs = _.arrPair( _.arrCut( arguments, 1 ) );
    return function ( var_args ) {
        return new HtmlTag( name, attrs, _.arrCut( arguments ) );
    };
};

// This is a wrapper snippet that behaves just like its child but gets
// special treatment in the paragraph-separating algorithm (in
// snippetEnv[ " block" ]). In fact, these, strings, and Arrays are
// the only kinds of snippets that get special treatment there, so
// it's necessary to wrap any custom paragraph-like snippet in one of
// these so it doesn't get wrapped in a <p> element.
function BlockSnippet( snippet ) {
    this.snippet_ = snippet;
}
BlockSnippet.prototype = new Snippet();
BlockSnippet.prototype.toHtml = function ( path, state, opts ) {
    return my.snippetToHtml( this.snippet_, path, state, opts );
};
BlockSnippet.prototype.toTitle = function () {
    throw new Error( "Can't toTitle a BlockSnippet." );
};
BlockSnippet.prototype.toUnstructuredPage = function ( path, state ) {
    throw new Error( "Can't toUnstructuredPage a BlockSnippet." );
};

my.blockSnippet = function ( snippet ) {
    return new BlockSnippet( snippet );
};

function getPage( state, path ) {
    if ( !(_.likeObjectLiteral( state ) && "pages" in state) )
        return null;
    var pages = state[ "pages" ];
    if ( !_.likeObjectLiteral( pages ) )
        return null;
    return pages[ my.toPath( path ).abs() ];
}

function NavLink( path, content ) {
    this.path_ = path;
    this.content_ = content;
}
NavLink.prototype = new Snippet();
NavLink.prototype.toHtml = function ( path, state, opts ) {
    // TODO: See if we should be hardcoding "index.html" here.
    // What about index.php?
    return my.snippetToHtml(
        this.path_.linkWouldBeRedundant( path ) ? this.content_ :
            my.tag( "a",
                opts.mock ? "data-navlink" : "href",
                this.path_.plus(
                    opts.forFileUri ? "/index.html" : "/" )
            )( this.content_ ),
        path, state, opts );
};
NavLink.prototype.toTitle = function () {
    throw new Error( "Can't toTitle a NavLink." );
};
NavLink.prototype.toUnstructuredPage = function ( path, state ) {
    throw new Error( "Can't toUnstructuredPage a NavLink." );
};

function NameNavLink( path ) {
    this.path_ = path;
}
NameNavLink.prototype = new Snippet();
NameNavLink.prototype.toHtml = function ( path, state, opts ) {
    var name = getPage( state, this.path_ ).name;
    return my.snippetToHtml(
        this.path_.linkWouldBeRedundant( path ) ? name :
            new NavLink( this.path_, name ),
        path, state, opts );
};
NameNavLink.prototype.toTitle = function () {
    throw new Error( "Can't toTitle a NameNavLink." );
};
NameNavLink.prototype.toUnstructuredPage = function ( path, state ) {
    throw new Error( "Can't toUnstructuredPage a NameNavLink." );
};

my.nameNavLink = function ( path ) {
    return new NameNavLink( path );
};

function HtmlRawSnippet( html ) {
    this.html_ = html;
}
HtmlRawSnippet.prototype = new Snippet();
HtmlRawSnippet.prototype.toHtml = function ( path, state, opts ) {
    return { state: state, html: this.html_ };
};
HtmlRawSnippet.prototype.toTitle = function () {
    throw new Error( "Can't toTitle an HtmlRawSnippet." );
};
HtmlRawSnippet.prototype.toUnstructuredPage =
    function ( path, state ) {
    
    throw new Error( "Can't toUnstructuredPage an HtmlRawSnippet." );
};

function DepsSnippet( deps ) {
    this.js_ = _.arrCut( deps.js || [] );
    this.css_ = _.arrCut( deps.css || [] );
}
DepsSnippet.prototype = new Snippet();
DepsSnippet.prototype.toHtml = function ( path, state, opts ) {
    return { state: state, js: this.js_, css: this.css_, html: "" };
};
DepsSnippet.prototype.toTitle = function () {
    throw new Error( "Can't toTitle a DepsSnippet." );
};
DepsSnippet.prototype.toUnstructuredPage = function ( path, state ) {
    throw new Error( "Can't toUnstructuredPage a DepsSnippet." );
};

my.depsSnippet = function ( deps, body ) {
    return [ my.blockSnippet( new DepsSnippet( deps ) ), body ];
};


function JsIncludeOnce( deps ) {
    this.deps_ = deps;
}

var includeOnceJsObjects = {};
function includeOnceJs( url ) {
    return includeOnceJsObjects[ url ] ||
        (includeOnceJsObjects[ url ] = new JsIncludeOnce(
            [ { "type": "external", "url": url } ] ));
}

function pushState( state, dynavar, val ) {
    if ( !_.likeObjectLiteral( state ) )
        throw new Error( "The state wasn't of the right type." );
    if ( !(dynavar in state) )
        return _.copdate( state, dynavar, _.kfn( [ val ] ) );
    if ( !_.likeArray( state[ dynavar ] ) )
        throw new Error( "The state wasn't of the right type." );
    return _.copdate( state, dynavar, function ( stack ) {
        return _.arrPlus( [ val ], stack );
    } );
}

function unpushState( state, dynavar ) {
    if ( !(_.likeObjectLiteral( state ) && dynavar in state
        && _.likeArray( state[ dynavar ] )) )
        throw new Error( "The state wasn't of the right type." );
    return _.copdate( state, dynavar, function ( stack ) {
        if ( stack.length === 0 )
            throw new Error( "There weren't enough to unpush." );
        return _.arrCut( stack, 1 );
    } );
}

function NiceSnippet( details ) {
    var js = [];
    var css = [];
    var html = [];
    function stateless( result ) {
        return function ( tok, path, state ) {
            return { "state": state, "val": result };
        };
    }
    function process( k, v ) {
        if ( _.likeArray( v ) )
            return void _.arrEach( v, function( v ) {
                process( k, v );
            } );
        if ( k === "includeOnceJs" ) {
            js.push( stateless( includeOnceJs( v ) ) );
        } else if ( k === "unstructuredJs" ) {
            var snippet = my.parseUnstructured( v );
            js.push( function ( tok, path, state ) {
                state = pushState( state, "token", tok );
                var rendered = my.snippetToUnstructuredPage(
                    snippet, path, state );
                state = unpushState( rendered.state, "token" );
                return { state: state,
                    val: { type: "embedded", code: rendered.text } };
            } );
        } else if ( k === "unstructuredCss" ) {
            var snippet = my.parseUnstructured( v );
            css.push( function ( tok, path, state ) {
                state = pushState( state, "token", tok );
                var rendered = my.snippetToUnstructuredPage(
                    snippet, path, state );
                state = unpushState( rendered.state, "token" );
                return { state: state,
                    val: { type: "embedded", code: rendered.text } };
            } );
        } else if ( k === "unstructuredHtml" ) {
            var snippet = my.parseUnstructured( v );
            html.push( function ( tok, path, state, opts ) {
                state = pushState( state, "token", tok );
                var rendered = my.snippetToUnstructuredPage(
                    snippet, path, state );
                state = unpushState( rendered.state, "token" );
                return { state: state, js: [], css: [],
                    html: rendered.text };
            } );
        } else if ( k === "snippetHtml" ) {
            html.push( function ( tok, path, state, opts ) {
                state = pushState( state, "token", tok );
                var rendered =
                    my.snippetToHtml( v, path, state, opts );
                state = unpushState( rendered.state, "token" );
                return { state: state, js: rendered.js,
                    css: rendered.css, html: rendered.html };
            } );
        } else {
            throw new Error( "Unrecognized snippet() keyword arg." );
        }
    }
    _.arrEach( details, function ( detail ) {
        _.objOwnEach( detail, process );
    } );
    this.js_ = js;
    this.css_ = css;
    this.html_ = html;
}
NiceSnippet.prototype = new Snippet();
NiceSnippet.prototype.toHtml = function ( path, state, opts ) {
    // TODO: Beware overflow... but note that if we ever have more
    // than 2^53 NiceSnippets on one page, we'll have much bigger
    // problems to deal with than just this one case of overflow. :-p
    var tok = "gs" + state[ "counter" ] + "gs";
    state = _.copdate( state, "counter",
        function ( it ) { return it + 1 } );
    var js = [];
    var css = [];
    var html = [];
    _.arrEach( this.js_, function ( jsFunc ) {
        var monad = jsFunc( tok, path, state );
        js.push( monad[ "val" ] );
        state = monad[ "state" ];
    } );
    _.arrEach( this.css_, function ( cssFunc ) {
        var monad = cssFunc( tok, path, state );
        css.push( monad[ "val" ] );
        state = monad[ "state" ];
    } );
    _.arrEach( this.html_, function ( htmlFunc ) {
        var monad = htmlFunc( tok, path, state, opts );
        js = js.concat( monad[ "js" ] );
        css = css.concat( monad[ "css" ] );
        html.push( monad[ "html" ] );
        state = monad[ "state" ];
    } );
    return { state: state, js: js, css: css, html: html.join( "" ) };
};
NiceSnippet.prototype.toTitle = function () {
    throw new Error( "Can't toTitle a NiceSnippet." );
};
NiceSnippet.prototype.toUnstructuredPage = function ( path, state ) {
    throw new Error( "Can't toUnstructuredPage a NiceSnippet." );
};

my.snippet = function ( var_args ) {
    return new NiceSnippet( _.arrCut( arguments ) );
};


function SnippetToken() {}
SnippetToken.prototype = new Snippet();
SnippetToken.prototype.toHtml = function ( path, state, opts ) {
    throw new Error( "Can't toHtml a SnippetToken." );
};
SnippetToken.prototype.toTitle = function () {
    throw new Error( "Can't toTitle a SnippetToken." );
};
SnippetToken.prototype.toUnstructuredPage = function ( path, state ) {
    if ( !(_.likeObjectLiteral( state ) && _.hasOwn( state, "token" )
        && _.likeArray( state.token )) )
        throw new Error( "The state wasn't the right type." );
    if ( state.token.length === 0 )
        throw new Error( "The token stack was empty." );
    return { state: state, text: state.token[ 0 ] };
};



function ltrimParse( env, chops ) {
    return $c.parseInlineChops( env,
        $c.letChopLtrimRegex( chops, /^\s*/ ).rest );
}

function ltrimParser( func ) {
    return function ( chops, env ) {
        return func( ltrimParse( env, chops ) );
    };
}

function ltrimBlockParser( func ) {
    return function ( chops, env ) {
        return my.blockSnippet( func( ltrimParse( env, chops ) ) );
    };
}

function ltrimBlockDocParser( func ) {
    return function ( chops, env ) {
        return my.blockSnippet( func(
            $c.parseDocumentOfChops( env, $c.chopParas( chops ) ) ) );
    };
}

function unstructuredChops( chops ) {
    return $c.parseInlineChops( unstructuredSnippetEnv, chops );
}

function ltrimClassParser( tagName ) {
    return function ( chops, env ) {
        var apart = $c.letChopWords( chops, 1 );
        if ( !apart ) throw new Error( "need a class" );
        return my.tag( tagName, "class", unstructuredChops( apart[ 0 ] )
            )( ltrimParse( env, apart[ 1 ] ) );
    };
}

function ltrimClassBlockParser( tagName ) {
    return function ( chops, env ) {
        var apart = $c.letChopWords( chops, 1 );
        if ( !apart ) throw new Error( "need a class" );
        return my.blockSnippet(
            my.tag( tagName, "class", unstructuredChops( apart[ 0 ] )
                )( ltrimParse( env, apart[ 1 ] ) ) );
    };
}

function ltrimClassBlockDocParser( tagName ) {
    return function ( chops, env ) {
        var apart = $c.letChopWords( chops, 1 );
        if ( !apart ) throw new Error( "need a class" );
        return my.blockSnippet(
            my.tag( tagName, "class", unstructuredChops( apart[ 0 ] )
                )( $c.parseDocumentOfChops(
                    env, $c.chopParas( apart[ 1 ] ) ) ) );
    };
}

function arrFlat( arr ) {
    return _.acc( function ( y ) {
        function recur( elem ) {
            if ( _.likeArray( elem ) )
                _.arrEach( elem, recur );
            else
                y( elem );
        }
        recur( arr );
    } );
}

var quoteLevel = 0;

var snippetEnv = $c.env( {
     " block": function ( chops ) {
        var blocks = [];
        var thisBlock = [];
        function bankBlock() {
            if ( thisBlock.length !== 0 ) {
                thisBlock =
                    $c.letChopLtrimRegex( thisBlock, /^\s*/ ).rest;
                thisBlock =
                    $c.letChopRtrimRegex( thisBlock, /\s*$/ ).rest;
            }
            if ( thisBlock.length !== 0 ) {
                blocks.push(
                    my.blockSnippet( my.tag( "p" )( thisBlock ) ) );
                thisBlock = [];
            }
        }
        _.arrEach( arrFlat( chops ), function ( it ) {
            if ( it instanceof BlockSnippet ) {
                bankBlock();
                blocks.push( it );
            } else {
                thisBlock.push( it );
            }
        } );
        bankBlock();
        return blocks;
    },
    "": function ( chops, env ) {
        return [ "[", $c.parseInlineChops( env, chops ), "]" ];
    },
    "i": ltrimParser( my.tag( "i" ) ),
    "b": ltrimParser( my.tag( "b" ) ),
    "em": ltrimParser( my.tag( "em" ) ),
    "cite": ltrimParser( my.tag( "cite" ) ),
    "sup": ltrimParser( my.tag( "sup" ) ),
    "sub": ltrimParser( my.tag( "sub" ) ),
    "code": ltrimParser( my.tag( "code" ) ),
    "cspan": ltrimClassParser( my.tag( "span" ) ),
    "h1": ltrimBlockParser( my.tag( "h1" ) ),
    "h2": ltrimBlockParser( my.tag( "h2" ) ),
    "h3": ltrimBlockParser( my.tag( "h3" ) ),
    "h4": ltrimBlockParser( my.tag( "h4" ) ),
    "h5": ltrimBlockParser( my.tag( "h5" ) ),
    "h6": ltrimBlockParser( my.tag( "h6" ) ),
    "p": ltrimBlockParser( my.tag( "p" ) ),
    "cpre": ltrimClassBlockParser( "pre" ),
    "pre": ltrimBlockParser( my.tag( "pre" ) ),
    "ul": ltrimBlockDocParser( my.tag( "ul" ) ),
    "li": ltrimBlockParser( my.tag( "li" ) ),
    "cdiv": ltrimClassBlockDocParser( "div" ),
    "cdl": ltrimClassBlockDocParser( "dl" ),
    "dl": ltrimBlockDocParser( my.tag( "tr" ) ),
    "dt": ltrimBlockParser( my.tag( "dt" ) ),
    "dd": ltrimBlockParser( my.tag( "dd" ) ),
    "ctable": ltrimClassBlockDocParser( "table" ),
    "tr": ltrimBlockDocParser( my.tag( "tr" ) ),
    "td": ltrimBlockParser( my.tag( "td" ) ),
    "nbsp": function ( chops, env ) { return nbsp; },
    "copyright": function ( chops, env ) { return copyright; },
    "en": function ( chops, env ) { return enDash; },
    "dash": function ( chops, env ) { return emDash; },
    "pct": function ( chops, env ) { return "%"; },
    "<": function ( chops, env ) { return "["; },
    ">": function ( chops, env ) { return "]"; },
    // TODO: Turn "quote" and "quotepunc" into custom snippet types
    // that manipulate the state they pass to their children.
    // TODO: Figure out how [quotepunc . Foo [quote foo [quote foo]]]
    // should behave. Should the period go all the way to the inside?
    "quote": function ( chops, env ) {
        var q = quoteLevel % 2 === 0 ? "\"" : "'";
        quoteLevel++;
        try {
            return [ q, $c.parseInlineChops( env,
                $c.letChopLtrimRegex( chops, /^\s*/ ).rest ), q ];
        } finally { quoteLevel--; }
    },
    "quotepunc": function ( chops, env ) {
        var apart = $c.letChopWords( chops, 1 );
        if ( !apart ) throw new Error( "quotepunc needs an arg" );
        var q = quoteLevel % 2 === 0 ? "\"" : "'";
        quoteLevel++;
        try {
            return [ q, $c.parseInlineChops( env, apart[ 1 ] ),
                $c.unchops( apart[ 0 ] ), q ];
        } finally { quoteLevel--; }
    },
    "out": function ( chops, env ) {
        var apart = $c.letChopWords( chops, 1 );
        if ( !apart ) throw new Error( "out needs an arg" );
        return my.tag( "a", "class", "external-link",
            "href", $c.unchops( apart[ 0 ] ) )(
            $c.parseInlineChops( env, apart[ 1 ] )
        );
    },
    "file": function ( chops, env ) {
        var apart = $c.letChopWords( chops, 1 );
        if ( !apart ) throw new Error( "file needs an arg" );
        return my.tag( "a",
            "href", my.toPath( $c.unchops( apart[ 0 ] ) ) )(
            $c.parseInlineChops( env, apart[ 1 ] )
        );
    },
    "nav": function ( chops, env ) {
        var apart = $c.letChopWords( chops, 1 );
        if ( !apart ) throw new Error( "nav needs an arg" );
        var path = my.toPath( $c.unchops( apart[ 0 ] ) );
        if ( apart[ 1 ].length === 0 )
            return new NameNavLink( path );
        else
            return new NavLink(
                path, $c.parseInlineChops( env, apart[ 1 ] ) );
    },
    "nochops": function ( chops, env ) {
        return $c.unchops( $c.letChopLtrimRegex(
            chops, /^(?:(?!\n)\s)*[\n|]?/ ).rest );
    }
} );

var unstructuredSnippetEnv = $c.env( {
    "": function ( chops, env ) {
        return [ "[", $c.parseInlineChops( env, chops ), "]" ];
    },
    "pct": function ( chops, env ) { return "%"; },
    "<": function ( chops, env ) { return "["; },
    ">": function ( chops, env ) { return "]"; },
    "tok": function ( chops, env ) {
        return new SnippetToken();
    },
    "nochops": function ( chops, env ) {
        return $c.unchops( $c.letChopLtrimRegex(
            chops, /^(?:(?!\n)\s)*[\n|]?/ ).rest );
    },
    "just": function ( chops, env ) {
        return $c.parseInlineChops( env, $c.letChopLtrimRegex(
            chops, /^(?:(?!\n)\s)*[\n|]?/ ).rest );
    }
} );

my.parseInLocal = function ( locals, source ) {
    return $c.parseChopline(
        $c.envShadow( snippetEnv, locals ), source );
};

my.parseIn = function ( source ) {
    return my.parseInLocal( {}, source );
};

my.parseLocal = function ( locals, source ) {
    return $c.parseChopup(
        $c.envShadow( snippetEnv, locals ), source );
};

my.parse = function ( source ) {
    return my.parseLocal( {}, source );
};

my.parseHtml = function ( source, path, opts ) {
    return my.snippetToHtml(
        my.parse( source ), my.toPath( path ), { counter: 0 }, opts );
};

my.parseUnstructuredLocal = function ( locals, source ) {
    return $c.parseChopline(
        $c.envShadow( unstructuredSnippetEnv, locals ), source );
};

my.parseUnstructured = function ( source ) {
    return my.parseUnstructuredLocal( {}, source );
};


function renderCssDependency( dep, path ) {
    var media = dep.media;
    var mediaPart = media === void 0 ? "" :
        " media=\"" + attrEscape( media ) + "\"";
    if ( dep.type === "external" ) {
        return "<link rel=\"stylesheet\"" + mediaPart + " href=\"" +
            attrEscape( my.toPath( dep.url ).from( path ) ) + "\" />";
    } else if ( dep.type === "embedded" ) {
        var code = dep.code;
        var match = /<\s*[\/!]/.exec( code )
        if ( match )
            throw new Error(
                "Embedded CSS code shouldn't contain the character " +
                "sequence " + _.blahpp( match[ 0 ] ) + "." );
        return "<style" + mediaPart + " type=\"text/css\">" +
            code + "</style>";
    } else if ( dep.type === "ie" ) {
        return "<!--[if " + dep.on + "]>" +
            renderCssDependency( dep.use, path ) + "<![endif]-->";
    } else {
        throw new Error( "Invalid CSS dependency." );
    }
}

function renderJsDependency( dep, path ) {
    if ( dep.type === "external" ) {
        return "<script type=\"text/javascript\" src=\"" +
            attrEscape( my.toPath( dep.url ).from( path ) ) + "\">" +
            "</script>";
    } else if ( dep.type === "embedded" ) {
        var code = dep.code;
        var match = /<\s*[\/!]/.exec( code )
        if ( match )
            throw new Error(
                "Embedded JavaScript code shouldn't contain the " +
                "character sequence " + _.blahpp( match[ 0 ] ) + "."
                );
        return "<script type=\"text/javascript\">" +
            code + "</script>";
    } else if ( dep.type === "ie" ) {
        return "<!--[if " + dep.on + "]>" +
            renderJsDependency( dep.use, path ) + "<![endif]-->";
    } else {
        throw new Error( "Invalid JS dependency." );
    }
}

function renderJsDependencies( deps, path ) {
    var deduped = [];
    var included = [];
    function add( deps ) {
        _.arrEach( deps, function ( dep ) {
            if ( dep instanceof JsIncludeOnce ) {
                if ( !_.arrAny( included,
                    function ( it ) { return it === dep; } ) ) {
                    included.push( dep );
                    add( dep.deps_ );
                }
            } else {
                deduped.push( renderJsDependency( dep, path ) );
            }
        } );
    }
    add( deps );
    return deduped.join( "" );
}

function makePages() { return {}; }

my.makePage = function (
    permalink, usesAbsolute, is404, name, title, icon, body ) {
    
    return { permalink: my.toPath( permalink ),
        usesAbsolute: usesAbsolute, is404: is404,
        name: name, title: title, icon: icon, body: body };
};

my.definePage = function ( pages, page ) {
    pages[ page.permalink.abs() ] = page;
};

function renderPage( pages, page, atpath, opts ) {
    opts = _.opt( opts ).or( {
        "mock": false,
        "forFileUri": false,
        "allowPhp": false,
        "mockBaseTagPrefix": null
    } ).bam();
    var opts_mock = opts[ "mock" ];
    var opts_forFileUri = opts[ "forFileUri" ];
    var opts_allowPhp = opts[ "allowPhp" ];
    var opts_mockBaseTagPrefix = opts[ "mockBaseTagPrefix" ];
    
    if ( !(true
        && _.isBoolean( opts_mock )
        && _.isBoolean( opts_forFileUri )
        && _.isBoolean( opts_allowPhp )
        && (opts_mockBaseTagPrefix === null
            || _.isString( opts_mockBaseTagPrefix ))
    ) )
        throw new TypeError();
    if ( 1 < (opts_mock ? 1 : 0) + (opts_forFileUri ? 1 : 0) +
        (opts_allowPhp ? 1 : 0) )
        throw new Error(
            "More than one page rendering mode isn't allowed." );
    
    atpath = my.toPath( atpath );
    
    var body = my.snippetToHtml( page.body, atpath, {
        "counter": 0,
        "pages": pages
    }, {
        mock: opts_mock,
        forFileUri: opts_forFileUri
    } );
    
    var cssDependencies = (body.css || []).slice();
    var jsDependencies = (body.js || []).slice();
    if ( opts_mock ) {
        cssDependencies.unshift( { type: "embedded", code:
            "a[data-navlink] " +
                "{ text-decoration: underline; cursor: pointer; }\n"
        } );
        jsDependencies.push( { type: "embedded", code:
            "\"use strict\";\n" +
            "(function () {\n" +
            "    var links = " +
                "document.getElementsByTagName( \"a\" );\n" +
            "    for ( var i = 0, n = links.length; " +
                "i < n; i++ ) (function () {\n" +
            "        var item = links[ i ];\n" +
            "        if ( !item.hasAttribute( \"data-navlink\" ) )\n" +
            "            return;\n" +
            "        if ( item.addEventListener )\n" +
            "            item.addEventListener( \"click\", " +
                            "onClick, !\"capture\" );\n" +
            "        else\n" +
            "            item.attachEvent( " +
                            "\"onclick\", onClick );\n" +
            "        function onClick() {\n" +
            "            if ( parent !== window )\n" +
            "                parent.postMessage( " +
                                "{ type: \"navlink\", path:\n" +
            "                    item.getAttribute( " +
                                    "\"data-navlink\" ) " +
                                "}, \"*\" );\n" +
            "        }\n" +
            "    })();\n" +
            "})();\n"
        } );
    }
    
    var html = "<!DOCTYPE html>\n" +
        "<html lang=\"en\">" +
        "<head>" +
        "<meta http-equiv=\"Content-Type\" " +
            "content=\"text/html;charset=UTF-8\" />" +
        "<title>" + my.snippetToTitle( page.title ) + "</title>" +
        
        // NOTE: When opts_mock is true and opts_mockBaseTagPrefix is
        // provided, this <base> tag supports the relative URLs in the
        // CSS and JS tags, as well as the ones used dynamically by
        // the JS code. While we can't imitate a directory tree
        // dynamically, opts_mockBaseTagPrefix can be set to an
        // existing build directory or deployment site.
        //
        // TODO: Make this use proper relative path resolution, rather
        // than string concatenation.
        //
        (opts_mock && opts_mockBaseTagPrefix !== null ?
            "<base href=\"" + attrEscape( opts_mockBaseTagPrefix +
                atpath.toBaseTagSuffix() ) + "\" />" :
            "") +
        
        _.arrMap( cssDependencies, function ( css ) {
            return renderCssDependency( css, atpath );
        } ).join( "" ) +
        "<link rel=\"shortcut icon\" href=\"" +
            attrEscape( my.toPath( page.icon ).from( atpath ) ) +
            "\" />" +
        "</head>" +
        "<body>" +
        body.html +
        renderJsDependencies( jsDependencies, atpath ) +
        "</body>" +
        "</html>";
    
    if ( !page.is404 || !opts[ "allowPhp" ] )
        return { "type": "html", "text": html };
    var php = html.replace( /<\?/g, "<<?php?>?");
    php = "<?php header( \"HTTP/1.1 404 Not Found\" ); ?>\n" + php;
    return { "type": "php", "text": php };
}

my.renderPages = function ( pages, basePath, opt_opts ) {
    opt_opts = _.opt( opt_opts ).or( {
        "mock": false,
        "forFileUri": false,
        "allowPhp": false
    } ).bam();
    basePath = my.toPath( basePath );
    return _.objMap( pages, function ( page, permalink ) {
        return renderPage( pages, page,
            page.usesAbsolute ?
                my.maskPath( permalink, basePath ) : permalink,
            opt_opts );
    } );
};

my.renderPagesToText = function ( pages, basePath, opt_opts ) {
    return _.objMappend( my.renderPages( pages, basePath, opt_opts ),
        function ( page, permalink ) {
            var obj = {};
            obj[ my.toPath( permalink ).plus( {
                "html": "/index.html",
                "php": "/index.php"
            }[ page[ "type" ] ] ).abs() ] = page[ "text" ];
            return obj;
        } );
};


} );
