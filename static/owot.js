// File: owot.js 
// Current Editor: Zach
// Original Author: Andrew Badr <andrewbadr@gmail.com>

var tester;

var YourWorld = {};

// Shortcut for public API
window.InitWorld = function() {
    YourWorld.World.init.apply(null, arguments);
};

YourWorld.helpers = function() {
    var obj = {};

    obj.escapeChar = function(s) {
        if (s == '<') {
            return '&lt;';
        }
        if (s == '>') {
            return '&gt;';
        }
        if (s == '&') {
            return '&amp;';
        }
        if (s === ' ') {
            return '&nbsp;';
        }
        return s;
    };
    
    obj.addCss = function(cssCode) {
        // From http://yuiblog.com/blog/2007/06/07/style/
        var styleElement = document.createElement("style");
        styleElement.type = "text/css";
        if (styleElement.styleSheet) {
            styleElement.styleSheet.cssText = cssCode;
        } else {
            styleElement.appendChild(document.createTextNode(cssCode));
        }
        document.getElementsByTagName("head")[0].appendChild(styleElement);
		return styleElement;
    };

    
    var getNodeIndex = function(node) {
        return $(node).parent().children().index(node);
    };


    
    obj.getCellCoords = function(td) {
        // Given a TD node, returns [tileY, tileX, charY, charX] of that TD
        td = $(td);
        var charX = getNodeIndex(td); // TODO: use cellIndex?
        var charY = getNodeIndex(td.parents('tr'));
        var tile = td.parents('.tilecont')[0];
        //hmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm
        var tileY = $.data(tile, 'tileY');
        var tileX = $.data(tile, 'tileX');
        var YX_yx = [tileY, tileX, charY, charX];
		// console.log(YX_yx);
        return YX_yx;
    };

	obj.vectorLen = function() {
		var n = arguments.length;
		var sum = 0;
		for (var i=0; i<n; i++) {
			sum += arguments[i]*arguments[i];
		}
		return Math.sqrt(sum);
	};

	obj.deepEquals = function(o1, o2) {
		// Checks strict equality of objects, including for Objects and Arrays
		// Array or objects must have been created in the same window
		var t = typeof o1;
		if (t != typeof o2) {
			return false;
		}
		if (t == 'number' || t == 'string' || t == 'boolean' || t == 'function') {
			return o1 === o2;
		}
		if (t == 'undefined') {
			return true;
		}
		if (o1 === null || o2 === null) {
			return o1 === o2;
		}
		var length = o1.length;
		if (length !== o2.length) {
			// different types, or different sized arrays
			return false;
		}
		var name;
		for (name in o1) {
			if (!obj.deepEquals(o1[name], o2[name])) {
				return false;
			}
		}
		for (name in o2) {
			if (!obj.deepEquals(o1[name], o2[name])) {
				return false;
			}
		}
		return true;
	};
  


    return obj;
}();


YourWorld.Config = function(container) {
// YourWorld.Config = function(container) {
    // Configuration settings. Dynamically generated to suit container style.
    // Using getters because I really don't want to modify these
    var obj = {};

    //// Private
    // These must match server settings:
    var num_rows = 14;
    var num_cols = 18;


// lets not use these, lets do this in YourWorld.World so we can change them dynamically
    // var map_tile_x = 256;
    // var map_tile_y = 256;


    // console.log('we think the default char is:', properties.default_char);
    var default_char= properties.default_char || ' ';
    // var default_char='#';
    var mapTypeId = google.maps.MapTypeId.ROADMAP;
    // console.log(properties);

    var mapTypeCustom = new google.maps.StyledMapType(darkMapStyle, {name: "Dark Maps"});
    var mapTypeAsString = 'dark_map'; //only relevant if custom
    var disableDoubleClickZoom = true;


    var restrictToLatLng = new google.maps.LatLng(40.73061489199429, -73.9934785);
    var restrictDistance= 30000; //in meters
    var restrictLocationString= "New York City";

    //google.maps.MapTypeId.ROADMAP;

    var zoom=16;

    // Auto-generated settings
    //not working


    var default_content = Array(num_rows*num_cols+1).join(default_char);

    //// Public
    obj.numRows = function() { return num_rows;};
    obj.numCols = function() { return num_cols;};
    // obj.charHeight = function() { return map_tile_y / num_rows;};
    // obj.charWidth = function() { return map_tile_x / num_cols;};
    // obj.tileHeight = function() { return map_tile_y;};
    // obj.tileWidth = function() { return map_tile_x;};
    obj.defaultContent = function() { return default_content;};
    // obj.mapTileX = function() {return map_tile_x;};
    // obj.mapTileY = function() {return map_tile_y;};

    obj.mapTypeId = function() {return mapTypeId;};
    obj.zoom = function(currentDivider) {console.log(Math.log(currentDivider)/Math.log(2)); return zoom-(Math.log(currentDivider)/Math.log(2));};
    obj.mapTypeCustom = function() {return mapTypeCustom;};
    obj.mapTypeAsString = function() {return mapTypeAsString;};
    obj.disableDoubleClickZoom = function() {return disableDoubleClickZoom;};

    obj.restrictDistance = function() {return restrictDistance;};
    obj.restrictLatLng = function() {return restrictToLatLng}
    obj.restrictLocationString = function() {return restrictLocationString}


    return obj;
};

// var _tileByCoord;

var map;

var overlay;
var _tileByCoord = {}; // all tile objects indexed by Y and X


