function getInventoryMap(ss) {
  const sT = ss.getSheetByName(TAB_LOG);
  const sL = ss.getSheetByName(TAB_LOAN);
  let holdings = {}; let pledged = {};
  
  if(sT && sT.getLastRow() > 1) {
    const rows = sT.getRange(2, 1, sT.getLastRow()-1, 8).getValues();
    rows.forEach(r => {
      let t = normalizeTicker(r[2]), type = r[1], qty = Number(r[4]);
      if (!holdings[t]) holdings[t] = 0;
      if (type === ACT_BUY || type === ACT_DIVIDEND) holdings[t] += qty;
      else if (type === ACT_SELL) holdings[t] -= qty;
    });
  }
  
  if(sL && sL.getLastRow() > 1) {
    let maxCol = sL.getLastColumn(); let readCols = maxCol < 6 ? 6 : maxCol;
    const rows = sL.getRange(2, 1, sL.getLastRow()-1, readCols).getValues();
    rows.forEach(r => {
      if (!r[0] || String(r[9]).includes('結清')) return;
      let col = normalizeTicker(r[4]), colQty = Number(r[5]);
      pledged[col] = (pledged[col] || 0) + colQty;
    });
  }
  
  let inventory = {};
  for(let t in holdings) {
    let free = holdings[t] - (pledged[t] || 0);
    if(free > 0.000001) inventory[t] = free;
  }
  return { inventory: inventory };
}

function getMarketData(ss) {
  const sheetM = ss.getSheetByName(TAB_MARKET);
  let fx = 32.5; 
  let prices = {};
  if(sheetM) {
    const data = sheetM.getDataRange().getValues();
    let sheetFx = data[0][1]; 
    if (sheetFx && !isNaN(sheetFx)) fx = Number(sheetFx);
    for(let i=1; i<data.length; i++) {
      let t = normalizeTicker(data[i][0]);
      let p = data[i][2];
      if (p === 'Loading...' || p === '#N/A' || p === '' || isNaN(p)) p = 0;
      prices[t] = Number(p);
    }
  }
  return { fx: fx, prices: prices };
}

