/**
 * Repository.gs
 * ��Ʀs���h (Data Access Layer)
 *
 * ¾�d:
 * 1. �ʸ� SpreadsheetApp ���I�s
 * 2. �޲z Sheet �� Schema �P����
 * 3. ���Ѫ���ɦV (DTO) ����Ʀs��
 */

// --- Base Repository ---

class SheetRepository {
    /**
     * @param {string} tabName - Sheet �W��
     * @param {Object} schema - �w�q { KEY: Index } (0-based for array mapping, 1-based for Sheet)
     */
    constructor(tabName, schema) {
        this.tabName = tabName;
        this.schema = schema;
        this._sheet = null;
    }

    get sheet() {
        if (!this._sheet) {
            const ss = SpreadsheetApp.getActiveSpreadsheet();
            this._sheet = ss.getSheetByName(this.tabName);
            if (!this._sheet) throw new Error(`Sheet not found: ${this.tabName}`);
        }
        return this._sheet;
    }

    /**
     * Ū���Ҧ���� (�ư� Header)
     * @returns {Array<Object>} �ഫ�᪺����}�C
     */
    findAll() {
        const lastRow = this.sheet.getLastRow();
        if (lastRow <= 1) return [];

        const numCols = this.sheet.getLastColumn();
        // �ư� Header �q�� 2 ��}�l
        const data = this.sheet.getRange(2, 1, lastRow - 1, numCols).getValues();

        return data.map((row, index) => this._mapRowToEntity(row, index + 2));
    }

    /**
     * �N Row Array �ഫ�� Entity Object
     */
    _mapRowToEntity(row, rowNum) {
        const entity = { _row: rowNum };
        for (const [key, colIdx] of Object.entries(this.schema)) {
            // colIdx is 1-based column index. Array index is colIdx - 1.
            entity[key] = row[colIdx - 1];
        }
        return entity;
    }
}

// --- Specific Repositories ---

const SCHEMA_LOG = {
    date: 1,      // A
    type: 2,      // B
    ticker: 3,    // C
    cat: 4,       // D
    qty: 5,       // E
    price: 6,     // F
    currency: 7,  // G
    note: 8       // H
};

class LogRepository extends SheetRepository {
    constructor() {
        super(TAB_LOG, SCHEMA_LOG);
    }

    findByTicker(ticker) {
        const all = this.findAll();
        return all.filter(item => item.ticker === ticker);
    }
}

const SCHEMA_LOAN = {
    source: 1,
    date: 2,
    amount: 3,
    rate: 4,
    collateral: 5,
    colQty: 6,
    type: 7,
    warn: 8,
    liq: 9,
    note: 10,
    totalTerm: 11,
    paidTerm: 12,
    monthlyPay: 13,
    currency: 14
};

class LoanRepository extends SheetRepository {
    constructor() {
        super(TAB_LOAN, SCHEMA_LOAN);
    }
}

// --- Factory / Locator ---

const RepositoryFactory = {
    getLogRepo: () => new LogRepository(),
    getLoanRepo: () => new LoanRepository()
};

/*
 * �ɶU�y���b Repository (Event Sourcing)
 */
class LoanActionRepository extends SheetRepository {
    constructor() {
        super(TAB_LOAN_ACTIONS);
    }

    // �T�O Header �s�b
    _ensureHeader(sheet) {
        if (sheet.getLastRow() === 0) {
            sheet.appendRow(['Time', 'LoanID', 'Type', 'Protocol', 'Action', 'Asset', 'Amount', 'Note']);
        }
    }

    appendAction(action) {
        // action: { loanId, type, protocol, actionStr, asset, amount, note }
        const time = new Date();
        this.append([
            time,
            action.loanId,
            action.type, // e.g., 'Stock', 'Crypto'
            action.protocol, // e.g., 'Sinopac', 'AAVE'
            action.actionStr, // 'OPEN', 'BORROW', 'SUPPLY', 'REPAY'
            action.asset,
            action.amount,
            action.note || ''
        ]);
    }

    findByLoanId(loanId) {
        const all = this.findAll();
        return all.filter(row => row.LoanID === loanId);
    }
}

// --- Testing / Debugging ---
function testRepository() {
    const repo = RepositoryFactory.getLogRepo();
    const data = repo.findAll();
    Logger.log(`Found ${data.length} records in Log.`);
    if (data.length > 0) {
        Logger.log("First Record: " + JSON.stringify(data[0]));
    }
}



