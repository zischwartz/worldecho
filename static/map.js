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

var darkMapType = new google.maps.StyledMapType(darkMapStyle,
  {name: "Dark Maps"});


var map;

var centerOfWorld= new google.maps.LatLng(40.7294317, -73.99358870000003);  //ITP's location, duh
var myHouse = new google.maps.LatLng(40.6795338, -73.98078750000002);
var testpos = new google.maps.LatLng(40.750313,-74.001396); // chelsea

var haveOffset = 0;

var initialUserPos;
var pixelWorldCenter, pixelUser;

function initialize() {
  var myOptions = {
    zoom: 16,
    // zoom: 11,
    disableDoubleClickZoom : true,
    scrollwheel: false,
    draggable: false,
    panControl: false, 
    zoomControl: false,
    streetViewControl: false,
    mapTypeControl:false,
    mapTypeControlOptions: {
      mapTypeIds: [google.maps.MapTypeId.ROADMAP, 'dark_map']
      }
  };
  
  map = new google.maps.Map(document.getElementById('mapcanvas'), myOptions);
  
  var overlay;

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
      
      console.log('initialUserPos', initialUserPos)


      var marker = new google.maps.Marker({
                  map: map,
                  position: initialUserPos,
              });


      // var infowindow = new google.maps.InfoWindow({
      //   map: map,
      //   position: centerOfWorld,
      //   content: '<b>The center of the world.</b>',
      //   disableAutoPan: true
      // });

        map.setCenter(initialUserPos);
        // distanceFromCenter=  google.maps.geometry.spherical.computeDistanceBetween(centerOfWorld, initialUserPos);
        overlay = new ywotOverlay(map);

        // console.log('distancefrom center in pix:', pixelDistanceFromCenter);


    }, function() {
      handleNoGeolocation(true);
    }, 
  { enableHighAccuracy: true, timeout: 6000, maximumAge: 10000 }  //optons for getCurrentPosition
  );
  } else {
    // Browser doesn't support Geolocation
    handleNoGeolocation(false);
  }
}


function ywotOverlay(map) {
  this.map_ = map;
  this.div_ = null;
  this.setMap(map);
}

ywotOverlay.prototype = new google.maps.OverlayView();

ywotOverlay.prototype.draw = function() {
  console.log('drawing our overlay');
  var overlayProjection = this.getProjection();
  console.log(overlayProjection)

  var div = document.createElement('DIV');
  var panes = this.getPanes();
  panes.overlayLayer.appendChild(div);

  pixelWorldCenter = overlayProjection.fromLatLngToDivPixel(centerOfWorld);
  console.log('pixelWorldCenter',pixelWorldCenter);

  pixelUser = overlayProjection.fromLatLngToDivPixel(initialUserPos);
  console.log('pixelUser',pixelUser);

  //move the textworld to mapworld based on pixel difference
  //this probably isn't the place for this, but whatever
 
 // I think the bug comes from this getting executed before enough of the offscreen tiles have loaded
  if (!haveOffset)
  {
      console.log('OFFSETTTINGGGGGgg');
      YourWorld.World.JumpToGmapsPix();
      haveOffset=1;
  }
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