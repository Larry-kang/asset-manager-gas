const {
    LoanPosition,
    RiskCalculator,
    normalizeTicker
} = require('./setup');

describe('Event Sourcing Logic Tests', () => {

    // Test 1: Stock Lifecycle - Open -> Margin Call Risk -> Add Collateral
    test('Stock Position: Open -> Risk -> Add Collateral', () => {
        const pos = new LoanPosition('L_STOCK_001', 'Sinopac', 'Stock');

        // 1. Open Position (Borrow 100k, Collateral 200k worth of TSLA)
        // Action: SUPPLY TSLA 1000
        // Action: BORROW TWD 100000
        pos.apply({ time: new Date(), Action: 'SUPPLY', Asset: '2330', Amount: 1000 });
        pos.apply({ time: new Date(), Action: 'BORROW', Asset: 'TWD', Amount: 100000 });

        // Mock Market Data (Price 200) -> Value 200k -> Ratio 200%
        let marketData = { prices: { '2330': 200 }, fx: 32.5 };
        let risk = RiskCalculator.transform(pos, marketData);
        expect(risk.label).toBe('ºû«ù²v');
        expect(Number(parseFloat(risk.value))).toBeCloseTo(200.00);
        expect(risk.status).toBe('Safe');

        // 2. Price Crash (Price 120) -> Value 120k -> Ratio 120% (Danger)
        marketData.prices['2330'] = 120;
        risk = RiskCalculator.transform(pos, marketData);
        expect(risk.status).toBe('Danger'); // < 130%

        // 3. Add Collateral (Add 500 shares) -> Total 1500 shares * 120 = 180k -> Ratio 180%
        pos.apply({ time: new Date(), Action: 'SUPPLY', Asset: '2330', Amount: 500 });
        risk = RiskCalculator.transform(pos, marketData);
        expect(Number(parseFloat(risk.value))).toBeCloseTo(180.00);
        expect(risk.status).toBe('Safe');
    });

    // Test 2: Crypto Lifecycle - Multi-Collateral AAVE
    test('Crypto Position: Multi-Collateral HF Calculation', () => {
        const pos = new LoanPosition('L_CRYPTO_001', 'AAVE', 'Crypto');

        // 1. Supply BTC & ETH
        pos.apply({ Action: 'SUPPLY', Asset: 'BTC', Amount: 1 }); // $90k
        pos.apply({ Action: 'SUPPLY', Asset: 'ETH', Amount: 10 }); // $3k * 10 = $30k

        // 2. Borrow USDC
        pos.apply({ Action: 'BORROW', Asset: 'USDC', Amount: 80000 }); // $80k debt

        // Mock Market
        // FX 32.5
        // BTC Price (TWD) = 90000 * 32.5 = 2925000
        // ETH Price (TWD) = 3000 * 32.5 = 97500
        // Thresholds assumed 0.825 for all in simple mocker
        const fx = 32.5;
        const marketData = {
            fx: fx,
            prices: {
                'BTC': 90000 * fx,
                'ETH': 3000 * fx,
                'USDC': 1 * fx // Should be ~1 USD
            }
        };

        // Total Col USD = 90k + 30k = 120k
        // Weighted Col = 120k * 0.825 = 99k
        // Total Debt = 80k
        // HF = 99 / 80 = 1.2375

        let risk = RiskCalculator.transform(pos, marketData);
        expect(risk.label).toBe('HF');
        expect(Number(risk.value)).toBeGreaterThan(1.2);
        expect(risk.status).toBe('Safe');

        // 3. Borrow More (Over-leverage)
        pos.apply({ Action: 'BORROW', Asset: 'USDC', Amount: 20000 }); // Debt 100k
        // HF = 99 / 100 = 0.99
        risk = RiskCalculator.transform(pos, marketData);
        expect(Number(risk.value)).toBeLessThan(1.0);
        expect(risk.status).toBe('Danger');
    });

});
