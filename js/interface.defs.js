/** 
* @interface
* 
* @description Map objects should implement this interface.
*
* interface DynamicMapInterface {
*    private function loadScript();
*    private function setup();
*    private function setControls();
*
*    public function addMarker();
*    public function center();
*    public function panTo();
*    public function removeMarker();
*    public function addMarkerCollection();
*    public function removeMarkerCollection();
*    public function bestFit();
* }
*
* @example var myInterface = new Interface('myInterface', ['method1','method2'])
* 
* @author: Akshay Chugh(chughakshay16@gmail.com)
*
*/

var DynamicMapInterface = new Interface('DynamicMapInterface', [	
										'_loadScript',
										'_setup', 
										'_setControls', 
										'addMarker',
										'addHtmlMarker',										
										'center', 
										'panTo', 
										'removeMarker', 
										'addMarkerCollection',
										'addHtmlMarkerCollection',
										'removeMarkerCollection', 
										'bestFit',
										'addPolygon', 
										'getPolygon',
										'removePolygon',
										'addLine',
										'getLine',
										'removeLine',
										'addListener', 
										'addMapListener', 
										'removeListener', 
										'removeMapListener',
										'getMarkerCollection',
										'getCenter',
										'changeMarkerIcon',
										'streetZoomLevel',
										'redrawMap'
									]);
/** 
* @interface
* 
* @description Static Map objects should implement this interface.
*
* interface StaticMapInterface {
*    private function _setup();
*    private function _setControls();
* }
*/
var StaticMapInterface = new Interface('StaticMapInterface',['_setup','_setControls']);