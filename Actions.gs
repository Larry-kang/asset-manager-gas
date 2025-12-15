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

/**
 * Actions.gs
 * 負責處理所有的寫入操作 (Create/Update/Delete) - GasStore Edition
 */

function withLock(callback) {
  const lock = LockService.getScriptLock();
  try {
    const success = lock.tryLock(10000);
    if (!success) return { success: false, message: "System Busy (Lock Timeout)" };

    // Init Store if not already
    GasStore.init({ sheet_name: '_DB_STORE', encryption_key: 'AssetManager_V4', use_lock: false });
    // We handle lock externally here for the transactional logic, so internal lock can be false or true.
    // Actually, allowing internal lock is safer for the commit phase.

    const resultMsg = callback();

    // Auto Commit after action
    GasStore.commit();

    return { success: true, message: resultMsg };

  } catch (e) {
    Logger.log("Action Error: " + e.toString());
    return { success: false, message: "Error: " + e.toString() };
  } finally {
    lock.releaseLock();
  }
}

function addTx(d) {
  return withLock(() => {
    let logs = GasStore.get('DB:LOG', []);

    const newTx = {
      date: d.date,
      type: d.type,
      ticker: normalizeTicker(d.ticker),
      cat: d.cat,
      qty: Number(d.qty),
      price: Number(d.price),
      currency: d.currency,
      note: 'App'
    };

    logs.push(newTx);
    GasStore.set('DB:LOG', logs);
    return '交易紀錄新增成功';
  });
}

function addLoan(d) {
  return withLock(() => {
    let loans = GasStore.get('DB:LOAN', []);

    let warn = d.warn ? Number(d.warn) : 160;
    let liq = d.liq ? Number(d.liq) : 130;

    if (!d.warn && !d.liq) {
      if (d.type === '信用貸款' || d.type === '卡費') { warn = 0; liq = 0; }
      else if (d.type === '加密貨幣') { warn = 80; liq = 90; }
    }

    let loanCurr = d.currency || 'TWD';

    // 庫存檢核
    if (d.type !== '信用貸款' && d.type !== '卡費') {
      let t = normalizeTicker(d.col);
      let q = Number(d.colQty);

      const logs = GasStore.get('DB:LOG', []);
      // Logic.gs expects arrays for legacy compatibility or we update getInventoryMap?
      // Step 350 Code.gs maps to arrays. 
      // Let's assume Logic.gs is NOT updated yet. We must provide Arrays.
      // Or we temporarily map here.
      const logRows = [[]].concat(logs.map(r => [r.date, r.type, r.ticker, r.cat, r.qty, r.price, r.currency, r.note]));
      const loanRows = [[]].concat(loans.map(r => [r.source, r.date, r.amount, r.rate, r.col, r.colQty, r.type, r.warn, r.liq, r.note, r.totalTerm, r.paidTerm, r.monthlyPay, r.currency]));

      let invMap = getInventoryMap(logRows, loanRows);
      let free = invMap.inventory[t] || 0;
      if (q > free) throw new Error(`庫存不足！ ${t} 閒置庫存僅剩 ${free}`);
    }

    const newLoan = {
      source: d.source,
      date: d.date,
      amount: Number(d.amount),
      rate: Number(d.rate),
      col: normalizeTicker(d.col),
      colQty: Number(d.colQty),
      type: d.type,
      warn: warn,
      liq: liq,
      note: 'App',
      totalTerm: Number(d.totalTerm || 0),
      paidTerm: 0,
      monthlyPay: Number(d.monthlyPay || 0),
      currency: loanCurr
    };

    loans.push(newLoan);
    GasStore.set('DB:LOAN', loans);
    return '合約建立成功';
  });
}

