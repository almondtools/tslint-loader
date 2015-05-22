/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author William Buchwalter
	based on jshint-loader by Tobias Koppers
*/
var Linter = require("tslint");
var stripJsonComments = require("strip-json-comments");
var loaderUtils = require("loader-utils");
var fs = require("fs");
var path = require("path");
var typescript = require("typescript");


function loadRelativeConfig() {
	var options = {
		 formatter: "custom",
		 formattersDirectory: 'node_modules/tslint-loader/formatters/',	  
		 configuration: {}
	};
	
	var configPath = locateConfigFile("tslint.json", path.dirname(this.resourcePath));
	if(typeof configPath !== "string") {		
		console.log('tslint.json not found');		
	} else {
		this.addDependency(configPath);
		var file = fs.readFileSync(configPath, "utf8");
		options.configuration = JSON.parse(stripJsonComments(file));
	}
	
	return options;
}

function locateConfigFile(filename, startingPath) {
	var filePath = path.join(startingPath, filename);
	if(typescript.sys.fileExists(filePath)){		
		return filePath;
	}
	var parentPath = path.dirname(startingPath);
	if(parentPath === startingPath)
		return undefined;
	return locateConfigFile(filename,parentPath);
}

function lint(input, options) {	
	//Override options in tslint.json by those passed to the compiler
	if(this.options.tslint) {    
    merge(options.configuration, this.options.tslint);		
	}

	//Override options in tslint.json by those passed to the loader as a query string
	var query = loaderUtils.parseQuery(this.query);
	merge(options.configuration, query);	 
	
	var linter = new Linter(this.resourcePath, input, options);
	var result = linter.lint();
  var emitter = options.configuration.emitErrors ? this.emitError : this.emitWarning;	
	report(result, emitter, options.configuration.failOnHint);
}

function report(result, emitter, failOnHint) {
	if(result.failureCount === 0) return;		
	emitter(result.output);	
  if(failOnHint) {   
    throw new Error("Compilation failed due to tslint errors.");
  }
}

/* Merges two (or more) objects,
   giving the last one precedence */
function merge(target, source) {   
  if ( typeof target !== 'object' ) {
    target = {};
  }
  
  for (var property in source) {        
    if ( source.hasOwnProperty(property) ) {            
      var sourceProperty = source[ property ];            
      if ( typeof sourceProperty === 'object' ) {
        target[ property ] = merge( target[ property ], sourceProperty );
        continue;
      }            
      target[ property ] = sourceProperty;            
    }        
  }
  
  for (var a = 2, l = arguments.length; a < l; a++) {
    merge(target, arguments[a]);
  }
  
  return target;
};


module.exports = function(input, map) {
	this.cacheable && this.cacheable();
	var callback = this.async();

	var config = loadRelativeConfig.call(this);
	lint.call(this, input, config);	
	callback(null, input, map);
}

