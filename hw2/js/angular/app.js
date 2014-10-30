var app = angular.module('myapp', [
    'FileController',
    'CanvasController',
    'FileService',
    'ViewController',
    'ViewService']);

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

app.directive('lookAt', function() {
    return {
        restrict: 'AE',
        replace: 'true',
        templateUrl: './js/angular/partials/lookAt.html'
    };
});

app.directive('lookAtParam', function() {
    return {
        restrict: 'AE',
        replace: 'true',
        templateUrl: './js/angular/partials/lookAtParam.html'
    };
});

app.directive('viewSelect', function() {
    return {
        restrict: 'AE',
        replace: 'true',
        templateUrl: './js/angular/partials/viewSelect.html'
    };
});

app.directive('viewParam', function() {
    return {
        restrict: 'AE',
        replace: 'true',
        templateUrl: './js/angular/partials/viewParam.html'
    };
});

app.directive('viewNav', function() {
    return {
        restrict: 'AE',
        replace: 'true',
        templateUrl: './js/angular/partials/viewNav.html'
    };
});
