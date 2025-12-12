const fs = require('fs');
const path = require('path');
const vm = require('vm');

const context = vm.createContext({
    Logger: { log: jest.fn(msg => console.log('[GAS Log]', msg)) },
    Utilities: { formatDate: jest.fn((d) => new Date(d).toISOString()) },
    console: console
});

// Mock SpreadsheetApp
context.SpreadsheetApp = {
    getUi: jest.fn(),
    getActiveSpreadsheet: jest.fn()
};
context.HtmlService = {
    createTemplateFromFile: jest.fn(),
    createHtmlOutputFromFile: jest.fn(),
    XFrameOptionsMode: { ALLOWALL: 'ALLOWALL' }
};

/**
 * Reads file content
 */
function readFile(filename) {
    const filePath = path.join(__dirname, '..', filename);
    return fs.readFileSync(filePath, 'utf8');
}

// Concatenate files to ensure shared scope (mimic GAS)
console.log("Loading GAS files...");
const codeGS = readFile('Code.gs');
const logicGS = readFile('Logic.gs');

const combinedCode = codeGS + '\n' + logicGS;

vm.runInContext(combinedCode, context);

// Export functions for testing
module.exports = {
    getInventoryMap: context.getInventoryMap,
    processMarketData: context.processMarketData,
    calculatePortfolio: context.calculatePortfolio,
    calculateLoans: context.calculateLoans,
    normalizeTicker: context.normalizeTicker
};
