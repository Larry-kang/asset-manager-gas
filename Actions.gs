/**
 * Actions.gs
 * 處理來自前端的請求，並寫入 GasStore
 */

/**
 * 處理新增交易 (Logs)
 * @param {Object} d - 前端傳來的交易數據 {date, type, ticker, ...}
 */
function addTransaction(d) {
    return withLock(() => {
        let logs = GasStore.get('DB:LOG', []);

        // 驗證
        if (!d.ticker || !d.qty || !d.price) return "Error: Missing Fields";

        logs.push({
            date: d.date,
            type: d.type,
            ticker: normalizeTicker(d.ticker),
            cat: d.cat,
            qty: Number(d.qty),
            price: Number(d.price),
            currency: d.currency,
            note: d.note || ''
        });

        GasStore.set('DB:LOG', logs);

        // [New] Persist to Sheet via Repository
        try {
            const repo = RepositoryFactory.getLogRepo();
            repo.append({
                Date: d.date,
                Type: d.type,
                Category: d.cat,
                Ticker: normalizeTicker(d.ticker),
                Qty: Number(d.qty),
                Price: Number(d.price),
                Currency: d.currency,
                Note: d.note || '',
                Status: 'Active',
                Hash: ''
            });
        } catch (e) {
            console.error('Failed to persist to Sheet:', e);
        }

        return { success: true, message: "交易紀錄新增成功" };
    });
}

/**
 * 處理貸款合約操作
 * @param {Object} d - {action, source, ...}
 */
function processLoanAction(d) {
    return withLock(() => {
        let loans = GasStore.get('DB:LOAN', []);

        // --- 新增合約 (New Loan) ---
        if (d.action === 'new') {
            loans.push({
                source: d.source,
                date: d.date,
                amount: Number(d.amount),
                rate: Number(d.rate),
                col: normalizeTicker(d.collateral),
                colQty: Number(d.colQty),
                type: d.type,
                warn: Number(d.warn),
                liq: Number(d.liq),
                note: d.note,
                totalTerm: Number(d.totalTerm || 0),
                paidTerm: 0,
                monthlyPay: Number(d.monthlyPay || 0),
                currency: d.currency || 'TWD'
            });
            GasStore.set('DB:LOAN', loans);

            // [New] Persist to Sheet
            try {
                const repo = RepositoryFactory.getLoanRepo();
                repo.append({
                    Source: d.source,
                    Protocol: d.type || '質押',
                    CollateralAsset: normalizeTicker(d.collateral),
                    CollateralQty: Number(d.colQty),
                    LoanAmount: Number(d.amount),
                    InterestRate: Number(d.rate),
                    LiquidationPrice: Number(d.liq),
                    Status: 'Active',
                    Updated: new Date()
                });
            } catch (e) {
                console.error('Failed to persist Loan:', e);
            }

            return 'Loan Contract Added';
        }

        return "Unknown Action";
    });
}

/**
 * 處理還款/調整 (Repay/Adjust)
 * 這是舊版整合邏輯，需要更新現有 Loan，並產生 Log
 */
