function addTx(d) { let ss = SpreadsheetApp.getActiveSpreadsheet(); let s = ss.getSheetByName(TAB_LOG) || ss.insertSheet(TAB_LOG); if(s.getLastRow()===0) s.appendRow(['日期','動作','代號','類別','數量','單價','幣別','備註']); s.appendRow([d.date, d.type, "'"+normalizeTicker(d.ticker), d.cat, d.qty, d.price, d.currency, 'App']); return '交易紀錄新增成功'; }

function addLoan(d) { 
  let ss = SpreadsheetApp.getActiveSpreadsheet(); 
  let s = ss.getSheetByName(TAB_LOAN) || ss.insertSheet(TAB_LOAN); 
  if(s.getLastRow()===0) s.appendRow(['來源','日期','金額','利率','抵押品','數量','類別','告警線','清算線','備註','總期數','已還期數','月付金','幣別']); 
  let warn = 160, liq = 130; 
  if (d.type === '信用貸款' || d.type === '卡費') { warn = 0; liq = 0; } 
  // 修正：加密貨幣預設 80/90
  else if (d.type === '加密貨幣') { warn = 80; liq = 90; }
  
  let loanCurr = d.currency || 'TWD'; 
  
  if (d.type !== '信用貸款' && d.type !== '卡費') {
    let t = normalizeTicker(d.col);
    let q = Number(d.colQty);
    let invMap = getInventoryMap(ss);
    let free = invMap.inventory[t] || 0;
    if (q > free) return `錯誤：庫存不足！ ${t} 閒置庫存僅剩 ${free}`;
  }

  s.appendRow([d.source, d.date, d.amount, d.rate, "'"+normalizeTicker(d.col), d.colQty, d.type, warn, liq, 'App', d.totalTerm||0, 0, d.monthlyPay||0, loanCurr]); 
  return '合約建立成功'; 
}

