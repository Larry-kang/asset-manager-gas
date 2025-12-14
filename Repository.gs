/**
 * Repository.gs
 * ��Ʀs���h (Data Access Layer)
 * 
 * ¾�d�G
 * 1. �ʸ˩Ҧ� SpreadsheetApp ���I�s
 * 2. �޲z Sheet �� Schema �P���M�g
 * 3. ���Ѩ���������ƪ��� (DTO)
 */

// --- Base Repository ---

class SheetRepository {
  /**
   * @param {string} tabName - Sheet �W��
   * @param {Object} schema - ���w�q { KEY: Index } (0-based for array mapping, 1-based for Sheet)
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
    // ���] Header ���� 1 �C
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

// --- Testing / Debugging ---
function testRepository() {
  const repo = RepositoryFactory.getLogRepo();
  const data = repo.findAll();
  Logger.log(`Found ${data.length} records in Log.`);
  if (data.length > 0) {
    Logger.log("First Record: " + JSON.stringify(data[0]));
  }
}
// utf-8 fixed
