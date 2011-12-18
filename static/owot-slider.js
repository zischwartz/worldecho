
$(document).ready(function() {
  
	$("#timeslider").slider({
		min: YourWorld.World.getSliderMin(),
		max: YourWorld.World.getSliderMax(),
		value: YourWorld.World.getTimestamp(),   
		slide: function(event, ui) { 
		  //console.log("sliding the slider!! so exciting!!");
		  YourWorld.World.setTimestamp(ui.value);
		}
	});
	
	var parseTimestampData = function(data) {
	    //console.log("parsin' that data!");
	    $.each(data, function(property, value) {
		if (property.indexOf('min') > -1) {
		    //console.log(value);
		    YourWorld.World.setSliderMin(value);
		    //console.log($("#timeslider").slider("option", "min"));
		    //$("#timeslider").slider("option", "min", value);
		} else if (property.indexOf('max') > -1) {
		    //console.log(value);
		    YourWorld.World.setSliderMax(value);
		    //$("#timeslider").slider("option", "max", value);
		}
	    });
	};
	
	jQuery.ajax({
		type: 'GET',
		url: window.location.pathname,
		data: { get_timestamp_range: 1
			},
		success: parseTimestampData,
		dataType: 'json',
		complete: readySlider
	});
	
	var readySlider = function(msg) {
	    console.log("editing a slider!");

	    $("#timeslider").slider("option", "min", YourWorld.World.getSliderMin());
	    $("#timeslider").slider("option", "max", YourWorld.World.getSliderMax());
	    $("#timeslider").slider("option", "value", YourWorld.World.getTimestamp());
	    
	};

});

