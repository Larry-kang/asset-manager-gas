const Constants = require('../../Constants.gs');
Object.assign(global, Constants);
const Actions = require('../../Actions.gs');

// --- Mocking SpreadsheetApp ---
const mockSheet = {
    appendRow: jest.fn(),
    getRange: jest.fn(),
    getLastRow: jest.fn().mockReturnValue(10)
};
const mockRange = {
    setValue: jest.fn(),
    getValues: jest.fn()
};

// Setup Chain
mockSheet.getRange.mockReturnValue(mockRange);
const mockSS = {
    getSheetByName: jest.fn().mockReturnValue(mockSheet)
};

global.SpreadsheetApp = {
    getActiveSpreadsheet: () => mockSS
};

// Global Helper Mock
global.normalizeTicker = (t) => t.toUpperCase();

describe('Actions.gs Write Operations', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('addTx should append a new row to Log Sheet', () => {
        const form = {
            date: '2024-05-20',
            type: ACT_BUY,
            ticker: 'NVDA',
            cat: TYPE_STOCK,
            qty: 10,
            price: 900,
            currency: 'USD',
            note: 'AI Boom'
        };

        const result = Actions.addTx(form);

        expect(result.success).toBe(true);
        expect(mockSS.getSheetByName).toHaveBeenCalledWith(TAB_LOG);
        expect(mockSheet.appendRow).toHaveBeenCalledTimes(1);

        const args = mockSheet.appendRow.mock.calls[0][0];
        expect(args[1]).toBe(ACT_BUY); // IDX_LOG_TYPE
        expect(args[2]).toBe('NVDA'); // Ticker
        expect(args[4]).toBe(10); // Qty
    });

    test('addLoan should append to Loan Sheet', () => {
        const form = {
            source: 'MaxBank',
            date: '2024-05-20',
            amount: 100000,
            rate: 5.5,
            col: '', colQty: 0,
            type: TYPE_CREDIT,
            currency: 'TWD'
        };

        const result = Actions.addLoan(form);

        expect(result.success).toBe(true);
        expect(mockSS.getSheetByName).toHaveBeenCalledWith(TAB_LOAN);
        expect(mockSheet.appendRow).toHaveBeenCalledTimes(1);
    });

    test('processContractAction (Repay) should update Amount', () => {
        // Mock existing row data for Repay
        // Indices: Src(0), Date(1), Amt(2)...
        // We need an array that matches the schema in Actions.gs lines 98+
        const rowData = [
            'MaxBank', '2024-01-01', 50000, 5, '', 0, TYPE_CREDIT, '', '', 'OldNote', 12, 0, 0, 'TWD'
        ];
        mockRange.getValues.mockReturnValue([rowData]);

        const action = {
            row: 5,
            type: 'repay',
            val: 10000,
            price: 0
        };

        const result = Actions.processContractAction(action);

        expect(result.success).toBe(true);
        // Expect Amount update (Col 3 in Sheet, Index 2 in Array, but Sheet is 1-based)
        // Code: sheet.getRange(rowIdx, 3).setValue(currentAmt)
        expect(mockSheet.getRange).toHaveBeenCalledWith(5, 3);
        expect(mockRange.setValue).toHaveBeenCalledWith(40000); // 50000 - 10000
    });
});
