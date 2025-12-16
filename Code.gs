/**
 * Code.gs
 * 入口點與全域函式 (Main Entry Point)
 */

function doGet(e) {
    return HtmlService.createTemplateFromFile('index')
        .evaluate()
        .setTitle('Asset Manager (GasStore)')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * 取得最新資料 (前端 Polling)
 */
function getData(password) {
    try {
        // 驗證密碼
        const props = PropertiesService.getScriptProperties();
        const stored = props.getProperty('APP_PASSWORD');
        if (stored && stored.trim() !== '' && String(password).trim() !== String(stored).trim()) {
            return JSON.stringify({ status: "403", message: "Unauthorized" });
        }

        GasStore.init({ sheet_name: '_DB_STORE', encryption_key: 'AssetManager_V4', use_lock: false });

        // Sync Market Data if needed
        let marketRes = syncMarketData(SpreadsheetApp.getActiveSpreadsheet(), false);

        // Calculate Portfolio
        // Adapt data to Array format for Logic.gs
        let logs = GasStore.get('DB:LOG', []);
        let logRows = [['Date', 'Type', 'Ticker', 'Cat', 'Qty', 'Price', 'Currency', 'Note']];
        logs.forEach(l => {
            logRows.push([l.date, l.type, l.ticker, l.cat, l.qty, l.price, l.currency, l.note]);
        });

        let loans = GasStore.get('DB:LOAN', []);
        let loanRows = [['Source', 'Date', 'Amt', 'Rate', 'Col', 'Qty', 'Type', 'Warn', 'Liq', 'Note']];
        loans.forEach(l => {
            loanRows.push([
                l.source, l.date, l.amount, l.rate, l.col, l.colQty, l.type, l.warn, l.liq, l.note,
                l.totalTerm, l.paidTerm, l.monthlyPay, l.currency
            ]);
        });

        // Pledged Data
        let pledged = {};
        loans.forEach(l => {
            if (l.col) pledged[l.col] = (pledged[l.col] || 0) + Number(l.colQty);
        });

        // Logic Calculations
        let portfolio = calculatePortfolio(logRows, marketRes.data, pledged);
        let loanCalc = calculateLoans(loanRows, marketRes.data);

        // Calculate Net Worth
        let netWorth = portfolio.totalAssetsTWD - loanCalc.totalDebtTWD;

        // Daily Change Logic
        let today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
        let propsStore = PropertiesService.getScriptProperties();
        let lastDate = propsStore.getProperty('LAST_DATE');
        let prevClose = Number(propsStore.getProperty('PREV_CLOSE') || netWorth);
        let dailyChange = netWorth - prevClose;

        // Snapshot if new day
        if (lastDate !== today) {
            let lastKnown = parseFloat(propsStore.getProperty('LAST_KNOWN_VAL') || netWorth);
            prevClose = lastKnown;
            propsStore.setProperties({
                'LAST_DATE': today,
                'PREV_CLOSE': String(prevClose),
                'LAST_KNOWN_VAL': String(netWorth)
            });
            dailyChange = netWorth - prevClose;
        } else {
            propsStore.setProperty('LAST_KNOWN_VAL', String(netWorth));
        }

        // Historical Logs (Optional - simplified)
        let historyData = []; // GasStore.get('DB:HISTORY', []);

        return JSON.stringify({
            status: "success",
            fx: marketRes.data.fx,
            netWorthTWD: netWorth,
            dailyChange: dailyChange,
            totalAssetsTWD: portfolio.totalAssetsTWD,
            totalDebtTWD: loanCalc.totalDebtTWD,
            holdings: portfolio.list,
            contracts: loanCalc.contracts,
            risks: loanCalc.risks,
            inventory: portfolio.inventory,
            recentTx: logs.slice(-10).reverse(), // Last 10
            logs: marketRes.logs, // Debug logs
            debug: []
        });

    } catch (e) {
        Logger.log("getData Error: " + e.toString());
        return JSON.stringify({ status: "error", message: e.toString(), stack: e.stack });
    }
}

function getLogData(password) {
    try {
        // Auth check... simplified
        GasStore.init({ sheet_name: '_DB_STORE', encryption_key: 'AssetManager_V4', use_lock: false });
        let logs = GasStore.get('DB:LOG', []);
        return JSON.stringify({ status: "success", logs: logs.reverse() });
    } catch (e) {
        return JSON.stringify({ status: "error", message: e.toString() });
    }
}

function doSetup(password) {
    if (!password) return "Password cannot be empty";
    PropertiesService.getScriptProperties().setProperty('APP_PASSWORD', String(password).trim());
    return "Setup Complete.";
}

function checkAuth(password) {
    const stored = PropertiesService.getScriptProperties().getProperty('APP_PASSWORD');
    if (!stored || stored.trim() === '') return true; // No password set
    return String(password).trim() === String(stored).trim();
}

/**
 * Sync Market Data
 */
function syncMarketData(ss, forceRefresh) {
    let logs = [];
    let prices = {};
    let fx = 32.5;

    // Hardcoded logic for now or fetch from Cache
    // Real implementation would fetch URLs
    // Returning dummy for tests/stub

    return {
        logs: logs,
        data: { fx: fx, prices: prices }
    };
}
