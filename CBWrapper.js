//----------------------------------------------------------------------------
// Copyright (c) 2011 Patrick Mueller
// 
// The MIT License - see: http://www.opensource.org/licenses/mit-license.php
//----------------------------------------------------------------------------

;(function(){

//----------------------------------------------------------------------------
// get the global object
//----------------------------------------------------------------------------
var global = this

//----------------------------------------------------------------------------
// CBWrapper already defined?  leave
//----------------------------------------------------------------------------
if (global.CBWwrapper) return

//----------------------------------------------------------------------------
// define CBWrapper
//----------------------------------------------------------------------------
global.CBWrapper = {}

//----------------------------------------------------------------------------
// list of wrappers
//----------------------------------------------------------------------------
var Wrappers = []

//----------------------------------------------------------------------------
// wrapon state
//----------------------------------------------------------------------------
var WrapOn = false

//----------------------------------------------------------------------------
// enabled wrap sites
//----------------------------------------------------------------------------
var WrapSites = []

//----------------------------------------------------------------------------
// add a wrapper
//----------------------------------------------------------------------------
CBWrapper.addWrapper = function CBWrapper_addWrapper(wrapper) {
    Wrappers.push(wrapper)
}

//----------------------------------------------------------------------------
// remove a wrapper
//----------------------------------------------------------------------------
CBWrapper.removeWrapper = function CBWrapper_removeWrapper(wrapper) {
    for (var i=0; i<Wrappers.length; i++) {
        if (Wrappers[i] === wrapper) {
            Wrappers.splice(i,1)
            return
        }
    }
}

//----------------------------------------------------------------------------
// start using wrappers
//----------------------------------------------------------------------------
CBWrapper.wrapon = function CBWrapper_wrapon() {
    WrapOn = true
}

//----------------------------------------------------------------------------
// stop using wrappers
//----------------------------------------------------------------------------
CBWrapper.wrapoff = function CBWrapper_wrapoff() {
    WrapOn = false
}

//----------------------------------------------------------------------------
// enable a wrappable call site
//----------------------------------------------------------------------------
CBWrapper.enableWrapper = function CBWrapper_enableWrapper(object, property, cbIndex, describer) {
    if (!object) return

    var wrapSite = {
        object:    object,
        property:  property,
        cbIndex:   cbIndex,
        describer: describer,
        original:  object[property]
    }
    
    wrapSite.object[wrapSite.property] = getWrapperSite(wrapSite)
}

//----------------------------------------------------------------------------
// enable default wrappers for the browser
//----------------------------------------------------------------------------
CBWrapper.enableBrowserWrappers = function CBWrapper_enableBrowserWrappers() {
    CBWrapper.enableWrapper(window,                   "setTimeout",       0, describerTimer)
    CBWrapper.enableWrapper(window,                   "setInterval",      0, describerTimer)
    CBWrapper.enableWrapper(window,                   "addEventListener", 1, describerWindow_addEventListener)
    CBWrapper.enableWrapper(window.applicationCache,  "addEventListener", 1, describerApplicationCache_addEventListener)
    CBWrapper.enableWrapper(Node.prototype,           "addEventListener", 1, describerNode_addEventListener)
    CBWrapper.enableWrapper(XMLHttpRequest.prototype, "addEventListener", 1, describerXMLHttpRequest_addEventListener)
}

//----------------------------------------------------------------------------
// describer for the browser's timer functions
//----------------------------------------------------------------------------
function describerTimer(context) {
    return "window." + context.property + "(" + getFunctionName(context.args[0]) + "(), " + context.args[1] + ")"
}

//----------------------------------------------------------------------------
// describer for the browser's window.addEventListener
//----------------------------------------------------------------------------
function describerWindow_addEventListener(context) {
    return "window.addEventListener('" + context.args[0] + "', " + getFunctionName(context.args[1]) + "())"
}

//----------------------------------------------------------------------------
// describer for the browser's applicationCache.addEventListener
//----------------------------------------------------------------------------
function describerApplicationCache_addEventListener(context) {
    return "applicationCache.addEventListener('" + context.args[0] + "', " + getFunctionName(context.args[1]) + "())"
}

//----------------------------------------------------------------------------
// describer for the browser's Node.addEventListener
//----------------------------------------------------------------------------
function describerNode_addEventListener(context) {
    var nodeClass = getClassName(context.receiver)
    return nodeClass + ".addEventListener('" + context.args[0] + "', " + getFunctionName(context.args[1]) + "())"
}

//----------------------------------------------------------------------------
// describer for the browser's XMLHttpRequest.addEventListener
//----------------------------------------------------------------------------
function describerXMLHttpRequest_addEventListener(context) {
    return "XMLHttpRequest.addEventListener('" + context.args[0] + "', " + getFunctionName(context.args[1]) + "())"
}

//----------------------------------------------------------------------------
// get a function name
//----------------------------------------------------------------------------
function getFunctionName(func) {
    return func.name || func.displayName || "{anonymous}"
}

//----------------------------------------------------------------------------
// get a class name
//----------------------------------------------------------------------------
function getClassName(instance) {
    var name = instance.constructor.name || instance.constructor.displayName 
    if (name) return name
    
    instance = instance.toString()
    var match = /\[.*\s+(.*)\]/.exec(instance)
    if (match) return match[1]
    
    return instance
}

//----------------------------------------------------------------------------
// get a new wrapper site
//
// this function replaces something like window.addEventListener
// with a wrapped version, that wraps the callbacks passed to it
//----------------------------------------------------------------------------
function getWrapperSite(wrapSite) {
    return function wrappedSite() {
        var origCB   = arguments[wrapSite.cbIndex]
        var args     = toArray(arguments)
        
        // get the name of this call site
        var siteName = getSiteName(wrapSite, this, args)

        // get url/lineno for V8
        if (Error.captureStackTrace) {
            Error.prepareStackTrace = function(e, sst) { return sst }
            var e = {}
            Error.captureStackTrace(e)
            if (e.stack) {
                var fileName = e.stack[1].getFileName()
                var lineNo   = e.stack[1].getLineNumber()
                siteName += " [" + fileName + ":" + lineNo + "]"
            }
            Error.prepareStackTrace = null
        }
        
        // wrap the callback, if it's a function
        if (typeof(origCB) == "function") {
            args[wrapSite.cbIndex] = getWrapper(origCB, wrapSite, siteName)
        }
        
        // call the original callback installer
        return wrapSite.original.apply(this, args)
    }
}

//----------------------------------------------------------------------------
// get the name of a wrap site
//----------------------------------------------------------------------------
function getSiteName(wrapSite, receiver, args) {
    // if the wrapped site has a describer, call it
    if (wrapSite.describer) {
        var context = {
            receiver: receiver,
            args:     args,
            property: wrapSite.property
        }
        return wrapSite.describer.call(null, context)
    }
    
    // default description of a wrapped site
    return receiver.toString() + "." + wrapSite.property + "()"
}

//----------------------------------------------------------------------------
// get a callback wrapper
//
// wraps the callback passed to something like window.addEventListener
//----------------------------------------------------------------------------
function getWrapper(func, wrapSite, siteName) {
    
    // return wrapped function
    return function cbWrapper() {
    
        // get args
        var args = toArray(arguments)

        // create per-call data object
        var callData = {}
        
        // wrap off? call original and return
        if (!WrapOn) {
            return func.apply(this, args)
        }
        
        // call before wrappers
        var wrappers = Wrappers.slice()
        for (var i=0; i<wrappers.length; i++) {
            var cb = wrappers[i].before
            if (!cb) continue
            
            cb.call(wrappers[i], {
                func:     func,
                receiver: this,
                args:     args,
                callData: callData,
                siteName: siteName
            })
        }

        // make call, capturing results
        var result
        var exception
        try {
            result = func.apply(this, args)
        }
        catch (e) {
            exception = e
        }
        
        // call after wrappers
        for (var i=wrappers.length-1; i>=0; i--) {
            var cb = wrappers[i].after
            if (!cb) continue
            
            cb.call(wrappers[i], {
                func:      func,
                receiver:  this,
                args:      args,
                result:    result,
                exception: exception,
                callData:  callData,
                siteName:  siteName
            })
        }

        // return results
        if (exception) throw exception
        
        return result
    }
}

//----------------------------------------------------------------------------
// convert Arguments to an Array
//----------------------------------------------------------------------------
function toArray(args) {
    return Array.prototype.slice.call(args)
}

})();
