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
    }
]);
