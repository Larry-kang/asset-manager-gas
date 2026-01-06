
const { syncMarketData, RepositoryFactory, UrlFetchApp, CacheService, PropertiesService, Utilities } = require('./setup');

describe('Dynamic Market Data Sync', () => {
    let mockRepo;
    let mockLogSheet;

    beforeEach(() => {
        // Mock Repository
        mockRepo = {
            findAll: jest.fn()
        };
        RepositoryFactory.getLogRepo = jest.fn(() => mockRepo);

        // Mock services
        UrlFetchApp.fetch = jest.fn((url) => {
            const mockRes = (content) => ({
                getContentText: () => JSON.stringify(content),
                getResponseCode: () => 200
            });

            if (url.includes('exchangerate')) return mockRes({ rates: { TWD: 32 } });
            if (url.includes('binance')) return mockRes([{ symbol: 'DOGEUSDT', price: '0.5' }]);
            if (url.includes('yahoo')) return mockRes({ chart: { result: [{ meta: { regularMarketPrice: 50 } }] } });
            return mockRes({});
        });

        CacheService.getScriptCache = jest.fn(() => ({
            get: jest.fn(() => null),
            put: jest.fn()
        }));

        PropertiesService.getScriptProperties = jest.fn(() => ({
            getProperties: jest.fn(() => ({})),
            getProperty: jest.fn(() => null)
        }));
    });

    test('should fetch tickers from Repository', () => {
        mockRepo.findAll.mockReturnValue([
            { Ticker: '00878', Category: 'Stock' },
            { Ticker: 'DOGE', Category: 'Crypto' }
        ]);

        syncMarketData(null, true);

        // Verify Binance Call for DOGE
        const binanceCall = UrlFetchApp.fetch.mock.calls.find(call => call[0].includes('binance'));
        expect(binanceCall[0]).toContain('DOGEUSDT');

        // Verify Yahoo Call for 00878
        const yahooCall = UrlFetchApp.fetch.mock.calls.find(call => call[0].includes('00878.TW'));
        expect(yahooCall).toBeDefined();
    });

    test('should use default tickers if logs empty', () => {
        mockRepo.findAll.mockReturnValue([]);

        syncMarketData(null, true);

        // Should fetch 2330 (default)
        const yahooCall = UrlFetchApp.fetch.mock.calls.find(call => call[0].includes('2330.TW'));
        expect(yahooCall).toBeDefined();
    });
});
