/**
 * Mock Google Apps Script API for Local Development
 * Simulates server-side calls with fake data.
 */
console.log("Mock API Loaded");

// Reactive Mock Database
const db = {
    netWorthTWD: 1250000,
    dailyChange: 3500,
    knownTickers: ["AAPL", "TSLA", "BTC", "ETH", "0050", "NVDA", "SPY", "USDT"],
    holdings: [
        { ticker: "AAPL", cat: "股票", qty: 20, valTWD: 120000, marketValue: 120000, pnl: 5000, roi: 4.23, isUsd: true },
        { ticker: "BTC", cat: "加密貨幣", qty: 0.05, valTWD: 95000, marketValue: 95000, pnl: 15000, roi: 18.2, isUsd: true },
        { ticker: "0050", cat: "股票", qty: 1000, valTWD: 145000, marketValue: 145000, pnl: -2000, roi: -1.3, isUsd: false },
        { ticker: "TWD", cat: "現金", qty: 500000, valTWD: 500000, marketValue: 500000, pnl: 0, roi: 0, isUsd: false },
    ],
    recentTx: [
        { date: "2024-03-10", type: "買入", ticker: "NVDA", qty: 10, price: 850, currency: "USD" },
        { date: "2024-03-08", type: "買入", ticker: "BTC", qty: 0.01, price: 68000, currency: "USD" },
        { date: "2024-03-05", type: "配息", ticker: "0050", qty: 2500, price: 1, currency: "TWD" },
    ],
    risks: [
        { source: "Aave", ratio: "45", status: "Safe", label: "Health Factor: 2.2", colValTWD: 300000, debtTWD: 135000 },
        { source: "Compound", ratio: "78", status: "Warning", label: "Health Factor: 1.25", colValTWD: 150000, debtTWD: 117000 },
    ],
    contracts: [
        { row: 1, source: "Aave", col: "ETH", principal: 1500, currency: "USD", type: "Variable", rate: 3.5, debt: 1520, note: "Main leverage" },
        { row: 2, source: "Compound", col: "WBTC", principal: 5000, currency: "USD", type: "Fixed", rate: 5.2, debt: 5120, note: "" },
        { row: 3, source: "Aave", col: "USDT", principal: 10000, currency: "USD", type: "Variable", rate: 4.8, debt: 10100, note: "Stablecoin loan" },
    ],
    fx: 32.5
};

window.google = {
    script: {
        run: {
            withSuccessHandler: function (onSuccess) {
                this.onSuccess = onSuccess;
                return this;
            },
            withFailureHandler: function (onFailure) {
                this.onFailure = onFailure;
                return this;
            },
            getDashboardData: function (refresh) {
                console.log("[Mock] getDashboardData called, refresh:", refresh);
                setTimeout(() => {
                    // Update Net Worth
                    let total = 0;
                    db.holdings.forEach(h => total += h.valTWD);
                    db.netWorthTWD = total;

                    const response = JSON.parse(JSON.stringify(db)); // Clone
                    response.success = true;

                    if (this.onSuccess) this.onSuccess(response);
                }, 500);
            },
            addTx: function (tx) {
                console.log("[Mock] addTx called:", tx);
                setTimeout(() => {
                    db.recentTx.unshift({
                        date: tx.date,
                        type: tx.type,
                        ticker: tx.ticker,
                        qty: parseFloat(tx.qty),
                        price: parseFloat(tx.price),
                        currency: tx.currency
                    });
                    // Sim holding update
                    let holding = db.holdings.find(h => h.ticker === tx.ticker);
                    const val = parseFloat(tx.qty) * parseFloat(tx.price);
                    const valTWD = tx.currency === 'USD' ? val * db.fx : val;
                    if (tx.type === '買入') {
                        if (holding) { holding.qty += parseFloat(tx.qty); holding.valTWD += valTWD; }
                        else { db.holdings.push({ ticker: tx.ticker, cat: tx.cat || '股票', qty: parseFloat(tx.qty), valTWD: valTWD, marketValue: valTWD, pnl: 0, roi: 0, isUsd: tx.currency === 'USD' }); }
                    } else if (tx.type === '賣出') {
                        if (holding) { holding.qty -= parseFloat(tx.qty); holding.valTWD -= valTWD; }
                    }
                    if (this.onSuccess) this.onSuccess({ success: true, message: "Mock Transaction Added!" });
                }, 800);
            },
            addLoan: function (d) {
                console.log("[Mock] addLoan called:", d);
                setTimeout(() => {
                    // Create new contract record
                    const maxRow = db.contracts.reduce((max, c) => c.row > max ? c.row : max, 0);
                    const newRow = maxRow + 1;
                    const newContract = {
                        row: newRow,
                        source: d.source,
                        col: d.col,
                        principal: parseFloat(d.amount),
                        currency: d.currency,
                        type: 'Variable', // Mock default
                        rate: parseFloat(d.rate),
                        debt: parseFloat(d.amount), // Initial debt = principal
                        note: "New Mock Loan"
                    };
                    db.contracts.push(newContract);

                    // Update Risks (Mock logic)
                    let risk = db.risks.find(r => r.source === d.source);
                    const debtTWD = d.currency === 'USD' ? parseFloat(d.amount) * db.fx : parseFloat(d.amount);

                    if (risk) {
                        risk.debtTWD += debtTWD;
                        risk.ratio = (parseFloat(risk.ratio) + 5).toFixed(0);
                    } else {
                        db.risks.push({
                            source: d.source,
                            ratio: "50",
                            status: "Safe",
                            label: "Health Factor: 1.5",
                            colValTWD: 0,
                            debtTWD: debtTWD
                        });
                    }

                    if (this.onSuccess) this.onSuccess({ success: true, message: "Mock Loan Created!" });
                }, 1000);
            },
            processContractAction: function (data) {
                console.log("[Mock] processContractAction called:", data);
                setTimeout(() => {
                    let contract = db.contracts.find(c => c.row == data.row);
                    if (contract) {
                        if (data.type === 'repay') {
                            contract.debt -= parseFloat(data.val);
                        }
                    }
                    if (this.onSuccess) this.onSuccess({ success: true, message: `Mock Action ${data.type} Processed!` });
                }, 800);
            },
            runSystemCheck: function () {
                console.log("[Mock] runSystemCheck");
                window.alert("Mock System Diagnostics Running...");
            }
        }
    }
};
