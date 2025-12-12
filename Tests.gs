/**
 * 測試模組 (Tests.gs)
 * 用於驗證系統核心功能是否正常
 * 執行 runSystemCheck() 即可進行自我檢測
 */

function runSystemCheck() {
  let report = [];
  report.push("=== 資產管家 系統自我檢測報告 ===");
  report.push("時間: " + new Date().toLocaleString());
  report.push("--------------------------------");
  
  // 1. 基礎函數測試
  report.push(test_Helpers());
  
  // 2. 資料讀取測試 (Smoke Test)
  report.push(test_LogicRead());
  
  // 3. 整合測試 (模擬前端呼叫)
  report.push(test_Integration());

  // 4. 排程函數測試
  report.push(test_Triggers());

  let finalReport = report.join('\n');
  Logger.log(finalReport);
  
  // 如果是在試算表介面執行，顯示結果
  try {
    SpreadsheetApp.getUi().alert(finalReport);
  } catch(e) {
    console.log("非 UI 環境執行，請查看 Logger");
  }
  
  return finalReport;
}

function test_Helpers() {
  try {
    // 測試 normalizeTicker
    let res = normalizeTicker('2330');
    if (res !== '2330') throw new Error('normalizeTicker 數字補零失敗');
    
    res = normalizeTicker('aapl');
    if (res !== 'AAPL') throw new Error('normalizeTicker 大寫轉換失敗');
    
    res = normalizeTicker('  tsm  ');
    if (res !== 'TSM') throw new Error('normalizeTicker 去除空白失敗');

    return "? [基礎函數] 通過";
  } catch (e) {
    return "? [基礎函數] 失敗: " + e.message;
  }
}

function test_LogicRead() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) throw new Error('找不到試算表 (請在 GAS 環境執行)');

    // 測試 MarketData
    let m = getMarketData(ss);
    if (typeof m.fx !== 'number') throw new Error('MarketData: 匯率讀取異常');
    if (!m.prices) throw new Error('MarketData: 價格列表遺失');
    
    // 測試 Inventory
    let inv = getInventoryMap(ss);
    if (!inv.inventory) throw new Error('Inventory: 庫存結構異常');
    
    // 測試 Loans
    let loans = calculateLoans(ss, m);
    if (!Array.isArray(loans.contracts)) throw new Error('Loans: 合約列表異常');
    if (!Array.isArray(loans.risks)) throw new Error('Loans: 風險列表異常');
    
    // 測試 Portfolio
    let p = calculatePortfolio(ss, m, loans.pledged);
    if (!Array.isArray(p.list)) throw new Error('Portfolio: 資產列表異常');
    if (typeof p.totalAssetsTWD !== 'number') throw new Error('Portfolio: 總資產計算異常');
    if (!Array.isArray(p.knownTickers)) throw new Error('Portfolio: 歷史代號列表異常');

    // 測試 Recent Transactions
    let recent = getRecentTransactions(ss, 5);
    if (!Array.isArray(recent)) throw new Error('RecentTx: 近期交易列表異常');
    
    return "? [核心邏輯] 通過";
  } catch (e) {
    return "? [核心邏輯] 失敗: " + e.message;
  }
}

function test_Integration() {
  try {
    // 模擬前端呼叫 getDashboardData
    // 注意: 這裡傳入 false 以避免觸發耗時的網路爬蟲更新
    let jsonString = getDashboardData(false); 
    let data = JSON.parse(jsonString);
    
    if (data.status === 'error') throw new Error(data.message);

    let requiredKeys = ['fx', 'netWorthTWD', 'totalAssetsTWD', 'totalDebtTWD', 'holdings', 'contracts', 'risks', 'knownTickers', 'recentTx'];
    let missing = [];
    
    requiredKeys.forEach(k => {
      if (!data.hasOwnProperty(k)) missing.push(k);
    });
    
    if (missing.length > 0) throw new Error('getDashboardData 回傳缺漏欄位: ' + missing.join(', '));
    
    return "? [整合介面] 通過";
  } catch (e) {
    return "? [整合介面] 失敗: " + e.message;
  }
}

function test_Triggers() {
  try {
    // 測試排程函數是否能正常執行不報錯
    // 1. 測試市價更新
    trigger_UpdateMarketData();
    
    // 2. 測試歷史紀錄 (這會寫入一行今天的資料，或更新它)
    trigger_RecordDailyHistory();
    
    return "? [排程函數] 通過";
  } catch (e) {
    return "? [排程函數] 失敗: " + e.message;
  }
}
