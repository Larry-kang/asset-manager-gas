/**
 * Actions.gs
 * 負責處理所有的寫入操作 (Create/Update/Delete)
 * 包含交易紀錄與借貸合約的異動
 * 
 * [Refactor Notes]:
 * 1. 引入 LockService 防止並發寫入衝突
 * 2. 統一回傳格式為 { success: boolean, message: string }
 * 3. 配合 Logic.gs 重構，先讀取資料再呼叫 getInventoryMap
 */

function withLock(callback) {
  const lock = LockService.getScriptLock();
  try {
    // 嘗試獲取鎖定，最多等待 10 秒
    const success = lock.tryLock(10000);
    if (!success) {
      return { success: false, message: "系統忙碌中，請稍後再試 (Lock Timeout)" };
    }
    // 執行業務邏輯
    const resultMsg = callback();
    return { success: true, message: resultMsg };

  } catch (e) {
    Logger.log("Action Error: " + e.toString());
    return { success: false, message: "執行錯誤: " + e.toString() };
  } finally {
    lock.releaseLock();
  }
}

function addTx(d) {
  return withLock(() => {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let s = ss.getSheetByName(TAB_LOG) || ss.insertSheet(TAB_LOG);
    if (s.getLastRow() === 0) s.appendRow(['日期', '動作', '代號', '類別', '數量', '單價', '幣別', '備註']);

    // 強制型別轉換與格式化
    const ticker = "'" + normalizeTicker(d.ticker);
    s.appendRow([d.date, d.type, ticker, d.cat, d.qty, d.price, d.currency, 'App']);
    return '交易紀錄新增成功';
  });
}

function addLoan(d) {
  return withLock(() => {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let s = ss.getSheetByName(TAB_LOAN) || ss.insertSheet(TAB_LOAN);
    if (s.getLastRow() === 0) s.appendRow(['來源', '日期', '金額', '利率', '抵押品', '數量', '類別', '告警線', '清算線', '備註', '總期數', '已還期數', '月付金', '幣別']);

    let warn = 160, liq = 130;
    if (d.type === '信用貸款' || d.type === '卡費') { warn = 0; liq = 0; }
    else if (d.type === '加密貨幣') { warn = 80; liq = 90; }

    let loanCurr = d.currency || 'TWD';

    // 庫存檢核
    if (d.type !== '信用貸款' && d.type !== '卡費') {
      let t = normalizeTicker(d.col);
      let q = Number(d.colQty);

      const logRows = ss.getSheetByName(TAB_LOG).getDataRange().getValues();
      const loanRows = ss.getSheetByName(TAB_LOAN).getDataRange().getValues();
      let invMap = getInventoryMap(logRows, loanRows);

      let free = invMap.inventory[t] || 0;
      if (q > free) throw new Error(`庫存不足！ ${t} 閒置庫存僅剩 ${free}`);
    }

    s.appendRow([d.source, d.date, d.amount, d.rate, "'" + normalizeTicker(d.col), d.colQty, d.type, warn, liq, 'App', d.totalTerm || 0, 0, d.monthlyPay || 0, loanCurr]);
    return '合約建立成功';
  });
}

