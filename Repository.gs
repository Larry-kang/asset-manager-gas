/**
 * Repository.gs
 * 資料持久化層 (Data Access Layer)
 *
 * 職責:
 * 1. 封裝 SpreadsheetApp 的底層呼叫
 * 2. 管理 Sheet 的 Schema 與對應
 * 3. 提供物件導向 (DTO) 的資料存取介面
 */

// --- Base Repository ---

class SheetRepository {
    /**
     * @param {string} tabName - Sheet 名稱
     * @param {Object} schema - 定義 { KEY: Index } (0-based 陣列映射)
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
     * 讀取所有資料 (跳過 Header)
     * @returns {Array<Object>} 轉換後的物件陣列
     */
    findAll() {
        const lastRow = this.sheet.getLastRow();
        if (lastRow <= 1) return [];

        const numCols = this.sheet.getLastColumn();
        // 跳過 Header 從第 2 行開始
        const data = this.sheet.getRange(2, 1, lastRow - 1, numCols).getValues();

        return data.map((row, index) => this._mapRowToEntity(row, index + 2));
    }

    /**
     * 將 Row Array 轉換為 Entity Object
     */
    _mapRowToEntity(row, rowNum) {
        const entity = { _row: rowNum };
        for (const [key, colIdx] of Object.entries(this.schema)) {
            // colIdx is 1-based column index. Array index is colIdx - 1.
            entity[key] = row[colIdx - 1];
        }
        return entity;
    }

    /**
     * 新增資料
     * @param {Object} entity 
     */
    append(entity) {
        const row = this._mapEntityToRow(entity);
        this.sheet.appendRow(row);
    }

    /**
     * 更新資料
     * @param {Object} entity - 必須包含 _row 屬性
     */
    update(entity) {
        if (!entity._row) throw new Error("Entity must have _row for update");
        const row = this._mapEntityToRow(entity);
        // DB_SCHEMA keys map to columns. 
        // We need to write specifically to the columns defined in schema.
        // Simplified: Overwrite the whole row range defined by schema.
        const numCols = Object.keys(this.schema).length; // Check if schema covers all columns?
        // Actually, schema map keys to 1-based index. 
        // Max index is:
        const maxIdx = Math.max(...Object.values(this.schema));

        // Write cell by cell or range? Range is better.
        // row is array [col1, col2, ...]. 
        // Caveat: _mapEntityToRow needs to return array with correct order.
        this.sheet.getRange(entity._row, 1, 1, row.length).setValues([row]);
    }

    _mapEntityToRow(entity) {
        // Find max column index
        const maxIdx = Math.max(...Object.values(this.schema));
        const row = new Array(maxIdx).fill('');

        for (const [key, colIdx] of Object.entries(this.schema)) {
            if (entity[key] !== undefined) {
                row[colIdx - 1] = entity[key];
            }
        }
        return row;
    }
}

// --- Specific Repositories ---

// --- Specific Repositories ---

class LogRepository extends SheetRepository {
    constructor() {
        // Map DB_SCHEMA.Transactions array to object { Key: Index (1-based) }
        const schema = {};
        DB_SCHEMA.Transactions.forEach((col, i) => schema[col] = i + 1);
        super(TAB_LOG, schema);
    }

    findByTicker(ticker) {
        const all = this.findAll();
        // Adjust property case if needed, or keep upper as per DB_SCHEMA
        return all.filter(item => item.Ticker === ticker);
    }
}

class LoanRepository extends SheetRepository {
    constructor() {
        const schema = {};
        DB_SCHEMA.Vault.forEach((col, i) => schema[col] = i + 1);
        super(TAB_LOAN, schema);
    }
}

// --- Factory / Locator ---

const RepositoryFactory = {
    getLogRepo: () => new LogRepository(),
    getLoanRepo: () => new LoanRepository()
};

/*
 * 貸款流水紀錄 Repository (Event Sourcing)
 */
class LoanActionRepository extends SheetRepository {
    constructor() {
        super(TAB_LOAN_ACTIONS);
    }

    // 確保 Header 存在
    _ensureHeader(sheet) {
        if (sheet.getLastRow() === 0) {
            sheet.appendRow(['Time', 'LoanID', 'Type', 'Protocol', 'Action', 'Asset', 'Amount', 'Note']);
        }
    }

    appendAction(action) {
        // action: { loanId, type, protocol, actionStr, asset, amount, note }
        const time = new Date();
        this.sheet.appendRow([
            time,
            action.loanId,
            action.type,
            action.protocol,
            action.actionStr,
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
