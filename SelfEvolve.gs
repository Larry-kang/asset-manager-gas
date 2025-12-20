/**
 * Self-Evolution Module
 * 負責系統的自癒、審計與進化建議。
 */

const EVOLUTION_INSIGHTS_KEY = 'DB:EVOLUTION_INSIGHTS';

/**
 * 執行定期進化檢查 (可設定為 Daily Trigger)
 */
function runEvolution() {
    GasStore.init({
        sheet_name: DB_STORE_NAME,
        encryption_key: DB_ENCRYPTION_KEY,
        use_lock: true
    });

    const insights = [];
    Logger.log('--- [System: Self-Evolve] Starting Audit ---');

    // 1. 執行系統診斷
    try {
        const checkRes = runSystemCheck();
        if (!checkRes || checkRes.status !== 'success') {
            insights.push({
                type: 'ERROR',
                msg: 'System check failed during evolution.',
                date: new Date().toISOString()
            });
        }
    } catch (e) {
        insights.push({ type: 'CRITICAL', msg: 'System check crashed: ' + e.message });
    }

    // 2. 審計 GasStore 資料
    const logs = GasStore.get('DB:LOG') || [];
    const loans = GasStore.get('DB:LOAN') || [];

    // 檢查異常交易
    const anomalies = logs.filter(l => !l.ticker || l.price <= 0 || l.qty <= 0);
    if (anomalies.length > 0) {
        insights.push({
            type: 'DATA_SMELL',
            msg: `Found ${anomalies.length} anomalous transactions.`,
            details: anomalies.map(a => a.ticker + ':' + a.date)
        });
    }

    // 3. 檢查市場報價時效
    const market = GasStore.get('DB:MARKET_DATA') || {};
    const now = new Date().getTime();
    Object.keys(market).forEach(ticker => {
        const item = market[ticker];
        if (now - item.ts > 48 * 60 * 60 * 1000) { // 超過 48 小時
            insights.push({ type: 'PERFORMANCE', msg: `Market data for ${ticker} is stale.` });
        }
    });

    // 4. 清理過期快取 (如果有)
    CacheService.getScriptCache().remove(EVOLUTION_INSIGHTS_KEY);

    // 5. 儲存洞察報告
    const history = GasStore.get(EVOLUTION_INSIGHTS_KEY) || [];
    history.push({
        ts: now,
        insights: insights,
        summary: insights.length > 0 ? `Found ${insights.length} issues.` : 'System healthy.'
    });

    // 僅保留最近 10 次紀錄
    if (history.length > 10) history.shift();

    GasStore.set(EVOLUTION_INSIGHTS_KEY, history);
    GasStore.commit();

    Logger.log(`Evolution Complete: ${insights.length} insights generated.`);
    return insights;
}

/**
 * 獲取?化洞察 (供前端或 Agent 使用)
 */
function getEvolutionInsights() {
    GasStore.init({ sheet_name: DB_STORE_NAME, encryption_key: DB_ENCRYPTION_KEY });
    return GasStore.get(EVOLUTION_INSIGHTS_KEY) || [];
}
