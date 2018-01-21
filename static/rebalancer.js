var app = angular.module('myApp', []);

    app.config(['$interpolateProvider', function($interpolateProvider) {
        $interpolateProvider.startSymbol('{a');
        $interpolateProvider.endSymbol('a}');
    }]);

    app.controller('myCtrl', function ($scope) {
        $scope.target = "Target Allocation (%)";
        // cash to allocate
        $scope.cash = 0;
        //type of rebalance
        $scope.rebalanceType = "Buy Only";
        //create array to store funds
        $scope.funds = [];
        //function to create a new fund
        $scope.addFund = function(ticker = '', alloc = '') {
            $scope.funds.push({
                ticker: ticker,
                price: "",
                shares: "",
                alloc: alloc,
                targetVal: 0,
                toTarget: 0,
                toPurchase: 0,
                toShares: 0,
                newAlloc: ""
            })
        }
        //total holdings before rebalance
        $scope.holdings = function() {
            var total = 0;
            var funds = $scope.funds;
            for (var i=0; i<funds.length; i++) {
                total += funds[i].price * funds[i].shares;
            }
            return total;
        }
        //add default funds
        $scope.addFund('ZAG', 50);
        $scope.addFund('VCN', 25);
        $scope.addFund('XAW', 25);

        //auto calc allocations on user inputs (works for 3 funds only)
        $scope.change = function(index) {
            var total = 0;
            var funds = $scope.funds;
            if (index == 0) {
                funds[1].alloc = 100 - funds[0].alloc;
                funds[2].alloc = 0;
            }
            if (index == 1) {
                funds[2].alloc = 100 - funds[0].alloc - funds[1].alloc;
                if (funds[2].alloc < 0) {
                    funds[2].alloc = 0;
                }
            }
            for (var i=0; i<funds.length; i++) {
                total += funds[i].alloc;
            }
            if (total != 100) {
                $scope.invalidForm = "is-invalid";
                $scope.target = "Target Allocation (%)\n(Must total 100)";
            } else {
                $scope.invalidForm = "";
                $scope.target = "Target Allocation (%)";
            }
        }
        
        //calculate current allocation
        $scope.currAlloc = function(fund) {
            var alloc = 0;
            if ($scope.holdings() == 0) {
                return alloc.toFixed(1) + " %";
            }
            alloc = fund.price * fund.shares / $scope.holdings() * 100;
            return alloc.toFixed(1) + " %";
        }

        //rebalance logic
        $scope.rebalance = function() {
            var funds = $scope.funds;
            var totalToTarget = 0;
            if ($scope.rebalanceType == "Buy Only") {
                //sort funds largest to smallest
                funds.sort(function(a, b) {
                    return b.price - a.price;
                })
                //set target values
                for (var i=0; i<funds.length; i++) {
                    funds[i].targetVal = ($scope.holdings() + $scope.cash) * funds[i].alloc / 100;
                }
                //set $ toTarget (0 if negative)
                for (var i=0; i<funds.length; i++) {
                    if (funds[i].targetVal - (funds[i].price * funds[i].shares) <= 0) {
                        funds[i].toTarget = 0;
                    } else {
                        funds[i].toTarget = funds[i].targetVal - (funds[i].price * funds[i].shares);
                    }
                    totalToTarget += funds[i].toTarget;
                }
                //set $ toPurchase (0 if toTarget = 0)
                for (var i=0; i<funds.length; i++) {
                    if (funds[i].toTarget == 0) {
                        funds[i].toPurchase = 0;
                    } else {
                        funds[i].toPurchase = funds[i].toTarget / totalToTarget * $scope.cash;
                    }
                }
                //set shares to purchase
                for (var i = 0; i < funds.length; i++) {
                    funds[i].toShares = Math.floor(funds[i].toPurchase / funds[i].price);
                    if (i < funds.length-1) {
                        var leftover = funds[i].toPurchase % funds[i].price;
                        funds[i+1].toPurchase += leftover;
                    }
                }
                //set new allocation values
                var totalBal = 0;
                fundBal = function(fund) {
                    return (fund.shares + fund.toShares) * fund.price
                }
                for (var i = 0; i < funds.length; i++) {
                    totalBal += fundBal(funds[i]);
                }
                for (var i = 0; i < funds.length; i++) {
                    newAlloc = fundBal(funds[i]) / totalBal * 100;
                    funds[i].newAlloc = newAlloc.toFixed(1) + " %";
                }
                console.log("Buy only is working")
            }
        }
    });
