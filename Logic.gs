/**
 * Logic.gs
 * 純業務邏輯層 (Pure Business Logic)
 * 
 * [Refactor Notes]:
 * 1. 移除所有 SpreadsheetApp 依賴
 * 2. 函式改為接收原始資料陣列 (Arrays/Objects)
 * 3. 方便單元測試與重複使用
 */

/**
 * 計算庫存地圖 (Inventory Map)
 * @param {Array[]} logRows - 交易紀錄陣列 (含 Header)
 * @param {Array[]} loanRows - 借貸紀錄陣列 (含 Header)
 * @returns {Object} { inventory: {Ticker: Qty} }
 */
function getInventoryMap(logRows, loanRows) {
  let holdings = {};
  let pledged = {};

  // 1. Process Transaction Logs
  // logRows: [Date, Type, Ticker, Cat, Qty, Price, Currency, Note]
  if (logRows && logRows.length > 1) {
    for (let i = 1; i < logRows.length; i++) {
      let r = logRows[i];
      let t = normalizeTicker(r[IDX_LOG_TICKER]);
      let type = r[IDX_LOG_TYPE];
      let qty = Number(r[IDX_LOG_QTY]);

      if (!t) continue;
      if (!holdings[t]) holdings[t] = 0;

      if (type === ACT_BUY || type === ACT_DIVIDEND) holdings[t] += qty;
      else if (type === ACT_SELL) holdings[t] -= qty;
    }
  }

  // 2. Process Loan Records (Pledged)
  // loanRows: [Source, Date, Amt, Rate, Col, Qty, Type, Warn, Liq, Note, ...] (Indices: 0..9)
  if (loanRows && loanRows.length > 1) {
    for (let i = 1; i < loanRows.length; i++) {
      let r = loanRows[i];
      if (!r[IDX_LOAN_SOURCE] || String(r[IDX_LOAN_NOTE]).includes('結清')) continue;
      let col = normalizeTicker(r[IDX_LOAN_COL]);
      let colQty = Number(r[IDX_LOAN_COL_QTY]);
      if (col) pledged[col] = (pledged[col] || 0) + colQty;
    }
  }

  // 3. Calculate Free Inventory
  let inventory = {};
  for (let t in holdings) {
    let free = holdings[t] - (pledged[t] || 0);
    if (free > 0.000001) inventory[t] = free;
  }
  return { inventory: inventory };
}

/**
 * 處理市場報價資料
 * @param {Array[]} marketRows - MarketData Sheet 內容
 * @returns {Object} { fx: Number, prices: {Ticker: Price} }
 */
function processMarketData(marketRows) {
  let fx = 32.5;
  let prices = {};

  if (marketRows && marketRows.length > 0) {
    // Row 1: USDTWD | 32.5 | ...
    let sheetFx = marketRows[0][1];
    if (sheetFx && !isNaN(sheetFx)) fx = Number(sheetFx);

    for (let i = 1; i < marketRows.length; i++) {
      let t = normalizeTicker(marketRows[i][0]);
      let p = marketRows[i][2];
      if (p === 'Loading...' || p === '#N/A' || p === '' || isNaN(p)) p = 0;
      if (t) prices[t] = Number(p);
    }
  }
  return { fx: fx, prices: prices };
}

/**
 * 計算投資組合損益
 * @param {Array[]} logRows - 交易紀錄
 * @param {Object} marketData - { fx, prices }
 * @param {Object} pledgedData - { Ticker: Qty }
 */
