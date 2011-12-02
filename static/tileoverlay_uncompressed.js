/**
 * @name TileOverlay
 * @version 1.0
 * @author Chad Killingsworth, Missouri State University
 *
 * @fileoverview The TileOverlay class adds image tile layers to a map.
 * The class offers options not covered by the ImageMapType object
 * such as opacity and the ability to show and hide layers on the map
 * while keeping them in memory.
 *
 * @example
 * var Overlay = new missouristate.web.TileOverlay(
 *    //function to return the full URL of a tile given a set of tile
 *    // coordinates and a zoom level.
 *    function(x, y, z) {
 *        return "http://search.missouristate.edu/map/tilesets/baselayer/"
 *            + z + "_" + x + "_" + y + ".png"; },
 *    //options with which to initialize the tile layer
 *    {
 *       'map': map, // optional. google.maps.Map reference.
 *       'visible': true, //optional. controls initial display of the layer.
 *       'minZoom': 1, // optional. minimum zoom level to show layer.
 *       'maxZoom': 19, //optional. maximum zoom level to show layer.
 *       'bounds': LayerBounds, // optional. google.maps.LatLngBounds
 *                              // containing all of the tiles.
 *       'mapTypes': [google.maps.MapTypeId.ROADMAP,
 *                    google.maps.MapTypeId.HYBRID], //optional. Array of
 *                    google.maps.MapTypeId values. If present, tiles will
 *                   // only be drawn when the map type matches
 *       'percentOpacity': 65 //optional. Initial opacity of the overlay.
 *    });
 * // Other Functions
 * Overlay.setMap(map); //Used to add and remove the tile overlay from a map.
  *                     // Call with map = null to remove.
 * Overlay.getVisible(); //Returns true if the overlay is currently visible.
 * Overlay.setVisible(false); //Hide or show the overlay without actually
 *                            // removing it from the map.
 * Overlay.getOpacity(); //Returns the percentage opacity of the overlay.
 * Overlay.setOpacity(50); //Change the percentage opacity of the overlay.
 */

/** @const */
var TILE_SIZE = 256;
/** @const */
var TILE_INITIAL_RESOLUTION = 2 * Math.PI * 6378137 / TILE_SIZE;
/** @const */
var TILE_ORIGIN_SHIFT = 2 * Math.PI * 6378137 / 2.0;

/**
 * @const
 * @type {boolean}
 */
var IE6 = /MSIE 6/i.test(navigator.userAgent);

/**
 * @const
 * @type {string}
 */
var TILE_CSS_TEXT = /webkit/i.test(navigator.userAgent) ?
    "-webkit-user-select:none;" :
    (/Gecko[\/]/i.test(navigator.userAgent) ? "-moz-user-select:none;" : "");

/**
* @const
* @type {string}
*/
var TILE_TRANSPARENT =
    "http://maps.gstatic.com/intl/en_us/mapfiles/transparent.png";

/**
 * @param {google.maps.Point} coords
 * @param {number} zoom
 * @returns {google.maps.LatLng}
 */
function FromTileCoordinatesToLatLng(coords, zoom) {
    //Tile Coords to Meters
    var res = TILE_INITIAL_RESOLUTION / Math.pow(2, zoom);
    var mx = (coords.x * TILE_SIZE) * res - TILE_ORIGIN_SHIFT;
    var my = ((Math.pow(2, zoom) - coords.y) * TILE_SIZE) *
        res - TILE_ORIGIN_SHIFT;

    //Meters to LatLng
    var lng = (mx / TILE_ORIGIN_SHIFT) * 180.0;
    var lat = 180 / Math.PI *
        (2 * Math.atan(
            Math.exp(((my / TILE_ORIGIN_SHIFT) * 180.0) * Math.PI / 180.0))
        - Math.PI / 2.0);

    return new google.maps.LatLng(lat, lng);
}

/**
 * @param {google.maps.LatLng} latLng
 * @param {number} zoom
 * @returns {google.maps.Point}
 */
