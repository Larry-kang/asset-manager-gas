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
const codeContent = fs.readFileSync(path.join(__dirname, '../Code.gs'), 'utf8').replace(/^\uFEFF/, '');
const logicContent = fs.readFileSync(path.join(__dirname, '../Logic.gs'), 'utf8').replace(/^\uFEFF/, '');
const repoContent = fs.readFileSync(path.join(__dirname, '../Repository.gs'), 'utf8').replace(/^\uFEFF/, '');
const actionsContent = fs.readFileSync(path.join(__dirname, '../Actions.gs'), 'utf8').replace(/^\uFEFF/, ''); // Actions depends on Logic/Repo
const constantsContent = fs.readFileSync(path.join(__dirname, '../Constants.gs'), 'utf8').replace(/^\uFEFF/, ''); // Load Constants
const gasStoreContent = fs.readFileSync(path.join(__dirname, '../GasStore.gs'), 'utf8').replace(/^\uFEFF/, ''); // Load GasStore

// 2. Mock GAS Environment
const MockSheet = class {
    constructor(name) {
        this.name = name;
        this.data = []; // 2D array
        this.lastRow = 0;
    }
    getName() { return this.name; }
    getLastRow() { return this.data.length; }
    getLastColumn() { return (this.data[0] || []).length; }
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
    CacheService: {
        getScriptCache: jest.fn(() => ({
            get: jest.fn(() => null),
            put: jest.fn(),
            remove: jest.fn()
        }))
    },
    mockSheets: {},
    console: console,
    exports: {},
    module: { exports: {} },
    MockSS: MockSS // Inject MockSS explicitely
};

vm.createContext(context);

// Include Constants first
// Convert 'const' to 'var' to ensure they attach to global context in VM
const constantsWithVar = constantsContent.replace(/const /g, 'var ');
vm.runInContext(constantsWithVar, context);

vm.runInContext(gasStoreContent, context); // GasStore first

// Explicitly export Classes from Logic.gs to Context
// Class declarations in VM might not automatically hoist to 'this'
// Explicitly export Classes from Logic.gs to Context
// Class declarations in VM might not automatically hoist to 'this'
const logicWithExports = logicContent;

vm.runInContext(logicWithExports, context);

// Run Code.gs in context
const codeWithExports = codeContent;
vm.runInContext(codeWithExports, context);

// Explicitly export Classes from Repository.gs to Context
const repoWithExports = repoContent +
    "\n; this.SheetRepository = SheetRepository; this.LogRepository = LogRepository; this.LoanRepository = LoanRepository; this.LoanActionRepository = LoanActionRepository;";
vm.runInContext(repoWithExports, context);
vm.runInContext(actionsContent, context); // Actions depend on logic/repo

// Export context for tests
const {
    MockSheet: MockSheetRef,
    MockSS: MockSSRef,
    // Logic
    getInventoryMap, processMarketData, calculatePortfolio, calculateLoans, normalizeTicker,
    // Actions
    getDashboardData, addTransaction, processLoanAction, processContractAction,
    // Repository
    SheetRepository, LogRepository, LoanRepository, LoanActionRepository,
    // Constants
    TAB_LOG, TAB_LOAN, TAB_LOAN_ACTIONS, TAB_MARKET, ACT_BUY, TYPE_STOCK
} = context;

module.exports = {
    context,
    // Mock classes
    MockSheet, MockSS,
    // Logic
    getInventoryMap, processMarketData, calculatePortfolio, calculateLoans, normalizeTicker,
    // Actions
    getDashboardData,
    addTx: addTransaction, // Alias
    addTransaction,
    processLoanAction, processContractAction,
    // Repository
    SheetRepository, LogRepository, LoanRepository, LoanActionRepository,
    // Constants
    TAB_LOG, TAB_LOAN, TAB_LOAN_ACTIONS, TAB_MARKET, ACT_BUY, TYPE_STOCK
};
