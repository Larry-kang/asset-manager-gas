const fs = require('fs');
const path = require('path');
const vm = require('vm');

// --- Mock Classes ---

class MockRange {
    constructor(values) {
        this.values = values;
    }
    getValues() { return this.values; }
    setValue(v) {
        // Simple mock implementation: set first cell
        if (this.values && this.values.length > 0 && this.values[0].length > 0) this.values[0][0] = v;
    }
    setValues(v) { this.values = v; }
    setNumberFormat(f) { return this; }
    getFormula() { return ''; }
    getValue() { return this.values[0] ? this.values[0][0] : ''; }
}

class MockSheet {
    constructor(name) {
        this.name = name;
        this.data = []; // 2D array
    }
    getLastRow() { return this.data.length; }
    getLastColumn() { return this.data.length > 0 ? this.data[0].length : 0; }
    getRange(row, col, numRows, numCols) {
        // Return subset of data
        // Apps Script is 1-based, array is 0-based
        // if row=2, array index=1
        const slice = this.data.slice(row - 1, row - 1 + numRows).map(r => r.slice(col - 1, col - 1 + numCols));
        return new MockRange(slice);
    }
    getDataRange() {
        return new MockRange(this.data);
    }
    appendRow(row) { this.data.push(row); }
    getValues() { return this.data; } // Fallback
}

class MockSpreadsheet {
    constructor() {
        this.sheets = {};
    }
    getSheetByName(name) {
        if (!this.sheets[name]) {
            this.sheets[name] = new MockSheet(name);
        }
        return this.sheets[name];
    }
    insertSheet(name) {
        return this.getSheetByName(name);
    }
}

const mockSS = new MockSpreadsheet();

const context = vm.createContext({
    Logger: { log: jest.fn(msg => console.log('[GAS Log]', msg)) },
    Utilities: { formatDate: jest.fn((d) => new Date(d).toISOString()) },
    SpreadsheetApp: {
        getUi: jest.fn(),
        getActiveSpreadsheet: jest.fn(() => mockSS)
    },
    PropertiesService: {
        getScriptProperties: jest.fn(() => ({
            getProperty: jest.fn(() => null),
            setProperty: jest.fn(),
            setProperties: jest.fn()
        }))
    },
    LockService: {
        getScriptLock: jest.fn(() => ({
            tryLock: jest.fn(() => true),
            releaseLock: jest.fn()
        }))
    },
    HtmlService: {
        createTemplateFromFile: jest.fn(),
        createHtmlOutputFromFile: jest.fn(),
        XFrameOptionsMode: { ALLOWALL: 'ALLOWALL' }
    },
    console: console,
    // Expose mocks to tests so we can inject data
    MockSS: mockSS
});

/**
 * Reads file content
 */
function readFile(filename) {
    const filePath = path.join(__dirname, '..', filename);
    return fs.readFileSync(filePath, 'utf8');
}

// Concatenate files to ensure shared scope (mimic GAS)
console.log("Loading GAS files...");
const constantsGS = readFile('Constants.gs'); // [NEW]
const repositoryGS = readFile('Repository.gs'); // [NEW]
const codeGS = readFile('Code.gs');
const logicGS = readFile('Logic.gs');
const actionsGS = readFile('Actions.gs'); // Load Actions too if needed

const combinedCode = constantsGS + '\n' + repositoryGS + '\n' + codeGS + '\n' + logicGS + '\n' + actionsGS +
    '\nthis.TAB_LOG = TAB_LOG;' +
    '\nthis.ACT_BUY = ACT_BUY;' +
    '\nthis.ACT_SELL = ACT_SELL;' +
    '\nthis.ACT_DIVIDEND = ACT_DIVIDEND;' +
    '\nthis.TYPE_STOCK = TYPE_STOCK;' +
    '\nthis.RepositoryFactory = RepositoryFactory;' +
    '\nthis.LogRepository = LogRepository;' +
    '\nthis.getDashboardData = getDashboardData;' +
    '\nthis.addTx = addTx;' +
    '\nthis.addLoan = addLoan;' +
    '\nthis.processContractAction = processContractAction;';

vm.runInContext(combinedCode, context);

// Export functions for testing
module.exports = {
    context: context, // Export context to access classes
    getInventoryMap: context.getInventoryMap,
    processMarketData: context.processMarketData,
    calculatePortfolio: context.calculatePortfolio,
    calculateLoans: context.calculateLoans,
    normalizeTicker: context.normalizeTicker,
    // Controller / Actions
    getDashboardData: context.getDashboardData,
    addTx: context.addTx,
    addLoan: context.addLoan,
    processContractAction: context.processContractAction,
    // Repository Classes
    RepositoryFactory: context.RepositoryFactory,
    LogRepository: context.LogRepository,
    // Constants
    TAB_LOG: context.TAB_LOG,
    ACT_BUY: context.ACT_BUY,
    ACT_SELL: context.ACT_SELL,
    ACT_DIVIDEND: context.ACT_DIVIDEND,
    TYPE_STOCK: context.TYPE_STOCK
};
