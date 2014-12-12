function ModelDef(transform, rotation, scale) {
	if (transform !== null && transform !== undefined) {
		this.transform = transform;
		this.rotation = rotation;
		this.scale = scale;
	}
	else {
		var blank = [0.0, 0.0, 0.0, 0.0];
		this.transform = blank;
		this.rotation = blank;
		this.scale = blank;
	}
}

function SceneObjectDef(wireFaces, faces, vertices, normals, mode) {
	this.wireFaces = wireFaces;
	this.faces = faces;
	this.vertices = vertices;
	this.normals = normals;
	this.mode = mode;
}

function colorsAreEqual(color1, color2) {
    if (color1 === undefined || color1 === null || color2 === undefined || color2 === null) {
        return false;
    }
    return color1[0] == color2[0] 
        && color1[1] == color2[1]
        && color1[2] == color2[2];
}

var colorSequence = 0;

function SceneObject(attrs, center, showing) {
	this.attrs = attrs;
	this.center = center;
	this.showing = showing;
	this.subObjs = new Array();
	this.isSelected = false;
	this.modelDef = null;
	this.colorId = 0;
}

SceneObject.prototype.init = function() {
	this.initColorId();
	this.initModelDef();
};

SceneObject.prototype.initColorId = function() {
    this.colorId = colorSequence;
    this.colorId.uint = new Uint8Array(4);
    this.colorId.uint[0] = colorSequence % 256;
    this.colorId.uint[1] = Math.floor(colorSequence / 256) % 256;    
    this.colorId.uint[2] = Math.floor(colorSequence / (256 * 256)) % 256;     
    this.colorId.uint[3] = 255;
    this.colorId.rgb = new Array(4);
    this.colorId.rgb[0] = (colorSequence % 256) / 256;
    this.colorId.rgb[1] = (Math.floor(colorSequence / 256) % 256) / 256;    
    this.colorId.rgb[2] = (Math.floor(colorSequence / (256 * 256)) % 256) / 256;     
    this.colorId.rgb[3] = 1.0;
    colorSequence++;
};

SceneObject.prototype.initModelDef = function() {
	this.modelDef = new ModelDef();
};

SceneObject.prototype.isPicked = function(pickedColor) {
	return colorsAreEqual(pickedColor, this.colorId.uint);
}

SceneObject.prototype.draw = function(obj) {
	currentColor = fileObj.colorId;

    var faceBuffer;
    var mode;
    var sizeOfFaces = fileObj.faces.length;
    if(!offScreen && obj.isPicked(colorPicked)) {
        obj.isSelected = !obj.isSelected;
    }
    if(!offScreen && obj.isSelected) {
    	mode = gl.LINES;
        faceBuffer = obj.attrs.wireFaces.buffer;
        sizeOfFaces = obj.attrs.wireFaces.length;
        picked = true;
    }
    else {
    	mode = obj.attrs.mode;
    	faceBuffer = obj.attrs.faces.buffer;
    	sizeOfFaces = obj.attrs.faces.length;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.vertices.buffer);
    gl.vertexAttribPointer(shaderProgram.vPositionAttr, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, obj.normals.buffer);
    gl.vertexAttribPointer(shaderProgram.vNormalsAttr, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, faceBuffer);
    setMatrixUniforms();
    gl.drawElements(mode, sizeOfFaces, gl.UNSIGNED_SHORT, 0);

    picked = false;
};