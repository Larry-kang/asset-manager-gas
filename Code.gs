// --- 設定區 & 常數定義 ---
// 已移至 Constants.gs


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
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// --- 資料存取層 (Data Access Layer) ---

function getSheetData(ss, tabName) {
  const sheet = ss.getSheetByName(tabName);
  if (!sheet) return [];
  // 假設第一列是 Header，如果有資料回傳二維陣列，否則回傳空陣列 (或僅Header)
  const lastRow = sheet.getLastRow();
  if (lastRow < 1) return [];

  // 為了效能，根據 Sheet 不同優化讀取範圍
  let numCols = sheet.getLastColumn();
  if (tabName === TAB_LOG) numCols = 8; // 固定讀取 8 欄
  else if (tabName === TAB_LOAN) numCols = 14;
  else if (tabName === TAB_MARKET) numCols = 4;

  if (numCols < 1) numCols = 1;
  return sheet.getRange(1, 1, lastRow, numCols).getValues();
}

function getHistoryData(ss) {
  let sheet = ss.getSheetByName(TAB_HISTORY);
  if (!sheet) return [];
  let lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  // Get last 30 days
  let startRow = Math.max(2, lastRow - 29);
  let data = sheet.getRange(startRow, 1, lastRow - startRow + 1, 2).getValues();
  return data.map(r => ({ date: r[0], val: Number(r[1]) }));
}

