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
            // Auto-init removed from getter to keep it pure, handled by initSheet() explicitly
        }
        return this._sheet;
    }

    /**
     * 初始化或檢查 Sheet
     */
    initSheet() {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        let sheet = ss.getSheetByName(this.tabName);
        if (!sheet) {
            sheet = ss.insertSheet(this.tabName);
        }
        this._sheet = sheet;
        this.ensureHeader();
        return sheet;
    }

    /**
     * 確保標題列存在
     */
    ensureHeader() {
        if (this.sheet.getLastRow() === 0) {
            const header = Object.keys(this.schema).length > 0
                ? this._mapSchemaToHeader()
                : []; // Fallback for action logs
            if (header.length > 0) {
                this.sheet.appendRow(header);
            }
        }
    }

    _mapSchemaToHeader() {
        const maxIdx = Math.max(...Object.values(this.schema));
        const header = new Array(maxIdx).fill('');
        for (const [key, colIdx] of Object.entries(this.schema)) {
            header[colIdx - 1] = key;
        }
        return header;
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

    findByLoanId(loanId) {
        const all = this.findAll();
        return all.filter(row => row.LoanID === loanId);
    }
}

class SnapshotRepository extends SheetRepository {
    constructor() {
        const schema = {};
        ['Date', 'TotalAssetsTWD', 'TotalDebtTWD', 'NetWorthTWD', 'JSON'].forEach((v, i) => schema[v] = i + 1);
        super(TAB_HISTORY, schema);
    }
}

// --- Factory / Locator ---

const RepositoryFactory = {
    getLogRepo: () => new LogRepository(),
    getLoanRepo: () => new LoanRepository(),
    getLoanActionRepo: () => new LoanActionRepository(),
    getSnapshotRepo: () => new SnapshotRepository(),

    /**
     * 初始化所有必要的 Sheets
     */
    initAll: function () {
        this.getLogRepo().initSheet();
        this.getLoanRepo().initSheet();
        this.getLoanActionRepo().initSheet();
        this.getSnapshotRepo().initSheet();
    }
};

/*
 * 貸款流水紀錄 Repository (Event Sourcing)
 */
class LoanActionRepository extends SheetRepository {
    constructor() {
        const schema = {};
        ['Time', 'LoanID', 'Type', 'Protocol', 'Action', 'Asset', 'Amount', 'Note'].forEach((v, i) => schema[v] = i + 1);
        super(TAB_LOAN_ACTIONS, schema);
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
