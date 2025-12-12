// --- 設定區 ---
const TAB_LOG = '交易紀錄';
const TAB_LOAN = '借貸紀錄';
const TAB_MARKET = 'MarketData';
const TAB_HISTORY = '資產歷程';

// --- 常數定義 (Backend) ---
const TYPE_STOCK = '股票';
const TYPE_CRYPTO = '加密貨幣';
const TYPE_CASH = '現金';
const TYPE_CREDIT = '信用貸款';
const TYPE_CARD = '卡費';

const ACT_BUY = '買入';
const ACT_SELL = '賣出';
const ACT_DIVIDEND = '配息';

function onOpen() {
  SpreadsheetApp.getUi()
      .createMenu('資產管家')
      .addItem('執行系統檢查', 'runSystemCheck')
      .addToUi();
}

function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('資產管家 v3.0.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename)
      .getContent();
}

// --- 核心邏輯 ---

function normalizeTicker(t) {
  if (!t) return '';
  t = String(t).toUpperCase().trim();
  if (/^[0-9]+$/.test(t)) {
    if (t.length >= 4) return t;
    if (t.length <= 2) return t.padStart(4, '0');
    if (t.length === 3) return t.padStart(5, '0');
  }
  return t;
}

function getDashboardData(forceRefresh) {
  let debugLog = [];
  try {
    debugLog.push("Start getDashboardData");
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) throw new Error("Cannot find active spreadsheet");
    debugLog.push("SS found: " + ss.getName());

    let serverLogs = updateMarketPrices(ss, forceRefresh); 
    debugLog.push("Market prices updated");
    
    let marketData = getMarketData(ss);
    if (!marketData) {
      debugLog.push("MarketData null, using default");
      marketData = { fx: 32.5, prices: {} };
    }
    debugLog.push("MarketData ok");

    let loanData = calculateLoans(ss, marketData);
    debugLog.push("Loans calculated");

    let portfolio = calculatePortfolio(ss, marketData, loanData.pledged);
    debugLog.push("Portfolio calculated");

    let history = getHistoryData(ss);
    debugLog.push("History fetched");
    
    let recentTx = getRecentTransactions(ss, 10);
    debugLog.push("Recent Tx fetched");

    const safeNum = (n) => (isNaN(n) || n === null || n === undefined) ? 0 : Number(n);

    const result = {
      status: "success",
      fx: safeNum(marketData.fx),
      netWorthTWD: safeNum(portfolio.totalAssetsTWD - loanData.totalDebtTWD),
      totalAssetsTWD: safeNum(portfolio.totalAssetsTWD),
      totalDebtTWD: safeNum(loanData.totalDebtTWD),
      holdings: portfolio.list,
      contracts: loanData.contracts,
      risks: loanData.risks,
      inventory: portfolio.inventory,
      knownTickers: portfolio.knownTickers,
      history: history,
      recentTx: recentTx,
      logs: serverLogs,
      debug: debugLog
    };

    // 使用 JSON.stringify 避免 google.script.run 的序列化問題
    return JSON.stringify(result);

  } catch (e) {
    Logger.log("getDashboardData Error: " + e.toString());
    return JSON.stringify({
      status: "error",
      message: e.toString(),
      stack: e.stack,
      debug: debugLog
    });
  }
}

function getRecentTransactions(ss, limit=10) {
  const s = ss.getSheetByName(TAB_LOG);
  if (!s || s.getLastRow() <= 1) return [];
  
  const lastRow = s.getLastRow();
  const startRow = Math.max(2, lastRow - limit + 1);
  const numRows = lastRow - startRow + 1;
  
  // Columns: Date, Type, Ticker, Cat, Qty, Price, Currency, Note
  // Indices: 0     1     2       3    4    5      6         7
  const data = s.getRange(startRow, 1, numRows, 8).getValues();
  
  let list = [];
  // Iterate in reverse order (newest first)
  for (let i = data.length - 1; i >= 0; i--) {
    let r = data[i];
    list.push({
      row: startRow + i,
      date: r[0],
      type: r[1],
      ticker: normalizeTicker(r[2]),
      cat: r[3],
      qty: r[4],
      price: r[5],
      currency: r[6],
      note: r[7]
    });
  }
  return list;
}
