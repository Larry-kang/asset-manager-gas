/**
 * Service_Price.gs
 * 集中式市場價格獲取服務
 */
var PriceService = (function () {

    /**
     * 獲取單一 Ticker 價格
     */
    function getPrice(ticker) {
        if (!ticker) return 0;

        // 1. 嘗試 Yahoo Finance
        let tickerToFetch = ticker;
        if (/^\d+$/.test(ticker)) tickerToFetch += '.TW';
        let p = _fetchYahoo(tickerToFetch);
        if (p > 0) return p;

        // 2. 如果 Yahoo 失敗且是純數字，嘗試 Cnyes (台股備援)
        if (/^\d+$/.test(ticker)) {
            p = _fetchCnyes(ticker);
            if (p > 0) return p;
        }

        // 3. 嘗試 Binance (加密貨幣)
        p = _fetchBinance(ticker);
        return p || 0;
    }

    /**
     * 批量獲取價格
     */
    function getBulkPrices(tickersByCat) {
        let results = { prices: {}, logs: [] };
        let stocks = tickersByCat.Stock || [];
        let cryptos = tickersByCat.Crypto || [];

        // 處理股票
        stocks.forEach(t => {
            let p = getPrice(t);
            if (p > 0) results.prices[t] = p;
        });

        // 處理加密貨幣 (可優化為一次性抓取)
        if (cryptos.length > 0) {
            cryptos.forEach(t => {
                let p = _fetchBinance(t);
                if (p > 0) results.prices[t] = p;
            });
        }

        results.logs.push('Synced ' + Object.keys(results.prices).length + ' tickers');
        return results;
    }

    // --- 私有輔助函數 ---

    function _fetchYahoo(ticker) {
        try {
            // Yahoo V8 API
            let url = 'https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(ticker);
            let res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
            if (res.getResponseCode() !== 200) return 0;
            let data = JSON.parse(res.getContentText());
            if (data.chart && data.chart.result && data.chart.result[0]) {
                return data.chart.result[0].meta.regularMarketPrice || 0;
            }
        } catch (e) { }
        return 0;
    }

    function _fetchBinance(ticker) {
        try {
            let symbol = ticker.toUpperCase();
            if (!symbol.endsWith('USDT')) symbol += 'USDT';
            let url = 'https://api.binance.com/api/v3/ticker/price?symbol=' + symbol;
            let res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
            if (res.getResponseCode() !== 200) return 0;
            let data = JSON.parse(res.getContentText());
            return Number(data.price) || 0;
        } catch (e) { }
        return 0;
    }

    function _fetchCnyes(ticker) {
        try {
            // 鉅亨網 API (針對台股)
            let url = 'https://ws.api.cnyes.com/ws/api/v1/charting/history?symbol=TWS:' + ticker + ':STOCK';
            let res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
            if (res.getResponseCode() !== 200) return 0;
            let data = JSON.parse(res.getContentText());
            if (data.data && data.data.c && data.data.c.length > 0) {
                return data.data.c[data.data.c.length - 1]; // 最後一筆收盤價
            }
        } catch (e) { }
        return 0;
    }

    return {
        getPrice: getPrice,
        getBulkPrices: getBulkPrices
    };

})();
