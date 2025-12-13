const fs = require('fs');
const path = require('path');

const content = `/**
 * Mock API for local development
 * Simulates google.script.run with STATEFUL persistence (in-memory)
 * UPDATED_V4
 */
class MockGAS {
    constructor() {
        this.delay = 300;
        this.store = {
            holdings: [
                { cat: '股票', ticker: 'TSLA', qty: 10, valTWD: 75000, pnl: 5000, roi: 7.1 },
                { cat: '加密貨幣', ticker: 'ETH', qty: 2.5, valTWD: 150000, pnl: -2000, roi: -1.3 },
                { cat: '特別股', ticker: 'PFF', qty: 200, valTWD: 60000, pnl: 1200, roi: 2.0 },
                { cat: '現金', ticker: 'USD', qty: 5000, valTWD: 160000, pnl: 0, roi: 0 }
            ],
            recentTx: [
                { date: '2023-12-01', type: '買入', ticker: 'TSLA', qty: 5, price: 210 },
                { date: '2023-12-05', type: '配息', ticker: 'PFF', qty: 0, price: 150 }
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
    }

    _sim(fn) {
        setTimeout(() => {
            try {
                const res = fn();
                // Ensure successHandler is called with string if that's what app expects, 
                // but handleResponse usually parses it. 
                // Let's pass Object directly as handleResponse handles both.
                if (this.successHandler) this.successHandler(res);
            } catch (e) {
                if (this.failureHandler) this.failureHandler(new Error(e.message));
            }
        }, this.delay);
        return this;
    }

    withSuccessHandler(fn) { this.successHandler = fn; return this; }
    withFailureHandler(fn) { this.failureHandler = fn; return this; }

    getDashboardData(refresh) {
        return this._sim(() => {
            const hTotal = this.store.holdings.reduce((a, b) => a + b.valTWD, 0);
            return {
                status: 'success', success: true,
                netWorthTWD: hTotal + (refresh ? 1000 : 0), // Vary slightly to show refresh
                dailyChange: 1250,
                holdings: this.store.holdings,
                recentTx: this.store.recentTx,
                risks: this.store.risks,
                contracts: this.store.contracts,
                knownTickers: this.store.knownTickers
            };
        });
    }

    addTx(form) {
        return this._sim(() => {
            this.store.recentTx.unshift({
                date: form.date,
                type: form.type,
                ticker: form.ticker,
                qty: parseFloat(form.qty),
                price: parseFloat(form.price)
            });
            // Auto-Add to holdings for realism if valid ticker
            if (form.cat === '股票' || form.cat === '加密貨幣') {
                 const exist = this.store.holdings.find(h => h.ticker === form.ticker);
                 if (exist) {
                     exist.qty += parseFloat(form.qty);
                     exist.valTWD += parseFloat(form.qty) * parseFloat(form.price) * 32; // Rough TWD
                 } else {
                     this.store.holdings.push({
                         cat: form.cat, ticker: form.ticker, qty: parseFloat(form.qty), 
                         valTWD: parseFloat(form.qty) * parseFloat(form.price) * 32, pnl: 0, roi: 0
                     });
                 }
            }
            return { success: true, message: 'Transaction Added (Mock)' };
        });
    }

    addLoan(form) {
        return this._sim(() => {
            this.store.contracts.push({
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
        return this._sim(() => {
            return { success: true, message: 'Action Processed (Mock)' };
        });
    }

    runSystemCheck() {
        return this._sim(() => {
            return { success: true, message: 'System Healthy (Mock)' };
        });
    }
}

window.google = { script: { run: new MockGAS() } };
console.log('Stateful Mock GAS API V4 initialized');
`;

fs.writeFileSync(path.join(__dirname, 'mock_api.js'), content, { encoding: 'utf8' });
console.log('mock_api.js forced update complete.');
