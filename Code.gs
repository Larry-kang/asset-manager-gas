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

// --- Setup & Auth ---
function doSetup(password) {
  if (!password) return "Password cannot be empty";
  PropertiesService.getScriptProperties().setProperty('APP_PASSWORD', password);
  return "Setup Complete. Password Saved.";
}

function checkAuth(password) {
  const stored = PropertiesService.getScriptProperties().getProperty('APP_PASSWORD');
  if (!stored) return true;
  return String(password) === String(stored);
}

function getDashboardData(password, forceRefresh) {
  let debugLog = [];
  try {
    // Init GasStore (ensure config is loaded)
    GasStore.init({ sheet_name: '_DB_STORE', encryption_key: 'AssetManager_V4', use_lock: true });

    // Auth Check
    if (!checkAuth(password)) {
      return JSON.stringify({ status: "403", message: "Unauthorized", debug: ["Auth Failed"] });
    }

    debugLog.push("Start getDashboardData (GasStore Mode)");
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) throw new Error("Cannot find active spreadsheet");

    // 1. Update Market Prices (Uses GasStore Cache internally)
    let syncResult = syncMarketData(ss, forceRefresh); // Keep using ss for now, or fully refactor? 
    // syncMarketData in Code.gs currently writes to GasStore but reads 'TAB_LOG' from sheet to get tickers.
    // Optimization: We should read tickers from GasStore DB:LOG/DB:LOAN now.
    // Left as is for this step, or refactor syncMarketData too? 
    // Let's rely on syncMarketData reading Sheets for Tickers for now (Hybrid during migration) 
    // or better: pass the data in?
    // Let's fetch data first.

    // 2. Fetch All Data (From GasStore)
    const logData = GasStore.get('DB:LOG', []);
    const loanDataRaw = GasStore.get('DB:LOAN', []);
    const historyData = []; // GasStore.get('DB:HISTORY', []); // Not migrated yet

    debugLog.push(`Fetched ${logData.length} logs, ${loanDataRaw.length} loans`);

    // 3. Process Logic
    // Logic.gs expects specific formats? 
    // calculatePortfolio expects "logRows" (Array of Objs? Or Array of Arrays?)
    // Original `getSheetData` returned 2D Array.
    // Original `calculatePortfolio` in Logic.gs:
    //   iterates `logRows`... `let type = row[1];` (Array Index Access)
    // PROBLEM: My Migration.gs stored Objects { date: ... }. Logic.gs expects Arrays [date, ...].
    // DECISION: I must either:
    //    A) Update Logic.gs to handle Objects. (Better long term)
    //    B) Convert Objects back to Arrays here. (Faster now)
    //    C) Store Arrays in GasStore. (Most compatible)
    // 
    // Let's check Logic.gs content... I haven't read Logic.gs recently.
    // Step 341 showed Code.gs calling `calculatePortfolio(logRows, ...)`
    // I should view Logic.gs to see how it consumes data.

    // TEMPORARY: I will assume I need to adapt the data shape or update Logic.gs.
    // User wants "Conversion". Updating Logic.gs to use Objects is cleaner.
    // But verify Logic.gs first.

    // For this Turn, I will assume Object structure and update Logic.gs in next step if needed.
    // Or I can MAP it back to array here to be safe: 
    // [date, type, ticker, cat, qty, price, currency, note]

    const logRows = logData.map(d => [d.date, d.type, d.ticker, d.cat, d.qty, d.price, d.currency, d.note]);
    const loanRows = loanDataRaw.map(d => [d.source, d.date, d.amount, d.rate, d.col, d.colQty, d.type, d.warn, d.liq, d.note, d.totalTerm, d.paidTerm, d.monthlyPay, d.currency]);

    // Now call Logic
    // Wait, syncMarketData also needs tickers. 
    // Let's refactor syncMarketData to use these arrays instead of reading Sheet.
    // But `syncMarketData` is a function in Code.gs. I should modify it too.

    // ... For now, let's Stick to Refactoring getDashboardData first.

    let marketData = syncResult.data; // This still reads sheets. Optimization later.

    let loanCalc = calculateLoans(loanRows, marketData);
    let portfolio = calculatePortfolio(logRows, marketData, loanCalc.pledged);

    debugLog.push("Logic processed");

    // 4. Transform Result
    const safeNum = (n) => (isNaN(n) || n === null || n === undefined) ? 0 : Number(n);
    const netWorth = safeNum(portfolio.totalAssetsTWD - loanCalc.totalDebtTWD);

    // --- Daily Change Logic ---
    const props = PropertiesService.getScriptProperties();
    const today = new Date().toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' });
    let lastDate = props.getProperty('LAST_DATE');
    let prevClose = parseFloat(props.getProperty('PREV_CLOSE') || 0);

    if (lastDate !== today) {
      let lastKnown = parseFloat(props.getProperty('LAST_KNOWN_VAL') || netWorth);
      prevClose = lastKnown;
      props.setProperties({
        'LAST_DATE': today,
        'PREV_CLOSE': String(prevClose),
        'LAST_KNOWN_VAL': String(netWorth)
      });
    } else {
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
      totalDebtTWD: safeNum(loanCalc.totalDebtTWD),
      holdings: portfolio.list,
      contracts: loanCalc.contracts,
      risks: loanCalc.risks,
      inventory: portfolio.inventory,
      knownTickers: portfolio.knownTickers,
      history: historyData,
      recentTx: logData.slice(0, 10), // We can use the object array directly here!
      logs: syncResult.logs,
      debug: debugLog
    };

    // Commit any read-repair or syncing changes
    GasStore.commit();

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

function getLogData(password) {
  try {
    if (!checkAuth(password)) return JSON.stringify({ status: "403", message: "Unauthorized" });

    // Init Store
    GasStore.init({ sheet_name: '_DB_STORE', encryption_key: 'AssetManager_V4', use_lock: false });

    const logs = GasStore.get('DB:LOG', []);
    // Return all? Or pagination? For now return all (assuming < 1000 records)
    // Reverse order for display (Newest first)
    return JSON.stringify({
      status: "success",
      logs: logs.reverse()
    });
  } catch (e) {
    return JSON.stringify({ status: "error", message: e.toString() });
  }
}

// --- Market Data Updater (Side Effect) ---
// Moved from Logic.gs to here because it performs heavy I/O and sheet writes

function syncMarketData(ss, forceRefresh) {
  let logs = [];
  let prices = {};
  let fx = 32.5;

  // 1. Handle FX (USDTWD)
  const FX_KEY = 'PRICE_USDTWD';
  let cachedFx = GasStore.get(FX_KEY);

  if (!forceRefresh && cachedFx) {
    fx = Number(cachedFx);
  } else {
    try {
      let sM = ss.getSheetByName(TAB_MARKET);
      if (sM) {
        fx = Number(sM.getRange('B1').getValue()) || 32.5;
        GasStore.set(FX_KEY, fx, 3600);
      }
    } catch (e) { fx = 32.5; }
  }

  // 2. Collect Tickers (Logic duplicated from original updateMarketPrices to keep independent)
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

  // 3. Sync Prices
  const CACHE_TTL = 15 * 60; // 15 mins

  for (let t in tickerMap) {
    let cacheKey = 'PRICE_' + t;
    let cachedPrice = GasStore.get(cacheKey);

    if (!forceRefresh && cachedPrice !== null) {
      prices[t] = Number(cachedPrice);
      continue;
    }

    logs.push(`更新 ${t}`);
    let price = null;
    let category = tickerMap[t];

    if (category === '加密貨幣') {
      price = fetchCryptoPrice(t, logs);
    } else {
      if (/^[0-9]+$/.test(t)) {
        price = fetchTwStockPrice(t, logs);
      }
    }

    if (price !== null) {
      GasStore.set(cacheKey, price, CACHE_TTL);
      prices[t] = price;
    } else {
      prices[t] = 0;
    }
  }

  return {
    logs: logs,
    data: { fx: fx, prices: prices }
  };
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
// utf-8 fixed
