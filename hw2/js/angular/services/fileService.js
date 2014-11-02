var fileService = angular.module('FileService', []);

fileService.service('fileService', ['$rootScope',
    function($rootScope) {
        var files = new Array();
        var selectedFiles = new Array();

        var getFiles = function() {
            return files;
        }

        var addFile = function(newFile) {
            files.push(newFile);
        }

        var getFile = function(index){
            return files[index];
        }

        var toggleSelect = function(file) {
            file.isSelected = !file.isSelected;
            if (file.isSelected) {
                selectFile(file);
            }
            else {
                deselectFile(file);
            }
            $rootScope.$broadcast('selectedFilesChange', []);
        }

        var selectFile = function(file) {
            selectedFiles.push(file);
        }

        var deselectFile = function(file) {
            var index = selectedFiles.indexOf(file);
            if (index > -1) {
                selectedFiles.splice(index, 1);
            }
        }

        var getSelectedFiles = function() {
            return selectedFiles;
        }

        var flatten = function(arr) {
            var merged = [];
            return merged.concat.apply(merged, arr);
        }

        var getFileObj = function(file) {
            var fileObj = {
                numVertices:0,
                vertices:[],
                normals:[],
                faces:[]
            };
            for(var i = 0; i < file.f.length; i++) {
                var face = file.f[i];
                for(var j = 0; j < 3; j++) {
                    fileObj.vertices.push(file.v[face[j][0] - 1]);
                    fileObj.normals.push(file.vn[face[j][2] - 1]);
                }
            }
            var faces = flattenFaces(file.f);
            fileObj.faces = faces[0];
            fileObj.lineFaces = faces[1];
            fileObj.numVertices = file.f.length;
            fileObj.vertices = flatten(file.v);
            fileObj.normals = flatten(file.vn);
            return fileObj;
        }

        var flattenFaces = function(faces) {
            var flatLineFaces = new Array();
            var flatFaces = new Array();
            for(var i = 0; i < faces.length; i++) {
                flatFaces.push(faces[i][0][0] - 1);
                flatFaces.push(faces[i][1][0] - 1);
                flatFaces.push(faces[i][2][0] - 1);
                flatLineFaces.push(faces[i][0][0] - 1);
                flatLineFaces.push(faces[i][1][0] - 1);
                flatLineFaces.push(faces[i][1][0] - 1);
                flatLineFaces.push(faces[i][2][0] - 1);
                flatLineFaces.push(faces[i][2][0] - 1);
                flatLineFaces.push(faces[i][0][0] - 1);
            }
            return [flatFaces, flatLineFaces];
        }


        var addNewFile = function(file) {
            var reader = new FileReader();
            // Read file into memory as UTF-8
            reader.readAsText(file);
            // Handle errors load
            reader.onload = (function(file){
                return function(event) {
                    onloadHandler(event, file);
                }
            })(file);
        }

        var onloadHandler = function(event, fileDesc) {
            var fileData = event.target.result;
            var file = processData(fileData);
            file.obj = getFileObj(file);
            file.name = fileDesc.name;
            file.isSelected = false;
            files.push(file);
            $rootScope.$broadcast('updateFiles', []);
        }

        var processData = function(fileData) {
            var file = {};
            file.v = new Array();
            file.vt = new Array();
            file.vn = new Array();
            file.f = new Array();
            var fileLines = fileData.split(/\r\n|\n/);
            for(var i = 0; i < fileLines.length; i++) {
                processLine(file, fileLines[i]);
            }
            return file;
        }

        var parseProperFloat = function(floatStr) {
            var properFloat = parseFloat(floatStr);
            if(properFloat == -0) {
                properFloat = parseFloat(0.0);
            }
            return properFloat;
        }

        var processLine = function(file, line) {
            var lineElements = line.trim().split(' ');
            switch(lineElements[0]) {
            case  '#': // comment, don't care
                break;
            case  'v': // vertex
                file.v.push([
                    parseProperFloat(lineElements[1]),
                    parseProperFloat(lineElements[2]),
                    parseProperFloat(lineElements[3])
                ]);
                break;
            case 'vt': // texture coord
                file.vt.push([
                    parseProperFloat(lineElements[1]),
                    parseProperFloat(lineElements[2])
                ]);
                break;
            case 'vn': // normal
                file.vn.push([
                    parseProperFloat(lineElements[1]),
                    parseProperFloat(lineElements[2]),
                    parseProperFloat(lineElements[3])
                ]);
                break;
            case  'f': // face
                var faces = new Array();
                faces.push(processFaceLine(lineElements[1]));
                faces.push(processFaceLine(lineElements[2]));
                faces.push(processFaceLine(lineElements[3]));
                file.f.push(faces);
                break;
            default: // whatevs?
                break;
            }
        }

        var processFaceLine = function(lineElement) {
            var splitLine = lineElement.split('/');
            return [
                parseInt(splitLine[0]),  // vertex
                parseInt(splitLine[1]),  // texture coord
                parseInt(splitLine[2])   // normal
            ];
        }

        return {
            getFiles: getFiles,
            addFile: addFile,
            getFile: getFile,
            toggleSelect: toggleSelect,
            getSelectedFiles: getSelectedFiles,
            addNewFile: addNewFile,
            getFileObj: getFileObj
        };
    }
]);
