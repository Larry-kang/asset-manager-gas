const {
    context,
    GasStore,
    syncMarketData,
    getDashboardData,
    addTransaction,
    processContractAction,
    processLoanAction,
    DB_STORE_NAME,
    DB_ENCRYPTION_KEY
} = require('./setup');

describe('System Integration Tests', () => {

    beforeEach(() => {
        // Clear environment
        context.mockSheets = {};
        context.PropertiesService._props = {};
        context.CacheService._cache = {};
        
        GasStore.init({ sheet_name: DB_STORE_NAME, encryption_key: DB_ENCRYPTION_KEY });
    });

    test('Full Lifecycle: Buy -> Sync -> Loan -> Repay', () => {
        const today = new Date().toISOString().split('T')[0];

        // 1. Buy Asset
        addTransaction({
            date: today,
            type: '買入',
            ticker: '2330',
            cat: '股票',
            qty: 1000,
            price: 500,
            currency: 'TWD'
        });

        // 2. Sync Market Data
        const sync = syncMarketData(null, true);
        expect(sync.data.prices['2330']).toBe(1000);

        // 3. Create Loan (Sinopac)
        processLoanAction({
            action: 'new',
            source: 'Sinopac',
            date: today,
            amount: 100000,
            rate: 2.5,
            collateral: '2330',
            colQty: 500,
            type: '質押',
            warn: 160,
            liq: 130,
            currency: 'TWD'
        });

        // 4. Verify Dashboard
        const dashRaw = getDashboardData();
        const dash = JSON.parse(dashRaw);
        expect(dash.status).toBe('success');
        expect(dash.totalAssetsTWD).toBe(1000000);
        expect(dash.netWorthTWD).toBe(900000); // (1000*1000) - 100000
        expect(dash.totalDebtTWD).toBe(100000);
        
        const h2330 = dash.holdings.find(h => h.ticker === '2330');
        expect(h2330).toBeDefined();
        expect(h2330.qty).toBe(1000);
        expect(h2330.pledged).toBe(500);
        expect(h2330.active).toBe(500);

        // 5. Repay Loan
        const repayRes = processContractAction({
            type: 'repay',
            source: 'Sinopac',
            val: 50000
        });
        expect(repayRes).toContain('Repaid 50000');

        // 6. Verify Dashboard After Repay
        const dash2 = JSON.parse(getDashboardData());
        expect(dash2.totalDebtTWD).toBe(50000);
    });

    test('Market Sync Logic and Caching', () => {
        const res1 = syncMarketData(null, true);
        expect(res1.logs).toContain('FX Sync: 32.5');
        
        // Cache check
        const res2 = syncMarketData(null, false);
        expect(res2.logs).toContain('Loaded from cache');
    });
});
