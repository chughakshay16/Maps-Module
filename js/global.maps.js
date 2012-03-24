/** 
 * @class The Global Maps API core object
 *
 * @version 1.0
 *
 * @example 
 * var processMap = function(){ *do something with the map* };
 * var myMap = new GlobalMap('myMap', mapObject, {foo:bar}, processMap);
 *
 * @author Akshay Chugh (chughakshay16@gmail.com)
 *
 * @param {String} instance Instance descriptor
 * @param {Object} dynamicMapObject Map Object implementing DynamicMapInterface
 * @param {Map} config Configuration map {key:value}
 * @param {String} config.containerSelector Jquery selector for the map's container element
 * @param {Number} config.defaultZoom Initial zoom value
 * @param {Number} config.centerToLat Latitude of the geographic point to center the map
 * @param {Number} config.centerToLong Longitude of the geographic point to center the map
 * @param {Boolean} config.declutterEnabled Value to determine if declutter is enabled for the markers in the map
 * @param {Object} [config.mapControls] Config object for the controls to be displayed on the map
 * @param {Boolean} [config.mapControls.pan] Enable or disable pan control in the map. Default value: true
 * @param {Boolean} [config.mapControls.zoom] Enable or disable zoom control in the map. Default value: true
 * @param {Boolean} [config.mapControls.mapType] Enable or disable map type control in the map. Default value: true
 * @param {String}[config.locale] Code of the language to be used in the map for labels and messages. Default value: English
 * @param {Function} callback Callback function to process after object's initialization
 */

function GlobalMap(instance, dynamicMapObject, config, callback){

	if(dynamicMapObject.constructor.name=='GlobalMapObject')
		Interface.ensureImplements(dynamicMapObject,DynamicMapInterface);
	else
		Interface.ensureImplements(dynamicMapObject,StaticMapInterface);
	// set object as internal to the GlobalMap object
	this.mapObject = dynamicMapObject;

	//initialize map instance on the namespace
	window.globalMap = window.globalMap || {};
	window.globalMap[instance]=this;
	
	// initialize object
	this._initialize(config, callback);
	
	return this;
}

/**
 * @lends GlobalMap
 */

