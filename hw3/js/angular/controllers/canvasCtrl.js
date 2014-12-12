var canvasCtrl = angular.module('CanvasController', []);

canvasCtrl.controller('CanvasCtrl', ['$scope', '$http', 'fileService', 'viewService',
    function ($scope, $http, fileService, viewService) {
        // When a file is selected or deselected, redraw the scene.
        $scope.$on('selectedFilesChange', function(ev, args) {
            window.scene.selectedModelsChange(args[0]); // files
        });
        $scope.$on('updateFiles', function(ev, args) {
            window.scene.addModel(args[0]); // the newFile
        });
        //$scope.$on('updateView', drawSceneDummy);
        var mouse = {
                x: 0,
                y: 0,
                clicked: false,
                isDown: false,
                isDragging: false,
                down: { x:0, y:0 }
            };

        $(document).ready(function(){/*
            $('#fullscreen').click(function(event) {
                requestFullscreen(canvas);
            });
            document.addEventListener('fullscreenchange', fullscreenChange);
            document.addEventListener('mozfullscreenchange', fullscreenChange);
            document.addEventListener('webkitfullscreenchange', fullscreenChange);  */
            var view = viewService.getLookAtForWebGL();
            window.initScene(viewService, fileService, view.eye, view.at, [0,0,5], view.at);
        });
        /*
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


        var AXES = {
        };


        function createWorldAxis(axisType) {
            var width = 0.01;
            var x = width;
            var y = width;
            var z = width;
            var axisColor;
            var faceOffset = 0;
            var length = 100;
            if (axisType == 'x') {
                axisColor = [1.0, 0.0, 0.0, 1.0];
                x = 1.0;
            }
            else if (axisType == 'y') {
                faceOffset = 8;
                axisColor = [0.0, 1.0, 0.0, 1.0];
                y = 1.0;
            }
            else {
                faceOffset = 16;
                axisColor = [0.0, 0.0, 1.0, 1.0];
                z = 1.0;
            }

            faces = [
                    faceOffset,     faceOffset + 1, faceOffset + 4,
                    faceOffset + 1, faceOffset + 5, faceOffset + 4,
                    faceOffset,     faceOffset + 2, faceOffset + 4,
                    faceOffset + 2, faceOffset + 6, faceOffset + 4,

                    faceOffset + 3, faceOffset + 1, faceOffset + 7,
                    faceOffset + 1, faceOffset + 5, faceOffset + 7,
                    faceOffset + 3, faceOffset + 2, faceOffset + 7,
                    faceOffset + 2, faceOffset + 6, faceOffset + 7,

                    faceOffset,     faceOffset + 1, faceOffset + 2,
                    faceOffset + 3, faceOffset + 1, faceOffset + 2,
                    faceOffset + 4, faceOffset + 5, faceOffset + 6,
                    faceOffset + 7, faceOffset + 5, faceOffset + 6
            ];

            var axis = {
                faces: faces,
                vertices: [
                       length,  width,  width,
                       length, -width,  width,
                       length,  width, -width,
                       length, -width, -width,
                    -width*2,  width,  width,
                    -width*2, -width,  width,
                    -width*2,  width, -width,
                    -width*2, -width, -width,
                     width,    length,  width,
                    -width,    length,  width,
                     width,    length, -width,
                    -width,    length, -width,
                     width, -width*2,  width,
                    -width, -width*2,  width,
                     width, -width*2, -width,
                    -width, -width*2, -width,
                     width,  width,    length,
                    -width,  width,    length,
                     width, -width,    length,
                    -width, -width,    length,
                     width,  width, -width*2,
                    -width,  width, -width*2,
                     width, -width, -width*2,
                    -width, -width, -width*2
                ],
                normals: [
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0
                ],
                color:axisColor,
                mode:gl.TRIANGLES
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

        function createAxis(axisType) {
            var width = 0.008;
            var x = width;
            var y = width;
            var z = width;
            var axisColor;
            var faceOffset = 0;
            if (axisType == 'x') {
                axisColor = [1.0, 0.0, 0.0, 1.0];
                x = 1.0;
            }
            else if (axisType == 'y') {
                faceOffset = 8;
                axisColor = [0.0, 1.0, 0.0, 1.0];
                y = 1.0;
            }
            else {
                faceOffset = 16;
                axisColor = [0.0, 0.0, 1.0, 1.0];
                z = 1.0;
            }

            faces = [
                    faceOffset,     faceOffset + 1, faceOffset + 4,
                    faceOffset + 1, faceOffset + 5, faceOffset + 4,
                    faceOffset,     faceOffset + 2, faceOffset + 4,
                    faceOffset + 2, faceOffset + 6, faceOffset + 4,

                    faceOffset + 3, faceOffset + 1, faceOffset + 7,
                    faceOffset + 1, faceOffset + 5, faceOffset + 7,
                    faceOffset + 3, faceOffset + 2, faceOffset + 7,
                    faceOffset + 2, faceOffset + 6, faceOffset + 7,

                    faceOffset,     faceOffset + 1, faceOffset + 2,
                    faceOffset + 3, faceOffset + 1, faceOffset + 2,
                    faceOffset + 4, faceOffset + 5, faceOffset + 6,
                    faceOffset + 7, faceOffset + 5, faceOffset + 6
            ];

            var axis = {
                faces: faces,
                vertices: [
                       1.0,  width,  width,
                       1.0, -width,  width,
                       1.0,  width, -width,
                       1.0, -width, -width,
                    -width*2,  width,  width,
                    -width*2, -width,  width,
                    -width*2,  width, -width,
                    -width*2, -width, -width,
                     width,    1.0,  width,
                    -width,    1.0,  width,
                     width,    1.0, -width,
                    -width,    1.0, -width,
                     width, -width*2,  width,
                    -width, -width*2,  width,
                     width, -width*2, -width,
                    -width, -width*2, -width,
                     width,  width,    1.0,
                    -width,  width,    1.0,
                     width, -width,    1.0,
                    -width, -width,    1.0,
                     width,  width, -width*2,
                    -width,  width, -width*2,
                     width, -width, -width*2,
                    -width, -width, -width*2,
                ],
                normals: [
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0
                ],
                color:axisColor,
                mode:gl.TRIANGLES
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
        }*/
    }
]);
