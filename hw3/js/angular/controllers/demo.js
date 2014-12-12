var gl      = null;
        var program = null;
        var vbo = [];
        var nbo = [];
        var ibo = [];
        var ind = [];
        var canvas = null;
        var camera = new Camera();
        var orbitCubeA = true;
        var mouseX = 0;
        var mouseY = 0;
        var lastX  = null;
        var lastY  = null;
        var isDrag = false;
        var isShift = false;
        var isCtrl  = false;
        var colors  = [];      
        var time = Date.now();
        var timeDelta = time;
        
        function render() {
        	
            // ********************************
            // GL state
            // ********************************
            gl.clearColor(0.9, 0.9, 0.9, 1.0);
            gl.clearDepth(1.0);
            gl.enable(gl.DEPTH_TEST);
            gl.disable(gl.CULL_FACE);

            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            // ********************************
            // update matrices/set program vars
            // ********************************            
            gl.uniformMatrix4fv(program.uMVMatrix, false, camera.getModelViewMatrix());
            gl.uniformMatrix4fv(program.uPMatrix,  false, camera.getProjectionMatrix());
            gl.uniformMatrix4fv(program.uNMatrix,  false, camera.getNormalMatrix());

            // ********************************
            // loop through objects
            // ********************************
            var color;
            var inc = 1.0 / vbo.length;

            for (var i = 0; i < vbo.length; i++) {
            	color = colors[i];
                gl.uniform3f(program.uColor, color.r, color.g, color.b);

                gl.bindBuffer(gl.ARRAY_BUFFER, vbo[i]);
                gl.vertexAttribPointer(program.aVertexPosition, 3, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(program.aVertexPosition);

                gl.bindBuffer(gl.ARRAY_BUFFER, nbo[i]);
                gl.vertexAttribPointer(program.aVertexNormal, 3, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(program.aVertexNormal);

                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo[i]);
                gl.drawElements(gl.TRIANGLES, ind[i].length, gl.UNSIGNED_SHORT, 0);
            }

        }

        function getRandomColor(){
        	return { r: Math.random(), g: Math.random(), b: Math.random() };
        }

        function animate(){
        	requestAnimationFrame(animate);
            
            timeDelta = Date.now() - time;
            time = Date.now();
            
			render();        	
        }



function Camera(){
    this.mvMatrix    = mat4.create();
    this.orbitMatrix = mat4.create();
    this.eyeMatrix   = mat4.create();
    this.pMatrix     = mat4.create();
    this.nMatrix     = mat4.create();
    this.cMatrix     = mat4.create();
    
    this.aspectRatio = 1.6;
    this.fov         = 1.0;

    this.orbit = [0, 0, 0]; // where we are orbiting
    this.eye   = [0, 0, 0]; // where eye/camera is   

    this.orbitRotation = quat.create();
    this.eyeRotation   = quat.create();
    
    this.rotYaw     = 0;
    this.orbitYaw   = 0;
    this.orbitPitch = 0;

    this.far  = 2000;
    this.near = 0.1;
    this.up   = [0, 1, 0];

    //this.update();
}

Camera.prototype.setAspectRatio = function(aspect){
    this.aspectRatio = aspect;
};

Camera.prototype.update = function(isOrbit){    
    
    if(isOrbit) {
        var eye = vec3.create();
                
        vec3.sub(eye, this.eye, this.orbit);
        
        mat4.fromRotationTranslation(this.orbitMatrix, this.orbitRotation, this.orbit);
        mat4.fromRotationTranslation(this.eyeMatrix,   this.eyeRotation,   eye);        
        mat4.multiply(this.mvMatrix, this.orbitMatrix, this.eyeMatrix);
    }
    else {
        
        
        mat4.fromRotationTranslation(this.mvMatrix, this.eyeRotation, this.eye);    
    }
};

Camera.prototype.getModelViewMatrix = function () {
    mat4.invert(this.cMatrix, this.mvMatrix);
    return this.cMatrix;
};

Camera.prototype.getProjectionMatrix = function () {
    mat4.perspective(this.pMatrix, this.fov, this.aspectRatio, this.near, this.far);
    return this.pMatrix;
};

Camera.prototype.getNormalMatrix = function () {    
    var mvMatrix = this.getModelViewMatrix();
    var nMatrix  = this.nMatrix;

    mat4.copy(nMatrix, mvMatrix);
    mat4.invert(nMatrix, nMatrix);
    mat4.transpose(nMatrix, nMatrix);

    return nMatrix;
};

Camera.prototype.setOrbit = function (newOrbit) {        
    vec3.copy(this.orbit, newOrbit);
    this.update();
};

Camera.prototype.setEye = function (eye) {
    vec3.copy(this.eye, eye);
    this.update();
};

Camera.prototype.changeOrbitYaw = function(amount){
    var rotYaw = quat.create();
    
    quat.setAxisAngle(rotYaw, this.up, amount);
    quat.multiply(this.orbitRotation, rotYaw, this.orbitRotation);
    quat.normalize(this.orbitRotation, this.orbitRotation);
    
    this.orbitYaw += amount;
    
    this.update(true);
};

Camera.prototype.changeOrbitPitch = function(amount){
    quat.rotateX(this.orbitRotation, this.orbitRotation, amount);
    quat.normalize(this.orbitRotation, this.orbitRotation);
    
    this.update(true);
};

Camera.prototype.changeEyeYaw = function (amount) {    
    var rotYaw = quat.create();    
    quat.setAxisAngle(rotYaw, this.up, amount);
    quat.multiply(this.eyeRotation, rotYaw, this.eyeRotation);
    
    this.rotYaw += amount;
    
    this.update();
};

Camera.prototype.changeEyePitch = function (amount) {
    quat.rotateX(this.eyeRotation, this.eyeRotation, amount);
    quat.normalize(this.eyeRotation, this.eyeRotation);
    this.update();
};

Camera.prototype.moveEye = function (direction, velocity) {
        vec3.scale(direction, direction, velocity);
        vec3.sub(this.eye, this.eye, direction);
        this.update();
    };

Camera.prototype.moveEyeForward = function (velocity) {
        var dir   = vec3.fromValues(0, 0, 0);
        var right = this.getEyeRightVector();
        
        vec3.cross(dir, right, this.up);
        vec3.normalize(dir, dir);
    
        this.moveEye(dir, velocity);
    
        this.update();
    };

Camera.prototype.moveEyeBackward = function (velocity) {
        var dir   = vec3.fromValues(0, 0, 0);
        var right = this.getEyeRightVector();
        
        vec3.cross(dir, right, this.up);
        vec3.normalize(dir, dir);
        vec3.negate(dir, dir);
    
        this.moveEye(dir, velocity);
        
        this.update();
    };   

Camera.prototype.moveEyeLeft = function (velocity) {
        this.moveEye(this.getEyeLeftVector(), velocity);
    };

Camera.prototype.moveEyeRight = function (velocity) {
        this.moveEye(this.getEyeRightVector(), velocity);
    };    

Camera.prototype.moveEyeUp = function (velocity) {
        this.eye[1] += velocity;
        this.update();
    };

Camera.prototype.moveEyeDown = function (velocity) {
        this.eye[1] -= velocity;
        this.update();
    };

Camera.prototype.getEyeForwardVector = function () {
        var q  = this.eyeRotation;
        var qx = q[0], qy = q[1], qz = q[2], qw = q[3];

        var x =     2 * (qx * qz + qw * qy);
        var y =     2 * (qy * qx - qw * qx);
        var z = 1 - 2 * (qx * qx + qy * qy);

        return vec3.fromValues(x, y, z);
    };

Camera.prototype.getEyeBackwardVector = function () {
        var v = this.getEyeForwardVector();
        vec3.negate(v, v);
        return v;
    };    

Camera.prototype.getEyeRightVector = function () {
        var q  = this.eyeRotation;
        var qx = q[0], qy = q[1], qz = q[2], qw = q[3];

        var x = 1 - 2 * (qy * qy + qz * qz);
        var y =     2 * (qx * qy + qw * qz);
        var z =     2 * (qx * qz - qw * qy);

        return vec3.fromValues(x, y, z);
    };

Camera.prototype.getEyeLeftVector = function () {
        var v = this.getEyeRightVector();
        vec3.negate(v, v);
        return v;
    };

Camera.prototype.getEyeUpVector = function () {
        var q  = this.eyeRotation;
        var qx = q[0], qy = q[1], qz = q[2], qw = q[3];

        var x =     2 * (qx * qy - qw * qz);
        var y = 1 - 2 * (qx * qx + qz * qz);
        var z =     2 * (qy * qz + qw * qx);

        return vec3.fromValues(x, y, z);
    };

Camera.prototype.getEyeDownVector = function () {
        var v = this.getEyeUpVector();
        vec3.negate(v, v);
        return v;
    };

var stats;

function init() {                        

    // ********************************
    // init GL
    // ********************************
    canvas = document.getElementById("canvas");
    gl = canvas.getContext("experimental-webgl");

    canvas.width  = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    camera.setAspectRatio(canvas.width / canvas.height);

    // ********************************
    // load shaders + programs
    // ********************************
    var vstext   = document.getElementById("vert_shader").innerText;
    var fstext   = document.getElementById("frag_shader").innerText;
    var vsshader = gl.createShader(gl.VERTEX_SHADER);
    var fsshader = gl.createShader(gl.FRAGMENT_SHADER);

    gl.shaderSource(vsshader, vstext);
    gl.shaderSource(fsshader, fstext);

    gl.compileShader(vsshader);
    gl.compileShader(fsshader);

    if (!gl.getShaderParameter(vsshader, gl.COMPILE_STATUS)) console.error("Failed to compile WebGL shader : 'vert_shader'.  Reason: " + gl.getShaderInfoLog(vsshader));
    if (!gl.getShaderParameter(fsshader, gl.COMPILE_STATUS)) console.error("Failed to compile WebGL shader : 'frag_shader'.  Reason: " + gl.getShaderInfoLog(fsshader));

    program = gl.createProgram();

    gl.attachShader(program, vsshader);
    gl.attachShader(program, fsshader);
    gl.linkProgram(program);
    gl.useProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        console.error("Program failed to link.");

    // ********************************
    // get/set program var locations
    // ********************************
    program.aVertexPosition = gl.getAttribLocation(program, "aVertexPosition");
    program.aVertexNormal   = gl.getAttribLocation(program, "aVertexNormal");            
    program.uMVMatrix = gl.getUniformLocation(program, "uMVMatrix");
    program.uPMatrix  = gl.getUniformLocation(program, "uPMatrix");
    program.uNMatrix  = gl.getUniformLocation(program, "uNMatrix");
    program.uColor    = gl.getUniformLocation(program, "uColor");

    // ********************************
    // load object(s)
    // ********************************
    var objects = [];
    var nx = 25;
    var nz = 25;
    var sx = 10;

    for (var cx = 0; cx < nx; cx++) {
        for (var cz = 0; cz < nz; cz++) {
            var c = CreateCube(-10 + (cx * sx), 0, -10 + (cz * sx));
            objects.push(c);
            colors.push(getRandomColor());
        }
    }

    console.log("number of cubes: "+ objects.length)

    for (var i = 0; i < objects.length; i++) {
        var vbuffer = gl.createBuffer();
        var nbuffer = gl.createBuffer();
        var ibuffer = gl.createBuffer();

        gl.bindBuffer(gl.ARRAY_BUFFER, vbuffer);
        gl.bufferData(gl.ARRAY_BUFFER, objects[i].verts, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, nbuffer);
        gl.bufferData(gl.ARRAY_BUFFER, objects[i].normals, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, objects[i].indices, gl.STATIC_DRAW);

        vbo.push(vbuffer);
        nbo.push(nbuffer);
        ibo.push(ibuffer);
        ind.push(objects[i].indices);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    // ********************************
    // init camera location
    // ********************************
    camera.setOrbit([((nx * sx) / 2), 0, ((nx * sx) / 2)]);
    camera.setEye([(nx * sx)/2, (nx * sx)/4, (nx * sx) * 2]);

    // ********************************
    // event handlers
    // ********************************            
    window.addEventListener("keydown", function (event) {
        isShift = event.shiftKey;
        isCtrl  = event.ctrlKey;
    });

    window.addEventListener("keyup", function (event) {
        isShift = event.shiftKey;
        isCtrl  = event.ctrlKey;
    });

    canvas.addEventListener("mousedown", function (event) { 
        if (event.button == 0) {
            isDrag = true;

            mouseX = event.offsetX;
            mouseY = event.offsetY;
            lastX  = mouseX;
            lastY  = mouseY;
        }
    });

    canvas.addEventListener("mouseup", function (event) {
        if (event.button == 0)
            isDrag = false;
    });

    canvas.addEventListener("mousemove", function (event) {        
        mouseX = event.offsetX;
        mouseY = event.offsetY;

        if (lastX === null) lastX = mouseX;
        if (lastY === null) lastY = mouseY;
        
        if(!isDrag) return;
        
        if(isCtrl){ // look
            var dx = (lastX - mouseX) * 0.005;
            var dy = (lastY - mouseY) * 0.005;                    

            camera.changeEyePitch(dy);
            camera.changeEyeYaw(dx);

            lastX = mouseX;
            lastY = mouseY;
        }
        else if(isShift){ // pan
            var nx = mouseX;
            var ny = mouseY;
            var ox = lastX;
            var oy = lastY;

            camera.pan(nx, ny, ox, oy);

            lastX = mouseX;
            lastY = mouseY;
            
        } else { // orbit
            var dx = (lastX - mouseX);
            var dy = (lastY - mouseY);                    

            camera.changeOrbitYaw(dx * 0.001 * timeDelta);
            camera.changeOrbitPitch(dy * 0.001 * timeDelta);

            lastX = mouseX;
            lastY = mouseY;
        }        
    });

    canvas.addEventListener("mousewheel", function(event){   
        event.preventDefault();

        var cw2 = canvas.width  / 2;
        var ch2 = canvas.height / 2;
        var dx  =  (mouseX - cw2) / cw2;
        var dy  = -(mouseY - ch2) / ch2;

        var foward = true;

        if (event.wheelDelta < 0)
            foward = false;

        camera.zoomToPoint(dx, dy, foward);
    });

    document.addEventListener("keydown", function (event) {
        event.preventDefault();
        
        var ctrl = event.shiftKey;
        var delta = timeDelta * 0.5;
        var key = event.keyCode;        
        var c1 = 0.005;
        var c2 = 0.12;

        if (key == 100) camera.changeOrbitYaw(+0.01 * delta);   // numpad 4
        if (key == 102) camera.changeOrbitYaw(-0.01 * delta);   // numpad 6
        if (key == 98)  camera.changeOrbitPitch(-0.01 * delta); // numpad 2
        if (key == 104) camera.changeOrbitPitch(+0.01 * delta); // numpad 8

        if (key == 38) camera.changeEyePitch(+0.01 * delta); // up arrow
        if (key == 40) camera.changeEyePitch(-0.01 * delta); // down arrow
        if (key == 37) camera.changeEyeYaw(+0.01 * delta);   // left arrow
        if (key == 39) camera.changeEyeYaw(-0.01 * delta);   // right arrow
        
        if(key == 87) camera.moveEyeForward(c2 * delta);
        if(key == 83) camera.moveEyeBackward(c2 * delta);
        if(key == 65) camera.moveEyeLeft(-c2 * delta);
        if(key == 68) camera.moveEyeRight(-c2 * delta);
        if(key == 82) camera.moveEyeUp(c2 * delta);
        if(key == 70) camera.moveEyeDown(c2 * delta);
        
        if(key == 81) camera.changeEyeYaw(c1 * delta);
        if(key == 69) camera.changeEyeYaw(-c1 * delta);     
    });            


    // ********************************
    // render
    // ********************************
    //render();
    animate();
}

function CreateCube(x, y, z) {
    // vertex coords array
    var vertices = new Float32Array(
        [  1, 1, 1,  -1, 1, 1,  -1,-1, 1,   1,-1, 1,    // v0-v1-v2-v3 front
           1, 1, 1,   1,-1, 1,   1,-1,-1,   1, 1,-1,    // v0-v3-v4-v5 right
           1, 1, 1,   1, 1,-1,  -1, 1,-1,  -1, 1, 1,    // v0-v5-v6-v1 top
          -1, 1, 1,  -1, 1,-1,  -1,-1,-1,  -1,-1, 1,    // v1-v6-v7-v2 left
          -1,-1,-1,   1,-1,-1,   1,-1, 1,  -1,-1, 1,    // v7-v4-v3-v2 bottom
           1,-1,-1,  -1,-1,-1,  -1, 1,-1,   1, 1,-1]    // v4-v7-v6-v5 back
    );

    // normal array
    var normals = new Float32Array(
        [  0, 0, 1,   0, 0, 1,   0, 0, 1,   0, 0, 1,     // v0-v1-v2-v3 front
           1, 0, 0,   1, 0, 0,   1, 0, 0,   1, 0, 0,     // v0-v3-v4-v5 right
           0, 1, 0,   0, 1, 0,   0, 1, 0,   0, 1, 0,     // v0-v5-v6-v1 top
          -1, 0, 0,  -1, 0, 0,  -1, 0, 0,  -1, 0, 0,     // v1-v6-v7-v2 left
           0,-1, 0,   0,-1, 0,   0,-1, 0,   0,-1, 0,     // v7-v4-v3-v2 bottom
           0, 0,-1,   0, 0,-1,   0, 0,-1,   0, 0,-1]     // v4-v7-v6-v5 back
       );

    // index array
    var indices = new Uint16Array(
        [  0, 1, 2,   0, 2, 3,    // front
           4, 5, 6,   4, 6, 7,    // right
           8, 9,10,   8,10,11,    // top
          12,13,14,  12,14,15,    // left
          16,17,18,  16,18,19,    // bottom
          20,21,22,  20,22,23]    // back
      );

    for (var i = 0; i < vertices.length; i+= 3) {
        vertices[i + 0] += x;
        vertices[i + 1] += y;
        vertices[i + 2] += z;
    }

    return { verts: vertices, normals: normals, indices: indices };
}

init();