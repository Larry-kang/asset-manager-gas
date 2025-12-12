/**
 * Mock Google Apps Script API for Local Development
 * Simulates server-side calls with fake data.
 */
console.log("Mock API Loaded");

// Reactive Mock Database
const db = {
    netWorthTWD: 1250000,
    dailyChange: 3500,
    totalAssetsTWD: 4500000,
    totalDebtTWD: 1200000,
    holdings: [
        { ticker: '2330', qty: 1000, valTWD: 500000, pnl: 20000, roi: 4.0, cat: '股票' },
        { ticker: 'AAPL', qty: 10, valTWD: 60000, pnl: -1500, roi: -2.5, cat: '股票', isUsd: true }
    ],
    risks: [
        { source: 'Aave', ratio: '65.00', status: 'Safe', debtTWD: 30000, colValTWD: 50000, label: 'LTV' }
    ],
    recentTx: [
        { type: '買入', ticker: 'TSLA', date: '2023-10-01', qty: 5, price: 200 }
    ],
    knownTickers: ['2330', 'AAPL', 'TSLA']
};

const server = {
    getDashboardData: function (forceUpdate) {
        console.log("[Mock] getDashboardData", forceUpdate);
        setTimeout(() => {
            if (this.onSuccess) this.onSuccess(JSON.stringify({
                status: 'success',
                fx: 32.5,
                netWorthTWD: db.netWorthTWD,
                totalAssetsTWD: db.totalAssetsTWD,
                totalDebtTWD: db.totalDebtTWD,
                dailyChange: db.dailyChange,
                holdings: db.holdings,
                contracts: [],
                risks: db.risks,
                recentTx: db.recentTx,
                knownTickers: db.knownTickers
            }));
        }, 500);
    },
    newTransaction: function (dataJson) {
        console.log("[Mock] newTransaction:", dataJson);
        setTimeout(() => {
            if (this.onSuccess) this.onSuccess({ success: true, message: "Mock Transaction Created" });
        }, 500);
    },
    newLoan: function (dataJson) {
        console.log("[Mock] newLoan:", dataJson);
        setTimeout(() => {
            if (this.onSuccess) this.onSuccess({ success: true, message: "Mock Loan Created" });
        }, 500);
    },
    runSystemCheck: function () {
        console.log("[Mock] runSystemCheck");
        window.alert("Mock System Diagnostics Running...");
    }
};

// Simulate google.script.run
window.google = {
    script: {
        run: {
            withSuccessHandler: function (callback) {
                server.onSuccess = callback;
                return server;
            },
            withFailureHandler: function (callback) {
                server.onFailure = callback;
                return server;
            },
            // Direct calls without handlers (rare in this app but possible)
            ...server
        }
    }
};
