
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
        if (!mockSS.getSheetByName(TAB_LOG)) {
            mockSS.insertSheet(TAB_LOG);
        }
        mockSheet = mockSS.getSheetByName(TAB_LOG);
        mockSheet.data = []; // Reset
        mockSheet.appendRow(['Date', 'Type', 'Category', 'Ticker', 'Qty', 'Price', 'Currency', 'Note']); // Row 1 with 8 cols
    });

    test('findAll should return mapped entities', () => {
        // [Date, Type, Category, Ticker, Qty, Price, Currency, Note]
        mockSheet.appendRow(['2025-01-01', ACT_BUY, TYPE_STOCK, '2330', 1000, 500, 'TWD', 'Note']);

        const results = repo.findAll();
        expect(results.length).toBe(1);

        const record = results[0];
        expect(record.Ticker).toBe('2330');
        expect(record.Type).toBe(ACT_BUY);
        expect(record.Qty).toBe(1000);
        expect(record.Price).toBe(500);
        expect(record.Note).toBe('Note');
        expect(record._row).toBe(2);
    });

    test('findByTicker should filter results', () => {
        // [Date, Type, Category, Ticker, ...]
        // Row 1: Ticker = XYZ
        mockSheet.appendRow(['2025-01-01', ACT_BUY, TYPE_STOCK, 'XYZ', 1000, 500, 'TWD', '']);
        // Row 2: Ticker = 2330
        mockSheet.appendRow(['2025-01-02', ACT_BUY, TYPE_STOCK, '2330', 1000, 500, 'TWD', 'Note']);

        const results = repo.findByTicker('2330');
        expect(results.length).toBe(1);
        expect(results[0].Ticker).toBe('2330');

        const none = repo.findByTicker('XYZ');
        expect(none.length).toBe(1);
        expect(none[0].Ticker).toBe('XYZ');
    });
});