function processRepayment(d) {
    return withLock(() => {
        let loans = GasStore.get('DB:LOAN', []);
        let logs = GasStore.get('DB:LOG', []);

        // 匹配目標合約 (Source + Collateral + Note Match)
        let targetSource = d.source;
        let targetCol = normalizeTicker(d.collateral);

        let matches = loans
            .map((l, i) => ({ l, i }))
            .filter(x => x.l.source === targetSource && (x.l.col === targetCol || !targetCol) && !String(x.l.note).includes('結清'));

        if (matches.length === 0) return "Error: No Active Contract Found";

        // Logic: 找到還款目標合約，目前只處理第一個匹配到的合約
        let m = matches[0];
        // d.amount 是本次還款金額
        let repayAmt = Number(d.amount);
        let logMsg = [];

        // 1. 計算應計利息 (Accrued Interest)
        // 這裡需要計算利息... 這是舊版邏輯，未來可能需要更精確的計算
        // 這裡只是簡單計算
        let now = new Date();
        let startDate = new Date(m.l.date);
        let days = Math.floor((now - startDate) / (1000 * 3600 * 24));
        let interest = Math.round((m.l.amount * (m.l.rate / 100) / 365) * days);

        if (interest < 0) interest = 0;

        let remainingRepay = repayAmt;

        // 支付利息
        if (remainingRepay > 0) {
            if (remainingRepay >= m.l.amount + interest) {
                // 全額結清
                remainingRepay -= (m.l.amount + interest);

                loans[m.i].amount = 0;
                loans[m.i].note = (loans[m.i].note || '') + ' [結清]';

                logMsg.push(`Paid Off w/ Int ${interest}`);

                if (interest > 0) {
                    logs.push({
                        date: new Date(), type: '賣出', ticker: '利息', cat: '支出', qty: 1, price: interest,
                        currency: m.l.currency, note: `Repay Int - ${m.l.source}`
                    });
                }
            } else {
                // 部分還款
                if (remainingRepay < interest) return "Error: Repayment < Accrued Interest";

                let principal = remainingRepay - interest;
                loans[m.i].amount -= principal;
                loans[m.i].date = new Date().toISOString().split('T')[0]; // 重置日期以重新計算利息

                logMsg.push(`Partial Pay ${principal} (Int ${interest})`);

                if (interest > 0) {
                    logs.push({
                        date: new Date(), type: '賣出', ticker: '利息', cat: '支出', qty: 1, price: interest,
                        currency: m.l.currency, note: `Repay Int - ${m.l.source}`
                    });
                }
            }
        }

        GasStore.set('DB:LOAN', loans);
        GasStore.set('DB:LOG', logs);
        return `Repay Success: ${logMsg.join(', ')}`;
    });
}

