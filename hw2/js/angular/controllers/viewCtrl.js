var viewCtrl = angular.module('ViewController', []);

viewCtrl.controller('ViewCtrl', ['$scope', '$http', 'viewService',
    function ($scope, $http, viewService) {
        $scope.lookAt = viewService.getLookAt();
        $scope.views = viewService.getViews();
        $scope.selectedView = viewService.getSelectedView();

        /**
         * Redraw scene when view type is changed.
         */
        $scope.handleViewClick = function(event, view) {
            event.stopPropagation();
            event.preventDefault();
            viewService.select(view);
            $scope.selectedView = viewService.getSelectedView();
            viewService.updateWebGL();
        }

        /**
         * Whenever a parameter changes, redraw the scene.
         */
        $scope.redraw = function(event) {
            viewService.updateWebGL();
        }
    }
]);
