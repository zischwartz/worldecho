/*
MCustomTileLayer.js

Copyright 2010 - Marcelo Montagna  - http://maps.forum.nu

Free to use as long as copyright notices are left unchanged.
Please save the file to your own server. Do not link directly,
or unexpected things might happen to your control :-)

*/



function MCustomTileLayer(map,theme) {
	this.map = map;
	this.opacity = 0;
	this.tiles = Array();
	this.theme = theme;
	this.tileSize = new google.maps.Size(256,256);

	this.maxZoom = 19;
	this.minZoom = 4;
	this.name = 'Custom Layer';
	this.alt =  'Custom Layer';
	this.visible = false;
	this.initialized = false;

	this.self = this;
}


MCustomTileLayer.prototype.getTile = function(p, z, ownerDocument) {

	// If the tile already exists then use it
	for (var n = 0; n < this.tiles.length ; n++) {
		if (this.tiles[n].id == 't_' + p.x + '_' + p.y + '_' + z) {
//			debug('Found ' + this.tiles[n].id);
			return this.tiles[n];
		}
	}
	
	// If the tile does not exist then create it
	var tile = ownerDocument.createElement('IMG');
	tile.id = 't_' + p.x + '_' + p.y + '_' + z
	tile.style.width = this.tileSize.width + 'px';
	tile.style.height = this.tileSize.height + 'px';
	tile.src = this.getTileUrl(p,z);
	if (!this.visible) {
		tile.style.display = 'none';
	}


//tile.onerror = function(){this.onerror=null; this.src='./none.png';}; 

	this.tiles.push(tile)

	//Don't let the array get too big
	while (this.tiles.length > 100) {
		var removed = this.tiles.shift();
		removed = null;
	}
	
	this.setObjectOpacity(tile);
	return tile;
};


MCustomTileLayer.prototype.getTileUrl = function(p,z) {
	var url = '/tiles345/' + this.theme + '/' + z + '/' + p.x + '_' + p.y +  '_' + z + '.png?r=' + Math.random();
	return url;
}


MCustomTileLayer.prototype.initialize = function() {
	if (this.initialized) {
		return;
	}
	var self = this.self;
	this.map.overlayMapTypes.insertAt(0, self);
	this.initialized = true;
}


MCustomTileLayer.prototype.hide = function() {
	this.visible = false;

	for (var n = 0; n < this.tiles.length ; n++) {
		this.tiles[n].style.display = 'none';
	}
}
MCustomTileLayer.prototype.show = function() {
	this.initialize();
	this.visible = true;
	for (var n = 0; n < this.tiles.length ; n++) {
		this.tiles[n].style.display = '';
	}
}

// This function doesn't seem to do anything
MCustomTileLayer.prototype.releaseTile = function(tile) {
//	debug('Release ' + tile.id);
	tile = null;
}

MCustomTileLayer.prototype.setOpacity = function(op) {
	this.opacity = op;
	
	for (var n = 0; n < this.tiles.length ; n++) {
		this.setObjectOpacity(this.tiles[n]);
	}
}


MCustomTileLayer.prototype.fadeToOpacity = function(op) {
	var self = this.self;
	if (typeof op != 'undefined') {
		this.targetOpacity = op;
	}
//debug(this.opacity + ' --- ' + this.targetOpacity)
	if (this.opacity != this.targetOpacity) {
		if (this.opacity < this.targetOpacity) {
			this.opacity += 1;
		}
		else if (this.opacity > this.targetOpacity) {
			this.opacity -= 1;
		}
		for (var n = 0; n < this.tiles.length ; n++) {
			this.setObjectOpacity(this.tiles[n]);
		}
		window.setTimeout(function(){self.fadeToOpacity()},10);
	}
	else if (this.targetOpacity == 0) {
		this.hide();
	}
}







MCustomTileLayer.prototype.setObjectOpacity = function(obj) {
	if (this.opacity) {        
		if ( typeof(obj.style.filter)       == 'string' ) {obj.style.filter       = 'alpha(opacity:'+ this.opacity + ')'; }
		if ( typeof(obj.style.KHTMLOpacity) == 'string' ) {obj.style.KHTMLOpacity = this.opacity/100; }
		if ( typeof(obj.style.MozOpacity)   == 'string' ) {obj.style.MozOpacity   = this.opacity/100; }
		if ( typeof(obj.style.opacity)      == 'string' ) {obj.style.opacity      = this.opacity/100; }
	}
}