function processContractAction(d) {
  return withLock(() => {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sL = ss.getSheetByName(TAB_LOAN);
    const sT = ss.getSheetByName(TAB_LOG);

    let currentRowIdx = d.row ? Number(d.row) : null;
    let currentSource, currentRate, currentType, currentWarn, currentLiq, currentCurrency;
    let currentCol = '';
    let currentQty = 0;
    let currentAmt = 0;
    let accruedInterest = 0;

    // --- 若有 Row ID，讀取該列詳細資訊 ---
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
      if (days < 0) days = 0;
      accruedInterest = currentAmt * (currentRate / 100) * (days / 365);
      if (currentCurrency === 'TWD') accruedInterest = Math.round(accruedInterest);

    } else if (d.source) {
      // --- 針對來源的聚合操作 (如還款) ---
      currentSource = d.source;
      // 簡易查找預設值 (非精確)
      let rows = sL.getRange(2, 1, sL.getLastRow() - 1, 14).getValues();
      for (let i = rows.length - 1; i >= 0; i--) {
        if (rows[i][0] === currentSource && !String(rows[i][9]).includes('結清')) {
          currentType = rows[i][6]; currentWarn = rows[i][7]; currentLiq = rows[i][8];
          currentCurrency = rows[i][13] || 'TWD'; currentRate = Number(rows[i][3]); break;
        }
      }
      if (!currentType) { currentType = '股票'; currentWarn = 160; currentLiq = 130; currentCurrency = 'TWD'; currentRate = 2.5; }
    }

    // --- Action: 補抵押 (Add Collateral) ---
    if (d.type === 'addCol') {
      let addQ = Number(d.val);
      let addTicker = normalizeTicker(d.addTicker);
      let addRate = d.price ? Number(d.price) : currentRate;

      const logRows = ss.getSheetByName(TAB_LOG).getDataRange().getValues();
      const loanRows = ss.getSheetByName(TAB_LOAN).getDataRange().getValues();
      let invMap = getInventoryMap(logRows, loanRows);

      let free = invMap.inventory[addTicker] || 0;
      if (addQ > free) throw new Error(`庫存不足！ ${addTicker} 閒置庫存僅剩 ${free}`);

      if (currentRowIdx && addTicker === currentCol && addRate === currentRate) {
        sL.getRange(currentRowIdx, 6).setValue(currentQty + addQ);
        return `已增加 ${addTicker} 抵押數量`;
      } else {
        sL.appendRow([currentSource, new Date().toISOString().split('T')[0], 0, addRate, "'" + addTicker, addQ, currentType, currentWarn, currentLiq, '補充抵押品', 0, 0, 0, currentCurrency]);
        return `已新增 ${addTicker} 作為補充抵押`;
      }
    }

    if (!currentRowIdx && d.type !== 'repay') throw new Error("此操作需要指定合約");

    // --- Action: 還款 (Repay) ---
    if (d.type === 'repay') {
      let repayTotal = Number(d.val);
      let targetSource = d.source || currentSource;
      let targetCol = d.col || currentCol;
      let logMsg = [];
      let rows = sL.getRange(2, 1, sL.getLastRow() - 1, 14).getValues();
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
        if (days < 0) days = 0;
        let interest = amt * (rate / 100) * (days / 365);
        if (currency === 'TWD') interest = Math.round(interest);
        let debtWithInterest = amt + interest;

        if (remainingRepay >= debtWithInterest) {
          sL.getRange(m.idx, 3).setValue(0);
          sL.getRange(m.idx, 10).setValue((r[9] || '') + ' [已結清]');
          remainingRepay -= debtWithInterest;
          logMsg.push(`單筆結清`);
        } else {
          let principalRepaid = 0;
          if (remainingRepay > interest) principalRepaid = remainingRepay - interest;
          else throw new Error(`還款金額不足支付單筆利息 (${interest})`);
          let newAmt = amt - principalRepaid;
          sL.getRange(m.idx, 3).setValue(newAmt);
          sL.getRange(m.idx, 2).setValue(new Date());
          remainingRepay = 0;
          logMsg.push(`單筆餘額 ${newAmt}`);
        }
      }
      return `還款完成。${logMsg.join(', ')}`;
    }

    // --- Action: 增貸 (Increase Loan) ---
    else if (d.type === 'increaseLoan') {
      let addAmt = Number(d.val);
      let addRate = Number(d.price);
      sL.appendRow([currentSource, new Date().toISOString().split('T')[0], addAmt, addRate, "'" + currentCol, 0, currentType, currentWarn, currentLiq, '增貸', 0, 0, 0, currentCurrency]);
      return `已針對 ${currentCol} 增貸 ${addAmt}`;
    }

    // --- Action: 繳款 (Pay Period) ---
    else if (d.type === 'payPeriod') {
      let data = sL.getRange(currentRowIdx, 1, 1, 13).getValues()[0];
      let total = Number(data[10]), paid = Number(data[11]), mPay = Number(data[12]);
      if (paid >= total && total > 0) return '已繳清所有期數';
      let mInt = currentAmt * (currentRate / 100) / 12;
      if (currentCurrency === 'TWD') mInt = Math.round(mInt);
      let principal = mPay - mInt; if (principal < 0) principal = 0;
      let newAmt = currentAmt - principal;
      if (newAmt <= 0 || paid + 1 >= total) { sL.deleteRow(currentRowIdx); return `繳款完成，結清`; }
      else { sL.getRange(currentRowIdx, 3).setValue(newAmt); sL.getRange(currentRowIdx, 12).setValue(paid + 1); return `第 ${paid + 1} 期繳款成功`; }
    }

    // --- Action: 賣出還款 (Sell) ---
    else if (d.type === 'sell') {
      let sellQty = Number(d.val);
      let repayAmt = Number(d.repayAmt);
      if (repayAmt <= accruedInterest) throw new Error(`還款金額不足支付利息`);
      let principalRepaid = repayAmt - accruedInterest;
      let newAmt = currentAmt - principalRepaid;
      sL.getRange(currentRowIdx, 6).setValue(currentQty - sellQty);
      if (newAmt <= 0) sL.deleteRow(currentRowIdx); else { sL.getRange(currentRowIdx, 3).setValue(newAmt); sL.getRange(currentRowIdx, 2).setValue(new Date()); }
      if (sT) sT.appendRow([new Date(), '賣出', "'" + currentCol, '賣出還款', sellQty, Number(d.price), currentCurrency, '借貸操作-賣股還款']);
      return `已賣出並還款`;
    }

    return "無效的操作";
  });
}

function deleteTx(row) {
  return withLock(() => {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const s = ss.getSheetByName(TAB_LOG);
    if (s && row > 1 && row <= s.getLastRow()) {
      s.deleteRow(row);
      return '交易已刪除';
    }
    throw new Error('刪除失敗：無效的行號');
  });
}

function editTx(d) {
  return withLock(() => {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const s = ss.getSheetByName(TAB_LOG);
    let row = Number(d.row);
    if (s && row > 1 && row <= s.getLastRow()) {
      // Columns: Date, Type, Ticker, Cat, Qty, Price, Currency, Note
      s.getRange(row, 1, 1, 8).setValues([[d.date, d.type, "'" + normalizeTicker(d.ticker), d.cat, d.qty, d.price, d.currency, 'App(Edit)']]);
      return '交易已更新';
    }
    throw new Error('更新失敗：無效的行號');
  });
}
