/**
 * Actions.gs
 * 處理來自前端的請求，並寫入 GasStore
 */

/**
 * 處理新增交易 (Logs)
 * @param {Object} d - 前端傳來的表單資料 {date, type, ticker, ...}
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
        return "Transaction Added"; // Return success message
    });
}

/**
 * 處理借貸相關操作
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
            return 'Loan Contract Added';
        }

        return "Unknown Action";
    });
}

/**
 * 處理還款/調整 (Repay/Adjust)
 * 這是最複雜的部分，需要修改現有 Loan，並產生 Log
 */
function processRepayment(d) {
    return withLock(() => {
        let loans = GasStore.get('DB:LOAN', []);
        let logs = GasStore.get('DB:LOG', []);

        // 尋找目標合約 (Source + Collateral + Note Match)
        // 簡單起見，這裡用簡易匹配，實際應有 ID
        let targetSource = d.source;
        let targetCol = normalizeTicker(d.collateral);

        let matches = loans
            .map((l, i) => ({ l, i }))
            .filter(x => x.l.source === targetSource && (x.l.col === targetCol || !targetCol) && !String(x.l.note).includes('已結清'));

        if (matches.length === 0) return "Error: No Active Contract Found";

        // Logic: 優先還款利率高的? 這裡假設只對第一個匹配的合約操作
        let m = matches[0];
        // d.amount 是本次還款總額
        let repayAmt = Number(d.amount);
        let logMsg = [];

        // 1. 計算應付利息 (Accrued Interest)
        // 需重新計算利息... 這裡簡化，假設前端或 Logic 算好傳來? 
        // 這裡重算以求安全
        let now = new Date();
        let startDate = new Date(m.l.date);
        let days = Math.floor((now - startDate) / (1000 * 3600 * 24));
        let interest = Math.round((m.l.amount * (m.l.rate / 100) / 365) * days);

        if (interest < 0) interest = 0;

        let remainingRepay = repayAmt;

        // 先付利息
        if (remainingRepay > 0) {
            if (remainingRepay >= m.l.amount + interest) {
                // 全額結清
                remainingRepay -= (m.l.amount + interest);

                loans[m.i].amount = 0;
                loans[m.i].note = (loans[m.i].note || '') + ' [已結清]';

                logMsg.push(`Paid Off w/ Int ${interest}`);

                if (interest > 0) {
                    logs.push({
                        date: new Date(), type: '支出', ticker: '利息', cat: '費用', qty: 1, price: interest,
                        currency: m.l.currency, note: `Repay Int - ${m.l.source}`
                    });
                }
            } else {
                // 部分還款
                if (remainingRepay < interest) return "Error: Repayment < Accrued Interest";

                let principal = remainingRepay - interest;
                loans[m.i].amount -= principal;
                loans[m.i].date = new Date().toISOString().split('T')[0]; // Reset date for interest calc

                logMsg.push(`Partial Pay ${principal} (Int ${interest})`);

                if (interest > 0) {
                    logs.push({
                        date: new Date(), type: '支出', ticker: '利息', cat: '費用', qty: 1, price: interest,
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

        // 再次尋找
        let matches = loans
            .map((l, i) => ({ l, i }))
            .filter(x => x.l.source === d.source && !String(x.l.note).includes('已結清'));

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
                type: base.type || '股票',
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

            if (paid >= total) return "All Paid";

            let annualInt = loan.amount * (loan.rate / 100);
            let mInt = annualInt / 12;
            if (loan.currency === 'TWD') mInt = Math.round(mInt);

            let principal = mPay - mInt; if (principal < 0) principal = 0;

            loans[idx].amount -= principal;
            loans[idx].paidTerm += 1;

            if (loans[idx].amount <= 0 || loans[idx].paidTerm >= total) {
                loans[idx].note = (loans[idx].note || '') + " [已結清]";
                loans[idx].amount = 0;
            }

            logs.push({
                date: new Date(), type: '支出', ticker: '信貸', cat: '還款',
                qty: 1, price: mPay, currency: loan.currency, note: `Period ${paid + 1}/${total}`
            });

            GasStore.set('DB:LOAN', loans);
            GasStore.set('DB:LOG', logs);
            return `Paid Term ${paid + 1}`;
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
                type: isCredit ? '信貸' : '股票',
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
        GasStore.commit(); // Ensure commit in local/test env too
        return result;
    }
    var lock = LockService.getScriptLock();
    if (lock.tryLock(10000)) {
        try {
            const result = func();
            GasStore.commit(); // CRITICAL: Flush L1 to L3 before exit
            return result;
        } finally {
            lock.releaseLock();
        }
    } else {
        throw new Error('Lock timeout');
    }
}
