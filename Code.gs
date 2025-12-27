/**
 * Code.gs
 * �J�f�I�P����禡 (Main Entry Point)
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
 * ���o�̷s��� (�e�� Polling)
 */
function getData(password) {
    try {
        // ���ұK�X
        GasStore.init({ sheet_name: DB_STORE_NAME, encryption_key: DB_ENCRYPTION_KEY, use_lock: false });

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

        // Fetch Targets
        let targets = GasStore.get('DB:SETTINGS:TARGETS', {});

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
            targets: targets,
            rebalancing: calculateRebalancing(portfolio, targets, netWorth), // Logic.gs
            recentTx: logs.slice(-10).reverse(), // Last 10
            logs: marketRes.logs, // Debug logs
            debug: []
        });

    } catch (e) {
        Logger.log("getData Error: " + e.toString());
        return JSON.stringify({ status: "error", message: e.toString(), stack: e.stack });
    }
}

// Alias for Frontend/Test Compatibility
var getDashboardData = getData;

function getLogData(password) {
    try {
        // Auth check... simplified
        GasStore.init({ sheet_name: DB_STORE_NAME, encryption_key: DB_ENCRYPTION_KEY }); // Use Lock for writes
        let result = Actions.runSystemCheck(SpreadsheetApp.getActiveSpreadsheet());
        return JSON.stringify(result);
    } catch (e) {
        return JSON.stringify({ status: "error", message: e.toString() });
    }
}

function saveTargets(targets) {
    try {
        GasStore.init({ sheet_name: DB_STORE_NAME, encryption_key: DB_ENCRYPTION_KEY, use_lock: true });
        GasStore.put('DB:SETTINGS:TARGETS', targets);
        GasStore.commit();
        return JSON.stringify({ status: "success" });
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

    const props = PropertiesService.getScriptProperties();
    const CACHE_KEY = 'MARKET_DATA_JSON';
    const CACHE_TIME = 15 * 60; // 15 mins

    if (!forceRefresh) {
        let cached = CacheService.getScriptCache().get(CACHE_KEY);
        if (cached) {
            return { logs: ['Loaded from cache'], data: JSON.parse(cached) };
        }
    }



    try {
        // 1. Fetch FX (USD/TWD)
        let fxRes = UrlFetchApp.fetch("https://api.exchangerate-api.com/v4/latest/USD");
        let fxData = JSON.parse(fxRes.getContentText());
        fx = fxData.rates.TWD || 32.5;
        logs.push(`FX Sync: ${fx}`);

        // 2. Fetch Crypto (Binance)
        let coins = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'];
        let cryptoRes = UrlFetchApp.fetch(`https://api.binance.com/api/v3/ticker/price?symbols=["${coins.join('","')}"]`);
        let cryptoData = JSON.parse(cryptoRes.getContentText());
        cryptoData.forEach(item => {
            let symbol = item.symbol.replace('USDT', '');
            prices[symbol] = parseFloat(item.price);
        });
        logs.push(`Crypto Sync: ${cryptoData.length} items`);

        // 3. Fetch TW Stocks (Yahoo Finance / TwStock Scraper)
        let twTickers = ['2330', '2454', '2317', '0050', '0056'];

        // Helper: Fetch with Headers & Retry
        const fetchUrl = (url) => {
            const params = {
                muteHttpExceptions: true,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            };
            for (let i = 0; i < 3; i++) {
                try {
                    let res = UrlFetchApp.fetch(url, params);
                    if (res.getResponseCode() === 200) return res.getContentText();
                } catch (e) { Utilities.sleep(500 * (i + 1)); }
            }
            return null;
        };

        twTickers.forEach(t => {
            try {
                let url = `https://query1.finance.yahoo.com/v8/finance/chart/${t}.TW`;
                let content = fetchUrl(url);
                if (content) {
                    let data = JSON.parse(content);
                    if (data.chart && data.chart.result) {
                        let meta = data.chart.result[0].meta;
                        let price = meta.regularMarketPrice || meta.previousClose;
                        if (price) prices[t] = price;
                    }
                }
            } catch (e) {
                logs.push(`TW Stock Error (${t}): ${e.toString()}`);
            }
        });
        logs.push(`TW Stock Sync: ${twTickers.length} attempted`);

        const resultData = { fx: fx, prices: prices };
        CacheService.getScriptCache().put(CACHE_KEY, JSON.stringify(resultData), CACHE_TIME);

        return { logs: logs, data: resultData };

    } catch (e) {
        logs.push(`Sync Error: ${e.toString()}`);
        return { logs: logs, data: { fx: 32.5, prices: {} } };
    }
}



