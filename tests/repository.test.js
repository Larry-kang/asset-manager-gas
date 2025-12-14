
const {
    LogRepository,
    context,
    ACT_BUY,
    TYPE_STOCK,
    TAB_LOG
} = require('./setup');

describe('LogRepository Tests', () => {
    let repo;
    let mockSheet;

    beforeEach(() => {
        repo = new LogRepository();
        // Access the MockSS from context
        const mockSS = context.MockSS;
        // Pre-populate data
        mockSheet = mockSS.getSheetByName(TAB_LOG);
        mockSheet.data = []; // Reset
        mockSheet.appendRow(['Date', 'Type', 'Ticker', 'Cat', 'Qty', 'Price', 'Currency', 'Note']); // Row 1 with 8 cols
    });

    test('findAll should return mapped entities', () => {
        // [Date, Type, Ticker, Cat, Qty, Price, Currency, Note]
        mockSheet.appendRow(['2025-01-01', ACT_BUY, '2330', TYPE_STOCK, 1000, 500, 'TWD', 'Note']);

        const results = repo.findAll();
        expect(results.length).toBe(1);

        const record = results[0];
        expect(record.ticker).toBe('2330');
        expect(record.type).toBe(ACT_BUY);
        expect(record.qty).toBe(1000);
        expect(record.price).toBe(500);
        expect(record.note).toBe('Note');
        expect(record._row).toBe(2);
    });

    test('findByTicker should filter results', () => {
        mockSheet.appendRow(['2025-01-01', ACT_BUY, '2330', TYPE_STOCK, 1000, 500, 'TWD', '']);
        mockSheet.appendRow(['2025-01-02', ACT_BUY, 'AAPL', TYPE_STOCK, 10, 150, 'USD', '']);

        const results = repo.findByTicker('2330');
        expect(results.length).toBe(1);
        expect(results[0].ticker).toBe('2330');

        const none = repo.findByTicker('XYZ');
        expect(none.length).toBe(0);
    });
});
