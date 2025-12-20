/**
 * Evolution Audit Module
 * 負責系統的代碼級進化審計。
 */

const EVOLUTION_INSIGHTS_KEY = 'DB:EVOLUTION_INSIGHTS';

/**
 * 執行進化審計 (僅產生建議報告，不修改資料)
 */
function runEvolution() {
    GasStore.init({
        sheet_name: DB_STORE_NAME,
        encryption_key: DB_ENCRYPTION_KEY,
        use_lock: true
    });

    const insights = [];
    Logger.log('--- [System: Evolution Audit] Starting ---');

    // 1. 系統診斷 (穩定性檢查)
    try {
        const checkRes = runSystemCheck();
        if (typeof checkRes === 'string' && checkRes.includes('失敗')) {
            insights.push({
                type: 'STABILITY',
                msg: '系統穩定性檢測未通過，建議人工介入。',
                details: checkRes
            });
        }
    } catch (e) {
        insights.push({ type: 'CRITICAL', msg: '審計引擎崩潰: ' + e.message });
    }

    // 2. 核心代碼邏輯審計 (排除資料修復)
    const logs = GasStore.get('DB:LOG') || [];
    const market = GasStore.get('DB:MARKET_DATA') || {};
    const loans = GasStore.get('DB:LOAN') || [];
    const now = new Date().getTime();

    // 偵測異常資料分佈 (暗示代碼邏輯可能有問題)
    const anomalies = logs.filter(l => !l.ticker || l.price <= 0 || l.qty <= 0);
    if (anomalies.length > 0) {
        insights.push({
            type: 'CODE_LOGIC',
            msg: `偵測到 ${anomalies.length} 筆異常紀錄。建議優化 Actions.gs 中的交易校驗邏輯。`,
            details: anomalies.map(a => a.ticker)
        });
    }

    // 3. 多幣別與匯率邏輯審計
    if (!market.USD || !market.TWD) {
        insights.push({ type: 'LOGIC', msg: '缺失核心匯率。建議檢查 syncMarketData 的 API 串接邏輯。' });
    }

    // 4. 儲存審計報告
    const history = GasStore.get(EVOLUTION_INSIGHTS_KEY) || [];
    history.push({
        ts: now,
        insights: insights,
        summary: insights.length > 0 ? `發現 ${insights.length} 項潛在進化點。` : '系統核心運作穩定。'
    });

    // 保留最近 10 次紀錄
    if (history.length > 10) history.shift();

    GasStore.set(EVOLUTION_INSIGHTS_KEY, history);
    GasStore.commit();

    Logger.log(`Audit Complete: ${insights.length} insights generated.`);
    return insights;
}

/**
 * 獲取進化洞察 (供 Agent 修復代碼參考)
 */
function getEvolutionInsights() {
    GasStore.init({ sheet_name: DB_STORE_NAME, encryption_key: DB_ENCRYPTION_KEY });
    return GasStore.get(EVOLUTION_INSIGHTS_KEY) || [];
}
