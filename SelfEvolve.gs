/**
 * Evolution Audit Module
 * �t�d�t�Ϊ��N�X�Ŷi�Ƽf�p�C
 */

const EVOLUTION_INSIGHTS_KEY = 'DB:EVOLUTION_INSIGHTS';

/**
 * ����i�Ƽf�p (�Ȳ��ͫ�ĳ���i�A���ק���)
 */
function runEvolution() {
    GasStore.init({
        sheet_name: DB_STORE_NAME,
        encryption_key: DB_ENCRYPTION_KEY,
        use_lock: true
    });

    var insights = [];
    Logger.log('--- [System: Evolution Audit] Starting ---');

    // 1. �t�ζE�_ (í�w���ˬd)
    try {
        var checkRes = runSystemCheck();
        if (typeof checkRes === 'string' && checkRes.indexOf('����') !== -1) {
            insights.push({
                type: 'STABILITY',
                msg: '�t��í�w���˴����q�L�A��ĳ�H�u���J�C',
                details: checkRes
            });
        }
    } catch (e) {
        insights.push({ type: 'CRITICAL', msg: '�f�p�����Y��: ' + e.message });
    }

    // 2. �֤ߥN�X�޿�f�p (�ư���ƭ״_)
    var logs = GasStore.get('DB:LOG') || [];
    var market = GasStore.get('DB:MARKET_DATA') || {};
    var now = new Date().getTime();

    // �������`��Ƥ��G (�t�ܥN�X�޿�i�঳���D)
    var anomalies = logs.filter(function (l) { return !l.ticker || l.price <= 0 || l.qty <= 0; });
    if (anomalies.length > 0) {
        insights.push({
            type: 'CODE_LOGIC',
            msg: '������ ' + anomalies.length + ' �����`�����C��ĳ�u�� Actions.gs ������������޿�C',
            details: anomalies.map(function (a) { return a.ticker; })
        });
    }

    // 3. �h���O�P�ײv�޿�f�p
    if (!market.USD || !market.TWD) {
        insights.push({ type: 'LOGIC', msg: '�ʥ��֤߶ײv�C��ĳ�ˬd syncMarketData �� API �걵�޿�C' });
    }

    // 4. �x�s�f�p���i
    var history = GasStore.get(EVOLUTION_INSIGHTS_KEY) || [];
    history.push({
        ts: now,
        insights: insights,
        summary: insights.length > 0 ? '�o�{ ' + insights.length + ' ����b�i���I�C' : '�t�ή֤߹B�@í�w�C'
    });

    // �O�d�̪� 10 ������
    if (history.length > 10) history.shift();

    GasStore.set(EVOLUTION_INSIGHTS_KEY, history);
    GasStore.commit();

    Logger.log('Audit Complete: ' + insights.length + ' insights generated.');
    return insights;
}

/**
 * ����i�Ƭ}�� (�� Agent �״_�N�X�Ѧ�)
 */
function getEvolutionInsights() {
    GasStore.init({ sheet_name: DB_STORE_NAME, encryption_key: DB_ENCRYPTION_KEY });
    return GasStore.get(EVOLUTION_INSIGHTS_KEY) || [];
}