function calculatePortfolio(logRows, marketData, pledgedData) {
  let holdings = {};
  let knownTickers = {};

  if (logRows && logRows.length > 1) {
    for (let i = 1; i < logRows.length; i++) {
      let r = logRows[i];
      let type = r[IDX_LOG_TYPE], ticker = normalizeTicker(r[IDX_LOG_TICKER]), cat = r[IDX_LOG_CAT];
      if (ticker) knownTickers[ticker] = 1;

      let qty = Number(r[IDX_LOG_QTY]) || 0;
      let price = Number(r[IDX_LOG_PRICE]) || 0;
      let curr = r[IDX_LOG_CURRENCY];

      if (!holdings[ticker]) holdings[ticker] = { qty: 0, totalCost: 0, cat: cat, currency: curr };
      let h = holdings[ticker];

      if (type === ACT_BUY) { h.qty += qty; h.totalCost += (qty * price); }
      else if (type === ACT_DIVIDEND) { if (qty > 0) h.qty += qty; }
      else if (type === ACT_SELL) {
        if (h.qty > 0) {
          let avgCost = h.totalCost / h.qty;
          h.qty -= qty;
          h.totalCost -= (qty * avgCost);
        }
      }
    }
  }

  let list = [];
  let totalAssetsTWD = 0;
  let inventory = {};

  for (let t in holdings) {
    let h = holdings[t];
    if (h.qty <= 0.000001) continue;

    let locked = pledgedData ? (pledgedData[t] || 0) : 0;
    let freeQty = h.qty - locked;
    if (freeQty > 0.000001) inventory[t] = freeQty;

    let currentPrice = marketData.prices[t];
    if (h.cat === '現金') { currentPrice = 1; h.totalCost = h.qty; }
    else if (!currentPrice) { currentPrice = 0; }

    let isUsdAsset = (h.currency === 'USD' || h.cat === TYPE_CRYPTO || (h.cat === TYPE_STOCK && !/^[0-9]/.test(t)));
    let marketValue = h.qty * currentPrice;
    let avgCost = h.qty > 0 ? (h.totalCost / h.qty) : 0;
    let pnl = marketValue - h.totalCost;
    let roi = h.totalCost > 0 ? (pnl / h.totalCost) * 100 : 0;
    let marketValueTWD = marketValue * (isUsdAsset ? marketData.fx : 1);

    // TWD 現金特殊處理
    if (h.cat === '現金' && t === 'TWD') marketValueTWD = h.qty;

    totalAssetsTWD += marketValueTWD;

    list.push({
      ticker: t, cat: h.cat, qty: h.qty,
      avgCost: avgCost, marketPrice: currentPrice, marketValue: marketValue,
      pnl: pnl, roi: roi, isUsd: isUsdAsset, valTWD: marketValueTWD
    });
  }
  return { list: list, totalAssetsTWD: totalAssetsTWD, inventory: inventory, knownTickers: Object.keys(knownTickers) };
}

/**
 * 計算借貸風險與合約狀態
 * @param {Array[]} loanRows - 借貸紀錄
 * @param {Object} marketData - { fx, prices }
 */
function calculateLoans(loanRows, marketData) {
  let contracts = [], pledged = {}, totalDebtTWD = 0, riskMap = {};
  const now = new Date();

  if (loanRows && loanRows.length > 1) {
    for (let i = 1; i < loanRows.length; i++) {
      let r = loanRows[i];
      let src = r[IDX_LOAN_SOURCE];
      if (!src || String(r[IDX_LOAN_NOTE]).includes('結清')) continue;

      let rowIdx = i + 1;

      let date = new Date(r[IDX_LOAN_DATE]);
      let amt = Number(r[IDX_LOAN_AMT]) || 0;
      let rate = Number(r[IDX_LOAN_RATE]) || 0;
      let col = normalizeTicker(r[IDX_LOAN_COL]);
      let colQty = Number(r[IDX_LOAN_COL_QTY]) || 0;
      let type = r[IDX_LOAN_TYPE];
      let warn = Number(r[IDX_LOAN_WARN]); let liq = Number(r[IDX_LOAN_LIQ]);
      let totalTerm = Number(r[IDX_LOAN_TOTAL_TERM]) || 0; let paidTerm = Number(r[IDX_LOAN_PAID_TERM]) || 0; let monthlyPay = Number(r[IDX_LOAN_MONTHLY]) || 0;
      let loanCurr = (r.length >= 14 ? r[IDX_LOAN_CURRENCY] : 'TWD') || 'TWD';

      if (col) pledged[col] = (pledged[col] || 0) + colQty;

      let currentDebt = amt;
      let accruedInterest = 0;
      if (amt > 0) {
        let timeDiff = now.getTime() - date.getTime();
        let days = Math.floor(timeDiff / (1000 * 3600 * 24));
        if (days < 0) days = 0;
        accruedInterest = amt * (rate / 100) * (days / 365);
        if (loanCurr === 'TWD') accruedInterest = Math.round(accruedInterest);
        currentDebt = amt + accruedInterest;
      }

      let debtTWD = currentDebt * (loanCurr === 'USD' ? marketData.fx : 1);
      totalDebtTWD += debtTWD;

      let price = marketData.prices[col] || 0;
      let isUsd = (type === TYPE_CRYPTO || (type === TYPE_STOCK && !/^[0-9]/.test(col)));

      let colValTWD = colQty * price * (isUsd ? marketData.fx : 1);

      contracts.push({
        row: rowIdx, // Sheet Row Index (i=1 -> Row 2)
        // Wait, if I iterate from i=1 (2nd row of array), that corresponds to Row 2 in sheet.
        // So Array Index 1 == Sheet Row 2.
        // The formula should be: SheetRow = 1 + i.
        // Let's verify: i=0 is Header (Row 1). i=1 is Row 2.
        // Yes.
        source: src, date: date.toISOString().split('T')[0],
        debt: currentDebt, principal: amt, interest: accruedInterest,
        rate: rate, col: col, colQty: colQty, type: type, currency: loanCurr,
        totalTerm: totalTerm, paidTerm: paidTerm, monthlyPay: monthlyPay, note: r[9],
        warn: warn, liq: liq, colValTWD: colValTWD
      });

      if (!riskMap[src]) {
        riskMap[src] = {
          debtTWD: 0, colValTWD: 0, type: type, warn: warn, liq: liq,
          paidTerm: paidTerm, totalTerm: totalTerm
        };
      }
      riskMap[src].debtTWD += debtTWD;
      riskMap[src].colValTWD += colValTWD;
    }
  }

  let risks = [];
  for (let src in riskMap) {
    let r = riskMap[src];
    let ratio = 0, status = 'Safe', label = '';

    if (r.type === TYPE_STOCK) {
      label = '維持率';
      ratio = r.debtTWD > 0 ? (r.colValTWD / r.debtTWD * 100) : 999;
      if (ratio < r.liq) status = 'Danger'; else if (ratio < r.warn) status = 'Warning';
    }
    else if (r.type === TYPE_CRYPTO) {
      label = 'LTV';
      ratio = r.colValTWD > 0 ? (r.debtTWD / r.colValTWD * 100) : 0;
      if (ratio > r.liq) status = 'Danger'; else if (ratio > r.warn) status = 'Warning';
    }
    else {
      label = '無抵押'; ratio = 0; status = 'Info';
    }

    risks.push({
      source: src, type: r.type, label: label,
      ratio: (r.type === '信用貸款' || r.type === '卡費') ? '-' : ratio.toFixed(2),
      debtTWD: r.debtTWD, colValTWD: r.colValTWD, status: status,
      termInfo: (r.type === '信用貸款') ? `${r.paidTerm}/${r.totalTerm}` : ''
    });
  }

  return { contracts: contracts, risks: risks, totalDebtTWD: totalDebtTWD, pledged: pledged };
}

