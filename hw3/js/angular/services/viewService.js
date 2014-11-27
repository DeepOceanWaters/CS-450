var viewService = angular.module('ViewService', []);

/**
 * Contains view values. E.g. contains values for
 * user defined orthographic/perspective view, and
 * the eye, at, and up points.
 */
viewService.service('viewService', ['$rootScope',
    function($rootScope) {
        var views = [
            { name:"Orthographic",
              isSelected: false,
              params:[
                  { name:"left",   value:-1.0 },
                  { name:"right",  value:1.0 },
                  { name:"bottom", value:-1.0 },
                  { name:"top",    value:1.0 },
                  { name:"near",   value:0.1 },
                  { name:"far",    value:15.0 }
              ]},
           {  name:"Perspective",
              isSelected: true,
              params:[
                  { name:"fovy",  value:90.0 },
                  { name:"ratio", value:1.0 },
                  { name:"near",  value:0.1 },
                  { name:"far",   value:100.0 }
              ]}
        ];

        var lookAt = {
            params:[]
        };

        lookAt.params.push({
            name:"Eye",
            axes:[
                { name:"x", value:1.5 },
                { name:"y", value:1.5 },
                { name:"z", value:1.5 }
            ]
        });

        lookAt.params.push({
            name:"At",
            axes:[
                { name:"x", value:0.0 },
                { name:"y", value:0.0 },
                { name:"z", value:0.0 }
            ]
        });

        lookAt.params.push({
            name:"Up",
            axes:[
                { name:"x", value:0.0 },
                { name:"y", value:1.0 },
                { name:"z", value:0.0 }
            ]
        });

        var selectedView = views[1];

        /**
         * Sets the selectedView.
         */
        var select = function(view) {
            if (!view.isSelected) {
                selectedView.isSelected = false;
                view.isSelected = !view.isSelected;
                selectedView = view;
            }
        }

        /**
         * Gets the currently selected view.
         */
        var getSelectedView = function() {
            return selectedView;
        }

        /**
         * Gets the selected view, but creates a new object
         * that is easier to read when used for WebGL.
         */
        var getSelectedViewForWebGL = function() {
            var viewForWebGL;
            switch(selectedView.name) {
                case 'Perspective':
                    viewForWebGL = toPerspectiveObj(selectedView);
                    break;
                case 'Orthographic':
                    viewForWebGL = toOrthoObj(selectedView);
                    break;
                default:
                    viewForWebGL = {};
                    break;
            }
            return viewForWebGL;
        }

        /**
         * Creates an orthographic view object from the given view.
         */
        var toOrthoObj = function(view) {
            return {
                viewType:view.name,
                left:parseFloat(view.params[0].value),
                right:parseFloat(view.params[1].value),
                bottom:parseFloat(view.params[2].value),
                top:parseFloat(view.params[3].value),
                near:parseFloat(view.params[4].value),
                far:parseFloat(view.params[5].value)
            }
        }

        /**
         * Creates a perspective view object from the given view.
         */
        var toPerspectiveObj = function(view) {
            return {
                viewType:view.name,
                fovy:toRadian(view.params[0].value),
                ratio:parseFloat(view.params[1].value),
                near:parseFloat(view.params[2].value),
                far:parseFloat(view.params[3].value)
            }
        }

        /**
         * Converts degress to radians.
         */
        var toRadian = function(degrees) {
            var degreesFloat = parseFloat(degrees);
            return degreesFloat * (Math.PI / 180);
        }

        var getViews = function() {
            return views;
        }

        var getLookAt = function() {
            return lookAt;
        }

        /**
         * Creates a new lookAt object based on the current lookAt object,
         * but organized in an easier to read manner.
         */
        var getLookAtForWebGL = function() {
            return {
                eye:[
                    parseFloat(lookAt.params[0].axes[0].value),
                    parseFloat(lookAt.params[0].axes[1].value),
                    parseFloat(lookAt.params[0].axes[2].value)
                ],
                at:[
                    parseFloat(lookAt.params[1].axes[0].value),
                    parseFloat(lookAt.params[1].axes[1].value),
                    parseFloat(lookAt.params[1].axes[2].value)
                ],
                up:[
                    parseFloat(lookAt.params[2].axes[0].value),
                    parseFloat(lookAt.params[2].axes[1].value),
                    parseFloat(lookAt.params[2].axes[2].value)
                ]
            };
        }

        var updateWebGL = function() {
            $rootScope.$broadcast('updateView', []);
        }

        return {
            select: select,
            getSelectedView: getSelectedView,
            getSelectedViewForWebGL: getSelectedViewForWebGL,
            getViews: getViews,
            getLookAt: getLookAt,
            getLookAtForWebGL: getLookAtForWebGL,
            updateWebGL: updateWebGL,
            toRadian: toRadian
        }
    }
]);
