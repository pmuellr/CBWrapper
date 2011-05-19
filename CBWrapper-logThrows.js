//----------------------------------------------------------------------------
// Copyright (c) 2011 Patrick Mueller
// 
// The MIT License - see: http://www.opensource.org/licenses/mit-license.php
//----------------------------------------------------------------------------

;(function(){

CBWrapper.enableBrowserWrappers()
CBWrapper.addWrapper({after: throwWrapperAfter})
CBWrapper.wrapon()

//------------------------------------------------------
function throwWrapperAfter(wrapData) {
    if (!wrapData.exception) return

    var location
    
    if (wrapData.exception.sourceURL) {
        location = wrapData.exception.sourceURL
        if (wrapData.exception.line) {
            location += ":" + wrapData.exception.line
        }
    }
    
    console.log("--------------------------------------------------")
    console.log("exception: " + wrapData.exception)
    if (location) console.log("location:  " + location)
    console.log("callback:  " + wrapData.siteName)
    
    if (!wrapData.exception.stack) return
    
    console.log("stack:")
    console.log(wrapData.exception.stack)
}

})();
