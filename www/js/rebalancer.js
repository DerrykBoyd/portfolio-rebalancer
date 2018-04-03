var app = angular.module('myApp', []);

    app.controller('myCtrl', function ($scope, $http) {
        //function to get the fund price if available through AlphaVantage
        function getPrice(fund) {
            $http({
                method: 'GET',
                url: 'https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol='+fund.ticker+'&interval=1min&apikey=04MXYGOU0W2Y8PUH'
            }).then(function successCallback(response) {
                //success code here
                if (Object.keys(response.data)[0] != 'Meta Data') {
                    fund.price = "Not Available";
                } else {
                    var tempKey = Object.keys(response.data['Time Series (1min)'])[0];
                    //console.log(response.data);
                    fund.price = Number(response.data['Time Series (1min)'][tempKey]['1. open']);
                    console.log(fund.price);
                }
                showStockWarning();
            }, function errorCallback(response) {
                //error code here
                console.log('API call error occurred');
            });
        }

        function showStockWarning() {
            var count = 0;
            for(fund in $scope.funds) {
                if ($scope.funds[fund].price == "Not Available") count++;
            }
            if (count == 0) document.getElementById("stock-warning").style.display="none";
            else document.getElementById("stock-warning").style.display="block";
        }

        $scope.refreshPrice = function(fund) {
            if (fund) {
                fund.price = "fetching...";
                getPrice(fund);
            }
        }

        $scope.refreshPrices = function() {
            for (fund in $scope.funds) {
                $scope.funds[fund].price = "fetching...";
                getPrice($scope.funds[fund]);
            }
        }

        $scope.target = "Target Allocation (%)";
        // cash to allocate
        $scope.cash = '';
        // cash left after rebalance
        $scope.cashRem = '';
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
                targetShares: 0,
                toTarget: 0,
                toPurchase: 0,
                toShares: 0,
                newAlloc: ""
            })
        }
        //function to remove a fund
        $scope.removeFund = function(index) {
            $scope.funds.splice(index, 1);
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
        $scope.addFund('ZAG', 40);
        $scope.addFund('VCN', 20);
        $scope.addFund('XAW', 40);

        $scope.refreshPrices();

        //auto calc allocations on user inputs (works for 3 funds only)
        $scope.change = function(index) {
            var total = 0;
            var funds = $scope.funds;
            if (funds.length == 3) {
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
            if ($scope.holdings() == 0) return alloc.toFixed(1) + " %";
            else {
                alloc = fund.price * fund.shares / $scope.holdings() * 100;
                if (isNaN(alloc)) return "0.0 %";
                else return alloc.toFixed(1) + " %";
            }
        }

        //rebalance logic
        $scope.rebalance = function() {
            var funds = $scope.funds;
            var totalToTarget = 0;
            fundBal = function(fund) {
                return (fund.shares + fund.toShares) * fund.price
            }
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
                    var leftover = 0;
                    if (funds[i].price==0) {
                        break;
                    }
                    funds[i].toShares = Math.floor(funds[i].toPurchase / funds[i].price);
                    if (i < funds.length-1) {
                        leftover = funds[i].toPurchase % funds[i].price;
                        funds[i+1].toPurchase += leftover;
                    }
                    if (i == funds.length-1) {
                        var cashRem = funds[i].toPurchase % funds[i].price + leftover
                        $scope.cashRem = cashRem.toFixed(2);
                    }
                }
                //set new allocation values
                var totalBal = 0;
                for (var i = 0; i < funds.length; i++) {
                    totalBal += fundBal(funds[i]);
                }
                for (var i = 0; i < funds.length; i++) {
                    if (funds[i].price==0) {
                        break;
                    }
                    newAlloc = fundBal(funds[i]) / totalBal * 100;
                    funds[i].newAlloc = newAlloc.toFixed(1) + " %";
                }
                console.log("Buy only is working")
            }
            if ($scope.rebalanceType == "Buy & Sell") {
                //sort funds largest to smallest
                funds.sort(function(a, b) {
                    return b.price - a.price;
                })
                //set total cash available
                var totalCash = $scope.holdings() + $scope.cash;
                //set targetShares and shares to purchase
                for (var i=0; i<funds.length; i++) {
                    funds[i].targetShares = Math.floor(totalCash * (funds[i].alloc / 100) / funds[i].price);
                    funds[i].toShares = funds[i].targetShares - funds[i].shares;
                    console.log("Target Shares = " + funds[i].targetShares);
                    console.log("Target Shares to purchase = " + funds[i].toShares);
                }
                //purchase shares
                for (var i = 0; i < funds.length; i++) {
                    if (funds[i].price==0) {
                        break;
                    }
                    totalCash -= funds[i].targetShares * funds[i].price;
                    $scope.cashRem = totalCash.toFixed(2);
                }
                //set new allocation values
                var totalBal = 0;
                for (var i = 0; i < funds.length; i++) {
                    totalBal += fundBal(funds[i]);
                }
                for (var i = 0; i < funds.length; i++) {
                    if (funds[i].price==0) {
                        break;
                    }
                    newAlloc = fundBal(funds[i]) / totalBal * 100;
                    funds[i].newAlloc = newAlloc.toFixed(1) + " %";
                }
                console.log("Buy & Sell is working")
            }
        }
    });