function processContractAction(d) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sL = ss.getSheetByName(TAB_LOAN);
  const sT = ss.getSheetByName(TAB_LOG);
  
  let currentRowIdx = d.row ? Number(d.row) : null;
  let currentSource, currentRate, currentType, currentWarn, currentLiq, currentCurrency;
  let currentCol = '';
  let currentQty = 0;
  let currentAmt = 0;
  let accruedInterest = 0;

  if (currentRowIdx) {
     let maxCol = sL.getLastColumn();
     let readCols = maxCol < 14 ? 14 : maxCol;
     let data = sL.getRange(currentRowIdx, 1, 1, readCols).getValues()[0];
     currentSource = data[0];
     let currentDate = new Date(data[1]);
     currentAmt = Number(data[2]);
     currentRate = Number(data[3]);
     currentCol = normalizeTicker(data[4]);
     currentQty = Number(data[5]);
     currentType = data[6];
     currentWarn = data[7];
     currentLiq = data[8];
     currentCurrency = (data.length >= 14 ? data[13] : 'TWD') || 'TWD';
     
     let now = new Date();
     let timeDiff = now.getTime() - currentDate.getTime();
     let days = Math.floor(timeDiff / (1000 * 3600 * 24));
     if(days < 0) days = 0;
     accruedInterest = currentAmt * (currentRate/100) * (days/365);
     if(currentCurrency === 'TWD') accruedInterest = Math.round(accruedInterest);

  } else if (d.source) {
     currentSource = d.source;
     let rows = sL.getRange(2, 1, sL.getLastRow()-1, 14).getValues();
     for (let i = rows.length - 1; i >= 0; i--) {
       if (rows[i][0] === currentSource && !String(rows[i][9]).includes('結清')) {
         currentType = rows[i][6]; currentWarn = rows[i][7]; currentLiq = rows[i][8];
         currentCurrency = rows[i][13] || 'TWD'; currentRate = Number(rows[i][3]); break;
       }
     }
     if (!currentType) { currentType = '股票'; currentWarn = 160; currentLiq = 130; currentCurrency = 'TWD'; currentRate = 2.5; }
  }

  if (d.type === 'addCol') {
    let addQ = Number(d.val);
    let addTicker = normalizeTicker(d.addTicker); 
    let addRate = d.price ? Number(d.price) : currentRate; 

    let invMap = getInventoryMap(ss);
    let free = invMap.inventory[addTicker] || 0;
    if (addQ > free) return `錯誤：庫存不足！ ${addTicker} 閒置庫存僅剩 ${free}`;

    if (currentRowIdx && addTicker === currentCol && addRate === currentRate) {
      sL.getRange(currentRowIdx, 6).setValue(currentQty + addQ);
      return `已增加 ${addTicker} 抵押數量`;
    } else {
      sL.appendRow([currentSource, new Date().toISOString().split('T')[0], 0, addRate, "'" + addTicker, addQ, currentType, currentWarn, currentLiq, '補充抵押品', 0, 0, 0, currentCurrency]);
      return `已新增 ${addTicker} 作為補充抵押`;
    }
  }
  
  if (!currentRowIdx && d.type !== 'repay') return "錯誤：此操作需要指定合約";

  if (d.type === 'repay') {
    let repayTotal = Number(d.val);
    let targetSource = d.source || currentSource;
    let targetCol = d.col || currentCol;
    let logMsg = [];
    let rows = sL.getRange(2, 1, sL.getLastRow()-1, 14).getValues();
    let matches = [];
    rows.forEach((r, i) => {
      let src = r[0], col = normalizeTicker(r[4]), note = String(r[9]), amt = Number(r[2]);
      if (src === targetSource && col === targetCol && !note.includes('結清') && amt > 0) {
        matches.push({ idx: i + 2, date: new Date(r[1]), data: r });
      }
    });
    matches.sort((a, b) => a.date - b.date); 

    let remainingRepay = repayTotal;
    for (let m of matches) {
      if (remainingRepay <= 0) break;
      let r = m.data, amt = Number(r[2]), rate = Number(r[3]), currency = r[13] || 'TWD';
      let now = new Date(), timeDiff = now.getTime() - m.date.getTime(), days = Math.floor(timeDiff / (1000 * 3600 * 24));
      if(days < 0) days = 0;
      let interest = amt * (rate/100) * (days/365);
      if(currency === 'TWD') interest = Math.round(interest);
      let debtWithInterest = amt + interest;
      
      if (remainingRepay >= debtWithInterest) {
        sL.getRange(m.idx, 3).setValue(0);
        sL.getRange(m.idx, 10).setValue((r[9]||'') + ' [已結清]');
        remainingRepay -= debtWithInterest;
        logMsg.push(`單筆結清`);
      } else {
        let principalRepaid = 0;
        if (remainingRepay > interest) principalRepaid = remainingRepay - interest;
        else return `還款金額不足支付單筆利息 (${interest})`;
        let newAmt = amt - principalRepaid;
        sL.getRange(m.idx, 3).setValue(newAmt);
        sL.getRange(m.idx, 2).setValue(new Date()); 
        remainingRepay = 0;
        logMsg.push(`單筆餘額 ${newAmt}`);
      }
    }
    return `還款完成。${logMsg.join(', ')}`;
  } 
  
  else if (d.type === 'increaseLoan') {
    let addAmt = Number(d.val);
    let addRate = Number(d.price); 
    sL.appendRow([currentSource, new Date().toISOString().split('T')[0], addAmt, addRate, "'" + currentCol, 0, currentType, currentWarn, currentLiq, '增貸', 0, 0, 0, currentCurrency]);
    return `已針對 ${currentCol} 增貸 ${addAmt}`;
  }
  
  else if (d.type === 'payPeriod') {
    let data = sL.getRange(currentRowIdx, 1, 1, 13).getValues()[0];
    let total = Number(data[10]), paid = Number(data[11]), mPay = Number(data[12]);
    if (paid >= total && total > 0) return '已繳清所有期數';
    let mInt = currentAmt * (currentRate/100)/12;
    if(currentCurrency==='TWD') mInt = Math.round(mInt);
    let principal = mPay - mInt; if(principal < 0) principal = 0;
    let newAmt = currentAmt - principal;
    if (newAmt <= 0 || paid + 1 >= total) { sL.deleteRow(currentRowIdx); return `繳款完成，結清`; }
    else { sL.getRange(currentRowIdx, 3).setValue(newAmt); sL.getRange(currentRowIdx, 12).setValue(paid + 1); return `第 ${paid+1} 期繳款成功`; }
  }
  
  else if (d.type === 'sell') {
    let sellQty = Number(d.val);
    let repayAmt = Number(d.repayAmt); 
    if (repayAmt <= accruedInterest) return `還款金額不足支付利息`;
    let principalRepaid = repayAmt - accruedInterest;
    let newAmt = currentAmt - principalRepaid;
    sL.getRange(currentRowIdx, 6).setValue(currentQty - sellQty);
    if (newAmt <= 0) sL.deleteRow(currentRowIdx); else { sL.getRange(currentRowIdx, 3).setValue(newAmt); sL.getRange(currentRowIdx, 2).setValue(new Date()); }
    if (sT) sT.appendRow([new Date(), '賣出', "'" + currentCol, '賣出還款', sellQty, Number(d.price), currentCurrency, '借貸操作-賣股還款']);
    return `已賣出並還款`;
  }
}

function deleteTx(row) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s = ss.getSheetByName(TAB_LOG);
  if (s && row > 1 && row <= s.getLastRow()) {
    s.deleteRow(row);
    return '交易已刪除';
  }
  return '刪除失敗：無效的行號';
}

function editTx(d) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s = ss.getSheetByName(TAB_LOG);
  let row = Number(d.row);
  if (s && row > 1 && row <= s.getLastRow()) {
    // Columns: Date, Type, Ticker, Cat, Qty, Price, Currency, Note
    s.getRange(row, 1, 1, 8).setValues([[d.date, d.type, "'"+normalizeTicker(d.ticker), d.cat, d.qty, d.price, d.currency, 'App(Edit)']]);
    return '交易已更新';
  }
  return '更新失敗：無效的行號';
}
