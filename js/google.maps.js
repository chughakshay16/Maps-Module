/** 
 * @class Implementation of DynamicMapInterface for Google Maps v3
 *
 * @example var mapObject = new GlobalMapObject();
 *
 * @author Marcelo Giovinazzo
 *
 * @param {Map} config Configuration map {key:value}
 */

function GlobalMapObject(config){}

GlobalMapObject.prototype = {
	defaultInfoWindowPointerHtml: '<div style="position: absolute; left: 50%; height: 0pt; width: 0pt; margin-left: -15px; bottom: -15px; border-width: 15px 15px 0pt; border-color: #FFFFFF transparent transparent; border-style: solid;"></div> ',
	defaultInfoWindowStyle: {backgroundColor: '#FFFFFF', width: '245px', padding: '8px'},

	/**
	* @description Implements Lazy Load for the map provider API
	*
	* @param {Function} loadCallback Callback function to process after external API is loaded
	*/
	_loadScript: function(key, callback,lang, clientId, channelId){
		window.scriptLoading = true;
		window.loadCallback = function(){
			callback();
			$.each(window.pendingCallbacks, function(idx, fn){
				fn();
			});
			window.pendingCallbacks = [];
			window.scriptLoading = false;
		}
		var client = clientId ? '&client='+clientId : '';
		var channel = channelId ? '&channel='+channelId : '';
		$.getScript('http://maps.googleapis.com/maps/api/js?v=3'+client+'&sensor=false'+channel+'&language='+lang+'&callback=loadCallback');
		
	},

	/**
	* @description Initializes the Provider API Map Object and center it to the selected coordinates
	*
	* @param {String} containerSelector Jquery selector for the map's container element
	* @param {Number} defaultZoom Initial zoom value
	* @param {Number} centerToLat Latitude of the geographic point to center the map
	* @param {Number} centerToLong Longitude of the geographic point to center the map
	* @param {Boolean} declutterEnabled Value to determine if declutter is enabled for the markers in the map
	* @param {Object} [mapControls] Config object for the controls to be displayed on the map
	* @param {Boolean} [mapControls.pan] Enable or disable pan control in the map. Default value: true
	* @param {Boolean} [mapControls.zoom] Enable or disable zoom control in the map. Default value: true
	* @param {Boolean} [mapControls.mapType] Enable or disable map type control in the map. Default value: true
	*/	
	_setup: function(containerSelector, defaultZoom, centerToLat, centerToLong, declutterEnabled, mapControls){
		var centerTo = new google.maps.LatLng(centerToLat, centerToLong);
		var mapOptions = {
			zoom: defaultZoom,
			center: centerTo,
			mapTypeId: google.maps.MapTypeId.ROADMAP,
			disableDoubleClickZoom: true,
			panControl: mapControls.pan,
			zoomControl: mapControls.zoom,
			mapTypeControl: mapControls.mapType,
			streetViewControl: mapControls.streetView			
		};
		this.collections = {};
		this.allMarkers = [];
		this.declutterEnabled = declutterEnabled;
		this.map = new google.maps.Map($(containerSelector).get('0'), mapOptions);
		this.addEvents(this.map, [
			/**
			 * @description Fired when the map is clicked
			 * @event
			 */
			'mapclick',
			/**
			 * @description Fired when the map is double clicked
			 * @event
			 */
			'mapdblclick',
			/**
			 * @description Fired when the map zoom changes
			 * @event
			 */
			'mapzoom',
			/**
			 * @description Fired when new markers are loaded
			 * @event
			 */
			'markersloaded'
		]);
		if(this.declutterEnabled){
			this.markersCluster = new MarkerClusterer(this.map); 
		}else{
			this.markers = [];
		}
		this.polygons = {};
		this.lines = {};
		this._addListeners();
		if(!this.HtmlMarker){
			/**
			* @ignore
			*/
			this.HtmlMarker = function (point, map, config){
				this.location = point;
				this.map = map;
				this.config = config;	
			}
			this._initializeHtmlMarker();
		}
	},

	/**
	* @description Add controls to the map
	*/	
	_setControls:function(){
	},
	
	/**
	* @ignore
	*/	
	_addListeners:function(){
		var _this = this;
		this.addListener(_this.map, 'click', function(e){
			google.maps.event.trigger(_this.map, 'mapclick' , {lat: e.latLng.lat(), lng: e.latLng.lng()});
		});
		this.addListener(_this.map, 'dblclick', function(e){
			google.maps.event.trigger(_this.map, 'mapdblclick' , {lat: e.latLng.lat(), lng: e.latLng.lng()});
		});
		this.addListener(_this.map, 'zoom_changed', function(e){
			google.maps.event.trigger(_this.map, 'mapzoom' , e);
		});
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
	* @param {Object} [config.infowindowConfig] Config object for the marker's infowindow
	* @param {Object} [config.infowindowConfig.cls] Css class to apply to the marker's infowindow
	* @param {Object} [config.infowindowConfig.xOffset] The x-axis offset (in pixels) from the bottom left corner of the infowindow to the map pixel corresponding to the marker's position. Default value: -130
	* @param {Object} [config.infowindowConfig.yOffset] The y-axis offset (in pixels) from the bottom left corner of the infowindow to the map pixel corresponding to the marker's position. Default value: -50
	*
	* @returns {object} A reference to the marker created and added to the map
	*/	
	addMarker:function(markerConfig){
		var marker = this._createMarker(markerConfig, true);
		if(this.markersCluster){
			this.markersCluster.addMarker(marker);
		}else{
			this.markers.push(marker);
			marker.setMap(this.map);
		}
		return marker;
	},
	/**
	* @ignore
	*/
	_createMarker: function(markerConfig, isIconMarker){
		var lat = markerConfig.latitude;
		var lng = markerConfig.longitude;
		var point = new google.maps.LatLng(lat, lng);
		var infowindowConfig = markerConfig.infowindowConfig || {};
		var infowindow = this._createInfoWindow(this._getInfoWindowContent(markerConfig.title, markerConfig.content), lat, lng, infowindowConfig); 
		var rolloverWindow = this._createInfoWindow(this._getInfoWindowContent(markerConfig.title), lat, lng, infowindowConfig);
		
		if(isIconMarker == true){
			var markerCfg = {position: point};
			var markerIconConfig;
			var selectedIconConfig;
			if(markerConfig.iconCfg){
				var iconSize = new google.maps.Size(markerConfig.iconCfg.width, markerConfig.iconCfg.height);
				markerCfg.icon = new google.maps.MarkerImage(markerConfig.iconCfg.url, iconSize);
				markerIconConfig = markerConfig.iconCfg;
				selectedIconConfig = markerConfig.iconCfg.selectedIcon;
			}
			var marker = new google.maps.Marker(markerCfg);
			marker.markerIconConfig = markerIconConfig;
			marker.selectedIconConfig = selectedIconConfig;
			
			this._addMarkerListeners(this.map, marker, markerConfig.disableOpenOnClick);
		}else{
			var marker = new this.HtmlMarker(point, this.map, markerConfig);
		}
		marker.infowindow = infowindow;
		if(infowindow){
			this._addInfoWindowListeners(infowindow);
			infowindow.marker = marker;
		}
		marker.rolloverwindow = rolloverWindow;
		this.addEvents(marker, [
			/**
			 * @description Fired when a marker is clicked
			 * @event
			 */
			'markerclick',
			/**
			 * @description Fired when a markeris double clicked
			 * @event
			 */
			'markerdblclick',
			/**
			 * @description Fired when the marker's info window is closed
			 * @event
			 */
			'infowindowclosed',
			/**
			 * @description Fired when the mouse enters the area of the marker icon
			 * @event
			 */
			'markermouseover'
		]);
		if(markerConfig.listeners){
			this.addMarkerCustomListeners(marker, markerConfig.listeners);
		}
		this.allMarkers.push(marker);
		return marker;
	},
	/**
	* @ignore
	*/
	_getInfoWindowContent: function(title, content){
		var infoContent = content || '';
		return (title) ? title + infoContent : infoContent;
	},
	/**
	* @ignore
	*/
	_createInfoWindow: function(content, lat, lng, windowConfig){
		if(content && content != ''){
			var pointerHtml, style, boxClass;
			if(windowConfig.cls){
				pointerHtml = '<div class="'+windowConfig.cls+'-pointer"></div>';
				boxClass = windowConfig.cls;
				style = {};
			}else{ // this is the default styling for infowindows
				pointerHtml = this.defaultInfoWindowPointerHtml;
				style = this.defaultInfoWindowStyle;
			}
			var windowContent = content+pointerHtml;
			var windowOptions = {boxClass: boxClass, position: new google.maps.LatLng(lat, lng), content: windowContent, pixelOffset: new google.maps.Size(windowConfig.xOffset || -130, windowConfig.yOffset || -50), 
								alignBottom: true, boxStyle: style, disableAutoPan: false, infoBoxClearance: new google.maps.Size(60, 60)};
			return new InfoBox(windowOptions);
		}
		
	},
	/**
	* @description Adds a new html marker to the  map
	*
	* @param {object} config Configuration object for the marker
	* @param {String} config.html Html content for the marker
	* @param {Number} config.latitude Latitude of the geographic point to add the marker
	* @param {Number} config.longitude Longitude of the geographic point to add the marker
	*
	* @returns {object} A reference to the marker created and added to the map
	*/	
	
	addHtmlMarker: function(markerConfig) {
		var marker = this._createMarker(markerConfig, false);
		if(this.markersCluster){
			this.markersCluster.addMarker(marker);
		}else{
			this.markers.push(marker);
			marker.setMap(this.map);
		}
		return marker;
	},
	/**
	* @description Center the map on the selected coordinates
	*
	* @param {Number} latitude Latitude of the geographic point to add the marker
	* @param {Number} longitude Longitude of the geographic point to add the marker
	*/	
	center:function(latitude, longitude){
		this.map.setCenter(new google.maps.LatLng(latitude, longitude));
	},
	
	/**
	* @description Center the map on the selected coordinates with paning effect
	*
	* @param {Number} latitude Latitude of the geographic point to add the marker
	* @param {Number} longitude Longitude of the geographic point to add the marker
	*/
	panTo:function(latitude, longitude){
		this.map.panTo(new google.maps.LatLng(latitude, longitude));
	},
	
	/**
	* @description Removes a marker from the map
	*
	* @param {object} marker Marker to be removed from the map
	*/	
	removeMarker: function(marker){
		marker.setMap(null);
		this.allMarkers.splice($.inArray(marker, this.allMarkers), 1);
	},
	
	/**
	* @description Adds a group of markers to the map
	*
	* @param { Array} collection Collection of marker config objects to be added
	* @param {String} name Name that will be used to reference the marker collection
	*/	
	addMarkerCollection: function(markers, name){
		this._addCollection(markers, name, true);
	},
	
	/**
	* @description Adds a group of html markers to the map
	*
	* @param { Array} collection Collection of html marker config objects to be added
	* @param {String} name Name that will be used to reference the marker collection
	*/	
	addHtmlMarkerCollection: function(markers, name){
		this._addCollection(markers, name, false);
	},
	/**
	* @ignore
	*/
	_addCollection: function(markers, name, isIconCollection){
		var _this = this;
		var markersAdded = [];
		$.each(markers, (function(idx, mrkCfg){
			var mrk = _this._createMarker(mrkCfg, isIconCollection);
			if(!_this.declutterEnabled == true){
				mrk.setMap(_this.map);
			}
			markersAdded.push(mrk);
		}));
		var markerCollection = markersAdded;
		if(this.declutterEnabled == true){
			this.markersCluster.addMarkers(markerCollection);
		}
		this.collections[name] = markerCollection;
		google.maps.event.trigger(this.map, 'markersloaded');
	},
	/**
	* @description Removes a group of markers from the map
	*
	* @param {String} name Name of the collection to be removed
	*
	*/	
	removeMarkerCollection: function(collectionName){
		var _this = this;
		var collectionToRemove = this.getMarkerCollection(collectionName);
		$.each(collectionToRemove, function(idx, mrk){
			_this.removeMarker(mrk);
		});
		if(this.markersCluster){
			this.markersCluster.clearMarkers();
			this.markersCluster.addMarkers(this.allMarkers);
		}
		this.collections[collectionName] = null;
	},
	
	/**
	* @description Gets a marker collection from the map
	*
	* @param {String} name Name of the marker collection to be retrieved
	* @returns {Array} Marker collection
	*/
	getMarkerCollection: function(name){
		return (this.collections[name] ? this.collections[name] : null);
	},
	
	/**
	* @description Shows the map using the best zooming for displaying all the markers
	*
	*/	
	bestFit: function(){
		var _this = this;
		var bounds = new google.maps.LatLngBounds();
		$.each(_this.allMarkers, function(idx, mrk){
			bounds.extend(mrk.getPosition());
		});	
		_this.map.fitBounds(bounds);
	},
	
	/**
	* @description Adds a filled region to the map
	*
	* @param {Array} coordinates A collection of coordinates that will be  shown as the polygon  vertices
	* @param {options} config Configuration object for the polygon's color and transparency
	* @param {String} config.fillColor Color used to fill the polygon's surface, in hexadecimal code
	* @param {Number} config.opacity Opacity of the polygon's surface. Values can be between 0 and 1
	*/	
	addPolygon: function(name, coordinates, options){
		_this = this;
		
		var path = this._getPath(coordinates);
		var polygonOptions = {map: this.map, paths: path, fillColor: options.fillColor, fillOpacity: options.opacity, title: options.title};
		var polygon = new google.maps.Polygon(polygonOptions);
		
		var titleWindow = new google.maps.InfoWindow();
				
		function displayTitle(event){
			
			var highlightOptions = {strokeWeight:4, fillOpacity: .7};
			polygon.setOptions(highlightOptions);
			
			titleWindow.setContent(polygonOptions.title);
			titleWindow.setPosition(event.latLng);
			titleWindow.open(_this.map);
		}
		
		function hideTitle(){
			var displayOptions = {strokeWeight:3, fillOpacity: .3};
			polygon.setOptions(displayOptions);

			titleWindow.close();
		}
		
		if(polygonOptions.title){
			google.maps.event.addListener(polygon, 'mouseover', displayTitle);
			google.maps.event.addListener(polygon, 'mouseout', hideTitle);
		}		
		
		this.polygons[name] = polygon;
	},
	/**
	* @description Gets a polygon from the map
	*
	* @param {String} name The polygon's name
	*
	* @returns {object} polygon Polygon to be retrieved (Native object)
	*/	
	getPolygon: function(name){
		return this.polygons[name];
	},
	/**
	* @description Removes a polygon from the map
	*
	* @param {String} name The polygon's name
	*/
	removePolygon: function(name){
		var polygon = this.getPolygon(name);
		if(polygon) polygon.setMap(null);
		this.polygons[name] = null;
		
	},
	/**
	* @description Adds a line to the map
	*
	* @param {Array} coordinates A collection of coordinates
	*
	* @param {options} config Configuration object for the line's color and transparency
	*/	
	addLine: function(name, coordinates, options){
		var path = this._getPath(coordinates);
		var lineOptions = {map: this.map, path: path, strokeColor: options.color, strokeOpacity: options.opacity, strokeWeight: options.weight};
		var line = new google.maps.Polyline(lineOptions);
		this.lines[name] = line;
	},
	/**
	* @description Gets a line from the map
	*
	* @param {String} name The line's name
	*
	* @returns {object} line Line to be retrieved (Native object)
	*/
	getLine: function(name){
		return this.lines[name];
	},
	/**
	* @description Removes a line from the map
	*
	* @param {String} name The line's name
	*/
	removeLine: function(name){
		var line = this.getLine(name);
		if(line) line.setMap(null);
		this.lines[name] = null;
	},
	/**
	* @ignore
	*/
	_getPath: function(coordinates){
		var path = new google.maps.MVCArray();
		$.each(coordinates, function(idx, latLng){
			path.push(new google.maps.LatLng(latLng.latitude, latLng.longitude));
		});
		return path;
	},
	
	/**
	* @description Adds an event listener to an object
	*
	* @param {object} source The element  to add the listener to 
	* @param {String} event Event name to be handled 
	* @param {Function} handler Handler function for the specified event. 
	*/
	addListener: function(source, eventName, handler){
		var eventHandler = google.maps.event.addListener(source, eventName, handler);
		if(source[eventName]){
			source[eventName] = eventHandler;
		}
	},
	
	/**
	* @description Adds an event listener to the map
	*
	* @param {String} event Event name to be handled 
	* @param {Function} handler Handler function for the specified event. 
	*/
	addMapListener: function(eventName, handler){
		this.addListener(this.map, eventName, handler);
	},
	
	/**
	* @description Removes an event listener from an element
	*
	* @param {object} source The object to remove the listener from
	* @param {String} event Event name
	*/
	removeListener: function(source, eventName){
		google.maps.event.removeListener(source[eventName]);
		source[eventName] = eventName;
	},
	
	/**
	* @description Removes an event listener from the map
	*
	* @param {String} event Event name
	*/
	removeMapListener: function(eventName){
		this.removeListener(this.map, eventName);
	},
	
	/**
	* @ignore
	*/
	_addMarkerListeners: function(map, marker, disableOpenOnClick){
		var _this = this;
		google.maps.event.addListener(marker, 'click', function(e) {
			if(!disableOpenOnClick){
				if(marker.rolloverwindow) marker.rolloverwindow.close();
				_this.currentrollover = undefined;
				_this._openInfoWindow(marker);
				if(_this.previousSelectedHotel && _this.previousSelectedHotel.markerIconConfig){
					_this.changeMarkerIcon(_this.previousSelectedHotel, marker.markerIconConfig);
				}
				if(marker.selectedIconConfig) _this.changeMarkerIcon(marker, marker.selectedIconConfig);
				_this.previousSelectedHotel = marker;
			}
			e.marker = marker;
			google.maps.event.trigger(marker, 'markerclick' , e);
		});
		google.maps.event.addListener(marker, 'dblclick', function(e) {
			e.marker = marker;
			google.maps.event.trigger(marker, 'markerdblclick' , e);
		});
		google.maps.event.addListener(marker, 'mouseover', function(e) {
			_this._openRolloverWindow(marker);
			e.marker = marker;
			google.maps.event.trigger(marker, 'markermouseover' , e);
		});
	},
	/**
	* @ignore
	*/
	_addInfoWindowListeners: function(infowindow){
		var _this = this;
		google.maps.event.addListener(infowindow, 'closeclick', function() {
			var e = {marker: infowindow.marker};
			if(_this.previousSelectedHotel && _this.previousSelectedHotel.markerIconConfig){
				_this.changeMarkerIcon(_this.previousSelectedHotel, infowindow.marker.markerIconConfig);
			} 
			_this.previousSelectedHotel = undefined;
			google.maps.event.trigger(infowindow.marker, 'infowindowclosed' , e);
		});
	},
	/**
	* @ignore
	*/
	_openInfoWindow: function(marker){
		if(this.currentinfowindow) this.currentinfowindow.close();
		if(marker.infowindow){
			this.currentinfowindow = marker.infowindow;
			this.currentinfowindow.open(this.map, marker);	
		}
	},
	/**
	* @ignore
	*/
	_openRolloverWindow: function(marker){
		if(this.previousSelectedHotel != marker && marker.rolloverwindow){
			if(this.currentrollover) this.currentrollover.close();
			this.currentrollover = marker.rolloverwindow;
			this.currentrollover.open(this.map, marker);	
		}
		
	},
	/**
	 * @description Adds named events to an object.
	 *
	 * @param {Object} eventSrc Event source object.
	 * @param {Array} Event names to add.
	 */
	addEvents: function(eventSrc, eventNames){
		for(var i = 0; i < eventNames.length; i++){
			var eventName = eventNames[i];
			eventSrc[eventName] = eventName;
		}
	},
	
	/**
	* @ignore
	*/
	_initializeHtmlMarker: function(){
		var instance = this;
		this.HtmlMarker.prototype = new google.maps.OverlayView();
		/**
		* @ignore
		*/
		this.HtmlMarker.prototype.onAdd = function(){
			var div = document.createElement('div');
			div.style.border = 'none';
			div.style.borderWidth = '0px';
			div.style.position = 'absolute';
			var contentDiv = document.createElement('div');
			contentDiv.innerHTML = this.config.html;
			div.appendChild(contentDiv);  
			this.div = div;
			var panes = this.getPanes();
			panes.overlayImage.appendChild(div);
		};
		/**
		* @ignore
		*/
		this.HtmlMarker.prototype.draw = function(){
			var overlayProjection = this.getProjection();
			var point = overlayProjection.fromLatLngToDivPixel(this.location);
			var div = this.div;
			div.style.left = point.x + 'px';
			div.style.top = point.y + 'px';
			var me = this;
			var listeners = this.config.listeners;
			this._addMarkerDomListeners();
			
		};
		/**
		* @ignore
		*/
		this.HtmlMarker.prototype.onRemove = function(){
			this.div.parentNode.removeChild(this.div);
			this.div = null;
		};
		/**
		* @ignore
		*/
		this.HtmlMarker.prototype.getPosition = function(){
			return this.location;
		};
		/**
		* @ignore
		*/
		this.HtmlMarker.prototype._addMarkerDomListeners = function(el, marker){
			var me = this;
			google.maps.event.addDomListener(this.div, "click", function(e) {
				if(!me.config.disableOpenOnClick){
					if(me.rolloverwindow) me.rolloverwindow.close();
					instance.currentrollover = undefined;
					instance._openInfoWindow(me);
				}	
				e.marker = me;
				google.maps.event.trigger(me, "markerclick",e);
			}, true);
			google.maps.event.addDomListener(this.div, "dblclick", function(e) {
				e.marker = me;
				google.maps.event.trigger(me, "markerdblclick",e);
			}, true);
			google.maps.event.addDomListener(this.div, "mouseover", function(e) {
				instance._openRolloverWindow(me);
				e.marker = me;
				google.maps.event.trigger(me, "markermouseover",e);
			}, true);
		};
	},
	/**
	* @ignore
	*/
	addMarkerCustomListeners: function(marker, listeners){
		if(listeners.markerclick){
			this.addListener(marker, 'markerclick', listeners.markerclick.handler);
		}
		if(listeners.markerdblclick){
			this.addListener(marker, 'markerdblclick', listeners.markerdblclick.handler);
		}
		if(listeners.infowindowclosed){
			this.addListener(marker, 'infowindowclosed', listeners.infowindowclosed.handler);
		}
		if(listeners.markermouseover){
			this.addListener(marker, 'markermouseover', listeners.markermouseover.handler);
		}
	},
	/**
	* @description Gets coordinates of the map's center
	*
	* @returns {object} Coordinates in json format ({lat: value, lng: value})
	*/
	getCenter: function(){
		var center = this.map.getCenter();
		return {lat: center.lat(), lng: center.lng()};
	},
	
	/**
	* @description Changes the icon for a marker
	* @param  {object} marker Marker that will be modified
	* @param {object} iconConfig Configuration object for the marker's icon
	*
	*/
	changeMarkerIcon: function(marker, iconConfig){
		var iconSize = new google.maps.Size(iconConfig.width, iconConfig.height);
		var newIcon = new google.maps.MarkerImage(iconConfig.url, iconSize)
		marker.setIcon(newIcon);
	},
	/**
	* @description Sets the zoom level to be at the street level
	*
	*/
	streetZoomLevel: function(){
		this.map.setZoom(16);
	},
	/**
	* @description Redraws the map 
	*
	*/
	redrawMap: function(){
		google.maps.event.trigger(this.map, "resize");
	}
};

/**
 * @class : Implementation of Static Google Maps V1 
 * @param : config 
 * config :{
 * markers:{Object} contains url(optional) and points(required),
 * size:{String}(optional) if value is not explicitly mentioned here, it takes the default value '400x400', 
 * scale:{String}(optional) if not specified ,takes default value '1', 
 * format:{String}(optional) if not specified, takes default value 'png', 
 * maptype:{String}(optional)if not specified , takes default value 'roadmap', 
 * zoom:{String}(optional) if not specified here, takes the zoom value sent from GlobalMap object, 
 * center:{Object}(optional) if not specified here, takes value sent from GlobalMap object
 * clientId: {String}(optional) to be passed to the parameter client in the URL
 * channel : {String}(optional) to be passed to the parameter channel in the URL 
 * } 
 * markers: {
 * color:{String} color of the label
 * urls:{Array} the urls for the custom icons, 
 * points:{Array} latlong values for
 * these points }
 * 
 

function GlobalStaticMapObject(config) {
	if (config) {
		this.markers = config.markers || null;
		this.size = config.size || '400x400';
		this.scale = config.scale || '1';
		this.format = config.format || 'png';
		this.maptype = config.maptype || 'roadmap';
		this.zoom = config.zoom || '';
		this.center = config.center || null;
		this.markerColor=config.markers.color||"blue";
		this.clientId=config.clientId||"";
		this.channel=config.channel||"";
	}
}
GlobalStaticMapObject.prototype = {
	/** @description : mantains the number that is diplayed on a marker icon 
	count : 1,
	/** @description : checks whether user has supplied marker information or not
	useMarker : function() {
		if (this.markers) {
			if (this.markers.points.length > 0)
				return true;
			else
				return false;
		}
	},
	/**
	 * @description : loads the url in the image tag 
	 * @param :{String} the id of the image tag 
	 * @param :{String} defaultZoom 
	 * @param : {String} centerToLat,to be used when the user hasnt supplied the value in config 
	 * @param :(String} centerToLong , to be used when the user hasnt supplied the value in config 
	 * @param : (Boolean)declutterEnabled 
	 * @param : {Object}mapControls
	 
	_setup : function(containerSelector, defaultZoom, centerToLat,
			centerToLong, declutterEnabled, mapControls) {
		window.scriptLoaded = false;
		this.url = this._createUrl(defaultZoom, centerToLat, centerToLong);
		$(containerSelector).attr("src", this.url);

	},
	/**@ignore
	 * 
	 
	_setControls : function() {

	},
	/**
	 * @description : reponsible for creating the url loaded in the image tag
	 * @param : {String} defaultZoom 
	 * @param : {String} centerToLat 
	 * @param :{String} centerToLong 
	 * @returns : {String} returns the assembled url based on the parameters passed in config
	  
	_createUrl : function(defaultZoom, centerToLat, centerToLong) {
		var tempUrl;
		/** if zoom and center not specified in config, take the values passed
		* into this function
		if (!this.zoom)
			this.zoom = defaultZoom;
		if (!this.center) {
			this.center = {
				centerLat : centerToLat,
				centerLong : centerToLong
			}
		}
		/**setting the values which are not going to depend whether markers are
		* present or absent
		client = this.clientId?("&client="+this.clientId):"";
		channel = this.channel?("&channel="+this.channel):"";
		tempUrl = "http://maps.googleapis.com/maps/api/staticmap?sensor=false&size="
				+ this.size
				+ "&format="
				+ this.format
				+ "&maptype="
				+ this.maptype + "&scale=" + this.scale
				+ client + channel;
		/** if markers are present, then no need for zoom and center values 
		 
		
		if (this.useMarker()) {
			var iconUrls = this.markers.urls || [];
			// url=encodeURI(iconUrl);
			var times = iconUrls.length;
			var limit = true;
			if (times == 1)
				limit = false;
			
			for ( var i = 0; i < this.markers.points.length; i++) {
				var obj = this.markers.points[i];
				//if custom icon url is specified
				if (times > 0) {
					var tempIcon = iconUrls[i];
					if (tempIcon) {
						tempIcon = encodeURI(tempIcon);
						tempUrl = tempUrl + "&markers=icon:" + tempIcon + "|"
								+ obj[0] + "," + obj[1];
					}

				} else if (times == 0 && !limit) {
					tempUrl = tempUrl + "&markers=icon:" + tempIcon + "|"
							+ obj[0] + "," + obj[1];
					times++;
				} else
					tempUrl = tempUrl + "&markers=color:"+this.markerColor+"|label:"
							+ this.count + "|" + obj[0] + "," + obj[1];
				this.count++;
				times--;
			}
			return encodeURI(tempUrl);
		}
		/**if markers absent, center and zoom are necessary 
		else {
			return encodeURI(tempUrl + "&center=" + this.center.centerLat + ","
					+ this.center.centerLong + "&zoom=" + this.zoom);
		}

	}
};
*/
/**
 * @class : Implementation of Static Google Maps V1 
 * @param : config 
 * config :{
 * markers:{Object} contains url(optional) and points(required),
 * size:{String}(optional) if value is not explicitly mentioned here, it takes the default value '400x400', 
 * scale:{String}(optional) if not specified ,takes default value '1', 
 * format:{String}(optional) if not specified, takes default value 'png', 
 * maptype:{String}(optional)if not specified , takes default value 'roadmap', 
 * zoom:{String}(optional) if not specified here, takes the zoom value sent from GlobalMap object, 
 * center:{Object}(optional) if not specified here, takes value sent from GlobalMap object
 * clientId: {String}(optional) to be passed to the parameter client in the URL
 * channel : {String}(optional) to be passed to the parameter channel in the URL 
 * } 
 * markers: {
 * color:{String} color of the label
 * urls:{Array} the urls for the custom icons, 
 * points:{Array} latlong values for
 * these points }
 * 
 */

function GlobalStaticMapObject(config){
			if (config) {
		this.markers = config.markers || null;
		this.size = config.size || '400x400';
		this.scale = config.scale || '1';
		this.format = config.format || 'png';
		this.maptype = config.maptype || 'roadmap';
		this.zoom = config.zoom || '';
		this.center = config.center || null;
		this.markerColor=config.markers.color||"blue";
		this.clientId=config.clientId||"";
		this.channel=config.channel||"";
		this.useChar=(config.useChar===true)?true:false;
		this.useLabel=(config.useLabel===false)?false:true;
	}
}
GlobalStaticMapObject.prototype={
	/** @description : mantains the number or the character that is diplayed on a marker icon */
	count:1,
	character:'A',
	/** @description : checks whether user has supplied marker information or not*/
	useMarker:function(){
		if(this.markers)
		{
			if(this.markers.points.length>0)
			return true;
		else
			return false;
		}
	},
	/**
	 * @description : loads the url in the image tag 
	 * @param :{String} the id of the image tag 
	 * @param :{String} defaultZoom 
	 * @param : {String} centerToLat,to be used when the user hasnt supplied the value in config 
	 * @param :(String} centerToLong , to be used when the user hasnt supplied the value in config 
	 * @param : (Boolean)declutterEnabled 
	 * @param : {Object}mapControls
	 */
	_setup: function(containerSelector,defaultZoom,centerToLat,centerToLong,declutterEnabled,mapControls){
		window.scriptLoaded=false;
		this.url=this._createUrl(defaultZoom,centerToLat,centerToLong);
		//alert(this.url);
		$(containerSelector).attr("src",this.url);
		
	},
	//@ignore
	_setControls:function(){
		
	},
/**
	 * @description : reponsible for creating the url loaded in the image tag
	 * @param : {String} defaultZoom 
	 * @param : {String} centerToLat 
	 * @param :{String} centerToLong 
	 * @returns : {String} returns the assembled url based on the parameters passed in config
	 */ 
	_createUrl:function(defaultZoom,centerToLat,centerToLong){
		var tempUrl;
				/**if zoom and center not specified in config, take the values passed into this function */
				if(!this.zoom)
				this.zoom="21";
				if(!this.center)
				{
					this.center={
					centerLat:centerToLat,
					centerLong:centerToLong
					}
				}
		/**setting the values which are not going to depend whether markers are
		* present or absent*/
		client = this.clientId?("&client="+this.clientId):"";
		channel = this.channel?("&channel="+this.channel):"";
		tempUrl = "http://maps.googleapis.com/maps/api/staticmap?sensor=false&size="
				+ this.size
				+ "&format="
				+ this.format
				+ "&maptype="
				+ this.maptype + "&scale=" + this.scale
				+ client + channel;
				
				/**if markers are present, then no need for zoom and center values
				// but if only marker is present we need to set the value for zoom */
				if(this.useMarker())
					{
						var iconUrls=this.markers.urls||[];
						//url=encodeURI(iconUrl);
						var times=iconUrls.length;
						var limit =true;
						if(times==1)
						limit = false;
						if(this.markers.points.length==1)
						{
							if(times==0)
							{
							
								tempUrl=tempUrl+"&markers=color:"+this.markerColor+(this.useLabel?("|label:"+(this.useChar?"A|":"1|")):"|")+this.markers.points[0][0]+","+this.markers.points[0][1]+"&zoom="+this.zoom;
						
							}
							else
							{
							tempUrl=tempUrl+"&markers=icon:"+iconUrls[0]+"|"+this.markers.points[0][0]+","+this.markers.points[0][1]+"&zoom="+this.zoom;
							
							}
							return encodeURI(tempUrl);
						}
						for(var i=0;i<this.markers.points.length;i++)
						{
						var obj=this.markers.points[i];
						/***if custom icon url is specified */
						if(times>0)
						{
							var tempIcon=iconUrls[i];
							if(tempIcon)
							{
							tempIcon=encodeURI(tempIcon);
							tempUrl=tempUrl+"&markers=icon:"+tempIcon+"|"+obj[0]+","+obj[1];
							}
							
							
						}
						else if(times==0&&!limit)
						{
							tempUrl=tempUrl+"&markers=icon:"+tempIcon+"|"+obj[0]+","+obj[1];
							times++;
						}
						else
						tempUrl=tempUrl+"&markers=color:"+this.markerColor+(this.useLabel?("|label:"+(this.useChar?this.character:this.count)):"")+"|"+obj[0]+","+obj[1];
						
						this.useChar?(this.character=this._incrementLetter(this.character)):this.count++;
						times--;
						}
						return encodeURI(tempUrl);
					}
					
				/**if markers absent, center and zoom are necessary */
				else 
				{
					return encodeURI(tempUrl+"&center="+this.center.centerLat+","+this.center.centerLong+"&zoom="+this.zoom);
				}
			
	},
	_incrementLetter:function(letterToIncrement)
	{
		 var alphaChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
		 var indexOfLetter = alphaChars.search(letterToIncrement);
		if (indexOfLetter+1 < alphaChars.length) {
		return(alphaChars.charAt(indexOfLetter+1));
		}
		else{
		return(letterToIncrement);
			}
	}
};