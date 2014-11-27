var canvasCtrl = angular.module('CanvasController', []);

canvasCtrl.controller('CanvasCtrl', ['$scope', '$http', 'fileService', 'viewService',
    function ($scope, $http, fileService, viewService) {
        // When a file is selected or deselected, redraw the scene.
        $scope.$on('selectedFilesChange', drawSceneDummy);
        $scope.$on('updateView', drawSceneDummy);
        var mouse = {
                x: 0,
                y: 0,
                clicked: false,
                isDown: false,
                down: { x:0, y:0 }
            };

        $(document).ready(function(){
            webGLStart();
            document.oncontextmenu = function() {return false;};
            $(window).resize(function() {
                resize();
            });
            $('#hw1-canvas').mousemove(function(event) {
                if (document.mozFullScreen || document.webkitIsFullScreen) {
                    mouse.x = event.pageX;
                    mouse.y = canvasHeight - event.pageY;
                }
                else {
                    var parentOffset = $(this).parent().offset();
                    mouse.x = Math.round(event.pageX - parentOffset.left);
                    mouse.y = $(this).attr('height') - Math.round(event.pageY - parentOffset.top);
                }
            });
            $('#hw1-canvas').click(function(event) {
                mouse.clicked = !mouse.clicked;
            });
            // We just have to 
            $('#hw1-canvas').mousedown(mouseChange);
            $('#hw1-canvas').mouseup(mouseChange);
            $('#fullscreen').click(function(event) {
                requestFullscreen(canvas);
            });
            document.addEventListener('fullscreenchange', fullscreenChange);
            document.addEventListener('mozfullscreenchange', fullscreenChange);
            document.addEventListener('webkitfullscreenchange', fullscreenChange);           
        });
        
        var context;

        function mouseChange(event) {
            switch (event.which) {
            case 1: // Left Mouse Button
            case 3: // Right Mouse Button
                mouse.isDown = !mouse.isDown;
                break;
            case 2: // Middle Mouse Button
                break;
            
            default:
                alert('You have a strange Mouse!');
            }
            if (mouse.isDown) {
                if (document.mozFullScreen || document.webkitIsFullScreen) {
                    mouse.down.x = event.pageX;
                    mouse.down.y = canvasHeight - event.pageY;
                }
                else {
                    var parentOffset = $(this).parent().offset();
                    mouse.down.x = Math.round(event.pageX - parentOffset.left);
                    mouse.down.y = $(this).attr('height') - Math.round(event.pageY - parentOffset.top);
                }
            }
        }

        var fullscreenChange = function() {
            if(document.mozFullScreen || document.webkitIsFullScreen) {
                isFullscreen = true;
                var rect = $(window);
                var canvasL = $(canvas);
                canvasL.width(rect.width());
                canvasL.height(rect.height());
                canvasL.attr('width', rect.width());
                canvasL.attr('height', rect.height());
                canvasWidth = canvasL.width();
                canvasHeight = canvasL.height();
            }
            else {
                isFullscreen = false;
                resize();
            }
        }

        var requestFullscreen = function (elem) {
            if (elem.requestFullscreen) {
                elem.requestFullscreen();
            } 
            else if (elem.msRequestFullscreen) {
                elem.msRequestFullscreen();
            } 
            else if (elem.mozRequestFullScreen) {
                elem.mozRequestFullScreen();
            } 
            else if (elem.webkitRequestFullscreen) {
                elem.webkitRequestFullscreen();
            }
        };

        var isFullscreen = false;
        $scope.pickedColor = [];
        var drawSceneDummy = function() {};
        var CONSTANTS = {
            // SN = shader name
            SN_POSITION:"vPosition",
            SN_NORMAL:"vNormal",
            SN_PROJECTION:"Projection",
            SN_MODEL_VIEW:"ModelView",
            SN_AMBIENT:"AmbientProduct",
            SN_DIFFUSE:"DiffuseProduct",
            SN_SPECULAR:"SpecularProduct",
            SN_LIGHT_POSITION:"LightPosition",
            SN_SHININESS:"Shininess",
            SN_OFF_SCREEN:"OffScreen",
            SN_PICKING_COLOR:"PickingColor",
            SN_PICKED:"Picked",
            SN_EYE_POSITION:"EyePosition",
            UNUSED_COLOR_ID:new Uint8Array([0, 0, 0, 255])
        };

        // Shader values for light
        var LIGHT = {
            position:[1.5, 1.5, 2.0, 1.0],
            ambient:[0.2, 0.2, 0.2, 1.0],
            diffuse:[1.0, 1.0, 1.0, 1.0],
            specular:[1.0, 1.0, 1.0, 1.0]
        };

        // Shader values for material
        var MATERIAL = {
            ambient:[1.0, 0.0, 1.0, 1.0],
            diffuse:[1.0, 0.8, 0.0, 1.0],
            specular:[1.0, 0.8, 0.0, 1.0],
            shininess:100.0
        };

        var AXES = {
        };

        var selectedObject;
        
        

        var gl;
        var shaderProgram;
        var mvMatrixStack = [];
        var mvMatrix = mat4.create();
        var pMatrix = mat4.create();

        var canvas;
        var canvasWidth;
        var canvasHeight;

        var fb;
        var colorTexture;
        var depthBuffer;
        var colorSequence;
        var colorPicked;
        var offScreen;
        var currentColor;
        var picked;


        function colorsAreEqual(color1, color2) {
            if (color1 === undefined || color1 === null || color2 === undefined || color2 === null) {
                return false;
            }
            return color1[0] == color2[0] 
                && color1[1] == color2[1]
                && color1[2] == color2[2];
        }

        function setObjColorId(obj) {
            if(obj.colorId !== undefined && obj.colorId !== null) {
                return;
            }
            obj.colorIdUint = new Uint8Array(4);
            obj.colorIdUint[0] = colorSequence % 256;
            obj.colorIdUint[1] = Math.floor(colorSequence / 256) % 256;    
            obj.colorIdUint[2] = Math.floor(colorSequence / (256 * 256)) % 256;     
            obj.colorIdUint[3] = 255;
            obj.colorId = new Array(4);
            obj.colorId[0] = (colorSequence % 256) / 256;
            obj.colorId[1] = (Math.floor(colorSequence / 256) % 256) / 256;    
            obj.colorId[2] = (Math.floor(colorSequence / (256 * 256)) % 256) / 256;     
            obj.colorId[3] = 1.0;
            colorSequence += 1;
        }

        function initPickingBuffer() {
            //Creates texture
            colorTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, colorTexture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvasWidth, canvasHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            
            //Creates framebuffer
            fb = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorTexture, 0);
            gl.bindTexture(gl.TEXTURE_2D, colorTexture);
            gl.enable(gl.DEPTH_TEST);

            // create renderbuffer
            depthBuffer = gl.createRenderbuffer();
            gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
            
            // allocate renderbuffer
            gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, canvasWidth, canvasHeight);  
            
            // attach renderebuffer
            gl.framebufferRenderbuffer(
                gl.FRAMEBUFFER,
                gl.DEPTH_ATTACHMENT,
                gl.RENDERBUFFER,
                depthBuffer
            );
            if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE) {
                alert("this combination of attachments does not work");
                return;
            }
        }

        /**
         * Initializes the gl.
         */
        function initGL(canvas) {
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

        /**
         * Sets the width and height of the canvas to
         * the width of the wrapping element.
         */
        function resize() {
            // Note: jQuery's resize event listener is triggered when
            //  an element is given fullscreen (e.g. requestFullscreen()) in Chrome,
            //  but not in Firefox.
            if (!isFullscreen) {
                var canvas = $('#hw1-canvas');
                var parentWidth = canvas.parent().width();
                canvas.width(parentWidth);
                canvas.height(parentWidth);
                canvas.attr('width', parentWidth);
                canvas.attr('height', parentWidth);
                canvasWidth = canvas.width();
                canvasHeight = canvas.height();
                var fullscreen = $("#fullscreen");
                fullscreen.css('top', 3 - canvas.height());
                fullscreen.css('left', canvas.width() - fullscreen.width() - 3 - 26);
            }
            if (gl !== undefined && gl !== null) {
                initPickingBuffer();
            }
        }

        /**
         * gets the shader with the given id
         */
        function getShader(id) {
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

        /**
         * Initialize shaders
         */
        function initShaders() {
            var fragmentShader = getShader("shader-fs");
            var vertexShader = getShader("shader-vs");

            shaderProgram = gl.createProgram();
            gl.attachShader(shaderProgram, vertexShader);
            gl.attachShader(shaderProgram, fragmentShader);
            gl.linkProgram(shaderProgram);

            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
                alert("Could not initialise shaders");
            }

            gl.useProgram(shaderProgram);

            shaderProgram.vPositionAttr = gl.getAttribLocation(shaderProgram, CONSTANTS.SN_POSITION);
            gl.enableVertexAttribArray(shaderProgram.vPositionAttr);

            shaderProgram.vNormalsAttr = gl.getAttribLocation(shaderProgram, CONSTANTS.SN_NORMAL);
            gl.enableVertexAttribArray(shaderProgram.vNormalsAttr);

            shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, CONSTANTS.SN_PROJECTION);
            shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, CONSTANTS.SN_MODEL_VIEW);
            shaderProgram.ambient = gl.getUniformLocation(shaderProgram, CONSTANTS.SN_AMBIENT);
            shaderProgram.diffuse = gl.getUniformLocation(shaderProgram, CONSTANTS.SN_DIFFUSE);
            shaderProgram.specular = gl.getUniformLocation(shaderProgram, CONSTANTS.SN_SPECULAR);
            shaderProgram.lightPos = gl.getUniformLocation(shaderProgram, CONSTANTS.SN_LIGHT_POSITION);
            shaderProgram.shininess = gl.getUniformLocation(shaderProgram, CONSTANTS.SN_SHININESS);
            shaderProgram.offScreen = gl.getUniformLocation(shaderProgram, CONSTANTS.SN_OFF_SCREEN);
            shaderProgram.pickingColor = gl.getUniformLocation(shaderProgram, CONSTANTS.SN_PICKING_COLOR);
            shaderProgram.picked = gl.getUniformLocation(shaderProgram, CONSTANTS.SN_PICKED);
            shaderProgram.eyePosition = gl.getUniformLocation(shaderProgram, CONSTANTS.SN_EYE_POSITION);
        }

        /**
         * Add a copy of the current mvMatrix
         * to the top of the mvMatrix stack.
         */
        function mvPushMatrix() {
            var copy = mat4.create();
            mat4.copy(copy, mvMatrix);
            mvMatrixStack.push(copy);
        }

        /**
         * Copy the top element in the mvMatrix stack
         * into mvMatrix and remove it from the stack.
         */
        function mvPopMatrix() {
            if (mvMatrixStack.length == 0) {
                throw "Invalid popMatrix!";
            }
            mvMatrix = mvMatrixStack.pop();
        }

        /**
         * @v1 = vector of @size
         * @v2 = vector of @size
         * @size = size of vector
         *
         * Multiplies v1 and v2 such that the
         * output vOut = [v1[0] * v2[0], v1[1] * v2[1], ..., v1[n-1] * v2[n-1]]
         * @return = v1 * v2
         */
        function multVecs(v1, v2, size) {
            var newVec = new Array();
            for(var i = 0; i < size; i++) {
                newVec.push(v1[i] * v2[i]);
            }
            return newVec;
        }

        /**
         * Sets the shader uniform variables
         */
        function setMatrixUniforms() {
            gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
            gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
            gl.uniform4fv(shaderProgram.lightPos, LIGHT.position);
            var ambientProduct = multVecs(LIGHT.ambient, MATERIAL.ambient, 4);
            var diffuseProduct = multVecs(LIGHT.diffuse, MATERIAL.diffuse, 4);
            var specularProduct = multVecs(LIGHT.specular, MATERIAL.specular, 4);
            gl.uniform4fv(shaderProgram.ambient, ambientProduct);
            gl.uniform4fv(shaderProgram.diffuse, diffuseProduct);
            gl.uniform4fv(shaderProgram.specular, specularProduct);
            gl.uniform1f(shaderProgram.shininess,  MATERIAL.shininess);
            gl.uniform1i(shaderProgram.offScreen, offScreen);
            gl.uniform4fv(shaderProgram.pickingColor, currentColor);
            gl.uniform1i(shaderProgram.picked, picked);
            gl.uniform3fv(shaderProgram.eyePosition, lookAt.eye);
        }

        /**
         * Create buffers for the file object and
         * buffer the data in the file object.
         */
        function bufferFileObj(file) {
            if (!file.buffered) {
                setObjColorId(file.obj);
                file.obj.vertices.buffer = gl.createBuffer();
                file.obj.normals.buffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, file.obj.vertices.buffer);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(file.obj.vertices), gl.STATIC_DRAW);
                gl.bindBuffer(gl.ARRAY_BUFFER, file.obj.normals.buffer);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(file.obj.normals), gl.STATIC_DRAW);
                file.obj.faces.buffer = gl.createBuffer();
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, file.obj.faces.buffer);
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(file.obj.faces), gl.STATIC_DRAW);
                file.obj.lineFaces.buffer = gl.createBuffer();
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, file.obj.lineFaces.buffer);
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(file.obj.lineFaces), gl.STATIC_DRAW);
                file.buffered = true;
            }
        }

        /**
         * Draws the scene. Gets selected files and then draws them.
         */
        function drawScene() {
            if (mouse.clicked) {
                offScreen = true;
                gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
                draw();
                gl.readPixels(mouse.x, mouse.y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, colorPicked);
                offScreen = false;
                var files = fileService.getSelectedFiles();
                selectedObject = null;
                for(var i = 0; i < files.length; i++) {
                    if (colorsAreEqual(files[i].obj.colorIdUint, colorPicked)) {
                        selectedObject = files[i].obj;
                        break;
                    }
                }
            }
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            draw();
            if (mouse.clicked) {
                mouse.clicked = !mouse.clicked;
                //colorPicked[0] = 0;
                //colorPicked[1] = 0;
                //colorPicked[2] = 0;
                //colorPicked[3] = 255;
            }
            requestAnimationFrame(drawScene);
        }

        var mvMatrixDef = {
            rotation:mat4.create(),
            transform:mat4.create(),
            scale:mat4.create(),
            direction:{ x: [0.0, 1.0, 0.0], y: [1.0, 0.0, 0.0], x: [0.0, 0.0, 1.0]}
        };
        mat4.identity(mvMatrixDef.rotation);
        mat4.identity(mvMatrixDef.transform);
        mat4.identity(mvMatrixDef.scale);
        function draw() {
            var files = fileService.getSelectedFiles();
            for(var i = 0; i < files.length; i++) {
                bufferFileObj(files[i]);
            }

            gl.viewport(0, 0, canvasWidth, canvasHeight);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            
            if(mouse.isDown) {
                var deltaX = mouse.down.x - mouse.x;
                var deltaY = mouse.down.y - mouse.y;
                
                theta += deltaX * multiplier;
                theta = theta % (Math.PI * 2);
                phi += deltaY * multiplier;
                phi = phi % (Math.PI);

                mat4.identity(mvMatrix);
                customLookAt(mvMatrix, lookAt.eye, lookAt.at, lookAt.up, false);
                mat4.translate(mvMatrix, mvMatrix, [-lookAt.eye[0], -lookAt.eye[1], -lookAt.eye[2]]);
                mat4.rotate(mvMatrixDef.rotation, mvMatrixDef.rotation, viewService.toRadian(deltaX / 2), laUp);
                mat4.rotate(mvMatrixDef.rotation, mvMatrixDef.rotation, viewService.toRadian(deltaY / 2), laRight);
                mat4.multiply(mvMatrix, mvMatrix, mvMatrixDef.rotation);
                
                mouse.down.x = mouse.x;
                mouse.down.y = mouse.y;
            }
            
            setView();
            
            for(var i = 0; i < files.length; i++) {
                drawFileObj(files[i].obj);
            }
            drawAxes();
        }

        var laUp = [0, 1, 0];
        var laRight;
        function customLookAt(out, eye, at, upCustom, translate) {
            var f;
            var up = upCustom;
            var s = vec3.create();
            var u = vec3.create();

            f = [
                at[0] - eye[0],
                at[1] - eye[1],
                at[2] - eye[2]
            ];

            normalize(f);
            normalize(up);
            vec3.cross(s, f, up);
            normalize(s);
            vec3.cross(u, s, f);
            normalize(u);
            mat4.identity(out);
            laUp = vec3.clone(u);
            laRight = vec3.clone(s);
            var m = [
                 s[0],    u[0],   -f[0],    0,
                 s[1],    u[1],   -f[1],    0,
                 s[2],    u[2],   -f[2],    0,
                    0,       0,       0,    1
            ];
            //mat4.transpose(m, m);
            mat4.multiply(out, m, out);
            if(translate) {
                mat4.translate(out, out, [-eye[0], -eye[1], -eye[2]]);
            }
            //var newOut = mat4.create();
            //mat4.copy(newOut, out);
            //console.log(out);
            //mat4.identity(out);
            //mat4.lookAt(mvMatrix, eye, at, upCustom);
            //console.log([newOut, mvMatrix]);
        }

        function normalize(vec) {
            var size = Math.sqrt(sum(vec));
            for(var i = 0; i < vec.length; i++) {
                vec[i] = vec[i] / size;
            }
        }

        function sum(vec) {
            var sum = 0;
            for(var i = 0; i < vec.length; i++) {
                sum += square(vec[i]);
            }
            return sum;
        }

        var xzMult = 1;

        function sub(vec1, vec2) {
            return [vec1[0] - vec2[0], vec1[1] - vec2[1], vec1[2] - vec2[2]];
        }

        function radi(vec) {
            return Math.sqrt(square(vec[0]) + square(vec[1]) + square(vec[2]));
        }

        function square(num) {
            return num * num;
        }

        function flipped(x, newX) {
            return (x * newX < 0);
        }

        var prevEye = [0, 0, 0];
        var multiplier = 0.01;
        var theta = 0;
        var phi = 0;

        var lookAt;
        var eye = [0, 0, 0];
        var orbit = [0, 0, 0];
        var eyeRotation = quat.create();
        var orbitRotation = quat.create();
        var eyeMatrix = mat4.create();
        var orbitMatrix = mat4.create();
        function changeOrbitYaw(amount){
            try {
            var rotYaw = quat.create();
            
            quat.setAxisAngle(rotYaw, lookAt.up, amount);
            quat.multiply(orbitRotation, rotYaw, orbitRotation);
            quat.normalize(orbitRotation, orbitRotation);
            
            this.orbitYaw += amount;
            }catch(e) {
                alert('yaw!');
            }
        };
        
        function changeOrbitPitch(amount){
            try {
            quat.rotateX(orbitRotation, orbitRotation, amount);
            quat.normalize(orbitRotation, orbitRotation);
            }catch(e) {
                alert('pitch!');
            }
        };

        function getRightVec(lookAt) {
            var forward = vec3.create();
            forward[0] = lookAt.at.x - lookAt.eye.x;
            forward[1] = lookAt.at.y - lookAt.eye.y;
            forward[2] = lookAt.at.z - lookAt.eye.z;
            vec3.normalize(forward, forward);
            return right;

        }

        function setView() {
            var view = viewService.getSelectedViewForWebGL();
            var canvasRatio = canvasWidth / canvasHeight;
            switch(view.viewType) {
                case 'Perspective':
                    mat4.perspective(
                        pMatrix,
                        view.fovy,
                        view.ratio * canvasRatio,
                        view.near,
                        view.far
                    );
                    break;
                case 'Orthographic':
                    // If the ratio 
                    var orthoHeight = Math.abs(view.top - view.bottom);
                    var orthoWidth = Math.abs(view.left - view.right);
                    var orthoRatio = orthoWidth / orthoHeight;
                    var deviation = Math.abs(canvasRatio - orthoRatio) / 2;
                    var heightDev;
                    var widthDev;
                    if (orthoRatio > canvasRatio) {
                        heightDev = orthoWidth * deviation;
                        widthDev = 0.0;
                    }
                    else {
                        heightDev = 0.0;
                        widthDev = orthoHeight * deviation;
                    }
                    mat4.ortho(
                        pMatrix,
                        view.left - widthDev,
                        view.right + widthDev,
                        view.bottom - heightDev,
                        view.top + heightDev,
                        view.near,
                        view.far
                    );
                    break;
                default:
                    alert('Unknown view type: ' + view.viewType + '\nView not set.');
                    break;
            }
        }

        /**
         * Draws a file object.
         */
        function drawFileObj(fileObj) {
            mvPushMatrix();

            currentColor = fileObj.colorId;

            var mode = gl.TRIANGLES;
            var elementBuffer = fileObj.faces.buffer;
            var sizeOfFaces = fileObj.faces.length;
            /*
            if(colorsAreEqual(fileObj.colorIdUint, colorPicked) && !offScreen) {

                drawAxes();
                mode = gl.LINES;
                elementBuffer = fileObj.lineFaces.buffer;
                sizeOfFaces = fileObj.lineFaces.length;
                picked = true;
            }*/

            if(fileObj == selectedObject && !offScreen) {
                
                mode = gl.LINES;
                elementBuffer = fileObj.lineFaces.buffer;
                sizeOfFaces = fileObj.lineFaces.length;
                picked = true;
            }
            gl.bindBuffer(gl.ARRAY_BUFFER, fileObj.vertices.buffer);
            gl.vertexAttribPointer(shaderProgram.vPositionAttr, 3, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, fileObj.normals.buffer);
            gl.vertexAttribPointer(shaderProgram.vNormalsAttr, 3, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elementBuffer);
            setMatrixUniforms();
            gl.drawElements(mode, sizeOfFaces, gl.UNSIGNED_SHORT, 0);

            picked = false;

            mvPopMatrix();
        }

        function drawAxes() {
            var curAxis;
            var tempColor = currentColor;
            picked = true;
            for(var i = 0; i < 3; i++) {
                switch(i) {
                case 0:
                    curAxis = AXES.X;
                    break;
                case 1:
                    curAxis = AXES.Y;
                    break;
                case 2:
                    curAxis = AXES.Z;
                    break;
                default:
                    // bad
                    break;
                }
                currentColor = new Float32Array(curAxis.color);
                gl.bindBuffer(gl.ARRAY_BUFFER, curAxis.vertices.buffer);
                gl.vertexAttribPointer(shaderProgram.vPositionAttr, 3, gl.FLOAT, false, 0, 0);
    
                gl.bindBuffer(gl.ARRAY_BUFFER, curAxis.normals.buffer);
                gl.vertexAttribPointer(shaderProgram.vNormalsAttr, 3, gl.FLOAT, false, 0, 0);
    
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, curAxis.faces.buffer);
                setMatrixUniforms();
                gl.drawElements(curAxis.mode, curAxis.faces.length, gl.UNSIGNED_SHORT, 0);
            }
            currentColor = tempColor;
            picked = false;
        }

        /**
         * Start WebGL. Called on document.ready(). Draws the blank
         * scene. This is because element containing the canvas will
         * not be properly sized until the scene is drawn.
         */
        function webGLStart() {
            canvas = document.getElementById("hw1-canvas");
            initGL(canvas);
            initShaders()
            colorPicked = new Uint8Array(4);
            colorSequence = 1;
            initPickingBuffer();
            gl.clearColor(0.7, 0.7, 0.7, 1.0);
            gl.enable(gl.DEPTH_TEST);
            AXES.X = createAxis('x');
            AXES.Y = createAxis('y');
            AXES.Z = createAxis('z');
            mat4.identity(mvMatrix);
            lookAt = viewService.getLookAtForWebGL();
            eye = lookAt.eye;
            mat4.lookAt(mvMatrix, lookAt.eye, lookAt.at, lookAt.up);
            drawScene();
        }

        function createAxis(axisType) {
            var x = 0.0;
            var y = 0.0;
            var z = 0.0;
            var axisColor;
            if (axisType == 'x') {
                axisColor = [1.0, 0.0, 0.0, 1.0];
                x = 1.0;
            }
            else if (axisType == 'y') {
                axisColor = [0.0, 1.0, 0.0, 1.0];
                y = 1.0;
            }
            else {
                axisColor = [0.0, 0.0, 1.0, 1.0];
                z = 1.0;
            }

            var axis = {
                faces: [ 0, 1 ],
                vertices: [
                    0.0, 0.0, 0.0,
                      x,   y,   z
                ],
                normals: [
                    0.0, 0.0, 0.0,
                      x,   y,   z
                ],
                color:axisColor,
                mode:gl.LINES
            };
            setObjColorId(axis);
            axis.faces.buffer = gl.createBuffer();
            axis.vertices.buffer = gl.createBuffer();
            axis.normals.buffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, axis.vertices.buffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(axis.vertices), gl.STATIC_DRAW);
            gl.bindBuffer(gl.ARRAY_BUFFER, axis.normals.buffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(axis.normals), gl.STATIC_DRAW);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, axis.faces.buffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(axis.faces), gl.STATIC_DRAW);
            return axis;
        }
    }
]);
