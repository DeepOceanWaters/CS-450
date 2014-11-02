var canvasCtrl = angular.module('CanvasController', []);

canvasCtrl.controller('CanvasCtrl', ['$scope', '$http', 'fileService', 'viewService',
    function ($scope, $http, fileService, viewService) {
        // When a file is selected or deselected, redraw the scene.
        $scope.$on('selectedFilesChange', drawSceneDummy);
        $scope.$on('updateView', drawSceneDummy);
        var mouse = {
                x:0,
                y:0
            };

        $(document).ready(function(){
            webGLStart();
            
            $(window).resize(function() {
                resize();
                drawScene();
            });
            $('#hw1-canvas').mousemove(function(event) {
                var parentOffset = $(this).parent().offset();
                mouse.x = Math.round(event.pageX - parentOffset.left);
                mouse.y = $(this).attr('height') - Math.round(event.pageY - parentOffset.top);
            });
        });

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
            SN_PICKED:"Picked"
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

        var gl;
        var shaderProgram;
        var mvMatrixStack = [];
        var mvMatrix = mat4.create();
        var pMatrix = mat4.create();

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
            var canvas = $('#hw1-canvas');
            var parentWidth = canvas.parent().width();
            canvasWidth = parentWidth;
            canvasHeight = parentWidth;
            canvas.width(parentWidth);
            canvas.attr('width', parentWidth);
            canvas.height(parentWidth);
            canvas.attr('height', parentWidth);
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
        }

        /**
         * Create buffers for the file object and
         * buffer the data in the file object.
         */
        function bufferFileObj(file) {
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
        }

        function getMousePosition() {
            glGetIntegerv(GL_VIEWPORT, viewport);
        }

        /**
         * Draws the scene. Gets selected files and then draws them.
         */
        function drawScene() {
            offScreen = true;
            gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
            draw();
            gl.readPixels(mouse.x, mouse.y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, colorPicked);
            offScreen = false;
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            draw();
            requestAnimationFrame(drawScene);
        }

        function draw() {
            var files = fileService.getSelectedFiles();
            for(var i = 0; i < files.length; i++) {
                bufferFileObj(files[i]);
            }

            gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


            
            setView();
            mat4.identity(mvMatrix);
            var lookAt = viewService.getLookAtForWebGL();
            mat4.lookAt(mvMatrix, lookAt.eye, lookAt.at, lookAt.up);

            for(var i = 0; i < files.length; i++) {
                drawFileObj(files[i].obj);
            }
        }

        function setView() {
            var view = viewService.getSelectedViewForWebGL();
            switch(view.viewType) {
                case 'Perspective':
                    mat4.perspective(
                        pMatrix,
                        view.fovy,
                        view.ratio,
                        view.near,
                        view.far
                    );
                    break;
                case 'Orthographic':
                    mat4.ortho(
                        pMatrix,
                        view.left,
                        view.right,
                        view.bottom,
                        view.top,
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
            if(colorsAreEqual(fileObj.colorIdUint, colorPicked) && !offScreen) {
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

        /**
         * Start WebGL. Called on document.ready(). Draws the blank
         * scene. This is because element containing the canvas will
         * not be properly sized until the scene is drawn.
         */
        function webGLStart() {
            var canvas = document.getElementById("hw1-canvas");
            initGL(canvas);
            initShaders()
            colorPicked = new Uint8Array(4);
            colorSequence = 1;
            initPickingBuffer();
            gl.clearColor(0.7, 0.7, 0.7, 1.0);
            gl.enable(gl.DEPTH_TEST);
            resize();
            drawScene();
        }
    }
]);