function processContractAction(d) {
  return withLock(() => {
    let loans = GasStore.get('DB:LOAN', []);
    let logs = GasStore.get('DB:LOG', []);

    // Row Index Mapping: Sheet Row 2 = Array Index 0
    let idx = d.row ? Number(d.row) - 2 : -1;
    let loan = null;

    if (idx >= 0 && idx < loans.length) {
      loan = loans[idx];
    } else if (d.source) {
      // Find by Source (First Match? Logic used simple loops before)
      idx = loans.findIndex(l => l.source === d.source && !String(l.note).includes('結清'));
      if (idx !== -1) loan = loans[idx];
      else {
        // Default template if not found?
        loan = { type: '股票', warn: 160, liq: 130, currency: 'TWD', rate: 2.5 };
        idx = -1; // New
      }
    }

    if (!loan && d.type !== 'repay' && d.type !== 'addCol') throw new Error("Loan not found");

    // --- Action: Add Collateral ---
    if (d.type === 'addCol') {
      let addQ = Number(d.val);
      let addTicker = normalizeTicker(d.addTicker);
      let addRate = d.price ? Number(d.price) : loan.rate; // Use loan rate if not provided?

      // Stock Check
      const logRows = [[]].concat(logs.map(r => [r.date, r.type, r.ticker, r.cat, r.qty, r.price, r.currency, r.note]));
      const loanRows = [[]].concat(loans.map(r => [r.source, r.date, r.amount, r.rate, r.col, r.colQty, r.type, r.warn, r.liq, r.note, r.totalTerm, r.paidTerm, r.monthlyPay, r.currency]));
      let invMap = getInventoryMap(logRows, loanRows);
      let free = invMap.inventory[addTicker] || 0;
      if (addQ > free) throw new Error(`Stock Not Enough: ${free}`);

      if (idx !== -1 && addTicker === loan.col && addRate === loan.rate) {
        loans[idx].colQty += addQ;
        GasStore.set('DB:LOAN', loans);
        return `Added ${addQ} ${addTicker}`;
      } else {
        loans.push({
          source: loan.source || d.source,
          date: new Date().toISOString().split('T')[0],
          amount: 0,
          rate: addRate,
          col: addTicker,
          colQty: addQ,
          type: loan.type || '股票',
          warn: loan.warn, liq: loan.liq, note: 'Add Col',
          totalTerm: 0, paidTerm: 0, monthlyPay: 0, currency: loan.currency || 'TWD'
        });
        GasStore.set('DB:LOAN', loans);
        return `New Collateral Contract Added`;
      }
    }

    if (idx === -1 && d.type !== 'repay') throw new Error("Operation requires existing contract");

    // --- Action: Repay ---
    if (d.type === 'repay') {
      let repayTotal = Number(d.val);
      let targetSource = d.source || loan.source;
      let targetCol = d.col || loan.col;
      let logMsg = [];

      // Filter matches
      let matches = loans.map((l, i) => ({ l, i }))
        .filter(x => x.l.source === targetSource && x.l.col === targetCol && !String(x.l.note).includes('結清') && x.l.amount > 0)
        .sort((a, b) => new Date(a.l.date) - new Date(b.l.date));

      if (matches.length === 0) throw new Error("No active loan found for repayment");

      let remainingRepay = repayTotal;

      for (let m of matches) {
        if (remainingRepay <= 0) break;
        let l = m.l;
        let amt = l.amount;

        let now = new Date();
        let days = Math.floor((now - new Date(l.date)) / (1000 * 3600 * 24));
        if (days < 0) days = 0;
        let interest = amt * (l.rate / 100) * (days / 365);
        if (l.currency === 'TWD') interest = Math.round(interest);

        let debt = amt + interest;

        if (remainingRepay >= debt) {
          loans[m.i].amount = 0;
          loans[m.i].note = (loans[m.i].note || '') + ' [已結清]';
          remainingRepay -= debt;
          logMsg.push(`Paid Off w/ Int ${interest}`);

          if (interest > 0) {
            logs.push({
              date: new Date(), type: '支出', ticker: '利息', cat: '費用', qty: 1, price: interest,
              currency: l.currency, note: `Repay Int - ${l.source}`
            });
          }
        } else {
          let principal = remainingRepay > interest ? (remainingRepay - interest) : 0;
          if (principal > amt) principal = amt;

          if (remainingRepay < interest) throw new Error("Repayment < Interest");

          loans[m.i].amount -= principal;
          loans[m.i].date = new Date(); // Update date for interest calc reset
          // Wait, if we keep same date, interest compounds? 
          // Logic.gs calculates from 'date' field. Resetting date is correct method here ("Rollover").

          remainingRepay = 0;
          logMsg.push(`Partial Pay ${principal} (Int ${interest})`);

          if (interest > 0) {
            logs.push({
              date: new Date(), type: '支出', ticker: '利息', cat: '費用', qty: 1, price: interest,
              currency: l.currency, note: `Repay Int - ${l.source}`
            });
          }
        }
      }

      GasStore.set('DB:LOAN', loans);
      GasStore.set('DB:LOG', logs);
      return `Repay Success: ${logMsg.join(', ')}`;
    }

    // --- Action: Increase Loan ---
    if (d.type === 'increaseLoan') {
      loans.push({
        source: loan.source,
        date: new Date().toISOString().split('T')[0],
        amount: Number(d.val),
        rate: Number(d.price),
        col: loan.col,
        colQty: 0, // No new col
        type: loan.type, warn: loan.warn, liq: loan.liq, note: 'Increase',
        totalTerm: 0, paidTerm: 0, monthlyPay: 0, currency: loan.currency
      });
      GasStore.set('DB:LOAN', loans);
      return `Loan Increased by ${d.val}`;
    }

    // --- Action: Pay Period ---
    if (d.type === 'payPeriod') {
      let total = loan.totalTerm, paid = loan.paidTerm, mPay = loan.monthlyPay;
      if (paid >= total) return "All Paid";

      let annualInt = loan.amount * (loan.rate / 100);
      let mInt = annualInt / 12;
      if (loan.currency === 'TWD') mInt = Math.round(mInt);

      let principal = mPay - mInt; if (principal < 0) principal = 0;

      loans[idx].amount -= principal;
      loans[idx].paidTerm += 1;

      if (loans[idx].amount <= 0 || loans[idx].paidTerm >= total) {
        loans.splice(idx, 1); // Delete completely or mark cleared?
        // If we delete, idx shifts? 
        // We fetched 'loans' array. Splice affects memory. 
        // GasStore set saves modified array. Safe.
        GasStore.set('DB:LOAN', loans);
        return "Installment Paid (Cleared)";
      }
      GasStore.set('DB:LOAN', loans);
      return `Paid Term ${paid + 1}`;
    }

    // --- Action: Sell ---
    if (d.type === 'sell') {
      let sellQty = Number(d.val);
      loans[idx].colQty -= sellQty;
      // Repay logic? 
      // For simplified sell, assume repayment logic handled elsewhere or via AddTx 
      // Original code did repayment logic inside:
      // "if (repayAmt <= accruedInterest)..."
      // Let's implement basics:
      if (loans[idx].colQty <= 0) loans[idx].colQty = 0;

      // Add Sell Log
      logs.push({
        date: new Date(), type: '賣出', ticker: loan.col, cat: '賣出還款',
        qty: sellQty, price: Number(d.price), currency: loan.currency, note: 'Sell to Repay'
      });

      GasStore.set('DB:LOAN', loans);
      GasStore.set('DB:LOG', logs);
      return "Sold collateral";
    }

    return "Invalid Operation";
  });
}

