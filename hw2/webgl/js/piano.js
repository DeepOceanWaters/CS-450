var selected;

function handleFileSelect(evt) {
    evt.stopPropagation();
    evt.preventDefault();

    var files = evt.dataTransfer.files; // FileList object.

    // files is a FileList of File objects. List some properties.
    for (var i = 0, f; f = files[i]; i++) {
        html = $.parseHTML('<li class="pill"><a href="#">' + escape(f.name) + '</a></li>');
        $('#list').append(html);
    }
    if(selected !== undefined && selected !== null) {
        selected.toggleClass('active');
    }
    $('#list').find('.pill').each(setNavHandle);
    selected.toggleClass('active');
}

function setNavHandle(i, child) {
    $(child).off();
    $(child).on("click", handleNavClick);
    selected = $(child);
}

function handleNavClick(event) {
    var filePill = $(this);
    filePill.toggleClass('active');
    selected.toggleClass('active');
    selected = filePill;
    event.stopPropagation();
    event.preventDefault();
    return false;
}

function handleDragOver(event) {
  event.stopPropagation();
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
}

var gl;

function initGL(canvas) {
    if (window.File && window.FileReader && window.FileList && window.Blob) {
        //alert('Can read files!');
    } else {
        alert('The File APIs are not fully supported by your browser.');
    }
    resize();
    try {
        gl = canvas.getContext("experimental-webgl");
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
    } catch (e) {
    }
    if (!gl) {
        alert("Could not initialise WebGL, sorry :-(");
    }
}

function resize() {
    var canvas = $('#hw1-canvas');
    var parentWidth = canvas.parent().width();
    canvas.width(parentWidth);
    canvas.attr('width', parentWidth);
    canvas.height(parentWidth);
    canvas.attr('height', parentWidth);
}


function getShader(gl, id) {
    var shaderScript = document.getElementById(id);
    if (!shaderScript) {
        return null;
    }

    var str = "";
    var k = shaderScript.firstChild;
    while (k) {
        if (k.nodeType == 3) {
            str += k.textContent;
        }
        k = k.nextSibling;
    }

    var shader;
    if (shaderScript.type == "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type == "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;
    }

    gl.shaderSource(shader, str);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}


var shaderProgram;

function initShaders() {
    var fragmentShader = getShader(gl, "shader-fs");
    var vertexShader = getShader(gl, "shader-vs");

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Could not initialise shaders");
    }

    gl.useProgram(shaderProgram);

    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

    shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
    gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
}


var mvMatrix = mat4.create();
var mvMatrixStack = [];
var pMatrix = mat4.create();

function mvPushMatrix() {
    var copy = mat4.create();
    mat4.set(mvMatrix, copy);
    mvMatrixStack.push(copy);
}

function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
        throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}


function setMatrixUniforms() {
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}


function initBuffers() {
    initKeys();
}

var piano = {};
piano.BLACK_KEY = {};
piano.BLACK_KEY.COLOR = [0.0, 0.0, 0.0, 1.0];
piano.BLACK_KEY.YL = 1.1;
piano.BLACK_KEY.YH = 2.9;
piano.BLACK_KEY.Z  = 0.1;
piano.WHITE_KEY = {};
piano.WHITE_KEY.COLOR = [1.0, 1.0, 1.0, 1.0];
piano.WHITE_KEY.YL = 0.1;
piano.WHITE_KEY.YH = 2.9;
piano.WHITE_KEY.Z  = 0.0;

function initKeys() {
    var keyOffset = -1.0;
    piano.keys = [];
    for(var i = 0; i < 36; i++) {
        initKey(i);
        keyOffset = initKeyVertices(piano.keys[i], keyOffset);
        initKeyColors(piano.keys[i]);
    }
}

function initKey(pos) {
    var key;
    key = {};
    key.vBuffer = gl.createBuffer();
    key.cBuffer = gl.createBuffer();
    key.localPos = pos % 12;
    key.pos = pos;
    key.isBlack = isBlackKey(key);
    piano.keys[pos] = key;
}

function initKeyVertices(key, keyOffset) {
    var vertices;
    var xh;
    var xl;
    var yh;
    var yl;
    var z;
    
    keyOffset += getOffset(key);
    xh = keyOffset + 0.9;
    xl = keyOffset + 0.1;

    if(key.isBlack) {
        yl = piano.BLACK_KEY.YL;
        yh = piano.BLACK_KEY.YH;
        z = piano.BLACK_KEY.Z;
    }
    else {
        yl = piano.WHITE_KEY.YL;
        yh = piano.WHITE_KEY.YH;
        z = piano.WHITE_KEY.Z;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, key.vBuffer);
    vertices = [
            xl, yl, z,
            xl, yh, z,
            xh, yl, z,
            xh, yh, z
        ];

    console.log(vertices);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    key.vBuffer.itemSize = 3;
    key.vBuffer.numItems = 4;

    return keyOffset;
}

function getOffset(key) {
    if(key.localPos == 0 || key.localPos == 5) {
        return 1.0;
    }
    else {
        return 0.5;
    }
}

function isBlackKey(key) {
    switch(key.pos % 12) {
        case 1:
        case 3:
        case 6:
        case 8:
        case 10:
            return true;
            break;
        default:
            return false;
            break;
    }
}

function initKeyColors(key) {
    var colors = [];
    var color;

    color = key.isBlack? piano.BLACK_KEY.COLOR : piano.WHITE_KEY.COLOR;

    
    gl.bindBuffer(gl.ARRAY_BUFFER, key.cBuffer);
    for (var i=0; i < 4; i++) {
        colors = colors.concat(color);
    }
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    key.cBuffer.itemSize = 4;
    key.cBuffer.numItems = 4;
}




function drawScene() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


    mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 1000.0, pMatrix);

    mat4.identity(mvMatrix);

    mat4.translate(mvMatrix, [-10.5, 0.0, -30.0]);
    $(piano.keys).each(draw);
}

function draw(index, key) {
    mvPushMatrix();
    mat4.translate(mvMatrix, [0.0, 0.0, 0.0]);
    console.log(key);
    gl.bindBuffer(gl.ARRAY_BUFFER, key.vBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, key.vBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, key.cBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, key.cBuffer.itemSize, gl.FLOAT, false, 0, 0);

    setMatrixUniforms();
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, key.vBuffer.numItems);

    mvPopMatrix();
}

function webGLStart() {
    var canvas = document.getElementById("hw1-canvas");
    initGL(canvas);
    initShaders()
    initBuffers();

    gl.clearColor(0.2, 0.2, 0.2, 1.0);
    gl.enable(gl.DEPTH_TEST);
    drawScene();
}

function setSize() {
    alert('STUFF!');
    $('#hw1-canvas').attr('width', $(window).width());
    $('#hw1-canvas').attr('height', $(window).height());
    drawScene();
}

$(document).ready(function() {
    // Setup the dnd listeners.
    var dropZone = document.getElementById('drop-zone');
    dropZone.addEventListener('dragover', handleDragOver, false);
    dropZone.addEventListener('drop', handleFileSelect, false);
    webGLStart();
});