function processContractAction(d) {
    return withLock(() => {
        let loans = GasStore.get('DB:LOAN', []);
        let logs = GasStore.get('DB:LOG', []);

        // 查找合約
        let matches = loans
            .map((l, i) => ({ l, i }))
            .filter(x => x.l.source === d.source && !String(x.l.note).includes('結清'));

        // --- Action: Add Collateral ---
        if (d.type === 'addCol') {
            if (matches.length === 0) return "Error: No Contract";
            loans[matches[0].i].colQty += Number(d.colQty);
            GasStore.set('DB:LOAN', loans);
            return "Collateral Added";
        }

        // --- Action: Increase Loan ---
        if (d.type === 'increaseLoan') {
            let base = matches.length > 0 ? matches[0].l : {};
            loans.push({
                source: d.source || base.source,
                date: new Date().toISOString().split('T')[0],
                amount: Number(d.val),
                rate: Number(d.price || base.rate),
                col: normalizeTicker(d.col || base.col),
                colQty: 0,
                type: base.type || '質押',
                warn: base.warn || 160, liq: base.liq || 130,
                note: 'Increase',
                totalTerm: 0, paidTerm: 0, monthlyPay: 0, currency: base.currency || 'TWD'
            });
            GasStore.set('DB:LOAN', loans);
            return "Loan Increased";
        }

        // --- Action: Sell to Repay ---
        if (d.type === 'sell') {
            if (matches.length === 0) return "Error: No Contract";
            let sellQty = Number(d.val);
            loans[matches[0].i].colQty -= sellQty;
            if (loans[matches[0].i].colQty < 0) loans[matches[0].i].colQty = 0;

            logs.push({
                date: new Date(), type: '賣出', ticker: d.col, cat: '還款',
                qty: sellQty, price: Number(d.price), currency: matches[0].l.currency, note: 'Sell to Repay'
            });

            GasStore.set('DB:LOAN', loans);
            GasStore.set('DB:LOG', logs);
            return "Sold Collateral";
        }

        // --- Action: Pay Period ---
        if (d.type === 'payPeriod') {
            if (matches.length === 0) return "Error: No Contract";
            let idx = matches[0].i;
            let loan = loans[idx];
            let total = loan.totalTerm, paid = loan.paidTerm, mPay = loan.monthlyPay;

            if (paid >= total && total > 0) return "All Paid";

            let annualInt = loan.amount * (loan.rate / 100);
            let mInt = annualInt / 12;
            if (loan.currency === 'TWD') mInt = Math.round(mInt);

            let principal = mPay - mInt; if (principal < 0) principal = 0;

            loans[idx].amount -= principal;
            loans[idx].paidTerm += 1;

            if (loans[idx].amount <= 0 || (total > 0 && loans[idx].paidTerm >= total)) {
                loans[idx].note = (loans[idx].note || '') + " [結清]";
                loans[idx].amount = 0;
            }

            logs.push({
                date: new Date(), type: '賣出', ticker: '信貸', cat: '還款',
                qty: 1, price: mPay, currency: loan.currency, note: `Period ${paid + 1}/${total}`
            });

            GasStore.set('DB:LOAN', loans);
            GasStore.set('DB:LOG', logs);
            return `Paid Term ${paid + 1}`;
        }

        // --- Action: Repay (Cash) ---
        if (d.type === 'repay') {
            if (matches.length === 0) return "Error: No Contract";
            let repayAmt = Number(d.val);
            let target = matches[0].l;
            let idx = matches[0].i;

            // Simple Interest Calc for Log
            let now = new Date();
            let startDate = new Date(target.date);
            let days = Math.floor((now - startDate) / (1000 * 3600 * 24));
            if (days < 0) days = 0;
            let interest = Math.round((target.amount * (target.rate / 100) / 365) * days);
            if (target.currency === 'USD') interest = Number(((target.amount * (target.rate / 100) / 365) * days).toFixed(2));

            let principal = repayAmt - interest;
            if (principal < 0) principal = 0;

            loans[idx].amount -= principal;
            if (loans[idx].amount <= 0) {
                loans[idx].amount = 0;
                loans[idx].note = (loans[idx].note || '') + " [結清]";
            } else {
                loans[idx].date = new Date().toISOString().split('T')[0]; // Reset for next int cycle
            }

            // Log Principal Repayment
            logs.push({
                date: new Date(), type: '賣出', ticker: target.type === '信貸' ? '信貸' : target.col,
                cat: '還款', qty: 1, price: principal, currency: target.currency, note: `Repay Principal - ${target.source}`
            });

            // Log Interest Expense
            if (interest > 0) {
                logs.push({
                    date: new Date(), type: '賣出', ticker: '利息',
                    cat: '支出', qty: 1, price: interest, currency: target.currency, note: `Repay Interest - ${target.source}`
                });
            }

            GasStore.set('DB:LOAN', loans);
            GasStore.set('DB:LOG', logs);

            // [New] Update Sheet
            try {
                const repo = RepositoryFactory.getLoanRepo();
                const all = repo.findAll();
                // Find matching active loan. Logic: Source matches, Status not Closed
                const match = all.find(r => r.Source === d.source && r.Status !== 'Closed');

                if (match) {
                    match.LoanAmount = loans[idx].amount; // Updated amount from GasStore logic
                    match.Updated = new Date();
                    if (match.LoanAmount <= 0) match.Status = 'Closed';

                    // Also handle Log syncing if needed, but Loan update is critical
                    repo.update(match);
                }
            } catch (e) {
                console.error('Failed to update Loan Sheet:', e);
            }

            return `Repaid ${repayAmt} (${principal} Prin + ${interest} Int)`;
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
                colQty: isCredit ? 0 : Number(d.qty || 0),
                type: isCredit ? '信貸' : '質押',
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
                    amount: (i === 0) ? totalDebt : 0,
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

function withLock(func) {
    if (typeof LockService === 'undefined') {
        const result = func();
        GasStore.commit(); // 確保在本地/測試環境也執行提交
        return result;
    }
    var lock = LockService.getScriptLock();
    if (lock.tryLock(10000)) {
        try {
            const result = func();
            GasStore.commit(); // 關鍵：退出前刷新 L1 到 L3
            return result;
        } finally {
            lock.releaseLock();
        }
    } else {
        throw new Error('Lock timeout');
    }
}