function FromLatLngToTileCoordinates(latLng, zoom) {
    //LatLng to Meters
    var mx = latLng.lng() * TILE_ORIGIN_SHIFT / 180.0;
    var my = (Math.log(Math.tan((90 + latLng.lat()) * Math.PI / 360.0))
        / (Math.PI / 180.0)) * TILE_ORIGIN_SHIFT / 180.0;

    //Meters to Pixels
    var res = TILE_INITIAL_RESOLUTION / Math.pow(2, zoom);
    var px = (mx + TILE_ORIGIN_SHIFT) / res;
    var py = (my + TILE_ORIGIN_SHIFT) / res;

    //Pixels to Tile Coords
    var tx = Math.floor(Math.ceil(px / TILE_SIZE) - 1);
    var ty = Math.pow(2, zoom) - 1 - Math.floor(Math.ceil(py / TILE_SIZE) - 1);

    return new google.maps.Point(tx, ty);
}

/** @constructor */
function TileEvents() {
    /** @type {Object.<string, TileOverlay>} */
    this.overlays = {};
    /** @type {google.maps.MapsEventListener} */
    this.zoomListener = null;
    /** @type {google.maps.MapsEventListener} */
    this.idleListener = null,
    /** @type {google.maps.LatLngBounds} */
    this.viewportBounds = null;
    /** @type {Array.<google.maps.Point>} */
    this.viewportTileBounds = [null, null];
    /** @type {Array.<google.maps.Point>} */
    this.viewportPixelBounds = [null, null];
    /** @type {Array.<google.maps.Point>} */
    this.tileCoords = [null, null];
    this.overlayIndex = 0;
}

/**
* @constructor
* @param {google.maps.Map} map
* @param {TileEvents} tileEvents
*/
function MapEventInfo(map, tileEvents) {
    this.map = map;
    this.tileEvents = tileEvents;
}

/** @type {google.maps.Map} */
MapEventInfo.prototype.map = null;

/** @type {TileEvents} */
MapEventInfo.prototype.tileEvents = null;

/** @type {Array.<MapEventInfo>} */
var MapList = [];

/**
 * @param {TileOverlay} newTileOverlay
 * @return {String}
 */
TileEvents.prototype.addOverlay = function (newTileOverlay) {
    var thisIndex = /** @type {String} */ ("_" + this.overlayIndex);
    this.overlayIndex++;
    this.overlays[thisIndex] = newTileOverlay;
    if (!this.idleListener)
        google.maps.event.addListener(newTileOverlay.settings.map, "idle",
            /** @this {google.maps.Map} */function () {
                /** @type {TileEvents} */
                var MapTileEvents = null;
                    
                for (var i = 0; i < MapList.length; i++) {
                    if(MapList[i].map === this) {
                        MapTileEvents = MapList[i].tileEvents;
                        break;
                    }
                }

                MapTileEvents.viewportPixelBounds = [null, null];

                var z = this.getZoom();

                //Calculate the boundaries for the tiles which
                //overlap the viewport
                var viewportBounds = this.getBounds();
                var viewportTileCoordsNorthEast =
                    FromLatLngToTileCoordinates(viewportBounds.getNorthEast(),
                        z);
                var viewportTileCoordsSouthWest =
                    FromLatLngToTileCoordinates(viewportBounds.getSouthWest(),
                        z);
                viewportBounds =
                    new google.maps.LatLngBounds(
                        FromTileCoordinatesToLatLng(
                            new google.maps.Point(
                                viewportTileCoordsSouthWest.x,
                                viewportTileCoordsSouthWest.y), z),
                        FromTileCoordinatesToLatLng(
                            new google.maps.Point(
                                viewportTileCoordsNorthEast.x,
                                viewportTileCoordsNorthEast.y), z));
            
                MapTileEvents.viewportBounds = viewportBounds;
                MapTileEvents.tileCoords = [viewportTileCoordsSouthWest,
                    viewportTileCoordsNorthEast];
                
                for (var overlay in MapTileEvents.overlays) {
                    if (overlay) {
                        var proj =
                            MapTileEvents.overlays[overlay].getProjection();
                        
                        if (proj) {
                            var viewportNorthEastPixel =
                                proj.fromLatLngToDivPixel(
                                    viewportBounds.getNorthEast());

                            var viewportSouthWestPixel =
                                proj.fromLatLngToDivPixel(
                                    viewportBounds.getSouthWest());
                            MapTileEvents.viewportPixelBounds = [
                                viewportSouthWestPixel,
                                viewportNorthEastPixel];
                        }
                    }
                }

            for (var overlay in MapTileEvents.overlays) {
                if (overlay)
                    MapTileEvents.overlays[overlay].redraw();
            }
        });
    
    google.maps.event.trigger(newTileOverlay.settings.map, "idle");

    if (!this.zoomListener)
        google.maps.event.addListener(newTileOverlay.settings.map,
            "zoom_changed",
            /** @this {google.maps.Map} */ function () {
                /** @type {TileEvents} */
                var MapTileEvents = null;

                for (var i = 0; i < MapList.length; i++) {
                    if (MapList[i].map === this) {
                        MapTileEvents = MapList[i].tileEvents;
                        break;
                    }
                }
                
                for (var overlay in MapTileEvents.overlays) {
                    if (overlay)
                        MapTileEvents.overlays[overlay].removeAllTiles();
                }
            });

    return thisIndex;
}

