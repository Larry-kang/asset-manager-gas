const { calculateLoans } = require('./setup');

describe('Aggregation Logic Tests', () => {
    const mockMarket = { fx: 32.5, prices: { '2330': 1000, '0050': 190 } };
    test('Stock Aggregation: Multiple Positions -> One Ratio', () => {
        const loanRows = [
            ['Header'],
            ['Sinopac', '2025-01-01', 400000, 2, '2330', 2000, 'Stock', 160, 130, 'Note1', 0, 0, 0, 'TWD'],
            ['Sinopac', '2025-01-02', 570000, 2, '0050', 3000, 'Stock', 160, 130, 'Note2', 0, 0, 0, 'TWD']
        ];
        const res = calculateLoans(loanRows, mockMarket);
        const risk = res.risks.find(r => r.source === 'Sinopac');
        expect(risk).toBeDefined();
        expect(risk.debt).toBe(970000);
        expect(risk.collateral).toBe(2570000);
        expect(risk.rate).toMatch(/%/);
    });
    test('Crypto Aggregation: Health Factor', () => {
        const loanRows = [
            ['Header'],
            ['AAVE', '2025-01-01', 1000, 0, 'ETH', 2, 'Crypto', 0, 0, '', 0, 0, 0, 'USD']
        ];
        const res = calculateLoans(loanRows, { fx: 32.5, prices: { 'ETH': 3000, 'USDC': 1 } });
        const risk = res.risks.find(r => r.source === 'AAVE');
        expect(risk).toBeDefined();
        expect(risk.debt).toBe(32500);
        expect(risk.collateral).toBe(195000);
    });
});