YourWorld.World = function() {
    // The whole wild world. Initialize with `init`.
    // TODO: support multiple worlds, and factor out input-gettin' (et plus?)
    var obj = {}; // public namespace

    // Private
    var _container = null; // the element containing this world
    // var _tileByCoord = {}; // all tile objects indexed by Y and X
    var _edits = []; // local edits queued to be sent to server, [tileY, tileX, charY, charX, t, s]
    var _state = {
        selected: null, // TD node of current cursor position
        offsetY: null, // the y-offset, in pixels, of world origin vs container's scroll-posn-0
        offsetX: null, // the x-position, in pixels, of world origin vs container's scroll-posn-0
        numTiles: null, // the number of rendered tiles
        lastClick: null, // the last cell the user clicked on
        lastEvent: new Date().getTime(), // so we can stop polling when the user goes inactive
        lastRender: null, // corners of last render so we don't repeat it
        announce: null, // To put in the announcement box
        worldName: null,
        canRead: true,
        canWrite: false,
        canAdmin: false,
		features: {}, // Enabled features on this world, from: ['go_to_coord', ...]
		uiModal: false, // Disables world's interaction-capture if true
		goToCoord: {}
    };
    var _ui = {}; // Container for UI elements: paused, announce; `scrolling` for scroll interface
    var _config = null; // generated by init
    var _menu = null; // The menu container object
    var _firstBoundCheck= 1;

    // var map;
    var initialUserPos, pixelWorldCenter, pixelUser;


    // THIS THING --------------------------------------------------------------------------
    var currentDivider=1;

    var currentTileWidth= 256/currentDivider;
    var currentTileHeight= 256/currentDivider;

    var num_cols= 18;
    var num_rows= 14;
    var charHeight = currentTileHeight/ num_rows;
    var charWidth = currentTileWidth/ num_cols;

    // var currentTileWidth= 256/2;
    // var currentTileHeight= 256/2;


    obj.goSmall = function(){
        currentTileWidth= currentTileWidth/2;
        currentTileHeight= currentTileHeight/2;
    }


    function CoordMapType(tileSize) { 
        this.tileSize = tileSize; 
         // var panes = this.getPanes();
         // console.log(this);
    }



    var mapInitialize= function() {
        var myOptions = {
            zoom:  _config.zoom(currentDivider),
            // zoom: 16,
            disableDoubleClickZoom : _config.disableDoubleClickZoom(),
            scrollwheel: false,
            // draggable: false,
            // disableDefaultUI: true,
            panControl: true, 
            // zoomControl: false,  #redisable
            streetViewControl: false,
            mapTypeControl:false,

            mapTypeId: _config.mapTypeId(), 
            // mapTypeControlOptions: { mapTypeIds: [worldOption.bgTiletype, 'dark_map'] }
        }; //end options
      
        map = new google.maps.Map(document.getElementById('mapcanvas'), myOptions);
        
        map.mapTypes.set(_config.mapTypeAsString(), _config.mapTypeCustom());
        map.setMapTypeId(_config.mapTypeAsString());

        if(navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(position) {
                $("#geoReminder").fadeOut();
				setTimeout(function(){ $("#loadingIndicator").fadeOut(200) }, 5000);

                initialUserPos = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
				
				var image = new google.maps.MarkerImage(
				    'static/dot.png',
				    new google.maps.Size(50,50),
				    new google.maps.Point(0,0),
				    new google.maps.Point(25,25)
				  );
				
				
				var shape = {
				    coord: [21,2,23,3,24,4,25,5,26,6,27,7,28,8,28,9,29,10,29,11,29,12,29,13,29,14,29,15,29,16,29,17,29,18,29,19,29,20,29,21,28,22,28,23,27,24,26,25,25,26,24,27,23,28,21,29,10,29,8,28,7,27,6,26,5,25,4,24,3,23,3,22,2,21,2,20,2,19,2,18,2,17,2,16,2,15,2,14,2,13,2,12,2,11,2,10,3,9,3,8,4,7,5,6,6,5,7,4,8,3,10,2,21,2],
				    type: 'poly'
				  };
				
				var marker = new google.maps.Marker({
				    icon: image,
				    shape: shape,
				    map: map,
				    position: initialUserPos
				  });
				

                if (_config.restrictDistance())
                {
                    // var myhouse = new google.maps.LatLng(40.6795338, -73.98078750000002); //initialUserPos
                    var distance= google.maps.geometry.spherical.computeDistanceBetween(initialUserPos, _config.restrictLatLng());
                    // console.log('distance away', distance);

                    if (distance >_config.restrictDistance())
                    // if (distance > 2 ) //for testing
                    {
                        // console.log('can?',_state.canWrite);
                        _state.canWrite=false;
                        // console.log('can?',_state.canWrite);

                        obj.message = "<b>Sorry, you can't write on the map because you're not close enough to " + _config.restrictLocationString() + ". You can look around though. We'll open this up to everyone soon.</b>";
                        // alert(obj.message);
                        initialUserPos = _config.restrictLatLng();
                        var infowindow = new google.maps.InfoWindow({map:map, position:_config.restrictLatLng(), content: obj.message});

                    }
                }


                map.setCenter(initialUserPos);

                // we could figure out size based on zoom here...
                map.overlayMapTypes.insertAt(0, new CoordMapType(new google.maps.Size(currentTileHeight, currentTileWidth)));
                // console.log(map.overlayMapTypes);
                google.maps.event.addListener(map, 'bounds_changed', function() {
                     bounds = map.getBounds();
                     // console.log($(".tilecont"));

                 });
                
            
        }, function() {
      handleNoGeolocation(true);
    }, 
  { enableHighAccuracy: true} //, maximumAge: 10000} //timeout: 6000, maximumAge: 10000 }  //optons for getCurrentPosition
  );
  } else {
    // Browser doesn't support Geolocation
    handleNoGeolocation(false);
  } 
};//end mapInitialize