/** @param {String} index */
TileEvents.prototype.removeOverlay = function (index) {
    if (!index)
        return;

    if (this.overlays[index])
        delete this.overlays[index];
    var hasOverlays = false;
    for (var overlay in this.overlays) {
        if (overlay) {
            hasOverlays = true;
            break;
        }
    }
    if (!hasOverlays) {
        if (this.zoomListener)
            google.maps.event.removeListener(this.zoomListener);
        if (this.idleListener)
            google.maps.event.removeListener(this.idleListener);

        this.idleListener = null;
        this.zoomListener = null;
    }
}

/**
 * @constructor
 * @param {google.maps.LatLngBounds} bounds
 * @param {number} minZoom
 * @param {number} maxZoom
 */
function TileOverlaySettings (bounds, minZoom, maxZoom) {
    this.getTileUrl = null;

    /** @type {google.maps.Map} */
    this.map = null;
    this.visible = true;
    /** @type {Array.<google.maps.MapTypeId>} */
    this.mapTypes = null;
    this.div_ = null;
    this.divIEFix_ = null;
    /**
    * @const
    * @type {google.maps.LatLngBounds}
    */
    this.BOUNDS = bounds;

    /** @const */
    this.MIN_ZOOM = minZoom;
    /** @const */
    this.MAX_ZOOM = maxZoom;

    this.percentOpacity = 100;

    //For the current zoom level, keep track of which tiles have
    //already been drawn
    /** @type {Array.<Array.<Element>>} */
    this.tilesDrawn = [];

    /** @type {google.maps.LatLngBounds} */
    this.drawnBounds = null;

    /** @type {String} */
    this.overlayIndex = null;
}

/**
 * @constructor
 * @extends {google.maps.OverlayView}
 * @param {function(number, number, number): string} GetTileUrl
 *     function that takes 3 params (x, y, z) and returns a full tile URL
 * @param {?Object} TileOverlayOptions
 */
function TileOverlay(GetTileUrl, TileOverlayOptions) {
    var minZoom = TileOverlayOptions["minZoom"] || 1, maxZoom = 19,
        bounds = null;

    if (TileOverlayOptions) {
        minZoom = TileOverlayOptions["minZoom"] || minZoom;
        maxZoom = TileOverlayOptions["maxZoom"] || maxZoom;
        if (TileOverlayOptions["bounds"])
            bounds = TileOverlayOptions["bounds"];
    }

    this.settings = new TileOverlaySettings(bounds, minZoom, maxZoom);

    this.settings.getTileUrl = GetTileUrl;

    if (TileOverlayOptions) {
        if(TileOverlayOptions["map"])
            this.settings.map = TileOverlayOptions["map"];
        
        if(TileOverlayOptions["visible"])
            this.settings.visible = TileOverlayOptions["visible"];
        
        if(TileOverlayOptions["mapTypes"])
            this.settings.mapTypes = TileOverlayOptions["mapTypes"];
        
        if(TileOverlayOptions["percentOpacity"])
            this.settings.percentOpacity =
                TileOverlayOptions["percentOpacity"];
    }

    if (this.settings.map)
        this.setMap(this.settings.map);
}
TileOverlay.prototype = new google.maps.OverlayView;

