const {
    getInventoryMap, processMarketData, calculatePortfolio, calculateLoans, normalizeTicker,
    TAB_LOG
} = require('./setup');

describe('Helper Functions', () => {
    test('normalizeTicker should format correctly', () => {
        expect(normalizeTicker('2330')).toBe('2330');
        expect(normalizeTicker('aapl')).toBe('AAPL');
        expect(normalizeTicker('  btc  ')).toBe('BTC');
        expect(normalizeTicker('50')).toBe('50'); // Keep strict input
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
        ['USD/TWD', 32.5, ''],
        ['2330', '', 1000],
        ['AAPL', '', 200],
        ['BTC', '', 90000]
    ];

    // Log Rows: [Date, Type, Ticker, Cat, Qty, Price, Currency, Note]
    const mockLogRows = [
        ['Header'],
        // Use '買入' directly or import if possible. setup.js context exports constants usually.
        // Assuming Logic.gs logic matches '買入'
        ['2025-01-01', '買入', '2330', '股票', 1000, 500, 'TWD', ''],
        ['2025-01-02', '買入', 'AAPL', '股票', 10, 150, 'USD', ''],
        ['2025-01-05', '賣出', '2330', '股票', 200, 900, 'TWD', '']
    ];

    // Loan Rows: [Source, Date, Amt, Rate, Col, Qty, Type, Warn, Liq, Note, Total, Paid, MonthPay, Curr]
    const mockLoanRows = [
        ['Header'],
        ['BankA', '2025-01-01', 10000, 2, '2330', 100, '股票', 160, 130, 'App', 12, 0, 0, 'TWD']
    ];

    test('processMarketData should parse prices', () => {
        const m = processMarketData(mockMarketRows);
        expect(m.fx).toBe(32.5);
        expect(m.prices['2330']).toBe(1000);
        expect(m.prices['AAPL']).toBe(200);
    });

    test('getInventoryMap should calculate total inventory', () => {
        const inv = getInventoryMap(mockLogRows, mockLoanRows);
        expect(inv['2330']).toBeDefined();
        // Buy 1000 - Sell 200 = 800
        expect(inv['2330'].qty).toBe(800);
        expect(inv['AAPL']).toBeDefined();
        expect(inv['AAPL'].qty).toBe(10);
    });

    test('calculateLoans should compute debt and risk', () => {
        const m = { fx: 32.5, prices: mockPrices };
        const res = calculateLoans(mockLoanRows, m);

        expect(res.pledged['2330']).toBe(100);
        // Logic.gs only sums Principal in totalDebtTWD
        expect(res.totalDebtTWD).toBe(10000);
        // Check accrued exists 
        expect(res.contracts[0].accrued).toBeGreaterThan(0);
        expect(res.risks.length).toBe(1);
        expect(res.risks[0].status).toBe('Safe');
    });

    test('calculatePortfolio should return correct totals', () => {
        const m = { fx: 32.5, prices: mockPrices };
        const pledged = { '2330': 100 };
        const p = calculatePortfolio(mockLogRows, m, pledged);

        // 2330: 800 shares * 1000 = 800,000 TWD
        // AAPL: 10 shares * 200 = 2,000 USD * 32.5 = 65,000 TWD
        // Total Assets: 865,000
        expect(p.totalAssetsTWD).toBe(865000);

        const aapl = p.list.find(x => x.ticker === 'AAPL');
        expect(aapl.qty).toBe(10);
    });
});
