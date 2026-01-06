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

  // 3. 每分鐘執行一發 Write-Behind Flush
  ScriptApp.newTrigger('trigger_WorkerFlush')
    .timeBased()
    .everyMinutes(1)
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

  // 1. Init GasStore
  GasStore.init({ sheet_name: DB_STORE_NAME, encryption_key: DB_ENCRYPTION_KEY, use_lock: false });

  // 2. Sync Market Data
  let result = syncMarketData(ss, true);
  let marketData = result.data;

  // 3. Prepare Data for Logic.gs (Replicating Code.gs logic)
  // Fetch Logs
  let logs = GasStore.get('DB:LOG', []);
  let logRows = [['Date', 'Type', 'Ticker', 'Cat', 'Qty', 'Price', 'Currency', 'Note']];
  logs.forEach(l => {
    logRows.push([l.date, l.type, l.ticker, l.cat, l.qty, l.price, l.currency, l.note]);
  });

  // Fetch Loans
  let loans = GasStore.get('DB:LOAN', []);
  let loanRows = [['Source', 'Date', 'Amt', 'Rate', 'Col', 'Qty', 'Type', 'Warn', 'Liq', 'Note']];
  loans.forEach(l => {
    loanRows.push([
      l.source, l.date, l.amount, l.rate, l.col, l.colQty, l.type, l.warn, l.liq, l.note,
      l.totalTerm, l.paidTerm, l.monthlyPay, l.currency
    ]);
  });

  // Pledged Data
  let pledged = {};
  loans.forEach(l => {
    if (l.col) pledged[l.col] = (pledged[l.col] || 0) + Number(l.colQty);
  });

  // 4. Calculate
  let portfolio = calculatePortfolio(logRows, marketData, pledged);
  let loanCalc = calculateLoans(loanRows, marketData);

  let netWorth = portfolio.totalAssetsTWD - loanCalc.totalDebtTWD;
  let totalAssets = portfolio.totalAssetsTWD;
  let totalDebt = loanCalc.totalDebtTWD;

  // 5. Take Snapshot
  SnapshotService.takeSnapshot({
    netWorthTWD: netWorth,
    totalAssetsTWD: totalAssets,
    totalDebtTWD: totalDebt,
    realizedPnLTWD: portfolio.realizedPnLTWD
  });

  // Flush GasStore
  GasStore.commit();
  console.log("排程執行: 資產快照完成 (SnapshotService)");
}

/**
 * [New] GasStore Worker Flush
 */
function trigger_WorkerFlush() {
  GasStore.init({ sheet_name: DB_STORE_NAME, encryption_key: DB_ENCRYPTION_KEY });
  GasStore.workerFlush();
}



