const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Polyfill jest for standalone execution
if (typeof jest === 'undefined') {
    global.jest = {
        fn: (impl) => {
            const mock = (...args) => (impl ? impl(...args) : undefined);
            mock.mockReturnValue = (val) => { };
            return mock;
        }
    };
}

// 1. Read GAS Files
const codeContent = fs.readFileSync(path.join(__dirname, '../Code.gs'), 'utf8');
const logicContent = fs.readFileSync(path.join(__dirname, '../Logic.gs'), 'utf8');
const repoContent = fs.readFileSync(path.join(__dirname, '../Repository.gs'), 'utf8');
const actionsContent = fs.readFileSync(path.join(__dirname, '../Actions.gs'), 'utf8'); // Actions depends on Logic/Repo
const constantsContent = fs.readFileSync(path.join(__dirname, '../Constants.gs'), 'utf8'); // Load Constants

// 2. Mock GAS Environment
const MockSheet = class {
    constructor(name) {
        this.name = name;
        this.data = []; // 2D array
        this.lastRow = 0;
    }
    getName() { return this.name; }
    getLastRow() { return this.data.length; }
    getRange(row, col, numRows, numCols) {
        return new MockRange(this, row, col, numRows, numCols);
    }
    appendRow(row) {
        this.data.push(row);
        this.lastRow++;
        return this; // Return sheet for chaining if needed
    }
    getDataRange() {
        return new MockRange(this, 1, 1, this.data.length || 1, (this.data[0] || []).length || 1);
    }
    clear() { this.data = []; this.lastRow = 0; }
};

const MockRange = class {
    constructor(sheet, row, col, numRows, numCols) {
        this.sheet = sheet;
        this.row = row;
        this.col = col;
        this.numRows = numRows;
        this.numCols = numCols;
    }
    getValues() {
        let result = [];
        for (let i = 0; i < this.numRows; i++) {
            let r = this.sheet.data[this.row - 1 + i] || [];
            let rowData = [];
            for (let j = 0; j < this.numCols; j++) {
                rowData.push(r[this.col - 1 + j] === undefined ? '' : r[this.col - 1 + j]);
            }
            result.push(rowData);
        }
        if (result.length === 0) return [[]];
        return result;
    }
    setValue(val) {
        for (let i = 0; i < this.numRows; i++) {
            if (!this.sheet.data[this.row - 1 + i]) this.sheet.data[this.row - 1 + i] = [];
            for (let j = 0; j < this.numCols; j++) {
                this.sheet.data[this.row - 1 + i][this.col - 1 + j] = val;
            }
        }
        return this;
    }
    setValues(values) {
        for (let i = 0; i < values.length; i++) {
            let rIdx = this.row - 1 + i;
            if (!this.sheet.data[rIdx]) this.sheet.data[rIdx] = [];
            for (let j = 0; j < values[i].length; j++) {
                this.sheet.data[rIdx][this.col - 1 + j] = values[i][j];
            }
        }
        return this;
    }
    setNumberFormat(f) { return this; }
    getFormula() { return ''; }
};

const MockSS = {
    getSheetByName: jest.fn((name) => {
        return context.mockSheets[name] || null;
    }),
    insertSheet: jest.fn((name) => {
        const s = new MockSheet(name);
        context.mockSheets[name] = s;
        return s;
    }),
    getSheets: jest.fn(() => Object.values(context.mockSheets))
};

// 3. Create VM Context
const context = {
    SpreadsheetApp: {
        getActiveSpreadsheet: jest.fn(() => MockSS),
        openById: jest.fn(() => MockSS)
    },
    Logger: { log: jest.fn(msg => console.log('[GAS Log]', msg)) },
    Utilities: {
        formatDate: jest.fn((d) => new Date(d).toISOString().split('T')[0]),
        newBlob: jest.fn()
    },
    LockService: {
        getScriptLock: jest.fn(() => ({
            tryLock: jest.fn(() => true),
            releaseLock: jest.fn()
        }))
    },
    PropertiesService: {
        getScriptProperties: jest.fn(() => ({
            getProperty: jest.fn(() => null),
            setProperty: jest.fn(),
            setProperties: jest.fn()
        }))
    },
    HtmlService: {
        createHtmlOutputFromFile: jest.fn(() => ({ setTitle: jest.fn() }))
    },
    UrlFetchApp: {
        fetch: jest.fn()
    },
    mockSheets: {},
    console: console,
    exports: {},
    module: { exports: {} }
};

vm.createContext(context);

// Include Constants first
vm.runInContext(constantsContent, context);

// Explicitly export Classes from Logic.gs to Context
// Class declarations in VM might not automatically hoist to 'this'
const logicWithExports = logicContent +
    "\n; this.LoanPosition = LoanPosition; this.RiskCalculator = RiskCalculator;";

vm.runInContext(logicWithExports, context);
vm.runInContext(repoContent, context);
vm.runInContext(actionsContent, context); // Actions depend on logic/repo

// Export context for tests
const {
    MockSheet: MockSheetRef,
    MockSS: MockSSRef,
    // Logic
    getInventoryMap, processMarketData, calculatePortfolio, calculateLoans, normalizeTicker,
    LoanPosition, RiskCalculator, // New Logic
    ACT_BUY, ACT_SELL, TYPE_STOCK,
    // Actions
    getDashboardData, addTx, addLoan, processContractAction,
    // Repository
    SheetRepository, LogRepository, LoanRepository, LoanActionRepository,
    // Constants
    TAB_LOG, TAB_LOAN, TAB_LOAN_ACTIONS, TAB_MARKET
} = context;

module.exports = {
    context,
    // Mock classes for manual instantiation if needed
    MockSheet, MockSS,
    // Logic
    getInventoryMap, processMarketData, calculatePortfolio, calculateLoans, normalizeTicker,
    LoanPosition, RiskCalculator,
    ACT_BUY, ACT_SELL, TYPE_STOCK,
    // Actions
    getDashboardData, addTx, addLoan, processContractAction,
    // Repository
    SheetRepository, LogRepository, LoanRepository, LoanActionRepository,
    // Constants
    TAB_LOG, TAB_LOAN, TAB_LOAN_ACTIONS, TAB_MARKET
};
