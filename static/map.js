var darkMapStyle=[
  {
    stylers: [
      { invert_lightness: true }
    ]
  },{
    featureType: "landscape",
    stylers: [
      { visibility: "simplified" }
    ]
  },{
    featureType: "poi",
    stylers: [
      { lightness: -50 }
    ]
  },{
    featureType: "road",
    elementType: "labels",
    stylers: [
      { lightness: -40 }
    ]
  },{
    featureType: "transit",
    elementType: "labels",
    stylers: [
      { gamma: 2.04 },
      { lightness: -33 }
    ]
  },{
    featureType: "road.arterial",
    stylers: [
      { hue: "#00e5ff" },
      { gamma: 0.47 },
      { lightness: -21 }
    ]
  },{
    featureType: "road.highway",
    stylers: [
      { lightness: -56 }
    ]
  },{
    featureType: "road.local",
    elementType: "labels",
    stylers: [
      { visibility: "on" },
      { lightness: -40 }
    ]
  },{
    featureType: "poi",
    elementType: "labels",
    stylers: [
      { lightness: -10 }
    ]
  },{
    featureType: "transit",
    elementType: "labels",
    stylers: [
      { visibility: "on" },
      { lightness: -18 }
    ]
  }
];



var config = new Object;

// config.num_rows = 8;
// config.num_cols = 16;
config.num_rows = 12;
config.num_cols = 12;

config.map_tile_x = 250;
config.map_tile_y = 250;

config.default_content = Array(config.num_rows*config.num_cols+1).join('#');



var darkMapType = new google.maps.StyledMapType(darkMapStyle,
  {name: "Dark Maps"});

function CoordMapType(tileSize) {
    this.tileSize = tileSize;
  }

  CoordMapType.prototype.getTile = function(coord, zoom, ownerDocument) {
    console.log(coord)
    var div = ownerDocument.createElement('DIV');
    // div.innerHTML = coord;
    div.style.width = this.tileSize.width + 'px';
    div.style.height = this.tileSize.height + 'px';
    div.style.fontSize = '15px';
    // div.style.borderStyle = 'solid';
    // div.style.borderWidth = '1px';
    // div.style.borderColor = '#AAFFFF';




    var html = [];
    // var content = config.default_content;
    var content = "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod              eiusmodeiusmode ieiusmodeiusmodeiusm podeiu aod foeeoeoey";

    html.push('<table width="100%" height="100%" cellspacing="0" cellpadding="0" border="0"><tbody>');
    // y goes down, x goes right
    var c, charY, charX;
    var contentPos = 0;
    for (charY=0; charY<config.num_rows; charY++) {
      html.push('<tr>');
      for (charX=0; charX<config.num_cols; charX++) {
        c = content.charAt(contentPos);
        // c = YourWorld.helpers.escapeChar(c);
        html.push('<td >' + c + '</td>');
        contentPos++;
      }
      html.push('</tr>');
    }
    html.push('</tbody></table>');

    $(div).append(html.join(''));
    return div;
  };
 


var map;

var centerOfWorld= new google.maps.LatLng(40.7294317, -73.99358870000003);  //ITP's location, duh
var myHouse = new google.maps.LatLng(40.6795338, -73.98078750000002);
var testpos = new google.maps.LatLng(40.750313,-74.001396); // chelsea

var haveOffset = 0;

var initialUserPos;
var pixelWorldCenter, pixelUser;

function initialize() {
  var myOptions = {
    zoom: 18,
    // zoom: 16,
    // zoom: 11,
    // disableDoubleClickZoom : true,
    scrollwheel: false,
    // draggable: false,
    // disableDefaultUI: true,
    panControl: false, 
    // zoomControl: false,
    streetViewControl: false,
    mapTypeControl:false,
    mapTypeId: google.maps.MapTypeId.ROADMAP,

    mapTypeControlOptions: {
      mapTypeIds: [google.maps.MapTypeId.ROADMAP, 'dark_map']
      }
  };
  
  map = new google.maps.Map(document.getElementById('mapcanvas'), myOptions);
  
  var overlay;

  var srcImage = "http://static.zazerr.webfactional.com/zblog_site_media/photologue/photos/cache/DSC_0141_thumbnail.jpg";

  map.mapTypes.set('dark_map', darkMapType);
  map.setMapTypeId('dark_map');

  // Try HTML5 geolocation
  if(navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
    $("#geoReminder").fadeOut();

    initialUserPos = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);

    //for testing.
    // initialUserPos= myHouse;
    // initialUserPos= centerOfWorld;
    // initialUserPos= testpos;  
    // console.log('initialUserPos', initialUserPos)


    var marker = new google.maps.Marker({
                map: map,
                position: initialUserPos,
        });

      map.setCenter(initialUserPos);


      // distanceFromCenter=  google.maps.geometry.spherical.computeDistanceBetween(centerOfWorld, initialUserPos);
       

      map.overlayMapTypes.insertAt(0, new CoordMapType(new google.maps.Size(config.map_tile_x, config.map_tile_y)));

      google.maps.event.addListener(map, 'bounds_changed', function() {

          bounds = map.getBounds();
          console.log(bounds);

          // overlay = new ywotOverlay(map, srcImage, bounds);


      });


    }, function() {
      handleNoGeolocation(true);
    }, 
  { enableHighAccuracy: true,} //timeout: 6000, maximumAge: 10000 }  //optons for getCurrentPosition
  );
  } else {
    // Browser doesn't support Geolocation
    handleNoGeolocation(false);
  }
}


