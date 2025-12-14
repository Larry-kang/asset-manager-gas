/**
 * Repository.gs
 * 資料存取層 (Data Access Layer)
 * 
 * 職責：
 * 1. 封裝所有 SpreadsheetApp 的呼叫
 * 2. 管理 Sheet 的 Schema 與欄位映射
 * 3. 提供具類型的資料物件 (DTO)
 */

// --- Base Repository ---

class SheetRepository {
  /**
   * @param {string} tabName - Sheet 名稱
   * @param {Object} schema - 欄位定義 { KEY: Index } (0-based for array mapping, 1-based for Sheet)
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
   * 讀取所有資料 (排除 Header)
   * @returns {Array<Object>} 轉換後的物件陣列
   */
  findAll() {
    const lastRow = this.sheet.getLastRow();
    if (lastRow <= 1) return [];

    const numCols = this.sheet.getLastColumn();
    // 假設 Header 佔用 1 列
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

// --- Testing / Debugging ---
function testRepository() {
  const repo = RepositoryFactory.getLogRepo();
  const data = repo.findAll();
  Logger.log(`Found ${data.length} records in Log.`);
  if (data.length > 0) {
    Logger.log("First Record: " + JSON.stringify(data[0]));
  }
}
