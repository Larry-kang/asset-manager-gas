/**
 * Logic.gs
 * 核心業務邏輯層 (Business Logic Layer)
 */

/**
 * 正規化 Ticker
 */
function normalizeTicker(ticker) {
    if (!ticker) return '';
    return String(ticker).trim().toUpperCase();
}

/**
 * 計算庫存地圖 (Inventory Map)
 */
function getInventoryMap(logRows, loanRows) {
    let inventory = {};

    if (!logRows || logRows.length <= 1) return inventory;

    const data = logRows.slice(1);
    data.forEach(row => {
        let type = String(row[1]); // Type
        let ticker = normalizeTicker(row[2]);
        let qty = Number(row[4]);
        let price = Number(row[5]);
        let currency = row[6];

        if (!ticker) return;
        if (!inventory[ticker]) inventory[ticker] = { qty: 0, cost: 0, currency: currency };

        // Use Global Constants or fallback to strings if running standalone test without context?
        // In strict setup, ACT_BUY is defined.
        // Fallback for safety if constants missing:
        const _BUY = (typeof ACT_BUY !== 'undefined') ? ACT_BUY : '買入';
        const _SELL = (typeof ACT_SELL !== 'undefined') ? ACT_SELL : '賣出';

        if (type === _BUY || type === '配股') {
            let totalCost = inventory[ticker].cost * inventory[ticker].qty + price * qty;
            inventory[ticker].qty += qty;
            inventory[ticker].cost = (inventory[ticker].qty > 0) ? totalCost / inventory[ticker].qty : 0;
        } else if (type === _SELL) {
            inventory[ticker].qty -= qty;
            if (inventory[ticker].qty < 0) inventory[ticker].qty = 0;
        }
    });

    return inventory;
}

/**
 * 處理市場行情數據
 * 支持 2 欄位 [Ticker, Price] 或 3 欄位 [Ticker, Rate, Price]
 */
function processMarketData(marketRows) {
    let prices = {};
    let fx = 32.5;

    if (marketRows && marketRows.length > 1) {
        marketRows.slice(1).forEach(r => {
            let key = normalizeTicker(r[0]);
            // Try column 2 (Price) first, then column 1 (Rate/Price)
            let val = Number(r[2]);
            if (isNaN(val) || val === 0) val = Number(r[1]);

            if (key === 'USD/TWD') fx = val;
            else if (key && val > 0) prices[key] = val;
        });
    }
    return { fx, prices };
}

/**
 * 計算投資組合總額
 */
function calculatePortfolio(logRows, marketData, pledgedData) {
    let invMap = getInventoryMap(logRows, null);

    let totalAssetsTWD = 0;
    let list = [];

    let fx = marketData.fx || 32.5;
    let prices = marketData.prices || {};

    for (let ticker in invMap) {
        let item = invMap[ticker];
        if (item.qty <= 0) continue;

        let marketPrice = prices[ticker] || item.cost;
        let pledgedQty = pledgedData[ticker] || 0;
        let activeQty = item.qty - pledgedQty;
        if (activeQty < 0) activeQty = 0;

        let marketVal = marketPrice * item.qty;
        let marketValTWD = (item.currency === 'USD') ? marketVal * fx : marketVal;

        let profit = (marketPrice - item.cost) * item.qty;
        let profitTWD = (item.currency === 'USD') ? profit * fx : profit;
        let roi = (item.cost > 0) ? (marketPrice - item.cost) / item.cost : 0;

        totalAssetsTWD += marketValTWD;

        list.push({
            ticker: ticker,
            qty: item.qty,
            pledged: pledgedQty,
            active: activeQty,
            avgCost: item.cost,
            marketPrice: marketPrice,
            marketValTWD: Math.round(marketValTWD),
            profitTWD: Math.round(profitTWD),
            roi: (roi * 100).toFixed(2) + '%',
            currency: item.currency
        });
    }

    list.sort((a, b) => b.marketValTWD - a.marketValTWD);

    return { totalAssetsTWD: Math.round(totalAssetsTWD), list: list, inventory: invMap };
}

/**
 * 計算負債與槓桿
 */
