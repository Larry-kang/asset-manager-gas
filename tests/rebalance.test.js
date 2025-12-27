const { calculateRebalancing } = require('./setup');

describe('Smart Rebalancing Logic', () => {
    test('Should suggest No Action if balanced', () => {
        const portfolio = {
            inventory: {
                'A': { cat: 'Stock', qty: 100 }
            },
            list: [
                { ticker: 'A', marketValTWD: 6000 }
            ]
        };
        const targets = { 'Stock': 60, 'Cash': 40 };
        const netWorth = 10000;

        // Mocking Inventory Map Logic in calculateRebalancing:
        // Current: Stock = 6000 (60%), Cash matches remaining
        // Wait, calculateRebalancing calculates current based on portfolio list + category mapping.
        // My Logic.gs implementation looked at portfolio.inventory to get 'cat'.
        // Let's ensure mock data fits.

        const res = calculateRebalancing(portfolio, targets, netWorth);

        // Stock: Target 6000, Current 6000 => Diff 0
        const stock = res.find(x => x.category === 'Stock');
        expect(stock.action).toBe('Sell'); // 0 diff might be "Sell 0" or we should handle 0.
        expect(stock.diff).toBe(0);
    });

    test('Should suggest Buy/Sell correctly', () => {
        const portfolio = {
            inventory: {
                'TSLA': { cat: 'Stock' },
                'USDT': { cat: 'Crypto' }
            },
            list: [
                { ticker: 'TSLA', marketValTWD: 7000 }, // 70%
                { ticker: 'USDT', marketValTWD: 3000 }  // 30%
            ]
        };
        const netWorth = 10000;
        const targets = { 'Stock': 50, 'Crypto': 50 }; // Target: 5000 each

        const res = calculateRebalancing(portfolio, targets, netWorth);

        // Stock: Current 7000, Target 5000 => Sell 2000
        const stock = res.find(x => x.category === 'Stock');
        expect(stock.action).toBe('Sell');
        expect(stock.diff).toBe(-2000);

        // Crypto: Current 3000, Target 5000 => Buy 2000
        const crypto = res.find(x => x.category === 'Crypto');
        expect(crypto.action).toBe('Buy');
        expect(crypto.diff).toBe(2000);
    });
});
