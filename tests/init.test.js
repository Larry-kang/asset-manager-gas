const { context, GasStore, RepositoryFactory, initializeSystem } = require('./setup');
const { SpreadsheetApp } = context;

describe('System Initialization Tests', () => {
    beforeEach(() => {
        // Clear mock sheets
        if (SpreadsheetApp.getActiveSpreadsheet()._clearSheets) {
            SpreadsheetApp.getActiveSpreadsheet()._clearSheets();
        }
        GasStore.clearAll();
    });

    test('initSheet should create sheet and headers', () => {
        const repo = RepositoryFactory.getLogRepo();
        repo.initSheet();

        // '¥æ©ö¬ö¿ý' in Unicode
        const sheetName = '\u4EA4\u6613\u7D00\u9304';
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

        expect(sheet).toBeDefined();
        expect(sheet).not.toBeNull();

        const data = sheet.getDataRange().getValues();
        expect(data.length).toBeGreaterThan(0);
        expect(data[0]).toContain('Date');
        expect(data[0]).toContain('Type');
    });

    test('initializeSystem should reset settings and sheets', () => {
        GasStore.set('CONF:TEST', 999);

        const result = initializeSystem();
        expect(result.success).toBe(true);

        // Verify Defaults
        expect(GasStore.get('CONF:CURRENCY')).toBe('TWD');
        expect(GasStore.get('CONF:TARGETS')).toEqual({ 'Stock': 60, 'Crypto': 40 });

        // Old data should be null (GasStore returns null for missing keys)
        expect(GasStore.get('CONF:TEST')).toBeNull();

        // Verify Sheets Created
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        expect(ss.getSheetByName('\u4EA4\u6613\u7D00\u9304')).not.toBeNull(); // TAB_LOG
        expect(ss.getSheetByName('\u501F\u8CB8\u7D00\u9304')).not.toBeNull(); // TAB_LOAN
        expect(ss.getSheetByName('\u501F\u8CB8\u6D41\u6C34\u5E33')).not.toBeNull(); // TAB_LOAN_ACTIONS
        expect(ss.getSheetByName('\u8CC7\u7522\u6B77\u7A0B')).not.toBeNull(); // TAB_HISTORY
    });
});
