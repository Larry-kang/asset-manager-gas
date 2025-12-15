function migrateToGasStore() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Initialize GasStore
    GasStore.init({
        sheet_name: '_DB_STORE',
        encryption_key: 'AssetManager_V4', // Simple key for migration
        use_lock: true
    });

    Logger.log('Starting Migration...');

    // 2. Migrate LOG (Transactions)
    const sLog = ss.getSheetByName('Log'); // TAB_LOG
    if (sLog && sLog.getLastRow() > 1) {
        const data = sLog.getDataRange().getValues();
        const headers = data[0];
        const rows = data.slice(1).map(r => {
            // Convert to Object based on headers? 
            // Existing Code.gs uses array index mapping. 
            // To keep compatibility with logic, we might want to store as Array of Objects?
            // Or keep as Array of Arrays (Raw Data)? 
            // Logic.gs expects raw arrays in some places (processMarketData used to). 
            // But `getRecentTransactions` maps to objects.
            // Let's store as **Raw 2D Array** to simulate "Sheet Data" for least friction refactoring?
            // NO, `GasStore` is KV. Storing JSON Objects is cleaner.
            // Let's store as Array of Objects using the mapping from `getRecentTransactions`.
            return {
                date: r[0],
                type: r[1],
                ticker: r[2], // Need normalize? preserving raw is safer for DB
                cat: r[3],
                qty: r[4],
                price: r[5],
                currency: r[6],
                note: r[7]
            };
        });
        GasStore.set('DB:LOG', rows);
        Logger.log(`Migrated ${rows.length} logs.`);
    } else {
        GasStore.set('DB:LOG', []);
    }

    // 3. Migrate LOAN
    const sLoan = ss.getSheetByName('Loan'); // TAB_LOAN
    if (sLoan && sLoan.getLastRow() > 1) {
        const data = sLoan.getDataRange().getValues();
        const rows = data.slice(1).map(r => {
            return {
                source: r[0],
                date: r[1],
                amount: r[2],
                rate: r[3],
                col: r[4],
                colQty: r[5],
                type: r[6],
                warn: r[7],
                liq: r[8],
                note: r[9],
                totalTerm: r[10],
                paidTerm: r[11],
                monthlyPay: r[12],
                currency: r[13]
            };
        });
        GasStore.set('DB:LOAN', rows);
        Logger.log(`Migrated ${rows.length} loans.`);
    } else {
        GasStore.set('DB:LOAN', []);
    }

    // 4. Commit to `_DB_STORE`
    GasStore.commit();
    Logger.log('Migration Complete. Data stored in _DB_STORE.');
}
