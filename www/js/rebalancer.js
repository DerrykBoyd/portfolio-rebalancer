var app = angular.module('myApp', []);

app.controller('myCtrl', function ($scope, $http) {

    // function to populate storage with JSON String
    $scope.populateStorage = function() {
        let portfolios = JSON.stringify($scope.portfolios);
        localStorage.setItem('portfolios', portfolios);
    }

    // set theme
    $scope.setTheme = function(newTheme) {
        document.body.style.display = 'none';
        localStorage.setItem('theme', newTheme);
        $scope.theme = newTheme;
        window.setTimeout (function() {
            document.body.style.display = 'block';
        }, 100)
    }

    //function to create a new fund
    $scope.addFund = function (pIndex, aIndex, ticker, alloc) {
        $scope.portfolios[pIndex].allocGroups[aIndex].funds.push({
            ticker: ticker,
            price: '',
            shares: '',
            alloc: alloc,
            currAlloc: '',
            targetVal: 0,
            toTarget: 0,
            newAlloc: ''
        })
    }
    
    // local storage implementation to load previous portfolios
    if (!localStorage.getItem('portfolios')){
        setSamplePortfolio();
        $scope.populateStorage();
    } else {
        getPortfolios();
        $scope.setTheme(localStorage.getItem('theme'));
    }
    if (!localStorage.theme || localStorage.theme == null) $scope.setTheme('pulse');

    // function to set expample portfolio if first time user
    function setSamplePortfolio() {
        $scope.portfolios = [
            {
                name: "Portfolio 1",
                cash: '',
                marketVal: 0,
                totalVal: 0,
                cashRem: 0,
                buyOnly: true,
                rebalType: 'Buy Only',
                resultShares: true,
                allocGroups: [
                    {
                        name: "Canada Stocks",
                        allocation: 20,
                        currAlloc: '',
                        funds: []
                    },
                    {
                        name: "World Stocks",
                        allocation: 40,
                        currAlloc: '',
                        funds: []
                    },
                    {
                        name: "Bonds",
                        allocation: 40,
                        currAlloc: '',
                        funds: []
                    }
                ]
            }
        ];
        $scope.addFund(0, 2, 'ZAG', 100);
        $scope.addFund(0, 0, 'VCN', 100);
        $scope.addFund(0, 1, 'XAW', 100);
    }

    //add default funds and get prices on page load
    $scope.pageLoaded = function() {
        $scope.refreshPrices();
        $scope.checkFundAlloc();
        $scope.checkGroupAlloc();
        $scope.rebalance();
        if ($scope.portfolios.length == 1) {
            document.getElementById('dlt-folio').style.display = 'none';
        }
    }

    //show content on page load
    window.onload = function() {
        $scope.pageLoaded();
    }

    // code for highlighting selected portfolio
    $scope.selectedIndex = 0;
    $scope.portfolio = $scope.portfolios[$scope.selectedIndex];
    
    $scope.select = function(i) {
        $scope.selectedIndex = i;
        $scope.portfolio = $scope.portfolios[$scope.selectedIndex];
    };

    // function to get JSON portfolios from local storage
    function getPortfolios() {
        let portfolios = localStorage.getItem('portfolios');
        $scope.portfolios = JSON.parse(portfolios);
    }

    // function to get the fund price if available through Backend API
    function getPrice(fund) {
        let str = fund.ticker;
        let ticker = str.toUpperCase();
        $http({
            method: 'GET',
            url: 'https://aos5yqid2a.execute-api.us-east-1.amazonaws.com/prod/getStockPrice?ticker=' + ticker
        }).then(function successCallback(response) {
            //success code here
            fund.price = response.data;
            //console.log(response);
            showStockWarning();
            $scope.totalValue();
        }, function errorCallback(response) {
            //error code here
            fund.price = '';
            showStockWarning();
            console.log('API call error occurred: ' + response);
        });
    }

    //show warning if fund price isn't fetched
    function showStockWarning() {
        let count = 0;
        for (let alloc of $scope.portfolio.allocGroups) {
            for (let fund of alloc.funds) {
                let input = document.getElementById( `${fund.ticker}-ticker`);
                if (fund.price == 0 || fund.price == '') {
                    count++;
                    if (input) input.classList.add('is-invalid');
                } else {
                    if (input) input.classList.remove('is-invalid');
                }
            }
        }
        if (count == 0) document.getElementById("stock-warning").style.display = "none";
        else document.getElementById("stock-warning").style.display = "block";
    }

    //refresh price for single fund
    $scope.refreshPrice = function (fund) {
        if (fund) {
            fund.price = "fetching...";
            getPrice(fund);
        }
    }
    //refresh prices for all funds
    $scope.refreshPrices = function () {
        let portfolio = $scope.portfolio;
        for (var alloc in portfolio.allocGroups) {
            for (var fund in portfolio.allocGroups[alloc].funds) {
                $scope.refreshPrice(portfolio.allocGroups[alloc].funds[fund]);
            }
        }
        $scope.totalValue();
    }
    //check total allocations total 100% and show warning if not
    $scope.checkGroupAlloc = function () {
        let portfolio = $scope.portfolio;
        let allocTotal = 0;
        let warning = document.getElementById('group-warning');
        let inputs = document.getElementsByClassName('group-alloc');
        for (let alloc of portfolio.allocGroups) {
            allocTotal += alloc.allocation;
        }
        if (allocTotal == 100) {
            warning.style.display = 'none';
            for (let input of inputs) input.classList.remove('is-invalid');
        }
        else {
            warning.style.display = "block";
            for (let input of inputs) input.classList.add('is-invalid'); 
        }
        $scope.rebalance();
        $scope.populateStorage();
    }
    //check each fund allocations total 100% and show warning if not
    $scope.checkFundAlloc = function () {
        let portfolio = $scope.portfolio;
        let warning = document.getElementById('fund-warning');
        let inputs = document.getElementsByClassName('fund-alloc');
        let count = 0;
        for (let alloc of portfolio.allocGroups) {
            let allocTotal = 0;
            if (alloc.funds.length == 1) alloc.funds[0].alloc = 100;
            for (let fund of alloc.funds) allocTotal += fund.alloc;
            if (allocTotal != 100) count ++;
        }
        if (count == 0) {
            warning.style.display = 'none';
            for (let input of inputs) input.classList.remove('is-invalid');
        }
        else {
            warning.style.display = "block";
            for (let input of inputs) input.classList.add('is-invalid'); 
        }
        $scope.totalValue();
        $scope.populateStorage();
    }
    // function to add an allocation group
    $scope.addAllocGroup = function () {
        $scope.portfolio.allocGroups.push(
            {
                name: "",
                allocation: 0,
                funds: []
            }
        )
        $scope.populateStorage();
    }
    // function to delete an allocation group
    $scope.deleteAllocGroup = function (index) {
        $scope.portfolio.allocGroups.splice(index, 1);
        $scope.totalValue();
        $scope.populateStorage();
    }

    // fund to check buy or sell and update forms
    $scope.checkAction = function() {
        let portfolio = $scope.portfolio;
        // set input messages
        if (portfolio.resultShares) $scope.action = '(# of shares)';
        else $scope.action = '($)';
        // set a timeout to let the funds update
        setTimeout( function() {
            let allocGroups = portfolio.allocGroups;
            for (let alloc of allocGroups) {
                for (let fund of alloc.funds) {
                    let input = document.getElementById( `${fund.ticker}-action`);
                    if (fund.toBuy>0.5) {
                        input.classList.add('is-valid');
                        input.classList.remove('is-invalid');
                    } else if (fund.toBuy<-0.5){
                        input.classList.remove('is-valid');
                        input.classList.add('is-invalid');
                    } else {
                        input.classList.remove('is-valid');
                        input.classList.remove('is-invalid');
                    }
            }
        }
        }, 200)
    }

    // function to add a new portfolio
    $scope.addPortfolio = function () {
        var portfolios = $scope.portfolios;
        var num = portfolios.length + 1;
        portfolios.push(
            {
                name: "Portfolio " + num,
                cash: 0,
                cashRem: 0,
                buyOnly: true,
                rebalType: 'Buy Only',
                resultShares: true,
                totalVal: 0,
                allocGroups: []
            }
        )
        if(portfolios.length == 2) document.getElementById('dlt-folio').style.display = 'block';
        $scope.select(portfolios.length - 1);
        $scope.populateStorage();
    }
    // function to delete a portfolio
    $scope.deletePortfolio = function (index) {
        if ($scope.portfolios.length > 1) $scope.portfolios.splice(index, 1);
        if (index > 0) $scope.selectedIndex -= 1;
        if ($scope.portfolios.length == 1) document.getElementById('dlt-folio').style.display = 'none';
        $scope.populateStorage();
    }

    //function to remove a fund
    $scope.removeFund = function (pIndex, aIndex, fIndex) {
        $scope.portfolios[pIndex].allocGroups[aIndex].funds.splice(fIndex, 1);
        $scope.totalValue();
        $scope.populateStorage();
        $scope.checkFundAlloc();
    }
    //total holdings before rebalance
    $scope.holdings = function () {
        let portfolio = $scope.portfolio;
        let total = 0;
        for (let alloc of portfolio.allocGroups) {
            for (let fund of alloc.funds) total += fund.price * fund.shares;
        }
        portfolio.marketVal = total.toFixed(2);
        $scope.rebalance();
        $scope.populateStorage();
    }
    //total portfolio value, returns sum of all stock values + cash available
    $scope.totalValue = function() {
        $scope.holdings();
        let portfolio = $scope.portfolio;
        portfolio.buyOnly ? portfolio.rebalType = 'Buy Only' : portfolio.rebalType = 'Buy/Sell';
        let total = parseFloat(portfolio.marketVal) + parseFloat(portfolio.cash);
        portfolio.totalVal = total.toFixed(2);
        $scope.currAlloc();
        showStockWarning();
    }

    //calculate and return allocation group market value
    function marketVal(group) {
        let total = 0;
        for(let fund of group.funds) {
            total += fund.price * fund.shares;
        }
        return total;
    }

    //calculate current allocation
    $scope.currAlloc = function() {
        let portfolio = $scope.portfolio;
        for (let alloc of portfolio.allocGroups){
            for (let fund of alloc.funds) {
                let currAlloc = fund.price * fund.shares / marketVal(alloc) * 100;
                if (isNaN(currAlloc)) fund.currAlloc = 0;
                else fund.currAlloc = currAlloc.toFixed(2);
            }
            let groupAlloc = marketVal(alloc) / portfolio.marketVal * 100;
            if (isNaN(groupAlloc)) alloc.currAlloc = 0;
            else alloc.currAlloc = groupAlloc.toFixed(2);
        }
        $scope.rebalance();
        $scope.populateStorage();
    }

    //rebalance logic TO REDO!!
    $scope.rebalance = function () {
        let portfolio = $scope.portfolio;
        if (portfolio.buyOnly) {
            portfolio.toTarget = 0;
            var sortedFunds = [];
            // set target values for each allocation group and fund
            for (let alloc of portfolio.allocGroups) {
                alloc.toTarget = 0;
                alloc.marketVal = 0;
                if (alloc.allocation == 0) alloc.targetVal = 0;
                else alloc.targetVal = portfolio.totalVal * alloc.allocation/100;
                for (let fund of alloc.funds) {
                    alloc.marketVal += fund.price*fund.shares;
                }
                for (let fund of alloc.funds) {
                    if(fund.alloc > 0) sortedFunds.push(fund);
                    if (fund.alloc == 0) fund.targetVal = 0;
                    else fund.targetVal = alloc.targetVal * fund.alloc/100;
                    fund.toTarget = fund.targetVal - alloc.marketVal * fund.alloc/100;
                    if (fund.toTarget < 0) fund.toTarget = 0;
                    alloc.toTarget += fund.toTarget;
                    portfolio.toTarget += fund.toTarget;
                }
                sortedFunds.sort(function(a, b){
                    return b.price - a.price;
                })
                // console.log(sortedFunds);
            }
            for (let alloc of portfolio.allocGroups) {
                for (let fund of alloc.funds) {
                    fund.toBuy = parseFloat((fund.toTarget/portfolio.toTarget*portfolio.cash).toFixed(2));
                }
            }
            // set number of shares to buy with cash available
            if (portfolio.resultShares) {
                portfolio.cashRem = portfolio.cash;
                for (let alloc of portfolio.allocGroups) {
                    for (let fund of alloc.funds) {
                        fund.toBuy = Math.floor(fund.toBuy/fund.price);
                        portfolio.cashRem -= fund.toBuy * fund.price;
                        portfolio.cashRem = portfolio.cashRem.toFixed(2);
                    }
                }
                for (let sortedFund of sortedFunds) {
                    if (sortedFund.price < portfolio.cashRem) {
                        for (let alloc of portfolio.allocGroups) {
                            for (let val of alloc.funds) {
                                if (sortedFund.ticker == val.ticker) {
                                    val.toBuy = parseInt(val.toBuy);
                                    portfolio.cashRem = parseFloat(portfolio.cashRem);
                                    // console.log('getting here? '+val.ticker+val.toBuy+sortedFund.ticker+val.price)
                                    val.toBuy ++;
                                    portfolio.cashRem -= val.price;
                                    portfolio.cashRem = portfolio.cashRem.toFixed(2);
                                }
                            }
                        }
                    }
                }
            }       
        }
        if (!portfolio.buyOnly) {
            portfolio.toTarget = portfolio.totalVal-portfolio.marketVal;
            // set target values to each allocation group and fund
            for (let alloc of portfolio.allocGroups) {
                alloc.targetVal = portfolio.totalVal * alloc.allocation;
                if (alloc.allocation == 0) alloc.targetVal = 0;
                else alloc.targetVal = portfolio.totalVal * alloc.allocation/100;
                for (let fund of alloc.funds) {
                    alloc.marketVal += fund.price*fund.shares;
                }
                alloc.toTarget = alloc.targetVal - alloc.marketVal;
                for (let fund of alloc.funds) {
                    if (fund.alloc == 0) fund.targetVal = 0;
                    else fund.targetVal = alloc.targetVal * fund.alloc/100;
                    fund.toTarget = fund.targetVal - fund.price * fund.shares;
                    fund.toBuy = fund.toTarget.toFixed(2);
                }
            }
            // set number of shares to buy/sell with cash remaining
            if (portfolio.resultShares) {
                portfolio.cashRem = portfolio.cash;
                for (let alloc of portfolio.allocGroups) {
                    for (let fund of alloc.funds) {
                        fund.toBuy = Math.floor(fund.toBuy/fund.price);
                        if (fund.toBuy < 0 && fund.toBuy > fund.shares) fund.toBuy = 0-fund.shares;
                        portfolio.cashRem -= fund.toBuy * fund.price;
                        portfolio.cashRem = portfolio.cashRem.toFixed(2);
                    }
                }
            }  
        }
        if (isNaN(portfolio.cashRem)) portfolio.cashRem = '0.00';
        if (isNaN(portfolio.marketVal)) portfolio.marketVal = '0.00';
        if (isNaN(portfolio.totalVal)) portfolio.totalVal = '0.00';
        $scope.checkAction();
    }
});
