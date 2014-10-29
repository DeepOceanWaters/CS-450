var app = angular.module('myapp', [
    'FileController',
    'CanvasController',
    'FileService']);

app.directive('fileDrop', function() {
  return {
      restrict: 'AE',
      replace: 'true',
      templateUrl: './js/angular/partials/fileDrop.html'
  };
});

app.directive('fileList', function() {
  return {
      restrict: 'AE',
      replace: 'true',
      templateUrl: './js/angular/partials/fileList.html'
  };
});

app.directive('dropZone', function() {
    return {
        restrict: 'A',
        link: function(scope, elem) {
            var el = elem[0];
            el.addEventListener('dragover', scope.handleDrag, false);
            el.addEventListener('drop', scope.handleDrop, false);
        }
    };
});
