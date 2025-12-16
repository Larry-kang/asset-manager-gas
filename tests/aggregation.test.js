const { LoanPosition, RiskCalculator } = require('./setup');

describe('Aggregation Logic Tests', () => {

    const stockMarketData = {
        prices: {
            '2330': 500,  // TWD
            '0050': 100   // TWD
        }
    };

    test('Stock Aggregation: Multiple Positions -> One Ratio', () => {
        const pos1 = new LoanPosition('s1', 'Sinopac', 'Stock');
        pos1.collaterals['2330'] = 2000;
        pos1.debts['TWD'] = 400000;

        const pos2 = new LoanPosition('s2', 'Sinopac', 'Stock');
        pos2.collaterals['0050'] = 3000;
        pos2.debts['TWD'] = 570000;

        const aggRisk = RiskCalculator.aggregate([pos1, pos2], 'Stock', stockMarketData);

        console.log('Aggregated Stock Risk:', aggRisk);

        // Verify correct UTF-8 encoding for Chinese labels
        expect(aggRisk.label).toBe('ºû«ù²v');
        expect(Number(parseFloat(aggRisk.value))).toBeCloseTo(134.02, 1);
        expect(aggRisk.status).toBe('Warning');
    });

    test('Backward Compatibility: Single Position Transform', () => {
        const pos = new LoanPosition('s3', 'Sinopac', 'Stock');
        pos.collaterals['2330'] = 2000;
        pos.debts['TWD'] = 100000;

        const risk = RiskCalculator.transform(pos, stockMarketData);
        expect(risk.label).toBeTruthy();
        expect(Number(parseFloat(risk.value))).toBeCloseTo(1000.00);
    });

    test('Crypto Aggregation: Health Factor', () => {
        const cryptoMarketDataTWD = {
            fx: 1,
            prices: { 'ETH': 2000, 'USDC': 1 }
        };

        const pos1 = new LoanPosition('c1', 'AAVE', 'Crypto');
        pos1.collaterals['ETH'] = 2;
        pos1.debts['USDC'] = 1000;

        const aggRisk = RiskCalculator.aggregate([pos1], 'Crypto', cryptoMarketDataTWD);

        expect(aggRisk.label).toBe('HF');
        expect(aggRisk.status).toBe('Safe');
        expect(Number(aggRisk.value)).toBeCloseTo(3.30);
    });

});
