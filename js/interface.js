/**
 * @name Interface
 * 
 * @class Creates an Interface with the specified methods to be implemented by js objects.
 */

var Interface = function(name, methods) {
	if(arguments.length != 2) {
		throw new Error("Interface constructor called with " + arguments.length
		  + "arguments, but expected exactly 2.");
	}

	this.name = name;
	this.methods = [];
	for(var i = 0, len = methods.length; i < len; i++) {
		if(typeof methods[i] !== 'string') {
			throw new Error("Interface constructor expects method names to be "
			  + "passed in as a string.");
		}
		this.methods.push(methods[i]);
	}
};

/**
* @static
*
* @param {Interface} object Interface definition
*/
Interface.ensureImplements = function(object) {
    if(arguments.length < 2) {
        throw new Error("Function Interface.ensureImplements called with " +
          arguments.length  + "arguments, but expected at least 2.");
    }

    for(var i = 1, len = arguments.length; i < len; i++) {
        var myInterface = arguments[i];
        if(myInterface.constructor !== Interface) {
            throw new Error("Function Interface.ensureImplements expects arguments "
              + "two and above to be instances of Interface.");
        }

        for(var j = 0, methodsLen = myInterface.methods.length; j < methodsLen; j++) {
            var method = myInterface.methods[j];
            if(!object[method] || typeof object[method] !== 'function') {
                throw new Error("Function Interface.ensureImplements: object "
                  + "does not implement the " + myInterface.name
                  + " interface. Method " + method + " was not found.");
            }
        }
    }
};