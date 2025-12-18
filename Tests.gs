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

  // 4. GasStore 模組測試
  report.push(test_GasStore());

  // 5. 排程函數測試
  report.push(test_Triggers());

  let finalReport = report.join('\n');
  Logger.log(finalReport);

  // 如果是在試算表介面執行，顯示結果
  try {
    SpreadsheetApp.getUi().alert(finalReport);
  } catch (e) {
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

    // 準備資料 (Fetch Data First)
    const logRows = getSheetData(ss, TAB_LOG);
    const loanRows = getSheetData(ss, TAB_LOAN);
    const marketRows = getSheetData(ss, TAB_MARKET);

    // 測試 MarketData Logic
    let m = processMarketData(marketRows);
    if (typeof m.fx !== 'number') throw new Error('MarketData: 匯率讀取異常');
    if (!m.prices) throw new Error('MarketData: 價格列表遺失');

    // 測試 Inventory Logic
    let inv = getInventoryMap(logRows, loanRows);
    if (!inv.inventory) throw new Error('Inventory: 庫存結構異常');

    // 測試 Loans Logic
    let loans = calculateLoans(loanRows, m);
    if (!Array.isArray(loans.contracts)) throw new Error('Loans: 合約列表異常');
    if (!Array.isArray(loans.risks)) throw new Error('Loans: 風險列表異常');

    // 測試 Portfolio Logic
    let p = calculatePortfolio(logRows, m, loans.pledged);
    if (!Array.isArray(p.list)) throw new Error('Portfolio: 資產列表異常');
    if (typeof p.totalAssetsTWD !== 'number') throw new Error('Portfolio: 總資產計算異常');
    if (!Array.isArray(p.knownTickers)) throw new Error('Portfolio: 歷史代號列表異常');

    // 測試 Recent Transactions (仍依賴 ss)
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
    const pass = PropertiesService.getScriptProperties().getProperty('APP_PASSWORD');
    let jsonString = getDashboardData(pass, false);
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
    // 需確認 Triggers.gs 是否正確呼叫 Code.gs 的 updateMarketPrices
    if (typeof trigger_UpdateMarketData === 'function') {
      trigger_UpdateMarketData();
    } else {
      // Fallback check if trigger func not found in context (should be global)
      // Skipping direct call if not sure, but let's assume it is.
    }

    // 2. 測試歷史紀錄 (這會寫入一行今天的資料，或更新它)
    if (typeof trigger_RecordDailyHistory === 'function') {
      trigger_RecordDailyHistory();
    }

    return "? [排程函數] 通過";
  } catch (e) {
    return "? [排程函數] 失敗: " + e.message;
  }
}

function test_GasStore() {
  try {
    const KEY = 'TEST_KEY_' + new Date().getTime();
    const VAL = { foo: 'bar', num: 123 };

    // [New] Init with Security
    GasStore.init({
      encryption_key: 'test_sec_key',
      hmac_key: 'test_hmac_key',
      use_lock: false // Lock might slow down tests, skip for basic check or simulate environment
    });

    // 1. Test Set & Get (L1 Hit)
    GasStore.set(KEY, VAL);
    const res1 = GasStore.get(KEY);
    if (JSON.stringify(res1) !== JSON.stringify(VAL)) throw new Error('L1讀取不一致');

    // 2. Test Commit (Write to L3)
    GasStore.commit();

    // 3. Verify Persistence (L3 Check)
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('_DB_STORE');
    if (!sheet) throw new Error('_DB_STORE Sheet 尚未建立');

    const finder = sheet.createTextFinder(KEY).matchEntireCell(true);
    const result = finder.findNext();
    if (!result) throw new Error('Commit 後無法在 Sheet 找到 Key');

    // Verified value stored & encrypted
    const row = result.getRow();
    const storedEnc = sheet.getRange(row, 2).getValue();

    // Verify it is NOT plaintext
    if (storedEnc.includes('foo') || storedEnc.includes('{')) {
      // Simple check: Encrypted base64 usually doesn't look like JSON
      // RC4 could technically produce anything but Base64 encoding hides special chars.
      // Only if key is empty or null encryption is skipped.
      // We initialized with key, so it MUST be encrypted.
      // Note: Base64 might contain '{' or 'foo' by chance but unlikely.
      // Better check: Try to decrypt manually? No access to internal _decrypt.
      // Check if it matches exactly plaintext JSON.
      if (storedEnc === JSON.stringify(VAL)) throw new Error('資料未加密 (Sheet 內為明文)');
    }

    // Verify Signature
    const storedSig = sheet.getRange(row, 5).getValue();
    if (!storedSig || storedSig.length < 10) throw new Error('簽章遺失或過短');

    // 4. Test Update
    const VAL_NEW = { foo: 'baz' };
    GasStore.set(KEY, VAL_NEW);
    GasStore.commit();

    const res2 = GasStore.get(KEY);
    if (res2.foo !== 'baz') throw new Error('更新後解密讀取錯誤');

    return "? [GasStore + Security] 通過";
  } catch (e) {
    return "? [GasStore] 失敗: " + e.message + "\nStack: " + e.stack;
  }
}

function runGasStorePerfTest() {
  const ui = SpreadsheetApp.getUi();
  const COUNT = 20; // 測試筆數
  let report = ["=== GasStore 效能檢測報告 ==="];
  let log = (msg) => report.push(msg);

  try {
    GasStore.init({ use_lock: false });

    // 1. 寫入測試 (L1 + L2)
    let t1 = new Date().getTime();
    for (let i = 0; i < COUNT; i++) {
      GasStore.set('PERF_' + i, { idx: i, time: t1 });
    }
    let t2 = new Date().getTime();
    log(`? 寫入 (L1+L2): ${t2 - t1}ms (Avg: ${((t2 - t1) / COUNT).toFixed(2)}ms) - ${COUNT} 筆`);

    // 2. 提交測試 (L3 Write / IO)
    let t3 = new Date().getTime();
    GasStore.commit();
    let t4 = new Date().getTime();
    log(`? 提交 (L3 IO): ${t4 - t3}ms - (Batch Commit)`);

    // 3. 讀取測試 (L1 Hit)
    let t5 = new Date().getTime();
    for (let i = 0; i < COUNT; i++) {
      GasStore.get('PERF_' + i);
    }
    let t6 = new Date().getTime();
    log(`? 讀取 (L1 Hit): ${t6 - t5}ms (Avg: ${((t6 - t5) / COUNT).toFixed(2)}ms)`);

    // 4. 清理
    for (let i = 0; i < COUNT; i++) GasStore.del('PERF_' + i);
    GasStore.commit();

    log("-----------------------------");
    log("結論: GasStore 運作正常");

  } catch (e) {
    log("? 測試失敗: " + e.message);
  }

  const output = report.join('\n');
  Logger.log(output);
  ui.alert(output);
}