/**
 * 彙整財務摘要 (Financial Summary Aggregator)
 * @param {Number} totalAssets - 總資產
 * @param {Number} totalDebt - 總負債
 * @param {Number} prevClose - 昨日收盤淨值 (for daily change)
 * @returns {Object} { netWorth, totalAssets, totalDebt, dailyChange, currency }
 */
function calculateFinancialSummary(totalAssets, totalDebt, prevClose) {
  const safe = (n) => (isNaN(n) || n === null || n === undefined) ? 0 : Number(n);
  const assets = safe(totalAssets);
  const debt = safe(totalDebt);
  const netWorth = assets - debt;

  // Daily Change Logic
  const prev = safe(prevClose);
  let change = 0;
  if (prev !== 0) {
    change = netWorth - prev;
  }

  return {
    netWorth: netWorth,
    totalAssets: assets,
    totalDebt: debt,
    dailyChange: change,
    currency: 'TWD'
  };
}

/**
 * 彙整財務摘要 (Financial Summary Aggregator)
 * @param {Number} totalAssets - 總資產
 * @param {Number} totalDebt - 總負債
 * @param {Number} prevClose - 昨日收盤淨值 (for daily change)
 * @returns {Object} { netWorth, totalAssets, totalDebt, dailyChange, currency }
 */
function calculateFinancialSummary(totalAssets, totalDebt, prevClose) {
  const safe = (n) => (isNaN(n) || n === null || n === undefined) ? 0 : Number(n);
  const assets = safe(totalAssets);
  const debt = safe(totalDebt);
  const netWorth = assets - debt;

  // Daily Change Logic
  const prev = safe(prevClose);
  let change = 0;
  if (prev !== 0) {
    change = netWorth - prev;
  }

  return {
    netWorth: netWorth,
    totalAssets: assets,
    totalDebt: debt,
    dailyChange: change,
    currency: 'TWD'
  };
}

// 輔助函式需保留
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

// Export for Node.js Testing (Jest)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getInventoryMap,
    processMarketData,
    calculatePortfolio,
    calculateLoans,
    normalizeTicker,
    calculateFinancialSummary
  };
}
