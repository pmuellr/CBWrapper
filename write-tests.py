#!/usr/bin/env python

#----------------------------------------------------------------------------
# Copyright (c) 2011 Patrick Mueller
# 
# The MIT License - see: http://www.opensource.org/licenses/mit-license.php
#----------------------------------------------------------------------------

import os
import sys

testFileNames = []

#-----------------------------------------------------------------------------
def main():
    if len(sys.argv) < 2:
        print "expecting the hostname:port of the weinre server"
        sys.exit()
        
    weinreHostPort = sys.argv[1]
    
    if not os.path.exists("tests"):
        print "the output directory 'tests' does not exist"
        sys.exit()
        
    for weinre in [True, False]:
        for syntax in [True, False]:
            for main in [True, False]:
                for script in [True, False]:
                    writeTest(weinre, syntax, main, script, weinreHostPort)
                    
    writeScriptFiles()
                    
    #---------------------------------------------
    oFileName = "tests/index.html"
    oFile = file(oFileName, "w")

    print >>oFile, "<meta name='viewport' content='width=device-width'>"
    for testFileName in testFileNames:
        print >>oFile, "<p><a href='%s'>%s</a>" % (testFileName, testFileName)

    oFile.close()
    
    
#-----------------------------------------------------------------------------
def writeTest(weinre, syntax, main, script, weinreHostPort):
    
    fName = "test-"
    fName += ("weinre-" if weinre else "")
    fName += ("syntax-" if syntax else "runtime-")
    fName += ("main-"   if main   else "function-")
    fName += ("script"  if script else "html")
    
    fName += ".html"
    
    if syntax and not main: return
    
    testFileNames.append(fName)

    oFile = file("tests/" + fName, "w")
    
    print >>oFile, "<meta name='viewport' content='width=device-width'>"
    if weinre:
        print >>oFile, "<script src='http://%s/target/target-script-min.js#test'></script>" % weinreHostPort
        print >>oFile, ""

    print >>oFile, "<script src='../CBWrapper.js'></script>"
    print >>oFile, "<script src='../CBWrapper-logThrows.js'></script>"
    print >>oFile, ""
        
    if syntax:
        if main:
            if script:
                print >>oFile, "<script src='script-syntax-error.js'></script>"
            else:
                print >>oFile, "<script>"
                print >>oFile, "x x x )( x x x"
                print >>oFile, "</script>"
    
    else:
        if main:
            if script:
                print >>oFile, "<script src='script-runtime-error-main.js'></script>"
            else:
                print >>oFile, "<script>"
                print >>oFile, "var xScript = null"
                print >>oFile, "xScript.doSomething()"
                print >>oFile, "</script>"
        else:
            if script:
                print >>oFile, "<script src='script-runtime-error-function.js'></script>"
            else:
                print >>oFile, "<script>"
                print >>oFile, "function aScript() {"
                print >>oFile, "    bScript()"
                print >>oFile, "}"
                print >>oFile, ""
                print >>oFile, "function bScript() {"
                print >>oFile, "  var xScript = null"
                print >>oFile, "  xScript.doSomething()"
                print >>oFile, "}"
                print >>oFile, "</script>"
                
            print >>oFile, ""
            print >>oFile, "<script>"
            print >>oFile, "setTimeout(aScript, 2000)"
            print >>oFile, "</script>"
                
    print >>oFile, ""
    print >>oFile, "<p>This is a <a href='index.html'>test</a>, it is only a test."
    oFile.close()
    
#-----------------------------------------------------------------------------
def writeScriptFiles():

    #---------------------------------------------
    oFileName = "tests/script-syntax-error.js"
    oFile = file(oFileName, "w")
    
    print >>oFile, "// script file with a syntax error"
    print >>oFile, "x x x )( x x x"
    
    oFile.close()
    
    #---------------------------------------------
    oFileName = "tests/script-runtime-error-main.js"
    oFile = file(oFileName, "w")
    
    print >>oFile, "// script file with a runtime error in the main bit"
    print >>oFile, "var xScript = null"
    print >>oFile, "xScript.doSomething()"
    
    oFile.close()
    
    #---------------------------------------------
    oFileName = "tests/script-runtime-error-function.js"
    oFile = file(oFileName, "w")
    
    print >>oFile, "// script file with a runtime error in a function"
    print >>oFile, "function aScript() {"
    print >>oFile, "    bScript()"
    print >>oFile, "}"
    print >>oFile, ""
    print >>oFile, "function bScript() {"
    print >>oFile, "  var xScript = null"
    print >>oFile, "  xScript.doSomething()"
    print >>oFile, "}"
    
    oFile.close()
    
    
    

#-----------------------------------------------------------------------------
main()    
