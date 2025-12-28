/**
 * Maintenance.gs
 * System maintenance and database management functions.
 */

function checkDbStructure() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const results = [];

    for (const [sheetName, headers] of Object.entries(DB_SCHEMA)) {
        const sheet = ss.getSheetByName(sheetName);
        if (!sheet) {
            results.push(`? Missing Sheet: ${sheetName}`);
        } else {
            const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
            if (JSON.stringify(currentHeaders) !== JSON.stringify(headers)) {
                results.push(`?? Header Mismatch: ${sheetName}`);
            } else {
                results.push(`? OK: ${sheetName}`);
            }
        }
    }

    return results.join('\n');
}

function resetDatabase() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    for (const [sheetName, headers] of Object.entries(DB_SCHEMA)) {
        const oldSheet = ss.getSheetByName(sheetName);
        if (oldSheet) {
            oldSheet.setName(`${sheetName}_ARCHIVED_${timestamp}`);
        }

        const newSheet = ss.insertSheet(sheetName);
        newSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        newSheet.setFrozenRows(1);
    }

    return "Database Reset Complete. Old sheets archived.";
}
