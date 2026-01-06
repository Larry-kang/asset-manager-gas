/**
 * GasStore: A Redis-like Key-Value Store for Google Apps Script
 * Stratagy: L1 (Memory) -> L2 (CacheService) -> L3 (Google Sheets)
 * Goal: Maximize free quota usage and minimize I/O time.
 */

var GasStore = (function () {

    // --- Default Configuration ---
    let CONFIG = {
        SHEET_NAME: '_DB_STORE',
        PREFIX: 'GS:',
        MAX_TTL: 21600, // 6 hours (Server Cache Max)
        CHUNK_SIZE: 90000, // Bytes, safety margin for 100KB limit
        AUTO_COMMIT_THRESHOLD: 50, // [New] Commit every 50 writes to prevent data loss safely
        ENCRYPTION_KEY: null, // [New] If set, enables encryption
        HMAC_KEY: null, // [New] Integrity Key
        USE_LOCK: false, // [New] Concurrency Lock
        LOCK_TIMEOUT: 10000 // 10 sec wait
    };

    // --- L1 Cache (Memory) ---
    // Store: { key: { val: any, exp: timestamp, dirty: bool } }
    let _memory = {};
    let _dirtyCount = 0;
    let _queueKey = 'GASSTORE_DIRTY_QUEUE'; // Key for PropertiesService to track dirty keys

    // --- Private Helpers ---

    // [New] HMAC Signature
    function _computeSignature(data) {
        if (!CONFIG.HMAC_KEY) return '';
        try {
            var sigBytes = Utilities.computeHmacSha256Signature(data, CONFIG.HMAC_KEY);
            return Utilities.base64Encode(sigBytes);
        } catch (e) { return ''; }
    }

    // [New] RC4 Encryption on Bytes (Supports UTF-8)
    function _rc4Bytes(key, bytes) {
        if (!key) return bytes;
        var s = [], j = 0, x, res = [];
        for (var i = 0; i < 256; i++) { s[i] = i; }
        for (i = 0; i < 256; i++) {
            j = (j + s[i] + key.charCodeAt(i % key.length)) % 256;
            x = s[i]; s[i] = s[j]; s[j] = x;
        }
        i = 0; j = 0;
        for (var y = 0; y < bytes.length; y++) {
            i = (i + 1) % 256;
            j = (j + s[i]) % 256;
            x = s[i]; s[i] = s[j]; s[j] = x;
            res.push(bytes[y] ^ s[(s[i] + s[j]) % 256]);
        }
        return res;
    }

    function _encrypt(str) {
        if (!CONFIG.ENCRYPTION_KEY) return str;
        try {
            var bytes = Utilities.newBlob(str).getBytes();
            var encBytes = _rc4Bytes(CONFIG.ENCRYPTION_KEY, bytes);
            return Utilities.base64Encode(encBytes);
        } catch (e) {
            console.error("GasStore: Encryption failed", e);
            return str;
        }
    }

    function _decrypt(b64Str) {
        if (!CONFIG.ENCRYPTION_KEY) return b64Str;
        try {
            var encBytes = Utilities.base64Decode(b64Str);
            var decBytes = _rc4Bytes(CONFIG.ENCRYPTION_KEY, encBytes);
            return Utilities.newBlob(decBytes).getDataAsString();
        } catch (e) {
            console.warn("GasStore: Decryption failed", e);
            return null;
        }
    }

    function _getScriptCache() {
        return CacheService.getScriptCache();
    }

    function _now() {
        return Math.floor(new Date().getTime() / 1000); // Unix Timestamp
    }

    function _getDbSheet() {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
        if (!sheet) {
            sheet = ss.insertSheet(CONFIG.SHEET_NAME);
            sheet.hideSheet();
            // Init Headers: Key | Value (JSON) | ExpireAt (Unix) | UpdatedAt | [New] Signature
            sheet.appendRow(['key', 'value', 'expire_at', 'updated_at', 'signature']);
            sheet.getRange("A:A").setNumberFormat("@"); // Text format for Key
        }
        return sheet;
    }

    /**
     * Load data from L3 (Sheet) to L1/L2
     * This is expensive, so we only do it on cache miss.
     * To optimize, we might want to load ALL keys into memory if the DB is small?
     * For now, let's look up by finding row.
     */
    function _loadFromSheet(key) {
        const sheet = _getDbSheet();
        // Use TextFinder for faster lookup than reading all data
        const finder = sheet.createTextFinder(key).matchEntireCell(true);
        const result = finder.findNext();

        if (result) {
            const row = result.getRow();
            // Read Key, Value, ExpireAt, UpdatedAt, Signature (5 cols)
            const data = sheet.getRange(row, 1, 1, 5).getValues()[0];
            const storedKey = data[0];
            let storedValStr = data[1];
            const expireAt = Number(data[2]);
            const storedSig = data[4]; // Column E

            // Verify Key match (double check) and Expiry
            if (storedKey === key) {
                if (expireAt > 0 && expireAt < _now()) {
                    // Expired in DB
                    // Optional: Delete row now? Or lazy delete later?
                    // Let's treat as not found.
                    return null;
                }

                // [Mod] Verify Integrity
                if (CONFIG.HMAC_KEY && storedSig) {
                    const computedSig = _computeSignature(storedValStr);
                    if (computedSig !== storedSig) {
                        console.error(`GasStore: Integrity Check Failed for ${key}. Possible tampering.`);
                        return null; // Refuse to load
                    }
                }

                try {
                    // [Mod] Decrypt L3 Data
                    let decryptedStr = _decrypt(storedValStr);
                    if (decryptedStr === null) return null;

                    const val = JSON.parse(decryptedStr);
                    // Hydrate L1
                    _memory[key] = { val: val, exp: expireAt, dirty: false };
                    // Hydrate L2
                    try {
                        _getScriptCache().put(CONFIG.PREFIX + key, storedValStr, Math.min(CONFIG.MAX_TTL, expireAt - _now()));
                    } catch (e) {
                        // Ignore L2 write errors (e.g. too big)
                    }
                    return val;
                } catch (e) {
                    console.error(`GasStore: Failed to parse value for key ${key}`, e);
                    return null;
                }
            }
        }
        return null;
    }

    // --- Public API ---

    return {
        /**
         * Initialize GasStore with custom configuration
         * @param {Object} config
         * @param {string} config.sheet_name - Name of the storage sheet (default: '_DB_STORE')
         * @param {string} config.prefix - Cache key prefix (default: 'GS:')
         * @param {number} config.ttl - Default TTL in seconds (default: 21600)
         * @param {number} config.threshold - Auto-commit threshold (default: 50)
         * @param {string} config.encryption_key - [New] Key for RC4 Encryption
         * @param {string} config.hmac_key - [New] Key for HMAC Integrity
         * @param {boolean} config.use_lock - [New] Enable LockService for concurrency
         * @param {number} config.lock_timeout - [New] LockService timeout in ms
         */
        init: function (config = {}) {
            if (config.sheet_name) CONFIG.SHEET_NAME = config.sheet_name;
            if (config.prefix) CONFIG.PREFIX = config.prefix;
            if (config.ttl) CONFIG.MAX_TTL = config.ttl;
            if (config.threshold) CONFIG.AUTO_COMMIT_THRESHOLD = config.threshold;
            if (config.encryption_key) CONFIG.ENCRYPTION_KEY = config.encryption_key;
            if (config.hmac_key) CONFIG.HMAC_KEY = config.hmac_key;
            if (config.use_lock) CONFIG.USE_LOCK = config.use_lock;
            if (config.lock_timeout) CONFIG.LOCK_TIMEOUT = config.lock_timeout;
        },

        /**
         * Get value by key
         * Order: L1 -> L2 -> L3
         */
        get: function (key, defaultValue = null) {
            // 1. Check L1
            if (_memory.hasOwnProperty(key)) {
                const item = _memory[key];
                if (item.exp > 0 && item.exp < _now()) {
                    delete _memory[key];
                    return defaultValue;
                }
                return item.val;
            }

            // 2. Check L2
            const cacheKey = CONFIG.PREFIX + key;
            const cachedStr = _getScriptCache().get(cacheKey);
            if (cachedStr) {
                try {
                    // [Mod] Decrypt L2 Data
                    let decryptedStr = _decrypt(cachedStr);

                    if (decryptedStr) {
                        const val = JSON.parse(decryptedStr);
                        // Re-hydrate L1
                        _memory[key] = { val: val, exp: _now() + CONFIG.MAX_TTL, dirty: false }; // Approximate TTL
                        return val;
                    }
                } catch (e) { }
            }

            // 3. Check L3 (Sheet)
            const dbVal = _loadFromSheet(key);
            if (dbVal !== null) {
                return dbVal;
            }

            return defaultValue;
        },

        /**
         * Set value
         * Writes to L1 & L2 immediately. Marks as dirty for L3.
         * @param {string} key 
         * @param {any} value - Must be JSON serializable
         * @param {number} ttlSeconds - 0 for infinite (default: 6 hours if not specified? No, persistent by default)
         */
        set: function (key, value, ttlSeconds = 0) {
            if (value === undefined) value = null;

            const exp = ttlSeconds > 0 ? (_now() + ttlSeconds) : 0;
            const valStr = JSON.stringify(value);

            // [Mod] Encrypt for L2
            const encryptedStr = _encrypt(valStr);

            // 1. Write L1
            if (!_memory[key] || !_memory[key].dirty) {
                _dirtyCount++;
            }
            _memory[key] = { val: value, exp: exp, dirty: true };

            // 2. Write L2
            try {
                if (ttlSeconds > 0) {
                    _getScriptCache().put(CONFIG.PREFIX + key, encryptedStr, Math.min(CONFIG.MAX_TTL, ttlSeconds));
                } else {
                    _getScriptCache().put(CONFIG.PREFIX + key, encryptedStr, CONFIG.MAX_TTL); // Default max for cache
                }
            } catch (e) {
                console.warn("GasStore: L2 Cache write failed (likely payload too large)", e);
            }

            // [New] Auto-Commit Check
            if (_dirtyCount >= CONFIG.AUTO_COMMIT_THRESHOLD) {
                console.log(`GasStore: Auto-Commit triggered (${_dirtyCount} changes)`);
                this.commit();
            }
        },

        /**
         * Delete key
         */
        del: function (key) {
            // L1
            if (_memory[key]) {
                _memory[key] = { val: null, exp: 0, dirty: true, deleted: true };
            } else {
                _memory[key] = { val: null, exp: 0, dirty: true, deleted: true };
            }

            // L2
            _getScriptCache().remove(CONFIG.PREFIX + key);

            // L3 handled in commit()
        },

        /**
         * Commit dirty keys to Sheet (L3)
         * Must be called at end of execution!
         */
        commit: function () {
            const dirtyKeys = Object.keys(_memory).filter(k => _memory[k].dirty);
            if (dirtyKeys.length === 0) return;

            console.time('GasStore.commit');

            // [Mod] Concurrency Lock
            let lock = null;
            if (CONFIG.USE_LOCK) {
                lock = LockService.getScriptLock();
                try {
                    lock.waitLock(CONFIG.LOCK_TIMEOUT);
                } catch (e) {
                    console.error('GasStore: Could not acquire lock for commit.');
                    return;
                }
            }

            try {
                const sheet = _getDbSheet();

                // We need to upsert.
                // Strategy: Read all keys from sheet to build a map of Row Indexes
                // Then update specifically or append.
                // Implementation:
                // Since fetching all data is cheap for small DBs (e.g. < 2000 rows), let's try that first.

                const lastRow = sheet.getLastRow();
                let dbMap = {}; // key -> rowIndex
                if (lastRow > 1) {
                    const keyData = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
                    for (let i = 0; i < keyData.length; i++) {
                        dbMap[keyData[i][0]] = i + 2; // 1-based index + header
                    }
                }

                let rowsToUpdate = []; // { row: idx, values: [k, v, exp, updated, sig] }
                let rowsToAppend = []; // [ [k, v, exp, updated, sig] ]
                // let rowsToDelete = []; // [rowIndex] - For logical deletion, might be tricky to delete rows while iterating. 
                // Better to mark as empty/expired or use clearContent.

                const nowStr = new Date().toISOString();

                dirtyKeys.forEach(key => {
                    const item = _memory[key];

                    // Handle Deletion
                    if (item.deleted) {
                        if (dbMap[key]) {
                            // We just clear the content to avoid shifting rows performance hit.
                            // Or we can delete row. Ideally clear is safer for concurrent batch actions if we used specific ranges.
                            // Simple approach: Delete row logic later or just clear fields.
                            rowsToUpdate.push({ row: dbMap[key], values: [key, "", 1, nowStr, ""] }); // Expire it effectively and clear signature
                        }
                        return;
                    }

                    // [Mod] Encrypt for L3
                    const valStr = JSON.stringify(item.val);
                    const encryptedStr = _encrypt(valStr);

                    // [Mod] Compute Signature
                    const sig = _computeSignature(encryptedStr);

                    const rowData = [key, encryptedStr, item.exp, nowStr, sig];

                    if (dbMap[key]) {
                        rowsToUpdate.push({ row: dbMap[key], values: rowData });
                    } else {
                        rowsToAppend.push(rowData);
                    }
                });

                // Batch Updates
                // GAS doesn't allow random access batch update easily without writing ranges.
                // If we have many updates scattered, it's slow.
                // Optimization: If updates > 5, maybe just re-read full range, update in memory, write back active range?
                // For now, let's just loop setValue for updates (slow but safe) or group if possible.
                // Actually, standard approach:
                if (rowsToUpdate.length > 0) {
                    // Optimization: Create a requests array for Sheets API if Advanced Service enabled.
                    // But here we use standard library.
                    // Let's just setValue for distinct rows. If too many, warn user.
                    rowsToUpdate.forEach(u => {
                        sheet.getRange(u.row, 1, 1, 5).setValues([u.values]);
                    });
                }

                // Batch Append
                if (rowsToAppend.length > 0) {
                    const startRow = sheet.getLastRow() + 1;
                    sheet.getRange(startRow, 1, rowsToAppend.length, 5).setValues(rowsToAppend);
                }

                // Clean Memory Dirty Flag
                dirtyKeys.forEach(k => _memory[k].dirty = false);
                _dirtyCount = 0; // [New] Reset counter

            } catch (e) {
                console.error("GasStore: Commit Error", e);
            } finally {
                if (lock) lock.releaseLock();
            }

            console.timeEnd('GasStore.commit');
            console.log(`GasStore: Committed ${dirtyKeys.length} changes.`);
        },

        /**
         * [New] Batch Put
         */
        batchPut: function (dataMap) {
            for (let k in dataMap) {
                this.set(k, dataMap[k]);
            }
        },

        /**
         * [New] Enqueue for Background Commit
         * Uses PropertiesService to store keys that need flushing
         */
        enqueue: function () {
            const dirtyKeys = Object.keys(_memory).filter(k => _memory[k].dirty);
            if (dirtyKeys.length === 0) return;

            const props = PropertiesService.getScriptProperties();
            let queueStr = props.getProperty(_queueKey) || "";
            let existing = queueStr ? queueStr.split(',') : [];

            let updated = Array.from(new Set([...existing, ...dirtyKeys]));
            props.setProperty(_queueKey, updated.join(','));

            // Clear memory dirty flags since they are now in "Persistent Queue"
            dirtyKeys.forEach(k => _memory[k].dirty = false);
            _dirtyCount = 0;
            console.log(`GasStore: Enqueued ${dirtyKeys.length} keys for background flush.`);
        },

        /**
         * [New] Worker Flush
         * Should be called by a Time-Based Trigger
         */
        workerFlush: function () {
            const props = PropertiesService.getScriptProperties();
            let queueStr = props.getProperty(_queueKey);
            if (!queueStr) return;

            let keys = queueStr.split(',');
            if (keys.length === 0) {
                props.deleteProperty(_queueKey);
                return;
            }

            console.log(`GasStore Worker: Flushing ${keys.length} keys...`);

            // To flush, we need to load these keys into memory first (if not there)
            // and mark them as dirty, then call commit.
            keys.forEach(k => {
                if (!_memory[k]) {
                    let val = this.get(k); // Load from L2/L3
                    if (val !== null) {
                        _memory[k] = { val: val, exp: 0, dirty: true };
                    }
                } else {
                    _memory[k].dirty = true;
                }
            });

            this.commit();
            props.deleteProperty(_queueKey);
            console.log("GasStore Worker: Flush complete.");
        },
        /**
         * [New] Clear All Data (Destructive)
         */
        clearAll: function () {
            // Clear L1
            _memory = {};

            // Clear L2 (Best effort, we can't iterate all keys in Cache, but we can clear specific prefix if needed?)
            // CacheService doesn't support clearAll(). We rely on keys expiring or overwriting.
            // However, if we clear L3, L2 becomes invalid mostly.

            // Clear L3 (Sheet)
            const sheet = _getDbSheet();
            if (sheet.getLastRow() > 1) {
                // Clear all data rows (keep header)
                sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
            }

            console.log("GasStore: All data cleared.");
        }
    };
})();

// Assign to global so other scripts can see it?
// In GAS, top-level const in a file is global to the project.



