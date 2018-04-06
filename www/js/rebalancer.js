var app = angular.module('myApp', []);

    app.controller('myCtrl', function ($scope, $http) {
        // function to get the fund price if available through AlphaVantage
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
                console.log('API call error occurred: ' + response);
            });
        }
        //show warning if fund price isn't fetched
        function showStockWarning() {
            let portfolio = $scope.portfolios[$scope.selectedIndex];
            var count = 0;
            for(var alloc in portfolio.allocGroups) {
                for (var fund in portfolio.allocGroups[alloc].funds) {
                    if (portfolio.allocGroups[alloc].funds[fund].price == "Not Available") count++;
                }  
            }
            if (count == 0) document.getElementById("stock-warning").style.display="none";
            else document.getElementById("stock-warning").style.display="block";
        }
        //refresh price for single fund
        $scope.refreshPrice = function(fund) {
            if (fund) {
                fund.price = "fetching...";
                getPrice(fund);
            }
        }
        //refresh prices for all funds
        $scope.refreshPrices = function() {
            let portfolio = $scope.portfolios[$scope.selectedIndex];
            for(var alloc in portfolio.allocGroups) {
                for (var fund in portfolio.allocGroups[alloc].funds) {
                    $scope.refreshPrice(portfolio.allocGroups[alloc].funds[fund]);
                }  
            }
        }

        // object to store portfolios, default portfolio added, default funds added later
        $scope.portfolios = [
            {
                name: "Portfolio 1",
                cash: 0,
                cashRem: "",
                rebalanceType: "Buy Only",
                totalVal: 0,
                allocGroups: [
                    {
                    name: "Canada Stocks",
                    allocation: 20,
                    funds: []
                    },
                    {
                    name: "World Stocks",
                    allocation: 40,
                    funds: []
                    },
                    {
                    name: "Bonds",
                    allocation: 40,
                    funds: []
                    }
                ]
            }       
        ]
        // function to add and allocation group
        $scope.addAllocGroup = function() {
            $scope.portfolios[$scope.selectedIndex].allocGroups.push(
                {
                    name: "",
                    allocation: 0,
                    funds: []
                }
            )
        }
        // function to delete an allocation group
        $scope.deleteAllocGroup = function(index) {
            $scope.portfolios[$scope.selectedIndex].allocGroups.splice(index, 1);
        }
        // code for highlighting selected portfolio
        $scope.selectedIndex = 0;

        $scope.select= function(i) {
            $scope.selectedIndex=i;
        };
        // function to add a new portfolio
        $scope.addPortfolio = function() {
            var portfolios = $scope.portfolios;
            var num = portfolios.length+1;
            portfolios.push(
                {
                    name: "Portfolio " + num,
                    cash: 0,
                    cashRem: "",
                    rebalanceType: "Buy Only",
                    totalVal: 0,
                    allocGroups: []
                }
            )
            $scope.selectedIndex = portfolios.length-1;
        }
        // function to delete a portfolio
        $scope.deletePortfolio = function(index) {
            $scope.portfolios.splice(index, 1);
            if (index > 0) $scope.selectedIndex -= 1;
        }
        //function to create a new fund
        $scope.addFund = function(pIndex, aIndex, ticker, alloc) {
            $scope.portfolios[pIndex].allocGroups[aIndex].funds.push({
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
        $scope.removeFund = function(pIndex, aIndex, fIndex) {
            $scope.portfolios[pIndex].allocGroups[aIndex].funds.splice(fIndex, 1);
        }
        //total holdings before rebalance, returns sum of all stock values
        $scope.holdings = function() {
            var total = 0;
            var funds = $scope.funds;
            for (var i=0; i<funds.length; i++) {
                total += funds[i].price * funds[i].shares;
            }
            return total;
        }
        //add default funds and get prices on page load
        $scope.addFund(0, 2, 'ZAG', 100);
        $scope.addFund(0, 0, 'VCN', 100);
        $scope.addFund(0, 1, 'XAW', 100);
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
            var fundBal = function(fund) {
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
                for (i=0; i<funds.length; i++) {
                    if (funds[i].targetVal - (funds[i].price * funds[i].shares) <= 0) {
                        funds[i].toTarget = 0;
                    } else {
                        funds[i].toTarget = funds[i].targetVal - (funds[i].price * funds[i].shares);
                    }
                    totalToTarget += funds[i].toTarget;
                }
                //set $ toPurchase (0 if toTarget = 0)
                for (i=0; i<funds.length; i++) {
                    if (funds[i].toTarget == 0) {
                        funds[i].toPurchase = 0;
                    } else {
                        funds[i].toPurchase = funds[i].toTarget / totalToTarget * $scope.cash;
                    }
                }
                //set shares to purchase
                for (i = 0; i < funds.length; i++) {
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
                for (i = 0; i < funds.length; i++) {
                    totalBal += fundBal(funds[i]);
                }
                for (i = 0; i < funds.length; i++) {
                    if (funds[i].price==0) {
                        break;
                    }
                    var newAlloc = fundBal(funds[i]) / totalBal * 100;
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
                for (i=0; i<funds.length; i++) {
                    funds[i].targetShares = Math.floor(totalCash * (funds[i].alloc / 100) / funds[i].price);
                    funds[i].toShares = funds[i].targetShares - funds[i].shares;
                    console.log("Target Shares = " + funds[i].targetShares);
                    console.log("Target Shares to purchase = " + funds[i].toShares);
                }
                //purchase shares
                for (i = 0; i < funds.length; i++) {
                    if (funds[i].price==0) {
                        break;
                    }
                    totalCash -= funds[i].targetShares * funds[i].price;
                    $scope.cashRem = totalCash.toFixed(2);
                }
                //set new allocation values
                totalBal = 0;
                for (i = 0; i < funds.length; i++) {
                    totalBal += fundBal(funds[i]);
                }
                for (i = 0; i < funds.length; i++) {
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
