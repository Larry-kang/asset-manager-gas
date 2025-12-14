/**
 * Mock API for local development (Robust Version)
 * Simulates google.script.run with Singleton Store and Chainable Runners
 */

// Singleton Data Store
const MockStore = {
    holdings: [
        { cat: '股票', ticker: 'TSLA', qty: 10, valTWD: 75000, pnl: 5000, roi: 7.1 },
        { cat: '加密貨幣', ticker: 'ETH', qty: 2.5, valTWD: 150000, pnl: -2000, roi: -1.3 },
        { cat: '股票', ticker: 'PFF', qty: 200, valTWD: 60000, pnl: 1200, roi: 2.0 },
        { cat: '現金', ticker: 'USD', qty: 5000, valTWD: 160000, pnl: 0, roi: 0 }
    ],
    recentTx: [
        { date: '2023-12-01', type: '買入', ticker: 'TSLA', qty: 5, price: 210 },
        { date: '2023-12-05', type: '賣出', ticker: 'PFF', qty: 0, price: 150 }
    ],
    risks: [
        { source: 'Aave', ratio: '65', status: 'Safe', label: 'Health: 1.54', colValTWD: 100000, debtTWD: 65000 }
    ],
    contracts: [
        { row: 1, source: 'Aave', col: 'ETH', principal: 2000, currency: 'USD', rate: 3.5, type: '加密貨幣', debt: 2000 },
        { row: 2, source: 'Compound', col: 'WBTC', principal: 5000, currency: 'USD', rate: 4.2, type: '加密貨幣', debt: 5000 }
    ],
    knownTickers: ['TSLA', 'AAPL', 'ETH', 'BTC', 'NVDA', 'Binance']
};

class GasRunner {
    constructor(successHandler = null, failureHandler = null) {
        this.successHandler = successHandler;
        this.failureHandler = failureHandler;
        this.delay = 300;
    }

    withSuccessHandler(fn) {
        return new GasRunner(fn, this.failureHandler);
    }

    withFailureHandler(fn) {
        return new GasRunner(this.successHandler, fn);
    }

    _sim(fn) {
        setTimeout(() => {
            try {
                // console.log('[MockGAS] Running server function...');
                const res = fn();
                if (this.successHandler) this.successHandler(res);
            } catch (e) {
                console.error('[MockGAS] Error:', e);
                if (this.failureHandler) this.failureHandler(new Error(e.message));
            }
        }, this.delay);
    }

    // --- API METHODS ---

    getDashboardData(refresh) {
        this._sim(() => {
            const hTotal = MockStore.holdings.reduce((a, b) => a + b.valTWD, 0);
            return {
                status: 'success', success: true,
                financialSummary: {
                    netWorth: hTotal + (refresh ? 1000 : 0),
                    totalAssets: hTotal + (refresh ? 1000 : 0) + 65000,
                    totalDebt: 65000,
                    dailyChange: 1250,
                    currency: 'TWD'
                },
                holdings: MockStore.holdings,
                recentTx: MockStore.recentTx,
                risks: MockStore.risks,
                contracts: MockStore.contracts,
                knownTickers: MockStore.knownTickers
            };
        });
    }

    addLoan(form) {
        this._sim(() => {
            MockStore.contracts.push({
                row: 99,
                source: form.source,
                col: form.col,
                principal: parseFloat(form.amount),
                currency: form.currency,
                rate: parseFloat(form.rate),
                type: form.type,
                debt: parseFloat(form.amount)
            });
            return { success: true, message: 'Loan Created (Mock)' };
        });
    }

    processContractAction(d) {
        this._sim(() => {
            return { success: true, message: 'Action Processed (Mock)' };
        });
    }

    runSystemCheck() {
        this._sim(() => {
            return { success: true, message: 'System Healthy (Mock)' };
        });
    }

    addTx(form) {
        this._sim(() => {
            MockStore.recentTx.unshift({
                date: form.date,
                type: form.type,
                ticker: form.ticker,
                qty: parseFloat(form.qty),
                price: parseFloat(form.price)
            });
            return { success: true, message: 'Transaction Added (Mock)' };
        });
    }
}

window.google = { script: { run: new GasRunner() } };
console.log('Stateful Mock GAS API V5 (Robut Chain) initialized');
