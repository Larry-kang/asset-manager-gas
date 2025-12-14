/**
 * Actions.gs
 * 處理資料寫入與更新操作 (Write Operations)
 */

// --- Transaction Actions ---

function addTx(form) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(TAB_LOG);
  if (!sheet) throw new Error("Sheet not found: " + TAB_LOG);

  // Schema: [Date, Type, Ticker, Cat, Qty, Price, Currency, Note]
  const row = [
    new Date(form.date),
    form.type,
    normalizeTicker(form.ticker),
    form.cat,
    Number(form.qty),
    Number(form.price),
    form.currency,
    form.note || ''
  ];

  sheet.appendRow(row);
  return { success: true, message: `已新增 ${form.ticker} ${form.type}` };
}

// --- Loan Actions ---

function addLoan(form) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(TAB_LOAN);
  if (!sheet) throw new Error("Sheet not found: " + TAB_LOAN);

  // Schema: [Source, Date, Amt, Rate, Col, Qty, Type, Warn, Liq, Note, Term, PaidTerm, Monthly, Currency]
  // From JS State: { source, date, amount, rate, col, colQty, type, currency, warn, liq }
  const row = [
    form.source,
    new Date(form.date),
    Number(form.amount),
    Number(form.rate),
    normalizeTicker(form.col),
    Number(form.colQty),
    form.type,
    form.warn || '', // Warn (Col H)
    form.liq || '',  // Liq (Col I)
    form.fee ? `[開辦費: ${form.fee}]` : (form.note || ''), // Note
    form.period ? Number(form.period) : '', // Term
    0, // PaidTerm
    '', // Monthly
    form.currency
  ];

  sheet.appendRow(row);
  return { success: true, message: `已建立 ${form.source} 合約` };
}

function editLoan(form) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(TAB_LOAN);
  if (!sheet) throw new Error("Sheet not found: " + TAB_LOAN);

  // form: { row, amount, rate, warn, liq, ... }
  // Row Index comes from frontend (check if valid)
  const rowIdx = Number(form.row);
  if (rowIdx < 2) throw new Error("Invalid Row Index");

  // We only update specific columns to avoid breaking Source/Type consistency
  // Updating: Amt(Col 3), Rate(Col 4), Warn(Col 8), Liq(Col 9)
  // Also Col/Qty if needed (Col 5, 6)

  sheet.getRange(rowIdx, 3).setValue(Number(form.amount));
  sheet.getRange(rowIdx, 4).setValue(Number(form.rate));
  sheet.getRange(rowIdx, 8).setValue(form.warn || ''); // H
  sheet.getRange(rowIdx, 9).setValue(form.liq || '');  // I

  // Optional: Update Collateral if changed
  if (form.col) sheet.getRange(rowIdx, 5).setValue(normalizeTicker(form.col));
  if (form.colQty) sheet.getRange(rowIdx, 6).setValue(Number(form.colQty));

  return { success: true, message: '合約已更新' };
}

function processContractAction(form) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(TAB_LOAN);
  if (!sheet) throw new Error("Sheet not found: " + TAB_LOAN);

  // form: { row, type, val, price, ... }
  // Row Index in Sheet is form.row (assumed correct from frontend)
  const rowIdx = Number(form.row);
  if (rowIdx < 2) throw new Error("Invalid Row Index");

  const range = sheet.getRange(rowIdx, 1, 1, 14);
  const values = range.getValues()[0];

  // [Src, Date, Amt, Rate, Col, Qty, Type, Warn, Liq, Note, Term, Paid, Monthly, Curr]
  //   0     1    2     3    4    5     6     7     8     9    10    11     12      13

  let currentAmt = Number(values[2]);
  let currentCol = Number(values[5]);
  let currentNote = values[9] || '';

  const val = Number(form.val);
  const price = Number(form.price); // Usually for limit or record, maybe not used in updates directly

  if (form.type === 'repay') {
    currentAmt -= val;
    if (currentAmt <= 0) {
      currentAmt = 0;
      currentNote += ` [全額還款 ${new Date().toLocaleDateString()}]`;
    } else {
      currentNote += ` [還款 ${val} ${new Date().toLocaleDateString()}]`;
    }
    sheet.getRange(rowIdx, 3).setValue(currentAmt); // Update Amt
    sheet.getRange(rowIdx, 10).setValue(currentNote);

  } else if (form.type === 'increaseLoan') {
    currentAmt += val;
    let newRate = price; // If provided
    if (newRate > 0) sheet.getRange(rowIdx, 4).setValue(newRate);

    currentNote += ` [增貸 ${val} ${new Date().toLocaleDateString()}]`;
    sheet.getRange(rowIdx, 3).setValue(currentAmt);
    sheet.getRange(rowIdx, 10).setValue(currentNote);

  } else if (form.type === 'addCol') {
    currentCol += val;
    currentNote += ` [補倉 ${val} ${new Date().toLocaleDateString()}]`;
    sheet.getRange(rowIdx, 6).setValue(currentCol);
    sheet.getRange(rowIdx, 10).setValue(currentNote);
  }

  return { success: true, message: '操作已更新' };
}

function runSystemCheck() {
  return { success: true, message: '系統功能正常 (Backend Connected)' };
}

// Export for Node.js Testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    addTx,
    addLoan,
    editLoan,
    processContractAction,
    runSystemCheck
  };
}
