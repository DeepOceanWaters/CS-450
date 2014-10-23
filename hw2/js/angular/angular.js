var app = angular.module('myapp', [
    'ngRoute',
    'homeworkControllers', 
    'FileController',
    'CanvasController',
    'FileService']);

app.config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/hw1', {
        templateUrl: 'partials/hw1.html',
        controller: 'HomeworkOneCtrl'
    }).
    otherwise({
       redirectTo: '/hw1' 
    });
}]);

app.directive('helloWorld', function() {
  return {
      restrict: 'AE',
      replace: 'true',
      templateUrl: './js/angular/helloWorld.html'
  };
});

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