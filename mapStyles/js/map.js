
var // Global Variables
reports = [],
MYMAP = {
  map: null,
	bounds: null
};

$(document).ready(function() {



	var myLatLng = new google.maps.LatLng(40.72948650621468,-73.9940357208252);
    MYMAP.init('#map', myLatLng, 12);

	var here = navigator.geolocation.getCurrentPosition
		  (showMap, handleError, {maximumAge:60000});
	console.log(here);

});


MYMAP.init = function(selector, latLng, zoom) {
	var myOptions = {
		zoom:17,
		center: latLng,
		mapTypeId: google.maps.MapTypeId.ROADMAP,
		styles: mapStyleDark3
	}
	this.map = new google.maps.Map($(selector)[0], myOptions);
	this.bounds = new google.maps.LatLngBounds();
}



