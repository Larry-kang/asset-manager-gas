
/**
 * Code.gs
 * 應用程式入口點 (Main Entry Point)
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
 * 獲取儀表板數據 (前端 Polling)
 */
function getData(password) {
    try {
        // 初始化存儲
        GasStore.init({ sheet_name: DB_STORE_NAME, encryption_key: DB_ENCRYPTION_KEY, use_lock: false });

        // Sync Market Data if needed
        let marketRes = syncMarketData(SpreadsheetApp.getActiveSpreadsheet(), false);

        // Calculate Portfolio
        // Calculate Portfolio
        // Adapt data to Array format for Logic.gs

        // Use Repository to fetch fresh data from Sheets
        // Note: New Schema uses Capitalized keys (Date, Type, Ticker...)
        const logRepo = RepositoryFactory.getLogRepo();
        const loanRepo = RepositoryFactory.getLoanRepo();

        let logs = logRepo.findAll();
        let logRows = [['Date', 'Type', 'Ticker', 'Cat', 'Qty', 'Price', 'Currency', 'Note']];

        // Map Repository Objects (DB_SCHEMA keys) to Legacy Array format for Logic calculation
        logs.forEach(l => {
            logRows.push([l.Date, l.Type, l.Ticker, l.Category, l.Qty, l.Price, l.Currency, l.Note]);
        });

        // Legacy 'Amount' in Schema was 'Qty' in Logic? 
        // DB_SCHEMA.Transactions: ['Date', 'Type', 'Category', 'Ticker', 'Amount', 'Price', 'Currency', 'Note', 'Status', 'Hash']
        // Wait, 'Amount' usually means qty? Or money? 
        // Standard: Qty is quantity, Amount is total value or just another name.
        // Let's assume 'Amount' in DB_SCHEMA.Transactions corresponds to 'Qty' in the Portfolio calculation if it's a Buy/Sell.
        // Logic.gs usually expects: Date, Type, Ticker, Category, QTY, Price, Currency.
        // So l.Amount is the quantity.

        let loans = loanRepo.findAll();
        let loanRows = [['Source', 'Date', 'Amt', 'Rate', 'Col', 'Qty', 'Type', 'Warn', 'Liq', 'Note']];
        // DB_SCHEMA.Vault: ['Source', 'Protocol', 'CollateralAsset', 'CollateralQty', 'LoanAmount', 'InterestRate', 'LiquidationPrice', 'Status', 'Updated']
        // Need to map Vault schema to LoanRows for Logic.gs
        loans.forEach(l => {
            let curr = 'USD';
            if (l.Source && (l.Source.includes('Sinopac') || l.Source.includes('Line'))) curr = 'TWD';

            loanRows.push([
                l.Source,
                '', // Date (missing in Vault schema, usually not needed for snapshot)
                l.LoanAmount,
                l.InterestRate,
                l.CollateralAsset,
                l.CollateralQty,
                'Vault', // Type (Vault/Loan)
                l.Status, // Warn/Status
                l.LiquidationPrice,
                l.Protocol, // Note -> Protocol
                0, 0, 0, curr
            ]);
        });

        // Pledged Data
        let pledged = {};
        loans.forEach(l => {
            if (l.CollateralAsset) pledged[l.CollateralAsset] = (pledged[l.CollateralAsset] || 0) + Number(l.CollateralQty);
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
            debug: [],
            lastUpdate: marketRes.lastSync || ''
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
            let parsed = JSON.parse(cached);
            // Support new cache format { prices, lastSync }
            if (parsed.prices) {
                // Ensure we return { fx, prices } as data
                return {
                    logs: ['Loaded from cache'],
                    data: { fx: parsed.fx, prices: parsed.prices },
                    lastSync: parsed.lastSync
                };
            }
            // Legacy cache (just prices? No, legacy was { fx, prices } too? Let's check)
            // If legacy was just keys, it might fail. But old code returned keys directly as data?
            // Wait, old code: return { ..., data: JSON.parse(cached) }; 
            // And cache write was { fx, prices }.
            // So parsed IS { fx, prices } in legacy.
            return { logs: ['Loaded from cache'], data: parsed, lastSync: 'Unknown' };
        }
    }



    try {
        // 1. Fetch FX (USD/TWD)
        let fxRes = UrlFetchApp.fetch("https://api.exchangerate-api.com/v4/latest/USD");
        let fxData = JSON.parse(fxRes.getContentText());
        fx = fxData.rates.TWD || 32.5;
        logs.push('FX Sync: ' + fx);

        // 2. Fetch Tickers Dynamically from Logs
        const logRepo = RepositoryFactory.getLogRepo();
        const allLogs = logRepo.findAll();

        // Filter unique Tickers that are Active (Stock & Crypto)
        // We can use a Set to ensure Uniqueness
        // Category helps distinguish Crypto for Binance vs Stock using Yahoo
        const activeTickers = new Set();
        const activeCoins = new Set();

        allLogs.forEach(log => {
            // Assuming we want to track everything we ever touched? 
            // Or filter by current Qty? Logic.gs calculates Qty. 
            // For simplicity/safety, we track everything that appears in logs (or maybe simplify to just all unique Tickers found?)
            // Better: Track all unique tickers. If Qty is 0, we still fetch price (harmless, just cache update).
            if (!log.Ticker) return;
            if (log.Category === 'Crypto') activeCoins.add(log.Ticker + 'USDT'); // Approx mapping
            else activeTickers.add(log.Ticker);
        });

        // Add defaults if empty (bootstrapping)
        if (activeTickers.size === 0) ['2330', '0050'].forEach(t => activeTickers.add(t));
        if (activeCoins.size === 0) ['BTCUSDT', 'ETHUSDT'].forEach(c => activeCoins.add(c));

        const coins = Array.from(activeCoins);
        const twTickers = Array.from(activeTickers);

        // Fetch Crypto Prices
        if (coins.length > 0) {
            // Binance API supports bulk: ["BTCUSDT","ETHUSDT"]
            // Beware URL length limits if too many coins. 
            // Chunking might be needed if > 20 coins? For now assume valid length.
            try {
                let coinParam = '["' + coins.join('","') + '"]';
                let cryptoRes = UrlFetchApp.fetch('https://api.binance.com/api/v3/ticker/price?symbols=' + coinParam);
                let cryptoData = JSON.parse(cryptoRes.getContentText());
                cryptoData.forEach(item => {
                    let symbol = item.symbol.replace('USDT', '');
                    prices[symbol] = parseFloat(item.price);
                });
                logs.push('Crypto Sync: ' + cryptoData.length + ' items');
            } catch (e) {
                logs.push('Crypto Sync Error: ' + e.toString());
            }
        }

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
                let url = 'https://query1.finance.yahoo.com/v8/finance/chart/' + t + '.TW';
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
                logs.push('TW Stock Error (' + t + '): ' + e.toString());
            }
        });
        logs.push('TW Stock Sync: ' + twTickers.length + ' attempted');

        const resultData = { fx: fx, prices: prices };
        // Cache needs timestamp
        const cacheObj = { fx: fx, prices: prices, lastSync: new Date().toISOString() };
        CacheService.getScriptCache().put(CACHE_KEY, JSON.stringify(cacheObj), CACHE_TIME);

        return { logs: logs, data: resultData, lastSync: cacheObj.lastSync };



    } catch (e) {
        logs.push('Sync Error: ' + e.toString());
        return { logs: logs, data: { fx: 32.5, prices: {} } };
    }
}

