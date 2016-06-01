/** Called automatically by JsDoc Toolkit. */

// some utility filters

function hasNoParent($) {return ($.memberOf == "")}
function isaFile($) {return ($.is("FILE"))}
function isaClass($) {return ($.is("CONSTRUCTOR") || $.isNamespace)}

var partials = {};

function get_type (symbol) {
    var classType = "";

    if (symbol.isBuiltin()) {
        classType += "Built-In ";
    }
    
    if (symbol.isNamespace) {
        if (symbol.is('FUNCTION')) {
            classType += "Function ";
        }
        classType += "Namespace ";
    }
    else {
        classType += "Class ";
    }
    return classType;
}

function indentLines(str, numchars) {
    var spaces = Array(numchars+1).join(" ");
    var indented = "";
    var lines = str.split("\n");
    for (var i=0; i<lines.length; i++) {
        indented += spaces + lines[i].trim() + "\n";
    }
    return indented;
}

function trim (obj) {
    return obj.toString().replace(/^\s+|\s+$/g,"");
}

/** Make a symbol sorter by some attribute. */
function makeSortby(attribute) {
    return function(a, b) {
        if (a[attribute] != undefined && b[attribute] != undefined) {
            a = a[attribute].toLowerCase();
            b = b[attribute].toLowerCase();
            if (a < b) return -1;
            if (a > b) return 1;
            return 0;
        }
    }
}

/** Build output for displaying function parameters. */
function makeSignature(params) {
    if (!params) return "()";
    var signature = "("
    +
    params.filter(
        function(param) {
            return param.name.indexOf(".") == -1; // don't show config params in signature
        }
    ).map(function(param) {
        if (param.isOptional) {
            return "[" + param.name + "]";
        } else {
            return param.name;
        }
    }).join(", ")
    +
    ")";
    return signature;
}

function resolveLinks(str, from) {
    // deprecated
    return str;
}

function publish(symbolSet) {    
    var base = JSDOC.opt._[0];
    if (base.charAt(base.length-1) == '/') {
        base = base.slice(0, -1);
    }
    
    publish.conf = {  // trailing slash expected for dirs
        ext:         ".html", // ===> .rst
        outDir:      JSDOC.opt.d || SYS.pwd+"../out/jsdoc/",
        templatesDir: JSDOC.opt.t || SYS.pwd+"../templates/jsdoc/",
        symbolsDir:  "symbols/"
    };
        
    // used to allow Link to check the details of things being linked to
    Link.symbolSet = symbolSet;

    // create the required templates
    try {
        var templates = {
            'class': new JSDOC.JsPlate(publish.conf.templatesDir + "class.tmpl"),
            'toc': new JSDOC.JsPlate(publish.conf.templatesDir + "toc.tmpl")
        }
    }
    catch(e) {
        print("Couldn't create the required templates: "+e);
        quit();
    }
    
    // get an array version of the symbolset, useful for filtering
    var symbols = symbolSet.toArray();
    
    // get a list of all the classes in the symbolset
    var classes = symbols.filter(isaClass).sort(makeSortby("alias"));
    
    // create a filemap in which outfiles must be to be named uniquely, ignoring case
    if (JSDOC.opt.u) {
        var filemapCounts = {};
        Link.filemap = {};
        for (var i = 0, l = classes.length; i < l; i++) {
            var lcAlias = classes[i].alias.toLowerCase();
            
            if (!filemapCounts[lcAlias]) filemapCounts[lcAlias] = 1;
            else filemapCounts[lcAlias]++;
            
            Link.filemap[classes[i].alias] = 
                (filemapCounts[lcAlias] > 1)?
                lcAlias+"_"+filemapCounts[lcAlias] : lcAlias;
        }
    }
    
    var tocnames = new Array();
    
    // create each of the class pages
    for (var i = 0, l = classes.length; i < l; i++) {
        var symbol = classes[i];
        
        symbol.events = symbol.getEvents();   // 1 order matters
        symbol.methods = symbol.getMethods(); // 2
        
        template = templates['class'].process(symbol);
            
        var dir = publish.conf.outDir.slice(0, -1);
        var source = symbol.srcFile.replace(base, '').split('/').slice(0, -1).join('/');
        var docdir = new File(dir + source);
        docdir.mkdirs();
        var basename = ((JSDOC.opt.u) ? Link.filemap[symbol.alias] : symbol.alias);
        var filename = basename + '.rst';
        
        var tocname = source + '/' + basename;
        if (tocname.charAt(0) == '/') {
            tocname = tocname.slice(1);
        }
        tocnames.push(tocname);
        
        IO.saveFile(docdir, filename, template);
    }
    
    tocnames.sort();
    var symbols = {};
    symbols.entries = tocnames;
    template = templates['toc'].process(symbols);
    IO.saveFile(publish.conf.outDir, 'toc.rst', template);
    
    var base = JSDOC.opt._[0];   
    // get an array version of the symbolset, useful for filtering
    var symbols = symbolSet.toArray();
}