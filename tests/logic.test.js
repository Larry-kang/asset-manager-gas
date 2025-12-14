const {
    getInventoryMap, processMarketData, calculatePortfolio, calculateLoans, normalizeTicker,
    ACT_BUY, ACT_SELL, TYPE_STOCK
} = require('./setup');

describe('Helper Functions', () => {
    test('normalizeTicker should format correctly', () => {
        expect(normalizeTicker('2330')).toBe('2330');
        expect(normalizeTicker('aapl')).toBe('AAPL');
        expect(normalizeTicker('  btc  ')).toBe('BTC');
        expect(normalizeTicker('0050')).toBe('0050');
        expect(normalizeTicker('50')).toBe('0050');
    });
});

describe('Logic.gs Tests', () => {
    // Mock Data
    const mockFx = 32.5;
    const mockPrices = {
        '2330': 1000,
        'AAPL': 200, // USD
        'BTC': 90000 // USD
    };
    const mockMarketRows = [
        ['Ticker', 'Rate', 'Price'],
        ['USDTWD', 32.5, ''],
        ['2330', '', 1000],
        ['AAPL', '', 200],
        ['BTC', '', 90000]
    ];

    // Log Rows: [Date, Type, Ticker, Cat, Qty, Price, Currency, Note]
    const mockLogRows = [
        ['Header'],
        ['2025-01-01', ACT_BUY, '2330', TYPE_STOCK, 1000, 500, 'TWD', ''], // Cost: 500,000, Val: 1,000,000
        ['2025-01-02', ACT_BUY, 'AAPL', TYPE_STOCK, 10, 150, 'USD', ''], // Cost: 1,500 USD, Val: 2,000 USD
        ['2025-01-05', ACT_SELL, '2330', TYPE_STOCK, 200, 900, 'TWD', '']  // Sell 200, Remaining 800
    ];

    // Loan Rows: [Source, Date, Amt, Rate, Col, Qty, Type, Warn, Liq, Note, Total, Paid, MonthPay, Curr]
    const mockLoanRows = [
        ['Header'],
        // ­É 10000 TWD, ©è©ã 100 ªÑ 2330 (Val: 100 * 1000 = 100,000), Luan: 10,000. Ratio: 1000%
        ['BankA', '2025-01-01', 10000, 2, '2330', 100, TYPE_STOCK, 160, 130, 'App', 12, 0, 0, 'TWD']
    ];

    test('processMarketData should parse prices', () => {
        const m = processMarketData(mockMarketRows);
        expect(m.fx).toBe(32.5);
        expect(m.prices['2330']).toBe(1000);
        expect(m.prices['AAPL']).toBe(200);
    });

    test('getInventoryMap should calculate correct free inventory', () => {
        const inv = getInventoryMap(mockLogRows, mockLoanRows);
        // 2330: Buy 1000 - Sell 200 = 800 Total. Pledged 100. Free = 700.
        expect(inv.inventory['2330']).toBe(700);
        // AAPL: Buy 10. Free 10.
        expect(inv.inventory['AAPL']).toBe(10);
    });

    test('calculateLoans should compute debt and risk', () => {
        const m = { fx: 32.5, prices: mockPrices };
        const res = calculateLoans(mockLoanRows, m);

        expect(res.pledged['2330']).toBe(100);
        expect(res.totalDebtTWD).toBeGreaterThan(10000); // Principal + Interest
        expect(res.risks.length).toBe(1);
        expect(res.risks[0].status).toBe('Safe');
    });

    test('calculatePortfolio should return correct totals', () => {
        const m = { fx: 32.5, prices: mockPrices };
        const pledged = { '2330': 100 };
        const p = calculatePortfolio(mockLogRows, m, pledged);

        // 2330: 800 shares * 1000 = 800,000 TWD
        // AAPL: 10 shares * 200 = 2,000 USD * 32.5 = 65,000 TWD (65,000)
        // Total Assets: 865,000
        expect(p.totalAssetsTWD).toBe(865000);

        const aapl = p.list.find(x => x.ticker === 'AAPL');
        expect(aapl).toBeDefined();
        expect(aapl.isUsd).toBe(true);
        expect(aapl.qty).toBe(10);
    });
});
