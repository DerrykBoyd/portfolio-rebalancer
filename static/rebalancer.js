var app = angular.module('myApp', []);

    app.config(['$interpolateProvider', function($interpolateProvider) {
        $interpolateProvider.startSymbol('{a');
        $interpolateProvider.endSymbol('a}');
    }]);

    app.controller('myCtrl', function ($scope) {
        // attaching 0 to the DOM
        $scope.alloc1 = 50;
        $scope.alloc2 = 25;
        $scope.alloc3 = 25;
        $scope.change1 = function() {
            $scope.alloc2 = 100 - $scope.alloc1 - $scope.alloc3;
            if ($scope.alloc2 < 0) {
                $scope.alloc2 = 0;
                $scope.alloc3 = 100 - $scope.alloc1;
                }
        }
        $scope.change2 = function() {
            $scope.alloc3 = 100 - $scope.alloc1 - $scope.alloc2;
            if ($scope.alloc3 < 0) {
                $scope.alloc3 = 0;
                $scope.alloc1 = 100 - $scope.alloc2;
                }
        }
    });