/** @type {TileEvents} */
TileOverlay.prototype.TileEvents = null;

/** @type {TileOverlaySettings} */
TileOverlay.prototype.settings = null;

/**
 * Cleanup drawn tiles
 * @return {undefined}
 */
TileOverlay.prototype.removeAllTiles = function () {
    if (!this.settings.div_)
        return;

    while (this.settings.div_.childNodes.length > 0) {
        if (IE6)
            this.settings.div_.childNodes[0].removeChild(
                this.settings.div_.childNodes[0].childNodes[0]);
        this.settings.div_.removeChild(this.settings.div_.childNodes[0]);
    }

    this.settings.tilesDrawn = [];
    this.settings.drawnBounds = null;
}

/**
 * Use strings for the protype name to export the symbol
 * @override
 * @this {TileOverlay}
 */
TileOverlay.prototype["draw"] = function () { }

/** @returns {undefined} */
TileOverlay.prototype.redraw = function () {
    var mapTypeId = this.settings.map.getMapTypeId();
    if (this.settings.mapTypes) {
        var matchingType = false;
        for (var i = 0; i < this.settings.mapTypes.length; i++) {
            if (this.settings.mapTypes[i] == mapTypeId) {
                matchingType = true;
                break;
            }
        }
        if (!matchingType) {
            this.removeAllTiles();
            return;
        }
    }

    if (!this.settings.div_)
        return;

    var z = this.settings.map.getZoom();


    //Calculate the boundaries for the tiles which overlap the viewport
    var viewportBounds = this.TileEvents.viewportBounds;
    if (!viewportBounds)
        return;

    var viewportTileCoordsNorthEast = this.TileEvents.tileCoords[1];
    var viewportTileCoordsSouthWest = this.TileEvents.tileCoords[0];

    //Calculate the boundaries for the tiles at this zoom level
    var TileCoordsNorthEast = viewportTileCoordsNorthEast;
    var TileCoordsSouthWest = viewportTileCoordsSouthWest;

    if (this.settings.BOUNDS) {
        TileCoordsNorthEast =
            FromLatLngToTileCoordinates(
                this.settings.BOUNDS.getNorthEast(), z);
        TileCoordsSouthWest = FromLatLngToTileCoordinates(
            this.settings.BOUNDS.getSouthWest(), z);
    }
    var TileLatLngBoundsForZoom =
        new google.maps.LatLngBounds(
            FromTileCoordinatesToLatLng(
                new google.maps.Point(TileCoordsSouthWest.x,
                    TileCoordsSouthWest.y), z),
            FromTileCoordinatesToLatLng(
                new google.maps.Point(TileCoordsNorthEast.x,
                    TileCoordsNorthEast.y), z));

    //Check to see if there are any tiles defined for this zoom level and
    // if they fall within the viewport
    if (z < this.settings.MIN_ZOOM || z > this.settings.MAX_ZOOM ||
        !viewportBounds.intersects(TileLatLngBoundsForZoom))
        return this.removeAllTiles();

    //If tiles previously drawn are now all out of the viewport, start over
    if (this.settings.drawnBounds &&
        !viewportBounds.intersects(this.settings.drawnBounds))
        this.removeAllTiles();

    //Some of the tiles are still displayed.
    //Loop through all the previously drawn tiles and remove those no longer
    //within the viewport
    else if (this.settings.drawnBounds) {
        var drawnNorthEast =
            FromLatLngToTileCoordinates(viewportBounds.getNorthEast(), z);
        var drawnSouthWest =
            FromLatLngToTileCoordinates(viewportBounds.getSouthWest(), z);

        for (var x = drawnNorthEast.x; x <= drawnSouthWest.x; x++)
            for (var y = drawnSouthWest.y; y <= drawnNorthEast.y; y++)
                if (x < viewportTileCoordsNorthEast.x ||
                    x > viewportTileCoordsSouthWest.x ||
                    y < viewportTileCoordsSouthWest.y ||
                    y > viewportTileCoordsNorthEast.y) {
                    this.settings.div_.removeChild(
                        this.settings.tilesDrawn["_" + x]["_" + y]);
                    delete this.settings.tilesDrawn["_" + x]["_" + y];
                }
    }
    this.settings.drawnBounds = viewportBounds;

    var viewportNorthEastPixel = this.TileEvents.viewportPixelBounds[1];
    var viewportSouthWestPixel = this.TileEvents.viewportPixelBounds[0];

    //Loop through all of the possible viewport tiles and
    //see if we need to draw new tiles
    for (var x = viewportTileCoordsSouthWest.x;
        x <= viewportTileCoordsNorthEast.x;
        x++) {
        for (var y = viewportTileCoordsNorthEast.y;
            y <= viewportTileCoordsSouthWest.y;
            y++) {
            //Check to see if this is a valid tile for this overlay,
            //and that we haven't already drawn it.
            if (x >= TileCoordsSouthWest.x && x <= TileCoordsNorthEast.x
                && y >= TileCoordsNorthEast.y && y <= TileCoordsSouthWest.y &&
                (!this.settings.tilesDrawn["_" + x] ||
                !this.settings.tilesDrawn["_" + x]["_" + y])) {

                // var img = document.createElement("IMG");
                // var div = document.createElement("DIV");
                // var imgSrc = this.settings.getTileUrl(x, y, z);
                
                // div.innerHTML ="ABCD";

                // this actually won't work in the long run, as it's zoom dependent. 
                //need to tilecoord, shouldn't be too hard!
                tile = YourWorld.World.getOrCreateTile(x,y);

                div=tile.HTMLnode();
                // div.className = "textile";
                // div.style.borderStyle = 'solid';  div.style.borderWidth = '1px'; div.style.borderColor = 'red';


                google.maps.event.addDomListenerOnce(div, "error",
                    function () { this.src = TILE_TRANSPARENT; });
                google.maps.event.addDomListenerOnce(div, "load",
                    function () {
                        google.maps.event.clearListeners(this, "error"); });
                
                var divSrc = this.settings.getTileUrl(x, y, z);
                div.style.cssText = "position:absolute;left:" +
                    (viewportSouthWestPixel.x +
                    ((x - viewportTileCoordsSouthWest.x) * TILE_SIZE)) +
                    "px;top:" +
                    (viewportNorthEastPixel.y +
                    ((y - viewportTileCoordsNorthEast.y) * TILE_SIZE)) +
                    "px;width:" + TILE_SIZE + "px;height:" + TILE_SIZE + "px;"
                    + TILE_CSS_TEXT;

                div.alt = "";

                if (IE6) {
                    var div = document.createElement("DIV");
                    div.appendChild(div);
                    div.style.cssText = "position:absolute;left:" +
                        (viewportSouthWestPixel.x +
                        ((x - viewportTileCoordsSouthWest.x) * TILE_SIZE)) +
                        "px;top:" +
                        (viewportNorthEastPixel.y +
                        ((y - viewportTileCoordsNorthEast.y) * TILE_SIZE)) +
                        "px;width:" + TILE_SIZE + "px;height:" + TILE_SIZE +
                        "px;";

                    div.style.cssText = "zoom:1;" + TILE_CSS_TEXT;

                    if (divSrc.substr(divSrc.length - 4).toLowerCase() ==
                        ".png") {
                        div.style.filter =
                            "progid:DXImageTransform.Microsoft." +
                            "AlphaImageLoader(src='" +
                            this.settings.getTileUrl(x, y, z) +
                            "', sizingMethod='scale');";

                        div.src = TILE_TRANSPARENT;
                    }
                    else
                        div.src = divSrc;

                    div.width = TILE_SIZE;
                    div.height = TILE_SIZE;

                    div.style.filter = this.settings.percentOpacity < 100 ?
                        "alpha(opacity=" + this.settings.percentOpacity + ")" :
                        "";
                    
                    div = div;
                }
                else if (typeof (this.settings.div_.style.filter) ==
                    "string") {
                    div.style.filter = this.settings.percentOpacity < 100 ?
                        "alpha(opacity=" + this.settings.percentOpacity + ")" :
                        "";
                    div.src = divSrc;
                }
                else
                    div.src = divSrc;

                this.settings.div_.appendChild(div);

                this.settings.tilesDrawn["_" + x] =
                    this.settings.tilesDrawn["_" + x] || [];

                this.settings.tilesDrawn["_" + x]["_" + y] = div;
            }
        }
    }
}