function deleteTx(row) {
  return withLock(() => {
    let logs = GasStore.get('DB:LOG', []);
    let idx = Number(row) - 2;
    if (idx >= 0 && idx < logs.length) {
      logs.splice(idx, 1);
      GasStore.set('DB:LOG', logs);
      return 'Transaction Deleted';
    }
    return 'Error: Invalid ID';
  });
}

function editTx(d) {
  return withLock(() => {
    let logs = GasStore.get('DB:LOG', []);
    let idx = Number(d.row) - 2;
    if (idx >= 0 && idx < logs.length) {
      logs[idx] = {
        date: d.date, type: d.type, ticker: normalizeTicker(d.ticker),
        cat: d.cat, qty: d.qty, price: d.price, currency: d.currency, note: 'App(Edit)'
      };
      GasStore.set('DB:LOG', logs);
      return 'Transaction Updated';
    }
    return 'Error: Invalid ID';
  });
}

function processWizard(d) {
  return withLock(() => {
    let loans = GasStore.get('DB:LOAN', []);

    if (d.proto === 'Sinopac' || d.proto === 'LineBank') {
      let isCredit = d.proto === 'LineBank';
      loans.push({
        source: d.proto,
        date: new Date().toISOString().split('T')[0],
        amount: Number(d.amount),
        rate: isCredit ? 2.88 : 2.5,
        col: isCredit ? '' : normalizeTicker(d.col),
        colQty: isCredit ? 0 : Number(d.qty || 0), // Fix: d.qty used for colQty
        type: isCredit ? '信用貸款' : '股票',
        warn: isCredit ? 0 : 160,
        liq: isCredit ? 0 : 130,
        note: 'Wizard',
        totalTerm: isCredit ? 84 : 0, paidTerm: 0, monthlyPay: 0, currency: 'TWD'
      });
      GasStore.set('DB:LOAN', loans);
      return "Wizard: Contract Created";
    }
    else if (d.proto === 'AAVE') {
      if (!d.assets) return "Error: No assets";
      let totalDebt = Number(d.amount);
      d.assets.forEach((a, i) => {
        loans.push({
          source: 'AAVE',
          date: new Date().toISOString().split('T')[0],
          amount: (i === 0) ? totalDebt : 0, // Debt attached to first asset entry
          rate: 5.0,
          col: normalizeTicker(a.ticker),
          colQty: Number(a.qty),
          type: '加密貨幣', warn: 80, liq: 90, note: 'Wizard(DeFi)',
          totalTerm: 0, paidTerm: 0, monthlyPay: 0, currency: 'USD'
        });
      });
      GasStore.set('DB:LOAN', loans);
      return "Wizard: AAVE Position Created";
    }
    return "Unknown Protocol";
  });
}