// Our Overlay Constructor
function ywotOverlay(map, image, bounds) {
  this.map_ = map;
  this.div_ = null;
  this.setMap(map);
  this.image_ = image;
  this.bounds_ = bounds;


}

ywotOverlay.prototype = new google.maps.OverlayView();

ywotOverlay.prototype.onAdd = function() {

  // Note: an overlay's receipt of onAdd() indicates that
  // the map's panes are now available for attaching
  // the overlay to the map via the DOM.

  // Create the DIV and set some basic attributes.
  var div = document.createElement('DIV');
  div.style.border = "none";
  div.style.borderWidth = "0px";
  div.style.position = "absolute";
  div.style.opacity = "0.5";

  // Create an IMG element and attach it to the DIV.
  var img = document.createElement("img");
  img.src = this.image_;
  img.style.width = "100%";
  img.style.height = "100%";
  // div.appendChild(img);

  // var testtext = $("<span>A B C D E F G H I J K L M N O P</span>");
  // $(div).append(testtext);

  // Set the overlay's div_ property to this DIV
  this.div_ = div;

  // We add an overlay to a map via one of the map's panes.
  // We'll add this overlay to the overlayImage pane.
  var panes = this.getPanes();
  panes.overlayLayer.appendChild(div);
}



ywotOverlay.prototype.draw = function() {
  // console.log('drawing our overlay');
  var overlayProjection = this.getProjection();


  var overlayProjection = this.getProjection();

  // Retrieve the southwest and northeast coordinates of this overlay
  // in latlngs and convert them to pixels coordinates.
  // We'll use these coordinates to resize the DIV.
  var sw = overlayProjection.fromLatLngToDivPixel(this.bounds_.getSouthWest());
  var ne = overlayProjection.fromLatLngToDivPixel(this.bounds_.getNorthEast());

  // Resize the image's DIV to fit the indicated dimensions.
  var div = this.div_;
  div.style.left = sw.x + 'px';
  div.style.top = ne.y + 'px';
  div.style.width = (ne.x - sw.x) + 'px';
  div.style.height = (sw.y - ne.y) + 'px';


  // pixelWorldCenter = overlayProjection.fromLatLngToDivPixel(centerOfWorld);
  // console.log('pixelWorldCenter',pixelWorldCenter);

  // pixelUser = overlayProjection.fromLatLngToDivPixel(initialUserPos);
  // console.log('pixelUser',pixelUser);

  //move the textworld to mapworld based on pixel difference
  //this probably isn't the place for this, but whatever
 
 // I think the bug comes from this getting executed before enough of the offscreen tiles have loaded
  // if (!haveOffset)
  // {
  //     console.log('OFFSETTTINGGGGGgg');
  //     YourWorld.World.JumpToGmapsPix();
  //     haveOffset=1;
  // }
  //and a new bug, sometimes the overlay get redrawn, so I'm moving this
}


function handleNoGeolocation(errorFlag) {
  if (errorFlag) {
    var content = '<b>Error: The Geolocation service failed.</b>';
  } else {
    var content = '<b>Error: Your browser doesn\'t support geolocation.</b>';
  }
 
  var options = {
    map: map,
    position: new google.maps.LatLng(-69.821392, -75.329819), //antartica, teeeheeee
    content: content
  };

  var infowindow = new google.maps.InfoWindow(options);

  map.setCenter(options.position);
}

google.maps.event.addDomListener(window, 'load', initialize);