/**
* @override
* @this {TileOverlay}
*/
TileOverlay.prototype["setMap"] = function (Map) {
    if (Map == null) {
        if (this.TileEvents)
            this.TileEvents.removeOverlay(this.settings.overlayIndex);
    }
    google.maps.OverlayView.prototype.setMap.call(this, Map);
}

/**
* @override
* @this {TileOverlay}
*/
TileOverlay.prototype["onAdd"] = function () {
    this.settings.div_ = document.createElement("DIV");
    this.settings.div_.style.position = "relative";

    if (!this.settings.visible)
        this.settings.div_.style.display = "none";

    if (typeof (this.settings.div_.style.filter) != "string")
        this.setOpacity(this.settings.percentOpacity);

    // this.getPanes().mapPane.appendChild(this.settings.div_);
    // So they can recieve DOM events
    this.getPanes().overlayMouseTarget.appendChild(this.settings.div_);


    for (var i = 0; i < MapList.length; i++) {
        if (MapList[i].map === this.settings.map) {
            this.TileEvents = MapList[i].tileEvents;
            break;
        }
    }

    if (!this.TileEvents) {
        this.TileEvents = new TileEvents();
        MapList.push(new MapEventInfo(this.settings.map, this.TileEvents));
    }

    this.settings.overlayIndex = this.TileEvents.addOverlay(this);
}

