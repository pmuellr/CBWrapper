CBWrapper - JavaScript Callback Wrapper
=======================================

Callbacks are a way of life when coding JavaScript
in many environments, but can be difficult to debug,
when you need to debug.  This is especially true on
mobile platforms, where you don't have much of a 
debug story to begin with.

This library provides some tools which you can use
to instrument callbacks, and is primarily designed
to be used to build diagnostic tools.

One such tool is the `CBWrapper-logThrows.js` file,
which provides some diagnostic information via 
console.log() when an exception occurs while
executing a callback.

CBWrapper-logThrows.js usage
============================

Include the following code in your HTML file, 
before any other <script> elements:

```html
<script src="CBWrapper.js"></script>
<script src="CBWrapper-logThrows.js"></script>
```

Once you've done this, the following existing APIs
will have been instrumented so any calls to them
will result the callbacks getting extra logging
output when they throw exceptions:

```javascript
window.setTimeout()
window.setInterval()
window.addEventListener()
window.applicationCache.addEventListener()
<Node>.addEventListener()
<XMLHttpRequest>.addEventListener()

```

CBWrapper-logThrows.js output
=============================

The output you get depends on whether you're using JavaScriptCore (JSC) or V8 in your
browser.  The outputs below are from the same runtime error in the same script.

* **exception line** - in this line you'll get the toString() version of the exception
that's thrown

* **location line** - only available under JSC, this indicates the source url and
line number that was executing when the exception occurred.  For V8, this information
is available in the stack trace (see below

* **callback line** - this line describes the location where the callback was 
registered to the system.  In this case, the code that threw the exception was
run as a `setTimeout()` callback.  Under V8, the source url and line number of
this registration is also provided.

* **stack line** - only available under V8, this is the runtime call stack in place
when the exception occurred.

under JSC
---------

```
exception: TypeError: Result of expression 'xScript' [null] is not an object.
location:  https://pmuellr-mb.homeip.net/~pmuellr/Projects/CBWrapper/tests/script-runtime-error-function.js:8
callback:  window.setTimeout(aScript(), 2000)
```


under V8
--------

```
exception: TypeError: Cannot call method 'doSomething' of null
callback:  window.setTimeout(aScript(), 2000) [http://pmuellr.muellerware.org/~pmuellr/Projects/CBWrapper/tests/test-weinre-runtime-function-script.html:10]
stack:
TypeError: Cannot call method 'doSomething' of null
    at bScript (http://pmuellr.muellerware.org/~pmuellr/Projects/CBWrapper/tests/script-runtime-error-function.js:8:11)
    at aScript (http://pmuellr.muellerware.org/~pmuellr/Projects/CBWrapper/tests/script-runtime-error-function.js:3:5)
    at cbWrapper (http://pmuellr.muellerware.org/~pmuellr/Projects/CBWrapper/CBWrapper.js:253:27)
    at http://pmuellr.muellerware.org:8081/target/target-script-min.js#test:3674:14
```

WARNING
=======

CBWrapper is pretty intrusive.  It replaces commonly used built-in functions with 
wrappers, and creates wrappers for all your callback functions.  There's a lot
of extra code running where it ordinarily isn't.

For this reason, you don't want to ship your code with CBWrapper in it.  You
just want to use it during development, and perhaps only when you need additional
help finding out where exceptions are happpening.

CBWrapper.js
============

The `CBWrapper-logThrows.js` file is just a snippet of code that runs functions
defined in `CBWrapper.js`.  `CBWrapper.js` provides the core functionality of
being able to hook callbacks.  

API:

CBWrapper.addWrapper(wrapper)
-----------------------------

Add a new wrapper.  A wrapper will be invoked whenever a callback function
is invoked.  The structure of a wrapper is described below.

CBWrapper.removeWrapper(wrapper)
--------------------------------

Remove an existing wrapper.

CBWrapper.wrapon()
------------------

Start using the wrappers that have been added.

CBWrapper.wrapoff()
-------------------

Stop using the wrappers that have been added.


CBWrapper.enableWrapperFor(object, property, cbIndex, describer)
-------------------------------------------------------------

Replaces `object[property]`, which is presumed to be a function
which takes a callback parameter, with a version which will
wrap the callback.  The callback parameter in that function's 
argument list is indicated by the `cbIndex` parameter.  The
optional `describer` function parameter is used to produce a nice
string version of the `object[property]` function, which
can include the values of arguments passed to that function.
The interface of the describer is described below.

CBWrapper.enableBrowserWrappers()
---------------------------------

Calls `enableWrapperFor()` for the main browser functions which expect callback 
functions, which appropriate describers.

wrapper
-------

A wrapper object is used in `addWrapper()` and `removeWrapper()`.  It's an
object which can have a `before()` function and an `after()` function.  The
`before()` function is called before the actual callback function is
invoked, and an `after()` function is called after the actual callback function
is invoked.

Both functions are passed an object with the following properties:

* **func** - the actual callback function to be (or which was) invoked

* **receiver** - the receiver of the callback function invocation

* **args** - the arguments passed to the callback function invocation

* **callData** - an empty object allocated on a per-call basis, allowing
you to share information between a `before()` and `after()` function for
a specific callback

* **siteName** - the call site of the function which registered the
callback, described by the describer (see below)

* **result** - only available in the `after()` function.  Contains the
value returned from the callback function.

* **exception** - only available in the `after()` function.  Contains the
exception that was thrown from the callback function, if any.


describer
---------

A descriver function is used to provide a description of the call site which
registered a callback.  It's passed an object with the following properties:

* **receiver** - the receiver of the registering function invocation

* **property** - the property of the receiver being invoked as the registering
function

* **args** - arguments passed to the registering function.

For example, if you register a callback with the following code:

```javascript
window.addEventListener("load", onLoad, false)

```

the properties will be set as follows:

```javascript
{
    receiver: window,
    property: "addEventListener",
    args: ["load", onLoad, false]
}

```

The describer function should return a string which describes the registering
call site in as much detail as it can.  Here's the built-in describer for
`window.addEventListener`:

```javascript
return "window.addEventListener('" + 
    context.args[0] + "', " + 
    getFunctionName(context.args[1]) + 
    "())"
```

In the example above this would return the string:

```
window.addEventListener('load',onLoad())
```