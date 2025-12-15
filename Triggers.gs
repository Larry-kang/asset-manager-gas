/**
 * 排程觸發器模組 (Triggers.gs)
 * 這裡集中管理所有需要自動執行的函式
 * 建議設定：
 * 1. trigger_UpdateMarketData -> 每小時執行一次 (更新市價)
 * 2. trigger_RecordDailyHistory -> 每天晚上執行一次 (紀錄資產)
 */

// --- 自動化排程設定 (可手動執行此函式來一鍵設定) ---
function setupTriggers() {
  // 清除現有觸發器以避免重複
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => ScriptApp.deleteTrigger(t));

  // 1. 每小時更新市價
  ScriptApp.newTrigger('trigger_UpdateMarketData')
    .timeBased()
    .everyHours(1)
    .create();

  // 2. 每天晚上 11 點紀錄資產淨值
  ScriptApp.newTrigger('trigger_RecordDailyHistory')
    .timeBased()
    .atHour(23)
    .everyDays(1)
    .create();

  Logger.log("? 排程設定完成");
}

// --- 排程執行函式 ---

function trigger_UpdateMarketData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  // 強制更新市價
  syncMarketData(ss, true);
  console.log("排程執行: 市價更新完成");
}

function trigger_RecordDailyHistory() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 先更新一次市價確保數據最新
  let result = syncMarketData(ss, true);
  let marketData = result.data;

  let loanData = calculateLoans(ss, marketData);
  let portfolio = calculatePortfolio(ss, marketData, loanData.pledged);

  let netWorth = portfolio.totalAssetsTWD - loanData.totalDebtTWD;
  let totalAssets = portfolio.totalAssetsTWD;
  let totalDebt = loanData.totalDebtTWD;

  let sheet = ss.getSheetByName(TAB_HISTORY);
  if (!sheet) {
    sheet = ss.insertSheet(TAB_HISTORY);
    sheet.appendRow(['日期', '淨資產', '總資產', '總負債']);
  }

  let today = new Date().toISOString().split('T')[0];
  // 檢查今天是否已經紀錄過，避免重複
  let lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    let lastDate = sheet.getRange(lastRow, 1).getValue();
    // 處理日期格式
    if (lastDate instanceof Date) {
      let offset = lastDate.getTimezoneOffset() * 60000;
      lastDate = new Date(lastDate.getTime() - offset).toISOString().split('T')[0];
    }

    if (lastDate === today) {
      // 更新今日數據
      sheet.getRange(lastRow, 2, 1, 3).setValues([[netWorth, totalAssets, totalDebt]]);
      console.log("排程執行: 更新今日資產紀錄");
      return;
    }
  }

  sheet.appendRow([today, netWorth, totalAssets, totalDebt]);
  console.log("排程執行: 新增今日資產紀錄");
}