/**
* @override
* @this {TileOverlay}
*/
TileOverlay.prototype["onRemove"] = function () {
    this.removeAllTiles();
    this.settings.div_.parentNode.removeChild(this.settings.div_);
    this.settings.div_ = null;
}

/**
* @this {TileOverlay}
* @returns {boolean}
*/
TileOverlay.prototype["getVisible"] = function () {
    return this.settings.visible;
}

/**
* @param {boolean} Visible
* @this {TileOverlay}
* @returns {boolean}
*/
TileOverlay.prototype["setVisible"] = function (Visible) {
    if (this.settings.div_) {
        if (Visible)
            this.settings.div_.style.display = "block";
        else
            this.settings.div_.style.display = "none";
    }

    this.settings.visible = Visible;
}

/**
* @param {number} percentOpacity
* @this {TileOverlay}
*/
TileOverlay.prototype.setOpacity = function (percentOpacity) {
    if (percentOpacity < 0)
        percentOpacity = 0;

    if (percentOpacity > 100)
        percentOpacity = 100;

    this.settings.percentOpacity = percentOpacity;

    if (!this.settings.div_)
        return;

    var opacity = percentOpacity / 100;

    if (typeof (this.settings.div_.style.filter) == "string") {
        for (var i = 0; i < this.settings.div_.childNodes.length; i++) {
            this.settings.div_.childNodes[i].style.filter =
                percentOpacity < 100 ?
                    "alpha(opacity=" + percentOpacity + ");" :
                    "";
        }
        return;
    }

    if (typeof (this.settings.div_.style.KHTMLOpacity) == "string")
        this.settings.div_.style.KHTMLOpacity = opacity;

    if (typeof (this.settings.div_.style.MozOpacity) == "string")
        this.settings.div_.style.MozOpacity = opacity;

    if (typeof (this.settings.div_.style.opacity) == "string")
        this.settings.div_.style.opacity = opacity;
}
TileOverlay.prototype["setOpacity"] = TileOverlay.prototype.setOpacity;

/**
* @this {TileOverlay}
* @returns {number}
*/
TileOverlay.prototype["getOpacity"] = function () {
    return this.settings.percentOpacity;
}

window["missouristate"] = window["missouristate"] || {};
window["missouristate"]["web"] = window["missouristate"]["web"] || {};
window["missouristate"]["web"]["TileOverlay"] = TileOverlay;