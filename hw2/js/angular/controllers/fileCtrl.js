var fileCtrl = angular.module('FileController', []);

fileCtrl.controller('FileCtrl', ['$scope', '$http', 'fileService',
    function ($scope, $http, fileService) {
        if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
            alert('The File APIs are not fully supported by your browser.');
        }

        $scope.handleClick = function(event, file) {
            fileService.toggleSelect(file);
        }

        $scope.handleDrag = function(event) {
            event.stopPropagation();
            event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';
        }

        $scope.handleDrop = function(event) {
            event.stopPropagation();
            event.preventDefault();
            var files = event.dataTransfer.files; // FileList object.

            // files is a FileList of File objects. List some properties.
            for (var i = 0, f; f = files[i]; i++) {
                fileService.addNewFile(f);
            }
        }

        var updateFiles = function(event, data) {
            $scope.files = fileService.getFiles();
            $scope.$apply();
        }

        $scope.$on('updateFiles', updateFiles);

        /*
        var processFaceLine = function(lineElement) {
            var splitLine = lineElement.split('/');
            return [
                parseInt(splitLine[0]),  // vertex
                parseInt(splitLine[1]),  // texture coord
                parseInt(splitLine[2])   // normal
            ];
        }

        var processLine = function(file, line) {
            var lineElements = line.trim().split(' ');
            switch(lineElements[0]) {
            case  '#': // comment, don't care
                break;
            case  'v': // vertex
                file.v.push([
                    parseFloat(lineElements[1]),
                    parseFloat(lineElements[2]),
                    parseFloat(lineElements[3])
                ]);
                break;
            case 'vt': // texture coord
                file.vt.push([
                    parseFloat(lineElements[1]),
                    parseFloat(lineElements[2])
                ]);
                break;
            case 'vn': // normal
                file.vn.push([
                    parseFloat(lineElements[1]),
                    parseFloat(lineElements[2]),
                    parseFloat(lineElements[3])
                ]);
                break;
            case  'f': // face
                var faces = new Array();
                faces.push($scope.processFaceLine(lineElements[1]));
                faces.push($scope.processFaceLine(lineElements[2]));
                faces.push($scope.processFaceLine(lineElements[3]));
                file.f.push(faces);
                break;
            default: // whatevs?
                break;
            }
        }

        var processData = function(fileData) {
            var file = {};
            file.v = new Array();
            file.vt = new Array();
            file.vn = new Array();
            file.f = new Array();
            var fileLines = fileData.split(/\r\n|\n/);
            for(var i = 0; i < fileLines.length; i++) {
                $scope.processLine(file, fileLines[i]);
            }
            return file;
        }

        var onloadHandler = function(event, fileDesc) {
            var fileData = event.target.result;
            var file = $scope.processData(fileData);
            file.name = fileDesc.name;
            $scope.files.push(file);
            $scope.$apply();
        }

        var fileToObj = function(file) {
            var reader = new FileReader();
            // Read file into memory as UTF-8
            reader.readAsText(file);
            // Handle errors load
            reader.onload = (function(file){
                return function(event) {
                    onloadHandler(event, file);
                }
            })(file);
        }*/
    }
]);