GlobalMap.prototype = {

	// default properties to every object initialized as GlobalMap (This properties could be overriden when instantiating the object)
	defaults: {	containerSelector:'#map',
				centerLatCoordinates:37.4419,
				centerLongCoordinates:-122.1419,
				initialZoom:7,
				lazyload: true
	},

    /**
	* @description Initialize the GlobalMap configuration
	*
	* @param {Map} config Configuration map {key:value}
	
	* @param {Function} callback Callback function to process after object's initialization
	*/
	
	_initialize:function(config, callback){

		// set defaults and extend configuration with user properties
		this.config = this.config || {};
		$.extend(this.config, this.defaults);

		if(config){
			$.extend(this.config, config);
		}

		var map = this.mapObject;
		var config = this.config;
		var controlsConfig = {zoom: true, pan: true, mapType: true, streetView: true};
		if(config.mapControls){
			$.extend(controlsConfig, config.mapControls);
		}
		var processMap = function(){
			window.scriptLoaded = true;
			map._setup(config.containerSelector,config.initialZoom,config.centerLatCoordinates,config.centerLongCoordinates, config.declutterEnabled, controlsConfig);
			map._setControls();
			callback();
	    };

		if(config.lazyload){
			if(config.key){
				window.pendingCallbacks = window.pendingCallbacks || [];
				if(window.scriptLoaded){
					processMap();
				}else{
					if(!window.scriptLoading){		
						map._loadScript(config.key, processMap, config.locale || 'en', config.clientId, config.channelId);
					}else {
						window.pendingCallbacks.push(processMap);
					}
				}
			}
			else
				throw new Error("A valid key must be used to load the script dinamically - Disable lazyload or add a valid key. (Key:" + config.key + ')');
		}
		else	
			processMap();
	},
	
	/**
	*
	* @description Returns the internal implementation of the map object 
	*
	*
	* @example
	* var providerMap = myMap.getInternalImplementation();
	* providerMap.providerSpecificMethod();
	*
	* @returns {object} A reference to the internal implementation of the map object.
	*/	
	
	getInternalImplementation: function() {
		return this.mapObject;
	},

	/**
	* @description Register a custom method with its implementation into the Global Mapping Object
	*
	* Registering a custom method provides a way to extend the Global Mapping Object behavior
	*
	* @example
	* var myCustomMethod = function(message) { alert('cutomMessage') };
	* myMap.register('myCustomMethod',myCustomMethod);
	* myMap.myCustomMethod('This is a custom registered method');
	*/
	
	register: function(methodName, methodImpl){
		GlobalMap.prototype[methodName] = methodImpl;
	},

    /**
	* @description Adds a new marker to the map
	*
	* @param {object} config Configuration object for the marker
	* @param {object} [config.iconConfig] Configuration object for the marker's icon
	* @param {String} [config.iconConfig.url] Url of the image to display
	* @param {Number} [config.iconConfig.height] Icon's height
	* @param {Number} [config.iconConfig.width] Icon's width
	* @param {Number} config.latitude Latitude of the geographic point to add the marker
	* @param {Number} config.longitude Longitude of the geographic point to add the marker
	* @param {Boolean} [config.disableOpenOnClick] Avoid opening info window on click. Default value: false
	* @param {Object} [config.infowindowConfig] Config object for the marker's infowindow.
	* @param {Object} [config.infowindowConfig.cls] Css class to apply to the marker's infowindow
	* @param {Object} [config.infowindowConfig.xOffset] The x-axis offset (in pixels) from the bottom left corner of the infowindow to the map pixel corresponding to the marker's position. Default value: -130
	* @param {Object} [config.infowindowConfig.yOffset] The y-axis offset (in pixels) from the bottom left corner of the infowindow to the map pixel corresponding to the marker's position. Default value: -50
	*
	* @returns {object} A reference to the marker created and added to the map
	*/	
	
	addMarker: function(markerConfig) {
		return this.mapObject.addMarker(markerConfig);
	},
	
	/**
	* @description Adds a new html marker to the map
	*
	* @param {object} config Configuration object for the marker
	* @param {object} [config.html] HTML content that will be displayed as the marker
	* @param {Number} config.latitude Latitude of the geographic point to add the marker
	* @param {Number} config.longitude Longitude of the geographic point to add the marker
	* @param {Object} [config.infowindowConfig] Config object for the marker's infowindow.
	* @param {Object} [config.infowindowConfig.cls] Css class to apply to the marker's infowindow
	* @param {Object} [config.infowindowConfig.xOffset] The x-axis offset (in pixels) from the bottom left corner of the infowindow to the map pixel corresponding to the marker's position. Default value: -130
	* @param {Object} [config.infowindowConfig.yOffset] The y-axis offset (in pixels) from the bottom left corner of the infowindow to the map pixel corresponding to the marker's position. Default value: -50
	*
	* @returns {object} A reference to the marker created and added to the map
	*/	
	
	addHtmlMarker: function(markerConfig) {
		return this.mapObject.addHtmlMarker(markerConfig);
	},
	
    /**
	* @description Center the map on the selected coordinates
	*
	* @param {Number} latitude Latitude of the geographic point to center the map
	* @param {Number} longitude Longitude of the geographic point to center the map
	*/	
	
	center: function(latitude, longitude) {
		this.mapObject.center(latitude,longitude);
	},
	
    /**
	* @description Center the map on the selected coordinates with paning effect
	*
	* @param {Number} latitude Latitude of the geographic point to center the map
	* @param {Number} longitude Longitude of the geographic point to center the map
	*/	
	
	panTo: function(latitude, longitude) {
		this.mapObject.panTo(latitude,longitude);
	},

	/**
	* @description Removes a marker from the map
	*
	* @param {object} marker Marker to be removed from the map
	*/
	removeMarker: function(marker){
		this.mapObject.removeMarker(marker);
	},
	
	/**
	* @description Adds a group of markers to the map
	*
	* @param {Array} collection Collection of marker config objects to be added
	* @param {String} name Name that will be used to reference the marker collection
	*/	
	addMarkerCollection: function(markers, name){
		this.mapObject.addMarkerCollection(markers, name);
	},
	
	/**
	* @description Adds a group of html markers to the map
	*
	* @param {Array} collection Collection of HTML marker config objects to be added
	* @param {String} name Name that will be used to reference the marker collection
	*/	
	addHtmlMarkerCollection: function(markers, name){
		this.mapObject.addHtmlMarkerCollection(markers, name);
	},
	
	/**
	* @description Removes a group of markers from the map
	*
	* @param {String} name Name of the collection to be removed 
	*/	
	removeMarkerCollection: function(name){
		this.mapObject.removeMarkerCollection(name);
	},
	
	/**
	* @description Shows the map using the best zooming for displaying all the markers
	*/	
	bestFit: function(){
		this.mapObject.bestFit();
	},

	/**
	* @description Adds a filled region to the map
	*
	* @param {Array} coordinates A collection of coordinates ({latitude: Number, longitude: Number}) that will be  shown as the polygon vertices
	*
	* @param {options} config Configuration object for the polygon's color and transparency
	* @param {String} config.fillColor Color used to fill the polygon's surface, in hexadecimal code
	* @param {Number} config.opacity Opacity of the polygon's surface. Values can be between 0 and 1
	*/	
	addPolygon: function(name, coordinates, options){
		this.mapObject.addPolygon(name, coordinates, options);
	},
	/**
	* @description Gets a polygon from the map
	*
	* @param {String} name The polygon's name
	*
	* @returns {object} polygon Polygon to be retrieved (Native object)
	*/	
	getPolygon: function(name){
		return this.mapObject.getPolygon(name);
	},
	/**
	* @description Removes a polygon from the map
	*
	* @param {String} name The polygon's name
	*/
	removePolygon: function(name){
		this.mapObject.removePolygon(name);
	},

	/**
	* @description Adds a line to the map
	*
	* @param {Array} coordinates A collection of coordinates ({latitude: Number, longitude: Number})
	*
	* @param {options} config Configuration object for the line's color and transparency
	* @param {String} config.color Line's color in hexadecimal code
	* @param {Number} config.opacity Line's opacity. Values can be between 0 and 1
	* @param {Number} config.weight Line's weight  (in pixels)
	*/	
	addLine: function(name, coordinates, options){
		this.mapObject.addLine(name, coordinates, options);
	},
	/**
	* @description Gets a line from the map
	*
	* @param {String} name The line's name
	*
	* @returns {object} line Line to be retrieved (Native object)
	*/
	getLine: function(name){
		return this.mapObject.getLine(name);
	},
	/**
	* @description Removes a line from the map
	*
	* @param {String} name The line's name
	*/
	removeLine: function(name){
		this.mapObject.removeLine(name);
	},
	
	/**
	* @description Adds an event listener to an object
	*
	* @param {object} source The element  to add the listener to 
	* @param {String} event Event name to be handled 
	* @param {Function} handler Handler function for the specified event. Functions will be invoked using the arguments specified in the provider's API
	*/
	addListener: function(source, eventName, handler){
		this.mapObject.addListener(source, eventName, handler);
	},
	
	/**
	* @description Adds an event listener to the map
	*
	* @param {String} event Event name to be handled 
	* @param {Function} handler Handler function for the specified event. Functions will be invoked using the arguments specified in the provider's API
	*/
	addMapListener: function(eventName, handler){
		this.mapObject.addMapListener(eventName, handler);
	},
	
	/**
	* @description Removes an event listener from an element
	*
	* @param {object} source The object to remove the listener from
	* @param {String} event Event name
	*/
	removeListener: function(source, eventName){
		this.mapObject.removeListener(source, eventName);
	},
	
	/**
	* @description Removes an event listener from the map
	*
	* @param {String} event Event name
	*/
	removeMapListener: function(eventName){
		this.mapObject.removeMapListener(eventName);
	},
	/**
	* @description Gets a marker collection from the map
	*
	* @param {String} name Name of the marker collection to be retrieved
	* @returns {Array} Marker collection
	*/
	getMarkerCollection: function(name){
		return this.mapObject.getMarkerCollection(name);
	},
	/**
	* @description Gets coordinates of the map's center
	*
	* @returns {object} Coordinates in json format ({lat: value, lng: value})
	*/
	getCenter: function(){
		return this.mapObject.getCenter();
	},
	/**
	* @description Changes the icon for a marker
	* @param  {object} marker Marker that will be modified
	* @param {object} iconConfig Configuration object for the marker's icon
	*
	*/
	changeMarkerIcon: function(marker, iconConfig){
		this.mapObject.changeMarkerIcon(marker, iconConfig);
	},
	/**
	* @description Sets the zoom level to be at the street level
	*
	*/
	streetZoomLevel: function(){
		this.mapObject.streetZoomLevel();
	},
	/**
	* @description Redraws the map 
	*
	*/
	redrawMap: function(){
		this.mapObject.redrawMap();
	}
};