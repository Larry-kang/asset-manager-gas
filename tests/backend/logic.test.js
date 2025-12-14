const Constants = require('../../Constants.gs');
Object.assign(global, Constants); // Inject Global Constants
const Logic = require('../../Logic.gs');

describe('Logic.gs Core Business Logic', () => {

    // --- Helper for Mock Data Construction ---
    const makeLog = (date, type, ticker, qty, price = 100) => {
        // [Date, Type, Ticker, Cat, Qty, Price, Curr, Note]
        // Indices: 0, 1, 2, 3, 4, 5, 6, 7
        return ['2024-01-01', type, ticker, '股票', qty, price, 'TWD', ''];
    };

    const makeLoan = (source, col, colQty) => {
        // [Src, Date, Amt, Rate, Col, Qty, Type, Warn, Liq, Note...]
        return [source, '2024-01-01', 10000, 2, col, colQty, '股票', 160, 140, ''];
    };

    test('Inventory Calculation (Buy/Sell/Pledge)', () => {
        const logs = [
            ['Header'],
            makeLog('2024-01-01', ACT_BUY, 'TSMC', 1000), // Buy 1000
            makeLog('2024-01-02', ACT_BUY, 'TSMC', 500),  // Buy 500
            makeLog('2024-01-03', ACT_SELL, 'TSMC', 200), // Sell 200 -> 1300 remaining
        ];

        const loans = [
            ['Header'],
            makeLoan('BankA', 'TSMC', 1000) // Pledge 1000 -> 300 Free
        ];

        const result = Logic.getInventoryMap(logs, loans);

        expect(result.inventory['TSMC']).toBe(300); // 1500 - 200 - 1000
    });

    test('Portfolio Valuation', () => {
        const logs = [
            ['Header'],
            makeLog('2024-01-01', ACT_BUY, 'AAPL', 10, 150) // Cost: 1500
        ];
        // Apple is US stock (regex check in Logic)

        const marketData = {
            fx: 32,
            prices: { 'AAPL': 200 } // Current Price
        };

        const result = Logic.calculatePortfolio(logs, marketData, {});
        const aapl = result.list.find(h => h.ticker === 'AAPL');

        expect(aapl).toBeDefined();
        expect(aapl.qty).toBe(10);
        expect(aapl.marketValue).toBe(2000); // 10 * 200
        expect(aapl.valTWD).toBe(64000); // 2000 * 32
        expect(aapl.isUsd).toBe(true);
    });

    test('Loan Risk Logic (Stock LTV)', () => {
        const loans = [
            ['Header'],
            // [Src, Date, Amt, Rate, Col, Qty, Type, Warn, Liq, Note]
            // Borrow 10000 TWD, Col 1000 TWD * 10 = 10000 Value
            ['BankB', '2024-01-01', 10000, 0, '2330', 10, TYPE_STOCK, 160, 130, '']
        ];

        const marketData = { fx: 1, prices: { '2330': 1000 } }; // Price 1000. ColVal = 10000.

        const result = Logic.calculateLoans(loans, marketData);
        const risk = result.risks[0];

        // Maintenance Ratio = ColVal / Debt * 100 = 10000 / 10000 * 100 = 100%
        // Warn is 160. 100 < 160. Should be Warning or Danger depending on Liquidation.
        // Liq is 130. 100 < 130. Should be DANGER.

        expect(risk.status).toBe('Danger');
        expect(parseFloat(risk.ratio)).toBe(100);
    });

    test('Loan Risk Logic (Safe)', () => {
        // Borrow 5000. Col 10000. Ratio 200%. Safe.
        const loans = [
            ['Header'],
            ['BankC', '2024-01-01', 5000, 0, '2330', 10, TYPE_STOCK, 160, 130, '']
        ];
        const marketData = { fx: 1, prices: { '2330': 1000 } };

        const result = Logic.calculateLoans(loans, marketData);
        const risk = result.risks[0];

        expect(risk.status).toBe('Safe');
        expect(parseFloat(risk.ratio)).toBe(200);
    });
});