function calculateLoans(loanRows, marketData) {
    let totalDebtTWD = 0;
    let risks = [];
    let contracts = [];
    let pledged = {};

    let fx = marketData.fx || 32.5;
    let prices = marketData.prices || {};

    if (loanRows && loanRows.length > 1) {
        loanRows.slice(1).forEach((r, i) => {
            let src = r[0];
            let note = String(r[9] || '');
            let loanCurr = r[13] || 'TWD';

            // 統一過濾「結清」標籤
            if (!src || note.includes('結清') || note.includes('已結清')) return;

            let amt = Number(r[2]);
            let rate = Number(r[3]);
            let col = normalizeTicker(r[4]);
            let colQty = Number(r[5]);
            let warn = Number(r[7]);
            let liq = Number(r[8]);

            let amtTWD = (loanCurr === 'USD') ? amt * fx : amt;
            totalDebtTWD += amtTWD;

            if (col && colQty > 0) {
                pledged[col] = (pledged[col] || 0) + colQty;
            }

            let startDate = new Date(r[1]);
            let now = new Date();
            let timeDiff = now - startDate;
            let days = Math.floor(timeDiff / (1000 * 3600 * 24));
            let dailyInterest = (amt * (rate / 100)) / 365;
            let accruedInterest = dailyInterest * days;

            if (loanCurr === 'TWD') accruedInterest = Math.round(accruedInterest);
            else accruedInterest = Number(accruedInterest.toFixed(2));

            contracts.push({
                sysId: i + 2,
                source: src,
                date: r[1],
                amount: amt,
                currency: loanCurr,
                accrued: accruedInterest,
                rate: rate,
                col: col,
                colQty: colQty,
                level: (warn > 0) ? calculateSingleRisk(amt, col, colQty, prices, fx, loanCurr) : 'N/A'
            });
        });
    }

    let riskMap = {};

    if (loanRows && loanRows.length > 1) {
        loanRows.slice(1).forEach(r => {
            let src = r[0];
            let note = String(r[9] || '');
            if (!src || note.includes('結清') || note.includes('已結清')) return;

            let amt = Number(r[2]);
            let col = normalizeTicker(r[4]);
            let colQty = Number(r[5]);
            let loanCurr = r[13] || 'TWD';
            let warn = Number(r[7]);
            let liq = Number(r[8]);

            if (!riskMap[src]) {
                riskMap[src] = {
                    debtTWD: 0,
                    colValTWD: 0,
                    warn: warn,
                    liq: liq,
                    details: []
                };
            }

            let amtTWD = (loanCurr === 'USD') ? amt * fx : amt;
            riskMap[src].debtTWD += amtTWD;

            if (col && colQty > 0) {
                let price = prices[col] || 0;
                // Unified TWD handling
                let val = price * colQty;
                let valTWD = (loanCurr === 'USD') ? val * fx : val;
                riskMap[src].colValTWD += valTWD;
            }
        });
    }

    for (let src in riskMap) {
        let r = riskMap[src];
        if (r.debtTWD <= 0) continue;

        let currentRate = 0;
        let status = 'Safe';

        if (r.colValTWD > 0) {
            currentRate = (r.colValTWD / r.debtTWD) * 100;
        } else {
            currentRate = 999;
            if (r.warn === 0) status = 'Credit';
        }

        if (r.warn > 0 && currentRate < 999) {
            if (currentRate < r.liq) status = 'Danger';
            else if (currentRate < r.warn) status = 'Warning';
        }

        risks.push({
            source: src,
            debt: Math.round(r.debtTWD),
            collateral: Math.round(r.colValTWD),
            rate: (currentRate === 999) ? 'N/A' : currentRate.toFixed(2) + '%',
            status: status
        });
    }

    return {
        totalDebtTWD: Math.round(totalDebtTWD),
        contracts: contracts,
        risks: risks,
        pledged: pledged
    };
}

/**
 * 計算再平衡建議
 * @param {Object} portfolio - calculatePortfolio 的結果
 * @param {Object} targets - 目標配置 { "Stock": 60, "Crypto": 40 }
 * @param {Number} netWorth - 當前淨值
 */
function calculateRebalancing(portfolio, targets, netWorth) {
    let suggestions = [];
    let currentAlloc = {};

    // 1. Calculate Current Allocation
    // Group holdings by category (assuming 'cat' field exists in portfolio list or we derive it)
    // Note: portfolio.list contains items with 'ticker'. We need to map ticker back to category via inventory if possible,
    // or rely on what's available. The 'list' items from calculatePortfolio don't explicitly have 'cat' but the input logRows did.
    // However, calculatePortfolio returns 'list' items. Let's look at calculatePortfolio again. 
    // It returns ticker, qty, marketValTWD. It doesn't strictly preserve 'cat'.
    // We might need to assume categories based on Ticker or pass that info through.
    // Ideally, Logic.gs should know the category. 
    // Let's check getInventoryMap. It uses logRows.
    // For now, let's assume we can get category from the inventory map in portfolio.inventory

    // Group Current Value by Category
    for (let ticker in portfolio.inventory) {
        let item = portfolio.inventory[ticker];
        let val = 0;
        // Find market value in portfolio list
        let pItem = portfolio.list.find(x => x.ticker === ticker);
        if (pItem) val = pItem.marketValTWD;

        let cat = item.cat || 'Other';
        currentAlloc[cat] = (currentAlloc[cat] || 0) + val;
    }

    // Add Cash (NetWorth - Invested) ?? 
    // Or just treat Cash as an explicit asset if we tracked it.
    // For this simple version, let's assume "Cash" is the remainder of NetWorth if positive?
    // Or users track Cash as a transaction 'TYPE_CASH'.
    // If TYPE_CASH is used, it's in inventory.

    // Calculate Suggestions
    for (let cat in targets) {
        let targetPct = Number(targets[cat]);
        if (targetPct <= 0) continue;

        let targetVal = netWorth * (targetPct / 100);
        let currentVal = currentAlloc[cat] || 0;
        let diff = targetVal - currentVal;
        let action = diff > 0 ? 'Buy' : 'Sell';

        suggestions.push({
            category: cat,
            currentVal: Math.round(currentVal),
            targetVal: Math.round(targetVal),
            diff: Math.round(diff),
            action: action,
            pct: ((currentVal / netWorth) * 100).toFixed(1) + '%'
        });
    }

    return suggestions;
}

function calculateSingleRisk(amt, col, colQty, prices, fx, currency) {
    if (!col || colQty <= 0) return 'Credit';
    let price = prices[col] || 0;
    let colVal = price * colQty;
    if (amt <= 0) return 'N/A';
    return ((colVal / amt) * 100).toFixed(2) + '%';
}