function calculatePortfolio(ss, marketData, pledgedData) {
  const sheetT = ss.getSheetByName(TAB_LOG);
  let holdings = {};
  let knownTickers = {}; // Use object as Set polyfill for safety or just simple obj
  
  if(sheetT && sheetT.getLastRow() > 1) {
    const rows = sheetT.getRange(2, 1, sheetT.getLastRow()-1, 8).getValues();
    rows.forEach(r => {
      let type = r[1], ticker = normalizeTicker(r[2]), cat = r[3];
      if(ticker) knownTickers[ticker] = 1;
      let qty = Number(r[4]) || 0, price = Number(r[5]) || 0, curr = r[6];
      if (!holdings[ticker]) holdings[ticker] = { qty: 0, totalCost: 0, cat: cat, currency: curr };
      let h = holdings[ticker];
      if (type === '買入') { h.qty += qty; h.totalCost += (qty * price); } 
      else if (type === '配息') { if(qty > 0) h.qty += qty; } 
      else if (type === '賣出') { if (h.qty > 0) { let avgCost = h.totalCost / h.qty; h.qty -= qty; h.totalCost -= (qty * avgCost); } }
    });
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

    let isUsdAsset = (h.currency === 'USD' || h.cat === '加密貨幣' || (h.cat === '股票' && !/^[0-9]/.test(t)));
    let marketValue = h.qty * currentPrice; 
    let avgCost = h.qty > 0 ? (h.totalCost / h.qty) : 0;
    let pnl = marketValue - h.totalCost;
    let roi = h.totalCost > 0 ? (pnl / h.totalCost) * 100 : 0;
    let marketValueTWD = marketValue * (isUsdAsset ? marketData.fx : 1);
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

function calculateLoans(ss, marketData) {
  const sheetL = ss.getSheetByName(TAB_LOAN);
  let contracts = [], pledged = {}, totalDebtTWD = 0, riskMap = {}; 

  if(sheetL && sheetL.getLastRow() > 1) {
    const now = new Date();
    // 讀取範圍擴大到 14 欄
    let maxCol = sheetL.getLastColumn();
    let readCols = maxCol < 14 ? 14 : maxCol;
    const rows = sheetL.getRange(2, 1, sheetL.getLastRow()-1, readCols).getValues();
    
    rows.forEach((r, i) => {
      let src = r[0];
      if (!src || String(r[9]).includes('結清')) return;

      let rowIdx = i + 2;
      let date = new Date(r[1]);
      let amt = Number(r[2]) || 0;
      let rate = Number(r[3]) || 0;
      let col = normalizeTicker(r[4]);
      let colQty = Number(r[5]) || 0;
      let type = r[6];
      let warn = Number(r[7]); let liq = Number(r[8]);
      let totalTerm = Number(r[10])||0; let paidTerm = Number(r[11])||0; let monthlyPay = Number(r[12])||0;
      let loanCurr = (r.length >= 14 ? r[13] : 'TWD') || 'TWD';

      pledged[col] = (pledged[col] || 0) + colQty;

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
      let isUsd = (type === '加密貨幣' || (type === '股票' && !/^[0-9]/.test(col)));
      let colValTWD = colQty * price * (isUsd ? marketData.fx : 1);

      contracts.push({
        row: rowIdx, source: src, date: date.toISOString().split('T')[0],
        debt: currentDebt, principal: amt, interest: accruedInterest, 
        rate: rate, col: col, colQty: colQty, type: type, currency: loanCurr,
        totalTerm: totalTerm, paidTerm: paidTerm, monthlyPay: monthlyPay, note: r[9],
        warn: warn, liq: liq, colValTWD: colValTWD
      });
      
      if (!riskMap[src]) {
        riskMap[src] = {
          debtTWD: 0, colValTWD: 0, type: type, warn: warn, liq: liq,
          paidTerm: paidTerm, totalTerm: totalTerm // 關鍵修正：補回期數
        };
      }
      riskMap[src].debtTWD += debtTWD;
      riskMap[src].colValTWD += colValTWD;
    });
  }

  let risks = [];
  for (let src in riskMap) {
    let r = riskMap[src];
    let ratio = 0, status = 'Safe', label = '';

    if (r.type === '股票') {
      label = '維持率';
      ratio = r.debtTWD > 0 ? (r.colValTWD / r.debtTWD * 100) : 999;
      if (ratio < r.liq) status = 'Danger'; else if (ratio < r.warn) status = 'Warning';
    } 
    else if (r.type === '加密貨幣') {
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

function getHistoryData(ss) {
  let sheet = ss.getSheetByName(TAB_HISTORY);
  if (!sheet) return [];
  let lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  // Get last 30 days to avoid too much data
  let startRow = Math.max(2, lastRow - 29);
  let data = sheet.getRange(startRow, 1, lastRow - startRow + 1, 2).getValues(); // Date and NetWorth
  return data.map(r => ({ date: r[0], val: Number(r[1]) }));
}

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
  try { sM.getRange('B1').setFormula('=GOOGLEFINANCE("CURRENCY:USDTWD")'); } catch (e) {}

  let tickerMap = {}; 
  const sT = ss.getSheetByName(TAB_LOG);
  const sL = ss.getSheetByName(TAB_LOAN);
  const collect = (sheet, tickerCol, catCol) => {
    if(sheet && sheet.getLastRow() > 1) {
      let d = sheet.getDataRange().getValues(); 
      for(let i=1; i<d.length; i++) {
        let t = normalizeTicker(d[i][tickerCol]);
        let c = d[i][catCol]; 
        if(t && t !== '現金' && t !== 'TWD' && t !== 'USD') {
          if (!tickerMap[t]) tickerMap[t] = c;
        }
      }
    }
  };
  collect(sT, 2, 3); collect(sL, 4, 6); 

  let mData = sM.getDataRange().getValues();
  let mRowMap = {}; let mCache = {}; 
  const CACHE_TIME = 15 * 60 * 1000; const now = new Date().getTime();
  for(let i=1; i<mData.length; i++) {
    let t = normalizeTicker(mData[i][0]);
    mRowMap[t] = i + 1;
    let lastUpd = mData[i][3];
    if (lastUpd && (now - new Date(lastUpd).getTime() < CACHE_TIME)) mCache[t] = true; 
  }

  for (let t in tickerMap) {
    let currentPrice = (mRowMap[t] && mData[mRowMap[t]-1][2]);
    if (!forceRefresh && mCache[t] && currentPrice > 0) continue;
    logs.push(`更新 ${t}`);
    let price = null; let category = tickerMap[t]; let type = 'Stock'; 
    if (category === '加密貨幣') { type = 'Crypto'; price = fetchCryptoPrice(t, logs); } 
    else { type = 'Stock'; if (/^[0-9]+$/.test(t)) { price = fetchTwStockPrice(t, logs); if (!price) price = `=GOOGLEFINANCE("TPE:${t}")`; } else { price = `=GOOGLEFINANCE("${t}")`; } }
    if (price !== null) {
      let row = mRowMap[t];
      if (row) { sM.getRange(row, 2).setValue(type); sM.getRange(row, 3).setValue(price); sM.getRange(row, 4).setValue(new Date()); } 
      else { sM.appendRow([t, type, price, new Date()]); mRowMap[t] = sM.getLastRow(); }
    }
  }
  return logs;
}
function fetchTwStockPrice(ticker, logs) {
  try { const url = `https://www.cnyes.com/twstock/${ticker}`; const res = UrlFetchApp.fetch(url, {'muteHttpExceptions': true}); if (res.getResponseCode() !== 200) return null; const match = res.getContentText().match(/<h3 class="[^"]*">([0-9,]+\.?[0-9]*)<\/h3>/); if (match && match[1]) return parseFloat(match[1].replace(/,/g, '')); } catch(e) { } return null;
}
function fetchCryptoPrice(ticker, logs) {
  try { const url = `https://api.binance.com/api/v3/ticker/price?symbol=${ticker.toUpperCase()}USDT`; const res = UrlFetchApp.fetch(url, {'muteHttpExceptions': true}); if (res.getResponseCode() === 200) { let json = JSON.parse(res.getContentText()); if (json.price) return parseFloat(json.price); } } catch (e) {}
  try { const url = `https://cryptoprices.cc/${ticker.toUpperCase()}/`; const res = UrlFetchApp.fetch(url, {'muteHttpExceptions': true}); if (res.getResponseCode() === 200) { let p = parseFloat(res.getContentText()); if (!isNaN(p)) return p; } } catch (e) {} return null;
}