function getRecentTransactions(ss, limit = 10) {
  const s = ss.getSheetByName(TAB_LOG);
  if (!s || s.getLastRow() <= 1) return [];

  const lastRow = s.getLastRow();
  const startRow = Math.max(2, lastRow - limit + 1);
  const numRows = lastRow - startRow + 1;

  const data = s.getRange(startRow, 1, numRows, 8).getValues();

  let list = [];
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

// --- 作為 I/O 控制器的 Code.gs ---

function getDashboardData(forceRefresh) {
  let debugLog = [];
  try {
    debugLog.push("Start getDashboardData");
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) throw new Error("Cannot find active spreadsheet");

    // 1. Update Market Prices (Side Effect)
    let serverLogs = updateMarketPrices(ss, forceRefresh);
    debugLog.push("Market prices updated");

    // 2. Fetch All Data (IO)
    const logRows = getSheetData(ss, TAB_LOG);
    const loanRows = getSheetData(ss, TAB_LOAN);
    const marketRows = getSheetData(ss, TAB_MARKET);
    const historyData = getHistoryData(ss);
    const recentTx = getRecentTransactions(ss, 10);
    debugLog.push("Data fetched");

    // 3. Process Logic (Pure)
    let marketData = processMarketData(marketRows);
    let loanData = calculateLoans(loanRows, marketData);
    let portfolio = calculatePortfolio(logRows, marketData, loanData.pledged);

    debugLog.push("Logic processed");

    // 4. Transform Result
    const safeNum = (n) => (isNaN(n) || n === null || n === undefined) ? 0 : Number(n);
    const netWorth = safeNum(portfolio.totalAssetsTWD - loanData.totalDebtTWD);

    // --- Daily Change Logic ---
    const props = PropertiesService.getScriptProperties();
    const today = new Date().toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' });
    let lastDate = props.getProperty('LAST_DATE');
    let prevClose = parseFloat(props.getProperty('PREV_CLOSE') || 0);
    // If first time or new day, update reference
    if (lastDate !== today) {
      // If we have a stored current value from yesterday, that becomes today's previous close
      // If completely new, we might just use current net worth effectively 0 change, or wait for next update
      let lastKnown = parseFloat(props.getProperty('LAST_KNOWN_VAL') || netWorth);
      prevClose = lastKnown;
      props.setProperties({
        'LAST_DATE': today,
        'PREV_CLOSE': String(prevClose),
        'LAST_KNOWN_VAL': String(netWorth)
      });
    } else {
      // Update last known value for today
      props.setProperty('LAST_KNOWN_VAL', String(netWorth));
    }
    const dailyChange = netWorth - prevClose;
    // ---------------------------

    const result = {
      status: "success",
      fx: safeNum(marketData.fx),
      netWorthTWD: netWorth,
      dailyChange: dailyChange,
      totalAssetsTWD: safeNum(portfolio.totalAssetsTWD),
      totalDebtTWD: safeNum(loanData.totalDebtTWD),
      holdings: portfolio.list,
      contracts: loanData.contracts,
      risks: loanData.risks,
      inventory: portfolio.inventory,
      knownTickers: portfolio.knownTickers,
      history: historyData,
      recentTx: recentTx,
      logs: serverLogs,
      debug: debugLog
    };

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

// --- Market Data Updater (Side Effect) ---
// Moved from Logic.gs to here because it performs heavy I/O and sheet writes

function updateMarketPrices(ss, forceRefresh) {
  let logs = [];
  let sM = ss.getSheetByName(TAB_MARKET);
  if (!sM) {
    sM = ss.insertSheet(TAB_MARKET);
    sM.appendRow(['Ticker', 'Type', 'Price', 'LastUpd']);
    sM.getRange("A:A").setNumberFormat("@");
    sM.getRange('A1').setValue('USDTWD'); sM.getRange('B1').setValue(32.5); sM.hideSheet();
    logs.push("初始化 MarketData...");
  }
  sM.getRange("A:A").setNumberFormat("@");
  // Ensure FX Formula
  if (sM.getRange('A1').getValue() === 'USDTWD' && sM.getRange('B1').getFormula() === '') {
    try { sM.getRange('B1').setFormula('=GOOGLEFINANCE("CURRENCY:USDTWD")'); } catch (e) { }
  }

  // 收集需要更新的 Ticker
  let tickerMap = {};
  const sT = ss.getSheetByName(TAB_LOG);
  const sL = ss.getSheetByName(TAB_LOAN);

  const collect = (sheet, tickerCol, catCol) => {
    if (sheet && sheet.getLastRow() > 1) {
      let d = sheet.getDataRange().getValues();
      for (let i = 1; i < d.length; i++) {
        let t = normalizeTicker(d[i][tickerCol]);
        let c = d[i][catCol];
        if (t && t !== '現金' && t !== 'TWD' && t !== 'USD') {
          if (!tickerMap[t]) tickerMap[t] = c;
        }
      }
    }
  };
  collect(sT, 2, 3); collect(sL, 4, 6);

  // 讀取現有快取
  let mData = sM.getDataRange().getValues();
  let mRowMap = {}; let mCache = {};
  const CACHE_TIME = 15 * 60 * 1000; const now = new Date().getTime();
  for (let i = 1; i < mData.length; i++) {
    let t = normalizeTicker(mData[i][0]);
    mRowMap[t] = i + 1;
    let lastUpd = mData[i][3];
    if (lastUpd && (now - new Date(lastUpd).getTime() < CACHE_TIME)) mCache[t] = true;
  }

  // 執行更新
  for (let t in tickerMap) {
    // 若有快取且非強制更新，跳過 (但若是 0 或錯誤則重試)
    let currentPrice = (mRowMap[t] && mData[mRowMap[t] - 1][2]);
    if (!forceRefresh && mCache[t] && currentPrice > 0) continue;

    logs.push(`更新 ${t}`);
    let price = null; let category = tickerMap[t]; let type = 'Stock';

    if (category === '加密貨幣') {
      type = 'Crypto';
      price = fetchCryptoPrice(t, logs);
    } else {
      type = 'Stock';
      if (/^[0-9]+$/.test(t)) {
        price = fetchTwStockPrice(t, logs);
        if (!price) price = `=GOOGLEFINANCE("TPE:${t}")`;
      } else {
        price = `=GOOGLEFINANCE("${t}")`;
      }
    }

    if (price !== null) {
      let row = mRowMap[t];
      if (row) {
        sM.getRange(row, 2).setValue(type);
        sM.getRange(row, 3).setValue(price);
        sM.getRange(row, 4).setValue(new Date());
      } else {
        sM.appendRow([t, type, price, new Date()]);
        mRowMap[t] = sM.getLastRow();
      }
    }
  }
  return logs;
}

function fetchTwStockPrice(ticker, logs) {
  try {
    const url = `https://www.cnyes.com/twstock/${ticker}`;
    const res = UrlFetchApp.fetch(url, { 'muteHttpExceptions': true });
    if (res.getResponseCode() !== 200) return null;
    const match = res.getContentText().match(/<h3 class="[^"]*">([0-9,]+\.?[0-9]*)<\/h3>/);
    if (match && match[1]) return parseFloat(match[1].replace(/,/g, ''));
  } catch (e) { }
  return null;
}

function fetchCryptoPrice(ticker, logs) {
  try {
    const url = `https://api.binance.com/api/v3/ticker/price?symbol=${ticker.toUpperCase()}USDT`;
    const res = UrlFetchApp.fetch(url, { 'muteHttpExceptions': true });
    if (res.getResponseCode() === 200) {
      let json = JSON.parse(res.getContentText());
      if (json.price) return parseFloat(json.price);
    }
  } catch (e) { }

  try {
    const url = `https://cryptoprices.cc/${ticker.toUpperCase()}/`;
    const res = UrlFetchApp.fetch(url, { 'muteHttpExceptions': true });
    if (res.getResponseCode() === 200) {
      let p = parseFloat(res.getContentText());
      if (!isNaN(p)) return p;
    }
  } catch (e) { }
  return null;
}