function handleNoGeolocation(errorFlag) {
  if (errorFlag) {
    var content = "<b>Error: The Geolocation service failed. You can't write on the map for now, sorry. Maybe try a different browser or location.</b>";
  } else {
    var content = '<b>Error: Your browser doesn\'t support geolocation.</b>';
  }
 
  var options = {
    map: map,
    position: _config.restrictLatLng(), 
    // position: new google.maps.LatLng(-69.821392, -75.329819), //antartica, teeeheeee
    content: content
  };

  var infowindow = new google.maps.InfoWindow(options);

  map.setCenter(options.position);
}


    CoordMapType.prototype.getTile = function(coord, zoom, ownerDocument) {
        // console.log(coord);
        var div = ownerDocument.createElement('DIV');
        // div.innerHTML = coord;


        projection=map.getProjection(); 
        var zfactor=Math.pow(2,zoom);

        //from coords, we need to get latlng, and pixel xy
        // var tilepoint = new google.maps.Point(coord.x*256/zfactor,coord.y*256/zfactor);
        // var tilepoint = new google.maps.Point(coord.x*currentTileWidth/zfactor, coord.y*currentTileHeight/zfactor);

        // var tilepoint = new google.maps.Point(coord.x*256/zfactor,coord.y*256/zfactor);

        // var topleft=projection.fromPointToLatLng(tilepoint);
        
        // div.style.width = this.tileSize.width + 'px';
        // div.style.height = this.tileSize.height + 'px';

	//globalCoord = new google.maps.Point(coord.x*currentDivider, coord.y*currentDivider);
        // this actually doesn't make sense to me, why it's Y before X, but it seems to solve all our problems miraculously...
        tile = getOrCreateTile(coord.y, coord.x);
        //tile = getOrCreateTile(globalCoord.y, globalCoord.x);
        
        // div.innerHTML+=tile.HTMLcontent();
        div = tile.HTMLnode();
        div.style.fontSize = (16/currentDivider) + 'px';

        // console.log($.data(tile.HTMLnode(), 'tileY'));

        //for debug
        $(div).append("<div style='position:absolute; color:red'>"+coord+"</div>");
        //$(div).append("<div style='position:absolute; color:red'>"+globalCoord+"</div>");
        // div.style.borderStyle = 'solid';  div.style.borderWidth = '1px'; div.style.borderColor = 'red';
        return div;

    } //end CoordMapType getTile

    var rememberTile = function(tileY, tileX, tileObj) {

        if (_tileByCoord[tileY] === undefined) {
            _tileByCoord[tileY] = {};
        }
        if (_tileByCoord[tileY][tileX] !== undefined) {
            throw new Error('Recording same tile twice.');
        }
        _tileByCoord[tileY][tileX] = tileObj;
    };

    var getTile = function(tileY, tileX) {
        // Returns the tile at given coords if exists, else null
        if (!_tileByCoord[tileY]) {
            return null; 
        }
        return _tileByCoord[tileY][tileX];
    };
    
    var getCell = function(tileY, tileX, charY, charX) {
        return getTile(tileY, tileX).getCell(charY, charX);
    };

    var createTile = function(tileY, tileX) {
        // The World wraps each Tile object in a custom container div.

        var tile, tileContainer;
        tileContainer = document.createElement('div');
        $.data(tileContainer, 'tileY', tileY);
        $.data(tileContainer, 'tileX', tileX);
        tileContainer.className = 'tilecont';
        // tileContainer.style.top = (_config.tileHeight())*(tileY) + _state.offsetY + 'px';
        // tileContainer.style.left = (_config.tileWidth())*(tileX) + _state.offsetX + 'px';
        tileContainer.style.width = currentTileWidth + 'px';
        tileContainer.style.height = currentTileHeight + 'px';
        
        // console.log('creating tile container:', $.data(tileContainer, 'tileY') );

        
        // tileContainer.style.color = 'red';
        tile = YourWorld.Tile.create(tileY, tileX, _config, tileContainer);

        rememberTile(tileY, tileX, tile);
        // _container[0].appendChild(tileContainer); // a little faster than using jquery 
        //we're handling this in google maps getTile

        _state.numTiles++;
        if ((_state.numTiles % 1000) === 0) { // lower this?
            console.log("CLEAN UP!!!!!");
            setTimeout(cleanUpTiles, 0);
        }

        return tile;
    };

    var probablyDoneLoading = function()
    {

        // We can actually grab the center cell, yay!
        var centerCell = FromLatLngToTileWithCells(map.getCenter(), map.getZoom());
        
        console.log(" centerCell", centerCell);
        console.log("gettile centerCell", getTile(centerCell[1], centerCell[0]));
        // console.log("gettile 19297 24636:", getTile(19297, 124636));

        //console.log("tiles:", $(".tilecont").length);
        // setSelected(getTile(centerCell[1], centerCell[0]).getCell(centerCell[3], centerCell[2]));
        setSelected(getTile(centerCell[1], centerCell[0]).getCell(centerCell[3], centerCell[2]));
        
        //set selected, pass el

	var i = 0;
	for (i; i < currentDivider + 2; i++) {
	  moveCursor('down', null);
	}

        //console.log('in probbably done loading-state.selected=', _state.selected);

		_state.lastClick = _state.selected;
    }

    var getOrCreateTile = function(tileY, tileX) {
        // Returns the tile at given coords, creating if necessary
        return getTile(tileY, tileX) || createTile(tileY, tileX);
    };
    



	function FromLatLngToTileCoordinates(latLng, zoom) {

		var TILE_SIZE = currentTileHeight;
		/** @const */
		var TILE_INITIAL_RESOLUTION = 2 * Math.PI * 6378137 / TILE_SIZE;
		/** @const */
		var TILE_ORIGIN_SHIFT = 2 * Math.PI * 6378137 / 2.0;

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

	    return ([tx, ty]);
	}

	function FromLatLngToTileWithCells(latLng, zoom) {

		var TILE_SIZE = currentTileHeight;
		/** @const */
		var TILE_INITIAL_RESOLUTION = 2 * Math.PI * 6378137 / TILE_SIZE;
		/** @const */
		var TILE_ORIGIN_SHIFT = 2 * Math.PI * 6378137 / 2.0;

	    //LatLng to Meters
	    var mx = latLng.lng() * TILE_ORIGIN_SHIFT / 180.0;
	    var my = (Math.log(Math.tan((90 + latLng.lat()) * Math.PI / 360.0))
	        / (Math.PI / 180.0)) * TILE_ORIGIN_SHIFT / 180.0;

	    //Meters to Pixels
	    var res = TILE_INITIAL_RESOLUTION / Math.pow(2, zoom);
	    var px = ((mx + TILE_ORIGIN_SHIFT) / res) * currentDivider;
	    var py = ((my + TILE_ORIGIN_SHIFT) / res);

	    //Pixels to Tile Coords
	    var tx = Math.floor(Math.ceil(px / TILE_SIZE) - 1);
	    var ty = (Math.pow(2, zoom) - 1 - Math.floor(Math.ceil(py / TILE_SIZE) - 1)) * currentDivider;
	    //var tx = Math.floor(Math.ceil(px / TILE_SIZE) - 1) * Math.pow(2, currentDivider);
	    //var ty = (Math.pow(2, zoom) - 1 - Math.floor(Math.ceil(py / TILE_SIZE) - 1)) * Math.pow(2, currentDivider);

        //Characters
        var ux = px / TILE_SIZE;
        var remx = ux - Math.floor(ux);
        var cx = Math.floor(remx * _config.numCols());
        var uy = (py * currentDivider) / TILE_SIZE;
        var remy = uy - Math.floor(uy);
        var cy = Math.floor((1 - remy) * _config.numRows());

	    return ([tx, ty, cx, cy]);
	}

    // $(window).dblclick(function(e){
	$(window).dblclick(function(e){
		moveCursorToClickPosition(e);
		});
		
		
	var FromPixelsToTileWithCells = function(e){

	//get latlongs of the map
	var bounds = map.getBounds();
	var mDeltaX = bounds.getNorthEast().lng() - bounds.getSouthWest().lng();
	var mDeltaY = bounds.getNorthEast().lat() - bounds.getSouthWest().lat();

	//get pixels of the window
	var wDeltaX = $(window).width();
	var wDeltaY = $(window).height();
	
	//get ratio pixels to latlng
	var ratioX = wDeltaX / mDeltaX;
	var ratioY = wDeltaY / mDeltaY;


	// mouse position to latlong
	var mouseLng = bounds.getSouthWest().lng() + ( e.pageX / ratioX );
	var mouseLat = bounds.getNorthEast().lat() - ( e.pageY / ratioY );
	var mousePos = new google.maps.LatLng(mouseLat, mouseLng);

//	alert(mousePos.lng() +', '+ mousePos.lat() +', '+ northWest.lng()+', '+ northWest.lat() );
  	 
 	
   	XY_xy =  FromLatLngToTileWithCells(mousePos, map.getZoom());

	//finding the actual element and selecting it
	return XY_xy
	}

	var moveCursorToClickPosition = function(e){
		
		XY_xy = FromPixelsToTileWithCells(e);
		var target = getCell(XY_xy[1], XY_xy[0], XY_xy[3], XY_xy[2]);
	    setSelected(target);
		//storing last click (that also works as last selected with arrows)
		_state.lastClick = _state.selected;

	}


	var goBackToCursor = function() {
		mapBounds= map.getBounds();
        var z = map.getZoom();

		var my_YX_yx = YourWorld.helpers.getCellCoords(_state.selected);//(XY_xy)
		var ne_XY_xy = FromLatLngToTileWithCells(mapBounds.getNorthEast(), z); //(XY_xy)*********careful...flipped!
		var sw_XY_xy = FromLatLngToTileWithCells(mapBounds.getSouthWest(), z);//(XY_xy)**********careful...flipped!
		var center_XY_xy = FromLatLngToTileWithCells(map.getCenter(), z);
        //on Y
		if (ne_XY_xy[1] > my_YX_yx[0] || my_YX_yx[0] > sw_XY_xy[1] ){
			var me_Y = my_YX_yx[0]*currentTileHeight + charHeight*my_YX_yx[2];
			var center_Y = center_XY_xy[1]*currentTileHeight + center_XY_xy[3]*charHeight;
			var dif_Y = me_Y - center_Y;
			// console.log("out of Y by: ", dif_Y );
			map.panBy(0, dif_Y);
		};
		//on X
		if (ne_XY_xy[0] < my_YX_yx[1] || my_YX_yx[1] < sw_XY_xy[0] ){
			var me_X = my_YX_yx[1]*currentTileWidth + charWidth*my_YX_yx[3];
			var center_X = center_XY_xy[0]*currentTileWidth + center_XY_xy[2]*charWidth;
			var dif_X = me_X - center_X;
			// console.log("out of X by: ", dif_X );
			map.panBy(dif_X, 0);
			
		};
	}

    var getMandatoryBounds = function() {    

		if (map)
        {

            if (map.getBounds())
            {
                mapBounds= map.getBounds();

                //console.log(mapBounds);
				var minVisY, maxVisY;
				var minVisX, maxVisX;
                var topBound = mapBounds.getNorthEast().lat();
                var leftBound = mapBounds.getSouthWest().lng();
                
                var z = map.getZoom();
                
                var upperLeft = new google.maps.LatLng(topBound, leftBound);

				var upperLefTile = FromLatLngToTileCoordinates(upperLeft, z);
				// console.log(tile);
                var numDown = Math.ceil(_container.height()/currentTileHeight);
                var numAcross= Math.ceil(_container.width()/currentTileWidth);
                

				var minY = upperLefTile[1] - 1; // one tile of padding around what's visible
		        var minX = upperLefTile[0] - 1;
		        var maxY = minY + numDown + 2; // Add two because we might only see 1px of TL
		        var maxX = minX + numAcross + 2;
				// console.log([minY, minX, maxY, maxX]);

                //console.log("_firstBoundCheck", _firstBoundCheck);

                if (_firstBoundCheck)
                {
                    if ($(".tilecont").length)  //have the tiles loaded?
                        {
                            // console.log($(".tilecont"));
                            if (_state.canWrite)
                            {
                                probablyDoneLoading();

                            }

                            _firstBoundCheck=0;
                        }

                    
                }
		        return [minY, minX, maxY, maxX];
            }
        }

    };
    
    var setCoords = function() {
        // Get real min+max, divide by 4 and floor, then set to coords UI
        var minVisY = (_container.scrollTop() - _state.offsetY) / currentTileHeight;
        var minVisX = (_container.scrollLeft() - _state.offsetX) / currentTileWidth;
        var numDown = _container.height()/currentTileHeight;
        var numAcross = _container.width()/currentTileWidth;
        var centerY = minVisY + numDown/2;
        var centerX = minVisX + numAcross/2;
        centerY = -Math.floor(centerY/4); // INVERT Y-axis to make natural, scale both by 4 ~screen
        centerX = Math.floor(centerX/4);
        $('#coord_Y').text(centerY);
        $('#coord_X').text(centerX);
    };
    
    var makeRectangle = function(minY, minX, maxY, maxX) {
        // Lists all pairs within the bounds, inclusive
        var coords = [];
        for (var y=minY; y<=maxY; y++) {
            for (var x=minX; x<=maxX; x++) {
                coords.push([y, x]);
            }
        }
        return coords;
    };

	var getCenterCoords = function() {
		// Returns the Y,X coordinates, in Tile units, of the center of the screen;
        var minVisY = (_container.scrollTop() - _state.offsetY) / currentTileHeight;
        var minVisX = (_container.scrollLeft() - _state.offsetX) / currentTileWidth;
        var numDown = _container.height()/currentTileHeight;
        var numAcross = _container.width()/currentTileWidth;
        var centerY = minVisY + numDown/2;
        var centerX = minVisX + numAcross/2;
        // console.log('centercoords', centerY, centerX);
		return [centerY, centerX];
	};


    var getCenterYX = function() {
        // Returns the Y,X coordinates, in Tile units, of the center of the screen;
        var minVisY = (_container.scrollTop() - _state.offsetY) ;
        var minVisX = (_container.scrollLeft() - _state.offsetX);
        var numDown = _container.height();
        var numAcross = _container.width();
        var centerY = minVisY + numDown/2;
        var centerX = minVisX + numAcross/2;
        //console.log('centercoords', centerY, centerX);
        return [centerY, centerX];
    };

    var getMandatoryTiles = function() {
        // A list of [tileY, tileX] pairs that must be rendered, in -->,V order
        // This is currently those visible in the container plus padding
        //return makeRectangle.apply(obj, getMandatoryBounds());
    };

    var renderMandatoryTiles = function() {
        /*var bounds = getMandatoryBounds();
        if (_state.lastRender && (bounds[0] == _state.lastRender[0]) && 
            (bounds[1] == _state.lastRender[1]) && (bounds[2] == _state.lastRender[2]) && 
            (bounds[3] == _state.lastRender[3])) {
            return;
        }
        _state.lastRender = bounds;
        var coords = makeRectangle.apply(obj, bounds);
        for (var i=0; i<coords.length; i++) {
            getOrCreateTile(coords[i][0], coords[i][1]);
        }*/
    };
    
    var makeLeftRoom = function(numPx) {
        // Makes at least `numPx` pixels of new space available on the left side of _container,
        // while not visibly moving any content.
        // 
        // Returns the number of pixels of new space that were added
        var room = currentTileWidth * 5;
        if (numPx > room) {
            throw new Error('no big jumps yet');
        }
        _state.offsetX += room;
        $('.tilecont').each(function() {
            this.style.left = parseInt(this.style.left, 10) + room + 'px';
        });
        _container.scrollLeft(_container.scrollLeft() + room);
        return room;
    };
    
    var makeTopRoom = function(numPx) {
        // Makes at least `numPx` pixels of new space available on the top side of _container,
        // while not visibly moving any content. (actually ignores numPx)
        // 
        // Returns the number of pixels of new space that were added
        var room = currentTileHeight * 5;
        if (numPx > room) {
            throw new Error('no big jumps yet');
        }
        _state.offsetY += room;
        $('.tilecont').each(function() {
            this.style.top = parseInt(this.style.top, 10) + room + 'px';
        });
        _container.scrollTop(_container.scrollTop() + room);
        return room;
    };
    
    // Makes at least `numPx` pixels of new space available on the right side of _container,
    // while not visibly moving any content. (actually ignores numPx)
    var makeRightRoom = function(numPx) {
        var bounds = getMandatoryBounds();
        var maxY = bounds[2];
        var maxX = bounds[3];
        getOrCreateTile(maxY+5, maxX+5);
    };
    
    // Makes at least `numPx` pixels of new space available on the bottom side of _container,
    // while not visibly moving any content.
    var makeBottomRoom = makeRightRoom;
    
    var updateData = function(data) {
        // console.log('updateData --------------');
        // console.log(data);
        // Callback for fetchEdits -- gets new tile data from server and renders
        
        // TODO reenable
        setTimeout(fetchUpdates, 997);
        
        $.each(data, function(YX, properties) {
            


            var coords = YX.split(',');
            // console.log('coords', coords);
            var tile = getTile(coords[0], coords[1]);
            // console.log('tile: ', tile);
            // We may have cleaned up tiles while the request was made:
            if (tile) {
                tile.setProperties(properties);
            }
        });
    };
    
    var updateError = function(xhr) {
        setTimeout(fetchUpdates, 997); // TODO: 997 shared w/above
    };
    
    var editsDone = function(editsReceived) {
        $.each(editsReceived, function(idx, editArray) {
            var tile = getTile(editArray[0], editArray[1]);
            tile.editDone(editArray[2], editArray[3], editArray[4], editArray[5]);
        });
    };
    
    var editsError = function(xhr) {
        if (xhr.status == 403) {
            _state.canWrite = false;
        }
    };
   
    var sendEdits = function() {
        // Send local edits to the server
        if (!_edits.length) {
            return;
        }

        // console.log('sending edits f0real');

        jQuery.ajax({
            type: 'POST',
            url: window.location.pathname,
            data: {edits: _edits},
            success: editsDone,
            dataType: 'json',
            error: editsError
        });
        _edits = [];
    };
    

    var t;
    var fetchUpdates = function() {
        // console.log('fetching updates...');

        // Get updates for rendered tiles
        // Skip if user is inactive for over a minute:
        if ((new Date().getTime() - _state.lastEvent) > 30000) {
            console.log('paused');
            _ui.paused.show();
            setTimeout(fetchUpdates, 331); // yarg this is getting hacky
            return;
        }

        _ui.paused.hide();
        var bounds = getMandatoryBounds();
        //  maybe we can mess with this

        if (_firstBoundCheck)
        {
            t =setTimeout(fetchUpdates, 2000);
            return;
        }

        if (!_firstBoundCheck)
        {
            clearTimeout(t);
            // console.log('has bounds, fetching Updates');

            jQuery.ajax({
                type: 'GET',
                url: window.location.pathname,
                data: { fetch: 1, 
                        min_tileY: bounds[0],
                        min_tileX: bounds[1],
                        max_tileY: bounds[2],
                        max_tileX: bounds[3],
                        v: 3 // version
                        },
                success: updateData,
                dataType: 'json',
                error: updateError
            });            
               
        }
        return;
    };
    
    var moveCursor = function(dir, opt_from) {
        // `dir` is 'right', 'left', ...
        // opt_from means move it relative to cell other than the default highlighted cell
        // (used for newline)
        // returns the new cursor location
    	goBackToCursor();

        var from = opt_from || _state.selected;
        if (!from) {
            return;
        }

        var YX_yx = YourWorld.helpers.getCellCoords(from);
        var tileY = YX_yx[0];
        var tileX = YX_yx[1];
        var charY = YX_yx[2];
        var charX = YX_yx[3];
 

        if (dir == 'right') {
            // Go forwards. Typing and arrow.
            if (charX == _config.numCols() - 1) {
                // We're at the rightmost edge of the tile
                if (!getOrCreateTile(tileY, tileX + 1)) {
                    throw new Error('Missing piece. Check under the rug?');
                }
                charX = 0;
                tileX++;
            } else {
                charX++;
            }
        } else if (dir == 'left') {
            // Going back, used for backspace and arrow.
            if (charX === 0) {
                // We're at the leftmost edge of the tile
                if (!getOrCreateTile(tileY, tileX - 1)) {
                    throw new Error('Missing piece. Check under the rug?');
                }
                charX = _config.numCols() - 1;
                tileX--;
            } else {
                charX--;
            }
        } else if (dir == 'down') {
            // Going down, used for enter and arrow
            if (charY == _config.numRows() - 1) {
                // We're at the bottom edge of the tile
                if (!getOrCreateTile(tileY + 1, tileX)) {
                    throw new Error('Missing piece. Check under the rug?');
                }
                charY = 0;
                tileY++;
            } else {
                charY++;
            }
        } else if (dir == 'up') {
            // Going down, used for enter and arrow
            if (charY === 0) {
                // We're at the top edge of the tile
                if (!getOrCreateTile(tileY - 1, tileX)) {
                    throw new Error('Missing piece. Check under the rug?');
                }
                charY = _config.numRows() - 1;
                tileY--;
            } else {
                charY--;
            }
        } else {
            throw new Error('Unknown direction to move.');
        }
        var target = getCell(tileY, tileX, charY, charX);
        setSelected(target);
        
        if (dir == 'left') 
        {
            var bottomLeft = FromLatLngToTileWithCells(map.getBounds().getSouthWest(), map.getZoom());
            var maxLeftTile = bottomLeft[0];
            var maxLeftChar = bottomLeft[2];
            if (tileX <= maxLeftTile && charX <= maxLeftChar) 
            {
                //console.log([tileX, maxLeftTile, charX, maxLeftChar]);
                //console.log("panning left by ", _config.charWidth() * -1);
                map.panBy(charWidth * -1, 0);
            }
        }
        else if (dir == 'right') 
        {
            var topRight = FromLatLngToTileWithCells(map.getBounds().getNorthEast(), map.getZoom());
            var maxRightTile = topRight[0];
            var maxRightChar = topRight[2];
            if (tileX >= maxRightTile && charX >= maxRightChar) 
            {
                //console.log([tileX, maxRightTile, charX, maxRightChar]);
                //console.log("panning right by ", _config.charWidth());
                map.panBy(charWidth, 0);
            }
        }
        else if (dir == 'up') 
        {
            var topRight = FromLatLngToTileWithCells(map.getBounds().getNorthEast(), map.getZoom());
            var maxTopTile = topRight[1];
            var maxTopChar = topRight[3];
            if (tileY <= maxTopTile && charY <= maxTopChar) 
            {
                //console.log([tileY, charY, " vs ", maxTopTile, maxTopChar]);
                //console.log("panning up by ", _config.charHeight() * -1);
                map.panBy(0, charHeight * -1);
            }
        }
        else if (dir == 'down') 
        {
            var bottomLeft = FromLatLngToTileWithCells(map.getBounds().getSouthWest(), map.getZoom());
            var maxBottomTile = bottomLeft[1];
            var maxBottomChar = bottomLeft[3];
            if (tileY >= maxBottomTile && charY >= maxBottomChar) 
            {
                //console.log([tileY, charY, " vs ", maxBottomTile, maxBottomChar]);
                //console.log("panning down by ", _config.charHeight());
                map.panBy(0, charHeight);
            }
		}
        
        return target;
    };
    
    var cleanUpTiles = function() {
        // Removes unused tiles
        var now = new Date().getTime();
        var mandatory = getMandatoryTiles();
        var numRequired = mandatory.length;
        if (_state.numTiles < 3*numRequired) {
            return;
        }
        $.each(mandatory, function(index, coords) {
            var tile = getTile(coords[0], coords[1]);
            if (tile) {
                tile.neededAt = now;
            }
        });
        $.each(_tileByCoord, function(tileY, rowObj) {
            $.each(rowObj, function(tileX, tile) {
                if (tile.neededAt != now) {
                    tile.remove();
                    delete _tileByCoord[tileY][tileX];
                    _state.numTiles--;
                }
            });
        });
    };
    
    var doProtect = function(tile) {
        var data = {
            namespace: _state.worldName,
            tileY: $.data(tile, 'tileY'),
            tileX: $.data(tile, 'tileX')
        };
        
        jQuery.ajax({
            type: 'POST',
            url: '/ajax/protect/',
            data: data
        });
    };
    
    var doUnprotect = function(tile) {
        var data = {
            namespace: _state.worldName,
            tileY: $.data(tile, 'tileY'),
            tileX: $.data(tile, 'tileX')
        };
        
        jQuery.ajax({
            type: 'POST',
            url: '/ajax/unprotect/',
            data: data
        });
    };

    var protectATile = function() {
        _ui.scrolling.stop();
		var s1 = YourWorld.helpers.addCss('.tilecont:hover {background-color: #e5e5ff; cursor:pointer}');
        $(_container).one('click', function(e) {
			var target = $(e.target).closest('.tilecont').get(0);
			if (target) {
				doProtect(target);
			}
			$(s1).remove();
            _ui.scrolling.start();
        });
    };
 
    var unprotectATile = function() {
        // TODO: factor out w/protectATile
        _ui.scrolling.stop();
		var s1 = YourWorld.helpers.addCss('.tilecont:hover {background-color: #fff; cursor:pointer}');
        $(_container).one('click', function(e) {
			var target = $(e.target).closest('.tilecont').get(0);
			if (target) {
				doUnprotect(target);
			}
			$(s1).remove();
            _ui.scrolling.start();
        });
    };

	var doGoToCoord = function(y, x) {
		y *= -4; // inverting the setcoords transform
		x *= 4;
		y += 2; // Put the target in the middle of the user-tile instead of the corner
		x += 2;
		// TODO: How can we encapusulate this whole feature better?
		if (!_state.goToCoord.initted) {
			_state.goToCoord.cancel = function() {
				clearInterval(_state.goToCoord.interval);
				_state.lastEvent = new Date().getTime(); // unpause if paused
				$(document).trigger('YWOT_GoToCoord_stop');
			};
			$(document).bind('YWOT_GoToCoord_start', function() {
					$(document).bind('mousedown', _state.goToCoord.cancel); // 'click' event flaky while scrolling
					});
			$(document).bind('YWOT_GoToCoord_stop', function() {
					$(document).unbind('mousedown', _state.goToCoord.cancel);
					});
			_state.goToCoord.initted = true;
		}
		var scroller = function() {
			// We have to recalculate the move every time, or else imprecision will take
			// us off-target over long distances

			var coords = getCenterCoords();
			var centerY = coords[0],
				centerX = coords[1];
			// Calculate difference vector in tiles:
			var yDiff = y - centerY;
			var xDiff = x - centerX;
			// Convert difference vector to pixels:
			yDiff *= _config.tileHeight();
			xDiff *= _config.tileWidth();
			var distance = YourWorld.helpers.vectorLen(yDiff, xDiff);
			var yMove = Math.round(yDiff*20/distance); // normalize, then scale to 10px
			var xMove = Math.round(xDiff*20/distance);
			if (YourWorld.helpers.vectorLen(yDiff, xDiff) < 40) { // 40 pixels w/in target (arbitrary)
				_state.goToCoord.cancel();
				return;
			}
			yDiff = yDiff - yMove;
			scrollUpBy(yMove);
			xDiff = xDiff - xMove;
			scrollLeftBy(xMove);
		};
        // _state.goToCoord.interval = setInterval(scroller, 25); // 1000/25=40 per second * 20px = 800px/s speed
		_state.goToCoord.interval = setInterval(scroller, 500); // 1000/25=40 per second * 20px = 800px/s speed
		$(document).trigger('YWOT_GoToCoord_start');
	};

    //the above scrolling function is too slow for us BUT gave things time to load...
    var jumpToPixPos = function(xMove, yMove)
    {
        scrollLeftBy(xMove);
        scrollUpBy(yMove);
    };




	var getCoordInput = function(title, callback) {
		// Creates a modal dialog to get coordinates from the user, then passes them to the callback function.
		// references global state: _ui.coordInputModal, _ui.coordInputCallback
		var d;
		if (_ui.coordInputModal) {
			d = _ui.coordInputModal;
		} else {
			d = document.createElement('div');
			var html = [];
			html.push('<form method="get" action="#" id="coord_input_form">');
			html.push('<div id="coord_input_title" style="max-width:20em"></div><br>');
			html.push('<table>');
			html.push('<tr><td>X: </td><td><input type="text" name="coord_input_X" value=""></td></tr>');
			html.push('<tr><td>Y: </td><td><input type="text" name="coord_input_Y" value=""></td></tr>');
			html.push('</table>');
			html.push('<div id="coord_input_submit"><input type="submit" value="   Go   "> or <span id="coord_input_cancel" class="simplemodal-close simplemodal-closelink">cancel</span></div>');
			//html.push('<span class="simplemodal-close simplemodal-closebutton">X</span>');
			html.push('</form>');
			d.innerHTML = html.join('');
			$(d).hide();
			$('body').append(d);
			_ui.coordInputModal = d;
			$('#coord_input_form').submit(function() {
					var f, x, y;
					f = document.getElementById('coord_input_form');
					y = parseInt(f.coord_input_Y.value, 10);
					x = parseInt(f.coord_input_X.value, 10);
					var fail = false;
					if (isNaN(y)) {
						fail = true;
						$(f.coord_input_Y).css('border', '1px solid red');
					} else {
						$(f.coord_input_Y).css('border', '');
						f.coord_input_Y.value = y;
					}
					if (isNaN(x)) {
						fail = true;
						$(f.coord_input_X).css('border', '1px solid red');
					} else {
						$(f.coord_input_X).css('border', '');
						f.coord_input_X.value = x;
					}
					if (!fail) {
						// Go:
						$('#coord_input_cancel').trigger('click'); // Close it like this.
						setTimeout(function() {_ui.coordInputCallback(y, x);}, 0); // so it doesn't interfere w/form cancel (?)
					}
					return false; // cancel submit
				});
		}
		$('#coord_input_title').text(title);
		_ui.coordInputCallback = callback;
		$(d).modal({
			minHeight: 80,
			minWidth: 160,
			persist: true
		});
	};

	var goToCoord = function() {
		//setSelected(null); // don't do this or it becomes v. hard to overwrite some links
		getCoordInput('Go to coordinates:', doGoToCoord);
	};

	var sendCoordLink = function(td, y, x) {
		var YX_yx = YourWorld.helpers.getCellCoords(td);
        var data = {
            namespace: _state.worldName,
            tileY: YX_yx[0],
            tileX: YX_yx[1],
            charY: YX_yx[2],
            charX: YX_yx[3],
			link_tileY: y,
			link_tileX: x

        };
        jQuery.ajax({
            type: 'POST',
            url: '/ajax/coordlink/',
            data: data
        });
	};


	var doCoordLink = function(y, x) {
		// TODO: factor out with protect+unprotect
        _ui.scrolling.stop();
		var s1 = YourWorld.helpers.addCss('td:hover {background-color: #aaf; cursor:pointer}');
		if (!_state.canAdmin) {
			var s2 = YourWorld.helpers.addCss('.protected td:hover {background-color: inherit; cursor:inherit}');
		}
        $(_container).one('click', function(e) {
			var target = $(e.target).closest('td').get(0);
			if (target) {
				sendCoordLink(target, y, x);
			}
			$(s1).remove();
			if (!_state.canAdmin) {
				$(s2).remove();
			}
            _ui.scrolling.start();
        });
	};

	var sendUrlLink = function(td, url) {
		var YX_yx = YourWorld.helpers.getCellCoords(td);
        var data = {
            namespace: _state.worldName,
            tileY: YX_yx[0],
            tileX: YX_yx[1],
            charY: YX_yx[2],
            charX: YX_yx[3],
			url: url

        };
        jQuery.ajax({
            type: 'POST',
            url: '/ajax/urllink/',
            data: data
        });
	};


	var doUrlLink = function(url) {
		// TODO: factor out with doCoordLink
        _ui.scrolling.stop();
		var s1 = YourWorld.helpers.addCss('td:hover {background-color: #aaf; cursor:pointer}');
		if (!_state.canAdmin) {
			var s2 = YourWorld.helpers.addCss('.protected td:hover {background-color: inherit; cursor:inherit}');
		}
        $(_container).one('click', function(e) {
			var target = $(e.target).closest('td').get(0);
			if (target) {
				sendUrlLink(target, url);
			}
			$(s1).remove();
			if (!_state.canAdmin) {
				$(s2).remove();
			}
            _ui.scrolling.start();
        });
	};



	var coordLink = function() {
		// Called when clicking on menu item to create link to coordinates
		getCoordInput('Enter the coordinates to create a link to. You can then click on a letter to create the link.', doCoordLink);
	};

	var urlLink = function() {
		// Creates a modal dialog to get URL from the user, then creates the link
		// references global state: _ui.urlInputModal
		// TODO: eliminate duplicate code w/coord modal
		var d;
		if (_ui.urlInputModal) {
			d = _ui.urlInputModal;
		} else {
			d = document.createElement('div');
			var html = [];
			html.push('<form method="get" action="#" id="url_input_form">');
			html.push('<div id="url_input_title" style="max-width:20em"></div><br>');
			html.push('<label for="url_input">URL: </label><input type="text" name="url_input" value="">');
			html.push('<div id="url_input_submit"><input type="submit" value="   Go   "> or <span id="url_input_cancel" class="simplemodal-close simplemodal-closelink">cancel</span></div>');
			html.push('</form>');
			d.innerHTML = html.join('');
			$(d).hide();
			$('body').append(d);
			_ui.urlInputModal = d;
			$('#url_input_form').submit(function() {
					var url = document.getElementById('url_input_form').url_input.value;
					// todo: validate URL?
					$('#url_input_cancel').trigger('click'); // Close it like this.
					setTimeout(function(){doUrlLink(url);}, 0);
					return false; // cancel submit
				});
		}
		$(d).modal({
			minHeight: 80,
			minWidth: 160,
			persist: true
		});
	};

    var scrollLeftBy = function(dx) { // should be called "scrollXBy"; dx is in pixels
        var newPos = _container.scrollLeft() + dx;
        if (newPos < 0) {
            var offset = makeLeftRoom(-newPos);
            newPos = newPos + offset;
        } else {
            var rightRoom = _container.attr('scrollWidth')  - newPos - _container.width();
            if (rightRoom < 0) {
                makeRightRoom(-rightRoom);
            }
        }
        _container.scrollLeft(newPos);
        setCoords();
        
        // map.panBy(dx, 0);
    };

    var scrollUpBy = function(dy) { // should be called "scrollYBy"; dy is in pixels
        var newPos = _container.scrollTop() + dy;
        if (newPos < 0) {
            var offset = makeTopRoom(-newPos);
            newPos = newPos + offset;
        } else {
            var bottomRoom = _container.attr('scrollHeight')  - newPos - _container.height();
            if (bottomRoom < 0) {
                makeBottomRoom(-bottomRoom);
            }
        }
        _container.scrollTop(newPos);
        setCoords();
        
        // map.panBy(0, dy);
    };

    var setSelected = function(el) {
        // Sets the character TD element that is the active cursor position, or null
        //console.log('selected', el);

        //// Setup
        // Unset current
        if (_state.selected) {
            _state.selected.style.backgroundColor = '';
            $(_state.selected).removeClass("selected");
        }
        _state.selected = null;
        // Check DOM
        if (!el || el.nodeName != 'TD') {
			// This is not an error: can be used to unset selected
            return;
        }
        // Check permissions
        var YX_yx = YourWorld.helpers.getCellCoords(el);
        var tile = getTile(YX_yx[0],  YX_yx[1]);
        //console.log([tile.TopLeftY, tile.TopLeftX]);
        if (!tile.initted()) {
            //console.log("does not compute");
            return;
        }
        if (!_state.canWrite || (tile.isProtected() && !_state.canAdmin)) {
            return;
        }
        
        //// Do it:
        // Ensure visible
        // var e = $(el);
        // var rightRoom = _container.offset().left + _container.width() - e.offset().left - e.width();
        // if (rightRoom < 0) {
        //     scrollLeftBy(Math.ceil(-rightRoom/_config.charWidth())*_config.charWidth());
        // }
        // var btmRoom = _container.offset().top + _container.height() - e.offset().top - e.height();
        // if (btmRoom < 0) {
        //     scrollUpBy(Math.ceil(-btmRoom/_config.charHeight())*_config.charHeight());
        // }
        
        // Hightlight and store
        _state.selected = el; 
        $(_state.selected).addClass("selected")
        // _state.selected.style.backgroundColor = 'yellow';
    };

    var typeChar = function(s) {
        // Updates the tile text. 
        // Param `s` is a character that was typed
        // console.log('typeChar-', s , '-');


        // Validate and parse
        if (!_state.canWrite) {
            return;
        }
        if (s.length != 1) {
            throw new Error('I thought I was only getting one letter');
        }
        if (!_state.selected) {
            //throw new Error("Chip can't type without selection.");
            return;
        }
        var YX_yx = YourWorld.helpers.getCellCoords(_state.selected);
        var tileY = YX_yx[0];
        var tileX = YX_yx[1];
        var charY = YX_yx[2];
        var charX = YX_yx[3];
        var tile = getTile(tileY, tileX);
        if (!tile) {
            throw new Error('tile to update not found');
        }
	
		//check if cursor is outside bounds and pan back to it.
    	goBackToCursor();
	

        // Update character in UI and record pending edit
        _state.selected.innerHTML = YourWorld.helpers.escapeChar(s);
        
        if (s != ' ')
        {
            $(_state.selected).removeClass();
            $(_state.selected).addClass("t"+ usercolor);
        }

        
        var timestamp = new Date().getTime();
        tile.tellEdit(charY, charX, s, timestamp, usercolor);
        queueEdit([tileY, tileX, charY, charX, timestamp, s, usercolor]);
    };
    
    var queueEdit = function (arr) {
        // Record a local edit to be transmitted to server
        // arr is [tileY, tileX, charY, charX, timestamp, char] AND COLOR so 7
        if (arr.length != 7) {  
            throw new Error('Invalid edit');
        }
        _edits.push(arr);
    };

    // Public
   
    obj.init = function(container, menu, state) {
        // Creates Your World of Text. Poof!
        _container = $(container);
        container = undefined; // so I don't use it
        _menu = menu;
        $.extend(_state, state);
    
        // UI elements
        _ui.paused = $('#paused');
        _ui.announce = $('#announce');
        if (_state.announce) {
            _ui.announce.html(_state.announce);
            _ui.announce.show();
        }
        
        // Style and config setup
        _container.css('position', 'relative');
        _container.css('fontFamily', 'Courier New');
        _container.css('overflow', 'hidden');
        // _container.css('background', '#ddd');
        _container.height($(window).height());
        _container.width($(window).width());
        _config = YourWorld.Config(_container);
		// TODO: DRY container id, or some other solution. These styles are necessary for IE.
        YourWorld.helpers.addCss('#yourworld table {height:' + currentTileHeight + 'px }');
        YourWorld.helpers.addCss('#yourworld table {width:' + currentTileWidth + 'px }');
        YourWorld.helpers.addCss('.tilecont {height:' + currentTileHeight + 'px }');
        YourWorld.helpers.addCss('.tilecont {width:' + currentTileWidth + 'px }');
        // Initial tile render
        _state.offsetX = parseInt(_container.width()/2, 10);
        _state.offsetY = parseInt(_container.height()/2, 10);
        _state.numTiles = 0;
        
        renderMandatoryTiles();

        mapInitialize();

        
        // Handle window resize
        $(window).resize(function() {
            _container.height($(window).height());
            _container.width($(window).width());
            renderMandatoryTiles();
        });

        //// Handle input
        // Create the input element that captures all entered text
        // Also capture backspace
        // Also record that the user is active
        // Also capture ENTER
        // Also capture arrow keys
        var input = document.createElement('input');
        input.type = 'text';
        input.style.position = 'absolute';
        input.style.left = '-1000px';
        input.style.top = '-1000px';
        document.body.appendChild(input);
        setInterval(function() {
            if (input.value) {
                typeChar(input.value.charAt(0));
                moveCursor('right');
            }
            input.value = ''; // prevent paste
        }, 10);
        input.focus();
        $(document).keydown(function(e) {
			if (_state.uiModal) {
				return;
			}
            // For typing in the input:
            input.focus(); 
            // Backspace
            if (e.keyCode == $.ui.keyCode.BACKSPACE) {
                moveCursor('left');
                typeChar(' ');
            // Enter
            } else if (e.keyCode == $.ui.keyCode.ENTER) {
                if (_state.lastClick && _state.lastClick.nodeName == 'TD') {
                	moveCursor('down', _state.lastClick);
                    _state.lastClick = moveCursor('down', _state.lastClick);
                }

            } else if (e.keyCode == $.ui.keyCode.LEFT) {
                moveCursor('left');
				_state.lastClick = _state.selected;
            } else if (e.keyCode == $.ui.keyCode.RIGHT) {
                moveCursor('right');
				_state.lastClick = _state.selected;
            } else if (e.keyCode == $.ui.keyCode.DOWN) {
                moveCursor('down');
				_state.lastClick = _state.selected;
            } else if (e.keyCode == $.ui.keyCode.UP) {
                moveCursor('up');
				_state.lastClick = _state.selected;
            }
            _state.lastEvent = new Date().getTime();
        });
        
        // Capture activity for sleep mode
        _container.mousemove(function() {
            _state.lastEvent = new Date().getTime();
        });
        
        // Capture clicks to set the cursor location
        // _container.click(function(ev) {
        //     // console.log('SETTING SELECTED');
        //    setSelected(ev.target);
        //    _state.lastClick = ev.target;
        // });
        
        // Prevent selection
        document.onselectstart = function() {return false;}; // IE
        _container.css('-khtml-user-select', 'none'); // Safari
        _container.css('-moz-user-select', '-moz-none'); // FF
        
        // Turn on scrolling
        // I don't think we need this -z
        // _ui.scrolling = makeScrollable(_container, function(dx, dy) {
        //         scrollLeftBy(dx);
        //         scrollUpBy(dy);
        // });
        
        // Push and pull data
        setInterval(sendEdits, 1997);
        // TODO reenable
        // setInterval(fetchUpdates, 2999); // Changed to happen after success/failure
        setInterval(renderMandatoryTiles, 197);


        fetchUpdates();  //this was active, and the above intervalled one was commented out...
        
        //// Add menu options
        var s, i;
        // Coords:
        s = $(document.createElement('div'));
        s.text(' Show coordinates');
        i = document.createElement('input');
        i.type = 'checkbox';
        s.prepend(i);
        s.click(function(e) {
            if (e.target != i) {
                i.checked = !i.checked;
            }
            if (i.checked) {
                $('#coords').show();
            } else {
                $('#coords').hide();
            }
        });
        _menu.addEntry(s[0]);
        setCoords(); // TODO: this gets the wrong info! setTimeout 0 doesn't help. corrected on first scroll. why isn't it starting at 0,0?

        // Go to a location
        if (_state.features.go_to_coord) {
            s = $(document.createElement('div'));
            s.text('Go to coordinates');
            s.click(goToCoord);
            s.click(menu.close);
            _menu.addEntry(s[0]);
        }

		// Insert link to location
        if (_state.features.coordLink) {
            s = $(document.createElement('div'));
            s.text('Create link to coordinates');
            s.click(coordLink);
            s.click(menu.close);
            _menu.addEntry(s[0]);
		}
		$('.coordLink').live('click', function() {
			doGoToCoord($.data(this, 'link_tileY'), $.data(this, 'link_tileX'));
		});

		// Insert link to URL
        if (_state.features.urlLink) {
            s = $(document.createElement('div'));
            s.text('Create link to URL');
            s.click(urlLink);
            s.click(menu.close);
            _menu.addEntry(s[0]);
		}


        // Protect a tile
        if (_state.canAdmin) {
            s = $(document.createElement('div'));
            s.text('Make an area owner-only');
            s.click(protectATile);
            s.click(menu.close);
            _menu.addEntry(s[0]);
        }

        // Unprotect a tile
        if (_state.canAdmin) {
            s = $(document.createElement('div'));
            s.text('Undo make owner-only');
            s.click(unprotectATile);
            s.click(menu.close);
            _menu.addEntry(s[0]);
        }
	
		// For modal dialogs:
		$(document).bind('simplemodal_onopen', function() {
				_state.uiModal = true;
				});
		$(document).bind('simplemodal_onclose', function() {
				_state.uiModal = false;
				});
        
        
        $('#loading').hide();
        // console.log('initd');


    };

    // Breaking the rules
    obj.getOrCreateTile = getOrCreateTile;


    
    return obj;

}();

