const { calculateLoans } = require('./setup');

describe('Loan Lifecycle Tests', () => {
    const mockMarket = { fx: 32.5, prices: { '2330': 1000 } };
    test('Interest Accrual over Time', () => {
        const today = new Date();
        const pastDate = new Date();
        pastDate.setDate(today.getDate() - 30);
        const dateStr = pastDate.toISOString().split('T')[0];
        const loanRows = [
            ['Header'],
            ['BankA', dateStr, 100000, 2.0, '', 0, 'Credit', 0, 0, '', 0, 0, 0, 'TWD']
        ];
        const res = calculateLoans(loanRows, mockMarket);
        const contract = res.contracts[0];
        expect(contract).toBeDefined();
        expect(contract.accrued).toBeGreaterThan(160);
        expect(contract.accrued).toBeLessThan(170);
    });
    test('Repayment/Cleared Handling', () => {
        const loanRows = [
            ['Header'],
            ['BankA', '2025-01-01', 100000, 2.0, '', 0, 'Credit', 0, 0, '已結清', 0, 0, 0, 'TWD']
        ];
        const res = calculateLoans(loanRows, mockMarket);
        expect(res.totalDebtTWD).toBe(0);
    });
});
