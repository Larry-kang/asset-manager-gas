const logic = require('../../Logic.gs');
const { getInventoryMap, calculateLoans, normalizeTicker, TEST_LITERALS } = logic;
const { ACT_BUY, ACT_SELL, TYPE_STOCK, TYPE_CRYPTO } = TEST_LITERALS;

describe('Logic.gs Unit Tests', () => {

    test('normalizeTicker should format tickers correctly', () => {
        expect(normalizeTicker('2330')).toBe('2330');
        expect(normalizeTicker('aapl')).toBe('AAPL');
        expect(normalizeTicker(' tsm ')).toBe('TSM');
        expect(normalizeTicker('11')).toBe('0011');
    });

    test('getInventoryMap should calculate inventory correctly', () => {
        // Log: [Date, Type, Ticker, Cat, Qty, Price, Currency, Note]
        const logRows = [
            ['Date', 'Type', 'Ticker', 'Cat', 'Qty', 'Price', 'Curr', 'Note'],
            ['2023-01-01', ACT_BUY, 'AAPL', TYPE_STOCK, 10, 150, 'USD', ''],
            ['2023-01-02', ACT_BUY, 'AAPL', TYPE_STOCK, 5, 155, 'USD', ''],
            ['2023-01-03', ACT_SELL, 'AAPL', TYPE_STOCK, 3, 160, 'USD', ''],
            ['2023-01-01', ACT_BUY, 'TSLA', TYPE_STOCK, 10, 200, 'USD', '']
        ];

        // Loan: [Source, Date, Amount, Rate, Col, Qty, Type, Warn, Liq, Note...]
        const loanRows = [
            ['Source', 'Date', 'Amt', 'Rate', 'Col', 'Qty', 'Type', 'Warn', 'Liq', 'Note'],
            ['Aave', '2023-01-05', 1000, 2, 'AAPL', 5, TYPE_CRYPTO, 80, 90, '']
        ];

        const result = getInventoryMap(logRows, loanRows);

        // AAPL: 10 + 5 - 3 = 12 (Total). Locked: 5. Free: 7.
        expect(result.inventory['AAPL']).toBe(7);
        expect(result.inventory['TSLA']).toBe(10);
    });

    test('calculateLoans should compute interest and health factor', () => {
        const loanRows = [
            ['Source', 'Date', 'Amt', 'Rate', 'Col', 'Qty', 'Type', 'Warn', 'Liq', 'Note'],
            ['Compound', '2023-01-01', 1000, 10, 'ETH', 10, TYPE_CRYPTO, 80, 90, '', 0, 0, 0, 'USD']
        ];
        // 1000 Principal USD, 10% Rate. Interest accrued.

        const marketData = {
            fx: 30,
            prices: { 'ETH': 200 }
        };

        const result = calculateLoans(loanRows, marketData);
        const contract = result.contracts[0];

        expect(contract.source).toBe('Compound');
        expect(contract.debt).toBeGreaterThan(1000);

        // Col Val = 10 * 200 * 30 = 60000 (Crypto uses FX)
        expect(contract.colValTWD).toBe(60000);

        // Risk Check
        const risk = result.risks.find(r => r.source === 'Compound');
        expect(parseFloat(risk.ratio)).toBeGreaterThan(49);
        expect(risk.status).toBe('Safe');
    });

});