YourWorld.Tile = function() {
    // A single tile of text. 
    var obj = {};

	// State shared between tiles
	var _defaultHTML; 
	var _inkLimiter = [parseInt(new Date().getTime()/1000, 10), 0]; // sec, num of highlights in
                                                                // that sec (max ink = 10/s)
                                                                // accessed by tiles 
 
	var makeDefaultHTML = function(config) {
		var html = [];
		var content = config.defaultContent();
        html.push('<table width="100%" height="100%" cellspacing="0" cellpadding="0" border="0"><tbody>');
		// y goes down, x goes right
		var c, charY, charX;
		var contentPos = 0;
		for (charY=0; charY<config.numRows(); charY++) {
			html.push('<tr>');
			for (charX=0; charX<config.numCols(); charX++) {
				c = content.charAt(contentPos);
				c = YourWorld.helpers.escapeChar(c);
				html.push('<td>' + c + '</td>');
				contentPos++;
			}
			html.push('</tr>');
		}
		html.push('</tbody></table>');
		return html.join('');
	};


	var getDefaultHTML = function(config) {
		if (!_defaultHTML) {
			_defaultHTML = makeDefaultHTML(config);
		}
		return _defaultHTML;
	};

	obj.create = function(tileY, tileX, config, node) {
		var obj = {};

		// Private
		var $node = $(node);
        var _content; // string representing tile's last-known state on server (i.e., no local edits)
		var _colors; // string representing tile's last-known color state on server (i.e., no local edits)
		var _initted = false; // whether tile has received initial content data
		var _pendingEdits = {}; // maps (flattened content index) -> (char, timestamp)
		var _protected = false;
		var _cellProps = null;
		
		var updateHTML = function(newContent, highlight, colors) {
			var c, charY, charX, cell;
			var contentPos = 0;
			var sec = parseInt(new Date().getTime()/1000, 10);
			if (_inkLimiter[0] != sec) {
				_inkLimiter[0] = sec;
				_inkLimiter[1] = 0;
			}
			for (charY=0; charY<config.numRows(); charY++) {
				for (charX=0; charX<config.numCols(); charX++) {
					if (_pendingEdits[contentPos] && _pendingEdits[contentPos].length) {
						// Most recent pending edit:
						c = _pendingEdits[contentPos][_pendingEdits[contentPos].length - 1][0];
					} else {
                        c = newContent[contentPos];
						colorid = colors[contentPos];
					}
					if (c != _content[contentPos]) {
						// Update the cell
						c = YourWorld.helpers.escapeChar(c);
						cell = obj.getCell(charY, charX);
						cell.innerHTML = c;

                        $(cell).removeClass();
                        $(cell).addClass("t"+colorid);
                        
                        // console.log('colorrrid', colorid);
						
						if (highlight && !cell.style.backgroundColor) {
							// Don't highlight selected or it'll stay yellow
							if (_inkLimiter[1] < 10) {
								// $(cell).effect('highlight', {}, 500);  //removed because people didn't like it
								_inkLimiter[1]++;
							}
						}
					}
					contentPos++;
				}
			}
		};
		
		var setContent = function(newContent, colors) {
			// newContent is either a string, with a char for each cell, or `null` to mean blank

			// First convert content to a string:
			if (newContent === null) {
				newContent = config.defaultContent();
			}

			// If this is our first setContent, change bgcolor to white to indicate live content
			// and don't highlight "updated" cells in later updateHTML call
			var highlight = true;
			if (!_initted) {
				_initted = true;
				highlight = false;
				node.style.backgroundColor = '';
			}

			// Update the content
			if (newContent != _content) {
				updateHTML(newContent, highlight, colors);
				_content = newContent; // this must come after updateHTML
			}
		};
		
		var setProtected = function(prot) {
			if (prot == _protected) {
				return;
			}
			_protected = prot;
			if (prot) {
				$node.addClass('protected');
			} else {
				$node.removeClass('protected');
			}
			
		};

		var setCellProps = function(cellProps) {

			if (YourWorld.helpers.deepEquals(cellProps, _cellProps)) {
				return;
			}
			_cellProps = cellProps;

			// Clear old cellProps:
			$node.find('span').each(function() {
				// TODO: does this leak memory from the live event?
				this.parentNode.innerHTML = this.innerHTML;
			});
          // console.log('setting cell props');

			// Set new cellProps:
			$.each(cellProps, function(charY, rowProps) {
				$.each(rowProps, function(charX, cellProps) {
					var contentPos, chr, cell;
					charY = parseInt(charY, 10);
					charX = parseInt(charX, 10);
					contentPos = charY*config.numCols() + charX;
					chr = _content[contentPos];
					chr = YourWorld.helpers.escapeChar(chr);
					cell = obj.getCell(charY, charX);
					cell.innerHTML = chr;

                    // $(cell).addClass("t5");
                    // console.log($(cell).hasClass("t5"));

					$.each(cellProps, function(propName, val) {
						var s;
						if (propName == 'link') {
							if (val.type == 'coord') {
								s = document.createElement('span');
								s.className = 'coordLink';
								s.title = 'Link to coordinates ' + val.link_tileX + ',' + val.link_tileY;
								$(cell).wrapInner($(s));
								s = cell.childNodes[0];
								$.data(s, 'link_tileY', val.link_tileY);
								$.data(s, 'link_tileX', val.link_tileX);
							} else if (val.type == 'url') {
								s = document.createElement('a');
								s.className = 'urlLink';
								s.href = val.url;
								s.target = '_blank';
								s.title = 'Link to URL ' + val.url;
								$(cell).wrapInner($(s));
								s = cell.childNodes[0];
							} else {
								throw new Error('Unknown link type');
							}

						} 

                        else {
							throw new Error('Unknown cell property');
						}
					});
				});
			});
		};
		
		// Public
		obj.initted = function() { return _initted; };
		obj.isProtected = function() { return _protected; };
		
		obj.tellEdit = function(charY, charX, s, timestamp, color) {
			// Right now the rendering is handled outside of this class because it's easier,
			// but we still need to know about the update so that the server's version of 
			// the tile doesn't overwrite our unsent local changes.
			if (!_initted) {
				throw new Error("Can't edit uninitialized tile");
			}
			var index = charY * config.numCols() + charX;
			if (_pendingEdits[index] === undefined) {
				_pendingEdits[index] = [];
			}
			_pendingEdits[index].push([s, timestamp, color]);
		};
		
		obj.setProperties = function(p) {
			// p is either an object or null to mean no data
			// setContent((p && p.content) ? p.content : null);

            setContent(p && p.content, p.color);
   

			setProtected(p && p.properties && p.properties['protected'] || false);
			setCellProps(p && p.properties && p.properties.cell_props || null);
		};
		
		obj.editDone = function(charY, charX, timestamp, s) {
			var index = charY * config.numCols() + charX;
			var ar = _pendingEdits[index];
			ar.splice($.inArray(ar, [s, timestamp]), 1);
		};
		
		obj.getCell = function(charY, charX) {
			// returns this Tile's TD node at (charY, charX)
			if (!_initted) {
				throw new Error('no cell yet');
			}
			var rows = node.childNodes[0].childNodes[0]; // table, tbody
			return rows.childNodes[charY].childNodes[charX];
		};    

		obj.remove = function() {
			// Do this manually because jQuery's remove() is too slow. Requires internal knowledge.
			// Currently a small memory leak:
			// TODO: remove $.data on node
			// TODO: remove $.data on cell's w/links
			node.parentNode.removeChild(node);
		};

		// Init
		// node.style.backgroundColor = '#eee';
		node.innerHTML = getDefaultHTML(config);
		_content = config.defaultContent();
        _initted = true;
		
        //breaking the rules
        obj.HTMLnode= function()
        {
            return node;
        }

        obj.HTMLcontent= function()
        {
            return node.innerHTML;
        }

		return obj;
	}; // end of Tile.create
	return obj;
}(); // end of Tile


$(document).ready(function() {

	$("#topbarAbout > a").click(function(){
		$("#aboutOverlay").fadeIn(300);	
	});


	$(".closeme").click(function(){
		$(this).parent().fadeOut()
	});
	

			
			

});




