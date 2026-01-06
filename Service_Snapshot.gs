/**
 * Service_Snapshot.gs
 * 處理投資組合快照與歷史追蹤
 */
var SnapshotService = (function () {

  const STORE_KEY_PREFIX = 'DB:SNAPSHOT:';
  const INDEX_KEY = 'DB:SNAPSHOT_INDEX';
  const WATCHLIST_KEY = 'DB:WATCHLIST';

  /**
   * 執行快照 (通常由 Trigger 調用)
   */
  function takeSnapshot(data) {
    if (!data) return;

    let now = new Date();
    let dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd");

    let snapshot = {
      date: dateStr,
      totalAssetsTWD: data.totalAssetsTWD || 0,
      totalDebtTWD: data.totalDebtTWD || 0,
      netWorthTWD: data.netWorthTWD || 0,
      realizedPnLTWD: data.realizedPnLTWD || 0,
      assets: (data.assets || data.list || []).map(h => ({
        ticker: h.ticker,
        qty: h.qty,
        val: h.valTWD || h.val || 0,
        cat: h.cat
      }))
    };

    // 儲存快照
    GasStore.set(STORE_KEY_PREFIX + dateStr, snapshot);

    // 更新索引
    let index = GasStore.get(INDEX_KEY, []);
    if (!index.includes(dateStr)) {
      index.push(dateStr);
      if (index.length > 365) index.shift();
      GasStore.set(INDEX_KEY, index);
    }

    return dateStr;
  }

  /**
   * 獲取歷史數據
   */
  function getHistory(days = 30) {
    let index = GasStore.get(INDEX_KEY, []);
    let recent = index.slice(-days);
    let history = [];

    recent.forEach(d => {
      let s = GasStore.get(STORE_KEY_PREFIX + d);
      if (s) history.push(s);
    });

    return history;
  }

  /**
   * 獲取觀察清單目前的價格
   */
  function getWatchlistPrices() {
    let watchlist = GasStore.get(WATCHLIST_KEY, []);
    if (!watchlist || watchlist.length === 0) return [];

    return watchlist.map(item => {
      return {
        ticker: item.ticker,
        cat: item.cat,
        price: PriceService.getPrice(item.ticker)
      };
    });
  }

  return {
    takeSnapshot: takeSnapshot,
    getHistory: getHistory,
    getWatchlistPrices: getWatchlistPrices
  };

})();
